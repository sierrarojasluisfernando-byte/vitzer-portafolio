/* Pilares del inicio: entrada automática + coreografía ligada al scroll.
   La sección mide --pillar-run (~2,2 pantallas) y adentro una escena fija
   (sticky) de un alto de pantalla.
     1. Entrada (por tiempo, una sola vez por visita): al llegar la sección se
        reproduce sola, despacio, columna por columna de izquierda a derecha:
        punto, tramo de línea, número, título, subtítulo y su ficha. Dentro de
        la misma secuencia la central cuenta 0/7 → 24/7 y entra la insignia 7×.
        Si el scroll llega al despliegue antes de que termine, se completa en
        un instante para no mezclarse.
     2. Por scroll (reversible): la ficha central se despliega a lo alto y se
        centra; las laterales suben despacio y se desvanecen; luego giro 3D con
        etiquetas flotantes y halo, y una deriva suave hasta soltarse.
   Solo en pantallas anchas y sin "reducir movimiento"; si no, la sección queda
   quieta y completa y la ficha central solo cuenta su cifra al aparecer. */

import {
  ticker, whenVisible, reducedMotion, onReducedMotionChange,
  clamp, lerp, range, easeOutExpo, easeOutBack, easeInOutCubic, cubicBezier, countTo,
} from './motion-utils.js';

/* ---------- Parámetros ajustables ---------- */

const ENTRY = {
  duration: 4000,        // ms de la entrada completa
  trigger: -0.3,         // arranca cuando la escena llega a la mitad de la pantalla (p del scroll)
  rush: 8,               // si el scroll ya llegó al despliegue, la entrada va 8× más rápido
  column: 0.3,           // inicio de cada columna dentro de la entrada (0 → 1)
  // tramos dentro de cada columna, relativos a su inicio (en fracción de la entrada)
  dot: [0, 0.05],
  seg: [0.03, 0.2],
  num: [0.12, 0.2],
  title: [0.15, 0.25],
  sub: [0.18, 0.28],
  card: [0.2, 0.4],
  data: [0.48, 0.82],    // 0/7 → 24/7, barra y chips, mientras entra la ficha central
  badge: [0.84, 1],      // insignia 7×, al final
};
// Tramos por scroll; p < 0 mientras la sección termina de subir, 0 → 1 mientras está fija.
const STEPS = {
  grow: [0.06, 0.45],    // la central se despliega a lo alto; las laterales suben y se van
  scene: [0.42, 0.72],   // giro 3D, etiquetas flotantes y halo
  drift: [0.68, 1],      // la ficha sigue girando suave y las etiquetas flotan hasta soltarse
};
const MOVE = {
  smoothing: 0.2,        // p += (objetivo − p) · 0.2 por cuadro de 60 fps
  cardRise: 44,          // px que suben las fichas al entrar
  grow: 1.7,             // cuánto crece a lo alto el bloque de color de la central
  centerScale: 1.04,
  sideLift: -170,        // px que suben las laterales mientras se van
  tiltX: 12,             // grados al terminar el giro
  tiltY: -18,
  driftX: -4,            // grados extra durante la deriva final
  driftY: -10,
  floatDrift: [-14, 10, -8], // px que flota cada cifra durante la deriva
};
// Cápsulas con cifras: al aparecer (por scroll) arrancan solas, por tiempo.
const STAT = {
  startAt: 0.6,          // la cápsula arranca cuando ya se ve al 60 %
  countMs: 900,          // anillo y conteo de la cifra
  typeMsPerChar: 26,     // velocidad del mecanografiado
};
const easeOut = cubicBezier(0.2, 0.7, 0.2, 1);
const hoursFmt = (v) => `${Math.round(v)}/7`;

const section = document.querySelector('.pillars-band');
if (section) init(section);

