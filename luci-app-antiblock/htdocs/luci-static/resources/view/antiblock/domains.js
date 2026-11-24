'use strict';
'require ui';
'require uci';
'require fs';
'require view';
'require antiblock.validation as validation';

let section_routes;
let section_data;
let domains_textarea;

async function execChecked(command, args) {
    const result = await fs.exec(command, args);
    // fs.exec() resolves even when the child exits with a nonzero status.
    if (!result || result.code !== 0)
        throw new Error(result?.stderr || command + ': exit code ' + result?.code);
}

async function write_domains_handler(ev) {
    ev.preventDefault();
    const domains_path = section_routes.value;
    if (!validation.editablePath(domains_path)) return;

    ui.showModal(null, [E('p', { class: 'spinning' }, _('Write domains'))]);
    let success = false;
    let written = false;
    try {
        await execChecked('/bin/mkdir', ['-p', '/etc/antiblock']);
        // Preserve comments, empty lines and trailing newline as entered.
        await fs.write(domains_path, domains_textarea.value);
        written = true;
        await execChecked('/etc/init.d/antiblock', ['restart']);
        success = true;
    } catch (err) {
        ui.addNotification(
            null,
            E(
                'p',
                {},
                (written
                    ? _('Domains saved, but AntiBlock could not be restarted:')
                    : _('Unable to write to domains file')) +
                    ' ' +
                    domains_path +
                    ': ' +
                    err.message,
            ),
        );
    } finally {
        ui.hideModal();
    }
    // Do not discard unsaved text on write / restart errors.
    if (success && section_routes.value === domains_path) await select_handler();
}

function read_domains_handler(data) {
    const count = data.split(/\r?\n/).filter(function (line) {
        return line.trim() && !line.trimStart().startsWith('#');
    }).length;
    section_data.replaceChildren(
        E('div', { class: 'cbi-section-descr' }, _('Domain count in file:') + ' ' + count),
        (domains_textarea = E(
            'textarea',
            {
                class: 'cbi-input-textarea',
                style: 'width:100%;min-height:24em',
            },
            [data],
        )),
        E('div', { style: 'padding-top:20px' }, [
            E(
                'button',
                {
                    type: 'button',
                    class: 'cbi-button cbi-button-apply',
                    click: write_domains_handler,
                },
                _('Write domains'),
            ),
        ]),
    );
}

async function select_handler() {
    const domains_path = section_routes.value;
    section_data.replaceChildren();
    if (!validation.editablePath(domains_path)) return;

    try {
        const data = await fs.read_direct(domains_path);
        if (section_routes.value === domains_path) read_domains_handler(data);
    } catch (err) {
        if (section_routes.value !== domains_path) return;
        // A new local list can be created by the Write domains button.
        // Do not create files merely by opening the LuCI page.
        if (/Failed to stat requested path|No such file|ENOENT/i.test(err.message)) {
            read_domains_handler('');
        } else {
            section_data.appendChild(
                E(
                    'p',
                    {},
                    _('Unable to read domains file') + ' ' + domains_path + ': ' + err.message,
                ),
            );
        }
    }
}

return view.extend({
    handleSaveApply: null,
    handleSave: null,
    handleReset: null,
    load: function () {
        return uci.load('antiblock');
    },
    render: function () {
        const uci_routes = uci.sections('antiblock', 'route');
        const seen = new Set();
        section_routes = E('select', { class: 'cbi-input-select', change: select_handler });
        uci_routes.forEach(function (route) {
            const domains_path = route.domains_path || '';
            if (validation.editablePath(domains_path) && !seen.has(domains_path)) {
                seen.add(domains_path);
                section_routes.appendChild(E('option', { value: domains_path }, domains_path));
            }
        });

        const main_div = E('div', {}, [E('h2', {}, _('Domains'))]);
        if (section_routes.options.length === 0) {
            main_div.appendChild(
                E(
                    'div',
                    { class: 'cbi-section-descr' },
                    _('No editable domain file is configured in /etc/antiblock.'),
                ),
            );
            return main_div;
        }

        main_div.appendChild(
            E('div', { class: 'cbi-section' }, [
                E('div', { class: 'cbi-section-descr' }, _('Domains path:')),
                section_routes,
            ]),
        );
        section_data = E('div', { class: 'cbi-section' });
        main_div.appendChild(section_data);
        // Avoid a side effect on render; the read only updates the editor.
        select_handler();
        return main_div;
    },
});
