/* Doruk module: auth.js */
// ===== WAKE LOCK — Ekran kapanmasın =====
let wakeLock = null;

async function wakeLockAktifEt() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch(e) {}
}

// Sayfa tekrar görünür olunca (sekme değiştirince) yeniden iste
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    wakeLockAktifEt();
    // Sadece işlenmemiş ikonları yenile — tüm DOM'u taramaktan kaçın
    if (window.lucide) {
      const unprocessed = document.querySelectorAll('[data-lucide]:not([data-processed])');
      if (unprocessed.length) lucide.createIcons();
    }
  }
});
// ===== / WAKE LOCK =====

// Splash screen — DOMContentLoaded ile kapat (window.onload'a bağlı değil)
// Bu şekilde dış kaynaklar (lucide, fontlar vb.) geç yüklense bile kapanır


// ── Giriş Sistemi ──
const _DORUK_DB_URL = 'https://doruk-sohbet-default-rtdb.firebaseio.com';

async function _sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function _loginDb() {
  if (!window.firebase) return null;
  if (!window.firebase.apps || !window.firebase.apps.length) {
    window.firebase.initializeApp({ apiKey:'AIzaSyCZk-OgjuuO8t4SNary0L2C8WyhyC8IWMA', authDomain:'doruk-sohbet.firebaseapp.com', databaseURL: _DORUK_DB_URL, projectId:'doruk-sohbet', storageBucket:'doruk-sohbet.firebasestorage.app', messagingSenderId:'155992007314', appId:'1:155992007314:web:3d7f16edd31774f60f3c4b' });
  }
  return window.firebase.database();
}

// Şifre göster/gizle
function toggleSifre(inputId, btnId) {
  var inp = document.getElementById(inputId);
  var btn = document.getElementById(btnId);
  if (!inp) return;
  var show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  if (btn) btn.style.color = show ? 'rgba(0,212,255,0.80)' : 'rgba(255,255,255,0.35)';
}

// Kayıtlı bilgileri yükle
function _loginKayitliYukle() {
  // Otomatik doldurma kapalı — kullanıcı adı/şifre hatırlatılmıyor
}

function loginTabSec(tab) {
  document.getElementById('tabGiris').classList.toggle('active', tab === 'giris');
  document.getElementById('tabKayit').classList.toggle('active', tab === 'kayit');
  document.getElementById('formGiris').style.display = tab === 'giris' ? 'block' : 'none';
  document.getElementById('formKayit').style.display = tab === 'kayit' ? 'block' : 'none';
  document.getElementById('loginErr').textContent = '';
  document.getElementById('loginOk').style.display = 'none';
}

function _loginErr(msg) {
  const el = document.getElementById('loginErr');
  if (el) el.textContent = msg;
  const ok = document.getElementById('loginOk');
  if (ok) ok.style.display = 'none';
}

function _loginSuccess(kullanici) {
  localStorage.setItem('doruk_login_user', kullanici);
  // Misafir akışından çağrıldıysa flag'i silme — _tamamla zaten '1' yazdı
  if (localStorage.getItem('doruk_misafir') !== '1') {
    localStorage.removeItem('doruk_misafir'); // sadece kayıtlı kullanıcı girişinde temizle
  }
  var oldK = localStorage.getItem('doruk_saved_kullanici');
  if (oldK) { localStorage.removeItem('doruk_saved_sifre_' + oldK); }
  localStorage.removeItem('doruk_saved_kullanici');

  // Cihaz ID ve IP'yi Firebase'e kaydet (ban için)
  _kayitCihazVeIP(kullanici);

  // Giriş zamanını kaydet (admin için)
  _loginLogKaydet(kullanici, 'giris');

  // Giriş başarılı — önce ban kontrolü yap, sonra uygulamayı aç
  _loginBanKontrol(kullanici, function(banli) {
    if (banli) return;
    const screen = document.getElementById('loginScreen');
    if (screen) screen.style.display = 'none';
    const appContainer = document.getElementById('appContainer');
    if (appContainer) { appContainer.style.visibility = 'visible'; appContainer.style.opacity = '1'; }
    _initApp();
    // DORUK yazısı animasyonu
    setTimeout(function(){
      var _el = document.getElementById('headerTitle');
      if(!_el || _el.textContent.trim()!=='DORUK') return;
      _el.style.display='inline-block';
      _el.style.transformOrigin='left center';
      _el.style.animation='dorukKapanis 0.35s cubic-bezier(0.4,0,0.6,1) forwards';
      setTimeout(function(){
        _el.style.transformOrigin='right center';
        _el.style.animation='dorukAcilis 0.4s cubic-bezier(0.2,0,0.4,1) forwards';
        setTimeout(function(){ _el.style.animation=''; },420);
      },370);
    },500);
    // Global ban dinleyicisini başlat — uygulamanın her yerinde anlık çalışır
    _globalBanDinle(kullanici);

    // ── KAYITLI KULLANICI KREDİ SİSTEMİ ──
    var _ADMIN = 'Doruk';
    var _buMisafir = localStorage.getItem('doruk_misafir') === '1';
    if (!_buMisafir && kullanici.toLowerCase() !== _ADMIN.toLowerCase()) {
      var _kDb = (typeof _loginDb === 'function') ? _loginDb() : null;
      if (_kDb) {
        var _kKey = kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
        _kDb.ref('kullanici_kredi/' + _kKey).once('value', function(snap) {
          // Misafir kontrolünü async içinde tekrar yap — race condition önlemi
          if (localStorage.getItem('doruk_misafir') === '1') return;
          var kredi;
          if (snap.exists()) {
            var d = snap.val();
            kredi = d.kredi !== undefined ? parseInt(d.kredi) : parseInt(d);
            if (isNaN(kredi)) kredi = 200;
            // Günlük hediye kontrolü — sadece kayıtlı kullanıcı
            window._sunucuSaatiIleKontrolEt(d.son_gunluk_hediye, function(hediyelenebilir2) {
              if (localStorage.getItem('doruk_misafir') === '1') return; // son kontrol
              if (hediyelenebilir2) {
                window._gunlukHediyeBekleyenKey = _kKey;
                window._gunlukHediyeBekleyenDb = _kDb;
                setTimeout(function() {
                  if (localStorage.getItem('doruk_misafir') === '1') return;
                  if (typeof window._gunlukHediyeGoster === 'function') window._gunlukHediyeGoster();
                }, 1500);
              }
            });
          } else {
            kredi = 200;
            _kDb.ref('kullanici_kredi/' + _kKey).set({ kredi: 200, ilkGiris: Date.now() });
            window._gunlukHediyeBekleyenKey = _kKey;
            window._gunlukHediyeBekleyenDb = _kDb;
            setTimeout(function() {
              if (localStorage.getItem('doruk_misafir') === '1') return;
              if (typeof window._gunlukHediyeGoster === 'function') window._gunlukHediyeGoster();
            }, 1500);
          }
          localStorage.setItem('doruk_kullanici_kredi', String(kredi));
          if (typeof window._kullaniciKrediListenerKur === 'function') window._kullaniciKrediListenerKur(kullanici);
          if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle(kredi);
        });
      }
    }
    // ── / KAYITLI KULLANICI KREDİ SİSTEMİ ──

    // Admin hediyesi listener'ı başlat
    if (kullanici.toLowerCase() !== 'doruk') {
      setTimeout(function() {
        if (typeof window._adminHediyeListenerKur === 'function') window._adminHediyeListenerKur(kullanici);
      }, 1500);
    }
  });
}

// Global ban dinleyicisi — kullanıcı uygulamanın herhangi bir yerindeyken ban atılınca anında kickler
var _globalBanListeners = [];
function _globalBanDinle(kullanici) {
  var ADMIN_NICK = 'Doruk';
  if ((kullanici||'').toLowerCase() === ADMIN_NICK.toLowerCase()) return;

  // Önceki dinleyicileri temizle
  _globalBanListeners.forEach(function(off) { try { off(); } catch(e) {} });
  _globalBanListeners = [];

  var db = _loginDb();
  if (!db) return;

  var nickKey = kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
  var deviceId = localStorage.getItem('doruk_device_id');

  function kickUser(tip) {
    // Zaten giriş ekranındaysa tekrar tetikleme
    var loginScreen = document.getElementById('loginScreen');
    if (loginScreen && loginScreen.style.display === 'flex') return;

    // Çıkış logu
    if (typeof _loginLogKaydet === 'function') _loginLogKaydet(kullanici, 'cikis');

    // localStorage temizle
    try {
      localStorage.removeItem('doruk_login_user');
      localStorage.removeItem('doruk_saved_kullanici');
      localStorage.removeItem('doruk_giris_kullanici');
      sessionStorage.removeItem('doruk_giris_kullanici');
    } catch(e) {}

    // Firebase Auth oturumunu kapat
    try {
      if (window.firebase && window.firebase.auth) window.firebase.auth().signOut().catch(function(){});
    } catch(e) {}

    // Uygulamayı gizle, sohbeti kapat
    var appContainer = document.getElementById('appContainer');
    if (appContainer) { appContainer.style.visibility = 'hidden'; appContainer.style.opacity = '0'; }
    var widget = document.getElementById('sohbetWidget');
    if (widget) widget.classList.remove('open');

    // Ban ekranını göster
    var banScreen = document.getElementById('doruk-ban-screen');
    if (banScreen) {
      banScreen.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'none';
      banScreen.style.pointerEvents = 'all';
    }

    // 2.5 sn sonra giriş ekranına geç
    setTimeout(function() {
      if (banScreen) banScreen.style.display = 'none';
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';

      var login = document.getElementById('loginScreen');
      if (login) {
        login.style.display = 'flex';
        var loginErr = document.getElementById('loginErr');
        if (loginErr) {
          var mesaj = tip === 'cihaz' ? '📱 Bu cihaz yasaklandı. Giriş yapamazsınız.'
                    : tip === 'ip'    ? '🌐 Bu IP adresi yasaklandı. Giriş yapamazsınız.'
                    :                   '🚫 Hesabınız yasaklandı. Giriş yapamazsınız.';
          loginErr.textContent = mesaj;
        }
        var girisK = document.getElementById('girisKullanici');
        var girisS = document.getElementById('girisŞifre');
        if (girisK) girisK.value = '';
        if (girisS) girisS.value = '';
      }

      // Dinleyicileri temizle
      _globalBanListeners.forEach(function(off) { try { off(); } catch(e) {} });
      _globalBanListeners = [];
    }, 2500);
  }

  // 1. Hesap ban — anlık dinle
  var hesapRef = db.ref('banlar/' + nickKey);
  hesapRef.on('value', function(snap) {
    if (snap.exists()) kickUser('hesap');
  });
  _globalBanListeners.push(function() { hesapRef.off('value'); });

  // 2. Cihaz ban — anlık dinle
  if (deviceId) {
    var devKey = deviceId.replace(/[.#$\/\[\]]/g,'_');
    var cihazRef = db.ref('cihaz_banlar/' + devKey);
    cihazRef.on('value', function(snap) {
      if (snap.exists()) kickUser('cihaz');
    });
    _globalBanListeners.push(function() { cihazRef.off('value'); });
  }

  // 3. IP ban — anlık dinle
  fetch('https://api.ipify.org?format=json', {mode:'cors',credentials:'omit'})
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!d.ip) return;
      var ipKey = d.ip.replace(/\./g,'_');
      var ipRef = db.ref('ip_banlar/' + ipKey);
      ipRef.on('value', function(snap) {
        if (snap.exists()) kickUser('ip');
      });
      _globalBanListeners.push(function() { ipRef.off('value'); });
    }).catch(function(){});

  // 4. Force logout — admin oturumu kapatırsa
  // Doruk (admin) force_logout dinlemez
  if (kullanici.toLowerCase() === 'doruk') return;
  var forceRef = db.ref('force_logout/' + nickKey);
  forceRef.on('value', function(snap) {
    if (!snap.exists()) return;
    var data = snap.val();
    // Zaman sınırı YOK — offline iken gelen komutlar da geçerli
    if (data) {
      // Komutu hemen sil (tekrar tetiklenmesin)
      forceRef.remove();
      var _silindi = data.deleted === true;
      // Toast göster
      if (_silindi) {
        if (window._toast) window._toast('🗑️ Hesabınız silindi. 5 saniye içinde çıkış yapılacak...', '#ff4664');
      } else {
        if (window._toast) window._toast('🔌 Oturumunuz yönetici tarafından kapatıldı.', '#fb923c');
      }
      var _bekle = _silindi ? 5000 : 1400;
      setTimeout(function() {
        if (typeof _loginLogKaydet === 'function') _loginLogKaydet(kullanici, 'cikis');
        try {
          localStorage.removeItem('doruk_login_user');
          localStorage.removeItem('doruk_misafir');
          localStorage.removeItem('doruk_misafir_nick');
          localStorage.removeItem('doruk_misafir_kredi');
          localStorage.removeItem('doruk_saved_kullanici');
          sessionStorage.removeItem('doruk_giris_kullanici');
        } catch(e) {}
        try { if (window.firebase && window.firebase.auth) window.firebase.auth().signOut().catch(function(){}); } catch(e) {}
        var appContainer = document.getElementById('appContainer');
        if (appContainer) { appContainer.style.visibility = 'hidden'; appContainer.style.opacity = '0'; }
        var widget = document.getElementById('sohbetWidget');
        if (widget) widget.classList.remove('open');
        var login = document.getElementById('loginScreen');
        if (login) {
          login.style.display = 'flex';
          var loginErr = document.getElementById('loginErr');
          if (loginErr) loginErr.textContent = _silindi ? '🗑️ Hesabınız silindi.' : '';
        }
        _globalBanListeners.forEach(function(off) { try { off(); } catch(e) {} });
        _globalBanListeners = [];
      }, _bekle);
    }
  });
  _globalBanListeners.push(function() { forceRef.off('value'); });
}

