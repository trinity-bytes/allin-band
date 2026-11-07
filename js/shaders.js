/**
 * AllinBand — Light shaders
 * Two quiet WebGL fills, no library:
 *   rays  sun rays falling through the window in "Una emergencia no avisa" (L27)
 *   mist  a slow moss haze behind the goals and the FAQ (L27)
 * Each canvas carries a static CSS gradient. The shader replaces it (`is-live`)
 * only with motion allowed and WebGL available, draws only while its section
 * is on screen, and renders at half resolution with the pixel ratio capped
 * at 1.5: the light is soft, so the detail would be wasted.
 * Reduced motion or no WebGL: the static gradient stays.
 */

(function () {
  "use strict";

  var root = document.documentElement;
  if (!root.classList.contains("motion") || !("IntersectionObserver" in window)) return;

  var canvases = Array.prototype.slice.call(document.querySelectorAll("canvas[data-shader]"));
  if (!canvases.length) return;

  var VERTEX =
    "attribute vec2 p;" +
    "varying vec2 uv;" +
    "void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }";

  // Three shafts from the window on the right, slanting left as they fall
  // (across 40 % of the width at any aspect); brighter near the window, fading as
  // they fall. Each one breathes and sways on its own slow clock
  var RAYS =
    "precision mediump float;" +
    "varying vec2 uv;" +
    "uniform vec2 size;" +
    "uniform float time;" +
    "float shaft(vec2 px, float x0, float width, float phase) {" +
    "  vec2 dir = normalize(vec2(-0.4 * size.x / size.y, -1.0));" +
    "  vec2 origin = vec2((x0 + 0.03 * sin(time * 0.23 + phase)) * size.x, size.y);" +
    "  vec2 d = px - origin;" +
    "  float across = abs(d.x * dir.y - d.y * dir.x);" +
    "  float w = width * size.x;" +
    "  float body = 1.0 - smoothstep(w * 0.25, w, across);" +
    "  float breathe = 0.6 + 0.4 * sin(time * 0.55 + phase + px.y / size.y * 2.4);" +
    "  float along = d.x * dir.x + d.y * dir.y;" +
    "  float dust = 0.82 + 0.18 * sin(along / size.y * 26.0 - time * 0.9 + phase) * sin(across / w * 5.0 + time * 0.4);" +
    "  return body * breathe * dust;" +
    "}" +
    "void main() {" +
    "  vec2 px = uv * size;" +
    "  float fall = 0.15 + 0.85 * pow(clamp(uv.y, 0.0, 1.0), 1.1);" +
    "  float light = shaft(px, 0.8, 0.15, 0.0) * 0.8 + shaft(px, 0.95, 0.19, 2.1) + shaft(px, 1.1, 0.17, 4.2) * 0.85;" +
    "  float a = clamp(light * fall * 0.8, 0.0, 0.6);" +
    "  gl_FragColor = vec4(vec3(0.941, 0.71, 0.349) * a, a);" +
    "}";

  // Value noise, two octaves drifting in opposite directions
  var MIST =
    "precision mediump float;" +
    "varying vec2 uv;" +
    "uniform vec2 size;" +
    "uniform float time;" +
    "float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }" +
    "float noise(vec2 q) {" +
    "  vec2 i = floor(q); vec2 f = fract(q); f = f * f * (3.0 - 2.0 * f);" +
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);" +
    "}" +
    "void main() {" +
    "  vec2 q = uv * vec2(size.x / size.y, 1.0) * 2.2;" +
    "  float n = noise(q + vec2(time * 0.035, time * 0.012)) * 0.65 + noise(q * 2.1 - vec2(time * 0.05, 0.0)) * 0.35;" +
    "  float a = smoothstep(0.35, 0.95, n) * 0.16;" +
    "  vec3 moss = vec3(0.341, 0.42, 0.361);" +
    "  vec3 warm = vec3(0.941, 0.714, 0.353);" +
    "  vec3 c = mix(moss, warm, 0.25 * (1.0 - uv.x) * (1.0 - uv.y));" +
    "  gl_FragColor = vec4(c * a, a);" +
    "}";

  var SOURCES = { rays: RAYS, mist: MIST };
  var MAX_RATIO = 1.5;
  var RESOLUTION = 0.5;
  var FRAME_MS = 1000 / 30;

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  }

  function setUp(canvas) {
    var fragment = SOURCES[canvas.dataset.shader];
    var gl =
      fragment &&
      canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!gl) return null;

    var vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    var fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return null;
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    return {
      canvas: canvas,
      gl: gl,
      size: gl.getUniformLocation(program, "size"),
      time: gl.getUniformLocation(program, "time"),
      visible: false,
      frame: 0,
      last: 0,
      start: window.performance.now() - Math.random() * 20000,
    };
  }

  function resize(fill) {
    var ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO) * RESOLUTION;
    var width = Math.max(1, Math.round(fill.canvas.clientWidth * ratio));
    var height = Math.max(1, Math.round(fill.canvas.clientHeight * ratio));
    if (fill.canvas.width !== width || fill.canvas.height !== height) {
      fill.canvas.width = width;
      fill.canvas.height = height;
      fill.gl.viewport(0, 0, width, height);
    }
  }

  function draw(fill, now) {
    fill.frame = 0;
    if (!fill.visible) return;
    fill.frame = window.requestAnimationFrame(function (next) {
      draw(fill, next);
    });
    if (now - fill.last < FRAME_MS) return;
    fill.last = now;
    resize(fill);
    var gl = fill.gl;
    gl.uniform2f(fill.size, fill.canvas.width, fill.canvas.height);
    gl.uniform1f(fill.time, (now - fill.start) / 1000);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function start(fill) {
    if (!fill.frame) {
      fill.frame = window.requestAnimationFrame(function (now) {
        draw(fill, now);
      });
    }
  }

  function stop(fill) {
    if (fill.frame) window.cancelAnimationFrame(fill.frame);
    fill.frame = 0;
  }

  var fills = [];
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var fill = fills.filter(function (item) {
        return item.section === entry.target;
      })[0];
      if (!fill) return;
      // A section touching the viewport edge with no visible area does not count
      fill.visible = entry.isIntersecting && entry.intersectionRect.height > 0;
      if (fill.visible) start(fill);
      else stop(fill);
    });
    // Two thresholds, so leaving the edge-adjacent state also reports
  }, { threshold: [0, 0.01] });

  canvases.forEach(function (canvas) {
    var fill = setUp(canvas);
    if (!fill) return;
    fill.section = canvas.closest("section") || canvas.parentElement;
    canvas.addEventListener("webglcontextlost", function (event) {
      event.preventDefault();
      fill.visible = false;
      stop(fill);
      canvas.classList.remove("is-live");
      observer.unobserve(fill.section);
    });
    canvas.classList.add("is-live");
    fills.push(fill);
    observer.observe(fill.section);
  });
})();
