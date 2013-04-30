/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2012 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('plugins/upsell/simple-wizard/register',
    ['io.ox/core/extensions',
     'io.ox/core/upsell',
     'io.ox/core/config',
     'settings!plugins/upsell/simple-wizard',
     'gettext!plugins/upsell/simple-wizard'], function (ext, upsell, config, settings, gt) {

    'use strict';

    /*
     * Used settings:
     * - url
     * - overlayOpacity
     * - overlayColor
     * - zeroPadding
     * - width
     * - height
     *
     * URL variables:
     * - $user
     * - $user_id
     * - $context_id
     * - $session
     * - $language
     * - $missing, $type, $id
     * - $hostname
     */

    var instance = null;

    var that = {

        getVariables: function (options) {
            options = options || {};
            return {
                context_id: ox.context_id,
                hostname: location.hostname,
                id: options.id || '',
                imap_login: '', // missing
                language: ox.language,
                mail: config.get('modules.mail.defaultaddress', ''),
                missing: options.missing || '',
                session: ox.session,
                type: options.type || '',
                user: ox.user,
                user_id: ox.user_id,
                user_login: '' // missing
            };
        },

        getURLTemplate: function () {
            console.warn('Deprecated. Just use "wizard.settings.url" directly');
            return that.settings.url;
        },

        getURL: function (options) {

            var url, hash = that.getVariables(options);

            url = String(that.getURLTemplate()).replace(/\$(\w+)/g, function (all, key) {
                key = String(key).toLowerCase();
                return key in hash ? encodeURIComponent(hash[key]) : '$' + key;
            });

            return url;
        },

        getIFrame: function () {
            // add iframe but with blank file (to avoid delay)
            return $('<iframe src="blank.html" allowtransparency="true" border="0" frameborder="0" framespacing="0">');
        },

        addControls: function () {
            if (that.settings.closeButton === true) {
                this.addButton('cancel', gt('Close'));
            }
        },

        getPopup: function () {
            return instance;
        },

        setSrc: function (src) {
            if (instance) {
                instance.getContentNode().idle().find('iframe').attr('src', src);
            }
        },

        // allows client-side settings during development
        settings: _.extend({
            // defaults
            zeroPadding: true,
            width: 750,
            height: 390,
            overlayOpacity: 0.5,
            overlayColor: '#000',
            url: 'blank.html?user=$user,user_id=$user_id,context_id=$context_id,' +
                'language=$language,type=$type,id=$id,missing=$missing,hostname=$hostname#session=$session'
        }, settings.get()),

        open: function (e, options) {

            if (instance) return;

            require(['io.ox/core/tk/dialogs'], function (dialogs) {
                instance = new dialogs.ModalDialog({ easyOut: false, width: that.settings.width })
                    .build(function () {
                        if (that.settings.zeroPadding) {
                            this.getPopup().addClass('zero-padding');
                        }
                        this.getContentNode()
                        .busy()
                        .css({
                            maxHeight: that.settings.height + 'px',
                            overflow: 'hidden'
                        })
                        .append(
                            // add iframe but with blank file (to avoid delay)
                            that.getIFrame()
                            .css({
                                width: '100%',
                                height: that.settings.height + 'px'
                            })
                        );
                        that.addControls.call(this);
                    })
                    .setUnderlayStyle({
                        opacity: 0,
                        backgroundColor: that.settings.overlayColor
                    })
                    .topmost()
                    .on('beforeshow', function () {
                        ox.trigger('upsell:simple-wizard:show:before', this);
                    })
                    .on('show', function () {
                        ox.off('upsell:requires-upgrade', that.open);
                        this.setUnderlayStyle({ opacity: that.settings.overlayOpacity });
                        var self = this;
                        setTimeout(function () {
                            that.setSrc(that.getURL(options));
                            ox.trigger('upsell:simple-wizard:show', self);
                        }, 250);
                    })
                    .on('close', function () {
                        ox.on('upsell:requires-upgrade', that.open);
                        ox.trigger('upsell:simple-wizard:close', this);
                        instance = null;
                    });
                instance.show();
            });
        },

        close: function () {
            if (instance) instance.close();
        },

        enable: function () {
            ox.on('upsell:requires-upgrade', that.open);
        },

        disable: function () {
            ox.off('upsell:requires-upgrade', that.open);
        }
    };

    // register for event
    that.enable();
    // upsell.demo(true); // useful during development
    return that;
});
