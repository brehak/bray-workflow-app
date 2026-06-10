// ──────────────────────────────────────────────────────────────────────────
// Minimal ZIP writer (store / no compression)
//
// A tiny, dependency-free ZIP builder — enough to bundle a handful of small
// JSON files into a single downloadable archive. Files are stored uncompressed
// (method 0), which keeps the implementation small and is perfectly fine for
// text payloads of this size. Produces a Blob ready for download.
// ──────────────────────────────────────────────────────────────────────────

// CRC-32 (IEEE) — required by the ZIP format for each entry.
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();

function pushU16(arr, v) {
    arr.push(v & 0xff, (v >>> 8) & 0xff);
}
function pushU32(arr, v) {
    arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
}

/**
 * Build a ZIP Blob from `files` — an array of { name, content } where `content`
 * is a string. Returns a Blob with type "application/zip".
 */
export function createZip(files) {
    const localParts = []; // byte arrays for local headers + data
    const central = []; // central directory bytes
    let offset = 0;

    for (const file of files) {
        const nameBytes = encoder.encode(file.name);
        const dataBytes = encoder.encode(file.content);
        const crc = crc32(dataBytes);

        // Local file header
        const local = [];
        pushU32(local, 0x04034b50); // signature
        pushU16(local, 20); // version needed
        pushU16(local, 0); // flags
        pushU16(local, 0); // method: store
        pushU16(local, 0); // mod time
        pushU16(local, 0); // mod date
        pushU32(local, crc);
        pushU32(local, dataBytes.length); // compressed size
        pushU32(local, dataBytes.length); // uncompressed size
        pushU16(local, nameBytes.length);
        pushU16(local, 0); // extra length
        const localHeader = new Uint8Array(local);

        const entry = new Uint8Array(localHeader.length + nameBytes.length + dataBytes.length);
        entry.set(localHeader, 0);
        entry.set(nameBytes, localHeader.length);
        entry.set(dataBytes, localHeader.length + nameBytes.length);
        localParts.push(entry);

        // Central directory record
        pushU32(central, 0x02014b50); // signature
        pushU16(central, 20); // version made by
        pushU16(central, 20); // version needed
        pushU16(central, 0); // flags
        pushU16(central, 0); // method: store
        pushU16(central, 0); // mod time
        pushU16(central, 0); // mod date
        pushU32(central, crc);
        pushU32(central, dataBytes.length);
        pushU32(central, dataBytes.length);
        pushU16(central, nameBytes.length);
        pushU16(central, 0); // extra length
        pushU16(central, 0); // comment length
        pushU16(central, 0); // disk number
        pushU16(central, 0); // internal attrs
        pushU32(central, 0); // external attrs
        pushU32(central, offset); // local header offset
        for (let i = 0; i < nameBytes.length; i++) central.push(nameBytes[i]);

        offset += entry.length;
    }

    const centralBytes = new Uint8Array(central);
    const centralOffset = offset;

    // End of central directory record
    const end = [];
    pushU32(end, 0x06054b50);
    pushU16(end, 0); // disk
    pushU16(end, 0); // disk with central dir
    pushU16(end, files.length); // entries on this disk
    pushU16(end, files.length); // total entries
    pushU32(end, centralBytes.length); // central dir size
    pushU32(end, centralOffset); // central dir offset
    pushU16(end, 0); // comment length

    return new Blob([...localParts, centralBytes, new Uint8Array(end)], { type: 'application/zip' });
}

/** Slugify a workflow name into a safe file stem. */
export function slugify(name, fallback = 'workflow') {
    const slug = (name ?? '')
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || fallback;
}
