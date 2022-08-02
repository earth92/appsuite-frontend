/*
 *
 * @copyright Copyright (c) OX Software GmbH, Germany <info@open-xchange.com>
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with OX App Suite. If not, see <https://www.gnu.org/licenses/agpl-3.0.txt>.
 *
 * Any use of the work other than as authorized under this license or copyright law is prohibited.
 *
 */

/// <reference path="../../steps.d.ts" />

Feature('Chat > Typing notifications');

Before(async ({ users }) => {
    await Promise.all([
        users.create(),
        users.create()
    ]);
    await users[0].context.hasCapability('chat');
});

After(async ({ users }) => {
    await users[0].context.doesntHaveCapability('chat');
    await users.removeAll();
});

Scenario('Typing notifications will appear and stop on message sent', async ({ I, users, chat }) => {
    const message1 = 'I will only type some words';
    const message2 = ' and then I will write a lot of words and send it immediately. The typing notification should stop as soon I press "Enter".';

    await session('Alice', async () => {
        I.login({ user: users[0] });
        chat.openChat();
        chat.createPrivateChat(users[1].userdata.email1);
    });

    await session('Bob', async () => {
        I.login({ user: users[1] });
        chat.openChat();
        I.waitForText('User', 30, '.ox-chat');
        I.click(locate('.ox-chat li').withText('User'));
        I.waitForText('Hello.', 3, '.messages');
    });

    await session('Alice', async () => {
        I.waitForNetworkTraffic();
        I.fillField('~Message', message1);
    });

    await session('Bob', async () => {
        I.waitForDetached('.typing[style="display: none;"]', 3, '.ox-chat');
        I.waitForText(`${users[0].userdata.given_name} ${users[0].userdata.sur_name} is typing`, 3, '.ox-chat');
        I.waitForElement('.typing[style="display: none;"]', 10, '.ox-chat');
    });

    await session('Alice', async () => {
        I.fillField('~Message', message2);
        I.pressKey('Enter');
    });
    await session('Bob', async () => {
        I.waitForText(`${message1}${message2}`, 15, '.ox-chat');
        I.waitForElement('.typing[style="display: none;"]', 0, '.ox-chat');
    });
});

Scenario('Typing notifications will appear for multiple users typing', async ({ I, users, chat }) => {
    await users.create();
    const message = 'This is a long message and will take a while to type in. So Alice has enough time to check if there is a typing notification.';

    await session('Alice', async () => {
        I.login({ user: users[0] });
        chat.openChat();
        // create a group chat
        I.waitForText('New Chat', 30);
        I.click('New Chat');
        I.clickDropdown('Group chat');
        chat.fillNewGroupForm('Test Group', [users[1].userdata.email1, users[2].userdata.email1]);
        I.click(locate({ css: 'button' }).withText('Create chat'), '.ox-chat-popup');
        I.waitForDetached('.modal-dialog');
        chat.sendMessage('Hey group!');
    });

    await session('Bob', async () => {
        I.login({ user: users[1] });
        chat.openChat();
        I.waitForText('Test Group', 30, '.ox-chat');
        I.click(locate('.ox-chat li').withText('Test Group'));
        I.waitForText('Hey group!', 3, '.messages');
    });

    await session('Charlie', async () => {
        I.login({ user: users[2] });
        chat.openChat();
        I.waitForText('Test Group', 30, '.ox-chat');
        I.click(locate('.ox-chat li').withText('Test Group'));
        I.waitForText('Hey group!', 3, '.messages');
        I.say('Lets go!');
    });

    session('Bob', async () => {
        I.waitForElement('.chat-rightside');
        await within('.chat-rightside', async () => {
            I.fillField('~Message', message);
        });
    });
    session('Charlie', async () => {
        I.waitForElement('.chat-rightside');
        await within('.chat-rightside', async () => {
            I.fillField('~Message', message);
        });
    });

    await session('Alice', async () => {
        I.waitForDetached('.typing[style="display: none;"]', 3, '.ox-chat');
        I.waitForText(users[0].userdata.given_name, 3, '.ox-chat .typing');
        I.waitForText(users[1].userdata.given_name, 3, '.ox-chat .typing');
        I.waitForElement('.typing[style="display: none;"]', 10, '.ox-chat');
    });
});
