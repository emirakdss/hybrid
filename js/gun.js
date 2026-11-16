// Gün ekranı (Bugün sekmesi): kalori özeti, öğünler, antrenman, yapılacaklar.
// Öğün bölümü Beslenme sekmesinde de kullanılır.
import { esc, uid, bugun, gunEkle, fmtGun, fmtKisa, sayi, num } from './util.js';
import { IKON, chk, form, sayfa, sayfaBas, alan, secim, baslik, okDugme, dosyaVer, cubuk } from './ui.js';
import { gunAl, gunYaz, liste, listeYaz, ayar } from './veri.js';
import { BESINLER } from './data-besinler.js';
import { todoBolum, todoActs } from './plan.js';
import { antrenmanSayfa, kosuSayfa, KOSU_TURLERI } from './antrenman.js';
import { icsUret } from './ics.js';

const kucuk = (s) => s.toLocaleLowerCase('tr');
const tarihOf = (el) => el.closest('[data-tarih]').dataset.tarih;

/* ---------- Hesap ---------- */
// Kalem: { ad, gram, d: [kcal, protein, karbonhidrat, yağ] }  (d değerleri 100 g çiğ ürün içindir)
export const topla = (kalemler) => kalemler.reduce((a, k) => a.map((v, i) => v + (k.d[i] * k.gram) / 100), [0, 0, 0, 0]);
export function gunOzet(g) {
  const plan = topla(g.ogunler.flatMap((o) => o.kalemler));
  const yenen = topla(g.ogunler.filter((o) => o.yendi).flatMap((o) => o.kalemler));
  yenen[0] += g.ekstra.reduce((a, e) => a + num(e.kcal), 0);   // diyet dışı yenenlerin kalorisi (girildiyse)
  return { plan, yenen };
}

// Başlık bloğunun içindeki özet: kalori halkası + makro çubukları (makrolar günün planına göre dolar).
const CEVRE = 2 * Math.PI * 50;
export function ozetBlok(g, hedef) {
  const { plan, yenen } = gunOzet(g);
  const taban = hedef || plan[0];
  const oran = taban ? Math.min(1, yenen[0] / taban) : 0;
  const m = (ad, i) => `<div class="m"><span>${ad}</span><b>${sayi(yenen[i])}${plan[i] ? ` / ${sayi(plan[i])}` : ''} g</b>${cubuk(plan[i] ? yenen[i] / plan[i] : 0, `${ad}: plandaki ${sayi(plan[i])} gramın ${sayi(yenen[i])} gramı`)}</div>`;
  return `
  <div class="ozet-blok">
    <div class="halka" role="img" aria-label="${taban ? `${sayi(taban)} kcal içinden ${sayi(yenen[0])} kcal alındı` : `${sayi(yenen[0])} kcal alındı`}">
      <svg viewBox="0 0 120 120"><circle class="iz" cx="60" cy="60" r="50"/><circle class="dolu" cx="60" cy="60" r="50" transform="rotate(-90 60 60)" style="--o:${(CEVRE * (1 - oran)).toFixed(1)}"/></svg>
      <div class="halka-ic"><strong>${sayi(yenen[0])}</strong><span>${taban ? `/ ${sayi(taban)} kcal` : 'kcal'}</span></div>
    </div>
    <div class="makrolar">${m('Protein', 1)}${m('Karbonhidrat', 2)}${m('Yağ', 3)}</div>
  </div>`;
}

// Seri: art arda kaç gün plana uyuldu (öğün planı var, hepsi yendi, diyet dışı kayıt yok).
// Bugün henüz tamamlanmadıysa seri dünden geriye sayılır, yani gün bitmeden bozulmuş görünmez.
const uyuldu = (g) => g.ogunler.length > 0 && g.ogunler.every((o) => o.yendi) && !g.ekstra.length;
export async function seriHesap() {
  let t = bugun(), n = 0;
  if (!uyuldu(await gunAl(t))) t = gunEkle(t, -1);
  while (n < 365 && uyuldu(await gunAl(t))) { n++; t = gunEkle(t, -1); }
  return n;
}

