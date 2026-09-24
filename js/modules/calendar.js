/* Doruk module: calendar.js */
// TAKVİM BAŞLANGICI

// ===================== TAKVİM & ÖNEMLİ GÜNLER =====================
let takvimYil  = new Date().getFullYear();
let takvimAy   = new Date().getMonth(); // 0-11
let takvimSeciliGun = null;

const takvimAylar = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const takvimGunler = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

// ── Renk paleti ──
const TAK_RENK = {
  resmi:  { circle:'#00d4ff', circleShadow:'rgba(0,212,255,0.25)', bg:'rgba(0,212,255,0.04)', border:'rgba(0,212,255,0.14)', text:'#00d4ff', dot:'#00d4ff', badge:'RESMİ TATİL', badgeBg:'rgba(0,212,255,0.05)', badgeBorder:'rgba(0,212,255,0.11)', badgeText:'#00d4ff' },
  dini:   { circle:'#c05ac8', circleShadow:'rgba(192,90,200,0.55)', bg:'rgba(192,90,200,0.09)', border:'rgba(192,90,200,0.35)', text:'#c05ac8', dot:'#c05ac8', badge:'DİNİ BAYRAM', badgeBg:'rgba(192,90,200,0.10)', badgeBorder:'rgba(192,90,200,0.28)', badgeText:'#c05ac8' },
  onemli: { circle:'#f59e0b', circleShadow:'rgba(245,158,11,0.55)', bg:'rgba(245,158,11,0.07)', border:'rgba(245,158,11,0.25)', text:'#f59e0b', dot:'#f59e0b', badge:'ÖNEMLİ GÜN', badgeBg:'rgba(245,158,11,0.10)', badgeBorder:'rgba(245,158,11,0.25)', badgeText:'#f59e0b' },
};

// ── Dini Bayramlar (referans bazlı hesaplama) ──
function diniBayramlariHesapla(yil) {
  const ramazanRef = new Date(2024, 3, 10); // 10 Nisan 2024
  const kurbanRef  = new Date(2024, 5, 17); // 17 Haziran 2024
  const hicriGun   = 354.36667;

  const ramazanBas = new Date(ramazanRef);
  ramazanBas.setDate(ramazanBas.getDate() + Math.round((yil - 2024) * hicriGun));
  const kurbanBas = new Date(kurbanRef);
  kurbanBas.setDate(kurbanBas.getDate() + Math.round((yil - 2024) * hicriGun));

  const sonuc = [];
  const ramazanEtiket = ['Ramazan Arefe', 'Ramazan Bayramı 1.Gün', 'Ramazan Bayramı 2.Gün', 'Ramazan Bayramı 3.Gün'];
  for (let i = -1; i <= 2; i++) {
    const d = new Date(ramazanBas); d.setDate(d.getDate() + i);
    sonuc.push({ gun: d.getDate(), ay: d.getMonth(), ad: ramazanEtiket[i+1], emoji: '🌙', tip: 'dini', tarih: d });
  }
  const kurbanEtiket = ['Kurban Arefe', 'Kurban Bayramı 1.Gün', 'Kurban Bayramı 2.Gün', 'Kurban Bayramı 3.Gün', 'Kurban Bayramı 4.Gün'];
  for (let i = -1; i <= 3; i++) {
    const d = new Date(kurbanBas); d.setDate(d.getDate() + i);
    sonuc.push({ gun: d.getDate(), ay: d.getMonth(), ad: kurbanEtiket[i+1], emoji: '🐑', tip: 'dini', tarih: d });
  }
  return sonuc;
}

