'use strict';
'require view';
'require form';
'require antiblock.validation as validation';

return view.extend({
    render: function () {
        const m = new form.Map('antiblock', _('AntiBlock'));
        const s = m.section(form.NamedSection, 'config', 'main', _('AntiBlock'));
        // The shipped UCI file may contain only comments until first setup.
        s.addremove = true;

        let o = s.option(form.Flag, 'enabled', _('Enabled'));
        o.default = '0';

        o = s.option(
            form.Value,
            'listen',
            _('Listen'),
            _('DNS source IPv4 address and port. Leave empty to use network.lan.ipaddr:53.'),
        );
        o.placeholder = '192.168.1.1:53';
        o.rmempty = true;
        o.depends('enabled', '1');
        o.retain = true; // Disabling the daemon must not erase its settings.
        o.validate = function (section_id, value) {
            return validation.listen(value)
                ? true
                : _('Enter a valid IPv4 address and port (1-65535).');
        };

        o = s.option(
            form.DynamicList,
            'blacklist',
            _('Blacklist'),
            _('Additional IPv4 CIDR networks to exclude from routing (up to 110 entries).'),
        );
        o.depends('enabled', '1');
        o.retain = true; // Disabling the daemon must not erase its settings.
        o.validate = function (section_id, value) {
            const entries =
                typeof this.formvalue === 'function' ? this.formvalue(section_id) : value;
            if (Array.isArray(entries) && entries.length > 110)
                return _('Too many blacklist entries (maximum 110).');
            return validation.blacklist(value)
                ? true
                : _('Use IPv4 CIDR notation with a prefix from 1 to 32.');
        };

        o = s.option(
            form.Flag,
            'log',
            _('Log'),
            _('Write DNS operations to /tmp/antiblock/log.txt (RAM).'),
        );
        o.default = '0';
        o.depends('enabled', '1');
        o.retain = true; // Disabling the daemon must not erase its settings.

        o = s.option(
            form.Flag,
            'stat',
            _('Statistics'),
            _('Write statistics to /tmp/antiblock/stat.txt (RAM).'),
        );
        o.default = '0';
        o.depends('enabled', '1');
        o.retain = true; // Disabling the daemon must not erase its settings.

        o = s.option(
            form.Flag,
            'test',
            _('Test mode'),
            _('Process DNS traffic without modifying kernel routes.'),
        );
        o.default = '0';
        o.depends('enabled', '1');
        o.retain = true; // Disabling the daemon must not erase its settings.

        return m.render();
    },
});
