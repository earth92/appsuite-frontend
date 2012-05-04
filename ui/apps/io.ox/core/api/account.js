/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2012
 * Mail: info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/core/api/account',
    ['io.ox/core/config',
     'io.ox/core/http',
     'io.ox/core/cache',
     'io.ox/core/event'
    ], function (config, http, cache, Events) {

    'use strict';

    // quick hash for sync checks
    var idHash = {},
        // chache
        cache = new cache.ObjectCache('account', true, function (o) { return String(o.id); }),
        // default separator
        separator = config.get('modules.mail.defaultseparator', '/');

    var process = function (data) {

        var isArray = _.isArray(data);
        data = isArray ? data : [data];

        var rPath = /^default\d+/,

            fix = function (account, id, title) {
                var prefix = 'default' + account.id + separator,
                    field = id + '_fullname';
                if (account.id === 0 && !account[field]) {
                    var folder = config.get('mail.folder.' + id);
                    // folder isn't available in config
                    if (!folder) {
                        // educated guess
                        folder = config.get('mail.folder.inbox') + separator +  (account[id] || title);
                    }
                    account[field] = folder;
                } else if (!account[field]) {
                    // educated guess
                    account[field] = prefix + (account[id] || title);
                } else if (!rPath.test(account[field])) {
                    // missing prefix
                    account[field] = prefix + account[field];
                }
            };

        _(data).each(function (account) {
            idHash[account.id] = true;
            fix(account, 'trash', 'Trash');
            fix(account, 'sent', 'Sent');
            fix(account, 'drafts', 'Drafts');
            fix(account, 'spam', 'Spam');
            fix(account, 'confirmed_spam', 'Confirmed Spam');
            fix(account, 'confirmed_ham', 'Confirmed Ham');
        });

        return isArray ? data : data[0];
    };

    var invalidateRoot = function () {
        ox.api.cache.folder0.setComplete('1', false);
        ox.api.cache.folder1.setComplete('1', false);
    };

    var invalidateFolder = function (id) {
        ox.api.cache.folder0.removeChildren(id, true); // deep
        ox.api.cache.folder0.remove(id);
        ox.api.cache.folder1.removeChildren(id, true); // deep
        ox.api.cache.folder1.remove(id);
    };

    var invalidateUnifiedMail = function () {
        var children = []
            .concat(ox.api.cache.folder0.children(1))
            .concat(ox.api.cache.folder1.children(1));
        $.each(children, function (i, obj) {
            if (ox.api.folder.is('unifiedmail', obj.id)) {
                invalidateFolder(obj.id);
                return false;
            }
        });
    };

    var regParseAccountId = new RegExp('^default\\d+' + separator + '[^' + separator + ']+' + separator);

    var api = {};

    Events.extend(api);

    api.isUnified = function (id) {
        var match = String(id).match(/^default(\d+)/);
        // is account? (unified inbox is not a usual account)
        return match ? !api.isAccount(match[1]) : false;
    };

    api.isAccount = function (id) {
        return id in idHash;
    };

    api.parseAccountId = function (str, strict) {
        if (typeof str === 'number') {
            // return number
            return str;
        } else if (/^default(\d+)/.test(String(str))) {
            // is not unified mail?
            if (!api.isUnified(str)) {
                return parseInt(str.replace(/^default(\d+)(.*)$/, '$1'), 10);
            } else {
                // strip off unified prefix
                var tail = str.replace(regParseAccountId, '');
                if (tail !== str && /^default\d+/.test(tail)) {
                    return api.parseAccountId(tail, strict);
                } else {
                    if (!strict) {
                        return 0;
                    } else {
                        var m = str.match(/^default(\d+)/);
                        return m && m.length ? parseInt(m[1], 10) : 0;
                    }
                }
            }
        } else {
            // default account
            return 0;
        }
    };

    /**
     * Get mail account
     */
    api.get = function (id) {

//        var getter = function () {
//            return api.all().pipe(function () {
//                return cache.get(id);
//            });
//        };

//        return cache.get(id, getter);

        return http.GET({
            module: 'account',
            params: {
                action: 'get',
                id: id,
                columns: '1001,1004'
            },
            processResponse: true
        });
    };

    /**
     * Get all mail accounts
     */
    api.all = function () {

//        var getter = function () {
        return http.GET({
            module: 'account',
            params: { action: 'all', columns: '1001,1004,1007'},
            processResponse: true
        });
//        };

//        return cache.keys().pipe(function (keys) {
//            if (keys.length > 0) {
//                return cache.values();
//            } else {
//                return getter().pipe(function (data) {
//                    data = process(data);
//                    cache.add(data);
//                    return data;
//                });
//            }
//        });
    };

    /**
     * Create mail account
     */
//    api.create = function (options) {
//        // options
//        var opt = $.extend({
//            data: {},
//            success: $.noop
//        }, options || {});
//        // go!
//        ox.api.http.PUT({
//            module: 'account',
//            appendColumns: false,
//            params: {
//                action: 'new'
//            },
//            data: opt.data,
//            success: function (data, timestamp) {
//                // process data
//                data = process(data.data);
//                // add to cache
//                ox.api.cache.account.add(data, timestamp);
//                // additionally, folder '1' has a new child
//                invalidateRoot();
//                // trigger folder event
//                ox.api.folder.dispatcher.trigger('modify');
//                // cont
//                ox.util.call(opt.success, data);
//            },
//            error: opt.error
//        });
//    };

    api.create = function (data) {
        return http.PUT({
            module: 'account',
            params: {action: 'new'},
            data: data
        })
        .done(function (d) {
            api.trigger('account_created', {id: d.id});
        });
    };

    /**
     * Remove mail account
     */
//    api.remove = function (options) {
//        // options
//        var opt = $.extend({
//            id: undefined,
//            success: $.noop
//        }, options || {});
//        // go!
//        ox.api.http.PUT({
//            module: 'account',
//            appendColumns: false,
//            params: {
//                action: 'delete'
//            },
//            data: [parseInt(opt.id, 10)], // must be an array containing a number (not a string)
//            success: function (data, timestamp) {
//                // remove from cache
//                ox.api.cache.account.remove(opt.id);
//                // invalidate root
//                invalidateRoot();
//                // invalidate folders
//                invalidateFolder('default' + opt.id);
//                // invalidate unified mail
//                invalidateUnifiedMail();
//                // trigger folder event
//                ox.api.folder.dispatcher.trigger('modify remove');
//                // cont
//                ox.util.call(opt.success, data);
//            }
//        });
//    };

    api.remove = function (data) {
        return http.PUT({
            module: 'account',
            params: {action: 'delete'},
            data: data
        });
    };

    /**
     * Validate account data
     */
    api.validate = function (data) {
        return http.PUT({
            module: 'account',
            appendColumns: false,
            params: { action: 'validate' },
            data: data
        });
    };

    /**
     * Update account
     */
    api.update = function (options) {
        // options
        var opt = $.extend({
            data: {},
            success: $.noop
        }, options || {});
        // update
        ox.api.http.PUT({
            module: 'account',
            appendColumns: false,
            params: {
                action: 'update'
            },
            data: opt.data,
            success: function (response) {
                // invalidate unified mail folders
                invalidateUnifiedMail();
                invalidateRoot();
                // process response
                var data = process(response.data);
                ox.api.cache.account.add(data);
                // trigger folder event
                ox.api.folder.dispatcher.trigger('modify');
                // continue
                ox.util.call(opt.success, data);
            },
            error: opt.error
        });
    };

    return api;
});