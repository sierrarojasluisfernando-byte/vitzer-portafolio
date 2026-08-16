# Vitzer — reglas de layout

- Sitio estático de 4 páginas HTML (`index.html`, `productos.html`, `contacto.html`, `asistente-whatsapp.html`). Sin build ni framework.
- Todo el CSS vive en `assets/styles.css`. Nunca agregar `<style>` a los HTML ni estilos inline (`style="..."`) — siempre una clase en `styles.css`.
- Sistema de anchos por tokens en `:root`: `--shell` (1360px), `--gutter`, `--prose`, `--measure-narrow`. Prohibido hardcodear `max-width` o `padding-inline` en cualquier selector nuevo: siempre usar las variables.
- Contenedores de página (`.wrap`, `.wrap-wide`, `.topnav-inner`, `.products-wrap`, `.contact-wrap`) comparten `var(--shell)` — mismo eje vertical en todo el sitio, sin excepciones.
- Texto corrido limitado a `var(--prose)`; encabezados de sección a `var(--measure-narrow)`. Nunca texto a ancho completo del shell.
- `.tech-ticker-wrap` es full-bleed intencional: no envolverlo en ningún contenedor con `max-width`. Si se agregan ítems al ticker, duplicarlos exactamente al 50% o se rompe la animación (`translateX(-50%)`).
- `.phone` tiene 380px fijos por diseño, no es un contenedor de layout.
- Los 4 HTML llevan `<meta charset="utf-8">` como primer elemento.
