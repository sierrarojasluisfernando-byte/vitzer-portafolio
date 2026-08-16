# Auditoría de layout — vitzer-portafolio

Fecha: 2026-08-15
Alcance: `index.html`, `asistente-whatsapp.html`, `productos.html`, `contacto.html` (los únicos archivos del sitio).
Este documento es solo lectura/diagnóstico — no se modificó ningún otro archivo para producirlo.

---

## 1. Arquitectura de estilos

- **Sin archivos CSS externos.** No hay ni un solo `.css` en el repo, ni `package.json`, ni `tailwind.config.*`. El sitio es HTML estático puro servido directo por Vercel.
- **Sin framework CSS.** No hay Tailwind, Bootstrap, ni ningún sistema de utilidades. Todo es CSS escrito a mano.
- **CSS 100% embebido en `<style>`**, uno por archivo, duplicado íntegramente en los 4 HTML:

  | Archivo | Líneas del `<style>` | Líneas totales del archivo |
  |---|---|---|
  | `index.html` | 5–399 (395 líneas) | 458 |
  | `asistente-whatsapp.html` | 5–359 (355 líneas) | 618 |
  | `productos.html` | 5–419 (415 líneas) | 470 |
  | `contacto.html` | 5–427 (423 líneas) | 510 |

  De esas, las **primeras ~360 líneas son idénticas byte a byte en los 4 archivos** (el bloque "base": `:root`, tipografía, `.wrap`/`.wrap-wide`, hero, phone mockup, secciones, pricing, FAQ, footer, topnav, hero2, ticker). Cada archivo le agrega al final su propio bloque específico:
  - `index.html`: sin extra (usa solo el bloque base).
  - `asistente-whatsapp.html`: sin extra (usa solo el bloque base).
  - `productos.html`: +18 líneas propias (`.products-wrap`, `.products-head`, `.product-list`, `.product-card`, `.product-icon`).
  - `contacto.html`: +26 líneas propias (`.contact-wrap`, `.contact-head`, `.contact-grid`, `.contact-card`, `.form-row`, `.form-field`, `.info-item`, `.info-icon`).

  **Implicación directa para el rediagramado:** cualquier cambio al sistema de contenedores hay que aplicarlo 4 veces (una por archivo) o migrar primero a un CSS compartido, porque hoy no existe un solo punto de verdad.

- **Estilos inline (`style="..."`)** — muy pocos, todos triviales:
  | Archivo | Ocurrencias | Detalle |
  |---|---|---|
  | `index.html` | 1 | `padding-top:56px` en la sección "Quiénes somos" |
  | `asistente-whatsapp.html` | 0 | — |
  | `productos.html` | 3 | `justify-content:center` en el eyebrow; 2× `background:` en los íconos de producto |
  | `contacto.html` | 1 | `margin-bottom:18px` en un form-field |

  Ninguno fija anchos ni afecta el sistema de contenedores — no son un riesgo para el rediagramado.

---

## 2. Tabla de contenedores

Todas las secciones parten de dos contenedores "oficiales" (`.wrap` y `.wrap-wide`) más dos contenedores propios que **no** usan ese sistema (`.products-wrap`, `.contact-wrap`). Dentro de varias secciones hay un segundo nivel de contención (`.section-content`) que vuelve a limitar el ancho.

