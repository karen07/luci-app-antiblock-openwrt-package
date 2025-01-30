'use strict';
"require ui";
'require form';
'require rpc';
'require view';

const read_urls = rpc.declare({
    object: 'luci.antiblock',
    method: 'read_urls'
});

const write_urls = rpc.declare({
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
        const main_div = E("div");

        const header = E("h2", {}, _("AntiBlock"));

        const section_descr_div = E(
            "div",
            {
                class: "cbi-section-descr",
            },
            _("Blocked URLs")
        );

        const section_div = E(
            "div",
            {
                class: "cbi-section",
            }
        );

        main_div.appendChild(header);
        main_div.appendChild(section_div);
        section_div.appendChild(section_descr_div);

        if (typeof data[0].urls !== 'undefined') {
            const urls_textarea = E(
                "textarea",
                {
                    class: "cbi-input-textarea",
                },
            );

            urls_textarea.value = "";
            data[0].urls.forEach((element) => urls_textarea.value += element + "\n");

            const btn_write_urls = E(
                "button",
                {
                    class: "btn cbi-button cbi-button-apply",
                    click: function (ev) {
                        ui.showModal(null, [
                            E(
                                "p",
                                { class: "spinning" },
                                _("Write URLs")
                            ),
                        ]);
                        const lines = urls_textarea.value.split(/\r?\n/).filter(Boolean);
                        const write_urls_res = Promise.all([write_urls(lines)]);
                        write_urls_res.then(
                            function (value) { location.reload(); },
                            function (error) { /* code if some error */ }
                        );
                    },
                },
                _("Write URLs")
            );

            section_div.appendChild(urls_textarea);
            section_div.appendChild(btn_write_urls);
        } else {
            const error_div = E(
                "div",
                {
                },
                _("The File argument was not specified.")
            );

            section_div.appendChild(error_div);
        }

        return main_div;
    },
    handleSave: null,
    handleSaveApply: null,
    handleReset: null
})
