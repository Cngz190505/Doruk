/* Doruk module: core.js */

(function() {
  function goOffline() {
    document.getElementById('doruk-offline-screen') && (document.getElementById('doruk-offline-screen').style.display='flex');
  }

  function goOnline() {
    var s = document.getElementById('doruk-offline-screen');
    if (s) s.style.display = 'none';
  }

  // Birden fazla URL dene — hepsi başarısız olursa offline say
  var _checkOnlineCalisiyor = false;
  function checkOnline(callback) {
    if (_checkOnlineCalisiyor) { if (callback) callback(null); return; }
    _checkOnlineCalisiyor = true;
    var urls = [
      'https://www.google.com/favicon.ico',
      'https://www.cloudflare.com/favicon.ico',
      'https://api.binance.com/api/v3/ping',
    ];
    var done = false;
    var failed = 0;

    // Hiçbir resim 2.5sn içinde cevap vermezse (bazı WebView'larda img.onerror
    // hiç tetiklenmeyebiliyor) offline say — sonsuza dek "kontrol ediliyor"
    // durumunda takılı kalmasın.
    var zamanAsimi = setTimeout(function() {
      if (done) return;
      done = true;
      goOffline();
      _checkOnlineCalisiyor = false;
      if (callback) callback(false);
    }, 2500);

    urls.forEach(function(url) {
      var img = new Image();
      img.onload = function() {
        if (done) return;
        done = true;
        clearTimeout(zamanAsimi);
        goOnline();
        _checkOnlineCalisiyor = false;
        if (callback) callback(true);
      };
      img.onerror = function() {
        failed++;
        if (done) return;
        if (failed >= urls.length) {
          // Tüm URL'ler başarısız — gerçekten offline
          done = true;
          clearTimeout(zamanAsimi);
          goOffline();
          _checkOnlineCalisiyor = false;
          if (callback) callback(false);
        }
      };
      img.src = url + '?t=' + Date.now();
    });
  }

  // Açılışta kontrol
  if (!navigator.onLine) { goOffline(); } else { checkOnline(); }

  // İnternet kesilince (tarayıcı destekliyorsa anında tetiklenir)
  window.addEventListener('offline', goOffline);
  window.addEventListener('online', function() { checkOnline(); });

  // Bazı WebView/PWA ortamlarında 'offline' olayı gecikebilir ya da hiç
  // tetiklenmeyebilir. Bu yüzden navigator.onLine'ı her saniye aktif olarak
  // da kontrol ediyoruz — WiFi/veri kapatıldığı an (network round-trip
  // beklemeden, işletim sisteminin bildirdiği anda) offline ekranı çıkar.
  var _oncekiOnlineDurum = navigator.onLine;
  setInterval(function() {
    if (navigator.onLine !== _oncekiOnlineDurum) {
      _oncekiOnlineDurum = navigator.onLine;
      if (!navigator.onLine) { goOffline(); } else { checkOnline(); }
    }
  }, 5000);

  // ÖNEMLİ: WebView'a gömülü uygulamalarda (Android/iOS native sarmalayıcı)
  // navigator.onLine çoğu zaman her zaman true döner ve yukarıdaki kontrol
  // hiç tetiklenmez. Bu yüzden gerçek ağ isteğine dayanan checkOnline()'ı
  // navigator.onLine'dan bağımsız olarak da tarayıcıdakine yakın bir hızda
  // 30 saniyede bir çalıştırıyoruz; online/offline olayları anlık bildirim sağlar.
  setInterval(function() {
    checkOnline();
  }, 30000);

  // Arka plandan öne gelince kontrol et ve verileri yenile
  var lastHidden = 0;
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      lastHidden = Date.now();
      document.body.style.setProperty('--anim-state', 'paused');
      // Uygulama arka plana geçti → çıkış logu
      var u = localStorage.getItem('doruk_login_user');
      if (u) _loginLogKaydet(u, 'cikis');
    } else if (document.visibilityState === 'visible') {
      document.body.style.setProperty('--anim-state', 'running');
      checkOnline();
      // Uygulama öne geldi → giriş logu
      var u2 = localStorage.getItem('doruk_login_user');
      if (u2) _loginLogKaydet(u2, 'giris');
      // Tüm modüllerin aramalarını sıfırla
      try {
        // Ana sayfa araması
        if (typeof homeSearchTemizle === 'function') homeSearchTemizle();
        // Market sayfası araması
        var mInp = document.getElementById('searchInput');
        var mRes = document.getElementById('searchResults');
        if (mInp) mInp.value = '';
        if (mRes) { mRes.innerHTML = ''; mRes.style.display = 'none'; }
        // Whale sayfası araması
        var wInp = document.getElementById('whaleInput');
        var wDrop = document.getElementById('whaleDropdown');
        if (wInp) wInp.value = '';
        if (wDrop) wDrop.style.display = 'none';
        // Nabız sayfası araması
        var nInp = document.getElementById('nabizInput');
        var nDrop = document.getElementById('nabizDropdown');
        if (nInp) nInp.value = '';
        if (nDrop) nDrop.style.display = 'none';
        // Sinyal sayfası araması
        var sInp = document.getElementById('sinyalInput');
        if (sInp) sInp.value = '';
      } catch(e) {}
      if (Date.now() - lastHidden > 120000) {
        setTimeout(function() {
          if (typeof syncRates === 'function') syncRates();
          if (typeof glFetch === 'function') glFetch();
          if (typeof borsaBandiGuncelle === 'function') borsaBandiGuncelle();
        }, 500);
      }
      // Misafir ise krediyi Firebase'den taze çek ve listener'ın açık olduğundan emin ol
      try {
        var _visNick = localStorage.getItem('doruk_misafir_nick');
        var _visMisafir = localStorage.getItem('doruk_misafir') === '1';
        if (_visNick && _visMisafir) {
          // Listener kopuksa yeniden kur
          if (!window._misafirKrediListenerAcik && typeof window._misafirKrediListenerKur === 'function') {
            window._misafirKrediListenerKur(_visNick);
          }
          // Her öne gelişte Firebase'den bir kez taze oku ve badge'i güncelle
          var _visDb = (typeof _loginDb === 'function') ? _loginDb() : null;
          if (_visDb) {
            var _visKey = _visNick.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
            _visDb.ref('misafir_kredi/' + _visKey).once('value', function(snap) {
              if (!snap.exists()) return;
              var d = snap.val();
              var k = d.kredi !== undefined ? parseInt(d.kredi) : parseInt(d);
              if (isNaN(k)) return;
              localStorage.setItem('doruk_misafir_kredi', String(k));
              if (typeof window._misafirKrediBannerGuncelle === 'function') window._misafirKrediBannerGuncelle(k);
            });
          }
        }
      } catch(e) {}

      // Kayıtlı kullanıcı ise krediyi Firebase'den taze çek + günlük 10 kredi ver
      try {
        var _visKul = localStorage.getItem('doruk_login_user');
        var _visMis2 = localStorage.getItem('doruk_misafir') === '1';
        if (_visKul && !_visMis2 && _visKul.toLowerCase() !== 'doruk') {
          if (!window._kullaniciKrediListenerAcik && typeof window._kullaniciKrediListenerKur === 'function') {
            window._kullaniciKrediListenerKur(_visKul);
          }
          var _visKDb = (typeof _loginDb === 'function') ? _loginDb() : null;
          if (_visKDb) {
            var _visKKey = _visKul.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
            _visKDb.ref('kullanici_kredi/' + _visKKey).once('value', function(snap) {
              if (!snap.exists()) return;
              var d = snap.val();
              var k = d.kredi !== undefined ? parseInt(d.kredi) : parseInt(d);
              if (isNaN(k)) return;
              window._sunucuSaatiIleKontrolEt(d.son_gunluk_hediye, function(hediyelenebilir1) {
                if (hediyelenebilir1) {
                  window._gunlukHediyeBekleyenKey = _visKKey;
                  window._gunlukHediyeBekleyenDb = _visKDb;
                  setTimeout(function() {
                    if (typeof window._gunlukHediyeGoster === 'function') window._gunlukHediyeGoster();
                  }, 1500);
                }
              });
              localStorage.setItem('doruk_kullanici_kredi', String(k));
              if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle(k);
            });
          }
          // Admin hediyesi listener kopuksa yeniden kur
          if (!window._adminHediyeListenerRef && typeof window._adminHediyeListenerKur === 'function') {
            window._adminHediyeListenerKur(_visKul);
          }
          // Şans sandığı durumunu da tazele
          if (typeof window._sandikDurumYukle === 'function') window._sandikDurumYukle();
        }
      } catch(e) {}
    }
  });

  // Uygulama tamamen kapanınca çıkış logu
  window.addEventListener('beforeunload', function() {
    var u = localStorage.getItem('doruk_login_user');
    if (!u || u.toLowerCase() === 'doruk') return;
    // Firebase direkt yazma beforeunload'da tamamlanmayabilir mobile'da
    // Önce visibilitychange 'hidden' zaten tetikleniyor, bu backup
    if (typeof _loginLogKaydet === 'function') _loginLogKaydet(u, 'cikis');
  });

  // pagehide — iOS/Android'de beforeunload'dan daha güvenilir
  window.addEventListener('pagehide', function() {
    var u = localStorage.getItem('doruk_login_user');
    if (!u || u.toLowerCase() === 'doruk') return;
    if (typeof _loginLogKaydet === 'function') _loginLogKaydet(u, 'cikis');
  });
})();


