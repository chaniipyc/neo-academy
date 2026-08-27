(function () {
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('nav-toggle');
  var navMobile = document.getElementById('nav-mobile');

  function setScrolled() {
    if (window.scrollY > 4) {
      nav.classList.add('is-scrolled');
    } else {
      nav.classList.remove('is-scrolled');
    }
  }
  setScrolled();
  window.addEventListener('scroll', setScrolled, { passive: true });

  function closeMenu() {
    navMobile.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  navToggle.addEventListener('click', function () {
    var open = navMobile.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  });

  navMobile.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  var revealTargets = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  }
})();
