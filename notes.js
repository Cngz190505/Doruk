/* Doruk module: notes.js */
// NOTLAR
let notes = (() => {
  try {
    const raw = localStorage.getItem('c_notes');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch(e) {
    console.warn('notesLoad: veri okunamadı, mevcut liste korunuyor');
  }
  return [];
})();

// ===== NOT DEFTERİ ŞİFRE SİSTEMİ =====
let notesUnlocked = true; // Notlar her zaman görünür, PIN işlem anında sorulur

function notesCheckLock() {
  renderNotes();
}

function notesShowPwdModal() {
  const existing = document.getElementById('notesPwdModal');
  if (existing) existing.remove();
  const hasPwd = !!localStorage.getItem('c_notes_pwd');
  const modal = document.createElement('div');
  modal.id = 'notesPwdModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.75);';
  modal.innerHTML = `
    <div style="background:linear-gradient(160deg,#0d1e36,#070d18);border:1px solid rgba(168,85,247,0.25);border-top-color:rgba(168,85,247,0.4);border-radius:24px 24px 0 0;padding:24px 24px calc(36px + env(safe-area-inset-bottom, 16px));width:100%;max-width:420px;text-align:center;max-height:92dvh;overflow-y:auto;">
      <div style="width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);margin:0 auto 18px;"></div>
      <div style="font-size:13px;font-weight:900;color:#c4b5fd;letter-spacing:1.5px;margin-bottom:6px;">${hasPwd?'PIN DEĞİŞTİR':'PIN BELİRLE'}</div>
      <div style="font-size:10px;color:rgba(180,180,200,0.45);margin-bottom:20px;">4 haneli PIN girin</div>
      ${hasPwd ? `
        <div style="font-size:10px;color:#7aa0c4;letter-spacing:1px;margin-bottom:8px;font-weight:700;">MEVCUT PIN</div>
        <div id="pinSetDots0" style="display:flex;justify-content:center;gap:10px;margin-bottom:14px;">
          <div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div>
        </div>` : ''}
      <div style="font-size:10px;color:#7aa0c4;letter-spacing:1px;margin-bottom:8px;font-weight:700;">${hasPwd?'YENİ PIN':'YENİ PIN'}</div>
      <div id="pinSetDots1" style="display:flex;justify-content:center;gap:10px;margin-bottom:14px;">
        <div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div>
      </div>
      <div style="font-size:10px;color:#7aa0c4;letter-spacing:1px;margin-bottom:8px;font-weight:700;">TEKRAR</div>
      <div id="pinSetDots2" style="display:flex;justify-content:center;gap:10px;margin-bottom:18px;">
        <div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div>
      </div>
      <div id="pinSetErr" style="font-size:11px;color:#f87171;margin-bottom:10px;display:none;"></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:220px;margin:0 auto 16px;">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
          <button onclick="pinSetPress('${k}')" style="padding:14px 0;border-radius:12px;border:1px solid rgba(168,85,247,${k===''?'0':'0.18'});background:${k===''?'transparent':'rgba(168,85,247,0.07)'};color:${k==='⌫'?'#f87171':'#e2e8f0'};font-size:17px;font-weight:800;cursor:${k===''?'default':'pointer'};pointer-events:${k===''?'none':'auto'};transition:0.12s;" ${k===''?'disabled':''}>
            ${k}
          </button>`).join('')}
      </div>
      <div style="display:flex;gap:10px;">
        <button onclick="document.getElementById('notesPwdModal').remove()" style="flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#7aa0c4;font-size:12px;font-weight:700;cursor:pointer;">İPTAL</button>
        ${hasPwd ? '<button onclick="pinRemovePwd()" style="flex:1;padding:12px;border-radius:12px;border:1px solid rgba(239,68,68,0.25);background:rgba(239,68,68,0.06);color:#f87171;font-size:12px;font-weight:700;cursor:pointer;">KALDIR</button>' : ''}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window._pinSetStep = 0; // 0=eski(varsa), 1=yeni, 2=tekrar
  window._pinSetVals = ['','',''];
  if (!hasPwd) window._pinSetStep = 1;
}

