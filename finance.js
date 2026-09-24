/* Doruk module: finance.js */
// ===================== DÖVİZ ÇEVİRİCİ =====================
const DOVIZ_ASSETS = [
  {key:'USD',             name:'ABD Doları',          sym:'USD', flag:'🇺🇸', cat:'doviz'},
  {key:'EUR',             name:'Euro',                sym:'EUR', flag:'🇪🇺', cat:'doviz'},
  {key:'GBP',             name:'İng. Sterlini',       sym:'GBP', flag:'🇬🇧', cat:'doviz'},
  {key:'CHF',             name:'İsviçre Frangı',      sym:'CHF', flag:'🇨🇭', cat:'doviz'},
  {key:'JPY',             name:'Japon Yeni',          sym:'JPY', flag:'🇯🇵', cat:'doviz'},
  {key:'SAR',             name:'S.Arabistan Riyali',  sym:'SAR', flag:'🇸🇦', cat:'doviz'},
  {key:'AED',             name:'BAE Dirhemi',         sym:'AED', flag:'🇦🇪', cat:'doviz'},
  {key:'RUB',             name:'Ruble',               sym:'RUB', flag:'🇷🇺', cat:'doviz'},
  {key:'CAD',             name:'Kanada Doları',       sym:'CAD', flag:'🇨🇦', cat:'doviz'},
  {key:'AUD',             name:'Avustralya Doları',   sym:'AUD', flag:'🇦🇺', cat:'doviz'},
  {key:'CNY',             name:'Çin Yuanı',           sym:'CNY', flag:'🇨🇳', cat:'doviz'},
  {key:'KWD',             name:'Kuveyt Dinarı',       sym:'KWD', flag:'🇰🇼', cat:'doviz'},
  {key:'QAR',             name:'Katar Riyali',        sym:'QAR', flag:'🇶🇦', cat:'doviz'},
  {key:'NOK',             name:'Norveç Kronu',        sym:'NOK', flag:'🇳🇴', cat:'doviz'},
  {key:'SEK',             name:'İsveç Kronu',         sym:'SEK', flag:'🇸🇪', cat:'doviz'},
  {key:'DKK',             name:'Danimarka Kronu',     sym:'DKK', flag:'🇩🇰', cat:'doviz'},
  {key:'BHD',             name:'Bahreyn Dinarı',      sym:'BHD', flag:'🇧🇭', cat:'doviz'},
  {key:'JOD',             name:'Ürdün Dinarı',        sym:'JOD', flag:'🇯🇴', cat:'doviz'},
  {key:'EGP',             name:'Mısır Poundu',        sym:'EGP', flag:'🇪🇬', cat:'doviz'},
  {key:'PKR',             name:'Pakistan Rupisi',     sym:'PKR', flag:'🇵🇰', cat:'doviz'},
  {key:'INR',             name:'Hindistan Rupisi',    sym:'INR', flag:'🇮🇳', cat:'doviz'},
  {key:'MYR',             name:'Malay Ringgiti',      sym:'MYR', flag:'🇲🇾', cat:'doviz'},
  {key:'SGD',             name:'Singapur Doları',     sym:'SGD', flag:'🇸🇬', cat:'doviz'},
  
  {key:'PLN',  name:'Polonya Zlotisi',    sym:'PLN', flag:'🇵🇱', cat:'avrupa'},
  {key:'CZK',  name:'Çek Korunası',       sym:'CZK', flag:'🇨🇿', cat:'avrupa'},
  {key:'HUF',  name:'Macar Forinti',      sym:'HUF', flag:'🇭🇺', cat:'avrupa'},
  {key:'RON',  name:'Romen Leyi',         sym:'RON', flag:'🇷🇴', cat:'avrupa'},
  {key:'HRK',  name:'Hırvat Kunası',      sym:'HRK', flag:'🇭🇷', cat:'avrupa'},
  {key:'BGN',  name:'Bulgar Levası',      sym:'BGN', flag:'🇧🇬', cat:'avrupa'},
  {key:'ISK',  name:'İzlanda Kronası',    sym:'ISK', flag:'🇮🇸', cat:'avrupa'},
  {key:'UAH',  name:'Ukrayna Grivnası',   sym:'UAH', flag:'🇺🇦', cat:'avrupa'},
  {key:'RSD',  name:'Sırp Dinarı',        sym:'RSD', flag:'🇷🇸', cat:'avrupa'},
  {key:'ALL',  name:'Arnavut Leki',       sym:'ALL', flag:'🇦🇱', cat:'avrupa'},
  {key:'MKD',  name:'Makedon Dinarı',     sym:'MKD', flag:'🇲🇰', cat:'avrupa'},
  {key:'BAM',  name:'Bosna Markı',        sym:'BAM', flag:'🇧🇦', cat:'avrupa'},
  {key:'MDL',  name:'Moldova Leyi',       sym:'MDL', flag:'🇲🇩', cat:'avrupa'},
  {key:'GEL',  name:'Gürcü Larisi',       sym:'GEL', flag:'🇬🇪', cat:'avrupa'},
  {key:'AMD',  name:'Ermeni Dramı',       sym:'AMD', flag:'🇦🇲', cat:'avrupa'},
  {key:'AZN',  name:'Azerbaycan Manatı',  sym:'AZN', flag:'🇦🇿', cat:'avrupa'},
  
  {key:'KRW',  name:'Güney Kore Wonu',    sym:'KRW', flag:'🇰🇷', cat:'asya'},
  {key:'TWD',  name:'Tayvan Doları',      sym:'TWD', flag:'🇹🇼', cat:'asya'},
  {key:'THB',  name:'Tayland Bahtı',      sym:'THB', flag:'🇹🇭', cat:'asya'},
  {key:'IDR',  name:'Endonezya Rupisi',   sym:'IDR', flag:'🇮🇩', cat:'asya'},
  {key:'PHP',  name:'Filipin Pesosu',     sym:'PHP', flag:'🇵🇭', cat:'asya'},
  {key:'VND',  name:'Vietnam Dongu',      sym:'VND', flag:'🇻🇳', cat:'asya'},
  {key:'BDT',  name:'Bangladeş Takası',   sym:'BDT', flag:'🇧🇩', cat:'asya'},
  {key:'LKR',  name:'Sri Lanka Rupisi',   sym:'LKR', flag:'🇱🇰', cat:'asya'},
  {key:'NPR',  name:'Nepal Rupisi',       sym:'NPR', flag:'🇳🇵', cat:'asya'},
  {key:'MMK',  name:'Myanmar Kyatı',      sym:'MMK', flag:'🇲🇲', cat:'asya'},
  {key:'KHR',  name:'Kamboçya Rieli',     sym:'KHR', flag:'🇰🇭', cat:'asya'},
  {key:'MNT',  name:'Moğol Tögrögü',      sym:'MNT', flag:'🇲🇳', cat:'asya'},
  {key:'KZT',  name:'Kazakistan Tengesi', sym:'KZT', flag:'🇰🇿', cat:'asya'},
  {key:'UZS',  name:'Özbekistan Somu',    sym:'UZS', flag:'🇺🇿', cat:'asya'},
  {key:'TMT',  name:'Türkmen Manatı',     sym:'TMT', flag:'🇹🇲', cat:'asya'},
  {key:'KGS',  name:'Kırgız Somu',        sym:'KGS', flag:'🇰🇬', cat:'asya'},
  {key:'TJS',  name:'Tacik Somonisi',     sym:'TJS', flag:'🇹🇯', cat:'asya'},
  {key:'AFN',  name:'Afgan Afganisi',     sym:'AFN', flag:'🇦🇫', cat:'asya'},
  {key:'IRR',  name:'İran Riyali',        sym:'IRR', flag:'🇮🇷', cat:'asya'},
  {key:'IQD',  name:'Irak Dinarı',        sym:'IQD', flag:'🇮🇶', cat:'asya'},
  {key:'SYP',  name:'Suriye Poundu',      sym:'SYP', flag:'🇸🇾', cat:'asya'},
  {key:'HKD',  name:'Hong Kong Doları',   sym:'HKD', flag:'🇭🇰', cat:'asya'},
  {key:'MOP',  name:'Makao Patakası',     sym:'MOP', flag:'🇲🇴', cat:'asya'},
  
  {key:'MXN',  name:'Meksika Pesosu',     sym:'MXN', flag:'🇲🇽', cat:'americas'},
  {key:'BRL',  name:'Brezilya Reali',     sym:'BRL', flag:'🇧🇷', cat:'americas'},
  {key:'ARS',  name:'Arjantin Pesosu',    sym:'ARS', flag:'🇦🇷', cat:'americas'},
  {key:'CLP',  name:'Şili Pesosu',        sym:'CLP', flag:'🇨🇱', cat:'americas'},
  {key:'COP',  name:'Kolombiya Pesosu',   sym:'COP', flag:'🇨🇴', cat:'americas'},
  {key:'PEN',  name:'Peru Solu',          sym:'PEN', flag:'🇵🇪', cat:'americas'},
  {key:'UYU',  name:'Uruguay Pesosu',     sym:'UYU', flag:'🇺🇾', cat:'americas'},
  {key:'PYG',  name:'Paraguay Guaranisi', sym:'PYG', flag:'🇵🇾', cat:'americas'},
  {key:'BOB',  name:'Bolivya Bolivyanosu',sym:'BOB', flag:'🇧🇴', cat:'americas'},
  {key:'VES',  name:'Venezuela Bolivarı', sym:'VES', flag:'🇻🇪', cat:'americas'},
  {key:'GTQ',  name:'Guatemala Quetzalı', sym:'GTQ', flag:'🇬🇹', cat:'americas'},
  {key:'CRC',  name:'Kosta Rika Kolonu',  sym:'CRC', flag:'🇨🇷', cat:'americas'},
  {key:'DOP',  name:'Dominik Pesosu',     sym:'DOP', flag:'🇩🇴', cat:'americas'},
  {key:'CUP',  name:'Küba Pesosu',        sym:'CUP', flag:'🇨🇺', cat:'americas'},
  {key:'JMD',  name:'Jamaika Doları',     sym:'JMD', flag:'🇯🇲', cat:'americas'},
  {key:'TTD',  name:'Trinidad Doları',    sym:'TTD', flag:'🇹🇹', cat:'americas'},
  {key:'NZD',  name:'Yeni Zelanda Doları',sym:'NZD', flag:'🇳🇿', cat:'americas'},
  
  {key:'OMR',  name:'Umman Riyali',       sym:'OMR', flag:'🇴🇲', cat:'ortadogu'},
  {key:'YER',  name:'Yemen Riyali',       sym:'YER', flag:'🇾🇪', cat:'ortadogu'},
  {key:'ILS',  name:'İsrail Şekeli',      sym:'ILS', flag:'🇮🇱', cat:'ortadogu'},
  {key:'LBP',  name:'Lübnan Poundu',      sym:'LBP', flag:'🇱🇧', cat:'ortadogu'},
  
  {key:'ZAR',  name:'Güney Afrika Randı', sym:'ZAR', flag:'🇿🇦', cat:'afrika'},
  {key:'NGN',  name:'Nijerya Nairası',    sym:'NGN', flag:'🇳🇬', cat:'afrika'},
  {key:'KES',  name:'Kenya Şilini',       sym:'KES', flag:'🇰🇪', cat:'afrika'},
  {key:'GHS',  name:'Gana Sedisi',        sym:'GHS', flag:'🇬🇭', cat:'afrika'},
  {key:'ETB',  name:'Etiyopya Birri',     sym:'ETB', flag:'🇪🇹', cat:'afrika'},
  {key:'TZS',  name:'Tanzanya Şilini',    sym:'TZS', flag:'🇹🇿', cat:'afrika'},
  {key:'UGX',  name:'Uganda Şilini',      sym:'UGX', flag:'🇺🇬', cat:'afrika'},
  {key:'ZMW',  name:'Zambiya Kvaçası',    sym:'ZMW', flag:'🇿🇲', cat:'afrika'},
  {key:'MAD',  name:'Fas Dirhemi',        sym:'MAD', flag:'🇲🇦', cat:'afrika'},
  {key:'DZD',  name:'Cezayir Dinarı',     sym:'DZD', flag:'🇩🇿', cat:'afrika'},
  {key:'TND',  name:'Tunus Dinarı',       sym:'TND', flag:'🇹🇳', cat:'afrika'},
  {key:'LYD',  name:'Libya Dinarı',       sym:'LYD', flag:'🇱🇾', cat:'afrika'},
  {key:'SDG',  name:'Sudan Poundu',       sym:'SDG', flag:'🇸🇩', cat:'afrika'},
  {key:'AOA',  name:'Angola Kvanzası',    sym:'AOA', flag:'🇦🇴', cat:'afrika'},
  {key:'CDF',  name:'Kongo Frangı',       sym:'CDF', flag:'🇨🇩', cat:'afrika'},
  {key:'MZN',  name:'Mozambik Metikali',  sym:'MZN', flag:'🇲🇿', cat:'afrika'},
  {key:'BWP',  name:'Botsvana Pulası',    sym:'BWP', flag:'🇧🇼', cat:'afrika'},
  {key:'MUR',  name:'Mauritius Rupisi',   sym:'MUR', flag:'🇲🇺', cat:'afrika'},
  {key:'gram-altin',        name:'Gram Altın',        sym:'XAU', flag:'🥇', cat:'altin'},
  {key:'ceyrek-altin',      name:'Çeyrek Altın',      sym:'XAU-CE', flag:'🥇', cat:'altin'},
  {key:'yarim-altin',       name:'Yarım Altın',       sym:'XAU-YR', flag:'🥇', cat:'altin'},
  {key:'tam-altin',         name:'Tam Altın',         sym:'XAU-TA', flag:'🥇', cat:'altin'},
  {key:'cumhuriyet-altini', name:'Cumhuriyet Altını', sym:'XAU-CU', flag:'🥇', cat:'altin'},
  {key:'ata-altin',         name:'Ata Altın',         sym:'XAU-AT', flag:'🥇', cat:'altin'},
  {key:'resat-altin',       name:'Reşat Altın',       sym:'XAU-RS', flag:'🥇', cat:'altin'},
  {key:'14-ayar-altin',     name:'14 Ayar Altın',     sym:'XAU-14', flag:'🥇', cat:'altin'},
  {key:'18-ayar-altin',     name:'18 Ayar Altın',     sym:'XAU-18', flag:'🥇', cat:'altin'},
  {key:'22-ayar-bilezik',   name:'22 Ayar Bilezik',   sym:'XAU-22', flag:'🥇', cat:'altin'},
  {key:'gram-has-altin',    name:'Has Altın (gram)',   sym:'XAU-HS', flag:'🥇', cat:'altin'},
  {key:'gumus',         name:'Gram Gümüş',    sym:'XAG', flag:'🥈', cat:'gumus'},
  {key:'gram-platin',   name:'Gram Platin',   sym:'XPT', flag:'⚙️', cat:'maden'},
  {key:'gram-paladyum', name:'Gram Paladyum', sym:'XPD', flag:'⚙️', cat:'maden'},
];

