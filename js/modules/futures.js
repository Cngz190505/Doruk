/* Doruk module: futures.js */
// ===================== FUTURES MODÜLü =====================

let ftPositions = [];
let ftAllSymbols = [];
let ftLeverageBrackets = {}; // sembol → bracket tablosu
let ftSelectedSymbol = null;
let ftSelectedPrice = 0;
let ftDirection = 'long';
let ftPnlTimer = null;

// ── Binance Futures Kaldıraç & Bakım Marjini Bracket Tablosu ──
// Her sembol için [maxNotional, maintenanceMarginRate, maintenanceAmount]
// Kaynak: Binance USDM Futures — Gerçek BTC bracket tablosu (2024)
const FT_DEFAULT_BRACKETS = [
  { cap: 50000,      mmr: 0.004,  mma: 0 },
  { cap: 250000,     mmr: 0.005,  mma: 50 },
  { cap: 1000000,    mmr: 0.010,  mma: 1300 },
  { cap: 10000000,   mmr: 0.025,  mma: 26300 },
  { cap: 20000000,   mmr: 0.050,  mma: 276300 },
  { cap: 50000000,   mmr: 0.100,  mma: 1276300 },
  { cap: 100000000,  mmr: 0.125,  mma: 2526300 },
  { cap: Infinity,   mmr: 0.150,  mma: 5026300 },
];

// Pozisyon notional değerine göre doğru bracket'ı bul
function ftGetBracket(symbol, notional) {
  const brackets = ftLeverageBrackets[symbol] || FT_DEFAULT_BRACKETS;
  return brackets.find(b => notional <= b.cap) || brackets[brackets.length - 1];
}

// Sembole göre max kaldıraç (Binance gerçek değerleri)
function ftGetMaxLev(symbol) {
  const base = symbol.replace('USDT','');
  const map = {
    BTC:125, ETH:100, BNB:75, SOL:75, XRP:75, DOGE:75, ADA:75,
    AVAX:50, DOT:50, MATIC:50, LINK:50, LTC:75, BCH:50, TRX:75,
    ATOM:50, UNI:50, FIL:25, ETC:50, APT:50, ARB:50, OP:50,
    SUI:50, INJ:50, SEI:20, TIA:20, PEPE:25, WIF:25, BONK:20,
    JTO:20, PYTH:20, JUP:20, W:20, BOME:20, ORDI:25, SATS:20,
  };
  return map[base] || 20;
}

// Bracket tablosunu Binance'den çek (opsiyonel, hata olursa default kullanılır)
async function ftFetchBrackets(symbol) {
  if (ftLeverageBrackets[symbol]) return;
  try {
    const r = await fetch(`https://fapi.binance.com/fapi/v1/leverageBracket?symbol=${symbol}`).then(r=>r.json());
    if (Array.isArray(r) && r[0] && r[0].brackets) {
      ftLeverageBrackets[symbol] = r[0].brackets.map(b => ({
        cap: b.notionalCap,
        mmr: b.maintMarginRatio,
        mma: b.cum,
      }));
    }
  } catch(e) {}
}

// ── Likidasyon Fiyatı (Binance Resmi Formül) ──
// Binance Isolated Margin Likidasyon Formülü
// Long:  Liq = Entry × (1 - IMR + MMR) - MMA/qty  → entry ALTINDA
// Short: Liq = Entry × (1 + IMR - MMR) + MMA/qty  → entry ÜSTÜNDE
// IMR = 1/leverage, qty = notional/entry
function ftCalcLiqPrice(entry, leverage, direction, notional, symbol) {
  const bracket = ftGetBracket(symbol || ftSelectedSymbol || '', notional);
  const mmr = bracket.mmr;
  const mma = bracket.mma || 0;
  const imr = 1 / leverage;
  const qty = notional / entry;

  if (direction === 'short') {
    // Short: fiyat yükselince likide → liq entry'nin ÜSTÜNDE
    return entry * (1 + imr - mmr) + mma / qty;
  } else {
    // Long: fiyat düşünce likide → liq entry'nin ALTINDA
    return entry * (1 - imr + mmr) - mma / qty;
  }
}