| Archivo | Sección | Selector CSS | max-width | padding-inline | margin | display | gap | columnas |
|---|---|---|---|---|---|---|---|---|
| Todos | Navbar | `.topnav-inner` | 780px | 24px | 0 auto | flex (space-between) | — | — |
| `index.html` | Hero | `.wrap.hero2` | 700px | 24px | 0 auto | block | — | — |
| `index.html` | Tech ticker (marquee) | `.tech-ticker-wrap` | **ninguno** (full-bleed) | 0 | — | block | — | — |
| `index.html` | Quiénes somos (texto) | `.section-head` (dentro de `.wrap`) | 700px → 560px | 24px | 0 auto | block | — | — |
| `index.html` | Quiénes somos (tarjetas) | `.section-content` → `.feat-grid` | 620px → sin límite propio | 24px (heredado) | 36px auto 0 | grid | 1px | 2 |
| `index.html` | Producto destacado | `.wrap.home-cta` | 700px | 24px | 0 auto | block, centrado | — | — |
| `index.html` | Footer | `footer.wrap` | 700px | 24px | 0 auto | block | — | — |
| `asistente-whatsapp.html` | Hero | `.wrap.hero` | 700px | 24px | 0 auto | block | — | — |
| `asistente-whatsapp.html` | Hero — phone mockup | `.phone` | 380px (fijo) + `max-width:100%` | — | 0 auto (vía `.phone-outer` flex) | flex (self) | — | — |
| `asistente-whatsapp.html` | El problema | `.wrap` → `.section-content` | 700px → 620px | 24px | 0 auto / 36px auto 0 | block | — | — |
| `asistente-whatsapp.html` | La solución | `.wrap` → `.section-head` | 700px → 560px | 24px | 0 auto | block | — | — |
| `asistente-whatsapp.html` | Cómo funciona (steps) | `.section-content` → `.steps li` | 620px | 24px (heredado) | 36px auto 0 | grid | 18px | 2 (44px + 1fr) |
| `asistente-whatsapp.html` | Qué incluye (tarjetas) | `.section-content.wide` → `.feat-grid` | 780px | 24px (heredado) | 36px auto 0 | grid | 1px | 2 |
| `asistente-whatsapp.html` | Dónde funciona (tags) | `.section-head` → `.tag-row` | 560px → sin límite propio | 24px (heredado) | 0 auto | flex wrap | 10px | — |
| `asistente-whatsapp.html` | Qué necesitamos de ti | `.section-content` → `.checklist li` | 620px | 24px (heredado) | 36px auto 0 | grid | 14px | 2 (22px + 1fr) |
| `asistente-whatsapp.html` | El proceso (steps) | `.section-content` → `.steps li` | 620px | 24px (heredado) | 36px auto 0 | grid | 18px | 2 (44px + 1fr) |
| `asistente-whatsapp.html` | Por qué vale la pena | `.wrap-wide` → `.section-content.wide` → `.roi-compare` | 880px → 780px | 24px | 0 auto / 36px auto 0 | grid | 18px | 3 (1fr auto 1fr) |
| `asistente-whatsapp.html` | **Inversión (tarjetas de precio)** | `.wrap-wide` → `.section-content.wide` → `.price-grid` | 880px → 780px → **780px propio (redundante)** | 24px | 0 auto / 36px auto 0 / 0 auto | grid | 20px | 3 |
| `asistente-whatsapp.html` | FAQ | `.wrap` → `.section-content` | 700px → 620px | 24px | 0 auto / 36px auto 0 | flex column | — | — |
| `asistente-whatsapp.html` | Cierre / CTA | `.wrap.closing` | 700px | 24px | 0 auto | block | — | — |
| `asistente-whatsapp.html` | Footer | `footer.wrap` | 700px | 24px | 0 auto | block | — | — |
| `productos.html` | Navbar | `.topnav-inner` | 780px | 24px | 0 auto | flex | — | — |
| `productos.html` | **Todo el body** | `.products-wrap` (contenedor propio, NO usa `.wrap`/`.wrap-wide`) | **900px** | 24px | 0 auto | block | — | — |
| `productos.html` | Encabezado | `.products-head` (dentro de `.products-wrap`) | 620px | — | 0 auto | block | — | — |
| `productos.html` | Lista de productos | `.product-list` → `.product-card` | sin límite propio (llena los 900px) | — | — | flex column / flex row (card) | 18px (lista) / 22px (card) | — |
| `productos.html` | Footer | `footer.wrap` | **700px** (¡vuelve al sistema `.wrap`, distinto de los 900px del body!) | 24px | 0 auto | block | — | — |
| `contacto.html` | Navbar | `.topnav-inner` | 780px | 24px | 0 auto | flex | — | — |
| `contacto.html` | **Todo el body** | `.contact-wrap` (contenedor propio, NO usa `.wrap`/`.wrap-wide`) | **900px** | 24px | 0 auto | block | — | — |
| `contacto.html` | Encabezado | `.contact-head` (dentro de `.contact-wrap`) | 620px | — | **sin `auto`, alineado a la izquierda** | block | — | — |
| `contacto.html` | Formulario + info | `.contact-grid` | sin límite propio (llena los 900px) | — | 40px arriba | grid | 20px | 2 (1.3fr 1fr) |
| `contacto.html` | Footer | `footer.wrap` | **700px** (misma inconsistencia que `productos.html`) | 24px | 0 auto | block | — | — |

