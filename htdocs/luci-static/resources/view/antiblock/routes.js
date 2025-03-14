'use strict';
'require view';
'require form';
'require tools.widgets as widgets';

return view.extend({
    render: function () {
        const m = new form.Map('antiblock', _('Routes'));

        const s = m.section(form.GridSection, 'route', _('Routes'));
        s.anonymous = true;
        s.addremove = true;
        s.nodescriptions = true;

        let o = s.option(widgets.NetworkSelect, 'gateway', _('Gateway'), _('Gateway'));
        o.loopback = true;
        o.nocreate = true;

        o = s.option(form.Value, 'domains_path', _('Domains path'), _('Domains path'));

        return m.render();
    }
});