// ── PnL Hesabı (komisyon dahil) ──
// Binance taker fee: %0.05 açılış + %0.05 kapanış = %0.10 toplam
const FT_TAKER_FEE = 0.0005; // tek taraf fee
function ftCalcPnl(pos, currentPrice) {
  const notional = pos.amount * pos.leverage;
  const qty = notional / pos.entry;
  let rawPnl;
  if (pos.direction === 'long') {
    rawPnl = (currentPrice - pos.entry) * qty;
  } else {
    rawPnl = (pos.entry - currentPrice) * qty;
  }
  // Açılış fee (entry üzerinden) zaten ödenmiş — gösterimde düşürüyoruz
  const openFee = notional * FT_TAKER_FEE;
  const closeFee = (qty * currentPrice) * FT_TAKER_FEE;
  return rawPnl - openFee - closeFee;
}

// ── ROE % (Return on Equity) ──
function ftCalcRoe(pos, currentPrice) {
  const pnl = ftCalcPnl(pos, currentPrice);
  return (pnl / pos.amount) * 100;
}

// LocalStorage
function ftSave() {
  localStorage.setItem('ft_positions_v1', JSON.stringify(ftPositions));
  try {
    var db = _loginDb();
    var userKey = (localStorage.getItem('doruk_login_user') || '').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
    if (db && userKey) {
      db.ref('strateji/' + userKey).set({ positions: ftPositions, guncelleme: Date.now() })
        .catch(function(e){ console.warn('ftSave Firebase hatası:', e); });
    }
  } catch(e) { console.warn('ftSave hata:', e); }
}

