// Packs extension/ into public/downloads/lume-nptel-extension.zip, the download in Settings → NPTEL,
// with Lume's address filled in. Run after changing the extension or the address:
//   npm run extension:zip -- https://your-lume.vercel.app
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const origin = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!/^https:\/\/[^/\s]+$/.test(origin)) {
  console.error('Usage: npm run extension:zip -- https://your-lume.vercel.app');
  process.exit(1);
}

const root = fileURLToPath(new URL('../extension/', import.meta.url));
const out = fileURLToPath(new URL('../public/downloads/lume-nptel-extension.zip', import.meta.url));

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
})(root);

// Everything sits in a "lume-nptel" folder, so unzipping gives one folder to pick in Load unpacked.
const local = [];
const central = [];
let offset = 0;
for (const path of files) {
  const name = Buffer.from(`lume-nptel/${relative(root, path).replaceAll('\\', '/')}`);
  let data = readFileSync(path);
  if (relative(root, path) === 'background.js') {
    data = Buffer.from(data.toString('utf8').replace("export const DEFAULT_LUME_URL = '';", `export const DEFAULT_LUME_URL = '${origin}';`));
  }
  const packed = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);

  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0);
  head.writeUInt16LE(20, 4); // version needed
  head.writeUInt16LE(0x0800, 6); // UTF-8 names
  head.writeUInt16LE(8, 8); // deflate
  head.writeUInt32LE(0x00210000, 10); // a fixed date (1 Jan 1980), so builds are reproducible
  head.writeUInt32LE(crc, 14);
  head.writeUInt32LE(packed.length, 18);
  head.writeUInt32LE(data.length, 22);
  head.writeUInt16LE(name.length, 26);
  local.push(head, name, packed);

  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);
  entry.writeUInt16LE(20, 6);
  entry.writeUInt16LE(0x0800, 8);
  entry.writeUInt16LE(8, 10);
  entry.writeUInt32LE(0x00210000, 12);
  entry.writeUInt32LE(crc, 16);
  entry.writeUInt32LE(packed.length, 20);
  entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(name.length, 28);
  entry.writeUInt32LE(offset, 42);
  central.push(entry, name);
  offset += head.length + name.length + packed.length;
}

const dir = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(dir.length, 12);
end.writeUInt32LE(offset, 16);

writeFileSync(out, Buffer.concat([...local, dir, end]));
console.log(`Wrote ${relative(process.cwd(), out)}: ${files.length} files, ${offset + dir.length + 22} bytes`);