function pinSetPress(k) {
  const step = window._pinSetStep;
  if (step > 2) return;
  if (k === '⌫') {
    window._pinSetVals[step] = window._pinSetVals[step].slice(0,-1);
  } else {
    if (window._pinSetVals[step].length >= 4) return;
    window._pinSetVals[step] += k;
  }
  const dotId = step === 0 ? 'pinSetDots0' : step === 1 ? 'pinSetDots1' : 'pinSetDots2';
  const container = document.getElementById(dotId);
  if (container) {
    const dots = container.querySelectorAll('.pin-dot');
    dots.forEach((d,i) => {
      d.style.background = i < window._pinSetVals[step].length ? '#c4b5fd' : 'rgba(168,85,247,0.15)';
      d.style.transform = i < window._pinSetVals[step].length ? 'scale(1.15)' : 'scale(1)';
    });
  }
  if (window._pinSetVals[step].length === 4) {
    setTimeout(() => pinSetNext(), 150);
  }
}

function pinSetNext() {
  const hasPwd = !!localStorage.getItem('c_notes_pwd');
  const err = document.getElementById('pinSetErr');
  const step = window._pinSetStep;
  if (step === 0) {
    if (window._pinSetVals[0] !== localStorage.getItem('c_notes_pwd')) {
      err.textContent='Mevcut PIN yanlış!'; err.style.display='block';
      setTimeout(() => { err.style.display='none'; window._pinSetVals[0]='';
        document.getElementById('pinSetDots0')?.querySelectorAll('.pin-dot').forEach(d=>{ d.style.background='rgba(168,85,247,0.15)'; d.style.transform='scale(1)'; }); }, 1200);
      return;
    }
    window._pinSetStep = 1; return;
  }
  if (step === 1) { window._pinSetStep = 2; return; }
  if (step === 2) {
    if (window._pinSetVals[1] !== window._pinSetVals[2]) {
      err.textContent='PIN\'ler eşleşmiyor!'; err.style.display='block';
      setTimeout(() => { err.style.display='none'; window._pinSetVals[1]=''; window._pinSetVals[2]=''; window._pinSetStep=1;
        ['pinSetDots1','pinSetDots2'].forEach(id => document.getElementById(id)?.querySelectorAll('.pin-dot').forEach(d=>{ d.style.background='rgba(168,85,247,0.15)'; d.style.transform='scale(1)'; })); }, 1400);
      return;
    }
    localStorage.setItem('c_notes_pwd', window._pinSetVals[1]);
    notesUnlocked = true;
    document.getElementById('notesPwdModal').remove();
  }
}

function pinRemovePwd() {
  if (window._pinSetVals[0] !== localStorage.getItem('c_notes_pwd')) {
    const err = document.getElementById('pinSetErr');
    err.textContent='Önce mevcut PIN\'i doğrulayın'; err.style.display='block';
    setTimeout(()=>err.style.display='none',1500);
    return;
  }
  localStorage.removeItem('c_notes_pwd');
  notesUnlocked = true;
  document.getElementById('notesPwdModal').remove();
}

// Android geri tuşu ile PIN modallarını kapat
(function setupPinBackHandler() {
  function closePinModals() {
    const m1 = document.getElementById('notesPwdModal');
    const m2 = document.getElementById('pinConfirmModal');
    if (m1) { m1.remove(); history.go(1); return true; }
    if (m2) { m2.remove(); history.go(1); return true; }
    return false;
  }

  // Push a dummy state so back button can be captured
  function pushPinState() {
    history.pushState({ pinModal: true }, '');
  }

  // Intercept popstate (Android back button fires this)
  window.addEventListener('popstate', function(e) {
    if (closePinModals()) {
      // Modal kapatıldı, history state zaten tükendi
    }
  });

  // Modal her açıldığında history state push et
  const _origNotesShowPwdModal = notesShowPwdModal;
  window.notesShowPwdModal = function() {
    _origNotesShowPwdModal();
    pushPinState();
  };

  const _origPinConfirm = pinConfirm;
  window.pinConfirm = function(cb) {
    _origPinConfirm(cb);
    pushPinState();
  };
})();

