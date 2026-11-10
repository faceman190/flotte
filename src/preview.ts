// Nur für die Entwicklung: zeigt alle Modelle aus models/ nebeneinander (Draufsicht + Seitenansicht)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const NAMES = ['Bob', 'Challenger', 'Dispatcher', 'Executioner', 'Imperial', 'Insurgent', 'Omen', 'Pancake', 'Spitfire', 'Striker', 'Zenith'];
const W = 1400, H = 760;
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c') as HTMLCanvasElement, antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H);
r.setScissorTest(true);
const loader = new GLTFLoader();
const scenes: { s: THREE.Scene; name: string }[] = [];
const cam = new THREE.OrthographicCamera(-7, 7, 4, -4, 0.1, 100);
const ui = document.createElement('div');
ui.style.cssText = 'position:fixed;inset:0;pointer-events:none';
document.body.appendChild(ui);

Promise.all(NAMES.map(n => loader.loadAsync(`./models/${n}/glTF/${n}.gltf`).then(g => ({ n, g })))).then(list => {
  for (const { n, g } of list) {
    const s = new THREE.Scene();
    s.background = new THREE.Color(0x1a1c22);
    s.add(new THREE.AmbientLight(0xffffff, 1.2));
    const d = new THREE.DirectionalLight(0xffffff, 2.5); d.position.set(3, 5, 4); s.add(d);
    s.add(g.scene);
    // Achsen: rot = +X, grün = +Y, blau = +Z
    s.add(new THREE.AxesHelper(6));
    scenes.push({ s, name: n });
  }
  const cols = 6, cw = W / cols, ch = H / 4;
  scenes.forEach((o, i) => {
    const col = i % cols, row = Math.floor(i / cols) * 2;
    for (const [k, pos] of [[0, [0, 20, 0.001]], [1, [20, 0, 0]]] as const) {
      const x = col * cw, y = H - (row + k + 1) * ch;
      r.setViewport(x, y, cw, ch); r.setScissor(x, y, cw, ch);
      cam.position.set(pos[0], pos[1], pos[2]); cam.up.set(0, k === 0 ? 0 : 1, k === 0 ? -1 : 0); cam.lookAt(0, 0, 0);
      cam.left = -7; cam.right = 7; cam.top = 7 * ch / cw; cam.bottom = -7 * ch / cw; cam.updateProjectionMatrix();
      r.render(o.s, cam);
    }
    const lab = document.createElement('div');
    lab.textContent = `${i + 1}. ${o.name}`;
    lab.style.cssText = `position:absolute;left:${col * cw + 6}px;top:${row * ch + 4}px;color:#ffb347`;
    ui.appendChild(lab);
  });
  (window as any).__done = true;
});