/* ---- extracted inline script ---- */

(function() {
  function setStatusBarHeight() {
    // CSS env() değerini doğrudan kullan — en güvenilir yöntem
    var style = getComputedStyle(document.documentElement);
    var safeTop = parseInt(style.getPropertyValue('--sat') || '0') || 0;

    var h = 0;
    if (safeTop > 0) {
      // Cihaz safe-area bildirdi, direkt kullan
      h = safeTop;
    } else {
      // Fallback: DPR bazlı tahmin
      var dpr = window.devicePixelRatio || 1;
      if (dpr >= 3) h = 40;
      else if (dpr >= 2) h = 32;
      else h = 24;
    }
    document.documentElement.style.setProperty("--status-bar-height", h + "px");
  }

  // CSS safe-area-inset-top değerini JS'e aktarmak için helper
  var style = document.createElement('style');
  style.textContent = ':root { --sat: env(safe-area-inset-top, 0px); --sab: env(safe-area-inset-bottom, 0px); }';
  document.head.appendChild(style);

  function setNavBarOffset() {
    // safe-area-inset-bottom değerini oku
    var cs = getComputedStyle(document.documentElement);
    var sab = parseInt(cs.getPropertyValue('--sab') || '0') || 0;
    var navH = 0;
    if (sab > 0) {
      navH = sab;
    } else {
      // Fallback: Android navigation bar tahmini
      var dpr = window.devicePixelRatio || 1;
      var winH = window.innerHeight;
      var screenH = screen.height / dpr;
      var diff = screenH - winH;
      if (diff > 20 && diff < 120) navH = Math.round(diff);
      else navH = 0;
    }
    document.documentElement.style.setProperty('--nav-bar-height', navH + 'px');
    var bar = document.getElementById('supportBar');
    if (bar) bar.style.bottom = (16 + navH) + 'px';
  }

  // DOM hazır olunca çalıştır (env() değeri o zaman okunabilir)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setStatusBarHeight(); setNavBarOffset(); });
  } else {
    setStatusBarHeight(); setNavBarOffset();
  }
  window.addEventListener("resize", function() { setStatusBarHeight(); setNavBarOffset(); });
})();


/* ---- extracted inline script ---- */

(function() {
  function showOffline() {
    var el = document.getElementById('doruk-offline-screen');
    if(el) { el.style.display = 'flex'; }
  }
  function hideOffline() {
    var el = document.getElementById('doruk-offline-screen');
    if(el) { el.style.display = 'none'; }
  }
  function checkOnline() {
    var img = new Image();
    img.onload = function() { hideOffline(); };
    img.onerror = function() { showOffline(); };
    img.src = 'https://www.google.com/favicon.ico?t=' + Date.now();
  }

  // Açılışta kontrol
  if(!navigator.onLine) { showOffline(); } else { checkOnline(); }

  window.addEventListener('offline', showOffline);
  window.addEventListener('online', function() { checkOnline(); });

  // Arka plandan gelince kontrol
  document.addEventListener('visibilitychange', function() {
    if(document.visibilityState === 'visible') checkOnline();
  });
})();


/* ---- extracted inline script ---- */

// Splash ikonunu hemen render et
document.addEventListener('DOMContentLoaded', () => {
  if(window.lucide) {
    lucide.createIcons();
    // İlk render sonrası tüm ikonları işlenmiş olarak işaretle
    document.querySelectorAll('[data-lucide]').forEach(el => el.setAttribute('data-processed','1'));
  }
});
if(window.lucide) {
  lucide.createIcons();
  document.querySelectorAll('[data-lucide]').forEach(el => el.setAttribute('data-processed','1'));
}

// PİYASA — api.genelpara.com'dan gerçek veri
// genelpara sembol → bizim id  |  list: 'altin' veya 'doviz'
const localAssets = [
  // ALTIN (list=altin)
  {id:'XAU-GR',  name:'GRAM ALTIN',        cat:'ALTIN',  list:'altin', key:'GA'},
  {id:'XAU-CE',  name:'ÇEYREK ALTIN',       cat:'ALTIN',  list:'altin', key:'C'},
  {id:'XAU-YR',  name:'YARIM ALTIN',        cat:'ALTIN',  list:'altin', key:'Y'},
  {id:'XAU-TA',  name:'TAM ALTIN',          cat:'ALTIN',  list:'altin', key:'T'},
  {id:'XAU-CU',  name:'CUMHURİYET ALTINI',  cat:'ALTIN',  list:'altin', key:'CMR'},
  {id:'XAU-ATA', name:'ATA ALTIN',          cat:'ALTIN',  list:'altin', key:'ATA'},
  {id:'XAU-14',  name:'14 AYAR ALTIN',      cat:'ALTIN',  list:'altin', key:'14'},
  {id:'XAU-18',  name:'18 AYAR ALTIN',      cat:'ALTIN',  list:'altin', key:'18'},
  {id:'XAU-22',  name:'22 AYAR BİLEZİK',    cat:'ALTIN',  list:'altin', key:'22'},
  {id:'XAU-ONS', name:'ALTIN ONS ($)',       cat:'ALTIN',  list:'altin', key:'XAUUSD'},
  // GÜMÜŞ
  {id:'XAG-GR',  name:'GRAM GÜMÜŞ',         cat:'GÜMÜŞ',  list:'altin', key:'GAG'},
  // DÖVİZ (list=doviz)
  {id:'USD-TRY', name:'ABD DOLARI',          cat:'DÖVİZ',  list:'doviz', key:'USD'},
  {id:'EUR-TRY', name:'EURO',                cat:'DÖVİZ',  list:'doviz', key:'EUR'},
  {id:'GBP-TRY', name:'İNG. STERLİNİ',      cat:'DÖVİZ',  list:'doviz', key:'GBP'},
  {id:'CHF-TRY', name:'İSVİÇRE FRANGI',     cat:'DÖVİZ',  list:'doviz', key:'CHF'},
  {id:'JPY-TRY', name:'JAPON YENİ',          cat:'DÖVİZ',  list:'doviz', key:'JPY'},
  {id:'SAR-TRY', name:'S.ARABİSTAN RİYALİ', cat:'DÖVİZ',  list:'doviz', key:'SAR'},
  {id:'AED-TRY', name:'BİRL. EMİRLİKLER',   cat:'DÖVİZ',  list:'doviz', key:'AED'},
  {id:'RUB-TRY', name:'RUBLE',               cat:'DÖVİZ',  list:'doviz', key:'RUB'},
  {id:'CAD-TRY', name:'KANADA DOLARI',       cat:'DÖVİZ',  list:'doviz', key:'CAD'},
  {id:'AUD-TRY', name:'AVUSTRALYA DOLARI',   cat:'DÖVİZ',  list:'doviz', key:'AUD'},
  {id:'CNY-TRY', name:'ÇİN YUANI',           cat:'DÖVİZ',  list:'doviz', key:'CNY'},
  {id:'KWD-TRY', name:'KUVEYT DİNARI',       cat:'DÖVİZ',  list:'doviz', key:'KWD'},
];

