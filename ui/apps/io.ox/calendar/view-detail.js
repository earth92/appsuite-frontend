/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2016 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/calendar/view-detail', [
    'io.ox/core/extensions',
    'io.ox/calendar/common-extensions',
    'io.ox/calendar/util',
    'io.ox/calendar/api',
    'io.ox/core/tk/attachments',
    'io.ox/participants/chronos-detail',
    'gettext!io.ox/calendar',
    'io.ox/calendar/model',
    'io.ox/calendar/actions',
    'less!io.ox/calendar/style'
], function (ext, extensions, util, calAPI, attachments, ParticipantsView, gt, ChronosModel) {

    'use strict';

    // draw via extension points

    ext.point('io.ox/calendar/detail').extend({
        index: 100,
        id: 'inline-actions',
        draw: function (baton) {
            ext.point('io.ox/calendar/detail/actions').invoke('draw', this, baton);
        }
    });

    // draw private flag
    ext.point('io.ox/calendar/detail').extend({
        index: 150,
        id: 'private-flag',
        draw: extensions.privateFlag
    });

    // draw title
    ext.point('io.ox/calendar/detail').extend({
        index: 200,
        id: 'title',
        draw: extensions.h1
    });

    // draw appointment date & time
    ext.point('io.ox/calendar/detail').extend({
        index: 300,
        id: 'date-time',
        draw: function (baton, options) {
            var node = $('<div class="date-time-recurrence">');
            ext.point('io.ox/calendar/detail/date').invoke('draw', node, baton, _.extend({ zone: moment().tz() }, options));
            ext.point('io.ox/calendar/detail/icons').invoke('draw', node.find('.date-time'), baton);
            this.append(node);
        }
    });

    // draw icons
    ext.point('io.ox/calendar/detail/icons').extend({
        index: 100,
        id: 'additional-flags',
        draw: extensions.additionalFlags
    });

    // draw date and recurrence information
    ext.point('io.ox/calendar/detail/date').extend(
        {
            index: 100,
            id: 'date',
            draw: extensions.date
        },
        {
            index: 200,
            id: 'recurrence',
            draw: extensions.recurrence
        }
    );

    ext.point('io.ox/calendar/detail').extend({
        index: 400,
        id: 'location',
        draw: extensions.locationDetail
    });

    ext.point('io.ox/calendar/detail').extend({
        index: 450,
        id: 'recurrence-warning',
        draw: function (baton) {
            if (!(baton.data.recurrenceId && baton.data.id !== baton.data.seriesId)) return;

            // use exact check for isCreateEvent === false here or the recurrence warning is drawn on initial drawing too
            this.append($('<p class="alert alert-info recurrence-warning" role="alert">').text(gt('This appointment is an exception. Changing the series does not affect exceptions.')).toggle(baton.isCreateEvent === false));
        }
    });

    ext.point('io.ox/calendar/detail').extend({
        index: 500,
        id: 'note',
        draw: extensions.note
    });

    ext.point('io.ox/calendar/detail').extend({
        index: 600,
        id: 'participants',
        draw: function (baton) {
            var pView = new ParticipantsView(baton, { summary: true, inlineLinks: 'io.ox/calendar/detail/inline-actions-participantrelated' });
            this.append(pView.draw());
        }
    });

    ext.point('io.ox/calendar/detail/inline-actions-participantrelated').extend({
        index: 700,
        id: 'inline-actions-participantrelated',
        draw: function (baton) {
            if (!baton.model.get('attendees') || baton.model.get('attendees').length <= 1) return;
            ext.point('io.ox/calendar/detail/actions-participantrelated').invoke('draw', this, baton);
        }
    });

    // draw details
    ext.point('io.ox/calendar/detail').extend({
        index: 800,
        id: 'details',
        draw: extensions.detail
    });

    // organizer
    ext.point('io.ox/calendar/detail/details').extend({
        index: 100,
        id: 'organizer',
        draw: extensions.organizer
    });

    // sentby
    ext.point('io.ox/calendar/detail/details').extend({
        index: 150,
        id: 'sentby',
        draw: extensions.sentBy
    });

    // show as
    ext.point('io.ox/calendar/detail/details').extend({
        index: 200,
        id: 'shownAs',
        draw: extensions.shownAs
    });

    // folder
    ext.point('io.ox/calendar/detail/details').extend({
        index: 300,
        id: 'folder',
        draw: extensions.folder
    });

    //used to show deep link when outside calendar app (search, portal)
    ext.point('io.ox/calendar/detail/details').extend({
        index: 350,
        id: 'deeplink',
        draw: function (baton, options) {
            //stolen from io.ox/mail/detail/links: processDeepLinks
            if (!options || !options.deeplink) return;
            var url = util.getDeepLink(baton.data);
            this.append(
                $('<tr>').append(
                    $('<th class="detail-label">').text(gt('Direct link')),
                    $('<td class="detail">').attr('style', 'font-size: 12px;').append(
                        $('<a target="_blank" role="button" class="deep-link btn btn-primary btn-xs">')
                            .attr('href', url).text(gt('Appointment'))
                            .on('click', { baton: baton }, openDeeplink)
                    )
                )
            );
        }
    });

    function openDeeplink(e) {
        e.preventDefault();

        var baton = e.data.baton,
            folder = String(baton.data.folder);

        ox.launch('io.ox/calendar/main', { folder: folder }).done(function () {
            var app = this,
                perspective = app.props.get('layout') || 'week:week';

            ox.ui.Perspective.show(app, perspective).done(function (p) {
                function cont() {
                    if (p.selectAppointment) p.selectAppointment(baton.model);
                }

                if (app.folder.get() === folder) {
                    cont();
                } else {
                    app.folder.set(folder).done(cont);
                }
            });
        });
    }

    // created on/by
    ext.point('io.ox/calendar/detail/details').extend({
        index: 400,
        id: 'created',
        draw: extensions.created
    });

    // modified on/by
    ext.point('io.ox/calendar/detail/details').extend({
        index: 500,
        id: 'modified',
        draw: extensions.modified
    });

    ext.point('io.ox/calendar/detail').extend({
        id: 'attachments',
        index: 550,
        draw: function (baton) {
            var $node = $('<fieldset class="attachments">').append(
                $('<legend class="io-ox-label">').append(
                    $('<h2>').text(gt('Attachments'))
                )
            );

            if (baton.data.attachments && baton.data.attachments.length) {
                this.append($node);
                ext.point('io.ox/calendar/detail/attachments').invoke('draw', $node, baton);
            }
        }
    });

    ext.point('io.ox/calendar/detail/attachments').extend(new attachments.AttachmentList({
        id: 'attachment-list',
        index: 200,
        module: 1,
        selector: '.window-container.io-ox-calendar-window'
    }));

    function redraw(e, baton) {
        $(this).replaceWith(e.data.view.draw(baton));
    }

    return {

        draw: function (baton, options) {
            if (baton && !(baton instanceof ext.Baton) && baton.data) {
                baton = baton.data;
            }

            // keep event info but remove it from baton (baton sometimes is the actual event model)
            var isCreateEvent;
            if (baton && baton.isCreateEvent !== undefined) {
                isCreateEvent = baton.isCreateEvent;
                delete baton.isCreateEvent;
            }
            // make sure we have a baton
            baton = baton instanceof Backbone.Model ? new ext.Baton({ model: baton, data: baton.toJSON() }) : ext.Baton.ensure(baton);

            // if we only have one create the other
            if (baton.data && !baton.model) {
                baton.model = new ChronosModel.Model(baton.data);
            }
            if (baton.model && !baton.data) {
                baton.data = baton.model.toJSON();
            }

            options = _.extend({ minimaldata: !baton.data.folder }, options);
            if (_.device('smartphone') && !options.deeplink) {
                baton.disable('io.ox/calendar/detail/actions', 'inline-links');
            }
            try {
                var node = $.createViewContainer(baton.data, calAPI, calAPI.get, { cidGetter: calAPI.cid }).on('redraw', { view: this }, redraw);
                node.addClass('calendar-detail view user-select-text').attr('data-cid', String(util.cid(baton.data)));
                baton.isCreateEvent = isCreateEvent;
                ext.point('io.ox/calendar/detail').invoke('draw', node, baton, options);
                return node;

            } catch (e) {
                console.error('io.ox/calendar/view-detail:draw()', e);
            }
        }
    };
});
