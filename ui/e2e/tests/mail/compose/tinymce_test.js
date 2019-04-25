/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2019 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Markus Wagner <markus.wagner@open-xchange.com>
 *
 */

/// <reference path="../../../steps.d.ts" />

const { expect } = require('chai');

Feature('Mail > Compose');

Before(async (users) => {
    await users.create(); // Sender
    await users.create(); // Recipient
});

After(async (users) => {
    await users.removeAll();
});

const iframeLocator = '.io-ox-mail-compose-window .editor iframe';
Scenario('[C7392] Send mail with different text highlighting', async function (I, users) {

    const selectInline = (action) => {
        I.click(locate('button').withChild(locate('span').withText('Formats')));
        I.waitForElement((locate('span').withText('Inline')).inside('.mce-floatpanel'));
        I.click(locate('span.mce-text').withText('Inline'));
        I.click(locate('span.mce-text').withText(action));
        I.waitForInvisible('.mce-floatpanel');
    };

    let [sender, recipient] = users;

    const mailSubject = 'C7392 Different text highlighting';

    const defaultText = 'This text has no style.';
    const textBold = 'This is bold text!';
    const textItalic = 'This is italic text?';
    const textUnderline = 'This is underlined text.';
    const textStrikethrough = 'This is striked through text.';
    const textSuperscript = 'This text is displayed UP';
    const textSubscript = 'And down...';
    const textCode = 'And code formatting!';
    const textChanged = 'This text was changed and should have no style!';
    const textBoldItalicSuperscript = 'This text combined several styles.';

    await I.haveSetting('io.ox/mail//features/registerProtocolHandler', false);

    I.login('app=io.ox/mail', { user: sender });

    // Open the mail composer
    I.retry(5).click('Compose');
    I.waitForElement('.io-ox-mail-compose .contenteditable-editor');
    I.click('~Maximize');

    // Fill out to and subject
    I.waitForFocus('input[placeholder="To"]');
    I.fillField('To', recipient.get('primaryEmail'));
    I.fillField('Subject', mailSubject);

    // Write some text with the default settings
    await within({ frame: iframeLocator }, async () => {
        I.click('.default-style');
        I.pressKey(defaultText);
        I.pressKey('Enter');
    });

    // Write some text in bold
    selectInline('Bold');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textBold);
        I.pressKey('Enter');
    });
    selectInline('Bold');

    // Write some text in italic
    selectInline('Italic');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textItalic);
        I.pressKey('Enter');
    });
    selectInline('Italic');

    // Write some text which is underlined
    selectInline('Underline');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textUnderline);
        I.pressKey('Enter');
    });
    selectInline('Underline');

    // Write some striked through text
    selectInline('Strikethrough');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textStrikethrough);
        I.pressKey('Enter');
    });
    selectInline('Strikethrough');

    // Write some sup text
    selectInline('Superscript');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textSuperscript);
        I.pressKey('Enter');
    });
    selectInline('Superscript');

    // Write some sub text
    selectInline('Subscript');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textSubscript);
        I.pressKey('Enter');
    });
    selectInline('Subscript');

    // Write some code
    selectInline('Code');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textCode);
        I.pressKey('Enter');
    });
    selectInline('Code');

    // Write some text, format it and remove the style
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textChanged);
        I.pressKey(['Shift', 'Home']); // Select the just written text
    });
    selectInline('Bold');
    selectInline('Underline');
    selectInline('Subscript');
    selectInline('Subscript');
    selectInline('Underline');
    selectInline('Bold');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey('End');
        I.pressKey('Enter');
    });

    // Write some text bold + italic + superscript
    selectInline('Bold');
    selectInline('Italic');
    selectInline('Superscript');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textBoldItalicSuperscript);
        I.pressKey('Enter');
    });

    // Send the mail
    I.click('Send');

    // Let's stick around a bit for sending to finish
    I.waitForDetached('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor');
    I.wait(1);
    I.logout();

    // Log in as second user and navigate to mail app
    I.login('app=io.ox/mail', { user: recipient });

    // Open the mail
    I.waitForText(mailSubject, 2);
    I.retry(5).click(locate('.list-item').withText(mailSubject).inside('.list-view'));
    I.waitForVisible('iframe.mail-detail-frame');

    await within({ frame: '.mail-detail-frame' }, async () => {
        expect(await I.grabAttributeFrom(locate('div').withText(defaultText), 'style')).to.have.lengthOf(0);
        I.waitForElement(locate('strong').withText(textBold));
        I.waitForElement(locate('em').withText(textItalic));
        expect((await I.grabCssPropertyFrom(locate('span').withText(textUnderline), 'text-decoration')).join()).to.include('underline');
        expect((await I.grabCssPropertyFrom(locate('span').withText(textStrikethrough), 'text-decoration')).join()).to.include('line-through');
        I.waitForElement(locate('sup').withText(textSuperscript));
        I.waitForElement(locate('sub').withText(textSubscript));
        I.waitForElement(locate('code').withText(textCode));
        expect(await I.grabAttributeFrom(locate('div').withText(textChanged), 'style')).to.have.lengthOf(0);
        I.waitForElement((locate('strong').withText(textBoldItalicSuperscript)).inside('em').inside('sup'));
    });
});

