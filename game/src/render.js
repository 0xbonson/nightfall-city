// High-Performance Pure WebGL 3D Renderer for Nightfall City (Vela Bay)
// Features warm late-afternoon sunlight, atmospheric sky dome with sun disc & glare,
// horizon-blended distance fog, ocean sun reflections, varied architectural facades,
// setback skyscraper tiers, crowns, plant rooms, gantry cranes, street furniture,
// parked vehicles, harbour birds, and character ground shadows.

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

    // Buffer for dynamic geometry (vehicles, characters, particles, helicopter, birds, shadows)
    this.maxDynamicVerts = 65536;
    this.dynamicBuffer = new Float32Array(this.maxDynamicVerts * 10); // pos(3), norm(3), col(4)
    this.dynamicVertCount = 0;

    // Atmospheric daylight lighting parameters
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

          // Brilliant warm sun disc and soft atmospheric glare corona
          float sunDisc = pow(sunDot, 550.0) * 3.6;
          float sunGlare = pow(sunDot, 14.0) * 0.45 + pow(sunDot, 40.0) * 0.75;
          vec3 skyOutput = v_color.rgb + u_sunColor * (sunDisc + sunGlare);

          gl_FragColor = vec4(skyOutput, 1.0);
          return;
        }

        vec3 norm = normalize(v_normal);
        vec3 sunD = normalize(u_sunDir);

        // Directional warm sunlight (near 1.0, 0.93, 0.80)
        float diff = max(dot(norm, sunD), 0.0);
        vec3 diffuse = u_sunColor * diff * 0.96;

        // Soft hemisphere ambient: cool sky light from above, warm earth bounce from below
        float hemi = norm.y * 0.5 + 0.5;
        vec3 ambient = mix(u_ambientGround, u_ambientSky, hemi);

        // Specular highlight for metallic/glass surfaces & ocean glint
        vec3 viewDir = normalize(u_camPos - v_worldPos);
        vec3 halfDir = normalize(sunD + viewDir);
        float specPower = (v_worldPos.y < 0.05 && norm.y > 0.8) ? 80.0 : 28.0;
        float specIntensity = (v_worldPos.y < 0.05 && norm.y > 0.8) ? 0.85 : 0.32;
        float spec = pow(max(dot(norm, halfDir), 0.0), specPower) * specIntensity;

        // Extra ocean glint reflection along sun path
        if (v_worldPos.y < 0.05 && norm.y > 0.8) {
          float oceanGlow = pow(max(dot(norm, halfDir), 0.0), 12.0) * 0.35;
          diffuse += u_sunColor * oceanGlow;
        }

        // Combined surface lighting
        vec3 lightedColor = v_color.rgb * (ambient + diffuse) + u_sunColor * spec;

        // Police Siren Light bounce (smooth falloff)
        float sirenDist = length(v_worldPos - u_camPos);
        if (sirenDist < 60.0 && length(u_sirenLight) > 0.1) {
          float sFactor = (1.0 - sirenDist / 60.0) * 0.28;
          lightedColor += u_sirenLight * sFactor;
        }

        // Distance Fog fading smoothly into horizon color rather than a flat wash
        float dist = length(v_worldPos - u_camPos);
        float fogFactor = clamp((dist - 75.0) / 370.0, 0.0, 1.0);
        float fogCurve = fogFactor * fogFactor * (3.0 - 2.0 * fogFactor);
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

      // Top (Y+)
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
    // 1. ATMOSPHERIC SKY DOME (Strong gradient: pale hot horizon -> deep blue zenith)
    // =========================================================================
    const skyRadius = 480;
    const skySegments = 32;
    const unlitNorm = [0, 0, 0];
    const zenithCol = [...this.skyZenith, 1.0];
    const midSkyCol = [0.38, 0.62, 0.88, 1.0];
    const horizonCol = [...this.skyHorizon, 1.0];
    const warmSunHaze = [0.98, 0.90, 0.78, 1.0];

    for (let i = 0; i < skySegments; i++) {
      const a1 = (i / skySegments) * Math.PI * 2;
      const a2 = ((i + 1) / skySegments) * Math.PI * 2;
      const x1 = Math.sin(a1) * skyRadius, z1 = Math.cos(a1) * skyRadius;
      const x2 = Math.sin(a2) * skyRadius, z2 = Math.cos(a2) * skyRadius;

      // Sub-horizon band (-20 to +15)
      pushQuadGrad(
        [x1, -25, z1], [x2, -25, z2], [x2, 20, z2], [x1, 20, z1],
        unlitNorm, horizonCol, horizonCol, warmSunHaze, warmSunHaze
      );
      // Lower sky band (+20 to +95)
      pushQuadGrad(
        [x1, 20, z1], [x2, 20, z2], [x2, 95, z2], [x1, 95, z1],
        unlitNorm, warmSunHaze, warmSunHaze, midSkyCol, midSkyCol
      );
      // Upper dome band (+95 to +260)
      pushQuadGrad(
        [x1, 95, z1], [x2, 95, z2], [x2, 260, z2], [x1, 260, z1],
        unlitNorm, midSkyCol, midSkyCol, zenithCol, zenithCol
      );
      // Zenith cap (+260 to +380)
      pushQuadGrad(
        [x1, 260, z1], [x2, 260, z2], [0, 380, 0], [0, 380, 0],
        unlitNorm, zenithCol, zenithCol, zenithCol, zenithCol
      );
    }

    // =========================================================================
    // 2. BASE GROUND, COASTAL WATERS & BEACH
    // =========================================================================
    // City Ground Bed (warm light stone base)
    pushQuad([-280, 0, -280], [-280, 0, 280], [280, 0, 280], [280, 0, -280], [0, 1, 0], [0.68, 0.67, 0.64, 1]);

    // Coastal Ocean Water Surface (Turquoise coastal waters with sun glint)
    const oceanCol = [0.12, 0.48, 0.75, 1];
    pushQuad([-290, -0.2, 222], [-290, -0.2, 420], [320, -0.2, 420], [320, -0.2, 222], [0, 1, 0], oceanCol);
    pushQuad([-420, -0.2, -290], [-420, -0.2, 420], [-222, -0.2, 420], [-222, -0.2, -290], [0, 1, 0], oceanCol);

    // Ocean Sun Glint / Wave Crest Strips (glittering reflections in the afternoon sun)
    const waveHighlightCol = [0.85, 0.94, 1.0, 0.75];
    for (let wz = 226; wz <= 360; wz += 14) {
      pushQuad([-220, -0.15, wz], [-220, -0.15, wz + 1.2], [180, -0.15, wz + 1.2], [180, -0.15, wz], [0, 1, 0], waveHighlightCol);
    }

    // Coastal Surf Foam Wave Edge meeting Beach
    const foamCol = [0.96, 0.98, 1.0, 1];
    pushQuad([-240, 0.02, 220], [-240, 0.02, 224], [50, 0.02, 224], [50, 0.02, 220], [0, 1, 0], foamCol);

    // Sandy Beach (warm golden sand)
    const sandCol = [...CONFIG.surfaces.sand];
    pushQuad([-240, 0.04, 186], [-240, 0.04, 230], [50, 0.04, 230], [50, 0.04, 186], [0, 1, 0], sandCol);

    // Ocean Promenade Wooden Boardwalk & Railings
    const boardPlankCol = [...CONFIG.surfaces.boardwalk];
    const boardRailCol = [0.82, 0.70, 0.52, 1];
    pushBox(-95, 0.12, 190, 270, 0.16, 8.5, boardPlankCol, boardPlankCol);
    pushBox(-95, 0.75, 185.8, 270, 0.10, 0.14, boardRailCol);
    pushBox(-95, 0.75, 194.2, 270, 0.10, 0.14, boardRailCol);

    // =========================================================================
    // 3. ROADS, RAISED KERBSTONES, SIDEWALKS & MARKINGS
    // =========================================================================
    const asphaltCol = [...CONFIG.surfaces.asphalt]; // Warm grey rather than blue-black
    const kerbCol = [...CONFIG.surfaces.kerb];
    const sidewalkCol = [...CONFIG.surfaces.sidewalk];
    const stripeCol = [...CONFIG.surfaces.centerline];
    const whiteLineCol = [...CONFIG.surfaces.laneWhite];

    const grid = CONFIG.world.roadGrid;

    for (const r of world.roads) {
      const hw = r.width / 2;
      const x0 = Math.min(r.x1, r.x2) - (r.x1 === r.x2 ? hw : 0);
      const x1 = Math.max(r.x1, r.x2) + (r.x1 === r.x2 ? hw : 0);
      const z0 = Math.min(r.z1, r.z2) - (r.z1 === r.z2 ? hw : 0);
      const z1 = Math.max(r.z1, r.z2) + (r.z1 === r.z2 ? hw : 0);

      // Asphalt Road Bed (Warm Grey)
      pushQuad([x0, 0.06, z0], [x0, 0.06, z1], [x1, 0.06, z1], [x1, 0.06, z0], [0, 1, 0], asphaltCol);

      // Sidewalks & Raised Kerbstones along Road Edges
      const sw = 4.2;
      const curbH = 0.16;

      if (r.x1 === r.x2) {
        // Vertical Road (North-South): Left & Right sidewalks and kerbs
        // Left sidewalk
        pushBox(r.x1 - hw - sw / 2, 0, (z0 + z1) / 2, sw, curbH, z1 - z0, sidewalkCol, sidewalkCol);
        // Left raised kerbstone
        pushBox(r.x1 - hw - 0.12, 0, (z0 + z1) / 2, 0.24, curbH + 0.03, z1 - z0, kerbCol);

        // Right sidewalk
        pushBox(r.x1 + hw + sw / 2, 0, (z0 + z1) / 2, sw, curbH, z1 - z0, sidewalkCol, sidewalkCol);
        // Right raised kerbstone
        pushBox(r.x1 + hw + 0.12, 0, (z0 + z1) / 2, 0.24, curbH + 0.03, z1 - z0, kerbCol);

        // Centerline (Double yellow on major avenue, single on normal)
        if (r.isMajor) {
          pushQuad([r.x1 - 0.38, 0.09, z0], [r.x1 - 0.38, 0.09, z1], [r.x1 - 0.14, 0.09, z1], [r.x1 - 0.14, 0.09, z0], [0, 1, 0], stripeCol);
          pushQuad([r.x1 + 0.14, 0.09, z0], [r.x1 + 0.14, 0.09, z1], [r.x1 + 0.38, 0.09, z1], [r.x1 + 0.38, 0.09, z0], [0, 1, 0], stripeCol);
        } else {
          pushQuad([r.x1 - 0.20, 0.09, z0], [r.x1 - 0.20, 0.09, z1], [r.x1 + 0.20, 0.09, z1], [r.x1 + 0.20, 0.09, z0], [0, 1, 0], stripeCol);
        }

        // White edge lines & dashed lane dividers
        for (let segZ = -250; segZ <= 250; segZ += 10) {
          pushQuad([r.x1 - hw * 0.5 - 0.12, 0.09, segZ], [r.x1 - hw * 0.5 - 0.12, 0.09, segZ + 5.5], [r.x1 - hw * 0.5 + 0.12, 0.09, segZ + 5.5], [r.x1 - hw * 0.5 + 0.12, 0.09, segZ], [0, 1, 0], whiteLineCol);
          pushQuad([r.x1 + hw * 0.5 - 0.12, 0.09, segZ], [r.x1 + hw * 0.5 - 0.12, 0.09, segZ + 5.5], [r.x1 + hw * 0.5 + 0.12, 0.09, segZ + 5.5], [r.x1 + hw * 0.5 + 0.12, 0.09, segZ], [0, 1, 0], whiteLineCol);
        }
      } else {
        // Horizontal Road (East-West)
        pushBox((x0 + x1) / 2, 0, r.z1 - hw - sw / 2, x1 - x0, curbH, sw, sidewalkCol, sidewalkCol);
        pushBox((x0 + x1) / 2, 0, r.z1 - hw - 0.12, x1 - x0, curbH + 0.03, 0.24, kerbCol);

        pushBox((x0 + x1) / 2, 0, r.z1 + hw + sw / 2, x1 - x0, curbH, sw, sidewalkCol, sidewalkCol);
        pushBox((x0 + x1) / 2, 0, r.z1 + hw + 0.12, x1 - x0, curbH + 0.03, 0.24, kerbCol);

        // Centerline
        if (r.isMajor) {
          pushQuad([x0, 0.09, r.z1 - 0.38], [x0, 0.09, r.z1 - 0.14], [x1, 0.09, r.z1 - 0.14], [x1, 0.09, r.z1 - 0.38], [0, 1, 0], stripeCol);
          pushQuad([x0, 0.09, r.z1 + 0.14], [x0, 0.09, r.z1 + 0.38], [x1, 0.09, r.z1 + 0.38], [x1, 0.09, r.z1 + 0.14], [0, 1, 0], stripeCol);
        } else {
          pushQuad([x0, 0.09, r.z1 - 0.20], [x0, 0.09, r.z1 + 0.20], [x1, 0.09, r.z1 + 0.20], [x1, 0.09, r.z1 - 0.20], [0, 1, 0], stripeCol);
        }

        // Dashed lane dividers
        for (let segX = -250; segX <= 250; segX += 10) {
          pushQuad([segX, 0.09, r.z1 - hw * 0.5 - 0.12], [segX, 0.09, r.z1 - hw * 0.5 + 0.12], [segX + 5.5, 0.09, r.z1 - hw * 0.5 + 0.12], [segX + 5.5, 0.09, r.z1 - hw * 0.5 - 0.12], [0, 1, 0], whiteLineCol);
          pushQuad([segX, 0.09, r.z1 + hw * 0.5 - 0.12], [segX, 0.09, r.z1 + hw * 0.5 + 0.12], [segX + 5.5, 0.09, r.z1 + hw * 0.5 + 0.12], [segX + 5.5, 0.09, r.z1 + hw * 0.5 - 0.12], [0, 1, 0], whiteLineCol);
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
          pushQuad([gx + stripe - 0.42, 0.1, gz - offset - 1.2], [gx + stripe - 0.42, 0.1, gz - offset + 1.2], [gx + stripe + 0.42, 0.1, gz - offset + 1.2], [gx + stripe + 0.42, 0.1, gz - offset - 1.2], [0, 1, 0], whiteLineCol);
          pushQuad([gx + stripe - 0.42, 0.1, gz + offset - 1.2], [gx + stripe - 0.42, 0.1, gz + offset + 1.2], [gx + stripe + 0.42, 0.1, gz + offset + 1.2], [gx + stripe + 0.42, 0.1, gz + offset - 1.2], [0, 1, 0], whiteLineCol);
        }
        // North & South solid white stop lines
        pushQuad([gx - roadW / 2 + 0.4, 0.1, gz - stopOffset - 0.3], [gx - roadW / 2 + 0.4, 0.1, gz - stopOffset + 0.3], [gx + roadW / 2 - 0.4, 0.1, gz - stopOffset + 0.3], [gx + roadW / 2 - 0.4, 0.1, gz - stopOffset - 0.3], [0, 1, 0], whiteLineCol);
        pushQuad([gx - roadW / 2 + 0.4, 0.1, gz + stopOffset - 0.3], [gx - roadW / 2 + 0.4, 0.1, gz + stopOffset + 0.3], [gx + roadW / 2 - 0.4, 0.1, gz + stopOffset + 0.3], [gx + roadW / 2 - 0.4, 0.1, gz + stopOffset - 0.3], [0, 1, 0], whiteLineCol);

        // East & West zebra crossings
        for (let stripe = -roadW / 2 + 1; stripe <= roadW / 2 - 1; stripe += 1.8) {
          pushQuad([gx - offset - 1.2, 0.1, gz + stripe - 0.42], [gx - offset + 1.2, 0.1, gz + stripe - 0.42], [gx - offset + 1.2, 0.1, gz + stripe + 0.42], [gx - offset - 1.2, 0.1, gz + stripe + 0.42], [0, 1, 0], whiteLineCol);
          pushQuad([gx + offset - 1.2, 0.1, gz + stripe - 0.42], [gx + offset + 1.2, 0.1, gz + stripe - 0.42], [gx + offset + 1.2, 0.1, gz + stripe + 0.42], [gx + offset - 1.2, 0.1, gz + stripe + 0.42], [0, 1, 0], whiteLineCol);
        }
        // East & West solid white stop lines
        pushQuad([gx - stopOffset - 0.3, 0.1, gz - roadW / 2 + 0.4], [gx - stopOffset + 0.3, 0.1, gz - roadW / 2 + 0.4], [gx - stopOffset + 0.3, 0.1, gz + roadW / 2 - 0.4], [gx - stopOffset - 0.3, 0.1, gz + roadW / 2 - 0.4], [0, 1, 0], whiteLineCol);
        pushQuad([gx + stopOffset - 0.3, 0.1, gz - roadW / 2 + 0.4], [gx + stopOffset + 0.3, 0.1, gz - roadW / 2 + 0.4], [gx + stopOffset + 0.3, 0.1, gz + roadW / 2 - 0.4], [gx + stopOffset - 0.3, 0.1, gz + roadW / 2 - 0.4], [0, 1, 0], whiteLineCol);
      }
    }

    // =========================================================================
    // 4. ARCHITECTURAL CITY BUILDINGS (Facades, Setbacks, Crowns, Storefronts)
    // =========================================================================
    for (const b of world.buildings) {
      const { x, z, w, d, h, type, color, roofColor, details } = b;

      // Deterministic slight surface color variation so district doesn't read as one color
      const hash = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
      const tint = ((hash - Math.floor(hash)) - 0.5) * 0.08;
      const bCol = [
        Math.max(0.05, Math.min(0.98, color[0] + tint)),
        Math.max(0.05, Math.min(0.98, color[1] + tint * 0.8)),
        Math.max(0.05, Math.min(0.98, color[2] + tint * 0.6)),
        1.0
      ];
      const rCol = [...(roofColor || [0.22, 0.22, 0.25]), 1.0];

      // Taller Ground Floor Storefront Plinth (4.8m tall) with distinct finish
      const plinthH = 4.8;
      const plinthCol = [...(details.storefrontColor || [bCol[0] * 0.72, bCol[1] * 0.72, bCol[2] * 0.72]), 1.0];
      pushBox(x, 0, z, w, plinthH, d, plinthCol);

      // Large Storefront Glass Display Windows
      const glassCol = [0.18, 0.28, 0.38, 1.0];
      pushBox(x, 0.9, z + d / 2 + 0.06, w * 0.85, 3.0, 0.16, glassCol);
      pushBox(x, 0.9, z - d / 2 - 0.06, w * 0.85, 3.0, 0.16, glassCol);
      pushBox(x + w / 2 + 0.06, 0.9, z, 0.16, 3.0, d * 0.85, glassCol);
      pushBox(x - w / 2 - 0.06, 0.9, z, 0.16, 3.0, d * 0.85, glassCol);

      // Protruding District / Building Shopfront Signs
      if (details.shopSign) {
        const signCol = [...details.signColor, 1.0];
        const darkFrame = [0.15, 0.16, 0.18, 1.0];
        // Front sign over entrance
        pushBox(x, plinthH - 0.6, z + d / 2 + 0.28, w * 0.55, 0.8, 0.24, darkFrame);
        pushBox(x, plinthH - 0.6, z + d / 2 + 0.38, w * 0.50, 0.55, 0.08, signCol);
      }

      // Merchant Awnings over storefronts
      if (details.awnings) {
        const awnCol = (Math.abs(Math.floor(x + z)) % 2 === 0) ? [0.85, 0.22, 0.18, 1.0] : [0.18, 0.65, 0.40, 1.0];
        pushBox(x, plinthH - 0.2, z + d / 2 + 1.1, w * 0.88, 0.26, 2.2, awnCol);
        pushBox(x, plinthH - 0.2, z - d / 2 - 1.1, w * 0.88, 0.26, 2.2, awnCol);
      }

      // Multi-tier Setback Skyscraper Architecture
      if (details.setbacks && details.setbacks.length > 0) {
        let curY = plinthH;
        let curW = w;
        let curD = d;
        const winCol = [...(details.windowColor || [0.72, 0.86, 0.96]), 1.0];

        for (let i = 0; i < details.setbacks.length; i++) {
          const set = details.setbacks[i];
          const nextY = Math.min(h, set.height);
          const tierH = nextY - curY;

          // Main body of this tier
          pushBox(x, curY, z, curW, tierH, curD, bCol);

          // Window strips so facade reads clearly at a distance
          for (let wy = curY + 2.5; wy < nextY - 1.5; wy += 4.2) {
            pushBox(x, wy, z, curW + 0.14, 1.6, curD + 0.14, winCol);
          }

          // Setback cornice / terrace ledge
          pushBox(x, nextY, z, curW + 0.4, 0.6, curD + 0.4, [0.24, 0.26, 0.30, 1.0]);

          curY = nextY;
          curW *= set.insetRatio;
          curD *= set.insetRatio;
        }

        // Top tier to building height
        if (curY < h) {
          const topH = h - curY;
          pushBox(x, curY, z, curW, topH, curD, bCol, rCol);
          for (let wy = curY + 2.5; wy < h - 2.0; wy += 4.2) {
            pushBox(x, wy, z, curW + 0.14, 1.6, curD + 0.14, winCol);
          }
        }

        // Roof Parapet Rim
        pushBox(x, h, z, curW, 0.8, curD, [0.22, 0.24, 0.28, 1.0]);
        pushBox(x, h, z, curW - 1.2, 0.82, curD - 1.2, rCol);

        // Skyscraper Distinctive Crowns
        const crown = details.crown;
        if (crown === 'spire') {
          // Elegant tapered needle spire with red aircraft warning beacon
          pushBox(x, h + 0.8, z, 2.2, 4.0, 2.2, [0.4, 0.44, 0.5, 1.0]);
          pushBox(x, h + 4.8, z, 0.8, 16.0, 0.8, [0.88, 0.88, 0.92, 1.0]);
          pushBox(x, h + 20.8, z, 0.35, 6.0, 0.35, [1.0, 0.2, 0.2, 1.0]); // Red beacon
        } else if (crown === 'sloped_glass') {
          // Angled architectural glass crown slope
          pushBox(x, h + 0.8, z, curW * 0.75, 7.5, curD * 0.75, [0.65, 0.85, 0.98, 1.0]);
          pushBox(x, h + 8.3, z, curW * 0.45, 4.0, curD * 0.45, [0.85, 0.94, 1.0, 1.0]);
        } else if (crown === 'twin_fins') {
          // Twin illuminated skyline fins
          const finW = curW * 0.12;
          pushBox(x - curW * 0.38, h + 0.8, z, finW, 8.5, curD * 0.85, [0.85, 0.90, 0.96, 1.0]);
          pushBox(x + curW * 0.38, h + 0.8, z, finW, 8.5, curD * 0.85, [0.85, 0.90, 0.96, 1.0]);
        } else if (crown === 'ziggurat') {
          // Stepped art-deco ziggurat crown
          pushBox(x, h + 0.8, z, curW * 0.8, 3.5, curD * 0.8, [0.88, 0.82, 0.65, 1.0]);
          pushBox(x, h + 4.3, z, curW * 0.55, 3.0, curD * 0.55, [0.92, 0.86, 0.70, 1.0]);
          pushBox(x, h + 7.3, z, curW * 0.3, 2.5, curD * 0.3, [0.96, 0.90, 0.75, 1.0]);
        } else if (crown === 'helipad') {
          // Rooftop Helipad
          const hy = h + 0.85;
          pushBox(x, hy, z, 17, 0.08, 17, [0.26, 0.28, 0.32, 1.0]);
          pushBox(x, hy + 0.04, z, 15, 0.04, 15, [0.96, 0.82, 0.16, 1.0]);
          pushBox(x, hy + 0.06, z, 13, 0.04, 13, [0.26, 0.28, 0.32, 1.0]);
          // "H" marking
          pushBox(x - 2.8, hy + 0.08, z, 1.3, 0.04, 7.5, [0.96, 0.82, 0.16, 1.0]);
          pushBox(x + 2.8, hy + 0.08, z, 1.3, 0.04, 7.5, [0.96, 0.82, 0.16, 1.0]);
          pushBox(x, hy + 0.08, z, 4.3, 0.04, 1.3, [0.96, 0.82, 0.16, 1.0]);
        }
      } else {
        // Standard Building / Warehouse / Market Block
        pushBox(x, plinthH, z, w, h - plinthH, d, bCol, rCol);

        // Window strips
        const winBandCol = type === 'market' ? [0.26, 0.20, 0.16, 1.0] : [0.70, 0.84, 0.94, 1.0];
        const step = type === 'market' ? 3.4 : 4.8;
        for (let wy = plinthH + 2.4; wy < h - 2.5; wy += step) {
          pushBox(x, wy, z, w + 0.12, 1.4, d + 0.12, winBandCol);
        }

        // Terracotta pitched roof caps on Market buildings
        if (type === 'market') {
          pushBox(x, h, z, w + 0.6, 1.2, d + 0.6, [0.55, 0.22, 0.16, 1.0]);
          pushBox(x, h + 1.2, z, w * 0.7, 1.0, d * 0.7, [0.60, 0.25, 0.18, 1.0]);
        } else {
          // Roof parapet
          pushBox(x, h, z, w, 0.7, d, [0.25, 0.26, 0.28, 1.0]);
          pushBox(x, h, z, w - 1.0, 0.72, d - 1.0, rCol);
        }
      }

      // Rooftop Plant Rooms & Mechanical HVAC Penthouse
      if (details.plantRoom || h > 28) {
        const hvacCount = details.hvacCount || 2;
        // Central louvered elevator/plant room
        pushBox(x, h + 0.7, z, w * 0.35, 3.2, d * 0.35, [0.32, 0.34, 0.38, 1.0]);
        // Chillers and ventilation fans
        for (let k = 0; k < hvacCount; k++) {
          const hx = x + (k % 2 === 0 ? -w * 0.25 : w * 0.25);
          const hz = z + (k > 1 ? -d * 0.25 : d * 0.25);
          pushBox(hx, h + 0.7, hz, 3.6, 2.0, 3.6, [0.36, 0.39, 0.43, 1.0]);
          pushBox(hx, h + 2.7, hz, 2.0, 0.4, 2.0, [0.18, 0.20, 0.22, 1.0]); // Fan grille
        }
      }
    }

    // =========================================================================
    // 5. DISTANT LANDMARK SKYLINE TOWERS (Fills horizon with majestic silhouettes)
    // =========================================================================
    for (const lm of world.distantLandmarks) {
      const { x, z, w, d, h, crown, color, roof } = lm;
      const bCol = [...color, 1.0];
      const rCol = [...roof, 1.0];

      // Lower tower
      pushBox(x, 0, z, w, h * 0.65, d, bCol);
      // Window strips
      for (let wy = 8; wy < h * 0.65 - 4; wy += 5.5) {
        pushBox(x, wy, z, w + 0.2, 2.0, d + 0.2, [0.75, 0.88, 0.98, 1.0]);
      }
      // Upper setback
      const sw = w * 0.75, sd = d * 0.75;
      pushBox(x, h * 0.65, z, sw, h * 0.35, sd, bCol, rCol);
      for (let wy = h * 0.65 + 4; wy < h - 4; wy += 5.5) {
        pushBox(x, wy, z, sw + 0.2, 2.0, sd + 0.2, [0.75, 0.88, 0.98, 1.0]);
      }

      // Skyline Crown
      if (crown === 'spire') {
        pushBox(x, h, z, 3.0, 8.0, 3.0, [0.5, 0.54, 0.6, 1.0]);
        pushBox(x, h + 8.0, z, 1.0, 24.0, 1.0, [0.9, 0.9, 0.95, 1.0]);
        pushBox(x, h + 32.0, z, 0.5, 6.0, 0.5, [1.0, 0.2, 0.2, 1.0]);
      } else if (crown === 'twin_fins') {
        pushBox(x - sw * 0.35, h, z, 2.5, 14.0, sd * 0.8, [0.85, 0.90, 0.98, 1.0]);
        pushBox(x + sw * 0.35, h, z, 2.5, 14.0, sd * 0.8, [0.85, 0.90, 0.98, 1.0]);
      } else if (crown === 'lantern') {
        // Coastal Lighthouse
        pushBox(x, h, z, 8, 4.0, 8, [0.95, 0.95, 0.98, 1.0]);
        pushBox(x, h + 4.0, z, 6, 3.5, 6, [1.0, 0.95, 0.4, 1.0]); // Glass beacon room
        pushBox(x, h + 7.5, z, 7, 1.5, 7, [0.2, 0.2, 0.25, 1.0]); // Conical cap
      }
    }

    // =========================================================================
    // 6. PORT CONTAINER GANTRY CRANES (Meridian Docks)
    // =========================================================================
    for (const crane of world.gantryCranes) {
      const { x, y, z, height, boomLength, boomWidth, color } = crane;
      const craneCol = [...color, 1.0];
      const steelCol = [0.22, 0.24, 0.28, 1.0];

      // 4 Pylon Legs (A-frame gantry base)
      const legSpreadX = 14;
      const legSpreadZ = 12;
      pushBox(x - legSpreadX / 2, y, z - legSpreadZ / 2, 1.6, height, 1.6, craneCol);
      pushBox(x + legSpreadX / 2, y, z - legSpreadZ / 2, 1.6, height, 1.6, craneCol);
      pushBox(x - legSpreadX / 2, y, z + legSpreadZ / 2, 1.6, height, 1.6, craneCol);
      pushBox(x + legSpreadX / 2, y, z + legSpreadZ / 2, 1.6, height, 1.6, craneCol);

      // Horizontal cross braces
      pushBox(x, y + height * 0.45, z - legSpreadZ / 2, legSpreadX, 1.4, 1.4, craneCol);
      pushBox(x, y + height * 0.45, z + legSpreadZ / 2, legSpreadX, 1.4, 1.4, craneCol);
      pushBox(x - legSpreadX / 2, y + height * 0.45, z, 1.4, 1.4, legSpreadZ, craneCol);
      pushBox(x + legSpreadX / 2, y + height * 0.45, z, 1.4, 1.4, legSpreadZ, craneCol);

      // Top Gantry Deck / Machinery Housing
      pushBox(x, y + height, z, legSpreadX + 2, 3.5, legSpreadZ + 2, craneCol);
      pushBox(x - 2, y + height + 3.5, z, 7, 4.0, 6, steelCol); // Engine housing

      // Horizontal Lattice Boom reaching out over the water (Z+)
      pushBox(x, y + height + 1.2, z + boomLength / 2, boomWidth, 2.2, boomLength, craneCol);
      // Back Counterweight Boom (Z-)
      pushBox(x, y + height + 1.2, z - 8, boomWidth, 2.2, 16, craneCol);
      pushBox(x, y + height + 2.0, z - 14, 4.8, 3.5, 4.5, [0.3, 0.32, 0.35, 1.0]); // Heavy counterweight

      // Cable Hoist Trolley & Container Spreader
      pushBox(x, y + height - 0.5, z + 16, 3.0, 1.2, 3.0, steelCol);
      pushBox(x, y + 10, z + 16, 6.2, 1.5, 2.8, [0.95, 0.82, 0.16, 1.0]); // Spreader frame
      // Hoist cables
      pushBox(x - 1.2, y + 10, z + 16, 0.08, height - 10, 0.08, steelCol);
      pushBox(x + 1.2, y + 10, z + 16, 0.08, height - 10, 0.08, steelCol);
    }

    // =========================================================================
    // 7. SHIPPING CONTAINER STACKS
    // =========================================================================
    for (const c of world.containerStacks) {
      pushBox(c.x, c.y, c.z, c.w, c.h, c.d, [...c.color, 1.0], [c.color[0] * 0.78, c.color[1] * 0.78, c.color[2] * 0.78, 1.0]);
      // Container edge castings & corner posts
      pushBox(c.x, c.y, c.z, c.w + 0.1, c.h + 0.04, 0.22, [0.22, 0.24, 0.26, 1.0]);
      pushBox(c.x, c.y, c.z, 0.22, c.h + 0.04, c.d + 0.1, [0.22, 0.24, 0.26, 1.0]);
    }

    // =========================================================================
    // 8. STREET FURNITURE & PROPS (Lamps, Lights, Benches, Bins, Shelters)
    // =========================================================================
    const metalPoleCol = [0.22, 0.24, 0.26, 1.0];
    const lampGlowCol = [1.0, 0.95, 0.82, 1.0];
    const benchWoodCol = [0.55, 0.34, 0.20, 1.0];
    const binCol = [0.26, 0.35, 0.32, 1.0];
    const planterCol = [0.72, 0.70, 0.68, 1.0];
    const foliageCol = [0.18, 0.58, 0.24, 1.0];

    for (const p of world.props) {
      if (p.type === 'lamp') {
        // Vertical post
        pushBox(p.x, 0.16, p.z, 0.24, 6.4, 0.24, metalPoleCol);
        // Horizontal top arm
        const armDir = p.rotation === 0 ? 1 : -1;
        pushBox(p.x + armDir * 0.7, 6.4, p.z, 1.4, 0.18, 0.18, metalPoleCol);
        pushBox(p.x + armDir * 1.35, 6.2, p.z, 0.5, 0.25, 0.38, lampGlowCol);
        // Double-headed luminaire if near major central avenue (x=0 or z=0)
        if (Math.abs(p.x) < 22 || Math.abs(p.z) < 22) {
          pushBox(p.x - armDir * 0.7, 6.4, p.z, 1.4, 0.18, 0.18, metalPoleCol);
          pushBox(p.x - armDir * 1.35, 6.2, p.z, 0.5, 0.25, 0.38, lampGlowCol);
        }
      } else if (p.type === 'traffic_light') {
        // Traffic light post
        pushBox(p.x, 0.16, p.z, 0.28, 5.8, 0.28, [0.18, 0.18, 0.20, 1.0]);
        // Signal housing
        pushBox(p.x, 4.4, p.z, 0.44, 1.5, 0.44, [0.14, 0.14, 0.16, 1.0]);
        // Red, Amber, Green light lenses with visor hoods
        pushBox(p.x, 4.85, p.z, 0.48, 0.32, 0.48, [0.95, 0.15, 0.10, 1.0]);
        pushBox(p.x, 5.0, p.z, 0.54, 0.08, 0.54, [0.12, 0.12, 0.14, 1.0]); // Visor hood
        pushBox(p.x, 4.4, p.z, 0.48, 0.32, 0.48, [0.95, 0.75, 0.10, 1.0]);
        pushBox(p.x, 4.55, p.z, 0.54, 0.08, 0.54, [0.12, 0.12, 0.14, 1.0]);
        pushBox(p.x, 3.95, p.z, 0.48, 0.32, 0.48, [0.10, 0.85, 0.25, 1.0]);
        pushBox(p.x, 4.1, p.z, 0.54, 0.08, 0.54, [0.12, 0.12, 0.14, 1.0]);
      } else if (p.type === 'bench') {
        // Wooden park bench
        pushBox(p.x, 0.16, p.z, 0.85, 0.5, 2.2, benchWoodCol);
        // Bench backrest
        pushBox(p.x - 0.34, 0.65, p.z, 0.16, 0.5, 2.2, benchWoodCol);
        // Metal bench legs
        pushBox(p.x, 0.16, p.z - 0.9, 0.86, 0.48, 0.12, metalPoleCol);
        pushBox(p.x, 0.16, p.z + 0.9, 0.86, 0.48, 0.12, metalPoleCol);
      } else if (p.type === 'bin') {
        // Sidewalk municipal trash can
        pushBox(p.x, 0.16, p.z, 0.65, 0.95, 0.65, binCol);
        pushBox(p.x, 1.1, p.z, 0.72, 0.12, 0.72, metalPoleCol);
      } else if (p.type === 'planter') {
        // Concrete street planter with green foliage
        pushBox(p.x, 0.16, p.z, 1.4, 0.65, 2.4, planterCol);
        pushBox(p.x, 0.75, p.z, 1.2, 0.85, 2.2, foliageCol);
        pushBox(p.x, 1.5, p.z, 0.8, 0.25, 1.6, [0.95, 0.35, 0.65, 1.0]); // Flowering blossoms
      } else if (p.type === 'bus_shelter') {
        // Modern glass bus shelter
        pushBox(p.x, 0.16, p.z, 2.2, 2.8, 4.2, [0.2, 0.22, 0.25, 1.0]);
        pushBox(p.x + 0.9, 0.16, p.z, 0.12, 2.7, 4.0, [0.72, 0.86, 0.96, 0.7]); // Glass wall
        pushBox(p.x, 2.85, p.z, 2.4, 0.15, 4.4, [0.25, 0.28, 0.32, 1.0]); // Roof canopy
        // Shelter bench
        pushBox(p.x, 0.16, p.z, 0.6, 0.48, 2.4, benchWoodCol);
        // Illuminated transit advertising poster
        pushBox(p.x - 0.9, 0.8, p.z, 0.12, 1.8, 1.2, [0.95, 0.85, 0.2, 1.0]);
      } else if (p.type === 'bollard') {
        // Steel sidewalk bollard
        pushBox(p.x, 0.16, p.z, 0.35, 0.85, 0.35, [0.24, 0.26, 0.30, 1.0]);
        pushBox(p.x, 0.95, p.z, 0.38, 0.10, 0.38, [0.96, 0.82, 0.16, 1.0]); // Reflective collar
      } else if (p.type === 'newsstand') {
        // Newspaper vending boxes
        pushBox(p.x, 0.16, p.z, 0.75, 1.2, 0.65, [0.18, 0.42, 0.75, 1.0]);
        pushBox(p.x, 0.75, p.z + 0.3, 0.55, 0.35, 0.1, [0.90, 0.92, 0.95, 1.0]); // Paper window
        pushBox(p.x, 0.16, p.z + 0.8, 0.75, 1.2, 0.65, [0.85, 0.22, 0.18, 1.0]);
      } else if (p.type === 'phonebox') {
        // Classic coastal payphone pedestal
        pushBox(p.x, 0.16, p.z, 0.55, 1.85, 0.55, [0.28, 0.32, 0.38, 1.0]);
        pushBox(p.x, 1.15, p.z, 0.45, 0.55, 0.45, [0.15, 0.55, 0.85, 1.0]);
      } else if (p.type === 'hydrant') {
        // Fire hydrant
        pushBox(p.x, 0.16, p.z, 0.36, 0.75, 0.36, [0.92, 0.18, 0.15, 1.0]);
        pushBox(p.x, 0.60, p.z, 0.50, 0.22, 0.50, [0.78, 0.80, 0.82, 1.0]);
      } else if (p.type === 'manhole') {
        // Cast iron manhole cover in road
        pushBox(p.x, 0.08, p.z, 1.4, 0.02, 1.4, [0.22, 0.22, 0.24, 1.0]);
        pushBox(p.x, 0.09, p.z, 1.1, 0.02, 1.1, [0.26, 0.26, 0.28, 1.0]);
      } else if (p.type === 'drain') {
        // Kerbside storm drain slotted grate
        pushBox(p.x, 0.08, p.z, 0.9, 0.02, 1.6, [0.16, 0.16, 0.18, 1.0]);
        pushBox(p.x, 0.09, p.z, 0.7, 0.02, 1.3, [0.24, 0.24, 0.26, 1.0]);
      }
    }

    // =========================================================================
    // 9. COASTAL PALM TREES
    // =========================================================================
    const trunkCol = [0.44, 0.30, 0.20, 1.0];
    const frondCol = [0.18, 0.62, 0.26, 1.0];
    for (const t of world.palmTrees) {
      const th = 8.5 * t.scale;
      // Ringed trunk
      pushBox(t.x, 0, t.z, 0.75 * t.scale, th, 0.75 * t.scale, trunkCol);
      // Main palm canopy fronds (8-point star canopy)
      pushBox(t.x, th, t.z, 6.0 * t.scale, 0.6 * t.scale, 6.0 * t.scale, frondCol);
      pushBox(t.x, th + 0.35, t.z, 4.2 * t.scale, 0.5 * t.scale, 4.2 * t.scale, [0.22, 0.72, 0.32, 1.0]);
      pushBox(t.x, th + 0.70, t.z, 2.4 * t.scale, 0.4 * t.scale, 2.4 * t.scale, [0.28, 0.82, 0.38, 1.0]);
    }

    // =========================================================================
    // 10. PARKED CARS ALONG KERBS
    // =========================================================================
    for (const pc of world.parkedCars) {
      const sinA = Math.sin(pc.angle);
      const cosA = Math.cos(pc.angle);
      const toWorld = (lx, ly, lz) => [
        pc.x + lx * cosA + lz * sinA,
        pc.y || 0 + ly,
        pc.z - lx * sinA + lz * cosA
      ];

      const bodyCol = [...pc.color, 1.0];
      const glassCol = [0.18, 0.28, 0.40, 1.0];
      const wheelCol = [0.12, 0.12, 0.14, 1.0];

      // Chassis
      const p1 = toWorld(-1.0, 0.3, -2.3);
      const p2 = toWorld(1.0, 0.3, -2.3);
      const p3 = toWorld(1.0, 1.15, -2.3);
      const p4 = toWorld(-1.0, 1.15, -2.3);
      const p5 = toWorld(-1.0, 0.3, 2.3);
      const p6 = toWorld(1.0, 0.3, 2.3);
      const p7 = toWorld(1.0, 1.15, 2.3);
      const p8 = toWorld(-1.0, 1.15, 2.3);

      pushQuad(p4, p3, p7, p8, [0, 1, 0], bodyCol);
      pushQuad(p5, p6, p7, p8, [sinA, 0, cosA], bodyCol);
      pushQuad(p2, p1, p4, p3, [-sinA, 0, -cosA], bodyCol);
      pushQuad(p1, p5, p8, p4, [-cosA, 0, sinA], bodyCol);
      pushQuad(p6, p2, p3, p7, [cosA, 0, -sinA], bodyCol);

      // Cabin / Glass
      const cp1 = toWorld(-0.85, 1.15, -1.0);
      const cp2 = toWorld(0.85, 1.15, -1.0);
      const cp3 = toWorld(0.85, 1.80, -0.7);
      const cp4 = toWorld(-0.85, 1.80, -0.7);
      const cp5 = toWorld(-0.85, 1.15, 0.9);
      const cp6 = toWorld(0.85, 1.15, 0.9);
      const cp7 = toWorld(0.85, 1.80, 0.4);
      const cp8 = toWorld(-0.85, 1.80, 0.4);

      pushQuad(cp4, cp3, cp7, cp8, [0, 1, 0], [0.15, 0.16, 0.18, 1.0]);
      pushQuad(cp8, cp7, cp6, cp5, [sinA, 0.4, cosA], glassCol);
      pushQuad(cp2, cp1, cp4, cp3, [-sinA, 0.4, -cosA], glassCol);
      pushQuad(cp1, cp5, cp8, cp4, [-cosA, 0, sinA], glassCol);
      pushQuad(cp6, cp2, cp3, cp7, [cosA, 0, -sinA], glassCol);

      // Wheels
      const wPos = [[-1.05, 0.3, 1.3], [1.05, 0.3, 1.3], [-1.05, 0.3, -1.3], [1.05, 0.3, -1.3]];
      for (const wp of wPos) {
        const pos = toWorld(wp[0], wp[1], wp[2]);
        pushBox(pos[0], pos[1] - 0.15, pos[2], 0.35, 0.65, 0.65, wheelCol);
      }
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
      buf[idx++] = col[0]; buf[idx++] = col[1]; buf[idx++] = col[2]; buf[idx++] = col[3] ?? 1.0;
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

  // Draw soft ground shadow decal under vehicles & characters
  drawGroundShadow(x, z, width, length) {
    const shadowCol = [0.10, 0.10, 0.12, 0.42];
    this.pushDynamicBox(x, 0.04, z, width, 0.02, length, shadowCol);
  }

  drawVehicle(v) {
    const sinA = Math.sin(v.angle);
    const cosA = Math.cos(v.angle);

    const toWorld = (lx, ly, lz) => [
      v.x + lx * cosA + lz * sinA,
      v.y + ly,
      v.z - lx * sinA + lz * cosA
    ];

    const bodyCol = [...v.color, 1.0];
    const glassCol = [0.18, 0.28, 0.40, 1.0];
    const wheelCol = [0.12, 0.12, 0.14, 1.0];

    const hw = v.width / 2;
    const hl = v.length / 2;
    const bh = 0.85;

    // Ground shadow under vehicle
    this.drawGroundShadow(v.x, v.z, v.width * 1.15, v.length * 1.08);

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
    const cp3 = toWorld(cw, 0.3 + bh + 0.68, -hl * 0.28);
    const cp4 = toWorld(-cw, 0.3 + bh + 0.68, -hl * 0.28);
    const cp5 = toWorld(-cw, 0.3 + bh, hl * 0.32);
    const cp6 = toWorld(cw, 0.3 + bh, hl * 0.32);
    const cp7 = toWorld(cw, 0.3 + bh + 0.68, hl * 0.15);
    const cp8 = toWorld(-cw, 0.3 + bh + 0.68, hl * 0.15);

    this.pushDynamicQuad(cp4, cp3, cp7, cp8, [0, 1, 0], v.roofColor ? [...v.roofColor, 1.0] : bodyCol);
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
      const flashRed = Math.sin(Date.now() * 0.016 + (v.sirenPhase || 0)) > 0;
      const barY = 0.3 + bh + 0.72;
      const redPos = toWorld(-0.4, barY, 0);
      const bluePos = toWorld(0.4, barY, 0);
      this.pushDynamicBox(redPos[0], redPos[1], redPos[2], 0.4, 0.2, 0.3, flashRed ? [1.0, 0.15, 0.15, 1.0] : [0.3, 0.05, 0.05, 1.0]);
      this.pushDynamicBox(bluePos[0], bluePos[1], bluePos[2], 0.4, 0.2, 0.3, !flashRed ? [0.15, 0.55, 1.0, 1.0] : [0.05, 0.1, 0.3, 1.0]);
    }

    // Headlights
    const hlCol = [1.0, 0.96, 0.85, 1.0];
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

    let shirtCol = [0.32, 0.52, 0.82, 1.0];
    let pantsCol = [0.16, 0.18, 0.25, 1.0];
    let skinCol = [0.92, 0.76, 0.64, 1.0];

    if (type === 'player') {
      shirtCol = [0.85, 0.20, 0.18, 1.0]; // Rook's iconic red sports leather jacket
      pantsCol = [0.18, 0.22, 0.30, 1.0]; // Dark fitted jeans
    } else if (type === 'police') {
      shirtCol = [0.12, 0.18, 0.34, 1.0]; // Metro Police navy
      pantsCol = [0.12, 0.15, 0.22, 1.0];
    } else if (type === 'syndicate') {
      shirtCol = [0.55, 0.18, 0.55, 1.0]; // Syndicate violet
      pantsCol = [0.12, 0.12, 0.15, 1.0];
    } else if (char.outfit) {
      shirtCol = [...char.outfit.shirt, 1.0];
      pantsCol = [...char.outfit.pants, 1.0];
    }

    // Walking stride animation
    const anim = Math.sin(char.animTime || 0);
    const legL = Math.max(-0.25, Math.min(0.25, anim * 0.35));
    const legR = -legL;

    // Soft pedestrian ground shadow
    this.drawGroundShadow(x, z, 0.85, 0.85);

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
      this.pushDynamicBox(gunX, y + 1.05, gunZ, 0.12, 0.15, 0.55, [0.15, 0.15, 0.18, 1.0]);
    }
  }

  drawHelicopter(heli) {
    if (!heli) return;
    const x = heli.x, y = heli.y, z = heli.z;
    const bodyCol = [0.16, 0.19, 0.26, 1.0];
    const glassCol = [0.22, 0.42, 0.64, 1.0];

    // Helicopter ground shadow pool
    this.drawGroundShadow(x, z, 7.0, 7.0);

    // Fuselage
    this.pushDynamicBox(x, y, z, 2.4, 2.0, 5.0, bodyCol);
    this.pushDynamicBox(x, y + 0.2, z + 2.0, 2.0, 1.3, 1.4, glassCol);
    this.pushDynamicBox(x, y + 0.4, z - 4.5, 0.6, 0.6, 5.5, bodyCol);

    // Skids
    pushSkid: {
      const skidCol = [0.12, 0.14, 0.16, 1.0];
      this.pushDynamicBox(x - 1.2, y - 1.2, z, 0.18, 0.18, 4.4, skidCol);
      this.pushDynamicBox(x + 1.2, y - 1.2, z, 0.18, 0.18, 4.4, skidCol);
      this.pushDynamicBox(x - 1.2, y - 0.6, z - 1.2, 0.12, 1.1, 0.12, skidCol);
      this.pushDynamicBox(x + 1.2, y - 0.6, z - 1.2, 0.12, 1.1, 0.12, skidCol);
      this.pushDynamicBox(x - 1.2, y - 0.6, z + 1.2, 0.12, 1.1, 0.12, skidCol);
      this.pushDynamicBox(x + 1.2, y - 0.6, z + 1.2, 0.12, 1.1, 0.12, skidCol);
    }

    // Main Rotor (Spinning)
    const rAngle = (Date.now() * 0.035);
    const rSin = Math.sin(rAngle);
    const rCos = Math.cos(rAngle);
    const bladeLen = 6.8;
    const p1 = [x - rCos * bladeLen, y + 1.3, z + rSin * bladeLen];
    const p2 = [x + rCos * bladeLen, y + 1.3, z - rSin * bladeLen];
    const p3 = [x + rCos * bladeLen, y + 1.3, z - rSin * bladeLen + 0.35];
    const p4 = [x - rCos * bladeLen, y + 1.3, z + rSin * bladeLen + 0.35];
    this.pushDynamicQuad(p1, p2, p3, p4, [0, 1, 0], [0.22, 0.22, 0.25, 1.0]);

    // Searchlight beam ground pool
    const spotX = heli.spotlightX;
    const spotZ = heli.spotlightZ;
    const spotRadius = 8.5;
    this.pushDynamicBox(spotX, 0.1, spotZ, spotRadius * 2, 0.08, spotRadius * 2, [1.0, 1.0, 0.85, 0.75]);
  }

  drawHarbourBirds(birds) {
    if (!birds) return;
    const time = Date.now() * 0.001;
    const birdCol = [0.96, 0.96, 0.98, 1.0];
    const wingCol = [0.72, 0.74, 0.78, 1.0];

    for (const b of birds) {
      const angle = time * b.speed + b.phase;
      const bx = b.baseX + Math.sin(angle) * b.radius;
      const bz = b.baseZ + Math.cos(angle) * b.radius;
      const by = b.baseY + Math.sin(time * 2.0 + b.phase) * 1.5;
      const flap = Math.sin(time * 8.0 + b.phase) * 0.3;

      // Small V-wing bird geometry
      this.pushDynamicBox(bx, by, bz, 0.3, 0.12, 0.6, birdCol);
      this.pushDynamicBox(bx - 0.45, by + flap, bz, 0.6, 0.04, 0.25, wingCol);
      this.pushDynamicBox(bx + 0.45, by + flap, bz, 0.6, 0.04, 0.25, wingCol);
    }
  }

  drawParticles(particleList) {
    for (const p of particleList) {
      if (p.life <= 0) continue;
      const s = p.size;
      const col = [p.color[0], p.color[1], p.color[2], p.life * (p.color[3] || 1.0)];
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

    // Disable face culling so custom low-poly models, signs, and vehicle bodies are 100% visible from all angles
    gl.disable(gl.CULL_FACE);

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

    // 1. Draw static world (Sky dome, roads, markings, buildings, furniture, gantry cranes)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.staticVbo);
    this.setupVertexAttribPointers();
    gl.drawArrays(gl.TRIANGLES, 0, this.staticVertexCount);

    // 2. Draw dynamic entities (Vehicles, characters, helicopter, birds, particles)
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

    this.drawHarbourBirds(world.flockBirds);
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