---

## 3. Valores hardcodeados

### `max-width` — todos los valores distintos que aparecen, con frecuencia total (sumando los 4 archivos)

| Valor | Ocurrencias | Selector(es) | Archivos |
|---|---|---|---|
| `620px` | 21 | `.section-content`, `.price-lead`, `.price-explain`, `.annual-note`, `.hero2 p.lede`, `.products-head`, `.contact-head` | los 4 (repartido; `.hero2 p.lede` no aplica a `asistente-whatsapp.html`, que usa `.hero` en vez de `.hero2`) |
| `780px` | 12 | `.section-content.wide`, `.price-grid`, `.topnav-inner` | los 4 (+1 extra en `contacto.html` por el breakpoint de `.contact-grid`, no es propiedad sino condición de media query) |
| `560px` | 5 | `.section-head` | los 4 (+1 extra en `contacto.html`: `.contact-head p.lede`) |
| `100%` | 4 | `.phone` (`max-width:100%` junto a `width:380px`) | los 4 |
| `15ch` | 4 | `.closing h2` | los 4 |
| `16ch` | 4 | `.hero h1` | los 4 |
| `30ch` | 4 | `.section-bridge` | los 4 — **clase definida pero no usada en ningún HTML** (ver Riesgos) |
| `420px` | 4 | `.price-grid` en el breakpoint móvil (`max-width:900px`) | los 4 |
| `44ch` | 4 | `.closing p.lede` | los 4 |
| `46ch` | 4 | `.hero p.lede` | los 4 |
| `700px` | 4 | `.wrap` | los 4 |
| `84%` | 4 | `.bubble` (burbujas del chat mockup) | los 4 |
| `880px` | 4 | `.wrap-wide` | los 4 |
| `900px` | 2 | `.products-wrap`, `.contact-wrap` (contenedores propios) | `productos.html`, `contacto.html` |

En total hay **13 valores de `max-width` distintos** en el sitio (sin contar los que solo aparecen como condición de `@media`).

### Padding horizontal (`padding-inline` efectivo)

A diferencia del `max-width`, el padding lateral **sí es consistente**: prácticamente todo contenedor de página usa **`24px`** de cada lado —
`.wrap`, `.wrap-wide`, `.topnav-inner`, `.products-wrap`, `.contact-wrap` y `.section-bridge` comparten ese mismo valor. No se encontraron otros valores de padding horizontal a nivel de contenedor de página (los paddings distintos que existen — `13px 16px`, `28px 26px`, `22px 24px`, etc. — son de componentes internos como tarjetas, burbujas o pills, no de contenedores de ancho de página).

### Secciones que NO comparten el mismo eje vertical

Esto es lo más relevante de cara al rediagramado — puntos donde el contenido no está alineado con el resto de la página:

