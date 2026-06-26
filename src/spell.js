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
  constructor(scene, player, camera, dummy, worldColliders = []) {
    this.scene = scene;
    this.player = player;
    this.camera = camera;
    this.dummy = dummy;
    this.worldColliders = worldColliders;
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