/* ---------- Öğünler ---------- */
export function ogunBolum(t, g) {
  const ogunAd = (id) => (g.ogunler.find((o) => o.id === id) || {}).ad || 'Genel';
  return `
  <section class="section" data-renk="b" data-tarih="${t}">
    <div class="section-head"><h2>Öğünler</h2>${g.ogunler.length ? `<span class="muted">${g.ogunler.filter((o) => o.yendi).length} / ${g.ogunler.length}</span>` : ''}</div>
    <div class="card">${g.ogunler.map((o) => `
      <div class="satir">${chk(o.yendi, 'ogun-tik', o.id, `${o.ad} yendi`)}
        <button class="satir-govde" data-act="ogun-ac" data-id="${o.id}">
          <span class="satir-ad">${esc(o.ad)}${o.saat ? ` <span class="muted normal">· ${esc(o.saat)}</span>` : ''}${g.ekstra.some((e) => e.ogunId === o.id) ? ' <span class="etiket">diyet dışı</span>' : ''}</span>
          <span class="muted">${esc(o.kalemler.map((k) => `${k.ad} ${sayi(k.gram)} g`).join(', ') || 'Besin eklenmedi')}</span>
        </button>
        <span class="satir-sag muted">${sayi(topla(o.kalemler)[0])} kcal</span>
      </div>`).join('') || '<p class="empty">Bu gün için öğün planlanmadı.</p>'}</div>
    <div class="ikili">
      <button class="btn btn-outline" data-act="ogun-ekle">${IKON.arti} Öğün ekle</button>
      ${g.ogunler.length ? '<button class="btn btn-outline" data-act="ogun-tekrar">Günü tekrarla</button>' : ''}
    </div>
    <button class="btn btn-outline" data-act="ekstra-ekle">Diyeti bozdum / ekstra yedim</button>
    ${g.ekstra.length ? `<div class="card">${g.ekstra.map((e) => `
      <div class="satir bosluklu">
        <div class="satir-govde"><span class="satir-ad">${esc(e.ne)} <span class="muted normal">· ${esc(ogunAd(e.ogunId))}${num(e.kcal) ? ` · ${sayi(num(e.kcal))} kcal` : ''}</span></span>
          ${e.not ? `<span class="muted">${esc(e.not)}</span>` : ''}</div>
        <button class="icon-btn soluk" data-act="ekstra-sil" data-id="${e.id}" aria-label="Sil: ${esc(e.ne)}">${IKON.x}</button>
      </div>`).join('')}</div>` : ''}
  </section>`;
}

const OGUN_ADLARI = ['Kahvaltı', 'Öğle', 'Akşam', 'Ara öğün'];

