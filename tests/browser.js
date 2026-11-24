'use strict';

// Real Chromium against OpenWrt. All API calls go to rpcd, without mocks.
// Independent checks continue after a failure to report multiple errors per run.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium, expect } = require('@playwright/test');

const URL = process.env.E2E_LUCI_URL;
const PASSWORD = process.env.E2E_PASSWORD;
const BASE = `${URL}/cgi-bin/luci/admin/services/antiblock/`;
const ZERO_SESSION = '00000000000000000000000000000000';
const ARTIFACTS = '/artifacts';
const DOMAIN_PATH = '/etc/antiblock/e2e-domains.txt';

let callId = 0;

async function ubus(request, sid, object, method, args = {}) {
    const response = await request.post(`${URL}/ubus`, {
        data: {
            jsonrpc: '2.0',
            id: ++callId,
            method: 'call',
            params: [sid, object, method, args],
        },
    });
    assert.equal(response.status(), 200, `HTTP /ubus ${object}.${method}`);
    const body = await response.json();
    assert.ok(!body.error, JSON.stringify(body.error));
    assert.ok(Array.isArray(body.result), JSON.stringify(body));
    assert.equal(body.result[0], 0, `ubus ${object}.${method}: ${JSON.stringify(body)}`);
    return body.result[1] || {};
}

