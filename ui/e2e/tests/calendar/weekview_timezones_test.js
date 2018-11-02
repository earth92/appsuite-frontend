/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2018 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Christoph Kopp <chrsitoph.kopp@open-xchange.com>
 */

Feature('Calendar: Switch timezones');

Before(async function (users) {
    await users.create();
});

After(async function (users) {
    await users.removeAll();
});

Scenario('Create appointment and switch timezones', async function (I) {

    I.login('app=io.ox/calendar');
    I.waitForVisible('[data-app-name="io.ox/calendar"]', 5);

    // create in Workweek view
    I.selectFolder('Calendar');
    I.clickToolbar('View');
    I.click('Workweek');
    I.clickToolbar('New');
    I.waitForVisible('.io-ox-calendar-edit-window');

    I.fillField('Subject', 'test timezones');
    I.fillField('Location', 'invite location');

    I.click({ css: '[data-attribute="startDate"] input' });

    const { isNextMonth, start, inTimezone } = await I.executeAsyncScript(function (done) {
        done({
            start: `.date-picker[data-attribute="startDate"] .date[id$="_${moment().startOf('week').add('8', 'day').format('l')}"]`,
            inTimezone: moment().hour(7).tz('Asia/Tokyo').format('h A'),
            isNextMonth: moment().month() !== moment().add('8', 'days').month()
        });
    });

    I.click({ css: '[data-attribute="startDate"] input' });
    if (isNextMonth) I.click('.date-picker.open[data-attribute="startDate"] .btn-next');
    I.click(start);

    I.click('.io-ox-calendar-edit-window .time-field');

    I.click('4:00 PM', '.io-ox-calendar-edit-window .calendaredit');

    // save
    I.click('Create', '.io-ox-calendar-edit-window');

    I.waitForDetached('.io-ox-calendar-edit-window', 5);

    // check in view
    I.waitForVisible('.workweek .title');
    I.seeNumberOfElements('//div[contains(concat(" ", @class, " "), "workweek")]//div[@class="title" and text()="test timezones"]', 1);

    // switch to settings
    I.click('#io-ox-topbar-dropdown-icon');
    I.click('Settings', '#topbar-settings-dropdown');

    I.waitForVisible('.io-ox-settings-window .leftside [title="Calendar"]');

    I.click({ css: '.io-ox-settings-window .leftside [title="Calendar"]' });
    I.waitForVisible('.io-ox-settings-window .leftside [title="Favorite timezones"]');
    I.click({ css: '.io-ox-settings-window .leftside [title="Favorite timezones"]' });

    I.waitForVisible('.rightside h1', 'Favorite timezones');
    I.waitForVisible('.rightside', 'Add timezone');
    I.click('Add timezone');

    I.waitForVisible('.io-ox-dialog-popup');
    I.selectOption('Time zone', '+09:00 JST Asia/Tokyo');
    I.click('.io-ox-dialog-popup [data-action="add"]');
    I.waitForDetached('.io-ox-dialog-popup');

    I.waitForVisible('.rightside li[title="Asia/Tokyo"]');

    // switch to calendar
    I.openApp('Calendar');

    I.waitForVisible('.workweek .time-label-bar', 5);
    I.wait(1);
    I.click('.workweek .time-label-bar');
    I.waitForVisible('.timezone-label-dropdown [data-name="Asia/Tokyo"]');
    I.click('.timezone-label-dropdown [data-name="Asia/Tokyo"]');
    I.pressKey('Escape');
    I.waitForVisible('.workweek .timezone');
    I.seeNumberOfElements('.workweek .week-container-label', 2);
    I.see('JST', '.workweek .timezone');
    I.see('7 AM', '.week-container-label:not(.secondary-timezone) .working-time-border:not(.in) .number');
    I.see(inTimezone, '.week-container-label.secondary-timezone .working-time-border:not(.in) .number');

    // switch to settings
    I.click('#io-ox-topbar-dropdown-icon');
    I.click('Settings', '#topbar-settings-dropdown');

    I.waitForVisible('.io-ox-settings-window');

    I.click({ css: '.io-ox-settings-window .leftside [title="Calendar"]' });
    I.waitForVisible('.io-ox-settings-window .leftside [title="Favorite timezones"]');
    I.click({ css: '.io-ox-settings-window .leftside [title="Favorite timezones"]' });
    I.waitForVisible('.rightside li[title="Asia/Tokyo"]');

    // remove extra timezone
    I.click('.rightside li[title="Asia/Tokyo"] a[data-action="delete"]');
    I.waitForDetached('.rightside li[title="Asia/Tokyo"]');

    // inspect in calendar app
    I.openApp('Calendar');
    I.waitForVisible('[data-app-name="io.ox/calendar"]', 5);

    I.seeNumberOfElements('.workweek .week-container-label', 1);
    I.dontSee('JST', '.workweek');
    I.see('7 AM', '.week-container-label:not(.secondary-timezone) .working-time-border .number');

    // switch to settings
    I.click('#io-ox-topbar-dropdown-icon');
    I.click('Settings', '#topbar-settings-dropdown');

    I.waitForVisible('.io-ox-settings-window');

    I.click({ css: '.io-ox-settings-window .leftside [title="Calendar"]' });

    I.waitForText('Workweek view', 5, '.rightside');
    I.selectOption('Week start', 'Tuesday');
    I.selectOption('Workweek length', '3 days');

    // switch to calendar
    I.openApp('Calendar');
    I.waitForVisible('[data-app-name="io.ox/calendar"]', 5);

    I.seeNumberOfElements('//div[contains(concat(" ", @class, " "), "workweek")]//button[@class="weekday"]', 3);
    I.wait(1);

    I.logout();

});