function init(section) {
  const scroll = section.querySelector('.pillar-scroll');
  const stage = section.querySelector('.pillar-stage');
  const rail = section.querySelector('.pillar-rail');
  const columns = [...rail.children].map((li) => ({
    seg: li.querySelector('.pillar-seg'),
    dot: li.querySelector('.pillar-dot'),
    num: li.querySelector('.pillar-num'),
    title: li.querySelector('strong'),
    sub: li.querySelector('strong + span'),
  }));
  const cardsBox = section.querySelector('.pillar-cards');
  const cards = [...section.querySelectorAll('.pcard')];
  const [left, center, right] = cards;
  const big = center.querySelector('.pcard-big');
  const bar = center.querySelector('.pcard-bar span');
  const chips = [...center.querySelectorAll('.pcard-chips li')];
  const badge = right.querySelector('.pcard-badge');
  const floats = [...section.querySelectorAll('.pstat')]; // cifras planas a los lados de la central
  const stats = floats.map((el) => {
    const num = el.querySelector('.pstat-num');
    const text = el.querySelector('.pstat-text');
    return {
      arc: el.querySelector('.pstat-arc'), num, text,
      to: +num.dataset.to, suffix: num.dataset.suffix, fill: +num.dataset.fill,
      full: text.dataset.text, numFull: num.textContent,
      ms: 0, started: false, done: false,
    };
  });
  const halo = section.querySelector('.pillar-halo');
  const source = section.querySelector('.pillar-source');
  const railParts = columns.flatMap((c) => [c.seg, c.dot, c.num, c.title, c.sub]);
  const animated = [rail, ...railParts, ...cards, bar, ...chips, badge, ...floats, halo, source];

  const wide = window.matchMedia('(min-width: 861px) and (min-height: 620px)');
  let on = false;
  let p = 0, target = 0, dirty = true;
  let entryMs = 0, entryStarted = false, entryDone = false;
  let drawnP = NaN, drawnU = NaN;
  let navH = 0, stageH = 0, centerShift = 0, tileH = 0;
  let stopVisible = null;
  let lastHours = '';

  big.setAttribute('aria-label', big.textContent);
  big.setAttribute('aria-live', 'off');

  /* ----- Medidas (sin transformaciones: offsetTop no las ve) ----- */

  function measure() {
    navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
    tileH = parseFloat(getComputedStyle(section.querySelector('.pillars')).getPropertyValue('--pcard-tile-h')) || 250;
    stageH = stage.clientHeight;
    centerShift = stageH / 2 - (cardsBox.offsetTop + center.offsetTop + center.offsetHeight / 2);
    dirty = true;
  }

  function readTarget() {
    const r = scroll.getBoundingClientRect();
    const travel = r.height - stageH;
    return travel > 0 ? clamp((navH - r.top) / travel, -0.5, 1) : 0;
  }

  /* ----- La escena: u = avance de la entrada (0 → 1), p = scroll ----- */

  const fade = (el, t, dy = 10) => {
    el.style.opacity = t;
    el.style.transform = `translateY(${(1 - t) * dy}px)`;
  };

  function render(u, p) {
    const g = easeInOutCubic(range(p, ...STEPS.grow));
    const s = easeInOutCubic(range(p, ...STEPS.scene));
    const w = range(p, ...STEPS.drift);

    // 1. Entrada, columna por columna.
    const cardIn = columns.map((c, i) => {
      const at = (span) => easeOut(range(u, i * ENTRY.column + span[0], i * ENTRY.column + span[1]));
      const dot = at(ENTRY.dot);
      c.dot.style.opacity = dot;
      c.dot.style.transform = `scale(${lerp(0.3, 1, dot)})`;
      c.seg.style.transform = `scaleX(${at(ENTRY.seg)})`;
      fade(c.num, at(ENTRY.num), 8);
      fade(c.title, at(ENTRY.title), 10);
      fade(c.sub, at(ENTRY.sub), 10);
      return at(ENTRY.card);
    });
    // El rail se va cuando la central empieza a desplegarse.
    rail.style.opacity = 1 - range(g, 0, 0.35);

    // 2. Laterales: suben despacio y se desvanecen mientras la central se despliega.
    [left, right].forEach((card) => {
      const t = cardIn[cards.indexOf(card)];
      card.style.opacity = t * (1 - g);
      card.style.transform = `translateY(${(1 - t) * MOVE.cardRise + MOVE.sideLift * g}px) scale(${lerp(1, 0.97, g)})`;
    });

    // Central: entra, se despliega a lo alto, se centra, gira en 3D y sigue girando suave.
    const grow = lerp(1, MOVE.grow, g);
    center.style.setProperty('--grow', grow);
    const tc = cardIn[1];
    const cy = (1 - tc) * MOVE.cardRise + (centerShift + ((grow - 1) * tileH) / 2) * g;
    const rx = MOVE.tiltX * s + MOVE.driftX * w;
    const ry = MOVE.tiltY * s + MOVE.driftY * w;
    center.style.opacity = tc;
    center.style.transform = `translateY(${cy}px) scale(${lerp(1, MOVE.centerScale, g)}) rotateX(${rx}deg) rotateY(${ry}deg)`;

    // Datos de la entrada: 0/7 → 24/7, barra, chips e insignia.
    const d = range(u, ...ENTRY.data);
    const hours = hoursFmt(24 * easeOutExpo(d));
    if (hours !== lastHours) { big.textContent = hours; lastHours = hours; }
    bar.style.transform = `scaleX(${easeOut(d)})`;
    chips.forEach((chip, i) => fade(chip, range(d, i * 0.15, 0.4 + i * 0.15), 6));
    const k = range(u, ...ENTRY.badge);
    badge.style.opacity = k;
    badge.style.transform = `scale(${lerp(0.6, 1, easeOutBack(k))})`;

    // Escena por scroll: las cifras aparecen planas (solo fundido y un leve ascenso)
    // y flotan apenas durante la deriva; halo detrás y la fuente.
    floats.forEach((el, i) => {
      const t = easeOut(range(p, STEPS.scene[0] + 0.03 + i * 0.07, STEPS.scene[0] + 0.16 + i * 0.07));
      const y = (1 - t) * 18 + MOVE.floatDrift[i] * w;
      el.style.opacity = t;
      el.style.transform = `translateY(${y}px)`;
      if (t >= STAT.startAt) stats[i].started = true;
    });
    halo.style.opacity = Math.max(s, g * 0.5);
    halo.style.transform = `scale(${1 + 0.12 * w})`;
    source.style.opacity = s;
  }

  /* ----- Cifras de las cápsulas: anillo + conteo, y luego la frase mecanografiada ----- */

  // Solo se toca el DOM cuando algo cambió: reescribir texto igual obliga a redibujarlo.
  function drawStat(st) {
    const v = easeOutExpo(range(st.ms, 0, STAT.countMs));
    const offset = (100 - st.fill * v).toFixed(2);
    if (offset !== st.lastOffset) { st.arc.style.strokeDashoffset = offset; st.lastOffset = offset; }
    const num = `${Math.round(st.to * v)}${st.suffix}`;
    if (num !== st.lastNum) { st.num.textContent = num; st.lastNum = num; }
    const chars = Math.floor(Math.max(0, st.ms - STAT.countMs) / STAT.typeMsPerChar);
    if (chars !== st.lastChars) { st.text.textContent = st.full.slice(0, chars); st.lastChars = chars; }
  }

  /** Avanza las cápsulas que ya arrancaron. Devuelve true si alguna sigue en curso. */
  function tickStats(dt) {
    let busy = false;
    for (const st of stats) {
      if (!st.started || st.done) continue;
      st.ms += dt;
      const total = STAT.countMs + st.full.length * STAT.typeMsPerChar;
      if (st.ms >= total) { st.ms = total; st.done = true; }
      drawStat(st);
      busy = true;
    }
    return busy;
  }

  function finishStats() {
    stats.forEach((st) => {
      st.started = st.done = true;
      st.ms = STAT.countMs + st.full.length * STAT.typeMsPerChar;
      drawStat(st);
    });
  }

  /* ----- Loop (un solo rAF compartido) ----- */

  function loop(dt) {
    if (dirty) { target = readTarget(); dirty = false; }
    const k = 1 - Math.pow(1 - MOVE.smoothing, dt / (1000 / 60));
    p += (target - p) * k;
    if (Math.abs(target - p) < 0.0004) p = target;

    // La entrada corre por tiempo: arranca al llegar la sección y no depende del scroll.
    if (!entryStarted && target >= ENTRY.trigger) entryStarted = true;
    if (entryStarted && !entryDone) {
      const rush = p >= STEPS.grow[0] ? ENTRY.rush : 1;
      entryMs = Math.min(entryMs + dt * rush, ENTRY.duration);
      if (entryMs >= ENTRY.duration) entryDone = true;
    }
    const u = entryMs / ENTRY.duration;

    if (p !== drawnP || u !== drawnU) { render(u, p); drawnP = p; drawnU = u; }
    tickStats(dt);
  }

  const onScroll = () => { dirty = true; };
  const onResize = () => { measure(); };

  /* ----- Encender y apagar la escena según el ancho y "reducir movimiento" ----- */

  function enable() {
    on = true;
    section.classList.add('is-scrolly');
    // motion.js pudo marcar estos bloques para su entrada; aquí mandan la entrada y el scroll.
    section.querySelectorAll('.pillar-stage .reveal, .pillar-scroll.reveal').forEach((el) => {
      el.className = el.className.replace(/\s*\breveal(-d\d|-in)?\b/g, '').trim();
    });
    measure();
    target = p = readTarget();
    // Las cápsulas arrancan vacías; si la página se abre con la sección ya pasada,
    // la entrada (y las cifras, si la escena ya se vio) se dan por hechas.
    stats.forEach((st) => { if (!st.started) drawStat(st); });
    if (target >= STEPS.grow[0]) { entryStarted = entryDone = true; entryMs = ENTRY.duration; }
    if (target >= STEPS.scene[1]) finishStats();
    render(entryMs / ENTRY.duration, p);
    drawnP = p; drawnU = entryMs / ENTRY.duration;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    stopVisible = whenVisible(scroll, (visible) => {
      // will-change solo mientras la escena está en pantalla.
      animated.forEach((el) => { el.style.willChange = visible ? 'transform, opacity' : ''; });
      if (visible) { dirty = true; ticker.add(loop); } else { ticker.remove(loop); }
    });
  }

  function disable() {
    on = false;
    section.classList.remove('is-scrolly');
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    stopVisible?.();
    ticker.remove(loop);
    animated.forEach((el) => {
      el.style.transform = el.style.opacity = el.style.willChange = '';
    });
    center.style.removeProperty('--grow');
    stats.forEach((st) => {
      st.arc.style.strokeDashoffset = '';
      st.num.textContent = st.numFull;
      st.text.textContent = st.full;
      st.lastOffset = st.lastNum = st.lastChars = undefined;
    });
    big.textContent = '24/7';
    lastHours = '';
    drawnP = drawnU = NaN;
  }

  function update() {
    const want = wide.matches && !reducedMotion;
    if (want && !on) enable();
    else if (!want && on) disable();
  }

  update();
  wide.addEventListener('change', update);
  onReducedMotionChange(update);

  // En pantallas angostas (sin escena fija) la ficha central cuenta su cifra una vez al aparecer.
  if (!reducedMotion) {
    let counted = false;
    whenVisible(center, (visible) => {
      if (!visible || on || counted) return;
      counted = true;
      countTo(big, 0, 24, 1000, hoursFmt);
    }, 0.4);
  }
}
