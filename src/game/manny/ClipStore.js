// ClipStore – reads the compact clip set of the player figure (format LCA1, written by scripts/build-clips.mjs).
//
// The file holds several hundred clips for one skeleton: per clip one line in the header, the data as 16 bit rotations at a
// fixed frame rate, compressed with meshopt. Tracks that do not change within a clip cost one value, tracks at rest nothing.
// Nothing is decoded at load: clip(name) builds a THREE.AnimationClip when it is needed (a few tenths of a millisecond),
// so hundreds of clips cost neither memory nor load time until they are played.
//
// Every clip gets a track for EVERY bone of the set (rest pose where the clip stores nothing): a bone a clip does not move
// must not keep the pose of the clip played before.
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export class ClipStore {
  /** rest: Map bone name -> { q: Quaternion, p: Vector3 } of the figure the clips will play on (its rest pose) */
  static async load(url, rest, onProgress) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
    let buf;
    if (onProgress && res.body) {
      const total = +res.headers.get('content-length') || 0, rd = res.body.getReader(), chunks = []; let got = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); got += value.length; onProgress({ loaded: got, total }); }
      const all = new Uint8Array(got); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
      buf = all.buffer;
    } else buf = await res.arrayBuffer();
    await MeshoptDecoder.ready;
    return new ClipStore(buf, rest);
  }

  constructor(buf, rest) {
    const dv = new DataView(buf);
    if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'LCA1') throw new Error('kein LCA1-Bewegungssatz');
    const jl = dv.getUint32(4, true);
    this.head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, jl)));
    this.data = new Uint8Array(buf, 8 + jl);
    this.fps = this.head.fps; this.ts = this.head.ts || 50000;
    this.rb = this.head.rb; this.tb = this.head.tb;
    this.byName = new Map(this.head.clips.map((c) => [c.n, c]));
    this.names = this.head.clips.map((c) => c.n);
    // rest pose of the figure for the bones of the set (flat arrays in the order of rb / tb)
    const id = { q: new THREE.Quaternion(), p: new THREE.Vector3() };
    this.restR = new Float32Array(this.rb.length * 4); this.restT = new Float32Array(this.tb.length * 3);
    this.rb.forEach((n, i) => (rest.get(n) || id).q.toArray(this.restR, i * 4));
    this.tb.forEach((n, i) => (rest.get(n) || id).p.toArray(this.restT, i * 3));
    this._times = new Map();
  }

  has(name) { return this.byName.has(name); }
  frames(name) { const c = this.byName.get(name); return c ? c.f : 0; }
  duration(name) { const c = this.byName.get(name); return c ? (c.f - 1) / this.fps : 0; }

  _timesFor(f) {
    let t = this._times.get(f);
    if (!t) { t = new Float32Array(f); for (let i = 0; i < f; i++) t[i] = i / this.fps; this._times.set(f, t); }
    return t;
  }

  /** decoded tracks of a clip: { f, rot: Map bone -> Float32Array (f*4 or 4), tr: Map bone -> Float32Array (f*3 or 3) } */
  _decode(c, only) {
    const d = this.data, f = c.f;
    const nRa = (c.r.match(/a/g) || []).length, nTa = (c.t.match(/a/g) || []).length;
    let o = c.o, ra = null, ta = null;
    if (nRa) { const u = new Uint8Array(f * nRa * 8); MeshoptDecoder.decodeVertexBuffer(u, f * nRa, 8, d.subarray(o, o + c.lr)); ra = new Int16Array(u.buffer); o += c.lr; }
    if (nTa) { const u = new Uint8Array(f * nTa * 12); MeshoptDecoder.decodeVertexBuffer(u, f * nTa, 12, d.subarray(o, o + c.lt)); ta = new Int32Array(u.buffer); o += c.lt; }
    const dv = new DataView(d.buffer, d.byteOffset + o);
    const rot = new Map(), tr = new Map();
    let ia = 0, ic = 0;
    for (let i = 0; i < this.rb.length; i++) {
      const k = c.r[i], name = this.rb[i];
      const skip = only && !only.has(name);
      if (k === 'a') {
        if (!skip) {
          const out = new Float32Array(f * 4), base = ia * f * 4;
          for (let j = 0; j < f; j++) {
            const x = ra[base + j * 4], y = ra[base + j * 4 + 1], z = ra[base + j * 4 + 2], w = ra[base + j * 4 + 3], s = 1 / (Math.hypot(x, y, z, w) || 1);
            out[j * 4] = x * s; out[j * 4 + 1] = y * s; out[j * 4 + 2] = z * s; out[j * 4 + 3] = w * s;
          }
          rot.set(name, out);
        }
        ia++;
      } else if (k === 'c') {
        if (!skip) {
          const x = dv.getInt16(ic * 8, true), y = dv.getInt16(ic * 8 + 2, true), z = dv.getInt16(ic * 8 + 4, true), w = dv.getInt16(ic * 8 + 6, true), s = 1 / (Math.hypot(x, y, z, w) || 1);
          rot.set(name, new Float32Array([x * s, y * s, z * s, w * s]));
        }
        ic++;
      } else if (!skip) rot.set(name, this.restR.subarray(i * 4, i * 4 + 4));
    }
    const co = ic * 8; ia = 0; ic = 0;
    for (let i = 0; i < this.tb.length; i++) {
      const k = c.t[i], name = this.tb[i];
      const skip = only && !only.has(name);
      if (k === 'a') {
        if (!skip) { const out = new Float32Array(f * 3), base = ia * f * 3, s = 1 / this.ts; for (let j = 0; j < f * 3; j++) out[j] = ta[base + j] * s; tr.set(name, out); }
        ia++;
      } else if (k === 'c') {
        if (!skip) tr.set(name, new Float32Array([dv.getFloat32(co + ic * 12, true), dv.getFloat32(co + ic * 12 + 4, true), dv.getFloat32(co + ic * 12 + 8, true)]));
        ic++;
      } else if (!skip) tr.set(name, this.restT.subarray(i * 3, i * 3 + 3));
    }
    return { f, rot, tr };
  }

  /**
   * THREE.AnimationClip of a clip. opts.only: Set of bone names (analysis needs just the legs) · opts.skip: Set of bone names
   * to leave out (playing in place: 'root'). Fixed tracks get two keys (start and end) so that the clip keeps its length.
   */
  clip(name, opts = {}) {
    const c = this.byName.get(name); if (!c) return null;
    const { f, rot, tr } = this._decode(c, opts.only || null), dur = (f - 1) / this.fps;
    const times = this._timesFor(f), two = f > 1 ? new Float32Array([0, dur]) : new Float32Array([0]);
    const rep = (v) => (f > 1 ? Float32Array.of(...v, ...v) : v);
    const tracks = [];
    for (const [bone, v] of rot) { if (opts.skip && opts.skip.has(bone)) continue; tracks.push(new THREE.QuaternionKeyframeTrack(bone + '.quaternion', v.length > 4 ? times : two, v.length > 4 ? v : rep(v))); }
    for (const [bone, v] of tr) { if (opts.skip && opts.skip.has(bone)) continue; tracks.push(new THREE.VectorKeyframeTrack(bone + '.position', v.length > 3 ? times : two, v.length > 3 ? v : rep(v))); }
    return new THREE.AnimationClip(name, dur, tracks);
  }

  /** one pose of a clip (frame index): Map bone -> Quaternion, for the bones of the set */
  pose(name, frame = 0) {
    const c = this.byName.get(name); if (!c) return null;
    const { f, rot } = this._decode(c, null), i = Math.min(f - 1, Math.max(0, frame)), out = new Map();
    for (const [bone, v] of rot) out.set(bone, new THREE.Quaternion().fromArray(v, v.length > 4 ? i * 4 : 0));
    return out;
  }
}
