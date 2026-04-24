const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors());

app.get('/maclar', async (req, res) => {
  try {
    const r = await axios.get('https://api.iddaa.com.tr/SportsProgram/basic/1', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.iddaa.com/' },
      timeout: 8000
    });
    const events = r.data?.data?.events || [];
    const maclar = events.map((e, i) => {
      const t = (e.en || '').split(' - ');
      const getO = (m, o) => { try { return e.m[m].o[o].odd.toFixed(2); } catch { return '—'; } };
      return {
        id: e.bsc || String(i),
        kod: e.bsc || '',
        lig: e.tn || 'LİG',
        saat: e.edh || '--:--',
        ev: t[0]?.trim() || 'Ev',
        dep: t[1]?.trim() || 'Dep',
        oranlar: { o1: getO(0,0), oX: getO(0,1), o2: getO(0,2), altUst25A: getO(1,0), altUst25U: getO(1,1), altUst15A: getO(2,0), altUst15U: getO(2,1), kgVar: getO(3,0), kgYok: getO(3,1) }
      };
    });
    res.json({ source: 'iddaa', maclar });
  } catch(e) {
    res.status(502).json({ error: e.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.listen(process.env.PORT || 3000, () => console.log('Çalışıyor'));
