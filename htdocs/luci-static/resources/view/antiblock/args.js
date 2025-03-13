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

		o = s.option(form.Value, 'output', _('Output'), _('Log or statistics output folder, optional parameter'));
		o.depends('enabled', '1');

		o = s.option(form.Flag, 'log', _('Log'), _('Show operations log, optional parameter'));
		o.depends({ output: '/', '!contains': true });

		o = s.option(form.Flag, 'stat', _('Stat'), _('Show statistics data, optional parameter'));
		o.depends({ output: '/', '!contains': true });

		return m.render();
	},
});