// ── Sabit önemli günler ──
const onemliGunler = [
  {gun:1,  ay:0,  ad:'Yılbaşı',                              emoji:'🎆', tip:'resmi'},
  {gun:14, ay:1,  ad:'Sevgililer Günü',                      emoji:'❤️', tip:'onemli'},
  {gun:8,  ay:2,  ad:'Dünya Kadınlar Günü',                  emoji:'💜', tip:'onemli'},
  {gun:21, ay:2,  ad:'Nevruz',                               emoji:'🌸', tip:'onemli'},
  {gun:23, ay:3,  ad:'Ulusal Egemenlik ve Çocuk Bayramı',    emoji:'🎈', tip:'resmi'},
  {gun:23, ay:3,  ad:'Dünya Kitap Günü',                     emoji:'📚', tip:'onemli'},
  {gun:1,  ay:4,  ad:'Emek ve Dayanışma Günü',               emoji:'✊', tip:'resmi'},
  {gun:19, ay:4,  ad:'Gençlik ve Spor Bayramı',              emoji:'🏃', tip:'resmi'},
  {gun:5,  ay:4,  ad:'Dünya Çevre Günü',                     emoji:'🌍', tip:'onemli'},
  {gun:15, ay:6,  ad:'Demokrasi ve Millî Birlik Günü',       emoji:'🇹🇷', tip:'resmi'},
  {gun:30, ay:7,  ad:'Zafer Bayramı',                        emoji:'🏆', tip:'resmi'},
  {gun:29, ay:9,  ad:'Cumhuriyet Bayramı',                   emoji:'🎉', tip:'resmi'},
  {gun:31, ay:9,  ad:'Dünya Tasarruf Günü',                  emoji:'💰', tip:'onemli'},
  {gun:10, ay:10, ad:'Atatürk\'ü Anma Günü',                 emoji:'🕯️', tip:'onemli'},
  {gun:20, ay:10, ad:'Dünya Çocuk Günü',                     emoji:'🎠', tip:'onemli'},
  {gun:24, ay:10, ad:'Öğretmenler Günü',                     emoji:'🍎', tip:'onemli'},
  {gun:31, ay:11, ad:'Yılbaşı Arifesi',                      emoji:'🎄', tip:'onemli'},
];

// ── Dinamik günler: Anneler / Babalar ──
function dinamikOnemliGunler(yil) {
  const sonuc = [];
  let sayac = 0;
  for (let i = 1; i <= 31; i++) {
    if (new Date(yil, 4, i).getDay() === 0) { sayac++; if (sayac === 2) { sonuc.push({gun:i, ay:4, ad:'Anneler Günü', emoji:'🌹', tip:'onemli'}); break; } }
  }
  sayac = 0;
  for (let i = 1; i <= 30; i++) {
    if (new Date(yil, 5, i).getDay() === 0) { sayac++; if (sayac === 3) { sonuc.push({gun:i, ay:5, ad:'Babalar Günü', emoji:'👔', tip:'onemli'}); break; } }
  }
  return sonuc;
}

// ── Belirli gün için tüm etkinlikler ──
function takvimGetEtkinlikler(gun, ay, yil) {
  const sonuc = [];
  onemliGunler.forEach(o => { if (o.gun === gun && o.ay === ay) sonuc.push(o); });
  dinamikOnemliGunler(yil).forEach(o => { if (o.gun === gun && o.ay === ay) sonuc.push(o); });
  diniBayramlariHesapla(yil).forEach(t => { if (t.gun === gun && t.ay === ay) sonuc.push(t); });
  return sonuc;
}

function takvimAyDegistir(delta) {
  takvimAy += delta;
  if (takvimAy > 11) { takvimAy = 0; takvimYil++; }
  if (takvimAy < 0)  { takvimAy = 11; takvimYil--; }
  takvimSeciliGun = null;
  document.getElementById('takvimGunDetay').style.display = 'none';
  takvimRender();
}