// Kullanıcının kayıtlı listesini yükle — yoksa default'u kullan
// ÖNEMLI: İlk yüklemede de hemen localStorage'a yazıyoruz,
// böylece gelecekteki HTML güncellemeleri default'ı değiştirse bile
// kullanıcının mevcut listesi korunur.
const _DEFAULT_WATCHLIST = [
  {id:'BTCUSDT',  name:'BTC',  type:'crypto'},
  {id:'ETHUSDT',  name:'ETH',  type:'crypto'},
  {id:'SOLUSDT',  name:'SOL',  type:'crypto'},
  {id:'AVAXUSDT', name:'AVAX', type:'crypto'},
];
// Kullanıcıya özgü localStorage anahtarı — farklı kullanıcılar birbirinin cache'ini görmez
function _wlCacheKey() {
  var u = (localStorage.getItem('doruk_login_user') || '').toLowerCase().replace(/[^a-z0-9]/g,'_');
  return u ? ('c_wl_' + u) : 'c_v51';
}

let watchList = (() => {
  try {
    var u = (localStorage.getItem('doruk_login_user') || '').toLowerCase().replace(/[^a-z0-9]/g,'_');
    var key = u ? ('c_wl_' + u) : 'c_v51';
    // Önce kullanıcıya özgü key, yoksa eski key (migration)
    const saved = localStorage.getItem(key) || localStorage.getItem('c_v51');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch(e) {}
  return _DEFAULT_WATCHLIST.map(x => ({...x}));
})();

function watchListSave() {
  // Kullanıcıya özgü cache'e kaydet
  try { localStorage.setItem(_wlCacheKey(), JSON.stringify(watchList)); } catch(e) {}
  // Firebase'e de kaydet
  try {
    var db = _loginDb();
    var userKey = (localStorage.getItem('doruk_login_user') || '').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
    if (db && userKey) {
      db.ref('watchlist/' + userKey).set({ list: watchList, guncelleme: Date.now() })
        .catch(function(e){ console.warn('watchListSave Firebase hatası:', e); });
    }
  } catch(e) { console.warn('watchListSave hata:', e); }
}

function watchListLoad(callback) {
  // 1. Kullanıcıya özgü cache'den anında yükle → kartlar hemen görünür
  try {
    const saved = localStorage.getItem(_wlCacheKey());
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        watchList = parsed;
        renderGrid(); // Cache'den anında göster
      }
    }
  } catch(e) {}
  // 2. Arka planda Firebase'den doğruyu getir → güncelleme varsa üzerine yaz
  try {
    var db = _loginDb();
    var userKey = (localStorage.getItem('doruk_login_user') || '').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
    if (db && userKey) {
      var _wlDone = false;
      // Firebase yanıt vermezse 3sn sonra cache ile devam et — splash takılmasın
      var _wlTimeout = setTimeout(function() {
        if (!_wlDone) { _wlDone = true; if (typeof callback === 'function') callback(); }
      }, 3000);
      db.ref('watchlist/' + userKey).once('value', function(snap) {
        if (_wlDone) return;
        _wlDone = true;
        clearTimeout(_wlTimeout);
        if (snap.exists()) {
          var data = snap.val();
          if (data && Array.isArray(data.list) && data.list.length > 0) {
            watchList = data.list;
            localStorage.setItem(_wlCacheKey(), JSON.stringify(watchList));
          }
        }
        if (typeof callback === 'function') callback();
      }, function(err) {
        if (_wlDone) return;
        _wlDone = true;
        clearTimeout(_wlTimeout);
        console.warn('watchListLoad Firebase hatası:', err);
        if (typeof callback === 'function') callback();
      });
      return;
    }
  } catch(e) { console.warn('watchListLoad hata:', e); }
  if (typeof callback === 'function') callback();
}

// genelpara.com verileri — { altin: {GA:{alis,satis,degisim,oran}, ...}, doviz: {...} }
let gpData = { altin: {}, doviz: {} };
let cryptoPrices = {}, lastPrices = {};

async function syncRates() {
  try {
    // Genpara Cloudflare doğrulamasına takılabildiği için CORS izinli Truncgil
    // kaynağını ana kaynak olarak kullan. Eski gpData şekli korunuyor; kartların
    // geri kalanına dokunmadan sadece API cevabı dönüştürülüyor.
    const resp = await fetch('https://finans.truncgil.com/today.json?_=' + Date.now(), {
      mode:'cors', credentials:'omit', cache:'no-store'
    });
    if (!resp.ok) throw new Error('Kur servisi HTTP ' + resp.status);
    const raw = await resp.json();
    const adapt = (item) => item ? ({
      alis: item['Alış'],
      satis: item['Satış'],
      oran: item['Değişim'],
      degisim: item['Değişim']
    }) : null;
    const doviz = {};
    ['USD','EUR','GBP','CHF','JPY','SAR','AED','RUB','CAD','AUD','CNY','KWD']
      .forEach(key => { if (raw[key]) doviz[key] = adapt(raw[key]); });
    const altinMap = {
      GA:'gram-altin', C:'ceyrek-altin', Y:'yarim-altin', T:'tam-altin',
      CMR:'cumhuriyet-altini', ATA:'ata-altin', '14':'14-ayar-altin',
      '18':'18-ayar-altin', '22':'22-ayar-bilezik', XAUUSD:'ons', GAG:'gumus'
    };
    const altin = {};
    Object.keys(altinMap).forEach(key => {
      const item = raw[altinMap[key]];
      if (item) altin[key] = adapt(item);
    });
    if (Object.keys(doviz).length) gpData.doviz = doviz;
    if (Object.keys(altin).length) gpData.altin = altin;
    // Verileri telefona kaydet
    try { localStorage.setItem('cache_gpData', JSON.stringify({altin: gpData.altin, doviz: gpData.doviz, ts: Date.now()})); } catch(e) {}
    renderGrid();
    borsaBandiGuncelle();
  } catch(e) {
    // İnternet yoksa cache'den yükle
    try {
      const cached = JSON.parse(localStorage.getItem('cache_gpData') || 'null');
      if(cached && cached.altin) {
        gpData.altin = cached.altin;
        gpData.doviz = cached.doviz;
        renderGrid();
        borsaBandiGuncelle();
      }
    } catch(e2) {}
  }
}

// Çok küçük fiyatlı coinler (PEPE, SHIB, BONK vb.) için anlamlı basamak sayısını
// koruyan fiyat formatlayıcı. Sabit toFixed(6) yerine, fiyatın büyüklüğüne göre
// ondalık basamak sayısını otomatik ayarlar; böylece 0.00000279 gibi değerler
// "0.000003" yerine "0.00000279" gibi anlamlı rakamlarla gösterilir.
function formatCryptoPrice(price) {
  const np = parseFloat(price);
  if (isNaN(np)) return '$0';
  if (np >= 1) return '$' + np.toLocaleString();
  if (np <= 0) return '$0';
  // İlk anlamlı rakamın konumunu bul ve ondan sonra 3 basamak daha göster
  const decimals = Math.max(2, -Math.floor(Math.log10(np)) + 3);
  let str = np.toFixed(decimals);
  // Gereksiz sondaki sıfırları temizle (ör: 0.000002790 -> 0.00000279)
  if (str.includes('.')) str = str.replace(/0+$/, '').replace(/\.$/, '');
  return '$' + str;
}

// ===================== FİYAT METNİ OTOMATİK SIĞDIRMA =====================
// Kartların köşeleri kesik (clip-path) tasarıma sahip olduğu için dar alanlarda
// uzun fiyatlar (örn. PEPE, BONK gibi çok küçük fiyatlı coinler) "..." ile
// kırpılabiliyordu. Bu fonksiyon, metin kutuya sığmadığında yazı boyutunu
// otomatik olarak küçültüp fiyatın tamamının görünmesini sağlar.
const _fitPriceMinPx = 6.5;
function fitPriceText(el) {
  if (!el) return;
  // Önce tanımlı (CSS) boyutuna sıfırla ki büyütme/küçültme doğru ölçülsün
  el.style.fontSize = '';
  requestAnimationFrame(() => {
    if (!el.isConnected) return;
    let size = parseFloat(getComputedStyle(el).fontSize);
    if (!size) return;
    let guard = 0;
    while (el.scrollWidth > el.clientWidth + 0.5 && size > _fitPriceMinPx && guard < 24) {
      size -= 0.4;
      el.style.fontSize = size.toFixed(1) + 'px';
      guard++;
    }
  });
}

