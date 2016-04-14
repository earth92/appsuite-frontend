/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2016 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Peter Seliger <peter.seliger@open-xchange.com>
 */

define('io.ox/files/actions/save-as-pdf', [
    'io.ox/files/api',
    'io.ox/core/extensions',
    'io.ox/core/tk/dialogs',
    'io.ox/files/util',
    'io.ox/core/tk/doc-converter-utils',
    'gettext!io.ox/files'
], function (FilesApi, ext, dialogs, FilesUtil, ConverterUtils, gt) {

    'use strict';

    return function (baton) {

//      newFileName = oldFileName;
//      title = gt('Save as PDF');
//
//      // create the dialog
//      dialog = new Dialogs.SaveAsFileDialog({ title: title, value: newFileName, preselect: app.getFileParameters().folder_id });

        var
            data     = baton.data,
            model    = baton.models[0],

            filename = model.getDisplayName() + '.pdf';

        console.log('+++ io.ox/files/actions/save-as-pdf :: data, model, filename : ', data, model, filename);

        function save(name) {
            return ConverterUtils.sendConverterRequest(model, {

                documentformat: 'pdf',
                saveas_filename: name,
                saveas_folder_id: model.get('folder_id')

            }).done(function (response) {
              //console.log('+++ save as pdf :: done - response : ', response);

                if (("id" in response) && ("filename" in response)) {

                    FilesApi.trigger('add:file');
                }/* else {
                    // could be used for error handling
                }*/
            });
        }

        // notifications lazy load
        function notify() {
            var self = this, args = arguments;
            require(['io.ox/core/notifications'], function (notifications) {
                notifications.yell.apply(self, args);
            });
        }

        /**
         * user have to confirm if name doesn't contains a file extension
         * @return { promise }
         */
        function process(name) {

            var invalid;

            // taken and refactored from 'io.ox/files/actions/rename'
            // TODO - Olpe please check if processing of `invalid` does ever take place - I doubt it though.
            //
            // check for valid filename
            ext.point('io.ox/core/filename')
                .invoke('validate', null, name, 'file')
                .find(function (result) {
                    if (result !== true) {
                        notify('warning', result);
                        return (invalid = true);
                    }
                });

            if (invalid) return $.Deferred().reject();

            // show confirm dialog if necessary
            return FilesUtil.confirmDialog(name, filename).then(save.bind(this, name));
        }

        new dialogs.ModalDialog({ enter: 'save', async: true })
            .header(
                $('<h4>').text(gt('Save as PDF'))
            )
            .append(
                $('<input type="text" name="name" class="form-control" tabindex="1">')
            )
            .addPrimaryButton('save', gt('Save'), 'save', { 'tabIndex': '1' })
            .addButton('cancel', gt('Cancel'), 'cancel', { 'tabIndex': '1' })
            .on('save', function () {
                var node = this.getContentNode(),
                    name = node.find('input[name="name"]').val();

                process(name).then(this.close, this.idle).fail(function () {
                    _.defer(function () { node.focus(); });
                });
            })
            .show(function () {
                this.find('input[name="name"]')
                    .focus().val(filename)
                    .get(0).setSelectionRange(0, filename.lastIndexOf('.'));
            });

    };
});
