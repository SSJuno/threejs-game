import * as THREE from 'three';

const SPEED = 18;
const MAX_RANGE = 80;
const IMPACT_DIST = 3.5;
const COOLDOWN = 1.5;
const DAMAGE = 35;
const KNOCKUP = 12;
const BURN_DURATION = 3;
const BURN_DPS = 2;
const BURN_RADIUS = 4;
const EXPLOSION_DURATION = 0.4;
const EXPLOSION_MAX = 3.0;

export class Fireball {
  constructor(scene, player, camera, dummy, worldColliders = [], camCtrl = null) {
    this.scene = scene;
    this.player = player;
    this.camera = camera;
    this.dummy = dummy;
    this.worldColliders = worldColliders;
    this.camCtrl = camCtrl;
    this.cooldown = 0;
    this.projectile = null;
    this.explosions = [];
    this.burnPatches = [];
    this._dir = new THREE.Vector3();
    this.cdFill = null;
    this.cdLabel = null;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyQ' && !e.repeat) this.tryCast();
    });
  }

  initCooldownUI() {
    if (this.cdFill) return;

    const container = document.querySelector('#app');
    const cooldownEl = document.createElement('div');
    cooldownEl.id = 'fireball-cooldown';
    cooldownEl.innerHTML = `
      <div id="fireball-cd-label">FIREBALL [Q]</div>
      <div id="fireball-cd-track"><div id="fireball-cd-fill"></div></div>
    `;
    if (container) container.appendChild(cooldownEl);

    this.cdFill = document.getElementById('fireball-cd-fill');
    this.cdLabel = document.getElementById('fireball-cd-label');
  }

  tryCast() {
    if (this.cooldown > 0 || this.projectile) return;
    this.cooldown = COOLDOWN;

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xff4400,
        emissive: 0xff2200,
        emissiveIntensity: 1.5,
      })
    );
    const light = new THREE.PointLight(0xff6600, 2, 6);
    mesh.add(light);

    const origin = this.player.mesh.position.clone();
    origin.y -= 1.0;
    this.camera.getWorldDirection(this._dir);
    this._dir.normalize();

    mesh.position.copy(origin);
    this.scene.add(mesh);

    this.projectile = {
      mesh,
      dir: this._dir.clone(),
      traveled: 0,
    };
  }

  update(dt) {
    this.initCooldownUI();

    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cdFill && this.cdLabel) {
      const cdPct = this.cooldown > 0 ? (this.cooldown / COOLDOWN) * 100 : 0;
      this.cdFill.style.width = `${cdPct}%`;
      this.cdLabel.textContent = this.cooldown > 0
        ? `FIREBALL ${this.cooldown.toFixed(1)}s`
        : 'FIREBALL [Q]';
    }

    if (this.projectile) {
      this.updateProjectile(dt);
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.life -= dt;
      const t = 1 - ex.life / EXPLOSION_DURATION;
      const scale = THREE.MathUtils.lerp(0.1, EXPLOSION_MAX, t);
      ex.mesh.scale.setScalar(scale);
      ex.mesh.material.opacity = 1 - t;
      if (ex.life <= 0) {
        this.scene.remove(ex.mesh);
        ex.mesh.geometry.dispose();
        ex.mesh.material.dispose();
        this.explosions.splice(i, 1);
      }
    }

    for (let i = this.burnPatches.length - 1; i >= 0; i--) {
      const patch = this.burnPatches[i];
      patch.life -= dt;
      if (patch.life <= 0) {
        this.scene.remove(patch.mesh);
        patch.mesh.geometry.dispose();
        patch.mesh.material.dispose();
        this.burnPatches.splice(i, 1);
        continue;
      }

      const dPos = this.dummy.mesh.position;
      const dx = dPos.x - patch.x;
      const dz = dPos.z - patch.z;
      if (dx * dx + dz * dz < BURN_RADIUS * BURN_RADIUS) {
        this.dummy.takeDamage(BURN_DPS * dt);
      }
    }
  }

  updateProjectile(dt) {
    const fb = this.projectile;
    const step = SPEED * dt;
    fb.mesh.position.addScaledVector(fb.dir, step);
    fb.traveled += step;

    // World collision
    if (this.checkWorldHit(fb.mesh.position)) {
      this.spawnExplosion(fb.mesh.position.clone());
      if (this.camCtrl) this.camCtrl.addShake(0.4);
      this.removeProjectile();
      return;
    }

    const dPos = this.dummy.mesh.position;
    if (fb.mesh.position.distanceTo(dPos) < IMPACT_DIST) {
      this.onImpact(fb.mesh.position.clone());
      return;
    }

    if (fb.traveled >= MAX_RANGE) {
      this.removeProjectile();
    }
  }

  checkWorldHit(pos) {
    const r = 0.45;
    for (const c of this.worldColliders) {
      const dx = Math.abs(pos.x - c.x);
      const dz = Math.abs(pos.z - c.z);
      const dy = Math.abs(pos.y - c.y);
      if (dx < c.hw + r && dz < c.hd + r && dy < c.hh + r) {
        return true;
      }
    }
    return false;
  }

  onImpact(point) {
    this.dummy.takeDamage(DAMAGE);
    this.dummy.knockup(KNOCKUP);
    this.spawnExplosion(point);
    this.spawnBurnPatch(point);
    if (this.camCtrl) this.camCtrl.addShake(0.7);
    this.removeProjectile();
  }

  spawnExplosion(point) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xff4400,
        emissive: 0xff1100,
        emissiveIntensity: 2,
        transparent: true,
        opacity: 0.85,
      })
    );
    mesh.position.copy(point);
    mesh.scale.setScalar(0.1);
    this.scene.add(mesh);
    this.explosions.push({ mesh, life: EXPLOSION_DURATION });
  }

  spawnBurnPatch(point) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(BURN_RADIUS, BURN_RADIUS, 0.06, 16),
      new THREE.MeshLambertMaterial({ color: 0x993300 })
    );
    mesh.position.set(point.x, 0.28, point.z);
    this.scene.add(mesh);
    this.burnPatches.push({ mesh, life: BURN_DURATION, x: point.x, z: point.z });
  }

  removeProjectile() {
    if (!this.projectile) return;
    this.scene.remove(this.projectile.mesh);
    this.projectile.mesh.geometry.dispose();
    this.projectile.mesh.material.dispose();
    this.projectile = null;
  }
}