function ftLoad(callback) {
  try {
    const r = localStorage.getItem('ft_positions_v1');
    if (r) {
      const parsed = JSON.parse(r);
      if (Array.isArray(parsed)) ftPositions = parsed;
    }
  } catch(e) { console.warn('ftLoad localStorage hatası'); }

  try {
    var db = _loginDb();
    var userKey = (localStorage.getItem('doruk_login_user') || '').toLowerCase().replace(/[.#$\/\[\]]/g,'_');
    if (db && userKey) {
      db.ref('strateji/' + userKey).once('value', function(snap) {
        if (snap.exists()) {
          var data = snap.val();
          if (data && Array.isArray(data.positions)) {
            ftPositions = data.positions;
            localStorage.setItem('ft_positions_v1', JSON.stringify(ftPositions));
          }
        }
        if (typeof callback === 'function') callback();
      }, function(err) {
        console.warn('ftLoad Firebase hatası:', err);
        if (typeof callback === 'function') callback();
      });
      return;
    }
  } catch(e) { console.warn('ftLoad hata:', e); }
  if (typeof callback === 'function') callback();
}

// Sembol listesi yükle
async function ftLoadSymbols() {
  if (ftAllSymbols.length) return;
  try {
    const data = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr').then(r => r.json());
    ftAllSymbols = data
      .filter(t => t.symbol.endsWith('USDT'))
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .map(t => ({ symbol: t.symbol, chgPct: parseFloat(t.priceChangePercent), price: parseFloat(t.lastPrice) }));
  } catch(e) {}
}

// Modal aç
function ftOpenModal() {
  ftSelectedSymbol = null;
  ftSelectedPrice = 0;
  ftDirection = 'long';
  document.getElementById('ftSearchInput').value = '';
  document.getElementById('ftSearchResults').style.display = 'none';
  document.getElementById('ftSelectedCoin').style.display = 'none';
  document.getElementById('ftAmountInput').value = '';
  document.getElementById('ftEntryInput').value = '';
  document.getElementById('ftPreview').style.display = 'none';
  const slider = document.getElementById('ftLevSlider');
  slider.max = 125; slider.value = 10;
  document.getElementById('ftLevDisplay').textContent = '10×';
  ftUpdateLevLabels(125);
  ftSetDir('long');
  ftValidate();
  const m = document.getElementById('ftModal');
  m.style.display = 'flex';
  setTimeout(() => m.style.opacity = '1', 10);
  ftLoadSymbols();
  history.pushState({modal: 'ft'}, '', '');
}

function ftModalBgClick(e) {
  if (e.target === document.getElementById('ftModal')) ftCloseModal();
}
function ftCloseModal() {
  document.getElementById('ftModal').style.display = 'none';
}

// Kaldıraç slider etiketlerini max'a göre güncelle
function ftUpdateLevLabels(maxLev) {
  const labels = document.getElementById('ftLevLabels');
  if (!labels) return;
  const steps = maxLev <= 20  ? [1, 5, 10, 15, maxLev]
              : maxLev <= 50  ? [1, 10, 20, 35, maxLev]
              : maxLev <= 75  ? [1, 10, 25, 50, maxLev]
              : maxLev <= 100 ? [1, 25, 50, 75, maxLev]
              :                 [1, 25, 50, 100, maxLev];
  labels.innerHTML = steps.map(s => `<span style="font-size:8px;color:rgba(140,165,200,0.30);font-weight:700;">${s}×</span>`).join('');
}

// Yön seç
function ftSetDir(dir) {
  ftDirection = dir;
  const lb = document.getElementById('ftLongBtn');
  const sb = document.getElementById('ftShortBtn');
  if (dir === 'long') {
    lb.style.border = '2px solid rgba(0,230,118,0.75)'; lb.style.borderTopColor = 'rgba(0,255,140,0.90)';
    lb.style.background = 'linear-gradient(145deg,rgba(0,230,118,0.25),rgba(0,180,90,0.15))'; lb.style.color = '#00e676';
    lb.style.boxShadow = '0 0 20px rgba(0,230,118,0.25) inset,0 3px 12px rgba(0,0,0,0.4),0 0 8px rgba(0,230,118,0.15)';
    sb.style.border = '2px solid rgba(255,70,100,0.18)'; sb.style.borderTopColor = 'rgba(255,70,100,0.18)';
    sb.style.background = 'rgba(255,70,100,0.04)'; sb.style.color = 'rgba(255,100,130,0.4)';
    sb.style.boxShadow = '0 3px 12px rgba(0,0,0,0.4)';
  } else {
    sb.style.border = '2px solid rgba(255,70,100,0.75)'; sb.style.borderTopColor = 'rgba(255,100,130,0.90)';
    sb.style.background = 'linear-gradient(145deg,rgba(255,70,100,0.25),rgba(200,40,70,0.15))'; sb.style.color = '#ff4664';
    sb.style.boxShadow = '0 0 20px rgba(255,70,100,0.25) inset,0 3px 12px rgba(0,0,0,0.4),0 0 8px rgba(255,70,100,0.15)';
    lb.style.border = '2px solid rgba(0,230,118,0.18)'; lb.style.borderTopColor = 'rgba(0,230,118,0.18)';
    lb.style.background = 'rgba(0,230,118,0.04)'; lb.style.color = 'rgba(0,230,118,0.4)';
    lb.style.boxShadow = '0 3px 12px rgba(0,0,0,0.4)';
  }
  ftCalcPreview();
}

// Kaldıraç slider
function ftLevChange(val) {
  document.getElementById('ftLevDisplay').textContent = val + '×';
  ftCalcPreview();
}

// Coin ara
let ftSearchTimer = null;
function ftSearchCoins(val) {
  clearTimeout(ftSearchTimer);
  ftSearchTimer = setTimeout(() => ftRenderSearchResults(val), 200);
}
function ftRenderSearchResults(val) {
  const dd = document.getElementById('ftSearchResults');
  if (!val || val.length < 1) { dd.style.display = 'none'; return; }
  const q = val.toUpperCase().replace('USDT', '');
  const matches = ftAllSymbols.filter(s => s.symbol.replace('USDT', '').includes(q)).slice(0, 8);
  if (!matches.length) { dd.style.display = 'none'; return; }
  dd.innerHTML = matches.map(m => {
    const chg = m.chgPct;
    const color = chg >= 0 ? '#00e676' : '#ff4664';
    const sign = chg >= 0 ? '+' : '';
    const maxL = ftGetMaxLev(m.symbol);
    return `<div onclick="ftPickCoin('${m.symbol}',${m.price})" style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;border-bottom:1px solid rgba(255,130,30,0.06);transition:background 0.15s;" onmouseenter="this.style.background='rgba(255,120,30,0.08)'" onmouseleave="this.style.background='transparent'">
      <div>
        <span style="font-size:12px;font-weight:800;color:#e2e8f0;">${m.symbol.replace('USDT','')}</span>
        <span style="font-size:9px;color:#f5a623;font-weight:700;margin-left:6px;">max ${maxL}×</span>
      </div>
      <div style="text-align:right;"><div style="font-size:11px;font-weight:700;color:#e2e8f0;">$${parseFloat(m.price).toLocaleString()}</div><div style="font-size:10px;font-weight:700;color:${color};">${sign}${chg.toFixed(2)}%</div></div>
    </div>`;
  }).join('');
  dd.style.display = '';
}

async function ftPickCoin(symbol, price) {
  ftSelectedSymbol = symbol;
  ftSelectedPrice = price;
  document.getElementById('ftSearchResults').style.display = 'none';
  document.getElementById('ftSearchInput').value = '';

  // Gerçek mark fiyatı çek
  try {
    const r = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`).then(r=>r.json());
    ftSelectedPrice = parseFloat(r.markPrice);
  } catch(e) {
    try {
      const r = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`).then(r=>r.json());
      ftSelectedPrice = parseFloat(r.price);
    } catch(e2) {}
  }

  // Bracket'ı arka planda çek
  ftFetchBrackets(symbol);

  // Slider max'ı sembole göre ayarla
  const maxLev = ftGetMaxLev(symbol);
  const slider = document.getElementById('ftLevSlider');
  slider.max = maxLev;
  if (parseInt(slider.value) > maxLev) {
    slider.value = maxLev;
    document.getElementById('ftLevDisplay').textContent = maxLev + '×';
  }
  ftUpdateLevLabels(maxLev);

  const dec = ftSelectedPrice < 0.01 ? 6 : ftSelectedPrice < 1 ? 4 : ftSelectedPrice < 100 ? 3 : 2;
  const sel = document.getElementById('ftSelectedCoin');
  sel.style.display = 'flex';
  document.getElementById('ftSelName').textContent = symbol.replace('USDT','') + ' / USDT PERP';
  document.getElementById('ftSelPrice').textContent = 'Mark: $' + ftSelectedPrice.toFixed(dec) + '  |  Max: ' + maxLev + '×';
  document.getElementById('ftEntryInput').value = ftSelectedPrice.toFixed(dec);
  ftCalcPreview();
  ftValidate();
}

