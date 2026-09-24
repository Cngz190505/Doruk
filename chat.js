/* Doruk module: chat.js */
// ===================== SOHBET FLOATING WIDGET =====================
(function() {
  const ADMIN_NICK = 'Doruk';
  const ADMIN_HASH = '71a35a06b8e46be2ece764ba390207b3a8155d350d63332cab5d3a9cd661031d';

  let sohbetKullaniciAdi = null;
  let sohbetDeviceId = null;
  let sohbetDB = null;
  let sohbetBaslatildi = false;
  let modMi = false;

  function _getDeviceId() {
    let id = localStorage.getItem('doruk_device_id');
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,9);
      localStorage.setItem('doruk_device_id', id);
    }
    return id;
  }

  // IP adresini al ve cache'le (5 dakika)

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  // Eski sürükleme konumunu temizle
  localStorage.removeItem('doruk_fab_pos');

  window.sohbetWidgetAc = function() {
    // Giriş kontrolü — login olmadan sohbet açılamaz
    const loginUser = localStorage.getItem('doruk_login_user');
    if (!loginUser) {
      const loginScreen = document.getElementById('loginScreen');
      if (loginScreen) loginScreen.style.display = 'flex';
      return;
    }
    const widget = document.getElementById('sohbetWidget');
    const overlay = document.getElementById('sohbetOverlay');
    const fab = document.getElementById('sohbetFab');
    if (!widget) return;
    if (widget.classList.contains('open')) return;
    widget.classList.add('open');
    overlay.classList.add('show');
    if (fab) fab.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Geri tuşu ile kapanabilmesi için history'e bir state ekle
    history.pushState({ sohbetOpen: true }, '');

    if (!sohbetBaslatildi) {
      sohbetInit();
      sohbetBaslatildi = true;
    } else if (loginUser !== sohbetKullaniciAdi) {
      // Kullanıcı değişmiş — tam sıfırla ve yeniden başlat
      if (window._sohbetDBSifirla) window._sohbetDBSifirla();
      sohbetInit();
      sohbetBaslatildi = true;
    } else {
      setTimeout(()=>{ const c=document.getElementById('sohbetMessages'); if(c) c.scrollTop=c.scrollHeight; },100);
    }

    // Widget açıldıktan sonra admin butonlarını her zaman yeniden uygula
    setTimeout(function() { if (sohbetKullaniciAdi) _nickGoster(sohbetKullaniciAdi); }, 80);
  };

  window.sohbetWidgetKapat = function(fromPopstate) {
    const widget = document.getElementById('sohbetWidget');
    const overlay = document.getElementById('sohbetOverlay');
    const fab = document.getElementById('sohbetFab');
    if (!widget || !widget.classList.contains('open')) return;
    widget.classList.remove('open');
    overlay.classList.remove('show');
    if (fab) fab.classList.remove('open');
    document.body.style.overflow = '';
    // X butonu veya overlay ile kapatılınca eklenen state'i temizle
    if (!fromPopstate) history.back();
  };

  function sohbetFirebaseYukle(callback, errCallback) {
    if (sohbetDB) { callback(sohbetDB); return; }
    if (window.firebase && window.firebase.database) {
      try { sohbetDB = window.firebase.database(); callback(sohbetDB); return; } catch(e) {}
    }
    var FIREBASE_CFG = { apiKey:"AIzaSyCZk-OgjuuO8t4SNary0L2C8WyhyC8IWMA", authDomain:"doruk-sohbet.firebaseapp.com", databaseURL:"https://doruk-sohbet-default-rtdb.firebaseio.com", projectId:"doruk-sohbet", storageBucket:"doruk-sohbet.firebasestorage.app", messagingSenderId:"155992007314", appId:"1:155992007314:web:3d7f16edd31774f60f3c4b" };
    var scriptHata = false;
    function onHata(msg) {
      if (scriptHata) return; scriptHata = true;
      var container = document.getElementById('sohbetMessages');
      if (container) container.innerHTML = '<div style="text-align:center;padding:30px;color:#ff4664;font-size:12px;font-weight:700;">⚠️ ' + (msg||'Bağlantı hatası') + '<br><br><button onclick="sohbetBaslat&&sohbetBaslat()" style="margin-top:8px;padding:8px 20px;border-radius:10px;background:rgba(0,180,255,0.15);border:1px solid rgba(0,180,255,0.3);color:#7dd3fc;font-size:11px;font-weight:800;cursor:pointer;">🔄 Tekrar Dene</button></div>';
      if (errCallback) errCallback(msg);
    }
    function loadScript(src, cb) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = cb;
      s.onerror = function() { onHata('Firebase yüklenemedi. İnternet bağlantınızı kontrol edin.'); };
      document.head.appendChild(s);
    }
    // 10 saniye içinde bağlanamazsa hata göster
    var timeout = setTimeout(function() { onHata('Bağlantı zaman aşımına uğradı.'); }, 10000);
    loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js', function() {
      loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js', function() {
        loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js', function() {
          clearTimeout(timeout);
          try {
            if (!window.firebase.apps || !window.firebase.apps.length) {
              window.firebase.initializeApp(FIREBASE_CFG);
            }
            sohbetDB = window.firebase.database();
            callback(sohbetDB);
          } catch(e) { onHata('Firebase başlatma hatası: ' + e.message); }
        });
      });
    });
  }

  function _sohbetDBSifirla() {
    try { if (sohbetDB) { sohbetDB.ref('mesajlar').off(); } } catch(e) {}
    sohbetDB = null;
    sohbetKullaniciAdi = null;
    sohbetBaslatildi = false;
  }
  window._sohbetDBSifirla = _sohbetDBSifirla;

  function _nickGoster(nick) {
    const el = document.getElementById('sohbetNickGoster');
    if (el) el.textContent = nick;
    const pill = document.getElementById('sohbetNickBadge');
    if (pill) pill.style.display = nick ? 'flex' : 'none';
    const row = document.getElementById('sohbetNickRow');
    if (row) row.style.display = nick.toLowerCase() === ADMIN_NICK.toLowerCase() ? 'flex' : 'none';
    const badge = document.getElementById('sohbetAdminBadge');
    if (badge) badge.style.display = nick.toLowerCase() === ADMIN_NICK.toLowerCase() ? 'inline' : 'none';
    // Ortadaki kullanıcı ismi — sadece normal kullanıcılar için
    const centerNick = document.getElementById('swUserNickCenter');
    if (centerNick) {
      if (nick && nick.toLowerCase() !== ADMIN_NICK.toLowerCase()) {
        centerNick.textContent = nick;
        centerNick.style.display = 'block';
      } else {
        centerNick.style.display = 'none';
      }
    }
    // Admin butonları — sadece admin görür
    const silBtn = document.getElementById('sohbetTumunuSilBtn');
    if (silBtn) silBtn.style.display = nick.toLowerCase() === ADMIN_NICK.toLowerCase() ? 'flex' : 'none';
    const banBtn = document.getElementById('sohbetBanPanelBtn');
    if (banBtn) banBtn.style.display = nick.toLowerCase() === ADMIN_NICK.toLowerCase() ? 'flex' : 'none';
    const susturBtn = document.getElementById('sohbetSusturPanelBtn');
    if (susturBtn) susturBtn.style.display = nick.toLowerCase() === ADMIN_NICK.toLowerCase() ? 'flex' : 'none';
    const renkBtn = document.getElementById('sohbetAdminRenkBtn');
    if (renkBtn) renkBtn.style.display = nick.toLowerCase() === ADMIN_NICK.toLowerCase() ? 'flex' : 'none';
    // Nick değiştir — herkes görebilir
    const nickDegBtn = document.querySelector('.sw-icon-btn[onclick="sohbetTemizle()"]');
    if (nickDegBtn) nickDegBtn.style.display = '';
  }

  function sohbetInit() {
    sohbetDeviceId = _getDeviceId();
    // Giriş ekranından kullanıcı adını al — sadece kayıtlı kullanıcılar
    const loginUser = localStorage.getItem('doruk_login_user');
    if (loginUser) {
      sohbetKullaniciAdi = loginUser;
      localStorage.setItem('doruk_sohbet_nick', loginUser);
      _nickGoster(loginUser);
      sohbetBaslat();
    } else {
      // Login yoksa sohbeti kapatıp login ekranına yönlendir
      window.sohbetWidgetKapat(false);
      const loginScreen = document.getElementById('loginScreen');
      if (loginScreen) loginScreen.style.display = 'flex';
    }
  }

  // PIN giriş UI — adım 2
  function sohbetBaslat() {
    banListesiDinle();
    const container = document.getElementById('sohbetMessages');
    container.innerHTML = '<div style="text-align:center;padding:30px;color:#4a6a8a;font-size:12px;font-weight:700;">🔄 Bağlanıyor...</div>';
    sohbetFirebaseYukle(function(db) {
      const ref = db.ref('mesajlar').orderByChild('zaman').limitToLast(80);
      ref.on('value', function(snap) {
        const data = snap.val();
        if (!data) { container.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;gap:10px;"><div style="font-size:30px;opacity:0.25;">💬</div><div style="font-size:13px;font-weight:400;color:#2e4a62;text-align:center;line-height:1.7;">Henüz mesaj yok.<br>İlk mesajı sen gönder.</div></div>'; return; }
        sohbetMesajlariRender(data);
      }, function(err) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:#ff4664;font-size:12px;font-weight:700;">⚠️ Bağlantı hatası<br><span style=\"font-size:10px;color:#4a6a8a;\">' + err.message + '</span><br><br><button onclick=\"window.sohbetBaslat&&window.sohbetBaslat()\" style=\"margin-top:8px;padding:8px 20px;border-radius:10px;background:rgba(0,180,255,0.15);border:1px solid rgba(0,180,255,0.3);color:#7dd3fc;font-size:11px;font-weight:800;cursor:pointer;\">🔄 Tekrar Dene</button></div>';
      });
    }, function(errMsg) {
      // Script yükleme hatası — zaten sohbetFirebaseYukle içinde gösteriliyor
    });
  }
  window.sohbetBaslat = sohbetBaslat;

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }

  function sohbetMesajlariRender(data) {
    const container = document.getElementById('sohbetMessages');
    if (!container) return;
    const signatureKeys = Object.keys(data || {}).sort();
    const signature = signatureKeys.map(function(key) {
      const item = data[key] || {};
      return key + ':' + (item.zaman || 0) + ':' + (item.metin || '');
    }).join(String.fromCharCode(1));
    if (signature === window._sohbetRenderSignature) return;
    window._sohbetRenderSignature = signature;
    const enAltta = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    const adminGiris = (sohbetKullaniciAdi||'').toLowerCase() === ADMIN_NICK.toLowerCase();
    const keys = signatureKeys.sort((a,b) => (data[a].zaman||0) - (data[b].zaman||0));
    container.innerHTML = '';
    let sonGun = '';
    keys.forEach(key => {
      const m = data[key];
      if (!m || !m.metin) return;
      const nick = m.nick || 'Anonim';
      const ts = m.zaman ? new Date(m.zaman) : null;
      const zaman = ts ? ts.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}) : '';
      const gunStr = ts ? ts.toLocaleDateString('tr-TR',{day:'numeric',month:'long'}) : '';
      const benimMi = nick === sohbetKullaniciAdi;
      const adminMi = nick.toLowerCase() === ADMIN_NICK.toLowerCase();
      const nickKey = nick.replace(/[.#$/\[\]]/g,'_');
      if (gunStr && gunStr !== sonGun) {
        sonGun = gunStr;
        const sep = document.createElement('div');
        sep.className = 'sohbet-date-sep';
        sep.innerHTML = '<span>' + gunStr + '</span>';
        container.appendChild(sep);
      }
      const row = document.createElement('div');
      row.className = 'sohbet-msg-row ' + (benimMi ? 'user' : 'bot');
      let nickHtml = '';
      if (!benimMi) {
        if (adminMi) {
nickHtml = `<div class="sohbet-msg-nick admin-nick"><span class="sohbet-admin-label">DORUK</span><span class="sohbet-admin-badge">ADMİN</span></div>`;
        } else if (modMi) {
          nickHtml = `<div class="sohbet-msg-nick admin-nick"><span style="font-size:12px;font-weight:800;color:#00e676;">${escHtml(nick)}</span><span style="font-size:7px;font-weight:900;background:linear-gradient(90deg,#00c853,#00e676);color:#020810;padding:2px 6px;border-radius:6px;letter-spacing:1px;flex-shrink:0;box-shadow:0 0 6px rgba(0,200,80,0.4);">MOD</span></div>`;
        } else {
          nickHtml = '<div class="sohbet-msg-nick">' + escHtml(nick) + '</div>';
        }
      }
      const botTip = m.botTip || '';
      const botRenk = nick==='🤖 Doruk Bot' ? ' bot-'+(botTip||'normal') : '';
      let bubbleStyle = '';
      const balonClass = 'sohbet-bubble' + (adminMi && !benimMi ? ' admin-bubble' : '') + botRenk;
      const checkSvg = benimMi ? '<svg width="14" height="9" viewBox="0 0 16 11" fill="none"><path d="M1 5.5l4 4L15 1" stroke="#00b4d8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 5.5l4 4" stroke="#00b4d8" stroke-width="1.8" stroke-linecap="round"/></svg>' : '';
      const icerik = (nick === '🤖 Doruk Bot' && m.html) ? m.html : escHtml(m.metin);
      // Admin için nick'e tıklanabilir özellik ekle
      if (adminGiris && !benimMi && !adminMi) {
        const safeNick = nick.replace(/'/g, "\\'");
        const modDurum = modMi ? '⭐ Yetki Kaldır' : '⭐ Yetki Ver';
        nickHtml = modMi
          ? `<div class="sohbet-msg-nick admin-nick" style="cursor:pointer;" onclick="window._sohbetNickPopupAc(event,'${safeNick}','${key}')"><span style="font-size:12px;font-weight:800;color:#00e676;">${escHtml(nick)}</span><span style="font-size:7px;font-weight:900;background:linear-gradient(90deg,#00c853,#00e676);color:#020810;padding:2px 6px;border-radius:6px;letter-spacing:1px;">MOD</span></div>`
          : `<div class="sohbet-msg-nick" style="cursor:pointer;" onclick="window._sohbetNickPopupAc(event,'${safeNick}','${key}')">${escHtml(nick)}</div>`;
      }
      row.innerHTML = nickHtml +
        `<div class="sohbet-bubble-wrap"><div class="${balonClass}"${bubbleStyle}>${icerik}</div></div>` +
        '<div class="sohbet-msg-time">' + zaman + checkSvg + '</div>';
      container.appendChild(row);
    });
    if (enAltta) container.scrollTop = container.scrollHeight;
  }

  // Nick popup
  (function() {
    var _popupKey = null;
    var _popupNick = null;

    function kapatPopup() {
      var p = document.getElementById('sohbetNickPopup');
      if (p) p.classList.remove('show');
      document.removeEventListener('click', _disariTikla);
    }

    function _disariTikla(e) {
      var p = document.getElementById('sohbetNickPopup');
      if (p && !p.contains(e.target)) kapatPopup();
    }

    window._sohbetNickPopupAc = function(e, nick, key) {
      e.stopPropagation();
      _popupNick = nick;
      _popupKey = key;
      var p = document.getElementById('sohbetNickPopup');
      var lbl = document.getElementById('snpNickLabel');
      if (lbl) lbl.textContent = nick;

      // Pozisyon — tıklanan yerin yakınına
      var x = e.clientX, y = e.clientY;
      var pw = 150, ph = 90;
      var widget = document.getElementById('sohbetWidget');
      var wr = widget ? widget.getBoundingClientRect() : {left:0,top:0,right:window.innerWidth,bottom:window.innerHeight};
      if (x + pw > wr.right - 8) x = wr.right - pw - 8;
      if (y + ph > wr.bottom - 8) y = y - ph;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.classList.add('show');
      setTimeout(function() { document.addEventListener('click', _disariTikla); }, 50);
    };

    document.getElementById('snpSilBtn').onclick = function() {
      if (_popupKey) window._sohbetSil(_popupKey);
      kapatPopup();
    };
    document.getElementById('snpSusturBtn').onclick = function() {
      if (_popupNick) window._sohbetSustur(_popupNick);
      kapatPopup();
    };
    document.getElementById('snpBanBtn').onclick = function() {
      if (_popupNick) window._sohbetBan(_popupNick);
      kapatPopup();
    };

    // Popup açılırken
    const _origPopupAc = window._sohbetNickPopupAc;
    window._sohbetNickPopupAc = function(e, nick, key) {
      _origPopupAc(e, nick, key);
      const nickKey = nick.replace(/[.#$/\[\]]/g,'_');

    };
  })();

  window._sohbetSil = function(key) {
    if (!key) return;
    sohbetFirebaseYukle(function(db) { db.ref('mesajlar/' + key).remove().catch(function(e){ console.warn('Silinemedi:', e.message); }); });
  };

  // ── BAN SİSTEMİ ──
  let banliKullanicilar = {};
  let susturluKullanicilar = {};

  // Ban durumu — tüm kaynaklar birlikte takip edilir
  var _banDurumu = { nick: false, cihaz: false, ip: false };

  function _banDurumKontrol() {
    // Herhangi biri banlıysa kilitle, hepsi temizse kilidi aç
    if (_banDurumu.nick || _banDurumu.cihaz) {
      _banKilitle();
    } else {
      _banKilidiAc();
    }
  }

  function banListesiDinle() {
    sohbetFirebaseYukle(function(db) {
      db.ref('susturlar').on('value', function(snap) {
        susturluKullanicilar = snap.val() || {};
        if (sohbetKullaniciAdi && (sohbetKullaniciAdi||'').toLowerCase() !== ADMIN_NICK.toLowerCase() && _nickSusturluMu(sohbetKullaniciAdi)) {
          _susturKilitle();
        } else {
          _susturKilidiAc();
        }
      });
      db.ref('banlar').on('value', function(snap) {
        banliKullanicilar = snap.val() || {};
        if (sohbetKullaniciAdi && (sohbetKullaniciAdi||'').toLowerCase() !== ADMIN_NICK.toLowerCase()) {
          _banDurumu.nick = _nickBanliMi(sohbetKullaniciAdi);
        } else {
          _banDurumu.nick = false;
        }
        _banDurumKontrol();
      });
      // Cihaz + IP ban dinle — admin muaf
      if ((sohbetKullaniciAdi||'').toLowerCase() !== ADMIN_NICK.toLowerCase()) {
        if (sohbetDeviceId) {
          const devKey = sohbetDeviceId.replace(/[.#$/\[\]]/g,'_');
          db.ref('cihaz_banlar/' + devKey).on('value', function(snap) {
            _banDurumu.cihaz = snap.exists();
            _banDurumKontrol();
          });
        }

      }
    });
  }

  function _banKilitle() {
    // Firebase Auth oturumunu kapat
    try {
      if (window.firebase && window.firebase.auth) {
        window.firebase.auth().signOut().catch(function(){});
      }
    } catch(e) {}

    // localStorage temizle
    try {
      var savedK = localStorage.getItem('doruk_saved_kullanici');
      if (savedK) localStorage.removeItem('doruk_saved_sifre_' + savedK);
      localStorage.removeItem('doruk_saved_kullanici');
      localStorage.removeItem('doruk_giris_kullanici');
      localStorage.removeItem('doruk_login_user');
      sessionStorage.removeItem('doruk_giris_kullanici');
    } catch(e) {}

    // Uygulamayı gizle
    var appContainer = document.getElementById('appContainer');
    if (appContainer) { appContainer.style.visibility = 'hidden'; appContainer.style.opacity = '0'; }

    // Sohbet widget'ını kapat
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

    // 2 saniye sonra ban ekranından giriş ekranına geç
    setTimeout(function() {
      if (banScreen) banScreen.style.display = 'none';
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      var login = document.getElementById('loginScreen');
      if (login) {
        login.style.display = 'flex';
        // Giriş formunu temizle
        var girisK = document.getElementById('girisKullanici');
        var girisS = document.getElementById('girisSifre');
        if (girisK) girisK.value = '';
        if (girisS) girisS.value = '';
        // "Hesabınız askıya alındı" uyarısı göster
        var loginErr = document.getElementById('loginErr');
        if (loginErr) {
          loginErr.textContent = '🚫 Hesabınız askıya alındı.';
        }
      }
      setTimeout(_loginKayitliYukle, 50);
    }, 2000);
  }

  function _banKilidiAc() {
    const input = document.getElementById('sohbetInput');
    const btn = document.getElementById('sohbetSendBtn');
    const wrap = document.querySelector('.sw-input-area');
    if (input) { input.disabled = false; input.placeholder = 'Mesaj yaz...'; input.style.color = ''; }
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    if (wrap) wrap.style.opacity = '';
    const banner = document.getElementById('banBanner');
    if (banner) banner.remove();
    // Ban ekranını kapat ve uygulamayı geri getir
    var banScreen = document.getElementById('doruk-ban-screen');
    if (banScreen) banScreen.style.display = 'none';
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    var appContainer = document.getElementById('appContainer');
    var loginUser = localStorage.getItem('doruk_login_user');
    if (appContainer && loginUser) {
      appContainer.style.visibility = 'visible';
      appContainer.style.opacity = '1';
      appContainer.style.pointerEvents = '';
    }
  }

  window._sohbetBan = function(nick) {
    if ((sohbetKullaniciAdi||'').toLowerCase() !== ADMIN_NICK.toLowerCase()) return;
    if (nick.toLowerCase() === ADMIN_NICK.toLowerCase()) { _toast('❌ Admin banlanamaz!', '#ff4664'); return; }
    dorukConfirm({
      icon: '🔨', title: 'Kullanıcı Banla',
      msg: '"' + nick + '" kullanıcısı banlanacak! Emin misin?',
      okText: 'Banla', danger: true,
      cb: function(onay) {
        if (!onay) return;
        sohbetFirebaseYukle(function(db) {
          const nickKey = nick.replace(/[.#$/\[\]]/g,'_');
          const banData = { nick: nick, zaman: Date.now(), banlayan: ADMIN_NICK };
          const updates = {};
          updates['banlar/' + nickKey] = banData;

          // cihaz ID'sini bul
          db.ref('nick_cihaz/' + nickKey).once('value', function(devSnap) {
            const deviceId = devSnap.val();
            if (deviceId) {
              updates['cihaz_banlar/' + deviceId.replace(/[.#$/\[\]]/g,'_')] = banData;
            }
            db.ref().update(updates).then(function() {
                _toast('🔨 ' + nick + ' banlandı!', '#ff6030');
              }).catch(function(e) { _toast('Ban hatası: ' + e.message, '#ff4664'); });
          });
        });
      }
    });
  };

  window._sohbetBanKaldir = function(nick) {
    if ((sohbetKullaniciAdi||'').toLowerCase() !== ADMIN_NICK.toLowerCase()) return;
    sohbetFirebaseYukle(function(db) {
      const nickKey = nick.replace(/[.#$/\[\]]/g,'_');
      const updates = {};
      updates['banlar/' + nickKey] = null;
      db.ref('nick_cihaz/' + nickKey).once('value', function(devSnap) {
        const deviceId = devSnap.val();
        if (deviceId) updates['cihaz_banlar/' + deviceId.replace(/[.#$/\[\]]/g,'_')] = null;
        db.ref().update(updates).then(function() {
          _toast('✅ ' + nick + ' banı kaldırıldı', '#00e676');
        });
      });
    });
  };

  function _nickBanliMi(nick) {
    const key = nick.replace(/[.#$/\[\]]/g,'_');
    return !!banliKullanicilar[key];
  }

  function _nickSusturluMu(nick) {
    const key = nick.replace(/[.#$/\[\]]/g,'_');
    return !!susturluKullanicilar[key];
  }

  function _susturKilitle() {
    const input = document.getElementById('sohbetInput');
    const btn = document.getElementById('sohbetSendBtn');
    const wrap = document.querySelector('.sw-input-area');
    if (input) { input.disabled = true; input.placeholder = '🔇 Susturuldunuz'; input.style.color = '#8090ff'; }
    if (btn) { btn.disabled = true; btn.style.opacity = '0.2'; }
    if (wrap) wrap.style.opacity = '0.5';
    if (!document.getElementById('susturBanner')) {
      const banner = document.createElement('div');
      banner.id = 'susturBanner';
      banner.style.cssText = 'background:linear-gradient(90deg,rgba(60,60,200,0.15),rgba(40,40,160,0.10));border-top:1px solid rgba(100,100,255,0.20);padding:8px 16px;text-align:center;font-size:11px;font-weight:800;color:#8090ff;letter-spacing:0.5px;';
      banner.textContent = '🔇 Yönetici tarafından susturuldunuz';
      const msgs = document.getElementById('sohbetMessages');
      if (msgs && msgs.parentNode) msgs.parentNode.insertBefore(banner, msgs);
    }
  }

  function _susturKilidiAc() {
    const input = document.getElementById('sohbetInput');
    const btn = document.getElementById('sohbetSendBtn');
    const wrap = document.querySelector('.sw-input-area');
    if (input && input.placeholder === '🔇 Susturuldunuz') {
      input.disabled = false; input.placeholder = 'Mesaj yaz...'; input.style.color = '';
    }
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    if (wrap) wrap.style.opacity = '1';
    const banner = document.getElementById('susturBanner');
    if (banner) banner.remove();
  }

  function _toast(mesaj, renk) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:130px;left:50%;transform:translateX(-50%);background:' + (renk||'rgba(0,180,255,0.92)') + ';color:#fff;padding:10px 22px;border-radius:14px;font-size:12px;font-weight:800;letter-spacing:0.5px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.5);white-space:nowrap;';
    t.textContent = mesaj;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }
  window._toast = _toast; // Çevir Kazan / Sandık / Admin panel gibi diğer bölümlerin erişebilmesi için global'e bağla

  // Admin ban yönetim paneli
  window.sohbetBanPanel = function() {
    if ((sohbetKullaniciAdi||'').toLowerCase() !== ADMIN_NICK.toLowerCase()) return;
    const mevcut = Object.values(banliKullanicilar);
    let liste = mevcut.length === 0
      ? '<div style="color:#4a6a8a;font-size:12px;padding:8px 0;">Banlı kullanıcı yok.</div>'
      : mevcut.map(b => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,70,50,0.08);border:1px solid rgba(255,70,50,0.2);border-radius:10px;margin-bottom:6px;">
          <span style="color:#ffaa88;font-size:12px;font-weight:700;">🔨 ${b.nick}</span>
          <button onclick="window._sohbetBanKaldir('${b.nick}');document.getElementById('banPanelOverlay').remove();" style="font-size:10px;padding:4px 10px;border-radius:8px;background:rgba(0,200,100,0.15);border:1px solid rgba(0,200,100,0.3);color:#00e676;font-weight:800;cursor:pointer;">KALDIR</button>
        </div>`).join('');

    const overlay = document.createElement('div');
    overlay.id = 'banPanelOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,16,0.85);z-index:9998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
    overlay.innerHTML = `
      <div style="width:88%;max-width:340px;background:linear-gradient(145deg,#0a1828,#060f1e);border:1px solid rgba(0,200,255,0.22);border-radius:20px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,0.8);">
        <div style="font-size:14px;font-weight:900;color:#e8f4ff;margin-bottom:4px;letter-spacing:0.5px;">🔨 Ban Yönetimi</div>
        <div style="font-size:10px;color:#4a6a8a;margin-bottom:16px;letter-spacing:0.5px;">Banlı kullanıcılar mesaj gönderemez</div>
        <div id="banListesi" style="margin-bottom:14px;">${liste}</div>
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <input id="banNickInput" type="text" placeholder="Kullanıcı adı gir..." style="flex:1;background:rgba(0,0,0,0.3);border:1px solid rgba(0,200,255,0.25);border-radius:10px;padding:9px 14px;color:#e8f4ff;font-size:12px;font-weight:600;outline:none;"/>
          <button onclick="
            const n=document.getElementById('banNickInput').value.trim();
            if(n){window._sohbetBan(n);setTimeout(()=>document.getElementById('banPanelOverlay').remove(),600);}
          " style="padding:9px 14px;border-radius:10px;background:linear-gradient(145deg,#8b0000,#cc2200);border:1px solid rgba(255,80,50,0.35);color:#fff;font-size:11px;font-weight:900;cursor:pointer;letter-spacing:0.5px;">BAN AT</button>
        </div>
        <button onclick="document.getElementById('banPanelOverlay').remove();" style="width:100%;padding:10px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);color:#7aa0c4;font-size:11px;font-weight:800;cursor:pointer;letter-spacing:1px;">KAPAT</button>
      </div>`;
    document.body.appendChild(overlay);
  };

  

  window.sohbetSusturPanel = function() {
    if ((sohbetKullaniciAdi||'').toLowerCase() !== ADMIN_NICK.toLowerCase()) return;
    const mevcut = Object.values(susturluKullanicilar);
    const liste = mevcut.length === 0
      ? '<div style="color:#4a6a8a;font-size:12px;padding:8px 0;">Susturulmuş kullanıcı yok.</div>'
      : mevcut.map(s => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(80,80,200,0.08);border:1px solid rgba(80,80,200,0.2);border-radius:10px;margin-bottom:6px;">
          <span style="color:#9090ff;font-size:12px;font-weight:700;">🔇 ${s.nick}</span>
          <button onclick="window._sohbetSusturKaldir('${s.nick}');document.getElementById('susturPanelOverlay').remove();" style="font-size:10px;padding:4px 10px;border-radius:8px;background:rgba(0,200,100,0.15);border:1px solid rgba(0,200,100,0.3);color:#00e676;font-weight:800;cursor:pointer;">KALDIR</button>
        </div>`).join('');
    const overlay = document.createElement('div');
    overlay.id = 'susturPanelOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,16,0.85);z-index:9998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
    overlay.innerHTML = `
      <div style="width:88%;max-width:340px;background:linear-gradient(145deg,#0a1028,#060a1e);border:1px solid rgba(80,100,255,0.22);border-radius:20px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,0.8);">
        <div style="font-size:14px;font-weight:900;color:#e8f0ff;margin-bottom:4px;">🔇 Susturma Yönetimi</div>
        <div style="font-size:10px;color:#4a6a8a;margin-bottom:16px;">Susturulanlar mesaj gönderemez, okuyabilir</div>
        <div style="margin-bottom:14px;">${liste}</div>
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <input id="susturNickInput" type="text" placeholder="Kullanıcı adı..." style="flex:1;background:rgba(0,0,0,0.3);border:1px solid rgba(80,100,255,0.25);border-radius:10px;padding:9px 14px;color:#e8f4ff;font-size:12px;outline:none;"/>
          <button onclick="const n=document.getElementById('susturNickInput').value.trim();if(n){window._sohbetSustur(n);setTimeout(()=>{const o=document.getElementById('susturPanelOverlay');if(o)o.remove();},600);}" style="padding:9px 14px;border-radius:10px;background:linear-gradient(145deg,#1a1a80,#2a2acc);border:1px solid rgba(80,100,255,0.35);color:#fff;font-size:11px;font-weight:900;cursor:pointer;">SUSTUR</button>
        </div>
        <button onclick="document.getElementById('susturPanelOverlay').remove();" style="width:100%;padding:10px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);color:#7aa0c4;font-size:11px;font-weight:800;cursor:pointer;">KAPAT</button>
      </div>`;
    document.body.appendChild(overlay);
  };

  window._sohbetSustur = function(nick) {
    if ((sohbetKullaniciAdi||'').toLowerCase() !== ADMIN_NICK.toLowerCase()) return;
    if (nick.toLowerCase() === ADMIN_NICK.toLowerCase()) { _toast('❌ Admin susturulamaz!', '#ff4664'); return; }
    sohbetFirebaseYukle(function(db) {
      db.ref('susturlar/' + nick.replace(/[.#$/\[\]]/g,'_')).set({
        nick: nick, zaman: Date.now(), susturan: ADMIN_NICK
      }).then(function() {
        _toast('🔇 ' + nick + ' susturuldu', '#8090ff');
      }).catch(function(e) { _toast('Hata: ' + e.message, '#ff4664'); });
    });
  };

  window._sohbetSusturKaldir = function(nick) {
    if ((sohbetKullaniciAdi||'').toLowerCase() !== ADMIN_NICK.toLowerCase()) return;
    sohbetFirebaseYukle(function(db) {
      db.ref('susturlar/' + nick.replace(/[.#$/\[\]]/g,'_')).remove().then(function() {
        _toast('✅ ' + nick + ' susturması kaldırıldı', '#00e676');
      });
    });
  };

  window.sohbetGonder = function() {
    if (!sohbetKullaniciAdi) return;
    if (localStorage.getItem('doruk_misafir') === '1') {
      _toast('👤 Misafirler mesaj gönderemez. Kayıt ol!', '#fbbf24');
      return;
    }
    if (_nickBanliMi(sohbetKullaniciAdi)) {
      _toast('🚫 Hesabınız banlandı. Mesaj gönderemezsiniz.', '#ff4664');
      return;
    }
    if (_nickSusturluMu(sohbetKullaniciAdi)) {
      _toast('🔇 Susturuldunuz. Mesaj gönderemezsiniz.', '#8090ff');
      return;
    }
    const input = document.getElementById('sohbetInput');
    const metin = (input?.value || '').trim();
    if (!metin) return;
    input.value = ''; input.style.height = 'auto';
    const btn = document.getElementById('sohbetSendBtn');
    if (btn) btn.disabled = true;
    sohbetFirebaseYukle(function(db) {
      db.ref('mesajlar').push({ nick: sohbetKullaniciAdi, metin, zaman: Date.now() })
        .then(() => { if (btn) btn.disabled = false; })
        .catch(function(e){ if (btn) btn.disabled = false; input.value = metin; console.warn('Gonderilemedi:', e.message); });
    });
  };

  window.sohbetTumunuSil = function() {
    if ((sohbetKullaniciAdi||'').toLowerCase() !== ADMIN_NICK.toLowerCase()) return;
    dorukConfirm({
      icon: '🗑️',
      title: 'Tüm Sohbeti Sil',
      msg: 'Tüm mesajlar kalıcı olarak silinecek! Emin misin?',
      okText: 'Sil',
      danger: true,
      cb: function(onay) {
        if (!onay) return;
        sohbetFirebaseYukle(function(db) {
          db.ref('mesajlar').remove(function(err) {
            if (err) {
              _toast('Hata: ' + err.message, '#ff4664');
            } else {
              const c = document.getElementById('sohbetMessages');
              if (c) c.innerHTML = '';
              _toast('🗑️ Tüm sohbet silindi', '#ff6030');
            }
          });
        });
      }
    });
  };

  window.sohbetTemizle = function() {
    dorukConfirm({
      icon: '🚪',
      title: 'Çıkış Yap',
      msg: 'Uygulamadan çıkmak istiyor musun? Tekrar giriş yapman gerekecek.',
      okText: 'Çıkış Yap',
      danger: false,
      cb: function(onay) {
        if (!onay) return;
        sohbetFirebaseYukle(function(db) { db.ref('mesajlar').off(); });
        localStorage.removeItem('doruk_sohbet_nick');
        localStorage.removeItem('doruk_login_user');
        sohbetKullaniciAdi = null; sohbetBaslatildi = false;
        window.sohbetWidgetKapat && window.sohbetWidgetKapat(false);
        const loginScr = document.getElementById('loginScreen');
        if (loginScr) loginScr.style.display = 'flex';
      }
    });
  };

  window.sohbetInit = sohbetInit;
  window.sohbetKeyDown = function(e) { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); window.sohbetGonder(); } };
  window.sohbetAutoResize = function(el) {
    if (el._resizeRaf) return;
    el._resizeRaf = requestAnimationFrame(function() {
      el._resizeRaf = null;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    });
  };

})();
// ===================== / SOHBET FLOATING WIDGET =====================