(function initPriceAutoFit() {
  const pendingFit = new Set();
  let rafScheduled = false;
  function flushFit() {
    rafScheduled = false;
    pendingFit.forEach(fitPriceText);
    pendingFit.clear();
  }
  function scheduleFit(el) {
    if (!el) return;
    pendingFit.add(el);
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(flushFit);
    }
  }
  function handleMutations(mutations) {
    for (const m of mutations) {
      let node = m.target;
      // Metin düğümü değiştiyse üst elementine bak
      const el = (node.nodeType === 3 ? node.parentElement : node);
      if (!el || el.nodeType !== 1) continue;
      const priceEl = el.closest('.price-text, .w-borsa-price');
      if (priceEl) scheduleFit(priceEl);
    }
  }
  function start() {
    const observer = new MutationObserver(handleMutations);
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
// ===================== / FİYAT METNİ OTOMATİK SIĞDIRMA =====================

function calcLocalPrice(id) {
  const asset = localAssets.find(a => a.id === id);
  if(!asset) return 0;
  const pool = gpData[asset.list] || {};
  const entry = pool[asset.key];
  if(!entry) return 0;
  const p = parseFloat(entry.satis) || 0;
  if(!p) return 0;
  triggerFlash(id, p);
  // oran = yüzde değişim (örn: "+15.76" veya "-1.20")
  updateChange(id, entry.oran || entry.degisim || '');
  return p;
}

function updateChange(id, val) {
  const el = document.getElementById('chg-'+id);
  if(!el) return;
  if(!val || val === '') { el.textContent = ''; return; }
  // val: "%2,34" veya "%-1,20" formatında gelebilir
  const clean = val.toString().replace('%','').replace(',','.').trim();
  const num = parseFloat(clean);
  if(isNaN(num)) { el.textContent = ''; return; }
  el.textContent = (num >= 0 ? '+%' : '%') + Math.abs(num).toFixed(2);
  el.className = 'price-change ' + (num >= 0 ? 'chg-up' : 'chg-down');
}

function updateCryptoChange(id, pct) {
  const el = document.getElementById('chg-'+id);
  if(!el) return;
  const num = parseFloat(pct);
  if(isNaN(num)) return;
  el.textContent = (num >= 0 ? '+%' : '%') + Math.abs(num).toFixed(2);
  el.className = 'price-change ' + (num >= 0 ? 'chg-up' : 'chg-down');
}

function triggerFlash(id, newPrice) {
  const card = document.getElementById('card-'+id); if(!card) return;
  const priceEl = document.getElementById('p-'+id);
  const old = lastPrices[id];

  if(old !== undefined && old !== newPrice) {
    const isUp = newPrice > old;
    const flashCls = isUp ? 'flash-up' : 'flash-down';
    const priceCls = isUp ? '#00e676' : '#ff4444';

    if(card._flashTimer) { clearTimeout(card._flashTimer); card._flashTimer = null; }

    // Tüm DOM değişikliklerini tek rAF'a topla — tarayıcı tek frame'de işler
    requestAnimationFrame(() => {
      card.classList.remove('flash-up','flash-down');
      card.classList.add(flashCls);
      if(priceEl) {
        priceEl.style.color = priceCls;
        priceEl.classList.remove('price-pop-anim');
        priceEl.classList.add('price-pop-anim');
      }
      // Eskiden 2 ayrı timer vardı — şimdi tek timer her ikisini temizler
      card._flashTimer = setTimeout(() => {
        card.classList.remove('flash-up','flash-down');
        if(priceEl) { priceEl.classList.remove('price-pop-anim'); priceEl.style.color=''; }
        card._flashTimer = null;
      }, 1200);
    });
  }
  lastPrices[id] = newPrice;
}

const MC_TINT_MAP = {
  BTC:'mc-btc', ETH:'mc-eth', SOL:'mc-sol', AVAX:'mc-avax', DOT:'mc-dot',
  BNB:'mc-bnb', XRP:'mc-xrp', DOGE:'mc-doge', ADA:'mc-ada', MATIC:'mc-matic',
  LTC:'mc-ltc', LINK:'mc-link'
};
function getCardTintClass(item) {
  if (item.type === 'local') {
    const localMeta = localAssets.find(a => a.id === item.id);
    const cat = localMeta ? localMeta.cat : '';
    if (cat === 'ALTIN')  return 'mc-gold';
    if (cat === 'GÜMÜŞ')  return 'mc-silver';
    if (cat === 'DÖVİZ')  return 'mc-fx';
    return '';
  }
  return MC_TINT_MAP[item.name] || MC_TINT_MAP[item.id] || '';
}

// Render kartları — sadece eksik kartlar oluşturulur, mevcut fiyatlar DOM'da güncellenir
function renderGrid() {
  const grid = document.getElementById('mainGrid');
  const existingIds = new Set(Array.from(grid.querySelectorAll('.market-card')).map(c=>c.id.replace('card-','')));
  const newIds = new Set(watchList.map(w=>w.id));

  // Silinmiş olanları kaldır
  existingIds.forEach(id => { if(!newIds.has(id)) { const c=document.getElementById('card-'+id); if(c) c.remove(); } });

  // Sıralamayı koru / yeni kartları ekle
  watchList.forEach((item, idx) => {
    let card = document.getElementById('card-'+item.id);
    if(!card) {
      card = document.createElement('div');
      card.id = 'card-'+item.id;
      card.className = 'market-card ' + getCardTintClass(item);
      // Logo & etiket: kripto için coincap, yerel için SVG ikon
      const localMeta = localAssets.find(a=>a.id===item.id);
      const shortLabel = localMeta ? (() => {
        const c = localMeta.cat;
        const k = localMeta.key;
        if(c==='ALTIN') {
          if(k==='GA')    return 'GR ALTIN';
          if(k==='C')     return 'ÇEYREK';
          if(k==='Y')     return 'YARIM';
          if(k==='T')     return 'TAM';
          if(k==='CMR')   return 'CUMHURİYET';
          if(k==='ATA')   return 'ATA ALTIN';
          if(k==='14')    return '14 AYAR';
          if(k==='18')    return '18 AYAR';
          if(k==='22')    return '22 BİLEZİK';
          if(k==='XAUUSD') return 'ONS ($)';
          return localMeta.name.substring(0,8);
        }
        if(c==='GÜMÜŞ') return 'GR GÜMÜŞ';
        if(c==='DÖVİZ') {
          if(k==='USD') return 'DOLAR';
          if(k==='EUR') return 'EURO';
          if(k==='GBP') return 'STERLİN';
          if(k==='CHF') return 'FRANK';
          if(k==='JPY') return 'YEN';
          return k;
        }
        return localMeta.name.substring(0,8);
      })() : item.name;

      const logoHtml = item.type==='crypto'
        ? `<img class="coin-logo-img"
               src="https://assets.coincap.io/assets/icons/${item.name.toLowerCase()}@2x.png"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
               alt="${item.name}">
           <div class="coin-logo-fallback" style="display:none;">${item.name.substring(0,3)}</div>`
        : (() => {
            const cat = localMeta ? localMeta.cat : '';
            const key = localMeta ? localMeta.key : '';
            if(cat==='ALTIN' || cat==='GÜMÜŞ') {
              const isGold = cat==='ALTIN';
              const grad  = isGold ? ['#f5c842','#e6a817','#fde68a'] : ['#c8d8e8','#9ab0c4','#e2ecf5'];
              const letter= isGold ? 'Au' : 'Ag';
              return `<div class="coin-logo-svg" style="
                width:15px;height:15px;border-radius:50%;flex-shrink:0;
                background:linear-gradient(135deg,${grad[0]},${grad[1]});
                border:1px solid ${grad[2]}44;
                display:flex;align-items:center;justify-content:center;
                font-size:5.5px;font-weight:900;color:#1a0f00;font-family:serif;
                box-shadow:0 1px 3px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.4);">
                ${letter}</div>`;
            }
            // Döviz — bayrak emoji
            const flags={'USD':'🇺🇸','EUR':'🇪🇺','GBP':'🇬🇧','CHF':'🇨🇭','JPY':'🇯🇵','SAR':'🇸🇦','AED':'🇦🇪','RUB':'🇷🇺','CAD':'🇨🇦','AUD':'🇦🇺','CNY':'🇨🇳','KWD':'🇰🇼'};
            const flag = flags[key]||'💱';
            return `<div class="coin-logo-svg" style="
              width:15px;height:15px;border-radius:50%;flex-shrink:0;
              background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);
              display:flex;align-items:center;justify-content:center;font-size:10px;
              overflow:hidden;">${flag}</div>`;
          })();

      card.innerHTML = `
  <div class="card-shimmer"></div>
  <div class="remove-node" onclick="removeAsset('${item.id}')">✕</div>
  <div class="coin-logo-wrap">
    ${logoHtml}
    <span class="coin-name-label">${shortLabel}</span>
  </div>
  <b id="p-${item.id}" class="price-text">···</b>
  <span id="chg-${item.id}" class="price-change"></span>
  <svg id="spark-${item.id}" class="spark-line" viewBox="0 0 100 20" preserveAspectRatio="none">
    <defs>
      <linearGradient id="sgU-${item.id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="#00d4ff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="sgD-${item.id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff4664" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#ff4664" stop-opacity="0"/>
      </linearGradient>
      <filter id="sparkGlow-${item.id}">
        <feGaussianBlur stdDeviation="0.8" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  </svg>
`;
      if(item.type==='crypto') {
        card.addEventListener('click', function(e){
          if(e.target.classList.contains('remove-node') || e.target.closest('.remove-node')) return;
          openChartModal(item.id, item.name);
        });
      }
      grid.appendChild(card);
      // appendChild SONRASI çağır — SVG DOM'da olsun, sparkline anında çizilsin
      if(item.type==='crypto') {
        scheduleSparkline(item.id);
      }
    }
    // Sıralamayı düzelt
    if(grid.children[idx] !== card) grid.insertBefore(card, grid.children[idx]||null);

    // Fiyatı güncelle (yerel varlıklar)
    if(item.type==='local') {
      const p = calcLocalPrice(item.id);
      if(p) {
        const asset = localAssets.find(a=>a.id===item.id);
        const isUsd = asset && asset.key==='XAUUSD';
        const pv = (isUsd?'$':'₺') + p.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
        const el = document.getElementById('p-'+item.id);
        if(el && el.textContent !== pv) el.textContent = pv;
      }
    } else if(cryptoPrices[item.id]) {
      const np = parseFloat(cryptoPrices[item.id]);
      const pv = formatCryptoPrice(np);
      const el = document.getElementById('p-'+item.id);
      if(el && el.textContent !== pv) el.textContent = pv;
    } else {
      // Fiyat henüz cache'de yok — REST'ten anında çek
      fetchSingleCryptoPrice(item.id);
    }
  });

  syncCryptoWS();

  // Sadece henüz yüklenmemiş spark grafiklerini çek — mevcut kartları yeniden tetikleme
  const cryptoItems = watchList.filter(w => w.type === 'crypto');
  if(cryptoItems.length > 0) {
    const unloaded = cryptoItems.filter(w => {
      const svg = document.getElementById('spark-' + w.id);
      return svg && !svg.getAttribute('data-loaded');
    });
    if(unloaded.length > 0) unloaded.forEach(w => scheduleSparkline(w.id));
  }

  // Cache'den yüzde değişimlerini anında DOM'a yaz — API cevabı gelmeden görünsün
  try {
    const cp = JSON.parse(localStorage.getItem('cache_cryptoPrices') || '{}');
    cryptoItems.forEach(w => {
      const chg = cp['chg_' + w.id];
      if(chg !== undefined) updateCryptoChange(w.id, parseFloat(chg));
    });
  } catch(e) {}
}

// Tek coin için anlık REST fiyat çekme (WS ilk tick gelmeden önce)
const _fetchingPrices = new Set();
async function fetchSingleCryptoPrice(symbol) {
  if(_fetchingPrices.has(symbol)) return;
  _fetchingPrices.add(symbol);
  try {
    // ticker/24hr → hem fiyat hem yüzde değişim tek istekte
    const r = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol='+symbol);
    const d = await r.json();
    if(d && d.lastPrice) {
      cryptoPrices[symbol] = d.lastPrice;
      const np = parseFloat(d.lastPrice);
      const el = document.getElementById('p-'+symbol);
      if(el) el.textContent = formatCryptoPrice(np);
      // Yüzde değişimi hemen yaz
      if(d.priceChangePercent) updateCryptoChange(symbol, parseFloat(d.priceChangePercent));
      // Cache'e kaydet
      try {
        const allPrices = JSON.parse(localStorage.getItem('cache_cryptoPrices') || '{}');
        allPrices[symbol] = d.lastPrice;
        allPrices['chg_'+symbol] = d.priceChangePercent;
        allPrices._ts = Date.now();
        localStorage.setItem('cache_cryptoPrices', JSON.stringify(allPrices));
      } catch(e) {}
    }
  } catch(e) {
    // Cache'den göster
    try {
      const allPrices = JSON.parse(localStorage.getItem('cache_cryptoPrices') || '{}');
      if(allPrices[symbol]) {
        cryptoPrices[symbol] = allPrices[symbol];
        const np = parseFloat(allPrices[symbol]);
        const el = document.getElementById('p-'+symbol);
        if(el) el.textContent = formatCryptoPrice(np);
        if(allPrices['chg_'+symbol]) updateCryptoChange(symbol, parseFloat(allPrices['chg_'+symbol]));
      }
    } catch(e2) {}
  }
  _fetchingPrices.delete(symbol);
}

// WS yönetimi: sadece izlenen coinler değiştiğinde yeniden bağlan
let currentWS = null;
let wsSymbols = '';          // aktif bağlantıdaki sembol listesi
let lastWSUpdate = {};
const wsThrottleMs = 1200;   // saniyede ~1 güncelleme — performans

function syncCryptoWS() {
  const cryptos = watchList.filter(a=>a.type==='crypto');
  if(!cryptos.length) { if(currentWS){ currentWS.close(); currentWS=null; wsSymbols=''; } return; }

  const newSymbols = cryptos.map(a=>a.id.toLowerCase()).sort().join(',');
  if(newSymbols === wsSymbols && currentWS && currentWS.readyState < 2) return; // zaten bağlı
  wsSymbols = newSymbols;

  if(currentWS) currentWS.close();

  // miniTicker: fiyat + 24h değişim oranı
  const stream = cryptos.map(a=>a.id.toLowerCase()+'@miniTicker').join('/');
  currentWS = new WebSocket('wss://stream.binance.com:9443/ws/'+stream);

  // Bekleyen WS güncellemelerini batch'le — her mesajda DOM'a dokunma
  const _wsPending = {};
  let _wsRafId = null;
  function _wsFlush() {
    _wsRafId = null;
    for(const sym in _wsPending) {
      const {np, pct} = _wsPending[sym];
      triggerFlash(sym, np);
      cryptoPrices[sym] = String(np);
      const el = document.getElementById('p-'+sym);
      if(el) el.textContent = formatCryptoPrice(np);
      if(pct !== null) updateCryptoChange(sym, pct);
    }
    for(const k in _wsPending) delete _wsPending[k];
  }

  currentWS.onmessage = (e) => {
    const d = JSON.parse(e.data);
    const sym = d.s;
    if(!sym) return;
    const now = Date.now();
    if((lastWSUpdate[sym]||0) >= now - wsThrottleMs) return;
    lastWSUpdate[sym] = now;
    const np = parseFloat(d.c);
    if(!np) return;
    const pct = d.o ? ((np - parseFloat(d.o)) / parseFloat(d.o) * 100).toFixed(2) : null;
    // DOM'a dokunma — rAF'ta toplu işle
    _wsPending[sym] = {np, pct};
    if(!_wsRafId) _wsRafId = requestAnimationFrame(_wsFlush);
  };

  currentWS.onerror = () => {};
  currentWS.onclose = () => {
    // Bağlantı koptu, 3 sn sonra yeniden bağlan
    if(wsSymbols) setTimeout(syncCryptoWS, 3000);
  };
}

// Binance coin listesi cache — her aramada çekmez, 5 dk geçerliliği var
let _binanceCache = null, _binanceCacheTime = 0;
async function getBinanceList() {
  if (_binanceCache && Date.now() - _binanceCacheTime < 300000) return _binanceCache;
  try {
    const r = await fetch('https://api.binance.com/api/v3/ticker/price', {mode:'cors',credentials:'omit'});
    _binanceCache = await r.json();
    _binanceCacheTime = Date.now();
  } catch(e) { _binanceCache = _binanceCache || []; }
  return _binanceCache;
}

// Debounce timer
let _homeSearchTimer = null;
let _homeSearchHistoryPushed = false;
function homeSmartSearch(q) {
  const rd = document.getElementById('homeSearchResults');
  const cl = document.getElementById('homeSearchClear');
  if (cl) cl.style.display = q.length > 0 ? 'block' : 'none';
  if (q.length < 1) { rd.style.display = 'none'; rd.innerHTML = ''; _homeSearchHistoryPushed = false; return; }
  // İlk karakter yazılınca history'e state ekle — geri tuşu aramayı kapatsın
  if (!_homeSearchHistoryPushed) {
    history.pushState({page:'home', search:true}, '', '');
    _homeSearchHistoryPushed = true;
  }
  clearTimeout(_homeSearchTimer);
  _homeSearchTimer = setTimeout(() => _homeSmartSearchRun(q), 180);
}
async function _homeSmartSearchRun(q) {
  const rd = document.getElementById('homeSearchResults');
  rd.style.display = 'block';
  let html = ''; const qu = q.toUpperCase();
  localAssets.filter(a => a.name.toUpperCase().includes(qu) || a.cat.includes(qu)).forEach(a => {
    html += `<div class="result-item" onclick="addAsset('${a.id}','${a.name}','local')"><span>${a.name}</span><span class="tag">${a.cat}</span></div>`;
  });
  const all = await getBinanceList();
  // Symbol prefix ile filtrele — slice önce alınır
  const filtered = [];
  for(let i=0; i<all.length && filtered.length<8; i++) {
    const s = all[i];
    if(s.symbol.endsWith('USDT') && s.symbol.includes(qu)) filtered.push(s);
  }
  filtered.forEach(s => {
    html += `<div class="result-item" onclick="addAsset('${s.symbol}','${s.symbol.replace('USDT','')}','crypto')"><span>${s.symbol}</span><span class="tag">KRİPTO</span></div>`;
  });
  rd.innerHTML = html || '<div class="result-item" style="color:#e8f2ff;">Sonuç bulunamadı</div>';
}

function homeSearchTemizle() {
  const inp = document.getElementById('homeSearchInput');
  const rd  = document.getElementById('homeSearchResults');
  const cl  = document.getElementById('homeSearchClear');
  if (inp) inp.value = '';
  if (rd)  { rd.innerHTML = ''; rd.style.display = 'none'; }
  if (cl)  cl.style.display = 'none';
  _homeSearchHistoryPushed = false;
}

let _smartSearchTimer = null;
function smartSearch(q) {
  const rd=document.getElementById('searchResults');
  if(q.length<1){rd.style.display='none';rd.innerHTML='';return;}
  clearTimeout(_smartSearchTimer);
  _smartSearchTimer = setTimeout(() => _smartSearchRun(q), 180);
}
async function _smartSearchRun(q) {
  const rd=document.getElementById('searchResults');
  rd.style.display='block'; let html=''; const qu=q.toUpperCase();
  localAssets.filter(a=>a.name.toUpperCase().includes(qu)||a.cat.includes(qu)).forEach(a=>{
    html+=`<div class="result-item" onclick="addAsset('${a.id}','${a.name}','local')"><span>${a.name}</span><span class="tag">${a.cat}</span></div>`;
  });
  const all = await getBinanceList();
  all.filter(s=>s.symbol.includes(qu)&&s.symbol.endsWith('USDT')).slice(0,10).forEach(s=>{html+=`<div class="result-item" onclick="addAsset('${s.symbol}','${s.symbol.replace('USDT','')}','crypto')"><span>${s.symbol}</span><span class="tag">KRİPTO</span></div>`;});
  rd.innerHTML=html||'<div class="result-item">Sonuç bulunamadı</div>';
}

function addAsset(id,name,type) {
  if(!watchList.find(a=>a.id===id)){watchList.push({id,name,type});watchListSave();}
  document.getElementById('searchInput').value='';
  const rd=document.getElementById('searchResults');rd.innerHTML='';rd.style.display='none';
  homeSearchTemizle();
  renderGrid(); goToPage('home');
}

function removeAsset(id) { watchList=watchList.filter(a=>a.id!==id);watchListSave();renderGrid(); }

function goToPage(p) {
  // Alpine activePage state güncelle — x-show reaktif olarak güncellenir
  if (window.$alpine) window.$alpine.activePage = p;
  // Kısa kilit — çift tetiklenmeyi önler, modül geçişini geciktirmez
  if (goToPage._busy) return;
  goToPage._busy = true;
  setTimeout(function(){ goToPage._busy = false; }, 180);

  // Sayfa açılınca 400ms boyunca içerideki touch/click eventlerini yut
  window._pageTransitioning = true;
  setTimeout(function(){ window._pageTransitioning = false; }, 180);

  // ── MİSAFİR KORUMASI + KREDİ SİSTEMİ ──
  var _misafirKorunanlar = ['analiz','notes','takvim','doviz','ceviri','deprem','sinyal','cuzdan','futures','fibo','sentinel','whale','nabiz','rsi','hacim'];
  if (window._misafirMi && window._misafirMi() && _misafirKorunanlar.indexOf(p) !== -1) {
    // Hız için önce localStorage'dan kontrol et — sıfırsa zaten engelle
    var _misKrediCache = parseInt(localStorage.getItem('doruk_misafir_kredi') || '0');
    if (_misKrediCache <= 0) {
      window._misafirUyariGoster();
      goToPage._busy = false;
      return;
    }
    // Gerçek düşürme Firebase transaction ile — client manipülasyonu önlenir
    try {
      var _nick = localStorage.getItem('doruk_misafir_nick') || localStorage.getItem('doruk_login_user');
      var _db = (typeof _loginDb === 'function') ? _loginDb() : null;
      if (_db && _nick) {
        var _nKey = _nick.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
        _db.ref('misafir_kredi/' + _nKey).transaction(function(mevcutKredi) {
          if (mevcutKredi === null) return mevcutKredi; // Firebase null test — tekrar dener
          // misafir_kredi objesi: { kredi: 24, ilkGiris: ... } veya duz sayi
          var k = (mevcutKredi !== null && typeof mevcutKredi === 'object') ? (mevcutKredi.kredi || 0) : mevcutKredi;
          if (k <= 0) return; // abort — kredi yok
          if (typeof mevcutKredi === 'object') {
            mevcutKredi.kredi = k - 1;
            mevcutKredi.guncelleme = Date.now();
            return mevcutKredi;
          }
          return k - 1;
        }, function(err, committed, snap) {
          if (!committed || err) return;
          var d = snap.val();
          var gercekKredi = (d && typeof d === 'object') ? (d.kredi !== undefined ? parseInt(d.kredi) : 0) : parseInt(d);
          if (isNaN(gercekKredi)) return;
          localStorage.setItem('doruk_misafir_kredi', String(gercekKredi));
          if (typeof window._misafirKrediBannerGuncelle === 'function') window._misafirKrediBannerGuncelle(gercekKredi);
        });
        // UI'ı hemen güncelle (optimistic) — transaction sonucu farkı kapatır
        var _optimistic = Math.max(0, _misKrediCache - 1);
        localStorage.setItem('doruk_misafir_kredi', String(_optimistic));
        if (typeof window._misafirKrediBannerGuncelle === 'function') window._misafirKrediBannerGuncelle(_optimistic);
      } else {
        // Firebase yoksa sadece localStorage'dan düş (offline fallback)
        var _fallback = Math.max(0, _misKrediCache - 1);
        localStorage.setItem('doruk_misafir_kredi', String(_fallback));
        if (typeof window._misafirKrediBannerGuncelle === 'function') window._misafirKrediBannerGuncelle(_fallback);
      }
    } catch(e) {}
  }
  // ── / MİSAFİR KORUMASI + KREDİ SİSTEMİ ──

  // ── KAYITLI KULLANICI KREDİ SİSTEMİ ──
  var _ADMIN_NICK = 'Doruk';
  var _aktifKullanici = localStorage.getItem('doruk_login_user') || '';
  var _kayitliMi = !(window._misafirMi && window._misafirMi()) && _aktifKullanici.toLowerCase() !== _ADMIN_NICK.toLowerCase() && _aktifKullanici !== '';
  if (_kayitliMi && _misafirKorunanlar.indexOf(p) !== -1) {
    // Hız için önce localStorage cache kontrol
    var _kKrediCache = parseInt(localStorage.getItem('doruk_kullanici_kredi') || '0');
    if (_kKrediCache <= 0) {
      window._misafirUyariGoster('kayitli');
      goToPage._busy = false;
      return;
    }
    // Gerçek düşürme Firebase transaction ile — client manipülasyonu önlenir
    try {
      var _kDb2 = (typeof _loginDb === 'function') ? _loginDb() : null;
      if (_kDb2 && _aktifKullanici) {
        var _kNKey = _aktifKullanici.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
        _kDb2.ref('kullanici_kredi/' + _kNKey).transaction(function(mevcutKredi) {
          if (mevcutKredi === null) return mevcutKredi; // kayıt yoksa dokunma
          var k = (typeof mevcutKredi === 'object' && mevcutKredi !== null) ? (mevcutKredi.kredi || 0) : mevcutKredi;
          if (k <= 0) return; // abort — kredi yok
          if (typeof mevcutKredi === 'object' && mevcutKredi !== null) {
            mevcutKredi.kredi = k - 1;
            mevcutKredi.guncelleme = Date.now();
            return mevcutKredi;
          }
          return k - 1;
        }, function(err, committed, snap) {
          if (!committed || err) return;
          var d = snap.val();
          var gercekKredi = (d && typeof d === 'object') ? (d.kredi !== undefined ? parseInt(d.kredi) : 0) : parseInt(d);
          if (isNaN(gercekKredi)) return;
          localStorage.setItem('doruk_kullanici_kredi', String(gercekKredi));
          if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle(gercekKredi);
        });
        // UI'ı hemen güncelle (optimistic)
        var _kOptimistic = Math.max(0, _kKrediCache - 1);
        localStorage.setItem('doruk_kullanici_kredi', String(_kOptimistic));
        if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle(_kOptimistic);
      } else {
        // Firebase yoksa sadece localStorage'dan düş (offline fallback)
        var _kFallback = Math.max(0, _kKrediCache - 1);
        localStorage.setItem('doruk_kullanici_kredi', String(_kFallback));
        if (typeof window._kullaniciKrediBadgeGuncelle === 'function') window._kullaniciKrediBadgeGuncelle(_kFallback);
      }
    } catch(e) {}
  }
  // ── / KAYITLI KULLANICI KREDİ SİSTEMİ ──

  // 1. Frame: sadece görsel geçiş — DOM ağır işi yok
  const prev = document.querySelector('.page.active');
  const next = document.getElementById(p+'Page');
  // Zaten aktif sayfaya geçiş yapılıyorsa animasyonu yeniden tetikleme
  if (prev && next && prev === next) {
    // Aynı sayfa — active/anim-done'a dokunma, sadece içerik güncellenir
  } else {
    if (prev) { prev.classList.remove('active'); prev.classList.remove('anim-done'); }
    if (next) {
      next.classList.add('active');
      // Animasyon bitince will-change temizle — GPU belleği serbest bırak
      next.addEventListener('animationend', function _ae() {
        next.classList.add('anim-done');
        next.removeEventListener('animationend', _ae);
      }, { once: true });
    }
  }

  const labels={'home':'DORUK','market':'','notes':'Not Defteri','takvim':'Takvim & Önemli Günler','doviz':'Döviz Çevirici','ceviri':'Çeviri','deprem':'Deprem Takibi','cuzdan':'💼 Kripto Cüzdan','analiz':'📊 Kripto Analiz','sentinel':'🔭 Doruk Sentinel','sentinelDetail':'🔭 Doruk Sentinel','futures':'📈 Strateji','fibo':'📐 Auto Fibonacci','whale':'🐋 Whale Tracker','nabiz':'📡 Piyasa Nabzı','rsi':'📉 RSI Tarayıcı','hacim':'🔥 Hacim Tarayıcı'};
  const _htitle = (p in labels)?labels[p]:p;
  const _hel = document.getElementById('headerTitle');
  _hel.textContent = _htitle;
  _hel.style.letterSpacing = _htitle.length <= 6 ? '6px' : _htitle.length <= 12 ? '3px' : '1px';
  var _isHome = p==='home';
  var _lb = document.getElementById('logoutBtn');
  var _bi = document.getElementById('backIcon');
  _lb.style.display = _isHome ? 'flex' : 'none';
  _lb.style.pointerEvents = _isHome ? 'auto' : 'none';
  _bi.style.display = _isHome ? 'none' : 'flex';
  _bi.style.pointerEvents = _isHome ? 'none' : 'auto';

  // History — senkron, hafif
  if(p==='home'){
    if(history.state && history.state.page !== 'home') history.pushState({page:'home'}, '', '');
  } else {
    if(currentWS && p!=='market'){ currentWS.close(); currentWS=null; wsSymbols=''; }
    history.pushState({page:p}, '', '');
  }

  // 2. Frame: animasyon başladıktan SONRA ağır işleri yap
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if(p==='home'){
        renderGrid();
        // Interval'ları sıfırla — API çağrıları bir sonraki frame'e ertele (animasyon tamamlansın)
        if(window._syncRatesInterval) { clearInterval(window._syncRatesInterval); }
        if(window._glFetchInterval)   { clearInterval(window._glFetchInterval); }
        if(window._borsaInterval)     { clearInterval(window._borsaInterval); }
        window._syncRatesInterval = setInterval(syncRates, 120000);
        window._glFetchInterval   = setInterval(glFetch, 120000);
        window._borsaInterval     = setInterval(borsaBandiGuncelle, 120000);
        // API çağrılarını animasyon bittikten sonra başlat (180ms = pageIn süresi)
        setTimeout(() => { syncRates(); glFetch(); borsaBandiGuncelle(); }, 200);
      } else if(p==='market'){
        document.getElementById('searchInput').value='';
        document.getElementById('searchResults').innerHTML='';
        document.getElementById('searchResults').style.display='none';
        syncCryptoWS();
      } else if(p==='notes'){
        notesCheckLock();
      } else if(p==='doviz'){
        dovizInit();
      } else if(p==='takvim'){
        takvimInit();
      } else if(p==='deprem'){
        depremInit();
      } else if(p==='cuzdan'){
        wltInit();
      } else if(p==='analiz'){
        analizLoadSymbols();
      } else if(p==='sentinel'){
        sentinelLoadSymbols();
      } else if(p==='futures'){
        ftLoad(function(){ ftRender(); if(ftPositions.length) ftStartPnlRefresh(); });
        ftLoadSymbols();
        document.getElementById('ftSearchInput') && (document.getElementById('ftSearchInput').value='');
        clearTimeout(futuresRefreshTimer);
        // Sayfayı sıfırla
        document.getElementById('sentinelInput').value='';
        document.getElementById('sentinelDropdown').style.display='none';
        document.getElementById('sentinelScanProgress').style.display='none';
      } else if(p==='fibo'){
        fiboInit();
      } else if(p==='whale'){
        whaleInit();
      } else if(p==='nabiz'){
        nabizInit();
      } else if(p==='rsi'){
        rsiInit();
      } else if(p==='hacim'){
        hacimInit();
      } else if(p==='sinyal'){
        sinyalInit();
      } else if(p==='sohbet'){
        sohbetWidgetAc();
      } else if(p==='sentinelDetail'){
        // detay sayfası zaten doldurulmuş gelir
      }

      // Lucide ikonları — en sona, en ağır iş
      if(window.lucide) {
        const pg = document.getElementById(p+'Page');
        const unprocessed = (pg || document).querySelectorAll('[data-lucide]:not([data-processed])');
        if(unprocessed.length) lucide.createIcons();
      }
    });
  });
}

