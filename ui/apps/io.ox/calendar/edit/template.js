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
 * @author Alexander Quast <alexander.quast@open-xchange.com>
 */

define('io.ox/calendar/edit/template',
        ['io.ox/core/extensions',
         'gettext!io.ox/calendar/edit/main',
         'io.ox/contacts/util',
         'io.ox/core/date',
         'io.ox/backbone/views',
         'io.ox/backbone/forms',
         'io.ox/calendar/edit/binding-util',
         'io.ox/calendar/edit/recurrence-view',
         'io.ox/participants/views'], function (ext, gt, util, dateAPI, views, forms, BinderUtils, RecurrenceView, pViews) {

    'use strict';

    var point = views.point('io.ox/calendar/edit/section');

    // subpoint for conflicts
    var pointConflicts = point.createSubpoint('conflicts', {
        index: 120,
        id: 'conflicts',
        className: 'additional-info'
    });

    function DateField(options) {
        var hours_typeahead = [];
        var filldate = new dateAPI.Local();
        filldate.setHours(0);
        filldate.setMinutes(0);
        for (var i = 0; i < 24; i++) {
            hours_typeahead.push(filldate.format(dateAPI.TIME));
            filldate.add(1000 * 60 * 30); //half hour
            hours_typeahead.push(filldate.format(dateAPI.TIME));
            filldate.add(1000 * 60 * 30); //half hour
        }

        var comboboxHours = {
            source: hours_typeahead,
            items: 48,
            menu: '<ul class="typeahead dropdown-menu calendaredit"></ul>',
            sorter: function (items) {
                items = _(items).sortBy(function (item) {
                    var pd = dateAPI.Local.parse(item, dateAPI.TIME);
                    return pd.getTime();
                });
                return items;
            },
            autocompleteBehavoir: false
        };
        var modelEvents = {};
        modelEvents['change:' + options.attribute] = 'setValueInField';
        modelEvents['invalid:' + options.attribute] = 'showError';
        modelEvents.valid = 'removeError';
        modelEvents['change:full_time'] = 'onFullTimeChange';

        _.extend(this, {
            tagName: 'div',
            render: function () {
                this.nodes = {};
                this.$el.append(
                        this.nodes.controlGroup = $('<div class="control-group">').append(
                            $('<label>').text(this.label),
                            $('<div class="control">').append(
                                this.nodes.dayField = $('<input type="text" class="input-small">'),
                                '&nbsp;',
                                this.nodes.timeField = $('<input type="text" class="input-mini">'),
                                '&nbsp;',
                                this.nodes.timezoneField = $('<span class="label">').text(dateAPI.Local.getTTInfoLocal(this.model.get(this.attribute)).abbr)
                            )
                        )
                );
                this.setValueInField();
                // get the right date format
                var dateFormat = dateAPI.getFormat(dateAPI.DATE).replace(/\by\b/, 'yyyy').toLowerCase();
                this.nodes.dayField.datepicker({format: dateFormat});
                this.nodes.timeField.combobox(comboboxHours);

                this.nodes.dayField.on("change", _.bind(this.updateModelDate, this));
                this.nodes.timeField.on("change", _.bind(this.updateModelTime, this));
                return this;
            },
            setValueInField: function () {
                var value = this.model.get(this.attribute);
                var cValue = (this.baton.mode === 'edit') ? dateAPI.Local.localTime(value): value;
                this.nodes.timezoneField.text(dateAPI.Local.getTTInfoLocal(value).abbr);
                this.nodes.dayField.val(BinderUtils.convertDate('ModelToView', cValue, this.attribute, this.model));
                this.nodes.timeField.val(BinderUtils.convertTime('ModelToView', cValue, this.attribute, this.model));
            },
            updateModelDate: function () {
                this.model.set(this.attribute, BinderUtils.convertDate('ViewToModel', this.nodes.dayField.val(), this.attribute, this.model));
            },
            updateModelTime: function () {
                this.model.set(this.attribute, BinderUtils.convertTime('ViewToModel', this.nodes.timeField.val(), this.attribute, this.model));
            },
            showError: function (messages) {
                this.removeError();
                this.nodes.controlGroup.addClass("error");
                var helpBlock =  this.nodes.helpBlock = $('<div class="help-block error">');
                _(messages).each(function (msg) {
                    helpBlock.append($.txt(msg));
                });
                this.$el.append(helpBlock);
            },
            removeError: function () {
                if (this.nodes.helpBlock) {
                    this.nodes.helpBlock.remove();
                    delete this.nodes.helpBlock;
                    this.nodes.controlGroup.removeClass("error");
                }
            },
            onFullTimeChange: function () {
                if (this.model.get('full_time')) {
                    this.nodes.timeField.hide();
                    this.nodes.timezoneField.hide();
                } else {
                    this.nodes.timeField.show();
                    this.nodes.timezoneField.show();
                }
            },
            modelEvents: modelEvents
        }, options);
    }

    // conflicts
    pointConflicts.extend({
        index: 100,
        id: 'io.ox/calendar/edit/conflicts/main',
        tagName: 'div',
        modelEvents: {
            'conflicts': 'showConflicts'
        },
        showConflicts: function (conflicts) {
            var self = this;
            var conflictList = $('<div>');
            require(["io.ox/core/tk/dialogs", "io.ox/calendar/view-grid-template"],
                function (dialogs, viewGrid) {
                    conflictList = viewGrid.drawSimpleGrid(conflicts);
                    new dialogs.SidePopup()
                        .delegate($(conflictList), ".vgrid-cell", function (popup, e, target) {
                            var data = target.data("appointment");
                            require(["io.ox/calendar/view-detail"], function (view) {
                                popup.append(view.draw(data));
                                data = null;
                            });
                        });

                    self.$el.append(
                        $('<h4 class="text-error">').text(gt('Conflicts detected')),
                        conflictList,
                        $('<div class="row">')
                            .css('margin-top', '10px').append(
                                $('<span class="span12">')
                                    .css('text-align', 'right').append(
                                        $('<a class="btn">')
                                            .text(gt('Cancel'))
                                            .on('click', function (e) {
                                                e.preventDefault();
                                                self.$el.empty();
                                            }),
                                        '&nbsp;',
                                        $('<a class="btn btn-danger">')
                                            .addClass('btn')
                                            .text(gt('Ignore conflicts'))
                                            .on('click', function (e) {
                                                e.preventDefault();
                                                self.model.set('ignore_conflicts', true);
                                                self.model.save();
                                            })
                                        )
                                )
                        );
                }
                );
        }
    });

    // alert error
    point.extend(new forms.ErrorAlert({
        index: 100,
        id: 'error',
        isRelevant: function (response) {
            // don't handle conflicts as error
            if (response.conflicts) {
                return false;
            }
            return true;
        }
    }));

    // title
    point.extend(new forms.InputField({
        id: 'title',
        index: 200,
        className: 'span12',
        labelClassName: 'control-label desc',
        control: '<input type="text" class="span12">',
        attribute: 'title',
        label: gt('Subject')
    }));

    // location input
    point.extend(new forms.InputField({
        id: 'location',
        className: 'span10',
        labelClassName: 'control-label desc',
        index: 300,
        control: '<input type="text" class="span12">',
        attribute: 'location',
        label: gt('Location')
    }));

    // save button
    point.basicExtend({
        id: 'save',
        draw: function (baton) {
            this.append($('<button class="btn btn-primary span2">')
                .text(baton.mode === 'edit' ? gt("Save") : gt("Create"))
                .css({marginTop: '25px', float: 'right'})
                .on('click', function () {
                    baton.model.save();
                })
            );
        },
        nextTo: 'location'
    });

    // start date
    point.extend(new DateField({
        id: 'start-date',
        index: 400,
        className: 'span6',
        attribute: 'start_date',
        label: gt('Starts on')
    }));

    // end date
    point.extend(new DateField({
        id: 'end-date',
        className: 'span6',
        index: 500,
        attribute: 'end_date',
        label: gt('Ends on')
    }), {
        nextTo: 'start-date'
    });

    // full time
    point.extend(new forms.CheckBoxField({
        id: 'full_time',
        className: 'span12',
        labelClassName: 'control-label desc',
        label: gt('All day'),
        attribute: 'full_time',
        index: 600
    }));

    // note
    point.extend(new forms.InputField({
        id: 'note',
        index: 700,
        className: 'span12',
        labelClassName: 'control-label desc',
        control: '<textarea class="note">',
        attribute: 'note',
        label: gt("Description")
    }));

    point.basicExtend({
        id: 'noteSeparator',
        index: 750,
        draw: function () {
            this.append($('<span>&nbsp;</span>').css({height: '10px'}));
        }
    });

    // alarms
    (function () {
        var reminderListValues = [
            {value: 0, format: 'minutes'},
            {value: 15, format: 'minutes'},
            {value: 30, format: 'minutes'},
            {value: 45, format: 'minutes'},

            {value: 60, format: 'hours'},
            {value: 120, format: 'hours'},
            {value: 240, format: 'hours'},
            {value: 360, format: 'hours'},
            {value: 420, format: 'hours'},
            {value: 720, format: 'hours'},

            {value: 1440, format: 'days'},
            {value: 2880, format: 'days'},
            {value: 4320, format: 'days'},
            {value: 5760, format: 'days'},
            {value: 7200, format: 'days'},
            {value: 8640, format: 'days'},
            {value: 10080, format: 'weeks'},
            {value: 20160, format: 'weeks'},
            {value: 30240, format: 'weeks'},
            {value: 40320, format: 'weeks'}
        ];

        var options = {};
        _(reminderListValues).each(function (item, index) {
            var i;
            switch (item.format) {
            case 'minutes':
                options[item.value] = gt.format(gt.ngettext('%1$d Minute', '%1$d Minutes', item.value), gt.noI18n(item.value));
                break;
            case 'hours':
                i = Math.floor(item.value / 60);
                options[item.value] = gt.format(gt.ngettext('%1$d Hour', '%1$d Hours', i), gt.noI18n(i));
                break;
            case 'days':
                i  = Math.floor(item.value / 60 / 24);
                options[item.value] = gt.format(gt.ngettext('%1$d Day', '%1$d Days', i), gt.noI18n(i));
                break;
            case 'weeks':
                i = Math.floor(item.value / 60 / 24 / 7);
                options[item.value] = gt.format(gt.ngettext('%1$d Week', '%1$d Weeks', i), gt.noI18n(i));
                break;
            }
        });

        point.extend(new forms.SelectBoxField({
            id: 'alarm',
            index: 800,
            labelClassName: 'control-label desc',
            className: "span4",
            attribute: 'alarm',
            label: gt("Reminder"),
            selectOptions: options
        }));

    }());

    // shown as
    point.extend(new forms.SelectBoxField({
        id: 'shown_as',
        index: 900,
        className: "span4",
        attribute: 'shown_as',
        label: gt("Shown as"),
        labelClassName: 'control-label desc',
        selectOptions: {
            1: gt('Reserved'),
            2: gt('Temporary'),
            3: gt('Absent'),
            4: gt('Free')
        }
    }), {
        nextTo: 'alarm'
    });

    // private?
    point.extend(new forms.CheckBoxField({
        id: 'private_flag',
        labelClassName: 'control-label desc',
        headerClassName: 'control-label desc',
        className: 'span4',
        header: gt('Type'),
        label: gt('Private'),
        attribute: 'private_flag',
        index: 1000
    }), {
        nextTo: 'shown_as'
    });

    // recurrence
    point.extend(new forms.SectionLegend({
        id: 'recurrence_legend',
        className: 'span12',
        label: gt('Recurrence'),
        index: 1100
    }));

    point.extend(new RecurrenceView({
        id: 'recurrence',
        className: 'span12',
        index: 1200
    }));

    // participants label
    point.extend(new forms.SectionLegend({
        id: 'participants_legend',
        className: 'span12',
        label: gt('Participants'),
        index: 1300
    }));

    // participants
    point.basicExtend({
        id: 'participants_list',
        index: 1400,
        draw: function (options) {
            this.append(new pViews.UserContainer({collection: options.model.getParticipants()}).render().$el);
        }
    });

    // add participants
    point.basicExtend({
        id: 'add-participant',
        index: 1500,
        draw: function (options) {
            var node = this;
            require(['io.ox/calendar/edit/view-addparticipants'], function (AddParticipantsView) {

                var collection = options.model.getParticipants();

                node.append(
                    $('<div class="input-append">').append(
                        $('<input type="text" class="add-participant">'),
                        $('<button class="btn" type="button" data-action="add">')
                            .append($('<i class="icon-plus">'))
                    )
                );

                var autocomplete = new AddParticipantsView({el: node});
                autocomplete.render();

                autocomplete.on('select', function (data) {
                    var alreadyParticipant = false, obj,
                    userId;
                    alreadyParticipant = collection.any(function (item) {
                        if (data.type === 5) {
                            return (item.get('mail') === data.mail && item.get('type') === data.type) || (item.get('mail') === data.email1 && item.get('type') === data.type);
                        } else {
                            return (item.id === data.id && item.get('type') === data.type);
                        }
                    });
                    if (!alreadyParticipant) {
                        if (data.type !== 5) {

                            if (data.mark_as_distributionlist) {
                                _.each(data.distribution_list, function (val) {
                                    var def = $.Deferred();
                                    if (val.folder_id === 6) {
                                        util.getUserIdByInternalId(val.id, def);
                                        def.done(function (id) {
                                            userId = id;
                                            obj = {id: userId, type: 1 };
                                            collection.add(obj);
                                        });
                                    } else {
                                        obj = {type: 5, mail: val.mail, display_name: val.display_name};
                                        collection.add(obj);
                                    }
                                });
                            } else {
                                collection.add(data);
                            }

                        } else {
                            obj = {type: data.type, mail: data.mail || data.email1, display_name: data.display_name, image1_url: data.image1_url || ''};
                            collection.add(obj);
                        }
                    }
                });
            });
        }
    });

    return null;
});
