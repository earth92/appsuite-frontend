/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) 2004-2012 Open-Xchange, Inc.
 * Mail: info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/core/commons', [], function () {

    'use strict';

    return {

        /**
         * Common show window routine
         */
        showWindow: function (win, grid) {
            return function () {
                var def = $.Deferred();
                win.show(function () {
                    if (grid) {
                        grid.paint();
                    }
                    def.resolve();
                });
                return def;
            };
        },

        /**
         * Wire grid & API
         */
        wireGridAndAPI: function (grid, api, getAll, getList) {
            // all request
            grid.setAllRequest(function () {
                return api[getAll || 'getAll']({ folder: this.prop('folder') });
            });
            // list request
            grid.setListRequest(function (ids) {
                return api[getList || 'getList'](ids);
            });
        },

        /**
         * Wire grid & window
         */
        wireGridAndWindow: function (grid, win) {
            // show
            win.bind('show', function () {
                grid.selection.keyboard(true);
                grid.selection.retrigger();
            });
            // hide
            win.bind('hide', function () {
                grid.selection.keyboard(false);
            });
        },

        /**
         * Wire first refresh
         */
        wireFirstRefresh: function (app, api) {
            // open (first show)
            app.getWindow().bind('open', function () {
                if (api.needsRefresh(app.folder.get())) {
                    api.trigger('refresh!', app.folder.get());
                }
            });
        },

        /**
         * Wire grid and API refresh
         */
        wireGridAndRefresh: function (grid, api) {
            // bind all refresh
            api.bind('refresh.all', function () {
                grid.refresh();
            });
            // bind list refresh
            api.bind('refresh.list', function () {
                grid.repaint().done(function () {
                    grid.selection.retrigger();
                });
            });
        },

        /**
         * Wire Grid and window's search
         */
        wireGridAndSearch: function (grid, win, api) {
            // search: all request
            grid.setAllRequest('search', function () {
                return api.search(win.search.query);
            });
            // search: list request
            grid.setListRequest('search', function (ids) {
                return api.getList(ids);
            });
            // on search
            win.bind('search', function (q) {
                grid.setMode('search');
            });
            // on cancel search
            win.bind('cancel-search', function () {
                grid.setMode('all');
            });
        },

        /**
         * Add folder support
         */
        addFolderSupport: function (app, grid, type, defaultFolderId) {
            app.folder
                .updateTitle(app.getWindow())
                .updateGrid(grid)
                .setType(type);
            // hash support
            app.getWindow().bind('show', function () {
                grid.selection.retrigger();
                _.url.hash('folder', app.folder.get());
            });
            defaultFolderId = _.url.hash('folder') || defaultFolderId;
            // explicit vs. default
            if (defaultFolderId !== undefined) {
                return app.folder.set(defaultFolderId);
            } else {
                return app.folder.setDefault();
            }
        },

        /**
         * Add visual folder tree
         */
        addFolderTree: function (app, width, type) {

            var container,
                visible = false,
                top = 0,
                fnChangeFolder, fnShow, fnToggle, loadTree, initTree;

            container = $('<div>')
                .addClass('abs border-right')
                .css({
                    backgroundColor: 'white',
                    right: 'auto',
                    width: width + 'px',
                    zIndex: 3
                })
                .hide()
                .appendTo(app.getWindow().nodes.main);

            fnChangeFolder = function (selection) {
                var folder = selection[0];
                if (folder.module === type) {
                    app.folder.unset();
                    top = container.scrollTop();
                    container.fadeOut('fast', function () {
                        app.folder.set(folder.id);
                    });
                    visible = false;
                }
            };

            fnShow = function () {
                if (!visible) {
                    container.show().scrollTop(top);
                    visible = true;
                }
                return $.when();
            };

            fnToggle = function () {
                if (visible) {
                    top = container.scrollTop();
                    container.hide();
                    visible = false;
                } else {
                    fnShow();
                }
            };

            initTree = function (FolderTree) {
                var tree = app.folderTree = new FolderTree(container, { type: type });
                tree.selection.bind('change', fnChangeFolder);
                return tree.paint()
                    .done(function () {
                        tree.selection.set(app.folder.get(), true);
                        app.getWindow().nodes.title.on('click', fnToggle);
                        container.idle();
                        initTree = loadTree = null;
                    });
            };

            loadTree = function () {
                container.busy();
                fnToggle();
                app.showFolderTree = fnShow;
                app.getWindow().nodes.title.off('click', loadTree);
                return require(['io.ox/core/tk/foldertree']).pipe(initTree);
            };

            app.showFolderTree = loadTree;
            app.folderTree = null;

            app.getWindow().nodes.title
                .css('cursor', 'pointer')
                .on('click', loadTree);
        }
    };
});
