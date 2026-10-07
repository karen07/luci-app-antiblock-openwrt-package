'use strict';
'require view';
'require form';

return view.extend({
    render : function() {
        const m = new form.Map('antiblock', _('AntiBlock'));

        const s = m.section(form.NamedSection, 'config', 'main', _('AntiBlock'));
        s.addremove = true;

        let o = s.option(form.Flag, 'enabled', _('Enabled'));

        o = s.option(
            form.Value, 'listen', _('Listen'),
            _('DNS listen address and port, optional. If empty, network.lan.ipaddr:53 is used.'));
        o.placeholder = '192.168.1.1:53';
        o.rmempty = true;
        o.depends('enabled', '1');

        o = s.option(
            form.DynamicList, 'blacklist', _('Blacklist'),
            _('Prevent adding IP from these subnets to the routing table, optional parameter'));
        o.depends('enabled', '1');

        o = s.option(form.Flag, 'log', _('Log'), _('Show operations log, optional parameter'));
        o.depends('enabled', '1');

        o = s.option(form.Flag, 'stat', _('Statistics'),
                     _('Show statistics data, optional parameter'));
        o.depends('enabled', '1');

        o = s.option(form.Flag, 'test', _('Test mode'),
                     _('Process DNS traffic without modifying kernel routes.'));
        o.depends('enabled', '1');

        return m.render();
    },
});
