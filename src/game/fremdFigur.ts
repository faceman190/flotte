import * as THREE from 'three';
import { mannyBase, mountGun, newGun, weaponKind, type GunState, type MannyKind } from './mannyAvatar';
import { Figur, neuesSkelett, type Tracht } from './figur';
import { makeLyraGun, driveLyraGun, type LyraGun } from './lyraGuns';

// =====================================================================================
// Fremde Figuren auf dem UE5-Skelett (seit 2026-11-24): Mitspieler zu Fuß (Station, Mine, Planet) und die Wachen der Städte.
// Dieselben Figuren, Ausrüstungsteile und Bewegungen wie die eigene Spielerfigur (mannyAvatar.ts, figur.ts):
//  - Skelett: eine eigene Kopie je Figur (neuesSkelett), Körper und Teile hängt Figur daran (Netze und Bilder teilen sich alle Figuren).
//  - Bewegungen: ein eigener Animator je Figur, der Bewegungssatz und seine Analyse kommen vom Animator der eigenen Figur (spawn) –
//    nichts wird ein zweites Mal geladen oder ausgewertet. Solange der noch lädt, zeigt avatar.ts den alten Soldaten.
//  - Gesteuert nach dem Tempo (Mitspieler: aus den Netzpositionen geglättet), nicht nach einer Absicht wie die eigene Figur.
//  - Waffe: dieselben Haltungen (Lyra-Clips), eigene Kopien der Waffenmodelle.
// =====================================================================================

export interface FremdDrive {
  x: number; y: number; z: number; yaw: number; vx: number; vz: number; pitch?: number; crouch?: boolean; dead?: boolean;
  air?: boolean;                                     // im Sprung (Mitspieler: aus den Netzdaten)
  tracht: Tracht;
  ground?: ((x: number, z: number) => number | null) | null;
  // Waffe in der Hand (null = unbewaffnet): id = Modell (mineArt WDEFS), lyra = eine der Waffen aus dem Lyra-Paket, aim = im Anschlag,
  // shots / hits = Zähler (eine Änderung löst Rückstoß bzw. Zucken aus), reload = Fortschritt 0..1, sonst −1
  weapon?: { id: string; lyra?: MannyKind; aim: boolean; shots: number; hits: number; reload?: number } | null;
}

const gaitOf = (spd: number) => (spd < 3 ? 'walk' : spd < 5.9 ? 'run' : 'sprint');
const _mv = new THREE.Vector2();

export class FremdFigur {
  private anim: any = null;
  private fig: Figur | null = null;
  private loading = false;
  private gone = false;
  private gun: GunState = newGun();
  private guns: Partial<Record<MannyKind, LyraGun>> = {};
  private st = { first: true, lx: 0, lz: 0, lastY: 0, air: false };
  /** neue Netze an der Figur (Körper oder Teil gewechselt): z. B. für das Stadtlicht (city.ts probeLit) */
  onDress: ((root: THREE.Object3D) => void) | null = null;
  /** Skelett mit Körper und Teilen (null, solange es lädt) */
  get model(): THREE.Object3D | null { return this.anim?.model || null; }

  private start() {
    if (this.loading) return;
    const base = mannyBase(); if (!base) return;      // Bewegungssatz noch nicht da: im nächsten Bild wieder
    this.loading = true;
    neuesSkelett().then(sk => {
      if (this.gone || !sk) return;
      sk.traverse(o => { o.userData.sh = false; o.userData.shared = true; });
      this.anim = base.spawn(sk);
      this.fig = new Figur(sk);
      this.fig.onChange = () => { this.onDress?.(sk); };
    }).catch(e => { console.warn('Fremde Figur nicht geladen – es bleibt beim Soldaten:', e); });
  }

