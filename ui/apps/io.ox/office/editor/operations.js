/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2012
 * Mail: info@open-xchange.com
 *
 * @author Ingo Schmidt-Rosbiegal <ingo.schmidt-rosbiegal@open-xchange.com>
 * @author Daniel Rentz <daniel.rentz@open-xchange.com>
 */

define('io.ox/office/editor/operations',
    ['io.ox/office/tk/utils',
     'io.ox/office/editor/dom',
     'io.ox/office/editor/format/stylesheets'
    ], function (Utils, DOM, StyleSheets) {

    'use strict';

    // private global functions ===============================================

    /**
     * Creates a clone of the passed logical position and appends the index 0.
     * The passed array object will not be changed.
     *
     * @param {Number[]} position
     *  The initial logical position.
     *
     * @returns {Number[]}
     *  A clone of the passed logical position, with the index 0 appended.
     */
    function createLastIndex(position) {
        position = _.clone(position);
        position.push(0);
        return position;
    }

    /**
     * Creates a clone of the passed logical position and increases the last
     * element of the array by the specified offset. The passed array object
     * will not be changed.
     *
     * @param {Number[]} position
     *  The initial logical position.
     *
     * @param {Number} [offset=1]
     *  The offset that will be added to the last index of the position.
     *
     * @returns {Number[]}
     *  A clone of the passed logical position, with the last index increased.
     */
    function increaseLastIndex(position, offset) {
        position = _.clone(position);
        position[position.length - 1] += (_.isNumber(offset) ? offset : 1);
        return position;
    }

    // static class Operations ================================================

    /**
     * Defines the names of all supported operations and static helper
     * functions to generate operations from DOM structures and selections.
     */
    var Operations = {

        DELETE: 'delete',
        MOVE: 'move',

        TEXT_INSERT: 'insertText',
        TEXT_DELETE: 'deleteText',

        PARA_INSERT: 'insertParagraph',
        PARA_DELETE: 'deleteParagraph',
        PARA_SPLIT: 'splitParagraph',
        PARA_MERGE: 'mergeParagraph',

        TABLE_INSERT: 'insertTable',
        TABLE_DELETE: 'deleteTable',
        CELLRANGE_DELETE: 'deleteCellRange',
        ROWS_DELETE: 'deleteRows',
        COLUMNS_DELETE: 'deleteColumns',
        CELLS_DELETE: 'deleteCells',
        ROW_INSERT: 'insertRow',
        COLUMN_INSERT: 'insertColumn',
        CELL_INSERT: 'insertCell',
        CELL_SPLIT: 'splitCell',
        CELL_MERGE: 'mergeCell',

        INSERT_STYLE: 'insertStylesheet',
        INSERT_THEME: 'insertTheme',
        ATTRS_SET: 'setAttributes',

        IMAGE_INSERT: 'insertImage',
        FIELD_INSERT: 'insertField'
        // ATTR_DELETE:  'deleteAttribute'

    };

    // methods ----------------------------------------------------------------

    /**
     * Generates the operation needed to set the attributes of the passed node.
     *
     * @param {Object[]} operations
     *  (in/out) An array of operations that will generate the contents of the
     *  passed paragraph, if applied to an empty paragraph node located at the
     *  passed logical position. All operations generated by this method will
     *  be appended to this operations array.
     *
     * @param {HTMLElement|jQuery} node
     *  The element node whose attributes will be converted to an operation. If
     *  this object is a jQuery collection, uses the first node it contains.
     *
     * @param {Number[]} position
     *  The logical (start) position of the passed node.
     *
     * @param {Number[]} [endPosition]
     *  The logical end position of the passed node, if the node spans several
     *  logical components (e.g. a text portion).
     */
    Operations.generateOperationForAttributes = function (operations, node, position, endPosition) {

        var // explicit attributes of the passed node
            attributes = StyleSheets.getExplicitAttributes(node),
            // the setAttributes operation
            operation = null;

        // no attributes, no operation
        if (!_.isEmpty(attributes)) {
            operation = { name: Operations.ATTRS_SET, start: _.clone(position), attrs: attributes };
            if (_.isArray(endPosition)) { operation.end = _.clone(endPosition); }
            operations.push(operation);
        }
    };

    /**
     * Generates the operations needed to recreate the passed paragraph node.
     *
     * @param {Object[]} operations
     *  (in/out) An array of operations that will generate the contents of the
     *  passed paragraph, if applied to an empty paragraph node located at the
     *  passed logical position. All operations generated by this method will
     *  be appended to this operations array.
     *
     * @param {HTMLElement|jQuery} paragraph
     *  The paragraph element whose contents will be converted to operations.
     *  If this object is a jQuery collection, uses the first node it contains.
     *
     * @param {Number[]} position
     *  The logical position of the passed paragraph node. The generated
     *  operations will contain positions located relatively to this address.
     *
     * @param {Boolean} [initialParagraph]
     *  If set to true, no 'insertParagraph' operation will be generated. The
     *  generated operations will assume that an empty paragraph element exists
     *  at the passed logical position.
     */
    Operations.generateOperationsForParagraph = function (operations, paragraph, position, initialParagraph) {

        // operation to create the paragraph element
        if (initialParagraph !== true) {
            operations.push({ name: Operations.PARA_INSERT, position: _.clone(position) });
        }

        // operation to set the paragraph formatting
        Operations.generateOperationForAttributes(operations, paragraph, position);

        // initial position of the first child content node (creates a clone of the array)
        position = createLastIndex(position);

        // iterate all child elements of the root node and create operations
        Utils.iterateSelectedDescendantNodes(paragraph, 'span, img', function (node) {

            var // whether node is a regular text portion
                isPortionSpan = DOM.isPortionSpan(node),
                // text contents of a text span
                text = isPortionSpan ? $(node).text() : '';

            // operation to create a (non-empty) generic text portion
            if (text.length > 0) {
                operations.push({ name: Operations.TEXT_INSERT, start: position, text: text });
                Operations.generateOperationForAttributes(operations, node, position, (text.length > 1) ? increaseLastIndex(position, text.length - 1) : null);
                position = increaseLastIndex(position, text.length);
            }

            // operation to create a text field
            // TODO: field type
            else if (DOM.isFieldSpan(node)) {
                operations.push({ name: Operations.FIELD_INSERT, position: position, representation: text });
                Operations.generateOperationForAttributes(operations, node, position);
                position = increaseLastIndex(position);
            }

            // operation to create an image (including its attributes)
            // TODO: pack into span, TODO: any objects
            else if (Utils.getNodeName(node) === 'img') {
                operations.push({ name: Operations.IMAGE_INSERT, position: position, imgurl: $(node).data('url'), attrs: StyleSheets.getExplicitAttributes(node) });
                position = increaseLastIndex(position);
            }

        }, undefined, { children: true });

    };

    /**
     * Generates the operations needed to recreate the passed table element.
     *
     * @param {Object[]} operations
     *  (in/out) An array of operations that will generate the structure and
     *  contents of the passed table, if applied to an empty table node located
     *  at the passed logical position. All operations generated by this method
     *  will be appended to this operations array.
     *
     * @param {HTMLElement|jQuery} table
     *  The table element whose structure and contents will be converted to
     *  operations. If this object is a jQuery collection, uses the first node
     *  it contains.
     *
     * @param {Number[]} position
     *  The logical position of the passed table node. The generated operations
     *  will contain positions located relatively to this address.
     */
    Operations.generateOperationsForTable = function (operations, table, position) {

        var // attributes of the table
            attributes = StyleSheets.getExplicitAttributes(table),
            // all row elements of the table
            rows = $(table).find('> tbody > tr');

        // operation to create the table element
        operations.push({ name: Operations.TABLE_INSERT, position: _.clone(position), attrs: attributes });

        // initial position of the first row (creates a clone of the array)
        position = createLastIndex(position);

        // operation to create the table rows with default cells and paragraphs
        operations.push({ name: Operations.ROW_INSERT, position: position, count: rows.length, insertdefaultcells: true });
    };

    /**
     * Generates the operations needed to recreate the contents of the passed
     * root node. Root nodes are container elements for text paragraphs and
     * other first-level content nodes (e.g. tables). Examples for root nodes
     * are the entire document root node, table cells, or text shapes. Note
     * that the operation to create the root node itself will NOT be generated.
     *
     * @param {Object[]} operations
     *  (in/out) An array of operations that will generate the contents of the
     *  passed root node, if applied to an empty node located at the passed
     *  logical position. All operations generated by this method will be
     *  appended to this operations array.
     *
     * @param {HTMLElement|jQuery} rootNode
     *  The root element containing the content nodes that will be converted
     *  to operations. If this object is a jQuery collection, uses the first
     *  node it contains.
     *
     * @param {Number[]} position
     *  The logical position of the passed root node. The generated operations
     *  will contain positions located relatively to this address.
     */
    Operations.generateOperationsForRootNode = function (operations, rootNode, position) {

        var // all root elements will contain an empty paragraph after creation
            initialParagraph = true;

        // initial position of the first child content node (creates a clone of the array)
        position = createLastIndex(position);

        // iterate all child elements of the root node and create operations
        Utils.iterateDescendantNodes(rootNode, function (node) {

            switch (Utils.getNodeName(node)) {

            // operations to create a paragraph (first paragraph node exists in every root node)
            case 'p':
                Operations.generateOperationsForParagraph(operations, node, position, initialParagraph);
                initialParagraph = false;
                break;

            // operations to create a table with its structure and contents
            case 'table':
                Operations.generateOperationsForTable(operations, node, position);
                break;

            default:
                Utils.warn('Operations.generateOperationsForRootNode(): unexpected node "' + Utils.getNodeName(node) + '" at position ' + JSON.stringify(position) + '.');
                // continue with next child node (do not increase position)
                return;
            }

            // increase last element of the logical position (returns a clone)
            position = increaseLastIndex(position);

        }, undefined, { children: true });

    };

    // exports ================================================================

    return Operations;

});