// Telefon geri tuşu — önce açık modal varsa kapat, yoksa sayfadan çık
window.addEventListener('popstate', function(e) {
  requestAnimationFrame(() => {
    // Sohbet widget — state'e göre kapat (açık ama state yoksa da kapat)
    const sohbetWidget = document.getElementById('sohbetWidget');
    if (sohbetWidget && sohbetWidget.classList.contains('open')) {
      window.sohbetWidgetKapat(true);
      return;
    }
    // State sohbet state'i ise ama widget kapalıysa — state'i geç, devam et
    if (e.state && e.state.sohbetOpen) return;
    // Arama state'i mi?
    if (e.state && e.state.search) {
      homeSearchTemizle();
      return;
    }
    // Chart modal açık mı kontrol et
    const chartModal = document.getElementById('chartModal');
    if (chartModal && chartModal.classList.contains('show')) {
      _closeChart();
      return;
    }
    // Cüzdan modal açık mı
    const wltModal = document.getElementById('wltModal');
    if (wltModal && wltModal.classList.contains('open')) {
      wltCloseModal();
      return;
    }
    // Futures modal açık mı
    const ftModal = document.getElementById('ftModal');
    if (ftModal && ftModal.style.display === 'flex') {
      ftCloseModal();
      return;
    }
    // Ana sayfa araması açık mı
    const sr = document.getElementById('homeSearchResults');
    if (sr && sr.style.display !== 'none') {
      homeSearchTemizle();
      return;
    }

    // Hangi sayfaya gidileceğini state'ten belirle
    const targetPage = (e.state && e.state.page) ? e.state.page : 'home';
    // Alpine state güncelle
    if (window.$alpine) window.$alpine.activePage = targetPage;

    // Mevcut aktif sayfayı bul
    const currentPage = document.querySelector('.page.active');
    const currentId = currentPage ? currentPage.id.replace('Page','') : 'home';

    if (currentId === targetPage) return; // zaten oradayız

    // Sadece DOM'u değiştir — history'e dokunma (zaten popstate halletti)
    if (currentPage) currentPage.classList.remove('active');
    const nextPage = document.getElementById(targetPage + 'Page');
    if (nextPage) nextPage.classList.add('active');

    const labels={'home':'DORUK','market':'','notes':'Not Defteri','takvim':'Takvim & Önemli Günler','doviz':'Döviz Çevirici','ceviri':'Çeviri','deprem':'Deprem Takibi','cuzdan':'💼 Kripto Cüzdan','analiz':'📊 Kripto Analiz','sentinel':'🔭 Doruk Sentinel','sentinelDetail':'🔭 Doruk Sentinel','futures':'📈 Strateji','fibo':'📐 Auto Fibonacci','whale':'🐋 Whale Tracker','sinyal':'TREND','sohbet':'🤖 AI Asistan','nabiz':'📡 Piyasa Nabzı','rsi':'📉 RSI Tarayıcı','hacim':'🔥 Hacim Tarayıcı'};
    const _htitle2 = (targetPage in labels) ? labels[targetPage] : targetPage;
    const _hel2 = document.getElementById('headerTitle');
    _hel2.textContent = _htitle2;
    _hel2.style.letterSpacing = _htitle2.length <= 6 ? '6px' : _htitle2.length <= 12 ? '3px' : '1px';
    var _isHome2 = targetPage === 'home';
    var _lb2 = document.getElementById('logoutBtn');
    var _bi2 = document.getElementById('backIcon');
    _lb2.style.display = _isHome2 ? 'flex' : 'none';
    _lb2.style.pointerEvents = _isHome2 ? 'auto' : 'none';
    _bi2.style.display = _isHome2 ? 'none' : 'flex';
    _bi2.style.pointerEvents = _isHome2 ? 'none' : 'auto';

    // Ana sayfaya geri dönünce fiyatları hemen yenile, interval'ı sıfırla
    if (targetPage === 'home') {
      renderGrid();
      if(window._syncRatesInterval) clearInterval(window._syncRatesInterval);
      if(window._glFetchInterval)   clearInterval(window._glFetchInterval);
      if(window._borsaInterval)     clearInterval(window._borsaInterval);
      window._syncRatesInterval = setInterval(syncRates, 120000);
      window._glFetchInterval   = setInterval(glFetch, 120000);
      window._borsaInterval     = setInterval(borsaBandiGuncelle, 120000);
      setTimeout(() => { syncRates(); glFetch(); borsaBandiGuncelle(); }, 200);
    }
  });
});

