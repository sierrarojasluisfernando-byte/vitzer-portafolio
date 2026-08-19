(function () {
  var toggle = document.querySelector('.topnav-toggle');
  var menu = document.getElementById('topnav-menu');
  if (!toggle || !menu) return;

  var desktopQuery = window.matchMedia('(min-width: 768px)');

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
    document.body.classList.add('nav-open');
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('click', onOutsideClick, true);
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
    document.body.classList.remove('nav-open');
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
    if (e.target.tagName === 'A') closeMenu();
  });

  if (typeof desktopQuery.addEventListener === 'function') {
    desktopQuery.addEventListener('change', function (e) {
      if (e.matches) closeMenu();
    });
  }
})();
