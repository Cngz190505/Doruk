/* Doruk module: guest.js */
// ===== MİSAFİR SİSTEMİ =====

// ── Fingerprint üretici ──
(function() {
  window._cihazFingerprint = function() {
    var raw = [
      navigator.language || '',
      navigator.platform || '',
      screen.width + 'x' + screen.height,
      screen.colorDepth || '',
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      navigator.hardwareConcurrency || '',
      navigator.maxTouchPoints || ''
    ].join('|');
    // Basit hash
    var hash = 0;
    for (var i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return 'fp_' + Math.abs(hash).toString(36);
  };
})();

// ── IndexedDB yardımcıları ──
(function() {
  var DB_NAME = 'doruk_db', STORE = 'kv', DB_VER = 1;
  function _idbAc(cb) {
    try {
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function(e) { e.target.result.createObjectStore(STORE); };
      req.onsuccess = function(e) { cb(e.target.result); };
      req.onerror = function() { cb(null); };
    } catch(e) { cb(null); }
  }
  window._idbGet = function(key, cb) {
    _idbAc(function(db) {
      if (!db) return cb(null);
      try {
        var r = db.transaction(STORE,'readonly').objectStore(STORE).get(key);
        r.onsuccess = function() { cb(r.result || null); };
        r.onerror = function() { cb(null); };
      } catch(e) { cb(null); }
    });
  };
  window._idbSet = function(key, val) {
    _idbAc(function(db) {
      if (!db) return;
      try { db.transaction(STORE,'readwrite').objectStore(STORE).put(val, key); } catch(e) {}
    });
  };
})();

// ── Cihaz ID — localStorage + IndexedDB + Firebase fingerprint ile korunur ──
(function() {
  // Senkron hızlı erişim (localStorage'dan)
  window._cihazIdAl = function() {
    return localStorage.getItem('doruk_cihaz_id') || 'unknown';
  };

  // Asenkron — tüm kaynakları kontrol eder, geri yükler
  window._cihazIdAyarla = function(callback) {
    var lsId = localStorage.getItem('doruk_cihaz_id');
    if (lsId) { if (callback) callback(lsId); return; }

    // localStorage boş → IndexedDB'ye bak
    window._idbGet('doruk_cihaz_id', function(idbId) {
      if (idbId) {
        localStorage.setItem('doruk_cihaz_id', idbId);
        if (callback) callback(idbId);
        return;
      }

      // IndexedDB de boş → Firebase fingerprint ile ara
      var fp = window._cihazFingerprint();
      var db = (typeof _loginDb === 'function') ? _loginDb() : null;
      if (db) {
        var fpKey = fp.replace(/[.#$\/\[\]]/g, '_');
        db.ref('misafir_fingerprint/' + fpKey).once('value', function(snap) {
          var eskiId = snap.exists() ? snap.val().cihazId : null;
          var id = eskiId || ('c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10));
          localStorage.setItem('doruk_cihaz_id', id);
          window._idbSet('doruk_cihaz_id', id);
          if (!eskiId) {
            // Yeni ID → Firebase'e fingerprint kaydı yaz
            db.ref('misafir_fingerprint/' + fpKey).set({ cihazId: id, ts: Date.now() });
          }
          if (callback) callback(id);
        }, function() {
          // Firebase hatası → yeni üret
          var id = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
          localStorage.setItem('doruk_cihaz_id', id);
          window._idbSet('doruk_cihaz_id', id);
          if (callback) callback(id);
        });
      } else {
        var id = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('doruk_cihaz_id', id);
        window._idbSet('doruk_cihaz_id', id);
        if (callback) callback(id);
      }
    });
  };

  // Sayfa açılışında hemen çalıştır
  window._cihazIdAyarla();
})();

// Benzersiz misafir adı üreticisi
(function() {
  window._misafirAdUret = function() {
    var n = Math.floor(100 + Math.random() * 900);
    return 'user' + n;
  };
})();

// ── KAYITLI KULLANICI KREDİ BADGE + LİSTENER ──
window._kullaniciKrediBadgeGuncelle = function(krediDeger) {
  var badge = document.getElementById('misafirKrediBadge');
  if (!badge) return;
  var kullanici = localStorage.getItem('doruk_login_user') || '';
  var ADMIN_NICK = 'Doruk';
  var misafirMi = window._misafirMi && window._misafirMi();
  if (misafirMi || kullanici.toLowerCase() === ADMIN_NICK.toLowerCase() || !kullanici) return;
  var kredi = (krediDeger !== undefined) ? parseInt(krediDeger) : parseInt(localStorage.getItem('doruk_kullanici_kredi') || '0');
  badge.style.display = 'flex';
  badge.style.background = 'none';
  badge.style.border = 'none';
  badge.style.boxShadow = 'none';
  badge.style.padding = '0';
  badge.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;"><span style="font-size:16px;line-height:1;">💎</span><span style="font-size:12px;font-weight:900;color:#00e5ff;letter-spacing:-0.3px;line-height:1.2;">' + kredi + '</span></div>';
};

window._kullaniciKrediListenerAcik = false;
window._kullaniciKrediListenerRef = null;

window._kullaniciKrediListenerKur = function(nick) {
  if (window._kullaniciKrediListenerRef) {
    try { window._kullaniciKrediListenerRef.off(); } catch(e) {}
    window._kullaniciKrediListenerRef = null;
  }
  window._kullaniciKrediListenerAcik = false;
  var _db = (typeof _loginDb === 'function') ? _loginDb() : null;
  if (!_db || !nick) return;
  var _nickKey = nick.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
  var ref = _db.ref('kullanici_kredi/' + _nickKey);
  window._kullaniciKrediListenerRef = ref;
  window._kullaniciKrediListenerAcik = true;
  ref.on('value', function(snap) {
    if (!snap.exists()) return;
    var d = snap.val();
    var yeniKredi = d.kredi !== undefined ? parseInt(d.kredi) : parseInt(d);
    if (isNaN(yeniKredi)) return;
    localStorage.setItem('doruk_kullanici_kredi', String(yeniKredi));
    if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle(yeniKredi);
  }, function() {
    window._kullaniciKrediListenerAcik = false;
    window._kullaniciKrediListenerRef = null;
    setTimeout(function() {
      var n = localStorage.getItem('doruk_login_user');
      if (n && typeof window._kullaniciKrediListenerKur === 'function') window._kullaniciKrediListenerKur(n);
    }, 3000);
  });
};
// ── / KAYITLI KULLANICI KREDİ BADGE + LİSTENER ──

// ── Kredi badge header güncelle ──
window._misafirKrediBannerGuncelle = function(krediDeger) {
  // Alt banner (eski — gizli tut)
  var banner = document.getElementById('misafirKrediBanner');
  if (banner) banner.style.display = 'none';
  // Header badge
  var badge = document.getElementById('misafirKrediBadge');
  if (!badge) return;
  if (!window._misafirMi || !window._misafirMi()) {
    badge.style.display = 'none';
    return;
  }
  // Parametre verilmişse onu kullan, yoksa localStorage'dan oku
  var kredi = (krediDeger !== undefined) ? parseInt(krediDeger) : parseInt(localStorage.getItem('doruk_misafir_kredi') || '0');
  badge.style.display = 'flex';
  badge.style.background = 'none';
  badge.style.border = 'none';
  badge.style.boxShadow = 'none';
  badge.style.padding = '0';
  badge.removeAttribute('data-warn');
  // Admin butonu misafirde kesinlikle gizli olsun
  var adminBtn = document.getElementById('adminPanelBtn');
  if (adminBtn) adminBtn.style.display = 'none';
  badge.innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;">'
    + '<span style="font-size:16px;line-height:1;">💎</span>'
    + '<span style="font-size:12px;font-weight:900;color:#00e5ff;letter-spacing:-0.3px;line-height:1.2;">' + kredi + '</span>'
    + '</div>';
};

// Global kredi listener — tekrar açılmasın
window._misafirKrediListenerAcik = false;
window._misafirKrediListenerRef = null;

window._misafirKrediListenerKur = function(nick) {
  // Önceki listener varsa kapat
  if (window._misafirKrediListenerRef) {
    try { window._misafirKrediListenerRef.off(); } catch(e) {}
    window._misafirKrediListenerRef = null;
  }
  window._misafirKrediListenerAcik = false;

  var _db = (typeof _loginDb === 'function') ? _loginDb() : null;
  if (!_db || !nick) return;
  var _nickKey = nick.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
  var ref = _db.ref('misafir_kredi/' + _nickKey);
  window._misafirKrediListenerRef = ref;
  window._misafirKrediListenerAcik = true;
  ref.on('value', function(snap) {
    if (!snap.exists()) return;
    var d = snap.val();
    var yeniKredi = d.kredi !== undefined ? parseInt(d.kredi) : parseInt(d);
    if (isNaN(yeniKredi)) return;
    localStorage.setItem('doruk_misafir_kredi', String(yeniKredi));
    // Badge'i hemen güncelle
    if (typeof window._misafirKrediBannerGuncelle === 'function') {
      window._misafirKrediBannerGuncelle(yeniKredi);
    }
    // Badge DOM'da yoksa 500ms sonra tekrar dene (sayfa geçişi olabilir)
    setTimeout(function() {
      var badge = document.getElementById('misafirKrediBadge');
      if (badge && badge.style.display !== 'none') {
        if (typeof window._misafirKrediBannerGuncelle === 'function') {
          window._misafirKrediBannerGuncelle(yeniKredi);
        }
      }
    }, 500);
  }, function(err) {
    window._misafirKrediListenerAcik = false;
    window._misafirKrediListenerRef = null;
    // Listener koptu — 3 saniye sonra otomatik yeniden bağlan
    setTimeout(function() {
      var aktifNick = localStorage.getItem('doruk_misafir_nick');
      if (aktifNick && typeof window._misafirKrediListenerKur === 'function') {
        window._misafirKrediListenerKur(aktifNick);
      }
    }, 3000);
  });
};

// ── Misafir giriş fonksiyonu ──
window._loginMisafir = function() {
  var db = (typeof _loginDb === 'function') ? _loginDb() : null;

  // Önce cihazId'yi tüm kaynaklardan doğrula/geri yükle, sonra devam et
  window._cihazIdAyarla(function(cihazId) {

  // misafir_nick de geri yükle: localStorage → IndexedDB → Firebase cihazId → Firebase fingerprint
  function _nickBelirleVeDevamEt(cb) {
    var lsNick = localStorage.getItem('doruk_misafir_nick');
    if (lsNick) { cb(lsNick); return; }
    window._idbGet('doruk_misafir_nick', function(idbNick) {
      if (idbNick) {
        localStorage.setItem('doruk_misafir_nick', idbNick);
        cb(idbNick);
        return;
      }
      if (!db) { cb(null); return; }
      // Firebase'de bu cihazId'ye ait nick var mi?
      var cKey = cihazId.replace(/[.#$\/\[\]]/g,'_');
      db.ref('misafir_cihaz_nick/' + cKey).once('value', function(snap) {
        var fbNick = snap.exists() ? snap.val() : null;
        if (fbNick) {
          localStorage.setItem('doruk_misafir_nick', fbNick);
          window._idbSet('doruk_misafir_nick', fbNick);
          cb(fbNick);
          return;
        }
        // Son care: fingerprint → nick tablosuna bak (cerez tamamen temizlense de calisir)
        var fp = (typeof window._cihazFingerprint === 'function') ? window._cihazFingerprint() : null;
        if (!fp) { cb(null); return; }
        var fpKey = fp.replace(/[.#$\/\[\]]/g,'_');
        db.ref('misafir_fingerprint_nick/' + fpKey).once('value', function(snapFp) {
          var fpNick = snapFp.exists() ? snapFp.val() : null;
          if (fpNick && db) {
            // Silinmiş nick mi kontrol et
            var _fpNickKey = fpNick.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
            db.ref('deleted_accounts/' + _fpNickKey).once('value', function(delSnap) {
              if (delSnap.exists()) {
                // Silinmiş — fingerprint kaydını temizle, yeni nick al
                db.ref('misafir_fingerprint_nick/' + fpKey).remove();
                cb(null);
              } else {
                localStorage.setItem('doruk_misafir_nick', fpNick);
                window._idbSet('doruk_misafir_nick', fpNick);
                cb(fpNick);
              }
            }, function() { cb(fpNick); });
          } else {
            cb(fpNick);
          }
        }, function() { cb(null); });
      }, function() { cb(null); });
    });
  }

  _nickBelirleVeDevamEt(function(eskiNick) {

  if (eskiNick) {
    // Silinmiş hesap mı kontrol et
    if (db) {
      var _eskiKey = eskiNick.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
      db.ref('deleted_accounts/' + _eskiKey).once('value', function(delSnap2) {
        if (delSnap2.exists()) {
          // Hesap silinmiş — localStorage temizle, yeni misafir olarak devam et
          localStorage.removeItem('doruk_misafir_nick');
          localStorage.removeItem('doruk_misafir_kredi');
          window._idbSet && window._idbSet('doruk_misafir_nick', null);
          _nickBelirleVeDevamEt(function() { /* yeni nick üretilecek */ });
          // Yeni nick akışına geç
          eskiNick = null;
          _devamEt(null);
          return;
        }
        _devamEt(eskiNick);
      }, function() { _devamEt(eskiNick); });
    } else { _devamEt(eskiNick); }
    return;
  }
  _devamEt(eskiNick);

  function _devamEt(eskiNick) {
  if (eskiNick) {
    if (db) {
      var _enKey = eskiNick.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
      // Önce önceki listener varsa kapat
      if (window._misafirKrediListenerRef) {
        try { window._misafirKrediListenerRef.off(); } catch(e) {}
        window._misafirKrediListenerRef = null;
      }
      // kullanicilar tablosunda kayıt yoksa yeniden yaz (silinmiş olabilir)
      db.ref('kullanicilar/' + _enKey).once('value', function(kulSnap) {
        if (!kulSnap.exists()) {
          db.ref('kullanicilar/' + _enKey).set({ kullanici: eskiNick, email: '— (misafir)', kayit: Date.now(), misafir: true, cihazId: cihazId });
        }
      }).catch(function(){});
      // localStorage'da kredi varsa HEMEN giriş yap, Firebase arka planda günceller
      var _cachedKredi = localStorage.getItem('doruk_misafir_kredi');
      if (_cachedKredi !== null) {
        _tamamla(eskiNick);
        // Arka planda Firebase'den taze krediyi çek
        if (typeof window._misafirKrediListenerKur === 'function') {
          window._misafirKrediListenerKur(eskiNick);
        }
        return;
      }
      // Cache yoksa Firebase'den bekle
      var _ilkOkuma = true;
      var _loginRef = db.ref('misafir_kredi/' + _enKey);
      window._misafirKrediListenerRef = _loginRef;
      window._misafirKrediListenerAcik = true;
      _loginRef.on('value', function(snapNick) {
        if (snapNick.exists() && snapNick.val().kredi !== undefined) {
          var _k = parseInt(snapNick.val().kredi) || 0;
          localStorage.setItem('doruk_misafir_kredi', String(_k));
          if (_ilkOkuma) {
            _ilkOkuma = false;
            _tamamla(eskiNick);
          } else {
            if (typeof window._misafirKrediBannerGuncelle === 'function') {
              window._misafirKrediBannerGuncelle(_k);
            }
          }
        } else if (_ilkOkuma) {
          // Nick bazlı kayıt yok — eski cihazId kaydına bak ve migrate et
          _ilkOkuma = false;
          _loginRef.off();
          window._misafirKrediListenerRef = null;
          window._misafirKrediListenerAcik = false;
          var _oldCihazId = window._cihazIdAl();
          var _oldCKey = _oldCihazId.replace(/[.#$\/\[\]]/g,'_');
          db.ref('misafir_kredi/' + _oldCKey).once('value', function(snapCihaz) {
            var krediDeger = 25;
            if (snapCihaz.exists()) {
              var d = snapCihaz.val();
              krediDeger = d.kredi !== undefined ? parseInt(d.kredi)||25 : parseInt(d)||25;
            }
            db.ref('misafir_kredi/' + _enKey).set({ kredi: krediDeger, ilkGiris: Date.now(), migratedFrom: _oldCKey });
            if (_oldCKey !== _enKey) db.ref('misafir_kredi/' + _oldCKey).remove();
            localStorage.setItem('doruk_misafir_kredi', String(krediDeger));
            _tamamla(eskiNick);
          }, function() {
            localStorage.setItem('doruk_misafir_kredi', '10');
            _tamamla(eskiNick);
          });
        }
      }, function() {
        window._misafirKrediListenerAcik = false;
        window._misafirKrediListenerRef = null;
        if (_ilkOkuma) { _ilkOkuma = false; _tamamla(eskiNick); }
        // 3sn sonra yeniden bağlan
        setTimeout(function() {
          var n = localStorage.getItem('doruk_misafir_nick');
          if (n && typeof window._misafirKrediListenerKur === 'function') window._misafirKrediListenerKur(n);
        }, 3000);
      });
    } else {
      _tamamla(eskiNick);
    }
    return;
  }

  var ad = window._misafirAdUret();

  function _krediyiAyarla(nick) {
    if (!db) {
      localStorage.setItem('doruk_misafir_kredi', '10');
      _tamamla(nick);
      return;
    }
    var _nKey = nick.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
    db.ref('misafir_kredi/' + _nKey).once('value', function(snap) {
      var kredi = 10;
      if (snap.exists() && snap.val().kredi !== undefined) {
        kredi = snap.val().kredi;
      } else {
        db.ref('misafir_kredi/' + _nKey).set({ kredi: 25, ilkGiris: Date.now() });
      }
      localStorage.setItem('doruk_misafir_kredi', String(kredi));
      _tamamla(nick);
    }, function() {
      localStorage.setItem('doruk_misafir_kredi', '10');
      _tamamla(nick);
    });
  }

  function kaydet(deneme) {
    if (!db || deneme >= 3) { _krediyiAyarla(ad); return; }
    var key = ad.toLowerCase().replace(/[.#$\/\[\]]/g, '_');
    db.ref('kullanicilar/' + key).once('value', function(snap) {
      if (snap.exists()) { ad = window._misafirAdUret(); kaydet(deneme + 1); }
      else {
        db.ref('kullanicilar/' + key).set({ kullanici: ad, email: '— (misafir)', kayit: Date.now(), misafir: true, cihazId: cihazId });
        // cihazId → nick eşlemesini Firebase'e kaydet (geri yükleme için)
        var cKey2 = cihazId.replace(/[.#$\/\[\]]/g,'_');
        db.ref('misafir_cihaz_nick/' + cKey2).set(ad);
        // fingerprint → nick eslemesini de kaydet (cerez temizlense de nick korunur)
        var _fp2 = (typeof window._cihazFingerprint === 'function') ? window._cihazFingerprint() : null;
        if (_fp2) {
          var _fpKey2 = _fp2.replace(/[.#$\/\[\]]/g,'_');
          db.ref('misafir_fingerprint_nick/' + _fpKey2).set(ad);
        }
        // nick'i IndexedDB'ye de yaz
        window._idbSet('doruk_misafir_nick', ad);
        _krediyiAyarla(ad);
      }
    }, function() { _krediyiAyarla(ad); });
  }

  function _tamamla(nick) {
    localStorage.setItem('doruk_misafir', '1'); // flag ÖNCE yazılır
    localStorage.setItem('doruk_misafir_nick', nick);
    localStorage.setItem('doruk_login_user', nick);
    if (typeof _loginSuccess === 'function') _loginSuccess(nick);
    localStorage.setItem('doruk_misafir', '1'); // _loginSuccess temizledi, geri yaz
    setTimeout(function() {
      if (typeof window._misafirKrediBannerGuncelle === 'function') window._misafirKrediBannerGuncelle();
    }, 800);

    // Listener zaten kurulduysa (eskiNick akışı) tekrar kurma
    if (!window._misafirKrediListenerAcik && typeof window._misafirKrediListenerKur === 'function') {
      window._misafirKrediListenerKur(nick);
    }
  }















  kaydet(0);
  } // _devamEt sonu
  }); // _nickBelirleVeDevamEt sonu
  }); // _cihazIdAyarla sonu
};

// Misafir kontrolü
window._misafirMi = function() {
  return localStorage.getItem('doruk_misafir') === '1';
};

// Modal aç / kapat
window._misafirUyariGoster = function(tip) {
  var aciklama = document.querySelector('#misafirUyari .mk-aciklama');
  if (aciklama) {
    if (tip === 'kayitli') {
      aciklama.innerHTML = 'Krediniz doldu.<br><br>Her gün giriş yaparak <b>10 kredi</b> kazanabilirsin.<br>Yarın tekrar bekleriz! 🎁';
    } else if (tip === 'ozellik') {
      aciklama.innerHTML = 'Bu özelliği kullanmak için kayıt olmalısınız.<br><br>Kayıt olun, <b>200 kredi</b> kazanın ve<br>tüm modüllere erişmeye başlayın.';
    } else {
      aciklama.innerHTML = '25 misafir krediniz doldu.<br><br>Kayıt olun, <b>200 kredi</b> kazanın ve<br>tüm modüllere erişmeye devam edin.';
    }
  }
  // Kayıtlı kullanıcı için butonu gizle (kayıt olmaya gerek yok)
  var kayitBtn = document.querySelector('#misafirUyari .mk-btn-kayit');
  var kapatBtn = document.querySelector('#misafirUyari .mk-btn-kapat');
  if (tip === 'kayitli') {
    if (kayitBtn) kayitBtn.style.display = 'none';
    if (kapatBtn) kapatBtn.textContent = 'Tamam';
  } else {
    if (kayitBtn) kayitBtn.style.display = '';
    if (kapatBtn) kapatBtn.textContent = 'Şimdi değil';
  }
  document.getElementById('misafirUyari').classList.add('show');
};
window._misafirUyariKapat = function() {
  document.getElementById('misafirUyari').classList.remove('show');
};
window._misafirUyariKayit = function() {
  window._misafirUyariKapat();
  // doruk_misafir_nick ve doruk_cihaz_id SİLİNMEZ
  localStorage.removeItem('doruk_login_user');
  localStorage.removeItem('doruk_misafir');
  if (typeof _oturumKapat === 'function') { _oturumKapat(); return; }
  var loginEl = document.getElementById('loginScreen') || document.getElementById('loginPage');
  var appEl   = document.getElementById('appContainer') || document.getElementById('mainApp');
  if (loginEl) loginEl.style.display = '';
  if (appEl)   appEl.style.display   = 'none';
  location.reload();
};
// ===== / MİSAFİR SİSTEMİ =====


