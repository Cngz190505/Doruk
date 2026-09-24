/* Doruk module: fibo.js */
/* ---- extracted inline script ---- */

// ===================== AUTO FİBONACCİ MODÜLÜ =====================
let fiboCurrentSymbol = 'BTCUSDT';
let fiboCurrentTf = '1h';
let fiboAllSymbols = [];
let fiboSearchTimer = null;

const FIBO_LEVELS = [
  { pct:0,     label:'0%',     color:'#ff4664', ext:false, desc:'Dönem zirvesi — güçlü direnç noktası, kırılırsa yükseliş devam eder' },
  { pct:0.236, label:'23.6%',  color:'#ff7a45', ext:false, desc:'Zayıf geri çekilme — düşüş sığ, alıcılar hâlâ güçlü' },
  { pct:0.382, label:'38.2%',  color:'#fbbf24', ext:false, desc:'Orta geri çekilme — sağlıklı düzeltme, tepki alınabilir' },
  { pct:0.5,   label:'50%',    color:'#00d4ff', ext:false, desc:'Tam orta nokta — psikolojik denge seviyesi' },
  { pct:0.618, label:'61.8%',  color:'#00e676', ext:false, golden:true, desc:'✨ Altın Oran — en kritik destek/direnç, profesyonellerin izlediği seviye' },
  { pct:0.786, label:'78.6%',  color:'#a78bfa', ext:false, desc:'Derin geri çekilme — dip yakın, kırılırsa trend değişebilir' },
  { pct:1,     label:'100%',   color:'#ff4664', ext:false, desc:'Dönem dibi — burası kırılırsa düşüş devam eder' },
  { pct:1.272, label:'127.2%', color:'#f97316', ext:true,  desc:'1. uzatma hedefi — zirveyi kırdıktan sonra 1. fiyat hedefi' },
  { pct:1.414, label:'141.4%', color:'#facc15', ext:true,  desc:'2. uzatma hedefi — güçlü yükselişte ulaşılabilecek seviye' },
  { pct:1.618, label:'161.8%', color:'#00ffcc', ext:true,  golden:true, desc:'✨ Altın Oran Hedef — güçlü boğa trendinde ana fiyat hedefi' },
  { pct:2.0,   label:'200%',   color:'#c084fc', ext:true,  desc:'2x hedef — zirveden 2 katı mesafede büyük direnç' },
  { pct:2.618, label:'261.8%', color:'#818cf8', ext:true,  desc:'Güçlü uzatma — çok güçlü trenlerde ulaşılan uzun vadeli hedef' },
];