function ftClearCoin() {
  ftSelectedSymbol = null; ftSelectedPrice = 0;
  document.getElementById('ftSelectedCoin').style.display = 'none';
  document.getElementById('ftEntryInput').value = '';
  document.getElementById('ftPreview').style.display = 'none';
  // Slider'ı sıfırla
  const slider = document.getElementById('ftLevSlider');
  slider.max = 125; slider.value = 10;
  document.getElementById('ftLevDisplay').textContent = '10×';
  ftUpdateLevLabels(125);
  ftValidate();
}

// Önizleme hesapla
function ftCalcPreview() {
  const amount = parseFloat(document.getElementById('ftAmountInput').value);
  const entry = parseFloat(document.getElementById('ftEntryInput').value);
  const lev = parseInt(document.getElementById('ftLevSlider').value);
  if (!amount || !entry || isNaN(amount) || isNaN(entry)) { document.getElementById('ftPreview').style.display = 'none'; ftValidate(); return; }
  const notional = amount * lev;
  const liqPrice = ftCalcLiqPrice(entry, lev, ftDirection, notional);
  const dec = entry < 0.01 ? 6 : entry < 1 ? 4 : entry < 100 ? 3 : 2;

  // Açılış fee
  const openFee = notional * FT_TAKER_FEE;

  // Likidasyon mesafesi %
  const liqDist = Math.abs(entry - liqPrice) / entry * 100;

  document.getElementById('ftPrevSize').textContent = '$' + notional.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
  document.getElementById('ftPrevLiq').textContent = '$' + (liqPrice > 0 ? liqPrice.toFixed(dec) : '—');
  document.getElementById('ftPrevMargin').textContent = '$' + ftFmtMoney(amount);

  // Ek bilgiler
  const feeEl = document.getElementById('ftPrevFee');
  const distEl = document.getElementById('ftPrevDist');
  if (feeEl) feeEl.textContent = '$' + openFee.toFixed(2);
  if (distEl) distEl.textContent = liqDist.toFixed(2) + '%';

  document.getElementById('ftPreview').style.display = '';
  ftValidate();
}

