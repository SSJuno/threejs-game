import * as THREE from 'three';

const MOVE_SPEED = 12;
const ACCEL = 40;
const DASH_SPEED = 28;
const DASH_DURATION = 0.18;
const DOUBLE_TAP_MS = 280;
const JUMP_FORCE = 10;
const GRAVITY = -28;
const PLAYER_H = 1.8;
const PLAYER_R = 0.35;

export class Player {
  constructor(scene) {
    this.velocity = new THREE.Vector3();
    this.onGround = false;
    this.jumpsLeft = 2;
    this.dashTimer = 0;
    this.dashDir = new THREE.Vector3();
    this.keys = {};
    this.lastTap = { w: 0, a: 0, s: 0, d: 0 };

    this.mesh = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.0, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x4488cc })
    );
    body.position.y = 0.9;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.45),
      new THREE.MeshLambertMaterial({ color: 0x6699dd })
    );
    head.position.y = 1.7;
    head.castShadow = true;
    this.mesh.add(body, head);
    this.mesh.position.set(0, PLAYER_H + 0.25, 0);
    scene.add(this.mesh);

    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
  }

  onKey(e, down) {
    const k = e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(k)) e.preventDefault();
    this.keys[k] = down;

    if (!down) return;

    const map = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd' };
    const dir = map[k];
    if (dir) {
      const now = performance.now();
      if (now - this.lastTap[dir] < DOUBLE_TAP_MS) this.startDash(dir);
      this.lastTap[dir] = now;
    }

    if (k === 'Space' && this.jumpsLeft > 0) {
      this.velocity.y = JUMP_FORCE;
      this.jumpsLeft--;
      this.onGround = false;
    }
  }

  startDash(dir) {
    if (this.dashTimer > 0) return;
    this.dashTimer = DASH_DURATION;
    const dirs = {
      w: new THREE.Vector3(0, 0, -1),
      s: new THREE.Vector3(0, 0, 1),
      a: new THREE.Vector3(-1, 0, 0),
      d: new THREE.Vector3(1, 0, 0),
    };
    this.dashDir.copy(dirs[dir]);
  }

  update(dt, camera, colliders) {
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const fwd = camera.getForward();
      const right = camera.getRight();
      const worldDash = new THREE.Vector3()
        .addScaledVector(fwd, -this.dashDir.z)
        .addScaledVector(right, this.dashDir.x);
      worldDash.y = 0;
      worldDash.normalize();
      this.velocity.x = worldDash.x * DASH_SPEED;
      this.velocity.z = worldDash.z * DASH_SPEED;
    } else {
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
  }

  resolveCollision(colliders) {
    const pos = this.mesh.position;
    let bestY = -Infinity;

    for (const c of colliders) {
      const dx = Math.abs(pos.x - c.x);
      const dz = Math.abs(pos.z - c.z);
      if (dx > c.hw + PLAYER_R || dz > c.hd + PLAYER_R) continue;

      const top = c.y + c.hh;
      const feet = pos.y - PLAYER_H;
      const prevFeet = feet - this.velocity.y * 0.016;

      if (feet <= top + 0.05 && prevFeet >= top - 0.3 && this.velocity.y <= 0) {
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
  }
}
