/* Doruk module: dashboard.js */
// ===================== HAVA DURUMU =====================
const wmoIcons = {
  0:'☀️',1:'🌤',2:'⛅',3:'☁️',
  45:'🌫',48:'🌫',
  51:'🌦',53:'🌦',55:'🌧',
  61:'🌧',63:'🌧',65:'🌧',
  71:'❄️',73:'❄️',75:'❄️',
  80:'🌦',81:'🌦',82:'⛈',
  95:'⛈',96:'⛈',99:'⛈'
};
const wmoDesc = {
  0:'Açık',1:'Çoğunlukla Açık',2:'Parçalı Bulutlu',3:'Kapalı',
  45:'Sisli',48:'Sisli',
  51:'Hafif Çisenti',53:'Çisenti',55:'Yoğun Çisenti',
  61:'Hafif Yağmur',63:'Yağmur',65:'Kuvvetli Yağmur',
  71:'Hafif Kar',73:'Kar',75:'Kuvvetli Kar',
  80:'Sağanak',81:'Sağanak',82:'Kuvvetli Sağanak',
  95:'Fırtına',96:'Fırtına',99:'Şiddetli Fırtına'
};

// Türkiye'nin 81 ili — plaka sırasına göre
const turkiyeIlleri = [
  {no:1,  ad:'Adana',          bolge:'Akdeniz'},
  {no:2,  ad:'Adıyaman',       bolge:'Güneydoğu Anadolu'},
  {no:3,  ad:'Afyonkarahisar', bolge:'Ege'},
  {no:4,  ad:'Ağrı',           bolge:'Doğu Anadolu'},
  {no:5,  ad:'Amasya',         bolge:'Karadeniz'},
  {no:6,  ad:'Ankara',         bolge:'İç Anadolu'},
  {no:7,  ad:'Antalya',        bolge:'Akdeniz'},
  {no:8,  ad:'Artvin',         bolge:'Karadeniz'},
  {no:9,  ad:'Aydın',          bolge:'Ege'},
  {no:10, ad:'Balıkesir',      bolge:'Marmara'},
  {no:11, ad:'Bilecik',        bolge:'Marmara'},
  {no:12, ad:'Bingöl',         bolge:'Doğu Anadolu'},
  {no:13, ad:'Bitlis',         bolge:'Doğu Anadolu'},
  {no:14, ad:'Bolu',           bolge:'Batı Karadeniz'},
  {no:15, ad:'Burdur',         bolge:'Akdeniz'},
  {no:16, ad:'Bursa',          bolge:'Marmara'},
  {no:17, ad:'Çanakkale',      bolge:'Marmara'},
  {no:18, ad:'Çankırı',        bolge:'İç Anadolu'},
  {no:19, ad:'Çorum',          bolge:'Karadeniz'},
  {no:20, ad:'Denizli',        bolge:'Ege'},
  {no:21, ad:'Diyarbakır',     bolge:'Güneydoğu Anadolu'},
  {no:22, ad:'Edirne',         bolge:'Marmara'},
  {no:23, ad:'Elazığ',         bolge:'Doğu Anadolu'},
  {no:24, ad:'Erzincan',       bolge:'Doğu Anadolu'},
  {no:25, ad:'Erzurum',        bolge:'Doğu Anadolu'},
  {no:26, ad:'Eskişehir',      bolge:'İç Anadolu'},
  {no:27, ad:'Gaziantep',      bolge:'Güneydoğu Anadolu'},
  {no:28, ad:'Giresun',        bolge:'Karadeniz'},
  {no:29, ad:'Gümüşhane',      bolge:'Karadeniz'},
  {no:30, ad:'Hakkari',        bolge:'Doğu Anadolu'},
  {no:31, ad:'Hatay',          bolge:'Akdeniz'},
  {no:32, ad:'Isparta',        bolge:'Akdeniz'},
  {no:33, ad:'Mersin',         bolge:'Akdeniz'},
  {no:34, ad:'İstanbul',       bolge:'Marmara'},
  {no:35, ad:'İzmir',          bolge:'Ege'},
  {no:36, ad:'Kars',           bolge:'Doğu Anadolu'},
  {no:37, ad:'Kastamonu',      bolge:'Karadeniz'},
  {no:38, ad:'Kayseri',        bolge:'İç Anadolu'},
  {no:39, ad:'Kırklareli',     bolge:'Marmara'},
  {no:40, ad:'Kırşehir',       bolge:'İç Anadolu'},
  {no:41, ad:'Kocaeli',        bolge:'Marmara'},
  {no:42, ad:'Konya',          bolge:'İç Anadolu'},
  {no:43, ad:'Kütahya',        bolge:'Ege'},
  {no:44, ad:'Malatya',        bolge:'Doğu Anadolu'},
  {no:45, ad:'Manisa',         bolge:'Ege'},
  {no:46, ad:'Kahramanmaraş',  bolge:'Akdeniz'},
  {no:47, ad:'Mardin',         bolge:'Güneydoğu Anadolu'},
  {no:48, ad:'Muğla',          bolge:'Ege'},
  {no:49, ad:'Muş',            bolge:'Doğu Anadolu'},
  {no:50, ad:'Nevşehir',       bolge:'İç Anadolu'},
  {no:51, ad:'Niğde',          bolge:'İç Anadolu'},
  {no:52, ad:'Ordu',           bolge:'Karadeniz'},
  {no:53, ad:'Rize',           bolge:'Karadeniz'},
  {no:54, ad:'Sakarya',        bolge:'Marmara'},
  {no:55, ad:'Samsun',         bolge:'Karadeniz'},
  {no:56, ad:'Siirt',          bolge:'Güneydoğu Anadolu'},
  {no:57, ad:'Sinop',          bolge:'Karadeniz'},
  {no:58, ad:'Sivas',          bolge:'İç Anadolu'},
  {no:59, ad:'Tekirdağ',       bolge:'Marmara'},
  {no:60, ad:'Tokat',          bolge:'Karadeniz'},
  {no:61, ad:'Trabzon',        bolge:'Karadeniz'},
  {no:62, ad:'Tunceli',        bolge:'Doğu Anadolu'},
  {no:63, ad:'Şanlıurfa',      bolge:'Güneydoğu Anadolu'},
  {no:64, ad:'Uşak',           bolge:'Ege'},
  {no:65, ad:'Van',            bolge:'Doğu Anadolu'},
  {no:66, ad:'Yozgat',         bolge:'İç Anadolu'},
  {no:67, ad:'Zonguldak',      bolge:'Karadeniz'},
  {no:68, ad:'Aksaray',        bolge:'İç Anadolu'},
  {no:69, ad:'Bayburt',        bolge:'Karadeniz'},
  {no:70, ad:'Karaman',        bolge:'İç Anadolu'},
  {no:71, ad:'Kırıkkale',      bolge:'İç Anadolu'},
  {no:72, ad:'Batman',         bolge:'Güneydoğu Anadolu'},
  {no:73, ad:'Şırnak',         bolge:'Güneydoğu Anadolu'},
  {no:74, ad:'Bartın',         bolge:'Karadeniz'},
  {no:75, ad:'Ardahan',        bolge:'Doğu Anadolu'},
  {no:76, ad:'Iğdır',          bolge:'Doğu Anadolu'},
  {no:77, ad:'Yalova',         bolge:'Marmara'},
  {no:78, ad:'Karabük',        bolge:'Karadeniz'},
  {no:79, ad:'Kilis',          bolge:'Güneydoğu Anadolu'},
  {no:80, ad:'Osmaniye',       bolge:'Akdeniz'},
  {no:81, ad:'Düzce',          bolge:'Karadeniz'},
];

