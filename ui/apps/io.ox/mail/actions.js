/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2011
 * Mail: info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/mail/actions',
    ['io.ox/core/extensions',
     'io.ox/core/extPatterns/links',
     'io.ox/mail/api',
     'io.ox/core/config'], function (ext, links, api, config) {

    'use strict';

    var defaultDraftFolder = config.get('modules.mail.defaultFolder.drafts'),
        Action = links.Action;

    // actions

    new Action('io.ox/mail/actions/reader', {
        id: 'reader',
        action: function (app) {
            app.toggleLamp();
        }
    });

    new Action('io.ox/mail/actions/compose', {
        id: 'compose',
        action: function (app) {
            require(['io.ox/mail/write/main'], function (m) {
                m.getApp().launch().done(function () {
                    this.compose();
                });
            });
        }
    });

    new Action('io.ox/mail/actions/delete', {
        id: 'delete',
        requires: 'some delete',
        multiple: function (list) {
            api.remove(list);
        }
    });

    new Action('io.ox/mail/actions/reply-all', {
        id: 'reply-all',
        requires: function (e) {
            // other recipients that me?
            var multiple = (e.context.to || []).length && (e.context.cc || []).length;
            return multiple && e.collection.has('one') && e.context.folder_id !== defaultDraftFolder;
        },
        action: function (data) {
            require(['io.ox/mail/write/main'], function (m) {
                m.getApp().launch().done(function () {
                    this.replyall(data);
                });
            });
        }
    });

    new Action('io.ox/mail/actions/reply', {
        id: 'reply',
        requires: function (e) {
            return e.collection.has('one') && e.context.folder_id !== defaultDraftFolder;
        },
        action: function (data) {
            require(['io.ox/mail/write/main'], function (m) {
                m.getApp().launch().done(function () {
                    this.reply(data);
                });
            });
        }
    });

    new Action('io.ox/mail/actions/forward', {
        id: 'forward',
        requires: function (e) {
            return e.collection.has('some');
        },
        action: function (data) {
            require(['io.ox/mail/write/main'], function (m) {
                m.getApp().launch().done(function () {
                    this.forward(data);
                });
            });
        }
    });

    new Action('io.ox/mail/actions/edit', {
        id: 'edit',
        requires: function (e) {
            return e.collection.has('one') && e.context.folder_id === defaultDraftFolder;
        },
        action: function (data) {
            require(['io.ox/mail/write/main'], function (m) {
                m.getApp().launch().done(function () {
                    var self = this;
                    this.compose(data).done(function () {
                        self.setMsgRef(data.folder_id + '/' + data.id);
                        self.markClean();
                    });
                });
            });
        }
    });

    new Action('io.ox/mail/actions/source', {
        id: 'source',
        action: function (data) {
            api.getSource(data).done(function (srcData) {
                require(["io.ox/core/tk/dialogs"], function (dialogs) {
                    var dialog = new dialogs.ModalDialog()
                        .addButton("ok", "OK");
                    dialog.getContentNode().append($('<pre>').text(srcData));
                    dialog.show();
                });
            });
        }
    });

    new Action('io.ox/mail/actions/markunread', {
        id: 'markunread',
        requires: function (e) {
            return api.getList(e.context).pipe(function (list) {
                return _(list).reduce(function (memo, data) {
                    return memo && (data.flags & api.FLAGS.SEEN) === api.FLAGS.SEEN;
                }, true);
            });
        },
        multiple: function (list) {
            api.getList(list).done(function (list) {
                api.update(list, { flags: api.FLAGS.SEEN, value: false });
            });
        }
    });

    new Action('io.ox/mail/actions/markread', {
        id: 'markread',
        requires: function (e) {
            return api.getList(e.context).pipe(function (list) {
                return _(list).reduce(function (memo, data) {
                    return memo || (data.flags & api.FLAGS.SEEN) === 0;
                }, false);
            });
        },
        multiple: function (list) {
            api.getList(list).done(function (list) {
                api.update(list, { flags: api.FLAGS.SEEN, value: true });
            });
        }
    });

    // toolbar

    ext.point('io.ox/mail/links/toolbar').extend(new links.Link({
        index: 100,
        id: 'compose',
        label: 'Compose new email',
        ref: 'io.ox/mail/actions/compose'
    }));

    ext.point('io.ox/mail/links/toolbar').extend(new links.Link({
        index: 200,
        id: 'reader',
        label: 'Light!',
        ref: 'io.ox/mail/actions/reader'
    }));

    // inline links

    ext.point('io.ox/mail/links/inline').extend(new links.Link({
        index: 100,
        id: 'reply-all',
        label: 'Reply All',
        ref: 'io.ox/mail/actions/reply-all'
    }));

    ext.point('io.ox/mail/links/inline').extend(new links.Link({
        index: 200,
        id: 'reply',
        label: 'Reply',
        ref: 'io.ox/mail/actions/reply'
    }));

    ext.point('io.ox/mail/links/inline').extend(new links.Link({
        index: 300,
        id: 'forward',
        label: 'Forward',
        ref: 'io.ox/mail/actions/forward'
    }));

    ext.point('io.ox/mail/links/inline').extend(new links.Link({
        index: 400,
        id: 'edit',
        label: 'Edit',
        ref: 'io.ox/mail/actions/edit'
    }));


    ext.point('io.ox/mail/links/inline').extend(new links.Link({
        index: 500,
        id: 'markunread',
        label: 'Mark Unread',
        ref: 'io.ox/mail/actions/markunread'
    }));

    ext.point('io.ox/mail/links/inline').extend(new links.Link({
        index: 501,
        id: 'markread',
        label: 'Mark read',
        ref: 'io.ox/mail/actions/markread'
    }));

    function changeLabel(options, color) {
        return api.update(options, { color_label: color, value: true });
    }

    ext.point('io.ox/mail/links/inline').extend({
        index: 503,
        id: 'doofesDropDown',
        draw: function (options) {
            var labelList = $('<ul>'),

                dropdown = $('<div>', {
                    'class': 'labeldropdown dropdown'
                }).append(labelList),

                link = $('<a>', {
                    'class': 'io-ox-action-link',
                    //'href': '#',
                    'tabindex': 1,
                    'data-action': 'label'
                }).text('Label')
                .click(function (e) {
                    var linkWidth = link.outerWidth(),
                        dropDownWidth = dropdown.outerWidth(),
                        coords = link.position();
                    dropdown.css('left', coords.left + (linkWidth - dropDownWidth))
                            .css('top', coords.top + link.outerHeight())
                            .css('zIndex', 1)
                            .slideToggle("fast");
                }).blur(function (e) {
                    dropdown.delay(100).slideUp('fast');
                });

            _(api.COLORS).each(function (index, color) {
                var li = $('<li>').text(color).click(function (e) {
                        changeLabel(options, api.COLORS[color]);
                    });
                if (_.isEqual(options.color_label, api.COLORS[color])) {
                    li.addClass('active');
                }
                labelList.append(li);
            });

            this.append(link).append(dropdown);
        }
    });

    ext.point('io.ox/mail/links/inline').extend(new links.Link({
        index: 600,
        id: 'source',
        label: 'View Source',
        ref: 'io.ox/mail/actions/source'
    }));

    ext.point('io.ox/mail/links/inline').extend(new links.Link({
        index: 700,
        id: 'delete',
        label: 'Delete',
        ref: 'io.ox/mail/actions/delete',
        special: "danger"
    }));

});
