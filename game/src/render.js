// High-Performance Pure WebGL 3D Renderer for Nightfall City (Vela Bay)
// Features daylight illumination, atmospheric sky dome, sun glare, detailed architectural
// geometry, road markings, zebra crosswalks, raised kerbs, and street furniture.

import { CONFIG } from './config.js';

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

    // Daylight lighting parameters
    this.sunDir = [...CONFIG.lighting.sunDir];
    this.sunColor = [...CONFIG.lighting.sunColor];
    this.skyZenith = [...CONFIG.lighting.skyZenithColor];
    this.skyHorizon = [...CONFIG.lighting.skyHorizonColor];
    this.ambientSky = [...CONFIG.lighting.ambientSky];
    this.ambientGround = [...CONFIG.lighting.ambientGround];
    this.fogColor = [...CONFIG.lighting.fogColor];

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
      uniform vec3 u_skyZenith;
      uniform vec3 u_skyHorizon;
      uniform vec3 u_ambientSky;
      uniform vec3 u_ambientGround;
      uniform vec3 u_fogColor;
      uniform vec3 u_camPos;
      uniform vec3 u_sirenLight;

      void main() {
        float normLen = length(v_normal);

        // Emissive geometry check (sky dome has normal = 0)
        if (normLen < 0.1) {
          vec3 viewDir = normalize(v_worldPos - u_camPos);
          vec3 sunDirNorm = normalize(u_sunDir);
          float sunDot = max(dot(viewDir, sunDirNorm), 0.0);

          // Brilliant sun disc and atmospheric glare corona
          float sunDisc = pow(sunDot, 350.0) * 2.0;
          float sunGlow = pow(sunDot, 18.0) * 0.45;
          vec3 skyOutput = v_color.rgb + u_sunColor * (sunDisc + sunGlow);

          gl_FragColor = vec4(skyOutput, 1.0);
          return;
        }

        vec3 norm = normalize(v_normal);
        vec3 sunD = normalize(u_sunDir);

        // Directional warm sunlight
        float diff = max(dot(norm, sunD), 0.0);
        vec3 diffuse = u_sunColor * diff * 0.95;

        // Soft hemisphere ambient: sky light from above, warm earth bounce from below
        float hemi = norm.y * 0.5 + 0.5;
        vec3 ambient = mix(u_ambientGround, u_ambientSky, hemi);

        // Specular highlight for metallic/glass surfaces
        vec3 viewDir = normalize(u_camPos - v_worldPos);
        vec3 halfDir = normalize(sunD + viewDir);
        float spec = pow(max(dot(norm, halfDir), 0.0), 24.0) * 0.28;

        // Combined surface lighting
        vec3 lightedColor = v_color.rgb * (ambient + diffuse) + vec3(spec);

        // Police Siren Light bounce
        float sirenDist = length(v_worldPos - u_camPos);
        if (sirenDist < 65.0) {
          float sFactor = (1.0 - sirenDist / 65.0) * 0.35;
          lightedColor += u_sirenLight * sFactor;
        }

        // Distance Fog blending smoothly into horizon sky
        float dist = length(v_worldPos - u_camPos);
        float fogFactor = clamp((dist - 85.0) / 335.0, 0.0, 1.0);
        float fogCurve = fogFactor * fogFactor;
        vec3 finalColor = mix(lightedColor, u_fogColor, fogCurve);

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
      skyZenith: gl.getUniformLocation(prog, 'u_skyZenith'),
      skyHorizon: gl.getUniformLocation(prog, 'u_skyHorizon'),
      ambientSky: gl.getUniformLocation(prog, 'u_ambientSky'),
      ambientGround: gl.getUniformLocation(prog, 'u_ambientGround'),
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

  // Pre-bake static city world into single high-performance static VBO
  buildStaticMesh(world) {
    const verts = [];

    const pushQuad = (p1, p2, p3, p4, norm, col) => {
      verts.push(p1[0], p1[1], p1[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], col[3] ?? 1);
      verts.push(p2[0], p2[1], p2[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], col[3] ?? 1);
      verts.push(p3[0], p3[1], p3[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], col[3] ?? 1);
      verts.push(p1[0], p1[1], p1[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], col[3] ?? 1);
      verts.push(p3[0], p3[1], p3[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], col[3] ?? 1);
      verts.push(p4[0], p4[1], p4[2], norm[0], norm[1], norm[2], col[0], col[1], col[2], col[3] ?? 1);
    };

    const pushQuadGrad = (p1, p2, p3, p4, norm, c1, c2, c3, c4) => {
      verts.push(p1[0], p1[1], p1[2], norm[0], norm[1], norm[2], c1[0], c1[1], c1[2], c1[3] ?? 1);
      verts.push(p2[0], p2[1], p2[2], norm[0], norm[1], norm[2], c2[0], c2[1], c2[2], c2[3] ?? 1);
      verts.push(p3[0], p3[1], p3[2], norm[0], norm[1], norm[2], c3[0], c3[1], c3[2], c3[3] ?? 1);
      verts.push(p1[0], p1[1], p1[2], norm[0], norm[1], norm[2], c1[0], c1[1], c1[2], c1[3] ?? 1);
      verts.push(p3[0], p3[1], p3[2], norm[0], norm[1], norm[2], c3[0], c3[1], c3[2], c3[3] ?? 1);
      verts.push(p4[0], p4[1], p4[2], norm[0], norm[1], norm[2], c4[0], c4[1], c4[2], c4[3] ?? 1);
    };

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

    // =========================================================================
    // 1. SKY DOME (Hemispherical sky cylinder with daylight gradient)
    // =========================================================================
    const skyRadius = 450;
    const skySegments = 24;
    const unlitNorm = [0, 0, 0];
    const zenithCol = [...this.skyZenith, 1];
    const midSkyCol = [
      (this.skyZenith[0] + this.skyHorizon[0]) * 0.5,
      (this.skyZenith[1] + this.skyHorizon[1]) * 0.5,
      (this.skyZenith[2] + this.skyHorizon[2]) * 0.5,
      1
    ];
    const horizonCol = [...this.skyHorizon, 1];

    for (let i = 0; i < skySegments; i++) {
      const a1 = (i / skySegments) * Math.PI * 2;
      const a2 = ((i + 1) / skySegments) * Math.PI * 2;
      const x1 = Math.sin(a1) * skyRadius, z1 = Math.cos(a1) * skyRadius;
      const x2 = Math.sin(a2) * skyRadius, z2 = Math.cos(a2) * skyRadius;

      // Lower sky band (horizon to mid)
      pushQuadGrad(
        [x1, -20, z1], [x2, -20, z2], [x2, 80, z2], [x1, 80, z1],
        unlitNorm, horizonCol, horizonCol, midSkyCol, midSkyCol
      );
      // Upper sky band (mid to zenith dome cap)
      pushQuadGrad(
        [x1, 80, z1], [x2, 80, z2], [x2, 240, z2], [x1, 240, z1],
        unlitNorm, midSkyCol, midSkyCol, zenithCol, zenithCol
      );
    }

    // =========================================================================
    // 2. BASE GROUND & NATURAL FEATURES
    // =========================================================================
    // City Ground Bed
    pushQuad([-280, 0, -280], [-280, 0, 280], [280, 0, 280], [280, 0, -280], [0, 1, 0], [0.65, 0.66, 0.67, 1]);

    // Coastal Ocean Water Surface (Turquoise coastal waters)
    const oceanCol = [0.12, 0.46, 0.72, 1];
    pushQuad([-290, -0.2, 225], [-290, -0.2, 380], [290, -0.2, 380], [290, -0.2, 225], [0, 1, 0], oceanCol);
    pushQuad([-380, -0.2, -290], [-380, -0.2, 380], [-225, -0.2, 380], [-225, -0.2, -290], [0, 1, 0], oceanCol);

    // Coastal Surf Foam Wave Edge meeting Beach
    const foamCol = [0.92, 0.96, 0.99, 1];
    pushQuad([-240, 0.02, 224], [-240, 0.02, 226], [50, 0.02, 226], [50, 0.02, 224], [0, 1, 0], foamCol);

    // Sandy Beach
    const sandCol = [0.93, 0.86, 0.66, 1];
    pushQuad([-240, 0.04, 190], [-240, 0.04, 235], [50, 0.04, 235], [50, 0.04, 190], [0, 1, 0], sandCol);

    // Ocean Promenade Wooden Boardwalk
    const boardPlankCol = [0.76, 0.62, 0.45, 1];
    const boardRailCol = [0.84, 0.72, 0.54, 1];
    pushBox(-95, 0.12, 192, 270, 0.15, 8.0, boardPlankCol, boardPlankCol);
    pushBox(-95, 0.70, 188.2, 270, 0.10, 0.14, boardRailCol);
    pushBox(-95, 0.70, 195.8, 270, 0.10, 0.14, boardRailCol);

    // =========================================================================
    // 3. ROADS, RAISED KERBS, PAVEMENTS, AND STREET MARKINGS
    // =========================================================================
    const asphaltCol = [0.18, 0.19, 0.21, 1];
    const kerbCol = [0.76, 0.75, 0.73, 1];
    const sidewalkCol = [0.70, 0.70, 0.68, 1];
    const stripeCol = [0.96, 0.82, 0.16, 1]; // Yellow centerline
    const whiteLineCol = [0.95, 0.95, 0.96, 1]; // White lane divider & crosswalk

    const grid = CONFIG.world.roadGrid;

    for (const r of world.roads) {
      const hw = r.width / 2;
      const x0 = Math.min(r.x1, r.x2) - (r.x1 === r.x2 ? hw : 0);
      const x1 = Math.max(r.x1, r.x2) + (r.x1 === r.x2 ? hw : 0);
      const z0 = Math.min(r.z1, r.z2) - (r.z1 === r.z2 ? hw : 0);
      const z1 = Math.max(r.z1, r.z2) + (r.z1 === r.z2 ? hw : 0);

      // Asphalt Road Bed
      pushQuad([x0, 0.06, z0], [x0, 0.06, z1], [x1, 0.06, z1], [x1, 0.06, z0], [0, 1, 0], asphaltCol);

      // Sidewalks & Kerbs along Road Edges
      const sw = 4.0;
      const curbH = 0.14;

      if (r.x1 === r.x2) {
        // Vertical Road (North-South): Left & Right sidewalks
        // Left sidewalk
        pushBox(r.x1 - hw - sw / 2, 0, (z0 + z1) / 2, sw, curbH, z1 - z0, sidewalkCol, sidewalkCol);
        // Left kerb edge
        pushBox(r.x1 - hw - 0.12, 0, (z0 + z1) / 2, 0.24, curbH + 0.02, z1 - z0, kerbCol);

        // Right sidewalk
        pushBox(r.x1 + hw + sw / 2, 0, (z0 + z1) / 2, sw, curbH, z1 - z0, sidewalkCol, sidewalkCol);
        // Right kerb edge
        pushBox(r.x1 + hw + 0.12, 0, (z0 + z1) / 2, 0.24, curbH + 0.02, z1 - z0, kerbCol);

        // Centerline (Double yellow on major avenue, single on normal)
        if (r.isMajor) {
          pushQuad([r.x1 - 0.35, 0.09, z0], [r.x1 - 0.35, 0.09, z1], [r.x1 - 0.12, 0.09, z1], [r.x1 - 0.12, 0.09, z0], [0, 1, 0], stripeCol);
          pushQuad([r.x1 + 0.12, 0.09, z0], [r.x1 + 0.12, 0.09, z1], [r.x1 + 0.35, 0.09, z1], [r.x1 + 0.35, 0.09, z0], [0, 1, 0], stripeCol);
        } else {
          pushQuad([r.x1 - 0.18, 0.09, z0], [r.x1 - 0.18, 0.09, z1], [r.x1 + 0.18, 0.09, z1], [r.x1 + 0.18, 0.09, z0], [0, 1, 0], stripeCol);
        }

        // Dashed white lane markings
        for (let segZ = -250; segZ <= 250; segZ += 10) {
          pushQuad([r.x1 - hw * 0.5 - 0.1, 0.09, segZ], [r.x1 - hw * 0.5 - 0.1, 0.09, segZ + 5], [r.x1 - hw * 0.5 + 0.1, 0.09, segZ + 5], [r.x1 - hw * 0.5 + 0.1, 0.09, segZ], [0, 1, 0], whiteLineCol);
          pushQuad([r.x1 + hw * 0.5 - 0.1, 0.09, segZ], [r.x1 + hw * 0.5 - 0.1, 0.09, segZ + 5], [r.x1 + hw * 0.5 + 0.1, 0.09, segZ + 5], [r.x1 + hw * 0.5 + 0.1, 0.09, segZ], [0, 1, 0], whiteLineCol);
        }
      } else {
        // Horizontal Road (East-West)
        pushBox((x0 + x1) / 2, 0, r.z1 - hw - sw / 2, x1 - x0, curbH, sw, sidewalkCol, sidewalkCol);
        pushBox((x0 + x1) / 2, 0, r.z1 - hw - 0.12, x1 - x0, curbH + 0.02, 0.24, kerbCol);

        pushBox((x0 + x1) / 2, 0, r.z1 + hw + sw / 2, x1 - x0, curbH, sw, sidewalkCol, sidewalkCol);
        pushBox((x0 + x1) / 2, 0, r.z1 + hw + 0.12, x1 - x0, curbH + 0.02, 0.24, kerbCol);

        // Centerline
        if (r.isMajor) {
          pushQuad([x0, 0.09, r.z1 - 0.35], [x0, 0.09, r.z1 - 0.12], [x1, 0.09, r.z1 - 0.12], [x1, 0.09, r.z1 - 0.35], [0, 1, 0], stripeCol);
          pushQuad([x0, 0.09, r.z1 + 0.12], [x0, 0.09, r.z1 + 0.35], [x1, 0.09, r.z1 + 0.35], [x1, 0.09, r.z1 + 0.12], [0, 1, 0], stripeCol);
        } else {
          pushQuad([x0, 0.09, r.z1 - 0.18], [x0, 0.09, r.z1 + 0.18], [x1, 0.09, r.z1 + 0.18], [x1, 0.09, r.z1 - 0.18], [0, 1, 0], stripeCol);
        }

        // Dashed white lane markings
        for (let segX = -250; segX <= 250; segX += 10) {
          pushQuad([segX, 0.09, r.z1 - hw * 0.5 - 0.1], [segX, 0.09, r.z1 - hw * 0.5 + 0.1], [segX + 5, 0.09, r.z1 - hw * 0.5 + 0.1], [segX + 5, 0.09, r.z1 - hw * 0.5 - 0.1], [0, 1, 0], whiteLineCol);
          pushQuad([segX, 0.09, r.z1 + hw * 0.5 - 0.1], [segX, 0.09, r.z1 + hw * 0.5 + 0.1], [segX + 5, 0.09, r.z1 + hw * 0.5 + 0.1], [segX + 5, 0.09, r.z1 + hw * 0.5 - 0.1], [0, 1, 0], whiteLineCol);
        }
      }
    }

    // Pedestrian Zebra Crosswalks & Stop Lines at Intersections
    for (const gx of grid) {
      for (const gz of grid) {
        const roadW = gx === 0 ? 18 : 14;
        const offset = roadW / 2 + 2.5;
        const stopOffset = roadW / 2 + 4.8;

        // North & South zebra crossings
        for (let stripe = -roadW / 2 + 1; stripe <= roadW / 2 - 1; stripe += 1.8) {
          pushQuad([gx + stripe - 0.4, 0.1, gz - offset - 1.2], [gx + stripe - 0.4, 0.1, gz - offset + 1.2], [gx + stripe + 0.4, 0.1, gz - offset + 1.2], [gx + stripe + 0.4, 0.1, gz - offset - 1.2], [0, 1, 0], whiteLineCol);
          pushQuad([gx + stripe - 0.4, 0.1, gz + offset - 1.2], [gx + stripe - 0.4, 0.1, gz + offset + 1.2], [gx + stripe + 0.4, 0.1, gz + offset + 1.2], [gx + stripe + 0.4, 0.1, gz + offset - 1.2], [0, 1, 0], whiteLineCol);
        }
        // North & South solid white stop lines
        pushQuad([gx - roadW / 2 + 0.4, 0.1, gz - stopOffset - 0.3], [gx - roadW / 2 + 0.4, 0.1, gz - stopOffset + 0.3], [gx + roadW / 2 - 0.4, 0.1, gz - stopOffset + 0.3], [gx + roadW / 2 - 0.4, 0.1, gz - stopOffset - 0.3], [0, 1, 0], whiteLineCol);
        pushQuad([gx - roadW / 2 + 0.4, 0.1, gz + stopOffset - 0.3], [gx - roadW / 2 + 0.4, 0.1, gz + stopOffset + 0.3], [gx + roadW / 2 - 0.4, 0.1, gz + stopOffset + 0.3], [gx + roadW / 2 - 0.4, 0.1, gz + stopOffset - 0.3], [0, 1, 0], whiteLineCol);

        // East & West zebra crossings
        for (let stripe = -roadW / 2 + 1; stripe <= roadW / 2 - 1; stripe += 1.8) {
          pushQuad([gx - offset - 1.2, 0.1, gz + stripe - 0.4], [gx - offset + 1.2, 0.1, gz + stripe - 0.4], [gx - offset + 1.2, 0.1, gz + stripe + 0.4], [gx - offset - 1.2, 0.1, gz + stripe + 0.4], [0, 1, 0], whiteLineCol);
          pushQuad([gx + offset - 1.2, 0.1, gz + stripe - 0.4], [gx + offset + 1.2, 0.1, gz + stripe - 0.4], [gx + offset + 1.2, 0.1, gz + stripe + 0.4], [gx + offset - 1.2, 0.1, gz + stripe + 0.4], [0, 1, 0], whiteLineCol);
        }
        // East & West solid white stop lines
        pushQuad([gx - stopOffset - 0.3, 0.1, gz - roadW / 2 + 0.4], [gx - stopOffset + 0.3, 0.1, gz - roadW / 2 + 0.4], [gx - stopOffset + 0.3, 0.1, gz + roadW / 2 - 0.4], [gx - stopOffset - 0.3, 0.1, gz + roadW / 2 - 0.4], [0, 1, 0], whiteLineCol);
        pushQuad([gx + stopOffset - 0.3, 0.1, gz - roadW / 2 + 0.4], [gx + stopOffset + 0.3, 0.1, gz - roadW / 2 + 0.4], [gx + stopOffset + 0.3, 0.1, gz + roadW / 2 - 0.4], [gx + stopOffset - 0.3, 0.1, gz + roadW / 2 - 0.4], [0, 1, 0], whiteLineCol);
      }
    }

    // =========================================================================
    // 4. ARCHITECTURAL CITY BUILDINGS (Facades, Window Grids, Roofs, Parapets)
    // =========================================================================
    for (const b of world.buildings) {
      const { x, z, w, d, h, type, color, roofColor, details } = b;
      const bCol = [...color, 1];
      const rCol = [...roofColor, 1];

      // Ground Floor Storefront Plinth (first 4.2m)
      const plinthH = 4.2;
      const plinthCol = [color[0] * 0.75, color[1] * 0.75, color[2] * 0.75, 1];
      pushBox(x, 0, z, w, plinthH, d, plinthCol);

      // Storefront Glass Windows on Ground Floor
      const glassCol = [0.18, 0.28, 0.38, 1];
      pushBox(x, 0.8, z + d / 2 + 0.05, w * 0.85, 2.6, 0.15, glassCol);
      pushBox(x, 0.8, z - d / 2 - 0.05, w * 0.85, 2.6, 0.15, glassCol);
      pushBox(x + w / 2 + 0.05, 0.8, z, 0.15, 2.6, d * 0.85, glassCol);
      pushBox(x - w / 2 - 0.05, 0.8, z, 0.15, 2.6, d * 0.85, glassCol);

      // Upper Main Building Body
      if (details.setback && h > 45) {
        // Lower tower block
        const setH = details.setbackHeight;
        pushBox(x, plinthH, z, w, setH - plinthH, d, bCol);
        // Upper setback tower
        const subW = w * 0.76;
        const subD = d * 0.76;
        pushBox(x, setH, z, subW, h - setH, subD, bCol, rCol);

        // Window grid bands on skyscraper
        const winCol = [0.72, 0.85, 0.95, 1];
        for (let wy = plinthH + 3; wy < setH - 2; wy += 4.5) {
          pushBox(x, wy, z, w + 0.12, 1.8, d + 0.12, winCol);
        }
        for (let wy = setH + 3; wy < h - 4; wy += 4.5) {
          pushBox(x, wy, z, subW + 0.12, 1.8, subD + 0.12, winCol);
        }

        // Roof Parapet Rim
        const pw = subW, pd = subD;
        pushBox(x, h, z, pw, 0.9, pd, [0.2, 0.22, 0.25, 1]);
        pushBox(x, h, z, pw - 1.2, 0.92, pd - 1.2, rCol);

        // Rooftop Helipad
        if (details.helipad) {
          const hy = h + 0.93;
          pushBox(x, hy, z, 16, 0.05, 16, [0.26, 0.28, 0.32, 1]);
          pushBox(x, hy + 0.02, z, 14.2, 0.03, 14.2, [0.96, 0.82, 0.16, 1]);
          pushBox(x, hy + 0.04, z, 12.6, 0.03, 12.6, [0.26, 0.28, 0.32, 1]);
          // "H" marking
          pushBox(x - 2.6, hy + 0.06, z, 1.2, 0.03, 7.2, [0.96, 0.82, 0.16, 1]);
          pushBox(x + 2.6, hy + 0.06, z, 1.2, 0.03, 7.2, [0.96, 0.82, 0.16, 1]);
          pushBox(x, hy + 0.06, z, 4.0, 0.03, 1.2, [0.96, 0.82, 0.16, 1]);
        }

        // Rooftop Antenna
        if (details.antenna) {
          pushBox(x, h + 0.9, z, 0.6, 14, 0.6, [0.85, 0.85, 0.88, 1]);
          pushBox(x, h + 14, z, 0.2, 6, 0.2, [1.0, 0.2, 0.2, 1]); // Red beacon tip
        }
      } else {
        // Standard Building Tower
        pushBox(x, plinthH, z, w, h - plinthH, d, bCol, rCol);

        // Window bands / grid
        const winBandCol = type === 'market' ? [0.28, 0.22, 0.18, 1] : [0.70, 0.84, 0.94, 1];
        const step = type === 'market' ? 3.5 : 5.0;
        for (let wy = plinthH + 2.5; wy < h - 3; wy += step) {
          pushBox(x, wy, z, w + 0.1, 1.5, d + 0.1, winBandCol);
        }

        // Market Quarter Merchant Awnings
        if (details.awnings) {
          const awnCol = (Math.abs(Math.floor(x + z)) % 2 === 0) ? [0.82, 0.22, 0.18, 1] : [0.18, 0.62, 0.38, 1];
          pushBox(x, plinthH, z + d / 2 + 1.2, w * 0.9, 0.25, 2.4, awnCol);
          pushBox(x, plinthH, z - d / 2 - 1.2, w * 0.9, 0.25, 2.4, awnCol);
        }

        // Roof Parapet
        pushBox(x, h, z, w, 0.8, d, [0.25, 0.26, 0.28, 1]);
        pushBox(x, h, z, w - 1.0, 0.82, d - 1.0, rCol);
      }

      // Rooftop HVAC Equipment & Elevator Machine Housing
      const hvacCount = details.hvacCount || 1;
      for (let k = 0; k < hvacCount; k++) {
        const hx = x + (k === 0 ? -w * 0.2 : w * 0.2);
        const hz = z + (k === 1 ? -d * 0.2 : d * 0.2);
        pushBox(hx, h + 0.8, hz, 3.8, 2.2, 3.8, [0.35, 0.38, 0.42, 1]);
        // Vent fan grille
        pushBox(hx, h + 3.0, hz, 2.2, 0.4, 2.2, [0.18, 0.20, 0.22, 1]);
      }
    }

    // =========================================================================
    // 5. MERIDIAN SHIPPING CONTAINER STACKS
    // =========================================================================
    for (const c of world.containerStacks) {
      pushBox(c.x, c.y, c.z, c.w, c.h, c.d, [...c.color, 1], [c.color[0] * 0.75, c.color[1] * 0.75, c.color[2] * 0.75, 1]);
      // Container edge castings & corner posts
      pushBox(c.x, c.y, c.z, c.w + 0.08, c.h + 0.02, 0.2, [0.2, 0.22, 0.25, 1]);
      pushBox(c.x, c.y, c.z, 0.2, c.h + 0.02, c.d + 0.08, [0.2, 0.22, 0.25, 1]);
    }

    // =========================================================================
    // 6. STREET FURNITURE & PROPS (Lamps, Traffic Lights, Benches, Bins)
    // =========================================================================
    const metalPoleCol = [0.22, 0.24, 0.26, 1];
    const lampGlowCol = [1.0, 0.95, 0.80, 1];
    const benchWoodCol = [0.52, 0.32, 0.18, 1];
    const binCol = [0.28, 0.32, 0.30, 1];

    for (const p of world.props) {
      if (p.type === 'lamp') {
        // Vertical post
        pushBox(p.x, 0.14, p.z, 0.24, 6.2, 0.24, metalPoleCol);
        // Primary horizontal top arm
        const armDir = p.rotation === 0 ? 1 : -1;
        pushBox(p.x + armDir * 0.7, 6.2, p.z, 1.4, 0.18, 0.18, metalPoleCol);
        pushBox(p.x + armDir * 1.3, 6.0, p.z, 0.45, 0.25, 0.35, lampGlowCol);
        // Double-headed luminaire if near major central avenue (x=0 or z=0)
        if (Math.abs(p.x) < 22 || Math.abs(p.z) < 22) {
          pushBox(p.x - armDir * 0.7, 6.2, p.z, 1.4, 0.18, 0.18, metalPoleCol);
          pushBox(p.x - armDir * 1.3, 6.0, p.z, 0.45, 0.25, 0.35, lampGlowCol);
        }
      } else if (p.type === 'traffic_light') {
        // Traffic light post
        pushBox(p.x, 0.14, p.z, 0.28, 5.8, 0.28, [0.18, 0.18, 0.20, 1]);
        // Signal housing
        pushBox(p.x, 4.4, p.z, 0.42, 1.4, 0.42, [0.15, 0.15, 0.16, 1]);
        // Red, Amber, Green light lenses with visor hoods
        pushBox(p.x, 4.8, p.z, 0.46, 0.3, 0.46, [0.95, 0.15, 0.10, 1]);
        pushBox(p.x, 4.95, p.z, 0.52, 0.08, 0.52, [0.12, 0.12, 0.14, 1]); // Visor hood
        pushBox(p.x, 4.4, p.z, 0.46, 0.3, 0.46, [0.95, 0.75, 0.10, 1]);
        pushBox(p.x, 4.55, p.z, 0.52, 0.08, 0.52, [0.12, 0.12, 0.14, 1]); // Visor hood
        pushBox(p.x, 4.0, p.z, 0.46, 0.3, 0.46, [0.10, 0.85, 0.25, 1]);
        pushBox(p.x, 4.15, p.z, 0.52, 0.08, 0.52, [0.12, 0.12, 0.14, 1]); // Visor hood
      } else if (p.type === 'bench') {
        // Wooden park bench
        pushBox(p.x, 0.14, p.z, 0.8, 0.48, 2.2, benchWoodCol);
        // Bench backrest
        pushBox(p.x - 0.32, 0.62, p.z, 0.16, 0.48, 2.2, benchWoodCol);
        // Metal bench legs
        pushBox(p.x, 0.14, p.z - 0.9, 0.82, 0.45, 0.12, metalPoleCol);
        pushBox(p.x, 0.14, p.z + 0.9, 0.82, 0.45, 0.12, metalPoleCol);
      } else if (p.type === 'bin') {
        // Sidewalk trash can
        pushBox(p.x, 0.14, p.z, 0.65, 0.95, 0.65, binCol);
        pushBox(p.x, 1.05, p.z, 0.72, 0.12, 0.72, metalPoleCol);
      } else if (p.type === 'hydrant') {
        // Street corner fire hydrant
        pushBox(p.x, 0.14, p.z, 0.36, 0.75, 0.36, [0.90, 0.18, 0.15, 1]);
        pushBox(p.x, 0.55, p.z, 0.48, 0.22, 0.48, [0.75, 0.76, 0.78, 1]); // Silver cap
      } else if (p.type === 'newsstand') {
        // Downtown news vending stand
        pushBox(p.x, 0.14, p.z, 0.75, 1.15, 0.65, [0.18, 0.42, 0.68, 1]);
        pushBox(p.x, 0.75, p.z + 0.3, 0.55, 0.35, 0.10, [0.85, 0.88, 0.92, 1]); // Paper display window
      } else if (p.type === 'bollard') {
        // Port wharf mooring bollard
        pushBox(p.x, 0.14, p.z, 0.5, 0.7, 0.5, [0.22, 0.24, 0.28, 1]);
        pushBox(p.x, 0.8, p.z, 0.7, 0.2, 0.7, [0.18, 0.20, 0.22, 1]);
      }
    }

    // =========================================================================
    // 7. COASTAL PALM TREES
    // =========================================================================
    const trunkCol = [0.42, 0.28, 0.18, 1];
    const frondCol = [0.16, 0.62, 0.25, 1];
    for (const t of world.palmTrees) {
      const th = 8.5 * t.scale;
      // Segmented trunk
      pushBox(t.x, 0, t.z, 0.7 * t.scale, th, 0.7 * t.scale, trunkCol);
      // Main palm canopy fronds
      pushBox(t.x, th, t.z, 5.6 * t.scale, 0.6 * t.scale, 5.6 * t.scale, frondCol);
      // Secondary crown tier
      pushBox(t.x, th + 0.4, t.z, 3.8 * t.scale, 0.5 * t.scale, 3.8 * t.scale, [0.22, 0.72, 0.30, 1]);
    }

    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.staticVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    this.staticVertexCount = verts.length / 10;
    console.log(`[WebGLRenderer] Baked ${this.staticVertexCount} static vertices into world mesh`);
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

    const toWorld = (lx, ly, lz) => [
      v.x + lx * cosA + lz * sinA,
      v.y + ly,
      v.z - lx * sinA + lz * cosA
    ];

    const bodyCol = [...v.color, 1];
    const glassCol = [0.18, 0.28, 0.40, 1];
    const wheelCol = [0.12, 0.12, 0.14, 1];

    const hw = v.width / 2;
    const hl = v.length / 2;
    const bh = 0.85;

    // Main chassis
    const p1 = toWorld(-hw, 0.3, -hl);
    const p2 = toWorld(hw, 0.3, -hl);
    const p3 = toWorld(hw, 0.3 + bh, -hl);
    const p4 = toWorld(-hw, 0.3 + bh, -hl);
    const p5 = toWorld(-hw, 0.3, hl);
    const p6 = toWorld(hw, 0.3, hl);
    const p7 = toWorld(hw, 0.3 + bh, hl);
    const p8 = toWorld(-hw, 0.3 + bh, hl);

    this.pushDynamicQuad(p4, p3, p7, p8, [0, 1, 0], bodyCol);
    this.pushDynamicQuad(p5, p6, p7, p8, [sinA, 0, cosA], bodyCol);
    this.pushDynamicQuad(p2, p1, p4, p3, [-sinA, 0, -cosA], bodyCol);
    this.pushDynamicQuad(p1, p5, p8, p4, [-cosA, 0, sinA], bodyCol);
    this.pushDynamicQuad(p6, p2, p3, p7, [cosA, 0, -sinA], bodyCol);

    // Cabin / Windshields
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
    this.pushDynamicQuad(cp8, cp7, cp6, cp5, [sinA, 0.4, cosA], glassCol);
    this.pushDynamicQuad(cp2, cp1, cp4, cp3, [-sinA, 0.4, -cosA], glassCol);
    this.pushDynamicQuad(cp1, cp5, cp8, cp4, [-cosA, 0, sinA], glassCol);
    this.pushDynamicQuad(cp6, cp2, cp3, cp7, [cosA, 0, -sinA], glassCol);

    // Wheels
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
      this.pushDynamicBox(redPos[0], redPos[1], redPos[2], 0.4, 0.2, 0.3, flashRed ? [1, 0.15, 0.15, 1] : [0.3, 0.05, 0.05, 1]);
      this.pushDynamicBox(bluePos[0], bluePos[1], bluePos[2], 0.4, 0.2, 0.3, !flashRed ? [0.15, 0.55, 1, 1] : [0.05, 0.1, 0.3, 1]);
    }

    // Headlights
    const hlCol = [1.0, 0.96, 0.85, 1];
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

    let shirtCol = [0.32, 0.52, 0.82, 1];
    let pantsCol = [0.16, 0.18, 0.25, 1];
    let skinCol = [0.92, 0.76, 0.64, 1];

    if (type === 'player') {
      shirtCol = [0.18, 0.18, 0.22, 1]; // Rook's dark jacket
      pantsCol = [0.22, 0.34, 0.50, 1]; // Denim blue jeans
    } else if (type === 'police') {
      shirtCol = [0.12, 0.18, 0.32, 1]; // Metro Police navy
      pantsCol = [0.12, 0.15, 0.22, 1];
    } else if (type === 'syndicate') {
      shirtCol = [0.48, 0.16, 0.48, 1]; // Syndicate purple
      pantsCol = [0.12, 0.12, 0.15, 1];
    } else if (char.outfit) {
      shirtCol = [...char.outfit.shirt, 1];
      pantsCol = [...char.outfit.pants, 1];
    }

    // Walking animation stride
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

    // Weapon in hand
    if (type === 'player' || type === 'police' || type === 'syndicate') {
      const gunX = x + sinA * 0.45 + cosA * 0.25;
      const gunZ = z + cosA * 0.45 - sinA * 0.25;
      this.pushDynamicBox(gunX, y + 1.05, gunZ, 0.12, 0.15, 0.55, [0.15, 0.15, 0.18, 1]);
    }
  }

  drawHelicopter(heli) {
    if (!heli) return;
    const x = heli.x, y = heli.y, z = heli.z;
    const bodyCol = [0.16, 0.19, 0.26, 1];
    const glassCol = [0.22, 0.42, 0.64, 1];

    this.pushDynamicBox(x, y, z, 2.2, 1.8, 4.6, bodyCol);
    this.pushDynamicBox(x, y + 0.2, z + 1.8, 1.8, 1.2, 1.2, glassCol);
    this.pushDynamicBox(x, y + 0.4, z - 4.2, 0.5, 0.5, 5.0, bodyCol);

    // Rotor
    const rAngle = heli.rotorAngle || 0;
    const rSin = Math.sin(rAngle);
    const rCos = Math.cos(rAngle);
    const bladeLen = 6.2;
    const p1 = [x - rCos * bladeLen, y + 1.2, z + rSin * bladeLen];
    const p2 = [x + rCos * bladeLen, y + 1.2, z - rSin * bladeLen];
    const p3 = [x + rCos * bladeLen, y + 1.2, z - rSin * bladeLen + 0.3];
    const p4 = [x - rCos * bladeLen, y + 1.2, z + rSin * bladeLen + 0.3];
    this.pushDynamicQuad(p1, p2, p3, p4, [0, 1, 0], [0.2, 0.2, 0.22, 1]);

    // Searchlight beam ground pool
    const spotX = heli.spotlightX;
    const spotZ = heli.spotlightZ;
    const spotRadius = 7.5;
    this.pushDynamicBox(spotX, 0.1, spotZ, spotRadius * 2, 0.1, spotRadius * 2, [1.0, 1.0, 0.85, 0.65]);
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

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(this.fogColor[0], this.fogColor[1], this.fogColor[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    gl.useProgram(this.program);

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
    gl.uniform3fv(this.uniforms.skyZenith, this.skyZenith);
    gl.uniform3fv(this.uniforms.skyHorizon, this.skyHorizon);
    gl.uniform3fv(this.uniforms.ambientSky, this.ambientSky);
    gl.uniform3fv(this.uniforms.ambientGround, this.ambientGround);
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

    // 1. Draw static world (Sky dome, roads, markings, buildings, furniture)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.staticVbo);
    this.setupVertexAttribPointers();
    gl.drawArrays(gl.TRIANGLES, 0, this.staticVertexCount);

    // 2. Draw dynamic entities
    this.beginDynamic();

    for (const v of traffic.vehicles) {
      if (v === player.vehicle && player.inVehicle) continue;
      this.drawVehicle(v);
    }

    if (player.inVehicle && player.vehicle) {
      this.drawVehicle(player.vehicle);
    }

    for (const c of police.cruisers) {
      this.drawVehicle(c);
    }

    if (!player.inVehicle) {
      this.drawCharacter(player, 'player');
    }

    for (const p of pedestrians.pedestrians) {
      if (p.alive) {
        this.drawCharacter(p, 'ped');
      }
    }

    for (const o of police.officers) {
      if (o.alive) {
        this.drawCharacter(o, 'police');
      }
    }

    for (const e of missions.enemies) {
      if (e.alive) {
        this.drawCharacter(e, 'syndicate');
      }
    }

    if (police.helicopter) {
      this.drawHelicopter(police.helicopter);
    }

    this.drawParticles(particleList);

    if (this.dynamicVertCount > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamicVbo);
      gl.bufferData(gl.ARRAY_BUFFER, this.dynamicBuffer.subarray(0, this.dynamicVertCount * 10), gl.DYNAMIC_DRAW);
      this.setupVertexAttribPointers();
      gl.drawArrays(gl.TRIANGLES, 0, this.dynamicVertCount);
    }
  }

  setupVertexAttribPointers() {
    const gl = this.gl;
    const stride = 10 * 4;
    gl.enableVertexAttribArray(this.attribs.position);
    gl.vertexAttribPointer(this.attribs.position, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(this.attribs.normal);
    gl.vertexAttribPointer(this.attribs.normal, 3, gl.FLOAT, false, stride, 3 * 4);

    gl.enableVertexAttribArray(this.attribs.color);
    gl.vertexAttribPointer(this.attribs.color, 4, gl.FLOAT, false, stride, 6 * 4);
  }
}
