// High-Performance Pure WebGL 3D Renderer for Nightfall City (Vela Bay)
// Zero external libraries, custom shaders, procedural 3D meshes, dynamic lighting and particles.

export class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: true }) ||
              canvas.getContext('experimental-webgl', { antialias: true, alpha: false, depth: true });

    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }

    this.program = null;
    this.uniforms = {};
    this.attribs = {};
    this.staticVbo = null;
    this.staticVertexCount = 0;
    this.dynamicVbo = null;

    // Buffer for dynamic geometry (vehicles, characters, particles, helicopter)
    this.maxDynamicVerts = 65536;
    this.dynamicBuffer = new Float32Array(this.maxDynamicVerts * 10); // pos(3), norm(3), col(4)
    this.dynamicVertCount = 0;

    this.sunDir = [0.45, 0.75, 0.48]; // Sun vector
    this.sunColor = [1.0, 0.88, 0.72]; // Warm coastal sunset sunlight
    this.skyColor = [0.32, 0.48, 0.72]; // Atmospheric sky
    this.fogColor = [0.65, 0.52, 0.62]; // Twilight purple-peach horizon

    this.initShaders();
    this.initBuffers();
  }

  initShaders() {
    const gl = this.gl;

    const vsSource = `
      attribute vec3 a_position;
      attribute vec3 a_normal;
      attribute vec4 a_color;

      uniform mat4 u_viewProj;
      uniform mat4 u_model;

      varying vec3 v_normal;
      varying vec4 v_color;
      varying vec3 v_worldPos;

      void main() {
        vec4 worldPos = u_model * vec4(a_position, 1.0);
        v_worldPos = worldPos.xyz;
        v_normal = mat3(u_model) * a_normal;
        v_color = a_color;
        gl_Position = u_viewProj * worldPos;
      }
    `;

    const fsSource = `
      precision mediump float;

      varying vec3 v_normal;
      varying vec4 v_color;
      varying vec3 v_worldPos;

      uniform vec3 u_sunDir;
      uniform vec3 u_sunColor;
      uniform vec3 u_skyColor;
      uniform vec3 u_fogColor;
      uniform vec3 u_camPos;
      uniform vec3 u_sirenLight; // Flashing red/blue police light

      void main() {
        vec3 norm = normalize(v_normal);
        float diff = max(dot(norm, normalize(u_sunDir)), 0.0);
        vec3 ambient = u_skyColor * 0.42 + vec3(0.12, 0.10, 0.08);

        // Diffuse + Ambient
        vec3 diffuse = u_sunColor * diff * 0.85;

        // Specular highlight
        vec3 viewDir = normalize(u_camPos - v_worldPos);
        vec3 halfDir = normalize(normalize(u_sunDir) + viewDir);
        float spec = pow(max(dot(norm, halfDir), 0.0), 16.0) * 0.28;

        // Base lighting
        vec3 lightedColor = v_color.rgb * (ambient + diffuse) + vec3(spec);

        // Police Siren Light bounce
        float sirenDist = length(v_worldPos - u_camPos);
        if (sirenDist < 60.0) {
          float sFactor = (1.0 - sirenDist / 60.0) * 0.35;
          lightedColor += u_sirenLight * sFactor;
        }

        // Distance Fog
        float dist = length(v_worldPos - u_camPos);
        float fogFactor = clamp((dist - 70.0) / 380.0, 0.0, 1.0);
        vec3 finalColor = mix(lightedColor, u_fogColor, fogFactor);

        gl_FragColor = vec4(finalColor, v_color.a);
      }
    `;

    const compileShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(s));
      }
      return s;
    };

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
    }
    this.program = prog;

    this.attribs = {
      position: gl.getAttribLocation(prog, 'a_position'),
      normal: gl.getAttribLocation(prog, 'a_normal'),
      color: gl.getAttribLocation(prog, 'a_color'),
    };

    this.uniforms = {
      viewProj: gl.getUniformLocation(prog, 'u_viewProj'),
      model: gl.getUniformLocation(prog, 'u_model'),
      sunDir: gl.getUniformLocation(prog, 'u_sunDir'),
      sunColor: gl.getUniformLocation(prog, 'u_sunColor'),
      skyColor: gl.getUniformLocation(prog, 'u_skyColor'),
      fogColor: gl.getUniformLocation(prog, 'u_fogColor'),
      camPos: gl.getUniformLocation(prog, 'u_camPos'),
      sirenLight: gl.getUniformLocation(prog, 'u_sirenLight'),
    };
  }

  initBuffers() {
    const gl = this.gl;
    this.staticVbo = gl.createBuffer();
    this.dynamicVbo = gl.createBuffer();
  }

  // Pre-bake world buildings, roads, ground, ocean into static VBO
  buildStaticMesh(world) {
    const verts = [];

    // Helper to push a quad (2 triangles)
    const pushQuad = (p1, p2, p3, p4, norm, col) => {
      // Triangle 1
      verts.push(p1[0], p1[1], p1[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], col[3] ?? 1);
      verts.push(p2[0], p2[1], p2[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], col[3] ?? 1);
      verts.push(p3[0], p3[1], p3[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], col[3] ?? 1);
      // Triangle 2
      verts.push(p1[0], p1[1], p1[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], col[3] ?? 1);
      verts.push(p3[0], p3[1], p3[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], col[3] ?? 1);
      verts.push(p4[0], p4[1], p4[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], col[3] ?? 1);
    };

    // Helper to push a 3D box
    const pushBox = (x, y, z, w, h, d, col, roofCol = null) => {
      const x0 = x - w / 2, x1 = x + w / 2;
      const y0 = y, y1 = y + h;
      const z0 = z - d / 2, z1 = z + d / 2;
      const topCol = roofCol || col;

      // Top
      pushQuad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], topCol);
      // Front (Z+)
      pushQuad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col);
      // Back (Z-)
      pushQuad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col);
      // Left (X-)
      pushQuad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col);
      // Right (X+)
      pushQuad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col);
    };

    // 1. Base Ground / Sidewalks
    const groundCol = [0.65, 0.65, 0.68, 1];
    pushQuad([-280, 0, -280], [-280, 0, 280], [280, 0, 280], [280, 0, -280], [0, 1, 0], groundCol);

    // 2. Ocean Water Surface (Turquoise coastal water)
    const oceanCol = [0.12, 0.48, 0.75, 1];
    pushQuad([-290, -0.2, 225], [-290, -0.2, 380], [290, -0.2, 380], [290, -0.2, 225], [0, 1, 0], oceanCol);
    pushQuad([-380, -0.2, -290], [-380, -0.2, 380], [-225, -0.2, 380], [-225, -0.2, -290], [0, 1, 0], oceanCol);

    // Sandy Beach
    const sandCol = [0.92, 0.85, 0.64, 1];
    pushQuad([-240, 0.05, 190], [-240, 0.05, 235], [50, 0.05, 235], [50, 0.05, 190], [0, 1, 0], sandCol);

    // 3. Asphalt Roads & Centerlines
    const asphaltCol = [0.18, 0.20, 0.22, 1];
    const stripeCol = [0.95, 0.82, 0.20, 1];
    const whiteLineCol = [0.92, 0.92, 0.95, 1];

    for (const r of world.roads) {
      const hw = r.width / 2;
      const x0 = Math.min(r.x1, r.x2) - (r.x1 === r.x2 ? hw : 0);
      const x1 = Math.max(r.x1, r.x2) + (r.x1 === r.x2 ? hw : 0);
      const z0 = Math.min(r.z1, r.z2) - (r.z1 === r.z2 ? hw : 0);
      const z1 = Math.max(r.z1, r.z2) + (r.z1 === r.z2 ? hw : 0);

      // Road bed (slightly raised above base ground to avoid z-fighting)
      pushQuad([x0, 0.08, z0], [x0, 0.08, z1], [x1, 0.08, z1], [x1, 0.08, z0], [0, 1, 0], asphaltCol);

      // Centerline yellow stripes
      if (r.x1 === r.x2) {
        // Vertical road
        pushQuad([r.x1 - 0.25, 0.1, z0], [r.x1 - 0.25, 0.1, z1], [r.x1 + 0.25, 0.1, z1], [r.x1 + 0.25, 0.1, z0], [0, 1, 0], stripeCol);
      } else {
        // Horizontal road
        pushQuad([x0, 0.1, r.z1 - 0.25], [x0, 0.1, r.z1 + 0.25], [x1, 0.1, r.z1 + 0.25], [x1, 0.1, r.z1 - 0.25], [0, 1, 0], stripeCol);
      }
    }

    // 4. City Buildings
    for (const b of world.buildings) {
      pushBox(b.x, 0, b.z, b.w, b.h, b.d, [...b.color, 1], [...b.roofColor, 1]);

      // Skyscraper window grid bands
      if (b.type === 'skyscraper') {
        const winCol = [0.75, 0.88, 0.95, 1];
        for (let wy = 8; wy < b.h - 6; wy += 8) {
          pushBox(b.x, wy, b.z, b.w + 0.15, 2.2, b.d + 0.15, winCol);
        }
      }
    }

    // 5. Shipping Container Stacks in Docks
    for (const c of world.containerStacks) {
      pushBox(c.x, c.y, c.z, c.w, c.h, c.d, [...c.color, 1], [c.color[0] * 0.8, c.color[1] * 0.8, c.color[2] * 0.8, 1]);
    }

    // 6. Palm Trees
    const trunkCol = [0.42, 0.28, 0.18, 1];
    const frondCol = [0.15, 0.58, 0.22, 1];
    for (const t of world.palmTrees) {
      const th = 8 * t.scale;
      // Trunk
      pushBox(t.x, 0, t.z, 0.7 * t.scale, th, 0.7 * t.scale, trunkCol);
      // Palm crown fronds
      pushBox(t.x, th, t.z, 5.2 * t.scale, 0.6 * t.scale, 5.2 * t.scale, frondCol);
      pushBox(t.x, th + 0.4, t.z, 3.6 * t.scale, 0.5 * t.scale, 3.6 * t.scale, [0.2, 0.68, 0.28, 1]);
    }

    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.staticVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    this.staticVertexCount = verts.length / 10;
  }

  beginDynamic() {
    this.dynamicVertCount = 0;
  }

  pushDynamicQuad(p1, p2, p3, p4, norm, col) {
    if (this.dynamicVertCount + 6 > this.maxDynamicVerts) return;
    const buf = this.dynamicBuffer;
    let idx = this.dynamicVertCount * 10;

    const addV = (p) => {
      buf[idx++] = p[0]; buf[idx++] = p[1]; buf[idx++] = p[2];
      buf[idx++] = norm[0]; buf[idx++] = norm[1]; buf[idx++] = norm[2];
      buf[idx++] = col[0]; buf[idx++] = col[1]; buf[idx++] = col[2]; buf[idx++] = col[3] ?? 1;
    };

    addV(p1); addV(p2); addV(p3);
    addV(p1); addV(p3); addV(p4);
    this.dynamicVertCount += 6;
  }

  pushDynamicBox(x, y, z, w, h, d, col, roofCol = null) {
    const x0 = x - w / 2, x1 = x + w / 2;
    const y0 = y, y1 = y + h;
    const z0 = z - d / 2, z1 = z + d / 2;
    const topCol = roofCol || col;

    this.pushDynamicQuad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], topCol);
    this.pushDynamicQuad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col);
    this.pushDynamicQuad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col);
    this.pushDynamicQuad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col);
    this.pushDynamicQuad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col);
  }

  drawVehicle(v) {
    const sinA = Math.sin(v.angle);
    const cosA = Math.cos(v.angle);

    // Local coordinates transformed by vehicle heading
    const toWorld = (lx, ly, lz) => [
      v.x + lx * cosA + lz * sinA,
      v.y + ly,
      v.z - lx * sinA + lz * cosA
    ];

    const bodyCol = [...v.color, 1];
    const glassCol = [0.15, 0.22, 0.32, 1];
    const wheelCol = [0.1, 0.1, 0.12, 1];

    // Car Body Chassis
    const hw = v.width / 2;
    const hl = v.length / 2;
    const bh = 0.85;

    // Draw main chassis box
    const p1 = toWorld(-hw, 0.3, -hl);
    const p2 = toWorld(hw, 0.3, -hl);
    const p3 = toWorld(hw, 0.3 + bh, -hl);
    const p4 = toWorld(-hw, 0.3 + bh, -hl);
    const p5 = toWorld(-hw, 0.3, hl);
    const p6 = toWorld(hw, 0.3, hl);
    const p7 = toWorld(hw, 0.3 + bh, hl);
    const p8 = toWorld(-hw, 0.3 + bh, hl);

    // Chassis faces
    this.pushDynamicQuad(p4, p3, p7, p8, [0, 1, 0], bodyCol); // Roof
    this.pushDynamicQuad(p5, p6, p7, p8, [sinA, 0, cosA], bodyCol); // Front hood
    this.pushDynamicQuad(p2, p1, p4, p3, [-sinA, 0, -cosA], bodyCol); // Rear
    this.pushDynamicQuad(p1, p5, p8, p4, [-cosA, 0, sinA], bodyCol); // Left side
    this.pushDynamicQuad(p6, p2, p3, p7, [cosA, 0, -sinA], bodyCol); // Right side

    // Cabin / Windshield
    const cw = hw * 0.88;
    const cp1 = toWorld(-cw, 0.3 + bh, -hl * 0.4);
    const cp2 = toWorld(cw, 0.3 + bh, -hl * 0.4);
    const cp3 = toWorld(cw, 0.3 + bh + 0.65, -hl * 0.3);
    const cp4 = toWorld(-cw, 0.3 + bh + 0.65, -hl * 0.3);
    const cp5 = toWorld(-cw, 0.3 + bh, hl * 0.3);
    const cp6 = toWorld(cw, 0.3 + bh, hl * 0.3);
    const cp7 = toWorld(cw, 0.3 + bh + 0.65, hl * 0.15);
    const cp8 = toWorld(-cw, 0.3 + bh + 0.65, hl * 0.15);

    this.pushDynamicQuad(cp4, cp3, cp7, cp8, [0, 1, 0], v.roofColor ? [...v.roofColor, 1] : bodyCol);
    this.pushDynamicQuad(cp8, cp7, cp6, cp5, [sinA, 0.4, cosA], glassCol); // Front windshield
    this.pushDynamicQuad(cp2, cp1, cp4, cp3, [-sinA, 0.4, -cosA], glassCol); // Rear windshield
    this.pushDynamicQuad(cp1, cp5, cp8, cp4, [-cosA, 0, sinA], glassCol); // Left window
    this.pushDynamicQuad(cp6, cp2, cp3, cp7, [cosA, 0, -sinA], glassCol); // Right window

    // 4 Wheels
    const wheelPositions = [
      [-hw - 0.05, 0.3, hl * 0.58],
      [hw + 0.05, 0.3, hl * 0.58],
      [-hw - 0.05, 0.3, -hl * 0.58],
      [hw + 0.05, 0.3, -hl * 0.58]
    ];
    for (const wp of wheelPositions) {
      const pos = toWorld(wp[0], wp[1], wp[2]);
      this.pushDynamicBox(pos[0], pos[1] - 0.15, pos[2], 0.35, 0.65, 0.65, wheelCol);
    }

    // Police Cruiser Lightbar
    if (v.isPolice) {
      const flashRed = Math.sin(v.sirenPhase || 0) > 0;
      const barY = 0.3 + bh + 0.72;
      const redPos = toWorld(-0.4, barY, 0);
      const bluePos = toWorld(0.4, barY, 0);
      this.pushDynamicBox(redPos[0], redPos[1], redPos[2], 0.4, 0.2, 0.3, flashRed ? [1, 0.1, 0.1, 1] : [0.3, 0.05, 0.05, 1]);
      this.pushDynamicBox(bluePos[0], bluePos[1], bluePos[2], 0.4, 0.2, 0.3, !flashRed ? [0.1, 0.5, 1, 1] : [0.05, 0.1, 0.3, 1]);
    }

    // Headlights (Front Z+)
    const hlCol = [1.0, 0.95, 0.8, 1];
    const leftHl = toWorld(-hw * 0.7, 0.6, hl + 0.05);
    const rightHl = toWorld(hw * 0.7, 0.6, hl + 0.05);
    this.pushDynamicBox(leftHl[0], leftHl[1], leftHl[2], 0.4, 0.25, 0.1, hlCol);
    this.pushDynamicBox(rightHl[0], rightHl[1], rightHl[2], 0.4, 0.25, 0.1, hlCol);
  }

  drawCharacter(char, type = 'ped') {
    const x = char.x;
    const y = char.y || 0;
    const z = char.z;
    const angle = char.heading || 0;
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);

    let shirtCol = [0.3, 0.5, 0.8, 1];
    let pantsCol = [0.15, 0.18, 0.25, 1];
    let skinCol = [0.92, 0.75, 0.62, 1];

    if (type === 'player') {
      shirtCol = [0.18, 0.18, 0.22, 1]; // Rook's dark leather jacket
      pantsCol = [0.22, 0.32, 0.48, 1]; // Denim blue jeans
    } else if (type === 'police') {
      shirtCol = [0.12, 0.18, 0.32, 1]; // Police navy
      pantsCol = [0.12, 0.15, 0.22, 1];
    } else if (type === 'syndicate') {
      shirtCol = [0.48, 0.15, 0.48, 1]; // Syndicate purple
      pantsCol = [0.12, 0.12, 0.15, 1];
    } else if (char.outfit) {
      shirtCol = [...char.outfit.shirt, 1];
      pantsCol = [...char.outfit.pants, 1];
    }

    // Animated leg swing stride
    const anim = Math.sin(char.animTime || 0);
    const legL = Math.max(-0.25, Math.min(0.25, anim * 0.35));
    const legR = -legL;

    // Legs
    this.pushDynamicBox(x - 0.18 * cosA + legL * sinA, y, z + 0.18 * sinA + legL * cosA, 0.26, 0.85, 0.26, pantsCol);
    this.pushDynamicBox(x + 0.18 * cosA + legR * sinA, y, z - 0.18 * sinA + legR * cosA, 0.26, 0.85, 0.26, pantsCol);

    // Torso
    this.pushDynamicBox(x, y + 0.85, z, 0.62, 0.75, 0.38, shirtCol);

    // Head
    this.pushDynamicBox(x, y + 1.62, z, 0.38, 0.42, 0.38, skinCol);

    // Held Weapon (Pistol or Rifle)
    if (type === 'player' || type === 'police' || type === 'syndicate') {
      const gunX = x + sinA * 0.45 + cosA * 0.25;
      const gunZ = z + cosA * 0.45 - sinA * 0.25;
      this.pushDynamicBox(gunX, y + 1.05, gunZ, 0.12, 0.15, 0.55, [0.15, 0.15, 0.18, 1]);
    }
  }

  drawHelicopter(heli) {
    if (!heli) return;
    const x = heli.x, y = heli.y, z = heli.z;
    const bodyCol = [0.15, 0.18, 0.25, 1]; // Navy SWAT
    const glassCol = [0.2, 0.4, 0.6, 1];

    // Fuselage
    this.pushDynamicBox(x, y, z, 2.2, 1.8, 4.6, bodyCol);
    // Cockpit glass
    this.pushDynamicBox(x, y + 0.2, z + 1.8, 1.8, 1.2, 1.2, glassCol);
    // Tail boom
    this.pushDynamicBox(x, y + 0.4, z - 4.2, 0.5, 0.5, 5.0, bodyCol);

    // Spinning Main Rotor Blade
    const rAngle = heli.rotorAngle || 0;
    const rSin = Math.sin(rAngle);
    const rCos = Math.cos(rAngle);
    const bladeLen = 6.2;
    const p1 = [x - rCos * bladeLen, y + 1.2, z + rSin * bladeLen];
    const p2 = [x + rCos * bladeLen, y + 1.2, z - rSin * bladeLen];
    const p3 = [x + rCos * bladeLen, y + 1.2, z - rSin * bladeLen + 0.3];
    const p4 = [x - rCos * bladeLen, y + 1.2, z + rSin * bladeLen + 0.3];
    this.pushDynamicQuad(p1, p2, p3, p4, [0, 1, 0], [0.2, 0.2, 0.22, 1]);

    // Searchlight Beam Cone casting onto ground!
    const spotX = heli.spotlightX;
    const spotZ = heli.spotlightZ;
    const beamCol = [1.0, 1.0, 0.8, 0.45];
    // Circle on ground
    const spotRadius = 7.5;
    this.pushDynamicBox(spotX, 0.1, spotZ, spotRadius * 2, 0.1, spotRadius * 2, [1.0, 1.0, 0.8, 0.6]);
  }

  drawParticles(particleList) {
    for (const p of particleList) {
      if (p.life <= 0) continue;
      const s = p.size;
      const col = [p.color[0], p.color[1], p.color[2], p.life * (p.color[3] || 1)];
      this.pushDynamicBox(p.x, p.y, p.z, s, s, s, col);
    }
  }

  renderScene(camera, world, player, traffic, pedestrians, police, missions, particleList) {
    const gl = this.gl;
    if (!gl) return;

    // Viewport setup
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(this.fogColor[0], this.fogColor[1], this.fogColor[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    gl.useProgram(this.program);

    // Upload Camera & Lighting Uniforms
    gl.uniformMatrix4fv(this.uniforms.viewProj, false, camera.viewProjMatrix);

    const identity = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
    gl.uniformMatrix4fv(this.uniforms.model, false, identity);

    gl.uniform3fv(this.uniforms.sunDir, this.sunDir);
    gl.uniform3fv(this.uniforms.sunColor, this.sunColor);
    gl.uniform3fv(this.uniforms.skyColor, this.skyColor);
    gl.uniform3fv(this.uniforms.fogColor, this.fogColor);
    gl.uniform3f(this.uniforms.camPos, camera.x, camera.y, camera.z);

    // Police Siren Light Flash Uniform
    let sirenR = 0, sirenG = 0, sirenB = 0;
    if (police.wantedLevel > 0) {
      const flash = Math.sin(Date.now() * 0.016) > 0;
      sirenR = flash ? 1.0 : 0.0;
      sirenB = flash ? 0.0 : 1.0;
    }
    gl.uniform3f(this.uniforms.sirenLight, sirenR, sirenG, sirenB);

    // 1. Render Static Mesh (World, roads, buildings, palm trees)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.staticVbo);
    this.setupVertexAttribPointers();
    gl.drawArrays(gl.TRIANGLES, 0, this.staticVertexCount);

    // 2. Build & Render Dynamic Mesh (Vehicles, characters, particles, helicopter)
    this.beginDynamic();

    // Draw Traffic vehicles & Parked vehicles
    for (const v of traffic.vehicles) {
      if (v === player.vehicle && player.inVehicle) continue;
      this.drawVehicle(v);
    }

    // Draw Player's Vehicle if in vehicle
    if (player.inVehicle && player.vehicle) {
      this.drawVehicle(player.vehicle);
    }

    // Draw Police Cruisers
    for (const c of police.cruisers) {
      this.drawVehicle(c);
    }

    // Draw Player on foot
    if (!player.inVehicle) {
      this.drawCharacter(player, 'player');
    }

    // Draw Pedestrians
    for (const p of pedestrians.pedestrians) {
      if (p.alive) {
        this.drawCharacter(p, 'ped');
      }
    }

    // Draw Police Foot Officers
    for (const o of police.officers) {
      if (o.alive) {
        this.drawCharacter(o, 'police');
      }
    }

    // Draw Syndicate Enemies
    for (const e of missions.enemies) {
      if (e.alive) {
        this.drawCharacter(e, 'syndicate');
      }
    }

    // Draw Helicopter
    if (police.helicopter) {
      this.drawHelicopter(police.helicopter);
    }

    // Draw Particles
    this.drawParticles(particleList);

    // Upload & Draw Dynamic Geometry
    if (this.dynamicVertCount > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamicVbo);
      gl.bufferData(gl.ARRAY_BUFFER, this.dynamicBuffer.subarray(0, this.dynamicVertCount * 10), gl.DYNAMIC_DRAW);
      this.setupVertexAttribPointers();
      gl.drawArrays(gl.TRIANGLES, 0, this.dynamicVertCount);
    }
  }

  setupVertexAttribPointers() {
    const gl = this.gl;
    const stride = 10 * 4; // 10 floats per vertex
    gl.enableVertexAttribArray(this.attribs.position);
    gl.vertexAttribPointer(this.attribs.position, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(this.attribs.normal);
    gl.vertexAttribPointer(this.attribs.normal, 3, gl.FLOAT, false, stride, 3 * 4);

    gl.enableVertexAttribArray(this.attribs.color);
    gl.vertexAttribPointer(this.attribs.color, 4, gl.FLOAT, false, stride, 6 * 4);
  }
}
