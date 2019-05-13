/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2019 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Benedikt Kröning <benedikt.kroening@open-xchange.com>
 * @author Markus Wagner <markus.wagner@open-xchange.com>
 *
 */

/// <reference path="../../../steps.d.ts" />

const expect = require('chai').expect;

Feature('Settings > Address Book');

Before(async (users) => {
    await users.create();
});

After(async (users) => {
    await users.removeAll();
});

Scenario('[C85624] Configure postal addresses map service', async (I) =>{
    await I.haveContact({
        folder_id: `${await I.grabDefaultFolder('contacts')}`,
        last_name: 'Bar',
        first_name: 'Foo ',
        street_home: 'Wulle Wulle 0815',
        city_home: '1337 Örtlichkeit',
        state_home: 'Ist Egal',
        postal_code_home: '4711',
        country_home: 'Amazing'
    });

    I.login();

    await verifyMapType(I, 'Google Maps', 'google.com');

    await verifyMapType(I, 'Open Street Map', 'openstreetmap.org');

    await verifyMapType(I, 'No link');

    I.logout();
});

async function verifyMapType(I, mapName, link) {
    // Go back to settings and switch to other display style
    I.click('#io-ox-topbar-dropdown-icon');
    I.waitForVisible('#topbar-settings-dropdown');
    I.click('Settings');

    // Select address book settings
    I.waitForText('Address Book', 5, '.folder-node');
    I.selectFolder('Address Book');
    I.waitForText('Address Book', 5, '[data-app-name="io.ox/settings"]');

    I.see('Link postal addresses with map service');
    I.waitForText(mapName);
    I.click(mapName);
    I.waitForVisible('.fa-refresh.fa-spin');
    I.waitForDetached('.fa-refresh.fa-spin');

    // Verify the displayed style
    I.openApp('Address Book');
    I.waitForVisible('[data-app-name="io.ox/contacts"]');

    I.refreshPage();
    I.waitForVisible('[data-app-name="io.ox/contacts"]');

    I.waitForVisible('.fa-refresh.fa-spin');
    I.waitForDetached('.fa-refresh.fa-spin');

    I.selectFolder('Contacts');

    I.waitForElement('~Bar, Foo', 5);
    I.click('~Bar, Foo');

    I.waitForText('Home Address', 5, '.contact-detail');

    if (mapName !== 'No link') {
        I.waitForText('Open in ' + mapName);
        expect((await I.grabAttributeFrom('a.maps-service', 'href')).join()).to.include(link);
    } else {
        I.dontSee('Open in');
    }
}