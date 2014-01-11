/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2013 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/core/api/collection-pool', ['io.ox/core/api/backbone'], function (backbone) {

    'use strict';

    var collections = {}, skip = false;

    function propagateRemove(module, model) {
        if (skip) return;
        _(collections[module]).each(function (entry) {
            var target = entry.collection.get(model.cid);
            if (target) {
                skip = true;
                entry.collection.remove(target);
            }
        });
        skip = false;
    }

    function propagateChange(module, model) {
        if (skip) return;
        _(collections[module]).each(function (entry) {
            var target = entry.collection.get(model.cid), data;
            if (target) {
                skip = true;
                data = model.toJSON();
                delete data.index;
                target.set(data);
            }
        });
        skip = false;
    }

    function Pool(module) {

        var hash = collections[module] || (collections[module] = {});

        this.getCollections = function () {
            return hash;
        };

        this.get = function (cid) {

            var entry = hash[cid];

            if (entry) {
                entry.access = _.now();
                return entry.collection;
            }

            // register new collection
            hash[cid] = { access: _.now(), collection: new backbone.Collection() };

            // propagate changes in all collections
            return hash[cid].collection.on({
                'remove': propagateRemove.bind(this, module),
                'change': propagateChange.bind(this, module)
            });
        };

        this.getModule = function () {
            return module;
        };
    }

    _.extend(Pool.prototype, {

        getDefault: function () {
            return new backbone.Collection();
        },

        propagate: function (type, data) {
            if (type === 'change') {
                propagateChange.call(this, this.getModule(), new backbone.Model(data));
            }
        },

        getDetailModel: function (data) {

            var cid = _.cid(data), collection = this.get('detail'), model;

            if ((model = collection.get(cid))) return model;

            model = new backbone.Model(data);
            collection.add(model);
            return model;
        }
    });

    return Pool;
});