let dovizKurlar = {};
let dovizSecili = DOVIZ_ASSETS[0];
let dovizAktifCat = 'hepsi';
let dovizYuklendi = false;

let tData = {}; // Sadece döviz çevirici için truncgil verisi
let tDataZaman = 0; // tData'nın en son başarıyla çekildiği zaman (ms) — eskiyse yeniden çeker

function parseTR(s) {
  if(!s) return 0;
  return parseFloat(s.replace(/\$/g,'').replace(/\./g,'').replace(',','.')) || 0;
}

async function dovizInit() {
  const veriVar = Object.keys(tData).length > 0;
  const taze = veriVar && (Date.now() - tDataZaman) < 120000; // 2 dakikadan yeniyse tekrar çekmeye gerek yok
  if(taze) {
    dovizKurlariIsle();
  } else {
    if(!veriVar) document.getElementById('dovizGrid').innerHTML = '<div class="doviz-loading">⟳ Kurlar çekiliyor...</div>';
    try {
      const res = await fetch('https://finans.truncgil.com/today.json?_=' + Date.now(), {cache: 'no-store'});
      tData = await res.json();
      tDataZaman = Date.now();
      dovizKurlariIsle();
    } catch(e) {
      if(veriVar) {
        dovizKurlariIsle(); // elimizdeki eski veriyi göstermeye devam et, ekran boş kalmasın
      } else {
        document.getElementById('dovizGrid').innerHTML = '<div class="doviz-error">⚠️ Bağlantı hatası.</div>';
      }
    }
  }
}

