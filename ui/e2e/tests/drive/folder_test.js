/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2019 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author David Bauer <david.bauer@open-xchange.com>
 *
 */

/// <reference path="../../steps.d.ts" />

Feature('Drive > Folder');

const prepare = (I, folder) => {
    I.login('app=io.ox/files' + (folder ? '&folder=' + folder : ''));
    I.waitForElement('.file-list-view.complete');
};

// Returns permission bitmasks for shared folder (user 1 is owner, user 2 is viewer)
const sharedFolder = (folderName, users) => {
    return {
        module: 'infostore',
        subscribed: 1,
        title: folderName,
        permissions: [
            {
                bits: 403710016,
                entity: users[0].userdata.id,
                group: false
            }, {
                bits: 257,
                entity: users[1].userdata.id,
                group: false
            }
        ]
    };
};

Before(async (I, users) => {
    await users.create();
    await users.create();
});

After(async (users) => {
    await users.removeAll();
});

// Note: The title of this test, does not really reflect what is tested here
// A better title would be something like: Public files: Upload and new actions not shown in root folder
Scenario('[C8374] Public files: Add a file', (I) => {
    prepare(I);
    I.selectFolder('Public files');
    I.clickToolbar('New');
    I.waitForText('Add new folder');
    I.dontSee('Upload files');
    I.dontSee('New text document');
    I.dontSee('New spreadsheet');
    I.dontSee('New presentation');
    I.dontSee('Add note');
});

// Note: The title of this test, does not really reflect what is tested here (again)
// A better title would be something like: Public files: Moving files to root folder not possible
Scenario('[C8375] Public files: Move a file', async (I) => {
    const folder = await I.grabDefaultFolder('infostore');
    await I.haveFile(folder, 'e2e/media/files/0kb/document.txt');
    prepare(I);
    I.waitForText('document.txt', 1, '.file-list-view');
    I.click(locate('li.list-item').withText('document.txt'));
    I.clickToolbar('~More actions');
    I.waitForText('Move');
    I.click('Move', '.smart-dropdown-container');
    I.waitForText('Public files', 1, '.folder-picker-dialog');
    I.click('~Public files', '.folder-picker-dialog');
    I.seeElement('.btn[data-action="ok"][disabled]');
});

Scenario('[C8376] Add a subfolder', async (I) => {
    prepare(I);
    I.click('[title="Actions for My files"]');
    I.click('Add new folder', '.smart-dropdown-container');
    I.waitForText('Add new folder', 1, '.modal-dialog');
    I.fillField('Folder name', 'Testfolder');
    I.click('Add');
    I.waitForText('Testfolder', 1, '.file-list-view');
});