function notesSavePwd() {} // eski - kullanılmıyor
function notesRemovePwd() {} // eski - kullanılmıyor
let pnoteSelectedColor = 'cyan';
const pnoteColorMap = { cyan:'#00d4ff', purple:'#a855f7', amber:'#f59e0b', rose:'#f43f5e', green:'#22c55e' };

function pnoteSelectColor(el) {
  document.querySelectorAll('.pnote-color').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  pnoteSelectedColor = el.dataset.color;
}

function saveNote() {
  const id = document.getElementById('editNoteId').value;
  const t  = document.getElementById('noteTitle').value.trim();
  const tx = document.getElementById('noteText').value.trim();
  if (!t) { document.getElementById('noteTitle').focus(); return; }
  const pwd = localStorage.getItem('c_notes_pwd');
  if (pwd) {
    pinConfirm(() => _doSaveNote(id, t, tx));
  } else {
    _doSaveNote(id, t, tx);
  }
}

function _doSaveNote(id, t, tx) {
  if (id) {
    const idx = notes.findIndex(n => n.id == id);
    notes[idx] = { id: parseInt(id), title: t, text: tx, color: pnoteSelectedColor, date: notes[idx].date };
  } else {
    notes.unshift({ id: Date.now(), title: t, text: tx, color: pnoteSelectedColor, date: new Date().toLocaleDateString('tr-TR') + ' ' + new Date().toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) });
  }
  localStorage.setItem('c_notes', JSON.stringify(notes));
  resetNoteForm();
  renderNotes();
}

// PIN doğrulama mini modal — callback ile çalışır
function pinConfirm(onSuccess) {
  const existing = document.getElementById('pinConfirmModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'pinConfirmModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99500;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.7);';
  modal.innerHTML = `
    <div style="background:linear-gradient(160deg,#0d1e36,#070d18);border:1px solid rgba(168,85,247,0.25);border-top-color:rgba(168,85,247,0.4);border-radius:24px 24px 0 0;padding:20px 24px calc(36px + env(safe-area-inset-bottom, 16px));width:100%;max-width:420px;text-align:center;max-height:92dvh;overflow-y:auto;">
      <div style="width:32px;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);margin:0 auto 16px;"></div>
      <div style="font-size:12px;font-weight:900;color:#c4b5fd;letter-spacing:2px;margin-bottom:4px;">PIN GİR</div>
      <div style="font-size:10px;color:rgba(180,180,200,0.45);margin-bottom:16px;">İşlemi onaylamak için PIN gerekli</div>
      <div id="pinCfmDots" style="display:flex;justify-content:center;gap:12px;margin-bottom:18px;">
        <div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;max-width:220px;margin:0 auto 14px;">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k=>`
          <button onclick="pinCfmPress('${k}')" style="padding:15px 0;border-radius:13px;border:1px solid rgba(168,85,247,${k===''?'0':'0.18'});background:${k===''?'transparent':'rgba(168,85,247,0.07)'};color:${k==='⌫'?'#f87171':'#e2e8f0'};font-size:18px;font-weight:800;cursor:${k===''?'default':'pointer'};pointer-events:${k===''?'none':'auto'};transition:0.1s;" ${k===''?'disabled':''}>
            ${k}
          </button>`).join('')}
      </div>
      <div id="pinCfmErr" style="font-size:11px;color:#f87171;margin-bottom:10px;min-height:16px;"></div>
      <button onclick="document.getElementById('pinConfirmModal').remove()" style="padding:11px 32px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#7aa0c4;font-size:12px;font-weight:700;cursor:pointer;">İPTAL</button>
    </div>
  `;
  document.body.appendChild(modal);
  window._pinCfmVal = '';
  window._pinCfmCb = onSuccess;
}

