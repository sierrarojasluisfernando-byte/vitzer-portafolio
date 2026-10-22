/* Base compartida del movimiento del inicio (grafo, pilares, conversión).
   Toda sección animada importa de aquí: un solo loop de requestAnimationFrame
   para la página, easings, contadores y lectura de tokens de :root. */

/* ---------- Reducir movimiento ---------- */

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionListeners = new Set();

// Enlace vivo de ES module: quien lo importa siempre lee el valor actual.
export let reducedMotion = motionQuery.matches;

motionQuery.addEventListener('change', (e) => {
  reducedMotion = e.matches;
  motionListeners.forEach((cb) => cb(reducedMotion));
});

/** Avisa cuando cambia la preferencia. Devuelve la función para desuscribirse. */
export function onReducedMotionChange(cb) {
  motionListeners.add(cb);
  return () => motionListeners.delete(cb);
}

/* ---------- Ticker: un único loop de rAF ---------- */

const subscribers = new Set();
let frameId = 0;
let lastTime = 0;

function frame(now) {
  // dt en ms, acotado para que volver a la pestaña no produzca un salto.
  const dt = Math.min(now - lastTime, 50);
  lastTime = now;
  subscribers.forEach((fn) => fn(dt, now));
  frameId = subscribers.size && !document.hidden ? requestAnimationFrame(frame) : 0;
}

function start() {
  if (frameId || !subscribers.size || document.hidden) return;
  lastTime = performance.now();
  frameId = requestAnimationFrame(frame);
}

function stop() {
  cancelAnimationFrame(frameId);
  frameId = 0;
}

document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

export const ticker = {
  /** fn(dt, now) se llama en cada cuadro. Devuelve la función para desuscribirse. */
  add(fn) {
    subscribers.add(fn);
    start();
    return () => ticker.remove(fn);
  },
  remove(fn) {
    subscribers.delete(fn);
    if (!subscribers.size) stop();
  },
  has(fn) {
    return subscribers.has(fn);
  },
};

/* ---------- Visibilidad ---------- */

/**
 * cb(visible, entry) en cada entrada y salida del viewport. rootMargin permite
 * avisar antes de que el elemento llegue (por ejemplo '100% 0px' = una pantalla antes).
 * Devuelve la función para dejar de observar.
 */
export function whenVisible(el, cb, threshold = 0, rootMargin = '0px') {
  if (!('IntersectionObserver' in window)) {
    cb(true, null);
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((entry) => cb(entry.isIntersecting, entry)),
    { threshold, rootMargin }
  );
  io.observe(el);
  return () => io.disconnect();
}

/* ---------- Easings y aritmética ---------- */

export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

/** Curva cubic-bezier de CSS como función t → progreso. */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx;

  function solveX(x) {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return t;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    // Respaldo por bisección si Newton no converge.
    let lo = 0, hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      if (sampleX(t) < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  }

  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solveX(x)));
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
/** Progreso 0..1 de p dentro del tramo [inicio, fin]. */
export const range = (p, inicio, fin) => clamp((p - inicio) / (fin - inicio), 0, 1);

/* ---------- Contador ---------- */

/**
 * Cuenta de `from` a `to` en `duracion` ms con easeOutExpo.
 * `formato`: opciones de Intl.NumberFormat o una función número → texto.
 * El valor final real queda siempre en aria-label, con aria-live="off".
 * Devuelve una función para cancelar la cuenta.
 */
export function countTo(el, from, to, duracion = 1200, formato = {}) {
  const nf = typeof formato === 'function' ? null : new Intl.NumberFormat('es-CO', formato);
  const fmt = nf ? (v) => nf.format(v) : formato;
  el.setAttribute('aria-live', 'off');
  el.setAttribute('aria-label', fmt(to));

  if (reducedMotion || duracion <= 0) {
    el.textContent = fmt(to);
    return () => {};
  }

  let elapsed = 0;
  const step = (dt) => {
    elapsed += dt;
    const t = Math.min(elapsed / duracion, 1);
    el.textContent = fmt(lerp(from, to, easeOutExpo(t)));
    if (t >= 1) ticker.remove(step);
  };
  el.textContent = fmt(from);
  ticker.add(step);
  return () => ticker.remove(step);
}

/* ---------- Tokens de :root ---------- */

const TOKEN_NAMES = {
  ground: '--ground',
  surface: '--surface',
  surfaceRaised: '--surface-raised',
  ink: '--ink',
  inkSoft: '--ink-soft',
  inkFaint: '--ink-faint',
  line: '--line',
  lineStrong: '--line-strong',
  accent: '--accent',
  accentLight: '--accent-light',
  accentWash: '--accent-wash',
  fontTitle: '--font-title',
  fontText: '--font-text',
  fontMono: '--font-mono',
};

/**
 * Colores y fuentes de :root, ya resueltos (sin var()).
 * tokens().get('--grafo-ia') lee cualquier otro token por nombre.
 */
export function tokens(el = document.documentElement) {
  const cs = getComputedStyle(el);
  const get = (name) => cs.getPropertyValue(name).trim();
  const out = { get };
  for (const [key, name] of Object.entries(TOKEN_NAMES)) out[key] = get(name);
  return out;
}