1. **`productos.html` y `contacto.html`: footer desalineado del resto del body.** El body usa `.products-wrap`/`.contact-wrap` a 900px, pero el `<footer>` usa `.wrap` a 700px. El texto del footer queda visiblemente más angosto y centrado en un eje distinto al del contenido de arriba.
2. **`productos.html` y `contacto.html`: navbar (780px) vs. body (900px).** El logo y los links del navbar no comparten el eje horizontal con el contenido de la página — el navbar es más angosto.
3. **`contacto.html`: `.contact-head` no está centrado** (no tiene `margin: 0 auto`), a diferencia de `.products-head` y de casi todos los demás encabezados de sección, que sí lo están. Es intencional (texto alineado a la izquierda) pero rompe el patrón del resto del sitio.
4. **`asistente-whatsapp.html`: doble/triple contención redundante en "Inversión" y "Por qué vale la pena".** `.wrap-wide` (880px) contiene a `.section-content.wide` (780px) que a su vez contiene a `.price-grid`, que vuelve a fijar `max-width:780px` por su cuenta — tres capas para llegar al mismo ancho final. Cualquier intento de ensanchar esta sección tiene que tocar 3 selectores distintos, no 1.
5. **Dentro de una misma página, el ancho salta entre 700 y 880 según la sección** (`asistente-whatsapp.html` alterna `.wrap` y `.wrap-wide` sección por sección), así que ya hoy el sitio no tiene un único eje vertical ni siquiera dentro de una sola página.

---

## 4. Responsive

### Media queries existentes (breakpoints exactos)

| Breakpoint | Dónde | Qué hace |
|---|---|---|
| `(prefers-reduced-motion: reduce)` | Global (los 4 archivos) | Desactiva animaciones/transiciones |
| `(max-width: 640px)` | `.feat-grid` | Pasa de 2 columnas a 1 |
| `(max-width: 560px)` | `.roi-compare` (solo `asistente-whatsapp.html`) | Pasa de 3 columnas a 1 y oculta el "vs." |
| `(max-width: 560px)` | `.topnav-links` | Reduce gap y tamaño de fuente del menú |
| `(max-width: 900px)` | `.price-grid` (solo `asistente-whatsapp.html`) | Pasa de 3 columnas a 1, y le pone `max-width:420px` centrado |
| `(max-width: 600px)` | `.product-card` (solo `productos.html`) | Pasa de fila a columna |
| `(max-width: 780px)` | `.contact-grid` (solo `contacto.html`) | Pasa de 2 columnas a 1 |
| `(max-width: 480px)` | `.form-row` (solo `contacto.html`) | Pasa de 2 columnas a 1 |
| `print` | Global | Reglas de paginación/salto de página para imprimir como PDF |

No hay ningún breakpoint que ajuste `.wrap`, `.wrap-wide`, `.products-wrap` o `.contact-wrap` en sí — esos contenedores son fijos en `max-width` y dependen solo del padding de `24px` para no tocar los bordes en pantallas angostas (funciona porque `max-width` + `margin:auto` ya colapsa solo en pantallas pequeñas).

### Unidades fluidas vs. fijas

Sí hay unidades fluidas, pero limitadas a tipografía y a un puñado de anchos de texto:

- **`clamp()`**: usado en tamaños de fuente de títulos (`.hero h1`, `.hero2 h1`, `.section-head h2`, `.closing h2`, `.section-bridge`, `.products-head h1`, `.contact-head h1`) — entre 4 y 6 usos por archivo.
- **`ch` (ancho relativo al carácter)**: usado para limitar el ancho de líneas de texto (`16ch`, `30ch`, `44ch`, `46ch`, `15ch`) — es fluido en el sentido de que se adapta al tamaño de fuente, pero no a la ventana.
- **`%`**: solo 2 casos — `max-width:100%` en `.phone` (fallback de los 380px fijos) y `max-width:84%` en `.bubble`.
- **`vw`**: solo dentro de los `clamp()` (ej. `clamp(26px, 3.2vw, 36px)`).

**Todo el sistema de contenedores (`max-width` de `.wrap`, `.wrap-wide`, `.section-content`, `.price-grid`, `.products-wrap`, `.contact-wrap`, `.topnav-inner`) está en `px` fijos — cero uso de `clamp()`, `min()`, `max()` o `%` para el ancho de los contenedores mismos.** Esto confirma que hoy no existe ningún mecanismo fluido a nivel de layout — todo el "responsive" del ancho de página ocurre porque un `max-width` fijo dejar de aplicar cuando el viewport es más angosto que el padding lo permite, no porque el contenedor se adapte activamente.

