/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2014 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author David Bauer <david.bauer@open-xchange.com>
 */

define('io.ox/mail/compose/view',
    ['io.ox/mail/compose/extensions',
     'io.ox/backbone/mini-views/dropdown',
     'io.ox/core/extensions',
     'io.ox/mail/api',
     'io.ox/mail/util',
     'io.ox/contacts/api',
     'settings!io.ox/mail',
     'settings!io.ox/core',
     'io.ox/core/notifications',
     'io.ox/core/api/snippets',
     'gettext!io.ox/mail'
    ], function (extensions, Dropdown, ext, mailAPI, mailUtil, contactsAPI, settings, coreSettings, notifications, snippetAPI, gt) {

    'use strict';

    var INDEX = 0,
        POINT = 'io.ox/mail/compose';

    ext.point(POINT + '/fields').extend({
        id: 'title',
        index: INDEX += 100,
        draw: extensions.title
    });

    ext.point(POINT + '/fields').extend({
        id: 'sender',
        index: INDEX += 100,
        draw: extensions.sender
    });

    ext.point(POINT + '/fields').extend({
        id: 'to',
        index: INDEX += 100,
        draw: extensions.tokenfield('To', true)
    });

    ext.point(POINT + '/fields').extend({
        id: 'cc',
        index: INDEX += 100,
        draw: extensions.tokenfield('CC')
    });

    ext.point(POINT + '/fields').extend({
        id: 'bcc',
        index: INDEX += 100,
        draw: extensions.tokenfield('BCC')
    });

    ext.point(POINT + '/fields').extend({
        id: 'subject',
        index: INDEX += 100,
        draw: extensions.subject
    });

    ext.point(POINT + '/composetoolbar').extend({
        id: 'add_attachments',
        index: INDEX += 100,
        draw: function (baton) {
            extensions.attachment.call(this, baton).done(function ($el) {
                $el.find('button[data-action="addinternal"]').click(function (e) {
                    e.preventDefault();
                    require(['io.ox/files/filepicker'], function (Picker) {
                        var picker = new Picker({
                            point: POINT,                   // prefix for custom ext. point
                            filter: function () {           // filter function
                                return true;
                            },
                            primaryButtonText: gt('Add'),
                            cancelButtonText: gt('Cancel'),
                            header: gt('Add files'),
                            multiselect: true
                        });
                        //FIXME: why must the model be binded, here?
                        picker
                            .then(baton.model.attachFiles.bind(baton.model));
                    });
                });
            }).done(function ($el) {
                $el.find('input[type="file"]').on('change', function (e) {
                    var list = [];
                    //fileList to array of files
                    _(e.target.files).each(function (file) {
                        list.push(_.extend(file, {group: 'file'}));
                    });
                    baton.model.attachFiles.call(baton.model, list);
                });
            });
        }
    });

    ext.point(POINT + '/signatures').extend({
        id: 'signature',
        index: INDEX += 100,
        draw: extensions.signature
    });

    ext.point(POINT + '/menuoptions').extend({
        id: 'editor',
        index: 100,
        draw: function () {
            this.data('view')
                .header(gt('Editor'))
                .option('editorMode', 'text', gt('Plain Text'))
                .option('editorMode', 'html', gt('Rich Text'));
        }
    });

    ext.point(POINT + '/menuoptions').extend({
        id: 'priority',
        index: 200,
        draw: function () {
            this.data('view')
                .header(gt('Priority'))
                .option('priority', 0, gt('High'))
                .option('priority', 3, gt('Normal'))
                .option('priority', 5, gt('Low'));
        }
    });

    ext.point(POINT + '/menuoptions').extend({
        id: 'options',
        index: 300,
        draw: function () {
            this.data('view')
                .header(gt('Options'))
                .option('vcard', 1, gt('Attach Vcard'))
                .option('disp_notification_to', true, gt('Delivery Receipt'));
        }
    });

    ext.point(POINT + '/composetoolbar').extend({
        id: 'menu',
        index: INDEX += 100,
        draw: function (baton) {
            var optionDropdown    = new Dropdown({ model: baton.model, label: gt('Options') }),
                signatureDropdown = new Dropdown({ model: baton.model, label: gt('Signature') })
                .option('signature', '', gt('No signature'));

            ext.point(POINT + '/menuoptions').invoke('draw', optionDropdown.$el, baton);
            ext.point(POINT + '/signatures').invoke('draw', signatureDropdown.$el, baton);

            this.append(
                $('<div class="col-xs-6 col-md-3 pull-right">').append(
                    optionDropdown.render().$el.addClass('pull-right'),
                    signatureDropdown.render().$el.addClass('pull-right signatures')
                )
            );
        }
    });

    ext.point(POINT + '/fields').extend({
        id: 'composetoolbar',
        index: INDEX += 100,
        draw: function (baton) {
            var node = $('<div class="row composetoolbar">');
            ext.point(POINT + '/composetoolbar').invoke('draw', node, baton);
            this.append(node);
        },
        redraw: function (baton) {
            var node = this.find('.row.composetoolbar');
            ext.point(POINT + '/composetoolbar').invoke('redraw', node, baton);
        }
    });

    ext.point(POINT + '/fields').extend({
        id: 'attachments',
        index: INDEX += 100,
        draw: function (baton) {
            var node = $('<div class="row attachments">');
            ext.point(POINT + '/attachments').invoke('draw', node, baton);
            this.append(node);
        }
    });

    ext.point(POINT + '/attachments').extend({
        id: 'attachmentList',
        index: 200,
        draw: function (baton) {
            var node = $('<div class="col-xs-12 attachments-list">');
            extensions.attachmentList.call(node, baton);
            node.appendTo(this);
        }
    });

    /**
     * mapping for getFieldLabel()
     * @type {object}
     */
    var mapping = {
        telephone_business1: gt('Phone (business)'),
        telephone_business2: gt('Phone (business)'),
        telephone_home1: gt('Phone (private)'),
        telephone_home2: gt('Phone (private)'),
        cellular_telephone1: gt('Mobile'),
        cellular_telephone2: gt('Mobile')
    };

    /**
     * fieldname to fieldlabel
     * @param  {string} field
     * @return {string} label
     */
    function getFieldLabel(field) {
        return mapping[field] || '';
    }

    /*
     * extension point for contact picture
     */
    ext.point(POINT +  '/contactPicture').extend({
        id: 'contactPicture',
        index: 100,
        draw: function (baton) {
            this.append(
                contactsAPI.pictureHalo(
                    $('<div class="contact-image">'),
                    $.extend(baton.data, { width: 42, height: 42, scaleType: 'contain' })
                )
            );
        }
    });

    /*
     * extension point for display name
     */
    ext.point(POINT +  '/displayName').extend({
        id: 'displayName',
        index: 100,
        draw: function (baton) {
            this.append(
                contactsAPI
                    .getDisplayName(baton.data, { halo: false, stringify: 'getMailFullName', tagName: 'div' })
                    .addClass('recipient-name')
            );
        }
    });

    // /*
    //  * extension point for halo link
    //  */
    ext.point(POINT +  '/emailAddress').extend({
        id: 'emailAddress',
        index: 100,
        draw: function (baton) {
            var data = baton.data;
            if (baton.autocomplete) {
                this.append(
                    $('<div class="ellipsis email">').append(
                        $.txt(baton.data.email + (baton.data.phone || '') + ' '),
                        getFieldLabel(baton.data.field) !== '' ?
                            $('<span style="color: #888;">').text('(' + getFieldLabel(baton.data.field) + ')') : []
                    )
                );
            } else {
                this.append(
                    $('<div>').append(
                        data.email ?
                            $('<a href="#" class="halo-link">')
                            .data({ email1: data.email })
                            .text(_.noI18n(String(data.email).toLowerCase())) :
                            $('<span>').text(_.noI18n(data.phone || ''))
                    )
                );
            }
        }
    });

    // drawAutoCompleteItem and drawContact
    // are slightly different. it's easier just having two functions.

    /*
     * extension point for autocomplete item
     */
    ext.point(POINT +  '/autoCompleteItem').extend({
        id: 'autoCompleteItem',
        index: 100,
        draw: function (baton) {
            this.addClass('io-ox-mail-compose-contact');
            baton.autocomplete = true;
            // contact picture
            ext.point(POINT + '/contactPicture').invoke('draw', this, baton);
            // display name
            ext.point(POINT + '/displayName').invoke('draw', this, baton);
            // email address
            ext.point(POINT + '/emailAddress').invoke('draw', this, baton);
        }
    });


    var MailComposeView = Backbone.View.extend({

        className: 'io-ox-mail-compose container default-content-padding',

        events: {
            'click [data-action="save"]':       'onSave',
            'click [data-action="send"]':       'onSend',
            'click [data-action="discard"]':    'onDiscard',
            'click [data-action="add-cc"]':     'toggleCC',
            'click [data-action="add-bcc"]':    'toggleBCC',
            'change [data-action="from"]':      'setFrom',
            'keyup [data-extension-id="subject"] input': 'setSubject'
        },

        initialize: function (options) {
            this.app = options.app;
            this.editorHash = {};
            this.blocked = [];
            this.editorMode = settings.get('messageFormat', 'html');
            this.messageFormat = settings.get('messageFormat', 'html');
            this.editor = null;
            this.composeMode = 'compose';
            this.textarea = $('<textarea class="plain-text">');
            this.baton = ext.Baton({
                // please don't use this data attribute - use model instead
                data: this.model.toJSON(),
                model: this.model,
                view: this
            });

            this.model.on({
                'change:editorMode': this.changeEditorMode.bind(this),
                'change:signature': this.setSelectedSignature.bind(this)
            });
            this.signatures = _.device('smartphone') ? [{ id: 0, content: this.getMobileSignature(), misc: { insertion: 'below' } }] : [];
        },

        setSubject: function (e) {
            var value = e.target ? $(e.target).val() : e;
            this.model.set('subject', value);
            this.app.setTitle(value || gt('Compose'));
        },

        setTitle: function () {
            this.app.setTitle(this.model.get('subject') || gt('Compose'));
        },

        onSave: function (e) {
            e.preventDefault();
            this.app.save();
        },

        onSend: function (e) {
            e.preventDefault();
            this.send();
        },

        send: function () {
            this.syncMail();
            // get mail
            var self = this,
                mail = this.model.getMail(),
                def = $.Deferred();

            this.blockReuse(mail.sendtype);

            function cont() {
                var win = self.app.getWindow();
                // start being busy
                win.busy();
                // close window now (!= quit / might be reopened)
                win.preQuit();

                /*if (self.attachmentsExceedQouta(mail)) {
                    notifications.yell({
                        type: 'info',
                        message: gt(
                            'One or more attached files exceed the size limit per email. ' +
                            'Therefore, the files are not sent as attachments but kept on the server. ' +
                            'The email you have sent just contains links to download these files.'
                        ),
                        duration: 30000
                    });
                }*/

                // send!
                mailAPI.send(mail, mail.files /*view.form.find('.oldschool') */)
                .always(function (result) {

                    if (result.error && !result.warnings) {
                        win.idle().show();
                        notifications.yell(result); // TODO: check if backend just says "A severe error occurred"
                        return;
                    }

                    if (result.warnings) {
                        notifications.yell('warning', result.warnings.error);
                    } else {
                        // success - some want to be notified, other's not
                        if (settings.get('features/notifyOnSent', false)) {
                            notifications.yell('success', gt('The email has been sent'));
                        }
                    }

                    // update base mail
                    var isReply = mail.sendtype === mailAPI.SENDTYPE.REPLY,
                        isForward = mail.sendtype === mailAPI.SENDTYPE.FORWARD,
                        sep = mailAPI.separator,
                        base, folder, id, msgrefs, ids;

                    if (isReply || isForward) {
                        //single vs. multiple
                        if (mail.msgref) {
                            msgrefs = [ mail.msgref ];
                        } else {
                            msgrefs = _.chain(mail.attachments)
                                .filter(function (attachment) {
                                    return attachment.content_type === 'message/rfc822';
                                })
                                .map(function (attachment) { return attachment.msgref; })
                                .value();
                        }
                        //prepare
                        ids = _.map(msgrefs, function (obj) {
                            base = _(obj.split(sep));
                            folder = base.initial().join(sep);
                            id = base.last();
                            return { folder_id: folder, id: id };
                        });
                        // update cache
                        mailAPI.getList(ids).pipe(function (data) {
                            // update answered/forwarded flag
                            if (isReply || isForward) {
                                var len = data.length;
                                for (var i = 0; i < len; i++) {
                                    if (isReply) data[i].flags |= 1;
                                    if (isForward) data[i].flags |= 256;
                                }
                            }
                            $.when(mailAPI.caches.list.merge(data), mailAPI.caches.get.merge(data))
                            .done(function () {
                                mailAPI.trigger('refresh.list');
                            });
                        });
                    }
                    //app.dirty(false);
                    self.app.quit();
                })
                .always(function (result) {
                    self.unblockReuse(mail.sendtype);
                    def.resolve(result);
                });
            }

            // ask for empty to,cc,bcc and/or empty subject
            var noRecipient = _.isEmpty(mail.to) && _.isEmpty(mail.cc) && _.isEmpty(mail.bcc);
            if ($.trim(mail.subject) === '' || noRecipient) {
                if (noRecipient) {
                    notifications.yell('error', gt('Mail has no recipient.'));
                    focus('to');
                    def.reject();
                } else if ($.trim(mail.subject) === '') {
                    // show dialog
                    require(['io.ox/core/tk/dialogs'], function (dialogs) {
                        new dialogs.ModalDialog()
                            .text(gt('Mail has empty subject. Send it anyway?'))
                            .addPrimaryButton('send', gt('Yes, send without subject'), 'send', {tabIndex: '1'})
                            .addButton('subject', gt('Add subject'), 'subject', {tabIndex: '1'})
                            .show(function () {
                                def.notify('empty subject');
                            })
                            .done(function (action) {
                                if (action === 'send') {
                                    cont();
                                } else {
                                    focus('subject');
                                    def.reject();
                                }
                            });
                    });
                }

            } else {
                cont();
            }

            return def;
        },

        attachmentsExceedQouta: function (mail) {

            var allAttachmentsSizes = [].concat(mail.files).concat(mail.attachments)
                    .map(function (m) {
                        return m.size || 0;
                    }),
                quota = coreSettings.get('properties/attachmentQuota', 0),
                accumulatedSize = allAttachmentsSizes
                    .reduce(function (acc, size) {
                        return acc + size;
                    }, 0),
                singleFileExceedsQuota = allAttachmentsSizes
                    .reduce(function (acc, size) {
                        var quotaPerFile = coreSettings.get('properties/attachmentQuotaPerFile', 0);
                        return acc || (quotaPerFile > 0 && size > quotaPerFile);
                    }, false);

            return singleFileExceedsQuota || (quota > 0 && accumulatedSize > quota);
        },

        onDiscard: function (e) {
            e.preventDefault();
            this.app.quit();
        },

        toggleCC: function (e) {
            $(e.target).toggleClass('active');
            return this.toggleInput('cc');
        },

        toggleBCC: function (e) {
            $(e.target).toggleClass('active');
            return this.toggleInput('bcc');
        },

        toggleInput: function (type, show) {
            var input = this.$el.find('[data-extension-id="' + type + '"]').toggleClass('hidden', show);
            $(window).trigger('resize.tinymce');
            return input;
        },

        loadEditor: function (content) {

            var self = this,
                editorSrc = 'io.ox/core/tk/' + (this.editorMode === 'html' ? 'html-editor' : 'text-editor');

            return require([editorSrc]).then(function (Editor) {
                return (self.editorHash[self.editorMode] = new Editor(self.textarea))
                    .done(function () {
                        self.editor = self.editorHash[self.editorMode];
                        self.editor.setPlainText(content);
                        self.editor.handleShow();
                        if (self.model.get('mode') !== 'compose') {
                            self.editor.focus();
                        }
                    });
            });
        },

        reuseEditor: function (content) {
            this.editor = this.editorHash[this.editorMode];
            this.editor.setPlainText(content);
            this.editor.handleShow();
            return $.when();
        },

        getEditor: function () {
            var def = $.Deferred();
            if (this.editor) {
                def.resolve(this.editor);
            } else {
                return this.loadEditor();
            }
            return def;
        },

        changeEditorMode: function () {
            // be busy
            this.textarea.prop('disabled', true).busy();
            if (this.editor) {
                var content = this.editor.getPlainText();
                this.editor.clear();
                this.editor.handleHide();

                // toggle editor
                this.editorMode = this.editor.tinymce ? 'text' : 'html';

                // load TEXT/HTML editor for the first time or reuse TEXT/HTML editor
                return !this.editorHash[this.editorMode] ? this.loadEditor(content) : this.reuseEditor(content);

            } else {
                // initial editor
                return this.loadEditor(this.editorMode);
            }
        },

        syncMail: function () {
            if (this.editor) {
                this.model.setContent(this.editor.getContent());
            }
        },

        setBody: function (content) {

            if (this.model.get('initial')) {
                // remove white-space at beginning except in first-line
                content = String(content || '').replace(/^[\s\xA0]*\n([\s\xA0]*\S)/, '$1');
                // remove white-space at end
                content = content.replace(/[\s\uFEFF\xA0]+$/, '');
            }

            this.editor.setContent(content);
            this.setSelectedSignature();
            this.prependNewLine();

        },

        getMobileSignature: function () {
            var value = settings.get('mobileSignature');
            if (value === undefined) {
                value =
                    //#. %s is the product name
                    gt('Sent from %s via mobile', ox.serverConfig.productName);
            }
            return value;
        },

        setSelectedSignature: function () {
            var ds = _.where(this.signatures, { id: String(this.model.get('signature')) })[0];
            if (ds) {
                ds.misc = _.isString(ds.misc) ? JSON.parse(ds.misc) : ds.misc;
                this.setSignature(ds);
            } else {
                this.removeSignature();
            }
        },

        removeSignature: function () {
            var self = this,
                isHTML = !!this.editor.find,
                currentSignature = this.model.get('currentSignature');

            // remove current signature from editor

            if (isHTML) {
                this.editor.find('.io-ox-signature').each(function () {
                    var node = $(this),
                        text = node.html()
                            //remove added image urls(tiny adds them automatically)
                            .replace(/ data-mce-src="[^"]+"\s?/, '')
                            //remove empty alt attribute(added by tiny)
                            .replace(/ alt=""/, '');

                    if (self.isSignature(text)) {
                        // remove entire node
                        node.remove();
                    } else {
                        // was modified so remove class
                        node.removeClass('io-ox-signature');
                    }
                });
            } else {
                if (currentSignature) {
                    this.editor.replaceParagraph(currentSignature, '');
                }
            }
        },

        isSignature: function (text) {
            var isHTML = !!this.editor.find;
            return mailUtil.signatures.is(text, this.signatures, isHTML);
        },

        setSignature: function (signature) {
            var text,
                isHTML = !!this.editor.find;

            this.removeSignature();

            // add signature?
            if (this.signatures.length > 0) {
                text = mailUtil.signatures.cleanAdd(signature.content, isHTML);
                if (isHTML) text = this.getParagraph(text);
                if (_.isString(signature.misc)) { signature.misc = JSON.parse(signature.misc); }
                if (signature.misc && signature.misc.insertion === 'below') {
                    this.editor.appendContent(text);
                    this.editor.scrollTop('bottom');
                } else {
                    this.editor.prependContent(text);
                    this.editor.scrollTop('top');
                }
                this.model.set('currentSignature', text);
            }
        },

        getParagraph: function (text) {
            //use div for html cause innerHTML for p tags with nested tags fail
            var node = (/(<([^>]+)>)/ig).test(text) ? $('<div>') : $('<p>');
            node.addClass('io-ox-signature')
                .append(this.editor.ln2br(text));
            return $('<div>').append(node).html();
        },

        prependNewLine: function (content) {
            var content = this.editor.getContent(),
                nl = this.editorMode === 'html' ? '<p><br></p>' : '\n\n';
            if (content !== '' && content.indexOf(nl) !== 0 && content.indexOf('<br>') !== 0) {
                this.editor.setContent(nl + content);
            }
        },

        setMail: function () {

            var self = this,
                data = this.model.toJSON();

            return this.changeEditorMode().done(function () {
                if (data.replaceBody !== 'no') {
                    self.setBody(self.model.getContent());
                }
            });
        },

        blockReuse: function (sendtype) {
            this.blocked[sendtype] = (this.blocked[sendtype] || 0) + 1;
        },

        unblockReuse: function (sendtype) {
            this.blocked[sendtype] = (this.blocked[sendtype] || 0) - 1;
            if (this.blocked[sendtype] <= 0)
                delete this.blocked[sendtype];
        },

        render: function () {
            var self = this;

            // draw all extensionpoints
            ext.point('io.ox/mail/compose/fields').invoke('draw', this.$el, this.baton);

            // add subject to app title
            this.setTitle();

            // add view specific event handling to tokenfields
            this.$el.find('input.tokenfield').each(function () {
                // get original input field from token plugin
                var input = $(this).data('bs.tokenfield').$input;
                input.on({
                    // IME support (e.g. for Japanese)
                    compositionstart: function () {
                        $(this).attr('data-ime', 'active');
                    },
                    compositionend: function () {
                        $(this).attr('data-ime', 'inactive');
                    },
                    keydown: function (e) {
                        if (e.which === 13 && $(this).attr('data-ime') !== 'active') {
                            // clear tokenfield input
                            $(this).val('');
                        }
                    },
                    // shortcuts (to/cc/bcc)
                    keyup: function (e) {
                        if (e.which === 13) return;
                        // look for special prefixes
                        var val = $(this).val();
                        if ((/^to:?\s/i).test(val)) {
                            $(this).val('');
                        } else if ((/^cc:?\s/i).test(val)) {
                            $(this).val('');
                            self.toggleInput('cc', false).find('.token-input').focus();
                        } else if ((/^bcc:?\s/i).test(val)) {
                            $(this).val('');
                            self.toggleInput('bcc', false).find('.token-input').focus();
                        }
                    }
                });
            });

            // control focus in compose mode
            if (this.model.get('mode') === 'compose') {
                this.$el.find('.tokenfield:first .token-input').focus();
            }

            this.$el.append(this.textarea);

            return this;
        }

    });

    return MailComposeView;
});
