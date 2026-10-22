/* Pilares del inicio: entrada automática + coreografía ligada al scroll.
   La escena (un alto de pantalla) queda fija (sticky) solo durante el respiro:
   --pillar-breath px en los que el conjunto sube 1:1 con el scroll. Luego se
   suelta y sube con la página como cualquier sección, sin tramos quietos,
   mientras la secuencia automática corre sola.
     1. Entrada (por tiempo, una sola vez por visita): al llegar la sección se
        reproduce sola, despacio, columna por columna de izquierda a derecha:
        punto, tramo de línea, número, título, subtítulo y su ficha. Dentro de
        la misma secuencia la central cuenta 0/7 → 24/7 y entra la insignia 7×.
        Si el scroll llega al despliegue antes de que termine, se completa en
        un instante para no mezclarse.
     2. Al seguir bajando, el scroll da la señal y todo corre solo y de corrido:
        las laterales suben y se desvanecen, la central se despliega a lo alto y
        se centra, gira en 3D, aparecen las cifras con su anillo y su frase, y
        una deriva suave. No frena el scroll. Al subir, todo sigue el scroll y
        se deshace en orden.
   Solo en pantallas anchas y sin "reducir movimiento"; si no, la sección queda
   quieta y completa y la ficha central solo cuenta su cifra al aparecer. */

import {
  ticker, whenVisible, reducedMotion, onReducedMotionChange,
  clamp, lerp, range, easeOutExpo, easeOutBack, easeInOutCubic, cubicBezier, countTo,
} from './motion-utils.js';

/* ---------- Parámetros ajustables ---------- */

