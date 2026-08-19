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
