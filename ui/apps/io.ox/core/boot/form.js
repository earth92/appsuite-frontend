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
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/core/boot/form', [
    'io.ox/core/http',
    'io.ox/core/boot/util',
    'io.ox/core/boot/language',
    'io.ox/core/boot/support',
    'io.ox/core/boot/login/standard',
    'io.ox/core/manifests',
    'io.ox/core/capabilities'

], function (http, util, language, support, login, manifests, capabilities) {

    'use strict';

    return function () {

        var sc = ox.serverConfig, gt = util.gt;

        util.debug('Show form ...');

        // sharing
        if (util.isSharing()) {
            // prefill or hide username input in guest mode
            if (util.isGuest()) {
                var loginName = _.url.hash('login_name');
                if (_.isEmpty(loginName)) {
                    $('#io-ox-login-username').hide();
                } else {
                    $('#io-ox-login-username, #io-ox-login-restoremail').val(loginName).prop('readonly', true);
                }
            }

            if (util.isAnonymous()) {
                $('#io-ox-login-username').hide();
            }

            // message
            if (_.url.hash('message')) {
                var type = _.url.hash('message_type') || 'info';
                util.feedback(type.toLowerCase(), _.url.hash('message'));
            }

            // add skip button
            if (util.isPasswordOptional()) {
                $('#login-button').after(
                    $('<input class="btn btn-primary">').attr({
                        type: 'submit',
                        value: gt('Skip'),
                        name: 'skip',
                        id: 'skip-button',
                        'data-i18n': 'Skip'
                    })
                );
            }

            $('#io-ox-forgot-password, #io-ox-backtosignin').find('a').click(function (e) {
                e.preventDefault();
                $('#io-ox-password-forget-form, #io-ox-login-form').toggle();
            });

            $('#io-ox-password-forget-form').submit(function () {
                $(this).find('input[name="share"]').val(_.url.hash('share'));
            });
        } else {
            // hide forgot password?
            var forgotPassword = _.url.hash('forgot-password') || sc.forgotPassword;
            if (!forgotPassword || util.isSharing()) {
                // either not configured or guest user
                $('#io-ox-forgot-password').remove();
            } else {
                $('#io-ox-forgot-password').find('a').attr('href', forgotPassword);
            }
        }

        language.render();

        // update header
        $('#io-ox-login-header-prefix').text((sc.pageHeaderPrefix || '\u00A0') + ' ');
        $('#io-ox-login-header-label').text(sc.pageHeader || '\u00A0');

        // update footer
        var footer = sc.copyright ? sc.copyright + ' ' : '';
        footer += sc.version ? 'Version: ' + sc.version + ' ' : '';
        var revision = 'revision' in sc ? sc.revision : ('Rev' + ox.revision);
        footer += revision !== '' ? revision + ' ' : '';
        footer += sc.buildDate ? '(' + sc.buildDate + ')' : '';
        $('#io-ox-copyright').text(footer.replace(/\(c\)/i, '\u00A9'));

        // hide checkbox?
        if (!capabilities.has('autologin')) {
            $('#io-ox-login-store').remove();
        } else {
            // check/uncheck?
            var box = $('#io-ox-login-store-box'), cookie = _.getCookie('staySignedIn');
            if (cookie !== undefined) {
                box.prop('checked', cookie === 'true');
            } else if ('staySignedIn' in sc) box.prop('checked', !!sc.staySignedIn);
            box.on('change', function () {
                _.setCookie('staySignedIn', $(this).prop('checked'));
            });
        }

        // set username input type to text in IE
        if (_.device('IE > 9')) {
            // cannot change type with jQuery's attr()
            $('#io-ox-login-username')[0].type = 'text';
        }

        util.debug('Load "signin" plugins & set default language');

        // make sure we get 'signin' plugins
        manifests.reset();

        return $.when(
            // load extensions
            manifests.manager.loadPluginsFor('signin'),
            // use browser language
            language.setDefaultLanguage()
        )
        .always(function () {

            // autologout message
            if (_.url.hash('autologout')) {
                util.feedback('info', function () {
                    return $.txt(gt('You have been automatically signed out'));
                });
            }

            // handle browser support
            support();

            util.debug('Fade in ...');

            $('#background-loader').fadeOut(util.DURATION, function () {
                // show login dialog
                $('#io-ox-login-blocker').on('mousedown', false);
                $('#io-ox-login-form').on('submit', login);
                $('#io-ox-login-username').prop('disabled', false);
                // focus password or username
                $(util.isGuest() ? '#io-ox-login-password' : '#io-ox-login-username').focus().select();
            });
        });
    };

});