const ENTRY = {
  duration: 3000,        // ms de la entrada completa
  trigger: 0.88,         // arranca cuando el rail asoma a esta altura de la pantalla (0 arriba, 1 abajo)
  rush: 8,               // si el scroll ya llegó al despliegue, la entrada va 8× más rápido
  // Primero las tres líneas en un trazo continuo de izquierda a derecha, con sus
  // textos; después las tres cajas encadenadas, cada una empieza antes de que
  // termine la anterior. Tramos en fracción de la entrada (0 → 1).
  railStep: 0.12,        // desfase entre columnas del rail
  dot: [0, 0.06],
  seg: [0, 0.12],        // = railStep y lineal: los tramos se encadenan en una sola línea
  num: [0.05, 0.2],
  title: [0.07, 0.24],
  sub: [0.09, 0.28],
  cardStart: 0.34,       // las cajas empiezan cuando el rail está casi completo
  cardStep: 0.11,        // desfase entre cajas (se solapan)
  cardLen: 0.36,         // duración de cada caja
  data: [0.5, 0.86],     // 0/7 → 24/7, barra y chips, mientras entra la ficha central
  badge: [0.8, 1],       // insignia 7×, al final
};
// Piloto automático al bajar: cuando el scroll pasa el inicio de la transición
// (y la entrada ya terminó), todo sigue solo y de corrido: las laterales se van,
// la central se despliega y se centra, gira en 3D, aparecen las cifras y la
// deriva final. No frena el scroll. Al subir todo vuelve a seguir el scroll.
const AUTO = {
  growMs: 1500,          // ms de la transición (laterales fuera, central desplegada)
  sceneMs: 3000,         // ms del giro, las cifras y la deriva
  follow: 0.15,          // suavidad al pasar de automático a seguir el scroll
};
// Respiro: con la escena fija, el conjunto (rail y fichas) sigue subiendo 1:1
// con el scroll durante --pillar-breath px (CSS), legible. Al terminar llega la
// señal (p = 0) y la escena se suelta. p mide la secuencia: 0 → 1 a lo largo de
// una pantalla de scroll después del respiro; al bajar corre sola por tiempo y
// al subir se deshace siguiendo p.
const STEPS = {
  grow: [0, 0.34],       // la central se despliega a lo alto; las laterales suben y se van
  scene: [0.3, 0.7],     // giro 3D, cifras y halo
  drift: [0.62, 1],      // la ficha sigue girando suave y las cifras flotan
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
  holdDrift: 0.25,       // en el tramo fijo la escena sube a ¼ de la velocidad del scroll
};
// Cápsulas con cifras: al aparecer (por scroll) arrancan solas, por tiempo.
const STAT = {
  startAt: 0.6,          // la cápsula arranca cuando ya se ve al 60 %
  countMs: 900,          // anillo y conteo de la cifra
  typeMsPerChar: 26,     // velocidad del mecanografiado
};
const easeOut = cubicBezier(0.2, 0.7, 0.2, 1);
const easeSoft = cubicBezier(0.16, 1, 0.3, 1); // entrada de las cajas: arranca ágil y se posa suave
const WARM = 0.001; // opacidad mínima invisible: mantiene pintadas las piezas que aparecen después
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
  const animated = [stage, rail, cardsBox, ...railParts, ...cards, bar, ...chips, badge, ...floats, halo, source];

  const wide = window.matchMedia('(min-width: 861px) and (min-height: 620px)');
  let on = false;
  let p = 0, target = 0, dirty = true;
  let entryMs = 0, entryStarted = false, entryDone = false;
  // sv: avance de la transición y el giro, en las mismas unidades que p (0 → 1).
  let sv = 0, goingUp = false, lastTarget = 0;
  let breath = 200, span = 800, past = -Infinity; // px: respiro, recorrido de p y scroll pasado el punto de fijarse
  let drawnU = NaN, drawnSV = NaN, drawnLift = NaN;
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
    breath = parseFloat(getComputedStyle(section).getPropertyValue('--pillar-breath')) || 200;
    span = Math.max(1, scroll.offsetHeight - stageH - breath); // tramo fijo después del respiro
    preMax = Math.max(0, rail.offsetTop - PRE_PAD); // franja vacía sobre el rail con el contenido centrado
    dirty = true;
  }

  let lift = 0; // px que el conjunto ya subió durante el respiro (1:1 con el scroll)
  let hold = 0; // px de scroll dentro del tramo fijo después del respiro

  // Aproximación: mientras la sección sube hacia su lugar, el rail y las cajas
  // arrancan pegados al título (sin franja vacía) y se acomodan de a poco hasta su
  // posición centrada, a la que llegan justo cuando la escena se fija.
  let pre = 0, preMax = 0, railTop = Infinity;
  const PRE_PAD = 8; // px de aire entre el borde de la escena y el rail al llegar

  function readTarget() {
    const top = scroll.getBoundingClientRect().top;
    past = navH - top;
    lift = clamp(past, 0, breath);
    hold = clamp(past - breath, 0, span);
    pre = preMax * (1 - range(past, -stageH, 0));
    railTop = top + rail.offsetTop - pre;
    return clamp((past - breath) / span, -3, 1);
  }

  /* ----- La escena: u = avance de la entrada (0 → 1), p = scroll ----- */

  const fade = (el, t, dy = 10) => {
    el.style.opacity = t;
    el.style.transform = `translateY(${(1 - t) * dy}px)`;
  };

  // u = avance de la entrada (tiempo), sv = avance de la transición y el giro
  // (automático al bajar, ligado al scroll al subir).
  function render(u, sv) {
    const g = easeInOutCubic(range(sv, ...STEPS.grow));
    const s = easeInOutCubic(range(sv, ...STEPS.scene));
    const w = range(sv, ...STEPS.drift);

    // Respiro: el conjunto sube con el scroll, como cualquier sección.
    rail.style.transform = cardsBox.style.transform = `translateY(${-lift - pre}px)`;
    // Tramo fijo: toda la escena sube despacio con el scroll, así nunca se ve quieta.
    stage.style.transform = `translateY(${-hold * MOVE.holdDrift}px)`;

    // 1a. Entrada del rail: una línea continua de izquierda a derecha; los textos
    // de cada paso aparecen cuando la línea llega a su punto.
    columns.forEach((c, i) => {
      const o = i * ENTRY.railStep;
      const at = (span) => easeOut(range(u, o + span[0], o + span[1]));
      const dot = at(ENTRY.dot);
      c.dot.style.opacity = dot;
      c.dot.style.transform = `scale(${lerp(0.3, 1, dot)})`;
      c.seg.style.transform = `scaleX(${range(u, o + ENTRY.seg[0], o + ENTRY.seg[1])})`;
      fade(c.num, at(ENTRY.num), 8);
      fade(c.title, at(ENTRY.title), 10);
      fade(c.sub, at(ENTRY.sub), 10);
    });
    // 1b. Después las tres cajas, encadenadas (cada una empieza antes de que termine la anterior).
    const cardIn = cards.map((_, i) => {
      const a = ENTRY.cardStart + i * ENTRY.cardStep;
      return easeSoft(range(u, a, a + ENTRY.cardLen));
    });
    const cardScale = (t) => lerp(0.97, 1, t);
    // El rail se va cuando la central empieza a desplegarse.
    rail.style.opacity = 1 - range(g, 0, 0.35);

    // 2. Laterales: suben despacio y se desvanecen mientras la central se despliega.
    [left, right].forEach((card) => {
      const t = cardIn[cards.indexOf(card)];
      card.style.opacity = t * (1 - g);
      card.style.transform = `translateY(${(1 - t) * MOVE.cardRise + MOVE.sideLift * g}px) scale(${cardScale(t) * lerp(1, 0.97, g)})`;
    });

    // Central: entra, se despliega a lo alto, se centra, gira en 3D y sigue girando suave.
    const grow = lerp(1, MOVE.grow, g);
    center.style.setProperty('--grow', grow);
    const tc = cardIn[1];
    // + lift: al centrarse compensa lo que el conjunto subió durante el respiro.
    const cy = (1 - tc) * MOVE.cardRise + (centerShift + lift + ((grow - 1) * tileH) / 2) * g;
    const rx = MOVE.tiltX * s + MOVE.driftX * w;
    const ry = MOVE.tiltY * s + MOVE.driftY * w;
    center.style.opacity = tc;
    center.style.transform = `translateY(${cy}px) scale(${lerp(1, MOVE.centerScale, g) * cardScale(tc)}) rotateX(${rx}deg) rotateY(${ry}deg)`;

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
      const t = easeOut(range(sv, STEPS.scene[0] + 0.03 + i * 0.07, STEPS.scene[0] + 0.16 + i * 0.07));
      const y = (1 - t) * 18 + MOVE.floatDrift[i] * w;
      el.style.opacity = Math.max(t, WARM);
      el.style.transform = `translateY(${y}px)`;
      if (t >= STAT.startAt) stats[i].started = true;
    });
    // Precalentado: nunca opacidad 0 exacta (0.001 no se ve), así el navegador los
    // pinta durante la entrada y no en el primer cuadro de la transición.
    halo.style.opacity = Math.max(s, g * 0.5, WARM);
    halo.style.transform = `scale(${1 + 0.12 * w})`;
    source.style.opacity = Math.max(s, WARM);
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
    // La entrada arranca en cuanto el rail asoma en pantalla.
    if (!entryStarted && railTop < window.innerHeight * ENTRY.trigger) entryStarted = true;
    if (entryStarted && !entryDone) {
      const rush = p >= STEPS.grow[0] ? ENTRY.rush : 1;
      entryMs = Math.min(entryMs + dt * rush, ENTRY.duration);
      if (entryMs >= ENTRY.duration) entryDone = true;
    }
    const u = entryMs / ENTRY.duration;

    // Transición y giro: al bajar, pasado su inicio y con la entrada terminada,
    // corren solos y de corrido; al subir siguen el scroll.
    if (target > lastTarget + 0.0005) goingUp = false;
    else if (target < lastTarget - 0.0005) goingUp = true;
    lastTarget = target;
    const scrollSV = clamp(p, 0, 1);
    if (!goingUp && p >= STEPS.grow[0] && entryDone) {
      // Una vez arrancada, avanza solo por tiempo: aunque la rueda pase rápido, se ve completa.
      const rate = sv < STEPS.scene[0]
        ? (STEPS.scene[0] - STEPS.grow[0]) / AUTO.growMs
        : (1 - STEPS.scene[0]) / AUTO.sceneMs;
      // Por tiempo, y nunca detrás del scroll: si scrolleas, avanza al ritmo del scroll.
      sv = Math.max(scrollSV, Math.min(1, sv + dt * rate));
    } else if (goingUp || p < STEPS.grow[0]) {
      sv += (scrollSV - sv) * (1 - Math.pow(1 - AUTO.follow, dt / (1000 / 60)));
      if (Math.abs(scrollSV - sv) < 0.0004) sv = scrollSV;
    }

    if (u !== drawnU || sv !== drawnSV || lift + hold + pre !== drawnLift) {
      render(u, sv);
      drawnU = u; drawnSV = sv; drawnLift = lift + hold + pre;
    }
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
    // Si se abre con la escena ya pasada, todo queda donde corresponde al scroll.
    sv = clamp(p, 0, 1);
    lastTarget = target;
    render(entryMs / ENTRY.duration, sv);
    drawnU = entryMs / ENTRY.duration; drawnSV = sv; drawnLift = lift + hold + pre;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    // will-change desde una pantalla antes de llegar (y se quita al alejarse), así
    // las capas ya están creadas cuando empieza el movimiento.
    const stopWarm = whenVisible(scroll, (near) => {
      animated.forEach((el) => { el.style.willChange = near ? 'transform, opacity' : ''; });
    }, 0, '100% 0px');
    const stopTick = whenVisible(scroll, (visible) => {
      if (visible) { dirty = true; ticker.add(loop); } else { ticker.remove(loop); }
    });
    stopVisible = () => { stopWarm(); stopTick(); };
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
    drawnU = drawnSV = drawnLift = NaN;
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
