const Helper = require('@open-xchange/codecept-helper').helper,
    axe = require('axe-core');
const { util } = require('@open-xchange/codecept-helper');

function assertElementExists(res, locator, prefixMessage = 'Element', postfixMessage = 'was not found by text|CSS|XPath') {
    if (!res || res.length === 0) {
        if (typeof locator === 'object') locator = locator.toString();
        throw new Error(`${prefixMessage} "${locator}" ${postfixMessage}`);
    }
}
class MyHelper extends Helper {

    // will hopefully be removed when codecept 2.0 works as expected
    async grabHTMlFrom2(locator) {

        let wdio = this.helpers['WebDriver'];

        const elems = await wdio._locate(locator, true);
        assertElementExists(elems, locator);
        const html = Promise.all(elems.map(async elem => elem.getHTML()));
        this.debugSection('Grab', html);
        return html;

    }

    // This needs to be a helper, as actors are too verbose in this case
    async grabAxeReport(context, options) {
        let wdio = this.helpers['WebDriver'],
            browser = wdio.browser;
        if (typeof options === 'undefined') options = {};
        if (typeof context === 'undefined') context = '';
        const report = await browser.executeAsync(function (axeSource, context, options, done) {
            if (typeof axe === 'undefined') {
                // eslint-disable-next-line no-eval
                window.eval(axeSource);
            }
            // Arity needs to be correct here so we need to compact arguments
            window.axe.run.apply(this, _.compact([context || $('html'), options])).then(function (report) {
                try {
                    var nodes = [];
                    for (const violation of report.violations) {
                        for (const node of violation.nodes) {
                            nodes.push(node.target);
                            for (const combinedNodes of [node.all, node.any, node.none]) {
                                if (!_.isEmpty(combinedNodes)) {
                                    for (const any of combinedNodes) {
                                        for (const relatedNode of any.relatedNodes) {
                                            nodes.push(relatedNode.target);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    $(nodes.join(',')).css('border', '2px solid red');
                } catch (err) {
                    done(err.message);
                }
                done(report);
            });
        }, axe.source, context, options);
        if (typeof report === 'string') throw report;
        return report;
    }

    async createFolder(folder, id, options) {
        const { httpClient, session } = await util.getSessionForUser(options);
        return httpClient.put('/appsuite/api/folders', folder, {
            params: {
                action: 'new',
                autorename: true,
                folder_id: id,
                session: session,
                tree: 1
            }
        });
    }

    async haveGroup(group, options) {
        const { httpClient, session } = await util.getSessionForUser(options);
        const response = await httpClient.put('/appsuite/api/group', group, {
            params: {
                action: 'new',
                session: session
            }
        });
        return response.data.data;
    }

    async dontHaveGroup(name, options) {
        const { httpClient, session } = await util.getSessionForUser(options);
        const { data: { data } } = await httpClient.put('/appsuite/api/group', '', {
            params: {
                action: 'all',
                columns: '1,701',
                session
            }
        });
        const timestamp = require('moment')().add(30, 'years').format('x');
        const test = typeof name.test === 'function' ? g => name.test(g[1]) : g => name === g[1];

        const ids = data.filter(test).map(g => g[0]);
        return Promise.all(ids.map(async (id) => {
            await httpClient.put('/appsuite/api/group', { id }, {
                params: {
                    action: 'delete',
                    session,
                    timestamp
                }
            });
            return { id, name };
        }));
    }

    async haveResource(data, options) {
        const { httpClient, session } = await util.getSessionForUser(options);
        const response = await httpClient.put('/appsuite/api/resource', data, {
            params: {
                action: 'new',
                session: session
            }
        });
        return response.data.data.id;
    }

}

module.exports = MyHelper;
