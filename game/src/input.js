/**
 * Nightfall City: Vela Bay - Input Manager (Keyboard & Mouse)
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressedKeys = new Set();
    this.mouseDelta = { x: 0, y: 0 };
    this.isMouseDown = false;
    this.isJustClicked = false;
    this.pointerLocked = false;

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.justPressedKeys.add(e.code);
      }
      this.keys.add(e.code);

      // Prevent scrolling on arrows/space
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas) {
        this.mouseDelta.x += e.movementX || 0;
        this.mouseDelta.y += e.movementY || 0;
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
        this.isJustClicked = true;

        if (document.pointerLockElement !== this.canvas && this.canvas.requestPointerLock) {
          this.canvas.requestPointerLock();
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.justPressedKeys.clear();
      this.isMouseDown = false;
    });
  }

  isDown(code) {
    return this.keys.has(code);
  }

  isJustPressed(code) {
    return this.justPressedKeys.has(code);
  }

  endFrame() {
    this.justPressedKeys.clear();
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    this.isJustClicked = false;
  }
}