async function ogunSayfa(t, id) {
  const g = await gunAl(t);
  const mevcut = g.ogunler.find((o) => o.id === id);
  const o = mevcut ? structuredClone(mevcut) : { id: uid(), ad: OGUN_ADLARI[g.ogunler.length] || 'Ara öğün', saat: '', kalemler: [], yendi: false };
  const ozel = await liste('besinler');
  const st = { mod: 'ana', q: '', y: {}, hata: '' };
  const tum = () => [...ozel.map((b) => [b.ad, b.kcal, b.p, b.k, b.y, 'Benim besinlerim']), ...BESINLER];
  const besinListe = () => {
    const q = kucuk(st.q);
    return tum().map((b, i) => [b, i]).filter(([b]) => !q || kucuk(b[0]).includes(q)).slice(0, 80)
      .map(([b, i]) => `<button class="liste-satir" data-a="sec" data-i="${i}"><span>${esc(b[0])}</span><span class="muted">${sayi(b[1])} kcal · P ${sayi(b[2], 1)} · K ${sayi(b[3], 1)} · Y ${sayi(b[4], 1)}</span></button>`).join('')
      || '<p class="empty">Bulunamadı. Aşağıdan oluşturabilirsin.</p>';
  };
  const toplamMetin = () => { const [kcal, p, k, y] = topla(o.kalemler); return `${sayi(kcal)} kcal · Protein ${sayi(p)} g · Karb. ${sayi(k)} g · Yağ ${sayi(y)} g`; };
  const geri = (ad) => `<div class="sheet-head"><button type="button" class="icon-btn" data-a="geri" aria-label="Geri">${IKON.sol}</button><h2 class="esnek">${ad}</h2><button type="button" class="icon-btn" data-kapat aria-label="Kapat">${IKON.x}</button></div>`;

  const sonuc = await sayfa({
    ciz() {
      if (st.mod === 'besin') {
        return geri('Besin seç') +
          `<input data-f="q" placeholder="Besin ara" aria-label="Besin ara" value="${esc(st.q)}" autocomplete="off">
           <p class="muted small">Değerler 100 g çiğ ürün içindir ve yaklaşıktır.</p>
           <div class="liste" id="b-liste">${besinListe()}</div>
           <button class="btn btn-outline" data-a="yeni">Besin oluştur</button>`;
      }
      if (st.mod === 'yeni') {
        const g2 = (etiket, k, ek = 'inputmode="decimal"') => `<label class="alan"><span>${etiket}</span><input data-f="y.${k}" value="${esc(st.y[k] || '')}" ${ek} autocomplete="off"></label>`;
        return geri('Besin oluştur') + g2('Besinin adı', 'ad', '') +
          `<p class="muted small">100 g çiğ ürün için değerler:</p>
           <div class="ikili">${g2('Kalori (kcal)', 'kcal')}${g2('Protein (g)', 'p')}</div>
           <div class="ikili">${g2('Karbonhidrat (g)', 'k')}${g2('Yağ (g)', 'y')}</div>
           ${st.hata ? `<p class="muted" role="alert">${esc(st.hata)}</p>` : ''}
           <button class="btn btn-solid" data-a="yeni-kaydet">Oluştur ve ekle</button>`;
      }
      return sayfaBas(mevcut ? 'Öğünü düzenle' : 'Öğün ekle') +
        `<div class="ikili">
           <label class="alan"><span>Öğünün adı</span><input data-f="ad" value="${esc(o.ad)}" autocomplete="off"></label>
           <label class="alan dar-alan"><span>Saat</span><input data-f="saat" type="time" value="${esc(o.saat)}"></label>
         </div>
         ${o.kalemler.map((k, i) => `
           <div class="kalem"><span class="esnek">${esc(k.ad)}</span>
             <input data-f="gram" data-i="${i}" inputmode="decimal" value="${esc(k.gram)}" aria-label="${esc(k.ad)} gram"><span class="muted">g</span>
             <button class="icon-btn soluk" data-a="cikar" data-i="${i}" aria-label="Çıkar: ${esc(k.ad)}">${IKON.x}</button>
           </div>`).join('') || '<p class="muted">Henüz besin eklenmedi. Gramajı çiğ ağırlık olarak gir.</p>'}
         <button class="btn btn-outline" data-a="besin">${IKON.arti} Besin ekle</button>
         <p class="muted" id="o-toplam">${toplamMetin()}</p>
         ${st.hata ? `<p class="muted" role="alert">${esc(st.hata)}</p>` : ''}
         <button class="btn btn-solid" data-a="kaydet">Kaydet</button>
         ${mevcut ? '<button class="btn btn-outline" data-a="sil">Öğünü sil</button>' : ''}`;
    },
    deg(el) {
      const f = el.dataset.f;
      if (f === 'q') { st.q = el.value; document.getElementById('b-liste').innerHTML = besinListe(); }
      else if (f === 'gram') { o.kalemler[el.dataset.i].gram = num(el.value); document.getElementById('o-toplam').textContent = toplamMetin(); }
      else if (f === 'ad' || f === 'saat') o[f] = el.value;
      else if (f && f.startsWith('y.')) st.y[f.slice(2)] = el.value;
    },
    acts: {
      besin() { st.mod = 'besin'; st.q = ''; st.hata = ''; },
      geri() { st.mod = st.mod === 'yeni' ? 'besin' : 'ana'; st.hata = ''; },
      sec(el) { const b = tum()[el.dataset.i]; o.kalemler.push({ ad: b[0], gram: 100, d: b.slice(1, 5) }); st.mod = 'ana'; },
      cikar(el) { o.kalemler.splice(Number(el.dataset.i), 1); },
      yeni() { st.mod = 'yeni'; st.y = { ad: st.q }; },
      async 'yeni-kaydet'() {
        const ad = (st.y.ad || '').trim();
        if (!ad) { st.hata = 'Besinin adını yaz.'; return; }
        if (st.y.kcal === undefined || st.y.kcal === '') { st.hata = 'Kaloriyi gir (100 g için).'; return; }
        const b = { ad, kcal: num(st.y.kcal), p: num(st.y.p), k: num(st.y.k), y: num(st.y.y) };
        ozel.unshift(b);
        await listeYaz('besinler', ozel);
        o.kalemler.push({ ad, gram: 100, d: [b.kcal, b.p, b.k, b.y] });
        st.mod = 'ana'; st.hata = '';
      },
      kaydet(_, api) { if (!o.ad.trim()) { st.hata = 'Öğüne bir ad ver.'; return; } api.bitir('kaydet'); return false; },
      sil(_, api) { if (confirm(`"${o.ad}" öğünü silinsin mi?`)) api.bitir('sil'); return false; },
    },
  });
  if (!sonuc) return false;
  const g2 = await gunAl(t);
  if (sonuc === 'kaydet') {
    o.ad = o.ad.trim();
    g2.ogunler = mevcut ? g2.ogunler.map((x) => (x.id === o.id ? o : x)) : [...g2.ogunler, o];
  } else {
    g2.ogunler = g2.ogunler.filter((x) => x.id !== o.id);
    g2.ekstra.forEach((e) => { if (e.ogunId === o.id) e.ogunId = ''; });
  }
  await gunYaz(t, g2);
}

