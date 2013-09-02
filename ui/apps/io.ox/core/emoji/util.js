/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2013 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/core/emoji/util',
    ['settings!io.ox/mail'], function (settings) {

    'use strict';

    var emoji;

    return {

        processEmoji: function (text) {
            var i = 0, asciiOnly = true;
            for (i; i < text.length; i++) {
                if (text.charCodeAt(i) > 255) {
                    asciiOnly = false;
                    break;
                }
            }
            if (asciiOnly) {
                return text;
            }

            if (emoji) {
                text = emoji.softbankToUnified(text);
                text = emoji.jisToUnified(text);
                text = emoji.unifiedToImageTag(text, {
                    forceEmojiIcons: settings.get('emoji/forceEmojiIcons', false)
                });
            } else {
                require(['moxiecode/tiny_mce/plugins/emoji/main'], function (code) {
                    emoji = code;
                });
            }

            return text;
        },
        imageTagsToUnified: function (html) {
            var node = $('<div>').append(html);

            node.find('img[data-emoji-unicode]').each(function (index, node) {
                $(node).replaceWith($(node).attr('data-emoji-unicode'));
            });

            return node.html();
        }
    };

});
