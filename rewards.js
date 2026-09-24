/* Doruk module: rewards.js */
/* ---- extracted inline script ---- */


// ── GÜNLÜK HEDİYE SİSTEMİ ──

// ===== SUNUCU SAATİ BAZLI HEDİYE KONTROL =====
// TR saatine göre gün string'i döndürür (UTC+3)
window._trGunStr = function(timestamp) {
  var d = new Date(timestamp + 3 * 3600 * 1000); // UTC+3
  return d.toUTCString().slice(0, 16); // "Mon, 01 Jan 2026" formatında gün
};

window._sunucuSaatiIleKontrolEt = function(son_gunluk_hediye, callback) {
  var _db = (typeof _loginDb === 'function') ? _loginDb() : null;
  if (!_db) { callback(false); return; }
  // Firebase'e anlık bir timestamp yaz ve geri oku — gerçek sunucu saatini al
  var sunucuZamani = Date.now() + (window._firebaseServerOffset || 0);
  var shTs = son_gunluk_hediye || 0;
  if (shTs > 0 && shTs >= sunucuZamani) { callback(false); return; }
  var sunucuGun = window._trGunStr(sunucuZamani);
  var shGun = shTs ? window._trGunStr(shTs) : '';
  callback(shGun !== sunucuGun);
};
// ===== / SUNUCU SAATİ BAZLI HEDİYE KONTROL =====
window._gunlukHediyeBekleyen = false; // kredi verildi ama henüz alınmadı

// Firebase sunucu saatini çek — cihaz saati hilesini önler
window._firebaseServerOffset = 0;
(function _sunucuSaatiAl() {
  try {
    var _db = (typeof _loginDb === 'function') ? _loginDb() : null;
    if (!_db) { setTimeout(_sunucuSaatiAl, 1000); return; }
    _db.ref('/.info/serverTimeOffset').on('value', function(snap) {
      window._firebaseServerOffset = snap.val() || 0;
    });
  } catch(e) { setTimeout(_sunucuSaatiAl, 1000); }
})();
window._gunlukHediyeKrediRef = null;
window._gunlukHediyeKrediVal = 0;

window._ekranKonfetiBaslat = function() {
  var renkler = ['#f59e0b','#fbbf24','#34d399','#60a5fa','#f472b6','#a78bfa','#fb7185','#4ade80','#facc15','#38bdf8'];
  var sekiller = ['50%', '2px', '0'];
  var adet = 80;
  for (var i = 0; i < adet; i++) {
    (function(i) {
      setTimeout(function() {
        var k = document.createElement('div');
        k.className = 'ekran-konfeti';
        var w = 7 + Math.random() * 9;
        var h = 7 + Math.random() * 9;
        k.style.width = w + 'px';
        k.style.height = h + 'px';
        k.style.left = (Math.random() * 100) + 'vw';
        k.style.top = '-20px';
        k.style.background = renkler[Math.floor(Math.random() * renkler.length)];
        k.style.borderRadius = sekiller[Math.floor(Math.random() * sekiller.length)];
        var sure = 1.4 + Math.random() * 1.8;
        k.style.animation = 'ekranKonfetiDus ' + sure + 's ease-in forwards';
        document.body.appendChild(k);
        setTimeout(function() { if (k.parentNode) k.parentNode.removeChild(k); }, sure * 1000 + 100);
      }, i * 30);
    })(i);
  }
  // Konfetiyle birlikte gerçek havai fişek patlamaları da başlasın
  if (typeof window._ekranHavaiFisekBaslat === 'function') window._ekranHavaiFisekBaslat();
};