function takvimGunSec(gun) {
  if (takvimSeciliGun === gun) {
    takvimSeciliGun = null;
    document.getElementById('takvimGunDetay').style.display = 'none';
    takvimRender();
    return;
  }
  takvimSeciliGun = gun;
  takvimRender();

  const detay = document.getElementById('takvimGunDetay');
  const tarih = new Date(takvimYil, takvimAy, gun);
  const gunAdi = takvimGunler[tarih.getDay()];
  document.getElementById('takvimGunBaslik').textContent = `${gun} ${takvimAylar[takvimAy]} ${takvimYil} · ${gunAdi}`;

  const etkinlikler = takvimGetEtkinlikler(gun, takvimAy, takvimYil);
  if (etkinlikler.length) {
    document.getElementById('takvimGunEtkinlikler').innerHTML = etkinlikler.map(e => {
      const r = TAK_RENK[e.tip] || TAK_RENK.onemli;
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:20px;line-height:1;">${e.emoji}</span>
        <span style="flex:1;color:#e2e8f0;font-size:12px;font-weight:700;">${e.ad}</span>
        <span style="font-size:7.5px;padding:3px 8px;border-radius:8px;background:${r.badgeBg};color:${r.badgeText};font-weight:900;border:1px solid ${r.badgeBorder};white-space:nowrap;">${r.badge}</span>
      </div>`;
    }).join('');
  } else {
    document.getElementById('takvimGunEtkinlikler').innerHTML = '<div style="color:#7aa0c4;font-size:12px;font-weight:600;padding:6px 0;">Bu gün için özel bir etkinlik yok.</div>';
  }
  detay.style.display = 'block';
}

function takvimRender() {
  const bugun     = new Date();
  const ilkGun    = new Date(takvimYil, takvimAy, 1).getDay();
  const baslangic = ilkGun === 0 ? 6 : ilkGun - 1;
  const ayGun     = new Date(takvimYil, takvimAy + 1, 0).getDate();

  document.getElementById('takvimAyBaslik').textContent = `${takvimAylar[takvimAy]} ${takvimYil}`;

  // ── Grid hücreleri ──
  let html = '';
  for (let i = 0; i < baslangic; i++) html += '<div></div>';

  for (let g = 1; g <= ayGun; g++) {
    const hGun       = new Date(takvimYil, takvimAy, g).getDay();
    const isHaftaSonu = hGun === 0 || hGun === 6;
    const isBugun    = bugun.getDate()===g && bugun.getMonth()===takvimAy && bugun.getFullYear()===takvimYil;
    const isSecili   = takvimSeciliGun === g;
    const etkinlikler = takvimGetEtkinlikler(g, takvimAy, takvimYil);

    // Öncelik: resmi > dini > onemli
    let tipBulunan = null;
    for (const t of ['resmi','dini','onemli']) {
      if (etkinlikler.some(e => e.tip === t)) { tipBulunan = t; break; }
    }

    // Bugün: parlak halka
    if (isBugun) {
      const numStyle = tipBulunan
        ? `display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${TAK_RENK[tipBulunan].circle};color:#050c18;font-size:12px;font-weight:900;box-shadow:0 0 0 2px #00ffcc,0 0 10px ${TAK_RENK[tipBulunan].circleShadow};`
        : `display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#00d4ff,#00ffcc);color:#050c18;font-size:12px;font-weight:900;box-shadow:0 0 12px rgba(0,212,255,0.27);`;
      const dots = etkinlikler.length && !tipBulunan ? '' : '';
      html += `<div onclick="takvimGunSec(${g})" style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:10px;cursor:pointer;background:rgba(0,212,255,0.08);border:2px solid rgba(0,212,255,0.32);transition:.12s;user-select:none;"><span style="${numStyle}">${g}</span></div>`;
      continue;
    }

    // Seçili gün
    if (isSecili) {
      const numStyle = tipBulunan
        ? `display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${TAK_RENK[tipBulunan].circle};color:#fff;font-size:12px;font-weight:900;box-shadow:0 0 8px ${TAK_RENK[tipBulunan].circleShadow};`
        : `display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:rgba(168,85,247,0.8);color:#fff;font-size:12px;font-weight:900;box-shadow:0 0 10px rgba(168,85,247,0.5);`;
      html += `<div onclick="takvimGunSec(${g})" style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:10px;cursor:pointer;background:rgba(168,85,247,0.12);border:2px solid rgba(168,85,247,0.7);transition:.12s;user-select:none;"><span style="${numStyle}">${g}</span></div>`;
      continue;
    }

    // Önemli/tatil günleri → renkli dolu yuvarlak rakam
    if (tipBulunan) {
      const r = TAK_RENK[tipBulunan];
      const numStyle = `display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${r.circle};color:#fff;font-size:12px;font-weight:900;box-shadow:0 2px 8px ${r.circleShadow};`;
      html += `<div onclick="takvimGunSec(${g})" style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:10px;cursor:pointer;background:${r.bg};border:1.5px solid ${r.border};transition:.12s;user-select:none;"><span style="${numStyle}">${g}</span></div>`;
      continue;
    }

    // Normal gün
    const renk = isHaftaSonu ? '#ef4444' : '#c8d8f0';
    html += `<div onclick="takvimGunSec(${g})" style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:10px;cursor:pointer;background:rgba(8,14,28,0.55);border:1px solid rgba(255,255,255,0.04);font-size:12px;font-weight:700;color:${renk};transition:.12s;user-select:none;">${g}</div>`;
  }

  document.getElementById('takvimGrid').innerHTML = html;

  // ── Bu ayki etkinlik listesi ──
  let etkinlikHTML = '';
  for (let g = 1; g <= ayGun; g++) {
    takvimGetEtkinlikler(g, takvimAy, takvimYil).forEach(e => {
      const r = TAK_RENK[e.tip] || TAK_RENK.onemli;
      etkinlikHTML += `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(14,22,42,0.85);border:1px solid ${r.border};border-left:3px solid ${r.circle};border-radius:14px;margin-bottom:6px;">
        <div style="font-size:20px;flex-shrink:0;">${e.emoji}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:10px;font-weight:900;color:${r.text};letter-spacing:.5px;">${g} ${takvimAylar[takvimAy]}</div>
          <div style="font-size:11px;font-weight:700;color:#e2e8f0;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.ad}</div>
        </div>
        <div style="flex-shrink:0;font-size:7.5px;padding:3px 8px;border-radius:8px;background:${r.badgeBg};color:${r.badgeText};font-weight:900;border:1px solid ${r.badgeBorder};white-space:nowrap;">${r.badge}</div>
      </div>`;
    });
  }
  document.getElementById('takvimEtkinlikListesi').innerHTML = etkinlikHTML ||
    '<div style="color:#7aa0c4;font-size:12px;font-weight:600;text-align:center;padding:16px;">Bu ay için kayıtlı etkinlik yok.</div>';

  // ── Yaklaşan tatiller (90 gün) ──
  const simdi = new Date();
  const sinir = new Date(simdi); sinir.setDate(sinir.getDate() + 90);
  let yakListe = [];
  for (let y = takvimYil; y <= takvimYil + 1; y++) {
    [...onemliGunler, ...dinamikOnemliGunler(y)].forEach(o => {
      const d = new Date(y, o.ay, o.gun);
      if (d > simdi && d <= sinir) yakListe.push({...o, tarih: d});
    });
    diniBayramlariHesapla(y).forEach(t => {
      if (t.tarih > simdi && t.tarih <= sinir) yakListe.push({...t});
    });
  }
  yakListe.sort((a,b) => a.tarih - b.tarih);
  const goruldu = new Set();
  yakListe = yakListe.filter(t => {
    const k = t.tarih.toDateString() + t.ad;
    if (goruldu.has(k)) return false;
    goruldu.add(k); return true;
  }).slice(0, 7);

  let tatilHTML = '';
  yakListe.forEach(t => {
    const r = TAK_RENK[t.tip] || TAK_RENK.resmi;
    const kalan = Math.ceil((t.tarih - simdi) / 86400000);
    tatilHTML += `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(14,22,42,0.85);border:1px solid ${r.border};border-left:3px solid ${r.circle};border-radius:14px;margin-bottom:6px;">
      <div style="font-size:20px;flex-shrink:0;">${t.emoji}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;font-weight:800;color:${r.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.ad}</div>
        <div style="font-size:10px;color:#7aa0c4;margin-top:2px;">${t.tarih.getDate()} ${takvimAylar[t.tarih.getMonth()]} ${t.tarih.getFullYear()}</div>
      </div>
      <div style="text-align:center;flex-shrink:0;min-width:44px;">
        <div style="font-size:18px;font-weight:900;color:#00ffcc;line-height:1;">${kalan}</div>
        <div style="font-size:8px;color:#7aa0c4;font-weight:800;">GÜN</div>
      </div>
    </div>`;
  });
  document.getElementById('takvimTatilListesi').innerHTML = tatilHTML ||
    '<div style="color:#7aa0c4;font-size:12px;text-align:center;padding:12px;">Yaklaşan tatil yok (90 gün içinde).</div>';
}

function takvimInit() {
  takvimYil = new Date().getFullYear();
  takvimAy  = new Date().getMonth();
  takvimSeciliGun = null;
  document.getElementById('takvimGunDetay').style.display = 'none';
  takvimRender();
}
// ===================== / TAKVİM =====================

