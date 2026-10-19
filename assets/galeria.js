/* Carrusel de la galería del inicio: las flechas avanzan una imagen y se
   apagan en los extremos. Sin JS, la franja igual se desliza con el dedo o
   con la rueda del ratón (scroll-snap en el CSS). */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-gallery]'), function (gallery) {
    var track = gallery.querySelector('.gallery-track');
    var buttons = gallery.querySelectorAll('.gallery-btn');
    if (!track || !buttons.length) return;

    function step() {
      var slide = track.querySelector('.gallery-slide');
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return slide ? slide.getBoundingClientRect().width + gap : track.clientWidth;
    }

    function update() {
      var max = track.scrollWidth - track.clientWidth - 2;
      buttons[0].disabled = track.scrollLeft <= 2;
      buttons[buttons.length - 1].disabled = track.scrollLeft >= max;
    }

    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener('click', function () {
        track.scrollBy({ left: step() * Number(button.getAttribute('data-dir')), behavior: 'smooth' });
      });
    });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();
