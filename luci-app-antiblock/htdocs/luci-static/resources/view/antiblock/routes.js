'use strict';
'require view';
'require form';
'require uci';
'require tools.widgets as widgets';
'require antiblock.validation as validation';

return view.extend({
    render: function () {
        const m = new form.Map('antiblock', _('Routes'));
        const s = m.section(
            form.GridSection,
            'route',
            _('Routes'),
            _(
                'Configure 1 to 32 enabled routes. Each route maps a domain list to a Linux network interface.',
            ),
        );
        s.optional = false;
        s.anonymous = true;
        s.addremove = true;
        s.nodescriptions = true;

        let o = s.option(
            widgets.DeviceSelect,
            'interface',
            _('Interface'),
            _('Linux device name (for example wg0). Legacy gateway entries are also supported.'),
        );
        // Allow a device that is not up yet (for example a future WireGuard tunnel).
        o.nocreate = false;
        o.noaliases = true;
        o.rmempty = false;
        o.forcewrite = true; // Migrate unchanged legacy gateway values on Save.
        o.cfgvalue = function (section_id) {
            return (
                uci.get('antiblock', section_id, 'interface') ||
                uci.get('antiblock', section_id, 'gateway')
            );
        };
        o.validate = function (section_id, value) {
            return validation.iface(value)
                ? true
                : _('Enter a valid interface name (1-15 characters).');
        };
        o.write = function (section_id, value) {
            uci.set('antiblock', section_id, 'interface', value);
            // Prevent a stale legacy value from silently taking effect later.
            uci.unset('antiblock', section_id, 'gateway');
        };

        o = s.option(
            form.Value,
            'domains_path',
            _('Domains path'),
            _(
                'Absolute file path or HTTP(S) URL. Local files under /etc/antiblock/ can be edited in the Domains tab.',
            ),
        );
        o.placeholder = '/etc/antiblock/domains.txt';
        o.rmempty = false;
        o.validate = function (section_id, value) {
            return validation.source(value)
                ? true
                : _('Enter an absolute file path or an HTTP(S) URL.');
        };

        o = s.option(form.Flag, 'enabled', _('Enable'));
        o.default = '1'; // Matches config_get_bool(..., enabled, 1) in init script.
        o.editable = true;

        return m.render();
    },
});
