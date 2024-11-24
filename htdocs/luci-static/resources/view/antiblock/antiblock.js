'use strict';
"require ui";
'require form';
'require rpc';
'require view';

var read_urls = rpc.declare({
    object: 'luci.antiblock',
    method: 'read_urls'
});

var restart = rpc.declare({
    object: 'luci.antiblock',
    method: 'restart'
});

var write_urls = rpc.declare({
    object: 'luci.antiblock',
    method: 'write_urls',
    params: ["urls"]
});

return view.extend({
    generic_failure: function (message) {
        return E('div', {
            'class': 'error'
        }, ['RPC call failure: ', message])
    },
    load: function () {
        return Promise.all([
            read_urls()
        ]);
    },
    render: function (data) {
        var main_div = E("div");

        var header = E("h2", {}, "Antiblock");

        var section_descr_div = E(
            "div",
            {
                class: "cbi-section-descr",
            },
            "Blocked URLs"
        );

        var section_div = E(
            "div",
            {
                class: "cbi-section",
            }
        );

        var urls_textarea = E(
            "textarea",
            {
                class: "cbi-input-textarea",
            },
            data[0].urls
        );

        var btn_write_urls = E(
            "button",
            {
                class: "btn cbi-button cbi-button-apply",
                click: function (ev) {
                    ui.showModal(null, [
                        E(
                            "p",
                            { class: "spinning" },
                            "Write URLs"
                        ),
                    ]);
                    Promise.all([write_urls(urls_textarea.value)]);
                    location.reload();
                },
            },
            "Write URLs"
        );

        var btn_restart = E(
            "button",
            {
                class: "btn cbi-button cbi-button-apply",
                click: function (ev) {
                    ui.showModal(null, [
                        E(
                            "p",
                            { class: "spinning" },
                            "Restart"
                        ),
                    ]);
                    Promise.all([restart()]);
                    location.reload();
                },
            },
            "Restart"
        );

        main_div.appendChild(header);
        main_div.appendChild(section_div);
        section_div.appendChild(section_descr_div);
        section_div.appendChild(urls_textarea);
        section_div.appendChild(btn_write_urls);
        section_div.appendChild(btn_restart);

        return main_div;
    },
    handleSave: null,
    handleSaveApply: null,
    handleReset: null
})
