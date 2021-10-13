/*
 *
 * @copyright Copyright (c) OX Software GmbH, Germany <info@open-xchange.com>
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with OX App Suite. If not, see <https://www.gnu.org/licenses/agpl-3.0.txt>.
 *
 * Any use of the work other than as authorized under this license or copyright law is prohibited.
 *
 */

define('io.ox/contacts/enterprisepicker/dialog', [
    'io.ox/backbone/views/modal',
    'io.ox/core/tk/dialogs',
    'io.ox/backbone/mini-views/common',
    'io.ox/backbone/views/disposable',
    'io.ox/backbone/views/window',
    'io.ox/contacts/api',
    'io.ox/core/folder/api',
    'io.ox/contacts/view-detail',
    'io.ox/core/extensions',
    'io.ox/contacts/util',
    'io.ox/core/yell',
    'io.ox/core/http',
    'settings!io.ox/contacts',
    'gettext!io.ox/contacts',
    'less!io.ox/contacts/enterprisepicker/style'
], function (ModalDialog, dialogs, Mini, DisposableView, FloatingWindow, api, folderApi, detailView, ext, util, yell, http, settings, gt) {

    'use strict';

    // for convenience, so we only have to change one line
    var columns = '20,1,101,500,501,502,505,519,520,521,522,524,542,543,547,548,549,551,552,553,555,556,557,569,592,602,606,607,616,617,5,2',
        // max shown results
        limit = settings.get('enterprisePicker/limit', 100);

    // function to filter empty contacts
    var contactsFilter = function (contact) {
        // consider only spaces as empty
        var check = function (attr) { return contact[attr] && contact[attr].trim(); };

        // needs a name and some kind of contact information
        return (check('first_name') || check('last_name') || check('display_name')) && (
            check('email1') ||
            check('email2') ||
            check('email3') ||
            check('mail') ||
            check('room_number') ||
            check('telephone_business1') ||
            check('telephone_company') ||
            check('cellular_telephone1') ||
            check('telephone_business2') ||
            check('cellular_telephone2') ||
            check('telephone_home1') ||
            check('telephone_home2') ||
            check('telephone_other'));
    };

    var sectionLabels = {
        'private': gt('My address lists'),
        'public':  gt('Public address lists'),
        'shared':  gt('Shared address lists')
    };

    var detailViewDialog,
        pickerDialog;

    var SelectedContactsView = DisposableView.extend({

        tagName: 'div',
        className: 'selected-contacts-view',

        events: {
            'click button': 'removeContact'
        },

        initialize: function () {
            this.model.get('selectedContacts').on('add reset remove', this.render.bind(this));
        },

        dispose: function () {
            this.model.get('selectedContacts').off('add reset remove');
        },

        render: function () {
            var length = this.model.get('selectedContacts').length;

            this.$el.empty().toggleClass('empty', length === 0);
            if (length === 0) return this;
            var guid = _.uniqueId('selected-contacts-list-label-'),
                node = $('<ul class="list-unstyled" role="list">').attr('aria-describedby', guid);

            //#. %1$d is number of selected contacts
            this.$el.append($('<div>').attr('id', guid).text(gt.ngettext('%1$d contact selected', '%1$d contacts selected', length, length)), node);
            this.model.get('selectedContacts').each(function (contact) {
                node.append(
                    $('<li role="listitem">').append(
                        $('<div class="name">').append(util.getFullName(contact.attributes, true)),
                        $('<button class="btn">').attr({
                            'data-id': contact.get('id'),
                            'aria-label': gt('Remove contact from selection')
                        }).append($.icon('fa-times', gt('Remove contact from selection')))
                    )
                );
            });

            return this;
        },

        removeContact: function (e) {
            e.stopPropagation();
            this.model.get('selectedContacts').remove(e.currentTarget.getAttribute('data-id'));
        }
    });

    var ContactListView = DisposableView.extend({

        tagName: 'ul',
        className: 'contact-list-view list-unstyled f6-target',

        events: {
            'click li': 'updateSelection',
            'dblclick li': 'quickSelection',
            'click .show-details': 'openDetailView',
            'keydown .show-details-descendant': 'openDetailView'
        },

        initialize: function (options) {
            this.options = options;
            this.model.get('contacts').on('add reset remove', this.render.bind(this));
            this.model.get('selectedContacts').on('add reset remove', this.updateCheckboxes.bind(this));
            this.$el.on('keydown', this.onKeydown.bind(this));
            // super special button used for active descendant magic
            this.showDetailsButton = $('<button class="sr-only show-details-descendant" role="button">');
        },

        dispose: function () {
            this.model.get('contacts').off('add reset remove');
            this.model.get('selectedContacts').off('add reset remove');
        },

        renderContact: function (contact) {
            var name = util.getFullName(contact.attributes, true),
                initials = util.getInitials(contact.attributes),
                canSelect = this.options.selection.behavior !== 'none',
                mail = util.getMail(contact.attributes),
                // try to find a phone number, there are still more phone number fields. Not sure if we need all
                phone = contact.get('telephone_business1') ||
                        contact.get('telephone_business2') ||
                        contact.get('telephone_company') ||
                        contact.get('cellular_telephone1') ||
                        contact.get('cellular_telephone2') ||
                        contact.get('telephone_home1') ||
                        contact.get('telephone_home2') ||
                        contact.get('telephone_other'),
                contactPicture,
                label = _([util.getFullName(contact.attributes, false),
                    //#. %1$s name of the department a contact is working in
                    contact.get('department') ? gt('department %1$s', contact.get('department')) : '',
                    //#. %1$s job position of a contact, CEO, working student etc
                    contact.get('position') ? gt('position %1$s', contact.get('position')) : '',
                    //#. %1$s mail address of a contact
                    mail ? gt('email address %1$s', mail) : '',
                    //#. %1$s phone number of a contact
                    phone ? gt('phone number %1$s', phone) : '',
                    //#. %1$s room number of a contact
                    contact.get('room_number') ? gt('room %1$s', contact.get('room_number')) : '']).compact().join(', ');

            var node = $('<li role="option">').attr({
                'data-id': contact.get('id'),
                // used for activedescendant
                'id': this.cid + '-contact-' + contact.get('id'),
                role: canSelect ? 'option' : 'listitem',
                'aria-label': label
            }).append(
                $('<div class="flex-container multi-item-container">').append(
                    this.options.selection.behavior === 'multiple' ? $.checkbox() : '',
                    (contact.get('image1_url') ? contactPicture = $('<i class="contact-picture" aria-hidden="true">')
                        .one('appear', { url: contact.get('image1_url') ? util.getImage(contact.attributes) : api.getFallbackImage() }, function (e) {
                            $(this).css('background-image', 'url(' + e.data.url + ')');
                        }) : $('<div class="contact-picture initials" aria-hidden="true">').text(initials)),
                    $('<div class="data-container">').append(
                        $('<div class="name" aria-hidden="true">').append(name),
                        $('<div class="department" aria-hidden="true">').text(contact.get('department'))
                    )
                ),
                $('<div class="flex-container data-container">').append(
                    $('<div class="telephone" aria-hidden="true">').text(phone),
                    $('<div class="position" aria-hidden="true">').text(contact.get('position'))
                ),
                $('<div class="flex-container multi-item-container details-container">').append(
                    $('<div class="data-container">').append(
                        $('<div class="mail" aria-hidden="true">').text(mail),
                        $('<div class="room" aria-hidden="true">').text(contact.get('room_number'))
                    ),
                    // hidden from a11y. a button for the activedescendant is used instead
                    $('<span class="show-details btn btn-link" aria-hidden="true">').append($.icon('fa-info-circle', gt('Show contact details')))
                )
            );

            if (canSelect) node.attr('aria-selected', !!this.model.get('selectedContacts').get(contact.get('id')));

            this.$el.append(node);
            if (!contactPicture) return;
            contactPicture.lazyload({ container: this.options.modalBody });
        },

        render: function () {
            this.$el.empty().attr({
                role: this.options.selection.behavior === 'none' ? 'list' : 'listbox',
                'aria-label': gt('Contact list'),
                tabindex: 0
            });

            if (this.options.selection.behavior === 'multiple') this.$el.attr('aria-multiselectable', true);

            var query = this.model.get('searchQuery').trim(),
                isLastSearched = this.model.get('selectedList') === 'all' && query === '',
                contacts = isLastSearched ? this.model.get('lastContacts') : this.model.get('contacts');

            contacts.each(this.renderContact.bind(this));

            if (isLastSearched && this.$el.children().length > 0) {
                //#. This is followed by a list of contacts from the address book
                this.$el.prepend($('<div class="list-label">').text(gt('Last searched for')));
            }

            if (query !== '' && this.$el.children().length === 0) {
                this.$el.prepend($('<div class="list-label">').text(gt('No contacts found.')));
            }

            if (contacts.length && contacts.length >= limit) {
                this.$el.append($('<div class="alert alert-info list-label limit-warning">')
                    //#. %1$d is the limit of displayable contacts
                    .text(gt('You have reached the limit of %1$d contacts to display. Please enter a search term to narrow down your results.', limit)));
            }

            this.moveSelection(this.$el.find('li').first().attr('id'));

            return this;
        },

        onKeydown: function (e) {
            var $list = this.$el,
                active = $('#' + $list.attr('aria-activedescendant'));

            // ENTER/SPACE
            if (/^(13|32)$/.test(e.which)) {
                e.preventDefault();
                e.stopPropagation();
                return this.updateSelection({ currentTarget: active[0] });
            }

            // ARROW KEYS
            if (/^(37|38|39|40)$/.test(e.which)) {
                e.preventDefault();
                e.stopPropagation();
                var li = $list.children('li'),
                    next = (/39|40/.test(e.which)) ? active.next('li') : active.prev('li'),
                    wrap = (/39|40/.test(e.which)) ? li.first() : li.last();

                if (!next.length) next = wrap;
                return this.moveSelection(next.attr('id'));
            }
        },

        // moves active descendant
        moveSelection: function (id) {
            var li = this.$el.children('li'),
                next = this.$el.find('#' + id);
            if (next.length === 0) return;

            li.removeClass('active-descendant');
            next.addClass('active-descendant')[0].scrollIntoView();
            this.$el.attr('aria-activedescendant', next.attr('id'));
            next.find('.show-details').append(this.showDetailsButton);
        },

        // updates selected contacts
        updateSelection: function (e) {
            if (this.options.selection.behavior === 'none') return;

            var target = e.currentTarget,
                id = target.getAttribute('data-id'),
                model = (this.model.get('contacts').length === 0 ? this.model.get('lastContacts') : this.model.get('contacts')).get(id),
                isSelected = !!this.model.get('selectedContacts').get(id);

            if (isSelected) {
                this.model.get('selectedContacts').remove(model);
                $(target).attr('aria-selected', false);
            } else {
                // single selection or multi selection?
                if (this.options.selection.behavior === 'single') {
                    this.model.get('selectedContacts').reset([model]);
                    this.$el.find('li').attr('aria-selected', false);
                    $(target).attr('aria-selected', true);
                    return;
                }
                this.model.get('selectedContacts').add(model);
                $(target).attr('aria-selected', true);
            }
        },

        // used on double click. Selects the contact and closes the dialog
        quickSelection: function (e) {
            if (this.options.selection.behavior === 'none') return;

            var target = e.currentTarget,
                id = target.getAttribute('data-id'),
                model = (this.model.get('contacts').length === 0 ? this.model.get('lastContacts') : this.model.get('contacts')).get(id);

            // single selection or multi selection?
            if (this.options.selection.behavior === 'single') {
                this.model.get('selectedContacts').reset([model]);
            } else {
                this.model.get('selectedContacts').add(model);
            }

            if (this.options.dialog) this.options.dialog.invokeAction('select');
        },

        openDetailView: function (e) {
            // not tab or enter? use normal onKeydown
            if (e.type === 'keydown' && !/^(13|32)$/.test(e.which)) {
                this.$el.focus();
                return this.onKeydown(e);
            }

            e.stopPropagation();
            e.preventDefault();
            var target = $(e.currentTarget).closest('li'),
                id = target.attr('data-id'),
                model = (this.model.get('contacts').length === 0 ? this.model.get('lastContacts') : this.model.get('contacts')).get(id);

            this.moveSelection(target.get('id'));

            if ($(e.currentTarget).hasClass('sr-only')) e.pageX = target.find('.show-details')[0].getBoundingClientRect().x;

            detailViewDialog = new dialogs.SidePopup({ tabTrap: true, arrow: false }).setTarget($('body')).show(e, function (popup) {
                // picker has a z index of 1050
                popup.busy().closest('.io-ox-sidepopup').css('z-index', 2000);
                api.get({ id: model.get('id'), folder: model.get('folder_id') }).then(function (data) {
                    popup.idle().append(detailView.draw(new ext.Baton({ data: data })));
                }, this.close);
            });
        },

        updateCheckboxes: function () {
            var checkboxes = this.$el.find('input'),
                ids = this.model.get('selectedContacts').pluck('id');

            checkboxes.each(function (index, checkbox) {
                checkbox.checked = ids.indexOf(checkbox.getAttribute('data-id')) > -1;
            });
        }
    });

    function createInstance(options, model) {
        var app = ox.ui.createApp({
            name: 'io.ox/contacts/enterprisepicker',
            title: gt('Global address list'),
            closable: true,
            floating: true,
            size: 'width-lg'
        });

        app.setLauncher(function () {

            var win = ox.ui.createWindow({
                name: 'io.ox/contacts/enterprisepicker',
                chromeless: true,
                floating: true,
                closable: true
            });

            app.setWindow(win);

            win.show(function () {
                console.log(win.nodes.main);
                win.nodes.outer.addClass('enterprise-picker');
                var headerNode = $('<div class="enterprise-picker-header">'),
                    bodyNode = $('<div class="enterprise-picker-body">');
                win.nodes.main.append(headerNode, bodyNode);
                buildDialog(options, model, headerNode, win.nodes.main, bodyNode);
            });
        });
        return app;
    }

    function buildDialog(options, model, headerNode, contentNode, bodyNode) {
        contentNode.busy();

        var defs = [],
            lastSearchedContacts = settings.get('enterprisePicker/lastSearchedContacts', []);

        defs.push(options.useGABOnly ? folderApi.get(util.getGabId()) : folderApi.flat({ module: 'contacts', all: true }));

        http.pause();
        _(lastSearchedContacts).each(function (contact) {
            if (!contact || !contact.folder_id || !contact.id) return;
            var def = $.Deferred();
            // use get request so we can sort out broken or missing contacts better, always resolve. we don't want a missing contact to break the picker
            // we have to avoid the cache or the multiple request doesn't work correctly (strange api factory async stuff)
            api.get({ folder_id: contact.folder_id, id: contact.id }, false).always(def.resolve);
            defs.push(def);
        });
        http.resume();

        return $.when.apply($, defs).then(function (folders) {

            var folderlist;
            if (options.useGABOnly) {
                folderlist = [{ label: false, options: [{ label: folders.title, value: folders.id }] }];
            } else {
                folderlist = [{ label: false, options: [{ label: gt('Search all address lists'), value: 'all' }] }];

                // flat request returns folders in sections, add them to a single array, leave out the hidden section
                _(folders).each(function (sectionFolders, section) {
                    if (section === 'hidden') return;

                    var list = _(_(sectionFolders).filter(function (folder) {
                    // only use folders that have the "used in picker" flag if not configured otherwise
                        if (!settings.get('enterprisePicker/useUsedInPickerFlag', true)) return true;

                        return folder['com.openexchange.contacts.extendedProperties'] &&
                        folder['com.openexchange.contacts.extendedProperties'].usedInPicker &&
                        folder['com.openexchange.contacts.extendedProperties'].usedInPicker.value === 'true';

                    })).map(function (folder) {
                        return { label: folder.title, value: folder.id };
                    });

                    if (list.length === 0) return;
                    folderlist.push({ label: sectionLabels[section] || section, options: list });
                });
            }

            var lastSearchedContacts = Array.prototype.slice.call(arguments, 1);

            // filter broken stuff and save to settings
            lastSearchedContacts = lastSearchedContacts.filter(function (contact) {
                return !contact.error && (!options.useGABOnly || contact.folder_id === util.getGabId());
            });
            settings.set('enterprisePicker/lastSearchedContacts', _(lastSearchedContacts).map(function (contact) {
                return { folder_id: contact.folder_id, id: contact.id };
            })).save();

            model.set('addressLists', folderlist);
            model.get('lastContacts').reset(lastSearchedContacts);

            var updateContactsAfterSearch = function (contacts) {
                contentNode.idle();
                contacts = (contacts || []).filter(contactsFilter);
                model.get('contacts').reset(contacts);
                // update the last searched contacts
                var lastContacts = model.get('lastContacts');
                // put at start of collection, since this search is newer
                lastContacts.unshift(contacts);
                // limit to 10 by default
                lastContacts.reset(lastContacts.slice(0, settings.get('enterprisePicker/lastSearchedContactsLimit', 10)));
                settings.set('enterprisePicker/lastSearchedContacts', _(lastContacts.models).map(function (contact) {
                    return { folder_id: contact.get('folder_id'), id: contact.get('id') };
                })).save();
            };

            // show generic error message
            var showError = function () {
                // show error message
                contentNode.idle();
                model.get('contacts').reset([]);
                yell('error', gt('Could not load contacts'));
            };

            model.on('change:selectedList', function (model, selectedList) {
                var isSearch = model.get('searchQuery') && model.get('searchQuery').length > 1;
                if (selectedList === 'all' && !isSearch) return model.get('contacts').reset([]);
                contentNode.busy();

                if (isSearch) {
                    var params = { right_hand_limit: limit, omitFolder: true, folders: selectedList, folderTypes: { includeUnsubscribed: true, pickerOnly: settings.get('enterprisePicker/useUsedInPickerFlag', true) }, columns: columns, names: 'on', phones: 'on', job: 'on' };
                    if (selectedList === 'all') delete params.folders;
                    api.advancedsearch(model.get('searchQuery'), params)
                        .then(updateContactsAfterSearch, showError);
                    return;
                }
                // put the request together manually, api function has too much utility stuff
                // use advanced search without query to get all contacts. (we don't use all request here because that has no limit parameter)
                http.PUT({
                    module: 'addressbooks',
                    params: {
                        action: 'advancedSearch',
                        columns: columns,
                        right_hand_limit: limit,
                        sort: 607,
                        order: 'desc'
                    },
                    data: {
                        folders: [selectedList],
                        folderTypes: { includeUnsubscribed: true, pickerOnly: settings.get('enterprisePicker/useUsedInPickerFlag', true) }
                    }
                }).then(function (contacts) {
                    contentNode.idle();
                    contacts = (contacts || []).filter(contactsFilter);
                    model.get('contacts').reset(contacts);
                }, showError);
            });

            model.on('change:searchQuery', function (model, query) {
                var selectedList = model.get('selectedList');
                // no search query? show full selected list
                if (query.length === 0) return model.trigger('change:selectedList', model, selectedList);
                // less than minimal lentgh of characters? -> no change (MW request requires a minimum of io.ox/contacts//search/minimumQueryLength characters)
                if (query.length < settings.get('search/minimumQueryLength', 2)) return;
                contentNode.busy();
                var params = { right_hand_limit: limit, omitFolder: true, folders: selectedList, folderTypes: { includeUnsubscribed: true, pickerOnly: settings.get('enterprisePicker/useUsedInPickerFlag', true) }, columns: columns, names: 'on', phones: 'on', job: 'on' };
                if (selectedList === 'all') delete params.folders;
                api.advancedsearch(model.get('searchQuery'), params)
                    .then(updateContactsAfterSearch, showError);
            });

            contentNode.idle();

            var listSelectBox = new Mini.SelectView({ groups: true, name: 'selectedList', model: model, list: model.get('addressLists') }).render().$el;

            model.on('change:filterQuery', function () {
                var query = model.get('filterQuery').trim().toLowerCase(),
                    options = listSelectBox.find('option'),
                    optionGroups = listSelectBox.find('optgroup');
                if (!query) {
                    optionGroups.removeClass('hidden');
                    options.removeClass('hidden');
                    return;
                }

                _(options).each(function (option) {
                    $(option).removeClass('hidden');
                    // never hide the placeholder
                    if ($(option).val() === 'all') return;
                    $(option).toggleClass('hidden', option.text.toLowerCase().indexOf(query) === -1);
                });

                // hide empty optgroups
                _(optionGroups).each(function (optgroup) {
                    $(optgroup).toggleClass('hidden', $(optgroup).find('option:not(.hidden)').length === 0);
                });
            });

            headerNode.append(
                $('<div class="top-bar">').append(
                    $('<label>').text(gt('Search')).append(
                        $('<div class="input-group">').append(
                            new Mini.InputView({ name: 'searchQuery', model: model, autocomplete: false }).render().$el
                                .attr('placeholder', gt('Search for name, department, position'))
                                .on('keyup', _.debounce(function () {
                                    model.set('searchQuery', this.value);
                                }, 300)),
                            $('<span class="input-group-addon">').append($.icon('fa-search', gt('Search for name, department, position')))
                        )
                    ),
                    $('<label>').text(gt('Filter')).append(
                        $('<div class="input-group">').append(
                            new Mini.InputView({ name: 'filterQuery', model: model, autocomplete: false }).render().$el
                                .attr('placeholder', gt('Filter address lists'))
                                .on('keyup', _.debounce(function () {
                                    model.set('filterQuery', this.value);
                                }, 300)),
                            $('<span class="input-group-addon">').append($.icon('fa-filter', gt('Filter address lists')))
                        )
                    ),
                    $('<label>').text(gt('Address list')).append(
                        listSelectBox
                    )
                )
            );
            bodyNode.append(new ContactListView(_.extend({ model: model, modalBody: bodyNode }, options)).render().$el)
            .after(new SelectedContactsView({ model: model }).render().$el);

            if (options.useGABOnly) model.trigger('change:selectedList', model, util.getGabId());

        }, function (error) {
            contentNode.idle();
            console.error(error);
            bodyNode.append($('<div class="error">').text(gt('Could not load address book.')));
        });
    }

    var open = function (callback, options) {
        options = options || {};
        if (!options.selection) options.selection = { behavior: 'multiple' };

        var model = new Backbone.Model({
            searchQuery: '',
            filterQuery: '',
            selectedList: options.useGABOnly ? util.getGabId() : 'all',
            selectedContacts: new Backbone.Collection(),
            contacts: new Backbone.Collection(),
            lastContacts: new Backbone.Collection(),
            addressLists: []
        });
        if (options.selection.behavior !== 'none') {
            var dialog =  new ModalDialog({
                point: 'io.ox/contacts/enterprisepicker-dialog',
                help: 'ox.appsuite.user.sect.email.send.enterpriserpicker.html',
                title: gt('Global address list')
            })
                .build(function () {
                    var self = this;
                    this.$el.addClass('enterprise-picker');
                    options.dialog = this;
                    buildDialog(options, model, this.$('.modal-header'), this.$('.modal-content'), this.$('.modal-body')).then(function () {
                        // triggers focus and fixes "compact" class
                        self.idle();
                    }, function () {
                        self.$('.modal-footer [data-action="select"]').attr('disabled', 'disabled');
                    });
                })
                .addCancelButton()
                //#. Context: Add selected contacts; German "Auswählen", for example
                .addButton({ label: gt('Select'), action: 'select' })
                .on({
                    // this function is called recursively if a distribution list is processed
                    'select':  function processContacts(distributionListMembers) {
                        if (!model) return [];

                        var list = _(distributionListMembers || model.get('selectedContacts').toJSON()).chain()
                            .filter(function (item) {
                                item.mail_full_name = util.getMailFullName(item);
                                item.email = $.trim(item.email1 || item.email2 || item.email3 || item.mail).toLowerCase();
                                item.mail_field = item.mail_field || ('email' + (util.calcMailField(item, item.email) || 1));
                                return item.email || item.mark_as_distributionlist;
                            })
                            .map(function (item) {
                                if (item.mark_as_distributionlist) return processContacts(item.distribution_list);
                                var name = item.mail_full_name, mail = item.mail || item.email,
                                    result = {
                                        array: [name || null, mail || null],
                                        display_name: name,
                                        id: item.id,
                                        folder_id: item.folder_id,
                                        email: mail,
                                        field: item.mail_field || 'email1',
                                        user_id: item.user_id || item.internal_userid
                                    };
                                return result;
                            }, this)
                            .flatten()
                            .uniq(function (item) { return item.email; })
                            .value();

                        if (distributionListMembers) return list;
                        if (_.isFunction(callback)) callback(list);
                    },
                    'close': function () {
                        model = null;
                    }
                });
            pickerDialog = dialog;
            return dialog.open();
        }

        return createInstance(options, model).launch();
    };

    // close picker and possible detailviewDialog on
    ox.ui.apps.on('launch resume', function () {
        if (detailViewDialog && detailViewDialog.close) detailViewDialog.close();
        if (pickerDialog && pickerDialog.close) pickerDialog.close();
        pickerDialog = detailViewDialog = null;
    });

    // use same names as default addressbook picker, to make it easier to switch between the two
    return {
        open: open
    };

});
