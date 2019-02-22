/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2018 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Björn Köster <bjoern.koester@open-xchange.com>
 */

Feature('Inline help');

Before(async function (users) {
    await users.create();
});

After(async function (users) {
    await users.removeAll();
});

Scenario('Open the help app in a floating window', async function (I) {
    I.login('app=io.ox/mail');
    I.waitForVisible({ css: '[data-app-name="io.ox/mail"]' }, 5);

    I.click({ css: 'a[aria-label="Online help"]' });
    I.waitForVisible('.io-ox-help-window', 5);
    I.see('OX App Suite help');

    // ensure that if you click help for the same active app only one window will open for that
    I.click({ css: 'a[aria-label="Online help"]' });
    I.waitForVisible('.io-ox-help-window', 5);
    I.seeNumberOfElements('.io-ox-help-window', 1);

    I.click({ css: 'button[data-action="close"]' }, '.io-ox-help-window');
    I.waitForDetached('.io-io-help-window', 5);

    I.logout();
});

Scenario('Open the help app in a modal', async function (I) {
    I.login('app=io.ox/mail');
    I.waitForVisible({ css: '[data-app-name="io.ox/mail"]' }, 5);

    I.waitForVisible({ css: 'a[aria-label="Compose new email"]' }, 5);
    I.click('Compose', '.classic-toolbar');
    I.retry().waitForVisible('.io-ox-mail-compose-window', 5);
    I.see('Compose', '.io-ox-mail-compose-window');

    I.waitForVisible({ css: 'div[data-extension-id="to"] a.open-addressbook-popup[aria-label="Select contacts"]' }, 5);
    I.wait(1);
    I.click({ css: 'div[data-extension-id="to"] a.open-addressbook-popup[aria-label="Select contacts"]' });
    I.waitForVisible('.modal.addressbook-popup', 5);

    I.click({ css: 'a[aria-label="Online help"]' }, '.modal.addressbook-popup');
    I.waitForVisible('.modal.inline-help', 5);
    I.see('OX App Suite help', '.modal.inline-help');

    I.click({ css: 'button[data-action="cancel"]' }, '.modal.inline-help');
    I.waitForDetached('.modal.inline-help', 5);

    I.click({ css: 'button[data-action="cancel"]' }, '.modal.addressbook-popup');
    I.waitForDetached('.modal.addressbook-popup', 5);

    I.logout();
});