function ftValidate() {
  const btn = document.getElementById('ftSaveBtn');
  const amount = parseFloat(document.getElementById('ftAmountInput').value);
  const entry = parseFloat(document.getElementById('ftEntryInput').value);
  const ok = ftSelectedSymbol && amount > 0 && entry > 0;
  btn.disabled = !ok;
  btn.style.cursor = ok ? 'pointer' : 'not-allowed';
  btn.style.color = ok ? '#e8f2ff' : 'rgba(180,200,230,0.25)';
  btn.style.borderColor = ok ? 'rgba(0,180,255,0.35)' : 'rgba(255,255,255,0.08)';
  btn.style.background = ok ? 'linear-gradient(145deg,rgba(0,160,255,0.18),rgba(0,100,200,0.10))' : 'rgba(255,255,255,0.04)';
  btn.style.boxShadow = ok ? '0 0 20px rgba(0,160,255,0.12) inset,0 4px 16px rgba(0,0,0,0.4)' : 'none';
}

function ftSavePosition() {
  const amount = parseFloat(document.getElementById('ftAmountInput').value);
  const entry = parseFloat(document.getElementById('ftEntryInput').value);
  const lev = parseInt(document.getElementById('ftLevSlider').value);
  if (!ftSelectedSymbol || !amount || !entry) return;
  const notional = amount * lev;
  const liqPrice = ftCalcLiqPrice(entry, lev, ftDirection, notional);
  const pos = {
    id: Date.now(),
    symbol: ftSelectedSymbol,
    direction: ftDirection,
    leverage: lev,
    amount,
    entry,
    liqPrice,
    openedAt: new Date().toISOString()
  };
  ftPositions.push(pos);
  ftSave();
  ftCloseModal();
  ftRender();
  ftStartPnlRefresh();
}

// Pozisyon kapat
function ftClosePosition(id) {
  ftPositions = ftPositions.filter(p => p.id !== id);
  ftSave();
  ftRender();
  if (!ftPositions.length) clearInterval(ftPnlTimer);
}