// ─ Havai Fişek: yükselen roket + ışıklı patlama + radyal parçacıklar ─
window._havaiFisekPatlat = function(x, y, renk) {
  // Flaş (patlama anındaki parlama)
  var flash = document.createElement('div');
  flash.className = 'fw-flash';
  flash.style.left = x + 'px';
  flash.style.top = y + 'px';
  flash.style.color = renk;
  flash.style.animation = 'fwFlash 0.5s ease-out forwards';
  document.body.appendChild(flash);
  setTimeout(function() { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 550);

  // Radyal parçacıklar
  var parcaAdet = 28 + Math.floor(Math.random() * 14);
  for (var i = 0; i < parcaAdet; i++) {
    var aci = (Math.PI * 2 * i / parcaAdet) + (Math.random() * 0.35);
    var mesafe = 55 + Math.random() * 85;
    var tx = Math.cos(aci) * mesafe;
    var ty = Math.sin(aci) * mesafe + 18; // hafif yerçekimi hissi
    var p = document.createElement('div');
    p.className = 'fw-particle';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.color = renk;
    p.style.background = renk;
    p.style.setProperty('--tx', tx + 'px');
    p.style.setProperty('--ty', ty + 'px');
    var sure = 0.7 + Math.random() * 0.5;
    p.style.animation = 'fwBurst ' + sure + 's cubic-bezier(.12,.7,.25,1) forwards';
    document.body.appendChild(p);
    (function(p, sure) {
      setTimeout(function() { if (p.parentNode) p.parentNode.removeChild(p); }, sure * 1000 + 80);
    })(p, sure);
  }
};

window._ekranHavaiFisekBaslat = function() {
  var renkler = ['#fbbf24','#f472b6','#60a5fa','#34d399','#a78bfa','#fb7185','#38bdf8','#facc15'];
  var patlamaSayisi = 4 + Math.floor(Math.random() * 2); // 4-5 patlama
  for (var i = 0; i < patlamaSayisi; i++) {
    (function(i) {
      setTimeout(function() {
        var vw = window.innerWidth || document.documentElement.clientWidth;
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var hedefX = vw * (0.18 + Math.random() * 0.64);
        var hedefY = vh * (0.16 + Math.random() * 0.28);
        var renk = renkler[Math.floor(Math.random() * renkler.length)];

        // Yükselen roket izi
        var roket = document.createElement('div');
        roket.className = 'fw-rocket';
        roket.style.left = hedefX + 'px';
        roket.style.top = vh + 'px';
        roket.style.color = renk;
        roket.style.background = renk;
        roket.style.setProperty('--riseY', (-(vh - hedefY)) + 'px');
        var yukselisSure = 0.5 + Math.random() * 0.18;
        roket.style.animation = 'fwRise ' + yukselisSure + 's cubic-bezier(.3,.55,.4,1) forwards';
        document.body.appendChild(roket);

        setTimeout(function() {
          if (roket.parentNode) roket.parentNode.removeChild(roket);
          window._havaiFisekPatlat(hedefX, hedefY, renk);
          if (navigator.vibrate) navigator.vibrate(15);
        }, yukselisSure * 1000);
      }, i * 260 + Math.random() * 120);
    })(i);
  }
};

window._gunlukHediyeGoster = function() {
  var btn = document.getElementById('gunlukHediyeBtn');
  if (btn) btn.classList.add('show');
  window._gunlukHediyeBekleyen = true;
  // Kutu düşmeye başlar başlamaz konfeti başlat
  setTimeout(function() { window._ekranKonfetiBaslat(); }, 0);
};

window._gunlukHediyeAc = function() {
  // Konfeti oluştur
  var kart = document.getElementById('gunlukHediyeKart');
  if (kart) {
    var renkler = ['#f59e0b','#fbbf24','#34d399','#60a5fa','#f472b6','#a78bfa'];
    for (var i = 0; i < 22; i++) {
      (function(i) {
        setTimeout(function() {
          var k = document.createElement('div');
          k.className = 'konfeti';
          k.style.left = (Math.random() * 100) + '%';
          k.style.top = '-10px';
          k.style.background = renkler[Math.floor(Math.random() * renkler.length)];
          k.style.width = (6 + Math.random() * 8) + 'px';
          k.style.height = (6 + Math.random() * 8) + 'px';
          k.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
          k.style.animation = 'konfetiDus ' + (0.9 + Math.random() * 0.8) + 's ease-in forwards';
          kart.appendChild(k);
          setTimeout(function() { if (k.parentNode) k.parentNode.removeChild(k); }, 2000);
        }, i * 60);
      })(i);
    }
  }
  document.getElementById('gunlukHediyeModal').classList.add('show');
};

window._gunlukHediyeKapat = function() {
  document.getElementById('gunlukHediyeModal').classList.remove('show');
  // Kredi metnini varsayılana döndür (admin hediyesi alındıktan sonra _adminHediyeAl temizler)
  if (!window._adminHediyeModu) {
    var krediEl = document.querySelector('.hediye-kredi');
    if (krediEl) krediEl.innerHTML = '+10 <span>KREDİ</span>';
  }
};

window._gunlukHediyeAl = function() {
  var btn = document.querySelector('.hediye-al-btn');
  if (btn) { btn.disabled = true; btn.textContent = '✅ Alındı!'; }
  window._gunlukHediyeKapat();
  var hediyeBtn = document.getElementById('gunlukHediyeBtn');
  if (hediyeBtn) hediyeBtn.classList.remove('show');
  window._gunlukHediyeBekleyen = false;

  // Admin hediyesi mi?
  if (window._adminHediyeModu) {
    window._adminHediyeModu = false;
    var _db2 = (typeof _loginDb === 'function') ? _loginDb() : null;
    var _kullanici2 = localStorage.getItem('doruk_login_user');
    var _adminMiktar = window._adminHediyeMiktar || 10;
    if (_db2 && _kullanici2) {
      var _kKey2 = _kullanici2.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
      _db2.ref('kullanici_kredi/' + _kKey2).once('value', function(snap2) {
        var mk = 0;
        if (snap2.exists()) { var d2 = snap2.val(); mk = d2.kredi !== undefined ? parseInt(d2.kredi)||0 : parseInt(d2)||0; }
        var yk = mk + _adminMiktar;
        _db2.ref('kullanici_kredi/' + _kKey2).update({ kredi: yk, guncelleme: firebase.database.ServerValue.TIMESTAMP });
        // Admin hediye bayrağını kaldır
        _db2.ref('admin_hediye/' + _kKey2).remove();
        localStorage.setItem('doruk_kullanici_kredi', String(yk));
        if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle(yk);
      });
    }
    if (typeof window._toast === 'function') window._toast('🎁 Admin hediyesi +' + _adminMiktar + ' kredi eklendi!', '#f59e0b');
    setTimeout(function() { if (btn) { btn.disabled = false; btn.textContent = '🎉 HEDİYEYİ AL'; } }, 3000);
    return;
  }

  // Krediyi ŞIMDI Firebase'e yaz (kullanıcı kutuyu açıp butona bastı)
  var _db = window._gunlukHediyeBekleyenDb || ((typeof _loginDb === 'function') ? _loginDb() : null);
  var _kKey = window._gunlukHediyeBekleyenKey;
  var _kullanici = localStorage.getItem('doruk_login_user');
  if (!_kKey && _kullanici) _kKey = _kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
  if (_db && _kKey) {
    var sunucuZamani = Date.now() + (window._firebaseServerOffset || 0);
    _db.ref('kullanici_kredi/' + _kKey).once('value', function(snap) {
        var mevcutKredi = 0;
        var sonHediye = 0;
        if (snap.exists()) {
          var d = snap.val();
          mevcutKredi = d.kredi !== undefined ? parseInt(d.kredi) : parseInt(d);
          if (isNaN(mevcutKredi)) mevcutKredi = 0;
          sonHediye = d.son_gunluk_hediye || 0;
        }
        var sunucuGun = window._trGunStr(sunucuZamani);
        var shGun = sonHediye ? window._trGunStr(sonHediye) : '';
        if (sonHediye > 0 && sonHediye > sunucuZamani) {
          if (typeof window._toast === 'function') window._toast('⛔ Geçersiz işlem!', '#ef4444');
          return;
        }
        if (sonHediye > 0 && shGun === sunucuGun) {
          if (typeof window._toast === 'function') window._toast('⏳ Bugünkü hediyeni zaten aldın!', '#ef4444');
          return;
        }
        var yeniKredi = mevcutKredi + 10;
        _db.ref('kullanici_kredi/' + _kKey).update({ kredi: yeniKredi, son_gunluk_hediye: firebase.database.ServerValue.TIMESTAMP, son_gunluk_hediye_miktar: 10, guncelleme: firebase.database.ServerValue.TIMESTAMP });
        localStorage.setItem('doruk_kullanici_kredi', String(yeniKredi));
        if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle(yeniKredi);
    });
  } else {
    if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle();
  }
  window._gunlukHediyeBekleyenKey = null;
  window._gunlukHediyeBekleyenDb = null;

  if (typeof window._toast === 'function') window._toast('🎁 +10 kredi hesabına eklendi!', '#f59e0b');
  setTimeout(function() {
    if (btn) { btn.disabled = false; btn.textContent = '🎉 HEDİYEYİ AL'; }
  }, 3000);
};

// ── ŞANS SANDIĞI SİSTEMİ (1 saatte bir, 1-15 arası rastgele kredi) ──
window._SANDIK_BEKLEME_MS = 1 * 60 * 60 * 1000; // 1 saat
window._sandikSayacInterval = null;
window._sandikDurum = { hazir: false, kalanMs: 0 };

// Kalan süreyi mm:ss / hh:mm:ss formatına çevir
window._sandikSureFormat = function(ms) {
  if (ms <= 0) return '00:00';
  var totalSec = Math.ceil(ms / 1000);
  var h = Math.floor(totalSec / 3600);
  var m = Math.floor((totalSec % 3600) / 60);
  var s = totalSec % 60;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  if (h > 0) return h + ':' + pad(m) + ':' + pad(s);
  return pad(m) + ':' + pad(s);
};

// Buton görünümünü güncelle
window._sandikButonGuncelle = function() {
  var btn = document.getElementById('sandikBtn');
  var metin = document.getElementById('sandikMetin');
  var ikon = document.getElementById('sandikIkon');
  if (!btn || !metin || !ikon) return;
  btn.style.display = 'flex';
  if (window._sandikDurum.hazir) {
    btn.classList.add('sandik-hazir');
    metin.classList.remove('show');
    metin.textContent = '';
    ikon.textContent = '🎁';
  } else {
    btn.classList.remove('sandik-hazir');
    metin.textContent = window._sandikSureFormat(window._sandikDurum.kalanMs);
    ikon.textContent = '🎁';
  }
};

// Sunucu saatine göre sandık durumunu Firebase'den çek ve canlı dinle (admin sıfırlarsa anında yansısın)
window._sandikDurumYukle = function() {
  var _kullanici = localStorage.getItem('doruk_login_user');
  var _misafir = localStorage.getItem('doruk_misafir') === '1';
  var btn0 = document.getElementById('sandikBtn');
  if (_misafir || (_kullanici && _kullanici.toLowerCase() === 'doruk')) {
    if (btn0) btn0.style.display = 'none';
    return;
  }
  if (!_kullanici) {
    // Oturum bilgisi henüz localStorage'a yazılmamış olabilir — kalıcı olarak
    // gizlemek yerine arka planda sessizce tekrar tekrar dene (aynı hata
    // Çevir Kazan modülünde de vardı, orada da bu şekilde düzeltildi).
    setTimeout(window._sandikDurumYukle, 800);
    return;
  }
  var _db = (typeof _loginDb === 'function') ? _loginDb() : null;
  if (!_db) { setTimeout(window._sandikDurumYukle, 1000); return; }
  var _kKey = _kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
  var _ref = _db.ref('kullanici_kredi/' + _kKey);
  if (window._sandikLiveRef) { try { window._sandikLiveRef.off('value', window._sandikLiveHandler); } catch(e){} }
  window._sandikLiveRef = _ref;
  window._sandikLiveHandler = function(snap) {
    var sonSandik = 0;
    if (snap.exists()) {
      var d = snap.val();
      sonSandik = d.son_sandik || 0;
    }
    window._sandikSonAcma = sonSandik;
    window._sandikSayacGuncelle();
    if (!window._sandikSayacInterval) {
      window._sandikSayacInterval = setInterval(window._sandikSayacGuncelle, 1000);
    }
  };
  _ref.on('value', window._sandikLiveHandler, function() {
    // hata olursa kapalı kalsın, tekrar dene
    setTimeout(window._sandikDurumYukle, 5000);
  });
};

// Her tick'te sunucu saatine göre kalan süreyi hesapla (cihaz saati hilesine kapalı)
window._sandikSayacGuncelle = function() {
  var sunucuZamani = Date.now() + (window._firebaseServerOffset || 0);
  var sonSandik = window._sandikSonAcma || 0;
  var fark = sunucuZamani - sonSandik;
  if (sonSandik === 0 || fark >= window._SANDIK_BEKLEME_MS) {
    window._sandikDurum.hazir = true;
    window._sandikDurum.kalanMs = 0;
  } else {
    window._sandikDurum.hazir = false;
    window._sandikDurum.kalanMs = window._SANDIK_BEKLEME_MS - fark;
  }
  window._sandikButonGuncelle();
};

// Butona tıklanınca
window._sandikGosterTimeout = null;
window._sandikTikla = function() {
  if (!window._sandikDurum.hazir) {
    var metin = document.getElementById('sandikMetin');
    if (!metin) return;
    if (window._sandikGosterTimeout) {
      clearTimeout(window._sandikGosterTimeout);
      window._sandikGosterTimeout = null;
    }
    if (metin.classList.contains('show')) {
      metin.classList.remove('show');
    } else {
      metin.textContent = window._sandikSureFormat(window._sandikDurum.kalanMs);
      var ikonEl = document.getElementById('sandikIkon');
      if (ikonEl) {
        var r = ikonEl.getBoundingClientRect();
        metin.style.top = (r.bottom + 8) + 'px';
        metin.style.right = (window.innerWidth - r.right) + 'px';
        metin.style.left = 'auto';
      }
      metin.classList.add('show');
      window._sandikGosterTimeout = setTimeout(function() {
        metin.classList.remove('show');
        window._sandikGosterTimeout = null;
      }, 3000);
    }
    return;
  }
  // Modalı sıfırla ve aç
  var emoji = document.getElementById('sandikEmoji');
  var krediYazi = document.getElementById('sandikKrediYazi');
  var aciklama = document.getElementById('sandikAciklama');
  var btn = document.getElementById('sandikAcBtn');
  if (emoji) { emoji.textContent = '🎁'; emoji.classList.remove('sandik-acildi'); emoji.classList.add('sandik-sallan'); }
  if (krediYazi) krediYazi.innerHTML = '<span style="font-size:16px;color:#7a9ec0;font-weight:700;">Açmak için dokun</span>';
  if (aciklama) aciklama.innerHTML = 'Sandığı aç ve <strong style="color:#fbbf24;">1 ile 15 kredi arası</strong> bir ödül kazan!<br>Her 1 saatte bir yeni bir şans seni bekliyor.';
  if (btn) { btn.disabled = false; btn.textContent = '🎁 SANDIĞI AÇ'; btn.style.display = ''; }
  document.getElementById('sandikModal').classList.add('show');
};

window._sandikKapat = function() {
  document.getElementById('sandikModal').classList.remove('show');
};

// Sandığı aç — rastgele 1-15 arası kredi ver (her seferinde farklı)
window._sandikAc = function() {
  if (!window._sandikDurum.hazir) { window._sandikKapat(); return; }

  var btn = document.getElementById('sandikAcBtn');
  var emoji = document.getElementById('sandikEmoji');
  var krediYazi = document.getElementById('sandikKrediYazi');
  var aciklama = document.getElementById('sandikAciklama');
  if (btn) btn.disabled = true;

  var _kullanici = localStorage.getItem('doruk_login_user');
  var _db = (typeof _loginDb === 'function') ? _loginDb() : null;
  if (!_db || !_kullanici) { window._sandikKapat(); return; }
  var _kKey = _kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');

  // Rastgele miktar — 1 ile 15 arası, her açılışta farklı (kripto güvenli rastgelelik)
  var kazanilan;
  if (window.crypto && window.crypto.getRandomValues) {
    var arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    kazanilan = 1 + (arr[0] % 15); // 1..15
  } else {
    kazanilan = 1 + Math.floor(Math.random() * 15);
  }

  var sunucuZamani0 = Date.now() + (window._firebaseServerOffset || 0);
  var _erken = false;
  var _sonSandikSnapshot = 0;

  _db.ref('kullanici_kredi/' + _kKey).transaction(function(mevcut) {
    var obj = (typeof mevcut === 'object' && mevcut !== null) ? mevcut : { kredi: (typeof mevcut === 'number' ? mevcut : 0) };
    var mevcutKredi = parseInt(obj.kredi !== undefined ? obj.kredi : 0);
    if (isNaN(mevcutKredi)) mevcutKredi = 0;
    var sonSandik = obj.son_sandik || 0;
    // Çift kontrol: sunucudan gelen son_sandik ile gerçekten süre dolmuş mu?
    if (sonSandik > 0 && (sunucuZamani0 - sonSandik) < window._SANDIK_BEKLEME_MS) {
      _sonSandikSnapshot = sonSandik;
      return; // abort — kredi yok / süre dolmamış
    }
    obj.kredi = mevcutKredi + kazanilan;
    obj.son_sandik = sunucuZamani0;
    obj.son_sandik_miktar = kazanilan;
    obj.guncelleme = Date.now();
    return obj;
  }, function(err, committed, snap) {
    if (err) {
      console.error('Sandık güncelleme hatası:', err);
      if (btn) btn.disabled = false;
      if (typeof window._toast === 'function') window._toast('⚠️ Bağlantı hatası, tekrar dene', '#ef4444');
      return;
    }

    if (!committed) {
      // Süre henüz dolmamış
      if (typeof window._toast === 'function') window._toast('⏳ Sandık henüz hazır değil!', '#ef4444');
      window._sandikKapat();
      window._sandikSonAcma = _sonSandikSnapshot;
      window._sandikSayacGuncelle();
      return;
    }

    var d = snap.val() || {};
    var yeniKredi = parseInt(d.kredi !== undefined ? d.kredi : 0);
    if (isNaN(yeniKredi)) yeniKredi = 0;
    var sunucuZamani = d.son_sandik || sunucuZamani0;

    localStorage.setItem('doruk_kullanici_kredi', String(yeniKredi));
    if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle(yeniKredi);

    // Açılış animasyonu + sonuç
    if (emoji) {
      emoji.classList.remove('sandik-sallan');
      emoji.classList.add('sandik-acildi');
      emoji.textContent = '🎉';
    }
    if (krediYazi) krediYazi.innerHTML = '+' + kazanilan + ' <span>KREDİ</span>';
    if (aciklama) aciklama.innerHTML = '<strong style="color:#00e676;">Tebrikler!</strong> Hesabına <strong style="color:#fbbf24;">' + kazanilan + ' kredi</strong> tanımlandı.<br>1 saat sonra yeni bir sandık seni bekliyor.';
    if (btn) { btn.disabled = true; btn.textContent = '✅ Alındı'; btn.style.opacity = '0.7'; }

    setTimeout(function() { window._ekranKonfetiBaslat(); }, 0);
    if (typeof window._toast === 'function') window._toast('📦 +' + kazanilan + ' kredi kazandın!', '#f59e0b');

    // Sayacı yeniden başlat (sunucu saatine göre)
    window._sandikSonAcma = sunucuZamani;
    window._sandikSayacGuncelle();

    setTimeout(function() { window._sandikKapat(); }, 2200);
  });
};

// Sayfa yüklendiğinde sandık durumunu başlat
(function _sandikBaslat() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(window._sandikDurumYukle, 1200);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(window._sandikDurumYukle, 1200);
    });
  }
})();

