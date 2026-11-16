// Yapılacaklar: günlük, haftalık ve aylık üç ayrı liste.
import { esc, uid, bugun, gunEkle, haftaBasi, ayBasi, ayEkle, fmtGun, fmtHafta, fmtAy } from './util.js';
import { IKON, chk, baslik, okDugme } from './ui.js';
import { liste, listeYaz } from './veri.js';

// Bir kapsam + dönem için liste bölümü. Bugün ekranı da bunu kullanır.
export function todoBolum(ad, kapsam, t, hepsi, gezgin = '') {
  const m = hepsi.filter((x) => x.kapsam === kapsam && x.t === t);
  const satirlar = m.map((x) => `
    <div class="satir">${chk(x.tamam, 'todo-tik', x.id, x.metin)}
      <span class="satir-metin${x.tamam ? ' tamam' : ''}">${esc(x.metin)}</span>
      <button class="icon-btn soluk" data-act="todo-sil" data-id="${x.id}" aria-label="Sil: ${esc(x.metin)}">${IKON.x}</button>
    </div>`).join('');
  return `
  <section class="section" data-kapsam="${kapsam}" data-t="${t}">
    <div class="section-head"><h2>${ad}</h2>${m.length ? `<span class="muted">${m.filter((x) => x.tamam).length} / ${m.length}</span>` : ''}</div>
    ${gezgin}
    <div class="card">${satirlar || '<p class="empty">Henüz madde yok.</p>'}</div>
    <form class="ekle" data-form="todo-ekle">
      <input name="metin" placeholder="Yeni madde" aria-label="${ad}: yeni madde" required autocomplete="off">
      <button class="icon-btn kare" aria-label="Ekle">${IKON.arti}</button>
    </form>
  </section>`;
}

export const todoActs = {
  async 'todo-ekle'(f) {
    const b = f.closest('[data-kapsam]').dataset;
    const metin = f.metin.value.trim();
    if (!metin) return false;
    const l = await liste('yapilacak');
    l.push({ id: uid(), kapsam: b.kapsam, t: b.t, metin, tamam: false });
    await listeYaz('yapilacak', l);
  },
  async 'todo-tik'(el) {
    const l = await liste('yapilacak');
    const x = l.find((y) => y.id === el.dataset.id);
    if (x) { x.tamam = !x.tamam; await listeYaz('yapilacak', l); }
  },
  async 'todo-sil'(el) {
    const l = await liste('yapilacak');
    await listeYaz('yapilacak', l.filter((y) => y.id !== el.dataset.id));
  },
};

const gezgin = (k, etiket) => `<div class="gezgin">${okDugme('plan-git', -1, 'Önceki', `data-k="${k}" data-yon="-1"`)}<span>${esc(etiket)}</span>${okDugme('plan-git', 1, 'Sonraki', `data-k="${k}" data-yon="1"`)}</div>`;

export async function ciz(s) {
  const l = await liste('yapilacak');
  return baslik('Plan') +
    todoBolum('Günlük', 'gun', s.planGun, l, gezgin('gun', s.planGun === bugun() ? 'Bugün' : fmtGun(s.planGun))) +
    todoBolum('Haftalık', 'hafta', s.planHafta, l, gezgin('hafta', s.planHafta === haftaBasi(bugun()) ? 'Bu hafta' : fmtHafta(s.planHafta))) +
    todoBolum('Aylık', 'ay', s.planAy, l, gezgin('ay', fmtAy(s.planAy)));
}

export const acts = {
  ...todoActs,
  'plan-git'(el, s) {
    const yon = Number(el.dataset.yon);
    if (el.dataset.k === 'gun') s.planGun = gunEkle(s.planGun, yon);
    else if (el.dataset.k === 'hafta') s.planHafta = gunEkle(s.planHafta, 7 * yon);
    else s.planAy = ayEkle(s.planAy, yon);
  },
};
