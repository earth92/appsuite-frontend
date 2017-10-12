/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2017 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Christoph Kopp <christoph.kopp@open-xchange.com>
 * @author Julian Bäume <julian.baeume@open-xchange.com>
 */
///  <reference path="../../steps.d.ts" />

Feature('Mailfilter');

Scenario('add and removes Mail Filter Rules', function (I) {

    I.login('app=io.ox/settings');
    I.waitForVisible('.io-ox-settings-main');
    I.selectFolder('Mail');

    // open mailfilter settings
    I.selectFolder('Filter Rules');

    // checks the h1 and the empty message

    I.waitForVisible('.io-ox-settings-window .settings-detail-pane .io-ox-mailfilter-settings h1');
    I.see('Mail Filter Rules');
    I.see('There is no rule defined');

    // create a test rule and check the inintial display
    I.click('Add new rule');
    I.see('Create new rule');
    I.see('This rule applies to all messages. Please add a condition to restrict this rule to specific messages.');
    I.see('Please define at least one action.');

    // add action
    I.click('Add action');
    I.click('Keep');

    // warnig gone?
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] .alert.alert-danger');

    // action and all components visible?
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-action-id="0"]');
    I.see('Keep');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-action-id="0"] a.remove');

    // add condition
    I.click('Add condition');
    I.click('From');

    // alert gone?
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] .alert.alert-info');

    // condition and all components visible?
    I.see('From', '.list-title');
    I.see('Contains', '.dropdown-label');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="0"] .row.has-error');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] button[data-action="save"][disabled]');
    I.fillField('values', 'Test Value');
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="0"] .row.has-error');
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] button[data-action="save"][disabled]');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-action-id="0"] a.remove');

    // add nested condition
    I.click('Add condition');
    I.click('Nested condition');

    // nested condition and all components visible?
    I.see('continue if any of these conditions are met');

    // add a test inside the nested condition
    I.click('Add condition', 'li.nestedrule');
    I.click('From', '.smart-dropdown-container');

    // condition and all components visible?
    I.see('From', '[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] .nested[data-test-id="1_0"] .list-title');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] button[data-action="save"][disabled]');
    I.fillField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="1_0"] input[name="values"]', 'Test Value');
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] button[data-action="save"][disabled]');

    // add an action which includes the folder picker
    I.click('Add action');
    I.click('File into');


    I.see('File into', '.list-title');
    I.see('Select folder', '.folderselect');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-action-id="1"] a.remove');

    // open folder picker
    I.click('Select folder');
    I.see('Select folder', '.modal-dialog h1');

    // create a new folder
    I.waitForElement('[data-point="io.ox/core/folder/picker"] li.selected');
    I.click('Create folder', '[data-point="io.ox/core/folder/picker"]');

    // cancel the add popup
    I.waitForElement('.modal[data-point="io.ox/core/folder/add-popup"]');
    I.see('Add new folder');
    I.click('Cancel', '.modal[data-point="io.ox/core/folder/add-popup"]');

    // cancel the picker
    I.click('Cancel', '.modal[data-point="io.ox/core/folder/picker"]');
    I.dontSeeElement('.modal[data-point="io.ox/core/folder/picker"]');

    // cancel the form
    I.click('Cancel');

    // create a fresh rule
    I.click('Add new rule');

    // add a "from" condition
    I.click('Add condition');
    I.click('From');

    // add "keep" action
    I.click('Add action');
    I.click('Keep');

    // set comparison to "Exists"
    I.click('Contains');
    I.click('Exists');

    // check if "Exists" is properly set
    I.see('Exists', '.dropdown-label');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="0"] input[name="values"]:disabled');

    // reset comparison to "Contains"
    I.click('Exists');
    I.click('Contains');

    // set the value
    I.fillField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="0"] input[name="values"]', 'Test Value');

    // check if "Contains" is properly set
    I.see('Contains', '.dropdown-label');

    // add a "header" test
    I.click('Add condition');
    I.click('Header');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] .row.has-error input[name="headers"]');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] .row.has-error input[name="values"]');
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="0"] .row.has-error');
    I.fillField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="1"] input[name="headers"]', 'Test headers');
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] .row.has-error input[name="headers"]');
    I.fillField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="1"] input[name="values"]', 'Test values');
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] .row.has-error input[name="values"]');
    I.click('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] .dropdownlink span');
    I.click('.smart-dropdown-container .dropdown-menu a[data-value="exists"]');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] input[name="values"]:disabled');
    I.seeInField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="1"] input[name="values"]', '');

    // save the form
    I.click('Save');

    // open the saved rule
    I.click('Edit', '.io-ox-settings-window .settings-detail-pane li.settings-list-item[data-id="0"]');

    // ckeck if the rule is correctly displayed
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="0"] .row.has-error');
    I.seeInField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="0"] input[name="values"]', 'Test Value');

    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] .row.has-error input[name="headers"]');
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] .row.has-error input[name="values"]');
    I.seeInField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="1"] input[name="headers"]', 'Test headers');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] input[name="values"]:disabled');
    I.seeInField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="1"] input[name="values"]', '');

    I.see('Keep', '[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-action-id="0"] .list-title');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-action-id="0"] a.remove');

    // set the comparison to "contains"
    I.click('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] .dropdownlink span');
    I.click('Contains', '.smart-dropdown-container .dropdown-menu');

    // check if "Exists" is properly set
    I.see('Contains', '[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="0"] .dropdown-label');
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] input[name="values"]:disabled');
    I.fillField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="1"] input[name="values"]', 'Test values');
    I.seeInField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="1"] input[name="headers"]', 'Test headers');

    // save the form
    I.click('Save');
    I.waitForInvisible('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"]');

    // open the saved rule
    I.click('Edit', '.io-ox-settings-window .settings-detail-pane li.settings-list-item[data-id="0"]');

    // ckeck if the rule is correctly displayed
    I.waitForVisible('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"]');
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="0"] .row.has-error');
    I.seeInField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="0"] input[name="values"]', 'Test Value');

    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] .row.has-error input[name="headers"]');
    I.dontSeeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] li[data-test-id="1"] .row.has-error input[name="values"]');
    I.seeInField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="1"] input[name="headers"]', 'Test headers');
    I.seeInField('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-test-id="1"] input[name="values"]', 'Test values');
    I.see('Keep', '[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-action-id="0"] .list-title');
    I.seeElement('[data-point="io.ox/settings/mailfilter/filter/settings/detail/dialog"] [data-action-id="0"] a.remove');

    // cancel the form
    I.click('Cancel');

    I.click('.io-ox-settings-window .settings-detail-pane li.settings-list-item[data-id="0"] a[data-action="delete"]');
    I.click('.abs.io-ox-dialog-wrapper button[data-action="delete"]');

    I.waitForVisible('.io-ox-settings-window .settings-detail-pane .hint');

    I.logout();
});
