/* El logo del menú se arma la primera vez que se abre el sitio en la pestaña:
   los módulos llegan de los lados, el nodo sube y aparece la palabra. Corre en
   el <head>, antes de pintar, para que el logo no se vea completo y luego
   desaparezca. Al navegar entre páginas ya no se repite. */
(function () {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (sessionStorage.getItem('vitzer-logo-intro')) return;
    sessionStorage.setItem('vitzer-logo-intro', '1');
    document.documentElement.classList.add('logo-intro');
  } catch (e) { /* sin almacenamiento: el logo se muestra quieto */ }
})();