---

## 5. Variables CSS

Sí existe un bloque `:root`, **idéntico en los 4 archivos** (mismo bloque compartido descrito en la sección 1):

```css
:root {
  --ground: #FFFFFF;
  --surface: #F7F7FA;
  --surface-raised: #FFFFFF;
  --ink: #0B0B12;
  --ink-soft: #55586B;
  --ink-faint: #8D90A0;
  --line: #E7E7EF;
  --line-strong: #D2D3E0;
  --accent: #4169E1;
  --accent-ink: #FFFFFF;
  --accent-soft: #E9EEFC;
  --accent-deep: #2F4FBF;
  --magenta: #8B5CF6;
  --magenta-soft: #F3ECFE;
  --good: #1F8A5F;
  --good-soft: #DEF1E7;
  --shadow: 0 1px 2px rgba(20,30,60,0.05), 0 10px 28px -14px rgba(20,30,60,0.16);
  --bubble-them: #FFFFFF;
  --bubble-me: #EEF0FF;
}
```

**No hay ninguna variable CSS para anchos, contenedores, breakpoints ni espaciados.** Todas las 18 variables son de color/sombra. Esto significa que el sistema unificado de anchos que se planea construir se puede introducir limpio, sin variables previas que choquen — pero también que hoy no hay ningún punto central para ese propósito; hay que crearlo desde cero.

Hay además referencias a variables de tema oscuro que no están definidas en ningún `:root` (`:root[data-theme="dark"]`, `:root:not([data-theme="light"])`), en `.price-card .annual-mini .save` y `.annual-note strong`. No hay ningún mecanismo en el HTML que setee `data-theme` — es CSS muerto/preparado para un modo oscuro que nunca se implementó.

---

## 6. Riesgos para el rediagramado a contenedor ancho