// ── Sandık butonuna tıklama ──
(function _sandikTiklamaKur() {
  function init() {
    var btn = document.getElementById('sandikBtn');
    if (!btn) { setTimeout(init, 500); return; }
    btn.addEventListener('click', function() { window._sandikTikla(); });
  }
  init();
})();
// ── / ŞANS SANDIĞI SİSTEMİ ──


// ── ÇEVİR KAZAN SİSTEMİ (günde 1 kez, 1-50 kredi, slot makinesi) ──
window._CEVIR_BEKLEME_MS = 12 * 60 * 60 * 1000; // 12 saat
window._cevirDurum = { hazir: false, kalanMs: 0 };
window._cevirSonAcma = 0;
window._cevirSayacInterval = null;
window._cevirSpinInterval = null;
window._cevirKilit = false; // çift tıklama / çift ödül koruması

window._cevirModulGuncelle = function() {
  var tile = document.getElementById('modCevirKazan');
  if (!tile) return;
  if (tile.style.display === 'none' && localStorage.getItem('doruk_misafir') !== '1') tile.style.display = '';
  if (window._cevirDurum.hazir) {
    tile.classList.add('cevir-hazir');
  } else {
    tile.classList.remove('cevir-hazir');
  }
};

// Sunucu saatine göre çevir kazan durumunu Firebase'den çek ve canlı dinle (admin sıfırlarsa anında yansısın)
window._cevirDurumYukleDeneme = 0;
window._cevirDurumYukle = function() {
  var _kullanici = localStorage.getItem('doruk_login_user');
  var _misafir = localStorage.getItem('doruk_misafir') === '1';
  var tile0 = document.getElementById('modCevirKazan');
  if (_misafir) {
    // Misafir kullanıcılar modülü görebilir (tıklayınca kayıt uyarısı çıkar),
    // ama sayaç/durum verisi onlar için gerekmediğinden burada duruyoruz.
    if (tile0) tile0.style.display = '';
    return;
  }
  if (!_kullanici) {
    // Oturum bilgisi henüz localStorage'a yazılmamış olabilir (sayfa yeni açıldı).
    // Modülü ASLA gizleme — arka planda sessizce tekrar tekrar dene, bilgi
    // geldiğinde otomatik devam etsin. Daha önce burada bir zaman aşımından
    // sonra modülü gizleyen bir yol vardı, bu da gerçek kullanıcılarda
    // modülün kaybolmasına sebep oluyordu; o davranış tamamen kaldırıldı.
    setTimeout(window._cevirDurumYukle, 800);
    return;
  }
  // Kullanıcı doğrulandı — modül daha önce (yanlışlıkla) gizlenmiş olabilir, geri göster
  if (tile0) tile0.style.display = '';
  var _db = (typeof _loginDb === 'function') ? _loginDb() : null;
  if (!_db) { setTimeout(window._cevirDurumYukle, 1000); return; }
  var _kKey = _kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
  var _ref = _db.ref('kullanici_kredi/' + _kKey);
  if (window._cevirLiveRef) { try { window._cevirLiveRef.off('value', window._cevirLiveHandler); } catch(e){} }
  window._cevirLiveRef = _ref;
  window._cevirLiveHandler = function(snap) {
    var sonCevir = 0;
    if (snap.exists()) {
      var d = snap.val();
      sonCevir = d.son_cevir || 0;
    }
    window._cevirSonAcma = sonCevir;
    window._cevirSayacGuncelle();
    if (!window._cevirSayacInterval) {
      window._cevirSayacInterval = setInterval(window._cevirSayacGuncelle, 1000);
    }
  };
  _ref.on('value', window._cevirLiveHandler, function() {
    setTimeout(window._cevirDurumYukle, 5000);
  });
};

