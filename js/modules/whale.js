/* Doruk module: whale.js */
// ===================== WHALE TRACKER MODÜLÜ =====================
let whaleCurrentSymbol = 'BTCUSDT';
let whaleThreshold = 10000;
let whaleAllSymbols = [];
let whaleSearchTimer = null;

async function whaleInit() {
  if (whaleAllSymbols.length > 0) return;
  try {
    const resp = await fetch('https://api.binance.com/api/v3/ticker/24hr?type=MINI', {mode:'cors',credentials:'omit'});
    const all = await resp.json();
    whaleAllSymbols = all
      .filter(t => t.symbol.endsWith('USDT') && !t.symbol.includes('DOWN') && !t.symbol.includes('UP') && !t.symbol.includes('BEAR') && !t.symbol.includes('BULL') && parseFloat(t.quoteVolume) > 1000000)
      .sort((a,b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .map(t => ({ symbol:t.symbol, lastPrice:parseFloat(t.lastPrice), chgPct:parseFloat(t.priceChangePercent)||0 }));
  } catch(e) {}
}

function whaleOnInput(val) {
  clearTimeout(whaleSearchTimer);
  const dd = document.getElementById('whaleDropdown');
  if (!val.trim()) { dd.style.display='none'; return; }
  whaleSearchTimer = setTimeout(() => {
    const q = val.toUpperCase();
    const matches = whaleAllSymbols.filter(m => m.symbol.startsWith(q)||m.symbol.includes(q)).slice(0,5);
    if (!matches.length) { dd.style.display='none'; return; }
    dd.innerHTML = matches.map(m => {
      const name = m.symbol.replace('USDT','');
      const color = m.chgPct>=0?'#00e676':'#ff4664';
      const sign  = m.chgPct>=0?'+':'';
      return `<div onclick="whaleSelectCoin('${m.symbol}')" style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;border-bottom:1px solid rgba(0,180,255,0.06);transition:background 0.15s;" onmouseenter="this.style.background='rgba(0,100,200,0.10)'" onmouseleave="this.style.background='transparent'">
        <span style="font-size:12px;font-weight:800;color:#e2e8f0;">${name}</span>
        <span style="font-size:11px;font-weight:700;color:${color};">${sign}${m.chgPct.toFixed(2)}%</span>
      </div>`;
    }).join('');
    dd.style.display = '';
  }, 200);
}

function whaleSelectCoin(symbol) {
  whaleCurrentSymbol = symbol;
  document.getElementById('whaleInput').value = symbol.replace('USDT','');
  document.getElementById('whaleDropdown').style.display = 'none';
}

function whaleSetThresh(val, el) {
  whaleThreshold = val;
  document.querySelectorAll('.whale-thresh-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function whaleFmt(n) {
  if (n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

function whaleTimeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return sec + 's önce';
  if (sec < 3600) return Math.floor(sec/60) + 'dk önce';
  return Math.floor(sec/3600) + 'sa önce';
}

let whaleCurrentMode = 'gunluk';

function whaleSetMode(mode) {
  whaleCurrentMode = mode;
}

function whaleModeRun() {
  if (whaleCurrentMode === 'gunluk') whaleGunlukRun();
  else whaleRun();
}

async function whaleGunlukRun() {
  const symbol  = whaleCurrentSymbol;
  const result  = document.getElementById('whaleResult');
  const loading = document.getElementById('whaleLoading');
  const btn     = document.getElementById('whaleRunBtn');

  result.style.display = 'none';
  loading.style.display = '';
  btn.disabled = true;
  btn.style.opacity = '0.6';

  try {
    const name = symbol.replace('USDT','');

    // Bugün gece 00:00 Türkiye saati (UTC+3) timestamp
    const now = Date.now();
    const TR_OFFSET = 3 * 3600000; // UTC+3
    const nowTR = new Date(now + TR_OFFSET);
    nowTR.setUTCHours(0, 0, 0, 0);
    const startTime = nowTR.getTime() - TR_OFFSET; // UTC'ye çevir

    // Saatlik klines (bugün) + ticker paralel çek
    const [klines, ticker] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&startTime=${startTime}&limit=24`).then(r=>r.json()),
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`).then(r=>r.json()),
    ]);

    if (!Array.isArray(klines) || !klines.length) throw new Error('Veri alınamadı.');

    const curPrice = parseFloat(ticker.lastPrice);
    const chgPct   = parseFloat(ticker.priceChangePercent);
    const dec      = curPrice<0.01?6:curPrice<1?4:curPrice<100?3:2;
    const chgColor = chgPct>=0?'#00e676':'#ff4664';
    const chgSign  = chgPct>=0?'+':'';
    const fmtP     = p => p.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});

    // Saatlik verileri işle
    const hours = klines.map(k => ({
      openTime:  k[0],
      open:      parseFloat(k[1]),
      high:      parseFloat(k[2]),
      low:       parseFloat(k[3]),
      close:     parseFloat(k[4]),
      vol:       parseFloat(k[5]),       // coin hacmi
      quoteVol:  parseFloat(k[7]),       // USDT hacmi
      trades:    parseInt(k[8]),
      buyVol:    parseFloat(k[9]),       // alım coin hacmi
      buyQuote:  parseFloat(k[10]),      // alım USDT hacmi
    }));

    // Toplam günlük
    const totalVol   = hours.reduce((s,h)=>s+h.quoteVol,0);
    const totalTrades= hours.reduce((s,h)=>s+h.trades,0);
    const totalBuy   = hours.reduce((s,h)=>s+h.buyQuote,0);
    const totalSell  = totalVol - totalBuy;
    const buyPct     = totalVol>0 ? (totalBuy/totalVol*100) : 50;

    // En yüksek hacimli saat
    const maxVolHour = hours.reduce((a,b)=>b.quoteVol>a.quoteVol?b:a, hours[0]);
    // En yüksek fiyat saati
    const maxHighHour= hours.reduce((a,b)=>b.high>a.high?b:a, hours[0]);
    // En düşük fiyat saati
    const minLowHour = hours.reduce((a,b)=>b.low<a.low?b:a, hours[0]);

    const TR_OFFSET_H = 3; // UTC+3 Türkiye
    const hrLabel = ts => {
      const d = new Date(ts);
      const trHour = (d.getUTCHours() + TR_OFFSET_H) % 24;
      return trHour.toString().padStart(2,'0')+':00';
    };

    // Alım/satım baskısı
    const pressure = buyPct>=65?{label:'💪 Alım Baskısı',color:'#00e676'}
                   : buyPct<=35?{label:'🔻 Satım Baskısı',color:'#ff4664'}
                   : {label:'⚖️ Dengeli',color:'#fbbf24'};

    // Saatlik ısı haritası rengi
    const heatColor = h => {
      // Sıfır hacimli mum (gece yarısı sıfırlanma): gri göster
      if (h.quoteVol <= 0) return '#3d5a72';
      const bp = (h.buyQuote/h.quoteVol*100);
      if (bp>=65) return '#00e676';
      if (bp>=55) return '#4ade80';
      if (bp>=45) return '#fbbf24';
      if (bp>=35) return '#fb923c';
      return '#ff4664';
    };

    const maxHourVol = Math.max(...hours.map(h=>h.quoteVol));

    result.innerHTML = `
      <!-- Başlık Kart -->
      <div style="padding:14px;border-radius:16px;background:linear-gradient(145deg,rgba(4,14,36,0.98),rgba(2,8,22,0.99));border:1px solid rgba(0,180,255,0.16);border-top-color:rgba(56,189,248,0.36);margin-bottom:12px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:15%;right:15%;height:1px;background:linear-gradient(90deg,transparent,rgba(56,189,248,0.50),transparent);"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:rgba(125,211,252,0.60);">${name} / USDT — BUGÜN</div>
            <div style="font-size:24px;font-weight:900;color:#e2e8f0;margin-top:2px;">$${fmtP(curPrice)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;font-weight:900;color:${chgColor};">${chgSign}${chgPct.toFixed(2)}%</div>
            <div style="font-size:9px;color:#4a6a8a;margin-top:2px;">24 Saat Değişim</div>
          </div>
        </div>
        <!-- Alım/Satım Çubuğu -->
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <span style="font-size:9px;font-weight:900;color:#00e676;">▲ ALIM ${whaleFmt(totalBuy)}</span>
            <span style="font-size:10px;font-weight:900;color:${pressure.color};">${pressure.label}</span>
            <span style="font-size:9px;font-weight:900;color:#ff4664;">SATIM ${whaleFmt(totalSell)} ▼</span>
          </div>
          <div style="height:8px;background:rgba(255,70,100,0.25);border-radius:8px;overflow:hidden;">
            <div style="height:100%;width:${buyPct.toFixed(1)}%;background:linear-gradient(90deg,rgba(0,230,118,0.70),rgba(0,230,118,0.90));border-radius:8px;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;">
            <span style="font-size:8px;color:rgba(0,230,118,0.60);">%${buyPct.toFixed(1)} Alım</span>
            <span style="font-size:8px;color:rgba(255,70,100,0.60);">%${(100-buyPct).toFixed(1)} Satım</span>
          </div>
        </div>
      </div>

      <!-- 3 Özet Kart -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
        <div style="padding:12px 8px;border-radius:14px;background:linear-gradient(145deg,rgba(4,14,36,0.98),rgba(2,8,22,0.99));border:1px solid rgba(0,230,118,0.20);text-align:center;">
          <div style="font-size:16px;margin-bottom:4px;">📈</div>
          <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:4px;">GÜNÜN EN YÜKSEK</div>
          <div style="font-size:12px;font-weight:900;color:#00e676;">$${fmtP(parseFloat(ticker.highPrice))}</div>
          <div style="font-size:8px;color:rgba(0,230,118,0.50);margin-top:2px;">${hrLabel(maxHighHour.openTime)}</div>
        </div>
        <div style="padding:12px 8px;border-radius:14px;background:linear-gradient(145deg,rgba(4,14,36,0.98),rgba(2,8,22,0.99));border:1px solid rgba(125,211,252,0.20);text-align:center;">
          <div style="font-size:16px;margin-bottom:4px;">💰</div>
          <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:4px;">TOPLAM HACİM</div>
          <div style="font-size:12px;font-weight:900;color:#7dd3fc;">${whaleFmt(totalVol)}</div>
          <div style="font-size:8px;color:rgba(125,211,252,0.50);margin-top:2px;">${totalTrades.toLocaleString('en-US')} işlem</div>
        </div>
        <div style="padding:12px 8px;border-radius:14px;background:linear-gradient(145deg,rgba(4,14,36,0.98),rgba(2,8,22,0.99));border:1px solid rgba(255,70,100,0.20);text-align:center;">
          <div style="font-size:16px;margin-bottom:4px;">📉</div>
          <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:4px;">GÜNÜN EN DÜŞÜK</div>
          <div style="font-size:12px;font-weight:900;color:#ff4664;">$${fmtP(parseFloat(ticker.lowPrice))}</div>
          <div style="font-size:8px;color:rgba(255,70,100,0.50);margin-top:2px;">${hrLabel(minLowHour.openTime)}</div>
        </div>
      </div>


      <!-- En Yoğun Saat Detayı -->
      <div style="padding:14px;border-radius:16px;background:linear-gradient(145deg,rgba(4,14,36,0.98),rgba(2,8,22,0.99));border:1px solid rgba(251,191,36,0.25);margin-bottom:12px;">
        <div style="font-size:9px;font-weight:900;letter-spacing:1.5px;color:rgba(251,191,36,0.80);margin-bottom:10px;">⭐ EN YOĞUN SAAT — ${hrLabel(maxVolHour.openTime)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px;">
            <div style="font-size:8px;font-weight:900;color:#4a6a8a;margin-bottom:3px;">HACİM</div>
            <div style="font-size:14px;font-weight:900;color:#fbbf24;">${whaleFmt(maxVolHour.quoteVol)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px;">
            <div style="font-size:8px;font-weight:900;color:#4a6a8a;margin-bottom:3px;">İŞLEM SAYISI</div>
            <div style="font-size:14px;font-weight:900;color:#fbbf24;">${maxVolHour.trades.toLocaleString('en-US')}</div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px;">
            <div style="font-size:8px;font-weight:900;color:#4a6a8a;margin-bottom:3px;">ALIM HACMİ</div>
            <div style="font-size:14px;font-weight:900;color:#00e676;">${whaleFmt(maxVolHour.buyQuote)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px;">
            <div style="font-size:8px;font-weight:900;color:#4a6a8a;margin-bottom:3px;">SATIM HACMİ</div>
            <div style="font-size:14px;font-weight:900;color:#ff4664;">${whaleFmt(maxVolHour.quoteVol-maxVolHour.buyQuote)}</div>
          </div>
        </div>
      </div>

      <!-- Saatlik Tablo — YENİ TASARIM -->
      <div style="border-radius:16px;background:linear-gradient(145deg,rgba(4,14,36,0.98),rgba(2,8,22,0.99));border:1px solid rgba(0,180,255,0.12);margin-bottom:12px;overflow:hidden;">

        <!-- Başlık -->
        <div style="padding:12px 14px 10px;border-bottom:1px solid rgba(0,180,255,0.10);">
          <div style="font-size:9px;font-weight:900;letter-spacing:1.5px;color:rgba(125,211,252,0.70);margin-bottom:8px;">📊 SAATLİK ÖZET</div>
          <!-- Legend -->
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <span style="display:flex;align-items:center;gap:4px;font-size:8px;color:#00e676;"><span style="width:7px;height:7px;border-radius:50%;background:#00e676;display:inline-block;"></span>Güçlü alım</span>
            <span style="display:flex;align-items:center;gap:4px;font-size:8px;color:#00d4ff;"><span style="width:7px;height:7px;border-radius:50%;background:#00d4ff;display:inline-block;"></span>Hafif alım</span>
            <span style="display:flex;align-items:center;gap:4px;font-size:8px;color:#7aa0c4;"><span style="width:7px;height:7px;border-radius:50%;background:#7aa0c4;display:inline-block;"></span>Dengeli</span>
            <span style="display:flex;align-items:center;gap:4px;font-size:8px;color:#fb923c;"><span style="width:7px;height:7px;border-radius:50%;background:#fb923c;display:inline-block;"></span>Hafif satım</span>
            <span style="display:flex;align-items:center;gap:4px;font-size:8px;color:#ff4664;"><span style="width:7px;height:7px;border-radius:50%;background:#ff4664;display:inline-block;"></span>Güçlü satım</span>
          </div>
        </div>

        <!-- İpucu kutusu -->
        <div style="margin:10px 14px;padding:8px 10px;background:rgba(255,214,0,0.06);border:1px solid rgba(255,214,0,0.15);border-radius:10px;font-size:9px;color:#ffd600;font-weight:700;line-height:1.55;">
          💡 <span style="color:rgba(255,255,255,0.75);">Bar uzunluğu = ne kadar para döndü &nbsp;|&nbsp; Bar rengi = hangi yöne aktı</span><br>
          <span style="color:rgba(255,214,0,0.75);">Büyük hacim + hafif alım olabilir. Az hacim + güçlü alım olabilir. İkisi bağımsız!</span>
        </div>

        <!-- Kolon başlıkları -->
        <div style="display:grid;grid-template-columns:44px 1fr 64px 88px;gap:6px;align-items:center;padding:6px 14px;border-top:1px solid rgba(0,180,255,0.07);border-bottom:1px solid rgba(0,180,255,0.07);">
          <div style="font-size:8px;color:#4a6a8a;font-weight:700;letter-spacing:1px;">SAAT</div>
          <div style="font-size:8px;color:#4a6a8a;font-weight:700;letter-spacing:1px;">HACİM BÜYÜKLÜĞÜ →</div>
          <div style="font-size:8px;color:#4a6a8a;font-weight:700;text-align:right;">MİKTAR</div>
          <div style="font-size:8px;color:#4a6a8a;font-weight:700;text-align:right;">YÖN</div>
        </div>

        <!-- Satırlar -->
        ${hours.slice().reverse().map(h => {
          const isEmpty = h.quoteVol <= 0;
          const bp = isEmpty ? 50 : (h.buyQuote / h.quoteVol * 100);
          const isMaxH = h.openTime === maxVolHour.openTime;
          const isStrongBuy = bp >= 65;

          // Renk & etiket
          let col, badgeLabel, badgeBg;
          if (isEmpty) {
            col = '#3d5a72'; badgeLabel = '⏳ Veri yok'; badgeBg = 'rgba(61,90,114,0.15)';
          } else if (bp >= 65) {
            col = '#00e676'; badgeLabel = '💪 Güçlü alım'; badgeBg = 'rgba(0,230,118,0.12)';
          } else if (bp >= 55) {
            col = '#00d4ff'; badgeLabel = '🔵 Hafif alım'; badgeBg = 'rgba(0,212,255,0.12)';
          } else if (bp >= 45) {
            col = '#4a6a8a'; badgeLabel = '⚖️ Dengeli';    badgeBg = 'rgba(74,106,138,0.15)';
          } else if (bp >= 35) {
            col = '#fb923c'; badgeLabel = '🟠 Hafif satım'; badgeBg = 'rgba(251,146,60,0.12)';
          } else {
            col = '#ff4664'; badgeLabel = '🔴 Güçlü satım'; badgeBg = 'rgba(255,70,100,0.12)';
          }

          const barW = maxHourVol > 0 ? Math.max(2, (h.quoteVol / maxHourVol * 100)).toFixed(1) : 2;
          const sellVol = h.quoteVol - h.buyQuote;
          const hrStr = hrLabel(h.openTime);

          // Modal için data
          const modalData = JSON.stringify({
            hr: hrStr,
            bp: bp.toFixed(1),
            col: col,
            badgeLabel: badgeLabel,
            quoteVol: whaleFmt(h.quoteVol),
            buyQuote: whaleFmt(h.buyQuote),
            sellVol: whaleFmt(sellVol),
            trades: h.trades.toLocaleString('en-US'),
            open: fmtP(h.open),
            close: fmtP(h.close),
            high: fmtP(h.high),
            low: fmtP(h.low),
            isStrongBuy: isStrongBuy,
            isMaxH: isMaxH
          }).replace(/'/g, '&#39;');

          return `<div onclick="whaleHourModal(${h.openTime})" style="display:grid;grid-template-columns:44px 1fr 64px 88px;gap:6px;align-items:center;padding:10px 14px;border-bottom:1px solid rgba(0,180,255,0.04);position:relative;cursor:pointer;transition:background 0.15s;${isMaxH ? 'background:rgba(0,230,118,0.035);border-left:2px solid #00e676;' : isStrongBuy ? 'background:rgba(0,230,118,0.018);' : ''}active:background:rgba(255,255,255,0.05);"
            onmousedown="this.style.background='rgba(255,255,255,0.05)'" onmouseup="this.style.background='${isMaxH ? 'rgba(0,230,118,0.035)' : isStrongBuy ? 'rgba(0,230,118,0.018)' : ''}'"
            ontouchstart="this.style.background='rgba(255,255,255,0.05)'" ontouchend="this.style.background='${isMaxH ? 'rgba(0,230,118,0.035)' : isStrongBuy ? 'rgba(0,230,118,0.018)' : ''}'">
            <div style="font-size:12px;font-weight:900;color:${isMaxH ? '#00e676' : '#7aa0c4'};position:relative;min-width:44px;">
              ${hrStr}
            </div>
            <div style="height:10px;background:rgba(255,255,255,0.04);border-radius:99px;overflow:hidden;">
              <div style="height:100%;width:${isStrongBuy ? Math.min(100, parseFloat(barW) * 1.35).toFixed(1) : barW}%;background:${isStrongBuy ? 'linear-gradient(90deg,#00c853,#00e676,#69ff7d)' : col};border-radius:99px;opacity:${isStrongBuy ? '1' : '0.85'};${isStrongBuy ? 'box-shadow:0 0 8px rgba(0,230,118,0.6);' : ''}"></div>
            </div>
            <div style="font-size:11px;font-weight:900;color:#e2e8f0;text-align:right;">${whaleFmt(h.quoteVol)}</div>
            <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
              ${isMaxH ? `<span style="display:inline-block;font-size:8px;font-weight:900;color:#fbbf24;background:rgba(251,191,36,0.12);padding:3px 6px;border-radius:99px;border:1px solid rgba(251,191,36,0.30);white-space:nowrap;letter-spacing:0.5px;">⭐ EN YOĞUN</span>` : ''}
              <span style="display:inline-block;font-size:8px;font-weight:800;color:${col};background:${badgeBg};padding:3px 6px;border-radius:99px;border:1px solid ${col}30;white-space:nowrap;">${badgeLabel}</span>
              <span class="wh-tap-hint">👆 Detay için dokun</span>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div style="text-align:center;margin:16px 0 8px;font-size:9px;color:#4a6a8a;font-weight:700;letter-spacing:1px;">
        Son güncelleme: ${new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})} TR
      </div>
      <button onclick="whaleGunlukRun()" style="width:100%;padding:13px;border-radius:14px;border:1px solid rgba(0,180,255,0.22);border-top-color:rgba(56,189,248,0.38);background:linear-gradient(145deg,rgba(3,105,161,0.08),rgba(12,26,58,0.04));color:#7dd3fc;font-size:11px;font-weight:900;letter-spacing:1.5px;cursor:pointer;margin-bottom:24px;">
        🔄 YENİLE
      </button>
    `;

    // Saatlik data'yı global olarak sakla (modal için)
    window._whaleHours = hours;
    window._whaleFmt = whaleFmt;
    window._whaleFmtP = fmtP;
    window._whaleHrLabel = hrLabel;
    window._whaleMaxVolHour = maxVolHour;

    result.style.display = '';
  } catch(e) {
    result.innerHTML = `<div style="text-align:center;padding:40px 0;">
      <div style="font-size:40px;margin-bottom:14px;">⚠️</div>
      <div style="font-size:11px;font-weight:900;color:#ff4664;letter-spacing:1px;margin-bottom:8px;">HATA OLUŞTU</div>
      <div style="font-size:11px;color:#4a6a8a;">${e.message||'API bağlantı hatası'}</div>
      <button onclick="whaleGunlukRun()" style="margin-top:16px;padding:10px 20px;border-radius:12px;border:1px solid rgba(0,180,255,0.22);background:rgba(3,105,161,0.08);color:#7dd3fc;font-size:11px;font-weight:900;cursor:pointer;">Tekrar Dene</button>
    </div>`;
    result.style.display = '';
  }

  loading.style.display = 'none';
  btn.disabled = false;
  btn.style.opacity = '1';
}

function whaleHourModalClose() {
  const bg = document.getElementById('whaleHourModalBg');
  const box = document.getElementById('whaleHourModalBox');
  if (!bg) return;
  box.style.transform = 'translateY(100%)';
  bg.style.opacity = '0';
  setTimeout(() => { bg && bg.remove(); }, 340);
}

function whaleHourModal(openTime) {
  const hours = window._whaleHours;
  if (!hours) return;
  const h = hours.find(x => x.openTime === openTime);
  if (!h) return;

  const wf = window._whaleFmt || (v => '$'+v.toFixed(0));
  const fp = window._whaleFmtP || (v => v.toFixed(2));
  const hl = window._whaleHrLabel || (ts => new Date(ts).getHours()+':00');
  const maxVH = window._whaleMaxVolHour;

  const bp = h.quoteVol > 0 ? (h.buyQuote / h.quoteVol * 100) : 50;
  const sellVol = h.quoteVol - h.buyQuote;
  const isMaxH = maxVH && h.openTime === maxVH.openTime;
  const isStrongBuy = bp >= 65;

  let col, badgeLabel, badgeBg;
  if (bp >= 65)      { col='#00e676'; badgeLabel='💪 Güçlü alım'; badgeBg='rgba(0,230,118,0.12)'; }
  else if (bp >= 55) { col='#00d4ff'; badgeLabel='🔵 Hafif alım'; badgeBg='rgba(0,212,255,0.12)'; }
  else if (bp >= 45) { col='#4a6a8a'; badgeLabel='⚖️ Dengeli';    badgeBg='rgba(74,106,138,0.15)'; }
  else if (bp >= 35) { col='#fb923c'; badgeLabel='🟠 Hafif satım'; badgeBg='rgba(251,146,60,0.12)'; }
  else               { col='#ff4664'; badgeLabel='🔴 Güçlü satım'; badgeBg='rgba(255,70,100,0.12)'; }

  const pchg = h.open > 0 ? ((h.close - h.open) / h.open * 100) : 0;
  const pchgColor = pchg >= 0 ? '#00e676' : '#ff4664';
  const hrStr = hl(openTime);

  // Varsa önceki modalı kaldır
  const oldBg = document.getElementById('whaleHourModalBg');
  if (oldBg) oldBg.remove();

  // Modal'ı body'e ekle
  const bg = document.createElement('div');
  bg.id = 'whaleHourModalBg';
  bg.onclick = whaleHourModalClose;
  bg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:2147483647;backdrop-filter:blur(4px);opacity:0;transition:opacity 0.25s;';

  const box = document.createElement('div');
  box.id = 'whaleHourModalBox';
  box.onclick = e => e.stopPropagation();
  box.style.cssText = 'position:fixed;bottom:56px;left:0;right:0;background:linear-gradient(160deg,#060d1a,#040810);border-radius:22px 22px 22px 22px;border:1px solid rgba(0,180,255,0.20);border-top-color:rgba(56,189,248,0.40);padding:20px 18px 0;max-height:82vh;overflow:hidden;display:flex;flex-direction:column;transform:translateY(calc(100% + 56px));transition:transform 0.32s cubic-bezier(0.32,0.72,0,1);';

  box.innerHTML = `
    <div style="width:36px;height:4px;background:rgba(255,255,255,0.15);border-radius:99px;margin:0 auto 16px;flex-shrink:0;"></div>
    <div id="whaleHourModalContent" style="overflow-y:auto;flex:1;padding-bottom:8px;"></div>
    <div style="flex-shrink:0;padding:12px 0 32px;background:linear-gradient(160deg,#060d1a,#040810);">
      <button onclick="whaleHourModalClose()" style="width:100%;padding:13px;border-radius:14px;border:1px solid rgba(0,180,255,0.22);background:rgba(3,105,161,0.08);color:#7dd3fc;font-size:11px;font-weight:900;letter-spacing:1px;cursor:pointer;">Kapat</button>
    </div>
  `;

  bg.appendChild(box);
  document.body.appendChild(bg);

  document.getElementById('whaleHourModalContent').innerHTML = `
    <!-- Başlık -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;">
        ${isStrongBuy ? '<span style="font-size:22px;line-height:1;">⭐</span>' : ''}
        <div>
          <div style="font-size:22px;font-weight:900;color:#e2e8f0;">${hrStr}</div>
          <div style="font-size:9px;color:#4a6a8a;font-weight:700;letter-spacing:1px;margin-top:2px;">SAATLİK DETAY${isMaxH ? ' — EN YOĞUN SAAT' : ''}</div>
        </div>
      </div>
      <span style="display:inline-block;font-size:10px;font-weight:900;color:${col};background:${badgeBg};padding:6px 10px;border-radius:99px;border:1px solid ${col}40;">${badgeLabel}</span>
    </div>

    <!-- Alım/Satım Bar -->
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
        <span style="font-size:9px;font-weight:900;color:#00e676;">▲ ALIM ${wf(h.buyQuote)}</span>
        <span style="font-size:10px;font-weight:900;color:${col};">%${bp.toFixed(1)} Alım</span>
        <span style="font-size:9px;font-weight:900;color:#ff4664;">SATIM ${wf(sellVol)} ▼</span>
      </div>
      <div style="height:10px;background:rgba(255,70,100,0.25);border-radius:8px;overflow:hidden;">
        <div style="height:100%;width:${bp.toFixed(1)}%;background:linear-gradient(90deg,${col}aa,${col});border-radius:8px;transition:width 0.6s;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;">
        <span style="font-size:8px;color:rgba(0,230,118,0.60);">%${bp.toFixed(1)}</span>
        <span style="font-size:8px;color:rgba(255,70,100,0.60);">%${(100-bp).toFixed(1)}</span>
      </div>
    </div>

    <!-- Hacim & İşlem -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;">
        <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:3px;">💰 TOPLAM HACİM</div>
        <div style="font-size:16px;font-weight:900;color:#7dd3fc;">${wf(h.quoteVol)}</div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;">
        <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:3px;">🔢 İŞLEM SAYISI</div>
        <div style="font-size:16px;font-weight:900;color:#c4b5fd;">${h.trades.toLocaleString('en-US')}</div>
      </div>
      <div style="background:rgba(0,230,118,0.06);border-radius:12px;padding:12px;border:1px solid rgba(0,230,118,0.15);">
        <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:3px;">📈 ALIM HACMİ</div>
        <div style="font-size:16px;font-weight:900;color:#00e676;">${wf(h.buyQuote)}</div>
      </div>
      <div style="background:rgba(255,70,100,0.06);border-radius:12px;padding:12px;border:1px solid rgba(255,70,100,0.15);">
        <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:3px;">📉 SATIM HACMİ</div>
        <div style="font-size:16px;font-weight:900;color:#ff4664;">${wf(sellVol)}</div>
      </div>
    </div>

    <!-- Fiyat Detayları -->
    <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:12px;border:1px solid rgba(0,180,255,0.10);">
      <div style="font-size:9px;font-weight:900;color:rgba(125,211,252,0.60);letter-spacing:1px;margin-bottom:10px;">💹 FİYAT HAREKETİ</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <div style="font-size:8px;color:#4a6a8a;font-weight:700;margin-bottom:2px;">AÇILIŞ</div>
          <div style="font-size:13px;font-weight:900;color:#e2e8f0;">$${fp(h.open)}</div>
        </div>
        <div>
          <div style="font-size:8px;color:#4a6a8a;font-weight:700;margin-bottom:2px;">KAPANIŞ</div>
          <div style="font-size:13px;font-weight:900;color:${pchgColor};">$${fp(h.close)} <span style="font-size:10px;">${pchg>=0?'+':''}${pchg.toFixed(2)}%</span></div>
        </div>
        <div>
          <div style="font-size:8px;color:#4a6a8a;font-weight:700;margin-bottom:2px;">EN YÜKSEK</div>
          <div style="font-size:13px;font-weight:900;color:#00e676;">$${fp(h.high)}</div>
        </div>
        <div>
          <div style="font-size:8px;color:#4a6a8a;font-weight:700;margin-bottom:2px;">EN DÜŞÜK</div>
          <div style="font-size:13px;font-weight:900;color:#ff4664;">$${fp(h.low)}</div>
        </div>
      </div>
    </div>

    <button onclick="whaleHourModalClose()" style="display:none;"></button>
  `;

  // Animasyonu başlat
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bg.style.opacity = '1';
      box.style.transform = 'translateY(0)';
    });
  });
}

async function whaleRun() {
  const symbol = whaleCurrentSymbol;
  const result  = document.getElementById('whaleResult');
  const loading = document.getElementById('whaleLoading');
  const btn     = document.getElementById('whaleRunBtn');

  result.style.display = 'none';
  loading.style.display = '';
  btn.disabled = true;
  btn.style.opacity = '0.6';

  try {
    // Son 1000 işlemi çek + güncel fiyat
    const [trades, ticker] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=1000`).then(r=>r.json()),
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`).then(r=>r.json()),
    ]);

    if (!Array.isArray(trades) || !trades.length) throw new Error('İşlem verisi alınamadı.');

    const curPrice = parseFloat(ticker.lastPrice);
    const chgPct   = parseFloat(ticker.priceChangePercent);
    const name     = symbol.replace('USDT','');
    const dec      = curPrice<0.01?6:curPrice<1?4:curPrice<100?3:2;
    const chgColor = chgPct>=0?'#00e676':'#ff4664';
    const chgSign  = chgPct>=0?'+':'';

    // 24s gerçek veriler (ticker'dan)
    const vol24h      = parseFloat(ticker.quoteVolume);   // 24s toplam USDT hacmi
    const count24h    = parseInt(ticker.count);           // 24s toplam işlem sayısı
    const high24h     = parseFloat(ticker.highPrice);
    const low24h      = parseFloat(ticker.lowPrice);
    const vol24hCoin  = parseFloat(ticker.volume);        // 24s coin miktarı

    // Büyük işlemleri filtrele
    const bigTrades = trades
      .map(t => ({
        price:    parseFloat(t.price),
        qty:      parseFloat(t.qty),
        value:    parseFloat(t.price) * parseFloat(t.qty),
        isBuy:    !t.isBuyerMaker, // isBuyerMaker=true → satıcı agresif → SATIŞ
        time:     t.time,
        id:       t.id,
      }))
      .filter(t => t.value >= whaleThreshold)
      .sort((a,b) => b.time - a.time)
      .slice(0, 100);

    // İstatistikler
    const totalBuyVol  = bigTrades.filter(t=>t.isBuy).reduce((s,t)=>s+t.value,0);
    const totalSellVol = bigTrades.filter(t=>!t.isBuy).reduce((s,t)=>s+t.value,0);
    const buyCount     = bigTrades.filter(t=>t.isBuy).length;
    const sellCount    = bigTrades.filter(t=>!t.isBuy).length;
    const totalVol     = totalBuyVol + totalSellVol;
    const buyPct       = totalVol > 0 ? (totalBuyVol / totalVol * 100) : 50;
    const pressure     = buyPct >= 65 ? { label:'💪 Alım Baskısı', color:'#00e676' }
                       : buyPct <= 35 ? { label:'🔻 Satım Baskısı', color:'#ff4664' }
                       : { label:'⚖️ Dengeli', color:'#fbbf24' };
    const maxVal = bigTrades.length ? Math.max(...bigTrades.map(t=>t.value)) : 0;

    const fmtP = p => p.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});

    result.innerHTML = `
      <!-- Özet Kart -->
      <div style="padding:14px;border-radius:16px;background:linear-gradient(145deg,rgba(4,14,36,0.98),rgba(2,8,22,0.99));border:1px solid rgba(0,180,255,0.16);border-top-color:rgba(56,189,248,0.36);margin-bottom:12px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:15%;right:15%;height:1px;background:linear-gradient(90deg,transparent,rgba(56,189,248,0.50),transparent);"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:rgba(125,211,252,0.60);">${name} / USDT</div>
            <div style="font-size:24px;font-weight:900;color:#e2e8f0;margin-top:2px;">$${fmtP(curPrice)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;font-weight:900;color:${chgColor};">${chgSign}${chgPct.toFixed(2)}%</div>
            <div style="font-size:9px;color:#4a6a8a;margin-top:2px;">24 Saat Değişim</div>
          </div>
        </div>
        ${bigTrades.length === 0 ? `
          <div style="text-align:center;padding:16px 0;color:#4a6a8a;font-size:11px;font-weight:700;">
            Bu eşiğin üzerinde işlem bulunamadı.<br>Daha düşük bir eşik deneyin.
          </div>
        ` : `
        <!-- Alım/Satım Çubuğu -->
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <span style="font-size:9px;font-weight:900;color:#00e676;">▲ ALIM ${whaleFmt(totalBuyVol)} (${buyCount} işlem)</span>
            <span style="font-size:9px;font-weight:900;color:#ff4664;">SATIM ${whaleFmt(totalSellVol)} (${sellCount} işlem) ▼</span>
          </div>
          <div style="height:8px;background:rgba(255,70,100,0.25);border-radius:8px;overflow:hidden;">
            <div style="height:100%;width:${buyPct.toFixed(1)}%;background:linear-gradient(90deg,rgba(0,230,118,0.70),rgba(0,230,118,0.90));border-radius:8px;transition:width 0.6s;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;">
            <span style="font-size:8px;color:rgba(0,230,118,0.60);">%${buyPct.toFixed(1)} Alım</span>
            <span style="font-size:10px;font-weight:900;color:${pressure.color};">${pressure.label}</span>
            <span style="font-size:8px;color:rgba(255,70,100,0.60);">%${(100-buyPct).toFixed(1)} Satım</span>
          </div>
        </div>
        <!-- Özet rakamlar -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px 6px;text-align:center;">
            <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:2px;">TOPLAM İŞLEM</div>
            <div style="font-size:13px;font-weight:900;color:#e2e8f0;">${bigTrades.length}</div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px 6px;text-align:center;">
            <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:2px;">TOPLAM HACİM</div>
            <div style="font-size:13px;font-weight:900;color:#7dd3fc;">${whaleFmt(totalVol)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px 6px;text-align:center;">
            <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:2px;">EN BÜYÜK</div>
            <div style="font-size:13px;font-weight:900;color:#fbbf24;">${whaleFmt(maxVal)}</div>
          </div>
        </div>`}
      </div>

      <!-- 24 Saat Gerçek Veri Kartı -->
      <div style="padding:14px;border-radius:16px;background:linear-gradient(145deg,rgba(4,14,36,0.98),rgba(2,8,22,0.99));border:1px solid rgba(0,180,255,0.12);margin-bottom:12px;">
        <div style="font-size:9px;font-weight:900;letter-spacing:1.5px;color:rgba(125,211,252,0.70);margin-bottom:10px;">📊 24 SAATLIK GERÇEK VERİ</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 12px;">
            <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:3px;">💰 24S TOPLAM HACİM</div>
            <div style="font-size:14px;font-weight:900;color:#7dd3fc;">${whaleFmt(vol24h)}</div>
            <div style="font-size:8px;color:rgba(125,211,252,0.45);margin-top:2px;">${vol24hCoin.toLocaleString('en-US',{maximumFractionDigits:2})} ${name}</div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 12px;">
            <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:3px;">🔢 24S İŞLEM SAYISI</div>
            <div style="font-size:14px;font-weight:900;color:#c4b5fd;">${count24h.toLocaleString('en-US')}</div>
            <div style="font-size:8px;color:rgba(196,181,253,0.45);margin-top:2px;">Ortalama ${whaleFmt(vol24h/count24h)} / işlem</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 12px;">
            <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:3px;">📈 24S EN YÜKSEK</div>
            <div style="font-size:14px;font-weight:900;color:#00e676;">$${fmtP(high24h)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 12px;">
            <div style="font-size:8px;font-weight:900;color:#4a6a8a;letter-spacing:0.5px;margin-bottom:3px;">📉 24S EN DÜŞÜK</div>
            <div style="font-size:14px;font-weight:900;color:#ff4664;">$${fmtP(low24h)}</div>
          </div>
        </div>
      </div>
      ${bigTrades.length === 0 ? '' : `
      <div style="font-size:9px;font-weight:900;letter-spacing:1px;color:rgba(125,211,252,0.60);margin:14px 0 8px;">
        🐋 BÜYÜK İŞLEMLER — Eşik: ${whaleFmt(whaleThreshold)}+
        <span style="color:#4a6a8a;margin-left:6px;">Son 1000 işlemden filtrelendi</span>
      </div>
      ${bigTrades.map(t => {
        const isMega = t.value >= whaleThreshold * 5;
        const cls    = (t.isBuy ? 'buy' : 'sell') + (isMega ? ' mega-'+(t.isBuy?'buy':'sell') : '');
        const side   = t.isBuy ? '🟢 ALIM' : '🔴 SATIM';
        const sideColor = t.isBuy ? '#00e676' : '#ff4664';
        const barW   = Math.max(8, (t.value / maxVal * 100)).toFixed(0);
        return `<div class="whale-trade-row ${cls}">
          ${isMega ? `<div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${sideColor};opacity:0.8;"></div>` : ''}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:11px;font-weight:900;color:${sideColor};">${side}${isMega?' 🔥':''}</span>
              <span style="font-size:12px;font-weight:900;color:#e2e8f0;">${whaleFmt(t.value)}</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
              <span style="font-size:10px;color:#7aa0c4;">$${fmtP(t.price)}</span>
              <span style="font-size:9px;color:#4a6a8a;">${t.qty.toLocaleString('en-US',{maximumFractionDigits:4})} ${name}</span>
              <span style="font-size:9px;color:#4a6a8a;">${whaleTimeAgo(t.time)}</span>
            </div>
            <div style="height:3px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
              <div style="height:100%;width:${barW}%;background:${sideColor}60;border-radius:3px;"></div>
            </div>
          </div>
        </div>`;
      }).join('')}
      `}

      ${bigTrades.length > 0 ? `
      <div style="text-align:center;margin:16px 0 8px;font-size:9px;color:#4a6a8a;font-weight:700;letter-spacing:1px;">
        Son güncelleme: ${new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})} TR
      </div>
      <button onclick="whaleRun()" style="width:100%;padding:13px;border-radius:14px;border:1px solid rgba(0,180,255,0.22);border-top-color:rgba(56,189,248,0.38);background:linear-gradient(145deg,rgba(3,105,161,0.08),rgba(12,26,58,0.04));color:#7dd3fc;font-size:11px;font-weight:900;letter-spacing:1.5px;cursor:pointer;margin-bottom:24px;">
        🔄 YENİLE
      </button>` : ''}`;

    result.style.display = '';

  } catch(e) {
    result.innerHTML = `<div style="text-align:center;padding:40px 0;">
      <div style="font-size:40px;margin-bottom:14px;">⚠️</div>
      <div style="font-size:11px;font-weight:900;color:#ff4664;letter-spacing:1px;margin-bottom:8px;">HATA OLUŞTU</div>
      <div style="font-size:11px;color:#4a6a8a;">${e.message||'API bağlantı hatası'}</div>
      <button onclick="whaleRun()" style="margin-top:16px;padding:10px 20px;border-radius:12px;border:1px solid rgba(0,180,255,0.22);background:rgba(3,105,161,0.08);color:#7dd3fc;font-size:11px;font-weight:900;cursor:pointer;">Tekrar Dene</button>
    </div>`;
    result.style.display = '';
  }

  loading.style.display = 'none';
  btn.disabled = false;
  btn.style.opacity = '1';
}
// ===================== / WHALE TRACKER MODÜLÜ =====================

// ── Custom Confirm (Android WebView'da confirm() çalışmaz) ──
window._dorukConfirmCb = null;
function dorukConfirm(opts) {
  const overlay = document.getElementById('dorukConfirmOverlay');
  if (!overlay) return;
  document.getElementById('dorukConfirmIcon').textContent  = opts.icon  || '❓';
  document.getElementById('dorukConfirmTitle').textContent = opts.title || 'Emin misin?';
  document.getElementById('dorukConfirmMsg').textContent   = opts.msg   || '';
  const okBtn = document.getElementById('dorukConfirmOk');
  okBtn.textContent = opts.okText || 'Evet';
  if (opts.danger) okBtn.classList.add('danger');
  else okBtn.classList.remove('danger');
  overlay.style.display = 'flex';
  window._dorukConfirmCb = function(result) {
    overlay.style.display = 'none';
    window._dorukConfirmCb = null;
    if (opts.cb) opts.cb(result);
  };
}