| Riesgo | Dónde | Detalle |
|---|---|---|
| **Carrusel de logos (tech ticker)** | `.tech-ticker-wrap` / `.tech-ticker`, `index.html` y `productos.html`/`contacto.html` no lo usan pero está en el CSS base de los 4 | Es **full-bleed** (no usa `.wrap`/`.wrap-wide` — no tiene contenedor de ancho en absoluto). El scroll infinito depende de `width: max-content` + `animation: translateX(-50%)`, lo que asume que el `<span>` de contenido está duplicado **exactamente** al 50%. Si al unificar el sistema de anchos alguien envuelve este bloque en el nuevo contenedor ancho, hay que verificar que `overflow:hidden` del wrapper siga funcionando y que la duplicación de items se mantenga exacta — cualquier ítem agregado sin duplicar rompe el loop visual (salto/corte en la animación). |
| **Triple contención redundante en Pricing / ROI** | `asistente-whatsapp.html`, sección "Inversión" y "Por qué vale la pena" | `.price-grid` fija su propio `max-width:780px` *además* de heredarlo de `.section-content.wide` (780px) *además* de `.wrap-wide` (880px). Si el nuevo sistema solo cambia `.wrap-wide`, esta sección **no se ensanchará** — hay que tocar también `.section-content.wide` y el `max-width` propio de `.price-grid` explícitamente. |
| **Contenedores "huérfanos" fuera del sistema** | `productos.html` (`.products-wrap`), `contacto.html` (`.contact-wrap`) | No heredan de `.wrap`/`.wrap-wide` — son selectores con su propio `max-width:900px` hardcodeado. Si el nuevo contenedor unificado se aplica solo a `.wrap`/`.wrap-wide`, estas dos páginas quedan fuera y hay que migrarlas aparte. |
| **Footer con contenedor propio distinto al body** | `productos.html`, `contacto.html` | El `<footer>` usa `.wrap` (700px) mientras el body de esas páginas usa 900px. Al unificar, si no se corrige, el footer quedará en un ancho distinto al del resto de la página incluso después del rediagramado. |
| **Grids con columnas en `px` fijos** | `.steps li` (`44px 1fr`), `.checklist li` (`22px 1fr`) | No son un riesgo real de ruptura (son columnas pequeñas de ícono/número, no de contenido), pero si el contenedor se ensancha mucho el texto de la columna `1fr` quedará con líneas muy largas — vale la pena revisar `max-width` de lectura (line-length) en el diseño nuevo, no solo el contenedor exterior. |
| **`.phone` mockup con ancho fijo (`380px`)** | `.phone`, hero de `index.html` (implícito vía `.phone-outer`) y `asistente-whatsapp.html` | Es intencional (simula un teléfono) y tiene `max-width:100%` como fallback — no se rompe al ensanchar el contenedor padre, simplemente no crece. No requiere cambios, pero no hay que "arreglarlo" pensando que es un contenedor de layout. |
| **`position: fixed` / `sticky`** | `.wa-float` (fixed, botón flotante de WhatsApp), `.topnav` (sticky) | Ninguno depende del ancho del contenedor de contenido — están anclados al viewport. Sin riesgo, pero confirmarlo tras el cambio (que el botón flotante no quede tapado si cambia el padding global). |
| **`position: absolute` decorativos** | `.pain-list li::before` (flecha "→"), `.price-card li::before` (punto de la lista) | Son pseudo-elementos posicionados relativos a su propio `li` (`position:relative` en el padre), no al contenedor de página. Sin riesgo al ensanchar. |
| **`overflow: hidden`** | `.phone` (recorta esquinas redondeadas), `.feat-grid` (recorta esquinas del grid de líneas finas), `.tech-ticker-wrap` (recorta el marquee) | Los dos primeros son solo estéticos (border-radius) y no dependen del ancho — sin riesgo. El de `.tech-ticker-wrap` sí es crítico, ver el punto del carrusel arriba. |
| **`.section-bridge`: CSS muerto** | Definida en los 4 archivos, no usada en ningún HTML | No es un riesgo de ruptura, pero si el rediagramado toca esta clase pensando que se usa, es tiempo perdido. Confirmar antes de tocarla si de verdad no se usa en ninguna parte (no se encontró en el `grep` de las 4 páginas). |
| **Sin `<img>` en todo el sitio** | — | Todos los gráficos son SVG inline o CSS (íconos, avatar, logo del teléfono). **No hay riesgo de imágenes con `width` en `px` que se descuadren** — ese riesgo mencionado en el pedido no aplica a este proyecto tal como está hoy. |
| **Duplicación del CSS base en 4 archivos** | Los 4 | No es un "riesgo de ruptura" visual, pero sí de ejecución: cualquier cambio al sistema de contenedores debe repetirse manualmente 4 veces (o hay que migrar primero a un archivo CSS compartido) porque no existe un solo punto de verdad. Alto riesgo de que una página quede desincronizada de las otras tres si se edita a mano. |

---

## Resumen ejecutivo

- Sitio 100% HTML/CSS estático, sin build ni framework, con el mismo bloque de CSS pegado 4 veces.
- Existen **13 valores distintos de `max-width`** repartidos en un sistema de contención de **hasta 3 niveles anidados** (`.wrap`/`.wrap-wide` → `.section-content`(`.wide`) → a veces un tercer `max-width` propio como `.price-grid`).
- El **padding lateral sí es consistente** (`24px` en todos lados) — eso simplifica la unificación.
- **Dos páginas (`productos.html`, `contacto.html`) usan contenedores propios de 900px** que no forman parte del sistema `.wrap`/`.wrap-wide`, y sus footers quedan en un tercer ancho (700px) — la inconsistencia de eje vertical más visible del sitio hoy.
- No hay variables CSS de layout (`:root` solo tiene colores/sombra) — se puede introducir un sistema de variables de ancho limpio, sin conflictos previos.
- El único componente realmente sensible al cambio de ancho es el **ticker de tecnologías** (full-bleed, animación por `translateX(-50%)` que depende de una duplicación exacta del contenido).
