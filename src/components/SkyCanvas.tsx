import { useEffect, useRef } from 'react';
import type { Condition } from '../lib/conditions';
import { fx, hexToRgb, palette } from '../lib/sky';
import type { Theme } from '../hooks/useTheme';

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uTop, uHorizon, uBottom, uCloud, uShadow, uSun;
uniform float uCover, uSpeed, uStars, uSunStrength, uScroll, uFlash;
uniform vec2 uMouse, uSunPos;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  // vertical sky gradient, nudged by scroll so the horizon slowly rises as you read
  float y = uv.y + uScroll * 0.06;
  vec3 col = mix(uBottom, uHorizon, smoothstep(-0.05, 0.5, y));
  col = mix(col, uTop, smoothstep(0.4, 1.05, y));

  // sun / moon glow with gentle mouse parallax
  vec2 sp = vec2(uSunPos.x * aspect, uSunPos.y) + uMouse * 0.015;
  float d = length(p - sp);
  col += uSun * uSunStrength * (0.42 * exp(-d * 2.6) + 0.35 * exp(-d * 9.0) + 0.5 * smoothstep(0.075, 0.06, d) * step(0.5, uStars));

  // stars (dark theme)
  if (uStars > 0.0) {
    vec2 g = (p + uMouse * 0.004) * 150.0;
    vec2 id = floor(g);
    float h = hash(id);
    float s = step(0.986, h) * smoothstep(0.42, 0.0, length(fract(g) - 0.5));
    float tw = 0.55 + 0.45 * sin(uTime * (1.2 + h * 2.0) + h * 60.0);
    col += s * tw * uStars * smoothstep(0.25, 0.95, uv.y) * 0.9;
  }

  // far cloud layer
  float t = uTime * uSpeed;
  vec2 q = p * vec2(1.1, 2.3) + vec2(t * 0.018, uScroll * 0.12) + uMouse * 0.025;
  float n1 = fbm(q * 1.4 + fbm(q * 0.7 + t * 0.006));
  float c1 = smoothstep(1.0 - uCover, 1.25 - uCover * 0.6, n1);
  c1 *= smoothstep(-0.2, 0.55, uv.y + uCover * 0.4);
  vec3 cloud1 = mix(uShadow, uCloud, smoothstep(0.25, 0.85, n1 + (uv.y - 0.5) * 0.25));
  col = mix(col, cloud1, c1 * 0.82);

  // near cloud layer — moves faster, stronger parallax
  vec2 q2 = p * vec2(0.75, 1.5) + vec2(t * 0.032 + 7.3, uScroll * 0.28 + 2.1) + uMouse * 0.055;
  float n2 = fbm(q2 * 1.15);
  float c2 = smoothstep(1.05 - uCover * 0.85, 1.3 - uCover * 0.55, n2);
  c2 *= smoothstep(0.05, 0.75, uv.y + uCover * 0.25);
  vec3 cloud2 = mix(uShadow, uCloud, smoothstep(0.3, 0.9, n2 + (uv.y - 0.5) * 0.3));
  col = mix(col, cloud2, c2 * 0.62);

  // silver lining toward the light source
  col += uSun * uSunStrength * 0.18 * c1 * exp(-d * 3.0);

  // lightning
  col = mix(col, vec3(0.92, 0.94, 1.0), uFlash * 0.55 * (0.6 + 0.4 * c1));

  // soft vignette + dithering to kill gradient banding
  col *= 1.0 - 0.06 * length(uv - vec2(0.5, 0.6));
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) / 255.0 * 2.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

const KEYS = ['top', 'horizon', 'bottom', 'cloud', 'shadow', 'sun'] as const;

interface Props {
  theme: Theme;
  condition: Condition;
  reduced: boolean;
}

/**
 * Full-viewport WebGL sky: layered FBM clouds, sun/moon glow, twinkling stars,
 * mouse + scroll parallax. Palette eases between conditions; theme switches snap
 * (the View Transition handles that reveal). Falls back to a CSS gradient.
 */