window._cevirSayacGuncelle = function() {
  var sunucuZamani = Date.now() + (window._firebaseServerOffset || 0);
  var sonCevir = window._cevirSonAcma || 0;
  var fark = sunucuZamani - sonCevir;
  if (sonCevir === 0 || fark >= window._CEVIR_BEKLEME_MS) {
    window._cevirDurum.hazir = true;
    window._cevirDurum.kalanMs = 0;
  } else {
    window._cevirDurum.hazir = false;
    window._cevirDurum.kalanMs = window._CEVIR_BEKLEME_MS - fark;
  }
  window._cevirModulGuncelle();
};

window._cevirKalanFormat = function(ms) {
  if (ms <= 0) return '00:00:00';
  var totalSec = Math.ceil(ms / 1000);
  var h = Math.floor(totalSec / 3600);
  var m = Math.floor((totalSec % 3600) / 60);
  var s = totalSec % 60;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  return pad(h) + ':' + pad(m) + ':' + pad(s);
};

// Modül tıklanınca
window._cevirKazanTikla = function() {
  if (localStorage.getItem('doruk_misafir') === '1') {
    window._misafirUyariGoster('ozellik');
    if (navigator.vibrate) navigator.vibrate(30);
    return;
  }
  if (!window._cevirDurum.hazir) {
    if (typeof window._toast === 'function') {
      window._toast('⏳ Çevir Kazan 12 saatte bir yenilenir · Kalan süre: ' + window._cevirKalanFormat(window._cevirDurum.kalanMs), '#ef4444');
    }
    if (navigator.vibrate) navigator.vibrate(30);
    return;
  }
  // Modalı sıfırla ve aç
  var krediYazi = document.getElementById('cevirKrediYazi');
  var aciklama = document.getElementById('cevirAciklama');
  var btn = document.getElementById('cevirAcBtn');
  if (krediYazi) { krediYazi.style.display = 'none'; krediYazi.innerHTML = '+0 <span>KREDİ</span>'; }
  if (aciklama) aciklama.innerHTML = 'Çevir ve <strong style="color:#fbbf24;">1 ile 50 kredi arası</strong> bir ödül kazan!<br>Her 12 saatte bir yeni bir şans seni bekliyor.';
  if (btn) { btn.disabled = false; btn.textContent = '🎰 ÇEVİR'; btn.style.display = ''; }
  for (var i = 0; i < 3; i++) {
    var reel = document.getElementById('cevirReel' + i);
    var digit = document.getElementById('cevirDigit' + i);
    if (reel) reel.classList.remove('spinning', 'landed');
    if (digit) digit.textContent = '0';
  }
  document.getElementById('cevirKazanModal').classList.add('show');
};