const BLINK_RANGE = 11;
const BLINK_COOLDOWN = 1.9;
const BLINK_CD_UI = 1.9;

export class Blink {
  constructor(scene, player, camera, camCtrl = null) {
    this.scene = scene;
    this.player = player;
    this.camera = camera;
    this.camCtrl = camCtrl;
    this.cooldown = 0;
    this.cdFill = null;
    this.cdLabel = null;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && !e.repeat) this.tryBlink();
    });
  }

  initCooldownUI() {
    if (this.cdFill) return;
    const container = document.querySelector('#app');
    const el = document.createElement('div');
    el.id = 'blink-cooldown';
    el.style.marginTop = '8px';
    el.innerHTML = `
      <div id="blink-cd-label">BLINK [E]</div>
      <div id="blink-cd-track"><div id="blink-cd-fill"></div></div>
    `;
    if (container) container.appendChild(el);

    this.cdFill = document.getElementById('blink-cd-fill');
    this.cdLabel = document.getElementById('blink-cd-label');
  }

  tryBlink() {
    if (this.cooldown > 0) return;
    this.cooldown = BLINK_COOLDOWN;

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 0.01) dir.set(0,0,-1);
    dir.normalize();

    const origin = this.player.mesh.position.clone();
    const target = origin.clone().addScaledVector(dir, BLINK_RANGE);

    // Simple height preserve + slight lift
    target.y = Math.max(target.y, origin.y + 0.2);

    // Spawn poof at start
    this.spawnPoof(origin);

    // Move
    this.player.mesh.position.copy(target);
    // Clear some velocity to feel snappy
    this.player.velocity.x *= 0.2;
    this.player.velocity.z *= 0.2;
    this.player.velocity.y = Math.max(this.player.velocity.y, 3);

    this.spawnPoof(target);

    if (this.camCtrl) this.camCtrl.addShake(0.25);
  }

  update(dt) {
    this.initCooldownUI();
    this.cooldown = Math.max(0, this.cooldown - dt);

    if (this.cdFill && this.cdLabel) {
      const pct = this.cooldown > 0 ? (this.cooldown / BLINK_CD_UI) * 100 : 0;
      this.cdFill.style.width = `${pct}%`;
      this.cdLabel.textContent = this.cooldown > 0
        ? `BLINK ${this.cooldown.toFixed(1)}s`
        : 'BLINK [E]';
    }
  }

  spawnPoof(pos) {
    const geo = new THREE.SphereGeometry(0.7, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    // quick expand + fade
    const life = 0.22;
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000 / life;
      if (t >= 1) {
        this.scene.remove(mesh);
        geo.dispose();
        mat.dispose();
        return;
      }
      const s = 0.4 + t * 2.2;
      mesh.scale.setScalar(s);
      mat.opacity = 0.65 * (1 - t);
      requestAnimationFrame(tick);
    };
    tick();
  }
}

