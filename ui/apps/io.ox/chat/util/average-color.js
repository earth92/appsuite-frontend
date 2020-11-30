/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2020 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/chat/util/average-color', [], function () {

    'use strict';

    function getAverageColor(url) {
        var def = $.Deferred();
        var img = document.createElement('img');
        img.onload = function () {
            var canvas = document.createElement('canvas');
            canvas.width = this.width;
            canvas.height = this.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(this, 0, 0, this.width, this.height);
            var c = ctx.getImageData(0, 0, this.width, this.height).data;
            var length = c.length, i = 0, r = 0, g = 0, b = 0, n = 0;
            while (i < length) {
                r += c[i];
                g += c[i + 1];
                b += c[i + 2];
                i += 4 * 5;
                n++;
            }
            r = Math.round(r / n);
            g = Math.round(g / n);
            b = Math.round(b / n);
            canvas = ctx = null;
            def.resolve('rgb(' + r + ',' + g + ',' + b + ')');
        };
        img.src = url;
        return def;
    }

    return {
        fromBlob: function (blob) {
            var url = URL.createObjectURL(blob);
            return getAverageColor(url);
        }
    };
});
