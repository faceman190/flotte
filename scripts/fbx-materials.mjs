// Liest aus einer binären FBX-Datei, welches Teil (Model) welches Material hat, samt Materialfarben.
// Nützlich, wenn eine GLB-Fassung desselben Modells die Materialien verloren hat (alles weiß):
// node scripts/fbx-materials.mjs <datei.fbx> <ausgabe.json>
// Ausgabe: { materials: { Name: { color:[r,g,b], emissive:[r,g,b], opacity } }, parts: { Teilname: Materialname } }
import fs from 'fs';
import zlib from 'zlib';

const [, , inp, out] = process.argv;
const b = fs.readFileSync(inp);
if (b.toString('latin1', 0, 18) !== 'Kaydara FBX Binary') throw new Error('keine binäre FBX-Datei');
const version = b.readUInt32LE(23), wide = version >= 7500;

// Knoten lesen (rekursiv): { name, props: [...], children: [...] }
function readNode(o) {
  const end = wide ? Number(b.readBigUInt64LE(o)) : b.readUInt32LE(o);
  const nProps = wide ? Number(b.readBigUInt64LE(o + 8)) : b.readUInt32LE(o + 4);
  const head = wide ? 25 : 13, nameLen = b[o + head - 1];
  if (end === 0) return { node: null, next: o + head };
  const name = b.toString('latin1', o + head, o + head + nameLen);
  let p = o + head + nameLen;
  const props = [];
  for (let i = 0; i < nProps; i++) {
    const t = String.fromCharCode(b[p]); p++;
    if (t === 'Y') { props.push(b.readInt16LE(p)); p += 2; }
    else if (t === 'C') { props.push(!!b[p]); p += 1; }
    else if (t === 'I') { props.push(b.readInt32LE(p)); p += 4; }
    else if (t === 'F') { props.push(b.readFloatLE(p)); p += 4; }
    else if (t === 'D') { props.push(b.readDoubleLE(p)); p += 8; }
    else if (t === 'L') { props.push(b.readBigInt64LE(p)); p += 8; }
    else if (t === 'S' || t === 'R') { const n = b.readUInt32LE(p); props.push(t === 'S' ? b.toString('utf8', p + 4, p + 4 + n) : null); p += 4 + n; }
    else if ('fdlib'.includes(t)) {   // Arrays: nur überspringen (Geometrie brauchen wir nicht)
      const len = b.readUInt32LE(p), enc = b.readUInt32LE(p + 4), clen = b.readUInt32LE(p + 8);
      props.push({ array: t, len, enc }); p += 12 + clen;
    } else throw new Error('unbekannter Typ ' + t + ' bei ' + p);
  }
  const children = [];
  while (p < end) { const r = readNode(p); if (!r.node) { p = r.next; break; } children.push(r.node); p = r.next; }
  return { node: { name, props, children }, next: end };
}
const top = [];
for (let p = 27; p < b.length - 160;) { const r = readNode(p); if (!r.node) break; top.push(r.node); p = r.next; }
const objects = top.find(n => n.name === 'Objects'), conns = top.find(n => n.name === 'Connections');
const clean = s => String(s || '').split('\u0000')[0];
const models = new Map(), mats = new Map(), materials = {};
for (const n of objects.children) {
  if (n.name === 'Model') models.set(n.props[0], clean(n.props[1]));
  if (n.name === 'Material') {
    const name = clean(n.props[1]); mats.set(n.props[0], name);
    const P = (n.children.find(c => c.name === 'Properties70')?.children || []).reduce((a, c) => (a[c.props[0]] = c.props.slice(4), a), {});
    materials[name] = { color: P.DiffuseColor || P.Diffuse || [1, 1, 1], emissive: P.EmissiveColor || [0, 0, 0], opacity: P.Opacity?.[0] ?? (P.TransparencyFactor ? 1 - P.TransparencyFactor[0] : 1), specular: P.SpecularColor || null, shininess: P.Shininess?.[0] ?? P.ShininessExponent?.[0] ?? null };
  }
}
const parts = {};
for (const c of conns.children) {
  if (c.props[0] !== 'OO') continue;
  const child = c.props[1], parent = c.props[2];
  if (mats.has(child) && models.has(parent)) parts[models.get(parent)] = mats.get(child);
}
const count = {};
for (const m of Object.values(parts)) count[m] = (count[m] || 0) + 1;
fs.writeFileSync(out, JSON.stringify({ materials, parts }, null, 1));
console.log(`FBX ${version} · ${models.size} Teile · ${mats.size} Materialien · Zuordnungen: ${Object.entries(count).map(([k, v]) => `${k} ${v}`).join(', ')}`);