window._cevirKazanKapat = function() {
  document.getElementById('cevirKazanModal').classList.remove('show');
};

// Çevir — sunucudan ödülü al, sonra slot animasyonuyla göster
window._cevirKazanCevir = function() {
  if (!window._cevirDurum.hazir || window._cevirKilit) return;
  window._cevirKilit = true;

  var btn = document.getElementById('cevirAcBtn');
  var aciklama = document.getElementById('cevirAciklama');
  if (btn) { btn.disabled = true; btn.textContent = 'ÇEVRİLİYOR...'; }
  if (aciklama) aciklama.innerHTML = 'Şans çarkı dönüyor…';

  var _kullanici = localStorage.getItem('doruk_login_user');
  var _db = (typeof _loginDb === 'function') ? _loginDb() : null;
  if (!_db || !_kullanici) { window._cevirKilit = false; window._cevirKazanKapat(); return; }
  var _kKey = _kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');

  // Rastgele miktar — 1 ile 50 arası (kripto güvenli rastgelelik)
  var kazanilan;
  if (window.crypto && window.crypto.getRandomValues) {
    var arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    kazanilan = 1 + (arr[0] % 50); // 1..50
  } else {
    kazanilan = 1 + Math.floor(Math.random() * 50);
  }

  var sunucuZamani0 = Date.now() + (window._firebaseServerOffset || 0);
  var _sonCevirSnapshot = 0;

  _db.ref('kullanici_kredi/' + _kKey).transaction(function(mevcut) {
    var obj = (typeof mevcut === 'object' && mevcut !== null) ? mevcut : { kredi: (typeof mevcut === 'number' ? mevcut : 0) };
    var mevcutKredi = parseInt(obj.kredi !== undefined ? obj.kredi : 0);
    if (isNaN(mevcutKredi)) mevcutKredi = 0;
    var sonCevir = obj.son_cevir || 0;
    if (sonCevir > 0 && (sunucuZamani0 - sonCevir) < window._CEVIR_BEKLEME_MS) {
      _sonCevirSnapshot = sonCevir;
      return; // abort — süre dolmamış
    }
    obj.kredi = mevcutKredi + kazanilan;
    obj.son_cevir = sunucuZamani0;
    obj.son_cevir_miktar = kazanilan;
    obj.guncelleme = Date.now();
    return obj;
  }, function(err, committed, snap) {
    if (err) {
      console.error('Çevir Kazan güncelleme hatası:', err);
      window._cevirKilit = false;
      if (btn) { btn.disabled = false; btn.textContent = '🎰 ÇEVİR'; }
      if (typeof window._toast === 'function') window._toast('⚠️ Bağlantı hatası, tekrar dene', '#ef4444');
      return;
    }

    if (!committed) {
      window._cevirKilit = false;
      if (typeof window._toast === 'function') window._toast('⏳ Bugünkü çeviriş hakkın henüz hazır değil!', '#ef4444');
      window._cevirKazanKapat();
      window._cevirSonAcma = _sonCevirSnapshot;
      window._cevirSayacGuncelle();
      return;
    }

    var d = snap.val() || {};
    var yeniKredi = parseInt(d.kredi !== undefined ? d.kredi : 0);
    if (isNaN(yeniKredi)) yeniKredi = 0;
    var sunucuZamani = d.son_cevir || sunucuZamani0;

    // Slot makinesi animasyonu başlat, ödül belli — reels bu sayıda dursun
    var hedefStr = String(kazanilan).padStart(3, '0'); // örn. 007, 050
    window._cevirSlotOynat(hedefStr, function() {
      localStorage.setItem('doruk_kullanici_kredi', String(yeniKredi));
      if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle(yeniKredi);

      var krediYazi = document.getElementById('cevirKrediYazi');
      var aciklama2 = document.getElementById('cevirAciklama');
      if (krediYazi) { krediYazi.style.display = ''; krediYazi.innerHTML = '+' + kazanilan + ' <span>KREDİ</span>'; }
      var buyukOdul = kazanilan >= 40;
      if (aciklama2) aciklama2.innerHTML = buyukOdul
        ? '<strong style="color:#00e676;">🎉 BÜYÜK ÖDÜL!</strong> Hesabına <strong style="color:#fbbf24;">' + kazanilan + ' kredi</strong> tanımlandı.<br>12 saat sonra tekrar dene!'
        : '<strong style="color:#00e676;">Tebrikler!</strong> Hesabına <strong style="color:#fbbf24;">' + kazanilan + ' kredi</strong> tanımlandı.<br>12 saat sonra tekrar dene!';
      if (btn) { btn.disabled = true; btn.textContent = '✅ Alındı'; btn.style.opacity = '0.7'; }
      if (navigator.vibrate) navigator.vibrate(buyukOdul ? [40,60,40,60,80] : [40]);

      setTimeout(function() { window._ekranKonfetiBaslat(); }, 0);
      if (typeof window._toast === 'function') window._toast('🎰 +' + kazanilan + ' kredi kazandın!', '#f59e0b');

      window._cevirSonAcma = sunucuZamani;
      window._cevirSayacGuncelle();
      window._cevirKilit = false;

      setTimeout(function() { window._cevirKazanKapat(); }, 2600);
    });
  });
};