function dovizKurlariIsle() {
  dovizKurlar = {};

  // USD/TRY kuru al (tüm diğerleri için baz)
  const usdRaw = tData['USD'];
  const usdTRY = usdRaw ? parseTR(usdRaw['Satış'] || usdRaw['Alis']) : null;

  // Sabit USD pariteler (API'den gelmeyen para birimleri için)
  const usdParite = {
    PLN:3.98, CZK:23.5, HUF:365, RON:4.57, HRK:7.15, BGN:1.79, ISK:138, UAH:41.5,
    RSD:108, ALL:94, MKD:56.5, BAM:1.79, MDL:17.8, GEL:2.72, AMD:388, AZN:1.70,
    KRW:1345, TWD:32.3, THB:35.2, IDR:15900, PHP:57.5, VND:24800, BDT:110, LKR:300,
    NPR:133, MMK:2100, KHR:4090, MNT:3450, KZT:450, UZS:12800, TMT:3.50, KGS:89,
    TJS:10.9, AFN:72, IRR:42000, IQD:1310, SYP:13000, HKD:7.82, MOP:8.06,
    MXN:17.1, BRL:5.0, ARS:900, CLP:960, COP:3900, PEN:3.75, UYU:39, PYG:7400,
    BOB:6.91, VES:36, GTQ:7.79, CRC:530, DOP:58, CUP:24, JMD:156, TTD:6.79,
    NZD:1.63,
    OMR:0.385, YER:250, ILS:3.68, LBP:89700,
    ZAR:18.6, NGN:1550, KES:130, GHS:15.4, ETB:57, TZS:2520, UGX:3750, ZMW:26,
    MAD:9.98, DZD:134, TND:3.12, LYD:4.83, SDG:600, AOA:850, CDF:2800, MZN:63,
    BWP:13.7, MUR:45
  };

  DOVIZ_ASSETS.forEach(a => {
    const raw = tData[a.key];
    if(raw) {
      const val = raw['Satış'] || raw['Alis'] || null;
      if(val) { dovizKurlar[a.key] = parseTR(val); return; }
    }
    if(usdTRY && usdParite[a.key]) {
      dovizKurlar[a.key] = usdTRY / usdParite[a.key];
    }
  });

  const now = new Date();
  const saat = now.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
  const el = document.getElementById('dovizGuncelSaat');
  if(el) el.innerHTML = 'SON GÜNCELLEME: <span>' + saat + '</span>';
  dovizYuklendi = true;
  dovizGridRender();
  dovizHesapla();
}

