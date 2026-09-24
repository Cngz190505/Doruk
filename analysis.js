/* Doruk module: analysis.js */
// ===================== KRİPTO ANALİZ =====================
let analizCurrentCoin = null;
let analizCurrentTf = '1h';
let analizAllSymbols = [];
let analizSearchTimer = null;

function analizSetTf(tf, el) {
  analizCurrentTf = tf;
  document.querySelectorAll('.anlz-tf').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  if (analizCurrentCoin) analizRunCurrent();
}

function analizClear() {
  document.getElementById('analizSearchInput').value = '';
  document.getElementById('analizCoinList').style.display = 'none';
  document.getElementById('analizSearchClear').style.display = 'none';
  document.getElementById('analizEmpty').style.display = '';
  document.getElementById('analizResult').style.display = 'none';
  document.getElementById('analizLoading').style.display = 'none';
  analizCurrentCoin = null;
}

async function analizLoadSymbols() {
  if (analizAllSymbols.length > 0) return;
  try {
    const d = await fetch('https://api.binance.com/api/v3/ticker/24hr').then(r => r.json());
    analizAllSymbols = d
      .filter(s => s.symbol.endsWith('USDT') && parseFloat(s.quoteVolume) > 500000)
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .map(s => ({ symbol: s.symbol, vol: parseFloat(s.quoteVolume), chgPct: parseFloat(s.priceChangePercent) }));
  } catch(e) { analizAllSymbols = []; console.warn('analizLoadSymbols hata:', e); }
}

function analizSearch(q) {
  const cl = document.getElementById('analizSearchClear');
  if (cl) cl.style.display = q.length > 0 ? 'flex' : 'none';
  clearTimeout(analizSearchTimer);
  if (!q.trim()) {
    document.getElementById('analizCoinList').style.display = 'none';
    // Kutu tamamen boşaltılınca sonuçları da sıfırla
    document.getElementById('analizResult').style.display = 'none';
    document.getElementById('analizEmpty').style.display = '';
    document.getElementById('analizLoading').style.display = 'none';
    analizCurrentCoin = null;
    return;
  }
  const trimmed = q.trim();
  if (!trimmed) { document.getElementById('analizCoinList').style.display = 'none'; return; }
  analizSearchTimer = setTimeout(() => analizRenderCoinList(trimmed), 200);
}