Scenario('[C7393] Send mail with bullet point and numbering - bullet points', async function (I, users) {

    let [sender, recipient] = users;

    const mailSubject = 'C7393 Different bullet points';

    const defaultText = 'This text has no alignment.';
    const textBullet1 = 'This is bullet point one.';
    const textBullet2 = 'This is bullet point two.';
    const textBullet21 = 'This bullet point is indented under point two!';
    const textBullet1_1 = 'And this is again on level one.';

    await I.haveSetting('io.ox/mail//features/registerProtocolHandler', false);

    I.login('app=io.ox/mail', { user: sender });

    // Open the mail composer
    I.retry(5).click('Compose');
    I.waitForElement('.io-ox-mail-compose .contenteditable-editor');
    I.click('~Maximize');

    // Fill out to and subject
    I.waitForFocus('input[placeholder="To"]');
    I.fillField('To', recipient.get('primaryEmail'));
    I.fillField('Subject', mailSubject);

    // Write some text with the default settings
    await within({ frame: iframeLocator }, async () => {
        I.click('.default-style');
        I.pressKey(defaultText);
        I.pressKey('Enter');
    });

    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textBullet1);
    });

    I.click(locate('button').inside('~Bullet list'));

    await within({ frame: iframeLocator }, async () => {
        I.pressKey('Enter');
        I.pressKey(textBullet2);
        I.pressKey('Enter');
    });

    I.click(locate('button').inside('~Increase indent'));

    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textBullet21);
        I.pressKey('Enter');
    });

    I.click(locate('button').inside('~Decrease indent'));

    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textBullet1_1);
        I.pressKey('Enter');
        I.pressKey('Enter');
        I.pressKey('Enter');
    });

    // Send the mail
    I.click('Send');

    // Let's stick around a bit for sending to finish
    I.waitForDetached('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor');
    I.wait(1);
    I.logout();

    // Log in as second user and navigate to mail app
    I.login('app=io.ox/mail', { user: recipient });

    // Open the mail
    I.waitForText(mailSubject, 2);
    I.retry(5).click(locate('.list-item').withText(mailSubject).inside('.list-view'));
    I.waitForVisible('iframe.mail-detail-frame');

    await within({ frame: '.mail-detail-frame' }, async () => {
        I.waitForElement(locate('div').withText(defaultText));
        I.waitForElement((locate('li').inside('ul')).at(1).withText(textBullet1));
        I.waitForElement((locate('li').inside('ul')).at(2).withText(textBullet2));
        I.waitForElement((locate('li').withText(textBullet21)).inside('ul').inside('li').inside('ul'));
        I.waitForElement((locate('li').inside('ul')).at(3).withText(textBullet1_1));
    });
});

Scenario('[C7393] Send mail with bullet point and numbering - numbering', async function (I, users) {

    let [sender, recipient] = users;

    const mailSubject = 'C7393 Different numbering';

    const defaultText = 'This text has no alignment.';
    const textNumber1 = 'This is number one.';
    const textNumber2 = 'This is number two.';
    const textNumber21 = 'This number is indented under number two!';
    const textNumber1_1 = 'And this is again on level one with number 3.';

    await I.haveSetting('io.ox/mail//features/registerProtocolHandler', false);

    I.login('app=io.ox/mail', { user: sender });

    // Open the mail composer
    I.retry(5).click('Compose');
    I.waitForElement('.io-ox-mail-compose .contenteditable-editor');
    I.click('~Maximize');

    // Fill out to and subject
    I.waitForFocus('input[placeholder="To"]');
    I.fillField('To', recipient.get('primaryEmail'));
    I.fillField('Subject', mailSubject);

    // Write some text with the default settings
    await within({ frame: iframeLocator }, async () => {
        I.click('.default-style');
        I.pressKey(defaultText);
        I.pressKey('Enter');
    });

    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textNumber1);
    });

    I.click(locate('button').inside('~Numbered list'));

    await within({ frame: iframeLocator }, async () => {
        I.pressKey('Enter');
        I.pressKey(textNumber2);
        I.pressKey('Enter');
    });

    I.click(locate('button').inside('~Increase indent'));

    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textNumber21);
        I.pressKey('Enter');
    });

    I.click(locate('button').inside('~Decrease indent'));

    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textNumber1_1);
        I.pressKey('Enter');
        I.pressKey('Enter');
        I.pressKey('Enter');
    });

    // Send the mail
    I.click('Send');

    // Let's stick around a bit for sending to finish
    I.waitForDetached('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor');
    I.wait(1);
    I.logout();

    // Log in as second user and navigate to mail app
    I.login('app=io.ox/mail', { user: recipient });

    // Open the mail
    I.waitForText(mailSubject, 2);
    I.retry(5).click(locate('.list-item').withText(mailSubject).inside('.list-view'));
    I.waitForVisible('iframe.mail-detail-frame');

    await within({ frame: '.mail-detail-frame' }, async () => {
        I.waitForElement(locate('div').withText(defaultText));
        I.waitForElement((locate('li').inside('ol')).at(1).withText(textNumber1));
        I.waitForElement((locate('li').inside('ol')).at(2).withText(textNumber2));
        I.waitForElement((locate('li').withText(textNumber21)).inside('ol').inside('li').inside('ol'));
        I.waitForElement((locate('li').inside('ol')).at(3).withText(textNumber1_1));
    });
});