function dovizCatSec(el, cat) {
  document.querySelectorAll('.doviz-cat').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  dovizAktifCat = cat;
  dovizGridRender();
}

function dovizGridRender() {
  const liste = dovizAktifCat === 'hepsi' ? DOVIZ_ASSETS : DOVIZ_ASSETS.filter(a => a.cat === dovizAktifCat);
  document.getElementById('dovizGrid').innerHTML = liste.map(a => {
    const kur = dovizKurlar[a.key];
    const kurStr = kur ? '₺' + kur.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
    const secili = dovizSecili.key === a.key ? ' selected' : '';
    return '<div class="doviz-card' + secili + '" onclick="dovizSec(\'' + a.key + '\')">'
      + '<div class="doviz-card-flag">' + a.flag + '</div>'
      + '<div class="doviz-card-name">' + a.name + '</div>'
      + '<div class="doviz-card-sym">' + a.sym + '</div>'
      + '<div class="doviz-card-kur">' + kurStr + '</div>'
      + '</div>';
  }).join('');
}

function dovizSec(key) {
  const asset = DOVIZ_ASSETS.find(a => a.key === key);
  if(!asset) return;
  dovizSecili = asset;
  const badge = document.getElementById('dovizSeciliBadge');
  if(badge) badge.textContent = asset.sym;
  document.querySelectorAll('.doviz-card').forEach(c => c.classList.remove('selected'));
  const clicked = document.querySelector('.doviz-card[onclick*=\'' + key + '\']');
  if(clicked) clicked.classList.add('selected');
  dovizHesapla();
}

