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
 * @author Mario Schroeder <mario.schroeder@open-xchange.com>
 * @author Edy Haryono <edy.haryono@open-xchange.com>
 */

define('io.ox/core/viewer/main', ['io.ox/core/viewer/backbone', 'io.ox/core/viewer/toolbar', 'less!io.ox/core/viewer/style'], function (backbone, toolbar) {

    'use strict';

    var Viewer = Backbone.View.extend({

        className: 'io-ox-viewer abs',

        events: {
            'click': 'onClose'
        },

        onClose: function () {
            this.remove();
        },

        initialize: function (options) {
            console.log(options, backbone, toolbar);
        },

        render: function () {
            return this;
        }
    });

    return Viewer;

});
