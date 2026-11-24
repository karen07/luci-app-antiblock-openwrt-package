'use strict';
'require view';
'require fs';
'require poll';
'require uci';

const DATA_PATH = '/tmp/antiblock/stat.txt';

return view.extend({
    enabled: false,

    retrieveLog: async function () {
        try {
            const raw = await fs.read_direct(DATA_PATH);
            // An empty file is normal immediately after daemon startup.
            const value = raw.replace(/^<\d+>/gm, '').trimEnd();
            return { value: value, rows: Math.min(24, Math.max(8, value.split('\n').length)) };
        } catch (err) {
            return {
                value: _('Unable to load statistics data:') + ' ' + err.message,
                rows: 8,
            };
        }
    },

    pollLog: async function () {
        const element = document.getElementById('antiblock-statistics');
        if (element) {
            const data = await this.retrieveLog();
            element.value = data.value;
            element.rows = data.rows;
        }
    },

    load: async function () {
        await uci.load('antiblock');
        this.enabled = uci.get('antiblock', 'config', 'stat') === '1';
        if (!this.enabled) return null;
        poll.add(this.pollLog.bind(this), 10);
        return this.retrieveLog();
    },

    render: function (data) {
        if (!this.enabled)
            return E('div', {}, [
                E('h2', {}, _('Statistics')),
                E('div', { class: 'cbi-section-descr' }, _('Statistics are not enabled.')),
            ]);

        const content = [E('h2', {}, _('Statistics'))];
        content.push(
            E(
                'textarea',
                {
                    id: 'antiblock-statistics',
                    style: 'width:100%;font-size:12px',
                    readonly: 'readonly',
                    wrap: 'off',
                    rows: data.rows,
                },
                [data.value],
            ),
        );
        return E('div', { class: 'cbi-section' }, content);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null,
});