function dovizHesapla() {
  if(!dovizYuklendi) return;
  const miktarEl = document.getElementById('dovizMiktar');
  const sonucEl  = document.getElementById('dovizSonuc');
  const kurBilgiEl = document.getElementById('dovizKurBilgi');
  if(!miktarEl || !sonucEl) return;
  const kur = dovizKurlar[dovizSecili.key];
  const miktar = parseFloat(miktarEl.value);
  // Input boşsa hiçbir şey gösterme
  if(!miktarEl.value.trim()) {
    sonucEl.textContent = '—';
    if(kurBilgiEl) kurBilgiEl.textContent = '';
    return;
  }
  if(!kur) { sonucEl.textContent = '—'; if(kurBilgiEl) kurBilgiEl.textContent = 'Kur verisi yok'; return; }
  if(!miktar || isNaN(miktar) || miktar <= 0) {
    sonucEl.textContent = '—';
    if(kurBilgiEl) kurBilgiEl.textContent = '';
    return;
  }
  const toplam = miktar * kur;
  sonucEl.textContent = '₺' + toplam.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(kurBilgiEl) kurBilgiEl.textContent = miktar.toLocaleString('tr-TR') + ' ' + dovizSecili.sym + ' = ₺' + kur.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

// ===================== ÇEVİRİ MODÜLÜ =====================
const CEVIRI_DILLER = [
  {code:'tr', name:'TÜRKÇE',        flag:'🇹🇷'},
  {code:'en', name:'İNGİLİZCE',     flag:'🇬🇧'},
  {code:'de', name:'ALMANCA',        flag:'🇩🇪'},
  {code:'fr', name:'FRANSIZCA',      flag:'🇫🇷'},
  {code:'es', name:'İSPANYOLCA',    flag:'🇪🇸'},
  {code:'it', name:'İTALYANCA',     flag:'🇮🇹'},
  {code:'pt', name:'PORTEKİZCE',    flag:'🇵🇹'},
  {code:'ru', name:'RUSÇA',          flag:'🇷🇺'},
  {code:'ar', name:'ARAPÇA',         flag:'🇸🇦'},
  {code:'zh', name:'ÇİNCE',          flag:'🇨🇳'},
  {code:'ja', name:'JAPONCA',        flag:'🇯🇵'},
  {code:'ko', name:'KORECE',         flag:'🇰🇷'},
  {code:'nl', name:'FELEMENKÇE',    flag:'🇳🇱'},
  {code:'pl', name:'LEHÇE',          flag:'🇵🇱'},
  {code:'sv', name:'İSVEÇÇE',       flag:'🇸🇪'},
  {code:'fa', name:'FARSÇA',         flag:'🇮🇷'},
  {code:'hi', name:'HİNTÇE',        flag:'🇮🇳'},
  {code:'el', name:'YUNANCA',        flag:'🇬🇷'},
  {code:'uk', name:'UKRAYNACA',      flag:'🇺🇦'},
  {code:'az', name:'AZERBAYCANCA',   flag:'🇦🇿'},
];

let ceviriSrc = {code:'tr', name:'TÜRKÇE', flag:'🇹🇷'};
let ceviriTgt = {code:'en', name:'İNGİLİZCE', flag:'🇬🇧'};
let ceviriPickTarget = 'src';
let ceviriLoading = false;

function ceviriCharCount() {
  const el = document.getElementById('ceviriInput');
  const v = el.value;
  const countEl = document.getElementById('ceviriCount');
  if (countEl) countEl.textContent = v.length;
  if (!v.trim()) {
    const sonuc = document.getElementById('ceviriSonuc');
    sonuc.textContent = 'Metin girin ve Çevir butonuna basın.';
    sonuc.className = 'ceviri-result-text';
    const copyBtn = document.getElementById('ceviriCopyBtn');
    if (copyBtn) copyBtn.style.display = 'none';
  }
}

function ceviriKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ceviriYap(); }
}

function ceviriSetText(txt) {
  document.getElementById('ceviriInput').value = txt;
  ceviriCharCount();
  ceviriYap();
}

function ceviriSwapLangs() {
  [ceviriSrc, ceviriTgt] = [ceviriTgt, ceviriSrc];
  ceviriUpdateUI();
  const sonuc = document.getElementById('ceviriSonuc');
  const input = document.getElementById('ceviriInput');
  const t = sonuc.dataset.raw || '';
  if (t) {
    input.value = t;
    ceviriCharCount();
    sonuc.textContent = 'Metin girin ve Çevir butonuna basın.';
    sonuc.dataset.raw = '';
    document.getElementById('ceviriCopyBtn').style.display = 'none';
  }
}

function ceviriUpdateUI() {
  document.getElementById('ceviriSrcFlag').textContent = ceviriSrc.flag;
  document.getElementById('ceviriSrcName').textContent = ceviriSrc.name;
  document.getElementById('ceviriTgtFlag').textContent = ceviriTgt.flag;
  document.getElementById('ceviriTgtName').textContent = ceviriTgt.name;
}