export const ogunActs = {
  'ogun-ekle': (el) => ogunSayfa(tarihOf(el)),
  'ogun-ac': (el) => ogunSayfa(tarihOf(el), el.dataset.id),
  async 'ogun-tik'(el) {
    const t = tarihOf(el), g = await gunAl(t);
    const o = g.ogunler.find((x) => x.id === el.dataset.id);
    if (o) { o.yendi = !o.yendi; await gunYaz(t, g); }
  },
  // Bu günün öğünlerini sonraki N güne kopyalar (işaretler sıfırlanır).
  async 'ogun-tekrar'(el) {
    const t = tarihOf(el), g = await gunAl(t);
    const r = await form('Günü tekrarla',
      `<p class="muted">${fmtKisa(t)} gününün öğünleri, sonraki günlere aynen kopyalanır. O günlerde istediğin öğünü ayrıca değiştirebilirsin.</p>` +
      alan('Kaç gün tekrarlansın?', 'n', '7', 'type="number" min="1" max="60" required inputmode="numeric"'), { kaydet: 'Kopyala' });
    if (!r || r === 'sil') return false;
    const n = Math.min(60, Math.max(1, Math.round(num(r.n))));
    const hedefler = [];
    for (let i = 1; i <= n; i++) { const ht = gunEkle(t, i); hedefler.push([ht, await gunAl(ht)]); }
    const dolu = hedefler.filter(([, h]) => h.ogunler.length).length;
    if (dolu && !confirm(`${dolu} günde zaten öğün planı var. Bu günlerin öğünleri silinip yerine kopyalanan plan yazılsın mı?`)) return false;
    for (const [ht, h] of hedefler) {
      h.ogunler = g.ogunler.map((o) => ({ ...structuredClone(o), id: uid(), yendi: false }));
      await gunYaz(ht, h);
    }
    alert(`Öğünler ${n} güne kopyalandı (${fmtKisa(gunEkle(t, 1))} – ${fmtKisa(gunEkle(t, n))}).`);
  },
  async 'ekstra-ekle'(el) {
    const t = tarihOf(el), g = await gunAl(t);
    const r = await form('Diyet dışı / ekstra',
      secim('Hangi öğünde?', 'ogunId', [['', 'Genel (öğün dışı)'], ...g.ogunler.map((o) => [o.id, o.ad])]) +
      alan('Ne yedin?', 'ne', '', 'required autocomplete="off"') +
      alan('Tahmini kalori (isteğe bağlı)', 'kcal', '', 'inputmode="numeric" autocomplete="off"') +
      '<label class="alan"><span>Not: neden, nasıl oldu?</span><textarea name="not" rows="3"></textarea></label>');
    if (!r || r === 'sil') return false;
    g.ekstra.push({ id: uid(), ogunId: r.ogunId, ne: r.ne.trim(), kcal: r.kcal, not: r.not.trim() });
    await gunYaz(t, g);
  },
  async 'ekstra-sil'(el) {
    if (!confirm('Bu kayıt silinsin mi?')) return false;
    const t = tarihOf(el), g = await gunAl(t);
    g.ekstra = g.ekstra.filter((e) => e.id !== el.dataset.id);
    await gunYaz(t, g);
  },
};

