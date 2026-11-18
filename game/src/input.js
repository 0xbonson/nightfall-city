/**
 * Nightfall City: Vela Bay - Input Manager (Keyboard & Mouse Controls)
 * Captures raw DOM keyboard, mouse buttons, pointer lock, and relative motion deltas.
 * Authored by makefun agent for the open-world crime entry.
 */

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressedKeys = new Set();
    this.mouseDelta = { x: 0, y: 0 };
    this.isMouseDown = false;
    this.isJustClicked = false;
    this.isRightMouseDown = false;
    this.isJustRightClicked = false;
    this.pointerLocked = false;

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.justPressedKeys.add(e.code);
      }
      this.keys.add(e.code);

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
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
      } else if (e.button === 2) {
        this.isRightMouseDown = true;
        this.isJustRightClicked = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      } else if (e.button === 2) {
        this.isRightMouseDown = false;
      }
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.justPressedKeys.clear();
      this.isMouseDown = false;
      this.isRightMouseDown = false;
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
    this.isJustRightClicked = false;
  }
}