function ceviriPickLang(which) {
  ceviriPickTarget = which;
  const list = document.getElementById('ceviriLangList');
  list.innerHTML = CEVIRI_DILLER.map(d =>
    `<div onclick="ceviriSelectLang('${d.code}')" style="background:#080e18;border:1px solid #1e293b;border-radius:12px;padding:12px 10px;cursor:pointer;display:flex;align-items:center;gap:10px;">
      <span style="font-size:22px">${d.flag}</span>
      <span style="font-size:11px;font-weight:800;color:#e2e8f0;letter-spacing:0.5px">${d.name}</span>
    </div>`
  ).join('');
  document.getElementById('ceviriLangModal').style.display = 'block';
}

function ceviriSelectLang(code) {
  const d = CEVIRI_DILLER.find(x => x.code === code);
  if (!d) return;
  if (ceviriPickTarget === 'src') ceviriSrc = d;
  else ceviriTgt = d;
  ceviriUpdateUI();
  ceviriModalKapat();
}

function ceviriModalKapat() {
  document.getElementById('ceviriLangModal').style.display = 'none';
}

async function ceviriYap() {
  if (ceviriLoading) return;
  const metin = document.getElementById('ceviriInput').value.trim();
  if (!metin) { document.getElementById('ceviriInput').focus(); return; }

  ceviriLoading = true;
  const btn   = document.getElementById('ceviriBtn');
  const sonuc = document.getElementById('ceviriSonuc');

  btn.disabled = true;
  btn.textContent = '⟳ Çevriliyor...';
  sonuc.className = 'ceviri-result-text loading';
  sonuc.textContent = 'Çevriliyor...';

  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + ceviriSrc.code + '&tl=' + ceviriTgt.code + '&dt=t&q=' + encodeURIComponent(metin);
    const resp = await fetch(url);
    const data = await resp.json();
    const ceviri = data[0].map(x => x[0]).join('');
    if (ceviri) {
      sonuc.className = 'ceviri-result-text';
      sonuc.textContent = ceviri;
      sonuc.dataset.raw = ceviri;
      const sc = document.getElementById('ceviriSonucCount');
      if (sc) sc.textContent = ceviri.length + ' karakter';
    } else {
      sonuc.className = 'ceviri-result-text';
      sonuc.textContent = '⚠️ Çeviri yapılamadı.';
      sonuc.dataset.raw = '';
      const sc = document.getElementById('ceviriSonucCount');
      if (sc) sc.textContent = '';
    }
  } catch(e) {
    sonuc.className = 'ceviri-result-text';
    sonuc.textContent = '⚠️ Bağlantı hatası: ' + e.message;
    sonuc.dataset.raw = '';
  }

  ceviriLoading = false;
  btn.disabled = false;
  btn.textContent = '⚡ ÇEVİR';
}
// ===================== / ÇEVİRİ MODÜLÜ =====================

// ===================== DEPREM TAKİP MODÜLÜ =====================
let depremData = [];
let depremFiltreMin = 'hepsi';
let depremYukleniyor = false;

// ── M3+ Kalıcı Önbellek (localStorage, 7 gün) ──────────────────────
const DEPREM_CACHE_KEY  = 'depremM3Cache';
const DEPREM_7GUN_MS    = 7 * 24 * 60 * 60 * 1000;

