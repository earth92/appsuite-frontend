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
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/contacts/api',

    ['io.ox/core/http',
     'io.ox/core/api/factory',
     'io.ox/core/cache'
     ], function (http, apiFactory, cache) {

    'use strict';

    // generate basic API
    var api = apiFactory({
        module: 'contacts',
        requests: {
            all: {
                action: 'all',
                folder: '6',
                columns: '20,1,500,502',
                sort: '607', // 607 = magic field
                order: 'asc'
            },
            list: {
                action: 'list',
                columns: '20,1,500,501,502,505,520,555,556,557,569,602,606'
                    // 602 = mark_as_distributionlist, 606 = image1_url
            },
            get: {
                action: 'get'
            },
            search: {
                action: 'search',
                columns: '20,1,500,501,502,505,520,555,556,557,569,602,606',
                sort: '609', // magic sort field - ignores asc/desc
                getData: function (query, autoComplete) {
                    return {
                        display_name: query + '*',
                        first_name: query + '*',
                        last_name: query + '*',
                        email1: query + '*',
                        email2: query + '*',
                        email3: query + '*',
                        orSearch: true,
                        emailAutoComplete: !!autoComplete
                    };
                }
            }
        }
    });

    // fix backend WAT
    function wat(data, id) {
        if (data[id] === '' || data[id] === undefined) {
            delete data[id];
        }
    }

    api.create = function (data, file) {

        // TODO: Ask backend for a fix, until that:
        wat(data, 'email1');
        wat(data, 'email2');
        wat(data, 'email3');

        var method, body;

        if (file) {
            var body = new FormData();
            body.append('file', file);
            body.append('json', JSON.stringify(data));
            method = 'UPLOAD';
        } else {
            body = data;
            method = 'PUT';
        }

        // go!
        return http[method]({
                module: 'contacts',
                params: { action: 'new' },
                data: body,
                appendColumns: false,
                fixPost: true
            })
            .pipe(function (fresh) {
                // UPLOAD does not process response data, so ...
                fresh = fresh.data || fresh;
                // get brand new object
                return api.get({ id: fresh.id, folder: data.folder_id });
            })
            .pipe(function (d) {
                return $.when(
                    api.caches.all.grepRemove(d.folder_id + '\t'),
                    contactPictures.clear()
                )
                .pipe(function () {
                    api.trigger('refresh.all');
                    api.trigger('created', { id: d.id, folder: d.folder_id });
                    return d;
                });
            });
    };

    api.edit =  function (o) {

        if (_.isEmpty(o.data)) {
            return $.when();
        } else {
            return http.PUT({
                    module: 'contacts',
                    params: {
                        action: 'update',
                        id: o.id,
                        folder: o.folder,
                        timestamp: o.timestamp
                    },
                    data: o.data,
                    appendColumns: false
                })
                .pipe(function () {
                    // get updated contact
                    return api.get({ id: o.id, folder: o.folder }, false)
                        .pipe(function (data) {
                            $.when(
                                api.caches.all.grepRemove(o.folder + '\t'),
                                api.caches.list.remove({ id: o.id, folder: o.folder }),
                                contactPictures.clear()
                            )
                            .pipe(function () {
                                api.trigger('refresh.list');
                                api.trigger('edit', { // TODO needs a switch for created by hand or by test
                                    id: o.id,
                                    folder: o.folder
                                });
                                return data;
                            });
                        });
                })
                .fail(function () {
                    console.log('connection lost'); //what to do if fails?
                });
        }
    };

    api.editNewImage = function (o, changes, file) {

        var form = new FormData();
        form.append('file', file);
        form.append('json', JSON.stringify(changes));

        return http.UPLOAD({
                module: 'contacts',
                params: { action: 'update', id: o.id, folder: o.folder_id, timestamp: o.timestamp || _.now() },
                data: form,
                fixPost: true
            })
            .pipe(function () {
                return $.when(
                    api.caches.get.clear(),
                    api.caches.list.clear(),
                    contactPictures.clear()
                );
            })
            .done(function () {
                api.trigger('refresh.list');
            });
    };

    api.remove =  function (list) {
        // get array
        list = _.isArray(list) ? list : [list];
        // remove
        return http.PUT({
                module: 'contacts',
                params: { action: 'delete', timestamp: _.now() },
                appendColumns: false,
                data: _(list).map(function (data) {
                    return { folder: data.folder_id, id: data.id };
                })
            })
            .pipe(function () {
                return $.when(
                    api.caches.all.clear(),
                    api.caches.list.remove(list),
                    contactPictures.clear()
                );
            })
            .done(function () {
                api.trigger('refresh.all');
            });
    };

    var autocompleteCache = new cache.SimpleCache('contacts-autocomplete', true);

    api.on('refresh.all', function () {
        autocompleteCache.clear();
    });

    api.autocomplete = function (query) {

        function process(list, obj, field) {
            if (obj[field]) {
                var name, a = obj.last_name, b = obj.first_name, c = obj.display_name;
                if (a && b) {
                    // use last_name & first_name
                    name = a + ', ' + b;
                } else if (c) {
                    // use display name
                    name = c + '';
                } else {
                    // use last_name & first_name
                    name = [];
                    if (a) { name.push(a); }
                    if (b) { name.push(b); }
                    name = name.join(', ');
                }
                list.push({
                    display_name: name,
                    email: obj[field].toLowerCase(),
                    contact: obj
                });
            }
        }

        return autocompleteCache.get(query).pipe(function (data) {
            if (data !== null) {
                return data;
            } else {
                query = String(query || '').toLowerCase();
                return api.search(query, true)
                    .pipe(function (data) {
                        var tmp = [], hash = {};
                        // improve response
                        // 1/2: resolve email addresses
                        _(data).each(function (obj) {
                            if (obj.mark_as_distributionlist) {
                                // distribution list
                                tmp.push({
                                    display_name: obj.display_name || '',
                                    email: 'will not be resolved',
                                    contact: obj
                                });
                            } else {
                                // email
                                process(tmp, obj, 'email1');
                                process(tmp, obj, 'email2');
                                process(tmp, obj, 'email3');
                            }
                        });
                        // 2/2: filter distribution lists & remove email duplicates
                        tmp = _(tmp).filter(function (obj) {
                            var isDistributionList = obj.contact.mark_as_distributionlist === true,
                                isDuplicate = obj.email in hash;
                            if (isDistributionList) {
                                return String(obj.display_name || '').toLowerCase().indexOf(query) > -1;
                            } else {
                                return isDuplicate ? false : (hash[obj.email] = true);
                            }
                        });
                        hash = null;
                        return tmp;
                    })
                    .done(function (data) {
                        autocompleteCache.add(query, data);
                    });
            }
        });
    };

    // simple contact picture cache
    var contactPictures = new cache.SimpleCache('picture-by-mail', true);

    // get contact picture by email address
    api.getPictureByMailAddress = function (address) {

        // lower case!
        address = String(address).toLowerCase();

        return contactPictures.get(address).pipe(function (data) {
            if (data !== null) {
                return data;
            } else {
                return http.PUT({
                    module: 'contacts',
                    params: {
                        action: 'search',
                        columns: '20,1,500,606'
                    },
                    data: {
                        email1: address,
                        email2: address,
                        email3: address,
                        orSearch: true
                    }
                })
                .pipe(function (data) {
                    // focus on contact with an image
                    data = $.grep(data, function (obj) {
                        return !!obj.image1_url;
                    });
                    if (data.length) {
                        // favor contacts in global address book
                        data.sort(function (a, b) {
                            return b.folder_id === '6' ? +1 : -1;
                        });
                        // remove host
                        data[0].image1_url = data[0].image1_url
                            .replace(/^https?\:\/\/[^\/]+/i, '')
                            .replace(/^\/ajax/, ox.apiRoot);
                        // use first contact
                        return contactPictures.add(address, data[0].image1_url);
                    } else {
                        // no picture found
                        return contactPictures.add(address, '');
                    }
                });
            }
        });
    };

    api.getPictureURL = function (obj) {

        var deferred = $.Deferred(),
            defaultUrl = ox.base + '/apps/themes/default/dummypicture.png',
            fail = function () {
                deferred.resolve(defaultUrl);
            };

        if (typeof obj === 'string') {
            // assume input is email address
            api.getPictureByMailAddress(obj)
                .done(function (url) {
                    deferred.resolve(url || defaultUrl);
                })
                .fail(fail);
        } else if (typeof obj === 'object' && obj !== null) {
            // also look for contact_id to support user objects directly
            api.get({ id: obj.contact_id || obj.id, folder: obj.folder_id || obj.folder })
                .done(function (data) {
                    if (data.image1_url) {
                        deferred.resolve(data.image1_url.replace(/^\/ajax/, ox.apiRoot));
                    } else {
                        fail();
                    }
                })
                .fail(fail);
        } else {
            fail();
        }

        return deferred;
    };

    api.getPicture = function (obj) {
        var node, set, clear, cont;
        node = $('<div>');
        set = function (e) {
            if (Modernizr.backgroundsize) {
                node.css('backgroundImage', 'url(' + e.data.url + ')');
            } else {
                node.append(
                    $('<img>', { src: e.data.url, alt: '' }).css({ width: '100%', height: '100%' })
                );
            }
            if (/dummypicture\.png$/.test(e.data.url)) {
                node.addClass('default-picture');
            }
            clear();
        };
        clear = function () {
            _.defer(function () { // use defer! otherwise we return null on cache hit
                node = set = clear = cont = null; // don't leak
            });
        };
        cont = function (url) {
            // use image instance to make sure that the image exists
            $(new Image())
                .on('load', { url: url }, set)
                .on('error', { url: ox.base + '/apps/themes/default/dummypicture.png' }, set)
                .prop('src', url);
        };
        if (obj && _.isString(obj.image1_url)) {
            cont(obj.image1_url.replace(/^\/ajax/, ox.apiRoot));
        } else {
            api.getPictureURL(obj).done(cont).fail(clear);
        }
        return node;
    };

    var copymove = function (list, action, targetFolderId) {
        // allow single object and arrays
        list = _.isArray(list) ? list : [list];
        // pause http layer
        http.pause();
        // process all updates
        _(list).map(function (o) {
            return http.PUT({
                module: 'contacts',
                params: {
                    action: action || 'update',
                    id: o.id,
                    folder: o.folder_id || o.folder,
                    timestamp: o.timestamp || _.now() // mandatory for 'update'
                },
                data: { folder_id: targetFolderId },
                appendColumns: false
            });
        });
        // resume & trigger refresh
        return http.resume()
            .pipe(function () {
                return $.when.apply($,
                    _(list).map(function (o) {
                        return $.when(
                            api.caches.all.grepRemove(targetFolderId + '\t'),
                            api.caches.all.grepRemove(o.folder_id + '\t'),
                            api.caches.list.remove({ id: o.id, folder: o.folder_id })
                        );
                    })
                );
            })
            .done(function () {
                api.trigger('refresh.all');
            });
    };

    api.move = function (list, targetFolderId) {
        return copymove(list, 'update', targetFolderId);
    };

    api.copy = function (list, targetFolderId) {
        return copymove(list, 'copy', targetFolderId);
    };

    return api;

});
