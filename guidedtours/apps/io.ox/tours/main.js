/*
 *
 * @copyright Copyright (c) OX Software GmbH, Germany <info@open-xchange.com>
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with OX App Suite. If not, see <https://www.gnu.org/licenses/agpl-3.0.txt>.
 *
 * Any use of the work other than as authorized under this license or copyright law is prohibited.
 *
 */

define('io.ox/tours/main', [
    'io.ox/core/extensions',
    'io.ox/core/notifications',
    'io.ox/core/extPatterns/stage',
    'settings!io.ox/tours',
    'io.ox/core/capabilities',
    'gettext!io.ox/tours'
], function (ext, notifications, Stage, tourSettings, capabilities, gt) {

    'use strict';

    /* New stage: Starts a tour upon login (unless it was already seen in that particular version) */
    new Stage('io.ox/core/stages', {
        id: 'tours',
        index: 1000,
        run: function (baton) {

            // no tours for guests, they are just annoying when you receive a sharing link etc
            if (_.device('smartphone') || capabilities.has('guest')) {
                //tablets are fine just disable phones
                return $.when();
            }

            var disableTour = tourSettings.get('server/disableTours'),
                startOnFirstLogin = tourSettings.get('server/startOnFirstLogin'),
                tourVersionSeen = tourSettings.get('user/alreadySeenVersion', -1);

            if (!disableTour && startOnFirstLogin && tourVersionSeen === -1) {
                tourSettings.set('user/alreadySeenVersion', 1).save();

                baton.data.popups.push({ name: 'tour:io.ox/intro' });
                return require(['io.ox/core/tk/wizard', 'io.ox/tours/intro']).then(function (Tour) {
                    return Tour.registry.run('default/io.ox/intro');
                });
            } else if (!disableTour && !tourSettings.get('multifactor/shownTour', false)) {
                return require(['io.ox/tours/multifactor']).then(function (tour) {
                    if (tour.run()) baton.data.popups.push({ name: 'tour:io.ox/multifactor' });
                });
            }

            return $.when();
        }
    });

    /* Link: Intro tour in settings toolbar */
    ext.point('io.ox/core/appcontrol/right/help').extend({
        id: 'intro-tour',
        index: 210, /* close to the help link */
        extend: function () {

            if (_.device('smartphone') || tourSettings.get('disableTours', false) || capabilities.has('!webmail || guest')) {
                //tablets are fine just disable phones
                return;
            }

            this.append(
                $('<a target="_blank" href="" role="menuitem">').text(
                    //#. Tour name; general introduction
                    gt('Getting started')
                )
                .on('click', function (e) {
                    e.preventDefault();
                    require(['io.ox/core/tk/wizard', 'io.ox/tours/intro'], function (Tour) {
                        Tour.registry.run('default/io.ox/intro');
                    });
                })
            );

            this.$ul.find('li').last().addClass('io-ox-specificHelp');
        }
    });

    ext.point('io.ox/core/appcontrol/right/help').sort();

    return {
        //DEPRECATED: legacy method. Don't use it in new code. Use the WTF instead.
        runTour: function (tourname) {
            require([
                'io.ox/tours/utils',
                'css!3rd.party/hopscotch/hopscotch.css',
                'apps/3rd.party/hopscotch/hopscotch-0.1.js'
            ]).done(function (utils) {
                var tour = utils.get(tourname),
                    hs = window.hopscotch;

                if (!tour) {
                    return;
                }
                tour.i18n = {
                    prevBtn: '<i class="fa fa-chevron-left">&nbsp;</i>',
                    nextBtn: '<i class="fa fa-chevron-right">&nbsp;</i>',
                    doneBtn: '<i class="fa fa-check">&nbsp;</i>'
                };

                //RESET
                hs.endTour(true);

                // ERROR HANDLING
                hs.registerHelper('error', function (arg) {
                    console.log('Tour error', arg);
                });

                tour.onEnd = function () { window.hopscotch.endTour(true); };
                tour.showPrevButton = true;
                tour.showNextButton = true;

                //GO!
                hs.startTour(tour);
            });
        }
    };

});
