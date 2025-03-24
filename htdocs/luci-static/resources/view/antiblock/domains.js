'use strict';
'require ui';
'require uci';
'require fs';
'require form';
'require view';

let section_routes;
let section_data;
let domains_textarea;

async function write_domains_handler() {
    ui.showModal(null, [E('p', { class: 'spinning' }, _('Write domains'))]);
    const lines = domains_textarea.value.split(/\r?\n/).filter(Boolean);
    let write_data = '';
    lines.forEach((element) => write_data += element + '\n');
    const domains_path = section_routes.selectedOptions[0].label;
    await fs.write(domains_path, write_data);
    await fs.exec('/etc/init.d/antiblock', ['restart']);
    location.reload();
}

function read_domains_handler(data) {
    const text_data = data[0].split(/\r?\n/).filter(Boolean);

    section_data.innerHTML = '';

    const section_descr_div = E('div', { class: 'cbi-section-descr' }, _('Domains count in file: ') + text_data.length);

    domains_textarea = E('textarea', { class: 'cbi-input-textarea' },);
    domains_textarea.value = '';
    text_data.forEach((element) => domains_textarea.value += element + '\n');

    const btn_write_domains = E('button', { class: 'cbi-button cbi-button-apply', click: write_domains_handler }, _('Write domains'));
    const div_for_btn = E('div', { style: 'padding-top: 20px' });
    div_for_btn.appendChild(btn_write_domains);

    section_data.appendChild(section_descr_div);
    section_data.appendChild(domains_textarea);
    section_data.appendChild(div_for_btn);
}

function select_handler() {
    const domains_path = section_routes.selectedOptions[0].label;
    const read_domains_res = Promise.all([fs.read(domains_path)]);
    read_domains_res.then(read_domains_handler);
}

return view.extend({
    handleSaveApply: null,
    handleSave: null,
    handleReset: null,
    load: async function () {
        return await uci.load('antiblock');
    },
    render: function () {
        const uci_routes = uci.sections('antiblock', 'route');

        let file_paths = 0;

        section_routes = E('select', { class: 'cbi-input-select', change: select_handler });
        uci_routes.forEach((route) => {
            if (route.domains_path.substring(0, 4) != 'http') {
                const routes_option = E('option', { value: route.domains_path }, route.domains_path);
                section_routes.appendChild(routes_option);
                file_paths++;
            }
        });

        const main_div = E([]);
        main_div.appendChild(E('h2', _('Domains')));

        if (file_paths > 0) {
            const routes_div = E('div', { class: 'cbi-section' });
            routes_div.appendChild(E('div', { class: 'cbi-section-descr' }, _('Domains path:')));
            routes_div.appendChild(section_routes);
            main_div.appendChild(routes_div);

            section_data = E('div', { class: 'cbi-section' });
            main_div.appendChild(section_data);

            select_handler();
        } else {
            const routes_div = E('div', { class: 'cbi-section' });
            routes_div.appendChild(E('div', { class: 'cbi-section-descr' }, _('Path to file in "Domains path" is not set.')));
            main_div.appendChild(routes_div);
        }

        return main_div;
    }
});
