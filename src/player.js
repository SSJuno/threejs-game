import * as THREE from 'three';

const MOVE_SPEED = 12;
const ACCEL = 80;
const DASH_SPEED = 28;
const DASH_DURATION = 0.18;
const GLIDE_DECAY = 0.3;
const DOUBLE_TAP_MS = 280;
const JUMP_FORCE = 10;
const GRAVITY = -28;
const PLAYER_H = 1.8;
const PLAYER_R = 0.35;
const TRAIL_FADE = 0.3;
const TRAIL_OPACITY = 0.4;
const WALL_JUMP_COOLDOWN = 0.3;
const WALL_SLIDE_SPEED = -4;

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.velocity = new THREE.Vector3();
    this.trails = [];
    this.trailGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    this.onGround = false;
    this.isTouchingWall = false;
    this.wallNormal = new THREE.Vector3();
    this.wallJumpCooldown = 0;
    this.jumpsLeft = 2;
    this.dashTimer = 0;
    this.glideTimer = 0;
    this.dashDir = new THREE.Vector3();
    this.keys = {};
    this.lastTap = { w: 0, a: 0, s: 0, d: 0 };

    this.mesh = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.0, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x4488cc })
    );
    body.position.y = -1.3;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.45),
      new THREE.MeshLambertMaterial({ color: 0x6699dd })
    );
    head.position.y = -0.5;
    head.castShadow = true;
    this.mesh.add(body, head);
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
        this.velocity.x = this.wallNormal.x * JUMP_FORCE;
        this.velocity.z = this.wallNormal.z * JUMP_FORCE;
        this.velocity.y = JUMP_FORCE;
        this.jumpsLeft = 1;
        this.wallJumpCooldown = WALL_JUMP_COOLDOWN;
        this.onGround = false;
      }
    }
  }

  startDash(dir) {
    if (this.dashTimer > 0) return;
    this.dashTimer = DASH_DURATION;
    this.glideTimer = 0;
    this.velocity.y = 3;
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

    const targetVx = input.x * MOVE_SPEED;
    const targetVz = input.z * MOVE_SPEED;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const worldDash = new THREE.Vector3()
        .addScaledVector(fwd, -this.dashDir.z)
        .addScaledVector(right, this.dashDir.x);
      worldDash.y = 0;
      worldDash.normalize();
      this.velocity.x = worldDash.x * DASH_SPEED;
      this.velocity.z = worldDash.z * DASH_SPEED;
      if (this.dashTimer <= 0) this.glideTimer = GLIDE_DECAY;
    } else if (this.glideTimer > 0) {
      this.glideTimer -= dt;
      const t = dt / GLIDE_DECAY;
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVx, t);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVz, t);
    } else {
      const t = 1 - Math.exp(-ACCEL * dt);
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVx, t);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVz, t);
    }

    this.velocity.y += GRAVITY * dt;
    this.mesh.position.x += this.velocity.x * dt;
    this.mesh.position.y += this.velocity.y * dt;
    this.mesh.position.z += this.velocity.z * dt;

    this.resolveCollision(colliders);

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizSpeed > 0.5) {
      this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    }

    if (this.mesh.position.y < -8 && this.velocity.y < -5) {
      this.mesh.position.set(0, 3, 0);
      this.velocity.set(0, 0, 0);
      this.jumpsLeft = 2;
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
          this.velocity.x = 0;
        } else {
          this.wallNormal.set(0, 0, pos.z >= c.z ? 1 : -1);
          pos.z += pos.z > c.z ? overlapZ : -overlapZ;
          this.velocity.z = 0;
        }
        wallContact = true;
      }
    }

    let bestY = -Infinity;
    for (const c of colliders) {
      const isFloor = c.hh < c.hw && c.hh < c.hd;
      if (!isFloor) continue;

      const dx = Math.abs(pos.x - c.x);
      const dz = Math.abs(pos.z - c.z);
      if (dx > c.hw + PLAYER_R || dz > c.hd + PLAYER_R) continue;

      const top = c.y + c.hh;
      if (this.velocity.y <= 0 && feet <= top + 0.3 && feet >= top - 0.3) {
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

    this.isTouchingWall = wallContact && !this.onGround;
    if (this.isTouchingWall) {
      this.velocity.y = Math.max(this.velocity.y, WALL_SLIDE_SPEED);
    }
  }
}