// Koordinatlar — Nominatim yerine direkt verileri kullan (hızlı + offline)
const ilKoord = {
  'Adana':[37.0,35.32],'Adıyaman':[37.76,38.27],'Afyonkarahisar':[38.75,30.54],
  'Ağrı':[39.72,43.05],'Amasya':[40.65,35.83],'Ankara':[39.93,32.85],
  'Antalya':[36.9,30.7],'Artvin':[41.18,41.82],'Aydın':[37.84,27.84],
  'Balıkesir':[39.65,27.88],'Bilecik':[40.14,29.98],'Bingöl':[38.88,40.5],
  'Bitlis':[38.4,42.12],'Bolu':[40.74,31.61],'Burdur':[37.72,30.29],
  'Bursa':[40.2,29.06],'Çanakkale':[40.15,26.41],'Çankırı':[40.6,33.62],
  'Çorum':[40.55,34.96],'Denizli':[37.77,29.09],'Diyarbakır':[37.91,40.24],
  'Edirne':[41.68,26.56],'Elazığ':[38.68,39.23],'Erzincan':[39.75,39.5],
  'Erzurum':[39.9,41.27],'Eskişehir':[39.78,30.52],'Gaziantep':[37.07,37.38],
  'Giresun':[40.92,38.39],'Gümüşhane':[40.46,39.48],'Hakkari':[37.57,43.74],
  'Hatay':[36.4,36.35],'Isparta':[37.76,30.55],'Mersin':[36.81,34.64],
  'İstanbul':[41.01,28.95],'İzmir':[38.42,27.14],'Kars':[40.61,43.1],
  'Kastamonu':[41.38,33.78],'Kayseri':[38.73,35.49],'Kırklareli':[41.74,27.22],
  'Kırşehir':[39.14,34.16],'Kocaeli':[40.77,29.94],'Konya':[37.87,32.49],
  'Kütahya':[39.42,29.98],'Malatya':[38.35,38.31],'Manisa':[38.62,27.43],
  'Kahramanmaraş':[37.58,36.94],'Mardin':[37.31,40.74],'Muğla':[37.22,28.36],
  'Muş':[38.73,41.49],'Nevşehir':[38.62,34.72],'Niğde':[37.97,34.68],
  'Ordu':[40.98,37.88],'Rize':[41.02,40.52],'Sakarya':[40.77,30.4],
  'Samsun':[41.29,36.33],'Siirt':[37.93,41.94],'Sinop':[42.03,35.15],
  'Sivas':[39.75,37.02],'Tekirdağ':[40.98,27.51],'Tokat':[40.31,36.55],
  'Trabzon':[41.0,39.73],'Tunceli':[39.11,39.55],'Şanlıurfa':[37.16,38.8],
  'Uşak':[38.68,29.41],'Van':[38.49,43.38],'Yozgat':[39.82,34.81],
  'Zonguldak':[41.46,31.8],'Aksaray':[38.37,34.04],'Bayburt':[40.26,40.22],
  'Karaman':[37.18,33.22],'Kırıkkale':[39.85,33.51],'Batman':[37.88,41.13],
  'Şırnak':[37.52,42.46],'Bartın':[41.64,32.34],'Ardahan':[41.11,42.7],
  'Iğdır':[39.92,44.04],'Yalova':[40.66,29.28],'Karabük':[41.2,32.62],
  'Kilis':[36.72,37.12],'Osmaniye':[37.07,36.25],'Düzce':[40.84,31.16],
};

// ===================== / HAVA DURUMU =====================

const borsaItems = [
  { sym: '🇺🇸 USD/TRY',  id: 'USD-TRY',  type: 'local' },
  { sym: '🇪🇺 EUR/TRY',  id: 'EUR-TRY',  type: 'local' },
  { sym: '🇬🇧 GBP/TRY',  id: 'GBP-TRY',  type: 'local' },
  { sym: '🥇 GR ALTIN',  id: 'XAU-GR',   type: 'local' },
  { sym: '🥇 ÇEY ALTIN', id: 'XAU-CE',   type: 'local' },
  { sym: '🥇 TAM ALTIN', id: 'XAU-TA',   type: 'local' },
  { sym: '🥇 ALTIN ONS', id: 'XAU-ONS',  type: 'local' },
  { sym: '🥈 GR GÜMÜŞ',  id: 'XAG-GR',   type: 'local' },
];

// ===================== EN ÇOK YÜKSELEN / DÜŞENLER v2 =====================
let glData = { up: [], dn: [] };

async function glFetch() {
  try {
    // type=MINI: daha küçük veri, pct openPrice/lastPrice'dan hesaplanıyor
    const resp = await fetch('https://api.binance.com/api/v3/ticker/24hr?type=MINI', {mode:'cors',credentials:'omit'});
    const all = await resp.json();
    const filtered = all.filter(t =>
      t.symbol.endsWith('USDT') &&
      !t.symbol.includes('DOWN') && !t.symbol.includes('UP') &&
      !t.symbol.includes('BEAR') && !t.symbol.includes('BULL') &&
      parseFloat(t.quoteVolume) > 5000000
    ).map(t => {
      const open = parseFloat(t.openPrice);
      const last = parseFloat(t.lastPrice);
      const pct = open > 0 ? ((last - open) / open) * 100 : 0;
      return {
        sym: t.symbol.replace('USDT',''),
        price: last,
        pct: pct,
        vol: parseFloat(t.quoteVolume)
      };
    });

    const sorted = [...filtered].sort((a,b) => b.pct - a.pct);
    glData.up = sorted.slice(0, 10);
    glData.dn = sorted.slice(-10).reverse();
    // Verileri telefona kaydet
    try { localStorage.setItem('cache_glData', JSON.stringify({up: glData.up, dn: glData.dn, ts: Date.now()})); } catch(e) {}
    glRender();
  } catch(e) {
    // İnternet yoksa cache'den yükle
    try {
      const cached = JSON.parse(localStorage.getItem('cache_glData') || 'null');
      if(cached && cached.up) {
        glData.up = cached.up;
        glData.dn = cached.dn;
        glRender();
      }
    } catch(e2) {}
    console.warn('GL fetch failed', e);
  }
}

function glInit() { glFetch(); }

function glFmtPrice(p) {
  if (p >= 1000) return '$' + p.toLocaleString('en-US', {maximumFractionDigits:0});
  if (p >= 1)    return '$' + p.toFixed(2);
  if (p >= 0.01) return '$' + p.toFixed(4);
  return '$' + p.toFixed(6);
}

function glBigCard(item, idx, cls) {
  const isUp = cls === 'up';
  const icon = isUp ? '▲' : '▼';
  const maxPct = glData[cls][0] ? Math.abs(glData[cls][0].pct) : 1;
  const barW = Math.round((Math.abs(item.pct) / maxPct) * 100);
  const crown = idx === 0 ? `<span class="gl-crown">${isUp ? '🔥' : '💀'}</span>` : '';
  return `
    <div class="gl-card-big ${cls}" style="animation:none" onclick="openChartModal && openChartModal('${item.sym}USDT','${item.sym}')">
      <span class="gl-big-rank">${idx+1}</span>
      ${crown}
      <div class="gl-big-sym">${item.sym}</div>
      <div class="gl-big-price">${glFmtPrice(item.price)}</div>
      <span class="gl-big-pct">${icon}${Math.abs(item.pct).toFixed(2)}%</span>
      <div class="gl-big-bar-wrap"><div class="gl-big-bar-fill" style="width:${barW}%"></div></div>
    </div>`;
}

function glListRow(item, idx, cls) {
  const isUp = cls === 'up';
  const icon = isUp ? '▲' : '▼';
  const maxPct = glData[cls][0] ? Math.abs(glData[cls][0].pct) : 1;
  const barW = Math.round((Math.abs(item.pct) / maxPct) * 32);
  return `
    <div class="gl-row ${cls}" style="animation:none" onclick="openChartModal && openChartModal('${item.sym}USDT','${item.sym}')">
      <span class="gl-row-rank">${idx+4}</span>
      <span class="gl-row-sym">${item.sym}</span>
      <span class="gl-row-price">${glFmtPrice(item.price)}</span>
      <span class="gl-row-pct">${icon}${Math.abs(item.pct).toFixed(2)}%</span>
      <div class="gl-row-bar"><div class="gl-row-bar-fill" style="width:${barW}px"></div></div>
    </div>`;
}

