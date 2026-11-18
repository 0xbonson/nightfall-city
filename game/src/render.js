// High-Performance Pure WebGL 3D Renderer for Nightfall City (Vela Bay)
// Features warm late-afternoon sunlight, atmospheric sky dome with sun disc & glare,
// material flat shading with sky fresnel reflections, moving ocean wave specular band,
// long soft building/tree/prop ground shadows, glass tower interior glows at dusk,
// elevated overpass, marina, central park, grand arena, construction crane, festoon lights,
// vehicle suspension pitch/roll, steerable & spinning wheels, headlights, and volumetric searchlight.

import { CONFIG } from './config.js';
import { particles } from './effects.js';

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
    this.maxDynamicVerts = 131072;
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
    this.initNoiseTexture();
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
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform sampler2D u_noiseTex;

      void main() {
        float normLen = length(v_normal);

        // 1. Sky Dome & Emissive Geometry (normal = 0)
        if (normLen < 0.1) {
          float camDist = length(v_worldPos - u_camPos);
          if (camDist < 340.0) {
            // Local glowing emissive elements: neon signage, storefronts, taillights, bulbs
            gl_FragColor = v_color;
            return;
          }

          vec3 viewDir = normalize(v_worldPos - u_camPos);
          vec3 sunDirNorm = normalize(u_sunDir);
          float sunDot = max(dot(viewDir, sunDirNorm), 0.0);

          // Continuous atmospheric sky gradient from horizon up to zenith
          float hFactor = clamp((viewDir.y + 0.04) / 0.85, 0.0, 1.0);
          vec3 warmHaze = mix(u_skyHorizon, vec3(1.0, 0.86, 0.68), 0.55);
          vec3 skyGradient = mix(warmHaze, u_skyZenith, pow(hFactor, 0.65));

          // Low warm sun disc & solar corona flare
          float sunDisc = pow(sunDot, 650.0) * 4.2;
          float sunCorona = pow(sunDot, 24.0) * 0.65 + pow(sunDot, 6.0) * 0.35;
          vec3 skyColor = skyGradient + u_sunColor * (sunDisc + sunCorona);

          // Drifting cloud layer
          if (viewDir.y > 0.04) {
            vec2 cloudUv = vec2(viewDir.x, viewDir.z) / (viewDir.y + 0.20) * 0.14 + vec2(u_time * 0.008, u_time * 0.003);
            vec4 cNoise = texture2D(u_noiseTex, cloudUv);
            float cloudDensity = smoothstep(0.48, 0.78, cNoise.r);
            vec3 cloudSunLit = mix(vec3(0.92, 0.90, 0.88), vec3(1.0, 0.88, 0.72), sunDot);
            skyColor = mix(skyColor, cloudSunLit, cloudDensity * 0.50);
          }

          gl_FragColor = vec4(skyColor, 1.0);
          return;
        }

        vec3 norm = normalize(v_normal);
        vec3 sunD = normalize(u_sunDir);
        vec3 viewDir = normalize(u_camPos - v_worldPos);
        vec3 halfDir = normalize(sunD + viewDir);

        // Procedural noise in world coordinates
        vec4 texNoise = texture2D(u_noiseTex, v_worldPos.xz * 0.06);
        vec4 microNoise = texture2D(u_noiseTex, v_worldPos.xz * 0.38);

        // Directional warm sunlight
        float diff = max(dot(norm, sunD), 0.0);
        vec3 diffuse = u_sunColor * diff * 0.95;

        // Soft hemisphere ambient (cool sky light from above, warm earth bounce from below)
        float hemi = norm.y * 0.5 + 0.5;
        vec3 ambient = mix(u_ambientGround, u_ambientSky, hemi);

        // Surface Material Shading & Specular
        bool isOcean = (v_worldPos.y < 0.05 && norm.y > 0.75 && (v_worldPos.z > 218.0 || v_worldPos.x < -218.0));
        bool isGlass = (v_color.a > 0.55 && v_color.b > v_color.r * 1.12 && v_color.b > 0.35 && norm.y < 0.35);
        bool isPuddle = (v_worldPos.y > 0.04 && v_worldPos.y < 0.12 && norm.y > 0.8 && v_color.b > 0.3);
        bool isAsphalt = (norm.y > 0.8 && v_color.r > 0.18 && v_color.r < 0.38 && abs(v_color.r - v_color.g) < 0.06);
        bool isSidewalk = (norm.y > 0.8 && v_color.r > 0.50 && v_color.r < 0.82 && abs(v_color.r - v_color.g) < 0.06);
        bool isSand = (norm.y > 0.8 && v_color.r > 0.75 && v_color.g > 0.65 && v_color.b < 0.60);
        bool isGrass = (norm.y > 0.7 && v_color.g > v_color.r * 1.25 && v_color.g > v_color.b);
        bool isVehicleMetal = (v_color.a >= 0.98 && !isAsphalt && !isSidewalk && !isGrass && !isSand && !isOcean);

        float specPower = 28.0;
        float specIntensity = 0.12;
        vec3 matColor = v_color.rgb;

        if (isOcean) {
          // Dual-harmonic moving wave specular band
          float w1 = sin(v_worldPos.z * 0.22 + v_worldPos.x * 0.14 + u_time * 2.2);
          float w2 = cos(v_worldPos.z * 0.42 - v_worldPos.x * 0.24 + u_time * 3.1);
          vec3 waveNorm = normalize(norm + vec3((w1 + w2) * 0.08, 0.0, (w1 - w2) * 0.12));
          vec3 waveHalf = normalize(sunD + viewDir);
          float oceanSpec = pow(max(dot(waveNorm, waveHalf), 0.0), 95.0) * 2.2;
          float oceanGlow = pow(max(dot(waveNorm, waveHalf), 0.0), 18.0) * 0.55;
          diffuse += u_sunColor * oceanGlow;
          specIntensity = oceanSpec;
          specPower = 95.0;
          float fresnel = pow(1.0 - max(dot(norm, viewDir), 0.0), 3.2);
          diffuse = mix(diffuse, u_skyZenith * 0.85, fresnel * 0.65);
        } else if (isGlass) {
          float fresnel = pow(1.0 - max(dot(norm, viewDir), 0.0), 2.8);
          vec3 skyReflect = mix(u_skyHorizon, u_skyZenith, max(norm.y * 0.5 + 0.5, 0.2));
          diffuse = mix(diffuse, skyReflect, fresnel * 0.75);
          // Lit window grids and warm interior glows in towers at dusk
          float floorY = fract(v_worldPos.y * 0.24);
          float windowX = fract(v_worldPos.x * 0.28 + v_worldPos.z * 0.28);
          float isLitWindow = step(0.18, floorY) * step(0.18, windowX);
          vec3 warmInterior = vec3(1.0, 0.82, 0.52) * (0.35 + texNoise.r * 0.25) * isLitWindow;
          diffuse += warmInterior;
          specIntensity = 0.55;
          specPower = 52.0;
        } else if (isPuddle) {
          float fresnel = pow(1.0 - max(dot(norm, viewDir), 0.0), 2.2);
          diffuse = mix(diffuse, u_skyZenith, fresnel * 0.80);
          specIntensity = 0.95;
          specPower = 72.0;
        } else if (isAsphalt) {
          // Aggregate grain noise
          matColor *= (0.90 + microNoise.g * 0.20);
          specIntensity = 0.14;
          specPower = 22.0;
          // Wet reflections on promenade asphalt
          if (v_worldPos.z > 140.0) {
            float wetFresnel = pow(1.0 - max(dot(norm, viewDir), 0.0), 3.2);
            diffuse = mix(diffuse, u_skyHorizon * 0.9, wetFresnel * 0.40);
          }
        } else if (isSidewalk) {
          // Stone paver joint grid pattern
          vec2 pGrid = abs(fract(v_worldPos.xz * 0.65) - 0.5);
          float paverJoint = smoothstep(0.42, 0.48, max(pGrid.x, pGrid.y));
          matColor *= (1.0 - paverJoint * 0.16) * (0.92 + texNoise.r * 0.15);
          specIntensity = 0.18;
          specPower = 28.0;
        } else if (isSand) {
          // Quartz sparkles in sunlight
          float sparkle = pow(microNoise.g, 8.0) * diff * 0.8;
          matColor += vec3(sparkle);
          specIntensity = 0.25;
          specPower = 34.0;
        } else if (isGrass) {
          matColor = mix(matColor, matColor * vec3(1.15, 1.05, 0.85), texNoise.r);
          specIntensity = 0.06;
          specPower = 12.0;
        } else if (isVehicleMetal) {
          specIntensity = 0.65;
          specPower = 64.0;
        }

        float spec = pow(max(dot(norm, halfDir), 0.0), specPower) * specIntensity;
        vec3 lightedColor = matColor * (ambient + diffuse) + u_sunColor * spec;

        // Police Siren Light bounce
        float sirenDist = length(v_worldPos - u_camPos);
        if (sirenDist < 65.0 && length(u_sirenLight) > 0.1) {
          float sFactor = (1.0 - sirenDist / 65.0) * 0.32;
          lightedColor += u_sirenLight * sFactor;
        }

        // Distance Fog & Horizon Haze blending
        float dist = length(v_worldPos - u_camPos);
        float fogFactor = clamp((dist - 75.0) / 380.0, 0.0, 1.0);
        float fogCurve = fogFactor * fogFactor * (3.0 - 2.0 * fogFactor);
        vec3 finalColor = mix(lightedColor, u_fogColor, fogCurve);

        // Subtle screen vignette and warm-to-cool cinematic grading
        vec2 uv = gl_FragCoord.xy / max(u_resolution, vec2(1.0, 1.0));
        float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 0.45;
        finalColor *= vig;

        // Film grading: rich cool tones in deep shadows, glowing warm highlights
        float lum = dot(finalColor, vec3(0.299, 0.587, 0.114));
        vec3 graded = mix(finalColor * vec3(0.92, 0.95, 1.08), finalColor * vec3(1.05, 1.01, 0.94), clamp(lum * 1.2, 0.0, 1.0));

        gl_FragColor = vec4(graded, v_color.a);
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
      uTime: gl.getUniformLocation(prog, 'u_time'),
      uResolution: gl.getUniformLocation(prog, 'u_resolution'),
      noiseTex: gl.getUniformLocation(prog, 'u_noiseTex'),
    };
  }

  initNoiseTexture() {
    const gl = this.gl;
    if (!gl) return;
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const n1 = Math.sin(x * 0.12) * Math.cos(y * 0.12);
        const n2 = Math.sin(x * 0.35 + y * 0.28) * 0.5;
        const n3 = Math.cos(x * 0.8 - y * 0.6) * 0.25;
        const base = Math.floor(Math.max(0, Math.min(255, (n1 + n2 + n3 + 1.75) * 72)));
        const grain = Math.floor(Math.random() * 255);
        const scratches = Math.floor((Math.sin(x * 2.0) + Math.cos(y * 2.0) + 2.0) * 63);
        const cloud = Math.floor(Math.max(0, Math.min(255, (n1 * 1.5 + n2 * 1.2 + 1.5) * 85)));

        data[idx] = base;        // R: Regional macro variation & cloud density
        data[idx + 1] = grain;   // G: High-frequency stone/aggregate/sand grain
        data[idx + 2] = scratches; // B: Surface roughness micro-detail
        data[idx + 3] = cloud;   // A: Atmospheric clouds
      }
    }
    this.noiseTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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

    // Helper for soft ground shadow projection onto street/sidewalk
    const sDir = CONFIG.lighting.shadowDir;
    const sLenMult = CONFIG.lighting.shadowLength;
    const shadowColor = [0.09, 0.10, 0.13, 0.38];
    const shadowFadeColor = [0.09, 0.10, 0.13, 0.0];

    const pushSoftGroundShadow = (x, z, w, d, height, groundY = 0.08) => {
      const ext = Math.min(height, 50) * sLenMult * 0.42;
      const ox = sDir[0] * ext;
      const oz = sDir[2] * ext;
      const hw = w / 2;
      const hd = d / 2;

      const p1 = [x - hw, groundY, z - hd];
      const p2 = [x + hw, groundY, z - hd];
      const p3 = [x + hw + ox, groundY, z + hd + oz];
      const p4 = [x - hw + ox, groundY, z + hd + oz];

      pushQuadGrad(p1, p2, p3, p4, [0, 1, 0], shadowColor, shadowColor, shadowFadeColor, shadowFadeColor);
    };

    // =========================================================================
    // 1. ATMOSPHERIC SKY DOME
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

      pushQuadGrad([x1, -25, z1], [x2, -25, z2], [x2, 20, z2], [x1, 20, z1], unlitNorm, horizonCol, horizonCol, warmSunHaze, warmSunHaze);
      pushQuadGrad([x1, 20, z1], [x2, 20, z2], [x2, 95, z2], [x1, 95, z1], unlitNorm, warmSunHaze, warmSunHaze, midSkyCol, midSkyCol);
      pushQuadGrad([x1, 95, z1], [x2, 95, z2], [x2, 260, z2], [x1, 260, z1], unlitNorm, midSkyCol, midSkyCol, zenithCol, zenithCol);
      pushQuadGrad([x1, 260, z1], [x2, 260, z2], [0, 380, 0], [0, 380, 0], unlitNorm, zenithCol, zenithCol, zenithCol, zenithCol);
    }

    // =========================================================================
    // 2. BASE GROUND, COASTAL WATERS & BEACH
    // =========================================================================
    pushQuad([-280, 0, -280], [-280, 0, 280], [280, 0, 280], [280, 0, -280], [0, 1, 0], [0.68, 0.67, 0.64, 1]);

    const oceanCol = [0.12, 0.48, 0.75, 1];
    pushQuad([-290, -0.2, 222], [-290, -0.2, 420], [320, -0.2, 420], [320, -0.2, 222], [0, 1, 0], oceanCol);
    pushQuad([-420, -0.2, -290], [-420, -0.2, 420], [-222, -0.2, 420], [-222, -0.2, -290], [0, 1, 0], oceanCol);

    const waveHighlightCol = [0.85, 0.94, 1.0, 0.75];
    for (let wz = 226; wz <= 360; wz += 14) {
      pushQuad([-220, -0.15, wz], [-220, -0.15, wz + 1.2], [180, -0.15, wz + 1.2], [180, -0.15, wz], [0, 1, 0], waveHighlightCol);
    }

    const foamCol = [0.96, 0.98, 1.0, 1];
    pushQuad([-240, 0.02, 220], [-240, 0.02, 224], [50, 0.02, 224], [50, 0.02, 220], [0, 1, 0], foamCol);

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
    const asphaltCol = [...CONFIG.surfaces.asphalt];
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

      pushQuad([x0, 0.06, z0], [x0, 0.06, z1], [x1, 0.06, z1], [x1, 0.06, z0], [0, 1, 0], asphaltCol);

      const sw = 4.2;
      const curbH = 0.16;

      if (r.x1 === r.x2) {
        pushBox(r.x1 - hw - sw / 2, 0, (z0 + z1) / 2, sw, curbH, z1 - z0, sidewalkCol, sidewalkCol);
        pushBox(r.x1 - hw - 0.12, 0, (z0 + z1) / 2, 0.24, curbH + 0.03, z1 - z0, kerbCol);

        pushBox(r.x1 + hw + sw / 2, 0, (z0 + z1) / 2, sw, curbH, z1 - z0, sidewalkCol, sidewalkCol);
        pushBox(r.x1 + hw + 0.12, 0, (z0 + z1) / 2, 0.24, curbH + 0.03, z1 - z0, kerbCol);

        if (r.isMajor) {
          pushQuad([r.x1 - 0.38, 0.09, z0], [r.x1 - 0.38, 0.09, z1], [r.x1 - 0.14, 0.09, z1], [r.x1 - 0.14, 0.09, z0], [0, 1, 0], stripeCol);
          pushQuad([r.x1 + 0.14, 0.09, z0], [r.x1 + 0.14, 0.09, z1], [r.x1 + 0.38, 0.09, z1], [r.x1 + 0.38, 0.09, z0], [0, 1, 0], stripeCol);
        } else {
          pushQuad([r.x1 - 0.20, 0.09, z0], [r.x1 - 0.20, 0.09, z1], [r.x1 + 0.20, 0.09, z1], [r.x1 + 0.20, 0.09, z0], [0, 1, 0], stripeCol);
        }

        for (let segZ = -250; segZ <= 250; segZ += 10) {
          pushQuad([r.x1 - hw * 0.5 - 0.12, 0.09, segZ], [r.x1 - hw * 0.5 - 0.12, 0.09, segZ + 5.5], [r.x1 - hw * 0.5 + 0.12, 0.09, segZ + 5.5], [r.x1 - hw * 0.5 + 0.12, 0.09, segZ], [0, 1, 0], whiteLineCol);
          pushQuad([r.x1 + hw * 0.5 - 0.12, 0.09, segZ], [r.x1 + hw * 0.5 - 0.12, 0.09, segZ + 5.5], [r.x1 + hw * 0.5 + 0.12, 0.09, segZ + 5.5], [r.x1 + hw * 0.5 + 0.12, 0.09, segZ], [0, 1, 0], whiteLineCol);
        }
      } else {
        pushBox((x0 + x1) / 2, 0, r.z1 - hw - sw / 2, x1 - x0, curbH, sw, sidewalkCol, sidewalkCol);
        pushBox((x0 + x1) / 2, 0, r.z1 - hw - 0.12, x1 - x0, curbH + 0.03, 0.24, kerbCol);

        pushBox((x0 + x1) / 2, 0, r.z1 + hw + sw / 2, x1 - x0, curbH, sw, sidewalkCol, sidewalkCol);
        pushBox((x0 + x1) / 2, 0, r.z1 + hw + 0.12, x1 - x0, curbH + 0.03, 0.24, kerbCol);

        if (r.isMajor) {
          pushQuad([x0, 0.09, r.z1 - 0.38], [x0, 0.09, r.z1 - 0.14], [x1, 0.09, r.z1 - 0.14], [x1, 0.09, r.z1 - 0.38], [0, 1, 0], stripeCol);
          pushQuad([x0, 0.09, r.z1 + 0.14], [x0, 0.09, r.z1 + 0.38], [x1, 0.09, r.z1 + 0.38], [x1, 0.09, r.z1 + 0.14], [0, 1, 0], stripeCol);
        } else {
          pushQuad([x0, 0.09, r.z1 - 0.20], [x0, 0.09, r.z1 + 0.20], [x1, 0.09, r.z1 + 0.20], [x1, 0.09, r.z1 - 0.20], [0, 1, 0], stripeCol);
        }

        for (let segX = -250; segX <= 250; segX += 10) {
          pushQuad([segX, 0.09, r.z1 - hw * 0.5 - 0.12], [segX, 0.09, r.z1 - hw * 0.5 + 0.12], [segX + 5.5, 0.09, r.z1 - hw * 0.5 + 0.12], [segX + 5.5, 0.09, r.z1 - hw * 0.5 - 0.12], [0, 1, 0], whiteLineCol);
          pushQuad([segX, 0.09, r.z1 + hw * 0.5 - 0.12], [segX, 0.09, r.z1 + hw * 0.5 + 0.12], [segX + 5.5, 0.09, r.z1 + hw * 0.5 + 0.12], [segX + 5.5, 0.09, r.z1 + hw * 0.5 - 0.12], [0, 1, 0], whiteLineCol);
        }
      }
    }

    // Zebra crosswalks & stop lines
    for (const gx of grid) {
      for (const gz of grid) {
        const roadW = gx === 0 ? 18 : 14;
        const offset = roadW / 2 + 2.5;
        const stopOffset = roadW / 2 + 4.8;

        for (let stripe = -roadW / 2 + 1; stripe <= roadW / 2 - 1; stripe += 1.8) {
          pushQuad([gx + stripe - 0.42, 0.1, gz - offset - 1.2], [gx + stripe - 0.42, 0.1, gz - offset + 1.2], [gx + stripe + 0.42, 0.1, gz - offset + 1.2], [gx + stripe + 0.42, 0.1, gz - offset - 1.2], [0, 1, 0], whiteLineCol);
          pushQuad([gx + stripe - 0.42, 0.1, gz + offset - 1.2], [gx + stripe - 0.42, 0.1, gz + offset + 1.2], [gx + stripe + 0.42, 0.1, gz + offset + 1.2], [gx + stripe + 0.42, 0.1, gz + offset - 1.2], [0, 1, 0], whiteLineCol);
        }
        pushQuad([gx - roadW / 2 + 0.4, 0.1, gz - stopOffset - 0.3], [gx - roadW / 2 + 0.4, 0.1, gz - stopOffset + 0.3], [gx + roadW / 2 - 0.4, 0.1, gz - stopOffset + 0.3], [gx + roadW / 2 - 0.4, 0.1, gz - stopOffset - 0.3], [0, 1, 0], whiteLineCol);
        pushQuad([gx - roadW / 2 + 0.4, 0.1, gz + stopOffset - 0.3], [gx - roadW / 2 + 0.4, 0.1, gz + stopOffset + 0.3], [gx + roadW / 2 - 0.4, 0.1, gz + stopOffset + 0.3], [gx + roadW / 2 - 0.4, 0.1, gz + stopOffset - 0.3], [0, 1, 0], whiteLineCol);

        for (let stripe = -roadW / 2 + 1; stripe <= roadW / 2 - 1; stripe += 1.8) {
          pushQuad([gx - offset - 1.2, 0.1, gz + stripe - 0.42], [gx - offset + 1.2, 0.1, gz + stripe - 0.42], [gx - offset + 1.2, 0.1, gz + stripe + 0.42], [gx - offset - 1.2, 0.1, gz + stripe + 0.42], [0, 1, 0], whiteLineCol);
          pushQuad([gx + offset - 1.2, 0.1, gz + stripe - 0.42], [gx + offset + 1.2, 0.1, gz + stripe - 0.42], [gx + offset + 1.2, 0.1, gz + stripe + 0.42], [gx + offset - 1.2, 0.1, gz + stripe + 0.42], [0, 1, 0], whiteLineCol);
        }
        pushQuad([gx - stopOffset - 0.3, 0.1, gz - roadW / 2 + 0.4], [gx - stopOffset + 0.3, 0.1, gz - roadW / 2 + 0.4], [gx - stopOffset + 0.3, 0.1, gz + roadW / 2 - 0.4], [gx - stopOffset - 0.3, 0.1, gz + roadW / 2 - 0.4], [0, 1, 0], whiteLineCol);
        pushQuad([gx + stopOffset - 0.3, 0.1, gz - roadW / 2 + 0.4], [gx + stopOffset + 0.3, 0.1, gz - roadW / 2 + 0.4], [gx + stopOffset + 0.3, 0.1, gz + roadW / 2 - 0.4], [gx + stopOffset - 0.3, 0.1, gz + roadW / 2 - 0.4], [0, 1, 0], whiteLineCol);
      }
    }

    // Road Wear repair patches
    if (world.roadWear) {
      for (const rw of world.roadWear) {
        pushQuad(
          [rw.x - rw.w / 2, 0.07, rw.z - rw.d / 2],
          [rw.x - rw.w / 2, 0.07, rw.z + rw.d / 2],
          [rw.x + rw.w / 2, 0.07, rw.z + rw.d / 2],
          [rw.x + rw.w / 2, 0.07, rw.z - rw.d / 2],
          [0, 1, 0],
          rw.color || [0.28, 0.27, 0.26, 1.0]
        );
      }
    }

    // =========================================================================
    // 4. LONG SOFT GROUND SHADOWS FOR BUILDINGS, TREES, AND PROPS
    // =========================================================================
    for (const b of world.buildings) {
      pushSoftGroundShadow(b.x, b.z, b.w, b.d, b.h, 0.08);
    }

    for (const t of world.palmTrees) {
      const pScale = t.scale || 1.0;
      pushSoftGroundShadow(t.x, t.z, 2.5 * pScale, 2.5 * pScale, 9.0 * pScale, 0.18);
    }

    // =========================================================================
    // 5. ARCHITECTURAL CITY BUILDINGS
    // =========================================================================
    for (const b of world.buildings) {
      const { x, z, w, d, h, type, color, roofColor, details } = b;

      const hash = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
      const tint = ((hash - Math.floor(hash)) - 0.5) * 0.08;
      const bCol = [
        Math.max(0.05, Math.min(0.98, color[0] + tint)),
        Math.max(0.05, Math.min(0.98, color[1] + tint * 0.8)),
        Math.max(0.05, Math.min(0.98, color[2] + tint * 0.6)),
        1.0
      ];
      const rCol = [...(roofColor || [0.22, 0.22, 0.25]), 1.0];

      // Storefront Plinth
      const plinthH = 4.8;
      const plinthCol = [...(details.storefrontColor || [bCol[0] * 0.72, bCol[1] * 0.72, bCol[2] * 0.72]), 1.0];
      pushBox(x, 0, z, w, plinthH, d, plinthCol);

      // Glass display windows
      const glassCol = [0.18, 0.28, 0.40, 0.95];
      pushBox(x, 0.9, z + d / 2 + 0.06, w * 0.85, 3.0, 0.16, glassCol);
      pushBox(x, 0.9, z - d / 2 - 0.06, w * 0.85, 3.0, 0.16, glassCol);
      pushBox(x + w / 2 + 0.06, 0.9, z, 0.16, 3.0, d * 0.85, glassCol);
      pushBox(x - w / 2 - 0.06, 0.9, z, 0.16, 3.0, d * 0.85, glassCol);

      // Recessed Entrance Portico & Architectural Columns
      const entW = Math.min(6.2, w * 0.32);
      pushBox(x, 0, z + d / 2 - 0.4, entW, 3.6, 1.0, [0.12, 0.14, 0.18, 1.0]);
      pushBox(x - entW / 2 - 0.35, 0, z + d / 2 + 0.12, 0.6, plinthH, 0.6, [0.84, 0.82, 0.80, 1.0]);
      pushBox(x + entW / 2 + 0.35, 0, z + d / 2 + 0.12, 0.6, plinthH, 0.6, [0.84, 0.82, 0.80, 1.0]);

      // Protruding Shopfront Signs with Emissive Lettering Face
      if (details.shopSign) {
        const signCol = [...details.signColor, 1.0];
        const darkFrame = [0.12, 0.14, 0.16, 1.0];
        pushBox(x, plinthH - 0.6, z + d / 2 + 0.28, w * 0.55, 0.85, 0.22, darkFrame);
        const sw2 = (w * 0.50) / 2;
        pushQuad(
          [x - sw2, plinthH - 0.9, z + d / 2 + 0.40],
          [x + sw2, plinthH - 0.9, z + d / 2 + 0.40],
          [x + sw2, plinthH - 0.3, z + d / 2 + 0.40],
          [x - sw2, plinthH - 0.3, z + d / 2 + 0.40],
          [0, 0, 0],
          signCol
        );

        pushBox(x + w / 2 + 0.22, plinthH - 0.6, z, 0.22, 0.85, d * 0.55, darkFrame);
        const sd2 = (d * 0.50) / 2;
        pushQuad(
          [x + w / 2 + 0.35, plinthH - 0.9, z + sd2],
          [x + w / 2 + 0.35, plinthH - 0.9, z - sd2],
          [x + w / 2 + 0.35, plinthH - 0.3, z - sd2],
          [x + w / 2 + 0.35, plinthH - 0.3, z + sd2],
          [0, 0, 0],
          signCol
        );
      }

      // Merchant Awnings
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

          pushBox(x, curY, z, curW, tierH, curD, bCol);

          for (let wy = curY + 2.5; wy < nextY - 1.5; wy += 4.2) {
            pushBox(x, wy, z, curW + 0.14, 1.6, curD + 0.14, winCol);
            for (let mx = -curW / 2 + 3.0; mx < curW / 2 - 2.0; mx += 3.8) {
              pushBox(x + mx, wy, z + curD / 2 + 0.08, 0.32, 1.6, 0.12, bCol);
              pushBox(x + mx, wy, z - curD / 2 - 0.08, 0.32, 1.6, 0.12, bCol);
            }
            for (let mz = -curD / 2 + 3.0; mz < curD / 2 - 2.0; mz += 3.8) {
              pushBox(x + curW / 2 + 0.08, wy, z + mz, 0.12, 1.6, 0.32, bCol);
              pushBox(x - curW / 2 - 0.08, wy, z + mz, 0.12, 1.6, 0.32, bCol);
            }
          }

          pushBox(x, nextY, z, curW + 0.4, 0.6, curD + 0.4, [0.24, 0.26, 0.30, 1.0]);

          curY = nextY;
          curW *= set.insetRatio;
          curD *= set.insetRatio;
        }

        if (curY < h) {
          const topH = h - curY;
          pushBox(x, curY, z, curW, topH, curD, bCol, rCol);
          for (let wy = curY + 2.5; wy < h - 2.0; wy += 4.2) {
            pushBox(x, wy, z, curW + 0.14, 1.6, curD + 0.14, winCol);
            for (let mx = -curW / 2 + 3.0; mx < curW / 2 - 2.0; mx += 3.8) {
              pushBox(x + mx, wy, z + curD / 2 + 0.08, 0.32, 1.6, 0.12, bCol);
              pushBox(x + mx, wy, z - curD / 2 - 0.08, 0.32, 1.6, 0.12, bCol);
            }
            for (let mz = -curD / 2 + 3.0; mz < curD / 2 - 2.0; mz += 3.8) {
              pushBox(x + curW / 2 + 0.08, wy, z + mz, 0.12, 1.6, 0.32, bCol);
              pushBox(x - curW / 2 - 0.08, wy, z + mz, 0.12, 1.6, 0.32, bCol);
            }
          }
        }

        // Roof Parapet Rim
        pushBox(x, h, z, curW, 0.8, curD, [0.22, 0.24, 0.28, 1.0]);
        pushBox(x, h, z, curW - 1.2, 0.82, curD - 1.2, rCol);

        // Skyscraper Distinctive Crowns
        const crown = details.crown;
        if (crown === 'spire') {
          pushBox(x, h + 0.8, z, 2.2, 4.0, 2.2, [0.4, 0.44, 0.5, 1.0]);
          pushBox(x, h + 4.8, z, 0.8, 16.0, 0.8, [0.88, 0.88, 0.92, 1.0]);
          pushBox(x, h + 20.8, z, 0.35, 6.0, 0.35, [1.0, 0.2, 0.2, 1.0]);
        } else if (crown === 'sloped_glass') {
          pushBox(x, h + 0.8, z, curW * 0.75, 7.5, curD * 0.75, [0.65, 0.85, 0.98, 1.0]);
          pushBox(x, h + 8.3, z, curW * 0.45, 4.0, curD * 0.45, [0.85, 0.94, 1.0, 1.0]);
        } else if (crown === 'twin_fins') {
          const finW = curW * 0.12;
          pushBox(x - curW * 0.38, h + 0.8, z, finW, 8.5, curD * 0.85, [0.85, 0.90, 0.96, 1.0]);
          pushBox(x + curW * 0.38, h + 0.8, z, finW, 8.5, curD * 0.85, [0.85, 0.90, 0.96, 1.0]);
        } else if (crown === 'ziggurat') {
          pushBox(x, h + 0.8, z, curW * 0.8, 3.5, curD * 0.8, [0.88, 0.82, 0.65, 1.0]);
          pushBox(x, h + 4.3, z, curW * 0.55, 3.0, curD * 0.55, [0.92, 0.86, 0.70, 1.0]);
          pushBox(x, h + 7.3, z, curW * 0.3, 2.5, curD * 0.3, [0.96, 0.90, 0.75, 1.0]);
        } else if (crown === 'helipad') {
          const hy = h + 0.85;
          pushBox(x, hy, z, 17, 0.08, 17, [0.26, 0.28, 0.32, 1.0]);
          pushBox(x, hy + 0.04, z, 15, 0.04, 15, [0.96, 0.82, 0.16, 1.0]);
          pushBox(x, hy + 0.06, z, 13, 0.04, 13, [0.26, 0.28, 0.32, 1.0]);
          pushBox(x - 2.8, hy + 0.08, z, 1.3, 0.04, 7.5, [0.96, 0.82, 0.16, 1.0]);
          pushBox(x + 2.8, hy + 0.08, z, 1.3, 0.04, 7.5, [0.96, 0.82, 0.16, 1.0]);
          pushBox(x, hy + 0.08, z, 4.3, 0.04, 1.3, [0.96, 0.82, 0.16, 1.0]);
        }
      } else {
        pushBox(x, plinthH, z, w, h - plinthH, d, bCol, rCol);

        const winBandCol = type === 'market' ? [0.26, 0.20, 0.16, 1.0] : [0.70, 0.84, 0.94, 1.0];
        const step = type === 'market' ? 3.4 : 4.8;
        for (let wy = plinthH + 2.4; wy < h - 2.5; wy += step) {
          pushBox(x, wy, z, w + 0.12, 1.4, d + 0.12, winBandCol);
          for (let mx = -w / 2 + 2.5; mx < w / 2 - 2.0; mx += 3.6) {
            pushBox(x + mx, wy, z + d / 2 + 0.07, 0.28, 1.4, 0.12, bCol);
            pushBox(x + mx, wy, z - d / 2 - 0.07, 0.28, 1.4, 0.12, bCol);
          }
          for (let mz = -d / 2 + 2.5; mz < d / 2 - 2.0; mz += 3.6) {
            pushBox(x + w / 2 + 0.07, wy, z + mz, 0.12, 1.4, 0.28, bCol);
            pushBox(x - w / 2 - 0.07, wy, z + mz, 0.12, 1.4, 0.28, bCol);
          }
        }

        if (type === 'market') {
          pushBox(x, h, z, w + 0.6, 1.2, d + 0.6, [0.55, 0.22, 0.16, 1.0]);
          pushBox(x, h + 1.2, z, w * 0.7, 1.0, d * 0.7, [0.60, 0.25, 0.18, 1.0]);
        } else {
          pushBox(x, h, z, w, 0.7, d, [0.25, 0.26, 0.28, 1.0]);
          pushBox(x, h, z, w - 1.0, 0.72, d - 1.0, rCol);
        }
      }

      // Rooftop Plant Rooms & Mechanical HVAC
      if (details.plantRoom || h > 28) {
        const hvacCount = details.hvacCount || 2;
        pushBox(x, h + 0.7, z, w * 0.35, 3.2, d * 0.35, [0.32, 0.34, 0.38, 1.0]);
        for (let k = 0; k < hvacCount; k++) {
          const hx = x + (k % 2 === 0 ? -w * 0.25 : w * 0.25);
          const hz = z + (k > 1 ? -d * 0.25 : d * 0.25);
          pushBox(hx, h + 0.7, hz, 3.6, 2.0, 3.6, [0.36, 0.39, 0.43, 1.0]);
          pushBox(hx, h + 2.7, hz, 2.0, 0.4, 2.0, [0.18, 0.20, 0.22, 1.0]);
        }
      }
    }

    // =========================================================================
    // 6. ELEVATED HIGHWAY OVERPASS & CONCRETE PILLARS
    // =========================================================================
    if (world.overpass) {
      const op = world.overpass;
      const opH = op.height || 7.6;
      const opLen = op.x2 - op.x1;
      const opMidX = (op.x1 + op.x2) / 2;
      const asphaltHwy = [0.22, 0.22, 0.24, 1.0];
      const concretePillar = [0.72, 0.73, 0.75, 1.0];
      const barrierCol = [0.64, 0.65, 0.68, 1.0];

      // Elevated highway road deck
      pushBox(opMidX, opH, op.z, opLen, 0.7, op.width, asphaltHwy, asphaltHwy);

      // Yellow double centerlines
      pushBox(opMidX, opH + 0.36, op.z - 0.2, opLen, 0.02, 0.16, [0.96, 0.82, 0.12, 1.0]);
      pushBox(opMidX, opH + 0.36, op.z + 0.2, opLen, 0.02, 0.16, [0.96, 0.82, 0.12, 1.0]);

      // White lane dashes
      for (let lx = op.x1 + 10; lx < op.x2 - 10; lx += 14) {
        pushBox(lx, opH + 0.36, op.z - op.width * 0.25, 6.0, 0.02, 0.22, [0.92, 0.94, 0.96, 1.0]);
        pushBox(lx, opH + 0.36, op.z + op.width * 0.25, 6.0, 0.02, 0.22, [0.92, 0.94, 0.96, 1.0]);
      }

      // Concrete barrier side walls & safety crash railings
      const barZ1 = op.z - op.width / 2 + 0.3;
      const barZ2 = op.z + op.width / 2 - 0.3;
      pushBox(opMidX, opH + 0.35, barZ1, opLen, 1.1, 0.45, barrierCol);
      pushBox(opMidX, opH + 0.35, barZ2, opLen, 1.1, 0.45, barrierCol);

      // Steel highway guardrail topper
      pushBox(opMidX, opH + 1.45, barZ1, opLen, 0.12, 0.12, [0.34, 0.36, 0.40, 1.0]);
      pushBox(opMidX, opH + 1.45, barZ2, opLen, 0.12, 0.12, [0.34, 0.36, 0.40, 1.0]);

      // Highway support pillars with flared pier caps
      if (world.overpassPillars) {
        for (const pil of world.overpassPillars) {
          // Footing base
          pushBox(pil.x, 0, pil.z, 3.4, 0.8, 3.4, concretePillar);
          // Main vertical column
          pushBox(pil.x, 0.8, pil.z, 2.2, opH - 0.8, 2.2, concretePillar);
          // Flared pier cap beam directly supporting the bridge deck
          pushBox(pil.x, opH - 0.9, pil.z, 3.6, 0.9, op.width * 0.92, concretePillar);
        }
      }

      // Approach ramps at West & East
      const rampLen = 45;
      for (let s = 0; s < 10; s++) {
        const frac = (s + 0.5) / 10;
        const ry = opH * (1 - frac);
        // West ramp
        pushBox(op.x1 - s * 4.5, ry, op.z, 4.5, 0.7, op.width, asphaltHwy);
        // East ramp
        pushBox(op.x2 + s * 4.5, ry, op.z, 4.5, 0.7, op.width, asphaltHwy);
      }

      // Overhead highway gantry truss signs
      if (world.overpassGantries) {
        for (const g of world.overpassGantries) {
          const trussCol = [0.28, 0.30, 0.34, 1.0];
          pushBox(g.x, opH, g.z - 6.2, 0.5, 5.5, 0.5, trussCol);
          pushBox(g.x, opH, g.z + 6.2, 0.5, 5.5, 0.5, trussCol);
          pushBox(g.x, opH + 5.2, g.z, 0.5, 0.8, 13.0, trussCol);
          // Green Interstate sign board
          pushBox(g.x + 0.35, opH + 4.2, g.z, 0.22, 2.2, 8.5, [0.08, 0.48, 0.22, 1.0]);
          pushBox(g.x + 0.48, opH + 4.2, g.z, 0.08, 1.8, 7.8, [0.95, 0.95, 0.95, 1.0]);
        }
      }

      // Soft ground shadow cast by overpass deck onto streets below
      pushSoftGroundShadow(opMidX, op.z, opLen, op.width, opH, 0.09);
    }

    // =========================================================================
    // 7. MARINA WITH MOORED BOATS & HARBOUR MASTER
    // =========================================================================
    if (world.marina) {
      const m = world.marina;
      const timberPier = [0.48, 0.38, 0.26, 1.0];
      const pierDeckCol = [0.75, 0.68, 0.58, 1.0];
      const pierLength = m.z2 - m.z1;
      const pierMidZ = (m.z1 + m.z2) / 2;

      // Main Marina Jetty Deck
      pushBox(m.x, 0.25, pierMidZ, m.width, 0.5, pierLength, timberPier, pierDeckCol);

      // Piling posts into water
      for (let pz = m.z1; pz <= m.z2; pz += 6.5) {
        pushBox(m.x - m.width / 2 + 0.25, -2.5, pz, 0.45, 3.2, 0.45, [0.32, 0.24, 0.18, 1.0]);
        pushBox(m.x + m.width / 2 - 0.25, -2.5, pz, 0.45, 3.2, 0.45, [0.32, 0.24, 0.18, 1.0]);
      }

      // 3 Finger piers extending into bay
      const fingerLength = 16;
      for (const fz of [196, 212, 228]) {
        pushBox(m.x - fingerLength / 2, 0.22, fz, fingerLength, 0.4, 2.2, timberPier, pierDeckCol);
        pushBox(m.x - fingerLength + 0.2, -2.5, fz, 0.4, 3.2, 0.4, [0.32, 0.24, 0.18, 1.0]);
      }

      // Moored Boats
      if (world.mooredBoats) {
        for (const boat of world.mooredBoats) {
          const bx = boat.x, bz = boat.z;
          const hullCol = [...boat.hullColor, 1.0];
          const deckCol = [0.92, 0.93, 0.95, 1.0];

          if (boat.type === 'yacht') {
            // Luxury motor yacht: sleek hull, cabin cruiser flybridge, radar arch
            pushBox(bx, 0.1, bz, boat.width, 1.2, boat.length, hullCol, deckCol);
            // Cabin superstructure
            pushBox(bx, 1.2, bz - 0.8, boat.width * 0.78, 1.4, boat.length * 0.55, [0.96, 0.96, 0.98, 1.0]);
            // Tinted flybridge glass
            pushBox(bx, 1.8, bz + boat.length * 0.12, boat.width * 0.72, 0.8, 0.8, [0.18, 0.35, 0.55, 1.0]);
            // Radar arch & marine antennas
            pushBox(bx, 2.6, bz - 2.2, boat.width * 0.65, 0.8, 0.35, [0.88, 0.90, 0.94, 1.0]);
            pushBox(bx, 3.3, bz - 2.2, 0.08, 1.2, 0.08, [0.85, 0.88, 0.92, 1.0]);
          } else if (boat.type === 'speedboat') {
            // Speedboat: pointed bow, windshield, twin outboards
            pushBox(bx, 0.05, bz, boat.width, 0.9, boat.length, hullCol, deckCol);
            // Wrap windshield
            pushBox(bx, 0.9, bz + 0.6, boat.width * 0.8, 0.5, 0.4, [0.2, 0.45, 0.65, 1.0]);
            // Twin outboard motors at stern
            pushBox(bx - 0.6, 0.1, bz - boat.length / 2 - 0.4, 0.45, 1.0, 0.6, [0.15, 0.16, 0.18, 1.0]);
            pushBox(bx + 0.6, 0.1, bz - boat.length / 2 - 0.4, 0.45, 1.0, 0.6, [0.15, 0.16, 0.18, 1.0]);
          } else if (boat.type === 'sailboat') {
            // Sailing yacht: sleek hull, 12m tall mast, stays, boom
            pushBox(bx, 0.05, bz, boat.width, 0.9, boat.length, hullCol, deckCol);
            // Mast
            pushBox(bx, 0.8, bz, 0.22, 11.5, 0.22, [0.82, 0.75, 0.60, 1.0]);
            // Horizontal boom
            pushBox(bx, 2.2, bz - 2.6, 0.14, 0.14, 5.2, [0.82, 0.75, 0.60, 1.0]);
            // Furled sail canvas on boom
            pushBox(bx, 2.3, bz - 2.6, 0.32, 0.32, 4.8, [0.94, 0.94, 0.90, 1.0]);
          }
        }
      }

      // 2-Story Harbour Master Building
      const hm = world.harbourMaster || { x: -138, z: 186, w: 10, d: 8, h: 7.2 };
      const hmWall = [0.35, 0.48, 0.62, 1.0]; // Coastal slate blue weatherboard
      pushBox(hm.x, 0, hm.z, hm.w, hm.h, hm.d, hmWall);
      // Second story glass observation deck
      pushBox(hm.x, hm.h * 0.55, hm.z + hm.d / 2 + 0.3, hm.w * 0.85, 2.2, 0.6, [0.22, 0.52, 0.72, 1.0]);
      // Roof deck railings
      pushBox(hm.x, hm.h, hm.z, hm.w + 0.4, 0.6, hm.d + 0.4, [0.24, 0.26, 0.30, 1.0]);
      // Marine radio antenna mast
      pushBox(hm.x + 2.5, hm.h + 0.6, hm.z - 2.0, 0.18, 8.0, 0.18, [0.88, 0.90, 0.94, 1.0]);
      // Flashing coastal red beacon
      pushBox(hm.x + 2.5, hm.h + 8.6, hm.z - 2.0, 0.45, 0.6, 0.45, [1.0, 0.15, 0.15, 1.0]);
    }

    // =========================================================================
    // 8. CENTRAL PARK (Lawn, Stone Paths, 12 Trees, Hedges, Fountain)
    // =========================================================================
    if (world.park) {
      const pk = world.park;
      const lawnW = pk.x2 - pk.x1;
      const lawnD = pk.z2 - pk.z1;
      const lawnMidX = (pk.x1 + pk.x2) / 2;
      const lawnMidZ = (pk.z1 + pk.z2) / 2;

      // Manicured Park Grass Lawn
      const grassCol = [...CONFIG.surfaces.grass];
      pushBox(lawnMidX, 0.14, lawnMidZ, lawnW, 0.06, lawnD, grassCol, grassCol);

      // Flagstone walking paths (cross & perimeter)
      const stoneCol = [0.72, 0.70, 0.66, 1.0];
      pushBox(lawnMidX, 0.16, lawnMidZ, lawnW * 0.94, 0.04, 3.2, stoneCol);
      pushBox(lawnMidX, 0.16, lawnMidZ, 3.2, 0.04, lawnD * 0.94, stoneCol);

      // Perimeter boxwood hedges
      const hedgeCol = [0.14, 0.44, 0.18, 1.0];
      const hedgeH = 1.1;
      const hedgeW = 1.0;
      pushBox(lawnMidX, 0.16, pk.z1 + hedgeW / 2, lawnW, hedgeH, hedgeW, hedgeCol);
      pushBox(lawnMidX, 0.16, pk.z2 - hedgeW / 2, lawnW, hedgeH, hedgeW, hedgeCol);
      pushBox(pk.x1 + hedgeW / 2, 0.16, lawnMidZ, hedgeW, hedgeH, lawnD, hedgeCol);
      pushBox(pk.x2 - hedgeW / 2, 0.16, lawnMidZ, hedgeW, hedgeH, lawnD, hedgeCol);

      // Tiered Stone Fountain in center
      const fnX = pk.fountain?.x || lawnMidX;
      const fnZ = pk.fountain?.z || lawnMidZ;
      const fountainStone = [0.65, 0.66, 0.68, 1.0];
      const waterCol = [0.20, 0.58, 0.85, 0.95];

      // Octagonal ground basin
      pushBox(fnX, 0.16, fnZ, 8.5, 0.85, 8.5, fountainStone);
      pushBox(fnX, 0.85, fnZ, 7.2, 0.15, 7.2, waterCol);
      // Center pedestal & upper tier
      pushBox(fnX, 0.85, fnZ, 2.0, 1.8, 2.0, fountainStone);
      pushBox(fnX, 2.65, fnZ, 4.2, 0.6, 4.2, fountainStone);
      pushBox(fnX, 3.20, fnZ, 3.4, 0.1, 3.4, waterCol);
      // Spouting jet finial
      pushBox(fnX, 3.25, fnZ, 0.5, 1.2, 0.5, [0.85, 0.94, 1.0, 0.9]);

      // Park Deciduous Trees
      if (pk.trees) {
        const trunkWood = [0.42, 0.28, 0.18, 1.0];
        const leafCol = [0.22, 0.58, 0.24, 1.0];
        const leafHi = [0.28, 0.68, 0.30, 1.0];
        for (const tr of pk.trees) {
          // Trunk
          pushBox(tr.x, 0.16, tr.z, 0.65, 4.5, 0.65, trunkWood);
          // Foliage tiers (box-approximated spherical canopy)
          pushBox(tr.x, 3.8, tr.z, 4.6, 2.8, 4.6, leafCol);
          pushBox(tr.x, 5.8, tr.z, 3.4, 2.2, 3.4, leafHi);
          // Ground shadow
          pushSoftGroundShadow(tr.x, tr.z, 3.5, 3.5, 6.0, 0.18);
        }
      }
    }

    // =========================================================================
    // 9. VELA BAY GRAND ARENA / STADIUM SILHOUETTE
    // =========================================================================
    if (world.arena) {
      const ar = world.arena;
      const arenaBody = [0.78, 0.80, 0.84, 1.0];
      const arenaGlass = [0.18, 0.35, 0.52, 1.0];
      const roofCanopy = [0.92, 0.94, 0.98, 1.0];

      // Lower tiered concourse
      pushBox(ar.x, 0, ar.z, ar.width, 14, ar.depth, arenaBody);
      // Glass entrance ribbon
      pushBox(ar.x, 3.0, ar.z + ar.depth / 2 + 0.2, ar.width * 0.85, 4.5, 0.3, arenaGlass);
      pushBox(ar.x, 3.0, ar.z - ar.depth / 2 - 0.2, ar.width * 0.85, 4.5, 0.3, arenaGlass);

      // Upper seating bowl tier
      pushBox(ar.x, 14, ar.z, ar.width * 0.92, 16, ar.depth * 0.92, arenaBody);

      // Curving roof tension canopy
      pushBox(ar.x, 30, ar.z, ar.width * 0.85, 4.5, ar.depth * 0.85, roofCanopy);
      pushBox(ar.x, 34.5, ar.z, ar.width * 0.60, 2.5, ar.depth * 0.60, [0.85, 0.88, 0.94, 1.0]);

      // 4 Corner floodlight truss towers
      const ftH = 46;
      const hw2 = ar.width * 0.48;
      const hd2 = ar.depth * 0.48;
      const steelTruss = [0.32, 0.34, 0.38, 1.0];
      const floodCol = [1.0, 0.98, 0.92, 1.0];

      for (const [fx, fz] of [[-hw2, -hd2], [hw2, -hd2], [-hw2, hd2], [hw2, hd2]]) {
        pushBox(ar.x + fx, 0, ar.z + fz, 1.6, ftH, 1.6, steelTruss);
        // Floodlight bank head
        pushBox(ar.x + fx, ftH, ar.z + fz, 4.2, 2.4, 1.4, steelTruss);
        pushBox(ar.x + fx, ftH, ar.z + fz + 0.8, 3.8, 2.0, 0.2, floodCol);
      }

      // LED Arena Marquee ribbon banner (emissive)
      const mqW = ar.width * 0.65;
      pushBox(ar.x, 15, ar.z + ar.depth / 2 + 0.6, mqW, 2.2, 0.2, [0.08, 0.10, 0.14, 1.0]);
      pushQuad(
        [ar.x - mqW / 2, 14.2, ar.z + ar.depth / 2 + 0.72],
        [ar.x + mqW / 2, 14.2, ar.z + ar.depth / 2 + 0.72],
        [ar.x + mqW / 2, 16.0, ar.z + ar.depth / 2 + 0.72],
        [ar.x - mqW / 2, 16.0, ar.z + ar.depth / 2 + 0.72],
        [0, 0, 0],
        [0.0, 0.94, 1.0, 1.0]
      );
    }

    // =========================================================================
    // 10. DOWNTOWN CONSTRUCTION SITE & TOWER CRANE
    // =========================================================================
    if (world.constructionSite) {
      const cs = world.constructionSite;
      const yellowCrane = [0.96, 0.78, 0.10, 1.0];
      const steelRust = [0.65, 0.28, 0.18, 1.0];
      const scaffoldCol = [0.55, 0.58, 0.62, 1.0];
      const safetyNet = [0.12, 0.52, 0.28, 0.85];

      // Plywood security hoarding around perimeter
      const hrdCol = [0.68, 0.55, 0.38, 1.0];
      const hrdH = 2.4;
      pushBox(cs.x, 0, cs.z - cs.d / 2, cs.w, hrdH, 0.2, hrdCol);
      pushBox(cs.x, 0, cs.z + cs.d / 2, cs.w, hrdH, 0.2, hrdCol);
      pushBox(cs.x - cs.w / 2, 0, cs.z, 0.2, hrdH, cs.d, hrdCol);
      pushBox(cs.x + cs.w / 2, 0, cs.z, 0.2, hrdH, cs.d, hrdCol);

      // Warning stencils on hoarding
      pushBox(cs.x, 1.2, cs.z + cs.d / 2 + 0.12, 6.0, 0.8, 0.04, [0.96, 0.82, 0.14, 1.0]);

      // 4-Tier Structural Steel Skyscraper Core
      const coreW = cs.w * 0.65;
      const coreD = cs.d * 0.65;
      for (let f = 1; f <= 4; f++) {
        const fy = f * 6.5;
        // Concrete floor slab
        pushBox(cs.x, fy, cs.z, coreW, 0.45, coreD, [0.72, 0.73, 0.75, 1.0]);
        // Red structural I-beam columns
        for (const [cx, cz] of [[-coreW / 2 + 1, -coreD / 2 + 1], [coreW / 2 - 1, -coreD / 2 + 1], [-coreW / 2 + 1, coreD / 2 - 1], [coreW / 2 - 1, coreD / 2 - 1]]) {
          pushBox(cs.x + cx, fy - 6.5, cs.z + cz, 0.6, 6.5, 0.6, steelRust);
        }
      }

      // Scaffolding towers with green safety debris netting
      pushBox(cs.x + coreW / 2 + 1.2, 0, cs.z, 1.8, 26, coreD, scaffoldCol);
      pushBox(cs.x + coreW / 2 + 1.8, 3.0, cs.z, 0.1, 22, coreD * 0.95, safetyNet);

      // 48-Meter Yellow Tower Crane
      const craneX = cs.x - coreW / 2 + 2;
      const craneZ = cs.z - coreD / 2 + 2;
      const craneH = 48;

      // Vertical lattice mast
      pushBox(craneX, 0, craneZ, 2.2, craneH, 2.2, yellowCrane);

      // Horizontal Jib Boom (reaches 36m across site)
      pushBox(craneX + 16, craneH + 1.4, craneZ, 36, 1.8, 1.6, yellowCrane);
      // Counter-jib with heavy counterweight blocks
      pushBox(craneX - 6, craneH + 1.4, craneZ, 14, 1.8, 1.6, yellowCrane);
      pushBox(craneX - 11, craneH + 1.8, craneZ, 4.2, 3.2, 2.4, [0.35, 0.38, 0.42, 1.0]);

      // Operator cabin
      pushBox(craneX + 1.8, craneH - 1.2, craneZ, 1.8, 2.0, 1.8, [0.95, 0.95, 0.98, 1.0]);
      pushBox(craneX + 2.4, craneH - 1.0, craneZ, 0.1, 1.4, 1.4, [0.22, 0.45, 0.65, 1.0]);

      // Hoist trolley and steel cable
      pushBox(craneX + 22, craneH + 0.6, craneZ, 2.2, 0.8, 1.8, [0.24, 0.26, 0.28, 1.0]);
      pushBox(craneX + 22, craneH - 10, craneZ, 0.08, 18, 0.08, [0.32, 0.34, 0.38, 1.0]);
      pushBox(craneX + 22, craneH - 19, craneZ, 1.4, 0.8, 1.4, [0.96, 0.82, 0.14, 1.0]);
    }

    // =========================================================================
    // 11. FESTOON STRING LIGHTS OVER PROMENADE & OLD MARKET
    // =========================================================================
    if (world.festoonLights) {
      const wireCol = [0.18, 0.18, 0.20, 1.0];
      const bulbGlow = [1.0, 0.94, 0.72, 1.0];

      for (const f of world.festoonLights) {
        const spanX = f.x2 - f.x1;
        const spanZ = f.z2 - f.z1;
        const midX = (f.x1 + f.x2) / 2;
        const midZ = (f.z1 + f.z2) / 2;
        const dist = Math.hypot(spanX, spanZ);

        // Support poles at ends
        pushBox(f.x1, 0, f.z1, 0.22, f.y, 0.22, [0.25, 0.27, 0.30, 1.0]);
        pushBox(f.x2, 0, f.z2, 0.22, f.y, 0.22, [0.25, 0.27, 0.30, 1.0]);

        // Catenary wire cable approximation
        pushBox(midX, f.y - 0.35, midZ, Math.abs(spanX) || 0.12, 0.06, Math.abs(spanZ) || 0.12, wireCol);

        // Suspended glowing Edison bulbs
        const bulbCount = Math.floor(dist / 3.5);
        for (let b = 1; b < bulbCount; b++) {
          const frac = b / bulbCount;
          const sag = Math.sin(frac * Math.PI) * 0.6;
          const bx = f.x1 + spanX * frac;
          const bz = f.z1 + spanZ * frac;
          const by = f.y - sag;
          // Small drop wire
          pushBox(bx, by + 0.15, bz, 0.04, 0.3, 0.04, wireCol);
          // Glowing bulb
          pushBox(bx, by, bz, 0.26, 0.32, 0.26, bulbGlow);
        }
      }
    }

    // =========================================================================
    // 12. STREET FOOD CARTS, REFLECTIVE PUDDLES, MURALS
    // =========================================================================
    if (world.streetFoodCarts) {
      const cartSteel = [0.84, 0.86, 0.90, 1.0];
      for (const fc of world.streetFoodCarts) {
        // Cart body
        pushBox(fc.x, 0.22, fc.z, 2.2, 1.1, 1.4, cartSteel);
        // Wheels
        pushBox(fc.x - 0.9, 0.15, fc.z - 0.72, 0.18, 0.6, 0.6, [0.15, 0.15, 0.18, 1.0]);
        pushBox(fc.x + 0.9, 0.15, fc.z - 0.72, 0.18, 0.6, 0.6, [0.15, 0.15, 0.18, 1.0]);
        // Steaming prep griddle counter
        pushBox(fc.x, 1.35, fc.z, 2.0, 0.12, 1.2, [0.28, 0.30, 0.34, 1.0]);
        // Umbrella support pole
        pushBox(fc.x, 1.4, fc.z, 0.08, 1.8, 0.08, [0.3, 0.32, 0.35, 1.0]);
        // Striped vinyl umbrella canopy
        const umbCol = fc.umbrellaColor || [0.95, 0.22, 0.18, 1.0];
        pushBox(fc.x, 3.2, fc.z, 3.2, 0.45, 3.2, umbCol);
        pushBox(fc.x, 3.6, fc.z, 1.8, 0.45, 1.8, [0.96, 0.96, 0.98, 1.0]);
      }
    }

    if (world.puddles) {
      const waterReflect = [0.25, 0.42, 0.65, 0.92];
      for (const p of world.puddles) {
        pushQuad(
          [p.x - p.w / 2, 0.075, p.z - p.d / 2],
          [p.x - p.w / 2, 0.075, p.z + p.d / 2],
          [p.x + p.w / 2, 0.075, p.z + p.d / 2],
          [p.x + p.w / 2, 0.075, p.z - p.d / 2],
          [0, 1, 0],
          waterReflect
        );
      }
    }

    if (world.murals) {
      for (const m of world.murals) {
        const mw2 = m.width / 2;
        const mh2 = m.height / 2;
        pushQuad(
          [m.x - mw2, m.y - mh2, m.z],
          [m.x + mw2, m.y - mh2, m.z],
          [m.x + mw2, m.y + mh2, m.z],
          [m.x - mw2, m.y + mh2, m.z],
          [0, 0, 1],
          m.color || [0.95, 0.42, 0.15, 1.0]
        );
      }
    }

    // =========================================================================
    // 13. EXTERIOR FIRE ESCAPES & BILLBOARDS & WATER TANKS
    // =========================================================================
    if (world.fireEscapes) {
      const steelDark = [0.20, 0.22, 0.25, 1.0];
      for (const fe of world.fireEscapes) {
        for (let fl = 1; fl <= fe.floors; fl++) {
          const fy = fe.y + fl * fe.floorHeight;
          pushBox(fe.x, fy, fe.z, fe.width, 0.12, fe.depth, steelDark);
          pushBox(fe.x, fy + 0.12, fe.z + fe.depth / 2, fe.width, 0.8, 0.08, steelDark);
          pushBox(fe.x - fe.width / 2, fy + 0.12, fe.z, 0.08, 0.8, fe.depth, steelDark);
          pushBox(fe.x + fe.width / 2, fy + 0.12, fe.z, 0.08, 0.8, fe.depth, steelDark);
          if (fl < fe.floors) {
            pushBox(fe.x, fy + fe.floorHeight * 0.5, fe.z, fe.width * 0.4, fe.floorHeight, 0.15, steelDark);
          }
        }
        pushBox(fe.x + fe.width * 0.35, fe.y, fe.z, 0.35, fe.floorHeight, 0.15, steelDark);
      }
    }

    if (world.billboards) {
      const trussCol = [0.26, 0.28, 0.32, 1.0];
      for (const bb of world.billboards) {
        pushBox(bb.x - bb.width * 0.35, bb.y - 4.5, bb.z, 0.45, 4.5, 0.45, trussCol);
        pushBox(bb.x + bb.width * 0.35, bb.y - 4.5, bb.z, 0.45, 4.5, 0.45, trussCol);
        pushBox(bb.x, bb.y, bb.z, bb.width + 0.5, bb.height + 0.5, 0.35, [0.12, 0.14, 0.16, 1.0]);
        const hw2 = bb.width / 2;
        const hh2 = bb.height / 2;
        pushQuad(
          [bb.x - hw2, bb.y - hh2, bb.z + 0.22],
          [bb.x + hw2, bb.y - hh2, bb.z + 0.22],
          [bb.x + hw2, bb.y + hh2, bb.z + 0.22],
          [bb.x - hw2, bb.y + hh2, bb.z + 0.22],
          [0, 0, 0],
          bb.color
        );
        pushQuad(
          [bb.x - hw2, bb.y - hh2, bb.z + 0.24],
          [bb.x + hw2, bb.y - hh2, bb.z + 0.24],
          [bb.x + hw2, bb.y - hh2 + bb.height * 0.28, bb.z + 0.24],
          [bb.x - hw2, bb.y - hh2 + bb.height * 0.28, bb.z + 0.24],
          [0, 0, 0],
          bb.accent
        );
      }
    }

    if (world.waterTanks) {
      const woodStave = [0.52, 0.36, 0.22, 1.0];
      const ironBand = [0.18, 0.18, 0.20, 1.0];
      const trestleCol = [0.25, 0.28, 0.32, 1.0];
      for (const wt of world.waterTanks) {
        const ts = wt.radius * 0.9;
        pushBox(wt.x - ts, wt.y, wt.z - ts, 0.3, 3.2, 0.3, trestleCol);
        pushBox(wt.x + ts, wt.y, wt.z - ts, 0.3, 3.2, 0.3, trestleCol);
        pushBox(wt.x - ts, wt.y, wt.z + ts, 0.3, 3.2, 0.3, trestleCol);
        pushBox(wt.x + ts, wt.y, wt.z + ts, 0.3, 3.2, 0.3, trestleCol);
        pushBox(wt.x, wt.y + 3.2, wt.z, wt.radius * 2.2, 0.3, wt.radius * 2.2, trestleCol);

        const ty = wt.y + 3.5;
        const tw = wt.radius * 2;
        pushBox(wt.x, ty, wt.z, tw, wt.height, tw * 0.9, woodStave);
        pushBox(wt.x, ty, wt.z, tw * 0.9, wt.height, tw, woodStave);
        pushBox(wt.x, ty + wt.height * 0.3, wt.z, tw + 0.08, 0.12, tw + 0.08, ironBand);
        pushBox(wt.x, ty + wt.height * 0.7, wt.z, tw + 0.08, 0.12, tw + 0.08, ironBand);
        pushBox(wt.x, ty + wt.height, wt.z, tw * 1.05, 0.5, tw * 1.05, [0.38, 0.26, 0.16, 1.0]);
        pushBox(wt.x, ty + wt.height + 0.5, wt.z, tw * 0.6, 0.5, tw * 0.6, [0.38, 0.26, 0.16, 1.0]);
        pushBox(wt.x, ty + wt.height + 1.0, wt.z, tw * 0.2, 0.5, tw * 0.2, [0.38, 0.26, 0.16, 1.0]);
      }
    }

    // =========================================================================
    // 14. DISTANT LANDMARK SKYLINE TOWERS
    // =========================================================================
    for (const lm of world.distantLandmarks) {
      const { x, z, w, d, h, crown, color, roof } = lm;
      const bCol = [...color, 1.0];
      const rCol = [...roof, 1.0];

      pushBox(x, 0, z, w, h * 0.65, d, bCol);
      for (let wy = 8; wy < h * 0.65 - 4; wy += 5.5) {
        pushBox(x, wy, z, w + 0.2, 2.0, d + 0.2, [0.75, 0.88, 0.98, 1.0]);
      }
      const sw = w * 0.75, sd = d * 0.75;
      pushBox(x, h * 0.65, z, sw, h * 0.35, sd, bCol, rCol);
      for (let wy = h * 0.65 + 4; wy < h - 4; wy += 5.5) {
        pushBox(x, wy, z, sw + 0.2, 2.0, sd + 0.2, [0.75, 0.88, 0.98, 1.0]);
      }

      if (crown === 'spire') {
        pushBox(x, h, z, 3.0, 8.0, 3.0, [0.5, 0.54, 0.6, 1.0]);
        pushBox(x, h + 8.0, z, 1.0, 24.0, 1.0, [0.9, 0.9, 0.95, 1.0]);
        pushBox(x, h + 32.0, z, 0.5, 6.0, 0.5, [1.0, 0.2, 0.2, 1.0]);
      } else if (crown === 'twin_fins') {
        pushBox(x - sw * 0.35, h, z, 2.5, 14.0, sd * 0.8, [0.85, 0.90, 0.98, 1.0]);
        pushBox(x + sw * 0.35, h, z, 2.5, 14.0, sd * 0.8, [0.85, 0.90, 0.98, 1.0]);
      } else if (crown === 'lantern') {
        pushBox(x, h, z, 8, 4.0, 8, [0.95, 0.95, 0.98, 1.0]);
        pushBox(x, h + 4.0, z, 6, 3.5, 6, [1.0, 0.95, 0.4, 1.0]);
        pushBox(x, h + 7.5, z, 7, 1.5, 7, [0.2, 0.2, 0.25, 1.0]);
      }
    }

    // =========================================================================
    // 15. PORT CONTAINER GANTRY CRANES (Meridian Docks)
    // =========================================================================
    for (const crane of world.gantryCranes) {
      const { x, y, z, height, boomLength, boomWidth, color } = crane;
      const craneCol = [...color, 1.0];
      const steelCol = [0.22, 0.24, 0.28, 1.0];

      const legSpreadX = 14;
      const legSpreadZ = 12;
      pushBox(x - legSpreadX / 2, y, z - legSpreadZ / 2, 1.6, height, 1.6, craneCol);
      pushBox(x + legSpreadX / 2, y, z - legSpreadZ / 2, 1.6, height, 1.6, craneCol);
      pushBox(x - legSpreadX / 2, y, z + legSpreadZ / 2, 1.6, height, 1.6, craneCol);
      pushBox(x + legSpreadX / 2, y, z + legSpreadZ / 2, 1.6, height, 1.6, craneCol);

      pushBox(x, y + height * 0.45, z - legSpreadZ / 2, legSpreadX, 1.4, 1.4, craneCol);
      pushBox(x, y + height * 0.45, z + legSpreadZ / 2, legSpreadX, 1.4, 1.4, craneCol);
      pushBox(x - legSpreadX / 2, y + height * 0.45, z, 1.4, 1.4, legSpreadZ, craneCol);
      pushBox(x + legSpreadX / 2, y + height * 0.45, z, 1.4, 1.4, legSpreadZ, craneCol);

      pushBox(x, y + height, z, legSpreadX + 2, 3.5, legSpreadZ + 2, craneCol);
      pushBox(x - 2, y + height + 3.5, z, 7, 4.0, 6, steelCol);

      pushBox(x, y + height + 1.2, z + boomLength / 2, boomWidth, 2.2, boomLength, craneCol);
      pushBox(x, y + height + 1.2, z - 8, boomWidth, 2.2, 16, craneCol);
      pushBox(x, y + height + 2.0, z - 14, 4.8, 3.5, 4.5, [0.3, 0.32, 0.35, 1.0]);

      pushBox(x, y + height - 0.5, z + 16, 3.0, 1.2, 3.0, steelCol);
      pushBox(x, y + 10, z + 16, 6.2, 1.5, 2.8, [0.95, 0.82, 0.16, 1.0]);
      pushBox(x - 1.2, y + 10, z + 16, 0.08, height - 10, 0.08, steelCol);
      pushBox(x + 1.2, y + 10, z + 16, 0.08, height - 10, 0.08, steelCol);

      pushSoftGroundShadow(x, z, legSpreadX + 4, legSpreadZ + 4, height, 0.08);
    }

    // Shipping Container Stacks
    for (const c of world.containerStacks) {
      pushBox(c.x, c.y, c.z, c.w, c.h, c.d, [...c.color, 1.0], [c.color[0] * 0.78, c.color[1] * 0.78, c.color[2] * 0.78, 1.0]);
      pushBox(c.x, c.y, c.z, c.w + 0.1, c.h + 0.04, 0.22, [0.22, 0.24, 0.26, 1.0]);
      pushBox(c.x, c.y, c.z, 0.22, c.h + 0.04, c.d + 0.1, [0.22, 0.24, 0.26, 1.0]);
      pushSoftGroundShadow(c.x, c.z, c.w, c.d, c.h, 0.08);
    }

    // =========================================================================
    // 16. STREET FURNITURE, PROPS & PALM TREES
    // =========================================================================
    const metalPoleCol = [0.22, 0.24, 0.26, 1.0];
    const lampGlowCol = [1.0, 0.95, 0.82, 1.0];
    const benchWoodCol = [0.55, 0.34, 0.20, 1.0];
    const binCol = [0.26, 0.35, 0.32, 1.0];
    const planterCol = [0.72, 0.70, 0.68, 1.0];
    const foliageCol = [0.18, 0.58, 0.24, 1.0];

    for (const p of world.props) {
      if (p.type === 'lamp') {
        pushBox(p.x, 0.16, p.z, 0.24, 6.4, 0.24, metalPoleCol);
        const armDir = p.rotation === 0 ? 1 : -1;
        pushBox(p.x + armDir * 0.7, 6.4, p.z, 1.4, 0.18, 0.18, metalPoleCol);
        pushBox(p.x + armDir * 1.35, 6.2, p.z, 0.5, 0.25, 0.38, lampGlowCol);
        if (Math.abs(p.x) < 22 || Math.abs(p.z) < 22) {
          pushBox(p.x - armDir * 0.7, 6.4, p.z, 1.4, 0.18, 0.18, metalPoleCol);
          pushBox(p.x - armDir * 1.35, 6.2, p.z, 0.5, 0.25, 0.38, lampGlowCol);
        }
      } else if (p.type === 'traffic_light') {
        pushBox(p.x, 0.16, p.z, 0.28, 5.8, 0.28, [0.18, 0.18, 0.20, 1.0]);
        pushBox(p.x, 4.4, p.z, 0.44, 1.5, 0.44, [0.14, 0.14, 0.16, 1.0]);
        pushBox(p.x, 4.85, p.z, 0.48, 0.32, 0.48, [0.95, 0.15, 0.10, 1.0]);
        pushBox(p.x, 5.0, p.z, 0.54, 0.08, 0.54, [0.12, 0.12, 0.14, 1.0]);
        pushBox(p.x, 4.4, p.z, 0.48, 0.32, 0.48, [0.95, 0.75, 0.10, 1.0]);
        pushBox(p.x, 4.55, p.z, 0.54, 0.08, 0.54, [0.12, 0.12, 0.14, 1.0]);
        pushBox(p.x, 3.95, p.z, 0.48, 0.32, 0.48, [0.10, 0.85, 0.25, 1.0]);
        pushBox(p.x, 4.1, p.z, 0.54, 0.08, 0.54, [0.12, 0.12, 0.14, 1.0]);
      } else if (p.type === 'bench') {
        pushBox(p.x, 0.16, p.z, 0.85, 0.5, 2.2, benchWoodCol);
        pushBox(p.x - 0.34, 0.65, p.z, 0.16, 0.5, 2.2, benchWoodCol);
        pushBox(p.x, 0.16, p.z - 0.9, 0.86, 0.48, 0.12, metalPoleCol);
        pushBox(p.x, 0.16, p.z + 0.9, 0.86, 0.48, 0.12, metalPoleCol);
      } else if (p.type === 'bin') {
        pushBox(p.x, 0.16, p.z, 0.65, 0.95, 0.65, binCol);
        pushBox(p.x, 1.1, p.z, 0.72, 0.12, 0.72, metalPoleCol);
      } else if (p.type === 'planter') {
        pushBox(p.x, 0.16, p.z, 1.4, 0.65, 2.4, planterCol);
        pushBox(p.x, 0.75, p.z, 1.2, 0.85, 2.2, foliageCol);
        pushBox(p.x, 1.5, p.z, 0.8, 0.25, 1.6, [0.95, 0.35, 0.65, 1.0]);
      } else if (p.type === 'bus_shelter') {
        pushBox(p.x, 0.16, p.z, 2.2, 2.8, 4.2, [0.2, 0.22, 0.25, 1.0]);
        pushBox(p.x + 0.9, 0.16, p.z, 0.12, 2.7, 4.0, [0.72, 0.86, 0.96, 0.7]);
        pushBox(p.x, 2.85, p.z, 2.4, 0.15, 4.4, [0.25, 0.28, 0.32, 1.0]);
        pushBox(p.x, 0.16, p.z, 0.6, 0.48, 2.4, benchWoodCol);
        pushBox(p.x - 0.9, 0.8, p.z, 0.12, 1.8, 1.2, [0.95, 0.85, 0.2, 1.0]);
      } else if (p.type === 'bollard') {
        pushBox(p.x, 0.16, p.z, 0.35, 0.85, 0.35, [0.24, 0.26, 0.30, 1.0]);
        pushBox(p.x, 0.95, p.z, 0.38, 0.10, 0.38, [0.96, 0.82, 0.16, 1.0]);
      } else if (p.type === 'newsstand') {
        pushBox(p.x, 0.16, p.z, 0.75, 1.2, 0.65, [0.18, 0.42, 0.75, 1.0]);
        pushBox(p.x, 0.75, p.z + 0.3, 0.55, 0.35, 0.1, [0.90, 0.92, 0.95, 1.0]);
        pushBox(p.x, 0.16, p.z + 0.8, 0.75, 1.2, 0.65, [0.85, 0.22, 0.18, 1.0]);
      } else if (p.type === 'phonebox') {
        pushBox(p.x, 0.16, p.z, 0.55, 1.85, 0.55, [0.28, 0.32, 0.38, 1.0]);
        pushBox(p.x, 1.15, p.z, 0.45, 0.55, 0.45, [0.15, 0.55, 0.85, 1.0]);
      } else if (p.type === 'hydrant') {
        pushBox(p.x, 0.16, p.z, 0.36, 0.75, 0.36, [0.92, 0.18, 0.15, 1.0]);
        pushBox(p.x, 0.60, p.z, 0.50, 0.22, 0.50, [0.78, 0.80, 0.82, 1.0]);
      } else if (p.type === 'manhole') {
        pushBox(p.x, 0.08, p.z, 1.4, 0.02, 1.4, [0.22, 0.22, 0.24, 1.0]);
        pushBox(p.x, 0.09, p.z, 1.1, 0.02, 1.1, [0.26, 0.26, 0.28, 1.0]);
      } else if (p.type === 'drain') {
        pushBox(p.x, 0.08, p.z, 0.9, 0.02, 1.6, [0.16, 0.16, 0.18, 1.0]);
        pushBox(p.x, 0.09, p.z, 0.7, 0.02, 1.3, [0.24, 0.24, 0.26, 1.0]);
      }
    }

    // Coastal Palm Trees
    const trunkCol = [0.44, 0.30, 0.20, 1.0];
    const frondCol = [0.18, 0.62, 0.26, 1.0];
    for (const t of world.palmTrees) {
      const th = 8.5 * t.scale;
      pushBox(t.x, 0, t.z, 0.75 * t.scale, th, 0.75 * t.scale, trunkCol);
      pushBox(t.x, th, t.z, 6.0 * t.scale, 0.6 * t.scale, 6.0 * t.scale, frondCol);
      pushBox(t.x, th + 0.35, t.z, 4.2 * t.scale, 0.5 * t.scale, 4.2 * t.scale, [0.22, 0.72, 0.32, 1.0]);
      pushBox(t.x, th + 0.70, t.z, 2.4 * t.scale, 0.4 * t.scale, 2.4 * t.scale, [0.28, 0.82, 0.38, 1.0]);
    }

    // Parked Cars along kerbs
    for (const pc of world.parkedCars) {
      const sinA = Math.sin(pc.angle);
      const cosA = Math.cos(pc.angle);
      const toWorld = (lx, ly, lz) => [
        pc.x + lx * cosA + lz * sinA,
        (pc.y || 0) + ly,
        pc.z - lx * sinA + lz * cosA
      ];

      const bodyCol = [...pc.color, 1.0];
      const glassCol = [0.18, 0.28, 0.40, 1.0];
      const wheelCol = [0.12, 0.12, 0.14, 1.0];

      const p1 = toWorld(-1.0, 0.3, -2.3), p2 = toWorld(1.0, 0.3, -2.3);
      const p3 = toWorld(1.0, 1.15, -2.3), p4 = toWorld(-1.0, 1.15, -2.3);
      const p5 = toWorld(-1.0, 0.3, 2.3), p6 = toWorld(1.0, 0.3, 2.3);
      const p7 = toWorld(1.0, 1.15, 2.3), p8 = toWorld(-1.0, 1.15, 2.3);

      pushQuad(p4, p3, p7, p8, [0, 1, 0], bodyCol);
      pushQuad(p5, p6, p7, p8, [sinA, 0, cosA], bodyCol);
      pushQuad(p2, p1, p4, p3, [-sinA, 0, -cosA], bodyCol);
      pushQuad(p1, p5, p8, p4, [-cosA, 0, sinA], bodyCol);
      pushQuad(p6, p2, p3, p7, [cosA, 0, -sinA], bodyCol);

      const cp1 = toWorld(-0.85, 1.15, -1.0), cp2 = toWorld(0.85, 1.15, -1.0);
      const cp3 = toWorld(0.85, 1.80, -0.7), cp4 = toWorld(-0.85, 1.80, -0.7);
      const cp5 = toWorld(-0.85, 1.15, 0.9), cp6 = toWorld(0.85, 1.15, 0.9);
      const cp7 = toWorld(0.85, 1.80, 0.4), cp8 = toWorld(-0.85, 1.80, 0.4);

      pushQuad(cp4, cp3, cp7, cp8, [0, 1, 0], [0.15, 0.16, 0.18, 1.0]);
      pushQuad(cp8, cp7, cp6, cp5, [sinA, 0.4, cosA], glassCol);
      pushQuad(cp2, cp1, cp4, cp3, [-sinA, 0.4, -cosA], glassCol);
      pushQuad(cp1, cp5, cp8, cp4, [-cosA, 0, sinA], glassCol);
      pushQuad(cp6, cp2, cp3, cp7, [cosA, 0, -sinA], glassCol);

      const wPos = [[-1.05, 0.3, 1.3], [1.05, 0.3, 1.3], [-1.05, 0.3, -1.3], [1.05, 0.3, -1.3]];
      for (const wp of wPos) {
        const pos = toWorld(wp[0], wp[1], wp[2]);
        pushBox(pos[0], pos[1] - 0.15, pos[2], 0.35, 0.65, 0.65, wheelCol);
      }
      pushSoftGroundShadow(pc.x, pc.z, 2.3, 4.6, 1.4, 0.08);
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

  // Draw full emissive unlit geometry (zero normal bypasses directional shading)
  pushEmissiveBox(x, y, z, w, h, d, col) {
    const x0 = x - w / 2, x1 = x + w / 2;
    const y0 = y, y1 = y + h;
    const z0 = z - d / 2, z1 = z + d / 2;
    const zeroNorm = [0, 0, 0];

    this.pushDynamicQuad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], zeroNorm, col);
    this.pushDynamicQuad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], zeroNorm, col);
    this.pushDynamicQuad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], zeroNorm, col);
    this.pushDynamicQuad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], zeroNorm, col);
    this.pushDynamicQuad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], zeroNorm, col);
  }

  // Draw soft elongated late-afternoon ground shadow decal
  drawGroundShadow(x, z, width, length, height = 0) {
    const shadowCol = [0.08, 0.09, 0.12, 0.38];
    const sDir = CONFIG.lighting.shadowDir;
    const sLen = CONFIG.lighting.shadowLength;
    const sx = x + sDir[0] * sLen * (0.8 + height * 0.4);
    const sz = z + sDir[2] * sLen * (0.8 + height * 0.4);
    const sw = width * 1.15;
    const sl = length * (1.0 + sLen * 0.4);
    this.pushDynamicBox(sx, 0.04, sz, sw, 0.02, sl, shadowCol);
  }

  drawVehicle(v) {
    const yaw = v.angle;
    const pitch = v.pitch || 0;
    const roll = v.roll || 0;

    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    const cosR = Math.cos(roll), sinR = Math.sin(roll);

    const toWorld = (lx, ly, lz) => {
      const py = ly * cosP - lz * sinP;
      const pz = ly * sinP + lz * cosP;
      const rx = lx * cosR - py * sinR;
      const ry = lx * sinR + py * cosR;
      const wx = v.x + rx * cosY + pz * sinY;
      const wy = (v.y || 0) + ry;
      const wz = v.z - rx * sinY + pz * cosY;
      return [wx, wy, wz];
    };

    const bodyCol = [...v.color, 1.0];
    const glassCol = [0.18, 0.28, 0.40, 1.0];
    const wheelCol = [0.12, 0.12, 0.14, 1.0];
    const chromeCol = [0.82, 0.84, 0.88, 1.0];

    const type = v.type || 'sedan';
    const hw = v.width / 2;
    const hl = v.length / 2;

    // Ground shadow stretching along sun direction
    this.drawGroundShadow(v.x, v.z, v.width * 1.15, v.length * 1.05, 0.6);

    if (type === 'bus') {
      const bh = 2.7;
      const b1 = toWorld(-hw, 0.35, -hl), b2 = toWorld(hw, 0.35, -hl);
      const b3 = toWorld(hw, 0.35 + bh, -hl), b4 = toWorld(-hw, 0.35 + bh, -hl);
      const b5 = toWorld(-hw, 0.35, hl), b6 = toWorld(hw, 0.35, hl);
      const b7 = toWorld(hw, 0.35 + bh, hl), b8 = toWorld(-hw, 0.35 + bh, hl);

      this.pushDynamicQuad(b4, b3, b7, b8, [0, 1, 0], [0.92, 0.92, 0.94, 1.0]);
      this.pushDynamicQuad(b5, b6, b7, b8, [sinY, 0, cosY], bodyCol);
      this.pushDynamicQuad(b2, b1, b4, b3, [-sinY, 0, -cosY], bodyCol);
      this.pushDynamicQuad(b1, b5, b8, b4, [-cosY, 0, sinY], bodyCol);
      this.pushDynamicQuad(b6, b2, b3, b7, [cosY, 0, -sinY], bodyCol);

      const gw1 = toWorld(-hw - 0.02, 1.5, -hl * 0.9);
      const gw2 = toWorld(-hw - 0.02, 1.5, hl * 0.8);
      const gw3 = toWorld(-hw - 0.02, 2.4, hl * 0.8);
      const gw4 = toWorld(-hw - 0.02, 2.4, -hl * 0.9);
      this.pushDynamicQuad(gw1, gw2, gw3, gw4, [-cosY, 0, sinY], [0.20, 0.35, 0.48, 1.0]);

      const egw1 = toWorld(hw + 0.02, 1.5, -hl * 0.9);
      const egw2 = toWorld(hw + 0.02, 1.5, hl * 0.8);
      const egw3 = toWorld(hw + 0.02, 2.4, hl * 0.8);
      const egw4 = toWorld(hw + 0.02, 2.4, -hl * 0.9);
      this.pushDynamicQuad(egw2, egw1, egw4, egw3, [cosY, 0, -sinY], [0.20, 0.35, 0.48, 1.0]);

      const fw1 = toWorld(-hw * 0.9, 1.2, hl + 0.02);
      const fw2 = toWorld(hw * 0.9, 1.2, hl + 0.02);
      const fw3 = toWorld(hw * 0.9, 2.5, hl * 0.95);
      const fw4 = toWorld(-hw * 0.9, 2.5, hl * 0.95);
      this.pushDynamicQuad(fw1, fw2, fw3, fw4, [sinY, 0, cosY], glassCol);

      const destBox = toWorld(0, 2.7, hl + 0.04);
      this.pushDynamicBox(destBox[0], destBox[1], destBox[2], 1.6, 0.35, 0.12, [0.96, 0.82, 0.14, 1.0]);

      const ac1 = toWorld(0, 0.35 + bh + 0.25, -1.5);
      const ac2 = toWorld(0, 0.35 + bh + 0.25, 2.0);
      this.pushDynamicBox(ac1[0], ac1[1], ac1[2], 1.8, 0.4, 2.4, [0.82, 0.84, 0.86, 1.0]);
      this.pushDynamicBox(ac2[0], ac2[1], ac2[2], 1.8, 0.4, 2.4, [0.82, 0.84, 0.86, 1.0]);

      const bWheels = [
        [-hw - 0.05, 0.45, hl * 0.65], [hw + 0.05, 0.45, hl * 0.65],
        [-hw - 0.05, 0.45, -hl * 0.45], [hw + 0.05, 0.45, -hl * 0.45],
        [-hw - 0.05, 0.45, -hl * 0.75], [hw + 0.05, 0.45, -hl * 0.75],
      ];
      for (const bp of bWheels) {
        const pos = toWorld(bp[0], bp[1], bp[2]);
        this.pushDynamicBox(pos[0], pos[1] - 0.15, pos[2], 0.42, 0.85, 0.85, wheelCol);
      }
    } else if (type === 'truck') {
      const cabL = 2.4, cabH = 2.3, boxL = 5.2, boxH = 2.8;

      const c1 = toWorld(-hw, 0.35, hl - cabL), c2 = toWorld(hw, 0.35, hl - cabL);
      const c3 = toWorld(hw, 0.35 + cabH, hl - cabL), c4 = toWorld(-hw, 0.35 + cabH, hl - cabL);
      const c5 = toWorld(-hw, 0.35, hl), c6 = toWorld(hw, 0.35, hl);
      const c7 = toWorld(hw, 0.35 + cabH, hl), c8 = toWorld(-hw, 0.35 + cabH, hl);
      this.pushDynamicQuad(c4, c3, c7, c8, [0, 1, 0], bodyCol);
      this.pushDynamicQuad(c5, c6, c7, c8, [sinY, 0, cosY], bodyCol);
      this.pushDynamicQuad(c1, c5, c8, c4, [-cosY, 0, sinY], bodyCol);
      this.pushDynamicQuad(c6, c2, c3, c7, [cosY, 0, -sinY], bodyCol);

      const tw1 = toWorld(-hw * 0.85, 1.3, hl + 0.02);
      const tw2 = toWorld(hw * 0.85, 1.3, hl + 0.02);
      const tw3 = toWorld(hw * 0.85, 2.3, hl - 0.2);
      const tw4 = toWorld(-hw * 0.85, 2.3, hl - 0.2);
      this.pushDynamicQuad(tw1, tw2, tw3, tw4, [sinY, 0, cosY], glassCol);

      const grPos = toWorld(0, 0.95, hl + 0.04);
      this.pushDynamicBox(grPos[0], grPos[1], grPos[2], 1.4, 0.9, 0.12, chromeCol);

      const ex1 = toWorld(-hw - 0.1, 2.2, hl - cabL - 0.15);
      const ex2 = toWorld(hw + 0.1, 2.2, hl - cabL - 0.15);
      this.pushDynamicBox(ex1[0], ex1[1], ex1[2], 0.14, 1.8, 0.14, chromeCol);
      this.pushDynamicBox(ex2[0], ex2[1], ex2[2], 0.14, 1.8, 0.14, chromeCol);

      const boxPos = toWorld(0, 0.4 + boxH / 2, -hl + boxL / 2);
      this.pushDynamicBox(boxPos[0], boxPos[1], boxPos[2], v.width + 0.1, boxH, boxL, [0.78, 0.80, 0.84, 1.0]);

      const tWheels = [
        [-hw - 0.05, 0.45, hl - 1.0], [hw + 0.05, 0.45, hl - 1.0],
        [-hw - 0.05, 0.45, -hl + 2.2], [hw + 0.05, 0.45, -hl + 2.2],
        [-hw - 0.05, 0.45, -hl + 0.9], [hw + 0.05, 0.45, -hl + 0.9],
      ];
      for (const tp of tWheels) {
        const pos = toWorld(tp[0], tp[1], tp[2]);
        this.pushDynamicBox(pos[0], pos[1] - 0.15, pos[2], 0.38, 0.8, 0.8, wheelCol);
      }
    } else {
      const bh = type === 'sports' ? 0.68 : (type === 'muscle' ? 0.78 : 0.85);

      const p1 = toWorld(-hw, 0.3, -hl), p2 = toWorld(hw, 0.3, -hl);
      const p3 = toWorld(hw, 0.3 + bh, -hl), p4 = toWorld(-hw, 0.3 + bh, -hl);
      const p5 = toWorld(-hw, 0.3, hl), p6 = toWorld(hw, 0.3, hl);
      const p7 = toWorld(hw, 0.3 + bh, hl), p8 = toWorld(-hw, 0.3 + bh, hl);

      this.pushDynamicQuad(p4, p3, p7, p8, [0, 1, 0], bodyCol);
      this.pushDynamicQuad(p5, p6, p7, p8, [sinY, 0, cosY], bodyCol);
      this.pushDynamicQuad(p2, p1, p4, p3, [-sinY, 0, -cosY], bodyCol);
      this.pushDynamicQuad(p1, p5, p8, p4, [-cosY, 0, sinY], bodyCol);
      this.pushDynamicQuad(p6, p2, p3, p7, [cosY, 0, -sinY], bodyCol);

      const cw = hw * (type === 'sports' ? 0.82 : 0.88);
      const ch = type === 'sports' ? 0.52 : (type === 'muscle' ? 0.62 : 0.68);
      const cp1 = toWorld(-cw, 0.3 + bh, -hl * 0.4), cp2 = toWorld(cw, 0.3 + bh, -hl * 0.4);
      const cp3 = toWorld(cw, 0.3 + bh + ch, -hl * 0.28), cp4 = toWorld(-cw, 0.3 + bh + ch, -hl * 0.28);
      const cp5 = toWorld(-cw, 0.3 + bh, hl * 0.32), cp6 = toWorld(cw, 0.3 + bh, hl * 0.32);
      const cp7 = toWorld(cw, 0.3 + bh + ch, hl * 0.15), cp8 = toWorld(-cw, 0.3 + bh + ch, hl * 0.15);

      const roofCol = v.roofColor ? [...v.roofColor, 1.0] : bodyCol;
      this.pushDynamicQuad(cp4, cp3, cp7, cp8, [0, 1, 0], roofCol);
      this.pushDynamicQuad(cp8, cp7, cp6, cp5, [sinY, 0.4, cosY], glassCol);
      this.pushDynamicQuad(cp2, cp1, cp4, cp3, [-sinY, 0.4, -cosY], glassCol);
      this.pushDynamicQuad(cp1, cp5, cp8, cp4, [-cosY, 0, sinY], glassCol);
      this.pushDynamicQuad(cp6, cp2, cp3, cp7, [cosY, 0, -sinY], glassCol);

      if (type === 'sports') {
        const wingY = 0.3 + bh + 0.55;
        const pylonL = toWorld(-hw * 0.65, wingY - 0.25, -hl * 0.85);
        const pylonR = toWorld(hw * 0.65, wingY - 0.25, -hl * 0.85);
        this.pushDynamicBox(pylonL[0], pylonL[1], pylonL[2], 0.08, 0.35, 0.25, [0.12, 0.12, 0.15, 1.0]);
        this.pushDynamicBox(pylonR[0], pylonR[1], pylonR[2], 0.08, 0.35, 0.25, [0.12, 0.12, 0.15, 1.0]);
        const wingBlade = toWorld(0, wingY, -hl * 0.88);
        this.pushDynamicBox(wingBlade[0], wingBlade[1], wingBlade[2], v.width * 0.95, 0.08, 0.45, bodyCol);

        // Dual performance exhaust tips
        const exL = toWorld(-hw * 0.50, 0.35, -hl - 0.08);
        const exR = toWorld(hw * 0.50, 0.35, -hl - 0.08);
        this.pushDynamicBox(exL[0], exL[1], exL[2], 0.14, 0.12, 0.16, chromeCol);
        this.pushDynamicBox(exR[0], exR[1], exR[2], 0.14, 0.12, 0.16, chromeCol);
      }

      if (type === 'muscle') {
        const scoopPos = toWorld(0, 0.3 + bh + 0.12, hl * 0.45);
        this.pushDynamicBox(scoopPos[0], scoopPos[1], scoopPos[2], 0.75, 0.16, 1.1, [0.12, 0.12, 0.14, 1.0]);

        // Dual black racing stripes along hood and deck
        const str1 = toWorld(-0.16, 0.3 + bh + 0.01, hl * 0.1);
        const str2 = toWorld(0.16, 0.3 + bh + 0.01, hl * 0.1);
        this.pushDynamicBox(str1[0], str1[1], str1[2], 0.15, 0.02, hl * 1.6, [0.12, 0.12, 0.14, 1.0]);
        this.pushDynamicBox(str2[0], str2[1], str2[2], 0.15, 0.02, hl * 1.6, [0.12, 0.12, 0.14, 1.0]);
      }

      if (type === 'taxi') {
        const podPos = toWorld(0, 0.3 + bh + ch + 0.15, 0);
        this.pushDynamicBox(podPos[0], podPos[1], podPos[2], 0.75, 0.22, 0.35, [0.96, 0.85, 0.2, 1.0]);
        const chkL = toWorld(-hw - 0.02, 0.3 + bh * 0.6, 0);
        const chkR = toWorld(hw + 0.02, 0.3 + bh * 0.6, 0);
        this.pushDynamicBox(chkL[0], chkL[1], chkL[2], 0.04, 0.14, hl * 1.5, [0.12, 0.12, 0.14, 1.0]);
        this.pushDynamicBox(chkR[0], chkR[1], chkR[2], 0.04, 0.14, hl * 1.5, [0.12, 0.12, 0.14, 1.0]);
      }

      if (v.isPolice) {
        const flashRed = Math.sin(Date.now() * 0.018 + (v.sirenPhase || 0)) > 0;
        const barY = 0.3 + bh + ch + 0.14;
        const redPos = toWorld(-0.44, barY, 0);
        const bluePos = toWorld(0.44, barY, 0);

        // Emissive emergency lightbars (pure emissive color, visible in all lighting)
        const redCol = flashRed ? [1.0, 0.12, 0.12, 1.0] : [0.35, 0.04, 0.04, 1.0];
        const blueCol = !flashRed ? [0.12, 0.82, 1.0, 1.0] : [0.04, 0.15, 0.38, 1.0];
        this.pushEmissiveBox(redPos[0], redPos[1], redPos[2], 0.52, 0.28, 0.36, redCol);
        this.pushEmissiveBox(bluePos[0], bluePos[1], bluePos[2], 0.52, 0.28, 0.36, blueCol);

        // Center chrome siren speaker housing
        const spkPos = toWorld(0, barY, 0);
        this.pushDynamicBox(spkPos[0], spkPos[1], spkPos[2], 0.22, 0.18, 0.30, chromeCol);

        // Flashing light strobe halos in the air
        if (flashRed) {
          this.pushEmissiveBox(redPos[0], redPos[1], redPos[2], 1.1, 0.55, 0.9, [1.0, 0.18, 0.18, 0.45]);
        } else {
          this.pushEmissiveBox(bluePos[0], bluePos[1], bluePos[2], 1.1, 0.55, 0.9, [0.15, 0.85, 1.0, 0.45]);
        }

        // Flashing ground reflection pool on road
        const gFlashCol = flashRed ? [1.0, 0.10, 0.10, 0.38] : [0.10, 0.65, 1.0, 0.38];
        const gCenter = toWorld(0, -0.28, 0);
        this.pushDynamicQuad(
          [gCenter[0] - 2.8, 0.05, gCenter[2] - 3.2],
          [gCenter[0] + 2.8, 0.05, gCenter[2] - 3.2],
          [gCenter[0] + 2.8, 0.05, gCenter[2] + 3.2],
          [gCenter[0] - 2.8, 0.05, gCenter[2] + 3.2],
          [0, 0, 0],
          gFlashCol
        );

        const bbPos = toWorld(0, 0.6, hl + 0.18);
        this.pushDynamicBox(bbPos[0], bbPos[1], bbPos[2], v.width * 0.82, 0.55, 0.16, [0.15, 0.16, 0.18, 1.0]);

        // White police doors
        const dL = toWorld(-hw - 0.01, 0.3 + bh * 0.5, 0);
        const dR = toWorld(hw + 0.01, 0.3 + bh * 0.5, 0);
        this.pushDynamicBox(dL[0], dL[1], dL[2], 0.02, bh * 0.75, hl * 0.85, [0.95, 0.95, 0.98, 1.0]);
        this.pushDynamicBox(dR[0], dR[1], dR[2], 0.02, bh * 0.75, hl * 0.85, [0.95, 0.95, 0.98, 1.0]);
      }

      // Steerable & Spinning Wheels
      const steerAng = v.steer || 0;
      const wheelPositions = [
        [-hw * 0.85, 0.32, hl * 0.58, true],
        [hw * 0.85, 0.32, hl * 0.58, true],
        [-hw * 0.85, 0.32, -hl * 0.58, false],
        [hw * 0.85, 0.32, -hl * 0.58, false]
      ];
      for (const [wx, wy, wz, isFront] of wheelPositions) {
        const pos = toWorld(wx, wy, wz);
        this.pushDynamicBox(pos[0], pos[1] - 0.15, pos[2], 0.30, 0.62, 0.62, wheelCol);
        // Chrome wheel hub rim
        this.pushDynamicBox(pos[0], pos[1] - 0.15, pos[2], 0.34, 0.30, 0.30, chromeCol);
      }
    }

    // Vehicle Headlights (emissive lenses + projected light beam cones onto road)
    const hlCol = [1.0, 0.96, 0.85, 1.0];
    const leftHl = toWorld(-hw * 0.72, 0.62, hl + 0.06);
    const rightHl = toWorld(hw * 0.72, 0.62, hl + 0.06);
    this.pushDynamicBox(leftHl[0], leftHl[1], leftHl[2], 0.38, 0.22, 0.08, hlCol);
    this.pushDynamicBox(rightHl[0], rightHl[1], rightHl[2], 0.38, 0.22, 0.08, hlCol);

    // Projected headlight beam pools on asphalt
    const beamLength = 18.0;
    const beamSpread = 2.4;
    const bTipL = toWorld(-hw * 0.72 - beamSpread, -0.25, hl + beamLength);
    const bTipR = toWorld(hw * 0.72 + beamSpread, -0.25, hl + beamLength);
    const bBaseL = toWorld(-hw * 0.72, -0.25, hl + 0.5);
    const bBaseR = toWorld(hw * 0.72, -0.25, hl + 0.5);
    const beamAlpha = [1.0, 0.98, 0.85, 0.18];
    const beamFade = [1.0, 0.98, 0.85, 0.0];
    this.pushDynamicQuad(bBaseL, bBaseR, bTipR, bTipL, [0, 1, 0], beamAlpha);

    // Taillights & Reversing Lights
    const isBraking = v.isBraking || (v.speed < -0.1) || (v.throttle < 0 && v.speed > 0.5);
    const tlCol = isBraking ? [1.0, 0.15, 0.15, 1.0] : [0.65, 0.10, 0.10, 1.0];
    const leftTl = toWorld(-hw * 0.72, 0.62, -hl - 0.06);
    const rightTl = toWorld(hw * 0.72, 0.62, -hl - 0.06);
    this.pushDynamicBox(leftTl[0], leftTl[1], leftTl[2], 0.38, 0.18, 0.08, tlCol);
    this.pushDynamicBox(rightTl[0], rightTl[1], rightTl[2], 0.38, 0.18, 0.08, tlCol);

    if (v.speed < -0.1) {
      // White reversing lights
      const leftRev = toWorld(-hw * 0.40, 0.62, -hl - 0.06);
      const rightRev = toWorld(hw * 0.40, 0.62, -hl - 0.06);
      this.pushDynamicBox(leftRev[0], leftRev[1], leftRev[2], 0.24, 0.16, 0.08, [0.98, 0.98, 1.0, 1.0]);
      this.pushDynamicBox(rightRev[0], rightRev[1], rightRev[2], 0.24, 0.16, 0.08, [0.98, 0.98, 1.0, 1.0]);
    }
  }

  drawCharacter(char, type = 'ped') {
    const x = char.x;
    const y = char.y || 0;
    const z = char.z;
    const heading = char.heading || 0;
    const sinH = Math.sin(heading);
    const cosH = Math.cos(heading);

    let shirtCol = [0.32, 0.52, 0.82, 1.0];
    let pantsCol = [0.16, 0.18, 0.25, 1.0];
    let skinCol = [0.92, 0.76, 0.64, 1.0];
    let hairCol = [0.18, 0.14, 0.12, 1.0];

    if (type === 'player') {
      shirtCol = [0.88, 0.18, 0.16, 1.0];
      pantsCol = [0.16, 0.18, 0.24, 1.0];
      hairCol = [0.15, 0.12, 0.10, 1.0];
    } else if (type === 'police') {
      shirtCol = [0.12, 0.18, 0.35, 1.0];
      pantsCol = [0.10, 0.14, 0.22, 1.0];
      hairCol = [0.12, 0.14, 0.25, 1.0];
    } else if (type === 'syndicate') {
      shirtCol = [0.55, 0.18, 0.55, 1.0];
      pantsCol = [0.12, 0.12, 0.15, 1.0];
    } else if (char.outfit) {
      shirtCol = [...char.outfit.shirt, 1.0];
      pantsCol = [...char.outfit.pants, 1.0];
    }

    const speed = Math.abs(char.speed || 0);
    const isMoving = speed > 0.3;
    const stride = isMoving ? Math.sin(char.animTime || 0) : 0;
    const armSwing = isMoving ? Math.sin(char.animTime || 0) : 0;

    const lean = Math.min(0.22, speed * 0.035);
    const leanZ = Math.cos(heading) * lean;
    const leanX = Math.sin(heading) * lean;

    // Soft elongated character ground shadow
    this.drawGroundShadow(x, z, 0.85, 0.85, 1.2);

    const legLSwing = stride * 0.35;
    const lThighX = x - 0.16 * cosH + Math.sin(heading) * legLSwing;
    const lThighZ = z + 0.16 * sinH + Math.cos(heading) * legLSwing;
    this.pushDynamicBox(lThighX, y + 0.42, lThighZ, 0.24, 0.44, 0.24, pantsCol);
    this.pushDynamicBox(lThighX, y, lThighZ, 0.22, 0.42, 0.26, [0.12, 0.12, 0.14, 1.0]);

    const legRSwing = -stride * 0.35;
    const rThighX = x + 0.16 * cosH + Math.sin(heading) * legRSwing;
    const rThighZ = z - 0.16 * sinH + Math.cos(heading) * legRSwing;
    this.pushDynamicBox(rThighX, y + 0.42, rThighZ, 0.24, 0.44, 0.24, pantsCol);
    this.pushDynamicBox(rThighX, y, rThighZ, 0.22, 0.42, 0.26, [0.12, 0.12, 0.14, 1.0]);

    const torsoX = x + leanX * 0.5;
    const torsoZ = z + leanZ * 0.5;
    // Main Torso / Jacket
    this.pushDynamicBox(torsoX, y + 0.85, torsoZ, 0.58, 0.72, 0.34, shirtCol);

    if (type === 'player') {
      // Courier messenger satchel across back
      const bagX = torsoX - Math.sin(heading) * 0.18 - Math.cos(heading) * 0.12;
      const bagZ = torsoZ - Math.cos(heading) * 0.18 + Math.sin(heading) * 0.12;
      this.pushDynamicBox(bagX, y + 0.92, bagZ, 0.42, 0.36, 0.22, [0.15, 0.15, 0.18, 1.0]);
      // Bright yellow courier shoulder strap across chest
      this.pushDynamicBox(torsoX, y + 1.18, torsoZ, 0.52, 0.09, 0.36, [0.96, 0.82, 0.15, 1.0]);
      // Jacket black collar trim
      this.pushDynamicBox(torsoX, y + 1.50, torsoZ, 0.42, 0.10, 0.28, [0.14, 0.14, 0.18, 1.0]);
      // Belt with buckle
      this.pushDynamicBox(torsoX, y + 0.82, torsoZ, 0.60, 0.08, 0.35, [0.12, 0.12, 0.14, 1.0]);
      this.pushDynamicBox(torsoX + sinH * 0.18, y + 0.82, torsoZ + cosH * 0.18, 0.14, 0.07, 0.04, [0.85, 0.85, 0.88, 1.0]);
    }

    this.pushDynamicBox(torsoX, y + 1.57, torsoZ, 0.18, 0.12, 0.18, skinCol);
    this.pushDynamicBox(torsoX, y + 1.68, torsoZ, 0.34, 0.36, 0.34, skinCol);
    this.pushDynamicBox(torsoX, y + 1.88, torsoZ, 0.36, 0.14, 0.36, hairCol);

    const hasGun = (type === 'player' && char.hasWeapon) || type === 'police' || type === 'syndicate';
    if (hasGun) {
      const gunArmX = torsoX + sinH * 0.45 + cosH * 0.20;
      const gunArmZ = torsoZ + cosH * 0.45 - sinH * 0.20;
      this.pushDynamicBox(gunArmX, y + 1.15, gunArmZ, 0.18, 0.18, 0.42, shirtCol);
      this.pushDynamicBox(gunArmX, y + 1.12, gunArmZ + cosH * 0.25, 0.12, 0.16, 0.55, [0.15, 0.16, 0.18, 1.0]);
      const leftArmX = torsoX + sinH * 0.28 - cosH * 0.20;
      const leftArmZ = torsoZ + cosH * 0.28 + sinH * 0.20;
      this.pushDynamicBox(leftArmX, y + 1.10, leftArmZ, 0.18, 0.18, 0.32, shirtCol);
    } else {
      const lArmSwing = -armSwing * 0.28;
      const rArmSwing = armSwing * 0.28;
      const lArmX = torsoX - 0.34 * cosH + Math.sin(heading) * lArmSwing;
      const lArmZ = torsoZ + 0.34 * sinH + Math.cos(heading) * lArmSwing;
      const rArmX = torsoX + 0.34 * cosH + Math.sin(heading) * rArmSwing;
      const rArmZ = torsoZ - 0.34 * sinH + Math.cos(heading) * rArmSwing;

      this.pushDynamicBox(lArmX, y + 0.95, lArmZ, 0.18, 0.65, 0.18, shirtCol);
      this.pushDynamicBox(lArmX, y + 0.80, lArmZ, 0.14, 0.16, 0.14, skinCol);
      this.pushDynamicBox(rArmX, y + 0.95, rArmZ, 0.18, 0.65, 0.18, shirtCol);
      this.pushDynamicBox(rArmX, y + 0.80, rArmZ, 0.14, 0.16, 0.14, skinCol);
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
    const skidCol = [0.12, 0.14, 0.16, 1.0];
    this.pushDynamicBox(x - 1.2, y - 1.2, z, 0.18, 0.18, 4.4, skidCol);
    this.pushDynamicBox(x + 1.2, y - 1.2, z, 0.18, 0.18, 4.4, skidCol);
    this.pushDynamicBox(x - 1.2, y - 0.6, z - 1.2, 0.12, 1.1, 0.12, skidCol);
    this.pushDynamicBox(x + 1.2, y - 0.6, z - 1.2, 0.12, 1.1, 0.12, skidCol);
    this.pushDynamicBox(x - 1.2, y - 0.6, z + 1.2, 0.12, 1.1, 0.12, skidCol);
    this.pushDynamicBox(x + 1.2, y - 0.6, z + 1.2, 0.12, 1.1, 0.12, skidCol);

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

    // Nose-mounted searchlight housing & illuminated emissive lens
    this.pushDynamicBox(x, y - 0.7, z + 1.8, 0.5, 0.5, 0.6, [0.20, 0.22, 0.25, 1.0]);
    this.pushEmissiveBox(x, y - 0.7, z + 2.12, 0.45, 0.45, 0.12, [1.0, 1.0, 0.92, 1.0]);

    // Aviation Navigation Strobe Lights (Port Red, Starboard Green, Tail Beacon)
    this.pushEmissiveBox(x - 1.35, y - 1.1, z, 0.22, 0.22, 0.22, [1.0, 0.12, 0.12, 1.0]);
    this.pushEmissiveBox(x + 1.35, y - 1.1, z, 0.22, 0.22, 0.22, [0.12, 1.0, 0.35, 1.0]);
    this.pushEmissiveBox(x, y + 0.9, z - 7.0, 0.24, 0.32, 0.24, [1.0, 1.0, 1.0, 1.0]);

    // Volumetric Downward Searchlight Beam Cone & Ground Spotlight Pool
    const spotTargetX = heli.spotlightX ?? x;
    const spotTargetZ = heli.spotlightZ ?? (z - 5);
    const coneRadius = 5.5;

    // Ground spotlight pool (emissive bright decal on asphalt)
    this.pushDynamicQuad(
      [spotTargetX - coneRadius, 0.06, spotTargetZ - coneRadius],
      [spotTargetX + coneRadius, 0.06, spotTargetZ - coneRadius],
      [spotTargetX + coneRadius, 0.06, spotTargetZ + coneRadius],
      [spotTargetX - coneRadius, 0.06, spotTargetZ + coneRadius],
      [0, 0, 0],
      [1.0, 0.98, 0.85, 0.48]
    );

    // Volumetric light beam cone from helicopter nose to ground (emissive unlit triangles)
    const nose = [x, y - 0.7, z + 2.1];
    const beamCol = [1.0, 0.98, 0.88, 0.24];
    const zeroNorm = [0, 0, 0];

    const cp1 = [spotTargetX - coneRadius, 0.1, spotTargetZ - coneRadius];
    const cp2 = [spotTargetX + coneRadius, 0.1, spotTargetZ - coneRadius];
    const cp3 = [spotTargetX + coneRadius, 0.1, spotTargetZ + coneRadius];
    const cp4 = [spotTargetX - coneRadius, 0.1, spotTargetZ + coneRadius];

    this.pushDynamicQuad(nose, nose, cp2, cp1, zeroNorm, beamCol);
    this.pushDynamicQuad(nose, nose, cp3, cp2, zeroNorm, beamCol);
    this.pushDynamicQuad(nose, nose, cp4, cp3, zeroNorm, beamCol);
    this.pushDynamicQuad(nose, nose, cp1, cp4, zeroNorm, beamCol);
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

  drawSkidMarks(skidMarks) {
    if (!skidMarks) return;
    for (const sm of skidMarks) {
      if (sm.life <= 0) continue;
      const cosA = Math.cos(sm.angle), sinA = Math.sin(sm.angle);
      const hw = (sm.width || 0.35) * 0.5;
      const hl = 0.55;
      const p1 = [sm.x - hw * cosA - hl * sinA, 0.08, sm.z + hw * sinA - hl * cosA];
      const p2 = [sm.x + hw * cosA - hl * sinA, 0.08, sm.z - hw * sinA - hl * cosA];
      const p3 = [sm.x + hw * cosA + hl * sinA, 0.08, sm.z - hw * sinA + hl * cosA];
      const p4 = [sm.x - hw * cosA + hl * sinA, 0.08, sm.z + hw * sinA + hl * cosA];
      const col = [0.08, 0.08, 0.10, Math.min(0.75, sm.alpha * sm.life)];
      this.pushDynamicQuad(p1, p2, p3, p4, [0, 1, 0], col);
    }
  }

  drawFireHydrants(hydrants) {
    if (!hydrants) return;
    const redCol = [0.88, 0.16, 0.14, 1.0];
    const brassCol = [0.85, 0.72, 0.25, 1.0];
    const flangeCol = [0.22, 0.22, 0.25, 1.0];
    for (const h of hydrants) {
      const y = 0.22;
      this.pushDynamicBox(h.x, y, h.z, 0.52, 0.08, 0.52, flangeCol);
      this.pushDynamicBox(h.x, y + 0.08, h.z, 0.36, 0.65, 0.36, redCol);
      this.pushDynamicBox(h.x - 0.24, y + 0.36, h.z, 0.16, 0.16, 0.16, brassCol);
      this.pushDynamicBox(h.x + 0.24, y + 0.36, h.z, 0.16, 0.16, 0.16, brassCol);
      this.pushDynamicBox(h.x, y + 0.36, h.z + 0.22, 0.18, 0.18, 0.14, brassCol);
      if (!h.bursted) {
        this.pushDynamicBox(h.x, y + 0.73, h.z, 0.38, 0.12, 0.38, redCol);
        this.pushDynamicBox(h.x, y + 0.85, h.z, 0.14, 0.10, 0.14, brassCol);
      } else {
        this.pushDynamicBox(h.x + 0.45, 0.22, h.z + 0.3, 0.14, 0.10, 0.14, brassCol);
      }
    }
  }

  drawDumpsters(dumpsters) {
    if (!dumpsters) return;
    const lidCol = [0.14, 0.15, 0.16, 1.0];
    for (const d of dumpsters) {
      const bodyCol = d.color ? [...d.color, 1.0] : [0.18, 0.32, 0.22, 1.0];
      const y = 0.12;
      const tilt = d.knockAngle || 0;
      const tiltY = Math.sin(tilt) * 0.45;
      const tiltX = Math.cos(d.angle + Math.PI / 2) * tiltY;
      const tiltZ = -Math.sin(d.angle + Math.PI / 2) * tiltY;

      this.pushDynamicBox(d.x + tiltX, y + (d.knocked ? 0.05 : 0.0), d.z + tiltZ, 2.2, 1.3, 1.4, bodyCol);
      this.pushDynamicBox(d.x + tiltX, y + 1.25, d.z + tiltZ, 2.3, 0.12, 1.5, [0.12, 0.14, 0.14, 1.0]);
      this.pushDynamicBox(d.x + tiltX - 1.15, y + 0.65, d.z + tiltZ, 0.12, 0.22, 1.2, [0.12, 0.14, 0.14, 1.0]);
      this.pushDynamicBox(d.x + tiltX + 1.15, y + 0.65, d.z + tiltZ, 0.12, 0.22, 1.2, [0.12, 0.14, 0.14, 1.0]);
      if (!d.knocked) {
        this.pushDynamicBox(d.x, y + 1.35, d.z - 0.35, 2.15, 0.08, 0.65, lidCol);
        this.pushDynamicBox(d.x, y + 1.35, d.z + 0.35, 2.15, 0.08, 0.65, lidCol);
      } else {
        this.pushDynamicBox(d.x + 0.6, y + 0.08, d.z - 0.8, 1.1, 0.08, 0.65, lidCol);
        this.pushDynamicBox(d.x - 0.4, y + 0.08, d.z + 0.9, 0.7, 0.15, 0.7, [0.75, 0.65, 0.45, 1.0]);
      }
    }
  }

  drawNewsVendors(newsVendors) {
    if (!newsVendors) return;
    const glassCol = [0.85, 0.92, 0.98, 0.85];
    const paperCol = [0.94, 0.92, 0.88, 1.0];
    for (const nv of newsVendors) {
      const y = 0.22;
      const col = [...nv.color, 1.0];
      this.pushDynamicBox(nv.x, y, nv.z, 0.25, 0.45, 0.25, [0.15, 0.16, 0.18, 1.0]);
      this.pushDynamicBox(nv.x, y + 0.45, nv.z, 0.65, 0.75, 0.55, col);
      this.pushDynamicBox(nv.x, y + 0.55, nv.z + 0.28, 0.48, 0.45, 0.04, glassCol);
      this.pushDynamicBox(nv.x, y + 0.58, nv.z + 0.22, 0.42, 0.38, 0.05, paperCol);
      this.pushDynamicBox(nv.x + 0.22, y + 0.88, nv.z + 0.28, 0.10, 0.12, 0.06, [0.85, 0.85, 0.88, 1.0]);
    }
  }

  drawMixtapes(mixtapes) {
    if (!mixtapes) return;
    const curTime = performance.now() * 0.001;
    const neonMagenta = [0.98, 0.15, 0.65, 1.0];
    const tapeCol = [0.15, 0.14, 0.18, 1.0];
    const labelCol = [0.98, 0.92, 0.25, 1.0];

    for (const m of mixtapes) {
      if (m.collected) continue;
      const hoverY = 1.15 + Math.sin(curTime * 2.8 + m.id) * 0.18;
      const yaw = curTime * 1.6 + m.id;
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);

      const hw = 0.31, hh = 0.19, hd = 0.04;
      const transform = (lx, ly, lz) => [
        m.x + lx * cosY + lz * sinY,
        hoverY + ly,
        m.z - lx * sinY + lz * cosY
      ];

      const p1 = transform(-hw, -hh, -hd), p2 = transform(hw, -hh, -hd);
      const p3 = transform(hw, hh, -hd), p4 = transform(-hw, hh, -hd);
      const p5 = transform(-hw, -hh, hd), p6 = transform(hw, -hh, hd);
      const p7 = transform(hw, hh, hd), p8 = transform(-hw, hh, hd);

      this.pushDynamicQuad(p4, p3, p7, p8, [0, 1, 0], neonMagenta);
      this.pushDynamicQuad(p5, p6, p7, p8, [sinY, 0, cosY], neonMagenta);
      this.pushDynamicQuad(p2, p1, p4, p3, [-sinY, 0, -cosY], neonMagenta);
      this.pushDynamicQuad(p1, p5, p8, p4, [-cosY, 0, sinY], neonMagenta);
      this.pushDynamicQuad(p6, p2, p3, p7, [cosY, 0, -sinY], neonMagenta);

      const lpFront = transform(0, 0, hd + 0.01);
      this.pushDynamicBox(lpFront[0], lpFront[1] - 0.08, lpFront[2], 0.44, 0.18, 0.02, labelCol);

      const winFront = transform(0, -0.02, hd + 0.015);
      this.pushDynamicBox(winFront[0], winFront[1] - 0.04, winFront[2], 0.22, 0.08, 0.02, tapeCol);

      const ringPulse = 0.45 + Math.sin(curTime * 4.0 + m.id) * 0.15;
      this.drawGroundShadow(m.x, m.z, ringPulse, ringPulse, 0.8);
    }
  }

  drawPigeonFlocks(flocks) {
    if (!flocks) return;
    const time = performance.now() * 0.001;
    const pigeonGrey = [0.46, 0.48, 0.54, 1.0];
    const neckGreen = [0.28, 0.58, 0.45, 1.0];
    const beakCol = [0.95, 0.75, 0.20, 1.0];
    const wingCol = [0.35, 0.36, 0.42, 1.0];

    for (const f of flocks) {
      for (const b of f.birds) {
        const bx = f.x + (b.ox || 0);
        const by = 0.22 + (b.oy || 0);
        const bz = f.z + (b.oz || 0);

        if (b.state === 'pecking') {
          const peckY = Math.abs(Math.sin(time * 3.5 + (b.seed || 0))) * 0.04;
          this.pushDynamicBox(bx, by, bz, 0.18, 0.14, 0.26, pigeonGrey);
          this.pushDynamicBox(bx, by + 0.08, bz + 0.10, 0.12, 0.12, 0.12, neckGreen);
          this.pushDynamicBox(bx, by + 0.12 - peckY, bz + 0.16, 0.09, 0.09, 0.09, pigeonGrey);
          this.pushDynamicBox(bx, by + 0.10 - peckY, bz + 0.22, 0.04, 0.04, 0.06, beakCol);
        } else {
          const flap = Math.sin(time * 16.0 + (b.seed || 0)) * 0.12;
          this.pushDynamicBox(bx, by, bz, 0.16, 0.12, 0.28, pigeonGrey);
          this.pushDynamicBox(bx - 0.20, by + 0.06 + flap, bz, 0.28, 0.03, 0.18, wingCol);
          this.pushDynamicBox(bx + 0.20, by + 0.06 + flap, bz, 0.28, 0.03, 0.18, wingCol);
          this.pushDynamicBox(bx, by + 0.08, bz + 0.14, 0.09, 0.09, 0.09, neckGreen);
        }
      }
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

    // Alpha blending enabled for soft ground shadows, glass, water foam, and light beams
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

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

    const curTime = performance.now() * 0.001;
    gl.uniform1f(this.uniforms.uTime, curTime);
    gl.uniform2f(this.uniforms.uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);

    let sirenR = 0, sirenG = 0, sirenB = 0;
    if (police.wantedLevel > 0) {
      const flash = Math.sin(Date.now() * 0.016) > 0;
      sirenR = flash ? 1.0 : 0.0;
      sirenB = flash ? 0.0 : 1.0;
    }
    gl.uniform3f(this.uniforms.sirenLight, sirenR, sirenG, sirenB);

    // Bind procedural noise texture
    if (this.noiseTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
      gl.uniform1i(this.uniforms.noiseTex, 0);
    }

    // 1. Static world
    gl.bindBuffer(gl.ARRAY_BUFFER, this.staticVbo);
    this.setupVertexAttribPointers();
    gl.drawArrays(gl.TRIANGLES, 0, this.staticVertexCount);

    // 2. Dynamic entities
    this.beginDynamic();

    // Road skid marks from hard braking & drifting
    this.drawSkidMarks(particles.skidMarks);

    // Living world interactives: fire hydrants, dumpsters, newspaper honor boxes, mixtapes, pigeons
    this.drawFireHydrants(world.fireHydrants);
    this.drawDumpsters(world.dumpsters);
    this.drawNewsVendors(world.newsVendors);
    this.drawMixtapes(world.mixtapes);
    this.drawPigeonFlocks(world.pigeonFlocks);

    // Dynamic Traffic Light Signal Lenses
    for (const p of world.props) {
      if (p.type === 'traffic_light') {
        const isEW = (p.rotation === 0 || p.rotation === Math.PI);
        const signal = world.getTrafficLightColor(isEW ? 'ew' : 'ns');
        const redCol = signal === 'red' ? [1.0, 0.15, 0.10, 1.0] : [0.22, 0.04, 0.04, 1.0];
        const amberCol = signal === 'amber' ? [1.0, 0.75, 0.10, 1.0] : [0.22, 0.16, 0.04, 1.0];
        const greenCol = signal === 'green' ? [0.10, 1.0, 0.35, 1.0] : [0.04, 0.20, 0.08, 1.0];

        this.pushDynamicBox(p.x, 4.85, p.z, 0.52, 0.35, 0.52, redCol);
        this.pushDynamicBox(p.x, 4.40, p.z, 0.52, 0.35, 0.52, amberCol);
        this.pushDynamicBox(p.x, 3.95, p.z, 0.52, 0.35, 0.52, greenCol);
      }
    }

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