/* ---------- Günün antrenmanları ---------- */
function antBolum(t, g) {
  return `
  <section class="section" data-renk="a" data-tarih="${t}">
    <div class="section-head"><h2>Antrenman</h2>${g.antrenman.length ? `<span class="muted">${g.antrenman.filter((a) => a.yapildi).length} / ${g.antrenman.length}</span>` : ''}</div>
    <div class="card">${g.antrenman.map((a) => `
      <div class="satir">${chk(a.yapildi, 'ant-tik', a.id, `${a.ad} yapıldı`)}
        <button class="satir-govde" data-act="ant-ac" data-id="${a.id}">
          <span class="satir-ad">${esc(a.ad)}${a.saat ? ` <span class="muted normal">· ${esc(a.saat)}</span>` : ''}</span>
          <span class="muted">${esc([a.hedef, a.kayitId ? 'kaydedildi' : 'kaydı girmek için dokun'].filter(Boolean).join(' · '))}</span>
        </button>
        <button class="icon-btn soluk" data-act="ant-sil" data-id="${a.id}" aria-label="Plandan çıkar: ${esc(a.ad)}">${IKON.x}</button>
      </div>`).join('') || '<p class="empty">Bu gün için antrenman planlanmadı.</p>'}</div>
    <button class="btn btn-outline" data-act="ant-ekle">${IKON.arti} Antrenman ekle</button>
  </section>`;
}

const antActs = {
  async 'ant-ekle'(el) {
    const t = tarihOf(el);
    const programlar = await liste('programlar');
    const r = await form('Antrenman ekle',
      secim('Ne yapacaksın?', 'sec', [...programlar.map((p) => ['p:' + p.id, 'Program: ' + p.ad]), ...KOSU_TURLERI.map((k) => ['k:' + k, k])]) +
      (programlar.length ? '' : '<p class="muted small">Ağırlık programı eklemek için önce Antrenman sekmesinden program oluştur.</p>') +
      alan('Hedef ya da not (isteğe bağlı)', 'hedef', '', 'placeholder="5 km, 6:15 tempo" autocomplete="off"') +
      alan('Saat (isteğe bağlı)', 'saat', '', 'type="time"'), { kaydet: 'Ekle' });
    if (!r || r === 'sil') return false;
    const g = await gunAl(t);
    const [tip, deger] = [r.sec[0], r.sec.slice(2)];
    const p = programlar.find((x) => x.id === deger);
    g.antrenman.push(tip === 'p'
      ? { id: uid(), tip: 'program', programId: deger, ad: p.ad, hedef: r.hedef.trim(), saat: r.saat, yapildi: false }
      : { id: uid(), tip: 'kosu', ad: deger, hedef: r.hedef.trim(), saat: r.saat, yapildi: false });
    await gunYaz(t, g);
  },
  async 'ant-ac'(el) {
    const t = tarihOf(el);
    const a0 = (await gunAl(t)).antrenman.find((x) => x.id === el.dataset.id);
    if (!a0) return;
    const r = a0.tip === 'program'
      ? await antrenmanSayfa({ tarih: t, programId: a0.programId, kayitId: a0.kayitId })
      : await kosuSayfa({ tarih: t, tur: a0.ad, kayitId: a0.kayitId });
    if (!r) return false;
    const g = await gunAl(t);
    const a = g.antrenman.find((x) => x.id === el.dataset.id);
    if (r === 'sil') { delete a.kayitId; a.yapildi = false; } else { a.kayitId = r; a.yapildi = true; }
    await gunYaz(t, g);
  },
  async 'ant-tik'(el) {
    const t = tarihOf(el), g = await gunAl(t);
    const a = g.antrenman.find((x) => x.id === el.dataset.id);
    if (a) { a.yapildi = !a.yapildi; await gunYaz(t, g); }
  },
  async 'ant-sil'(el) {
    const t = tarihOf(el), g = await gunAl(t);
    const a = g.antrenman.find((x) => x.id === el.dataset.id);
    if (!a || !confirm(`"${a.ad}" bu günün planından çıkarılsın mı?${a.kayitId ? ' Girilen kayıt Geçmiş\'te kalır.' : ''}`)) return false;
    g.antrenman = g.antrenman.filter((x) => x.id !== a.id);
    await gunYaz(t, g);
  },
};