async function openView(page, name) {
    const response = await page.goto(`${BASE}${name}`, {
        waitUntil: 'domcontentloaded',
    });
    assert.ok(response && response.status() < 400, `LuCI ${name} HTTP failure`);

    // LuCI loads views asynchronously after DOMContentLoaded.
    await expect(page.locator('#view h2').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#view > .spinning')).toHaveCount(0);
    const contents = await page.locator('#view').innerText();
    assert.doesNotMatch(contents, /Unable to dispatch|Unhandled exception|Error loading view/);
}

async function screenshot(page, name) {
    if (process.env.E2E_SCREENSHOTS === '1') {
        await page.screenshot({ path: `${ARTIFACTS}/${name}.png`, fullPage: true });
    }
}

async function captureFailure(page, name) {
    try {
        await page.screenshot({
            path: `${ARTIFACTS}/failure-${name}.png`,
            fullPage: true,
            timeout: 5000,
        });
    } catch (_) {
        // Failure diagnostics must not hide the original assertion.
    }
    try {
        await fs.writeFile(`${ARTIFACTS}/failure-${name}.html`, await page.content());
    } catch (_) {
        // The page can be unavailable or navigating after a failure.
    }
}

async function run() {
    assert.ok(URL && PASSWORD, 'E2E_LUCI_URL and E2E_PASSWORD are required');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    const consoleErrors = [];
    const failures = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
    });

    async function check(name, action) {
        try {
            await action();
        } catch (error) {
            failures.push({ name, message: error.stack || String(error) });
            console.error(`[FAIL] ${name}: ${error.stack || String(error)}`);
            await captureFailure(page, name);
        }
    }

    try {
        const login = await ubus(context.request, ZERO_SESSION, 'session', 'login', {
            username: 'root',
            password: PASSWORD,
        });
        const sid = login.ubus_rpc_session;
        assert.ok(sid && sid !== ZERO_SESSION, 'RPC login did not return session');
        console.log('[PASS] Real ubus HTTP session authentication');

        // Unauthenticated LuCI intentionally responds with HTTP 403.
        const loginPage = await page.goto(`${URL}/cgi-bin/luci/`, {
            waitUntil: 'domcontentloaded',
        });
        assert.ok(loginPage, 'LuCI CGI returned no response');
        assert.equal(loginPage.status(), 403, 'Unauthenticated LuCI status');
        assert.equal(
            loginPage.headers()['x-luci-login-required'],
            'yes',
            'LuCI authentication challenge header is missing',
        );
        console.log('[PASS] Real LuCI CGI renders the expected login challenge');
        const password = page.locator('input[name="luci_password"]');
        await password.waitFor();
        const username = page.locator('input[name="luci_username"]');
        if (await username.count()) await username.fill('root');
        await password.fill(PASSWORD);
        await page.locator('button.cbi-button-positive.important').click();
        await password.waitFor({ state: 'detached', timeout: 30000 });
        console.log('[PASS] Real LuCI browser authentication');

        // Fixture files are prepared by docker exec before the browser starts.
        // Read telemetry before Args/Domain changes can restart the daemon.
        await check('log', async () => {
            await openView(page, 'log');
            await expect(page.locator('#antiblock-log')).toHaveValue('luci-e2e-log-marker');
            console.log('[PASS] Log reads real OpenWrt file');
        });

        await check('statistics', async () => {
            await openView(page, 'statistics');
            await expect(page.locator('#antiblock-statistics')).toHaveValue('luci-e2e-stat-marker');
            console.log('[PASS] Statistics reads real OpenWrt file');
        });

        await check('args', async () => {
            await openView(page, 'args');
            const listen = page.locator('input[id$=".listen"]');
            await expect(listen).toHaveValue('127.0.0.1:55333');
            console.log('[PASS] Args reads real UCI configuration');

            await listen.fill('256.1.1.1:53');
            await listen.blur();
            await expect(listen).toHaveClass(/cbi-input-invalid/);
            console.log('[PASS] Args rejects invalid IPv4:port');
            await screenshot(page, 'invalid-listen');

            await listen.fill('127.0.0.1:55334');
            await listen.blur();
            await expect(listen).not.toHaveClass(/cbi-input-invalid/);
            // LuCI uses ui.ComboButton, a div.cbi-dropdown, not a button element.
            const save = page.locator('.cbi-page-actions .cbi-dropdown.cbi-button-apply');
            await expect(save).toBeVisible();
            // Wait for LuCI's automatic reload after confirming the apply.
            // Navigating away earlier may interrupt confirmation and cause rollback.
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
                save.click(),
            ]);
            await expect(listen).toHaveValue('127.0.0.1:55334');
            await expect
                .poll(
                    async () => {
                        const value = await ubus(context.request, sid, 'uci', 'get', {
                            config: 'antiblock',
                            section: 'config',
                            option: 'listen',
                        });
                        return value.value;
                    },
                    { timeout: 30000 },
                )
                .toBe('127.0.0.1:55334');
            console.log('[PASS] Browser Save & Apply persisted to UCI via rpcd');
            await screenshot(page, 'args-saved');
        });

        await check('routes', async () => {
            await openView(page, 'routes');
            await expect(page.locator('#view')).toContainText(DOMAIN_PATH);
            console.log('[PASS] Routes displays the configured domain path');
        });

        await check('domains', async () => {
            const original = '# E2E header\nexample.org\n\n!exact.example.org\n';
            const updated = `${original}new.example.org\n`;
            await openView(page, 'domains');
            const editor = page.locator('#view textarea.cbi-input-textarea');
            await expect(editor).toHaveValue(original);
            const before = await ubus(context.request, sid, 'file', 'read', {
                path: DOMAIN_PATH,
            });
            assert.equal(before.data, original, 'Opening Domains modified its file');
            await editor.fill(updated);
            await page.locator('#view button.cbi-button-apply').click();
            await expect(page.locator('body')).not.toHaveClass(/modal-overlay-active/, {
                timeout: 30000,
            });
            await expect(
                page.locator('.alert-message').filter({
                    hasText: /Unable to write to domains file|AntiBlock could not be restarted/,
                }),
            ).toHaveCount(0);
            await expect(editor).toHaveValue(updated);
            await expect
                .poll(
                    async () => {
                        const value = await ubus(context.request, sid, 'file', 'read', {
                            path: DOMAIN_PATH,
                        });
                        return value.data;
                    },
                    { timeout: 30000 },
                )
                .toBe(updated);
            console.log('[PASS] Domains edits real file and preserves blank lines');
            await screenshot(page, 'domains-saved');
        });

        await check('javascript', async () => {
            assert.deepEqual(errors, [], `Browser JavaScript errors: ${errors.join('; ')}`);
            console.log('[PASS] No uncaught browser JavaScript errors');
        });

        if (failures.length) {
            await fs.writeFile(
                `${ARTIFACTS}/failures.txt`,
                failures.map((e) => `${e.name}: ${e.message}`).join('\n\n'),
            );
            throw new Error(
                `${failures.length} E2E checks failed: ` + failures.map((e) => e.name).join(', '),
            );
        }
        if (consoleErrors.length) {
            await fs.writeFile(`${ARTIFACTS}/console-errors.txt`, consoleErrors.join('\n'));
        }
        console.log('[PASS] All real LuCI browser E2E checks passed');
    } catch (error) {
        await captureFailure(page, 'fatal');
        throw error;
    } finally {
        await context.close();
        await browser.close();
    }
}

run().catch((error) => {
    console.error('[FAIL] LuCI browser E2E:', error);
    process.exitCode = 1;
});
