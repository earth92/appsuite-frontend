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

define('io.ox/mail/view-grid-template',
    ['io.ox/mail/util',
     'io.ox/mail/api',
     'io.ox/core/tk/vgrid',
     'io.ox/core/api/account',
     'less!io.ox/mail/style.css'], function (util, api, VGrid, account) {

    'use strict';

    var that = {

        // main grid template
        main: {
            build: function () {
                var from, date, priority, unread, subject, attachment, threadSize, flag;
                this.addClass('mail').append(
                    $('<div>').append(
                        date = $('<span>').addClass('date'),
                        from = $('<div>').addClass('from')
                    ),
                    $('<div>').append(
                        threadSize = $('<div>').addClass('thread-size'),
                        flag = $('<div>').addClass('flag').text('\u00A0'),
                        attachment = $('<i>').addClass('icon-paper-clip'),
                        priority = $('<span>').addClass('priority'),
                        $('<div>').addClass('subject')
                            .append(unread = $('<i>').addClass('icon-bookmark'))
                            .append(subject = $('<span>'))
                    )
                );
                return { from: from, date: date, priority: priority, unread: unread, subject: subject, attachment: attachment, threadSize: threadSize, flag: flag };
            },
            set: function (data, fields, index) {
                fields.priority.empty().append(util.getPriority(data));
                fields.subject.text(_.prewrap($.trim(data.subject)));
                if (!data.threadSize || data.threadSize <= 1) {
                    fields.threadSize.text('').css('display', 'none');
                } else {
                    fields.threadSize.text(data.threadSize).css('display', '');
                }
                fields.from.empty().append(
                    util.getFrom(data, account.is(data.folder_id, 'sent') ? 'to' : 'from', true)
                );
                fields.date.text(util.getTime(data.received_date));
                fields.attachment.css('display', data.attachment ? '' : 'none');
                fields.flag.get(0).className = 'flag flag_' + (data.color_label || 0);
                if (util.isUnread(data)) {
                    this.addClass('unread');
                }
                if (util.byMyself(data)) {
                    this.addClass('me');
                }
                if (util.isDeleted(data)) {
                    this.addClass('deleted');
                }
                this.attr('data-index', index);
            }
        },

        // use label concept to visualize thread overview
        thread: {
            build: function () {
            },
            set: function (data, fields, index, prev) {
                var self = this.removeClass('vgrid-label').addClass('thread-summary').empty(),
                    thread = api.getThread(prev),
                    order = api.getThreadOrder(prev);
                return api.getList(thread).done(function (list) {
                    list = order === 'desc' ? list.slice(1) : list.slice(0, -1);
                    _(list).each(function (data) {
                        var key = data.folder_id + '.' + data.id;
                        self.append(
                            $('<div>')
                            .addClass('thread-summary-item selectable')
                            .addClass(util.isUnread(data) ? 'unread' : undefined)
                            .attr('data-obj-id', key)
                            .append(
                                $('<div>').addClass('date').text(util.getTime(data.received_date)),
                                $('<div>').append(util.getFrom(data).removeClass('person'))
                            )
                        );
                    });
                });
            }
        },

        // simple grid-based list for portal & halo
        drawSimpleGrid: function (list) {

            // use template
            var tmpl = new VGrid.Template(),
                $div = $('<div>');

            // add template
            tmpl.add(that.main);

            _(list).each(function (data, i) {
                var clone = tmpl.getClone();
                clone.update(data, i);
                clone.appendTo($div).node
                    .css('position', 'relative')
                    .data('object-data', data)
                    .addClass('hover');
            });

            return $div;
        }
    };

    return that;
});