export function SkyCanvas({ theme, condition, reduced }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef({ theme, condition });
  const snap = useRef(true);
  const failed = useRef(false);

  useEffect(() => {
    if (target.current.theme !== theme) snap.current = true;
    target.current = { theme, condition };
  }, [theme, condition]);

  useEffect(() => {
    const el = canvas.current!;
    const gl = el.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: true });
    if (!gl) {
      failed.current = true;
      el.style.display = 'none';
      return;
    }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
    } catch (e) {
      console.warn('[sky] WebGL unavailable, using CSS gradient', e);
      el.style.display = 'none';
      return;
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      res: u('uRes'), time: u('uTime'), top: u('uTop'), horizon: u('uHorizon'), bottom: u('uBottom'),
      cloud: u('uCloud'), shadow: u('uShadow'), sun: u('uSun'), cover: u('uCover'), speed: u('uSpeed'),
      stars: u('uStars'), sunStrength: u('uSunStrength'), scroll: u('uScroll'), flash: u('uFlash'),
      mouse: u('uMouse'), sunPos: u('uSunPos'),
    };

    // current (eased) state
    const p0 = palette(target.current.theme, target.current.condition);
    const cur = {
      top: hexToRgb(p0.top), horizon: hexToRgb(p0.horizon), bottom: hexToRgb(p0.bottom),
      cloud: hexToRgb(p0.cloud), shadow: hexToRgb(p0.shadow), sun: hexToRgb(p0.sun),
      cover: p0.cover, speed: p0.speed, stars: p0.stars, sunStrength: p0.sunStrength,
    };
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let scroll = 0;
    let flash = 0;

    const resize = () => {
      // render under native resolution: clouds are soft, and this keeps the GPU cool
      const scale = Math.min(window.devicePixelRatio, 2) * (window.innerWidth < 768 ? 0.45 : 0.55);
      el.width = Math.max(1, Math.floor(window.innerWidth * scale));
      el.height = Math.max(1, Math.floor(window.innerHeight * scale));
      gl.viewport(0, 0, el.width, el.height);
    };
    resize();
    window.addEventListener('resize', resize);
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    let last = performance.now();
    const start = last - Math.random() * 50000;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const tgt = palette(target.current.theme, target.current.condition);
      const k = snap.current ? 1 : 1 - Math.exp(-dt * 1.6);
      snap.current = false;
      for (const key of KEYS) {
        const to = hexToRgb(tgt[key]);
        const c = cur[key];
        for (let i = 0; i < 3; i++) c[i] += (to[i] - c[i]) * k;
      }
      cur.cover += (tgt.cover - cur.cover) * k;
      cur.speed += (tgt.speed - cur.speed) * k;
      cur.stars += (tgt.stars - cur.stars) * k;
      cur.sunStrength += (tgt.sunStrength - cur.sunStrength) * k;
      mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 2.5));
      mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 2.5));
      const s = window.scrollY / Math.max(1, window.innerHeight);
      scroll += (s - scroll) * (1 - Math.exp(-dt * 6));
      flash = Math.max(fx.flash, flash * Math.exp(-dt * 7));
      fx.flash = 0;

      gl.uniform2f(U.res, el.width, el.height);
      gl.uniform1f(U.time, (now - start) / 1000);
      gl.uniform3fv(U.top, cur.top);
      gl.uniform3fv(U.horizon, cur.horizon);
      gl.uniform3fv(U.bottom, cur.bottom);
      gl.uniform3fv(U.cloud, cur.cloud);
      gl.uniform3fv(U.shadow, cur.shadow);
      gl.uniform3fv(U.sun, cur.sun);
      gl.uniform1f(U.cover, cur.cover);
      gl.uniform1f(U.speed, cur.speed);
      gl.uniform1f(U.stars, cur.stars);
      gl.uniform1f(U.sunStrength, cur.sunStrength);
      gl.uniform1f(U.scroll, scroll);
      gl.uniform1f(U.flash, flash);
      gl.uniform2f(U.mouse, mouse.x, mouse.y);
      gl.uniform2f(U.sunPos, 0.8, 0.86);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    if (reduced) {
      // static, but still re-render when the palette changes
      const id = window.setInterval(() => {
        snap.current = true;
        draw(performance.now());
      }, 400);
      draw(performance.now());
      return () => {
        window.clearInterval(id);
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onMove);
      };
    }
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, [reduced]);

  return <canvas ref={canvas} className="sky-canvas" aria-hidden="true" />;
}
