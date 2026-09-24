/* Doruk module: pwa.js */
/* ---- extracted inline script ---- */

// Doruk PWA: canlı Binance/Firebase isteklerini cache'lemeden uygulama kabuğunu kurar.
(function () {
  var installEvent = null;
  var installButton = document.getElementById('pwaInstallBtn');
  var isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  var isIOSStandalone = window.navigator.standalone === true;

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    installEvent = event;
    if (installButton && !isStandalone && !isIOSStandalone) installButton.style.display = 'block';
  });

  if (installButton) {
    installButton.addEventListener('click', async function () {
      if (!installEvent) {
        alert('iPhone için Safari paylaş menüsünden “Ana Ekrana Ekle” seçeneğini kullanın.');
        return;
      }
      installButton.disabled = true;
      installEvent.prompt();
      await installEvent.userChoice;
      installEvent = null;
      installButton.style.display = 'none';
      installButton.disabled = false;
    });
  }

  window.addEventListener('appinstalled', function () {
    installEvent = null;
    if (installButton) installButton.style.display = 'none';
  });
})();