// Sayfa ilk yüklenince history başlangıç state'ini ayarla
window.addEventListener('DOMContentLoaded', function() {
  history.replaceState({page:'home'}, '', '');

  // Login ekranını hemen göster — sadece oturum yoksa
  (function() {
    var loginUser = localStorage.getItem('doruk_login_user');
    if (!loginUser) {
      var loginScreen = document.getElementById('loginScreen');
      if (loginScreen) loginScreen.style.display = 'flex';
    } else {
      // Zaten giriş yapmış — açılış logu yaz (gecikmeli, Firebase hazır olsun)
      setTimeout(function() {
        if (typeof _loginLogKaydet === 'function') {
          _loginLogKaydet(loginUser, 'giris');
        }
      }, 2000);
    }
  })();

  // ── Açılışta cihaz + IP ban kontrolü (arka planda) ──
  (function() {
    var deviceId = localStorage.getItem('doruk_device_id');

    function showBanScreen() {
      var s = document.getElementById('doruk-ban-screen');
      if (s) s.style.display = 'flex';
      // Diğer tüm ekranları kapat
      var login = document.getElementById('loginScreen');
      if (login) login.style.display = 'none';
      var sohbet = document.getElementById('sohbetWidget');
      if (sohbet) { sohbet.classList.remove('open'); }
      var appContainer = document.querySelector('.app-container');
      if (appContainer) appContainer.style.pointerEvents = 'none';
      // Sayfa scroll ve etkileşimi kilitle
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'none';
      s.style.pointerEvents = 'all';
    }
    function hideBanScreen() {
      var s = document.getElementById('doruk-ban-screen');
      if (s) s.style.display = 'none';
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      var appContainer = document.querySelector('.app-container');
      if (appContainer) appContainer.style.pointerEvents = '';
    }

    function doChecks(db) {
      var banned = false;

      // Cihaz kontrolü
      if (deviceId) {
        var devKey = deviceId.replace(/[.#$\/\[\]]/g, '_');
        db.ref('cihaz_banlar/' + devKey).once('value', function(snap) {
          if (snap.exists()) { banned = true; showBanScreen(); }
          if (!banned) hideBanScreen();
        });
      } else {
        hideBanScreen();
      }
    }

    function loadFirebaseAndCheck() {
      function loadScript(src, cb) {
        var s = document.createElement('script');
        s.src = src; s.onload = cb; s.onerror = function() { if(cb) cb(); };
        document.head.appendChild(s);
      }
      loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js', function() {
        loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js', function() {
          loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js', function() {
            try {
              if (!window.firebase.apps || !window.firebase.apps.length) {
                window.firebase.initializeApp({ apiKey:"AIzaSyCZk-OgjuuO8t4SNary0L2C8WyhyC8IWMA", authDomain:"doruk-sohbet.firebaseapp.com", databaseURL:"https://doruk-sohbet-default-rtdb.firebaseio.com", projectId:"doruk-sohbet", storageBucket:"doruk-sohbet.firebasestorage.app", messagingSenderId:"155992007314", appId:"1:155992007314:web:3d7f16edd31774f60f3c4b" });
              }
              doChecks(window.firebase.database());
            } catch(e) {}
          });
        });
      });
    }

    // Arka planda çalıştır — login ekranını bloklamasın
    setTimeout(function() {
      if (window.firebase && window.firebase.database) {
        try { doChecks(window.firebase.database()); }
        catch(e) { loadFirebaseAndCheck(); }
      } else {
        loadFirebaseAndCheck();
      }
    }, 100);
  })();
});
