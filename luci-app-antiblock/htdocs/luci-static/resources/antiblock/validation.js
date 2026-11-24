'use strict';
'require baseclass';

// Keep these limits aligned with AntiBlock 3.x: IFNAMSIZ=16,
// AB_MAX_RULES=32 and AB_MAX_BLACKLIST=128 (18 built-in networks).
function ipv4(text) {
    if (typeof text !== 'string' || !/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(text))
        return false;
    return text.split('.').every(function (octet) {
        return Number(octet) <= 255;
    });
}

function listen(text) {
    if (text == null || text === '') return true;
    if (typeof text !== 'string') return false;
    const parts = /^(.+):(\d{1,5})$/.exec(text);
    return (
        parts !== null &&
        ipv4(parts[1]) &&
        parts[1] !== '0.0.0.0' &&
        Number(parts[2]) >= 1 &&
        Number(parts[2]) <= 65535
    );
}

function cidr(text) {
    if (typeof text !== 'string') return false;
    const parts = /^(.+)\/(\d{1,2})$/.exec(text);
    return parts !== null && ipv4(parts[1]) && Number(parts[2]) >= 1 && Number(parts[2]) <= 32;
}

function blacklist(value) {
    if (value == null || value === '') return true;
    if (Array.isArray(value)) return value.length <= 110 && value.every(cidr);
    return cidr(value);
}

function iface(value) {
    // Linux IFNAMSIZ includes the terminating NUL byte.
    return (
        typeof value === 'string' &&
        value.length > 0 &&
        value.length < 16 &&
        !/[\s/:]/.test(value) &&
        value !== '.' &&
        value !== '..'
    );
}

function source(value) {
    if (typeof value !== 'string' || !value || /[\r\n\0]/.test(value)) return false;
    if (/^https?:\/\//.test(value)) return /^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(value);
    // The daemon accepts absolute filenames containing spaces.
    return value.startsWith('/');
}

function editablePath(value) {
    const prefix = '/etc/antiblock/';
    if (typeof value !== 'string' || !value.startsWith(prefix) || /[\x00-\x1f\x7f]/.test(value))
        return false;
    // Retain support for existing nested files while rejecting traversal.
    return value
        .slice(prefix.length)
        .split('/')
        .every(function (part) {
            return part !== '' && part !== '.' && part !== '..';
        });
}

return baseclass.extend({
    ipv4: ipv4,
    listen: listen,
    cidr: cidr,
    blacklist: blacklist,
    iface: iface,
    source: source,
    editablePath: editablePath,
});