async function fiboLoadSymbols() {
  if (fiboAllSymbols.length > 0) return;
  try {
    const resp = await fetch('https://api.binance.com/api/v3/ticker/24hr?type=MINI', {mode:'cors',credentials:'omit'});
    const all = await resp.json();
    fiboAllSymbols = all
      .filter(t => t.symbol.endsWith('USDT') && !t.symbol.includes('DOWN') && !t.symbol.includes('UP') && !t.symbol.includes('BEAR') && !t.symbol.includes('BULL') && parseFloat(t.quoteVolume) > 1000000)
      .sort((a,b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .map(t => ({ symbol:t.symbol, lastPrice:parseFloat(t.lastPrice), chgPct:parseFloat(t.priceChangePercent)||0 }));
  } catch(e) {}
}

function fiboOnInput(val) {
  clearTimeout(fiboSearchTimer);
  const dd = document.getElementById('fiboDropdown');
  if (!val.trim()) { dd.style.display='none'; return; }
  fiboSearchTimer = setTimeout(() => {
    const q = val.toUpperCase();
    const matches = fiboAllSymbols.filter(m => m.symbol.startsWith(q)||m.symbol.includes(q)).slice(0,5);
    if (!matches.length) { dd.style.display='none'; return; }
    dd.innerHTML = matches.map(m => {
      const name = m.symbol.replace('USDT','');
      const color = m.chgPct>=0?'#00e676':'#ff4664';
      const sign = m.chgPct>=0?'+':'';
      return `<div onclick="fiboSelectCoin('${m.symbol}')" style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;border-bottom:1px solid rgba(220,160,0,0.06);transition:background 0.15s;" onmouseenter="this.style.background='rgba(180,120,0,0.10)'" onmouseleave="this.style.background='transparent'">
        <span style="font-size:12px;font-weight:800;color:#e2e8f0;">${name}</span>
        <span style="font-size:11px;font-weight:700;color:${color};">${sign}${m.chgPct.toFixed(2)}%</span>
      </div>`;
    }).join('');
    dd.style.display = '';
  }, 200);
}

function fiboSelectCoin(symbol) {
  fiboCurrentSymbol = symbol;
  document.getElementById('fiboInput').value = symbol.replace('USDT','');
  document.getElementById('fiboDropdown').style.display = 'none';
}

function fiboSetTf(tf, el) {
  fiboCurrentTf = tf;
  document.querySelectorAll('.fibo-tf-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function fiboInit() {
  fiboLoadSymbols();
}

function fiboFindSwings(candles, lookback) {
  const n = candles.length;
  const win = Math.min(lookback, n);
  let swingHigh = -Infinity, swingLow = Infinity;
  for (let i = n - win; i < n; i++) {
    if (candles[i].high > swingHigh) swingHigh = candles[i].high;
    if (candles[i].low  < swingLow)  swingLow  = candles[i].low;
  }
  return { swingHigh, swingLow };
}

function fiboDetectTrend(candles, lookback) {
  const n = candles.length;
  const win = Math.min(lookback, n);
  if (win < 4) return candles[n-1].close >= candles[n-win].close ? 'up' : 'down';
  const slice = candles.slice(n - win);
  const half = Math.floor(win / 2);
  const firstHalfAvg = slice.slice(0, half).reduce((s, k) => s + k.close, 0) / half;
  const secondHalfAvg = slice.slice(half).reduce((s, k) => s + k.close, 0) / (win - half);
  return secondHalfAvg >= firstHalfAvg ? 'up' : 'down';
}

async function fiboRun() {
  const symbol = fiboCurrentSymbol;
  const tf = fiboCurrentTf;
  const result = document.getElementById('fiboResult');
  const loading = document.getElementById('fiboLoading');
  const btn = document.getElementById('fiboRunBtn');

  result.style.display = 'none';
  loading.style.display = '';
  btn.disabled = true;
  btn.style.opacity = '0.6';

  try {
    const tfLimits = {'1h':200,'4h':150,'1d':120,'1w':80};
    const limit = tfLimits[tf] || 150;

    const [kData, ticker] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=${limit}`).then(r=>r.json()),
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`).then(r=>r.json()),
    ]);

    const candles = kData.map(k => ({open:+k[1],high:+k[2],low:+k[3],close:+k[4],volume:+k[5]}));
    const n = candles.length;
    if (!n) throw new Error('Mum verisi alınamadı, lütfen tekrar deneyin.');
    const curPrice = parseFloat(ticker.lastPrice);
    if (!curPrice || isNaN(curPrice)) throw new Error('Güncel fiyat alınamadı.');
    const chgPct = parseFloat(ticker.priceChangePercent);
    const name = symbol.replace('USDT','');
    const dec = curPrice<0.01?6:curPrice<1?4:curPrice<100?3:2;
    const chgColor = chgPct>=0?'#00e676':'#ff4664';
    const chgSign = chgPct>=0?'+':'';

    const lookback = Math.min(100, n);
    const { swingHigh, swingLow } = fiboFindSwings(candles, lookback);
    const trend = fiboDetectTrend(candles, lookback);
    const isUptrend = trend === 'up';

    const fibHigh = swingHigh;
    const fibLow  = swingLow;
    const range   = fibHigh - fibLow;
    if (range <= 0) throw new Error('Fiyat aralığı hesaplanamadı (yüksek = düşük). Farklı bir zaman dilimi deneyin.');

    const curPos = Math.max(0, Math.min(1, (curPrice - fibLow) / range));
    const tfLabels = {'1h':'1 Saat','4h':'4 Saat','1d':'1 Gün','1w':'1 Hafta'};

    // Trend yönüne göre açıklamalar — yükseliş ve düşüş senaryoları farklı yorumlanır
    const descByPct = {
      0:     isUptrend ? 'Dönem zirvesi — güçlü direnç noktası, kırılırsa yükseliş devam eder' : 'Dönem zirvesi — kırılırsa düşüş hızlanabilir',
      0.236: isUptrend ? 'Zayıf geri çekilme — düşüş sığ, alıcılar hâlâ güçlü' : 'Zayıf tepki yükselişi — satıcılar hâlâ güçlü',
      0.382: isUptrend ? 'Orta geri çekilme — sağlıklı düzeltme, tepki alınabilir' : 'Orta tepki yükselişi — sağlıklı düzeltme olabilir',
      0.5:   'Tam orta nokta — psikolojik denge seviyesi',
      0.618: '✨ Altın Oran — en kritik destek/direnç, profesyonellerin izlediği seviye',
      0.786: isUptrend ? 'Derin geri çekilme — dip yakın, kırılırsa trend değişebilir' : 'Derin tepki yükselişi — zirve yakın, kırılırsa trend değişebilir',
      1:     isUptrend ? 'Dönem dibi — burası kırılırsa düşüş devam eder' : 'Dönem dibi — kırılırsa yükselişe dönebilir',
      1.272: isUptrend ? '1. uzatma hedefi — zirveyi kırdıktan sonra 1. fiyat hedefi' : '1. uzatma hedefi — dibi kırdıktan sonra 1. fiyat hedefi',
      1.414: isUptrend ? '2. uzatma hedefi — güçlü yükselişte ulaşılabilecek seviye' : '2. uzatma hedefi — güçlü düşüşte ulaşılabilecek seviye',
      1.618: isUptrend ? '✨ Altın Oran Hedef — güçlü boğa trendinde ana fiyat hedefi' : '✨ Altın Oran Hedef — güçlü ayı trendinde ana fiyat hedefi',
      2.0:   isUptrend ? '2x hedef — zirveden 2 katı mesafede büyük direnç' : '2x hedef — dipten 2 katı mesafede büyük destek',
      2.618: 'Güçlü uzatma — çok güçlü trendlerde ulaşılan uzun vadeli hedef',
    };

    const retraceLevels = FIBO_LEVELS.filter(l => !l.ext).map(l => {
      // Yükseliş trendi: zirveden dibe doğru geri çekilme (klasik retracement)
      // Düşüş trendi: dipten zirveye doğru geri çekilme (ters yönde aynı mantık)
      const price = isUptrend ? (fibHigh - l.pct * range) : (fibLow + l.pct * range);
      const distPct = ((price - curPrice) / curPrice * 100); // + = yukarıda, - = aşağıda
      return {...l, price, distPct, desc: descByPct[l.pct] || l.desc};
    });

    const extLevels = FIBO_LEVELS.filter(l => l.ext).map(l => {
      // Yükseliş trendi: zirveyi yukarı doğru uzatan hedefler
      // Düşüş trendi: dibi aşağı doğru uzatan hedefler
      const price = isUptrend ? (fibHigh + (l.pct - 1) * range) : (fibLow - (l.pct - 1) * range);
      const distPct = ((price - curPrice) / curPrice * 100); // + = yukarıda, - = aşağıda
      return {...l, price, distPct, desc: descByPct[l.pct] || l.desc};
    });

    const allLevels = [...retraceLevels, ...extLevels];
    const supports = retraceLevels.filter(l => l.price < curPrice).sort((a,b) => b.price - a.price).slice(0,3);
    const resistances = retraceLevels.filter(l => l.price > curPrice).sort((a,b) => a.price - b.price).slice(0,3);

    const trendColor = isUptrend ? '#00e676' : '#ff4664';
    const trendLabel = isUptrend ? '📈 Yükseliş Trendi' : '📉 Düşüş Trendi';

    const fmt = p => p.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});

    // En yakın tek seviyeyi bul (tüm seviyelerde)
    const nearestLevel = allLevels.reduce((closest, l) =>
      Math.abs(l.distPct) < Math.abs(closest.distPct) ? l : closest
    );

    const renderLevel = (l) => {
      const isCur = l === nearestLevel;
      const absDist = Math.abs(l.distPct);
      const distStr = l.distPct >= 0 ? `▲ +${absDist.toFixed(2)}%` : `▼ -${absDist.toFixed(2)}%`;
      const distColor = l.distPct >= 0 ? '#00e676' : '#ff4664';
      const bgBase = isCur ? 'rgba(100,80,255,0.14)' : 'rgba(255,255,255,0.025)';
      const borderColor = isCur ? 'rgba(170,140,255,0.60)' : 'rgba(255,255,255,0.06)';
      const goldenBar = l.golden ? `<div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${l.color};border-radius:3px 0 0 3px;opacity:0.9;"></div>` : '';
      const nearTag = isCur ? `<span style="font-size:8px;font-weight:900;color:#c4b5fd;background:rgba(100,80,255,0.25);padding:2px 7px;border-radius:6px;margin-left:6px;">📍 EN YAKIN</span>` : '';
      return `
        <div style="position:relative;padding:10px 12px 10px ${l.golden?'15px':'12px'};border-radius:12px;background:${bgBase};border:1px solid ${borderColor};margin-bottom:6px;">
          ${goldenBar}
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:7px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${l.color};box-shadow:0 0 6px ${l.color}80;flex-shrink:0;"></div>
              <span style="font-size:12px;font-weight:900;color:${l.color};">${l.label}</span>
              ${nearTag}
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:12px;font-weight:900;color:#e2e8f0;">$${fmt(l.price)}</span>
              <span style="font-size:10px;font-weight:900;color:${distColor};min-width:62px;text-align:right;">${distStr}</span>
            </div>
          </div>
          <div style="font-size:10px;color:rgba(190,210,240,0.70);margin-top:5px;line-height:1.5;">${l.desc}</div>
        </div>`;
    };

    const sectionTitle = (emoji, txt, color) =>
      `<div style="font-size:10px;font-weight:900;color:${color};margin:14px 0 7px;letter-spacing:0.5px;">${emoji} ${txt}</div>`;

    result.innerHTML = `
      <!-- ANA KART: Fiyat + Zirve/Dip + Pozisyon -->
      <div style="padding:14px;border-radius:16px;background:rgba(12,8,30,0.95);border:1px solid rgba(120,80,255,0.20);border-top-color:rgba(160,120,255,0.40);margin-bottom:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <div style="font-size:10px;font-weight:700;color:rgba(160,140,255,0.55);letter-spacing:1.5px;">${name} · ${tfLabels[tf]||tf}</div>
            <div style="font-size:28px;font-weight:900;color:#e2e8f0;margin-top:2px;">$${fmt(curPrice)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:15px;font-weight:900;color:${chgColor};">${chgSign}${chgPct.toFixed(2)}%</div>
            <div style="font-size:9px;color:#4a6a8a;margin-top:2px;">24s Değişim</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:12px;">
          <div style="background:rgba(255,70,100,0.07);border:1px solid rgba(255,70,100,0.15);border-radius:10px;padding:8px 10px;">
            <div style="font-size:8px;color:#4a6a8a;font-weight:700;margin-bottom:3px;">📈 ZİRVE</div>
            <div style="font-size:13px;font-weight:900;color:#ff4664;">$${fmt(fibHigh)}</div>
          </div>
          <div style="background:rgba(0,230,118,0.07);border:1px solid rgba(0,230,118,0.15);border-radius:10px;padding:8px 10px;">
            <div style="font-size:8px;color:#4a6a8a;font-weight:700;margin-bottom:3px;">📉 DİP</div>
            <div style="font-size:13px;font-weight:900;color:#00e676;">$${fmt(fibLow)}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <span style="font-size:8px;font-weight:700;color:#4a6a8a;">📍 GÜNCEL POZİSYON</span>
          <span style="font-size:9px;font-weight:900;color:#c4b5fd;">${(curPos*100).toFixed(1)}%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:6px;position:relative;overflow:visible;">
          <div style="height:100%;width:${(curPos*100).toFixed(1)}%;background:linear-gradient(90deg,#ff4664,#fbbf24,#00e676);border-radius:6px;"></div>
          <div style="position:absolute;left:${(curPos*100).toFixed(1)}%;top:50%;transform:translate(-50%,-50%);width:11px;height:11px;border-radius:50%;background:#c4b5fd;box-shadow:0 0 8px rgba(160,140,255,0.8);border:2px solid #fff;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:3px;">
          <span style="font-size:7px;color:#4a6a8a;">DİP</span>
          <span style="font-size:7px;color:#4a6a8a;">ZİRVE</span>
        </div>
      </div>

      <!-- TREND + ARALIK -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px;">
        <div style="background:rgba(12,18,35,0.9);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:10px 12px;">
          <div style="font-size:8px;color:#4a6a8a;font-weight:700;margin-bottom:4px;">GENEL YÖN</div>
          <div style="font-size:11px;font-weight:900;color:${trendColor};">${trendLabel}</div>
        </div>
        <div style="background:rgba(12,18,35,0.9);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:10px 12px;">
          <div style="font-size:8px;color:#4a6a8a;font-weight:700;margin-bottom:4px;">FİYAT ARALIĞI</div>
          <div style="font-size:11px;font-weight:900;color:#c4b5fd;">$${fmt(range)}</div>
        </div>
      </div>

      <!-- EN YAKIN DESTEK & DİRENÇ -->
      <div style="background:rgba(12,18,35,0.9);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:12px;margin-bottom:10px;">
        <div style="font-size:10px;font-weight:900;color:rgba(160,140,255,0.90);margin-bottom:10px;">⚡ EN YAKIN DESTEK &amp; DİRENÇ</div>

        ${resistances.length ? `
          <div style="font-size:8px;font-weight:900;color:rgba(255,100,120,0.80);letter-spacing:1px;margin-bottom:5px;">▲ DİRENÇ</div>
          ${resistances.slice(0,2).map(l => {
            const dp = ((l.price-curPrice)/curPrice*100).toFixed(2);
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:9px;background:rgba(255,70,100,0.05);border:1px solid rgba(255,70,100,0.12);margin-bottom:5px;">
              <div style="display:flex;align-items:center;gap:7px;">
                <div style="width:7px;height:7px;border-radius:50%;background:${l.color};"></div>
                <div>
                  <div style="font-size:11px;font-weight:900;color:#ff8090;">${l.label}</div>
                  <div style="font-size:9px;color:rgba(255,180,180,0.65);margin-top:1px;">${l.desc}</div>
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0;margin-left:8px;">
                <div style="font-size:12px;font-weight:900;color:#e2e8f0;">$${fmt(l.price)}</div>
                <div style="font-size:9px;font-weight:900;color:#00e676;">▲ +${dp}%</div>
              </div>
            </div>`;
          }).join('')}
        ` : ''}

        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-radius:9px;background:rgba(100,80,255,0.12);border:1px solid rgba(130,100,255,0.30);margin:6px 0;">
          <span style="font-size:9px;font-weight:900;color:#c4b5fd;">◀ GÜNCEL FİYAT</span>
          <span style="font-size:13px;font-weight:900;color:#c4b5fd;">$${fmt(curPrice)}</span>
        </div>

        ${supports.length ? `
          <div style="font-size:8px;font-weight:900;color:rgba(0,230,118,0.80);letter-spacing:1px;margin-bottom:5px;margin-top:6px;">▼ DESTEK</div>
          ${supports.slice(0,2).map(l => {
            const dp = ((l.price-curPrice)/curPrice*100).toFixed(2);
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:9px;background:rgba(0,230,118,0.05);border:1px solid rgba(0,230,118,0.12);margin-bottom:5px;">
              <div style="display:flex;align-items:center;gap:7px;">
                <div style="width:7px;height:7px;border-radius:50%;background:${l.color};"></div>
                <div>
                  <div style="font-size:11px;font-weight:900;color:#60d88a;">${l.label}</div>
                  <div style="font-size:9px;color:rgba(100,255,170,0.65);margin-top:1px;">${l.desc}</div>
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0;margin-left:8px;">
                <div style="font-size:12px;font-weight:900;color:#e2e8f0;">$${fmt(l.price)}</div>
                <div style="font-size:9px;font-weight:900;color:#ff6080;">▼ ${dp}%</div>
              </div>
            </div>`;
          }).join('')}
        ` : ''}
      </div>

      ${sectionTitle('📉','GERİ ÇEKİLME SEVİYELERİ','rgba(160,140,255,0.85)')}
      ${retraceLevels.map(l => renderLevel(l)).join('')}

      ${sectionTitle('🚀','HEDEF SEVİYELERİ','rgba(0,220,180,0.85)')}
      ${extLevels.map(l => renderLevel(l)).join('')}

      <button onclick="fiboRun()" style="width:100%;padding:13px;border-radius:14px;border:1px solid rgba(120,80,255,0.25);border-top-color:rgba(160,120,255,0.40);background:linear-gradient(145deg,rgba(100,60,255,0.08),rgba(60,20,180,0.04));color:#c4b5fd;font-size:11px;font-weight:900;letter-spacing:1.5px;cursor:pointer;margin:14px 0 24px;">
        🔄 YENİLE
      </button>`;

    result.style.display = '';

  } catch(e) {
    result.innerHTML = `<div style="text-align:center;padding:40px 0;">
      <div style="font-size:40px;margin-bottom:14px;">⚠️</div>
      <div style="font-size:11px;font-weight:900;color:#ff4664;letter-spacing:1px;margin-bottom:8px;">HATA OLUŞTU</div>
      <div style="font-size:11px;color:#4a6a8a;">${e.message||'API bağlantı hatası'}</div>
      <button onclick="fiboRun()" style="margin-top:16px;padding:10px 20px;border-radius:12px;border:1px solid rgba(120,80,255,0.25);background:rgba(100,60,255,0.08);color:#c4b5fd;font-size:11px;font-weight:900;cursor:pointer;">Tekrar Dene</button>
    </div>`;
    result.style.display = '';
  }

  loading.style.display = 'none';
  btn.disabled = false;
  btn.style.opacity = '1';
}
// ===================== / AUTO FİBONACCİ MODÜLÜ =====================


