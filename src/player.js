import * as THREE from 'three';
import { createGradientMap } from './world.js';

const MOVE_SPEED = 13;
const ACCEL_GROUND = 95;
const ACCEL_AIR = 42;
const GROUND_FRICTION = 18;
const AIR_DRAG = 1.2;
const MAX_GROUND_SPEED = 15;
const MAX_AIR_SPEED = 22;
const DASH_SPEED = 30;
const DASH_DURATION = 0.16;
const DASH_COOLDOWN = 0.35;
const GLIDE_DECAY = 0.22;
const DOUBLE_TAP_MS = 260;
const JUMP_FORCE = 11;
const GRAVITY = -32;
const PLAYER_H = 1.8;
const PLAYER_R = 0.38;
const TRAIL_FADE = 0.28;
const TRAIL_OPACITY = 0.45;
const WALL_JUMP_COOLDOWN = 0.28;
const WALL_SLIDE_SPEED = -5;

export class Player {
  constructor(scene, camCtrl = null) {
    this.scene = scene;
    this.camCtrl = camCtrl;
    this.velocity = new THREE.Vector3();
    this.trails = [];
    this.trailGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    this.onGround = false;
    this.isTouchingWall = false;
    this.wallNormal = new THREE.Vector3();
    this.wallJumpCooldown = 0;
    this.jumpsLeft = 2;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.glideTimer = 0;
    this.dashDir = new THREE.Vector3();
    this.keys = {};
    this.lastTap = { w: 0, a: 0, s: 0, d: 0 };
    this.cloakColor = 0x2233aa;
    this.hatColor = 0x111122;

    // For abilities like Lightning Strike (hold E slows)
    this.slowFactor = 1;

    const gradientMap = createGradientMap();
    this.mesh = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.28, 0.85, 6),
      new THREE.MeshToonMaterial({ color: this.cloakColor, gradientMap })
    );
    body.position.y = -1.375;
    body.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.34, 0.32),
      new THREE.MeshToonMaterial({ color: 0xffcc99, gradientMap })
    );
    head.position.y = -0.55;
    head.castShadow = true;

    const eyeMat = new THREE.MeshToonMaterial({ color: 0x111111, gradientMap });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    eyeL.position.set(-0.08, -0.52, 0.15);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    eyeR.position.set(0.08, -0.52, 0.15);

    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.07, 10),
      new THREE.MeshToonMaterial({ color: this.hatColor, gradientMap })
    );
    brim.position.y = -0.36;
    brim.castShadow = true;

    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.6, 8),
      new THREE.MeshToonMaterial({ color: this.hatColor, gradientMap })
    );
    hat.position.y = -0.02;
    hat.castShadow = true;

    const cloakMat = new THREE.MeshToonMaterial({
      color: this.cloakColor,
      gradientMap,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    });

    const cloakGeo = new THREE.PlaneGeometry(0.4, 0.95, 1, 4);
    const cPos = cloakGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const y = cPos.getY(i);
      if (y < 0) {
        const t = (y + 0.475) / 0.475;
        cPos.setX(i, cPos.getX(i) * (0.35 + 0.65 * t));
      }
    }
    cloakGeo.computeVertexNormals();

    const cloakL = new THREE.Mesh(cloakGeo, cloakMat);
    cloakL.position.set(-0.3, -1.15, -0.06);
    cloakL.rotation.set(0.12, 0.35, 0);

    const cloakR = new THREE.Mesh(cloakGeo.clone(), cloakMat);
    cloakR.position.set(0.3, -1.15, -0.06);
    cloakR.rotation.set(0.12, -0.35, 0);

    this.mesh.add(body, head, eyeL, eyeR, brim, hat, cloakL, cloakR);
    this.mesh.position.set(0, 2, 0);
    scene.add(this.mesh);

    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
  }

  onKey(e, down) {
    const k = e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(k)) e.preventDefault();

    if (!down) {
      this.keys[k] = false;
      if (k === 'Space' && this.velocity.y > 4) {
        // Variable jump: cut upward velocity on release
        this.velocity.y *= 0.48;
      }
      return;
    }

    const map = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd' };
    const dir = map[k];
    if (dir && !this.keys[k]) {
      const now = performance.now();
      if (now - this.lastTap[dir] < DOUBLE_TAP_MS) this.startDash(dir);
      this.lastTap[dir] = now;
    }

    this.keys[k] = true;

    if (k === 'Space') {
      if (this.jumpsLeft > 0) {
        this.velocity.y = JUMP_FORCE;
        this.jumpsLeft--;
        this.onGround = false;
      } else if (this.isTouchingWall && this.wallJumpCooldown <= 0) {
        this.velocity.x = this.wallNormal.x * JUMP_FORCE * 0.9;
        this.velocity.z = this.wallNormal.z * JUMP_FORCE * 0.9;
        this.velocity.y = JUMP_FORCE;
        this.jumpsLeft = 1;
        this.wallJumpCooldown = WALL_JUMP_COOLDOWN;
        this.onGround = false;
      }
    }
  }

  startDash(dir) {
    if (this.dashTimer > 0 || this.dashCooldown > 0) return;
    this.dashTimer = DASH_DURATION;
    this.dashCooldown = DASH_COOLDOWN;
    this.glideTimer = 0;
    this.velocity.y = Math.max(this.velocity.y, 4); // slight vertical pop
    if (this.camCtrl) this.camCtrl.addShake(0.35);
    const dirs = {
      w: new THREE.Vector3(0, 0, -1),
      s: new THREE.Vector3(0, 0, 1),
      a: new THREE.Vector3(-1, 0, 0),
      d: new THREE.Vector3(1, 0, 0),
    };
    this.dashDir.copy(dirs[dir]);
  }

  update(dt, camera, colliders) {
    this.wallJumpCooldown = Math.max(0, this.wallJumpCooldown - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);

    if (this.isTouchingWall && !this.onGround) {
      this.velocity.y = Math.max(this.velocity.y, WALL_SLIDE_SPEED);
    }

    const fwd = camera.getForward();
    const right = camera.getRight();
    const input = new THREE.Vector3();
    if (this.keys.KeyW) input.add(fwd);
    if (this.keys.KeyS) input.add(fwd.clone().negate());
    if (this.keys.KeyA) input.add(right.clone().negate());
    if (this.keys.KeyD) input.add(right);
    if (input.lengthSq() > 0) input.normalize();

    const slow = this.slowFactor || 1;
    const targetVx = input.x * MOVE_SPEED * slow;
    const targetVz = input.z * MOVE_SPEED * slow;
    const onGround = this.onGround;
    const accel = onGround ? ACCEL_GROUND : ACCEL_AIR;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const worldDash = new THREE.Vector3()
        .addScaledVector(fwd, -this.dashDir.z)
        .addScaledVector(right, this.dashDir.x);
      worldDash.y = 0;
      if (worldDash.lengthSq() > 0.0001) worldDash.normalize();
      this.velocity.x = worldDash.x * DASH_SPEED;
      this.velocity.z = worldDash.z * DASH_SPEED;
      if (this.dashTimer <= 0) this.glideTimer = GLIDE_DECAY;
    } else if (this.glideTimer > 0) {
      this.glideTimer -= dt;
      const t = dt / GLIDE_DECAY;
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVx, t);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVz, t);
    } else if (onGround) {
      // Ground: strong accel + friction when no input
      const t = 1 - Math.exp(-accel * dt);
      if (input.lengthSq() > 0) {
        this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVx, t);
        this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVz, t);
      } else {
        const fric = 1 - Math.exp(-GROUND_FRICTION * dt);
        this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, fric);
        this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, fric);
      }
    } else {
      // Air control
      const t = 1 - Math.exp(-accel * dt);
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVx, t);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVz, t);
      // light air drag
      const dragT = 1 - Math.exp(-AIR_DRAG * dt);
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, this.velocity.x * 0.98, dragT);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, this.velocity.z * 0.98, dragT);
    }

    // Speed caps (after input/dash)
    let horiz = Math.hypot(this.velocity.x, this.velocity.z);
    const maxH = onGround ? MAX_GROUND_SPEED : MAX_AIR_SPEED;
    if (horiz > maxH) {
      const s = maxH / horiz;
      this.velocity.x *= s;
      this.velocity.z *= s;
    }

    this.velocity.y += GRAVITY * dt;

    // Apply movement
    this.mesh.position.x += this.velocity.x * dt;
    this.mesh.position.y += this.velocity.y * dt;
    this.mesh.position.z += this.velocity.z * dt;

    this.resolveCollision(colliders);

    // Face movement dir
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizSpeed > 0.6) {
      this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    }

    // Simple forward lean on fast move / dash
    const lean = THREE.MathUtils.clamp(horizSpeed * (this.dashTimer > 0 ? -0.018 : -0.008), -0.35, 0);
    this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, lean, 8 * dt);

    // Fall reset
    if (this.mesh.position.y < -8 && this.velocity.y < -5) {
      // Center of the expanded castle courtyard
      this.mesh.position.set(1, 3.5, 4);
      this.mesh.rotation.set(0, 0, 0);
      this.velocity.set(0, 0, 0);
      this.slowFactor = 1; // reset any ability slows
      this.jumpsLeft = 2;
      this.dashTimer = 0;
      this.dashCooldown = 0;
      this.glideTimer = 0;
    }

    if (this.dashTimer > 0) this.spawnTrail();
    this.updateTrails(dt);
  }

  spawnTrail() {
    const mat = new THREE.MeshLambertMaterial({
      color: 0x88bbff,
      transparent: true,
      opacity: TRAIL_OPACITY,
    });
    const mesh = new THREE.Mesh(this.trailGeo, mat);
    mesh.position.copy(this.mesh.position);
    this.scene.add(mesh);
    this.trails.push({ mesh, life: TRAIL_FADE });
  }

  updateTrails(dt) {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i];
      trail.life -= dt;
      trail.mesh.material.opacity = TRAIL_OPACITY * (trail.life / TRAIL_FADE);
      if (trail.life <= 0) {
        this.scene.remove(trail.mesh);
        trail.mesh.material.dispose();
        this.trails.splice(i, 1);
      }
    }
  }

  resolveCollision(colliders) {
    const pos = this.mesh.position;
    const feet = pos.y - PLAYER_H;
    const head = pos.y;
    let wallContact = false;

    // Floor resolution FIRST (lifts player onto platforms/pillars before wall checks).
    // This prevents low walls from pushing player off edges of standable surfaces.
    let bestY = -Infinity;
    for (const c of colliders) {
      const isFloor = c.hh < c.hw && c.hh < c.hd;
      if (!isFloor) continue;

      const dx = Math.abs(pos.x - c.x);
      const dz = Math.abs(pos.z - c.z);
      // Slight extra tolerance for edge standing / platforming feel (prevents easy push-off)
      const edgeTol = 0.15;
      if (dx > c.hw + PLAYER_R + edgeTol || dz > c.hd + PLAYER_R + edgeTol) continue;

      const top = c.y + c.hh;
      const snap = (this.dashTimer > 0 || Math.abs(this.velocity.y) < 6) ? 0.55 : 0.3;
      if (this.velocity.y <= 0 && feet <= top + snap && feet >= top - snap) {
        if (top > bestY) bestY = top;
      }
    }

    if (bestY > -Infinity) {
      pos.y = bestY + PLAYER_H;
      this.velocity.y = 0;
      this.onGround = true;
      this.jumpsLeft = 2;
    } else {
      this.onGround = false;
    }

    // Now walls (with updated feet y, so low walls under platforms are skipped)
    for (const c of colliders) {
      const isWall = c.hh > c.hw || c.hh > c.hd;
      if (!isWall) continue;

      const cBottom = c.y - c.hh;
      const cTop = c.y + c.hh;
      if (head <= cBottom || feet >= cTop - 0.05) continue;

      const overlapX = c.hw + PLAYER_R - Math.abs(pos.x - c.x);
      const overlapZ = c.hd + PLAYER_R - Math.abs(pos.z - c.z);
      if (overlapX > 0 && overlapZ > 0) {
        if (overlapX <= overlapZ) {
          this.wallNormal.set(pos.x >= c.x ? 1 : -1, 0, 0);
          pos.x += pos.x > c.x ? overlapX : -overlapX;
          if (this.dashTimer <= 0) this.velocity.x = 0;
        } else {
          this.wallNormal.set(0, 0, pos.z >= c.z ? 1 : -1);
          pos.z += pos.z > c.z ? overlapZ : -overlapZ;
          if (this.dashTimer <= 0) this.velocity.z = 0;
        }
        wallContact = true;
      }
    }

    this.isTouchingWall = wallContact && !this.onGround;
    if (this.isTouchingWall) {
      this.velocity.y = Math.max(this.velocity.y, WALL_SLIDE_SPEED);
    }
  }
}