// Reels'i sırayla, artan gecikmelerle rastgele rakamlarla döndürüp hedef rakamda durdur
window._cevirSlotOynat = function(hedefStr, onTamamlandi) {
  var duruslar = [900, 1300, 1750]; // her reel farklı sürede dursun (klasik slot hissi)
  var tamamlanan = 0;
  for (var i = 0; i < 3; i++) {
    (function(idx) {
      var reel = document.getElementById('cevirReel' + idx);
      var digit = document.getElementById('cevirDigit' + idx);
      if (!reel || !digit) { tamamlanan++; return; }
      reel.classList.add('spinning');
      var spinTimer = setInterval(function() {
        digit.textContent = String(Math.floor(Math.random() * 10));
      }, 55);
      setTimeout(function() {
        clearInterval(spinTimer);
        digit.textContent = hedefStr[idx];
        reel.classList.remove('spinning');
        reel.classList.add('landed');
        if (navigator.vibrate) navigator.vibrate(20);
        tamamlanan++;
        if (tamamlanan === 3 && typeof onTamamlandi === 'function') onTamamlandi();
      }, duruslar[idx]);
    })(i);
  }
};

// Sayfa yüklendiğinde çevir kazan durumunu başlat
(function _cevirKazanBaslat() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(window._cevirDurumYukle, 1200);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(window._cevirDurumYukle, 1200);
    });
  }
})();
// ── / ÇEVİR KAZAN SİSTEMİ ──