const NOVA_COOLDOWN = 3.2;
const NOVA_RADIUS = 7;
const NOVA_DAMAGE = 28;
const NOVA_KNOCK = 9;

export class Nova {
  constructor(scene, player, dummy, camCtrl = null) {
    this.scene = scene;
    this.player = player;
    this.dummy = dummy;
    this.camCtrl = camCtrl;
    this.cooldown = 0;
    this.cdFill = null;
    this.cdLabel = null;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && !e.repeat) this.tryCast();
    });
  }

  initCooldownUI() {
    if (this.cdFill) return;
    const container = document.querySelector('#app');
    const el = document.createElement('div');
    el.id = 'nova-cooldown';
    el.style.marginTop = '8px';
    el.innerHTML = `
      <div id="nova-cd-label">NOVA [R]</div>
      <div id="nova-cd-track"><div id="nova-cd-fill"></div></div>
    `;
    if (container) container.appendChild(el);

    this.cdFill = document.getElementById('nova-cd-fill');
    this.cdLabel = document.getElementById('nova-cd-label');
  }

  tryCast() {
    if (this.cooldown > 0) return;
    this.cooldown = NOVA_COOLDOWN;

    const pos = this.player.mesh.position.clone();
    pos.y = 0.6;

    // Expanding ring VFX
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.25, 32),
      new THREE.MeshLambertMaterial({ color: 0x66ddff, transparent: true, opacity: 0.7 })
    );
    ring.position.copy(pos);
    this.scene.add(ring);

    const start = performance.now();
    const dur = 0.55;
    const ticker = () => {
      const t = (performance.now() - start) / 1000 / dur;
      if (t >= 1) {
        this.scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
        return;
      }
      const r = NOVA_RADIUS * t;
      ring.scale.set(r / 0.6, 1, r / 0.6);
      ring.material.opacity = 0.75 * (1 - t * 0.9);
      requestAnimationFrame(ticker);
    };
    ticker();

    // Hit dummy?
    const dPos = this.dummy.mesh.position;
    const dist = Math.hypot(dPos.x - pos.x, dPos.z - pos.z);
    if (dist < NOVA_RADIUS + 1.2) {
      this.dummy.takeDamage(NOVA_DAMAGE);
      this.dummy.knockup(NOVA_KNOCK);
      if (this.camCtrl) this.camCtrl.addShake(1.1);
    } else if (this.camCtrl) {
      this.camCtrl.addShake(0.5);
    }
  }

  update(dt) {
    this.initCooldownUI();
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cdFill && this.cdLabel) {
      const pct = this.cooldown > 0 ? (this.cooldown / NOVA_COOLDOWN) * 100 : 0;
      this.cdFill.style.width = `${pct}%`;
      this.cdLabel.textContent = this.cooldown > 0 ? `NOVA ${this.cooldown.toFixed(1)}s` : 'NOVA [R]';
    }
  }
}


