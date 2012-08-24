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
 * @author Daniel Rentz <daniel.rentz@open-xchange.com>
 */

define('io.ox/office/editor/view',
    ['io.ox/office/tk/utils',
     'io.ox/office/tk/fonts',
     'io.ox/office/tk/control/button',
     'io.ox/office/tk/control/textfield',
     'io.ox/office/tk/control/combofield',
     'io.ox/office/tk/dropdown/gridsizer',
     'io.ox/office/tk/component/toolpane',
     'io.ox/office/editor/format/lineheight',
     'gettext!io.ox/office/main'
    ], function (Utils, Fonts, Button, TextField, ComboField, GridSizer, ToolPane, LineHeight, gt) {

    'use strict';

    var // shortcut for the KeyCodes object
        KeyCodes = Utils.KeyCodes;

    // class StyleSheetChooser ================================================

    var StyleSheetChooser = ComboField.extend({ constructor: function (styleSheets, options) {

        // base constructor ---------------------------------------------------

        ComboField.call(this, Utils.extendOptions({
            width: 100,
            sorted: true,
            readOnly: true
        }, options));

        // initialization -----------------------------------------------------

        // add all known style sheets
        _(styleSheets.getStyleSheetNames()).each(function (name) {
            this.addListEntry(name);
        }, this);

    }}); // class FontFamilyChooser

    // class FontFamilyChooser ================================================

    var FontFamilyChooser = ComboField.extend({ constructor: function () {

        // base constructor ---------------------------------------------------

        ComboField.call(this, {
            width: 150,
            tooltip: gt('Font Name'),
            sorted: true,
            typeAhead: true
        });

        // initialization -----------------------------------------------------

        // add all known fonts
        _(Fonts.getRegisteredFontNames()).each(function (fontName) {
            this.addListEntry(fontName, { labelCss: { fontFamily: Fonts.getCssFontFamily(fontName), fontSize: '115%' } });
        }, this);

    }}); // class FontFamilyChooser

    // class FontHeightChooser ================================================

    var FontHeightChooser = ComboField.extend({ constructor: function () {

        // base constructor ---------------------------------------------------

        ComboField.call(this, {
            width: 30,
            tooltip: gt('Font Size'),
            css: { textAlign: 'right' },
            validator: new TextField.NumberValidator({ min: 1, max: 999.9, digits: 1 })
        });

        // initialization -----------------------------------------------------

        _([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72, 80, 88, 96]).each(function (size) {
            this.addListEntry(size, { css: { textAlign: 'right', paddingRight: '20px' } });
        }, this);

    }}); // class FontHeightChooser

    // class TableSizeChooser =================================================

    var TableSizeChooser = Button.extend({ constructor: function () {

        var options = {
                icon: 'icon-io-ox-table',
                tooltip: gt('Insert Table'),
                defaultSize: { width: 5, height: 3 },
                maxSize: { width: 15, height: 15 }
            };

        // base constructors --------------------------------------------------

        // create the default button (set value to default size, will be returned by click handler)
        Button.call(this, Utils.extendOptions(options, { value: options.defaultSize }));
        // create the grid sizer
        GridSizer.call(this, Utils.extendOptions(options, { ignoreCaption: true }));

    }}); // class TableSizeChooser

    // class View =============================================================

    function View(appWindow, controller, editors) {

        var // tool pane containing all tool bars
            toolPane = new ToolPane(appWindow, controller, 'view/toolbars/show'),

            // old value of the search query field
            oldSearchQuery = '';

        // private methods ----------------------------------------------------

        /**
         * Creates a new tool bar in the tool pane and inserts common controls.
         *
         * @param {String} id
         *  The unique identifier of the tool bar.
         *
         * @param {Object} [options]
         *  A map of options to control the properties of the new tab in the
         *  tab bar representing the tool bar. Supports all options for buttons
         *  in radio groups (see method RadioGroup.addButton() for details).
         */
        function createToolBar(id, options) {

            // create common controls present in all tool bars
            return toolPane.createToolBar(id, options)
                .addButton('action/undo', { icon: 'icon-io-ox-undo', tooltip: gt('Revert Last Operation') })
                .addButton('action/redo', { icon: 'icon-io-ox-redo', tooltip: gt('Restore Last Operation') })
                .addSeparator();
        }

        /**
         * Handles resize events of the browser window, and adjusts the left
         * positions of all tool bars in the tool pane according to the current
         * position of the editor node.
         */
        function windowResizeHandler(event) {

            var // the left position of the editor node
                editorLeft = Math.floor(editors.rich.getNode().offset().left),
                // width of the document title label
                titleWidth = Math.floor(appWindow.nodes.title.width());

            // position the tab bar
            appWindow.nodes.tabBar.getNode().css('left', Math.max(editorLeft, titleWidth + 13) + 'px');

            // set a left padding to the tool pane to align the tool bars with the editor node
            toolPane.getNode().css('padding-left', Math.max(editorLeft, 13) + 'px');
            // refresh all tool bars (they may resize some controls according to the available space)
            toolPane.refresh();
        }

        /**
         * Handles keyboard events in the quick-search text field.
         */
        function searchKeyHandler(event) {

            var // current value of the search query
                searchQuery = $(this).val();

            // ESCAPE key returns to editor
            if ((event.type === 'keyup') && (event.keyCode === KeyCodes.ESCAPE)) {
                controller.cancel();
            // always refresh search results if edit fields receives focus
            } else if ((event.type === 'focus') || (oldSearchQuery !== searchQuery)) {
                controller.change('action/search/quick', searchQuery);
                oldSearchQuery = searchQuery;
            }
        }

        // methods ------------------------------------------------------------

        this.getToolPane = function () {
            return toolPane;
        };

        this.destroy = function () {
            toolPane.destroy();
            toolPane = null;
        };

        // initialization -----------------------------------------------------

        // create the tool panes and append them to the window main node
        appWindow.nodes.main.addClass('io-ox-office-main').append(
            appWindow.nodes.toolPane = toolPane.getNode(),
            appWindow.nodes.appPane = $('<div>').addClass('io-ox-office-apppane'),
            appWindow.nodes.debugPane = $('<div>').addClass('io-ox-pane bottom debug')
        );

        // insert editor into the app pane
        appWindow.nodes.appPane.append(editors.rich.getNode());

        // table element containing the debug mode elements
        appWindow.nodes.debugPane.append($('<table>').addClass('debug-table').append(
            $('<colgroup>').append(
                $('<col>', { width: '50%' }),
                $('<col>', { width: '50%' })
            ),
            $('<tr>').append(
                // add plain-text editor and operations output console to debug table
                $('<td>').append(editors.plain.getNode()),
                $('<td>').append(editors.output.getNode())
            )
        ));

        // create the tool bars
        createToolBar('insert', { label: gt('Insert') })
            .addGroup('insert/table', new TableSizeChooser());

        createToolBar('format', { label: gt('Format') })
            .addGroup('format/paragraph/stylesheet', new StyleSheetChooser(editors.rich.getStyleSheets('paragraph'), { tooltip: gt('Paragraph Style') }))
            .addSeparator()
            .addGroup('format/character/font/family', new FontFamilyChooser())
            .addSeparator()
            .addGroup('format/character/font/height', new FontHeightChooser())
            .addSeparator()
            .addButton('format/character/font/bold',      { icon: 'icon-io-ox-bold',      tooltip: gt('Bold'),      toggle: true })
            .addButton('format/character/font/italic',    { icon: 'icon-io-ox-italic',    tooltip: gt('Italic'),    toggle: true })
            .addButton('format/character/font/underline', { icon: 'icon-io-ox-underline', tooltip: gt('Underline'), toggle: true })
            .addSeparator()
            .addRadioGroup('format/paragraph/alignment', { auto: true, icon: 'icon-align-left', tooltip: gt('Paragraph Alignment') })
                .addButton('left',    { icon: 'icon-align-left',    tooltip: gt('Left'),    css: { textAlign: 'center' }  })
                .addButton('center',  { icon: 'icon-align-center',  tooltip: gt('Center'),  css: { textAlign: 'center' } })
                .addButton('right',   { icon: 'icon-align-right',   tooltip: gt('Right'),   css: { textAlign: 'center' } })
                .addButton('justify', { icon: 'icon-align-justify', tooltip: gt('Justify'), css: { textAlign: 'center' } })
                .end()
            .addSeparator()
            .addRadioGroup('format/paragraph/lineheight', { auto: true, icon: 'icon-io-ox-line-spacing-1', tooltip: gt('Line Spacing') })
                .addButton(LineHeight.SINGLE,   { icon: 'icon-io-ox-line-spacing-1',   tooltip: gt('Single'),         css: { textAlign: 'center' } })
                .addButton(LineHeight.ONE_HALF, { icon: 'icon-io-ox-line-spacing-1-5', tooltip: gt('One and a Half'), css: { textAlign: 'center' } })
                .addButton(LineHeight.DOUBLE,   { icon: 'icon-io-ox-line-spacing-2',   tooltip: gt('Double'),         css: { textAlign: 'center' } })
                .end();

        createToolBar('table', { label: gt('Table') })
            .addGroup('insert/table', new TableSizeChooser())
            .addSeparator()
            .addButton('table/insert/row',    { icon: 'icon-io-ox-table-insert-row',    tooltip: gt('Insert Row') })
            .addButton('table/insert/column', { icon: 'icon-io-ox-table-insert-column', tooltip: gt('Insert Column') })
            .addButton('table/delete/row',    { icon: 'icon-io-ox-table-delete-row',    tooltip: gt('Delete Rows') })
            .addButton('table/delete/column', { icon: 'icon-io-ox-table-delete-column', tooltip: gt('Delete Columns') });

        createToolBar('debug', { label: gt('Debug') })
            .addButton('action/export', { icon: 'icon-share', tooltip: 'Export' })
            .addButton('action/flush', { icon: 'icon-share-alt', tooltip: 'Flush' })
            .addButton('action/print', { icon: 'icon-print', tooltip: 'Print' })
            .addSeparator()
            .addButton('debug/toggle', { icon: 'icon-eye-open', tooltip: 'Debug Mode', toggle: true })
            .addButton('debug/sync', { icon: 'icon-refresh', tooltip: 'Synchronize With Backend', toggle: true });

        // update all view components
        controller.update();

        // make the format tool bar visible
        toolPane.showToolBar('format');

        // listen to browser window resize events when the OX window is visible
        Utils.registerWindowResizeHandler(appWindow, windowResizeHandler);

        // override the limited functionality of the quick-search text field
        appWindow.nodes.search
            .off('keydown search change')
            .on('input keydown keypress keyup focus', searchKeyHandler)
            .data('tooltip', null); // remove old tooltip

        // set the quick-search tooltip
        Utils.setControlTooltip(appWindow.nodes.search, gt('Quick Search'), 'bottom');

    } // class View

    // exports ================================================================

    return View;

});
