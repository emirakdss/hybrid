// Beslenme sekmesi: seçilen günün öğünleri, günlük hedef, kendi besinlerin, son 7 gün.
import { esc, bugun, gunEkle, fmtGun, fmtKisa, sayi, num } from './util.js';
import { IKON, form, alan, baslik, okDugme } from './ui.js';
import { gunAl, liste, listeYaz, ayar, ayarYaz } from './veri.js';
import { ozetKart, ogunBolum, ogunActs, gunOzet } from './gun.js';

const besinForm = (b = {}) => form(b.ad ? 'Besini düzenle' : 'Besin oluştur',
  alan('Besinin adı', 'ad', b.ad || '', 'required autocomplete="off"') +
  '<p class="muted small">100 g çiğ ürün için değerler:</p>' +
  `<div class="ikili">${alan('Kalori (kcal)', 'kcal', b.kcal ?? '', 'required inputmode="decimal"')}${alan('Protein (g)', 'p', b.p ?? '', 'inputmode="decimal"')}</div>` +
  `<div class="ikili">${alan('Karbonhidrat (g)', 'k', b.k ?? '', 'inputmode="decimal"')}${alan('Yağ (g)', 'y', b.y ?? '', 'inputmode="decimal"')}</div>`,
  b.ad ? { sil: 'Besini sil' } : {});

export async function ciz(s) {
  const t = s.besGun, b = bugun();
  const g = await gunAl(t);
  const hedef = num(await ayar('hedef'));
  const besinler = await liste('besinler');
  const gunler = [];
  for (let i = 0; i < 7; i++) { const gt = gunEkle(b, -i); gunler.push([gt, await gunAl(gt)]); }
  return baslik('Beslenme', t === b ? 'Bugün' : fmtGun(t), okDugme('bes-git', -1, 'Önceki gün', 'data-yon="-1"') + okDugme('bes-git', 1, 'Sonraki gün', 'data-yon="1"')) +
    ozetKart(g, hedef) + ogunBolum(t, g) + `
  <section class="section">
    <div class="section-head"><h2>Günlük hedef</h2></div>
    <div class="card"><div class="satir bosluklu">
      <div class="satir-govde"><span class="satir-ad">${hedef ? `${sayi(hedef)} kcal` : 'Belirlenmedi'}</span><span class="muted">Kalori çubuğu bu hedefe göre dolar. Hedef yoksa günün planı esas alınır.</span></div>
      <button class="btn btn-outline dar" data-act="hedef">Değiştir</button>
    </div></div>
  </section>
  <section class="section">
    <div class="section-head"><h2>Benim besinlerim</h2></div>
    <div class="card">${besinler.map((x, i) => `
      <div class="satir bosluklu"><button class="satir-govde" data-act="besin-ac" data-i="${i}">
        <span class="satir-ad">${esc(x.ad)}</span>
        <span class="muted">100 g: ${sayi(x.kcal)} kcal · P ${sayi(x.p, 1)} · K ${sayi(x.k, 1)} · Y ${sayi(x.y, 1)}</span>
      </button></div>`).join('') || '<p class="empty">Hazır listede olmayan ya da paket değeri farklı olan besinleri buraya ekleyebilirsin.</p>'}</div>
    <button class="btn btn-outline" data-act="besin-yeni">${IKON.arti} Besin oluştur</button>
  </section>
  <section class="section">
    <div class="section-head"><h2>Son 7 gün</h2></div>
    <div class="card">${gunler.map(([gt, gg]) => {
      const { plan, yenen } = gunOzet(gg);
      return `<div class="satir bosluklu"><div class="satir-govde">
        <span class="satir-ad">${gt === b ? 'Bugün' : fmtKisa(gt)}${gg.ekstra.length ? ` <span class="etiket">diyet dışı ${gg.ekstra.length}</span>` : ''}</span>
        <span class="muted">${gg.ogunler.length || gg.ekstra.length ? `${sayi(yenen[0])} kcal alındı · plan ${sayi(plan[0])} · protein ${sayi(yenen[1])} g` : 'Kayıt yok'}</span>
      </div></div>`;
    }).join('')}</div>
  </section>`;
}

export const acts = {
  ...ogunActs,
  'bes-git'(el, s) { s.besGun = gunEkle(s.besGun, Number(el.dataset.yon)); s.basaDon = true; },
  async hedef() {
    const r = await form('Günlük kalori hedefi', alan('Hedef (kcal)', 'hedef', (await ayar('hedef')) || '', 'inputmode="numeric" autocomplete="off"') +
      '<p class="muted small">Boş bırakırsan hedef kaldırılır.</p>');
    if (!r || r === 'sil') return false;
    await ayarYaz('hedef', num(r.hedef) || '');
  },
  async 'besin-yeni'() {
    const r = await besinForm();
    if (!r || r === 'sil') return false;
    const l = await liste('besinler');
    l.unshift({ ad: r.ad.trim(), kcal: num(r.kcal), p: num(r.p), k: num(r.k), y: num(r.y) });
    await listeYaz('besinler', l);
  },
  // Not: düzenleme yalnızca listeyi değiştirir; daha önce öğünlere eklenmiş kalemler eski değerleriyle kalır.
  async 'besin-ac'(el) {
    const l = await liste('besinler');
    const i = Number(el.dataset.i);
    const r = await besinForm(l[i]);
    if (!r) return false;
    if (r === 'sil') l.splice(i, 1);
    else l[i] = { ad: r.ad.trim(), kcal: num(r.kcal), p: num(r.p), k: num(r.k), y: num(r.y) };
    await listeYaz('besinler', l);
  },
};
