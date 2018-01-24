/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2017 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Daniel Dickhaus <daniel.dickhaus@open-xchange.com>
 */

define('io.ox/participants/chronos-detail', [
    'io.ox/calendar/util',
    'io.ox/core/extensions',
    'io.ox/contacts/util',
    'io.ox/mail/util',
    'io.ox/core/util',
    'gettext!io.ox/core',
    'less!io.ox/participants/style'
], function (util, ext, contactsUtil, mailUtil, coreUtil, gt) {

    'use strict';

    //used to display participants in calendar detail views when chronos api is used

    ext.point('io.ox/participants/chronos/item').extend({
        index: 100,
        id: 'resource',
        draw: function (baton) {
            var data = baton.data;
            if (data.cuType !== 'RESOURCE') return;
            if (!baton.options.halo) return this.append($.txt(data.cn));

            this.append(
                $('<a href="#" role="button" class="halo-resource-link">')
                    .attr('title', data.cn)
                    // 'looksLikeResource' duck check
                    .data(_.extend(data, { email1: data.email }))
                    .append($.txt(data.cn))
            );
        }
    });

    ext.point('io.ox/participants/chronos/item').extend({
        index: 200,
        id: 'person',
        draw: function (baton) {
            if (baton.data.cuType === 'RESOURCE') return;

            var display_name, html, opt;
            if (baton.data.contact) {
                display_name = mailUtil.getDisplayName([baton.data.cn, baton.data.email], { showMailAddress: true });
                html = baton.data.full_name ? $(baton.data.full_name) : $.txt(display_name);
                opt = _.extend({ html: html }, baton.data);
            } else {
                opt = _.extend({ html: $.txt(baton.data.cn) }, baton.data);
            }

            if (!baton.options.halo) opt.$el = $('<span>');
            if (baton.data.entity) opt.user_id = baton.data.entity;

            this.append(
                coreUtil.renderPersonalName(opt, baton.data)
            );
        }
    });

    ext.point('io.ox/participants/chronos/item').extend({
        index: 300,
        id: 'status',
        draw: function (baton) {
            var data = baton.data,
                confirm = baton.data.cuType !== 'RESOURCE' ? util.getConfirmationSymbol(data.partStat) : '',
                comment = baton.data.cuType !== 'RESOURCE' ? data.comment || '' : '',
                statusClass = util.getConfirmationClass(data.partStat);

            this.children().first()
                .addClass(statusClass)
                .addClass(baton.data.cuType === 'RESOURCE' ? '' : 'person');

            this.append(
                // pause for screenreader
                !baton.data.isRessource ? $('<span class="sr-only">').text(', ' + util.getConfirmationLabel(data.partStat) + '.') : '',
                // has confirmation icon?
                confirm ? $('<span class="status" aria-hidden="true">').addClass(statusClass).append(confirm) : '',
                // has confirmation comment?
                comment ? $('<div class="comment">').text(comment) : ''
            );
        }
    });

    function drawParticipant(obj, options) {
        options = _.extend({
            halo: true
        }, options);

        // initialize vars
        var node = $('<li class="participant">');

        var baton = new ext.Baton({ data: obj, options: options });
        ext.point('io.ox/participants/chronos/item').invoke('draw', node, baton);

        return node;
    }

    function filterParticipants(e) {
        e.preventDefault();
        if ($(this).parent().hasClass('active')) {
            $(this).attr('aria-pressed', false);
            $('.active', e.data.participantsContainer).removeClass('active');
            $('.participant', e.data.participantsContainer).show();
        } else {
            $('.participant', e.data.participantsContainer)
                .show()
                .find('a.person:not(.' + e.data.res.css + ')')
                .parent()
                .toggle();
            $('.active', e.data.participantsContainer).removeClass('active');
            $(this).attr('aria-pressed', true).parent().addClass('active');
        }
    }

    function ParticipantsView(baton, options) {

        options = _.extend({
            //show summary
            summary: true,
            //no inline links (provide extensionpoint id here to make them show)
            inlineLinks: false,
            //halo views
            halo: true
        }, options);

        this.draw = function () {

            var list = baton.model.get('attendees') || [],
                participantsContainer = list.length ? $('<div class="participants-view">') : $();

            if (list.length) {
                participantsContainer.busy();
                // get users
                var users = _(list)
                    .filter(function (obj) {
                        return obj.cuType === 'INDIVIDUAL' && obj.entity;
                    });
                // get external
                var external = _(list)
                    .filter(function (obj) {
                        return obj.cuType === 'INDIVIDUAL' && !obj.entity;
                    });
                // get resources
                var resources = _(list)
                    .filter(function (obj) {
                        return obj.cuType === 'RESOURCE';
                    });

                // loop over persons
                var participantListNode;
                if (users.length) {
                    participantsContainer.append(
                        $('<fieldset>').append(
                            $('<legend class="io-ox-label">').append(
                                $('<h2>').text(gt('Participants'))
                            ),
                            participantListNode = $('<ul class="participant-list list-inline">')
                        )
                    );
                }

                // users
                _(users)
                    .chain()
                    .map(function (obj) {
                        if (obj.contact) {
                            obj.full_name = contactsUtil.getFullName(obj.contact, true);
                            obj.sort_name = obj.contact.last_name || obj.contact.first_name || obj.contact.display_name || '';
                        } else {
                            obj.sort_name = obj.cn;
                        }
                        return obj;
                    })
                    .sortBy(function (obj) {
                        return obj.sort_name;
                    })
                    .each(function (obj) {
                        participantListNode.append(drawParticipant(obj, options));
                    });

                //external Participants get their own section
                var extList;
                if (external.length > 0) {
                    participantsContainer.append(
                        $('<fieldset>').append(
                            $('<legend class="io-ox-label">').append(
                                $('<h2>').text(gt('External participants'))
                            ),
                            extList = $('<ul class="participant-list list-inline">')
                        )
                    );
                }

                // loop over external participants
                _(external).each(function (obj) {
                    extList.append(drawParticipant(obj, options));
                });
                // resources
                if (resources.length) {
                    var plist;
                    participantsContainer.append(
                        $('<fieldset>').append(
                            $('<legend class="io-ox-label">').append(
                                $('<h2>').text(gt('Resources'))
                            ),
                            plist = $('<ul class="participant-list list-inline">')
                        )
                    );
                    // loop over resources
                    _(resources)
                        .chain()
                        .sortBy(function (obj) {
                            return obj.display_name;
                        })
                        .each(function (obj) {
                            plist.append(drawParticipant(obj, options));
                        });
                }

                // add summary
                var sumData = util.getConfirmationSummary(list, { chronos: true });
                if (options.summary && sumData.count > 3) {
                    participantsContainer.find('legend').first().append(
                        $('<ul class="summary list-inline pull-right">').attr('aria-label', gt('Summary')).append(
                            _.map(sumData, function (res) {
                                if (!_.isNumber(res.count) || res.count <= 0) return;

                                return $('<li>').append(
                                    $('<a href="#" role="button" aria-pressed="false">').text(res.count).attr('aria-label', res.title + ' ' + res.count).prepend(
                                        $('<span class="status">').addClass(res.css).append(res.icon)
                                    )
                                    .on('click', { participantContainer: participantsContainer, res: res }, filterParticipants)
                                );
                            })
                        )
                    );
                }

                // draw action links if extension point is provided
                if (options.inlineLinks) ext.point(options.inlineLinks).invoke('draw', participantsContainer, baton);

                // finish
                participantsContainer.idle();
            }

            return participantsContainer;
        };
    }

    return ParticipantsView;
});
