/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2014 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author David Bauer <david.bauer@open-xchange.com>
 * @author Julian Bäume <julian.baeume@open-xchange.com>
 */

'use strict';

module.exports = function (grunt) {

    grunt.config('jscs', {

        options: {
            config: '.jscs.json',
            excludeFiles: ['apps/io.ox/core/date.js', 'spec/io.ox/core/date_spec.js', 'apps/io.ox/contacts/widgets/canvasresize.js', 'apps/io.ox/contacts/widgets/exif.js'] // date.js has some funky include stuff we have to figure out
        },
        bootjs: {
            src: ['src/*.js']
        },
        specs: {
            src: ['spec/**/*_spec.js']
        },
        all: {
            src: ['Gruntfile.js', 'grunt/tasks/*.js', 'apps/**/*.js']
        },
        test: {
            src: ['apps/io.ox/mail/main.js']
        }

    });

    grunt.loadNpmTasks('grunt-jscs-checker');
};
