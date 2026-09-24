/* Doruk module: profile.js */
// ===== PROFİL MENÜSÜ =====
window._profilMenuAc = function() {
  var u = localStorage.getItem('doruk_login_user') || '';
  if (!u) { window._cikisYap(); return; }
  // Misafir ise sadece çıkış yap
  if (window._misafirMi && window._misafirMi()) { window._cikisYap(); return; }
  var ad = document.getElementById('profilMenuAd');
  var av = document.getElementById('profilMenuAvatar');
  if (ad) ad.textContent = u;
  if (av) av.textContent = u.charAt(0).toUpperCase();
  var overlay = document.getElementById('profilMenuOverlay');
  var panel   = document.getElementById('profilMenuPanel');
  if (overlay) { overlay.style.display = 'block'; }
  if (panel)   { panel.style.display   = 'block'; }
};

window._profilMenuKapat = function() {
  var overlay = document.getElementById('profilMenuOverlay');
  var panel   = document.getElementById('profilMenuPanel');
  if (overlay) overlay.style.display = 'none';
  if (panel)   panel.style.display   = 'none';
};

// ===== HESAP SİL MODAL =====
window._hesapSilModalAc = function() {
  var el = document.getElementById('hesapSilOverlay');
  var inp = document.getElementById('hesapSilSifre');
  var hata = document.getElementById('hesapSilHata');
  if (inp)  inp.value = '';
  if (hata) hata.textContent = '';
  if (el)   { el.style.display = 'flex'; }
};

window._hesapSilModalKapat = function() {
  var el = document.getElementById('hesapSilOverlay');
  if (el) el.style.display = 'none';
};

window._hesapSilOnayla = function() {
  var kullanici = localStorage.getItem('doruk_login_user') || '';
  var sifre     = (document.getElementById('hesapSilSifre') || {}).value || '';
  var hataEl    = document.getElementById('hesapSilHata');
  var btn       = document.getElementById('hesapSilOnayBtn');

  if (!sifre.trim()) {
    if (hataEl) hataEl.textContent = 'Şifreni gir';
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Siliniyor...'; btn.style.opacity = '0.6'; }

  var db = (typeof _loginDb === 'function') ? _loginDb() : null;
  if (!db) { _sil(kullanici); return; }

  var userKey = kullanici.toLowerCase().replace(/[.#$\/\[\]]/g, '_');

  // Önce şifreyi doğrula
  db.ref('kullanicilar/' + userKey).once('value', function(snap) {
    if (!snap.exists()) {
      _sil(kullanici);
      return;
    }
    var veri = snap.val();
    var kayitliSifre = veri.sifre || veri.password || '';
    if (kayitliSifre) {
      _sha256(sifre).then(function(hash) {
        if (hash !== kayitliSifre) {
          if (hataEl) hataEl.textContent = 'Şifre yanlış';
          if (btn) { btn.disabled = false; btn.textContent = '🗑️ HESABI SİL'; btn.style.opacity = '1'; }
          return;
        }
        function _firebaseSil() {
          var emailKey = (veri.email || '').replace(/[.#$\[\]@\/]/g, '_');
          var paths = [
            'kullanicilar/' + userKey,
            'watchlist/' + userKey,
            'login_logs/' + userKey,
            'cuzdan/' + userKey,
            'strateji/' + userKey,
            'nick_cihaz/' + userKey,
            'nick_ip/' + userKey,
            'force_logout/' + userKey,
            'misafir_kredi/' + userKey,
            'misafir_cihaz_nick/' + userKey,
            'kullanici_kredi/' + userKey,
            'email_index/' + emailKey
          ];
          Promise.all(paths.map(function(p) {
            return db.ref(p).remove().catch(function(){});
          })).then(function() {
            // Firebase Auth'tan da sil
            if (window.firebase && window.firebase.auth) {
              var fbAuth = window.firebase.auth();
              var currentUser = fbAuth.currentUser;
              if (currentUser) {
                currentUser.delete().catch(function(){});
              } else if (veri.email) {
                fbAuth.signInWithEmailAndPassword(veri.email, sifre).then(function(uc) {
                  uc.user.delete().catch(function(){});
                }).catch(function(){});
              }
            }
            _sil(kullanici);
          }).catch(function() {
            _sil(kullanici);
          });
        }
        _firebaseSil();
      });
      return;
    }
    // Şifre hash yoksa direkt sil
    (function() {
      var emailKey2 = (veri.email || '').replace(/[.#$\[\]@\/]/g, '_');
      var paths = [
        'kullanicilar/' + userKey,
        'watchlist/' + userKey,
        'login_logs/' + userKey,
        'cuzdan/' + userKey,
        'strateji/' + userKey,
        'nick_cihaz/' + userKey,
        'nick_ip/' + userKey,
        'force_logout/' + userKey,
        'misafir_kredi/' + userKey,
        'misafir_cihaz_nick/' + userKey,
        'kullanici_kredi/' + userKey,
        'email_index/' + emailKey2
      ];
      Promise.all(paths.map(function(p) {
        return db.ref(p).remove().catch(function(){});
      })).then(function() {
        if (window.firebase && window.firebase.auth) {
          var cu = window.firebase.auth().currentUser;
          if (cu) cu.delete().catch(function(){});
        }
        _sil(kullanici);
      }).catch(function() {
        _sil(kullanici);
      });
    })();
  }, function() {
    // Firebase erişim hatası → local temizle
    _sil(kullanici);
  });

  function _sil(u) {
    // localStorage temizle
    localStorage.removeItem('doruk_login_user');
    localStorage.removeItem('doruk_misafir');
    localStorage.removeItem('doruk_sohbet_nick');
    localStorage.removeItem('watchList_' + u);
    // Ekrana dön
    window._hesapSilModalKapat();
    var appContainer = document.getElementById('appContainer');
    if (appContainer) { appContainer.style.visibility = 'hidden'; appContainer.style.opacity = '0'; }
    var screen = document.getElementById('loginScreen');
    if (screen) screen.style.display = 'flex';
    if (typeof _loginKayitliYukle === 'function') setTimeout(_loginKayitliYukle, 50);
  }
};
// ===== / PROFİL & HESAP SİL =====


