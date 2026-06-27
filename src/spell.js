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

  // Updated to use the new bottom-left Q ability slot (clean minimal UI)
  initCooldownUI() {
    if (this.cdFill) return;

    // Use the shared Q slot created in main.js
    this.cdFill = document.getElementById('q-cd-fill');
    this.cdText = document.getElementById('q-cd-text');
    // We don't create old floating cooldown anymore for cleanliness
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
    if (this.cdFill) {
      const cdPct = this.cooldown > 0 ? (this.cooldown / COOLDOWN) * 100 : 0;
      this.cdFill.style.width = `${cdPct}%`;
    }
    if (this.cdText) {
      this.cdText.textContent = this.cooldown > 0 ? `${this.cooldown.toFixed(1)}s` : '';
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

    // Moved from E to Shift (as per controls change for new Lightning Strike on E)
    window.addEventListener('keydown', (e) => {
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) this.tryBlink();
    });
  }

  initCooldownUI() {
    if (this.cdFill) return;
    const container = document.querySelector('#app');
    const el = document.createElement('div');
    el.id = 'blink-cooldown';
    el.style.marginTop = '8px';
    el.innerHTML = `
      <div id="blink-cd-label">BLINK [Shift]</div>
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
        : 'BLINK [Shift]';
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

// ==============================================
// Ice Pillar ability (on E)
// - Hold E to aim: show ground targeting marker
// - Release E: Ice Pillar rises at the marked location
// - Pillar lingers for 1.3s
// - Slows enemy significantly if in the area during duration
// - Icy blue/white crystalline visual (reuses rising effect style)
// - Marker uses world colliders for correct ground placement on platforms/pillars etc.
// - Cooldown shown in bottom-right E UI slot
// ==============================================

const ICE_PILLAR_COOLDOWN = 5.0;
const ICE_PILLAR_RADIUS = 3.5;
const ICE_PILLAR_DURATION = 1.3; // seconds
const ICE_PILLAR_SLOW = 0.2; // multiplier (very slow)

export class IcePillar {
  constructor(scene, player, camera, dummy, worldColliders = [], camCtrl = null) {
    this.scene = scene;
    this.player = player;
    this.camera = camera;
    this.dummy = dummy;
    this.worldColliders = worldColliders; // for accurate ground height in marker
    this.camCtrl = camCtrl;

    this.cooldown = 0;
    this.isTargeting = false;  // true while holding E
    this.target = new THREE.Vector3(); // ground aim point

    this.marker = null;
    this.pillarMesh = null;
    this.pillarExpire = 0;

    this.cdFill = null;
    this.cdText = null;

    // Hold to target, release to cast
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && !e.repeat) {
        this.startTargeting();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyE') {
        this.releaseTargeting();
      }
    });
  }

  initCooldownUI() {
    if (this.cdFill) return;

    // Uses the bottom-right E slot created in main.js
    this.cdFill = document.getElementById('e-cd-fill');
    this.cdText = document.getElementById('e-cd-text');
  }

  startTargeting() {
    if (this.cooldown > 0 || this.isTargeting) return;
    this.isTargeting = true;
    this.createMarker();
  }

  releaseTargeting() {
    if (!this.isTargeting) return;
    this.castPillar();
  }

  update(dt) {
    this.initCooldownUI();

    this.cooldown = Math.max(0, this.cooldown - dt);

    if (this.isTargeting) {
      this.updateMarker();
    } else {
      this.removeMarkerIfNeeded();
    }

    // Manage active pillar: linger 1.3s, slow enemy if in area
    if (this.pillarMesh && Date.now() < this.pillarExpire) {
      const dPos = this.dummy.mesh.position;
      const dist = dPos.distanceTo(this.target); // target is ground pos
      if (dist < ICE_PILLAR_RADIUS) {
        this.dummy.applySlow(0.2, ICE_PILLAR_SLOW); // re-apply short bursts while inside
      }
    } else if (this.pillarMesh) {
      this.fadeAndRemovePillar();
    }

    // Update E slot UI
    if (this.cdFill) {
      if (this.isTargeting) {
        // While holding: full active visual
        this.cdFill.style.width = `100%`;
        this.cdFill.style.background = '#88ccff';
      } else {
        const cdPct = this.cooldown > 0 ? (this.cooldown / ICE_PILLAR_COOLDOWN) * 100 : 0;
        this.cdFill.style.width = `${cdPct}%`;
        this.cdFill.style.background = '#88ccff';
      }
    }
    if (this.cdText) {
      if (this.cooldown > 0 && !this.isTargeting) {
        this.cdText.textContent = `${this.cooldown.toFixed(1)}s`;
      } else {
        this.cdText.textContent = '';
      }
    }
  }

  createMarker() {
    if (this.marker) this.removeMarker();

    this.marker = new THREE.Group();

    // Icy blue glowing ground circle for targeting
    const outer = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 32),
      new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide
      })
    );
    outer.rotation.x = -Math.PI * 0.5;
    this.marker.add(outer);

    // Brighter ice core
    const inner = new THREE.Mesh(
      new THREE.CircleGeometry(1.3, 32),
      new THREE.MeshBasicMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      })
    );
    inner.rotation.x = -Math.PI * 0.5;
    inner.position.y = 0.01;
    this.marker.add(inner);

    // Crystalline cross pattern
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const bar1 = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.25), crossMat);
    bar1.rotation.x = -Math.PI * 0.5;
    bar1.position.y = 0.02;
    this.marker.add(bar1);

    const bar2 = bar1.clone();
    bar2.rotation.z = Math.PI / 2;
    this.marker.add(bar2);

    this.scene.add(this.marker);
  }

  updateMarker() {
    if (!this.marker) return;

    this.computeAimPoint();

    this.marker.position.x = this.target.x;
    this.marker.position.z = this.target.z;
    this.marker.position.y = this.target.y;

    // Subtle pulse while holding
    const pulse = 0.9 + Math.sin(Date.now() / 120) * 0.12;
    this.marker.scale.setScalar(pulse);
  }

  computeAimPoint() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const lowPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    let groundY = 0.05;

    if (raycaster.ray.intersectPlane(lowPlane, hit)) {
      // Find highest floor at this x,z for correct ground level (pillars, platforms etc.)
      if (this.worldColliders && this.worldColliders.length > 0) {
        let bestTop = 0.05;
        for (const c of this.worldColliders) {
          const isFloor = c.hh < c.hw && c.hh < c.hd;
          if (!isFloor) continue;
          const dx = Math.abs(hit.x - c.x);
          const dz = Math.abs(hit.z - c.z);
          if (dx <= c.hw + 0.1 && dz <= c.hd + 0.1) {
            const top = c.y + c.hh;
            if (top > bestTop) bestTop = top;
          }
        }
        groundY = bestTop;
      }

      // Re-ray at correct height for accurate placement on elevated terrain
      const accuratePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundY);
      const accurateHit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(accuratePlane, accurateHit)) {
        hit.copy(accurateHit);
      }

      // Range clamp
      const playerPos = this.player.mesh.position;
      const toHit = hit.clone().sub(playerPos);
      const dist = toHit.length();
      if (dist > 40) {
        toHit.normalize().multiplyScalar(40);
        hit.copy(playerPos).add(toHit);
      }

      this.target.set(hit.x, groundY + 0.05, hit.z);
    } else {
      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();
      this.target.copy(this.player.mesh.position).add(fwd.multiplyScalar(10));
      this.target.y = 0.05;
    }
  }

  castPillar() {
    this.cooldown = ICE_PILLAR_COOLDOWN;
    const pillarPos = this.target.clone();

    this.isTargeting = false;
    this.removeMarker();

    // Create rising Ice Pillar visual (icy blue/white, crystalline)
    this.createIcePillarVFX(pillarPos);

    // Apply slow if enemy caught at cast time (and ongoing check in update)
    const dPos = this.dummy.mesh.position;
    const dist = dPos.distanceTo(pillarPos);
    if (dist < ICE_PILLAR_RADIUS) {
      this.dummy.applySlow(ICE_PILLAR_DURATION, ICE_PILLAR_SLOW);
    }
  }

  createIcePillarVFX(pos) {
    // Remove any previous pillar
    if (this.pillarMesh) {
      this.scene.remove(this.pillarMesh);
      this.pillarMesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }

    const pillarGroup = new THREE.Group();

    // Main crystalline pillar (tall cylinder with facets for sharp look)
    const mainPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.3, 3.8, 6), // 6 sides for crystal feel
      new THREE.MeshPhongMaterial({
        color: 0x88aaff,
        emissive: 0x4477cc,
        shininess: 40,
        transparent: true,
        opacity: 0.9
      })
    );
    mainPillar.position.y = 1.9; // will rise from ground
    pillarGroup.add(mainPillar);

    // Sharp top spike
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.2, 6),
      new THREE.MeshPhongMaterial({
        color: 0xaaddff,
        emissive: 0x6699ee,
        shininess: 50,
        transparent: true,
        opacity: 0.95
      })
    );
    spike.position.y = 3.8;
    pillarGroup.add(spike);

    // Extra crystal shards around base for more detail
    for (let i = 0; i < 3; i++) {
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 1.5, 4),
        new THREE.MeshPhongMaterial({ color: 0x99ccff, emissive: 0x5588dd, shininess: 30, transparent: true, opacity: 0.7 })
      );
      const angle = (i * Math.PI * 2) / 3;
      shard.position.set(Math.cos(angle) * 1.1, 1.0, Math.sin(angle) * 1.1);
      shard.rotation.z = (Math.random() - 0.5) * 0.6;
      pillarGroup.add(shard);
    }

    pillarGroup.position.set(pos.x, 0.05, pos.z);
    pillarGroup.scale.y = 0.01; // start flat on ground

    this.scene.add(pillarGroup);
    this.pillarMesh = pillarGroup;
    this.pillarExpire = Date.now() + ICE_PILLAR_DURATION * 1000;

    // Quick rise animation
    const riseTime = 180; // ms
    const startTime = Date.now();
    const riseTick = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= riseTime || !this.pillarMesh) {
        if (this.pillarMesh) this.pillarMesh.scale.y = 1;
        return;
      }
      const t = elapsed / riseTime;
      this.pillarMesh.scale.y = t;
      requestAnimationFrame(riseTick);
    };
    riseTick();
  }

  fadeAndRemovePillar() {
    if (!this.pillarMesh) return;

    const pillar = this.pillarMesh;
    const fadeTime = 300;
    const startTime = Date.now();
    const materials = [];

    pillar.traverse((child) => {
      if (child.material) materials.push(child.material);
    });

    const fadeTick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / fadeTime);
      const opacity = 0.9 * (1 - t);

      materials.forEach(mat => {
        if (mat.opacity !== undefined) mat.opacity = opacity;
      });

      if (t >= 1) {
        this.scene.remove(pillar);
        pillar.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        this.pillarMesh = null;
        return;
      }
      requestAnimationFrame(fadeTick);
    };
    fadeTick();
  }

  removeMarker() {
    if (this.marker) {
      this.scene.remove(this.marker);
      this.marker.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.marker = null;
    }
  }

  removeMarkerIfNeeded() {
    if (this.marker && !this.isTargeting) {
      this.removeMarker();
    }
  }
}


