/**
 * Nightfall City: Vela Bay - High-Fidelity WebGL Renderer
 * Authored by makefun agent for the open-world crime game challenge.
 *
 * Implements:
 * - Directional low-sun lighting with golden sunlit faces and cool blue-teal shade on back-faces
 * - Solid 3D block reads with sharp edge normals and per-face tonal contrast
 * - Procedural road puddles that catch sky gradient and solar specular glint
 * - Facade window grids with varied colors (golden interior, sky reflection, ochre blinds, dark frames)
 * - Ground-floor storefront neon & warm interior showcase glow
 * - Dynamic dual-tone police strobe lights washing roads and buildings
 * - Harmonic wave displacement with sun path glint and foam crests
 * - Multi-stop sunset atmospheric sky dome with solar corona and sun disc
 * - Soft golden-hour distance depth fog
 */

import { M4, V3 } from './math.js';
import { LIGHTING } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', {
      antialias: true,
      alpha: false,
      depth: true,
      powerPreference: 'high-performance',
    });

    if (!this.gl) {
      throw new Error('WebGL rendering context initialization failed');
    }

    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    this.programs = {};
    this.buffers = {};

    this.matProj = M4.create();
    this.matView = M4.create();
    this.matModel = M4.create();

    this.initShaders();
    this.initSkyMesh();
    this.initDynamicMeshBuffers();
  }

  createShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${err}\nSource:\n${source}`);
    }
    return shader;
  }

  createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = this.createShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error(`Program link error: ${err}`);
    }
    return prog;
  }

  initShaders() {
    const gl = this.gl;

    // --- World & Entities Shader ---
    const vsWorld = `
      precision highp float;
      attribute vec3 a_pos;
      attribute vec3 a_norm;
      attribute vec4 a_col;
      attribute vec2 a_uv;

      uniform mat4 u_proj;
      uniform mat4 u_view;
      uniform mat4 u_model;

      varying vec3 v_worldPos;
      varying vec3 v_normal;
      varying vec4 v_color;
      varying vec2 v_uv;

      void main() {
        vec4 worldPos = u_model * vec4(a_pos, 1.0);
        v_worldPos = worldPos.xyz;
        v_normal = normalize((u_model * vec4(a_norm, 0.0)).xyz);
        v_color = a_col;
        v_uv = a_uv;
        gl_Position = u_proj * u_view * worldPos;
      }
    `;

    const fsWorld = `
      precision highp float;
      varying vec3 v_worldPos;
      varying vec3 v_normal;
      varying vec4 v_color;
      varying vec2 v_uv;

      uniform vec3 u_sunDir;
      uniform vec3 u_sunCol;
      uniform vec3 u_skyCol;
      uniform vec3 u_shadeCol;
      uniform vec3 u_groundCol;
      uniform vec3 u_camPos;
      uniform vec3 u_fogCol;
      uniform float u_fogDen;
      uniform float u_time;

      // Dynamic emergency flashers (police cruisers)
      uniform vec3 u_siren1Pos;
      uniform vec3 u_siren1Col;
      uniform vec3 u_siren2Pos;
      uniform vec3 u_siren2Col;

      void main() {
        vec3 N = normalize(v_normal);
        vec3 L = normalize(u_sunDir);
        vec3 V = normalize(u_camPos - v_worldPos);
        vec3 H = normalize(L + V);

        // 1. Direct Sun & Cool Blue-Teal Shade Per-Face Lighting
        float NdotL = dot(N, L);
        vec3 sunLit = u_sunCol * (pow(max(NdotL, 0.0), 0.85) * 1.35);
        vec3 shadeLit = u_shadeCol * (0.70 + 0.30 * clamp(-NdotL, 0.0, 1.0));

        float sunFactor = smoothstep(-0.08, 0.16, NdotL);
        vec3 directLighting = mix(shadeLit, sunLit, sunFactor);

        // 2. Dual-Hemisphere Ambient (Sky dome above, warm sand/ochre bounce below)
        float hemi = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 ambient = mix(u_groundCol * 0.85, u_skyCol, hemi) * 1.15;

        // 3. Ground contact ambient shadow / crevice occlusion
        float contactAO = (N.y > 0.7) ? 1.0 : clamp(v_worldPos.y * 0.28 + 0.72, 0.70, 1.0);

        // 4. Asphalt roadway & car paint specular sheen
        float specPower = (N.y > 0.85) ? 24.0 : 38.0;
        float specIntensity = (N.y > 0.85) ? 0.45 : 0.70;
        float spec = pow(max(dot(N, H), 0.0), specPower) * specIntensity;
        vec3 specular = u_sunCol * spec;

        vec4 baseCol = v_color;

        // 5. Procedural storefront displays & diverse multi-color window illumination
        if (abs(N.y) < 0.28 && v_worldPos.y > 0.5) {
          if (v_worldPos.y < 4.8) {
            // Ground-floor boutique & cafe storefront illumination
            float shopGlow = sin((v_worldPos.x + v_worldPos.z) * 0.6) * 0.5 + 0.5;
            baseCol.rgb += vec3(0.95, 0.68, 0.35) * (0.42 * shopGlow);
          } else {
            // Multi-tone window grids (golden interior, sky teal, ochre curtains, dark bronze frames)
            vec2 winGrid = vec2((v_worldPos.x + v_worldPos.z) * 0.36, v_worldPos.y * 0.28);
            vec2 winUv = fract(winGrid);
            vec2 winId = floor(winGrid);

            // Window frame check (mullions)
            if (winUv.x > 0.18 && winUv.x < 0.82 && winUv.y > 0.20 && winUv.y < 0.80) {
              float cellHash = fract(sin(dot(winId, vec2(12.9898, 78.233))) * 43758.5453);
              if (cellHash < 0.38) {
                // Warm incandescent interior light (offices/apartments in late afternoon)
                baseCol.rgb = mix(baseCol.rgb, vec3(1.15, 0.90, 0.48), 0.65);
              } else if (cellHash < 0.62) {
                // Sky dusk teal reflection with sun sheen
                baseCol.rgb = mix(baseCol.rgb, vec3(0.35, 0.62, 0.82), 0.55);
              } else if (cellHash < 0.82) {
                // Warm terracotta/ochre curtains drawn
                baseCol.rgb = mix(baseCol.rgb, vec3(0.82, 0.55, 0.38), 0.50);
              } else {
                // Dark tinted glass
                baseCol.rgb = mix(baseCol.rgb, vec3(0.12, 0.16, 0.22), 0.60);
              }
            } else {
              // Dark bronze window frame
              baseCol.rgb *= 0.65;
            }
          }
        }

        // 6. Street Puddles that catch the sky & low sun
        if (N.y > 0.85 && v_worldPos.y < 0.18) {
          vec2 puddleUv = v_worldPos.xz * 0.15;
          float pNoise = sin(puddleUv.x * 2.2 + sin(puddleUv.y * 2.8)) *
                         cos(puddleUv.y * 2.0 + cos(puddleUv.x * 2.4));
          float puddleMask = smoothstep(0.42, 0.72, pNoise);
          if (puddleMask > 0.0) {
            float pFresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
            float pSpec = pow(max(dot(reflect(-V, N), L), 0.0), 32.0);
            vec3 skyReflect = mix(u_skyCol * 1.35, u_sunCol * 1.9, pSpec);
            baseCol.rgb = mix(baseCol.rgb, skyReflect, puddleMask * clamp(pFresnel + 0.45, 0.0, 0.88));
          }
        }

        // 7. Dynamic Police Cruiser Emergency Strobes
        vec3 dSiren1 = u_siren1Pos - v_worldPos;
        float dist1 = length(dSiren1);
        float atten1 = max(0.0, 1.0 - dist1 / 32.0);
        vec3 sirenLit = u_siren1Col * (atten1 * atten1 * max(dot(N, normalize(dSiren1)), 0.0) * 1.15);

        vec3 dSiren2 = u_siren2Pos - v_worldPos;
        float dist2 = length(dSiren2);
        float atten2 = max(0.0, 1.0 - dist2 / 32.0);
        sirenLit += u_siren2Col * (atten2 * atten2 * max(dot(N, normalize(dSiren2)), 0.0) * 1.15);

        // Composite Final Illuminated Surface
        vec3 lit = (baseCol.rgb * (ambient + directLighting) * contactAO) + specular + sirenLit;

        // 8. Atmospheric Distance Fog (warm golden-hour dusk haze)
        float distCam = length(u_camPos - v_worldPos);
        float fogFactor = clamp(1.0 - exp(-distCam * u_fogDen), 0.0, 0.78);
        vec3 finalColor = mix(lit, u_fogCol, fogFactor);

        gl_FragColor = vec4(finalColor, baseCol.a);
      }
    `;

    this.programs.world = this.createProgram(vsWorld, fsWorld);
    this.cacheUniforms('world', [
      'u_proj', 'u_view', 'u_model',
      'u_sunDir', 'u_sunCol', 'u_skyCol', 'u_shadeCol', 'u_groundCol',
      'u_camPos', 'u_fogCol', 'u_fogDen', 'u_time',
      'u_siren1Pos', 'u_siren1Col', 'u_siren2Pos', 'u_siren2Col',
    ]);

    // --- Ocean Water Shader ---
    const vsWater = `
      precision highp float;
      attribute vec3 a_pos;
      attribute vec3 a_norm;
      attribute vec4 a_col;
      attribute vec2 a_uv;

      uniform mat4 u_proj;
      uniform mat4 u_view;
      uniform mat4 u_model;
      uniform float u_time;

      varying vec3 v_worldPos;
      varying vec3 v_normal;
      varying vec4 v_color;
      varying vec2 v_uv;

      void main() {
        vec3 p = a_pos;
        float wave = sin(p.x * 0.14 + u_time * 2.4) * 0.35 +
                     cos(p.z * 0.10 + u_time * 1.8) * 0.24;
        p.y += wave;

        vec4 worldPos = u_model * vec4(p, 1.0);
        v_worldPos = worldPos.xyz;

        float dWdx = cos(p.x * 0.14 + u_time * 2.4) * 0.14 * 0.35;
        float dWdz = -sin(p.z * 0.10 + u_time * 1.8) * 0.10 * 0.24;
        vec3 perturbedN = normalize(vec3(-dWdx, 1.0, -dWdz));

        v_normal = (u_model * vec4(perturbedN, 0.0)).xyz;
        v_color = a_col;
        v_uv = a_uv;
        gl_Position = u_proj * u_view * worldPos;
      }
    `;

    const fsWater = `
      precision highp float;
      varying vec3 v_worldPos;
      varying vec3 v_normal;
      varying vec4 v_color;
      varying vec2 v_uv;

      uniform vec3 u_sunDir;
      uniform vec3 u_sunCol;
      uniform vec3 u_skyCol;
      uniform vec3 u_camPos;
      uniform vec3 u_fogCol;
      uniform float u_fogDen;
      uniform float u_time;

      void main() {
        vec3 N = normalize(v_normal);
        vec3 L = normalize(u_sunDir);
        vec3 V = normalize(u_camPos - v_worldPos);

        // Mediterranean turquoise-teal water base
        vec3 waterBase = vec3(0.06, 0.46, 0.64);

        // Sun path reflection trail across waves
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 75.0) * 2.4;
        vec3 sunGlint = u_sunCol * spec;

        // Foam highlights on wave crests
        float foam = smoothstep(0.15, 0.32, v_normal.x * 0.5 + v_normal.z * 0.5);
        vec3 waterCol = mix(waterBase, vec3(0.88, 0.95, 1.0), foam * 0.55);

        vec3 lit = waterCol * 0.94 + sunGlint;

        float distCam = length(u_camPos - v_worldPos);
        float fogFactor = clamp(1.0 - exp(-distCam * u_fogDen), 0.0, 0.78);
        vec3 finalCol = mix(lit, u_fogCol, fogFactor);

        gl_FragColor = vec4(finalCol, 0.95);
      }
    `;

    this.programs.water = this.createProgram(vsWater, fsWater);
    this.cacheUniforms('water', [
      'u_proj', 'u_view', 'u_model',
      'u_sunDir', 'u_sunCol', 'u_skyCol',
      'u_camPos', 'u_fogCol', 'u_fogDen', 'u_time',
    ]);

    // --- Atmospheric Sunset Sky Dome Shader ---
    const vsSky = `
      precision highp float;
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main() {
        v_uv = a_pos * 0.5 + 0.5;
        gl_Position = vec4(a_pos, 0.9999, 1.0);
      }
    `;

    const fsSky = `
      precision highp float;
      varying vec2 v_uv;
      uniform mat4 u_invViewProj;
      uniform vec3 u_sunDir;
      uniform vec3 u_sunCol;
      uniform vec3 u_camPos;

      void main() {
        vec4 ndc = vec4(v_uv * 2.0 - 1.0, 1.0, 1.0);
        vec4 worldPos = u_invViewProj * ndc;
        vec3 ray = normalize(worldPos.xyz / worldPos.w - u_camPos);

        float h = clamp(ray.y, 0.0, 1.0);
        vec3 zenithCol = vec3(0.18, 0.36, 0.72);   // Deep cobalt twilight
        vec3 midCol = vec3(0.48, 0.62, 0.85);      // Periwinkle azure
        vec3 horizonCol = vec3(1.0, 0.74, 0.48);   // Golden peach dusk

        vec3 skyGrad = mix(horizonCol, midCol, pow(h, 0.42));
        skyGrad = mix(skyGrad, zenithCol, pow(h, 1.35));

        // Atmospheric haze along horizon
        float haze = exp(-max(ray.y, 0.0) * 3.2);
        skyGrad = mix(skyGrad, vec3(1.0, 0.68, 0.42), haze * 0.65);

        // Solar corona & sharp sun disc
        vec3 L = normalize(u_sunDir);
        float sunDot = max(dot(ray, L), 0.0);

        vec3 corona = u_sunCol * pow(sunDot, 10.0) * 0.98;
        float sunDisc = smoothstep(0.9968, 0.9985, sunDot);
        vec3 sunColor = vec3(1.0, 0.98, 0.88) * sunDisc * 2.9;

        gl_FragColor = vec4(skyGrad + corona + sunColor, 1.0);
      }
    `;

    this.programs.sky = this.createProgram(vsSky, fsSky);
    this.cacheUniforms('sky', [
      'u_invViewProj', 'u_sunDir', 'u_sunCol', 'u_camPos',
    ]);
  }

  cacheUniforms(progName, uniformNames) {
    const gl = this.gl;
    const prog = this.programs[progName];
    prog.uniforms = {};
    for (const name of uniformNames) {
      prog.uniforms[name] = gl.getUniformLocation(prog, name);
    }
  }

  initSkyMesh() {
    const gl = this.gl;
    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
       1,  1,
      -1, -1,
       1,  1,
      -1,  1,
    ]);
    this.buffers.sky = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.sky);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  }

  uploadWorldMesh(world) {
    const gl = this.gl;

    this.buffers.world = {
      pos: gl.createBuffer(),
      norm: gl.createBuffer(),
      col: gl.createBuffer(),
      uv: gl.createBuffer(),
      count: world.positions.length / 3,
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.world.pos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(world.positions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.world.norm);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(world.normals), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.world.col);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(world.colors), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.world.uv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(world.uvs), gl.STATIC_DRAW);

    this.buffers.water = {
      pos: gl.createBuffer(),
      norm: gl.createBuffer(),
      col: gl.createBuffer(),
      uv: gl.createBuffer(),
      count: world.waterPositions.length / 3,
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.water.pos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(world.waterPositions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.water.norm);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(world.waterNormals), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.water.col);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(world.waterColors), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.water.uv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(world.waterUvs), gl.STATIC_DRAW);
  }

  initDynamicMeshBuffers() {
    const gl = this.gl;
    this.buffers.dynamic = {
      pos: gl.createBuffer(),
      norm: gl.createBuffer(),
      col: gl.createBuffer(),
      uv: gl.createBuffer(),
    };
  }

  setCommonUniforms(prog, camera, time, sirens) {
    const gl = this.gl;
    const u = prog.uniforms;

    gl.uniformMatrix4fv(u.u_proj, false, this.matProj);
    gl.uniformMatrix4fv(u.u_view, false, this.matView);

    const sunD = V3.create();
    V3.norm(sunD, LIGHTING.SUN_DIR);
    gl.uniform3fv(u.u_sunDir, sunD);
    gl.uniform3fv(u.u_sunCol, LIGHTING.SUN_COLOR);
    gl.uniform3fv(u.u_skyCol, LIGHTING.SKY_COLOR);
    if (u.u_shadeCol) gl.uniform3fv(u.u_shadeCol, LIGHTING.SHADE_TINT);
    if (u.u_groundCol) gl.uniform3fv(u.u_groundCol, LIGHTING.GROUND_BOUNCE);

    gl.uniform3fv(u.u_camPos, camera.pos);
    gl.uniform3fv(u.u_fogCol, LIGHTING.FOG_COLOR);
    gl.uniform1f(u.u_fogDen, LIGHTING.FOG_DENSITY);
    gl.uniform1f(u.u_time, time);

    if (u.u_siren1Pos && sirens) {
      gl.uniform3fv(u.u_siren1Pos, sirens.s1Pos);
      gl.uniform3fv(u.u_siren1Col, sirens.s1Col);
      gl.uniform3fv(u.u_siren2Pos, sirens.s2Pos);
      gl.uniform3fv(u.u_siren2Col, sirens.s2Col);
    } else if (u.u_siren1Pos) {
      gl.uniform3f(u.u_siren1Pos, 0, -100, 0);
      gl.uniform3f(u.u_siren1Col, 0, 0, 0);
      gl.uniform3f(u.u_siren2Pos, 0, -100, 0);
      gl.uniform3f(u.u_siren2Col, 0, 0, 0);
    }
  }

  renderWorld(camera, time, sirens) {
    const gl = this.gl;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const fog = LIGHTING.FOG_COLOR;
    gl.clearColor(fog[0], fog[1], fog[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = this.canvas.width / this.canvas.height;
    M4.perspective(this.matProj, (camera.fov * Math.PI) / 180, aspect, 0.4, 650.0);
    M4.lookAt(this.matView, camera.pos, camera.target, [0, 1, 0]);

    // 0. Render Atmosphere Sky Dome & Sun Disc
    const progSky = this.programs.sky;
    gl.useProgram(progSky);

    const viewProj = M4.create();
    M4.mul(viewProj, this.matProj, this.matView);
    const invViewProj = M4.create();
    M4.invert(invViewProj, viewProj);

    gl.uniformMatrix4fv(progSky.uniforms.u_invViewProj, false, invViewProj);

    const sunD = V3.create();
    V3.norm(sunD, LIGHTING.SUN_DIR);
    gl.uniform3fv(progSky.uniforms.u_sunDir, sunD);
    gl.uniform3fv(progSky.uniforms.u_sunCol, LIGHTING.SUN_COLOR);
    gl.uniform3fv(progSky.uniforms.u_camPos, camera.pos);

    gl.disable(gl.DEPTH_TEST);
    const locPosSky = gl.getAttribLocation(progSky, 'a_pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.sky);
    gl.enableVertexAttribArray(locPosSky);
    gl.vertexAttribPointer(locPosSky, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.enable(gl.DEPTH_TEST);

    // 1. Render Static Metropolis World Mesh
    const prog = this.programs.world;
    gl.useProgram(prog);
    this.setCommonUniforms(prog, camera, time, sirens);

    M4.identity(this.matModel);
    gl.uniformMatrix4fv(prog.uniforms.u_model, false, this.matModel);

    this.bindVBO(prog, this.buffers.world);
    gl.drawArrays(gl.TRIANGLES, 0, this.buffers.world.count);

    // 2. Render Displaced Ocean Water
    const progW = this.programs.water;
    gl.useProgram(progW);
    this.setCommonUniforms(progW, camera, time, null);

    M4.identity(this.matModel);
    gl.uniformMatrix4fv(progW.uniforms.u_model, false, this.matModel);

    this.bindVBO(progW, this.buffers.water);
    gl.drawArrays(gl.TRIANGLES, 0, this.buffers.water.count);
  }

  bindVBO(prog, bufferObj) {
    const gl = this.gl;

    const locPos = gl.getAttribLocation(prog, 'a_pos');
    if (locPos >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.pos);
      gl.enableVertexAttribArray(locPos);
      gl.vertexAttribPointer(locPos, 3, gl.FLOAT, false, 0, 0);
    }

    const locNorm = gl.getAttribLocation(prog, 'a_norm');
    if (locNorm >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.norm);
      gl.enableVertexAttribArray(locNorm);
      gl.vertexAttribPointer(locNorm, 3, gl.FLOAT, false, 0, 0);
    }

    const locCol = gl.getAttribLocation(prog, 'a_col');
    if (locCol >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.col);
      gl.enableVertexAttribArray(locCol);
      gl.vertexAttribPointer(locCol, 4, gl.FLOAT, false, 0, 0);
    }

    const locUv = gl.getAttribLocation(prog, 'a_uv');
    if (locUv >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.uv);
      gl.enableVertexAttribArray(locUv);
      gl.vertexAttribPointer(locUv, 2, gl.FLOAT, false, 0, 0);
    }
  }

  drawDynamicMesh(positions, normals, colors, uvs, modelMatrix) {
    if (!positions.length) return;
    const gl = this.gl;
    const prog = this.programs.world;
    gl.useProgram(prog);

    gl.uniformMatrix4fv(prog.uniforms.u_model, false, modelMatrix || this.matModel);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.dynamic.pos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.dynamic.norm);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.dynamic.col);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.dynamic.uv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.DYNAMIC_DRAW);

    this.bindVBO(prog, this.buffers.dynamic);
    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
  }
}
