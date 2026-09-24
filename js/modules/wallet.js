/* Doruk module: wallet.js */
// ===================== KRİPTO CÜZDAN =====================

let wltPositions = [];
let wltSelectedCoin = null;
let wltLivePrices = {};
let wltUsdTry = 0;
let wltRefreshTimer = null;

function _wltDb() {
  try { return _loginDb(); } catch(e) { return null; }
}
function _wltUserKey() {
  var u = localStorage.getItem('doruk_login_user') || '';
  return u.toLowerCase().replace(/[.#$\/\[\]]/g,'_');
}

function wltSave() {
  localStorage.setItem('wlt_positions', JSON.stringify(wltPositions));
  try {
    var db = _wltDb();
    var userKey = _wltUserKey();
    if (db && userKey) {
      db.ref('cuzdan/' + userKey).set({ positions: wltPositions, guncelleme: Date.now() })
        .catch(function(e){ console.warn('wltSave Firebase hatası:', e); });
    }
  } catch(e) { console.warn('wltSave hata:', e); }
}

function wltLoad(callback) {
  try {
    const raw = localStorage.getItem('wlt_positions');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) wltPositions = parsed;
    }
  } catch(e) { console.warn('wltLoad localStorage hatası'); }

  try {
    var db = _wltDb();
    var userKey = _wltUserKey();
    if (db && userKey) {
      db.ref('cuzdan/' + userKey).once('value', function(snap) {
        if (snap.exists()) {
          var data = snap.val();
          if (data && Array.isArray(data.positions)) {
            wltPositions = data.positions;
            localStorage.setItem('wlt_positions', JSON.stringify(wltPositions));
          }
        }
        if (typeof callback === 'function') callback();
      }, function(err) {
        console.warn('wltLoad Firebase hatası:', err);
        if (typeof callback === 'function') callback();
      });
      return;
    }
  } catch(e) { console.warn('wltLoad hata:', e); }
  if (typeof callback === 'function') callback();
}

function wltFetchJSON(url, timeoutMs = 5000) {
  return Promise.race([
    fetch(url).then(r => r.json()),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))
  ]);
}

async function wltFetchRates() {
  // 1. Kaynak: Binance USDTTRY paritesi (en güncel, kripto apiye zaten erişim var)
  try {
    const d = await wltFetchJSON('https://api.binance.com/api/v3/ticker/price?symbol=USDTTRY');
    const parsed = parseFloat(d.price || 0);
    if (parsed > 1) { wltUsdTry = parsed; return; }
  } catch(e) {}
  // 2. Kaynak: ExchangeRate-API (ücretsiz, CORS destekli)
  try {
    const d = await wltFetchJSON('https://open.er-api.com/v6/latest/USD');
    const parsed = parseFloat(d?.rates?.TRY || 0);
    if (parsed > 1) { wltUsdTry = parsed; return; }
  } catch(e) {}
  // 3. Kaynak: genelpara
  try {
    const d = await wltFetchJSON('https://api.genelpara.com/embed/doviz.json');
    const parsed = parseFloat(d['USD']?.satis || d['USD']?.alis || 0);
    if (parsed > 1) { wltUsdTry = parsed; return; }
  } catch(e) {}
  // Hiçbiri çalışmazsa eski değeri koru
  if (!wltUsdTry || wltUsdTry < 1) wltUsdTry = 38.5;
}

async function wltFetchPrices() {
  if (!wltPositions.length) return;
  try {
    const symbols = [...new Set(wltPositions.map(p => p.symbol))];
    const qs = encodeURIComponent(JSON.stringify(symbols));
    const arr = await wltFetchJSON('https://api.binance.com/api/v3/ticker/24hr?symbols=' + qs, 6000);
    arr.forEach(t => { wltLivePrices[t.symbol] = { price: parseFloat(t.lastPrice), chgPct: parseFloat(t.priceChangePercent) }; });
  } catch(e) {}
}

