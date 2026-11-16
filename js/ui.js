// Alttan açılan sayfa (dialog#sheet), onay kutusu ve ikonlar.
import { esc } from './util.js';

export const IKON = {
  x: '<svg aria-hidden="true" viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
  arti: '<svg aria-hidden="true" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  sol: '<svg aria-hidden="true" viewBox="0 0 24 24"><polyline points="15 5 8 12 15 19"/></svg>',
  sag: '<svg aria-hidden="true" viewBox="0 0 24 24"><polyline points="9 5 16 12 9 19"/></svg>',
  alev: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-1.8.8-3 1.8-4 .4 1.6 1.2 2.3 2 2.5C10.300 9 11 6 12 3z"/></svg>',
  tik: '<svg aria-hidden="true" viewBox="0 0 24 24"><polyline points="5 12.5 10 17.5 19 7.5"/></svg>',
};

// Onay kutusu: 44 px dokunma alanı, içinde 26 px kutu.
export const chk = (isaretli, act, id, etiket) =>
  `<button class="chk" data-act="${act}" data-id="${esc(id)}" aria-pressed="${!!isaretli}" aria-label="${esc(etiket)}"><span>${isaretli ? IKON.tik : ''}</span></button>`;

const dlg = () => document.getElementById('sheet');
const bas = (baslik) => `<div class="sheet-head"><h2>${esc(baslik)}</h2><button type="button" class="icon-btn" data-kapat aria-label="Kapat">${IKON.x}</button></div>`;

// Basit form: alanları verirsin, Kaydet'e basılınca {ad: deger} döner. Vazgeçilirse null, silinirse 'sil'.
export function form(baslik, govde, o = {}) {
  return new Promise((coz) => {
    const d = dlg();
    let sonuc = null;
    d.innerHTML = `<form class="sheet" method="dialog">${bas(baslik)}${govde}
      <button class="btn btn-solid" value="ok">${o.kaydet || 'Kaydet'}</button>
      ${o.sil ? `<button type="button" class="btn btn-outline" data-sil>${o.sil}</button>` : ''}</form>`;
    const f = d.firstElementChild;
    f.addEventListener('submit', () => { sonuc = Object.fromEntries(new FormData(f)); });
    d.onclick = (e) => {
      if (e.target === d || e.target.closest('[data-kapat]')) d.close();
      else if (e.target.closest('[data-sil]')) { sonuc = 'sil'; d.close(); }
    };
    d.oninput = null;
    d.onclose = () => { d.onclick = null; coz(sonuc); };
    d.showModal();
  });
}

// Değişken içerikli sayfa: ciz() HTML döndürür; [data-a] tıklamaları acts'e, yazılanlar deg'e gider.
// acts içinden api.bitir(deger) çağrılınca kapanır ve o değer döner.
export function sayfa({ ciz, acts = {}, deg }) {
  return new Promise((coz) => {
    const d = dlg();
    let sonuc = null;
    const api = {
      ciz: () => { const y = d.scrollTop; d.innerHTML = `<div class="sheet">${ciz()}</div>`; d.scrollTop = y; },
      bitir: (v) => { sonuc = v; d.close(); },
    };
    d.onclick = async (e) => {
      if (e.target === d || e.target.closest('[data-kapat]')) return d.close();
      const el = e.target.closest('[data-a]');
      if (!el || !acts[el.dataset.a]) return;
      const r = await acts[el.dataset.a](el, api);
      if (r !== false && d.open) api.ciz();
    };
    d.oninput = (e) => deg && deg(e.target, api);
    d.onclose = () => { d.onclick = d.oninput = null; coz(sonuc); };
    api.ciz();
    d.showModal();
  });
}
export const sayfaBas = bas;

// Sık kullanılan alan kalıpları
export const alan = (etiket, ad, deger = '', ek = '') =>
  `<label class="alan"><span>${esc(etiket)}</span><input name="${ad}" value="${esc(deger)}" ${ek}></label>`;
export const secim = (etiket, ad, secenekler, deger = '') =>
  `<label class="alan"><span>${esc(etiket)}</span><select name="${ad}">${secenekler.map((s) => {
    const [v, t] = Array.isArray(s) ? s : [s, s];
    return `<option value="${esc(v)}"${String(v) === String(deger) ? ' selected' : ''}>${esc(t)}</option>`;
  }).join('')}</select></label>`;

// Dosyayı paylaş (iPhone) ya da indir (diğer).
export async function dosyaVer(dosya) {
  if (navigator.canShare && navigator.canShare({ files: [dosya] })) return navigator.share({ files: [dosya] });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(dosya);
  a.download = dosya.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Ekran başlığı: üstte küçük açıklama, altında başlık, sağda düğmeler ve Ayarlar.
const AYAR = '<button class="icon-btn" data-ayarlar aria-label="Ayarlar"><svg aria-hidden="true" viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.2" fill="var(--bg)"/><circle cx="15" cy="12" r="2.2" fill="var(--bg)"/><circle cx="8" cy="17" r="2.2" fill="var(--bg)"/></svg></button>';
export const baslik = (ad, ust = '', dugmeler = '', o = {}) => `
  <div class="hero" data-renk="${o.renk || 'b'}">
    <header class="head">
      <div class="head-text">${ust ? `<span class="muted">${esc(ust)}</span>` : ''}<h1>${esc(ad)}</h1></div>
      <div class="head-btns">${dugmeler}${AYAR}</div>
    </header>
    ${o.ek || ''}
  </div>`;
// Küçük ilerleme çubuğu (0-1 arası oran)
export const cubuk = (oran, etiket) => `<div class="cubuk" role="img" aria-label="${esc(etiket)}"><div style="width:${Math.round(Math.min(1, Math.max(0, oran || 0)) * 100)}%"></div></div>`;
// Önceki / sonraki düğmeleri
export const okDugme = (act, yon, etiket, ek = '') =>
  `<button class="icon-btn" data-act="${act}" ${ek} aria-label="${esc(etiket)}">${yon < 0 ? IKON.sol : IKON.sag}</button>`;