function depremCacheYukle() {
  try {
    const raw = localStorage.getItem(DEPREM_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function depremCacheKaydet(yeniList) {
  try {
    // Mevcut cache + yeni liste birleştir, 7 günden eskiyi at, tekrar önle
    const mevcutlar = depremCacheYukle();
    const sinir7g   = Date.now() - DEPREM_7GUN_MS;
    const map = new Map();
    [...mevcutlar, ...yeniList].forEach(d => {
      if (!d.date) return;
      // Tarih string'ini anahtar olarak kullan
      const key = d.date + '|' + d.loc;
      if (!map.has(key)) map.set(key, d);
    });
    const temizlenmis = [...map.values()].filter(d => {
      try {
        let s = String(d.date).trim()
          .replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3')
          .replace(' ', 'T');
        if (!s.includes('Z') && !s.includes('+')) s += '+03:00';
        return new Date(s).getTime() >= sinir7g;
      } catch(e) { return true; }
    });
    localStorage.setItem(DEPREM_CACHE_KEY, JSON.stringify(temizlenmis));
  } catch(e) {}
}

function depremSevClass(mag) {
  const m = parseFloat(mag);
  if (m < 2.0) return { cls: 'sev-minor',   label: 'Mikro' };
  if (m < 3.0) return { cls: 'sev-light',   label: 'Küçük' };
  if (m < 4.0) return { cls: 'sev-moderate',label: 'Orta'  };
  if (m < 5.0) return { cls: 'sev-strong',  label: 'Güçlü' };
  if (m < 6.0) return { cls: 'sev-major',   label: 'Büyük' };
  return               { cls: 'sev-great',  label: 'Şiddetli' };
}

function depremZamanFark(dateStr) {
  if (!dateStr) return '—';
  try {
    let s = String(dateStr).trim();
    // "2024.04.10 14:05:22" → "2024-04-10T14:05:22+03:00"
    // "2024-04-10 14:05:22" → "2024-04-10T14:05:22+03:00"
    s = s
      .replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3')  // yıl.ay.gün → yıl-ay-gün
      .replace(' ', 'T');                                    // boşluk → T
    if (!s.includes('Z') && !s.includes('+')) s += '+03:00';
    const d = new Date(s);
    if (isNaN(d.getTime())) return dateStr;
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 0)     return 'az önce';
    if (diff < 60)    return diff + ' sn önce';
    if (diff < 3600)  return Math.floor(diff / 60) + ' dk önce';
    if (diff < 86400) return Math.floor(diff / 3600) + ' saat önce';
    return Math.floor(diff / 86400) + ' gün önce';
  } catch(e) { return dateStr; }
}

function depremTarihSaat(dateStr) {
  if (!dateStr) return '';
  try {
    let s = String(dateStr).trim()
      .replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3')
      .replace(' ', 'T');
    if (!s.includes('Z') && !s.includes('+')) s += '+03:00';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    const gun = d.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' });
    const saat = d.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
    return gun + ' ' + saat;
  } catch(e) { return ''; }
}

const DEPREM_CACHE_TTL = 3 * 60 * 1000; // 3 dakika cache
let depremLastFetch = 0;

async function depremYukle(force = false) {
  if (depremYukleniyor) return;

  // Cache kontrolü — 3 dakika geçmemişse tekrar istek atma
  const now = Date.now();
  if (!force && depremData.length > 0 && (now - depremLastFetch) < DEPREM_CACHE_TTL) {
    depremRender();
    return;
  }

  depremYukleniyor = true;
  const btn = document.getElementById('depremRefreshBtn');
  if (btn) btn.classList.add('spinning');

  document.getElementById('depremList').innerHTML = `
    <div class="deprem-loading">Kandilli Rasathanesi verisi alınıyor...
      <div class="deprem-loading-dot"><span></span><span></span><span></span></div>
    </div>`;
  document.getElementById('depremBigAlert').style.display = 'none';

  try {
    // 4 paralel sayfa → toplam ~2000 kayıt, 7 günü kapsamak için yeterli
    const BASE = 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live?limit=500';
    const pages = await Promise.all([
      fetch(BASE + '&skip=0').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(BASE + '&skip=500').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(BASE + '&skip=1000').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(BASE + '&skip=1500').then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    const seen = new Set();
    const apiList = pages.flatMap(json => {
      if (!json) return [];
      return (json.result || json.data || []);
    }).filter(q => {
      const key = (q.date_time || q.date || q.time || '') + (q.title || q.location || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!apiList.length) throw new Error('Boş yanıt');

    const now24h  = Date.now() - 24 * 60 * 60 * 1000;

    // API verisini dönüştür
    const apiMapped = apiList.map(q => ({
      mag:   parseFloat(q.mag || q.ml || q.mw || 0).toFixed(1),
      loc:   q.title || q.location || q.yer || q.location_properties?.closestCity?.name || 'Bilinmiyor',
      depth: parseFloat(q.depth || q.derinlik || 0).toFixed(1),
      date:  q.date_time || q.date || q.created_at || q.time || '',
    }));

    // M3+ olanları localStorage cache'e kaydet (7 gün kalır)
    const yeniM3 = apiMapped.filter(d => parseFloat(d.mag) >= 3.0);
    depremCacheKaydet(yeniM3);

    // Birleştir: cache'deki 7 günlük M3+ + son 24 saatin tüm depremleri
    const cachedM3 = depremCacheYukle();
    const birlesik = new Map();

    // Önce cache'deki M3+ ekle
    cachedM3.forEach(d => { birlesik.set(d.date + '|' + d.loc, d); });

    // Son 24 saatlik tüm depremleri ekle
    apiMapped.forEach(d => {
      try {
        let s = String(d.date).trim()
          .replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3').replace(' ', 'T');
        if (!s.includes('Z') && !s.includes('+')) s += '+03:00';
        if (isNaN(new Date(s).getTime()) || new Date(s).getTime() >= now24h)
          birlesik.set(d.date + '|' + d.loc, d);
      } catch(e) { birlesik.set(d.date + '|' + d.loc, d); }
    });

    // Yeniden eskiye sırala
    const toMs = s => {
      try {
        let x = String(s).trim().replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3').replace(' ','T');
        if (!x.includes('Z') && !x.includes('+')) x += '+03:00';
        return new Date(x).getTime();
      } catch(e) { return 0; }
    };
    depremData = [...birlesik.values()].sort((a,b) => toMs(b.date) - toMs(a.date));

    depremLastFetch = Date.now();
    depremRender();
    depremIstatistik();
    depremBuyukUyari();

  } catch(e) {
    document.getElementById('depremList').innerHTML = `
      <div class="deprem-error">
        <div style="font-size:32px;margin-bottom:12px;">📡</div>
        <div style="color:#ef4444;font-weight:800;font-size:13px;margin-bottom:8px;">Veri alınamadı</div>
        <div style="font-size:11px;color:#e8f2ff;">İnternet bağlantınızı kontrol edin<br>ve tekrar deneyin.</div>
      </div>`;
  } finally {
    depremYukleniyor = false;
    if (btn) btn.classList.remove('spinning');
  }
}

function depremRender() {
  const list = document.getElementById('depremList');
  const minMag = depremFiltreMin === 'hepsi' ? 0 : parseFloat(depremFiltreMin);
  const filtered = depremData.filter(d => parseFloat(d.mag) >= minMag);

  if (!filtered.length) {
    list.innerHTML = `<div class="deprem-error">Bu filtre için deprem bulunamadı.</div>`;
    return;
  }

  window._depremListData = filtered;
  list.innerHTML = filtered.slice(0, 200).map((d, i) => {
    const sev = depremSevClass(d.mag);
    const locShort = d.loc.length > 35 ? d.loc.substring(0,32)+'...' : d.loc;
    const mag = parseFloat(d.mag);
    return `
      <div class="deprem-card ${sev.cls}" onclick="depremDetayGoster(window._depremListData[${i}])">
        <div class="deprem-card-top">
          <div class="deprem-mag-badge">${d.mag}</div>
          <div class="deprem-info">
            <div class="deprem-loc">${locShort}</div>
            <div class="deprem-sub">
              <span class="deprem-depth">🔻 ${d.depth} km</span>
              <span class="deprem-time">${depremZamanFark(d.date)}</span>
            </div>
            <div class="deprem-bottom-row">
              <div class="deprem-datetime">${depremTarihSaat(d.date)}</div>
              <div class="deprem-tap-hint">Detay için tıkla</div>
            </div>
          </div>
          <div class="deprem-sev-label">${sev.label}</div>
        </div>
      </div>`;
  }).join('');
}

function depremIstatistik() {
  const toplam = depremData.length;
  const mags   = depremData.map(d => parseFloat(d.mag));
  const maxMag = mags.length ? Math.max(...mags).toFixed(1) : '—';
  const orta   = mags.filter(m => m >= 4.0).length;

  document.getElementById('depremStatToplam').textContent = toplam || '—';
  document.getElementById('depremStatMax').textContent    = maxMag;
  document.getElementById('depremStatOrta').textContent   = orta;

  // "Son 7 Gün" bilgisini güncelleme satırına ekle
  const lastUpdateEl = document.getElementById('depremLastUpdate');
  if (lastUpdateEl) {
    lastUpdateEl.textContent =
      '⟳ Son güncelleme: ' + new Date().toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'}) +
      ' · M3+ ve M4+ → son 7 gün, diğerleri → son 24 saat';
  }
}

function depremBuyukUyari() {
  const buyukler = depremData.filter(d => parseFloat(d.mag) >= 3.0);
  const alertDiv = document.getElementById('depremBigAlert');
  if (!buyukler.length) { alertDiv.style.display = 'none'; return; }
  const en = buyukler[0];
  const sev = depremSevClass(en.mag);
  const mag = parseFloat(en.mag);
  const baslik = mag >= 5.0 ? 'BÜYÜK DEPREM' : mag >= 4.0 ? 'DİKKAT — DEPREM' : 'DEPREM';
  alertDiv.style.display = 'block';
  window._depremAlertData = en;
  alertDiv.innerHTML = `
    <div class="deprem-big-alert" onclick="depremDetayAc()">
      <div class="dba-text">
        <div class="dba-title">${baslik} — <span class="dba-mag">M${en.mag}</span></div>
        <div class="dba-body">
          <div class="dba-row">
            <span class="dba-loc">${en.loc}</span>
            <span class="dba-when">🕐 ${depremTarihSaat(en.date)}</span>
          </div>
          <div class="dba-elapsed">${depremZamanFark(en.date)}</div>
          <div class="deprem-tap-hint">Detay için tıkla</div>
        </div>
        </div>
      </div>
    </div>`;
}

function depremDetayAc() {
  depremDetayGoster(window._depremAlertData);
}

function depremDetayGoster(en) {
  if (!en) return;
  const sev = depremSevClass(en.mag);
  document.getElementById('depremDetayMag').textContent = 'M' + en.mag;
  document.getElementById('depremDetayLoc').textContent = en.loc;
  document.getElementById('depremDetayTarih').textContent = depremTarihSaat(en.date) || '—';
  document.getElementById('depremDetayGecen').textContent = depremZamanFark(en.date) || '—';
  document.getElementById('depremDetayDerinlik').textContent = (en.depth ? en.depth + ' km' : '—');
  document.getElementById('depremDetaySiddet').textContent = sev.label;
  document.getElementById('depremDetayModal').classList.add('show');
}

function depremDetayKapat(e) {
  if (e && e.target !== document.getElementById('depremDetayModal')) return;
  document.getElementById('depremDetayModal').classList.remove('show');
}

function depremFiltreSec(el, val) {
  document.querySelectorAll('.deprem-filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  depremFiltreMin = val;
  if (depremData.length) depremRender();
  else depremYukle();
}

function depremInit() {
  if (depremData.length === 0) depremYukle();
}
// ===================== / DEPREM TAKİP MODÜLÜ =====================