function glRender() {
  ['up','dn'].forEach(cls => {
    const items = glData[cls];
    if (!items || items.length === 0) return;
    const top3 = items.slice(0, 3);
    const rest  = items.slice(3, 10);
    const suffix = cls === 'up' ? 'Up' : 'Dn';
    const topEl  = document.getElementById('gl'+suffix+'Top');
    const listEl = document.getElementById('gl'+suffix+'List');
    const cntEl  = document.getElementById('gl'+suffix+'Count');
    if (cntEl) cntEl.textContent = items.length + ' coin';
    const isUp = cls === 'up';
    const icon = isUp ? '▲' : '▼';
    const maxPct = Math.abs(items[0]?.pct) || 1;

    // TOP 3 — semboller aynıysa sadece fiyat/yüzde güncelle (DOM dokunma)
    if (topEl) {
      const cards = topEl.querySelectorAll('.gl-card-big');
      const needRebuild = cards.length !== top3.length ||
        top3.some((item, i) => cards[i]?.querySelector('.gl-big-sym')?.textContent !== item.sym);
      if (needRebuild) {
        topEl.style.animation = 'none';
        topEl.innerHTML = top3.map((it,i) => glBigCard(it, i, cls)).join('');
        topEl.querySelectorAll('.gl-card-big').forEach(el => el.style.animation = 'none');
      } else {
        top3.forEach((item, i) => {
          const card = cards[i];
          const priceEl = card.querySelector('.gl-big-price');
          const pctEl   = card.querySelector('.gl-big-pct');
          const barEl   = card.querySelector('.gl-big-bar-fill');
          const barW = Math.round((Math.abs(item.pct) / maxPct) * 100);
          if (priceEl) priceEl.textContent = glFmtPrice(item.price);
          if (pctEl)   pctEl.textContent   = icon + Math.abs(item.pct).toFixed(2) + '%';
          if (barEl)   barEl.style.width   = barW + '%';
        });
      }
    }

    // LİSTE SATIRLARI — aynı mantık
    if (listEl) {
      const rows = listEl.querySelectorAll('.gl-row');
      const needRebuild = rows.length !== rest.length ||
        rest.some((item, i) => rows[i]?.querySelector('.gl-row-sym')?.textContent !== item.sym);
      if (needRebuild) {
        listEl.innerHTML = rest.map((it,i) => glListRow(it, i, cls)).join('');
        listEl.querySelectorAll('.gl-row').forEach(el => el.style.animation = 'none');
      } else {
        rest.forEach((item, i) => {
          const row = rows[i];
          const priceEl = row.querySelector('.gl-row-price');
          const pctEl   = row.querySelector('.gl-row-pct');
          const barEl   = row.querySelector('.gl-row-bar-fill');
          const barW = Math.round((Math.abs(item.pct) / maxPct) * 32);
          if (priceEl) priceEl.textContent = glFmtPrice(item.price);
          if (pctEl)   pctEl.textContent   = icon + Math.abs(item.pct).toFixed(2) + '%';
          if (barEl)   barEl.style.width   = barW + 'px';
        });
      }
    }
  });
}
// ===================== / EN ÇOK YÜKSELEN / DÜŞENLER v2 =====================

let borsaBandPrev = {};

function borsaBandiInit() {
  borsaBandiRender();
}

const borsaColorCls = {
  'USD-TRY': 'bb-usd',
  'EUR-TRY': 'bb-eur',
  'GBP-TRY': 'bb-gbp',
  'XAU-GR':  'bb-gold',
  'XAU-CE':  'bb-gold',
  'XAU-TA':  'bb-gold',
  'XAU-ONS': 'bb-gold',
  'XAG-GR':  'bb-silver',
};

function borsaBandiRender() {
  const track = document.getElementById('borsaTrack');
  if (!track) return;
  // Tek kopya kart HTML oluştur — SADECE ilk yüklemede çağrılır, sonra textContent ile güncellenir
  if (track.querySelector('.w-borsa-inner')) return; // zaten render edildi
  let itemsHtml = '';
  borsaItems.forEach(item => {
    const [icon, ...rest] = item.sym.split(' ');
    const label = rest.join(' ');
    const cls = borsaColorCls[item.id] || '';
    itemsHtml += `<div class="w-borsa-item ${cls}" onclick="openChartModal('${item.id}','${item.sym}')">
      <span class="w-borsa-sym"><span class="w-borsa-icon">${icon}</span> ${label}</span>
      <span class="w-borsa-price" id="bb-price-${item.id}">...</span>
      <span class="w-borsa-chg" id="bb-chg-${item.id}">—</span>
    </div>`;
  });
  // Tek track içinde iki kopya yan yana, TEK animasyon ile kayar (-50%) →
  // önceki yöntemde iki ayrı eleman ayrı ayrı animasyonlanıyordu, bu da
  // aralarında minik senkron kaymasına ve periyodik "takılma" hissine yol açıyordu.
  track.innerHTML =
    `<div class="w-borsa-inner">${itemsHtml}${itemsHtml.replace(/id="bb-(price|chg)-/g, 'id="bb-$1-dup-')}</div>`;
}

function borsaBandiGuncelle() {
  borsaItems.forEach(item => {
    if (item.type !== 'local') return;
    const asset = localAssets.find(a => a.id === item.id);
    if (!asset) return;
    const pool  = gpData[asset.list] || {};
    const entry = pool[asset.key];
    if (!entry) return;
    const price = parseFloat(entry.satis);
    if (!price) return;
    const isUsd = asset.key === 'XAUUSD';
    const priceStr = (isUsd ? '$' : '₺') + price.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
    const oran = parseFloat((entry.oran||entry.degisim||'0').toString().replace('%','').replace(',','.'));
    const chgStr  = (isNaN(oran) ? '—' : (oran>=0?'+':'')+Math.abs(oran).toFixed(2)+'%');
    const chgCls  = 'w-borsa-chg ' + (oran >= 0 ? 'up' : 'dn');
    // Ana + dup kopyası — textContent ile güncelle, innerHTML dokunma (animasyon donmaz)
    ['bb-price-'+item.id, 'bb-price-dup-'+item.id].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = priceStr;
    });
    ['bb-chg-'+item.id, 'bb-chg-dup-'+item.id].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = chgStr;
        el.classList.toggle('up', oran >= 0);
        el.classList.toggle('dn', oran < 0);
      }
    });
  });
}
// ===================== / CANLI BORSA BANDI =====================

// ===================== / INLINE HAVA SEHIR =====================


// ===================== ACCORDION =====================
function toggleAccordion(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('open');
}


// ===================== / ACCORDION =====================

// ===================== DORUK SENTİNEL =====================
let sentinelSymbols = [];
let sentinelAllSymbols = [];

