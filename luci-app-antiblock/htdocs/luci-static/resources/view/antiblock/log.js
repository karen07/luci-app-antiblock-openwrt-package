'use strict';
'require view';
'require fs';
'require poll';
'require uci';

const DATA_PATH = '/tmp/antiblock/log.txt';

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
                value: _('Unable to load log data:') + ' ' + err.message,
                rows: 8,
            };
        }
    },

    pollLog: async function () {
        const element = document.getElementById('antiblock-log');
        if (element) {
            const data = await this.retrieveLog();
            element.value = data.value;
            element.rows = data.rows;
        }
    },

    load: async function () {
        await uci.load('antiblock');
        this.enabled = uci.get('antiblock', 'config', 'log') === '1';
        if (!this.enabled) return null;
        poll.add(this.pollLog.bind(this), 10);
        return this.retrieveLog();
    },

    render: function (data) {
        if (!this.enabled)
            return E('div', {}, [
                E('h2', {}, _('Log')),
                E('div', { class: 'cbi-section-descr' }, _('Log is not enabled.')),
            ]);

        const content = [E('h2', {}, _('Log'))];
        const down = E(
            'button',
            { class: 'cbi-button cbi-button-neutral', type: 'button' },
            _('Scroll to tail', 'scroll to bottom (the tail) of the log file'),
        );
        const up = E(
            'button',
            { class: 'cbi-button cbi-button-neutral', type: 'button' },
            _('Scroll to head', 'scroll to top (the head) of the log file'),
        );
        down.addEventListener('click', function () {
            up.scrollIntoView();
        });
        up.addEventListener('click', function () {
            down.scrollIntoView();
        });
        content.push(down);
        content.push(
            E(
                'textarea',
                {
                    id: 'antiblock-log',
                    style: 'width:100%;font-size:12px',
                    readonly: 'readonly',
                    wrap: 'off',
                    rows: data.rows,
                },
                [data.value],
            ),
        );
        content.push(up);
        return E('div', { class: 'cbi-section' }, content);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null,
});
