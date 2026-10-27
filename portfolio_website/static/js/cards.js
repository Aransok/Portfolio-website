// Catalogue cards with a recorded demo play it on hover (or when scrolled
// into the middle of the screen on touch devices). Video loads on first use.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var cards = document.querySelectorAll('.project-card[data-video]');
  Array.prototype.forEach.call(cards, function (card) {
    var art = card.querySelector('.project-art');
    var v = null;
    function play() {
      if (!v) {
        v = document.createElement('video');
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.setAttribute('aria-hidden', 'true');
        v.src = card.dataset.video;
        v.className = 'project-video';
        art.appendChild(v);
        v.addEventListener('playing', function () { art.classList.add('playing'); });
      }
      v.play().catch(function () {});
    }
    function stop() {
      if (!v) return;
      v.pause();
      art.classList.remove('playing');
    }
    if (fine) {
      card.addEventListener('mouseenter', play);
      card.addEventListener('mouseleave', stop);
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es[0].isIntersecting ? play() : stop(); }, { rootMargin: '-35% 0px -35% 0px' }).observe(card);
    }
  });
})();