  /**
   * Figur im Halter zeigen und bewegen. holder: Gruppe der Figur (Position und Drehung body + π setzt avatar.ts), soldier: das Modell des
   * alten Soldaten darin (wird ausgeblendet). Gibt false zurück, solange die Figur nicht bereit ist – dann bleibt der Soldat.
   */
  drive(holder: THREE.Object3D, soldier: THREE.Object3D, dt: number, d: FremdDrive): boolean {
    const an = this.anim;
    if (!an || !this.fig) { this.start(); return false; }
    this.fig.setzen(d.tracht);
    if (!this.fig.bereit) { an.model.visible = false; return false; }
    const st = this.st, dtc = Math.min(dt, 0.1), spd = Math.hypot(d.vx, d.vz), face = d.yaw + Math.PI;
    const fresh = an.model.parent !== holder || st.first;
    if (fresh || Math.hypot(d.x - st.lx, d.z - st.lz) > Math.max(1.5, spd * dtc * 4)) { an.teleport(face); st.lastY = d.y; st.air = !!d.air; }
    if (an.model.parent !== holder) holder.add(an.model);
    soldier.visible = false; an.model.visible = true;
    const vy = fresh || dt <= 0 ? 0 : (d.y - st.lastY) / dt;
    st.lastY = d.y; st.lx = d.x; st.lz = d.z; st.first = false;
    // Sprung: der Absprung, sobald die Netzdaten „in der Luft“ melden (Höhe und Tempo nach oben kommen erst mit den nächsten Positionen)
    const air = !!d.air && !d.dead, jump = air && !st.air; st.air = air;
    if (spd > 0.3) _mv.set(d.vx / spd, d.vz / spd); else _mv.set(0, 0);
    const wp = d.dead ? null : d.weapon || null;
    if (wp) mountGun(an, this.gun, wp.id, wp.lyra, k => this.guns[k] || (this.guns[k] = makeLyraGun(k) || undefined) || null);
    const G = this.gun;
    G.shown = !!wp && !!G.g && (G.id === wp.id || G.id === 'lyra:' + wp.lyra);
    if (G.shown && G.lyra && wp) driveLyraGun(G.lyra, wp.shots, wp.reload ?? -1, dtc);
    const out = an.update(dtc, {
      moveDir: _mv, gait: gaitOf(spd), crouch: !!d.crouch, strafe: true, facing: face,
      jump, grounded: !air, verticalSpeed: jump ? Math.max(vy, 3) : Math.abs(vy) < 20 ? vy : 0, look: { pitch: d.pitch || 0 }, dead: !!d.dead,
      weapon: wp ? { kind: weaponKind(wp.id, wp.lyra), aim: wp.aim, shots: wp.shots, hits: wp.hits, reload: wp.reload ?? -1 } : null,
      stopDist: spd * 0.08,
    });
    // wie die eigene Figur (mannyAvatar.ts driveManny): Blickrichtung relativ zum Halter, Füße im Raum der Figur
    an.model.position.set(0, 0, 0);
    an.model.rotation.set(0, out.facing - holder.rotation.y, 0);
    const room = holder.parent;
    if (room) room.updateWorldMatrix(true, false);
    holder.updateMatrixWorld(true);
    an.finalize(dtc, { space: room ? room.matrixWorld : null, ground: d.ground || null, baseY: d.y });
    return true;
  }

  /** Mündung der Waffe (Weltkoordinaten) für Leuchtspur und Mündungsfeuer; false ohne sichtbare Waffe */
  muzzle(out: THREE.Vector3): boolean {
    if (!this.gun.shown || !this.gun.g || !this.anim?.weapon?.mount.visible) return false;
    this.gun.g.updateWorldMatrix(true, false);
    this.gun.g.localToWorld(out.copy(this.gun.muzzle));
    return true;
  }

  /** alles freigeben (Mitspieler weg, Stadt verlassen) */
  dispose() {
    this.gone = true;
    this.fig?.leeren(); this.fig = null;
    this.anim?.model.removeFromParent();
    this.anim?.mixer?.stopAllAction();
    this.anim = null;
    this.gun.g?.removeFromParent();
  }
}