/* ---------- Gün ekranı ---------- */
export async function ciz(s) {
  const t = s.gun, b = bugun();
  const g = await gunAl(t);
  const ad = t === b ? 'Bugün' : t === gunEkle(b, 1) ? 'Yarın' : t === gunEkle(b, -1) ? 'Dün' : fmtKisa(t);
  const todolar = await liste('yapilacak');
  // Günün ilerlemesi: işaretlenen öğün + antrenman + yapılacak / hepsi
  const isler = [...g.ogunler.map((o) => o.yendi), ...g.antrenman.map((a) => a.yapildi), ...todolar.filter((x) => x.kapsam === 'gun' && x.t === t).map((x) => x.tamam)];
  const biten = isler.filter(Boolean).length;
  const seri = await seriHesap();
  const ek = ozetBlok(g, num(await ayar('hedef'))) + `
    <div class="hero-alt">
      <span class="rozet">${IKON.alev}${seri ? `Seri <b>${seri} gün</b>` : 'Seri başlamadı'}</span>
      <div class="gun-il"><span>${isler.length ? `Gün %${Math.round((biten / isler.length) * 100)} tamam · ${biten} / ${isler.length}` : 'Bu gün için plan yok'}</span>${cubuk(isler.length ? biten / isler.length : 0, 'Günün ilerlemesi')}</div>
    </div>`;
  return baslik(ad, fmtGun(t), okDugme('gun-git', -1, 'Önceki gün', 'data-yon="-1"') + okDugme('gun-git', 1, 'Sonraki gün', 'data-yon="1"'), { renk: 'b', ek }) +
    ogunBolum(t, g) + antBolum(t, g) +
    todoBolum('Yapılacaklar', 'gun', t, todolar) +
    `<section class="section" data-tarih="${t}">
       ${t === b ? '<button class="btn btn-solid" data-act="gun-yarin">Yarını planla</button>' : '<button class="btn btn-solid" data-act="gun-bugun">Bugüne dön</button>'}
       <button class="btn btn-outline" data-act="takvim">Hatırlatmaları takvime aktar</button>
     </section>`;
}

export const acts = {
  ...ogunActs, ...antActs, ...todoActs,
  'gun-git'(el, s) { s.gun = gunEkle(s.gun, Number(el.dataset.yon)); s.basaDon = true; },
  'gun-yarin'(el, s) { s.gun = gunEkle(bugun(), 1); s.basaDon = true; },
  'gun-bugun'(el, s) { s.gun = bugun(); s.basaDon = true; },
  // Saati girilmiş öğün ve antrenmanları .ics dosyası olarak verir; iPhone bunu Takvim'e ekler.
  async takvim(el) {
    const t = tarihOf(el), g = await gunAl(t);
    const olaylar = [
      ...g.ogunler.filter((o) => o.saat).map((o) => ({ id: o.id, saat: o.saat, dakika: 30, baslik: o.ad, aciklama: o.kalemler.map((k) => `${k.ad} ${sayi(k.gram)} g`).join(', ') })),
      ...g.antrenman.filter((a) => a.saat).map((a) => ({ id: a.id, saat: a.saat, dakika: 60, baslik: a.ad, aciklama: a.hedef })),
    ];
    if (!olaylar.length) { alert('Bu günde saati girilmiş öğün ya da antrenman yok. Hatırlatma almak istediklerine saat ekle, sonra tekrar dene.'); return false; }
    await dosyaVer(new File([icsUret(t, olaylar)], `hybrid-${t}.ics`, { type: 'text/calendar' })).catch((e) => { if (e.name !== 'AbortError') alert('Dosya hazırlanamadı: ' + e.message); });
    return false;
  },
};
