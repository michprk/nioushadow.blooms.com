/* ==========================================================================
   Chargé tout en haut de chaque page, avant l’affichage.
   ========================================================================== */
(function () {
  var root = document.documentElement;

  // 1. Forcer le HTTPS (sauf en local, pour pouvoir tester sur son ordinateur)
  var local = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname);
  if (location.protocol === 'http:' && !local) {
    location.replace('https:' + location.href.slice(location.protocol.length));
    return;
  }

  // 2. Activer les animations. Si main.js ne se charge pas, on affiche tout normalement.
  root.classList.add('js');
  setTimeout(function () {
    if (!root.classList.contains('js-ready')) root.classList.remove('js');
  }, 4000);
})();