function _loginBanKontrol(kullanici, cb) {
  var ADMIN_NICK_CHECK = 'Doruk';
  if ((kullanici||'').toLowerCase() === ADMIN_NICK_CHECK.toLowerCase()) { cb(false); return; }

  var db = _loginDb();
  if (!db) {
    // Firebase henüz yüklenmemiş — script yüklenene kadar bekle (max 3sn)
    var _dbBekle = 0;
    var _dbInterval = setInterval(function() {
      _dbBekle += 200;
      var db2 = _loginDb();
      if (db2) {
        clearInterval(_dbInterval);
        // Firebase hazır, kendini tekrar çağır
        _loginBanKontrol(kullanici, cb);
      } else if (_dbBekle >= 3000) {
        clearInterval(_dbInterval);
        cb(false); // 3 saniyede gelmezse geç
      }
    }, 200);
    return;
  }

  var nickKey = kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');

  function gosterBanEkrani() {
    var banScreen = document.getElementById('doruk-ban-screen');
    if (banScreen) {
      banScreen.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'none';
      banScreen.style.pointerEvents = 'all';
    }
    cb(true);
  }

  function gosterLoginEkrani() {
    try {
      localStorage.removeItem('doruk_login_user');
      localStorage.removeItem('doruk_misafir');
    } catch(e) {}
    // Açılış splash varsa kapat
    if (typeof window._autoSplashGizle === 'function') window._autoSplashGizle();
    var appContainer = document.getElementById('appContainer');
    if (appContainer) { appContainer.style.visibility = 'hidden'; appContainer.style.opacity = '0'; }
    var login = document.getElementById('loginScreen');
    if (login) login.style.display = 'flex';
    cb(true);
  }

  // 0. Force logout kontrolü — admin kapattıysa, süresiz geçerli
  var _forceLogoutRef = db.ref('force_logout/' + nickKey);
  _forceLogoutRef.once('value', function(snapF) {
    if (snapF.exists()) {
      // Önce sil, sonra login ekranına at — tekrar tetiklenmesin
      _forceLogoutRef.remove().then(function() {
        gosterLoginEkrani();
      }).catch(function() {
        gosterLoginEkrani();
      });
      return;
    }
    devamEt();
  }, function() { devamEt(); });

  // Uygulama açıkken admin silerse yakala
  var _forceLogoutIlkOkuma = true;
  db.ref('force_logout/' + nickKey).on('value', function(snapF) {
    if (_forceLogoutIlkOkuma) { _forceLogoutIlkOkuma = false; return; }
    if (snapF.exists()) {
      db.ref('force_logout/' + nickKey).off();
      db.ref('force_logout/' + nickKey).remove().catch(function(){});
      gosterLoginEkrani();
    }
  }, function(){});

  function devamEt() {
    var deviceId = localStorage.getItem('doruk_device_id');
    var devKey = deviceId ? deviceId.replace(/[.#$\/\[\]]/g, '_') : null;

    var done = false;
    function banBulundu() {
      if (done) return;
      done = true;
      gosterBanEkrani();
    }
    function kontroller(ip) {
      var checks = [
        db.ref('banlar/' + nickKey).once('value'),
      ];
      if (devKey) checks.push(db.ref('cihaz_banlar/' + devKey).once('value'));
      if (ip) checks.push(db.ref('ip_banlar/' + ip.replace(/\./g,'_')).once('value'));

      Promise.all(checks).then(function(snaps) {
        if (done) return;
        done = true;
        for (var i = 0; i < snaps.length; i++) {
          if (snaps[i].exists()) { gosterBanEkrani(); return; }
        }
        cb(false);
      }).catch(function() {
        if (!done) { done = true; cb(false); }
      });
    }

    // IP ve Firebase sorgularını tamamen paralel başlat
    var ipPromise = fetch('https://api.ipify.org?format=json', {mode:'cors',credentials:'omit'})
      .then(function(r){ return r.json(); })
      .then(function(d){ return d.ip || null; })
      .catch(function(){ return null; });

    ipPromise.then(function(ip) { kontroller(ip); });
  } // devamEt sonu
}

function _kayitCihazVeIP(kullanici) {
  var ADMIN_NICK = 'Doruk';
  if ((kullanici||'').toLowerCase() === ADMIN_NICK.toLowerCase()) return;
  var nickKey = kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
  var db = _loginDb();
  if (!db) return;

  // Cihaz ID
  var deviceId = localStorage.getItem('doruk_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('doruk_device_id', deviceId);
  }
  var devKey = deviceId.replace(/[.#$\/\[\]]/g,'_');
  db.ref('nick_cihaz/' + nickKey).set(deviceId).catch(function(){});

  // IP kaydet
  fetch('https://api.ipify.org?format=json', {mode:'cors',credentials:'omit'})
    .then(function(r){ return r.json(); })
    .then(function(d) {
      if (!d.ip) return;
      var ip = d.ip;
      var ipKey = ip.replace(/\./g,'_');
      // nick → IP eşleşmesi
      db.ref('nick_ip/' + nickKey).set(ip).catch(function(){});
    }).catch(function(){});
}

/* ---- Giriş/Çıkış Log ---- */
function _loginLogKaydet(kullanici, tip) {
  var ADMIN_NICK = 'Doruk';
  if ((kullanici||'').toLowerCase() === ADMIN_NICK.toLowerCase()) return;
  var db = _loginDb();
  if (!db) return;
  var nickKey = kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
  var now = Date.now();
  var updates = {};
  updates['login_logs/' + nickKey + '/' + (tip === 'giris' ? 'son_giris' : 'son_cikis')] = now;
  updates['login_logs/' + nickKey + '/kullanici'] = kullanici;
  // Geçmiş loglar (son 20) — önce gecmis push et
  db.ref('login_logs/' + nickKey + '/gecmis').push({ tip: tip, ts: now }).catch(function(){});
  // son_giris / son_cikis'i doğrudan set et (update bazen sessizce başarısız olur)
  var sonKey = tip === 'giris' ? 'son_giris' : 'son_cikis';
  db.ref('login_logs/' + nickKey + '/' + sonKey).set(now).catch(function(){});
  db.ref('login_logs/' + nickKey + '/kullanici').set(kullanici).catch(function(){});
}

/* ---- Admin Panel ---- */
window._adminPanelAc = function() {
  var db = _loginDb();
  if (!db) return;

  // Firebase Auth oturumu açık değilse yeniden aç
  if (window.firebase && window.firebase.auth) {
    var _auth = window.firebase.auth();
    if (!_auth.currentUser) {
      var _adminEmail = 'weptasarimlari@gmail.com';
      var _adminSifre = '190505';
      _auth.signInWithEmailAndPassword(_adminEmail, _adminSifre).catch(function(){});
    }
  }

  var overlay = document.getElementById('adminPanelOverlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'adminPanelOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99997;background:#040810;display:flex;flex-direction:column;overflow:hidden;';

  overlay.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

      #adminPanelOverlay {
        font-family: 'Inter', 'Segoe UI', sans-serif;
        background: #040810;
      }

      /* ── HEADER ── */
      .ap-header {
        flex-shrink:0;
        padding: 0 20px 0;
        padding-top: calc(var(--status-bar-height,24px) + 12px);
        max-width:480px; width:100%; margin:0 auto;
        box-sizing:border-box;
        background: #040810;
        border-bottom: 1px solid #1e293b;
        position: relative;
      }
      .ap-header::after {
        content:'';
        position:absolute; bottom:0; left:0; right:0; height:1px;
        background: linear-gradient(90deg, transparent, rgba(0,212,255,0.25), rgba(0,128,255,0.2), transparent);
      }
      .ap-topbar {
        display:flex; align-items:center; gap:12px;
        padding-bottom: 16px;
      }
      .ap-shield {
        width:42px; height:42px; border-radius:14px; flex-shrink:0;
        background: rgba(110,150,190,0.10);
        border: 1px solid rgba(110,150,190,0.20);
        display:flex; align-items:center; justify-content:center;
        font-size:20px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
      }
      .ap-title-wrap { flex:1; }
      .ap-title {
        font-size:18px; font-weight:800; color:#dce6f0;
        letter-spacing:-0.3px; line-height:1.15;
      }
      .ap-subtitle {
        font-size:9px; color:#6a93a8; margin-top:3px;
        letter-spacing:2.5px; font-weight:700;
        opacity:0.7; text-transform:uppercase;
      }
      .ap-close {
        width:40px; height:40px; border-radius:12px; flex-shrink:0; cursor:pointer;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.05);
        color:#8aa8c0; font-size:15px;
        display:flex; align-items:center; justify-content:center;
        transition: all 0.15s;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        -webkit-tap-highlight-color: transparent;
      }
      .ap-close:active { background:rgba(255,255,255,0.09); color:#dce8f2; transform:scale(0.94); }

      /* ── TABS ── */
      .ap-tabs {
        display:flex; gap:0;
        border-bottom: none;
        margin: 0 -20px;
        background: rgba(0,0,0,0.2);
      }
      .ap-tab {
        flex:1; padding:11px 4px; border:none; background:transparent;
        color:#304a62; font-size:10px; font-weight:800; cursor:pointer;
        letter-spacing:0.6px; position:relative;
        transition: color 0.25s;
        display:flex; align-items:center; justify-content:center; gap:5px;
        -webkit-tap-highlight-color: transparent;
      }
      .ap-tab.active { color:#00d4ff; }
      .ap-tab.active::after {
        content:''; position:absolute; bottom:0; left:20%; right:20%;
        height:2px; border-radius:2px 2px 0 0;
        background: linear-gradient(90deg,#00b4ff,#0060ff);
        box-shadow: 0 0 10px rgba(0,212,255,0.6), 0 0 20px rgba(0,212,255,0.2);
      }
      .ap-tab-icon { font-size:14px; }

      /* ── CONTENT ── */
      .ap-content {
        flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch;
        background: #040810;
      }
      .ap-inner { max-width:480px; margin:0 auto; padding:16px 16px 50px; box-sizing:border-box; }

      /* ── STAT KARTLARI ── */
      .ap-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:16px; }
      .ap-stat {
        padding:12px 6px 10px; border-radius:16px; text-align:center;
        border: 1px solid; position:relative; overflow:hidden;
        transition: transform 0.15s;
      }
      .ap-stat::before {
        content:''; position:absolute; top:0; left:0; right:0; height:1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
      }
      .ap-stat:active { transform: scale(0.96); }
      .ap-stat-val { font-size:22px; font-weight:900; line-height:1.1; }
      .ap-stat-lbl { font-size:7px; font-weight:800; letter-spacing:1.4px; margin-top:4px; opacity:0.55; }

      /* ── KULLANICI KARTLARI ── */
      .ap-user-card {
        border-radius:16px; margin-bottom:9px; overflow:hidden;
        border: 1px solid #1e293b;
        background: #080e18;
        transition: border-color 0.2s, background 0.2s;
        box-shadow: 0 1px 6px rgba(0,0,0,0.18);
      }
      .ap-user-card:active { background: #0a111d; }
      .ap-user-card.banli {
        border-color: rgba(210,100,115,0.28);
        background: #0d0a12;
        box-shadow: 0 1px 6px rgba(0,0,0,0.18);
      }
      .ap-user-card.susturlu {
        border-color: rgba(130,140,210,0.26);
        background: #0a0c16;
        box-shadow: 0 1px 6px rgba(0,0,0,0.18);
      }
      .ap-user-row {
        display:flex; align-items:center; gap:12px;
        padding:13px 14px; cursor:pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .ap-avatar {
        width:38px; height:38px; border-radius:12px; flex-shrink:0;
        display:flex; align-items:center; justify-content:center;
        font-size:15px; font-weight:800; color:#dce6f2;
        background: #0d1420;
        border: 1px solid #1e293b;
        text-transform:uppercase;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        letter-spacing:-0.5px;
      }
      .ap-user-info { flex:1; min-width:0; }
      .ap-user-name {
        font-size:14px; font-weight:700; color:#d7e2ee;
        letter-spacing:-0.2px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;
      }
      .ap-badge-misafir {
        font-size:8px; font-weight:700; color:#c9a06a;
        background:rgba(200,160,100,0.08); border:1px solid rgba(200,160,100,0.16);
        border-radius:6px; padding:1px 6px; letter-spacing:0.3px;
      }
      .ap-badge-banli {
        font-size:8px; font-weight:700; color:#d38a92;
        background:rgba(211,138,146,0.08); border:1px solid rgba(211,138,146,0.16);
        border-radius:6px; padding:1px 6px;
      }
      .ap-badge-susturlu {
        font-size:8px; font-weight:700; color:#9aa3c9;
        background:rgba(154,163,201,0.08); border:1px solid rgba(154,163,201,0.16);
        border-radius:6px; padding:1px 6px;
      }
      .ap-user-times { display:flex; gap:5px; margin-top:5px; flex-wrap:wrap; }
      .ap-time-chip {
        font-size:9px; font-weight:600; padding:3px 8px; border-radius:7px;
        display:inline-flex; align-items:center; gap:3px;
      }
      .ap-status-dot {
        width:7px; height:7px; border-radius:50%; flex-shrink:0;
        box-shadow: 0 0 0 2px rgba(0,0,0,0.3);
      }
      .ap-chevron {
        font-size:16px; color:#2a4258; flex-shrink:0;
        transition: transform 0.25s ease;
        font-weight:300;
      }

      /* ── DETAY PANELİ ── */
      .ap-detail {
        display:block;
        max-height:0;
        overflow:hidden;
        opacity:0;
        border-top:0 solid rgba(255,255,255,0.04);
        padding:0 14px;
        background: rgba(0,5,15,0.25);
        transition: max-height 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease, padding 0.32s ease;
      }
      .ap-detail.ap-open {
        max-height: 2400px;
        opacity:1;
        border-top:1px solid rgba(255,255,255,0.04);
        padding:14px 14px 15px;
      }
      .ap-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px; }
      .ap-detail-card {
        padding:12px 13px; border-radius:14px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
      }
      .ap-detail-label {
        font-size:8px; font-weight:900; letter-spacing:1.8px;
        margin-bottom:6px; opacity:0.6; text-transform:uppercase;
      }
      .ap-detail-val { font-size:15px; font-weight:900; line-height:1.2; }
      .ap-detail-ago { font-size:9px; margin-top:3px; font-weight:600; opacity:0.5; }

      .ap-info-row {
        font-size:9.5px; color:#3d607a; padding:10px 13px; border-radius:12px;
        background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05);
        margin-bottom:10px; display:flex; gap:7px; align-items:center; flex-wrap:wrap;
        letter-spacing:0.1px;
      }

      /* ── ACTION BUTONLARI ── */
      .ap-action-row { display:flex; gap:10px; margin-bottom:12px; }
      .ap-btn {
        flex:1; padding:12px 8px; border-radius:14px; border:1px solid;
        font-size:10.5px; font-weight:800; cursor:pointer; letter-spacing:0.3px;
        display:flex; align-items:center; justify-content:center; gap:5px;
        transition: all 0.15s;
        text-align:center; line-height:1.3;
        -webkit-tap-highlight-color: transparent;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
      }
      .ap-btn:active { opacity:0.7; }
      .ap-btn-logout {
        border-color:rgba(200,150,110,0.20); background:rgba(200,150,110,0.06); color:#c99f74;
      }
      .ap-btn-ban {
        border-color:rgba(200,110,120,0.20); background:rgba(200,110,120,0.06); color:#cf8a94;
      }
      .ap-btn-unban {
        border-color:rgba(110,180,150,0.20); background:rgba(110,180,150,0.06); color:#7fbfa0;
      }
      .ap-btn-cihaz {
        border-color:rgba(200,150,110,0.20); background:rgba(200,150,110,0.06); color:#c99f74;
      }
      .ap-btn-ip {
        border-color:rgba(160,140,200,0.20); background:rgba(160,140,200,0.06); color:#a790c9;
      }
      .ap-btn-sustur {
        border-color:rgba(130,140,190,0.20); background:rgba(130,140,190,0.06); color:#9aa3c9;
      }
      .ap-btn-unsustur {
        border-color:rgba(120,175,200,0.18); background:rgba(120,175,200,0.06); color:#8fc0d6;
      }
      .ap-btn-sil {
        border-color:rgba(255,255,255,0.07); background:rgba(255,255,255,0.02); color:#3d5b78;
        padding:12px 14px; flex:0; min-width:46px;
      }
      .ap-btn-sifre {
        border-color:rgba(200,170,100,0.20); background:rgba(200,170,100,0.06); color:#c9ab6a;
        font-size:9px; padding:6px 13px; flex:0; border-radius:9px; cursor:pointer; font-weight:700;
      }

      /* ── GEÇMİŞ KAYITLAR ── */
      .ap-gecmis {
        border-radius:14px; background:rgba(255,255,255,0.02);
        border:1px solid rgba(255,255,255,0.05); padding:12px; margin-bottom:9px;
      }
      .ap-gecmis-title {
        font-size:8px; font-weight:900; letter-spacing:2px; color:#2a4a62;
        margin-bottom:9px; text-transform:uppercase;
      }
      .ap-gecmis-row {
        display:flex; align-items:center; padding:6px 9px; border-radius:9px; margin-bottom:4px;
      }

      /* ── BAN LİSTESİ ── */
      .ap-ban-section-title {
        font-size:9px; font-weight:800; letter-spacing:1px; margin:14px 0 8px;
        padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05); color:#2a4055;
        text-transform:uppercase;
      }
      .ap-ban-row {
        display:flex; align-items:center; justify-content:space-between;
        padding:12px 14px; border-radius:14px; margin-bottom:7px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      }

      .ap-empty { text-align:center; padding:60px 0; color:#2a4055; font-size:13px; }
      .ap-empty-icon { font-size:36px; margin-bottom:10px; opacity:0.6; }
    </style>

    <!-- Header -->
    <div class="ap-header">
      <div class="ap-topbar">
        <div class="ap-shield">🛡️</div>
        <div class="ap-title-wrap">
          <div class="ap-title">Yönetim Paneli</div>
          <div class="ap-subtitle">DORUK KONSOLu</div>
        </div>
        <button class="ap-close" onclick="window._adminKrediCanliDurdur();window._apAcikKart=null;window._apCurrentTab=null;window._apScrollTop=0;document.getElementById('adminPanelOverlay').remove()">✕</button>
      </div>
      <div class="ap-tabs">
        <button class="ap-tab active" id="adminTab_kullanicilar" onclick="adminTab('kullanicilar')">
          <span class="ap-tab-icon">👥</span> KULLANICILAR
        </button>
        <button class="ap-tab" id="adminTab_banlar" onclick="adminTab('banlar')">
          <span class="ap-tab-icon">🚫</span> BANLAR
        </button>
        <button class="ap-tab" id="adminTab_susturlar" onclick="adminTab('susturlar')">
          <span class="ap-tab-icon">🔇</span> SUSTURLAR
        </button>
      </div>
    </div>

    <!-- İçerik -->
    <div class="ap-content" id="apContent">
      <div class="ap-inner">
        <div id="adminTabContent">
          <div class="ap-empty"><div class="ap-empty-icon">⏳</div>Yükleniyor...</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Panel açılınca ilk tab'ı yükle
  setTimeout(function() { window.adminTab('kullanicilar'); }, 100);

  // Tab fonksiyonu
  window.adminTab = function(tab) {
    ['kullanicilar','banlar','susturlar'].forEach(function(t) {
      var btn = document.getElementById('adminTab_' + t);
      if (!btn) return;
      if (t === tab) {
        btn.className = 'ap-tab active';
      } else {
        btn.className = 'ap-tab';
      }
    });
    var content = document.getElementById('adminTabContent');
    if (!content) return;
    if (tab !== 'kullanicilar' && typeof window._adminKrediCanliDurdur === 'function') window._adminKrediCanliDurdur();

    // Aynı sekme yeniden yükleniyorsa (ör. bir işlem sonrası liste tazeleniyorsa)
    // scroll konumunu ve açık kart bilgisini sakla, "Yükleniyor" ekranıyla
    // sayfayı sıfırlama — bu, işlem sonrası sayfanın zıplamasına sebep oluyordu.
    var apContentEl = document.getElementById('apContent');
    var sameTab = (window._apCurrentTab === tab);
    window._apScrollTop = apContentEl ? apContentEl.scrollTop : 0;
    window._apCurrentTab = tab;

    if (!sameTab) {
      content.innerHTML = '<div class="ap-empty"><div class="ap-empty-icon">⏳</div>Yükleniyor...</div>';
      window._apAcikKart = null;
    }

    if (tab === 'kullanicilar') adminLoadKullanicilar();
    else if (tab === 'banlar') adminLoadBanlar();
    else if (tab === 'susturlar') adminLoadSusturlar();
  };

  // Render sonrası scroll konumunu ve açık kartı geri yükler (zıplamayı önler)
  window._apRenderSonrasi = function() {
    var apContentEl = document.getElementById('apContent');
    if (apContentEl && window._apScrollTop) {
      apContentEl.scrollTop = window._apScrollTop;
    }
    if (window._apAcikKart) {
      var el = document.getElementById(window._apAcikKart);
      if (el) {
        el.classList.add('ap-open');
        var key = window._apAcikKart.replace('u_','');
        var chev = document.getElementById('ap_chev_' + key);
        if (chev) chev.style.transform = 'rotate(90deg)';
        if (typeof window._apKrediListenerBaslat === 'function') window._apKrediListenerBaslat(key);
      }
    }
  };

  function tsFormat(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    var pad = function(n){ return n<10?'0'+n:n; };
    return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes());
  }

  function timeAgo(ts) {
    if (!ts) return '—';
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return diff + 's önce';
    if (diff < 3600) return Math.floor(diff/60) + 'dk önce';
    if (diff < 86400) return Math.floor(diff/3600) + 'sa önce';
    return Math.floor(diff/86400) + 'gün önce';
  }

  // ---- Kullanıcılar Tab ----
  function adminLoadKullanicilar() {
    var content = document.getElementById('adminTabContent');
    Promise.all([
      db.ref('kullanicilar').once('value'),
      db.ref('login_logs').once('value'),
      db.ref('banlar').once('value'),
      db.ref('susturlar').once('value'),
      db.ref('cihaz_banlar').once('value'),
      db.ref('ip_banlar').once('value'),
      db.ref('nick_cihaz').once('value'),
      db.ref('nick_ip').once('value'),
      db.ref('misafir_kredi').once('value').catch(function(){ return { val: function(){ return {}; } }; }),
      db.ref('kullanici_kredi').once('value').catch(function(){ return { val: function(){ return {}; } }; })
    ]).then(function(snaps) {
      var kulSnap = snaps[0], logSnap = snaps[1], banSnap = snaps[2], susSnap = snaps[3];
      var cihazBanSnap = snaps[4], ipBanSnap = snaps[5], nickCihazSnap = snaps[6], nickIPSnap = snaps[7];
      var misafirKrediSnap = snaps[8]; var kullaniciKrediSnap = snaps[9];
      (function(kulSnap, logSnap, banSnap, susSnap, cihazBanSnap, ipBanSnap, nickCihazSnap, nickIPSnap, misafirKrediSnap, kullaniciKrediSnap) {
            var banlilar = banSnap.val() || {};
            var susturluler = susSnap.val() || {};
            var loglar = logSnap.val() || {};
            var cihazBanlar = cihazBanSnap.val() || {};
            var ipBanlar = ipBanSnap.val() || {};
            var nickCihazlar = nickCihazSnap.val() || {};
            var nickIPlar = nickIPSnap.val() || {};
            var misafirKredilar = (misafirKrediSnap && typeof misafirKrediSnap.val === 'function') ? (misafirKrediSnap.val() || {}) : {};
            var kullaniciKredilar = (kullaniciKrediSnap && typeof kullaniciKrediSnap.val === 'function') ? (kullaniciKrediSnap.val() || {}) : {};
            var kullanicilar = [];
            kulSnap.forEach(function(c) {
              var v = c.val();
              if (v && v.kullanici) kullanicilar.push({ key: c.key, kullanici: v.kullanici, email: v.email||'—', kayit: v.kayit||null, misafir: !!v.misafir, cihazId: v.cihazId||'' });
            });

            var content = document.getElementById('adminTabContent');
            if (!content) return;

            if (!kullanicilar.length) {
              content.innerHTML = '<div style="text-align:center;padding:40px 0;color:#4a6a8a;">Kayıtlı kullanıcı yok</div>';
              return;
            }

            var aktifSayisi = Object.keys(loglar).filter(function(k) {
              var l = loglar[k];
              return l && l.son_giris && (!l.son_cikis || l.son_giris > l.son_cikis);
            }).length;
            var misafirSayisi = kullanicilar.filter(function(u){ return u.misafir; }).length;

            // Stat kartları
            var html = '<div class="ap-stats">'
              + '<div class="ap-stat" style="background:rgba(120,170,210,0.04);border-color:rgba(120,170,210,0.14);"><div class="ap-stat-val" style="color:#7fb4d6;">' + kullanicilar.length + '</div><div class="ap-stat-lbl" style="color:#7fb4d6;">TOPLAM</div></div>'
              + '<div class="ap-stat" style="background:rgba(110,190,150,0.04);border-color:rgba(110,190,150,0.14);"><div class="ap-stat-val" style="color:#7dc9a3;">' + aktifSayisi + '</div><div class="ap-stat-lbl" style="color:#7dc9a3;">AKTİF</div></div>'
              + '<div class="ap-stat" style="background:rgba(200,165,100,0.04);border-color:rgba(200,165,100,0.16);"><div class="ap-stat-val" style="color:#cfa967;">' + misafirSayisi + '</div><div class="ap-stat-lbl" style="color:#cfa967;">MİSAFİR</div></div>'
              + '<div class="ap-stat" style="background:rgba(200,110,120,0.04);border-color:rgba(200,110,120,0.14);"><div class="ap-stat-val" style="color:#cf8a94;">' + Object.keys(banlilar).length + '</div><div class="ap-stat-lbl" style="color:#cf8a94;">BANLI</div></div>'
              + '</div>';

            // Hediye Dağıt butonu
            var kayitliSayisi = kullanicilar.filter(function(u){ return !u.misafir && u.kullanici && u.kullanici.toLowerCase() !== 'doruk'; }).length;
            html += '<button id="adminHediyeDagitBtn" style="'
              + 'width:100%;margin-bottom:14px;padding:14px;border-radius:14px;border:1px solid rgba(245,158,11,0.4);'
              + 'background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(217,119,6,0.1));'
              + 'color:#fbbf24;font-size:13px;font-weight:900;letter-spacing:1.2px;cursor:pointer;'
              + 'display:flex;align-items:center;justify-content:center;gap:8px;'
              + '-webkit-tap-highlight-color:transparent;">'
              + '🎁 TÜM KULLANICILARA HEDİYE DAĞIT'
              + '<span style="font-size:10px;font-weight:700;background:rgba(245,158,11,0.2);padding:3px 8px;border-radius:20px;color:#f59e0b;">'
              + kayitliSayisi + ' kişi · +10 kredi</span>'
              + '</button>';

            // Kullanıcı listesi
            kullanicilar.sort(function(a,b){ return (b.kayit||0)-(a.kayit||0); }).forEach(function(u) {
              var nickKey = (u.kullanici||'').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
              var log = loglar[nickKey] || {};
              var banli = !!banlilar[nickKey];
              var susturlu = !!susturluler[nickKey];
              var cihazId = (u.misafir && u.cihazId) ? u.cihazId : (nickCihazlar[nickKey] || '');
              var cihazBanli = cihazId ? !!cihazBanlar[cihazId.replace(/[.#$\/\[\]]/g,'_')] : false;
              var ip = nickIPlar[nickKey];
              var ipBanli = ip ? !!ipBanlar[ip.replace(/\./g,'_')] : false;
              var mevcutKredi = null;
              var sonSandik = 0;
              var sonSandikMiktar = 0;
              var sonCevir = 0;
              var sonCevirMiktar = 0;
              var sonHediye = 0;
              var sonHediyeMiktar = 0;
              if (u.misafir) {
                var nickKey2 = (u.kullanici||'').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
                var kdNick = misafirKredilar[nickKey2];
                if (kdNick !== undefined && kdNick !== null) {
                  mevcutKredi = (kdNick.kredi !== undefined) ? kdNick.kredi : kdNick;
                } else if (cihazId) {
                  var cKeyOld = cihazId.replace(/[.#$\/\[\]]/g,'_');
                  var kdCihaz = misafirKredilar[cKeyOld];
                  if (kdCihaz !== undefined && kdCihaz !== null) mevcutKredi = (kdCihaz.kredi !== undefined) ? kdCihaz.kredi : kdCihaz;
                }
              } else {
                var nickKey3 = (u.kullanici||'').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
                var kdKayitli = kullaniciKredilar[nickKey3];
                if (kdKayitli !== undefined && kdKayitli !== null) {
                  mevcutKredi = (kdKayitli.kredi !== undefined) ? kdKayitli.kredi : kdKayitli;
                  if (typeof kdKayitli === 'object' && kdKayitli !== null) { sonSandik = kdKayitli.son_sandik || 0; sonSandikMiktar = kdKayitli.son_sandik_miktar || 0; sonCevir = kdKayitli.son_cevir || 0; sonCevirMiktar = kdKayitli.son_cevir_miktar || 0; sonHediye = kdKayitli.son_gunluk_hediye || 0; sonHediyeMiktar = kdKayitli.son_gunluk_hediye_miktar || 0; }
                }
              }
              if (log.gecmis && (!log.son_giris || !log.son_cikis)) {
                var gecArr = Object.values(log.gecmis).sort(function(a,b){return b.ts-a.ts;});
                if (!log.son_giris) { var ilkG = gecArr.find(function(x){return x.tip==='giris';}); if (ilkG) log.son_giris = ilkG.ts; }
                if (!log.son_cikis) { var ilkC = gecArr.find(function(x){return x.tip==='cikis';}); if (ilkC) log.son_cikis = ilkC.ts; }
              }
              var aktif = log.son_giris && (!log.son_cikis || log.son_giris > log.son_cikis);
              var dotColor = banli ? '#cf8a94' : aktif ? '#7dc9a3' : '#1a3a5a';
              var avatarLetter = (u.kullanici||'?').charAt(0).toUpperCase();
              var cardClass = 'ap-user-card' + (banli ? ' banli' : susturlu ? ' susturlu' : '');

              // Rozet HTML
              var rozetler = '';
              if (u.misafir) rozetler += '<span class="ap-badge-misafir">👤 MİSAFİR</span>';
              if (banli) rozetler += '<span class="ap-badge-banli">🚫 BANLI</span>';
              if (susturlu) rozetler += '<span class="ap-badge-susturlu">🔇 SUSTURLU</span>';

              // Giriş/çıkış chip renkleri
              var girisChip = log.son_giris
                ? 'color:#7dc9a3;background:rgba(110,190,150,0.06);border:1px solid rgba(110,190,150,0.16);'
                : 'color:#2a4a6a;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);';
              var cikisChip = log.son_cikis
                ? 'color:#cf8a94;background:rgba(200,110,120,0.06);border:1px solid rgba(200,110,120,0.16);'
                : 'color:#2a4a6a;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);';

              html += '<div class="' + cardClass + '">'
                + '<div class="ap-user-row" onclick="adminToggleDetay(\'u_' + u.key + '\')">'
                  + '<div class="ap-avatar" style="background:' + (banli?'#150c10':aktif?'#0a1712':'#0d1420') + ';">' + avatarLetter + '</div>'
                  + '<div class="ap-user-info">'
                    + '<div class="ap-user-name">' + u.kullanici + (rozetler ? ' ' + rozetler : '') + '</div>'
                    + '<div class="ap-user-times">'
                      + '<span class="ap-time-chip" style="' + girisChip + '">▶ ' + (log.son_giris ? tsFormat(log.son_giris) : '—') + '</span>'
                      + '<span class="ap-time-chip" style="' + cikisChip + '">■ ' + (log.son_cikis ? tsFormat(log.son_cikis) : '—') + '</span>'
                    + '</div>'
                  + '</div>'
                  + '<div style="display:flex;align-items:center;gap:6px;">'
                    + '<div class="ap-status-dot" style="background:' + dotColor + ';box-shadow:0 0 5px ' + dotColor + '88;"></div>'
                    + '<span class="ap-chevron" id="ap_chev_' + u.key + '">›</span>'
                  + '</div>'
                + '</div>'

                // Detay
                + '<div class="ap-detail" id="u_' + u.key + '">'
                  + '<div class="ap-detail-grid">'
                    + '<div class="ap-detail-card" style="background:rgba(110,190,150,0.05);border:1px solid rgba(110,190,150,0.15);">'
                      + '<div class="ap-detail-label" style="color:#7dc9a3;">▶ SON GİRİŞ</div>'
                      + '<div class="ap-detail-val" style="color:#a7dfc2;">' + (log.son_giris ? tsFormat(log.son_giris) : '—') + '</div>'
                      + '<div class="ap-detail-ago" style="color:#7dc9a3;">' + timeAgo(log.son_giris) + '</div>'
                    + '</div>'
                    + '<div class="ap-detail-card" style="background:rgba(200,110,120,0.05);border:1px solid rgba(200,110,120,0.15);">'
                      + '<div class="ap-detail-label" style="color:#cf8a94;">■ SON ÇIKIŞ</div>'
                      + '<div class="ap-detail-val" style="color:#e2acb3;">' + (log.son_cikis ? tsFormat(log.son_cikis) : '—') + '</div>'
                      + '<div class="ap-detail-ago" style="color:#cf8a94;">' + timeAgo(log.son_cikis) + '</div>'
                    + '</div>'
                  + '</div>'

                  + (function() {
                      var gecmis = log.gecmis ? Object.values(log.gecmis).sort(function(a,b){return b.ts-a.ts;}).slice(0,5) : [];
                      if (!gecmis.length) return '';
                      var rows = gecmis.map(function(g) {
                        var isG = g.tip==='giris';
                        return '<div class="ap-gecmis-row" style="background:'+(isG?'rgba(110,190,150,0.04)':'rgba(200,110,120,0.04)')+';border:1px solid '+(isG?'rgba(110,190,150,0.10)':'rgba(200,110,120,0.10)')+';margin-bottom:3px;">'
                          + '<span style="font-size:10px;font-weight:700;color:'+(isG?'#7dc9a3':'#cf8a94')+';width:16px;">'+(isG?'▶':'■')+'</span>'
                          + '<span style="font-size:10px;font-weight:700;color:#e2e8f0;flex:1;">'+tsFormat(g.ts)+'</span>'
                          + '<span style="font-size:9px;color:#4a6a8a;">'+timeAgo(g.ts)+'</span>'
                          + '</div>';
                      }).join('');
                      return '<div class="ap-gecmis"><div class="ap-gecmis-title">📋 GEÇMİŞ KAYITLAR</div>'+rows+'</div>';
                    })()

                  + '<div class="ap-info-row">📧 ' + u.email + ' &nbsp;·&nbsp; 📅 ' + tsFormat(u.kayit) + '</div>'

                  + (!u.misafir
                    ? '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:9px;background:rgba(255,180,0,0.04);border:1px solid rgba(255,180,0,0.12);margin-bottom:7px;">'
                      + '<span style="font-size:9px;color:#4a6a8a;">🔑 ŞİFRE HASH</span>'
                      + '<button class="ap-btn-sifre" onclick="adminSifreGoster(\'u_sifre_' + u.key + '\',\'' + u.key + '\')">👁 Göster</button>'
                      + '</div>'
                      + '<div id="u_sifre_' + u.key + '" style="display:none;font-size:9px;color:#fbbf24;word-break:break-all;padding:7px 10px;border-radius:9px;background:rgba(255,180,0,0.04);border:1px solid rgba(255,180,0,0.12);margin-bottom:7px;font-family:monospace;"></div>'
                    : '')

                  + ('<div id="ap_kredi_row_' + u.key + '" data-cihaz="' + (cihazId||'') + '" data-nick="' + (u.kullanici||'') + '" data-misafir="' + (u.misafir ? '1' : '0') + '" style="display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-radius:13px;background:rgba(0,229,255,0.05);border:1px solid rgba(0,229,255,0.15);margin-bottom:10px;flex-wrap:wrap;gap:10px;">'
                      + '<div style="display:flex;align-items:center;gap:8px;">'
                        + '<span style="font-size:13px;">💎</span>'
                        + '<div><div style="font-size:9px;color:#4a6a8a;font-weight:700;letter-spacing:0.5px;">KREDİ</div>'
                        + '<div id="ap_kredi_val_' + u.key + '" style="font-size:15px;font-weight:900;color:#00e5ff;line-height:1;">' + (mevcutKredi !== null ? mevcutKredi : '—') + '</div></div>'
                      + '</div>'
                      + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;">'
                        + '<input id="ap_kredi_inp_' + u.key + '" type="number" min="0" max="9999" placeholder="Miktar" style="width:72px;padding:9px 10px;border-radius:10px;border:1px solid rgba(0,229,255,0.25);background:rgba(0,229,255,0.06);color:#00e5ff;font-size:12px;font-weight:800;text-align:center;outline:none;" />'
                        + '<button class="ap-btn" style="border-color:rgba(0,229,255,0.30);background:linear-gradient(135deg,rgba(0,229,255,0.16),rgba(0,229,255,0.06));color:#00e5ff;padding:9px 14px;font-size:11.5px;flex:none;" onclick="adminKrediYukle(\'' + u.key + '\')">⚡ Yükle</button>'
                        + '<button class="ap-btn" style="border-color:rgba(255,120,0,0.40);background:linear-gradient(135deg,rgba(255,120,0,0.16),rgba(255,120,0,0.06));color:#ff9500;padding:9px 14px;font-size:11.5px;flex:none;" onclick="adminKrediAyarla(\'' + u.key + '\')">✏️ Ayarla</button>'
                      + '</div>'
                    + '</div>')

                  + (!u.misafir
                    ? '<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-radius:13px;background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.15);margin-bottom:10px;flex-wrap:wrap;gap:10px;">'
                      + '<div style="display:flex;align-items:center;gap:8px;">'
                        + '<span style="font-size:13px;">📦</span>'
                        + '<div><div style="font-size:9px;color:#4a6a8a;font-weight:700;letter-spacing:0.5px;">SON SANDIK</div>'
                        + '<div id="ap_sandik_val_' + u.key + '" style="font-size:11px;font-weight:800;color:#fbbf24;line-height:1.4;">' + (sonSandik ? ('✅ Alındı (+' + sonSandikMiktar + ') · ' + tsFormat(sonSandik)) : '— (hiç açmadı)') + '</div></div>'
                      + '</div>'
                      + '<button class="ap-btn" style="border-color:rgba(245,158,11,0.35);background:linear-gradient(135deg,rgba(245,158,11,0.18),rgba(245,158,11,0.06));color:#fbbf24;padding:9px 16px;font-size:11.5px;flex:none;" onclick="adminSandikSifirla(\'' + u.key + '\',\'' + u.kullanici + '\')">🔄 Sıfırla</button>'
                    + '</div>'
                    : '')

                  + (!u.misafir
                    ? '<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-radius:13px;background:rgba(255,200,0,0.05);border:1px solid rgba(255,200,0,0.15);margin-bottom:10px;flex-wrap:wrap;gap:10px;">'
                      + '<div style="display:flex;align-items:center;gap:8px;">'
                        + '<span style="font-size:13px;">🎰</span>'
                        + '<div><div style="font-size:9px;color:#4a6a8a;font-weight:700;letter-spacing:0.5px;">SON ÇEVİR KAZAN</div>'
                        + '<div id="ap_cevir_val_' + u.key + '" style="font-size:11px;font-weight:800;color:#fcd34d;line-height:1.4;">' + (sonCevir ? ('✅ Alındı (+' + sonCevirMiktar + ') · ' + tsFormat(sonCevir)) : '— (hiç çevirmedi)') + '</div></div>'
                      + '</div>'
                      + '<button class="ap-btn" style="border-color:rgba(255,200,0,0.35);background:linear-gradient(135deg,rgba(255,200,0,0.18),rgba(255,200,0,0.06));color:#fcd34d;padding:9px 16px;font-size:11.5px;flex:none;" onclick="adminCevirKazanSifirla(\'' + u.key + '\',\'' + u.kullanici + '\')">🔄 Sıfırla</button>'
                    + '</div>'
                    : '')

                  + (!u.misafir
                    ? '<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-radius:13px;background:rgba(0,230,118,0.05);border:1px solid rgba(0,230,118,0.15);margin-bottom:10px;flex-wrap:wrap;gap:10px;">'
                      + '<div style="display:flex;align-items:center;gap:8px;">'
                        + '<span style="font-size:13px;">🎁</span>'
                        + '<div><div style="font-size:9px;color:#4a6a8a;font-weight:700;letter-spacing:0.5px;">SON GÜNLÜK HEDİYE</div>'
                        + '<div id="ap_hediye_val_' + u.key + '" style="font-size:11px;font-weight:800;color:#7dc9a3;line-height:1.4;">' + (sonHediye ? ('✅ Alındı (+' + sonHediyeMiktar + ') · ' + tsFormat(sonHediye)) : '— (hiç almadı)') + '</div></div>'
                      + '</div>'
                      + '<button class="ap-btn" style="border-color:rgba(0,230,118,0.35);background:linear-gradient(135deg,rgba(0,230,118,0.18),rgba(0,230,118,0.06));color:#7dc9a3;padding:9px 16px;font-size:11.5px;flex:none;" onclick="adminHediyeSifirla(\'' + u.key + '\',\'' + u.kullanici + '\')">🔄 Sıfırla</button>'
                    + '</div>'
                    : '')

                  + '<div class="ap-action-row">'
                    + '<button class="ap-btn ap-btn-logout" onclick="adminOturumKapat(\'' + u.kullanici + '\',\'' + u.key + '\')">🔌 Oturumu Kapat</button>'
                  + '</div>'

                  + '<div class="ap-action-row">'
                    + (banli
                      ? '<button class="ap-btn ap-btn-unban" onclick="adminBanKaldir(\'' + u.kullanici + '\')">✅ Hesap Banı Kaldır</button>'
                      : '<button class="ap-btn ap-btn-ban" onclick="adminBanHesap(\'' + u.kullanici + '\')">🚫 Hesap Ban</button>')
                    + (cihazBanli
                      ? '<button class="ap-btn ap-btn-unban" onclick="adminCihazBanKaldir(\'' + u.kullanici + '\')">✅ Cihaz</button>'
                      : '<button class="ap-btn ap-btn-cihaz" onclick="adminBanCihaz(\'' + u.kullanici + '\')">📱 Cihaz</button>')
                    + (ipBanli
                      ? '<button class="ap-btn ap-btn-unban" onclick="adminIPBanKaldir(\'' + u.kullanici + '\')">✅ IP</button>'
                      : '<button class="ap-btn ap-btn-ip" onclick="adminBanIP(\'' + u.kullanici + '\')">🌐 IP</button>')
                  + '</div>'

                  + '<div class="ap-action-row">'
                    + (susturlu
                      ? '<button class="ap-btn ap-btn-unsustur" onclick="adminSusturKaldir(\'' + u.kullanici + '\')">🔊 Susturmayı Kaldır</button>'
                      : '<button class="ap-btn ap-btn-sustur" onclick="adminSustur(\'' + u.kullanici + '\')">🔇 Sustur</button>')
                    + '<button class="ap-btn ap-btn-sil" onclick="adminKullaniciSil(\'' + u.kullanici + '\',\'' + u.key + '\')">🗑️</button>'
                  + '</div>'
                  + (!u.misafir ? '<div class="ap-action-row"><button id="adminBireyselHediyeBtn_' + u.key + '" style="width:100%;padding:11px;border-radius:11px;border:1px solid rgba(245,158,11,0.4);background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.08));color:#fbbf24;font-size:12px;font-weight:900;cursor:pointer;-webkit-tap-highlight-color:transparent;">🎁 Bu Kullanıcıya Hediye Gönder</button></div>' : '')
                + '</div>'
            });

            content.innerHTML = html;
            if (typeof window._apRenderSonrasi === 'function') window._apRenderSonrasi();
            var _hediyeBtn = document.getElementById('adminHediyeDagitBtn');
            if (_hediyeBtn) _hediyeBtn.addEventListener('click', function(){ window._adminHediyeDagit(); });
            // Bireysel hediye butonları
            kullanicilar.forEach(function(u) {
              if (u.misafir) return;
              var bBtn = document.getElementById('adminBireyselHediyeBtn_' + u.key);
              if (bBtn) bBtn.addEventListener('click', function(){ window._adminBireyselHediyeGonder(u.kullanici); });
            });
            // Kredi/Sandık/Çevir Kazan verisini canlı takip et (admin panel açıkken karşı taraf işlem yaparsa anında yansısın)
            window._adminKrediCanliBaslat(kullanicilar);
      })(kulSnap, logSnap, banSnap, susSnap, cihazBanSnap, ipBanSnap, nickCihazSnap, nickIPSnap, misafirKrediSnap, kullaniciKrediSnap);
    }).catch(function(err) {
      var content = document.getElementById('adminTabContent');
      if (content) content.innerHTML = '<div style="text-align:center;padding:40px 16px;color:#ff4664;font-size:12px;">⚠️ Veri yüklenemedi.<br><span style="color:#4a6a8a;font-size:10px;">Hata: ' + (err && err.message ? err.message : 'Firebase bağlantı hatası') + '</span><br><br><button onclick="adminTab(\'kullanicilar\')" style="margin-top:10px;padding:8px 18px;border-radius:9px;border:1px solid rgba(0,212,255,0.25);background:rgba(0,212,255,0.08);color:#00d4ff;font-size:11px;font-weight:800;cursor:pointer;">🔄 Tekrar Dene</button></div>';
    });
  }

  // ── Admin panel: kullanici_kredi / misafir_kredi canlı dinleyici ──
  // Panel açıkken bir kullanıcı Sandık/Çevir Kazan/kredi kullanırsa, panel yeniden açılmadan anında güncellensin.
  window._adminKrediRefKullanici = null;
  window._adminKrediHandlerKullanici = null;
  window._adminKrediRefMisafir = null;
  window._adminKrediHandlerMisafir = null;

  window._adminKrediCanliDurdur = function() {
    if (window._adminKrediRefKullanici && window._adminKrediHandlerKullanici) {
      try { window._adminKrediRefKullanici.off('value', window._adminKrediHandlerKullanici); } catch(e){}
    }
    if (window._adminKrediRefMisafir && window._adminKrediHandlerMisafir) {
      try { window._adminKrediRefMisafir.off('value', window._adminKrediHandlerMisafir); } catch(e){}
    }
    window._adminKrediRefKullanici = null;
    window._adminKrediRefMisafir = null;
  };

  window._adminKrediCanliBaslat = function(kullanicilar) {
    try {
    window._adminKrediCanliDurdur();
    var db2 = _loginDb ? _loginDb() : (typeof db !== 'undefined' ? db : null);
    if (!db2) return;

    // Nick -> kullanıcı objesi eşlemesi (kayıtlı kullanıcılar)
    var kayitliMap = {};
    kullanicilar.forEach(function(u) {
      if (u.misafir) return;
      var nKey = (u.kullanici||'').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
      if (nKey) kayitliMap[nKey] = u;
    });

    window._adminKrediRefKullanici = db2.ref('kullanici_kredi');
    window._adminKrediHandlerKullanici = function(snap) {
      var data = snap.val() || {};
      Object.keys(kayitliMap).forEach(function(nKey) {
        var u = kayitliMap[nKey];
        var d = data[nKey];
        if (!d) return;
        var krediEl = document.getElementById('ap_kredi_val_' + u.key);
        if (krediEl && d.kredi !== undefined) krediEl.textContent = parseInt(d.kredi) || 0;
        var sandikEl = document.getElementById('ap_sandik_val_' + u.key);
        if (sandikEl) {
          sandikEl.innerHTML = d.son_sandik
            ? ('✅ Alındı (+' + (d.son_sandik_miktar||0) + ') · ' + tsFormat(d.son_sandik))
            : '— (hiç açmadı)';
        }
        var cevirEl = document.getElementById('ap_cevir_val_' + u.key);
        if (cevirEl) {
          cevirEl.innerHTML = d.son_cevir
            ? ('✅ Alındı (+' + (d.son_cevir_miktar||0) + ') · ' + tsFormat(d.son_cevir))
            : '— (hiç çevirmedi)';
        }
        var hediyeEl = document.getElementById('ap_hediye_val_' + u.key);
        if (hediyeEl) {
          hediyeEl.innerHTML = d.son_gunluk_hediye
            ? ('✅ Alındı (+' + (d.son_gunluk_hediye_miktar||0) + ') · ' + tsFormat(d.son_gunluk_hediye))
            : '— (hiç almadı)';
        }
      });
    };
    window._adminKrediRefKullanici.on('value', window._adminKrediHandlerKullanici);

    // Misafir kredileri (nick veya cihaz key üzerinden)
    var misafirMap = {};
    kullanicilar.forEach(function(u) {
      if (!u.misafir) return;
      var nKey = (u.kullanici||'').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
      if (nKey) misafirMap[nKey] = u;
      if (u.cihazId) misafirMap[u.cihazId.replace(/[.#$\/\[\]]/g,'_')] = u;
    });
    window._adminKrediRefMisafir = db2.ref('misafir_kredi');
    window._adminKrediHandlerMisafir = function(snap) {
      var data = snap.val() || {};
      Object.keys(misafirMap).forEach(function(key) {
        var u = misafirMap[key];
        var d = data[key];
        if (d === undefined || d === null) return;
        var krediEl = document.getElementById('ap_kredi_val_' + u.key);
        if (!krediEl) return;
        var val = (typeof d === 'object') ? (d.kredi !== undefined ? d.kredi : 0) : d;
        krediEl.textContent = parseInt(val) || 0;
      });
    };
    window._adminKrediRefMisafir.on('value', window._adminKrediHandlerMisafir);
    } catch(e) { console.error('_adminKrediCanliBaslat hata:', e); }
  };

  window.adminKrediYukle = function(userKey) {
    var inp = document.getElementById('ap_kredi_inp_' + userKey);
    var valEl = document.getElementById('ap_kredi_val_' + userKey);
    var row = document.getElementById('ap_kredi_row_' + userKey);
    if (!inp || !row) return;
    var miktar = parseInt(inp.value);
    if (!miktar || miktar < 1) {
      inp.style.borderColor='rgba(255,70,100,0.6)';
      setTimeout(function(){inp.style.borderColor='rgba(0,229,255,0.25)';},1200);
      return;
    }
    var nick = row.getAttribute('data-nick');
    var misafirMi = row.getAttribute('data-misafir') === '1';
    if (!nick) { alert('Nick bulunamadı!'); return; }
    var db2 = _loginDb(); if (!db2) { alert('Firebase bağlantısı yok!'); return; }
    var nKey = nick.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
    var btn = row.querySelector('button');
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    var krediRef = misafirMi ? 'misafir_kredi/' + nKey : 'kullanici_kredi/' + nKey;
    db2.ref(krediRef).once('value').then(function(snap) {
      var mevcut = 0;
      if (snap.exists()) {
        var d = snap.val();
        mevcut = d.kredi !== undefined ? parseInt(d.kredi)||0 : parseInt(d)||0;
      }
      var yeni = mevcut + miktar;
      return db2.ref(krediRef).update({ kredi: yeni, guncelleme: Date.now(), yukleyenAdmin: 'Doruk' });
    }).then(function() {
      inp.value = '';
      inp.style.borderColor='rgba(0,255,136,0.5)';
      if (btn) { btn.disabled = false; btn.textContent = '✅ Yüklendi'; setTimeout(function(){ btn.textContent='⚡ Yükle'; },2000); }
      setTimeout(function(){inp.style.borderColor='rgba(0,229,255,0.25)';},1500);
    }).catch(function(err) {
      if (btn) { btn.disabled = false; btn.textContent = '⚡ Yükle'; }
      inp.style.borderColor='rgba(255,70,100,0.6)';
      alert('Hata: ' + (err && err.message ? err.message : 'Firebase yazma hatası'));
      setTimeout(function(){inp.style.borderColor='rgba(0,229,255,0.25)';},2000);
    });
  };

  // Kredi ayarla — mevcut değeri yaz (üstüne ekleme değil, direkt set)
  window.adminKrediAyarla = function(userKey) {
    var inp = document.getElementById('ap_kredi_inp_' + userKey);
    var row = document.getElementById('ap_kredi_row_' + userKey);
    var valEl = document.getElementById('ap_kredi_val_' + userKey);
    if (!inp || !row) return;
    var miktar = parseInt(inp.value);
    if (isNaN(miktar) || miktar < 0) {
      inp.style.borderColor='rgba(255,70,100,0.6)';
      setTimeout(function(){inp.style.borderColor='rgba(0,229,255,0.25)';},1200);
      return;
    }
    var nick = row.getAttribute('data-nick');
    var misafirMi = row.getAttribute('data-misafir') === '1';
    if (!nick) { alert('Nick bulunamadı!'); return; }
    var db2 = _loginDb(); if (!db2) { alert('Firebase bağlantısı yok!'); return; }
    var nKey = nick.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
    var krediRef = misafirMi ? 'misafir_kredi/' + nKey : 'kullanici_kredi/' + nKey;
    var btns = row.querySelectorAll('button');
    var btn = btns[btns.length - 1];
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    db2.ref(krediRef).update({ kredi: miktar, guncelleme: Date.now(), yukleyenAdmin: 'Doruk' })
    .then(function() {
      inp.value = '';
      inp.style.borderColor='rgba(0,255,136,0.5)';
      if (valEl) valEl.textContent = miktar;
      if (btn) { btn.disabled = false; btn.textContent = '✅ Ayarlandı'; setTimeout(function(){ btn.textContent='✏️ Ayarla'; },2000); }
      setTimeout(function(){inp.style.borderColor='rgba(0,229,255,0.25)';},1500);
    }).catch(function(err) {
      if (btn) { btn.disabled = false; btn.textContent = '✏️ Ayarla'; }
      inp.style.borderColor='rgba(255,70,100,0.6)';
      alert('Hata: ' + (err && err.message ? err.message : 'Firebase yazma hatası'));
      setTimeout(function(){inp.style.borderColor='rgba(0,229,255,0.25)';},2000);
    });
  };

  // Kullanıcının şans sandığı bekleme süresini sıfırla (admin)
  window.adminSandikSifirla = function(userKey, nick) {
    var db2 = _loginDb(); if (!db2) { alert('Firebase bağlantısı yok!'); return; }
    var nKey = (nick||'').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
    if (!nKey) return;
    db2.ref('kullanici_kredi/' + nKey).update({ son_sandik: 0 })
    .then(function() {
      if (typeof window._toast === 'function') window._toast('📦 Sandık sıfırlandı: ' + nick, '#fbbf24');
      if (typeof window._adminPanelAc === 'function') window._adminPanelAc();
    }).catch(function(err) {
      alert('Hata: ' + (err && err.message ? err.message : 'Firebase yazma hatası'));
    });
  };

  // Kullanıcının çevir kazan bekleme süresini sıfırla (admin)
  window.adminCevirKazanSifirla = function(userKey, nick) {
    var db2 = _loginDb(); if (!db2) { alert('Firebase bağlantısı yok!'); return; }
    var nKey = (nick||'').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
    if (!nKey) return;
    db2.ref('kullanici_kredi/' + nKey).update({ son_cevir: 0 })
    .then(function() {
      if (typeof window._toast === 'function') window._toast('🎰 Çevir Kazan sıfırlandı: ' + nick, '#fcd34d');
      if (typeof window._adminPanelAc === 'function') window._adminPanelAc();
    }).catch(function(err) {
      alert('Hata: ' + (err && err.message ? err.message : 'Firebase yazma hatası'));
    });
  };

  // Kullanıcının günlük hediyesini sıfırla (admin) — bir sonraki girişte tekrar alabilir
  window.adminHediyeSifirla = function(userKey, nick) {
    var db2 = _loginDb(); if (!db2) { alert('Firebase bağlantısı yok!'); return; }
    var nKey = (nick||'').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
    if (!nKey) return;
    db2.ref('kullanici_kredi/' + nKey).update({ son_gunluk_hediye: 0 })
    .then(function() {
      if (typeof window._toast === 'function') window._toast('🎁 Günlük hediye sıfırlandı: ' + nick, '#00e676');
      if (typeof window._adminPanelAc === 'function') window._adminPanelAc();
    }).catch(function(err) {
      alert('Hata: ' + (err && err.message ? err.message : 'Firebase yazma hatası'));
    });
  };


  var _apKrediListeners = {};

  // Detay açıkken kredi/sandık/çevir verisini canlı dinler (toggle açıldığında
  // veya bir işlem sonrası kart yeniden açık tutulduğunda çağrılır)
  window._apKrediListenerBaslat = function(key) {
    try {
      var row = document.getElementById('ap_kredi_row_' + key);
      if (!row) return;
      var nick = row.getAttribute('data-nick');
      if (!nick) return;
      var db2 = _loginDb(); if (!db2) return;
      var nKey = nick.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
      var misafirMi = row.getAttribute('data-misafir') === '1';
      // Önceki listener varsa temizle
      if (_apKrediListeners[key]) {
        try { _apKrediListeners[key].ref.off('value', _apKrediListeners[key].fn); } catch(e){}
      }
      var ref = db2.ref((misafirMi ? 'misafir_kredi/' : 'kullanici_kredi/') + nKey);
      var fn = ref.on('value', function(snap) {
        var valEl = document.getElementById('ap_kredi_val_' + key);
        var sandikEl = document.getElementById('ap_sandik_val_' + key);
        var cevirEl = document.getElementById('ap_cevir_val_' + key);
        var hediyeEl = document.getElementById('ap_hediye_val_' + key);
        if (!snap.exists()) {
          if (valEl) valEl.textContent = '0';
          if (sandikEl) sandikEl.innerHTML = '— (hiç açmadı)';
          if (cevirEl) cevirEl.innerHTML = '— (hiç çevirmedi)';
          if (hediyeEl) hediyeEl.innerHTML = '— (hiç almadı)';
          return;
        }
        var d = snap.val();
        var kredi = (typeof d === 'object' && d !== null) ? (d.kredi !== undefined ? parseInt(d.kredi) : 0) : parseInt(d);
        if (valEl && !isNaN(kredi)) {
          valEl.textContent = kredi;
          valEl.style.color = '#5fc9e8';
        }
        if (typeof d === 'object' && d !== null) {
          if (sandikEl) {
            sandikEl.innerHTML = d.son_sandik
              ? ('✅ Alındı (+' + (d.son_sandik_miktar||0) + ') · ' + tsFormat(d.son_sandik))
              : '— (hiç açmadı)';
          }
          if (cevirEl) {
            cevirEl.innerHTML = d.son_cevir
              ? ('✅ Alındı (+' + (d.son_cevir_miktar||0) + ') · ' + tsFormat(d.son_cevir))
              : '— (hiç çevirmedi)';
          }
          if (hediyeEl) {
            hediyeEl.innerHTML = d.son_gunluk_hediye
              ? ('✅ Alındı (+' + (d.son_gunluk_hediye_miktar||0) + ') · ' + tsFormat(d.son_gunluk_hediye))
              : '— (hiç almadı)';
          }
        }
      });
      _apKrediListeners[key] = { ref: ref, fn: fn };
    } catch(e) {}
  };

  window.adminToggleDetay = function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var key = id.replace('u_','');
    var chev = document.getElementById('ap_chev_' + key);
    var open = !el.classList.contains('ap-open');

    if (open) {
      el.classList.add('ap-open');
      if (chev) chev.style.transform = 'rotate(90deg)';
      window._apAcikKart = id;
      window._apKrediListenerBaslat(key);
    } else {
      el.classList.remove('ap-open');
      if (chev) chev.style.transform = '';
      if (window._apAcikKart === id) window._apAcikKart = null;
      // Detay kapandı — listener durdur
      if (_apKrediListeners[key]) {
        try { _apKrediListeners[key].ref.off('value', _apKrediListeners[key].fn); } catch(e){}
        delete _apKrediListeners[key];
      }
    }
  };

  // ---- Hesap Ban ----
  window.adminBanHesap = function(nick) {
    dorukConfirm({ icon:'🚫', title:'Hesap Banla', msg:'"'+nick+'" hesabı banlanacak!', okText:'Banla', danger:true, cb:function(ok) {
      if (!ok) return;
      var db2 = _loginDb();
      if (!db2) return;
      var key = nick.replace(/[.#$\/\[\]]/g,'_');
      db2.ref('banlar/' + key).set({ nick: nick, zaman: Date.now(), banlayan: 'Doruk', tip: 'hesap' }).then(function() {
        if (window._toast) window._toast('🚫 ' + nick + ' hesabı banlandı', '#ff4664');
        setTimeout(function(){ adminTab('kullanicilar'); }, 600);
      });
    }});
  };

  // ---- Cihaz Ban ----
  window.adminBanCihaz = function(nick) {
    dorukConfirm({ icon:'📱', title:'Cihaz Banla', msg:'"'+nick+'" cihazı banlanacak!', okText:'Banla', danger:true, cb:function(ok) {
      if (!ok) return;
      var db2 = _loginDb();
      if (!db2) return;
      var key = nick.replace(/[.#$\/\[\]]/g,'_');
      db2.ref('nick_cihaz/' + key).once('value', function(snap) {
        var deviceId = snap.val();
        if (!deviceId) { if (window._toast) window._toast('⚠️ Cihaz bilgisi bulunamadı', '#fbbf24'); return; }
        var devKey = deviceId.replace(/[.#$\/\[\]]/g,'_');
        db2.ref('cihaz_banlar/' + devKey).set({ nick: nick, deviceId: deviceId, zaman: Date.now(), banlayan: 'Doruk' }).then(function() {
          if (window._toast) window._toast('📱 ' + nick + ' cihazı banlandı', '#fb923c');
          setTimeout(function(){ adminTab('kullanicilar'); }, 600);
        });
      });
    }});
  };

  window.adminCihazBanKaldir = function(nick) {
    var db2 = _loginDb();
    if (!db2) return;
    var key = nick.replace(/[.#$\/\[\]]/g,'_');
    db2.ref('nick_cihaz/' + key).once('value', function(snap) {
      var deviceId = snap.val();
      if (!deviceId) return;
      var devKey = deviceId.replace(/[.#$\/\[\]]/g,'_');
      db2.ref('cihaz_banlar/' + devKey).remove().then(function() {
        if (window._toast) window._toast('✅ ' + nick + ' cihaz banı kaldırıldı', '#00e676');
        setTimeout(function(){ adminTab('kullanicilar'); }, 600);
      });
    });
  };

  // ---- IP Ban ----
  window.adminBanIP = function(nick) {
    dorukConfirm({ icon:'🌐', title:'IP Banla', msg:'"'+nick+'" IP adresi banlanacak!', okText:'Banla', danger:true, cb:function(ok) {
      if (!ok) return;
      var db2 = _loginDb();
      if (!db2) return;
      var key = nick.replace(/[.#$\/\[\]]/g,'_');
      db2.ref('nick_ip/' + key).once('value', function(snap) {
        var ip = snap.val();
        if (!ip) { if (window._toast) window._toast('⚠️ IP bilgisi bulunamadı', '#fbbf24'); return; }
        var ipKey = ip.replace(/\./g,'_');
        db2.ref('ip_banlar/' + ipKey).set({ nick: nick, ip: ip, zaman: Date.now(), banlayan: 'Doruk' }).then(function() {
          if (window._toast) window._toast('🌐 ' + nick + ' IP banlandı (' + ip + ')', '#c084fc');
          setTimeout(function(){ adminTab('kullanicilar'); }, 600);
        });
      });
    }});
  };

  window.adminIPBanKaldir = function(nick) {
    var db2 = _loginDb();
    if (!db2) return;
    var key = nick.replace(/[.#$\/\[\]]/g,'_');
    db2.ref('nick_ip/' + key).once('value', function(snap) {
      var ip = snap.val();
      if (!ip) return;
      var ipKey = ip.replace(/\./g,'_');
      db2.ref('ip_banlar/' + ipKey).remove().then(function() {
        if (window._toast) window._toast('✅ ' + nick + ' IP banı kaldırıldı', '#00e676');
        setTimeout(function(){ adminTab('kullanicilar'); }, 600);
      });
    });
  };

  // ---- Banlar Tab ----
  function adminLoadBanlar() {
    Promise.all([
      db.ref('banlar').once('value'),
      db.ref('cihaz_banlar').once('value'),
      db.ref('ip_banlar').once('value')
    ]).then(function(snaps) {
      var hesapSnap = snaps[0], cihazSnap = snaps[1], ipSnap = snaps[2];
      var content = document.getElementById('adminTabContent');
      if (!content) return;

      var hesapBanlar = [];
      hesapSnap.forEach(function(c) { var v = c.val(); if (v) hesapBanlar.push(v); });
      var cihazBanlar = [];
      cihazSnap.forEach(function(c) { var v = c.val(); if (v) cihazBanlar.push(v); });
      var ipBanlar = [];
      ipSnap.forEach(function(c) { var v = c.val(); if (v) ipBanlar.push(v); });

      var toplam = hesapBanlar.length + cihazBanlar.length + ipBanlar.length;

      if (!toplam) {
        content.innerHTML = '<div class="ap-empty"><div class="ap-empty-icon">✅</div>Banlı kullanıcı yok</div>';
        return;
      }

      var html = '';

      if (hesapBanlar.length) {
        html += '<div class="ap-ban-section-title" style="color:#ff4664;">🚫 HESAP BAN (' + hesapBanlar.length + ')</div>';
        html += hesapBanlar.map(function(b) {
          return '<div class="ap-ban-row" style="background:rgba(255,70,100,0.05);border:1px solid rgba(255,70,100,0.15);">'
            + '<div><div style="font-size:13px;font-weight:800;color:#f1f5f9;">' + b.nick + '</div><div style="font-size:9px;color:#4a6a8a;margin-top:2px;">🕐 ' + tsFormat(b.zaman) + '</div></div>'
            + '<button class="ap-btn ap-btn-unban" style="flex:0;padding:7px 14px;" onclick="adminBanKaldir(\'' + b.nick + '\')">✅ Kaldır</button>'
            + '</div>';
        }).join('');
      }

      if (cihazBanlar.length) {
        html += '<div class="ap-ban-section-title" style="color:#fb923c;">📱 CİHAZ BAN (' + cihazBanlar.length + ')</div>';
        html += cihazBanlar.map(function(b) {
          return '<div class="ap-ban-row" style="background:rgba(255,150,50,0.05);border:1px solid rgba(255,150,50,0.15);">'
            + '<div><div style="font-size:13px;font-weight:800;color:#f1f5f9;">' + (b.nick||'—') + '</div><div style="font-size:9px;color:#4a6a8a;margin-top:2px;">🕐 ' + tsFormat(b.zaman) + '</div></div>'
            + '<button class="ap-btn ap-btn-unban" style="flex:0;padding:7px 14px;" onclick="adminCihazBanKaldir(\'' + (b.nick||'') + '\')">✅ Kaldır</button>'
            + '</div>';
        }).join('');
      }

      if (ipBanlar.length) {
        html += '<div class="ap-ban-section-title" style="color:#c084fc;">🌐 IP BAN (' + ipBanlar.length + ')</div>';
        html += ipBanlar.map(function(b) {
          return '<div class="ap-ban-row" style="background:rgba(200,100,255,0.05);border:1px solid rgba(200,100,255,0.15);">'
            + '<div><div style="font-size:13px;font-weight:800;color:#f1f5f9;">' + (b.nick||'—') + '</div><div style="font-size:9px;color:#4a6a8a;margin-top:2px;">🌐 ' + (b.ip||'—') + ' · 🕐 ' + tsFormat(b.zaman) + '</div></div>'
            + '<button class="ap-btn ap-btn-unban" style="flex:0;padding:7px 14px;" onclick="adminIPBanKaldir(\'' + (b.nick||'') + '\')">✅ Kaldır</button>'
            + '</div>';
        }).join('');
      }

      content.innerHTML = html;
      if (typeof window._apRenderSonrasi === 'function') window._apRenderSonrasi();
    }).catch(function(err) {
      var content = document.getElementById('adminTabContent');
      if (content) content.innerHTML = '<div style="text-align:center;padding:40px 16px;color:#ff4664;font-size:12px;">⚠️ Veri yüklenemedi.<br><span style="color:#4a6a8a;font-size:10px;">' + (err && err.message ? err.message : 'Firebase bağlantı hatası') + '</span><br><br><button onclick="adminTab(\'banlar\')" style="margin-top:10px;padding:8px 18px;border-radius:9px;border:1px solid rgba(0,212,255,0.25);background:rgba(0,212,255,0.08);color:#00d4ff;font-size:11px;font-weight:800;cursor:pointer;">🔄 Tekrar Dene</button></div>';
    });
  }
  function adminLoadSusturlar() {
    db.ref('susturlar').once('value').then(function(snap) {
      var content = document.getElementById('adminTabContent');
      if (!content) return;
      var susturlar = [];
      snap.forEach(function(c) { var v = c.val(); if (v) susturlar.push(v); });

      if (!susturlar.length) {
        content.innerHTML = '<div class="ap-empty"><div class="ap-empty-icon">🔊</div>Susturulmuş kullanıcı yok</div>';
        return;
      }
      content.innerHTML = '<div class="ap-ban-section-title" style="color:#8090ff;">🔇 SUSTURULMUŞ (' + susturlar.length + ')</div>'
        + susturlar.map(function(s) {
          return '<div class="ap-ban-row" style="background:rgba(128,144,255,0.05);border:1px solid rgba(128,144,255,0.15);">'
            + '<div><div style="font-size:13px;font-weight:800;color:#f1f5f9;">' + s.nick + '</div><div style="font-size:9px;color:#4a6a8a;margin-top:2px;">🕐 ' + tsFormat(s.zaman) + '</div></div>'
            + '<button class="ap-btn ap-btn-unsustur" style="flex:0;padding:7px 14px;" onclick="adminSusturKaldir(\'' + s.nick + '\')">🔊 Kaldır</button>'
            + '</div>';
        }).join('');
      if (typeof window._apRenderSonrasi === 'function') window._apRenderSonrasi();
    }).catch(function(err) {
      var content = document.getElementById('adminTabContent');
      if (content) content.innerHTML = '<div style="text-align:center;padding:40px 16px;color:#ff4664;font-size:12px;">⚠️ Veri yüklenemedi.<br><span style="color:#4a6a8a;font-size:10px;">' + (err && err.message ? err.message : 'Firebase bağlantı hatası') + '</span><br><br><button onclick="adminTab(\'susturlar\')" style="margin-top:10px;padding:8px 18px;border-radius:9px;border:1px solid rgba(0,212,255,0.25);background:rgba(0,212,255,0.08);color:#00d4ff;font-size:11px;font-weight:800;cursor:pointer;">🔄 Tekrar Dene</button></div>';
    });
  }

  // ---- Aksiyon fonksiyonları ----
  window.adminBanKaldir = function(nick) {
    var db2 = _loginDb();
    if (!db2) return;
    var key = nick.replace(/[.#$\/\[\]]/g,'_');
    // Önce cihaz ID'sini al
    db2.ref('nick_cihaz/' + key).once('value', function(devSnap) {
      var deviceId = devSnap.val();
      var updates = {};
      updates['banlar/' + key] = null;
      if (deviceId) updates['cihaz_banlar/' + deviceId.replace(/[.#$\/\[\]]/g,'_')] = null;
      db2.ref().update(updates).then(function() {
        if (window._toast) window._toast('✅ ' + nick + ' banı kaldırıldı', '#00e676');
        setTimeout(function(){ adminTab('banlar'); }, 600);
      }).catch(function(e) {
        if (window._toast) window._toast('Hata: ' + e.message, '#ff4664');
      });
    });
  };

  window.adminBanla = function(nick) {
    dorukConfirm({ icon:'🚫', title:'Kullanıcı Banla', msg:'\"'+ nick +'\" banlanacak!', okText:'Banla', danger:true, cb:function(ok) {
      if (!ok) return;
      var db2 = _loginDb();
      if (!db2) return;
      var key = nick.replace(/[.#$\/\[\]]/g,'_');
      var banData = { nick: nick, zaman: Date.now(), banlayan: 'Doruk' };
      db2.ref('nick_cihaz/' + key).once('value', function(devSnap) {
        var deviceId = devSnap.val();
        var updates = {};
        updates['banlar/' + key] = banData;
        if (deviceId) updates['cihaz_banlar/' + deviceId.replace(/[.#$\/\[\]]/g,'_')] = banData;
        db2.ref().update(updates).then(function() {
          if (window._toast) window._toast('🚫 ' + nick + ' banlandı', '#ff4664');
          setTimeout(function(){ adminTab('kullanicilar'); }, 600);
        });
      });
    }});
  };

  window.adminSustur = function(nick) {
    dorukConfirm({ icon:'🔇', title:'Kullanıcı Sustur', msg:'"'+nick+'" susturulacak!', okText:'Sustur', danger:true, cb:function(ok) {
      if (!ok) return;
      var db2 = _loginDb();
      if (!db2) return;
      var key = nick.replace(/[.#$\/\[\]]/g,'_');
      db2.ref('susturlar/' + key).set({ nick: nick, zaman: Date.now(), susturan: 'Doruk' }).then(function() {
        if (window._toast) window._toast('🔇 ' + nick + ' susturuldu', '#8090ff');
        setTimeout(function(){ adminTab('kullanicilar'); }, 600);
      }).catch(function(e) {
        if (window._toast) window._toast('Hata: ' + e.message, '#ff4664');
      });
    }});
  };

  window.adminSusturKaldir = function(nick) {
    var db2 = _loginDb();
    if (!db2) return;
    var key = nick.replace(/[.#$\/\[\]]/g,'_');
    db2.ref('susturlar/' + key).remove().then(function() {
      if (window._toast) window._toast('🔊 ' + nick + ' susturması kaldırıldı', '#00e676');
      setTimeout(function(){ adminTab('susturlar'); }, 600);
    }).catch(function(e) {
      if (window._toast) window._toast('Hata: ' + e.message, '#ff4664');
    });
  };

  window.adminKullaniciSil = function(kullanici, key) {
    dorukConfirm({ icon:'🗑️', title:'Kullanıcıyı Sil', msg:'"'+kullanici+'" hesabı kalıcı olarak silinecek!', okText:'Sil', danger:true, cb:function(ok) {
      if (!ok) return;
      var db2 = _loginDb();
      if (!db2) { if (window._toast) window._toast('⚠️ Firebase bağlantısı yok', '#ff4664'); return; }
      var k = key || (kullanici||'').toLowerCase().replace(/[.#$\/\[\]]/g,'_');

      // Önce kullanıcı email'ini al (email_index ve Auth silme için)
      db2.ref('kullanicilar/' + k).once('value', function(snap) {
        var email = snap.exists() ? (snap.val().email || '') : '';
        var emailKey = email.replace(/[.#$\[\]@\/]/g, '_');

        var paths = [
          'kullanicilar/' + k,
          'login_logs/' + k,
          'banlar/' + k,
          'susturlar/' + k,
          'alarms/' + k,
          'fcm_tokens/' + k,
          'watchlist/' + k,
          'cuzdan/' + k,
          'strateji/' + k,
          'nick_cihaz/' + k,
          'nick_ip/' + k,
          'misafir_kredi/' + k,
          'misafir_cihaz_nick/' + k,
          'kullanici_kredi/' + k
        ];
        if (emailKey) paths.push('email_index/' + emailKey);

        // force_logout yaz — aktif kullanıcı oturumu kapatsın
        db2.ref('force_logout/' + k).set({ ts: Date.now(), by: 'admin', deleted: true }).catch(function(){});
        db2.ref('deleted_accounts/' + k).set({ ts: Date.now(), by: 'admin' }).catch(function(){});

        Promise.all(paths.map(function(p) {
          return db2.ref(p).remove().catch(function(e) {
            console.warn('Silinemedi:', p, e.message);
          });
        })).then(function() {
          // Firebase Auth'tan da sil (admin SDK olmadan, email+şifre ile yapılamaz)
          // Ama kullanıcı aktifse currentUser üzerinden silebiliriz
          // Admin başkasını Auth'tan silemez client-side — bu normal, email_index temizlendi yeterli
          if (window._toast) window._toast('🗑️ ' + kullanici + ' silindi', '#ff4664');
          setTimeout(function(){ adminTab('kullanicilar'); }, 600);
        }).catch(function(e) {
          if (window._toast) window._toast('⚠️ Silinemedi: ' + (e && e.message ? e.message : 'Hata'), '#ff4664');
          console.error('adminKullaniciSil hata:', e);
        });
      }).catch(function() {
        if (window._toast) window._toast('⚠️ Kullanıcı bilgisi alınamadı', '#ff4664');
      });
    }});
  };

  // Oturumu uzaktan kapat
  window.adminOturumKapat = function(kullanici, key) {
    // Admin kendini kapatamaz
    if ((kullanici||'').toLowerCase() === 'doruk') {
      if (window._toast) window._toast('⚠️ Kendi oturumunuzu kapatamazsınız.', '#fbbf24');
      return;
    }
    dorukConfirm({ icon:'🔌', title:'Oturumu Kapat', msg:'"'+kullanici+'" kullanıcısının oturumu kapatılsın mı?', okText:'Kapat', danger:false, cb:function(ok) {
      if (!ok) return;
      var db2 = _loginDb();
      if (!db2) return;
      // force_logout node'una timestamp yaz — kullanıcı bunu dinliyor
      db2.ref('force_logout/' + key).set({ ts: Date.now(), by: 'admin' }).then(function() {
        if (window._toast) window._toast('🔌 ' + kullanici + ' oturumu kapatıldı', '#fb923c');
      });
    }});
  };

  // Şifreyi DB'den çekip göster
  window.adminSifreGoster = function(elId, key) {
    var el = document.getElementById(elId);
    if (!el) return;
    if (el.style.display !== 'none') { el.style.display = 'none'; return; }
    var db2 = _loginDb();
    if (!db2) { alert('DB bağlantısı yok'); return; }
    el.textContent = '⏳ Yükleniyor...';
    el.style.display = 'block';
    db2.ref('kullanicilar/' + key).once('value', function(snap) {
      var val = snap.val();
      var sifre = val && val.sifre ? val.sifre : null;
      el.textContent = sifre ? ('🔑 ' + sifre) : '— (şifre bulunamadı, key: ' + key + ')';
    }, function(err) {
      el.textContent = '❌ Hata: ' + err.message;
    });
  };

  // İlk tab'ı yükle
  adminTab('kullanicilar');
};

function _initApp(onReady) {
  // Splash bar — ilk adım (animasyonlu bar zaten çalışıyor, sadece ilerlemeyi destekle)
  (function() {
    var bar = document.getElementById('autoSplashBar');
    var msg = document.getElementById('autoSplashMsg');
    if (bar && parseInt(bar.style.width||'0') < 20) { bar.style.transition = 'width 300ms ease'; bar.style.width = '20%'; }
    if (msg && (!msg.textContent || msg.textContent === 'YÜKLENIYOR...')) msg.textContent = 'BAĞLANIYOR...';
  })();

  // Sayfa geçişi sırasında içerideki elemanlara gelen ilk touch/click'i yut
  if (!window._transitionGuardSet) {
    window._transitionGuardSet = true;
    document.addEventListener('touchstart', function(e) {
      if (window._pageTransitioning) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
    document.addEventListener('click', function(e) {
      if (window._pageTransitioning) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  }
  // Header'da kullanıcı adını ve avatarı göster
  const u = localStorage.getItem('doruk_login_user') || '';
  const el = document.getElementById('headerUserName');
  if (el) el.textContent = u.charAt(0).toUpperCase() + u.slice(1);
  const avatarEl = document.getElementById('headerAvatar');
  if (avatarEl) {
    avatarEl.textContent = u.charAt(0).toUpperCase();
    // Her kullanıcı için tutarlı renk (hash bazlı)
    var colors = [
      'linear-gradient(135deg,#0080ff,#00d4ff)',
      'linear-gradient(135deg,#7c3aed,#a855f7)',
      'linear-gradient(135deg,#059669,#10b981)',
      'linear-gradient(135deg,#dc2626,#f87171)',
      'linear-gradient(135deg,#d97706,#fbbf24)',
      'linear-gradient(135deg,#0891b2,#22d3ee)',
      'linear-gradient(135deg,#be185d,#f472b6)',
    ];
    var idx = 0;
    for (var i = 0; i < u.length; i++) idx += u.charCodeAt(i);
    avatarEl.style.background = colors[idx % colors.length];
  }

  // Admin ise header'da admin butonu göster
  var adminBtn = document.getElementById('adminPanelBtn');
  if (adminBtn) {
    adminBtn.style.display = (u.toLowerCase() === 'doruk') ? 'flex' : 'none';
  }
  // Kredi badge'ini göster (misafir veya kayıtlı)
  setTimeout(function() {
    var _u = localStorage.getItem('doruk_login_user') || '';
    var _misafir = window._misafirMi && window._misafirMi();
    if (_misafir) {
      if (typeof window._misafirKrediBannerGuncelle === 'function') window._misafirKrediBannerGuncelle();
    } else if (_u && _u.toLowerCase() !== 'doruk') {
      if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle();
    }
  }, 300);

  // ── CACHE'DEN SADECE % VE GRAFİK YÜKLE, FİYAT YÜKLEME ──
  // Fiyat her zaman taze API'den gelsin — eski cache fiyatı gösterilmesin.
  // Yüzdelik (chg_) ve sparkline cache'den anında görünsün, arkadan güncellenir.
  try {
    const cp = JSON.parse(localStorage.getItem('cache_cryptoPrices') || '{}');
    // Fiyatları (chg_ olmayan, _ts olmayan) kasıtlı olarak YÜKLEME — taze gelsin
    // Sadece chg_ (yüzde) verilerini belleğe al, renderGrid'de DOM'a yazılacak
    Object.keys(cp).forEach(function(s){
      if(s === '_ts') return;
      if(!s.startsWith('chg_')) return; // fiyat satırlarını atla
      // chg_ verilerini geçici bir yerde tut — renderGrid okuyacak
    });
    // Not: cryptoPrices kasıtlı boş bırakıldı → kartlar "···" gösterir → API'den taze fiyat gelir
  } catch(e) {}
  try {
    const gp = JSON.parse(localStorage.getItem('cache_gpData') || 'null');
    if(gp && gp.altin) { gpData.altin = gp.altin; gpData.doviz = gp.doviz; }
  } catch(e) {}
  // ── /FİYAT CACHE ──

  // Kullanıcıya özgü verileri temizle (cache_wl_* silinmez — kullanıcıya özel)
  localStorage.removeItem('c_v51'); // eski genel key temizle
  watchList = [];
  // NOT: ft_positions_v1 / wlt_positions artık burada silinmiyor.
  // ftLoad()/wltLoad() zaten önce localStorage'daki son bilinen veriyi yükleyip
  // ardından Firebase'den güncelliyor — burada silmek, Firebase okuması yavaş/
  // başarısız olduğunda pozisyonların boş görünmesine (aslında sunucuda kayıtlı
  // olsa bile) yol açıyordu.

  // Boş watchList ile renderGrid çağırma — watchListLoad cache'den anında dolduracak
  syncRates();

  // Splash bar yardımcısı — gerçek adımlara bağlı
  function _splashStep(pct, text) {
    var bar = document.getElementById('autoSplashBar');
    var msg = document.getElementById('autoSplashMsg');
    if (bar) { bar.style.transition = 'width 300ms ease'; bar.style.width = pct + '%'; }
    if (msg && text) msg.textContent = text;
  }

  // Firebase'den doğru kullanıcının verilerini yükle
  setTimeout(function() {
    _splashStep(40, 'LİSTE YÜKLENİYOR...');
    // Watchlist — Firebase'den gelince fiyatı bekle; grafikler görünür oldukça lazy-load edilir
    watchListLoad(function() {
      _splashStep(65, 'FİYATLAR ALINIYOR...');
      renderGrid();
      // Fiyatları paralel al; sparkline istekleri açılışı bekletmesin
      var cryptos = watchList.filter(function(w){ return w.type === 'crypto'; });
      if(!cryptos.length) {
        _splashStep(95, 'HAZIR!');
        setTimeout(function() { if(typeof onReady === 'function') onReady(); }, 200);
        return;
      }
      // Fiyat + yüzde hazır olduğunda uygulama açılabilir
      var pricePromises = cryptos.map(function(w) {
        return fetch('https://api.binance.com/api/v3/ticker/24hr?symbol='+w.id)
          .then(function(r){ return r.json(); })
          .then(function(d) {
            if(d && d.lastPrice) {
              cryptoPrices[w.id] = d.lastPrice;
              var np = parseFloat(d.lastPrice);
              var el = document.getElementById('p-'+w.id);
              if(el) el.textContent = formatCryptoPrice(np);
              if(d.priceChangePercent) updateCryptoChange(w.id, parseFloat(d.priceChangePercent));
              try {
                var allPrices = JSON.parse(localStorage.getItem('cache_cryptoPrices') || '{}');
                allPrices[w.id] = d.lastPrice;
                allPrices['chg_'+w.id] = d.priceChangePercent;
                allPrices._ts = Date.now();
                localStorage.setItem('cache_cryptoPrices', JSON.stringify(allPrices));
              } catch(e) {}
            }
          }).catch(function(){});
      });
      // Binance fiyatı için 5sn timeout — API yavaşsa splash takılmasın
      var _priceTimeout = new Promise(function(resolve) { setTimeout(resolve, 5000); });
      Promise.race([
        Promise.all(pricePromises),
        _priceTimeout
      ]).then(function() {
        _splashStep(95, 'HAZIR!');
        setTimeout(function() { if(typeof onReady === 'function') onReady(); }, 200);
      }).catch(function() {
        if(typeof onReady === 'function') onReady();
      });
    });
    // Strateji pozisyonları
    ftLoad(function() {
      ftRender();
      if (ftPositions.length) ftStartPnlRefresh();
      setTimeout(ftLoadSymbols, 3000);
    });
    // Cüzdan pozisyonları
    wltLoad(function() {
      if (document.getElementById('cuzdanPage') && document.getElementById('cuzdanPage').classList.contains('active')) {
        wltInit();
      }
    });
  }, 500);
}

window._loginGiris = async function() {
  const kullaniciRaw = (document.getElementById('girisKullanici').value || '').trim();
  const kullanici = kullaniciRaw.toLowerCase();
  const sifre = document.getElementById('girisŞifre').value || '';
  if (!kullanici || !sifre) { _loginErr('Tüm alanları doldurun'); return; }
  const btn = document.querySelector('#formGiris .login-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'GİRİŞ YAPILIYOR...'; }
  try {
    const hash = await _sha256(sifre);
    // Admin kontrolü — büyük/küçük harf duyarsız
    const ADMIN_NICK = 'Doruk';
    const ADMIN_HASH = '71a35a06b8e46be2ece764ba390207b3a8155d350d63332cab5d3a9cd661031d';
    if (kullaniciRaw === ADMIN_NICK || kullanici === ADMIN_NICK.toLowerCase()) {
      if (btn) { btn.disabled = false; btn.textContent = 'GİRİŞ YAP'; }
      if (hash !== ADMIN_HASH) { _loginErr('Şifre hatalı'); return; }
      // Firebase Auth'a admin hesabını bağla — tamamlanınca devam et
      var ADMIN_EMAIL = 'weptasarimlari@gmail.com';
      if (window.firebase && window.firebase.auth) {
        var auth = window.firebase.auth();
        auth.signInWithEmailAndPassword(ADMIN_EMAIL, sifre).then(function() {
          _loginSuccess(ADMIN_NICK);
        }).catch(function() {
          auth.createUserWithEmailAndPassword(ADMIN_EMAIL, sifre).then(function() {
            _loginSuccess(ADMIN_NICK);
          }).catch(function() {
            _loginSuccess(ADMIN_NICK);
          });
        });
      } else {
        _loginSuccess(ADMIN_NICK);
      }
      return;
    }
    const db = _loginDb();
    if (!db) {
      if (btn) { btn.disabled = false; btn.textContent = 'GİRİŞ YAP'; }
      _loginErr('Veritabanına bağlanılamadı. İnternet bağlantını kontrol et.'); return;
    }
    const kulKey = kullanici.replace(/[.#$/\[\]]/g,'_');
    db.ref('kullanicilar/' + kulKey).once('value', function(snap) {
      if (!snap.exists()) {
        if (btn) { btn.disabled = false; btn.textContent = 'GİRİŞ YAP'; }
        _loginErr('Kullanıcı bulunamadı'); return;
      }
      var userEmail = snap.val().email;
      var dbHash = snap.val().sifre;

      // ── GİRİŞ ÖNCESİ BAN KONTROLÜ ──
      // Şifreyi kontrol etmeden önce nick ban durumunu kontrol et
      db.ref('banlar/' + kulKey).once('value', function(banSnap) {
        if (banSnap.exists()) {
          if (btn) { btn.disabled = false; btn.textContent = 'GİRİŞ YAP'; }
          _loginErr('🚫 Hesabınız yasaklandı. Giriş yapamazsınız.');
          return;
        }
        // Ban yok — şifre kontrolüne geç
        _sifreKontrolEt();
      });

      function _sifreKontrolEt() {
      // Önce Firebase Auth ile giriş dene (şifre sıfırlandıysa bu çalışır)
      if (userEmail && window.firebase && window.firebase.auth) {
        var fbAuth = window.firebase.auth();
        fbAuth.signInWithEmailAndPassword(userEmail, sifre).then(function() {
          // Firebase Auth başarılı — DB'deki şifreyi de güncelle
          _sha256(sifre).then(function(newHash) {
            db.ref('kullanicilar/' + kulKey + '/sifre').set(newHash);
          });
          if (btn) { btn.disabled = false; btn.textContent = 'GİRİŞ YAP'; }
          _loginSuccess(kullanici);
        }).catch(function(authErr) {
          // Auth başarısız — DB hash ile kontrol et
          if (dbHash !== hash) {
            if (btn) { btn.disabled = false; btn.textContent = 'GİRİŞ YAP'; }
            _loginErr('Şifre hatalı'); return;
          }
          // DB şifresi doğru — Auth'a kaydet veya güncelle
          fbAuth.createUserWithEmailAndPassword(userEmail, sifre).catch(function(e) {
            if (e.code === 'auth/email-already-in-use') {
              // Auth'ta var ama farklı şifre — şifre güncelle
              fbAuth.sendPasswordResetEmail(userEmail).catch(function(){});
            }
          });
          if (btn) { btn.disabled = false; btn.textContent = 'GİRİŞ YAP'; }
          _loginSuccess(kullanici);
        });
      } else {
        // Firebase yoksa sadece DB ile kontrol et
        if (dbHash !== hash) {
          if (btn) { btn.disabled = false; btn.textContent = 'GİRİŞ YAP'; }
          _loginErr('Şifre hatalı'); return;
        }
        if (btn) { btn.disabled = false; btn.textContent = 'GİRİŞ YAP'; }
        _loginSuccess(kullanici);
      }
      } // _sifreKontrolEt sonu
    }, function(err) {
      if (btn) { btn.disabled = false; btn.textContent = 'GİRİŞ YAP'; }
      _loginErr('Bağlantı hatası: ' + err.message);
    });
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = 'GİRİŞ YAP'; }
    _loginErr('Hata: ' + e.message);
  }
};

window._loginKayit = async function() {
  const kullanici = (document.getElementById('kayitKullanici').value || '').trim().toLowerCase();
  const email = (document.getElementById('kayitEmail').value || '').trim().toLowerCase();
  const sifre = document.getElementById('kayitŞifre').value || '';
  const sifre2 = document.getElementById('kayitŞifreTekrar').value || '';
  if (!kullanici || !email || !sifre || !sifre2) { _loginErr('Tüm alanları doldurun'); return; }
  if (kullanici.length < 3) { _loginErr('Kullanıcı adı en az 3 karakter'); return; }
  var _emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!_emailRegex.test(email)) { _loginErr('Geçerli bir e-posta adresi girin (örn: ad@gmail.com)'); return; }
  if (sifre.length < 6) { _loginErr('Şifre en az 6 karakter'); return; }
  if (sifre !== sifre2) { _loginErr('Şifreler eşleşmiyor'); return; }

  // Fake/geçici e-posta alan adı kontrolü
  const _fakeMailDomains = [
    'mailinator.com','tempmail.com','guerrillamail.com','throwam.com','sharklasers.com',
    'guerrillamailblock.com','grr.la','guerrillamail.info','guerrillamail.biz','guerrillamail.de',
    'guerrillamail.net','guerrillamail.org','spam4.me','yopmail.com','yopmail.fr','cool.fr.nf',
    'jetable.fr.nf','nospam.ze.tc','nomail.xl.cx','mega.zik.dj','speed.1s.fr','courriel.fr.nf',
    'moncourrier.fr.nf','monemail.fr.nf','monmail.fr.nf','dispostable.com','mailnull.com',
    'spamgourmet.com','trashmail.at','trashmail.io','trashmail.me','trashmail.net','trashmail.org',
    'discard.email','spamhere.com','getairmail.com','filzmail.com','throwam.com','maildrop.cc',
    'spambox.us','fakeinbox.com','mailexpire.com','spamfree24.org','mailscrap.com',
    'spammotel.com','spam.la','tempr.email','discard.cf','crap.handcrafted.jp',
    'spamgob.com','spamhereplease.com','tempinbox.com','tempe-mail.com','spamex.com',
    'trashmail.com','mailnew.com','getonemail.net','discardmail.com','maildrop.cc',
    'burnermail.io','throwaway.email','tmpmail.org','tmpmail.net','tmp-mail.org',
    'spamwc.cf','spamwc.de','spamwc.ga','spamwc.gq','spamwc.ml',
    'getnada.com','nada.email','tmail.com','10minutemail.com','10minutemail.net',
    'minutemailbox.com','mailmetrash.com','20minutemail.com','mobi-mail.de'
  ];
  var _emailDomain = email.split('@')[1] || '';
  if (_fakeMailDomains.indexOf(_emailDomain) !== -1) {
    _loginErr('Geçici veya sahte e-posta adresleri kabul edilmiyor. Lütfen gerçek bir e-posta girin.');
    return;
  }

  const btn = document.querySelector('#formKayit .login-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'KAYIT YAPILIYOR...'; }
  try {
    const hash = await _sha256(sifre);
    const db = _loginDb();
    const kulKey = kullanici.replace(/[.#$/\[\]]/g,'_');
    db.ref('kullanicilar/' + kulKey).once('value', function(snap) {
      if (snap.exists()) {
        if (btn) { btn.disabled = false; btn.textContent = 'KAYIT OL'; }
        _loginErr('Bu kullanıcı adı alınmış'); return;
      }
      // E-posta daha önce kayıtlı mı kontrol et
      var _emailKey = email.replace(/[.#$\[\]@\/]/g, '_');
      db.ref('email_index/' + _emailKey).once('value', function(emailSnap) {
        if (emailSnap.exists()) {
          if (btn) { btn.disabled = false; btn.textContent = 'KAYIT OL'; }
          _loginErr('Bu e-posta adresi zaten kayıtlı'); return;
        }
      // Önce Firebase Auth'a kaydet — şifre sıfırlama buraya bağlı
      function authKaydetVeDevam() {
        db.ref('kullanicilar/' + kulKey).set({ kullanici, email, sifre: hash, kayit: Date.now() }).then(function() {
          // E-posta index'ini kaydet (tekrar kayıt engellemek için)
          db.ref('email_index/' + _emailKey).set({ kullanici: kullanici, kayit: Date.now() });
          // force_logout ve deleted_accounts temizle — admin silmiş olabilir, yeni kayıtta engel çıkarmasın
          db.ref('force_logout/' + kulKey).remove().catch(function(){});
          db.ref('deleted_accounts/' + kulKey).remove().catch(function(){});
          if (btn) { btn.disabled = false; btn.textContent = 'KAYIT OL'; }
          const ok = document.getElementById('loginOk');
          if (ok) { ok.textContent = '✓ Kayıt başarılı! Giriş yapılıyor...'; ok.style.display = 'block'; }
          document.getElementById('loginErr').textContent = '';
          setTimeout(function() { _loginSuccess(kullanici); }, 1200);
        }).catch(function(e) {
          if (btn) { btn.disabled = false; btn.textContent = 'KAYIT OL'; }
          _loginErr('Hata: ' + e.message);
        });
      }
      if (window.firebase && window.firebase.auth) {
        window.firebase.auth().createUserWithEmailAndPassword(email, sifre)
          .then(authKaydetVeDevam)
          .catch(function(authErr) {
            if (authErr.code === 'auth/email-already-in-use') {
              // Auth'ta eski kayıt var (admin silmiş olabilir) — direkt DB'ye yaz
              authKaydetVeDevam();
            } else if (authErr.code === 'auth/invalid-email') {
              if (btn) { btn.disabled = false; btn.textContent = 'KAYIT OL'; }
              _loginErr('Geçersiz e-posta adresi'); return;
            } else if (authErr.code === 'auth/operation-not-allowed') {
              authKaydetVeDevam();
            } else {
              if (btn) { btn.disabled = false; btn.textContent = 'KAYIT OL'; }
              _loginErr('Kayıt başarısız: ' + (authErr.message || 'Bilinmeyen hata'));
            }
          });
      } else {
        authKaydetVeDevam();
      }
      }); // emailSnap sonu
    }); // kulKey snap sonu
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = 'KAYIT OL'; }
    _loginErr('Hata: ' + e.message);
  }
};


window._sifremiUnuttumAc = function() {
  var popup = document.getElementById('sifremiUnuttumPopup');
  var input = document.getElementById('unuttumKullanici');
  var err = document.getElementById('unuttumErr');
  var ok = document.getElementById('unuttumOk');
  // Giriş alanındaki kullanıcı adını otomatik doldur
  var girisKullanici = (document.getElementById('girisKullanici').value || '').trim();
  if (input) input.value = girisKullanici;
  if (err) { err.textContent=''; err.style.display='none'; }
  if (ok) { ok.textContent=''; ok.style.display='none'; }
  if (popup) { popup.style.display='flex'; setTimeout(function(){ if(input) input.focus(); }, 100); }
};

window._sifremiUnuttumKapat = function() {
  var popup = document.getElementById('sifremiUnuttumPopup');
  if (popup) popup.style.display='none';
};

window._sifremiUnuttumGonder = function() {
  var kullaniciRaw = (document.getElementById('unuttumKullanici').value || '').trim();
  var kullanici = kullaniciRaw.toLowerCase();
  var err = document.getElementById('unuttumErr');
  var ok = document.getElementById('unuttumOk');
  var btn = document.getElementById('unuttumBtn');

  function showErr(msg) { if(err){ err.textContent=msg; err.style.display='block'; } if(ok) ok.style.display='none'; }
  function showOk(msg) { if(ok){ ok.textContent=msg; ok.style.display='block'; } if(err) err.style.display='none'; }

  if (!kullanici) { showErr('Kullanıcı adını girin'); return; }
  if (btn) { btn.disabled=true; btn.textContent='⏳ Gönderiliyor...'; }

  // Giriş inputuna da yaz (eski fonksiyon için)
  var girisInput = document.getElementById('girisKullanici');
  if (girisInput) girisInput.value = kullaniciRaw;

  var FIREBASE_CONFIG = { apiKey:'AIzaSyCZk-OgjuuO8t4SNary0L2C8WyhyC8IWMA', authDomain:'doruk-sohbet.firebaseapp.com', databaseURL:'https://doruk-sohbet-default-rtdb.firebaseio.com', projectId:'doruk-sohbet', storageBucket:'doruk-sohbet.firebasestorage.app', messagingSenderId:'155992007314', appId:'1:155992007314:web:3d7f16edd31774f60f3c4b' };

  function getFirebaseDb() {
    if (!window.firebase) return null;
    if (!window.firebase.apps || !window.firebase.apps.length) {
      window.firebase.initializeApp(FIREBASE_CONFIG);
    }
    return window.firebase.database();
  }

  function devamEt() {
    // Admin kontrolü
    if (kullaniciRaw === 'Doruk' || kullanici === 'doruk') {
      _sifreSifirlamaGonder('weptasarimlari@gmail.com', function(basarili, mesaj) {
        if (btn) { btn.disabled=false; btn.textContent='📧 SIFIRLA'; }
        if (basarili) { showOk(mesaj); setTimeout(window._sifremiUnuttumKapat, 3000); }
        else showErr(mesaj);
      });
      return;
    }

    var db = getFirebaseDb();
    if (!db) { showErr('Bağlantı hatası'); if(btn){btn.disabled=false;btn.textContent='📧 SIFIRLA';} return; }
    var kulKey = kullanici.replace(/[.#$\/\[\]]/g,'_');
    db.ref('kullanicilar/' + kulKey).once('value', function(snap) {
      if (!snap.exists()) { showErr('Kullanıcı bulunamadı'); if(btn){btn.disabled=false;btn.textContent='📧 SIFIRLA';} return; }
      var email = snap.val().email;
      if (!email) { showErr('Bu hesaba e-posta bağlı değil'); if(btn){btn.disabled=false;btn.textContent='📧 SIFIRLA';} return; }
      _sifreSifirlamaGonder(email, function(basarili, mesaj) {
        if (btn) { btn.disabled=false; btn.textContent='📧 SIFIRLA'; }
        if (basarili) { showOk(mesaj); setTimeout(window._sifremiUnuttumKapat, 3000); }
        else showErr(mesaj);
      });
    });
  }

  // Firebase yüklü değilse scriptleri yükle, sonra devam et
  if (!window.firebase) {
    function loadFbScript(src, cb) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = cb;
      s.onerror = function() { showErr('Bağlantı hatası'); if(btn){btn.disabled=false;btn.textContent='📧 SIFIRLA';} };
      document.head.appendChild(s);
    }
    loadFbScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js', function() {
      loadFbScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js', function() {
        loadFbScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js', function() {
          devamEt();
        });
      });
    });
  } else {
    devamEt();
  }
};

function _sifreSifirlamaGonder(email, callback) {
  var FIREBASE_CONFIG = { apiKey:'AIzaSyCZk-OgjuuO8t4SNary0L2C8WyhyC8IWMA', authDomain:'doruk-sohbet.firebaseapp.com', databaseURL:'https://doruk-sohbet-default-rtdb.firebaseio.com', projectId:'doruk-sohbet', storageBucket:'doruk-sohbet.firebasestorage.app', messagingSenderId:'155992007314', appId:'1:155992007314:web:3d7f16edd31774f60f3c4b' };

  function doSend() {
    try {
      if (!window.firebase.apps || !window.firebase.apps.length) {
        window.firebase.initializeApp(FIREBASE_CONFIG);
      }
      var auth = window.firebase.auth();
      auth.sendPasswordResetEmail(email).then(function() {
        callback(true, '📧 Mail gönderildi: ' + email);
      }).catch(function(e) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email') {
          auth.createUserWithEmailAndPassword(email, 'Tmp' + Math.random().toString(36).slice(2,10) + '1!').then(function() {
            auth.sendPasswordResetEmail(email).then(function() {
              callback(true, '📧 Mail gönderildi: ' + email);
            }).catch(function(e2) { callback(false, 'Hata: ' + e2.message); });
          }).catch(function(e2) { callback(false, 'Hata: ' + e2.message); });
        } else {
          callback(false, 'Hata: ' + e.message);
        }
      });
    } catch(err) {
      callback(false, 'Hata: ' + err.message);
    }
  }

  function loadAuthScript(cb) {
    var s = document.createElement('script');
    s.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js';
    s.onload = cb;
    s.onerror = function() { callback(false, 'Bağlantı hatası'); };
    document.head.appendChild(s);
  }

  if (window.firebase && window.firebase.auth) {
    doSend();
  } else if (window.firebase && !window.firebase.auth) {
    loadAuthScript(doSend);
  } else {
    var s2 = document.createElement('script');
    s2.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
    s2.onload = function() { loadAuthScript(doSend); };
    s2.onerror = function() { callback(false, 'Bağlantı hatası'); };
    document.head.appendChild(s2);
  }
}

window._sifremiUnuttum = function() {
  const kullaniciRaw = (document.getElementById('girisKullanici').value || '').trim();
  const kullanici = kullaniciRaw.toLowerCase();
  if (!kullanici) { _loginErr('Önce kullanıcı adını girin'); return; }

  const ok = document.getElementById('loginOk');
  _loginErr('');
  if (ok) { ok.textContent = '⏳ Kontrol ediliyor...'; ok.style.display = 'block'; }

  var FIREBASE_CONFIG = { apiKey:'AIzaSyCZk-OgjuuO8t4SNary0L2C8WyhyC8IWMA', authDomain:'doruk-sohbet.firebaseapp.com', databaseURL:'https://doruk-sohbet-default-rtdb.firebaseio.com', projectId:'doruk-sohbet' };

  function getAuth() {
    if (!window.firebase.apps || !window.firebase.apps.length) {
      window.firebase.initializeApp(FIREBASE_CONFIG);
    }
    return window.firebase.auth();
  }

  function sifirlamaGonder(email) {
    var auth = getAuth();
    var tempSifre = 'Tmp' + Math.random().toString(36).slice(2,10) + '1!';
    // Önce direkt reset dene
    auth.sendPasswordResetEmail(email).then(function() {
      if (ok) { ok.textContent = '📧 Şifre sıfırlama e-postası gönderildi: ' + email; ok.style.display = 'block'; }
    }).catch(function(e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email') {
        // Auth'ta yok — oluştur sonra reset at
        auth.createUserWithEmailAndPassword(email, tempSifre).then(function() {
          auth.sendPasswordResetEmail(email).then(function() {
            if (ok) { ok.textContent = '📧 Şifre sıfırlama e-postası gönderildi: ' + email; ok.style.display = 'block'; }
          }).catch(function(e2) { _loginErr('Hata: ' + e2.message); if(ok) ok.style.display='none'; });
        }).catch(function(e2) { _loginErr('Hata: ' + e2.message); if(ok) ok.style.display='none'; });
      } else {
        _loginErr('Hata: ' + e.message); if(ok) ok.style.display='none';
      }
    });
  }

  function devamEt() {
    // Admin
    if (kullaniciRaw === 'Doruk' || kullanici === 'doruk') {
      sifirlamaGonder('weptasarimlari@gmail.com'); return;
    }
    // DB'den email al
    var db = _loginDb();
    if (!db) { _loginErr('Veritabanına bağlanılamadı'); if(ok) ok.style.display='none'; return; }
    var kulKey = kullanici.replace(/[.#$\/\[\]]/g, '_');
    db.ref('kullanicilar/' + kulKey).once('value', function(snap) {
      if (!snap.exists()) { _loginErr('Kullanıcı bulunamadı'); if(ok) ok.style.display='none'; return; }
      var email = snap.val().email;
      if (!email) { _loginErr('Bu hesaba e-posta bağlı değil'); if(ok) ok.style.display='none'; return; }
      sifirlamaGonder(email);
    });
  }

  // Firebase app ve auth scriptlerini garantili yükle
  function yukleSonraDevamEt() {
    if (!window.firebase || !window.firebase.initializeApp) {
      var s1 = document.createElement('script');
      s1.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
      s1.onload = function() { yukleSonraDevamEt(); };
      s1.onerror = function() { _loginErr('Bağlantı hatası. İnternet bağlantınızı kontrol edin.'); if(ok) ok.style.display='none'; };
      document.head.appendChild(s1); return;
    }
    if (!window.firebase.auth) {
      var s2 = document.createElement('script');
      s2.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js';
      s2.onload = function() { devamEt(); };
      s2.onerror = function() { _loginErr('Bağlantı hatası. İnternet bağlantınızı kontrol edin.'); if(ok) ok.style.display='none'; };
      document.head.appendChild(s2); return;
    }
    devamEt();
  }

  yukleSonraDevamEt();
};

window._cikisYap = function() {
  // Sadece ana sayfadayken çalış — modülden yanlışlıkla tetiklenmesin
  var activePage = document.querySelector('.page.active');
  var activeId = activePage ? activePage.id : '';
  if (activeId && activeId !== 'homePage') return;

  var kullanici = localStorage.getItem('doruk_login_user');
  var nickKey = kullanici ? kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_') : null;

  function _gercekCikis(silindi) {
    if (kullanici) _loginLogKaydet(kullanici, 'cikis');
    localStorage.removeItem('doruk_login_user');
    localStorage.removeItem('doruk_misafir');
    localStorage.removeItem('doruk_misafir_nick');
    localStorage.removeItem('doruk_misafir_kredi');
    localStorage.removeItem('doruk_sohbet_nick');
    if (window._sohbetDBSifirla) window._sohbetDBSifirla();
    const appContainer = document.getElementById('appContainer');
    if (appContainer) { appContainer.style.visibility = 'hidden'; appContainer.style.opacity = '0'; }
    const screen = document.getElementById('loginScreen');
    if (screen) screen.style.display = 'flex';
    // Hesap silindiyse giriş ekranında uyarı göster
    if (silindi) {
      var loginErr = document.getElementById('loginErr');
      if (loginErr) loginErr.textContent = '🗑️ Hesabınız silindi.';
    }
    setTimeout(_loginKayitliYukle, 50);
  }

  // Firebase'de deleted_accounts kaydı var mı kontrol et
  if (nickKey) {
    var db = (typeof _loginDb === 'function') ? _loginDb() : null;
    if (db) {
      db.ref('deleted_accounts/' + nickKey).once('value', function(snap) {
        _gercekCikis(snap.exists());
      }, function() { _gercekCikis(false); });
      return;
    }
  }
  _gercekCikis(false);
};

// Fiyatları mümkün olan en erken anda çekmeye başla
// ── Auto-login Splash Yönetimi ──
(function() {
  var _splashProgress = 0;
  var _splashTimer = null;

  window._autoSplashGoster = function() {
    var el = document.getElementById('autoLoginSplash');
    if (!el) return;
    el.style.display = 'flex';
    el.style.opacity = '1';
    _splashProgress = 0;
    _animateSplashBar();
  };

  function _animateSplashBar() {
    var bar = document.getElementById('autoSplashBar');
    var msg = document.getElementById('autoSplashMsg');
    if (!bar) return;
    _splashProgress = 0;
    var steps = [
      { pct: 25,  ms: 350,  text: 'BAĞLANIYOR...' },
      { pct: 55,  ms: 500,  text: 'VERİLER YÜKLENIYOR...' },
      { pct: 80,  ms: 500,  text: 'HAZIRLANIYOR...' },
    ];
    var i = 0;
    function next() {
      if (i >= steps.length) return;
      var s = steps[i++];
      if (msg) msg.textContent = s.text;
      bar.style.transition = 'width ' + s.ms + 'ms ease';
      bar.style.width = s.pct + '%';
      _splashTimer = setTimeout(next, s.ms + 80);
    }
    next();
  }

  window._autoSplashGizle = function() {
    if (_splashTimer) { clearTimeout(_splashTimer); _splashTimer = null; }
    var bar = document.getElementById('autoSplashBar');
    var msg = document.getElementById('autoSplashMsg');
    var el  = document.getElementById('autoLoginSplash');
    if (!el) return;
    // Önce %100'e tamamla
    if (bar) { bar.style.transition = 'width 250ms ease'; bar.style.width = '100%'; }
    if (msg) msg.textContent = 'HOŞ GELDİN!';
    setTimeout(function() {
      el.style.opacity = '0';
      setTimeout(function() { el.style.display = 'none'; }, 460);
    }, 280);
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  const loginUser = localStorage.getItem('doruk_login_user');
  const appContainer = document.getElementById('appContainer');
  if (loginUser) {
    // Önce deleted_accounts kontrolü yap
    var _loginKey = loginUser.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
    function _autoLoginBaslat() {
      // Oturum açık → splash göster, veriler hazır olunca kapat
      window._autoSplashGoster();
      // appContainer splash arkasında hazırlanır — veriler gelince splash kapanır
      if (appContainer) { appContainer.style.visibility = 'visible'; appContainer.style.opacity = '1'; }

      // Fallback: en fazla 4sn bekle — API cevap vermese bile aç
      var _splashKapatildi = false;
      var _splashFallback = setTimeout(function() {
        if (!_splashKapatildi) { _splashKapatildi = true; window._autoSplashGizle(); }
      }, 4000);
      function _splashKapat() {
        if (!_splashKapatildi) { _splashKapatildi = true; clearTimeout(_splashFallback); window._autoSplashGizle(); }
        // DORUK yazısı animasyonu — splash kapandıktan sonra
        setTimeout(function(){
          var _el = document.getElementById('headerTitle');
          if(!_el || _el.textContent.trim()!=='DORUK') return;
          _el.style.display='inline-block';
          _el.style.transformOrigin='left center';
          _el.style.animation='dorukKapanis 0.35s cubic-bezier(0.4,0,0.6,1) forwards';
          setTimeout(function(){
            _el.style.transformOrigin='right center';
            _el.style.animation='dorukAcilis 0.4s cubic-bezier(0.2,0,0.4,1) forwards';
            setTimeout(function(){ _el.style.animation=''; },420);
          },370);
        },500);
      }

      // _globalBanDinle'yi Firebase hazır olunca hemen kur — onReady'yi bekleme
      (function _banDinleHazirOlunca() {
        var db = (typeof _loginDb === 'function') ? _loginDb() : null;
        if (db) {
          _globalBanDinle(loginUser);
        } else {
          setTimeout(_banDinleHazirOlunca, 200);
        }
      })();

      // Misafir ise Firebase'den taze kredi çek ve listener kur
      var _isMisafir = localStorage.getItem('doruk_misafir') === '1';
      if (_isMisafir && typeof window._misafirKrediListenerKur === 'function') {
        var _autoNick = localStorage.getItem('doruk_misafir_nick');
        if (_autoNick) {
          window._misafirKrediListenerKur(_autoNick);
          var _autoDb = (typeof _loginDb === 'function') ? _loginDb() : null;
          if (_autoDb) {
            var _autoKey = _autoNick.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
            _autoDb.ref('misafir_kredi/' + _autoKey).once('value', function(snap) {
              if (!snap.exists()) return;
              var d = snap.val();
              var k = d.kredi !== undefined ? parseInt(d.kredi) : parseInt(d);
              if (isNaN(k)) return;
              localStorage.setItem('doruk_misafir_kredi', String(k));
              if (typeof window._misafirKrediBannerGuncelle === 'function') window._misafirKrediBannerGuncelle(k);
            });
          }
        }
      }
      // Kayıtlı kullanıcı ise taze kredi çek + günlük 10 kredi ver
      if (!_isMisafir && loginUser && loginUser.toLowerCase() !== 'doruk') {
        (function _startupKredi() {
          var _kDb = (typeof _loginDb === 'function') ? _loginDb() : null;
          if (!_kDb) { setTimeout(_startupKredi, 300); return; }
          var _kKey = loginUser.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
          if (typeof window._kullaniciKrediListenerKur === 'function') window._kullaniciKrediListenerKur(loginUser);
          _kDb.ref('kullanicilar/' + _kKey).once('value', function(kulSnap) {
            if (!kulSnap.exists()) {
              _kDb.ref('kullanici_kredi/' + _kKey).remove().catch(function(){});
              return;
            }
          });
          _kDb.ref('kullanici_kredi/' + _kKey).once('value', function(snap) {
            var kredi;
            if (snap.exists()) {
              var d = snap.val();
              kredi = d.kredi !== undefined ? parseInt(d.kredi) : parseInt(d);
              if (isNaN(kredi)) kredi = 0;
              window._sunucuSaatiIleKontrolEt(d.son_gunluk_hediye, function(hediyelenebilir3) {
                if (hediyelenebilir3) {
                  window._gunlukHediyeBekleyenKey = _kKey;
                  window._gunlukHediyeBekleyenDb = _kDb;
                  setTimeout(function() {
                    if (typeof window._gunlukHediyeGoster === 'function') window._gunlukHediyeGoster();
                  }, 2000);
                }
              });
            } else {
              kredi = 200;
              _kDb.ref('kullanici_kredi/' + _kKey).set({ kredi: 200, ilkGiris: Date.now() });
              window._gunlukHediyeBekleyenKey = _kKey;
              window._gunlukHediyeBekleyenDb = _kDb;
              setTimeout(function() {
                if (typeof window._gunlukHediyeGoster === 'function') window._gunlukHediyeGoster();
              }, 2000);
            }
            localStorage.setItem('doruk_kullanici_kredi', String(kredi));
            if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle(kredi);
          });
        })();
        setTimeout(function() {
          if (typeof window._adminHediyeListenerKur === 'function') window._adminHediyeListenerKur(loginUser);
        }, 1800);
      }

      // Veriler hazır olunca splash kapat
      _initApp(_splashKapat);
    } // _autoLoginBaslat sonu

    // Uygulamayı hemen başlat — deleted_accounts kontrolü arka planda
    _autoLoginBaslat();

    // deleted_accounts kontrolü arka planda — sadece kayıtlı normal kullanıcılar için
    // Admin (Doruk) ve misafirler bu kontrolden muaf
    var _isMisafirCheck = localStorage.getItem('doruk_misafir') === '1';
    if (!_isMisafirCheck && loginUser && loginUser.toLowerCase() !== 'doruk') {
      (function _deletedKontrolArka() {
        var _db = (typeof _loginDb === 'function') ? _loginDb() : null;
        if (!_db) { setTimeout(_deletedKontrolArka, 500); return; }
        _db.ref('deleted_accounts/' + _loginKey).once('value', function(snap) {
          if (!snap.exists()) return;
          // Hesap silinmiş — oturumu kapat
          localStorage.removeItem('doruk_login_user');
          localStorage.removeItem('doruk_misafir');
          localStorage.removeItem('doruk_misafir_nick');
          localStorage.removeItem('doruk_misafir_kredi');
          var appEl = document.getElementById('appContainer');
          if (appEl) { appEl.style.visibility = 'hidden'; appEl.style.opacity = '0'; }
          var sp = document.getElementById('autoLoginSplash');
          if (sp) { sp.style.opacity = '0'; sp.style.display = 'none'; }
          var sc = document.getElementById('loginScreen');
          if (sc) sc.style.display = 'flex';
          var er = document.getElementById('loginErr');
          if (er) er.textContent = '🗑️ Hesabınız silindi.';
          setTimeout(_loginKayitliYukle, 50);
        }, function() { /* Firebase hatası — sessizce geç */ });
      })();
    }
  } else {
    // Oturum yok → splash'ı hemen gizle, login ekranını göster
    var splashEl = document.getElementById('autoLoginSplash');
    if (splashEl) { splashEl.style.opacity = '0'; splashEl.style.display = 'none'; }
    const screen = document.getElementById('loginScreen');
    if (screen) screen.style.display = 'flex';
    setTimeout(_loginKayitliYukle, 50);
  }
});

// Fallback: 4 saniyede kapat

window.onload = function() {
  if(window.lucide) lucide.createIcons();
  wakeLockAktifEt();

  window._syncRatesInterval = setInterval(syncRates, 120000);

  // Widget'lar — 100ms sonra başlat, sayfa önce render olsun
  setTimeout(() => {
    wWidgetsInit();
    borsaBandiInit();
    borsaBandiGuncelle();
    window._borsaInterval = setInterval(borsaBandiGuncelle, 120000);
    glInit();
    window._glFetchInterval = setInterval(glFetch, 120000);
  }, 100);

};

function initModuleDrag() {
  const grid = document.getElementById('navModuleGrid');
  if (!grid) return;

  // Her modüle data-mod attribute ekle
  Array.from(grid.children).forEach(el => {
    const match = (el.getAttribute('onclick') || '').match(/goToPage\('(\w+)'\)/);
    if (match) el.setAttribute('data-mod', match[1]);
  });

  // localStorage'dan sırayı yükle
  try {
    const saved = localStorage.getItem('c_mod_order');
    if (saved) {
      const order = JSON.parse(saved).filter(Boolean);
      // Kayıtlı sıradaki elemanları sona taşı
      order.forEach(key => {
        const el = grid.querySelector('[data-mod="' + key + '"]');
        if (el) grid.appendChild(el);
      });
    }
  } catch(e) { localStorage.removeItem('c_mod_order'); }

  function saveOrder() {
    const order = Array.from(grid.children)
      .map(el => el.getAttribute('data-mod'))
      .filter(Boolean);
    localStorage.setItem('c_mod_order', JSON.stringify(order));
  }

  // --- Drag state ---
  let clone = null, src = null, dragging = false;

  function cleanup() {
    if (clone) { clone.remove(); clone = null; }
    if (src) src.classList.remove('dragging');
    Array.from(grid.children).forEach(i => i.classList.remove('drag-over'));
    src = null;
    dragging = false;
  }

  Array.from(grid.children).forEach(item => {

    item.addEventListener('touchstart', e => {
      cleanup(); // Önceki yarım kalan drag'i temizle
      src = item;
      dragging = false;

      item._lp = setTimeout(() => {
        dragging = true;
        if (navigator.vibrate) navigator.vibrate(40); // titreşim geri bildirimi
        const r = item.getBoundingClientRect();
        clone = item.cloneNode(true);
        clone.style.cssText =
          'position:fixed;left:'+r.left+'px;top:'+r.top+'px;'+
          'width:'+r.width+'px;height:'+r.height+'px;'+
          'opacity:0.9;z-index:9999;pointer-events:none;'+
          'border-radius:18px;transition:none;'+
          'display:flex;flex-direction:column;'+
          'justify-content:center;align-items:center;'+
          'background:linear-gradient(145deg,#080e18,#050c1a);'+
          'border:1.5px solid rgba(0,212,255,0.32);'+
          'box-shadow:0 0 24px rgba(0,212,255,0.18);';
        document.body.appendChild(clone);
        if(window.lucide) lucide.createIcons();
        item.classList.add('dragging');
      }, 400);
    }, {passive: true});

    item.addEventListener('touchmove', e => {
      clearTimeout(item._lp);
      if (!dragging || !clone) return;
      e.preventDefault();

      const t = e.touches[0];
      clone.style.left = (t.clientX - clone.offsetWidth  / 2) + 'px';
      clone.style.top  = (t.clientY - clone.offsetHeight / 2) + 'px';

      // Hangi modülün üzerindeyiz?
      Array.from(grid.children).forEach(i => i.classList.remove('drag-over'));
      clone.style.visibility = 'hidden';
      const under = document.elementFromPoint(t.clientX, t.clientY);
      clone.style.visibility = '';
      const target = under && under.closest('.nav-mod-item');
      if (target && target !== src) target.classList.add('drag-over');

    }, {passive: false});

    function onEnd(e) {
      clearTimeout(item._lp);

      if (dragging && clone && e.changedTouches) {
        const t = e.changedTouches[0];
        clone.style.visibility = 'hidden';
        const under = document.elementFromPoint(t.clientX, t.clientY);
        clone.style.visibility = '';
        const target = under && under.closest('.nav-mod-item');

        if (target && target !== src) {
          const all = Array.from(grid.children);
          const fi  = all.indexOf(src);
          const ti  = all.indexOf(target);
          if (fi !== -1 && ti !== -1) {
            if (fi < ti) grid.insertBefore(src, target.nextSibling);
            else         grid.insertBefore(src, target);
            saveOrder();
          }
        }
      }
      cleanup();
    }

    item.addEventListener('touchend',   onEnd);
    item.addEventListener('touchcancel', onEnd); // iptal olursa da temizle
  });
}
