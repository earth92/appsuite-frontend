/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2013 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/calendar/freebusy/controller',
    ['io.ox/core/tk/dialogs',
     'io.ox/calendar/week/view',
     'io.ox/calendar/freebusy/templates',
     'io.ox/core/api/folder',
     'io.ox/calendar/edit/view-addparticipants',
     'io.ox/participants/model',
     'io.ox/participants/views',
     'io.ox/core/api/user',
     'io.ox/contacts/util',
     'io.ox/calendar/api',
     'io.ox/core/notifications',
     'io.ox/calendar/view-detail',
     'gettext!io.ox/calendar/freebusy',
     'less!io.ox/calendar/freebusy/style.css'], function (dialogs, WeekView, templates, folderAPI, AddParticipantsView, participantsModel, participantsView, userAPI, contactsUtil, api, notifications, detailView, gt) {

    'use strict';

    var that = {

        FreeBusy: function (options) {

            var self = this,
                standalone = options.standalone,
                state = $.Deferred();

            this.promise = state.promise();

            // create container node
            this.$el = templates.getMainContainer().on('dispose', function () {
                // clean up
                self.weekView.remove();
                self.participants.off();
                self.participants.reset([]);
                self.appointments.reset([]);
                self.autocomplete.remove();
                self.autocomplete = self.weekView = null;
            });

            this.update = function (e, data) {
                if (!standalone) {
                    state.resolve('update', {
                        start_date: data.start_date,
                        end_date: data.end_date,
                        participants: this.getParticipants()
                    });
                }
            };

            this.postprocess = function () {
                // hide show all checkbox
                this.weekView.showAll(false);
                // pre-fill participants list
                self.participants.reset(options.participants || []);
                // auto focus
                this.autoCompleteControls.find('.add-participant').focus();
                // scroll to proper time (resets cell height, too; deferred not to block UI)
                _.defer(function () {
                    self.weekView.setScrollPos();
                });
            };

            this.getParticipants = function () {
                return this.participants.map(function (model) {
                    return { id: model.get('id'), type: model.get('type') };
                });
            };

            this.getInterval = function () {
                var start = this.weekView.startDate;
                return { start: start + 0, end: start + api.DAY * 5 };
            };

            function toModel(obj) {
                var model = new Backbone.Model(obj);
                model.id = _.cid(obj);
                return model;
            }

            this.loadAppointments = function () {
                var list = self.getParticipants(), options = self.getInterval();
                api.freebusy(list, options).done(function (data) {
                    // check for weekView cause it might get null if user quits
                    if (self.weekView) {
                        data = _(data).chain()
                            .map(function (request, index) {
                                return _(request.data).chain()
                                    .filter(function (obj) {
                                        // ignore shown_as "free"
                                        return obj.shown_as !== 4;
                                    })
                                    .map(function (obj) {
                                        obj.index = index;
                                        return obj;
                                    })
                                    .value();
                            })
                            .flatten()
                            .value();
                        // reset now
                        self.weekView.reset(options.start, data);
                    }
                });
            };

            function unmarkAppointments() {
                self.weekView.$el.find('.appointment').removeClass('opac current');
            }

            this.sidePopup = new dialogs.SidePopup().on('close', unmarkAppointments);

            this.showAppointment = function (e, obj) {
                api.get(obj).then(
                    function (data) {
                        self.sidePopup.show(e, function (popup) {
                            popup.append(detailView.draw(data));
                        });
                    },
                    function (error) {
                        notifications.yell(error);
                        unmarkAppointments();
                    }
                );
            };

            this.refresh = _.debounce(function () {
                if (self.weekView) {
                    self.loadAppointments();
                }
            }, 200, true);

            // all appointments are stored in this collection
            this.appointments = new Backbone.Collection([]);

            // get new instance of weekview
            this.weekView = new WeekView({
                allowLasso: !standalone,
                appExtPoint: 'io.ox/calendar/week/view/appointment',
                collection: this.appointments,
                keyboard: false,
                mode: 2, // 2 = week:workweek
                showFulltime: false,
                startDate: options.start_date,
                todayClass: ''
            });

            this.weekView
                // listen to refresh event
                .on('onRefresh', function () {
                    self.appointments.reset([]);
                    self.refresh();
                })
                // listen to create event
                .on('openCreateAppointment', this.update, this)
                // listen to show appointment event
                .on('showAppointment', this.showAppointment, this);

            this.appointments.reset([]);

            var renderAppointment = this.weekView.renderAppointment;
            this.weekView.renderAppointment = function (model) {
                var $el = renderAppointment.call(self.weekView, model);
                $el.removeClass('modify reserved temporary absent free')
                    // set color by index
                    .addClass(templates.getColorClass(model.get('index')))
                    // whole-day / all-day / full-time
                    .addClass(model.get('full_time') ? 'fulltime' : '')
                    // temporary
                    .addClass(model.get('shown_as') === 2 ? 'striped' : '');
                return $el;
            };

            // participants collection
            this.participants = new participantsModel.Participants([]);
            this.participantsView = templates.getParticipantsView();

            function customize() {
                var index = this.model.collection.indexOf(this.model) || 0;
                this.$el.addClass('with-participant-color').append(
                    templates.getParticipantColor(index)
                );
            }

            function updateParticipantColors() {
                self.participants.each(function (model, index) {
                    templates.updateParticipantColor(self.participantsView, model.cid, index);
                    model.set('index', index);
                });
            }

            function drawParticipant(model) {
                self.participantsView.append(
                    new participantsView.ParticipantEntryView({ model: model, halo: true, customize: customize })
                        .render(customize).$el
                );
            }

            function removeParticipant(model) {
                var cid = model.cid;
                self.participantsView.find('[data-cid="' + cid + '"]').remove();
                updateParticipantColors();
            }

            this.participants
                .on('add', drawParticipant)
                .on('remove', removeParticipant)
                .on('reset', function () {
                    self.participantsView.empty();
                    self.participants.each(drawParticipant);
                })
                .on('add remove reset', function () {
                    self.refresh();
                });

            // construct auto-complete
            this.autoCompleteControls = templates.getAutoCompleteControls();

            // get instance of AddParticipantsView
            this.autocomplete = new AddParticipantsView({ el: this.autoCompleteControls })
                .render({
                    autoselect: true,
                    contacts: true,
                    distributionlists: true,
                    groups: true,
                    parentSelector: 'body',
                    placement: 'top',
                    resources: true
                });

            this.autocomplete.on('select', function (data) {

                if (_.isArray(data.distribution_list)) {
                    // resolve distribution lits
                    _(data.distribution_list).each(function (data) {
                        data.type = 5;
                        self.participants.add(data);
                    });
                } else if (data.type === 2) {
                    // fetch users en block first
                    self.participantsView.css('visibility', 'hidden').parent().busy();
                    // resolve group
                    userAPI.getList(data.members, true, { allColumns: true })
                        .done(function (list) {
                            // add type and polish display_name
                            _(list).each(function (obj) {
                                obj.type = 1;
                                obj.sort_name = contactsUtil.getSortName(obj);
                            });
                            _(list).chain().sortBy('sort_name').each(function (obj) {
                                self.participants.add(obj);
                            });
                        })
                        .always(function () {
                            self.participantsView.css('visibility', '').parent().idle();
                        });
                } else {
                    // single participant
                    self.participants.add(data);
                }
            });

            function clickButton(e) {
                var action = $(this).attr('data-action');
                state.resolve(action);
            }

            this.$el.append(
                templates.getHeadline(),
                templates.getParticipantsScrollpane().append(this.participantsView),
                this.weekView.render().$el.addClass('abs calendar-week-view'),
                templates.getControls().append(
                    (!standalone ? templates.getBackButton() : templates.getQuitButton()).on('click', clickButton),
                    this.autoCompleteControls,
                    !standalone ? templates.getPopover() : []
                )
            );
        },

        getInstance: function (options, callback) {

            var freebusy = new that.FreeBusy(options);
            options.$el.append(freebusy.$el);

            folderAPI.get({ folder: options.folder }).always(function (data) {
                // pass folder data over to view (needs this for permission checks)
                // use fallback data on error
                data = data.error ? { folder_id: 1, id: options.folder, own_rights: 403710016 } : data;
                freebusy.weekView.folder(data);
                // clean up
                freebusy.postprocess();
                if (callback) { callback(); }
            });

            return freebusy;
        }
    };

    return that;
});