Scenario('[C8377] Invite a person', (I, users) => {
    function share(publicFolder) {
        I.clickToolbar('Share');
        I.click('Invite people');
        I.waitForText('Share folder');
        if (!publicFolder) {
            I.click('Send notification by email');
            I.waitForInvisible('.share-options', 2);
        }
        I.dontSeeCheckboxIsChecked('Send notification by email');
        I.click('~Select contacts');
        I.waitForElement('.modal .list-view.address-picker li.list-item');
        I.fillField('Search', users[1].get('name'));
        I.waitForText(users[1].get('name'), 5, '.address-picker');
        I.click('.address-picker .list-item');
        I.click({ css: 'button[data-action="select"]' });
        I.waitForElement(locate('.permissions-view .row').at(2));
        I.dontSee('Guest', '.permissions-view');
        I.seeNumberOfElements('.permissions-view .permission.row', 2);
        I.click('Author');
        I.waitForText('Viewer', 1, '.dropdown');
        I.click('Viewer');
        I.click('Share', '.modal');
        I.waitToHide('.modal');
    }
    session('Alice', () => {
        I.login('app=io.ox/files');
        I.waitForElement('.file-list-view.complete');
        I.selectFolder('My shares');
        // sometimes this is not fast enough and there are 4 objects
        I.retry(3).seeNumberOfElements('.list-view li.list-item', 0);
        I.waitForText('My files', 5, '.folder-tree');
        //I.shareFolder('Music');
        I.click('My files', '.folder-tree');
        I.selectFolder('Music');
        share();
        I.waitForElement('.file-list-view.complete');
        I.selectFolder('My shares');
        I.waitForElement(locate('.displayname').withText('Music').inside('.list-view'));
        I.seeNumberOfElements('.list-view li.list-item', 1);
    });

    session('Bob', () => {
        I.login('app=io.ox/files', { user: users[1] });
        I.waitForText('Shared files', 5, '.folder-tree');
        I.waitForElement('.file-list-view.complete');
        I.selectFolder('Shared files');
        I.waitForText(users[0].get('name'));
        I.selectFolder(users[0].get('name'));
        I.waitForElement(locate('.filename').withText('Music').inside('.list-view'));
        I.doubleClick(locate('.filename').withText('Music').inside('.list-view'));
        I.click('[title="Actions for Music"]');
        I.click('[data-action="invite"]', '.smart-dropdown-container');
        I.waitForElement(locate('.permissions-view .row').at(2));
        I.waitForText('Viewer', 2, '.permissions-view');
        I.click('Close');
    });

    // Repeat for Public Folder
    const publicFolderName = 'C8377-' + new Date().getTime();
    session('Alice', () => {
        // Add public folder
        I.waitForText('Public files', 5, '.folder-tree');
        I.selectFolder('Public files');
        I.clickToolbar('New');
        I.click('Add new folder', '.dropdown.open');
        I.waitForText('Add new folder', 1, '.modal-dialog');
        I.fillField('Folder name', publicFolderName);
        I.pressKey('Enter');

        I.waitForElement('.file-list-view.complete');
        I.selectFolder(publicFolderName);
        share(true);
    });

    session('Bob', () => {
        I.waitForText('Public files', 5, '.folder-tree');
        I.selectFolder('Public files');
        I.waitForText(publicFolderName, 5, '.list-view');
        I.selectFolder(publicFolderName);
        I.click('[title="Actions for ' + publicFolderName + '"]');
        I.click('[data-action="invite"]', '.smart-dropdown-container');
        I.waitForElement(locate('.permissions-view .row').at(2));
        I.see('Viewer', '.permissions-view .row .role');
    });

});
Scenario('[C8379] Add a file', async (I, users) => {
    // Testrail description:
    // No rights to upload a file, "Viewer" role
    // 1. Try to upload a file (Denied of missing permission)

    const folderName = 'C8379';
    const folder = sharedFolder(folderName, users);
    var defaultFolder = await I.grabDefaultFolder('infostore');
    var newFolder = await I.createFolder(folder, defaultFolder, { user: users[0] });
    I.login('app=io.ox/files&folder=' + newFolder.data.data, { user: users[1] });
    I.waitForElement('.file-list-view.complete');
    I.dontSee('New', '.classic-toolbar');
});

Scenario('[C8381] Lock a file', async (I, users) => {
    // Testrail description:
    // Shared or public folder with other member
    // 1. Choose a file (Popup window)
    // 2. "More"-->"Lock" (File is locked for you)
    // 3. Verify with other user
    var defaultFolder = await I.grabDefaultFolder('infostore');
    var newFolder = await I.createFolder(sharedFolder('C8381', users), defaultFolder, { user: users[0] });
    await I.haveFile(newFolder.data.data, 'e2e/media/files/0kb/document.txt');
    I.login('app=io.ox/files&folder=' + newFolder.data.data, { user: users[0] });
    I.waitForElement(locate('.filename').withText('document.txt').inside('.list-view'));
    I.click(locate('.filename').withText('document.txt').inside('.list-view'));
    I.clickToolbar('~More actions');
    I.waitForText('Lock');
    I.click('Lock', '.smart-dropdown-container');
    I.waitForText('document.txt (Locked)');
    I.logout();

    I.login('app=io.ox/files&folder=' + newFolder.data.data, { user: users[1] });
    I.waitForText('document.txt (Locked)');
});
