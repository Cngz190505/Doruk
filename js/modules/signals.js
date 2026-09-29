/* Doruk module: signals.js */
// ===================== SİNYAL MODÜLÜ =====================

let sinyalAllSymbols = [];
let sinyalCurrentTf  = '15m';
let sinyalCurrentTip = 'scalp';

function sinyalInit() {
  const _hsinyal = document.getElementById('headerTitle');
  _hsinyal.textContent = 'TREND';
  _hsinyal.style.letterSpacing = '6px';
  document.getElementById('sinyalInput').value = '';
  document.getElementById('sinyalDropdown').style.display = 'none';
  document.getElementById('sinyalResult').style.display = 'none';
  document.getElementById('sinyalLoading').style.display = 'none';
  if (!sinyalAllSymbols.length) sinyalLoadSymbols();
  // Varsayılan strateji (scalp) için uygun olmayan zaman dilimlerini gizle
  const _uyumluInit = sinyalUyumluTfler[sinyalCurrentTip] || [];
  document.querySelectorAll('.sinyal-tf-btn').forEach(b => {
    b.style.display = _uyumluInit.includes(b.getAttribute('data-tf')) ? '' : 'none';
  });
}

async function sinyalLoadSymbols() {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    const all = await res.json();
    sinyalAllSymbols = all
      .filter(t => t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 1000000)
      .sort((a,b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
  } catch(e) {}
}

function sinyalOnInput(val) {
  const dd = document.getElementById('sinyalDropdown');
  if (!val || val.length < 1) { dd.style.display = 'none'; return; }
  const q = val.toUpperCase();
  const matches = sinyalAllSymbols
    .filter(t => t.symbol.replace('USDT','').startsWith(q))
    .slice(0, 8);
  if (!matches.length) { dd.style.display = 'none'; return; }
  dd.innerHTML = matches.map(m => {
    const chg = parseFloat(m.priceChangePercent);
    const color = chg >= 0 ? '#00e676' : '#ff4664';
    const sign  = chg >= 0 ? '+' : '';
    return `<div onclick="sinyalSelectCoin('${m.symbol}')" style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;border-bottom:1px solid rgba(0,180,255,0.06);transition:background 0.15s;" onmouseenter="this.style.background='rgba(0,100,200,0.08)'" onmouseleave="this.style.background='transparent'">
      <span style="font-size:12px;font-weight:800;color:#e2e8f0;">${m.symbol.replace('USDT','')}</span>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:700;color:${color};">${sign}${chg.toFixed(2)}%</div>
        <div style="font-size:9px;color:#4a6a8a;">$${parseFloat(m.lastPrice).toLocaleString('en-US',{maximumFractionDigits:4})}</div>
      </div>
    </div>`;
  }).join('');
  dd.style.display = '';
}

function sinyalSelectCoin(symbol) {
  document.getElementById('sinyalInput').value = symbol.replace('USDT','');
  document.getElementById('sinyalDropdown').style.display = 'none';
}

function sinyalSetTf(tf, btn) {
  sinyalCurrentTf = tf;
  document.querySelectorAll('.sinyal-tf-btn').forEach(b => b.classList.remove('sinyal-tf-active'));
  btn.classList.add('sinyal-tf-active');
}

const sinyalUyumluTfler = {
  scalp:    ['15m','30m','1h'],
  swing:    ['1h','4h'],
  pozisyon: ['4h','1d']
};

function sinyalSetTip(tip, btn) {
  sinyalCurrentTip = tip;
  document.querySelectorAll('.sinyal-tip-btn').forEach(b => b.classList.remove('sinyal-tip-active'));
  btn.classList.add('sinyal-tip-active');
  const aciklamalar = {
    scalp:    '⚡ <strong style="color:#7dd3fc;">Scalp:</strong> <span style="color:#bde0fa;">Dakikalar-saatler içinde hızlı kâr. Küçük hedef, dar zarar kes.</span>',
    swing:    '🌊 <strong style="color:#7dd3fc;">Swing:</strong> <span style="color:#bde0fa;">Birkaç gün beklenir, orta büyüklükte kâr hedeflenir.</span>',
    pozisyon: '🏔️ <strong style="color:#7dd3fc;">Pozisyon:</strong> <span style="color:#bde0fa;">Haftalarca tutulur, büyük trend yakalamak için.</span>'
  };
  const el = document.getElementById('sinyalTipAciklama');
  if (el) el.innerHTML = aciklamalar[tip] || '';

  // Bu stratejiye uygun olmayan zaman dilimi butonlarını tamamen gizle
  const uyumlu = sinyalUyumluTfler[tip] || [];
  const tfBtns = document.querySelectorAll('.sinyal-tf-btn');
  tfBtns.forEach(b => {
    const btnTf = b.getAttribute('data-tf');
    if (uyumlu.includes(btnTf)) {
      b.style.display = '';
    } else {
      b.style.display = 'none';
    }
  });

  // Eğer şu an seçili zaman dilimi artık uygun değilse, otomatik olarak ilk uygun olana geç
  if (!uyumlu.includes(sinyalCurrentTf)) {
    const ilkUyumluBtn = Array.from(tfBtns).find(b => uyumlu.includes(b.getAttribute('data-tf')));
    if (ilkUyumluBtn) {
      sinyalSetTf(ilkUyumluBtn.getAttribute('data-tf'), ilkUyumluBtn);
    }
  }
}

async function sinyalRun() {
  const inputEl  = document.getElementById('sinyalInput');
  const result   = document.getElementById('sinyalResult');
  const loading  = document.getElementById('sinyalLoading');
  const runBtn   = document.getElementById('sinyalRunBtn');
  const loadTxt  = document.getElementById('sinyalLoadingText');

  const raw = inputEl.value.trim().toUpperCase();
  const symbol = raw.endsWith('USDT') ? raw : raw + 'USDT';
  if (!raw) { inputEl.focus(); return; }

  result.style.display = 'none';
  loading.style.display = '';
  runBtn.disabled = true;
  runBtn.style.opacity = '0.6';


  const tip     = sinyalCurrentTip;
  const tf      = sinyalCurrentTf;

  // ATR çarpanları strateji tipine göre
  const slMult  = tip === 'scalp' ? 1.2  : tip === 'swing' ? 2.2  : 3.5;
  const tp1Mult = tip === 'scalp' ? 1.8  : tip === 'swing' ? 3.3  : 5.25;
  const tp2Mult = tip === 'scalp' ? 3.0  : tip === 'swing' ? 5.5  : 8.75;
  const tp3Mult = tip === 'scalp' ? 5.0  : tip === 'swing' ? 9.0  : 15.0;

  // Strateji + TF uyum kontrolü
  const scalpTfler   = ['15m','30m','1h'];
  const swingTfler   = ['1h','4h'];
  const pozTfler     = ['4h','1d'];
  const uyumsuz =
    (tip === 'scalp'    && !scalpTfler.includes(tf)) ||
    (tip === 'swing'    && !swingTfler.includes(tf)) ||
    (tip === 'pozisyon' && !pozTfler.includes(tf));

  if (uyumsuz) {
    const onerilen = tip === 'scalp' ? '15dk, 30dk veya 1S' : tip === 'swing' ? '1S veya 4S' : '4S veya 1G';
    const tfLabelMap = { '15m':'15dk','30m':'30dk','1h':'1S','4h':'4S','1d':'1G' };
    const tfLabel = tfLabelMap[tf] || tf;
    loading.style.display = 'none';
    runBtn.disabled = false; runBtn.style.opacity = '1';
    result.innerHTML = `<div style="padding:20px;border-radius:16px;background:rgba(251,191,36,0.07);border:1px solid rgba(251,191,36,0.25);text-align:center;">
      <div style="font-size:24px;margin-bottom:10px;">⚠️</div>
      <div style="font-size:12px;font-weight:900;color:#fbbf24;letter-spacing:1px;margin-bottom:8px;">UYUMSUZ STRATEJİ + ZAMAN DİLİMİ</div>
      <div style="font-size:11px;color:#bde0fa;line-height:1.7;">${tip.charAt(0).toUpperCase()+tip.slice(1)} stratejisi için önerilen zaman dilimi: <strong style="color:#fbbf24;">${onerilen}</strong><br>Seçtiğin zaman dilimi (${tfLabel}) bu strateji için uygun değil.</div>
    </div>`;
    result.style.display = '';
    return;
  }

  // TF'e göre yeterli veri limiti — Kripto Analiz modülüyle AYNI limitler kullanılır
  // (aynı zaman dilimi seçildiğinde iki modülün de aynı mum penceresinde hesaplama yapması için)
  const limitMap = { '1m':500,'3m':500,'5m':500,'15m':500,'30m':500,'1h':500,'2h':300,'4h':300,'6h':300,'8h':300,'12h':300,'1d':365 };
  const limit = limitMap[tf] || 500;
  const minMum = 60; // EMA50 + pivot için minimum

  try {
    loadTxt.textContent = 'Fiyat verileri çekiliyor...';
    const [kRes, tickerRes] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=${limit}`).then(r=>r.json()),
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`).then(r=>r.json()),
    ]);

    if (!Array.isArray(kRes) || kRes.length < minMum) throw new Error(`Yeterli veri bulunamadı (${kRes?.length || 0} mum, minimum ${minMum})`);

    loadTxt.textContent = 'Teknik göstergeler hesaplanıyor...';
    const candles = kRes.map(c => ({
      open: +c[1], high: +c[2], low: +c[3], close: +c[4], volume: +c[5]
    }));
    const closes  = candles.map(c => c.close);
    const n       = closes.length;
    const cur     = closes[n - 1];
    const chgPct  = parseFloat(tickerRes.priceChangePercent);

    // İndikatörler — EMA periyot > veri sayısından büyükse kısalt
    const rsi14   = _sentRSI(closes, 14);
    const macd    = _sentMACD(closes);
    const ema20   = _sentEMA(closes, Math.min(20, n));
    const ema50   = _sentEMA(closes, Math.min(50, n));
    const atr     = _sentATR(candles, Math.min(14, candles.length - 1));
    const atrPct  = (atr / cur) * 100;

    const obvArr  = _sentOBV(candles);
    const obvBull = obvArr[obvArr.length-1] > obvArr[Math.max(0, obvArr.length-20)];

    // BB
    const bbSlice = closes.slice(-20);
    const bbMid   = bbSlice.reduce((a,b)=>a+b,0) / 20;
    const bbSd    = Math.sqrt(bbSlice.reduce((a,b)=>a+(b-bbMid)**2,0) / 20);
    const bbUpper = bbMid + 2 * bbSd;
    const bbLower = bbMid - 2 * bbSd;
    const bbPos   = Math.round(((cur - bbLower) / (bbUpper - bbLower)) * 100);

    // Hacim analizi
    const volumes   = candles.map(c => c.volume);
    const volMa20   = volumes.slice(-20).reduce((a,b)=>a+b,0) / 20;
    const curVol    = volumes[volumes.length - 1];
    const volRatio  = curVol / volMa20;
    const volBull   = volRatio >= 1.2;   // ortalamanın %20 üzerindeyse güçlü hacim
    const volBear   = volRatio < 0.7;    // ortalamanın %30 altındaysa zayıf hacim

    // Destek / Direnç — Kripto Analiz modülüyle AYNI ortak fonksiyon kullanılır
    // (farklı sayfalarda farklı sonuç çıkmasını önlemek için merkezi hesaplama)
    const _srResult = anlzFindSupportResistance(candles);
    const resistances = _srResult.resistances;
    const supports    = _srResult.supports;

    // En yakın destek/direnç mesafeleri
    const nearSup = supports[0]    || null;
    const nearRes = resistances[0] || null;
    const supDist = nearSup ? ((cur - nearSup.price) / cur * 100) : null;
    const resDist = nearRes ? ((nearRes.price - cur) / cur * 100) : null;

    // Destek/direnç'e göre puan: fiyat desteğe yakınsa long lehine, dirençe yakınsa short lehine
    const nearSupport    = supDist !== null && supDist < 2.0;   // %2 içinde destek var
    const nearResistance = resDist !== null && resDist < 2.0;   // %2 içinde direnç var

    // Puanlama — her koşul yalnızca bir kez sayılır, çakışma yok
    let longScore = 0, shortScore = 0;

    // RSI: tek koşul — 3 bölge
    if (rsi14 >= 50 && rsi14 <= 70)  longScore++;   // momentum güçlü
    else if (rsi14 < 30)              longScore++;   // oversold → toparlanma
    else if (rsi14 > 70)              shortScore++;  // aşırı alım → düşüş riski
    else if (rsi14 < 45)              shortScore++;  // momentum zayıf

    // MACD
    if (macd.hist > 0) longScore++; else shortScore++;

    // EMA 20
    if (cur > ema20) longScore++; else shortScore++;

    // EMA 50
    if (cur > ema50) longScore++; else shortScore++;

    // OBV
    if (obvBull) longScore++; else shortScore++;

    // Bollinger (fiyat konumu)
    if (bbPos < 45)       longScore++;   // alt bölge → ucuz
    else if (bbPos > 65)  shortScore++;  // üst bölge → pahalı

    // 24s değişim
    if (chgPct > 1)       longScore++;
    else if (chgPct < -1) shortScore++;

    // Hacim
    if (volBull)       longScore++;
    else if (volBear)  shortScore++;

    // Destek/Direnç
    if (nearSupport)    longScore++;
    if (nearResistance) shortScore++;

    // Maksimum ulaşılabilir puan: 9 long veya 9 short
    const totalScore  = longScore + shortScore;
    const longPct     = totalScore > 0 ? Math.round((longScore / totalScore) * 100) : 50;
    let direction, dirEmoji, dirColor, dirBg, dirBorder;
    if (longScore >= shortScore + 2) {
      direction = 'LONG 🟢'; dirEmoji = '📈'; dirColor = '#00e676';
      dirBg = 'rgba(0,230,118,0.08)'; dirBorder = 'rgba(0,230,118,0.25)';
    } else if (shortScore >= longScore + 2) {
      direction = 'SHORT 🔴'; dirEmoji = '📉'; dirColor = '#ff4664';
      dirBg = 'rgba(255,70,100,0.08)'; dirBorder = 'rgba(255,70,100,0.25)';
    } else {
      direction = 'BEKLE ⚠️'; dirEmoji = '⏳'; dirColor = '#fbbf24';
      dirBg = 'rgba(251,191,36,0.08)'; dirBorder = 'rgba(251,191,36,0.25)';
    }

    const isLong   = direction.startsWith('LONG');
    const isShort  = direction.startsWith('SHORT');
    const entry = cur;
    const isWait = !isLong && !isShort;

    // SL: destek/direnç varsa ve %8 içindeyse onu kullan, yoksa ATR çarpanı
    // Long SL: en yakın desteğin %0.2 altı (fakeout payı)
    // Short SL: en yakın direncin %0.2 üstü
    const atrSlDist = atr * slMult;
    let finalSlLong, finalSlShort;
    if (nearSup && supDist < 8) {
      finalSlLong = Math.min(nearSup.price * 0.998, entry - atrSlDist);
    } else {
      finalSlLong = entry - atrSlDist;
    }
    if (nearRes && resDist < 8) {
      finalSlShort = Math.max(nearRes.price * 1.002, entry + atrSlDist);
    } else {
      finalSlShort = entry + atrSlDist;
    }

    const sl = isLong ? finalSlLong : isShort ? finalSlShort : null;
    const slLongWait  = finalSlLong;
    const slShortWait = finalSlShort;
    const slDist = isLong ? entry - finalSlLong : isShort ? finalSlShort - entry : atrSlDist;

    // TP: direnç/destek seviyelerine snap — %3 içindeyse o seviyeye kilitle
    const atrTp1Dist = atr * tp1Mult;
    const atrTp2Dist = atr * tp2Mult;
    const atrTp3Dist = atr * tp3Mult;

    // Long TP: en yakın 3 direnç seviyesine snap
    const longTpTargets = resistances.map(r => r.price);
    const shortTpTargets = supports.map(s => s.price);

    function snapToLevel(base, levels, direction, usedLevels) {
      // base fiyata en yakın seviye %5 içindeyse oraya snap yap (daha önce kullanılmamışsa)
      for (const lvl of levels) {
        if (usedLevels.has(lvl)) continue;
        const dist = direction === 'long' ? (lvl - base) / base : (base - lvl) / base;
        if (dist > 0 && dist < 0.05) {
          usedLevels.add(lvl);
          return lvl * (direction === 'long' ? 0.999 : 1.001);
        }
      }
      return base;
    }

    const _usedTpLevels = new Set();
    let tp1 = isLong  ? snapToLevel(entry + atrTp1Dist, longTpTargets,  'long', _usedTpLevels)
            : isShort ? snapToLevel(entry - atrTp1Dist, shortTpTargets, 'short', _usedTpLevels)
            : entry + atrTp1Dist;
    let tp2 = isLong  ? snapToLevel(entry + atrTp2Dist, longTpTargets,  'long', _usedTpLevels)
            : isShort ? snapToLevel(entry - atrTp2Dist, shortTpTargets, 'short', _usedTpLevels)
            : entry + atrTp2Dist;
    let tp3 = isLong  ? snapToLevel(entry + atrTp3Dist, longTpTargets,  'long', _usedTpLevels)
            : isShort ? snapToLevel(entry - atrTp3Dist, shortTpTargets, 'short', _usedTpLevels)
            : entry + atrTp3Dist;

    // Güvence: TP'ler her zaman kademeli artmalı (long) / azalmalı (short).
    // Snap sonrası çakışma veya sıralama bozulması olursa ATR tabanlı değere geri dön.
    if (isLong) {
      if (tp2 <= tp1) tp2 = entry + atrTp2Dist;
      if (tp3 <= tp2) tp3 = entry + atrTp3Dist;
    } else if (isShort) {
      if (tp2 >= tp1) tp2 = entry - atrTp2Dist;
      if (tp3 >= tp2) tp3 = entry - atrTp3Dist;
    }

    const tp1Dist = isLong ? tp1 - entry : entry - tp1;
    const tp2Dist = isLong ? tp2 - entry : entry - tp2;
    const tp3Dist = isLong ? tp3 - entry : entry - tp3;

    const rr1 = slDist > 0 ? (tp1Dist / slDist).toFixed(1) : '—';
    const rr2 = slDist > 0 ? (tp2Dist / slDist).toFixed(1) : '—';
    const rr3 = slDist > 0 ? (tp3Dist / slDist).toFixed(1) : '—';

    const slPct = (slDist / entry * 100).toFixed(2);


    // Fiyat ondalık basamak
    const dec = cur < 0.01 ? 6 : cur < 1 ? 4 : cur < 100 ? 3 : 2;
    const fmtP = p => p.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});

    // Strateji açıklaması
    const tipLbl = tip === 'scalp' ? '⚡ Scalp' : tip === 'swing' ? '🌊 Swing' : '🏔️ Pozisyon';
    const tfLbl  = { '15m':'15 Dakika','1h':'1 Saat','4h':'4 Saat','1d':'1 Gün' }[tf] || tf;

    // Gösterge renkleri
    const rsiColor = rsi14 > 60 ? '#ff4664' : rsi14 > 50 ? '#00e676' : rsi14 > 40 ? '#fbbf24' : '#7dd3fc';
    const macdColor = macd.hist > 0 ? '#00e676' : '#ff4664';
    const emaColor  = cur > ema20 ? '#00e676' : '#ff4664';
    const bbColor   = bbPos < 40 ? '#00e676' : bbPos > 65 ? '#ff4664' : '#fbbf24';

    // Sinyal gücü
    // Maks ulaşılabilir puan 9 — eşikler buna göre ayarlandı
    const strength = Math.max(longScore, shortScore);
    const strengthLbl = strength >= 7 ? 'ÇOK GÜÇLÜ' : strength >= 5 ? 'GÜÇLÜ' : strength >= 3 ? 'ORTA' : 'ZAYIF';
    const strengthColor = strength >= 7 ? '#00e676' : strength >= 5 ? '#6ee7b7' : strength >= 3 ? '#fbbf24' : '#ff4664';

    result.innerHTML = `
      <!-- YÖN KARTI -->
      <div style="padding:16px;border-radius:18px;background:${dirBg};border:1px solid ${dirBorder};border-top-color:${dirColor}44;margin-bottom:10px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:15%;right:15%;height:1px;background:linear-gradient(90deg,transparent,${dirColor}66,transparent);"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:9px;font-weight:900;letter-spacing:2px;color:rgba(255,255,255,0.35);margin-bottom:4px;">SİNYAL YÖNÜ</div>
            <div style="font-size:26px;font-weight:900;color:${dirColor};letter-spacing:1px;">${direction}</div>
            <div style="font-size:9px;color:rgba(255,255,255,0.40);margin-top:4px;">${tipLbl} · ${tfLbl}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;color:rgba(255,255,255,0.35);margin-bottom:4px;">SİNYAL GÜCÜ</div>
            <div style="font-size:22px;font-weight:900;color:${strengthColor};">${strengthLbl}</div>
            <div style="font-size:9px;color:rgba(255,255,255,0.40);margin-top:4px;">${strength}/9 onay</div>
          </div>
        </div>
        <!-- Güç çubuğu -->
        <div style="margin-top:12px;height:4px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${(strength/9*100).toFixed(0)}%;background:${dirColor};border-radius:4px;transition:width 1s cubic-bezier(0.34,1.2,0.64,1);"></div>
        </div>
      </div>

      <!-- FİYAT SEVİYELERİ -->
      <div style="padding:14px;border-radius:18px;background:linear-gradient(145deg,rgba(4,14,36,0.98),rgba(2,8,22,0.99));border:1px solid rgba(0,180,255,0.12);border-top-color:rgba(56,189,248,0.28);margin-bottom:10px;">
        <div style="font-size:9px;font-weight:900;letter-spacing:2px;color:rgba(125,211,252,0.70);margin-bottom:12px;">📊 FİYAT SEVİYELERİ</div>

        <!-- SL -->
        ${isWait ? `
        <div style="padding:10px 13px;border-radius:12px;background:rgba(251,191,36,0.07);border:1px solid rgba(251,191,36,0.22);margin-bottom:6px;">
          <div style="font-size:8px;font-weight:900;letter-spacing:1.5px;color:rgba(251,191,36,0.80);margin-bottom:6px;">⚠️ STOP LOSS (YÖN BEKLENİYOR)</div>
          <div style="display:flex;justify-content:space-between;gap:8px;">
            <div style="flex:1;background:rgba(0,230,118,0.07);border-radius:8px;padding:7px 10px;border:1px solid rgba(0,230,118,0.15);">
              <div style="font-size:8px;color:rgba(0,230,118,0.60);margin-bottom:2px;">LONG girersan SL</div>
              <div style="font-size:13px;font-weight:900;color:#00e676;">$${fmtP(slLongWait)}</div>
            </div>
            <div style="flex:1;background:rgba(255,70,100,0.07);border-radius:8px;padding:7px 10px;border:1px solid rgba(255,70,100,0.15);">
              <div style="font-size:8px;color:rgba(255,70,100,0.60);margin-bottom:2px;">SHORT girersan SL</div>
              <div style="font-size:13px;font-weight:900;color:#ff4664;">$${fmtP(slShortWait)}</div>
            </div>
          </div>
          <div style="margin-top:7px;font-size:9px;color:rgba(251,191,36,0.70);font-weight:700;">📌 Göstergeler karışık sinyal veriyor. Netleşmeden işlem açmak risklidir.</div>
        </div>
        ` : `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 13px;border-radius:12px;background:rgba(255,70,100,0.07);border:1px solid rgba(255,70,100,0.18);margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:3px;height:32px;background:#ff4664;border-radius:3px;opacity:0.8;"></div>
            <div>
              <div style="font-size:8px;font-weight:900;letter-spacing:1.5px;color:rgba(255,70,100,0.70);">🛑 ZARAR KES (Stop Loss)</div>
              <div style="font-size:19px;font-weight:900;color:#ff4664;text-shadow:0 0 8px rgba(255,70,100,0.45);">$${fmtP(sl)}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;font-weight:900;color:#ff4664;">-%${slPct}</div>
            <div style="font-size:8px;color:rgba(255,70,100,0.55);margin-top:2px;">risk mesafesi</div>
          </div>
        </div>
        `}

        <!-- GİRİŞ -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 13px;border-radius:12px;background:rgba(0,212,255,0.07);border:1px solid rgba(0,212,255,0.22);margin-bottom:6px;box-shadow:0 0 16px rgba(0,212,255,0.06) inset;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:3px;height:38px;background:#00d4ff;border-radius:3px;box-shadow:0 0 8px rgba(0,212,255,0.6);"></div>
            <div>
              <div style="font-size:8px;font-weight:900;letter-spacing:1.5px;color:rgba(0,212,255,0.70);">🎯 GİRİŞ FİYATI (Şu an)</div>
              <div style="font-size:22px;font-weight:900;color:#00d4ff;text-shadow:0 0 10px rgba(0,212,255,0.55),0 0 20px rgba(0,212,255,0.25);">$${fmtP(entry)}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;font-weight:900;color:${chgPct>=0?'#00e676':'#ff4664'}">${chgPct>=0?'+':''}${chgPct.toFixed(2)}%</div>
            <div style="font-size:8px;color:rgba(0,212,255,0.55);margin-top:2px;">anlık fiyat</div>
          </div>
        </div>

        <!-- TP1 -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 13px;border-radius:12px;background:rgba(0,230,118,0.05);border:1px solid rgba(0,230,118,0.16);margin-bottom:5px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:3px;height:28px;background:rgba(0,230,118,0.6);border-radius:3px;"></div>
            <div>
              <div style="font-size:8px;font-weight:900;letter-spacing:1px;color:rgba(0,230,118,0.55);">💰 KÂR HEDEFİ 1 (İlk çıkış)</div>
              <div style="font-size:19px;font-weight:900;color:#00e676;text-shadow:0 0 8px rgba(0,230,118,0.45);">$${fmtP(tp1)}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;font-weight:900;color:#00e676;">Kazanç/Risk: 1:${rr1}</div>
            <div style="font-size:8px;color:rgba(0,230,118,0.45);margin-top:2px;">+${((tp1Dist/entry)*100).toFixed(2)}%</div>
          </div>
        </div>

        <!-- TP2 -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 13px;border-radius:12px;background:rgba(0,230,118,0.04);border:1px solid rgba(0,230,118,0.11);margin-bottom:5px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:3px;height:28px;background:rgba(0,230,118,0.45);border-radius:3px;"></div>
            <div>
              <div style="font-size:8px;font-weight:900;letter-spacing:1px;color:rgba(0,230,118,0.45);">💰 KÂR HEDEFİ 2 (Orta)</div>
              <div style="font-size:18px;font-weight:900;color:rgba(0,230,118,0.90);text-shadow:0 0 8px rgba(0,230,118,0.35);">$${fmtP(tp2)}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;font-weight:900;color:rgba(0,230,118,0.80);">Kazanç/Risk: 1:${rr2}</div>
            <div style="font-size:8px;color:rgba(0,230,118,0.40);margin-top:2px;">+${((tp2Dist/entry)*100).toFixed(2)}%</div>
          </div>
        </div>

        <!-- TP3 -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 13px;border-radius:12px;background:rgba(0,230,118,0.03);border:1px solid rgba(0,230,118,0.08);">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:3px;height:28px;background:rgba(0,230,118,0.30);border-radius:3px;"></div>
            <div>
              <div style="font-size:8px;font-weight:900;letter-spacing:1px;color:rgba(0,230,118,0.35);">💰 KÂR HEDEFİ 3 (Maksimum)</div>
              <div style="font-size:17px;font-weight:900;color:rgba(0,230,118,0.75);text-shadow:0 0 8px rgba(0,230,118,0.25);">$${fmtP(tp3)}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;font-weight:900;color:rgba(0,230,118,0.60);">Kazanç/Risk: 1:${rr3}</div>
            <div style="font-size:8px;color:rgba(0,230,118,0.35);margin-top:2px;">+${((tp3Dist/entry)*100).toFixed(2)}%</div>
          </div>
        </div>
      </div>

      <!-- TEKNİK GÖSTERGELER -->
      <div style="padding:14px;border-radius:18px;background:linear-gradient(145deg,rgba(4,14,36,0.98),rgba(2,8,22,0.99));border:1px solid rgba(0,180,255,0.10);border-top-color:rgba(56,189,248,0.22);margin-bottom:10px;">
        <div style="font-size:9px;font-weight:900;letter-spacing:2px;color:rgba(125,211,252,0.60);margin-bottom:10px;">🔬 ANALİZ DETAYLARI</div>
        <div style="display:flex;flex-direction:column;gap:7px;">

          <!-- RSI -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:10px;background:rgba(255,255,255,0.025);">
            <div>
              <div style="font-size:12px;font-weight:900;color:#7aa0c4;">💧 Aşırı Alım / Satım</div>
              <div style="font-size:10px;color:#4a6a8a;margin-top:2px;">${rsi14 > 70 ? 'Fiyat çok yükseldi, dikkat!' : rsi14 < 40 ? 'Fiyat çok düştü, fırsat olabilir' : 'Normal seviyede'}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:50px;height:4px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${Math.min(100,rsi14).toFixed(0)}%;background:${rsiColor};border-radius:3px;"></div></div>
              <span style="font-size:14px;font-weight:900;color:${rsiColor};">${rsi14.toFixed(0)}</span>
            </div>
          </div>

          <!-- MACD -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:10px;background:rgba(255,255,255,0.025);">
            <div>
              <div style="font-size:12px;font-weight:900;color:#7aa0c4;">⚡ Alım / Satım Gücü</div>
              <div style="font-size:10px;color:#4a6a8a;margin-top:2px;">${macd.hist >= 0 ? 'Alıcılar baskın, yukarı ivme var' : 'Satıcılar baskın, aşağı ivme var'}</div>
            </div>
            <span style="font-size:11px;padding:3px 10px;border-radius:8px;background:${macdColor}18;color:${macdColor};font-weight:900;">${macd.hist >= 0 ? '📈 YÜKSELİŞ' : '📉 DÜŞÜŞ'}</span>
          </div>

          <!-- EMA20 -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:10px;background:rgba(255,255,255,0.025);">
            <div>
              <div style="font-size:12px;font-weight:900;color:#7aa0c4;">📏 Kısa Vadeli Ortalama</div>
              <div style="font-size:10px;color:#4a6a8a;margin-top:2px;">${cur > ema20 ? 'Fiyat ortalamanın üzerinde → olumlu' : 'Fiyat ortalamanın altında → olumsuz'}</div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:11px;padding:3px 10px;border-radius:8px;background:${emaColor}18;color:${emaColor};font-weight:900;">${cur > ema20 ? '✅ ÜSTÜNDE' : '❌ ALTINDA'}</span>
              <div style="font-size:13px;font-weight:900;color:${emaColor};margin-top:3px;text-shadow:0 0 8px ${emaColor}44;">$${fmtP(ema20)}</div>
            </div>
          </div>

          <!-- EMA50 -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:10px;background:rgba(255,255,255,0.025);">
            <div>
              <div style="font-size:12px;font-weight:900;color:#7aa0c4;">📐 Orta Vadeli Ortalama</div>
              <div style="font-size:10px;color:#4a6a8a;margin-top:2px;">${cur > ema50 ? 'Genel trend yukarı yönlü' : 'Genel trend aşağı yönlü'}</div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:11px;padding:3px 10px;border-radius:8px;background:${(cur>ema50?'#00e676':'#ff4664')}18;color:${cur>ema50?'#00e676':'#ff4664'};font-weight:900;">${cur > ema50 ? '✅ ÜSTÜNDE' : '❌ ALTINDA'}</span>
              <div style="font-size:13px;font-weight:900;color:${cur>ema50?'#00e676':'#ff4664'};margin-top:3px;text-shadow:0 0 8px ${cur>ema50?'rgba(0,230,118,0.4)':'rgba(255,70,100,0.4)'};">$${fmtP(ema50)}</div>
            </div>
          </div>

          <!-- Bollinger -->
          ${(() => {
            const bbPahali  = bbPos > 70 && rsi14 > 60;
            const bbUcuz    = bbPos < 35 && rsi14 < 45;
            const bbNormal  = !bbPahali && !bbUcuz;
            const bbLbl     = bbPahali ? '🔴 PAHALI' : bbUcuz ? '💚 UCUZ' : '🟡 NORMAL';
            const bbClr     = bbPahali ? '#ff4664'   : bbUcuz ? '#00e676' : '#fbbf24';
            const bbAciklama = bbPahali
              ? 'Hem fiyat aralığı hem momentum yüksek — dikkatli ol'
              : bbUcuz
              ? 'Hem fiyat aralığı hem momentum düşük — fırsat olabilir'
              : bbPos > 70
              ? 'Bollinger üstte ama momentum normal — henüz net değil'
              : bbPos < 35
              ? 'Bollinger altta ama momentum normal — henüz net değil'
              : 'Fiyat normal aralıkta seyrediyor';
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:10px;background:rgba(255,255,255,0.025);">
              <div>
                <div style="font-size:12px;font-weight:900;color:#7aa0c4;">🎯 Fiyat Bölgesi</div>
                <div style="font-size:10px;color:#4a6a8a;margin-top:2px;">${bbAciklama}</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:50px;height:4px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${Math.max(0,Math.min(100,bbPos)).toFixed(0)}%;background:${bbClr};border-radius:3px;"></div></div>
                <span style="font-size:11px;padding:3px 10px;border-radius:8px;background:${bbClr}18;color:${bbClr};font-weight:900;">${bbLbl}</span>
              </div>
            </div>`;
          })()}

          <!-- OBV -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:10px;background:rgba(255,255,255,0.025);">
            <div>
              <div style="font-size:12px;font-weight:900;color:#7aa0c4;">👥 Para Akışı</div>
              <div style="font-size:10px;color:#4a6a8a;margin-top:2px;">${obvBull ? 'Son dönemde alım yapılıyor, para giriyor' : 'Son dönemde satış yapılıyor, para çıkıyor'}</div>
            </div>
            <span style="font-size:11px;padding:3px 10px;border-radius:8px;background:${obvBull?'#00e67618':'#ff466418'};color:${obvBull?'#00e676':'#ff4664'};font-weight:900;">${obvBull ? '📈 GİRİYOR' : '📉 ÇIKIYOR'}</span>
          </div>

          <!-- ATR -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:10px;background:rgba(255,255,255,0.025);">
            <div>
              <div style="font-size:12px;font-weight:900;color:#7aa0c4;">🌊 Fiyat Oynaklığı</div>
              <div style="font-size:10px;color:#4a6a8a;margin-top:2px;">Coin günde ortalama bu kadar hareket ediyor</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:13px;font-weight:900;color:#e2e8f0;">$${fmtP(atr)}</div>
              <div style="font-size:9px;color:#4a6a8a;">%${atrPct.toFixed(2)} / gün</div>
            </div>
          </div>

          <!-- HACİM -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:10px;background:rgba(255,255,255,0.025);">
            <div>
              <div style="font-size:12px;font-weight:900;color:#7aa0c4;">📊 İşlem Hacmi</div>
              <div style="font-size:10px;color:#4a6a8a;margin-top:2px;">${volBull ? 'Normalden fazla alım-satım var — hareket güvenilir' : volBear ? 'Hacim düşük — bu hareket güvenilmez olabilir' : 'Hacim normal seviyede'}</div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:11px;padding:3px 10px;border-radius:8px;background:${volBull?'#00e67618':volBear?'#ff466418':'#fbbf2418'};color:${volBull?'#00e676':volBear?'#ff4664':'#fbbf24'};font-weight:900;">${volBull?'🔥 YÜKSEK':volBear?'😴 DÜŞÜK':'📊 NORMAL'}</span>
              <div style="font-size:9px;color:#4a6a8a;margin-top:3px;">x${volRatio.toFixed(2)} ortalama</div>
            </div>
          </div>

        </div>
      </div>

      <!-- DESTEK / DİRENÇ -->
      <div style="padding:16px;border-radius:18px;background:linear-gradient(145deg,rgba(4,14,36,0.98),rgba(2,8,22,0.99));border:1px solid rgba(180,130,255,0.15);border-top-color:rgba(180,130,255,0.35);margin-bottom:10px;">
        <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:rgba(180,130,255,0.80);margin-bottom:14px;">📍 NEREDE DURUYORSUN?</div>

        ${nearRes ? `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:14px;background:rgba(255,70,100,0.07);border:1px solid rgba(255,70,100,0.22);margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:4px;height:36px;background:#ff4664;border-radius:3px;box-shadow:0 0 8px rgba(255,70,100,0.5);"></div>
            <div>
              <div style="font-size:11px;font-weight:900;color:rgba(255,70,100,0.90);letter-spacing:1px;">🧱 EN YAKIN DİRENÇ</div>
              <div style="font-size:10px;color:rgba(255,100,120,0.60);margin-top:3px;">${nearResistance ? '⚠️ Çok yakın — fiyat burada takılabilir' : 'Fiyat bu seviyeye ulaşmak zorunda'}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:17px;font-weight:900;color:#ff4664;">$${fmtP(nearRes.price)}</div>
            <div style="font-size:10px;color:rgba(255,70,100,0.60);margin-top:2px;">+%${resDist.toFixed(2)} uzakta</div>
          </div>
        </div>` : `
        <div style="padding:11px 14px;border-radius:14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);margin-bottom:8px;">
          <div style="font-size:11px;color:#4a6a8a;">🧱 Bu bölgede belirgin direnç tespit edilemedi</div>
        </div>`}

        <!-- Mevcut Fiyat — parlak, ışıklı -->
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 14px;margin-bottom:8px;border-radius:14px;background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.20);box-shadow:0 0 18px rgba(0,212,255,0.10);">
          <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(0,212,255,0.4));"></div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
            <div style="font-size:8px;font-weight:900;letter-spacing:2px;color:rgba(0,212,255,0.55);">ŞU ANKİ FİYAT</div>
            <div style="font-size:20px;font-weight:900;color:#00d4ff;text-shadow:0 0 12px rgba(0,212,255,0.6),0 0 24px rgba(0,212,255,0.3);">$${fmtP(cur)}</div>
          </div>
          <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(0,212,255,0.4),transparent);"></div>
        </div>

        ${nearSup ? `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:14px;background:rgba(0,230,118,0.07);border:1px solid rgba(0,230,118,0.22);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:4px;height:36px;background:#00e676;border-radius:3px;box-shadow:0 0 8px rgba(0,230,118,0.5);"></div>
            <div>
              <div style="font-size:11px;font-weight:900;color:rgba(0,230,118,0.90);letter-spacing:1px;">🛡️ EN YAKIN DESTEK</div>
              <div style="font-size:10px;color:rgba(0,200,100,0.60);margin-top:3px;">${nearSupport ? '✅ Çok yakın — iyi bir giriş noktası olabilir' : 'Düşerse bu seviyede toparlanabilir'}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:17px;font-weight:900;color:#00e676;">$${fmtP(nearSup.price)}</div>
            <div style="font-size:10px;color:rgba(0,230,118,0.60);margin-top:2px;">-%${supDist.toFixed(2)} aşağıda</div>
          </div>
        </div>` : `
        <div style="padding:11px 14px;border-radius:14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);">
          <div style="font-size:11px;color:#4a6a8a;">🛡️ Bu bölgede belirgin destek tespit edilemedi</div>
        </div>`}

        ${(supDist !== null && resDist !== null) ? `
        <div style="margin-top:10px;padding:10px 14px;border-radius:12px;background:rgba(180,130,255,0.05);border:1px solid rgba(180,130,255,0.15);">
          <div style="font-size:11px;color:rgba(192,132,252,0.85);font-weight:700;line-height:1.7;">
            💡 Dirençe <strong style="color:#c084fc;">%${resDist.toFixed(1)}</strong> uzak, desteğe <strong style="color:#c084fc;">%${supDist.toFixed(1)}</strong> uzak.
            ${resDist < supDist ? ' Direnç daha yakın — kâr hedefi kısıtlı olabilir.' : ' Destek daha yakın — stop-loss sıkı tutulabilir.'}
          </div>
        </div>` : ''}
      </div>

      <!-- YENİLE BUTONU -->
      <button onclick="sinyalRun()" style="width:100%;padding:13px;border-radius:14px;border:1px solid rgba(0,180,255,0.22);border-top-color:rgba(56,189,248,0.38);background:linear-gradient(145deg,rgba(3,105,161,0.08),rgba(12,26,58,0.04));color:#7dd3fc;font-size:11px;font-weight:900;letter-spacing:1.5px;cursor:pointer;margin-bottom:24px;">
        🔄 YENİLE
      </button>`;

    result.style.display = '';
  } catch(e) {
    result.innerHTML = `<div style="text-align:center;padding:40px 0;">
      <div style="font-size:40px;margin-bottom:14px;">⚠️</div>
      <div style="font-size:11px;font-weight:900;color:#ff4664;letter-spacing:1px;">HATA OLUŞTU</div>
      <div style="font-size:11px;color:#4a6a8a;margin-top:8px;">${e.message || 'Coin bulunamadı veya API hatası'}</div>
      <button onclick="sinyalRun()" style="margin-top:16px;padding:10px 20px;border-radius:12px;border:1px solid rgba(0,180,255,0.22);background:rgba(0,150,255,0.08);color:#7dd3fc;font-size:11px;font-weight:900;cursor:pointer;">Tekrar Dene</button>
    </div>`;
    result.style.display = '';
  }

  loading.style.display = 'none';
  runBtn.disabled = false;
  runBtn.style.opacity = '1';
}
// ===================== / SİNYAL MODÜLÜ =====================


/* ---- extracted inline script ---- */

