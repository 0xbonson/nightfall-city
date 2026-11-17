// Particle effects and screen juice for Nightfall City

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 300;
  }

  emit(type, x, y, z, count = 1, options = {}) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      let p = {
        type,
        x, y, z,
        vx: (Math.random() - 0.5) * (options.speed || 3),
        vy: (Math.random() * 0.8 + 0.2) * (options.up || 3),
        vz: (Math.random() - 0.5) * (options.speed || 3),
        size: options.size || 0.35,
        life: 1.0,
        decay: options.decay || (0.8 + Math.random() * 0.8),
        color: options.color || [1, 1, 1, 1],
      };

      if (type === 'smoke') {
        p.vx = (Math.random() - 0.5) * 0.8;
        p.vy = Math.random() * 1.5 + 0.5;
        p.vz = (Math.random() - 0.5) * 0.8;
        p.size = options.size || (0.4 + Math.random() * 0.4);
        p.color = options.color || [0.85, 0.85, 0.9, 0.6];
        p.decay = 0.9;
      } else if (type === 'spark') {
        p.vx = (Math.random() - 0.5) * 8;
        p.vy = Math.random() * 6 + 1;
        p.vz = (Math.random() - 0.5) * 8;
        p.size = 0.15;
        p.color = [1.0, 0.85, 0.2, 1.0];
        p.decay = 3.5;
      } else if (type === 'blood') {
        p.vx = (Math.random() - 0.5) * 3;
        p.vy = Math.random() * 2 + 0.5;
        p.vz = (Math.random() - 0.5) * 3;
        p.size = 0.2;
        p.color = [0.8, 0.05, 0.05, 0.9];
        p.decay = 1.8;
      } else if (type === 'fire') {
        p.vx = (Math.random() - 0.5) * 2;
        p.vy = Math.random() * 4 + 2;
        p.vz = (Math.random() - 0.5) * 2;
        p.size = options.size || 0.8;
        p.color = [1.0, Math.random() * 0.6 + 0.2, 0.05, 0.9];
        p.decay = 1.6;
      } else if (type === 'splash') {
        p.vx = (Math.random() - 0.5) * 4;
        p.vy = Math.random() * 4 + 1;
        p.vz = (Math.random() - 0.5) * 4;
        p.size = 0.25;
        p.color = [0.5, 0.85, 1.0, 0.8];
        p.decay = 2.0;
      }

      this.particles.push(p);
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      if (p.type === 'smoke' || p.type === 'fire') {
        p.size += dt * 0.8;
        p.vy *= 0.96;
      } else {
        // Gravity
        p.vy -= 14 * dt;
        if (p.y < 0.05) {
          p.y = 0.05;
          p.vx *= 0.6;
          p.vz *= 0.6;
          p.vy = -p.vy * 0.3;
        }
      }
    }
  }
}

export class ScreenEffects {
  constructor() {
    this.trauma = 0;
    this.hitFlash = 0; // 0 to 1, red damage vignette
    this.whiteFlash = 0; // 0 to 1, explosive flash
    this.shakeX = 0;
    this.shakeY = 0;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  flashRed(amount = 0.6) {
    this.hitFlash = Math.max(this.hitFlash, amount);
  }

  flashWhite(amount = 0.8) {
    this.whiteFlash = Math.max(this.whiteFlash, amount);
  }

  update(dt) {
    if (this.trauma > 0) {
      const shakePower = this.trauma * this.trauma * 0.8;
      this.shakeX = (Math.random() * 2 - 1) * shakePower;
      this.shakeY = (Math.random() * 2 - 1) * shakePower;
      this.trauma = Math.max(0, this.trauma - dt * 1.5);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt * 2.2);
    }
    if (this.whiteFlash > 0) {
      this.whiteFlash = Math.max(0, this.whiteFlash - dt * 3.0);
    }
  }
}

export const particles = new ParticleSystem();
export const screenEffects = new ScreenEffects();