function wltFmtAmt(n) {
  if (n === null || isNaN(n)) return '—';
  if (n >= 1) {
    // 1000 → "1.000", 1250 → "1.250", 1.5 → "1,5", 1.2500 → "1,25"
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  }
  // 1'den küçük: 0.00123456
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}
function wltFmt(n, decimals=2) {
  if (n === null || isNaN(n)) return '—';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function wltFmtUSD(n) {
  if (n === null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n/1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n.toFixed(2);
}
function wltFmtTRY(n) {
  if (n === null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n/1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function ftFmtMoney(n) {
  if (n === null || isNaN(n)) return '—';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function wltInit() {
  // Firebase'den yükle, sonra fiyatları çek ve göster
  wltLoad(async function() {
    await Promise.all([wltFetchRates(), wltFetchPrices()]);
    wltRender();
    clearInterval(wltRefreshTimer);
    wltRefreshTimer = setInterval(async () => {
      await Promise.all([wltFetchRates(), wltFetchPrices()]);
      wltRender();
    }, 30000);
  });
}

function wltRender() {
  const container = document.getElementById('wltPositions');
  const empty = document.getElementById('wltEmpty');
  const summaryCard = document.getElementById('wltSummaryCard');

  if (!wltPositions.length) {
    if (empty) empty.style.display = '';
    if (summaryCard) summaryCard.style.display = 'none';
    container.innerHTML = '<div class="wlt-empty" id="wltEmpty"><span class="wlt-empty-icon">💼</span>Henüz pozisyon yok.<br>Sağ üstten coin ekle.</div>';
    return;
  }

  if (summaryCard) summaryCard.style.display = '';

  let totalCost = 0, totalValue = 0;
  let html = '';

  wltPositions.forEach((pos, idx) => {
    const live = wltLivePrices[pos.symbol];
    const curPrice = live ? live.price : pos.buyPrice;
    const chgPct = live ? live.chgPct : 0;
    const value = curPrice * pos.amount;
    const cost  = pos.buyPrice * pos.amount;
    const pnlUSDT = value - cost;
    const pnlPct  = cost > 0 ? (pnlUSDT / cost) * 100 : 0;
    const pnlTRY  = pnlUSDT * (wltUsdTry || 38.5);
    const valueTRY = value * (wltUsdTry || 38.5);

    totalCost  += cost;
    totalValue += value;

    const isProfit = pnlUSDT >= 0;
    const cardClass = pnlUSDT > 0.001 ? 'pos-profit' : (pnlUSDT < -0.001 ? 'pos-loss' : '');
    const pnlClass = isProfit ? 'pos' : 'neg';
    const pnlSign  = isProfit ? '+' : '';
    const chgClass = chgPct >= 0 ? 'up' : 'dn';
    const sym = pos.symbol.replace('USDT','');

    // Fiyat gösterimi — büyük ve küçük coinler için dinamik decimal
    const priceDecimals = curPrice < 0.01 ? 8 : curPrice < 1 ? 5 : curPrice < 100 ? 4 : 2;

    html += `
    <div class="wlt-pos-card ${cardClass}">
      <span class="wlt-pos-del" onclick="wltDelete(${idx})"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
      <div class="wlt-pos-row1">
        <div class="wlt-pos-left">
          <div class="wlt-pos-icon">
            <img
              src="https://assets.coincap.io/assets/icons/${sym.toLowerCase()}@2x.png"
              alt="${sym}"
              onerror="this.src='https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa/128/color/${sym.toLowerCase()}.png';this.onerror=function(){this.style.display='none';this.parentElement.textContent='${sym.substring(0,4)}';};"
            >
          </div>
          <div>
            <div class="wlt-pos-name">${sym}</div>
            <div class="wlt-pos-pair">${wltFmtAmt(pos.amount)} adet · USDT</div>
          </div>
        </div>
        <div class="wlt-pos-right">
          <div class="wlt-pos-cur-price">$${curPrice.toFixed(priceDecimals)}</div>
          <div class="wlt-pos-chg-pct ${chgClass}">${chgPct >= 0 ? '▲' : '▼'} ${Math.abs(chgPct).toFixed(2)}%</div>
        </div>
      </div>
      <div class="wlt-pos-row2">
        <div class="wlt-pos-metric">
          <div class="wlt-pos-metric-lbl">ALIŞ</div>
          <div class="wlt-pos-metric-val">$${pos.buyPrice.toFixed(priceDecimals)}</div>
          <div class="wlt-pos-metric-sub">₺${wltFmtTRY(pos.buyPrice * (wltUsdTry > 1 ? wltUsdTry : 38.5))}</div>
        </div>
        <div class="wlt-pos-metric">
          <div class="wlt-pos-metric-lbl">DEĞER</div>
          <div class="wlt-pos-metric-val">$${wltFmtUSD(value)}</div>
          <div class="wlt-pos-metric-sub">₺${wltFmtTRY(valueTRY)}</div>
        </div>
        <div class="wlt-pos-metric">
          <div class="wlt-pos-metric-lbl">MALİYET</div>
          <div class="wlt-pos-metric-val">$${wltFmtUSD(cost)}</div>
          <div class="wlt-pos-metric-sub">₺${wltFmtTRY(cost * (wltUsdTry > 1 ? wltUsdTry : 38.5))}</div>
        </div>
        <div class="wlt-pos-metric">
          <div class="wlt-pos-metric-lbl">K/Z</div>
          <div class="wlt-pos-metric-val ${pnlClass}">${pnlSign}$${wltFmtUSD(pnlUSDT)}</div>
          <div class="wlt-pos-metric-sub ${pnlClass}">${pnlSign}₺${wltFmtTRY(pnlTRY)} · ${pnlSign}${pnlPct.toFixed(2)}%</div>
        </div>
      </div>
    </div>`;
  });

  container.innerHTML = html;

  // Özet güncelle
  const totalPnl  = totalValue - totalCost;
  const totalPnlTRY = totalPnl * (wltUsdTry || 38.5);
  const totalValueTRY = totalValue * (wltUsdTry || 38.5);
  const totalCostTRY  = totalCost  * (wltUsdTry || 38.5);
  const isPnlPos = totalPnl >= 0;

  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  const setCls = (id, cls) => { const el = document.getElementById(id); if(el) { el.className = el.className.replace(/pos|neg|neu/g,'').trim() + ' ' + cls; } };

  set('wltTotalUSDT', '$' + wltFmtUSD(totalValue));
  set('wltTotalTRY',  '₺' + wltFmtTRY(totalValueTRY));
  set('wltCostUSDT',  '$' + wltFmtUSD(totalCost));
  set('wltCostTRY',   '₺' + wltFmtTRY(totalCostTRY));

  const pnlSign = isPnlPos ? '+' : '';
  set('wltPnlUSDT',  pnlSign + '$' + wltFmtUSD(totalPnl));
  set('wltPnlTRY',   pnlSign + '₺' + wltFmtTRY(totalPnlTRY));
  set('wltPnlBadge', pnlSign + '$' + wltFmtUSD(totalPnl));

  setCls('wltPnlUSDT',  isPnlPos ? 'wlt-sum-cell-val pos' : 'wlt-sum-cell-val neg');
  setCls('wltPnlTRY',   isPnlPos ? 'wlt-sum-cell-val pos' : 'wlt-sum-cell-val neg');

  const badge = document.getElementById('wltPnlBadge');
  if (badge) badge.className = `wlt-pnl-badge ${isPnlPos ? 'pos' : 'neg'}`;
}

function wltDelete(idx) {
  const pos = wltPositions[idx];
  if (!pos) return;
  wltPositions.splice(idx, 1);
  wltSave();
  wltRender();
}

// MODAL
function wltOpenModal() {
  document.getElementById('wltModal').classList.add('open');
  document.getElementById('wltStep1').style.display = '';
  document.getElementById('wltStep2').style.display = 'none';
  document.getElementById('wltSearchInput').value = '';
  document.getElementById('wltCoinResults').innerHTML = '<div style="color:#7aa0c4;font-size:12px;text-align:center;padding:18px 0;">Aramak istedigin coini yaz...</div>';
  wltSelectedCoin = null;
  wltLoadAllSymbols();
  history.pushState({modal: 'wlt'}, '', '');
}
function wltCloseModal() {
  document.getElementById('wltModal').classList.remove('open');
  wltSelectedCoin = null;
  document.getElementById('wltStep1').style.display = '';
  document.getElementById('wltStep2').style.display = 'none';
  document.getElementById('wltSearchInput').value = '';
  document.getElementById('wltCoinResults').innerHTML = '';
}
function wltModalBgClick(e) {
  if (e.target === document.getElementById('wltModal')) wltCloseModal();
}

let wltAllSymbols = [];
let wltSearchTimer = null;

async function wltLoadAllSymbols() {
  if (wltAllSymbols.length > 0) return;
  try {
    const data = await wltFetchJSON('https://api.binance.com/api/v3/exchangeInfo', 8000);
    wltAllSymbols = data.symbols
      .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING')
      .map(s => s.symbol)
      .sort();
  } catch(e) { wltAllSymbols = []; }
}

function wltRenderCoinList(q) {
  const list = document.getElementById('wltCoinResults');
  if (!q) {
    list.innerHTML = '<div style="color:#7aa0c4;font-size:12px;text-align:center;padding:18px 0;">Aramak istedigin coini yaz...</div>';
    return;
  }
  const uq = q.toUpperCase();
  const filtered = wltAllSymbols
    .filter(s => s.replace('USDT','').startsWith(uq) || s.replace('USDT','').includes(uq))
    .sort((a,b) => a.replace('USDT','').startsWith(uq) ? -1 : 1)
    .slice(0, 15);
  if (!filtered.length) {
    list.innerHTML = '<div style="color:#7aa0c4;font-size:12px;text-align:center;padding:18px 0;">Sonuc bulunamadi</div>';
    return;
  }
  list.innerHTML = filtered.map(sym => {
    const live = wltLivePrices[sym];
    const priceStr = live ? `$${live.price.toFixed(live.price < 0.1 ? 5 : live.price < 100 ? 4 : 2)}` : '';
    const chgStr = live ? ` ${live.chgPct >= 0 ? '\u25b2' : '\u25bc'}${Math.abs(live.chgPct).toFixed(1)}%` : '';
    return `<div class="wlt-coin-opt" onclick="wltSelectCoin('${sym}')">
      <span>${sym.replace('USDT','')} / USDT</span>
      <span class="wlt-coin-opt-right">${priceStr}${chgStr}</span>
    </div>`;
  }).join('');
}

function wltSearchCoins(q) {
  clearTimeout(wltSearchTimer);
  wltSearchTimer = setTimeout(() => wltRenderCoinList(q.trim()), 200);
}

async function wltSelectCoin(sym) {
  wltSelectedCoin = sym;

  // Adim 2'ye gec, yukleniyor goster
  document.getElementById('wltStep1').style.display = 'none';
  document.getElementById('wltStep2').style.display = '';
  document.getElementById('wltSelName').textContent = sym.replace('USDT','') + ' / USDT';
  document.getElementById('wltSelPrice').textContent = 'Canli fiyat aliniyor...';
  document.getElementById('wltBuyInput').value = '';
  document.getElementById('wltAmountInput').value = '';
  document.getElementById('wltPreview').style.display = 'none';
  document.getElementById('wltSaveBtn').disabled = true;

  // Her zaman Binance'den canli fiyat cek (cache kullanma)
  let price = 0, chgPct = 0;
  try {
    const r = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=' + sym);
    const d = await r.json();
    price  = parseFloat(d.lastPrice);
    chgPct = parseFloat(d.priceChangePercent);
    wltLivePrices[sym] = { price, chgPct };
  } catch(e) {
    price  = wltLivePrices[sym]?.price  || 0;
    chgPct = wltLivePrices[sym]?.chgPct || 0;
  }

  const priceDecimals = price < 0.01 ? 8 : price < 1 ? 5 : price < 100 ? 4 : 2;
  const chgSign  = chgPct >= 0 ? '\u25b2' : '\u25bc';
  const chgColor = chgPct >= 0 ? '#00e676' : '#ff4664';

  document.getElementById('wltSelPrice').innerHTML =
    'Anlik: <b style="color:#00d4ff">$' + price.toFixed(priceDecimals) + '</b> ' +
    '<span style="color:' + chgColor + ';font-size:10px">' + chgSign + Math.abs(chgPct).toFixed(2) + '%</span>';
  document.getElementById('wltBuyInput').value = price.toFixed(priceDecimals);
  wltCalcPreview();
}

function wltBackToSearch() {
  wltSelectedCoin = null;
  document.getElementById('wltStep1').style.display = '';
  document.getElementById('wltStep2').style.display = 'none';
  const q = document.getElementById('wltSearchInput').value.trim();
  wltRenderCoinList(q);
}

function wltCalcPreview() {
  const amount = parseFloat(document.getElementById('wltAmountInput').value);
  const buyPrice = parseFloat(document.getElementById('wltBuyInput').value);
  if (!amount || !buyPrice || !wltSelectedCoin) {
    document.getElementById('wltPreview').style.display = 'none';
    document.getElementById('wltSaveBtn').disabled = true;
    return;
  }
  const live = wltLivePrices[wltSelectedCoin];
  const curPrice = live ? live.price : buyPrice;
  const cost  = amount * buyPrice;
  const value = amount * curPrice;
  const pnlUSDT = value - cost;
  const pnlTRY  = pnlUSDT * (wltUsdTry || 38.5);
  const pnlPct  = (pnlUSDT / cost) * 100;
  const isPos = pnlUSDT >= 0;
  const sign = isPos ? '+' : '';

  const _try = wltUsdTry > 1 ? wltUsdTry : 38.5;
  document.getElementById('wltPrevCost').textContent  = `$${wltFmtUSD(cost)} · ₺${wltFmtTRY(cost * _try)}`;
  document.getElementById('wltPrevValue').textContent = `$${wltFmtUSD(value)} · ₺${wltFmtTRY(value * _try)}`;
  const pnlEl = document.getElementById('wltPrevPnl');
  pnlEl.textContent = `${sign}$${wltFmtUSD(pnlUSDT)} · ${sign}₺${wltFmtTRY(pnlTRY)} (${sign}${pnlPct.toFixed(2)}%)`;
  pnlEl.style.color = isPos ? '#00e676' : '#ff4664';

  document.getElementById('wltPreview').style.display = '';
  document.getElementById('wltSaveBtn').disabled = false;
}

function wltSavePosition() {
  const amount = parseFloat(document.getElementById('wltAmountInput').value);
  const buyPrice = parseFloat(document.getElementById('wltBuyInput').value);
  if (!amount || !buyPrice || !wltSelectedCoin) return;
  wltPositions.push({ symbol: wltSelectedCoin, amount, buyPrice, addedAt: Date.now() });
  wltSave();
  wltCloseModal();
  wltFetchPrices().then(() => wltRender());
}

// Sayfa açıldığında başlat
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(wltInit, 1200);
});
// ===================== / KRİPTO CÜZDAN =====================

