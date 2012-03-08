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

define('io.ox/contacts/actions', ['io.ox/core/extensions', "io.ox/core/extPatterns/links"], function (ext, links) {

    'use strict';

//  actions

    ext.point("io.ox/contacts/main/delete").extend({
        index: 100,
        id: "delete",
        action:  function (data) {
            require(["io.ox/contacts/api", "io.ox/core/tk/dialogs"], function (api, dialogs) {
                new dialogs.ModalDialog()
                .text("Are you really sure about your decision? Are you aware of all consequences you have to live with?")
                .addButton("cancel", "No, rather not", "cancel")
                .addButton("delete", "Shut up and delete it!", "delete", { classes: 'btn-primary' })
                .show()
                .done(function (action) {
                    if (action === "delete") {
                        api.remove(data);
                    }
                });
            });
        }
    });

    ext.point("io.ox/contacts/main/update").extend({
        index: 100,
        id: "edit",
        action: function (data) {
            if (data.mark_as_distributionlist === true) {
                require(["io.ox/contacts/distrib/main"], function (createDist) {
                    createDist.getApp(data).launch();
                });
            } else {
                require(["io.ox/contacts/util"], function (util) {
                    util.createEditPage(data);
                });
            }

        }
    });

    ext.point("io.ox/contacts/main/create").extend({
        index: 100,
        id: "create",
        action: function (app) {
            require(["io.ox/contacts/create"], function (create) {
                create.show();
            });
        }
    });


    ext.point("io.ox/contacts/main/distrib").extend({
        index: 100,
        id: "create-dist",
        action: function (app) {
            require(["io.ox/contacts/distrib/main"], function (createDist) {
                createDist.getApp().launch();
            });
        }
    });

    //  points

    ext.point("io.ox/contacts/detail/actions").extend(new links.InlineLinks({
        index: 100,
        id: "inline-links",
        ref: 'io.ox/contacts/links/inline'
    }));

    // toolbar

    ext.point("io.ox/contacts/links/toolbar").extend(new links.Link({
        index: 100,
        id: "create",
        label: "Add contact",
        ref: "io.ox/contacts/main/create"
    }));

    ext.point("io.ox/contacts/links/toolbar").extend(new links.Link({
        index: 100,
        id: "create-dist",
        label: "Add distributionlist",
        ref: "io.ox/contacts/main/distrib"
    }));

    //  inline links

    ext.point("io.ox/contacts/links/inline").extend(new links.Link({
        index: 100,
        id: 'update',
        label: 'Edit',
        ref: 'io.ox/contacts/main/update'
    }));

    ext.point("io.ox/contacts/links/inline").extend(new links.Link({
        index: 200,
        id: 'delete',
        label: 'Delete',
        ref: 'io.ox/contacts/main/delete',
        special: "danger"
    }));
});