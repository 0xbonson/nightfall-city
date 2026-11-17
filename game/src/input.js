// Input handling for Nightfall City
// Keyboard, mouse look with Pointer Lock support, and weapon controls.

class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = {
      x: 0,
      y: 0,
      deltaX: 0,
      deltaY: 0,
      left: false,
      right: false,
      leftPressed: false,
      rightPressed: false,
      locked: false,
    };
    this.wheelDelta = 0;
    this.targetElement = null;
  }

  init(element) {
    this.targetElement = element;

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.targetElement) {
        this.mouse.deltaX += e.movementX;
        this.mouse.deltaY += e.movementY;
      }
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouse.left = true;
        this.mouse.leftPressed = true;
      } else if (e.button === 2) {
        this.mouse.right = true;
        this.mouse.rightPressed = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });

    window.addEventListener('wheel', (e) => {
      this.wheelDelta = Math.sign(e.deltaY);
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.mouse.locked = (document.pointerLockElement === this.targetElement);
    });
  }

  requestLock() {
    if (this.targetElement && document.pointerLockElement !== this.targetElement) {
      try {
        this.targetElement.requestPointerLock?.();
      } catch {
        // Pointer lock may fail if not inside a user action
      }
    }
  }

  unlock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  isDown(code) {
    return !!this.keys[code];
  }

  isAction(action) {
    switch (action) {
      case 'forward': return this.isDown('KeyW') || this.isDown('ArrowUp');
      case 'backward': return this.isDown('KeyS') || this.isDown('ArrowDown');
      case 'left': return this.isDown('KeyA') || this.isDown('ArrowLeft');
      case 'right': return this.isDown('KeyD') || this.isDown('ArrowRight');
      case 'sprint': return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
      case 'handbrake': return this.isDown('Space');
      case 'interact': return this.isDown('KeyF') || this.isDown('KeyE');
      case 'reload': return this.isDown('KeyR');
      case 'weapon1': return this.isDown('Digit1');
      case 'weapon2': return this.isDown('Digit2');
      case 'cycleWeapon': return this.isDown('KeyQ') || this.wheelDelta !== 0;
      case 'pause': return this.isDown('Escape') || this.isDown('KeyP');
      default: return false;
    }
  }

  consumeMouse() {
    const dx = this.mouse.deltaX;
    const dy = this.mouse.deltaY;
    const lp = this.mouse.leftPressed;
    const rp = this.mouse.rightPressed;
    const wd = this.wheelDelta;

    this.mouse.deltaX = 0;
    this.mouse.deltaY = 0;
    this.mouse.leftPressed = false;
    this.mouse.rightPressed = false;
    this.wheelDelta = 0;

    return { dx, dy, lp, rp, wd, left: this.mouse.left, right: this.mouse.right };
  }
}

export const input = new InputManager();
