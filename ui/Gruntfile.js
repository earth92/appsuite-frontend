/* This file has been generated by ox-ui-module generator.
 * Please only apply minor changes (better no changes at all) to this file
 * if you want to be able to run the generator again without much trouble.
 *
 * If you really have to change this file for whatever reason, try to contact
 * the core team and describe your use-case. May be, your changes can be
 * integrated into the templates to be of use for everybody.
 */
'use strict';

module.exports = function (grunt) {

    // make grunt config extendable
    grunt.config.extend = function (k, v) {
        grunt.config(k, require('underscore').extend({}, grunt.config(k), v));
    };

    grunt.config('pkg', grunt.file.readJSON('package.json'));

    grunt.config('local', require('underscore').extend(
        grunt.file.readJSON('grunt/local.conf.default.json'),
        grunt.file.exists('grunt/local.conf.json') ? grunt.file.readJSON('grunt/local.conf.json') : {}
    ));

    grunt.util.runPrefixedSubtasksFor = function (main_task, prefix) {
        return function () {
            var list = [];

            for (var key in grunt.config(main_task)) {
                if (key.substr(0, prefix.length) === prefix) {
                    list.push(key);
                }
            }
            list = list.map(function (name) {
                return main_task + ':' + name;
            });

            grunt.task.run(list);
        };
    };

    // custom tasks
    grunt.registerTask('manifests', ['newer:jsonlint:manifests', 'concat:manifests']);
    grunt.registerTask('lint', ['newer:jshint:all', 'newer:jsonlint:all']);

    // steps to build the ui (ready for development)
    grunt.registerTask('build', ['lint', 'copy_build', 'newer:concat', 'newer:less', 'compile_po']);
    // create a package ready version of the ui (aka what jenkins does)
    grunt.registerTask('dist', ['clean', 'bower', 'build', 'uglify', 'copy_dist', 'assemble:dist', 'compress:source']);
    // run development setup
    grunt.registerTask('dev', ['connect', 'test', 'watch']);
    // run a clean development setup
    grunt.registerTask('cleanDev', ['clean', 'default', 'connect', 'test', 'watch']);
    // default task
    grunt.registerTask('default', ['checkDependencies', 'bower', 'build']);

    // load installed grunt tasks from specified folder
    grunt.loadTasks('grunt/tasks');
    // load custom tasks
    // those can be used to override configuration from grunt/tasks/*.js
    grunt.loadTasks('grunt/tasks/custom');
};
