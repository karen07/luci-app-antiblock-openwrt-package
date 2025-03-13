'use strict';
'require ui';
'require form';
'require rpc';
'require view';
'require tools.widgets as widgets';

const read_routes = rpc.declare({
    object: 'luci.antiblock',
    method: 'read_routes'
});

const write_domains = rpc.declare({
    object: 'luci.antiblock',
    method: 'write_domains',
    params: ['domains']
});

return view.extend({
    generic_failure: function (message) {
        return E('div', {
            'class': 'error'
        }, ['RPC call failure: ', message]);
    },
    load: function () {
        return Promise.all([
            read_routes()
        ]);
    },
    handleSignal: function (signum, pid, ev) {
        console.log("Karen");
    },
    render: function (data) {
        /*const main_div = E('div');

        const header = E('h2', {}, _('AntiBlock'));

        const section_descr_div = E(
            'div',
            {
                class: 'cbi-section-descr',
            },
            _('Domains count in file: ')
        );

        const section_div = E(
            'div',
            {
                class: 'cbi-section',
            }
        );

        main_div.appendChild(header);
        main_div.appendChild(section_div);
        section_div.appendChild(section_descr_div);

        if (typeof data[0].domains !== 'undefined') {
            const domains_textarea = E(
                'textarea',
                {
                    class: 'cbi-input-textarea',
                },
            );

            section_descr_div.innerHTML += data[0].domains.length;

            domains_textarea.value = '';
            data[0].domains.forEach((element) => domains_textarea.value += element + '\n');

            const btn_write_domains = E(
                'button',
                {
                    class: 'btn cbi-button cbi-button-apply',
                    click: function (ev) {
                        ui.showModal(null, [
                            E(
                                'p',
                                { class: 'spinning' },
                                _('Write domains')
                            ),
                        ]);
                        const lines = domains_textarea.value.split(/\r?\n/).filter(Boolean);
                        const write_domains_res = Promise.all([write_domains(lines)]);
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
            const error_div = E(
                'div',
                {
                },
                _('The File argument was not specified.')
            );

            section_div.appendChild(error_div);
        }

        return main_div;
        

        var v = E([], [
            E('h2', _('Routes')),
            E('div', { 'class': 'cbi-map-descr' }, _('xxxxxxxxxxxxxxxxxx')),

            E('table', { 'class': 'table' }, [
                E('tr', { 'class': 'tr table-titles' }, [
                    E('th', { 'class': 'th' }, _('Gateway')),
                    E('th', { 'class': 'th' }, _('Domains path')),
                    E('th', { 'class': 'th center nowrap cbi-section-actions' })
                ])
            ])
        ]);

        var rows = [];
        var i = 0;

        data[0].routes.forEach((route) => {
            i++;
            rows.push([
                E('input', {
                    'type': 'text',
                    'class': 'cbi-input-text',
                    'value': route.gateway
                }),
                E('input', {
                    'type': 'text',
                    'class': 'cbi-input-text',
                    'value': route.domains_path
                }),
                E('div', {}, [
                    E('button', {
                        'class': 'btn cbi-button-positive',
                        'click': ui.createHandlerFn(this, 'handleSignal', 1, i)
                    }, _('Save')), ' ',
                    E('button', {
                        'class': 'btn cbi-button-action',
                        'click': ui.createHandlerFn(this, 'handleSignal', 2, i)
                    }, _('Edit')), ' ',
                    E('button', {
                        'class': 'btn cbi-button-negative',
                        'click': ui.createHandlerFn(this, 'handleSignal', 3, i)
                    }, _('Del'))
                ])
            ]);
        });

        cbi_update_table(v.lastElementChild, rows, E('em', _('No information available')));

        const add_btn = E(
            'button', {
            'class': 'btn cbi-button cbi-button-apply',
            'click': ui.createHandlerFn(this, 'handleSignal', 4)
        }, _('Add'));

        v.appendChild(add_btn);

        return v;*/

        var m, s, o;

        m = new form.Map('antiblock', _('Routes'), _('Routes'));
        m.tabbed = true;

        s = m.section(form.GridSection, 'route', _('Routes'));
        s.anonymous = true;
        s.addremove = true;
        s.sortable = true;
        s.cloneable = true;
        s.nodescriptions = true;

        s.tab('general', _('General Settings'));

        o = s.taboption('general', widgets.NetworkSelect, 'gateway', _('Gateway'), _('Gateway'));
        o.loopback = true;
        o.nocreate = true;
        o.rmempty = true;

        o = s.taboption('general', form.Value, 'domains_path', _('Domains path'), _('Domains path'));

        return m.render();
    }
});
