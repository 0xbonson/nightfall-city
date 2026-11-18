/**
 * Nightfall City: Vela Bay - Hand-Written Pure WebGL Renderer
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

import { M4, V3 } from './math.js';
import { LIGHTING, WORLD } from './config.js';

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
      throw new Error('WebGL not supported on this platform');
    }

    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    this.programs = {};
    this.buffers = {};
    this.models = {};

    this.matProj = M4.create();
    this.matView = M4.create();
    this.matModel = M4.create();
    this.matNormal = M4.create();

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
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failure: ${info}\n${source}`);
    }
    return shader;
  }

  createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = this.createShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program link failure: ${info}`);
    }
    return program;
  }

  initShaders() {
    const gl = this.gl;

    // --- World & Entity Shader ---
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
        // Approximation for non-shearing model matrices
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
      uniform vec3 u_ambCol;
      uniform vec3 u_camPos;
      uniform vec3 u_fogCol;
      uniform float u_fogDen;
      uniform float u_time;

      // Emergency flasher dynamic lights (police sirens)
      uniform vec3 u_siren1Pos;
      uniform vec3 u_siren1Col;
      uniform vec3 u_siren2Pos;
      uniform vec3 u_siren2Col;

      void main() {
        vec3 N = normalize(v_normal);
        vec3 L = normalize(u_sunDir);
        vec3 V = normalize(u_camPos - v_worldPos);

        // Sunlight diffuse
        float NdotL = max(dot(N, L), 0.0);
        vec3 direct = u_sunCol * NdotL;

        // Sky hemisphere ambient (upwards vs downwards normals)
        float hemi = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 ambient = mix(u_ambCol * 0.7, u_skyCol, hemi);

        // Specular highlight for glossy car paint, windows, wet asphalt
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 28.0) * 0.35;
        vec3 specular = u_sunCol * spec;

        // Dynamic emergency lightbars (police red and blue strobes)
        vec3 dSiren1 = u_siren1Pos - v_worldPos;
        float dist1 = length(dSiren1);
        float atten1 = max(0.0, 1.0 - dist1 / 24.0);
        vec3 sirenLit = u_siren1Col * (atten1 * atten1 * max(dot(N, normalize(dSiren1)), 0.0) * 0.75);

        vec3 dSiren2 = u_siren2Pos - v_worldPos;
        float dist2 = length(dSiren2);
        float atten2 = max(0.0, 1.0 - dist2 / 24.0);
        sirenLit += u_siren2Col * (atten2 * atten2 * max(dot(N, normalize(dSiren2)), 0.0) * 0.75);

        // Procedural window illumination on tall buildings
        vec4 baseCol = v_color;
        if (abs(N.y) < 0.2 && v_worldPos.y > 4.0 && v_color.b > 0.3) {
          // Window grid pattern
          vec2 winUv = fract(vec2(v_worldPos.x + v_worldPos.z, v_worldPos.y * 0.7));
          if (winUv.x > 0.25 && winUv.x < 0.75 && winUv.y > 0.3 && winUv.y < 0.8) {
            // Illuminated dusk window glint
            baseCol.rgb += vec3(0.55, 0.45, 0.25) * 0.65;
          }
        }

        vec3 lit = baseCol.rgb * (ambient + direct) + specular + sirenLit;

        // Atmospheric distance fog (warm golden twilight)
        float distCam = length(u_camPos - v_worldPos);
        float fogFactor = 1.0 - exp(-distCam * u_fogDen);
        fogFactor = clamp(fogFactor, 0.0, 0.88);

        vec3 finalColor = mix(lit, u_fogCol, fogFactor);
        gl_FragColor = vec4(finalColor, baseCol.a);
      }
    `;

    this.programs.world = this.createProgram(vsWorld, fsWorld);
    this.cacheUniforms('world', [
      'u_proj', 'u_view', 'u_model',
      'u_sunDir', 'u_sunCol', 'u_skyCol', 'u_ambCol',
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
        // Animated dual harmonic ocean wave displacement
        float wave = sin(p.x * 0.12 + u_time * 2.2) * 0.32 +
                     cos(p.z * 0.09 + u_time * 1.6) * 0.22;
        p.y += wave;

        vec4 worldPos = u_model * vec4(p, 1.0);
        v_worldPos = worldPos.xyz;

        // Wave normal perturbation
        float dWdx = cos(p.x * 0.12 + u_time * 2.2) * 0.12 * 0.32;
        float dWdz = -sin(p.z * 0.09 + u_time * 1.6) * 0.09 * 0.22;
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

        // Ocean depth color
        vec3 waterBase = vec3(0.04, 0.38, 0.54);

        // Specular sun glint across wave peaks
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 90.0) * 1.8;
        vec3 sunGlint = u_sunCol * spec;

        // Foam highlights on crests
        float foam = smoothstep(0.18, 0.35, v_normal.x * 0.5 + v_normal.z * 0.5);
        vec3 waterColor = mix(waterBase, vec3(0.75, 0.90, 0.98), foam * 0.45);

        vec3 lit = waterColor * 0.85 + sunGlint;

        float distCam = length(u_camPos - v_worldPos);
        float fogFactor = clamp(1.0 - exp(-distCam * u_fogDen), 0.0, 0.88);
        vec3 finalCol = mix(lit, u_fogCol, fogFactor);

        gl_FragColor = vec4(finalCol, 0.94);
      }
    `;

    this.programs.water = this.createProgram(vsWater, fsWater);
    this.cacheUniforms('water', [
      'u_proj', 'u_view', 'u_model',
      'u_sunDir', 'u_sunCol', 'u_skyCol',
      'u_camPos', 'u_fogCol', 'u_fogDen', 'u_time',
    ]);

    // --- Atmospheric Sunset Sky Shader ---
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
        // Reconstruct ray direction in world space
        vec4 ndc = vec4(v_uv * 2.0 - 1.0, 1.0, 1.0);
        vec4 worldPos = u_invViewProj * ndc;
        vec3 ray = normalize(worldPos.xyz / worldPos.w - u_camPos);

        // Sky gradient: Horizon peach/gold to Zenith deep twilight blue
        float h = clamp(ray.y, 0.0, 1.0);
        vec3 zenithCol = vec3(0.18, 0.38, 0.72);
        vec3 midCol = vec3(0.55, 0.65, 0.85);
        vec3 horizonCol = vec3(0.98, 0.74, 0.52);

        vec3 skyGrad = mix(horizonCol, midCol, pow(h, 0.45));
        skyGrad = mix(skyGrad, zenithCol, pow(h, 1.4));

        // Warm horizon haze band
        float haze = exp(-max(ray.y, 0.0) * 3.5);
        skyGrad = mix(skyGrad, vec3(0.98, 0.68, 0.45), haze * 0.6);

        // Sun disc & solar corona flare
        vec3 L = normalize(u_sunDir);
        float sunDot = max(dot(ray, L), 0.0);

        // Corona glow
        vec3 corona = u_sunCol * pow(sunDot, 12.0) * 0.85;

        // Sharp sun disc
        float sunDisc = smoothstep(0.997, 0.9985, sunDot);
        vec3 sunColor = vec3(1.0, 0.96, 0.85) * sunDisc * 2.5;

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
    // Fullscreen quad in NDC
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

    // Static world geometry VBOs
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

    // Water VBOs
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
    // Shared dynamic VBO for vehicles, player, pedestrians, helicopter, props
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

    // Normalized sun direction
    const sunD = V3.create();
    V3.norm(sunD, LIGHTING.SUN_DIR);
    gl.uniform3fv(u.u_sunDir, sunD);

    gl.uniform3fv(u.u_sunCol, LIGHTING.SUN_COLOR);
    gl.uniform3fv(u.u_skyCol, LIGHTING.SKY_COLOR);
    if (u.u_ambCol) gl.uniform3fv(u.u_ambCol, LIGHTING.AMBIENT_COLOR);

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

    // Viewport & Clear
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const fog = LIGHTING.FOG_COLOR;
    gl.clearColor(fog[0], fog[1], fog[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Setup Matrices
    const aspect = this.canvas.width / this.canvas.height;
    M4.perspective(this.matProj, (camera.fov * Math.PI) / 180, aspect, 0.4, 600.0);
    M4.lookAt(this.matView, camera.pos, camera.target, [0, 1, 0]);

    // 0. Draw Atmospheric Sunset Sky & Sun Disc
    const progSky = this.programs.sky;
    gl.useProgram(progSky);

    // Compute inverse View-Projection matrix
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

    // 1. Draw Static World
    const prog = this.programs.world;
    gl.useProgram(prog);
    this.setCommonUniforms(prog, camera, time, sirens);

    M4.identity(this.matModel);
    gl.uniformMatrix4fv(prog.uniforms.u_model, false, this.matModel);

    this.bindVBO(prog, this.buffers.world);
    gl.drawArrays(gl.TRIANGLES, 0, this.buffers.world.count);

    // 2. Draw Ocean Water
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

  // Draw dynamic batch of triangles (for vehicles, characters, helicopter, particles)
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
