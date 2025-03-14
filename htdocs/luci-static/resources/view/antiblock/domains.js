'use strict';
'require ui';
'require uci';
'require form';
'require rpc';
'require view';

const read_domains = rpc.declare({
    object: 'luci.antiblock',
    method: 'read_domains',
    params: ['domains_path']
});

const write_domains = rpc.declare({
    object: 'luci.antiblock',
    method: 'write_domains',
    params: ['domains_path', 'domains']
});

let section_routes;
let section_div;

function select_handler() {
    const domains_path = section_routes.selectedOptions[0].label;
    const read_domains_res = Promise.all([read_domains(domains_path)]);
    read_domains_res.then(
        function (data) {
            section_div.innerHTML = '';
            const section_descr_div = E('div', { class: 'cbi-section-descr' }, _('Domains count in file: '));
            section_div.appendChild(section_descr_div);
            if (typeof data[0].domains !== 'undefined') {
                const domains_textarea = E('textarea', { class: 'cbi-input-textarea' },);
                section_descr_div.innerHTML += data[0].domains.length;
                domains_textarea.value = '';
                data[0].domains.forEach((element) => domains_textarea.value += element + '\n');
                const btn_write_domains = E(
                    'button',
                    {
                        class: 'btn cbi-button cbi-button-apply',
                        click: function (ev) {
                            ui.showModal(null, [E('p', { class: 'spinning' }, _('Write domains'))]);
                            const lines = domains_textarea.value.split(/\r?\n/).filter(Boolean);
                            const write_domains_res = Promise.all([write_domains(domains_path, lines)]);
                            write_domains_res.then(
                                function (value) { location.reload(); },
                                function (error) { }
                            );
                        },
                    },
                    _('Write domains')
                );
                section_div.appendChild(domains_textarea);
                section_div.appendChild(btn_write_domains);
            } else {
                section_div.appendChild(E('div', _('Domain is not selected.')));
            }
        },
        function (error) { }
    );
}

return view.extend({
    handleSaveApply: null,
    handleSave: null,
    handleReset: null,
    load: function () {
        return Promise.all([uci.load('antiblock')]);
    },
    render: function () {
        let sections = uci.sections('antiblock', 'route');

        section_routes = E('select', { class: 'cbi-input-select', change: select_handler });
        section_routes.appendChild(E('option'));
        sections.forEach((route) => {
            if (route.domains_path.substring(0, 4) != 'http') {
                const routes_option = E('option', { value: route.domains_path }, route.domains_path);
                section_routes.appendChild(routes_option);
            }
        });
        const routes_div = E('div', { class: 'cbi-section' });
        routes_div.appendChild(E('div', { class: 'cbi-section-descr' }, _('Domains:')));
        routes_div.appendChild(section_routes);

        const main_div = E([]);
        main_div.appendChild(E('h2', _('Domains')));
        main_div.appendChild(routes_div);
        section_div = E('div', { class: 'cbi-section' });
        main_div.appendChild(section_div);

        return main_div;
    }
});
