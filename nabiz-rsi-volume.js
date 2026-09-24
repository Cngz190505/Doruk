/* Doruk module: nabiz-rsi-volume.js */
/* ---- extracted inline script ---- */

// ===================== PİYASA NABZI MODÜLÜ =====================
let nabizCurrentSymbol = 'BTCUSDT';
let nabizAllSymbols = [];
let nabizSearchTimer = null;

async function nabizInit() {
  if (nabizAllSymbols.length > 0) return;
  try {
    const resp = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', {mode:'cors',credentials:'omit'});
    const all = await resp.json();
    nabizAllSymbols = all
      .filter(t => t.symbol.endsWith('USDT') && !t.symbol.includes('_'))
      .sort((a,b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 200)
      .map(t => ({ symbol: t.symbol, lastPrice: parseFloat(t.lastPrice), chgPct: parseFloat(t.priceChangePercent)||0 }));
  } catch(e) {}
}

function nabizOnInput(val) {
  clearTimeout(nabizSearchTimer);
  const dd = document.getElementById('nabizDropdown');
  if (!val.trim()) { dd.style.display='none'; return; }
  nabizSearchTimer = setTimeout(() => {
    const q = val.toUpperCase();
    const matches = nabizAllSymbols.filter(m => m.symbol.startsWith(q)||m.symbol.includes(q)).slice(0,5);
    if (!matches.length) { dd.style.display='none'; return; }
    dd.innerHTML = matches.map(m => {
      const name = m.symbol.replace('USDT','');
      const color = m.chgPct>=0?'#00e676':'#ff4664';
      const sign  = m.chgPct>=0?'+':'';
      return `<div onclick="nabizSelectCoin('${m.symbol}')" style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;border-bottom:1px solid rgba(139,92,246,0.06);transition:background 0.15s;" onmouseenter="this.style.background='rgba(80,20,160,0.10)'" onmouseleave="this.style.background='transparent'">
        <span style="font-size:12px;font-weight:800;color:#e2e8f0;">${name}</span>
        <span style="font-size:11px;font-weight:700;color:${color};">${sign}${m.chgPct.toFixed(2)}%</span>
      </div>`;
    }).join('');
    dd.style.display = '';
  }, 200);
}

function nabizSelectCoin(symbol) {
  nabizCurrentSymbol = symbol;
  document.getElementById('nabizInput').value = symbol.replace('USDT','');
  document.getElementById('nabizDropdown').style.display = 'none';
}

function nabizFmt(n) {
  if (n >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

async function nabizRun() {
  const symbol = nabizCurrentSymbol;
  const result  = document.getElementById('nabizResult');
  const loading = document.getElementById('nabizLoading');
  const btn     = document.getElementById('nabizRunBtn');
  const name    = symbol.replace('USDT','');

  result.style.display = 'none';
  loading.style.display = '';
  btn.disabled = true;
  btn.style.opacity = '0.6';

  try {
    // Paralel olarak hepsini çek
    const [
      frData,
      oiData,
      lsTopData,
      lsAllData,
      tickerData,
      liqData
    ] = await Promise.allSettled([
      fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`).then(r=>r.json()),
      fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`).then(r=>r.json()),
      fetch(`https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=5m&limit=1`).then(r=>r.json()),
      fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`).then(r=>r.json()),
      fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`).then(r=>r.json()),
      fetch(`https://fapi.binance.com/fapi/v1/forceOrders?symbol=${symbol}&autoCloseType=LIQUIDATION&limit=20`).then(r=>r.json()),
    ]);

    // --- FUNDING RATE ---
    let frHtml = '';
    if (frData.status === 'fulfilled' && Array.isArray(frData.value) && frData.value.length) {
      const fr = parseFloat(frData.value[0].fundingRate) * 100;
      const frAnnual = fr * 3 * 365;
      const frColor = fr > 0.05 ? '#ff4664' : fr < -0.05 ? '#00e676' : '#fbbf24';
      const frSign  = fr >= 0 ? '+' : '';
      const frYorum = fr > 0.1
        ? '🔴 Çok yüksek — piyasa aşırı iyimser. Longlar short\'lara ödüyor. Düzeltme riski yüksek.'
        : fr > 0.03
        ? '🟡 Pozitif — longlar hafif baskıda. Dikkatli ol.'
        : fr < -0.1
        ? '🟢 Çok negatif — piyasa aşırı kötümser. Short\'lar ödüyor. Sıçrama riski var.'
        : fr < -0.03
        ? '🟡 Negatif — short\'lar hafif baskıda.'
        : '⚪ Nötr — piyasa dengeli, belirgin yön yok.';
      const frDurum = fr > 0.05 ? 'LONGLAR FAZLA' : fr < -0.05 ? 'SHORT\'LAR FAZLA' : 'DENGELİ';
      const frDurumColor = fr > 0.05 ? '#ff4664' : fr < -0.05 ? '#00e676' : '#fbbf24';

      // Sonraki funding saatini hesapla
      const nowMs = Date.now();
      const msIn8h = 8 * 3600000;
      const epochStart = 0;
      const nextFunding = epochStart + Math.ceil((nowMs - epochStart) / msIn8h) * msIn8h;
      const diffMs = nextFunding - nowMs;
      const hh = Math.floor(diffMs/3600000);
      const mm = Math.floor((diffMs%3600000)/60000);
      const ss = Math.floor((diffMs%60000)/1000);
      const countdown = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;

      // Piyasa ısısı bar
      const barPct = Math.min(100, Math.max(0, (fr + 0.15) / 0.30 * 100));

      frHtml = `
      <div style="margin-bottom:12px;padding:16px;border-radius:16px;background:linear-gradient(145deg,rgba(18,5,35,0.98),rgba(10,2,20,0.99));border:1px solid rgba(139,92,246,0.18);border-top-color:rgba(168,85,247,0.35);box-shadow:0 4px 20px rgba(0,0,0,0.5);">
        <div style="font-size:9px;font-weight:900;letter-spacing:2px;color:rgba(196,181,253,0.60);margin-bottom:12px;">💰 FUNDING RATE — ${name}/USDT</div>
        <div style="font-size:9px;font-weight:700;color:rgba(196,181,253,0.45);letter-spacing:1px;margin-bottom:4px;">8 SAATLİK ORAN</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:30px;font-weight:900;color:${frColor};letter-spacing:-0.5px;">${frSign}${fr.toFixed(4)}%</div>
          <div style="padding:6px 12px;border-radius:20px;background:rgba(255,70,100,0.12);border:1px solid ${frDurumColor};font-size:10px;font-weight:900;color:${frDurumColor};letter-spacing:0.5px;">⚠ ${frDurum}</div>
        </div>
        <div style="font-size:10px;color:rgba(196,181,253,0.55);margin-bottom:12px;">Yıllık eşdeğer: <strong style="color:#c4b5fd;">~${frSign}${frAnnual.toFixed(1)}%</strong></div>
        <div style="font-size:8px;font-weight:700;color:rgba(196,181,253,0.40);letter-spacing:1px;margin-bottom:6px;">PİYASA ISISI</div>
        <div style="height:8px;border-radius:4px;background:linear-gradient(90deg,#00e676,#fbbf24 50%,#ff4664);position:relative;margin-bottom:4px;">
          <div style="position:absolute;top:-3px;left:calc(${barPct.toFixed(0)}% - 7px);width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid rgba(0,0,0,0.5);box-shadow:0 0 8px rgba(255,255,255,0.5);"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:8px;color:rgba(196,181,253,0.35);margin-bottom:12px;">
          <span>🐻 Short Baskısı</span><span>⚖ Nötr</span><span>🐂 Long Baskısı</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:10px;background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.15);">
          <span style="font-size:11px;font-weight:800;color:#fbbf24;">Sonraki funding: ${countdown}</span>
          <span style="font-size:9px;color:rgba(196,181,253,0.40);">Her 8 saatte bir</span>
        </div>
        <div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(255,193,7,0.06);border:1px solid rgba(255,193,7,0.15);">
          <span style="font-size:10px;color:#fbbf24;line-height:1.6;">💡 ${frYorum}</span>
        </div>
      </div>`;
    } else {
      frHtml = `<div style="margin-bottom:12px;padding:14px;border-radius:14px;background:rgba(255,70,100,0.06);border:1px solid rgba(255,70,100,0.15);font-size:11px;color:#ff4664;text-align:center;">Funding rate verisi alınamadı</div>`;
    }

    // --- OPEN INTEREST ---
    let oiHtml = '';
    if (oiData.status === 'fulfilled' && oiData.value && oiData.value.openInterest) {
      const oi = parseFloat(oiData.value.openInterest);
      const price = tickerData.status==='fulfilled' ? parseFloat(tickerData.value.lastPrice) : 0;
      const chg24 = tickerData.status==='fulfilled' ? parseFloat(tickerData.value.priceChangePercent) : 0;
      const oiUsdt = oi * price;
      const chgColor = chg24 >= 0 ? '#00e676' : '#ff4664';
      const chgSign  = chg24 >= 0 ? '+' : '';

      // OI yorum: OI değişimini fiyat yönüyle karşılaştır
      let oiYorumBaslik = '';
      let oiYorumAciklama = '';
      let oiYorumColor = '#fbbf24';
      let oiYorumIcon = '📊';
      if (chg24 > 1) {
        oiYorumBaslik = 'GÜÇLENİYOR';
        oiYorumAciklama = 'Fiyat artarken OI de artıyor → yeni long pozisyonlar açılıyor. Yükseliş trendi güçlü.';
        oiYorumColor = '#00e676';
        oiYorumIcon = '📈';
      } else if (chg24 < -1) {
        oiYorumBaslik = 'POZİSYONLAR KAPANIYOR';
        oiYorumAciklama = 'Fiyat düşerken OI de düşüyor → satış baskısı altında pozisyonlar kapanıyor.';
        oiYorumColor = '#ff4664';
        oiYorumIcon = '📉';
      } else {
        oiYorumBaslik = 'KARARSIZ';
        oiYorumAciklama = 'Fiyat ve OI dengeli seyrediyor. Belirgin bir yön baskısı yok.';
        oiYorumColor = '#fbbf24';
        oiYorumIcon = '⚖️';
      }

      oiHtml = `
      <div style="margin-bottom:12px;padding:16px;border-radius:16px;background:linear-gradient(145deg,rgba(18,5,35,0.98),rgba(10,2,20,0.99));border:1px solid rgba(139,92,246,0.18);border-top-color:rgba(168,85,247,0.35);">
        <div style="font-size:9px;font-weight:900;letter-spacing:2px;color:rgba(196,181,253,0.60);margin-bottom:12px;">📊 OPEN INTEREST — Açık Pozisyonlar</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <div style="padding:12px;border-radius:12px;background:rgba(139,92,246,0.07);border:1px solid rgba(139,92,246,0.12);">
            <div style="font-size:8px;font-weight:700;color:rgba(196,181,253,0.40);letter-spacing:1px;margin-bottom:5px;">TOPLAM OI</div>
            <div style="font-size:16px;font-weight:900;color:#c4b5fd;">${nabizFmt(oiUsdt)}</div>
            <div style="font-size:9px;color:rgba(196,181,253,0.35);margin-top:2px;">Açık sözleşme</div>
          </div>
          <div style="padding:12px;border-radius:12px;background:rgba(139,92,246,0.07);border:1px solid rgba(139,92,246,0.12);">
            <div style="font-size:8px;font-weight:700;color:rgba(196,181,253,0.40);letter-spacing:1px;margin-bottom:5px;">24S DEĞİŞİM</div>
            <div style="font-size:16px;font-weight:900;color:${chgColor};">${chgSign}${chg24.toFixed(1)}%</div>
            <div style="font-size:9px;color:rgba(196,181,253,0.35);margin-top:2px;">Fiyat hareketi</div>
          </div>
          <div style="padding:12px;border-radius:12px;background:rgba(139,92,246,0.07);border:1px solid rgba(139,92,246,0.12);">
            <div style="font-size:8px;font-weight:700;color:rgba(196,181,253,0.40);letter-spacing:1px;margin-bottom:5px;">FİYAT</div>
            <div style="font-size:14px;font-weight:900;color:#e2e8f0;">$${price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
            <div style="font-size:9px;color:${chgColor};margin-top:2px;">${chgSign}${chg24.toFixed(2)}% (24s)</div>
          </div>
          <div style="padding:12px;border-radius:12px;background:rgba(${oiYorumColor==='#00e676'?'0,230,118':'ff4664'===oiYorumColor?'255,70,100':'255,193,7'},0.07);border:1px solid rgba(${oiYorumColor==='#00e676'?'0,230,118':'ff4664'===oiYorumColor?'255,70,100':'255,193,7'},0.15);">
            <div style="font-size:8px;font-weight:700;color:rgba(196,181,253,0.40);letter-spacing:1px;margin-bottom:5px;">YORUM</div>
            <div style="font-size:12px;font-weight:900;color:${oiYorumColor};">${oiYorumBaslik}</div>
          </div>
        </div>
        <div style="padding:12px;border-radius:12px;background:rgba(${oiYorumColor==='#00e676'?'0,230,118':'ff4664'===oiYorumColor?'255,70,100':'255,193,7'},0.06);border:1px solid rgba(${oiYorumColor==='#00e676'?'0,230,118':'ff4664'===oiYorumColor?'255,70,100':'255,193,7'},0.15);display:flex;align-items:flex-start;gap:10px;">
          <span style="font-size:20px;flex-shrink:0;">${oiYorumIcon}</span>
          <div>
            <div style="font-size:11px;font-weight:900;color:${oiYorumColor};margin-bottom:4px;">${oiYorumBaslik}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.65);line-height:1.6;">${oiYorumAciklama}</div>
          </div>
        </div>
        <div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(255,193,7,0.06);border:1px solid rgba(255,193,7,0.15);">
          <div style="font-size:9px;color:#fbbf24;line-height:1.7;">
            💡 <strong>OI artar + fiyat artar</strong> → güçlü yükseliş trendi<br>
            <span style="color:rgba(255,193,7,0.70);">OI düşer + fiyat düşer</span> → pozisyonlar kapanıyor, trend zayıflıyor<br>
            <span style="color:rgba(255,193,7,0.70);">OI artar + fiyat düşer</span> → short baskısı artıyor
          </div>
        </div>
      </div>`;
    }

    // --- LONG / SHORT ORANI ---
    let lsHtml = '';
    const topLS = lsTopData.status==='fulfilled' && Array.isArray(lsTopData.value) && lsTopData.value.length ? lsTopData.value[0] : null;
    const allLS = lsAllData.status==='fulfilled' && Array.isArray(lsAllData.value) && lsAllData.value.length ? lsAllData.value[0] : null;

    if (topLS || allLS) {
      const allLong  = allLS ? parseFloat(allLS.longAccount)*100 : null;
      const allShort = allLS ? parseFloat(allLS.shortAccount)*100 : null;
      const topLong  = topLS ? parseFloat(topLS.longAccount)*100 : null;
      const topShort = topLS ? parseFloat(topLS.shortAccount)*100 : null;

      // Yorum: Büyük oyuncu vs perakende ayrışması
      let lsYorum = '';
      if (topLong !== null && allLong !== null) {
        if (topLong > allLong + 5) {
          lsYorum = '💡 Perakende short yapıyor ama büyük oyuncular long tutuyor. Genellikle büyük oyuncular kazanır — ilginç ayrışma!';
        } else if (topShort > allShort + 5) {
          lsYorum = '💡 Perakende long yapıyor ama büyük oyuncular short tutuyor. Büyük oyuncuların yönüne dikkat et.';
        } else if (allLong > 60) {
          lsYorum = '💡 Perakende aşırı long — kalabalık pozisyon, likidite tuzağı riski olabilir.';
        } else if (allShort > 60) {
          lsYorum = '💡 Perakende aşırı short — short sıkışması (squeeze) riski var.';
        } else {
          lsYorum = '💡 Piyasa dengeli — belirgin bir ayrışma yok, her iki yönde de risk var.';
        }
      }

      const renderBar = (longPct, shortPct, label, longColor, shortColor) => {
        const lColor = longPct > shortPct ? '#00e676' : '#ff4664';
        const sColor = shortPct > longPct ? '#ff4664' : '#ff4664';
        const dominant = longPct > shortPct ? `Long %${longPct.toFixed(1)} / Short %${shortPct.toFixed(1)}` : `Long %${longPct.toFixed(1)} / Short %${shortPct.toFixed(1)}`;
        const domColor = longPct > shortPct ? '#00e676' : '#ff4664';
        const badge = longPct > shortPct ? '<span style="padding:3px 9px;border-radius:20px;background:rgba(0,230,118,0.12);border:1px solid rgba(0,230,118,0.30);font-size:9px;font-weight:900;color:#00e676;">● Long Ağırlıklı</span>'
                                          : '<span style="padding:3px 9px;border-radius:20px;background:rgba(255,70,100,0.12);border:1px solid rgba(255,70,100,0.30);font-size:9px;font-weight:900;color:#ff4664;">● Short Baskısı</span>';
        return `
          <div style="margin-bottom:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
              <span style="font-size:9px;font-weight:700;color:rgba(196,181,253,0.50);letter-spacing:1px;">${label}</span>
              <span style="font-size:11px;font-weight:900;color:${domColor};">${dominant}</span>
            </div>
            <div style="height:8px;border-radius:4px;overflow:hidden;display:flex;margin-bottom:4px;">
              <div style="background:#00e676;width:${longPct.toFixed(1)}%;transition:width 0.5s;"></div>
              <div style="background:#ff4664;flex:1;transition:flex 0.5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:9px;color:rgba(0,230,118,0.70);">%${longPct.toFixed(1)} Long</span>
              ${badge}
              <span style="font-size:9px;color:rgba(255,70,100,0.70);">%${shortPct.toFixed(1)} Short</span>
            </div>
          </div>`;
      };

      lsHtml = `
      <div style="margin-bottom:12px;padding:16px;border-radius:16px;background:linear-gradient(145deg,rgba(18,5,35,0.98),rgba(10,2,20,0.99));border:1px solid rgba(139,92,246,0.18);border-top-color:rgba(168,85,247,0.35);">
        <div style="font-size:9px;font-weight:900;letter-spacing:2px;color:rgba(196,181,253,0.60);margin-bottom:12px;">✖ BÜYÜK OYUNCU POZİSYONLARI</div>
        ${allLS ? renderBar(allLong, allShort, 'TÜM HESAPLAR') : ''}
        ${topLS ? renderBar(topLong, topShort, 'BÜYÜK OYUNCULAR') : ''}
        ${lsYorum ? `<div style="margin-top:6px;padding:10px 12px;border-radius:10px;background:rgba(255,193,7,0.06);border:1px solid rgba(255,193,7,0.15);font-size:10px;color:#fbbf24;line-height:1.6;">${lsYorum}</div>` : ''}
      </div>`;
    }

    // --- LİKİDASYONLAR ---
    let liqHtml = '';
    if (liqData.status === 'fulfilled' && Array.isArray(liqData.value) && liqData.value.length) {
      const liqs = liqData.value.slice(0,10);
      const totalLiqUsdt = liqs.reduce((s, l) => s + parseFloat(l.origQty) * parseFloat(l.price), 0);
      const buyLiqs  = liqs.filter(l => l.side === 'BUY');   // short pozisyon likit → fiyat düştü
      const sellLiqs = liqs.filter(l => l.side === 'SELL');  // long pozisyon likit → fiyat çıktı
      const buyTotal  = buyLiqs.reduce((s,l)=>s+parseFloat(l.origQty)*parseFloat(l.price),0);
      const sellTotal = sellLiqs.reduce((s,l)=>s+parseFloat(l.origQty)*parseFloat(l.price),0);

      const rows = liqs.map(l => {
        const isShortLiq = l.side === 'BUY';   // short likit, yani alım zorla kapandı
        const liqColor  = isShortLiq ? '#00e676' : '#ff4664';
        const liqLabel  = isShortLiq ? 'SHORT LİKİT' : 'LONG LİKİT';
        const val = parseFloat(l.origQty) * parseFloat(l.price);
        const ts  = new Date(l.time);
        const timeStr = ts.getHours().toString().padStart(2,'0') + ':' + ts.getMinutes().toString().padStart(2,'0');
        return `<div style="display:grid;grid-template-columns:70px 1fr 80px;gap:6px;align-items:center;padding:9px 12px;border-bottom:1px solid rgba(139,92,246,0.06);">
          <span style="font-size:9px;font-weight:700;color:rgba(196,181,253,0.40);">${timeStr}</span>
          <span style="font-size:10px;font-weight:900;color:${liqColor};">${liqLabel}</span>
          <span style="font-size:11px;font-weight:900;color:#e2e8f0;text-align:right;">${nabizFmt(val)}</span>
        </div>`;
      }).join('');

      liqHtml = `
      <div style="margin-bottom:12px;padding:16px;border-radius:16px;background:linear-gradient(145deg,rgba(18,5,35,0.98),rgba(10,2,20,0.99));border:1px solid rgba(139,92,246,0.18);border-top-color:rgba(168,85,247,0.35);">
        <div style="font-size:9px;font-weight:900;letter-spacing:2px;color:rgba(196,181,253,0.60);margin-bottom:4px;">💥 LİKİDASYONLAR — Son İşlemler</div>
        <div style="font-size:9px;color:rgba(196,181,253,0.35);margin-bottom:12px;">Zorla kapatılan pozisyonlar büyük fiyat hareketine işaret eder</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
          <div style="padding:10px;border-radius:10px;background:rgba(139,92,246,0.07);border:1px solid rgba(139,92,246,0.12);text-align:center;">
            <div style="font-size:8px;color:rgba(196,181,253,0.40);margin-bottom:4px;">TOPLAM</div>
            <div style="font-size:13px;font-weight:900;color:#c4b5fd;">${nabizFmt(totalLiqUsdt)}</div>
          </div>
          <div style="padding:10px;border-radius:10px;background:rgba(0,230,118,0.06);border:1px solid rgba(0,230,118,0.15);text-align:center;">
            <div style="font-size:8px;color:rgba(0,230,118,0.50);margin-bottom:4px;">SHORT LİKİT</div>
            <div style="font-size:13px;font-weight:900;color:#00e676;">${nabizFmt(buyTotal)}</div>
          </div>
          <div style="padding:10px;border-radius:10px;background:rgba(255,70,100,0.06);border:1px solid rgba(255,70,100,0.15);text-align:center;">
            <div style="font-size:8px;color:rgba(255,70,100,0.50);margin-bottom:4px;">LONG LİKİT</div>
            <div style="font-size:13px;font-weight:900;color:#ff4664;">${nabizFmt(sellTotal)}</div>
          </div>
        </div>
        <div style="border-radius:12px;overflow:hidden;border:1px solid rgba(139,92,246,0.10);">
          <div style="display:grid;grid-template-columns:70px 1fr 80px;gap:6px;padding:8px 12px;background:rgba(139,92,246,0.08);border-bottom:1px solid rgba(139,92,246,0.12);">
            <span style="font-size:8px;font-weight:700;color:rgba(196,181,253,0.35);letter-spacing:1px;">SAAT</span>
            <span style="font-size:8px;font-weight:700;color:rgba(196,181,253,0.35);letter-spacing:1px;">TİP</span>
            <span style="font-size:8px;font-weight:700;color:rgba(196,181,253,0.35);letter-spacing:1px;text-align:right;">MİKTAR</span>
          </div>
          ${rows}
        </div>
        <div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(255,193,7,0.06);border:1px solid rgba(255,193,7,0.15);">
          <span style="font-size:10px;color:#fbbf24;line-height:1.6;">💡 <strong>Long likit</strong> = fiyat hızla düştü, alıcılar tasfiye edildi.<br><span style="color:rgba(255,193,7,0.70);"><strong>Short likit</strong> = fiyat hızla çıktı, satıcılar tasfiye edildi. Büyük likitler sonrası fiyat tersine dönebilir.</span></span>
        </div>
      </div>`;
    } else {
      liqHtml = `<div style="margin-bottom:12px;padding:14px;border-radius:14px;background:rgba(139,92,246,0.05);border:1px solid rgba(139,92,246,0.12);font-size:11px;color:rgba(196,181,253,0.50);text-align:center;">Son 1 saatte büyük likidason yok</div>`;
    }

    // Son güncelleme
    const now = new Date();
    const timeStr2 = now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0')+':'+now.getSeconds().toString().padStart(2,'0');

    result.innerHTML = frHtml + oiHtml + lsHtml + liqHtml + `
      <div style="text-align:center;padding:6px 0 20px;font-size:9px;color:rgba(196,181,253,0.25);">Son güncelleme: ${timeStr2} TR</div>
      <button onclick="nabizRun()" style="width:100%;padding:13px;border-radius:14px;border:1px solid rgba(139,92,246,0.22);border-top-color:rgba(168,85,247,0.38);background:linear-gradient(145deg,rgba(91,33,182,0.08),rgba(30,10,60,0.04));color:#c4b5fd;font-size:11px;font-weight:900;letter-spacing:1.5px;cursor:pointer;margin-bottom:24px;">
        🔄 YENİLE
      </button>`;

    result.style.display = '';
  } catch(e) {
    result.innerHTML = `<div style="padding:20px;border-radius:14px;background:rgba(255,70,100,0.06);border:1px solid rgba(255,70,100,0.15);text-align:center;">
      <div style="font-size:20px;margin-bottom:8px;">⚠️</div>
      <div style="font-size:11px;color:#ff4664;font-weight:700;">Veri alınamadı</div>
      <div style="font-size:10px;color:rgba(255,70,100,0.60);margin-top:4px;">${e.message||'Bağlantı hatası'}</div>
      <button onclick="nabizRun()" style="margin-top:16px;padding:10px 20px;border-radius:12px;border:1px solid rgba(139,92,246,0.22);background:rgba(91,33,182,0.08);color:#c4b5fd;font-size:11px;font-weight:900;cursor:pointer;">Tekrar Dene</button>
    </div>`;
    result.style.display = '';
  } finally {
    loading.style.display = 'none';
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}
// ===================== / PİYASA NABZI MODÜLÜ =====================

// ===================== RSI TARAYICI MODÜLÜ =====================
let rsiMultiplier = 2;

function rsiInit() {
  // Sayfa açıldığında bir şey yükleme, kullanıcı butona bassın
}

async function rsiRun() {
  const btn = document.getElementById('rsiRunBtn');
  const loading = document.getElementById('rsiLoading');
  const result = document.getElementById('rsiResult');
  const interval = document.getElementById('rsiInterval').value;
  const mode = document.getElementById('rsiMode').value;
  const progress = document.getElementById('rsiProgress');

  btn.disabled = true;
  btn.style.opacity = '0.6';
  loading.style.display = '';
  result.style.display = 'none';
  result.innerHTML = '';

  try {
    // Tüm USDT çiftlerini hacme göre sıralı çek (en aktif coinleri taramak için)
    progress.textContent = 'Coin listesi alınıyor...';
    const tickerRes = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    const tickerData = await tickerRes.json();
    const symbols = tickerData
      .filter(t => t.symbol.endsWith('USDT') && !t.symbol.includes('UP') && !t.symbol.includes('DOWN') && !t.symbol.includes('BEAR') && !t.symbol.includes('BULL') && parseFloat(t.quoteVolume) > 200000)
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .map(t => t.symbol)
      .slice(0, 200); // Hacme göre en aktif 200 coin

    const rsiResults = [];
    const batchSize = 20;

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      progress.textContent = `${Math.min(i + batchSize, symbols.length)} / ${symbols.length} coin tarandı...`;

      await Promise.all(batch.map(async (sym) => {
        try {
          const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&limit=15`);
          const klines = await r.json();
          if (!klines || klines.length < 14) return;

          // RSI hesapla (14 periyot)
          const closes = klines.map(k => parseFloat(k[4]));
          let gains = 0, losses = 0;
          for (let j = 1; j < 14; j++) {
            const diff = closes[j] - closes[j-1];
            if (diff > 0) gains += diff;
            else losses += Math.abs(diff);
          }
          const avgGain = gains / 14;
          const avgLoss = losses / 14;
          if (avgLoss === 0) return;
          const rs = avgGain / avgLoss;
          const rsi = 100 - (100 / (1 + rs));

          // Son fiyat değişimi
          const change24 = ((closes[closes.length-1] - closes[0]) / closes[0] * 100);

          if (mode === 'oversold' && rsi < 30) {
            rsiResults.push({ sym, rsi, change24, type: 'oversold' });
          } else if (mode === 'overbought' && rsi > 70) {
            rsiResults.push({ sym, rsi, change24, type: 'overbought' });
          } else if (mode === 'both') {
            if (rsi < 30) rsiResults.push({ sym, rsi, change24, type: 'oversold' });
            else if (rsi > 70) rsiResults.push({ sym, rsi, change24, type: 'overbought' });
          }
        } catch(e) {}
      }));
    }

    // Sırala
    rsiResults.sort((a, b) => {
      if (a.type === 'oversold' && b.type === 'oversold') return a.rsi - b.rsi;
      if (a.type === 'overbought' && b.type === 'overbought') return b.rsi - a.rsi;
      return a.type === 'oversold' ? -1 : 1;
    });

    const intervalLabel = {'1h':'1 Saat','4h':'4 Saat','1d':'1 Gün'}[interval];

    if (rsiResults.length === 0) {
      result.innerHTML = `<div style="padding:30px;text-align:center;border-radius:14px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);">
        <div style="font-size:28px;margin-bottom:10px;">🔍</div>
        <div style="font-size:12px;font-weight:700;color:#fca5a5;">Eşleşen Coin Bulunamadı</div>
        <div style="font-size:10px;color:rgba(252,165,165,0.55);margin-top:6px;">${intervalLabel} diliminde kritik RSI seviyesi yok.</div>
      </div>`;
    } else {
      let html = `<div style="font-size:10px;font-weight:700;color:rgba(252,165,165,0.50);letter-spacing:1px;margin-bottom:10px;text-align:center;">${intervalLabel} • ${rsiResults.length} Coin Bulundu</div>`;

      rsiResults.forEach(item => {
        const isOversold = item.type === 'oversold';
        const color = isOversold ? '#86efac' : '#fca5a5';
        const bg = isOversold ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';
        const border = isOversold ? 'rgba(74,222,128,0.20)' : 'rgba(248,113,113,0.20)';
        const badge = isOversold ? '🟢 AŞIRI SATIM' : '🔴 AŞIRI ALIM';
        const desc = isOversold ? 'Alıcılar tükendi, dönüş potansiyeli' : 'Aşırı ısındı, düzeltme olabilir';
        const changeColor = item.change24 >= 0 ? '#86efac' : '#fca5a5';
        const changeSign = item.change24 >= 0 ? '+' : '';

        html += `<div style="margin-bottom:8px;padding:12px 14px;border-radius:14px;background:${bg};border:1px solid ${border};display:flex;align-items:center;justify-content:space-between;">
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:900;color:#e2e8f0;">${item.sym.replace('USDT','')}<span style="font-size:10px;color:rgba(255,255,255,0.30);font-weight:600;">/USDT</span></div>
            <div style="font-size:9px;color:rgba(255,255,255,0.40);margin-top:3px;">${desc}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:15px;font-weight:900;color:${color};">RSI ${item.rsi.toFixed(1)}</div>
            <div style="font-size:9px;font-weight:700;color:${changeColor};margin-top:2px;">${changeSign}${item.change24.toFixed(2)}%</div>
            <div style="font-size:8px;font-weight:800;color:${color};opacity:0.8;margin-top:2px;letter-spacing:0.5px;">${badge}</div>
          </div>
        </div>`;
      });

      result.innerHTML = html;
    }
    result.style.display = '';
  } catch(e) {
    result.innerHTML = `<div style="padding:20px;border-radius:14px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);text-align:center;">
      <div style="font-size:20px;margin-bottom:8px;">⚠️</div>
      <div style="font-size:11px;color:#fca5a5;font-weight:700;">Veri alınamadı</div>
      <div style="font-size:10px;color:rgba(252,165,165,0.60);margin-top:4px;">${e.message||'Bağlantı hatası'}</div>
      <button onclick="rsiRun()" style="margin-top:16px;padding:10px 20px;border-radius:12px;border:1px solid rgba(239,68,68,0.22);background:rgba(185,28,28,0.08);color:#fca5a5;font-size:11px;font-weight:900;cursor:pointer;">Tekrar Dene</button>
    </div>`;
    result.style.display = '';
  } finally {
    loading.style.display = 'none';
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}
// ===================== / RSI TARAYICI MODÜLÜ =====================

// ===================== HACİM TARAYICI MODÜLÜ =====================
let hacimSelectedMultiplier = 2;

function hacimInit() {
  // Sayfa açıldığında bekle
}

function hacimSetMultiplier(val, el) {
  hacimSelectedMultiplier = val;
  [2,3,5,10].forEach(v => {
    const btn = document.getElementById('hacimMult'+v);
    if (!btn) return;
    if (v === val) {
      btn.style.background = 'rgba(21,128,61,0.25)';
      btn.style.borderColor = 'rgba(34,197,94,0.40)';
      btn.style.color = '#86efac';
    } else {
      btn.style.background = 'rgba(255,255,255,0.03)';
      btn.style.borderColor = 'rgba(34,197,94,0.18)';
      btn.style.color = 'rgba(134,239,172,0.60)';
    }
  });
}

async function hacimRun() {
  const btn = document.getElementById('hacimRunBtn');
  const loading = document.getElementById('hacimLoading');
  const result = document.getElementById('hacimResult');

  btn.disabled = true;
  btn.style.opacity = '0.6';
  loading.style.display = '';
  result.style.display = 'none';
  result.innerHTML = '';

  try {
    // 24 saatlik ticker verisi çek
    const r = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    const tickers = await r.json();

    // USDT çiftlerini filtrele, düşük hacimli ve kaldıraçlıları ele
    const filtered = tickers.filter(t =>
      t.symbol.endsWith('USDT') &&
      !t.symbol.includes('UP') &&
      !t.symbol.includes('DOWN') &&
      !t.symbol.includes('BEAR') &&
      !t.symbol.includes('BULL') &&
      parseFloat(t.quoteVolume) > 500000 // Min 500K$ hacim
    );

    // Hacim çarpanını hesapla: quoteVolume / weightedAvgPrice kullanarak
    // Gerçek hacim patlamasını bulmak için: son 1 saatlik vs 24 saatlik ort kıyasla
    // Binance 24hr ticker'dan: count (işlem sayısı) ve volume var
    // Basit yöntem: yüksek hacim + yüksek fiyat değişimi kombinasyonu

    // Her coin için hacim skor hesapla
    const results = [];
    filtered.forEach(t => {
      const vol24 = parseFloat(t.quoteVolume); // 24s toplam hacim $
      const count = parseInt(t.count); // işlem sayısı
      const change = parseFloat(t.priceChangePercent);
      const price = parseFloat(t.lastPrice);
      // Ortalama işlem başına hacim (büyük işlem göstergesi)
      const avgTradeSize = vol24 / count;

      // Hacim skoru: işlem başına büyüklük * 24s hacim normalize
      // Eşiği aşanları listele
      results.push({ sym: t.symbol, vol24, count, change, price, avgTradeSize });
    });

    // Hacme göre sırala (en yüksekten en düşüğe)
    results.sort((a, b) => b.vol24 - a.vol24);

    // En yüksek hacimli coinlerin ortalamasını bul
    const top50Avg = results.slice(0, 50).reduce((s, r) => s + r.vol24, 0) / 50;

    // Seçilen çarpanı aşanları filtrele
    const exploding = results.filter(r => r.vol24 > top50Avg * (hacimSelectedMultiplier / 10));

    // Öne çıkan hacim patlamalarını bul: yüksek işlem sayısı + yüksek değişim
    const sorted = results
      .filter(r => Math.abs(r.change) > 1) // En az %1 hareket
      .sort((a, b) => b.vol24 - a.vol24)
      .slice(0, 30);

    // Her coin için Alış/Satış oranını Binance'in resmi taker verisinden hesapla
    const klineProgress = document.getElementById('hacimProgress');
    const batchSize2 = 10;
    for (let i = 0; i < sorted.length; i += batchSize2) {
      const batch = sorted.slice(i, i + batchSize2);
      if (klineProgress) klineProgress.textContent = `Alış/Satış oranı hesaplanıyor... ${Math.min(i+batchSize2, sorted.length)}/${sorted.length}`;
      await Promise.all(batch.map(async (item) => {
        try {
          // 24 saatlik veriyi 1h mumlarla topla (24 mum)
          const kr = await fetch(`https://api.binance.com/api/v3/klines?symbol=${item.sym}&interval=1h&limit=24`);
          const kl = await kr.json();
          let totalVol = 0, takerBuyVol = 0;
          kl.forEach(k => {
            totalVol += parseFloat(k[7]); // quote asset volume
            takerBuyVol += parseFloat(k[10]); // taker buy quote asset volume
          });
          if (totalVol > 0) {
            item.buyPct = (takerBuyVol / totalVol) * 100;
            item.sellPct = 100 - item.buyPct;
          }
        } catch(e) {}
      }));
    }

    function fmtVol(v) {
      if (v >= 1e9) return '$' + (v/1e9).toFixed(2) + 'B';
      if (v >= 1e6) return '$' + (v/1e6).toFixed(1) + 'M';
      return '$' + (v/1e3).toFixed(0) + 'K';
    }

    let html = `<div style="font-size:10px;font-weight:700;color:rgba(134,239,172,0.50);letter-spacing:1px;margin-bottom:10px;text-align:center;">EN YÜKSEK HACİMLİ ${sorted.length} COİN</div>`;

    sorted.forEach((item, idx) => {
      const changeColor = item.change >= 0 ? '#86efac' : '#fca5a5';
      const changeSign = item.change >= 0 ? '+' : '';
      const arrow = item.change >= 0 ? '▲' : '▼';
      const intensity = idx < 3 ? '🔥🔥🔥' : idx < 8 ? '🔥🔥' : '🔥';
      const borderGlow = idx < 3 ? 'rgba(74,222,128,0.35)' : 'rgba(74,222,128,0.15)';
      const bgGlow = idx < 3 ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.05)';

      // Alış/Satış barı
      let buySellHtml = '';
      if (typeof item.buyPct === 'number') {
        const buyPct = item.buyPct;
        const sellPct = item.sellPct;
        const dominant = buyPct >= 55 ? 'buy' : sellPct >= 55 ? 'sell' : 'neutral';
        const yorum = dominant === 'buy' ? 'Alıcılar baskın — yükseliş güçlü'
                    : dominant === 'sell' ? 'Satıcılar baskın — düşüş güçlü, dikkat'
                    : 'Denge — net yön yok';
        const yorumColor = dominant === 'buy' ? '#86efac' : dominant === 'sell' ? '#fca5a5' : 'rgba(255,255,255,0.45)';

        buySellHtml = `
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="font-size:9px;font-weight:800;color:#86efac;">🟢 Alış %${buyPct.toFixed(0)}</span>
              <span style="font-size:9px;font-weight:800;color:#fca5a5;">🔴 Satış %${sellPct.toFixed(0)}</span>
            </div>
            <div style="height:6px;border-radius:4px;overflow:hidden;display:flex;background:rgba(255,255,255,0.05);">
              <div style="width:${buyPct}%;background:linear-gradient(90deg,#15803d,#4ade80);"></div>
              <div style="width:${sellPct}%;background:linear-gradient(90deg,#f87171,#b91c1c);"></div>
            </div>
            <div style="font-size:9px;color:${yorumColor};font-weight:700;margin-top:5px;">${yorum}</div>
          </div>`;
      }

      html += `<div style="margin-bottom:7px;padding:11px 14px;border-radius:13px;background:${bgGlow};border:1px solid ${borderGlow};">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:13px;font-weight:900;color:#e2e8f0;">${item.sym.replace('USDT','')}<span style="font-size:10px;color:rgba(255,255,255,0.30);font-weight:600;">/USDT</span></span>
              <span style="font-size:9px;">${intensity}</span>
            </div>
            <div style="font-size:9px;color:rgba(255,255,255,0.35);margin-top:3px;">${item.count.toLocaleString()} işlem</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;font-weight:900;color:#86efac;">${fmtVol(item.vol24)}</div>
            <div style="font-size:10px;font-weight:700;color:${changeColor};margin-top:2px;">${arrow} ${changeSign}${item.change.toFixed(2)}%</div>
          </div>
        </div>
        ${buySellHtml}
      </div>`;
    });

    result.innerHTML = html;
    result.style.display = '';
  } catch(e) {
    result.innerHTML = `<div style="padding:20px;border-radius:14px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);text-align:center;">
      <div style="font-size:20px;margin-bottom:8px;">⚠️</div>
      <div style="font-size:11px;color:#86efac;font-weight:700;">Veri alınamadı</div>
      <div style="font-size:10px;color:rgba(134,239,172,0.60);margin-top:4px;">${e.message||'Bağlantı hatası'}</div>
      <button onclick="hacimRun()" style="margin-top:16px;padding:10px 20px;border-radius:12px;border:1px solid rgba(34,197,94,0.22);background:rgba(21,128,61,0.08);color:#86efac;font-size:11px;font-weight:900;cursor:pointer;">Tekrar Dene</button>
    </div>`;
    result.style.display = '';
  } finally {
    loading.style.display = 'none';
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}
// ===================== / HACİM TARAYICI MODÜLÜ =====================