async function analizRenderCoinList(q) {
  const list = document.getElementById('analizCoinList');
  const uq = q.trim().toUpperCase();
  if (!uq) { list.style.display = 'none'; return; }

  // Sembol listesi henüz yüklenmediyse yükle ve bekle
  if (analizAllSymbols.length === 0) {
    list.innerHTML = '<div style="padding:14px;text-align:center;font-size:11px;color:#4a6a8a;">Yükleniyor...</div>';
    list.style.display = '';
    await analizLoadSymbols();
  }

  let filtered = analizAllSymbols
    .filter(s => s.symbol.replace('USDT','').startsWith(uq) || s.symbol.replace('USDT','').includes(uq))
    .sort((a,b) => a.symbol.replace('USDT','').startsWith(uq) ? -1 : 1)
    .slice(0, 8);

  // Yine de bulunamadıysa Binance'e direkt sorgula
  if (!filtered.length) {
    try {
      const direct = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${uq}USDT`).then(r => r.json());
      if (direct && direct.symbol) {
        filtered = [{ symbol: direct.symbol, vol: parseFloat(direct.quoteVolume), chgPct: parseFloat(direct.priceChangePercent) }];
        // Listeye de ekle ki bir sonraki aramada çıksın
        if (!analizAllSymbols.find(s => s.symbol === direct.symbol)) {
          analizAllSymbols.push(filtered[0]);
        }
      }
    } catch(e) {}
  }

  if (!filtered.length) {
    list.innerHTML = '<div style="padding:14px;text-align:center;font-size:11px;color:#4a6a8a;">Sonuç bulunamadı</div>';
    list.style.display = '';
    return;
  }

  list.innerHTML = filtered.map(s => {
    const name = s.symbol.replace('USDT', '');
    const chgColor = s.chgPct >= 0 ? '#00e676' : '#ff4664';
    const chgSign = s.chgPct >= 0 ? '+' : '';
    const vol = s.vol >= 1e9 ? (s.vol/1e9).toFixed(1)+'B' : (s.vol/1e6).toFixed(0)+'M';
    return `<div class="anlz-coin-opt" onclick="analizSelectCoin('${s.symbol}')">
      <span>${name}<span style="color:#4a6a8a;font-size:10px;margin-left:4px;">/ USDT</span></span>
      <span>
        <span style="color:${chgColor};font-size:10px;font-weight:900;margin-right:8px;">${chgSign}${s.chgPct.toFixed(2)}%</span>
        <span style="color:#4a6a8a;font-size:10px;">Vol $${vol}</span>
      </span>
    </div>`;
  }).join('');
  list.style.display = '';
}


function analizSelectCoin(symbol) {
  analizCurrentCoin = symbol;
  document.getElementById('analizSearchInput').value = symbol.replace('USDT', '');
  document.getElementById('analizCoinList').style.display = 'none';
  analizRunCurrent();
}

function analizRunCurrent() {
  if (!analizCurrentCoin) return;
  analizRunAnalysis(analizCurrentCoin);
}

// ── Utility: fetch Binance klines ──
async function anlzFetchKlines(symbol, interval, limit) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const d = await fetch(url).then(r => r.json());
  return d.map(k => ({
    openTime: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5])
  }));
}

// ── Hesaplama fonksiyonları ──
function anlzCalcEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data[0];
  return data.map((v, i) => {
    if (i === 0) return ema;
    ema = v * k + ema * (1 - k);
    return ema;
  });
}

function anlzCalcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i-1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i-1];
    avgGain = (avgGain * (period-1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period-1) + (d < 0 ? -d : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function anlzCalcMACD(closes) {
  const ema12 = anlzCalcEMA(closes, 12);
  const ema26 = anlzCalcEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  // Signal hattı tüm MACD line üzerinden hesaplanmalı, son 50 değil
  const signal = anlzCalcEMA(macdLine, 9);
  const last = macdLine[macdLine.length - 1];
  const sig = signal[signal.length - 1];
  return { macd: last, signal: sig, hist: last - sig };
}

function anlzCalcATR(klines, period = 14) {
  const trs = klines.slice(1).map((k, i) => {
    const prev = klines[i].close;
    return Math.max(k.high - k.low, Math.abs(k.high - prev), Math.abs(k.low - prev));
  });
  const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  return atr;
}

function anlzCalcBollinger(closes, period = 20) {
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period);
  return { upper: mean + 2 * std, mid: mean, lower: mean - 2 * std, std };
}

// ── Destek/Direnç hesaplama ──
function anlzFindSupportResistance(klines) {
  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);
  const current = klines[klines.length - 1].close;
  // Birleştirme eşiği: fiyatın %1.5'i — ATR'a değil fiyata göre ölçeklenir
  const threshold = current * 0.015;
  const zones = [];

  // Pivot high/low — 3 mum her iki tarafta (daha güvenilir pivot)
  for (let i = 3; i < klines.length - 3; i++) {
    const h = highs[i];
    const l = lows[i];
    if (h > highs[i-1] && h > highs[i-2] && h > highs[i-3] &&
        h > highs[i+1] && h > highs[i+2] && h > highs[i+3]) {
      zones.push({ price: h, type: 'res', tests: 1 });
    }
    if (l < lows[i-1] && l < lows[i-2] && l < lows[i-3] &&
        l < lows[i+1] && l < lows[i+2] && l < lows[i+3]) {
      zones.push({ price: l, type: 'sup', tests: 1 });
    }
  }

  // Zone birleştirme — ağırlıklı ortalama fiyat
  const merged = [];
  zones.forEach(z => {
    const existing = merged.find(m => Math.abs(m.price - z.price) < threshold && m.type === z.type);
    if (existing) {
      existing.tests++;
      existing.price = (existing.price * (existing.tests - 1) + z.price) / existing.tests;
    } else {
      merged.push({ ...z });
    }
  });

  merged.forEach(z => {
    z.strength = z.tests >= 3 ? 'strong' : z.tests >= 2 ? 'medium' : 'weak';
  });

  const resistances = merged
    .filter(z => z.type === 'res' && z.price > current)
    .sort((a, b) => a.price - b.price)
    .slice(0, 3);
  const supports = merged
    .filter(z => z.type === 'sup' && z.price < current)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3);

  return { resistances, supports };
}

// ── Market Structure ──
function anlzMarketStructure(klines) {
  const closes = klines.map(k => k.close);
  const n = closes.length;
  const ema50 = anlzCalcEMA(closes, 50);
  const ema200 = anlzCalcEMA(closes, Math.min(200, n));
  const lastEma50 = ema50[n-1];
  const lastEma200 = ema200[n-1];

  // Gerçek swing high/low tespiti (son 40 mum, 3 pivot her tarafta)
  const slice = klines.slice(-40);
  const swingHighs = [], swingLows = [];
  for (let i = 3; i < slice.length - 3; i++) {
    const h = slice[i].high, l = slice[i].low;
    if (h > slice[i-1].high && h > slice[i-2].high && h > slice[i-3].high &&
        h > slice[i+1].high && h > slice[i+2].high && h > slice[i+3].high)
      swingHighs.push(h);
    if (l < slice[i-1].low && l < slice[i-2].low && l < slice[i-3].low &&
        l < slice[i+1].low && l < slice[i+2].low && l < slice[i+3].low)
      swingLows.push(l);
  }

  // HH: son iki tepe artıyor mu, HL: son iki dip artıyor mu
  const hh = swingHighs.length >= 2 && swingHighs[swingHighs.length-1] > swingHighs[swingHighs.length-2];
  const hl = swingLows.length >= 2  && swingLows[swingLows.length-1]   > swingLows[swingLows.length-2];
  const lh = swingHighs.length >= 2 && swingHighs[swingHighs.length-1] < swingHighs[swingHighs.length-2];
  const ll = swingLows.length >= 2  && swingLows[swingLows.length-1]   < swingLows[swingLows.length-2];

  // Boğa: HH+HL, Ayı: LH+LL, karışık: EMA'ya bak
  const bullish = (hh && hl) ? true : (lh && ll) ? false : lastEma50 > lastEma200;

  return {
    ema50: lastEma50, ema200: lastEma200,
    emaGolden: lastEma50 > lastEma200,
    structure: bullish ? 'Yükselen trend (dip ve tepeler artıyor)' : 'Düşen trend (dip ve tepeler azalıyor)',
    structureBull: bullish
  };
}

// ── Confluence Puanlama ──
function anlzConfluenceScore(ms, rsi, macd, atr, closes, vol, volMa, klines, sr) {
  let score = 0;

  // TREND — maks 3 puan
  if (ms.emaGolden)     score += 2;
  if (ms.structureBull) score += 1;

  // MOMENTUM — maks 2 puan
  if ((rsi >= 50 && rsi <= 70) || rsi < 30) score += 1;
  if (macd.hist > 0 && macd.macd > macd.signal) score += 1;

  // FİYAT HAREKETİ — maks 3 puan
  const current = closes[closes.length - 1];
  if (sr.supports.length > 0 && Math.abs(current - sr.supports[0].price) / current < 0.02) score += 1;
  const prevHigh = Math.max(...klines.slice(-20, -3).map(k => k.high));
  if (klines[klines.length - 1].close > prevHigh) score += 1;
  const lastK = klines[klines.length - 1];
  const body  = Math.abs(lastK.close - lastK.open);
  const range = lastK.high - lastK.low || 0.000001;
  if (body / range > 0.6 && lastK.close > lastK.open) score += 1;

  // HACİM — maks 1 puan
  if (vol > volMa) score += 1;

  // STOP HUNT — maks 1 puan
  const wickLow = Math.min(lastK.open, lastK.close) - lastK.low;
  if (wickLow > body * 1.5) score += 1;

  // Maks puan: 9
  const confidence = Math.min(100, (score / 9) * 100);
  let signal, signalEmoji, signalClass;
  if (score >= 7) {
    signal = 'AL';        signalEmoji = '🟢'; signalClass = 'buy';
  } else if (score >= 4) {
    signal = 'BEKLE';     signalEmoji = '🟡'; signalClass = 'wait';
  } else {
    signal = 'İŞLEM YOK'; signalEmoji = '⛔'; signalClass = 'none';
  }

  return { score, confidence, signal, signalEmoji, signalClass };
}

// ── Volatilite filtresi ──
function anlzVolatilityFilter(atr, price) {
  const atrPct = (atr / price) * 100;
  return { atrPct, ok: atrPct > 0.5 };
}

// ── Ana analiz fonksiyonu ──
async function analizRunAnalysis(symbol) {
  // UI: yükleniyor
  document.getElementById('analizEmpty').style.display = 'none';
  document.getElementById('analizResult').style.display = 'none';
  document.getElementById('analizLoading').style.display = '';

  const tfMap = { '1h': '1h', '4h': '4h', '1d': '1d' };
  const tfLabel = { '1h': '1 Saatlik', '4h': '4 Saatlik', '1d': 'Günlük' };
  const tf = tfMap[analizCurrentTf] || '1h';

  try {
    document.getElementById('analizLoadingText').textContent = 'OHLCV verisi çekiliyor...';

    // Paralel veri çekimi: 1h(500), 4h(300), 1d(365) + güncel ticker
    const [klines1h, klines4h, klines1d, ticker] = await Promise.all([
      anlzFetchKlines(symbol, '1h', 500),
      anlzFetchKlines(symbol, '4h', 300),
      anlzFetchKlines(symbol, '1d', 365),
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`).then(r => r.json())
    ]);

    // Veri yeterliliği kontrolü
    if (!klines1h?.length || klines1h.length < 60) throw new Error('1 saatlik veri yetersiz');
    if (ticker?.code) throw new Error(`Coin bulunamadı: ${symbol}`);

    document.getElementById('analizLoadingText').textContent = 'Göstergeler hesaplanıyor...';

    // Ana TF klines
    const klines = tf === '1h' ? klines1h : tf === '4h' ? klines4h : klines1d;
    const closes = klines.map(k => k.close);
    const n = closes.length;
    const current = closes[n - 1];

    // Göstergeler — periyot veri sayısını aşmasın
    const ema50 = anlzCalcEMA(closes, Math.min(50, n));
    const ema200 = anlzCalcEMA(closes, Math.min(200, n));
    const rsi = anlzCalcRSI(closes);
    const macd = anlzCalcMACD(closes);
    const atr = anlzCalcATR(klines);
    const bb = anlzCalcBollinger(closes);
    const vol = klines[n - 1].volume;
    const volMa = klines.slice(-20).reduce((a, k) => a + k.volume, 0) / 20;

    // Market Structure
    const ms = anlzMarketStructure(klines);
    // Destek/Direnç (seçili zaman dilimine göre hesaplanır)
    const sr = anlzFindSupportResistance(klines);
    // Confluence
    const conf = anlzConfluenceScore(ms, rsi, macd, atr, closes, vol, volMa, klines, sr);
    // Volatilite
    const volatility = anlzVolatilityFilter(atr, current);

    // MTF trend analizi
    const ms1h = anlzMarketStructure(klines1h);
    const ms4h = anlzMarketStructure(klines4h);
    const ms1d = anlzMarketStructure(klines1d);

    // Risk hesaplama
    // SL: en yakın destek %8 içindeyse desteğin %0.2 altı, değilse ATR*1.5
    const nearestSupport = sr.supports[0]?.price || null;
    const atrSL = current - atr * 1.5;
    const sl = (nearestSupport && (current - nearestSupport) / current < 0.08)
      ? Math.min(nearestSupport * 0.998, atrSL)
      : atrSL;
    const risk = Math.max(current - sl, atr * 0.5); // sıfır risk koruması

    // TP: direnci varsa %5 içindeki seviyeye snap yap, yoksa risk çarpanı
    function anlzSnapTp(base, resistances) {
      for (const r of resistances) {
        const dist = (r.price - base) / base;
        if (dist > 0.002 && dist < 0.05) return r.price * 0.999;
      }
      return base;
    }
    const tp1Raw = current + risk;
    const tp2Raw = current + risk * 2;
    const tp3Raw = current + risk * 3;
    const tp1 = anlzSnapTp(tp1Raw, sr.resistances);
    const tp2 = anlzSnapTp(tp2Raw, sr.resistances);
    const tp3 = anlzSnapTp(tp3Raw, sr.resistances);

    document.getElementById('analizLoadingText').textContent = 'Analiz tamamlanıyor...';

    // ── UI Render ──
    document.getElementById('analizLoading').style.display = 'none';
    document.getElementById('analizResult').style.display = '';

    const coinName = symbol.replace('USDT', '');
    const chgPct = parseFloat(ticker.priceChangePercent);
    const chgColor = chgPct >= 0 ? '#00e676' : '#ff4664';
    const chgSign = chgPct >= 0 ? '+' : '';
    const priceDecimals = current < 0.01 ? 6 : current < 1 ? 4 : current < 100 ? 3 : 2;

    document.getElementById('analizCoinTitle').textContent = coinName + ' / USDT';
    document.getElementById('analizCoinSub').textContent = tfLabel[analizCurrentTf] + ' · ' + symbol;
    document.getElementById('analizPrice').textContent = '$' + current.toFixed(priceDecimals);
    document.getElementById('analizPriceChg').innerHTML = `<span style="color:${chgColor}">${chgSign}${chgPct.toFixed(2)}% (24s)</span>`;

    // Sinyal
    const sb = document.getElementById('analizSignalBox');
    sb.className = 'anlz-signal-box ' + conf.signalClass;
    document.getElementById('analizSignalIcon').textContent = conf.signalEmoji;
    document.getElementById('analizSignalText').textContent = conf.signal;
    document.getElementById('analizSignalText').style.color = conf.signalClass === 'buy' ? '#00e676' : conf.signalClass === 'wait' ? '#fbbf24' : '#ff4664';
    document.getElementById('analizScore').textContent = conf.score;
    document.getElementById('analizScore').style.color = conf.signalClass === 'buy' ? '#00e676' : conf.signalClass === 'wait' ? '#fbbf24' : '#ff4664';
    document.getElementById('analizConfidence').textContent = conf.confidence.toFixed(0) + '%';
    setTimeout(() => { document.getElementById('analizConfBar').style.width = conf.confidence + '%'; }, 100);

    // Seviyeleri göster
    document.getElementById('anlzEntry').textContent = '$' + current.toFixed(priceDecimals);
    document.getElementById('anlzSL').textContent = '$' + sl.toFixed(priceDecimals);
    document.getElementById('anlzSL').style.color = '#ff4664';
    document.getElementById('anlzSLPct').textContent = '-' + ((risk/current)*100).toFixed(2) + '%';
    document.getElementById('anlzSLPct').style.color = '#ff4664';
    document.getElementById('anlzTP1').textContent = '$' + tp1.toFixed(priceDecimals);
    document.getElementById('anlzTP1').style.color = '#00e676';
    document.getElementById('anlzTP2').textContent = '$' + tp2.toFixed(priceDecimals);
    document.getElementById('anlzTP2').style.color = '#00ffcc';
    const tp3El = document.getElementById('anlzTP3');
    if (tp3El) { tp3El.textContent = '$' + tp3.toFixed(priceDecimals); tp3El.style.color = '#a78bfa'; }

    // Destek/Direnç
    const srEl = document.getElementById('analizSRZones');
    let srHtml = '';
    sr.resistances.slice(0,3).forEach((z, i) => {
      const dist = ((z.price - current) / current * 100).toFixed(2);
      srHtml += `<div class="anlz-sr-zone res">
        <span style="font-size:10px;font-weight:900;color:#ff4664;min-width:18px;">${i+1}</span>
        <span class="anlz-sr-type" style="color:#ff4664;">⬆ DİRENÇ</span>
        <span class="anlz-sr-price">$${z.price.toFixed(priceDecimals)}</span>
        <span class="anlz-sr-tests" title="Fiyat bu seviyeye ${z.tests} kez geldi">${z.tests}x test</span>
        <span class="anlz-sr-strength ${z.strength}">${z.strength === 'strong' ? 'GÜÇLÜ' : z.strength === 'medium' ? 'ORTA' : 'ZAYIF'}</span>
        <span style="font-size:9px;color:#4a6a8a;margin-left:4px;">+${dist}%</span>
      </div>`;
    });
    sr.supports.slice(0,3).forEach((z, i) => {
      const dist = ((current - z.price) / current * 100).toFixed(2);
      srHtml += `<div class="anlz-sr-zone sup">
        <span style="font-size:10px;font-weight:900;color:#00e676;min-width:18px;">${i+1}</span>
        <span class="anlz-sr-type" style="color:#00e676;">⬇ DESTEK</span>
        <span class="anlz-sr-price">$${z.price.toFixed(priceDecimals)}</span>
        <span class="anlz-sr-tests" title="Fiyat bu seviyeye ${z.tests} kez geldi">${z.tests}x test</span>
        <span class="anlz-sr-strength ${z.strength}">${z.strength === 'strong' ? 'GÜÇLÜ' : z.strength === 'medium' ? 'ORTA' : 'ZAYIF'}</span>
        <span style="font-size:9px;color:#4a6a8a;margin-left:4px;">-${dist}%</span>
      </div>`;
    });
    if (!srHtml) srHtml = '<div style="color:#4a6a8a;font-size:11px;padding:12px;">Yeterli destek/direnç verisi yok</div>';
    srEl.innerHTML = srHtml;

    // Göstergeler
    const rsiSignal = rsi > 70 ? {t:'Aşırı alım — dikkat', c:'bear'} : rsi < 30 ? {t:'Aşırı satım — toparlanabilir', c:'bull'} : rsi < 50 ? {t:'Momentum zayıf', c:'neu'} : {t:'Momentum güçlü', c:'bull'};
    const macdSignal = macd.hist > 0 ? {t:'Alım ivmesi artıyor', c:'bull'} : {t:'Satım baskısı var', c:'bear'};
    const emaSignal = ms.emaGolden ? {t:'Yükseliş trendi', c:'bull'} : {t:'Düşüş trendi', c:'bear'};
    const bbSignal = current > bb.upper ? {t:'Fiyat çok yükseldi', c:'bear'} : current < bb.lower ? {t:'Fiyat çok düştü', c:'bull'} : {t:'Normal aralıkta', c:'neu'};
    const atrSignal = volatility.ok ? {t:'Hareket var, işlem uygun', c:'bull'} : {t:'Hareketsiz piyasa', c:'neu'};
    const volSignal = vol > volMa ? {t:'Yoğun işlem', c:'bull'} : {t:'Düşük işlem', c:'neu'};

    // Likidite & Tasfiye Haritası

    // MTF
    const mtfRender = (ms, tf) => {
      const bull = ms.emaGolden && ms.structureBull;
      const bear = !ms.emaGolden && !ms.structureBull;
      const color = bull ? '#00e676' : bear ? '#ff4664' : '#fbbf24';
      const label = bull ? '📈 BOĞA' : bear ? '📉 AYI' : '↔ NÖTR';
      return `<div class="anlz-mtf-card">
        <div class="anlz-mtf-tf">${tf}</div>
        <div class="anlz-mtf-trend" style="color:${color}">${label}</div>
        <div class="anlz-mtf-sub" title="EMA (trend ortalaması) yönü: yukarıysa yükseliş, aşağıysa düşüş eğilimi var">${ms.emaGolden ? 'Trend: Yukarı ↑' : 'Trend: Aşağı ↓'}</div>
      </div>`;
    };
    document.getElementById('analizMTF').innerHTML =
      mtfRender(ms1h, '1 SAATLİK') + mtfRender(ms4h, '4 SAATLİK') + mtfRender(ms1d, 'GÜNLÜK');

    // MTF uyumsuzluk uyarısı — seçili TF'e göre anlamlı karşılaştırma
    const mtfBull1h = ms1h.emaGolden && ms1h.structureBull;
    const mtfBull4h = ms4h.emaGolden && ms4h.structureBull;
    const mtfBull1d = ms1d.emaGolden && ms1d.structureBull;
    const mtfBullArr = [mtfBull1h, mtfBull4h, mtfBull1d];
    const mtfBullCount = mtfBullArr.filter(Boolean).length;
    // Uyumsuzluk: 3'ten az TF aynı yönde değilse uyar
    if (mtfBullCount < 3 && mtfBullCount > 0) {
      const uyumsuzTfler = ['1 SAATLİK','4 SAATLİK','GÜNLÜK'].filter((_,i) => !mtfBullArr[i]).join(', ');
      document.getElementById('analizMTF').innerHTML += `<div style="grid-column:1/-1;padding:10px 12px;background:rgba(255,70,100,0.07);border:1px solid rgba(255,70,100,0.15);border-radius:12px;font-size:10px;color:#ff8080;font-weight:700;">⚠️ ${uyumsuzTfler} henüz yükseliş trendinde değil — tüm TF'ler hizalanmadan işlem risklidir</div>`;
    } else if (mtfBullCount === 0) {
      document.getElementById('analizMTF').innerHTML += `<div style="grid-column:1/-1;padding:10px 12px;background:rgba(255,70,100,0.07);border:1px solid rgba(255,70,100,0.15);border-radius:12px;font-size:10px;color:#ff8080;font-weight:700;">🔴 Tüm zaman dilimlerinde düşüş trendi — şu an alım için uygun değil</div>`;
    }



    // Son güncelleme
    const now = new Date();
    document.getElementById('analizUpdated').textContent =
      'Son güncelleme: ' + now.toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit',second:'2-digit'}) + ' TR';

  } catch(e) {
    document.getElementById('analizLoading').style.display = 'none';
    document.getElementById('analizEmpty').style.display = '';
    document.getElementById('analizEmpty').innerHTML = `
      <div style="font-size:40px;margin-bottom:14px;">⚠️</div>
      <div style="font-size:11px;font-weight:900;color:#ff4664;letter-spacing:1px;margin-bottom:8px;">HATA OLUŞTU</div>
      <div style="font-size:11px;color:#4a6a8a;">${e.message || 'API bağlantı hatası'}</div>
      <button onclick="analizRunCurrent()" style="margin-top:16px;padding:10px 20px;border-radius:12px;border:1px solid rgba(0,212,255,0.2);background:rgba(0,212,255,0.07);color:#00d4ff;font-size:11px;font-weight:900;cursor:pointer;">Tekrar Dene</button>`;
  }
}

// Analiz sayfası açılınca sembol listesini yükle
document.addEventListener('DOMContentLoaded', () => {
  // goToPage 'analiz' çağrısında yüklenecek — burada preload
  setTimeout(analizLoadSymbols, 3000);
});
// ===================== / KRİPTO ANALİZ =====================




