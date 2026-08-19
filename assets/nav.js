(function () {
  var toggle = document.querySelector('.topnav-toggle');
  var menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  var backdrop = menu.querySelector('.mobile-menu-backdrop');
  var desktopQuery = window.matchMedia('(min-width: 768px)');
  var savedScrollY = 0;

  function lockScroll() {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = -savedScrollY + 'px';
    document.body.classList.add('nav-open');
  }

  function unlockScroll() {
    document.body.classList.remove('nav-open');
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      closeMenu();
      toggle.focus();
    }
  }

  function onOutsideClick(e) {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) {
      closeMenu();
    }
  }

  function openMenu() {
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Cerrar menú');
    lockScroll();
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('click', onOutsideClick, true);
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
    unlockScroll();
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('click', onOutsideClick, true);
  }

  toggle.addEventListener('click', function () {
    if (menu.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A' || e.target === backdrop) closeMenu();
  });

  if (typeof desktopQuery.addEventListener === 'function') {
    desktopQuery.addEventListener('change', function (e) {
      if (e.matches) closeMenu();
    });
  }
})();

/* Header sticky "hide on scroll down / show on scroll up", solo <1024px.
   rAF-throttled: onScroll solo agenda un frame, update() hace el trabajo
   real una vez por frame como maximo (nunca corre en cada evento scroll). */
(function () {
  var header = document.querySelector('.topnav');
  var menu = document.getElementById('mobile-menu');
  if (!header) return;

  var mobileQuery = window.matchMedia('(max-width: 1023.98px)');
  var lastY = window.scrollY || window.pageYOffset || 0;
  var upDistance = 0;
  var ticking = false;

  function isMenuOpen() {
    return !!(menu && menu.classList.contains('is-open'));
  }

  function update() {
    ticking = false;
    var currentY = window.scrollY || window.pageYOffset || 0;

    if (!mobileQuery.matches || isMenuOpen()) {
      header.classList.remove('is-hidden');
      lastY = currentY;
      upDistance = 0;
      return;
    }

    var delta = currentY - lastY;
    var headerHeight = header.offsetHeight;

    if (currentY <= headerHeight) {
      header.classList.remove('is-hidden');
      upDistance = 0;
    } else if (delta > 0) {
      upDistance = 0;
      header.classList.add('is-hidden');
    } else if (delta < 0) {
      upDistance += -delta;
      if (upDistance >= 10) {
        header.classList.remove('is-hidden');
      }
    }

    lastY = currentY;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', function () {
      header.classList.remove('is-hidden');
      lastY = window.scrollY || window.pageYOffset || 0;
      upDistance = 0;
    });
  }
})();