async function sentinelLoadSymbols() {
  if (sentinelAllSymbols.length) return;
  try {
    const data = await fetch('https://api.binance.com/api/v3/ticker/24hr').then(r => r.json());
    sentinelAllSymbols = data
      .filter(t => t.symbol.endsWith('USDT'))
      .sort((a,b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .map(t => ({ symbol: t.symbol, chgPct: parseFloat(t.priceChangePercent), price: parseFloat(t.lastPrice) }));
  } catch(e) {}
}

function sentinelOnInput(val) {
  const dd = document.getElementById('sentinelDropdown');
  if (!val || val.length < 1) { dd.style.display = 'none'; return; }
  const q = val.toUpperCase().replace('USDT','');
  const matches = sentinelAllSymbols.filter(s => s.symbol.replace('USDT','').includes(q)).slice(0, 8);
  if (!matches.length) { dd.style.display = 'none'; return; }
  dd.innerHTML = matches.map(m => {
    const chg = m.chgPct;
    const color = chg >= 0 ? '#00e676' : '#ff4664';
    const sign = chg >= 0 ? '+' : '';
    return `<div onclick="sentinelSelectCoin('${m.symbol}')" style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;border-bottom:1px solid rgba(120,80,255,0.06);transition:background 0.15s;" onmouseenter="this.style.background='rgba(120,60,255,0.08)'" onmouseleave="this.style.background='transparent'">
      <span style="font-size:12px;font-weight:800;color:#e2e8f0;">${m.symbol.replace('USDT','')}</span>
      <span style="font-size:11px;font-weight:700;color:${color};">${sign}${chg.toFixed(2)}%</span>
    </div>`;
  }).join('');
  dd.style.display = '';
}

function sentinelSelectCoin(symbol) {
  document.getElementById('sentinelInput').value = symbol.replace('USDT','');
  document.getElementById('sentinelDropdown').style.display = 'none';
  // Seçili coini listede vurgula
  document.querySelectorAll('.sentinel-result-item').forEach(el => {
    const isSelected = el.getAttribute('data-symbol') === symbol;
    el.style.borderColor = isSelected ? 'rgba(160,100,255,0.50)' : 'rgba(255,255,255,0.05)';
    el.style.borderTopColor = isSelected ? 'rgba(200,140,255,0.70)' : 'rgba(255,255,255,0.08)';
    el.style.background = isSelected
      ? 'linear-gradient(145deg,rgba(35,14,70,0.97),rgba(20,8,45,0.99))'
      : 'linear-gradient(145deg,rgba(14,20,40,0.9),rgba(8,12,26,0.95))';
    el.style.boxShadow = isSelected
      ? '0 0 0 1px rgba(160,100,255,0.25) inset, 0 4px 18px rgba(120,60,255,0.18)'
      : '0 2px 0 rgba(0,0,0,0.5),0 4px 14px rgba(0,0,0,0.5)';
  });
  // Detay sayfasına geç ve analizi çalıştır
  document.getElementById('sentinelDetailContent').innerHTML =
    `<div style="text-align:center;padding:60px 0;"><div style="font-size:32px;margin-bottom:12px;">🔭</div><div style="font-size:10px;font-weight:900;letter-spacing:2px;color:rgba(160,120,255,0.6);">ANALİZ EDİLİYOR...</div></div>`;
  goToPage('sentinelDetail');
  sentinelRunAnalysis(symbol);
}

async function sentinelScanMarket() {
  const btn = document.getElementById('sentinelScanBtn');
  const prog = document.getElementById('sentinelScanProgress');
  const results = document.getElementById('sentinelResults');
  const panel = document.getElementById('sentinelAnalysisPanel');

  btn.disabled = true;
  btn.style.opacity = '0.6';
  document.getElementById('sentinelScanBtnTxt').textContent = '⏳ TARANIYOR...';
  prog.style.display = '';
  results.style.display = 'none';
  panel.style.display = 'none';

  await sentinelLoadSymbols();

  // Top 60 hacimli coini tara
  const toScan = sentinelAllSymbols.slice(0, 200);
  const scored = [];

  for (let i = 0; i < toScan.length; i++) {
    const t = toScan[i];
    const pct = Math.round(((i+1)/toScan.length)*100);
    document.getElementById('sentinelScanBar').style.width = pct + '%';
    document.getElementById('sentinelScanPct').textContent = pct + '%';
    document.getElementById('sentinelScanStatus').textContent = t.symbol.replace('USDT','') + ' taranıyor...';

    try {
      const score = await sentinelQuickScore(t.symbol);
      scored.push({ symbol: t.symbol, price: t.price, chgPct: t.chgPct, ...score });
    } catch(e) {}

    await new Promise(r => setTimeout(r, 35));
  }

  scored.sort((a,b) => b.green - a.green || b.confidence - a.confidence);

  prog.style.display = 'none';
  btn.disabled = false;
  btn.style.opacity = '1';
  document.getElementById('sentinelScanBtnTxt').textContent = '🔭 MARKETİ TARA';

  sentinelRenderResults(scored.slice(0, 15));
}

// ── Ortak yardımcı fonksiyonlar (sentinelQuickScore ve sentinelRunAnalysis paylaşır) ──

// Doğru EMA: tüm diziyi iteratif işler
function _sentEMA(arr, period) {
  if (!arr || arr.length === 0) return 0;
  const k = 2 / (period + 1);
  let e = arr[0];
  for (let i = 1; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
  return e;
}

// Doğru RSI: Wilder smoothing ile (standart hesaplama)
function _sentRSI(closes, period) {
  if (closes.length < period + 1) return 50;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gain += d; else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// Doğru MACD: lineer EMA dizisi oluşturarak sinyal hesaplar
function _sentMACD(closes) {
  if (closes.length < 35) return { macd: 0, signal: 0, hist: 0 };
  const k12 = 2 / 13, k26 = 2 / 27, k9 = 2 / 10;
  let e12 = closes[0], e26 = closes[0];
  const macdArr = [];
  for (let i = 1; i < closes.length; i++) {
    e12 = closes[i] * k12 + e12 * (1 - k12);
    e26 = closes[i] * k26 + e26 * (1 - k26);
    macdArr.push(e12 - e26);
  }
  let sig = macdArr[0];
  for (let i = 1; i < macdArr.length; i++) sig = macdArr[i] * k9 + sig * (1 - k9);
  const macdVal = macdArr[macdArr.length - 1];
  return { macd: macdVal, signal: sig, hist: macdVal - sig };
}

// Doğru ATR: True Range = max(H-L, |H-prevC|, |L-prevC|)
function _sentATR(candles, period) {
  if (candles.length < period + 1) return 0;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const prevC = candles[i - 1].close;
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - prevC),
      Math.abs(candles[i].low - prevC)
    );
    sum += tr;
  }
  return sum / period;
}

// OBV hesabı
function _sentOBV(candles) {
  let obv = 0;
  const obvArr = [0];
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) obv += candles[i].volume;
    else if (candles[i].close < candles[i - 1].close) obv -= candles[i].volume;
    obvArr.push(obv);
  }
  return obvArr;
}

// BTC verisini cache'le (sektör katmanı için)
let _sentBTCCache = { ts: 0, bull1h: false, bull4h: false };
async function _sentGetBTCTrend() {
  if (Date.now() - _sentBTCCache.ts < 60000) return _sentBTCCache;
  try {
    const [bk1h, bk4h] = await Promise.all([
      fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=50').then(r => r.json()),
      fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=60').then(r => r.json()),
    ]);
    const bc1h = bk1h.map(c => ({ close: +c[4] }));
    const bc4h = bk4h.map(c => ({ close: +c[4] }));
    const bcl1h = bc1h.map(k => k.close);
    const bcl4h = bc4h.map(k => k.close);
    _sentBTCCache = {
      ts: Date.now(),
      bull1h: bcl1h[bcl1h.length - 1] > _sentEMA(bcl1h, 20),
      bull4h: bcl4h[bcl4h.length - 1] > _sentEMA(bcl4h, 50),
    };
  } catch (e) {}
  return _sentBTCCache;
}

