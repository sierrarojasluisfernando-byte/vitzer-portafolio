/* Entrada suave de los bloques al aparecer en pantalla. Sin JS, o con
   "reducir movimiento" activo, la pagina se ve completa y quieta: el CSS solo
   oculta lo marcado con .reveal bajo html.motion, que se pone aqui. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Cada selector marca los bloques que entran; los hermanos de un mismo
  // contenedor entran en cascada.
  var selector = [
    '.hero2 > *', '.hero > *', '.products-head > *', '.contact-head > *', '.closing > *',
    '.section-head > *',
    '.feat-grid > *', '.product-list > *', '.product-row > *', '.split-media', '.access-grid > *', '.contact-grid > *',
    '.stat-card', '.price-card', '.faq-item', '.steps > *', '.box',
    '.home-cta > .btn', '.cta-row', '.access-note', '.price-explain'
  ].join(',');

  var items = Array.prototype.slice.call(document.querySelectorAll(selector));

  // Un .section-content sin bloques propios (un telefono, una tabla) entra entero.
  Array.prototype.forEach.call(document.querySelectorAll('.section-content'), function (content) {
    var hasItems = items.some(function (item) { return content.contains(item); });
    if (!hasItems) items.push(content);
  });
  if (!items.length) return;

  var MAX_STEP = 5;
  var seen = [];
  var counts = [];
  items.forEach(function (item) {
    var parent = item.parentElement;
    var index = seen.indexOf(parent);
    if (index === -1) { index = seen.push(parent) - 1; counts.push(0); }
    var step = Math.min(counts[index]++, MAX_STEP);
    item.classList.add('reveal');
    if (step) item.classList.add('reveal-d' + step);
  });
  document.documentElement.classList.add('motion');

  function settle(item) {
    // Al terminar, se quitan las clases para que el retraso de la cascada no
    // afecte a las transiciones propias del bloque (hover).
    item.className = item.className.replace(/\s*\breveal(-d\d|-in)?\b/g, '').trim();
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var item = entry.target;
      observer.unobserve(item);
      item.classList.add('reveal-in');
      window.setTimeout(function () { settle(item); }, 1400);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  items.forEach(function (item) { observer.observe(item); });
})();