// ── ADMIN HEDİYE DAĞIT ──
window._adminHediyeDagit = function() {
  var existing = document.getElementById('adminHediyeMiktarOverlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'adminHediyeMiktarOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,0.88);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;';
  overlay.innerHTML = '<div style="background:linear-gradient(145deg,#0c1830,#07101f);border:1px solid rgba(245,158,11,0.45);border-radius:24px;padding:30px 24px 24px;width:100%;max-width:320px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.7),0 0 40px rgba(245,158,11,0.08);">'
    + '<div style="font-size:40px;margin-bottom:14px;">🎁</div>'
    + '<div style="font-size:16px;font-weight:900;color:#fbbf24;letter-spacing:1.5px;margin-bottom:6px;">HEDİYE MİKTARI</div>'
    + '<div style="font-size:11px;color:#4a6a8a;margin-bottom:20px;line-height:1.5;">Tüm kayıtlı kullanıcılara<br>verilecek kredi miktarı</div>'
    + '<input id="adminHediyeMiktarInp" type="number" min="1" max="99999" placeholder="Miktar gir..." style="'
    + 'width:100%;padding:16px;border-radius:14px;border:1.5px solid rgba(245,158,11,0.4);'
    + 'background:rgba(245,158,11,0.07);color:#fbbf24;font-size:32px;font-weight:900;'
    + 'text-align:center;outline:none;box-sizing:border-box;margin-bottom:18px;'
    + '-webkit-appearance:none;appearance:none;">'
    + '<div style="display:flex;gap:10px;">'
    + '<button id="adminHediyeIptalBtn" style="'
    + 'flex:1;padding:14px;border-radius:13px;border:1px solid rgba(255,255,255,0.09);'
    + 'background:rgba(255,255,255,0.05);color:#7a9ec0;font-size:13px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent;">İptal</button>'
    + '<button id="adminHediyeGonderBtn" style="'
    + 'flex:2;padding:14px;border-radius:13px;border:none;'
    + 'background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:14px;font-weight:900;cursor:pointer;-webkit-tap-highlight-color:transparent;box-shadow:0 4px 20px rgba(245,158,11,0.3);">🎁 Gönder</button>'
    + '</div></div>';

  var adminOverlay = document.getElementById('adminPanelOverlay');
  if (adminOverlay) adminOverlay.appendChild(overlay);
  else document.body.appendChild(overlay);

  setTimeout(function(){
    var inp = document.getElementById('adminHediyeMiktarInp');
    if (inp) { inp.focus(); }
    var iptalBtn = document.getElementById('adminHediyeIptalBtn');
    if (iptalBtn) iptalBtn.addEventListener('click', function(){ var o = document.getElementById('adminHediyeMiktarOverlay'); if(o) o.remove(); });
    var gonderBtn = document.getElementById('adminHediyeGonderBtn');
    if (gonderBtn) gonderBtn.addEventListener('click', function(){ window._adminHediyeDagitOnayla(); });
  }, 50);
};

window._adminHediyeDagitOnayla = function() {
  var inp = document.getElementById('adminHediyeMiktarInp');
  var miktar = inp ? parseInt(inp.value) : 10;
  if (!miktar || miktar < 1) { inp && (inp.style.borderColor='#ef4444'); return; }
  var overlay = document.getElementById('adminHediyeMiktarOverlay');
  if (overlay) overlay.remove();
  window._adminHediyeDagitYap(miktar);
};