async function sentinelQuickScore(symbol) {
  const [k1h, k4h, k1d] = await Promise.all([
    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=120`).then(r=>r.json()),
    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=80`).then(r=>r.json()),
    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=60`).then(r=>r.json()),
  ]);
  const parse = k => k.map(c=>({open:+c[1],high:+c[2],low:+c[3],close:+c[4],volume:+c[5]}));
  const c1h=parse(k1h), c4h=parse(k4h), c1d=parse(k1d);
  const cl1h=c1h.map(k=>k.close), cl4h=c4h.map(k=>k.close), cl1d=c1d.map(k=>k.close);
  const cur = cl1h[cl1h.length-1];

  // Doğru göstergeler
  const rsi = _sentRSI(cl1h, 14);
  const macd = _sentMACD(cl1h);
  const ema20_1h = _sentEMA(cl1h, 20);
  const ema50_4h = _sentEMA(cl4h, 50);
  const ema50_1d = _sentEMA(cl1d, 50);
  const atr = _sentATR(c1h, 14);

  // OBV trendi: son 10 OBV değerinin yönü
  const obvArr = _sentOBV(c1h);
  const obvTrend = obvArr[obvArr.length-1] > obvArr[obvArr.length-10];

  // Bollinger Bands (20 periyot)
  const bbSlice = cl1h.slice(-20);
  const bbMid = bbSlice.reduce((a,b)=>a+b,0)/20;
  const bbSd = Math.sqrt(bbSlice.reduce((a,b)=>a+(b-bbMid)**2,0)/20);
  const bb = { upper: bbMid+2*bbSd, lower: bbMid-2*bbSd };

  // Hacim
  const vol = c1h[c1h.length-1].volume;
  const volMa = c1h.slice(-20).reduce((s,k)=>s+k.volume,0)/20;

  // BTC trend (sektör)
  const btc = await _sentGetBTCTrend();

  const ms1h = cur > ema20_1h;
  const ms4h = cl4h[cl4h.length-1] > ema50_4h;
  const ms1d = cl1d[cl1d.length-1] > ema50_1d;

  // BB konumu: alt yarıda mı?
  const bbRange = bb.upper - bb.lower || 1;
  const bbPos = (cur - bb.lower) / bbRange;
  const inBuyZone = bbPos >= 0 && bbPos <= 0.45;
  const atrOk = (atr / cur * 100) > 0.4;

  const rows = [
    (rsi>50&&macd.hist>0)?2:(rsi>47||macd.hist>0)?1:0,   // momentum
    ms1d?2:(cl1d[cl1d.length-1]>ema50_1d*0.97)?1:0,       // günlük trend
    (btc.bull4h&&btc.bull1h)?2:btc.bull4h?1:0,             // BTC/sektör (düzeltildi)
    (inBuyZone&&atrOk)?2:inBuyZone?1:0,                    // BB/ATR zonu
    vol>volMa*1.2?2:vol>volMa*0.85?1:0,                    // hacim
    (ms1h&&ms4h&&ms1d&&obvTrend)?2:(ms1d&&obvTrend)?1:0,  // yapı + OBV (düzeltildi)
  ];

  const green = rows.filter(r=>r===2).length;
  const conf  = Math.round((rows.reduce((a,b)=>a+b,0)/12)*100);
  return { green, confidence: conf };
}

function sentinelRenderResults(list) {
  const results = document.getElementById('sentinelResults');
  const countEl = document.getElementById('sentinelResultCount');
  const listEl  = document.getElementById('sentinelResultList');

  const readyList  = list.filter(r=>r.green>=5);
  const watchList  = list.filter(r=>r.green>=3&&r.green<5);
  const avoidList  = list.filter(r=>r.green<3).slice(0,5);

  countEl.textContent = `${list.length} coin analiz edildi`;

  let html = '';

  const renderGroup = (title, color, items, emoji) => {
    if (!items.length) return '';
    let g = `<div style="font-size:8px;font-weight:900;letter-spacing:2px;color:${color};margin:12px 0 6px;opacity:0.8;">${emoji} ${title}</div>`;
    items.forEach((r,i) => {
      const name = r.symbol.replace('USDT','');
      const chgColor = r.chgPct>=0?'#00e676':'#ff4664';
      const chgSign  = r.chgPct>=0?'+':'';
      const dotHtml  = [0,1,2,3,4,5].map(i=>
        `<div style="width:5px;height:5px;border-radius:50%;background:${i<r.green?color:'rgba(255,255,255,0.08)'};transition:all 0.3s;"></div>`
      ).join('');
      g += `<div class="sentinel-result-item" data-symbol="${r.symbol}" onclick="sentinelSelectCoin('${r.symbol}')" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:linear-gradient(145deg,rgba(14,20,40,0.9),rgba(8,12,26,0.95));border:1px solid rgba(255,255,255,0.05);border-top-color:rgba(255,255,255,0.08);margin-bottom:6px;cursor:pointer;transition:all 0.2s;box-shadow:0 2px 0 rgba(0,0,0,0.5),0 4px 14px rgba(0,0,0,0.5);">
        <div style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#e2e8f0;flex-shrink:0;">${name.slice(0,3)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:900;color:#e2e8f0;">${name}</div>
          <div style="display:flex;gap:3px;margin-top:4px;">${dotHtml}</div>
          <div style="font-size:8px;font-weight:700;color:${color};opacity:0.9;margin-top:4px;letter-spacing:0.3px;">Detay için tıkla</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:12px;font-weight:900;color:${chgColor};">${chgSign}${r.chgPct.toFixed(2)}%</div>
          <div style="font-size:9px;font-weight:900;color:${color};margin-top:2px;letter-spacing:0.5px;">${r.green}/6 ONAY</div>
        </div>
      </div>`;
    });
    return g;
  };

  html += renderGroup('ALIM İÇİN HAZIR', '#00e676', readyList, '🟢');
  html += renderGroup('BİRAZ DAHA İZLE', '#fbbf24', watchList, '🟡');
  html += renderGroup('ŞIMDI ALMA', '#ff4664', avoidList, '🔴');

  if (!html) html = '<div style="text-align:center;padding:30px;color:rgba(160,120,255,0.4);font-size:11px;font-weight:700;">Sonuç bulunamadı</div>';

  listEl.innerHTML = html;
  results.style.display = '';
}

async function sentinelRunAnalysis(symbol) {
  const panel = document.getElementById('sentinelDetailContent');

  try {
    const [k1h, k4h, k1d, ticker] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=200`).then(r=>r.json()),
      fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=100`).then(r=>r.json()),
      fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=100`).then(r=>r.json()),
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`).then(r=>r.json()),
    ]);

    const parse = k => k.map(c=>({open:+c[1],high:+c[2],low:+c[3],close:+c[4],volume:+c[5]}));
    const c1h=parse(k1h), c4h=parse(k4h), c1d=parse(k1d);
    const cl1h=c1h.map(k=>k.close), n=cl1h.length;
    const cl4h=c4h.map(k=>k.close), cl1d=c1d.map(k=>k.close);
    const cur = cl1h[n-1];
    const name = symbol.replace('USDT','');
    const chgPct = parseFloat(ticker.priceChangePercent);
    const chgColor = chgPct>=0?'#00e676':'#ff4664';
    const dec = cur<0.01?6:cur<1?4:cur<100?3:2;

    // ── Düzeltilmiş göstergeler (ortak yardımcı fonksiyonları kullan) ──
    const rsi14 = _sentRSI(cl1h, 14);
    const macd  = _sentMACD(cl1h);
    const macdHist = macd.hist;

    const ema20_1h = _sentEMA(cl1h, 20);
    const ema50_4h = _sentEMA(cl4h, 50);
    const ema50_1d = _sentEMA(cl1d, 50);

    // Doğru ATR (önceki kapanışa göre True Range)
    const atr = _sentATR(c1h, 14);

    // OBV trendi (son 20 mum)
    const obvArr = _sentOBV(c1h);
    const obvNow = obvArr[obvArr.length-1];
    const obvPast = obvArr[Math.max(0, obvArr.length-20)];
    const obvBull = obvNow > obvPast;

    // BTC/Piyasa sektörü (gerçek BTC verisi)
    const btc = await _sentGetBTCTrend();

    const vol1h=c1h[n-1].volume, volMa1h=c1h.slice(-20).reduce((s,k)=>s+k.volume,0)/20;

    const bbSlice=cl1h.slice(-20), bbMid=bbSlice.reduce((a,b)=>a+b,0)/20;
    const bbSd=Math.sqrt(bbSlice.reduce((a,b)=>a+(b-bbMid)**2,0)/20);
    const bb={upper:bbMid+2*bbSd,lower:bbMid-2*bbSd};

    const ms1h_bull=cur>ema20_1h;
    const ms4h_bull=cl4h[cl4h.length-1]>ema50_4h;
    const ms1d_bull=cl1d[cl1d.length-1]>ema50_1d;

    // ── Katman hesapları ──
    const momScore=(rsi14>50&&macdHist>0)?2:(rsi14>47||macdHist>0)?1:0;
    const momCls=momScore===2?'bull':momScore===1?'neu':'bear';
    const momLbl=momScore===2?'GÜÇLÜ ALİM':momScore===1?'ZENCİRDE':'SATIŞTA';
    const momDesc=momScore===2?`Alıcılar kontrolde — fiyat yukarı itiliyor (RSI ${rsi14.toFixed(0)})`:momScore===1?`Alım var ama yeterince güçlü değil (RSI ${rsi14.toFixed(0)})`:`Satıcılar baskıda, alıcılar pasif (RSI ${rsi14.toFixed(0)})`;

    const wCls=ms1d_bull?'bull':'bear';
    const wLbl=ms1d_bull?'YÜKSELİŞTE':'DÜŞÜŞTE';
    const wDesc=ms1d_bull?`Fiyat günlük ortalama ($${ema50_1d.toFixed(dec)}) üstünde — genel trend yukarı`:`Fiyat günlük ortalamanın ($${ema50_1d.toFixed(dec)}) altında — genel trend aşağı`;

    const gScore=(btc.bull4h&&btc.bull1h)?2:btc.bull4h?1:0;
    const gCls=gScore===2?'bull':gScore===1?'neu':'bear';
    const gLbl=gScore===2?'PİYASA GÜÇLÜ':gScore===1?'KARIŞIK':'PİYASA ZAYIF';
    const gDesc=gScore===2?'Bitcoin yükselişte — tüm piyasa destekleyici, altcoinler için iyi ortam':gScore===1?'Bitcoin kararsız — temkinli ol':'Bitcoin düşüşte — bu ortamda altcoin almak riskli';

    const bbRange=bb.upper-bb.lower||1;
    const bbPos=Math.max(0,Math.min(100,Math.round(((cur-bb.lower)/bbRange)*100)));
    const inBuyZone=bbPos>=0&&bbPos<=45;
    const atrPct=(atr/cur*100);
    const fScore=(inBuyZone?1:0)+(atrPct>0.4?1:0);
    const fCls=fScore===2?'bull':fScore===1?'neu':'bear';
    const fDesc=fScore===2?`Fiyat ucuz bölgede ve piyasa hareketli — giriş için uygun an`:fScore===1?`Fiyat orta bölgede — ne çok ucuz ne çok pahalı, bekle`:`Fiyat pahalı bölgede veya piyasa durgun — şu an iyi giriş değil`;

    const vOk=vol1h>volMa1h*1.2;
    const vCls=vOk?'bull':vol1h>volMa1h*0.85?'neu':'bear';
    const vPct=Math.min(200,Math.round((vol1h/volMa1h)*100));
    const vDesc=vOk?`Normalden %${vPct} daha fazla işlem yapılıyor — hareket gerçek ve güvenilir`:vol1h>volMa1h*0.85?'İşlem hacmi normal — ne çok aktif ne çok sessiz':'Çok az işlem var — fiyat hareketi yanıltıcı olabilir, dikkat';

    const swScore=(ms1d_bull&&obvBull&&ms4h_bull)?2:(ms1d_bull&&obvBull)?1:0;
    const swCls=swScore===2?'bull':swScore===1?'neu':'bear';
    const swLbl=swScore===2?'ALIYOR':swScore===1?'MUHTEMELEN':'SATIYORLAR';
    const swDesc=swScore===2?'Büyük yatırımcılar sessizce coin biriktiriyor — güçlü yükseliş sinyali':swScore===1?'Büyük yatırımcı hareketi var ama henüz tam emin değil':'Büyük yatırımcılar bu coinden çıkıyor olabilir — dikkat';

    const rows = [
      {icon:'⚡',name:'ALIM GÜCÜ',       val:momLbl, desc:momDesc, cls:momCls, pct:momScore===2?100:momScore===1?55:15},
      {icon:'📈',name:'GENEL TREND',      val:wLbl,   desc:wDesc,   cls:wCls,   pct:ms1d_bull?88:12},
      {icon:'₿', name:'PİYASA DURUMU',   val:gLbl,   desc:gDesc,   cls:gCls,   pct:gScore===2?85:gScore===1?50:15},
      {icon:'🎯',name:'GİRİŞ NOKTASI',   val:fScore===2?'UYGUN':fScore===1?'ORTA':'ERKEN DEĞİL', desc:fDesc, cls:fCls, pct:fScore===2?78:fScore===1?48:18},
      {icon:'📊',name:'İŞLEM YOĞUNLUĞU', val:vOk?'YÜKSEK':vol1h>volMa1h*0.85?'NORMAL':'DÜŞÜK', desc:vDesc, cls:vCls, pct:Math.min(100,vPct)},
      {icon:'🐋',name:'BÜYÜK YATIRIMCI', val:swLbl,  desc:swDesc,  cls:swCls,  pct:swScore===2?82:swScore===1?50:20},
    ];

    const green=rows.filter(r=>r.cls==='bull').length;
    const bear=rows.filter(r=>r.cls==='bear').length;
    const readPct=Math.round((green/6)*100);
    const readColor=green>=5?'#00e676':green>=3?'#fbbf24':'#8a3040';

    let kCls,kEmoji,kText,kSub;
    if(green>=5){kCls='ds-buy';kEmoji='🟢';kText='ALIM ZAMANI';kSub=`${green} koşulun ${6}'sı sağlandı. Her şey yolunda görünüyor — giriş için uygun an. Yine de stop-loss koyduğunu unutma.`;}
    else if(green>=3){kCls='ds-wait';kEmoji='🟡';kText='BİRAZ DAHA BEKLE';kSub=`${green} koşul tamam, ${6-green} koşul henüz hazır değil. Acele etme — doğru an biraz daha sabır istiyor.`;}
    else{kCls='ds-none';kEmoji='🔴';kText='ŞİMDİ ALMA';kSub=`Sadece ${green} koşul uygun, çok fazla risk var. Daha iyi bir fırsat için beklemek daha mantıklı.`;}

    const dotsHtml=rows.map(r=>`<div class="ds-dot ${r.cls==='bull'?'dg':r.cls==='bear'?'dr':'dy'}"></div>`).join('');
    const rowsHtml=rows.map((r,i)=>{
      const chipTxt=r.cls==='bull'?'✅ ONAY':r.cls==='bear'?'❌ RET':'⚠️ BEKLE';
      const chipCls=r.cls==='bull'?'cg':r.cls==='bear'?'cr':'cy';
      const barCls=r.cls==='bull'?'bg':r.cls==='bear'?'br':'by';
      return `<div class="ds-row r-${r.cls}">
        <div class="ds-row-icon">${r.icon}</div>
        <div class="ds-row-info">
          <div class="ds-row-name">${r.name}</div>
          <div class="ds-row-val">${r.val}</div>
          <div class="ds-row-desc">${r.desc}</div>
        </div>
        <div class="ds-row-right">
          <span class="ds-chip ${chipCls}">${chipTxt}</span>
          <div class="ds-bar-wrap"><div id="sBar${i}" class="ds-bar-fill ${barCls}" style="width:0%;"></div></div>
        </div>
      </div>`;
    }).join('');

    panel.innerHTML = `
      <div style="margin-top:14px;">
        <!-- Coin Başlık -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:16px;background:linear-gradient(145deg,rgba(14,20,40,0.95),rgba(8,12,26,0.98));border:1px solid rgba(255,255,255,0.06);border-top-color:rgba(255,255,255,0.10);margin-bottom:10px;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
          <div>
            <div style="font-size:18px;font-weight:900;color:#e2e8f0;">${name} <span style="font-size:10px;color:rgba(160,120,255,0.6);font-weight:700;">/ USDT</span></div>
            <div style="font-size:11px;font-weight:900;color:${chgColor};margin-top:2px;">${chgPct>=0?'+':''}${chgPct.toFixed(2)}% <span style="color:rgba(160,160,160,0.5);font-weight:600;">24s</span></div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:20px;font-weight:900;color:#00d4ff;">$${cur.toFixed(dec)}</div>
            <div style="font-size:9px;font-weight:700;color:rgba(160,120,255,0.5);margin-top:2px;letter-spacing:1px;">GÜNCEL FİYAT</div>
          </div>
        </div>

        <!-- Sentinel Panel -->
        <div class="doruk-sentinel-wrap open">
          <div style="position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(160,100,255,0.6),rgba(200,140,255,0.8),rgba(160,100,255,0.6),transparent);z-index:3;"></div>
          <div class="ds-accordion-header" onclick="this.closest('.doruk-sentinel-wrap').classList.toggle('open')">
            <div class="ds-header-left">
              <div class="ds-icon-wrap">🔭</div>
              <div>
                <div class="ds-title">Doruk Sentinel</div>
                <div class="ds-subtitle">${name} · Çok Katmanlı Analiz</div>
              </div>
            </div>
            <span class="ds-arrow">▼</span>
          </div>
          <div class="ds-body">
            <div class="ds-karar-box ${kCls}">
              <div class="ds-karar-top">
                <div class="ds-karar-label">DORUK KARAR</div>
                <div class="ds-dots">${dotsHtml}</div>
              </div>
              <div class="ds-karar-main">
                <div class="ds-karar-emoji">${kEmoji}</div>
                <div class="ds-karar-text" style="color:${readColor};">${kText}</div>
              </div>
              <div class="ds-karar-sub">${kSub}</div>
            </div>
            <div class="ds-rows" id="sentinelRowsEl">${rowsHtml}</div>
            <div class="ds-score-row">
              <div>
                <div class="ds-score-label">DURUM ÖZETİ</div>
                <div class="ds-score-val">${green} Olumlu · ${bear} Olumsuz · ${6-green-bear} Kararsız</div>
              </div>
              <div style="text-align:right;">
                <div class="ds-score-label">ALIM HAZIRLIĞI</div>
                <div class="ds-readiness" style="color:${readColor};">%${readPct}</div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    setTimeout(()=>{ rows.forEach((_,i)=>{ const el=document.getElementById('sBar'+i); if(el) el.style.width=rows[i].pct+'%'; }); }, 200);

  } catch(e) {
    panel.innerHTML = `<div style="text-align:center;padding:30px;"><div style="font-size:11px;font-weight:900;color:#ff4664;letter-spacing:1px;">HATA OLUŞTU</div><div style="font-size:10px;color:#4a6a8a;margin-top:6px;">${e.message||'API bağlantı hatası'}</div></div>`;
  }
}

// Sayfa açılınca sembolleri yükle
document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(sentinelLoadSymbols, 4000); });
// ===================== / DORUK SENTİNEL =====================

// ===================== SPARK LINE =====================
const _sparkCache = {};
const _sparkPending = new Set();
let _sparkObserver = null;

function scheduleSparkline(symbol) {
  const svg = document.getElementById('spark-' + symbol);
  if (!svg || svg.getAttribute('data-loaded')) return;
  const card = document.getElementById('card-' + symbol);
  if (!card || !('IntersectionObserver' in window)) {
    fetchSparkline(symbol);
    return;
  }
  // Bazı mobil WebView'larda IntersectionObserver, iç scroll alanındaki
  // kartı kesişmiş bildirmeyebiliyor; grafik yine de görünür olsun.
  const fallbackTimer = setTimeout(function () {
    const current = document.getElementById('spark-' + symbol);
    if (current && !current.getAttribute('data-loaded')) fetchSparkline(symbol);
  }, 1200);
  if (!_sparkObserver) {
    _sparkObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        const target = entry.target;
        const targetSymbol = target.id.replace('card-', '');
        clearTimeout(target._sparkFallbackTimer);
        _sparkObserver.unobserve(target);
        fetchSparkline(targetSymbol);
      });
    }, { root: null, rootMargin: '140px 0px', threshold: 0.01 });
  }
  card._sparkFallbackTimer = fallbackTimer;
  _sparkObserver.observe(card);
}

async function fetchSparkline(symbol) {
  if (_sparkCache[symbol]) { drawSparkline(symbol, _sparkCache[symbol]); return; }
  if (_sparkPending.has(symbol)) return;
  _sparkPending.add(symbol);
  // 1. Önce localStorage cache'den anında göster (1 saatten yeni ise)
  try {
    const cached = JSON.parse(localStorage.getItem('cache_spark_'+symbol) || 'null');
    if(cached && cached.ts && Date.now() - cached.ts < 3600000 && Array.isArray(cached.prices)) {
      _sparkCache[symbol] = cached.prices;
      drawSparkline(symbol, cached.prices);
      _sparkPending.delete(symbol);
      return; // Cache taze, API'ye gitme
    }
  } catch(e) {}
  // 2. Bellekte varsa (sayfa içi) direk çiz
  if(_sparkCache[symbol]) { drawSparkline(symbol, _sparkCache[symbol]); return; }
  // 3. API'den çek, hem belleğe hem localStorage'a kaydet
  try {
    const r = await fetch('https://api.binance.com/api/v3/klines?symbol='+symbol+'&interval=1h&limit=24');
    const data = await r.json();
    if(!Array.isArray(data)) return;
    const prices = data.map(d => parseFloat(d[4]));
    _sparkCache[symbol] = prices;
    drawSparkline(symbol, prices);
    // localStorage'a kaydet
    try { localStorage.setItem('cache_spark_'+symbol, JSON.stringify({prices, ts: Date.now()})); } catch(e) {}
  } catch(e) {}
  _sparkPending.delete(symbol);
}

function drawSparkline(symbol, prices) {
  const svg = document.getElementById('spark-'+symbol);
  if(!svg || prices.length < 2) return;
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const W = 100, H = 16, pad = 2;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * (W - pad*2) + pad;
    const y = H - pad - ((p - min) / range) * (H - pad*2);
    return x.toFixed(2)+','+y.toFixed(2);
  });
  const isUp = prices[prices.length-1] >= prices[0];
  const cls = isUp ? 'up' : 'down';
  const pathD = 'M' + pts.join('L');
  const fillD = pathD + 'L'+(W-pad)+','+H+' L'+pad+','+H+' Z';

  // innerHTML yerine setAttribute — DOM rebuild yok
  let fillEl = svg.querySelector('.spark-fill');
  let pathEl = svg.querySelector('.spark-path');
  if(!fillEl || !pathEl) {
    const ns = 'http://www.w3.org/2000/svg';
    fillEl = document.createElementNS(ns, 'path');
    pathEl = document.createElementNS(ns, 'path');
    svg.appendChild(fillEl);
    svg.appendChild(pathEl);
  }
  fillEl.setAttribute('class', 'spark-fill ' + cls);
  fillEl.setAttribute('d', fillD);
  pathEl.setAttribute('class', 'spark-path ' + cls);
  pathEl.setAttribute('d', pathD);
  svg.setAttribute('data-loaded', '1');
}

// ===================== CHART MODAL =====================
let _chartSymbol = '', _chartName = '';

function openChartModal(symbol, name, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  if (!symbol.endsWith('USDT')) return;
  _chartSymbol = symbol;
  _chartName = name || symbol.replace('USDT', '');

  document.getElementById('chartCoinName').textContent = _chartName + ' / USDT';
  document.getElementById('chartCoinPrice').textContent = '';
  document.getElementById('chartCoinChg').textContent = '';

  // TradingView widget yükle
  const tvSymbol = 'BINANCE:' + symbol;
  const wrap = document.getElementById('chartTvWrap');
  wrap.innerHTML = '';

  const container = document.createElement('div');
  container.id = 'tv_chart_container';
  container.style.cssText = 'width:100%;height:100%;';
  wrap.appendChild(container);

  const script = document.createElement('script');
  script.src = 'https://s3.tradingview.com/tv.js';
  script.onload = function() {
    new TradingView.widget({
      container_id: 'tv_chart_container',
      width: '100%',
      height: '100%',
      symbol: tvSymbol,
      interval: '240',
      timezone: 'Europe/Istanbul',
      theme: 'dark',
      style: '1',
      locale: 'tr',
      toolbar_bg: '#0c1829',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      backgroundColor: '#0c1829',
      gridColor: 'rgba(0,212,255,0.05)',
      allow_symbol_change: false,
      studies: ['STD;Bollinger_Bands'],
      overrides: {
        'paneProperties.background': '#0c1829',
        'paneProperties.backgroundType': 'solid',
      }
    });
  };
  // Script zaten yüklüyse direkt widget oluştur
  if (window.TradingView) {
    script.onload();
  } else {
    document.head.appendChild(script);
  }

  document.getElementById('chartModal').classList.add('show');
  // Geri tuşu chart modalı kapatsın diye history state ekle
  history.pushState({modal: 'chart'}, '', '');
}

function closeChartModal(e) {
  if (e && e.target !== document.getElementById('chartModal')) return;
  _closeChart();
}
function closeChartModalBtn() {
  // Eğer history state chart modala aitse geri git (popstate _closeChart'ı çağırır)
  if (history.state && history.state.modal === 'chart') {
    history.back();
  } else {
    _closeChart();
  }
}
function _closeChart() {
  document.getElementById('chartModal').classList.remove('show');
  // Widget'ı temizle (bellek serbest bırak)
  setTimeout(() => {
    const wrap = document.getElementById('chartTvWrap');
    if (wrap) wrap.innerHTML = '';
  }, 350);
}

// TREND WIDGET KALDIRILDI
// ===================== FEAR & GREED + MARKET SUMMARY =====================
const W_FG_LABELS = {
  'Extreme Fear':'AŞIRI KORKU','Fear':'KORKU','Neutral':'TARAFSIZ',
  'Greed':'AÇGÖZLÜLÜK','Extreme Greed':'AŞIRI AÇGÖZLÜLÜK'
};
const W_FG_COLORS = {
  'Extreme Fear':'#ef4444','Fear':'#f97316','Neutral':'#eab308',
  'Greed':'#84cc16','Extreme Greed':'#22c55e'
};

function wSetGauge(value) {
  const angle = (value / 100) * 180 - 90;
  const needle = document.getElementById('wNeedle');
  if(needle) needle.style.transform = `rotate(${angle}deg)`;
  const fill = document.getElementById('wGaugeFill');
  if(fill) { fill.style.strokeDasharray = 274; fill.style.strokeDashoffset = 274 - (value/100*274); }
  const dot = document.getElementById('wFgDot');
  if(dot) dot.style.left = `calc(${value}% - 3.5px)`;
}

function wSetGaugeColor(color) {
  const needle = document.getElementById('wNeedle');
  const hub = document.getElementById('wGaugeHub');
  if (needle) {
    needle.setAttribute('stroke', color);
    needle.style.filter = `drop-shadow(0 0 5px ${color}99)`;
  }
  if (hub) {
    hub.setAttribute('fill', color);
    hub.style.filter = `drop-shadow(0 0 7px ${color}aa)`;
  }
  const card = document.querySelector('.w-fg-card');
  if (card) card.style.setProperty('border-top-color', color + '66');
  const glow = document.querySelector('.w-fg-card .w-corner-glow');
  if (glow) glow.style.background = `radial-gradient(circle, ${color}22 0%, transparent 70%)`;
}

async function wLoadFG() {
  try {
    const r = await fetch('https://api.alternative.me/fng/?limit=2');
    const d = await r.json();
    const today = d.data[0], yesterday = d.data[1];
    const val = parseInt(today.value);
    const label = today.value_classification;
    const yVal = parseInt(yesterday.value);
    const yLabel = yesterday.value_classification;
    const color = W_FG_COLORS[label] || '#fbbf24';

    const numEl = document.getElementById('wFgNum');
    const statusEl = document.getElementById('wFgStatus');
    const subEl = document.getElementById('wFgSub');
    const dotEl = document.getElementById('wFgDot');
    const badgeEl = document.getElementById('fgBadge');

    if(numEl) { numEl.textContent = val; numEl.style.color = color; numEl.style.textShadow = `0 0 16px ${color}55`; }
    if(statusEl) { statusEl.textContent = W_FG_LABELS[label] || label; statusEl.style.color = color; statusEl.style.textShadow = `0 0 20px ${color}44`; }
    if(subEl) subEl.textContent = `Dün: ${W_FG_LABELS[yLabel] || yLabel} (${yVal})`;
    if(dotEl) { dotEl.style.background = color; dotEl.style.boxShadow = `0 0 8px ${color}88`; }
    if(badgeEl) badgeEl.textContent = 'GÜNCEL';
    wSetGauge(val);
    wSetGaugeColor(color);
  } catch(e) { wSetGauge(65); }
}

function wFmtCap(n) {
  if(n>=1e12) return '$'+(n/1e12).toFixed(2)+'T';
  if(n>=1e9)  return '$'+(n/1e9).toFixed(0)+'B';
  return '$'+n.toFixed(0);
}

async function wLoadMarket() {
  try {
    // Binance: anlık fiyat + hacim + değişim
    const bnSymbols = encodeURIComponent('["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT","TRXUSDT","LINKUSDT","LTCUSDT","DOTUSDT","UNIUSDT","ATOMUSDT","NEARUSDT","MATICUSDT","APTUSDT","SHIBUSDT","OPUSDT","ARBUSDT"]');

    const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=' + bnSymbols);
    const tickers = await binanceRes.json();

    // Toplam 24s hacim — Binance USDT çiftleri (anlık)
    const totalVol = tickers.reduce((s, t) => s + parseFloat(t.quoteVolume || 0), 0);

    // BTC 24s değişim — Binance (anlık)
    const btcTicker = tickers.find(t => t.symbol === 'BTCUSDT');
    const btcChg = btcTicker ? parseFloat(btcTicker.priceChangePercent) : 0;

    // Dolaşımdaki arz (sabit, nadiren değişir) — TradingView CRYPTOCAP metodolojisi
    const SUPPLY = {
      BTCUSDT:   19_850_000,
      ETHUSDT:   120_270_000,
      BNBUSDT:   145_887_575,
      SOLUSDT:   468_000_000,
      XRPUSDT:   57_800_000_000,
      ADAUSDT:   35_700_000_000,
      DOGEUSDT:  146_000_000_000,
      AVAXUSDT:  412_000_000,
      TRXUSDT:   87_000_000_000,
      LINKUSDT:  608_000_000,
      LTCUSDT:   74_800_000,
      DOTUSDT:   1_400_000_000,
      UNIUSDT:   600_000_000,
      ATOMUSDT:  390_000_000,
      NEARUSDT:  1_130_000_000,
      MATICUSDT: 9_900_000_000,
      APTUSDT:   1_020_000_000,
      SHIBUSDT:  589_000_000_000_000,
      OPUSDT:    1_090_000_000,
      ARBUSDT:   3_370_000_000,
    };

    // Her coinin mcap'ini Binance anlık fiyat × dolaşım arzı ile hesapla
    let totalMcap = 0;
    let btcMcap   = 0;
    for (const t of tickers) {
      const supply = SUPPLY[t.symbol];
      if (!supply) continue;
      const mcap = parseFloat(t.lastPrice) * supply;
      totalMcap += mcap;
      if (t.symbol === 'BTCUSDT') btcMcap = mcap;
    }
    // Bu top-20 ≈ toplam piyasanın ~%82'si (stablecoin hariç, TradingView gibi)
    const estTotal = totalMcap / 0.82;
    const btcDom   = estTotal > 0 ? (btcMcap / estTotal) * 100 : 0;

    const mcapEl    = document.getElementById('wMcap');
    const mcapChgEl = document.getElementById('wMcapChg');
    const domEl     = document.getElementById('wBtcDom');
    const domFillEl = document.getElementById('wDomFill');
    const domSubEl  = document.getElementById('wDomSub');
    const volEl     = document.getElementById('wVol');
    const timeEl    = document.getElementById('wMsTime');

    if(mcapEl) mcapEl.textContent = wFmtCap(estTotal);
    if(mcapChgEl) {
      mcapChgEl.textContent = (btcChg >= 0 ? '▲ +' : '▼ ') + btcChg.toFixed(1) + '%';
      mcapChgEl.className = 'w-ms-cell-sub ' + (btcChg >= 0 ? 'up' : 'down');
    }
    if(domEl) domEl.textContent = btcDom.toFixed(1) + '%';
    if(domFillEl) domFillEl.style.width = btcDom.toFixed(1) + '%';
    if(domSubEl) { domSubEl.textContent = btcDom > 50 ? '▲ BTC Baskın' : '▶ Altcoin Sezon'; domSubEl.className = 'w-ms-cell-sub ' + (btcDom > 50 ? 'up' : 'neu'); }
    if(volEl) volEl.textContent = wFmtCap(totalVol);
    if(timeEl) timeEl.textContent = new Date().toLocaleTimeString('tr-TR');
  } catch(e) {
    const t = document.getElementById('wMsTime');
    if(t) t.textContent = 'HATA';
  }
}

function wWidgetsInit() {
  wLoadFG();
  wLoadMarket();
  if (window._wLoadMarketInterval) clearInterval(window._wLoadMarketInterval);
  if (window._wLoadFGInterval)     clearInterval(window._wLoadFGInterval);
  window._wLoadMarketInterval = setInterval(wLoadMarket, 30000);
  window._wLoadFGInterval     = setInterval(wLoadFG, 30000);
}