// Pozisyonları render et
function ftRender() {
  const list = document.getElementById('ftPositionList');
  const empty = document.getElementById('ftEmpty');
  if (!ftPositions.length) {
    list.innerHTML = '';
    empty.style.display = '';
    document.getElementById('ftTotalPnl').textContent = '$0.00';
    document.getElementById('ftTotalPnl').style.color = '#e2e8f0';
    document.getElementById('ftOpenCount').textContent = '0';
    return;
  }
  empty.style.display = 'none';
  document.getElementById('ftOpenCount').textContent = ftPositions.length;
  list.innerHTML = ftPositions.map(p => {
    const dec = p.entry < 0.01 ? 6 : p.entry < 1 ? 4 : p.entry < 100 ? 3 : 2;
    const isLong = p.direction === 'long';
    const dirColor = isLong ? '#00e676' : '#ff4664';
    const dirBg = isLong ? 'linear-gradient(135deg,rgba(0,230,118,0.20),rgba(0,180,90,0.12))' : 'linear-gradient(135deg,rgba(255,70,100,0.20),rgba(200,30,60,0.12))';
    const dirBorder = isLong ? 'rgba(0,230,118,0.50)' : 'rgba(255,70,100,0.50)';
    const dirGlow = isLong ? '0 0 14px rgba(0,230,118,0.22)' : '0 0 14px rgba(255,70,100,0.22)';
    const dirIcon = isLong ? '▲' : '▼';
    const dirLabel = isLong ? 'LONG' : 'SHORT';
    const accentLine = isLong ? 'rgba(0,230,118,0.50)' : 'rgba(255,70,100,0.50)';
    const cardAccent = isLong ? 'rgba(0,230,118,0.08)' : 'rgba(255,70,100,0.08)';
    return `<div id="ftCard-${p.id}" style="
        background: linear-gradient(175deg, rgba(10,16,34,0.98) 0%, rgba(6,10,22,1) 100%);
        border: 1px solid ${isLong ? 'rgba(0,230,118,0.22)' : 'rgba(255,70,100,0.22)'};
        border-top: 1.5px solid ${isLong ? 'rgba(0,230,118,0.55)' : 'rgba(255,70,100,0.55)'};
        border-radius: 18px;
        margin-bottom: 10px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0,0,0,0.60), 0 1px 0 rgba(255,255,255,0.04) inset, 0 0 40px ${isLong ? 'rgba(0,230,118,0.04)' : 'rgba(255,70,100,0.04)'};
      ">

      <!-- Sol kenar aksanı çizgisi -->
      <div style="position:absolute;top:0;left:0;width:3px;height:100%;background:linear-gradient(180deg,${dirColor},${dirColor}55,transparent);border-radius:18px 0 0 18px;"></div>

      <!-- ── HEADER ── -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px 10px 16px;">

        <!-- Sol: logo + isim + badge -->
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="ftLogo-${p.id}" style="width:40px;height:40px;border-radius:12px;overflow:hidden;background:rgba(0,212,255,0.07);border:1px solid rgba(0,212,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;font-weight:900;color:#00d4ff;">
            <img
              src="https://assets.coincap.io/assets/icons/${p.symbol.replace('USDT','').toLowerCase()}@2x.png"
              alt="${p.symbol.replace('USDT','')}"
              style="width:100%;height:100%;object-fit:cover;border-radius:12px;display:block;"
              onerror="this.src='https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa/128/color/${p.symbol.replace('USDT','').toLowerCase()}.png';this.onerror=function(){this.style.display='none';this.parentElement.textContent='${p.symbol.replace('USDT','').substring(0,4)}';};"
            >
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="font-size:15px;font-weight:900;color:#f0f6ff;letter-spacing:0.3px;">${p.symbol.replace('USDT','')}</span>
              <span style="font-size:8px;color:rgba(120,160,200,0.50);font-weight:700;letter-spacing:2px;border:1px solid rgba(120,160,200,0.15);padding:1px 5px;border-radius:4px;">PERP</span>
            </div>
            <div style="display:flex;align-items:center;gap:5px;">
              <div style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:6px;background:${dirBg};border:1px solid ${dirBorder};">
                <span style="font-size:9px;color:${dirColor};font-weight:900;">${dirIcon}</span>
                <span style="font-size:9px;font-weight:900;color:${dirColor};letter-spacing:2px;">${dirLabel}</span>
              </div>
              <div style="display:inline-flex;align-items:center;gap:2px;padding:2px 7px;border-radius:6px;background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.18);">
                <span style="font-size:9px;font-weight:900;color:#f5a623;letter-spacing:1px;">${p.leverage}× KAL.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sağ: KAPAT butonu -->
        <button onclick="ftClosePosition(${p.id})" style="
            padding: 7px 14px;
            border-radius: 10px;
            border: 1px solid rgba(255,55,85,0.40);
            border-top-color: rgba(255,80,110,0.55);
            background: linear-gradient(155deg, rgba(255,35,60,0.16), rgba(100,5,18,0.10));
            color: #ff6070;
            font-size: 9px;
            font-weight: 900;
            cursor: pointer;
            letter-spacing: 1.5px;
            transition: all 0.15s;
            box-shadow: 0 3px 10px rgba(0,0,0,0.40);
          "
          onmouseover="this.style.background='linear-gradient(155deg,rgba(255,35,60,0.28),rgba(120,5,20,0.20))';this.style.color='#ff8090';this.style.borderColor='rgba(255,70,95,0.65)'"
          onmouseout="this.style.background='linear-gradient(155deg,rgba(255,35,60,0.16),rgba(100,5,18,0.10))';this.style.color='#ff6070';this.style.borderColor='rgba(255,55,85,0.40)'"
        >KAPAT</button>
      </div>

      <!-- ── AYIRICI ── -->
      <div style="height:1px;background:linear-gradient(90deg,transparent 2%,rgba(255,255,255,0.07) 30%,rgba(255,255,255,0.07) 70%,transparent 98%);margin:0 14px;"></div>

      <!-- ── FİYAT SATIRI ── -->
      <div style="display:grid;grid-template-columns:1fr 1px 1fr;align-items:stretch;padding:10px 14px 0;">
        <!-- Giriş Fiyatı -->
        <div style="padding:8px 10px 8px 4px;">
          <div style="font-size:8px;font-weight:700;color:rgba(120,160,200,0.55);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;">Giriş Fiyatı</div>
          <div style="font-size:16px;font-weight:900;color:#c8d8f0;font-variant-numeric:tabular-nums;letter-spacing:-0.3px;">$${p.entry.toFixed(dec)}</div>
        </div>
        <!-- Dikey çizgi -->
        <div style="background:rgba(255,255,255,0.07);margin:6px 0;"></div>
        <!-- Mark Fiyatı -->
        <div style="padding:8px 4px 8px 14px;">
          <div style="font-size:8px;font-weight:700;color:rgba(120,160,200,0.55);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;">Mark Fiyatı</div>
          <div style="font-size:16px;font-weight:900;color:#e8f4ff;font-variant-numeric:tabular-nums;letter-spacing:-0.3px;" id="ftMark-${p.id}">—</div>
        </div>
      </div>

      <!-- ── LİKİDASYON BANDI ── -->
      <div style="
          margin: 8px 14px;
          padding: 9px 12px;
          border-radius: 11px;
          background: rgba(180,5,28,0.10);
          border: 1px solid rgba(255,40,65,0.20);
          border-left: 3px solid rgba(255,40,65,0.55);
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:13px;line-height:1;">⚠️</span>
          <div>
            <div style="font-size:8px;font-weight:900;color:rgba(255,100,120,0.80);letter-spacing:2px;text-transform:uppercase;">Likidasyon</div>
            <div style="font-size:8px;color:rgba(120,140,165,0.50);font-weight:600;margin-top:1px;">Tasfiye fiyatı</div>
          </div>
        </div>
        <div style="font-size:16px;font-weight:900;color:#ff3050;font-variant-numeric:tabular-nums;letter-spacing:-0.3px;text-shadow:0 0 16px rgba(255,30,50,0.45);">$${p.liqPrice.toFixed(dec)}</div>
      </div>

      <!-- ── ALT METRİKLER ── -->
      <div style="display:grid;grid-template-columns:1fr 1px 1fr;align-items:stretch;padding:0 14px 13px;">
        <!-- Marjin -->
        <div style="padding:6px 10px 6px 4px;">
          <div style="font-size:8px;font-weight:700;color:rgba(120,160,200,0.50);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Marjin</div>
          <div style="font-size:14px;font-weight:900;color:#a0bcd8;font-variant-numeric:tabular-nums;">$${ftFmtMoney(p.amount)}</div>
        </div>
        <!-- Dikey çizgi -->
        <div style="background:rgba(255,255,255,0.07);margin:4px 0;"></div>
        <!-- K/Z -->
        <div style="padding:6px 4px 6px 14px;">
          <div style="font-size:8px;font-weight:700;color:rgba(120,160,200,0.50);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Gerç. K/Z</div>
          <div style="font-size:15px;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:-0.2px;" id="ftPnl-${p.id}">—</div>
          <div style="font-size:9px;font-weight:700;margin-top:1px;" id="ftRoe-${p.id}">—</div>
        </div>
      </div>

    </div>`;
  }).join('');
}

