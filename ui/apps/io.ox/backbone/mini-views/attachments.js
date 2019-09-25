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

define('io.ox/backbone/mini-views/attachments', [
    'io.ox/backbone/mini-views/abstract',
    'io.ox/core/api/attachment',
    'io.ox/core/tk/attachments',
    'io.ox/core/strings',
    'gettext!io.ox/core',
    'settings!io.ox/core'
], function (AbstractView, api, attachments, strings, gt, settings) {

    'use strict';

    var counter = 0;

    var ListView = AbstractView.extend({

        tagName: 'div',
        className: 'attachment-list',

        events: {
            'click .attachment .remove': 'onDeleteAttachment'
        },

        onDeleteAttachment: function (e) {
            e.preventDefault();
            var attachment = $(e.currentTarget).data();
            this.deleteAttachment(attachment);
        },

        setup: function () {

            this.attachmentsToAdd = [];
            this.attachmentsToDelete = [];
            this.attachmentsOnServer = [];
            this.allAttachments = [];

            this.listenToOnce(this.model, 'save:success', this.save);

            this.loadAttachments();
        },

        dispose: function () {
            this.stopListening();
        },

        render: function () {

            this.$el.empty().append(
                _(this.allAttachments).map(this.renderAttachment)
            );

            return this;
        },

        renderAttachment: function (attachment) {

            var size = attachment.file_size > 0 ? strings.fileSize(attachment.file_size, 1) : '\u00A0';
            return $('<div class="attachment">').append(
                $('<div class="row-1">').text(attachment.filename),
                $('<div class="row-2">').append(
                    $('<span class="filesize">').text(size)
                ),
                $('<button type="button" class="btn btn-link remove">')
                .attr({
                    'title': gt('Remove attachment'),
                    'aria-label': gt('Remove attachment') + ' ' + attachment.filename
                })
                .data(attachment)
                .append(
                    $('<i class="fa fa-minus-circle" aria-hidden="true">')
                )
            );
        },

        checkQuota: function () {
            var properties = settings.get('properties'),
                size = this.attachmentsToAdd.reduce(function (acc, attachment) {
                    return acc + (attachment.file_size || 0);
                }, 0),
                max = properties.attachmentMaxUploadSize;
            if (max && max > 0 && size > max) {
                this.model.set('quotaExceeded', {
                    actualSize: size,
                    attachmentMaxUploadSize: properties.attachmentMaxUploadSize
                });
            } else {
                this.model.unset('quotaExceeded');
            }
        },

        loadAttachments: function () {
            var self = this;
            if (this.model.id) {
                api.getAll({ module: this.options.module, id: this.model.id, folder: this.model.get('folder') || this.model.get('folder_id') })
                .done(function (attachments) {
                    self.attachmentsOnServer = attachments;
                    self.updateState();
                });
            }
        },

        updateState: function () {
            var self = this;
            this.allAttachments = _(this.attachmentsOnServer.concat(this.attachmentsToAdd)).reject(function (attachment) {
                return _(self.attachmentsToDelete).any(function (toDelete) {
                    return toDelete.id === attachment.id;
                });
            });
            // track pending attachments in contact model
            this.model.attachments(this.attachmentsToAdd.length + this.attachmentsToDelete.length);
            this.checkQuota();
            this.render();
        },

        addFile: function (file) {
            this.addAttachment({ file: file, newAttachment: true, cid: counter++, filename: file.name, file_size: file.size });
        },

        addAttachment: function (attachment) {
            this.attachmentsToAdd.push(attachment);
            this.updateState();
        },

        deleteAttachment: function (attachment) {
            if (attachment.newAttachment) {
                this.attachmentsToAdd = _(this.attachmentsToAdd).reject(function (att) {
                    return att.cid === attachment.cid;
                });
            } else {
                this.attachmentsToDelete.push(attachment);
            }
            this.updateState();
        },

        save: function () {
            var self = this,
                // 0 ready 1 delete 2 add 3 delete and add
                allDone = 0,
                errors = [],
                apiOptions = {
                    module: this.options.module,
                    id: this.model.get('id'),
                    folder: this.model.get('folder_id')
                };

            function done() {
                // track pending attachments in contact model
                if (self.options.changeCallback) {
                    self.options.changeCallback(self.model, errors);
                }
                self.model.attachments(0);
            }

            if (this.attachmentsToDelete.length) allDone++;

            if (this.attachmentsToAdd.length) allDone += 2;

            if (this.attachmentsToDelete.length) {
                api.remove(apiOptions, _(this.attachmentsToDelete).pluck('id')).then(
                    function success() {
                        allDone--;
                        if (allDone <= 0) done();
                    },
                    function fail(e) {
                        self.model.trigger('server:error', e);
                        allDone--;
                        errors.push(e);
                        if (allDone <= 0) done();
                    }
                );
            }

            if (this.attachmentsToAdd.length) {
                api.create(apiOptions, _(this.attachmentsToAdd).pluck('file')).then(
                    function success() {
                        allDone -= 2;
                        if (allDone <= 0) done();
                    },
                    function fail(e) {
                        self.model.trigger('server:error', e);
                        allDone -= 2;
                        errors.push(e);
                        if (allDone <= 0) done();
                    }
                );
            }

            if (allDone <= 0) done();

            this.attachmentsToAdd = [];
            this.attachmentsToDelete = [];
            this.attachmentsOnServer = [];
            this.allAttachments = [];
        },

        isDirty: function () {
            return this.attachmentsToDelete.length > 0 || this.attachmentsToAdd.length > 0;
        }
    });

    var UploadView = AbstractView.extend({

        className: 'fileupload',

        events: {
            'change input[type="file"]': 'onChange'
        },

        onChange: function (e) {
            e.preventDefault();

            var input = $(e.target),
                listview = this.$el.closest('.section').find('.attachment-list').data('view');
            _(input[0].files).each(listview.addFile.bind(listview));
            // WORKAROUND "bug" in Chromium (no change event triggered when selecting the same file again,
            // in file picker dialog - other browsers still seem to work)
            input[0].value = '';
            input.trigger('reset.fileupload');
        },

        render: function () {
            var button = attachments.fileUploadWidget({ buttontext: gt('Add attachment') })
                    .find('button')
                    .addClass('btn-link')
                    .removeClass('btn-default')
                    .prepend(
                        $('<i class="fa fa-plus-circle" aria-hidden="true">')
                    );

            this.$el.attr('data-add', 'attachment').append(button);
            return this;
        }
    });

    return {
        ListView: ListView,
        UploadView: UploadView
    };
});
