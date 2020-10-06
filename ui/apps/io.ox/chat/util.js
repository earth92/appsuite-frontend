/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2017 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Richard Petersen <richard.petersen@open-xchange.com>
 */

define('io.ox/chat/util', [], function () {

    'use strict';

    var classNames = {
        'application/pdf': 'pdf',
        'image/svg': 'svg',
        'application/zip': 'zip',

        // images
        'image/jpeg': 'image',
        'image/gif': 'image',
        'image/bmp': 'image',
        'image/png': 'image',

        // documents
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.template': 'doc',
        'application/msword': 'doc',

        // excel
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.template': 'xls',
        'application/vnd.ms-excel': 'xls',

        // ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.slideshow': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.template': 'ppt',
        'application/vnd.ms-powerpoint': 'ppt'
    };

    var emojiRegex = new RegExp('^[\\u{1f300}-\\u{1f5ff}\\u{1f900}-\\u{1f9ff}\\u{1f600}-\\u{1f64f}\\u{1f680}-\\u{1f6ff}\\u{2600}-\\u{26ff}\\u{2700}-\\u{27bf}\\u{1f1e6}-\\u{1f1ff}\\u{1f191}-\\u{1f251}\\u{1f004}\\u{1f0cf}\\u{1f170}-\\u{1f171}\\u{1f17e}-\\u{1f17f}\\u{1f18e}\\u{3030}\\u{2b50}\\u{2b55}\\u{2934}-\\u{2935}\\u{2b05}-\\u{2b07}\\u{2b1b}-\\u{2b1c}\\u{3297}\\u{3299}\\u{303d}\\u{00a9}\\u{00ae}\\u{2122}\\u{23f3}\\u{24c2}\\u{23e9}-\\u{23ef}\\u{25b6}\\u{23f8}-\\u{23fa}]{1,3}$', 'u');

    var util = {

        isOnlyEmoji: function (str) {
            return emojiRegex.test(str);
        },

        getDeliveryStateClass: function (deliveryState) {
            if (!deliveryState) return '';
            if (deliveryState.state) return deliveryState.state;
            var members = Object.keys(deliveryState);
            return members.reduce(function (memo, email) {
                var state = deliveryState[email].state;
                if (!state) return '';
                if (state === 'server' && memo !== '') return 'server';
                if (state === 'received' && memo === 'seen') return 'received';
                return memo;
            }, 'seen');
        },

        getClassFromMimetype: function (mimetype) {
            return classNames[mimetype];
        },

        strings: {
            compare: function (a, b) {
                if (a.length < b.length) return -1;
                if (a.length > b.length) return 1;
                if (a < b) return -1;
                if (a > b) return 1;
                return 0;
            },
            greaterThan: function (a, b) {
                return util.strings.compare(a, b) > 0;
            }
        },

        isFile: function (obj) {
            if (obj instanceof File) return true;
            if (typeof obj.name === 'string' && obj.type) return true;
            return false;
        },

        makeFormData: function (attr) {
            var formData = new FormData();

            _.each(attr, function (value, key) {
                if (_.isUndefined(value)) return;

                if (_.isArray(value)) {
                    value.forEach(function (val, index) {
                        formData.append(key + '[' + index + ']', val);
                    });
                    return;
                }

                if (_.isObject(value) && !util.isFile(value)) {
                    value = JSON.stringify(value);
                }

                formData.append(key, value);
            });

            return formData;
        }

    };

    return util;

});