// Anlık fiyat çekip PnL güncelle
async function ftRefreshPnl() {
  if (!ftPositions.length) return;
  const symbols = [...new Set(ftPositions.map(p => p.symbol))];
  const prices = {};
  try {
    await Promise.all(symbols.map(async sym => {
      const r = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${sym}`).then(r=>r.json());
      prices[sym] = parseFloat(r.markPrice);
    }));
  } catch(e) { return; }

  let totalPnl = 0;
  const liquidated = [];

  ftPositions.forEach(p => {
    const cur = prices[p.symbol];
    if (!cur) return;
    const dec = p.entry < 0.01 ? 6 : p.entry < 1 ? 4 : p.entry < 100 ? 3 : 2;

    // LİKİDASYON KONTROLÜ
    const isLong = p.direction === 'long';
    const liquidated_hit = isLong ? cur <= p.liqPrice : cur >= p.liqPrice;
    if (liquidated_hit) {
      liquidated.push(p);
      return;
    }

    const pnl = ftCalcPnl(p, cur);
    const roe = ftCalcRoe(p, cur);
    totalPnl += pnl;

    const pnlEl = document.getElementById('ftPnl-' + p.id);
    const roeEl = document.getElementById('ftRoe-' + p.id);
    const markEl = document.getElementById('ftMark-' + p.id);

    if (pnlEl) {
      pnlEl.textContent = (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
      pnlEl.style.color = pnl >= 0 ? '#00e676' : '#ff4664';
    }
    if (roeEl) {
      roeEl.textContent = (roe >= 0 ? '+' : '') + roe.toFixed(2) + '% ROE';
      roeEl.style.color = roe >= 0 ? 'rgba(0,230,118,0.65)' : 'rgba(255,70,100,0.65)';
    }
    if (markEl) markEl.textContent = '$' + cur.toFixed(dec);

    // Likidasyon uyarısı
    const card = document.getElementById('ftCard-' + p.id);
    if (card) {
      const marginPct = 1 / p.leverage;
      const warningThreshold = marginPct * 0.30;
      const liqDist = Math.abs(cur - p.liqPrice) / cur;
      if (liqDist < warningThreshold) {
        card.style.border = '1.5px solid rgba(255,50,80,0.70)';
        card.style.borderTopColor = 'rgba(255,80,110,0.90)';
        card.style.background = 'linear-gradient(160deg,rgba(30,4,10,0.99),rgba(15,2,6,0.99))';
        card.style.boxShadow = '0 0 24px rgba(255,30,60,0.15) inset,0 4px 24px rgba(0,0,0,0.6)';
      }
    }
  });

  // Likide olan pozisyonları kapat
  if (liquidated.length) {
    liquidated.forEach(p => {
      if (!_ftIlkYukleme) ftShowLiquidationToast(p); // İlk yüklemede toast gösterme
      ftPositions = ftPositions.filter(x => x.id !== p.id);
    });
    ftSave();
    ftRender();
    if (!ftPositions.length) clearInterval(ftPnlTimer);
  }

  const totalEl = document.getElementById('ftTotalPnl');
  totalEl.textContent = (totalPnl >= 0 ? '+$' : '-$') + Math.abs(totalPnl).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
  totalEl.style.color = totalPnl > 0 ? '#00e676' : totalPnl < 0 ? '#ff4664' : '#8aaac8';
  totalEl.style.textShadow = totalPnl > 0 ? '0 0 20px rgba(0,230,118,0.30)' : totalPnl < 0 ? '0 0 20px rgba(255,70,100,0.30)' : 'none';
}

// Likidasyon toast bildirimi
function ftShowLiquidationToast(p) {
  // Varsa eskiyi kaldır
  const old = document.getElementById('ftLiqToast');
  if (old) old.remove();

  const coinName = p.symbol.replace('USDT','');
  const dirLabel = p.direction === 'long' ? 'LONG' : 'SHORT';
  const loss = ftFmtMoney(p.amount);

  const toast = document.createElement('div');
  toast.id = 'ftLiqToast';
  toast.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,30,60,0.20);border:1px solid rgba(255,60,90,0.40);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">💀</div>
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:900;color:#ff3355;letter-spacing:1.5px;margin-bottom:3px;">POZİSYON LİKİDE EDİLDİ</div>
        <div style="font-size:13px;font-weight:900;color:#f0f6ff;margin-bottom:2px;">${coinName} <span style="font-size:10px;color:rgba(255,100,130,0.70);">${dirLabel} · ${p.leverage}×</span></div>
        <div style="font-size:10px;color:rgba(200,180,220,0.55);">Marjin kaybedildi: <span style="color:#ff4664;font-weight:800;">-$${loss}</span></div>
      </div>
      <div onclick="document.getElementById('ftLiqToast').remove()" style="font-size:14px;color:rgba(160,180,220,0.35);cursor:pointer;padding:2px 4px;flex-shrink:0;">✕</div>
    </div>`;
  toast.style.cssText = `
    position:fixed;top:80px;left:50%;transform:translateX(-50%) translateY(-20px);
    z-index:99999;
    width:calc(100% - 32px);max-width:380px;
    padding:14px 14px;
    border-radius:16px;
    background:linear-gradient(145deg,rgba(30,6,12,0.98),rgba(18,3,8,0.99));
    border:1.5px solid rgba(255,50,80,0.50);
    border-top-color:rgba(255,80,110,0.70);
    box-shadow:0 0 30px rgba(255,30,60,0.20) inset,0 8px 40px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.03);
    opacity:0;
    transition:opacity 0.3s ease,transform 0.3s ease;
  `;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
  });

  // Auto dismiss after 6s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => toast.remove(), 400);
  }, 6000);
}

let _ftIlkYukleme = true; // İlk yüklemede likidasyon toast'ı gösterme

function ftStartPnlRefresh() {
  clearInterval(ftPnlTimer);
  _ftIlkYukleme = true;
  ftRefreshPnl().then(function() {
    _ftIlkYukleme = false;
  });
  ftPnlTimer = setInterval(ftRefreshPnl, 15000);
}

document.addEventListener('DOMContentLoaded', () => {
  // Açılışta sadece localStorage'dan yükle (Firebase bağlantısı bekleme)
  try {
    const r = localStorage.getItem('ft_positions_v1');
    if (r) {
      const parsed = JSON.parse(r);
      if (Array.isArray(parsed)) ftPositions = parsed;
    }
  } catch(e) {}
  ftRender();
});

// ===================== / FUTURES MODÜLü =====================