function pinCfmPress(k) {
  if (k === '⌫') {
    window._pinCfmVal = window._pinCfmVal.slice(0,-1);
  } else {
    if (window._pinCfmVal.length >= 4) return;
    window._pinCfmVal += k;
  }
  const dots = document.querySelectorAll('#pinCfmDots .pin-dot');
  dots.forEach((d,i) => {
    d.style.background = i < window._pinCfmVal.length ? '#c4b5fd' : 'rgba(168,85,247,0.15)';
    d.style.transform  = i < window._pinCfmVal.length ? 'scale(1.15)' : 'scale(1)';
  });
  if (window._pinCfmVal.length === 4) {
    setTimeout(() => {
      if (window._pinCfmVal === localStorage.getItem('c_notes_pwd')) {
        document.getElementById('pinConfirmModal')?.remove();
        if (window._pinCfmCb) window._pinCfmCb();
      } else {
        const err = document.getElementById('pinCfmErr');
        if (err) err.textContent = 'Yanlış PIN!';
        dots.forEach(d => d.style.background = '#f87171');
        setTimeout(() => {
          window._pinCfmVal = '';
          dots.forEach((d,i) => { d.style.background='rgba(168,85,247,0.15)'; d.style.transform='scale(1)'; });
          if (err) err.textContent = '';
        }, 700);
      }
    }, 120);
  }
}

function resetNoteForm() {
  document.getElementById('editNoteId').value = '';
  document.getElementById('noteTitle').value  = '';
  document.getElementById('noteText').value   = '';
  document.getElementById('pnoteCharCount').textContent = '';
  const saveBtn = document.getElementById('saveNoteBtn');
  saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> KAYDET`;
}

function renderNotes() {
  const list  = document.getElementById('notesList');
  const empty = document.getElementById('pnoteEmpty');
  const count = document.getElementById('pnoteCount');
  if (count) count.textContent = notes.length + ' not';
  if (!notes.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  list.innerHTML = notes.map(n => {
    const col = pnoteColorMap[n.color] || '#00d4ff';
    return `
    <div class="note-item" style="--note-color:${col}">
      <div class="note-item-inner">
        <div class="note-dot"></div>
        <div class="note-content">
          <div class="note-title">${n.title}</div>
          
          <div class="note-meta">
            <div style="display:flex;align-items:center;">
              <span class="note-date">${(n.date||'').split(' ')[0]}</span>
              <span class="note-time">${(n.date||'').split(' ')[1]||''}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <div onclick="editNote(${n.id})" style="cursor:pointer;width:26px;height:26px;border-radius:8px;background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.06);display:flex;align-items:center;justify-content:center;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <div class="note-delete" onclick="deleteNote(${n.id})">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function editNote(id) {
  const pwd = localStorage.getItem('c_notes_pwd');
  if (pwd) {
    pinConfirm(() => _doEditNote(id));
  } else {
    _doEditNote(id);
  }
}

function _doEditNote(id) {
  const n = notes.find(x => x.id == id);
  document.getElementById('editNoteId').value = n.id;
  document.getElementById('noteTitle').value  = n.title;
  document.getElementById('noteText').value   = n.text;
  pnoteSelectedColor = n.color || 'cyan';
  document.querySelectorAll('.pnote-color').forEach(c => {
    c.classList.toggle('active', c.dataset.color === pnoteSelectedColor);
  });
  const saveBtn = document.getElementById('saveNoteBtn');
  saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> GÜNCELLE`;
  document.getElementById('noteTitle').focus();
}

function deleteNote(id) {
  const pwd = localStorage.getItem('c_notes_pwd');
  if (pwd) {
    pinConfirm(() => _doDeleteNote(id));
  } else {
    _doDeleteNote(id);
  }
}

function _doDeleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  localStorage.setItem('c_notes', JSON.stringify(notes));
  renderNotes();
}