window._adminHediyeDagitYap = function(miktar) {
  miktar = miktar || 10;
  var db = (typeof _loginDb === 'function') ? _loginDb() : null;
  if (!db) { if (typeof window._toast === 'function') window._toast('⚠️ Firebase bağlantısı yok!', '#ef4444'); return; }
  db.ref('kullanicilar').once('value', function(snap) {
    if (!snap.exists()) return;
    var updates = {};
    var sayac = 0;
    snap.forEach(function(c) {
      var v = c.val();
      if (!v || v.misafir || !v.kullanici || v.kullanici.toLowerCase() === 'doruk') return;
      var nKey = v.kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
      updates['admin_hediye/' + nKey] = { bekliyor: true, miktar: miktar, zaman: Date.now() };
      sayac++;
    });
    if (!sayac) { if (typeof window._toast === 'function') window._toast('ℹ️ Hediye verilecek kullanıcı yok.', '#60a5fa'); return; }
    db.ref().update(updates, function(err) {
      if (err) {
        if (typeof window._toast === 'function') window._toast('❌ Hata: ' + err.message, '#ef4444');
      } else {
        if (typeof window._toast === 'function') window._toast('🎁 ' + sayac + ' kullanıcıya +' + miktar + ' kredi gönderildi!', '#22c55e');
      }
    });
  });
};

// Admin hediyesi Firebase realtime listener — oturum kapatmaya gerek yok, anlık gelir
window._adminHediyeListenerRef = null;
window._adminHediyeListenerKur = function(kullanici) {
  var db = (typeof _loginDb === 'function') ? _loginDb() : null;
  if (!db || !kullanici) return;
  var nKey = kullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
  // Önceki listener varsa kapat
  if (window._adminHediyeListenerRef) {
    try { window._adminHediyeListenerRef.off(); } catch(e) {}
  }
  var ref = db.ref('admin_hediye/' + nKey);
  window._adminHediyeListenerRef = ref;
  ref.on('value', function(snap) {
    if (!snap.exists()) return;
    var v = snap.val();
    if (!v || !v.bekliyor) return;
    // Zaten gösteriliyorsa tekrar gösterme
    if (window._adminHediyeModu) return;
    var miktar = v.miktar || 10;
    window._adminHediyeModu = true;
    window._adminHediyeMiktar = miktar;
    var baslik = document.getElementById('hediyeBaslik');
    var aciklama = document.getElementById('hediyeAciklama');
    var krediEl = document.querySelector('.hediye-kredi');
    if (baslik) baslik.textContent = 'ADMİNDEN HEDİYE! 🎉';
    if (aciklama) aciklama.innerHTML = 'Doruk sana özel <b>+' + miktar + ' kredi</b> hediye etti!<br>Hemen al ve modüllerin keyfini çıkar.';
    if (krediEl) krediEl.innerHTML = '+' + miktar + ' <span>KREDİ</span>';
    if (typeof window._gunlukHediyeGoster === 'function') window._gunlukHediyeGoster();
  });
};

// Bireysel kullanıcıya hediye gönder
window._adminBireyselHediyeGonder = function(kullaniciAd) {
  var overlay = document.createElement('div');
  overlay.id = 'adminBireyselOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:24px;';
  overlay.innerHTML = '<div style="background:linear-gradient(145deg,#0a1628,#060e1c);border:1px solid rgba(245,158,11,0.4);border-radius:22px;padding:28px 24px;width:100%;max-width:300px;text-align:center;">'
    + '<div style="font-size:36px;margin-bottom:8px;">✉️</div>'
    + '<div style="font-size:15px;font-weight:900;color:#fbbf24;letter-spacing:1.5px;margin-bottom:4px;">KİŞİSEL HEDİYE</div>'
    + '<div style="font-size:11px;color:#00e5ff;margin-bottom:16px;font-weight:700;">' + kullaniciAd + '</div>'
    + '<input id="adminBireyselMiktarInp" type="number" min="1" max="9999" value="10" style="'
    + 'width:100%;padding:14px;border-radius:12px;border:1px solid rgba(245,158,11,0.35);'
    + 'background:rgba(245,158,11,0.07);color:#fbbf24;font-size:28px;font-weight:900;'
    + 'text-align:center;outline:none;box-sizing:border-box;margin-bottom:16px;">'
    + '<div style="display:flex;gap:10px;">'
    + '<button id="adminBireyselIptalBtn" style="flex:1;padding:13px;border-radius:11px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#7a9ec0;font-size:13px;font-weight:700;cursor:pointer;">İptal</button>'
    + '<button id="adminBireyselGonderBtn" style="flex:1;padding:13px;border-radius:11px;border:none;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:13px;font-weight:900;cursor:pointer;">🎁 Gönder</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  setTimeout(function() {
    var inp = document.getElementById('adminBireyselMiktarInp');
    if (inp) { inp.focus(); inp.select(); }
    var iptal = document.getElementById('adminBireyselIptalBtn');
    if (iptal) iptal.addEventListener('click', function(){ var o=document.getElementById('adminBireyselOverlay'); if(o) o.remove(); });
    var gonder = document.getElementById('adminBireyselGonderBtn');
    if (gonder) gonder.addEventListener('click', function(){
      var inp2 = document.getElementById('adminBireyselMiktarInp');
      var miktar = inp2 ? parseInt(inp2.value) : 10;
      if (!miktar || miktar < 1) { if(inp2) inp2.style.borderColor='#ef4444'; return; }
      var o = document.getElementById('adminBireyselOverlay');
      if (o) o.remove();
      // Firebase'e yaz
      var db = (typeof _loginDb === 'function') ? _loginDb() : null;
      if (!db) { if(typeof window._toast==='function') window._toast('⚠️ Firebase yok!','#ef4444'); return; }
      var nKey = kullaniciAd.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
      db.ref('admin_hediye/' + nKey).set({ bekliyor: true, miktar: miktar, zaman: Date.now() }, function(err) {
        if (err) {
          if(typeof window._toast==='function') window._toast('❌ Hata: '+err.message,'#ef4444');
        } else {
          if(typeof window._toast==='function') window._toast('🎁 ' + kullaniciAd + ' kullanıcısına +' + miktar + ' kredi gönderildi!','#22c55e');
        }
      });
    });
  }, 100);
};
// ── / ADMIN HEDİYE DAĞIT ──

// ── / GÜNLÜK HEDİYE SİSTEMİ ──

