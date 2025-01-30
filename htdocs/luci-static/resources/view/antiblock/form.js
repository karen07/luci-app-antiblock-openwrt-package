'use strict';
'require view';
'require form';
'require tools.widgets as widgets';

return view.extend({
	render: function () {
		const m = new form.Map('antiblock', _('AntiBlock'));

		const s = m.section(form.NamedSection, 'config', 'antiblock', _('AntiBlock'));
		s.addremove = true;

		let o = s.option(form.Flag, 'enabled', _('Enabled'));

		o = s.option(form.Value, 'url', _('URL'));
		o.default = 'https://antifilter.download/list/domains.lst';
		o.depends('enabled', '1');

		o = s.option(form.Value, 'file', _('File'));
		o.depends('enabled', '1');

		o = s.option(form.Value, 'DNS', _('DNS'));
		o.default = '1.1.1.1:53';
		o.depends('enabled', '1');

		o = s.option(form.Value, 'listen', _('Listen'));
		o.default = '192.168.1.1:5053';
		o.depends('enabled', '1');

		o = s.option(widgets.DeviceSelect, 'VPN_name', _('VPN name'));
		o.depends('enabled', '1');

		o = s.option(form.Value, 'output', _('Output'));
		o.depends('enabled', '1');

		o = s.option(form.Flag, 'log', _('Log'));
		o.depends({ output: '/', '!contains': true });

		o = s.option(form.Flag, 'stat', _('Stat'));
		o.depends({ output: '/', '!contains': true });

		return m.render();
	},
});