Scenario('[C7394] Send mail with different text alignments', async function (I, users) {

    const selectAlignment = (action) => {
        I.click(locate('button').withChild(locate('span').withText('Formats')));
        I.waitForElement((locate('span').withText('Alignment')).inside('.mce-floatpanel'));
        I.click(locate('span.mce-text').withText('Alignment'));
        I.click(locate('span.mce-text').withText(action));
        I.waitForInvisible('.mce-floatpanel');
    };
    let [sender, recipient] = users;

    const mailSubject = 'C7394 Different text alignments';

    const defaultText = 'This text has no alignment.';
    const textLeftAligned = 'This text is left aligned';
    const textCentered = 'This text is centered';
    const textRightAligned = 'This text is right aligned';
    const textJustify = 'This text should be aligned justifyed';

    await I.haveSetting('io.ox/mail//features/registerProtocolHandler', false);

    I.login('app=io.ox/mail', { user: sender });

    // Open the mail composer
    I.retry(5).click('Compose');
    I.waitForElement('.io-ox-mail-compose .contenteditable-editor');
    I.click('~Maximize');

    // Fill out to and subject
    I.waitForFocus('input[placeholder="To"]');
    I.fillField('To', recipient.get('primaryEmail'));
    I.fillField('Subject', mailSubject);

    // Write some text with the default settings
    await within({ frame: iframeLocator }, async () => {
        I.click('.default-style');
        I.pressKey(defaultText);
        I.pressKey('Enter');
    });

    // Write some right aligned text
    selectAlignment('Right');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textRightAligned);
        I.pressKey('Enter');
    });

    // Write some left aligned text
    selectAlignment('Left');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textLeftAligned);
        I.pressKey('Enter');
    });

    // Write some centered text
    selectAlignment('Right');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textCentered);
        I.pressKey(['Shift', 'Home']); // Select the just written text
    });
    selectAlignment('Center');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey('End');
        I.pressKey('Enter');
    });

    // Write some justifyed text
    selectAlignment('Justify');
    await within({ frame: iframeLocator }, async () => {
        I.pressKey(textJustify);
        I.pressKey('Enter');
    });

    // Send the mail
    I.click('Send');

    // Let's stick around a bit for sending to finish
    I.waitForDetached('.io-ox-mail-compose textarea.plain-text,.io-ox-mail-compose .contenteditable-editor');
    I.wait(1);
    I.logout();

    // Log in as second user and navigate to mail app
    I.login('app=io.ox/mail', { user: recipient });

    // Open the mail
    I.waitForText(mailSubject, 2);
    I.retry(5).click(locate('.list-item').withText(mailSubject).inside('.list-view'));
    I.waitForVisible('iframe.mail-detail-frame');

    await within({ frame: '.mail-detail-frame' }, async () => {
        I.waitForElement(locate('div').withText(defaultText));
        expect(await I.grabCssPropertyFrom(locate('div').withText(defaultText), 'text-align')).to.include('start');
        expect(await I.grabCssPropertyFrom(locate('div').withText(textRightAligned), 'text-align')).to.include('right');
        expect(await I.grabCssPropertyFrom(locate('div').withText(textLeftAligned), 'text-align')).to.include('left');
        expect(await I.grabCssPropertyFrom(locate('div').withText(textCentered), 'text-align')).to.include('center');
        expect(await I.grabCssPropertyFrom(locate('div').withText(textJustify), 'text-align')).to.include('justify');
    });
});
