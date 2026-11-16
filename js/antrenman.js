// Antrenman: programlar, hareket seçme/oluşturma, antrenman kaydı, koşu ve kardiyo kaydı.
import { esc, uid, bugun, fmtKisa, sayi, num, sureSn, snMetin, tempo } from './util.js';
import { IKON, sayfa, sayfaBas, baslik } from './ui.js';
import { liste, listeYaz, ayar, ayarYaz } from './veri.js';
import { BOLGELER, HAREKETLER } from './data-hareketler.js';

export const KOSU_TURLERI = ['Kolay koşu', 'Tempo koşusu', 'Uzun koşu', 'Interval', 'Yürüyüş', 'Diğer kardiyo'];
const TUR_TIPLERI = ['Koşu', 'Yürüyüş', 'Dinlenme'];
const kucuk = (s) => s.toLocaleLowerCase('tr');
const ozetH = (h) => `${h.set || '–'} × ${h.tekrar || '–'}${h.kilo ? ` × ${sayi(num(h.kilo), 1)} kg` : ''}`;
const geri = (ad) => `<div class="sheet-head"><button type="button" class="icon-btn" data-a="geri" aria-label="Geri">${IKON.sol}</button><h2 class="esnek">${esc(ad)}</h2><button type="button" class="icon-btn" data-kapat aria-label="Kapat">${IKON.x}</button></div>`;

// Set / tekrar / kilo girişleri (program ve antrenman kaydında ortak)
const ucGiris = (h, i) => `
  <div class="uclu">
    <label>Set<input data-f="set" data-i="${i}" inputmode="numeric" value="${esc(h.set)}"></label>
    <label>Tekrar<input data-f="tekrar" data-i="${i}" inputmode="numeric" value="${esc(h.tekrar)}"></label>
    <label>Kilo (kg)<input data-f="kilo" data-i="${i}" inputmode="decimal" value="${esc(h.kilo)}"></label>
  </div>`;

/* ---------- Program oluştur / düzenle ---------- */
export async function programSayfa(id) {
  const programlar = await liste('programlar');
  const ozel = await liste('hareketler');
  const mevcut = programlar.find((p) => p.id === id);
  const p = mevcut ? structuredClone(mevcut) : { id: uid(), ad: '', hareketler: [] };
  const st = { mod: 'ana', bolge: 0, q: '', yeniAd: '', yeniBolge: BOLGELER[0], hata: '' };

  const hareketListe = () => {
    const q = kucuk(st.q);
    const bolge = BOLGELER[st.bolge];
    const tum = [...ozel.map((h) => [h.ad, h.bolge]), ...HAREKETLER.map(([ad, b]) => [ad, BOLGELER[b]])];
    return tum.filter(([ad, b]) => b === bolge && (!q || kucuk(ad).includes(q))).slice(0, 150)
      .map(([ad, b]) => `<button class="liste-satir" data-a="sec" data-ad="${esc(ad)}" data-b="${esc(b)}"><span>${esc(ad)}</span></button>`).join('')
      || '<p class="empty">Bu bölgede eşleşen hareket yok. Aşağıdan oluşturabilirsin.</p>';
  };

  const sonuc = await sayfa({
    ciz() {
      if (st.mod === 'hareket') {
        return geri('Hareket seç') +
          `<div class="cipler" role="group" aria-label="Bölge">${BOLGELER.map((b, i) => `<button class="cip" data-a="bolge" data-i="${i}" aria-pressed="${i === st.bolge}">${b}</button>`).join('')}</div>
           <input data-f="q" placeholder="Hareket ara" aria-label="Hareket ara" value="${esc(st.q)}" autocomplete="off">
           <div class="liste" id="h-liste">${hareketListe()}</div>
           <button class="btn btn-outline" data-a="yeni">Hareket oluştur</button>`;
      }
      if (st.mod === 'yeni') {
        return geri('Hareket oluştur') +
          `<label class="alan"><span>Hareketin adı</span><input data-f="yeniAd" value="${esc(st.yeniAd)}" autocomplete="off"></label>
           <label class="alan"><span>Bölge</span><select data-f="yeniBolge">${BOLGELER.map((b) => `<option${b === st.yeniBolge ? ' selected' : ''}>${b}</option>`).join('')}</select></label>
           ${st.hata ? `<p class="muted" role="alert">${esc(st.hata)}</p>` : ''}
           <button class="btn btn-solid" data-a="yeni-kaydet">Oluştur ve ekle</button>`;
      }
      return sayfaBas(mevcut ? 'Programı düzenle' : 'Program oluştur') +
        `<label class="alan"><span>Programın adı</span><input data-f="ad" value="${esc(p.ad)}" placeholder="İtiş günü" autocomplete="off"></label>
         ${p.hareketler.map((h, i) => `
           <div class="kutu">
             <div class="satir-ara"><strong>${esc(h.ad)}</strong><button class="icon-btn soluk" data-a="cikar" data-i="${i}" aria-label="Çıkar: ${esc(h.ad)}">${IKON.x}</button></div>
             <span class="muted">${esc(h.bolge)}</span>${ucGiris(h, i)}
           </div>`).join('')}
         <button class="btn btn-outline" data-a="hareket">${IKON.arti} Hareket ekle</button>
         ${st.hata ? `<p class="muted" role="alert">${esc(st.hata)}</p>` : ''}
         <button class="btn btn-solid" data-a="kaydet">Kaydet</button>
         ${mevcut ? '<button class="btn btn-outline" data-a="sil">Programı sil</button>' : ''}`;
    },
    deg(el) {
      const f = el.dataset.f;
      if (f === 'q') { st.q = el.value; document.getElementById('h-liste').innerHTML = hareketListe(); }
      else if (f === 'ad') p.ad = el.value;
      else if (f === 'yeniAd' || f === 'yeniBolge') st[f] = el.value;
      else if (f) p.hareketler[el.dataset.i][f] = el.value;
    },
    acts: {
      hareket() { st.mod = 'hareket'; st.q = ''; st.hata = ''; },
      geri() { st.mod = st.mod === 'yeni' ? 'hareket' : 'ana'; st.hata = ''; },
      bolge(el) { st.bolge = Number(el.dataset.i); },
      sec(el) { p.hareketler.push({ ad: el.dataset.ad, bolge: el.dataset.b, set: '', tekrar: '', kilo: '' }); st.mod = 'ana'; },
      cikar(el) { p.hareketler.splice(Number(el.dataset.i), 1); },
      yeni() { st.mod = 'yeni'; st.yeniAd = st.q; st.yeniBolge = BOLGELER[st.bolge]; },
      async 'yeni-kaydet'() {
        const ad = st.yeniAd.trim();
        if (!ad) { st.hata = 'Hareketin adını yaz.'; return; }
        if (!ozel.some((h) => kucuk(h.ad) === kucuk(ad))) { ozel.unshift({ ad, bolge: st.yeniBolge }); await listeYaz('hareketler', ozel); }
        p.hareketler.push({ ad, bolge: st.yeniBolge, set: '', tekrar: '', kilo: '' });
        st.mod = 'ana'; st.hata = '';
      },
      kaydet(_, api) {
        if (!p.ad.trim()) { st.hata = 'Programa bir ad ver.'; return; }
        if (!p.hareketler.length) { st.hata = 'En az bir hareket ekle.'; return; }
        api.bitir('kaydet'); return false;
      },
      sil(_, api) { if (confirm(`"${p.ad}" programı silinsin mi? Geçmiş kayıtlar kalır.`)) api.bitir('sil'); return false; },
    },
  });
  if (sonuc === 'kaydet') {
    p.ad = p.ad.trim();
    await listeYaz('programlar', mevcut ? programlar.map((x) => (x.id === p.id ? p : x)) : [...programlar, p]);
  } else if (sonuc === 'sil') {
    await listeYaz('programlar', programlar.filter((x) => x.id !== p.id));
  }
  return sonuc;
}

/* ---------- Antrenman kaydı (bir programı yapmak) ---------- */
// Dönen değer: kaydın kimliği, silindiyse 'sil', vazgeçildiyse null.
export async function antrenmanSayfa({ tarih, programId, kayitId }) {
  const kayitlar = await liste('kayitlar');
  const mevcut = kayitlar.find((k) => k.id === kayitId);
  const program = (await liste('programlar')).find((p) => p.id === (mevcut ? mevcut.programId : programId));
  if (!mevcut && !program) { alert('Bu program silinmiş. Antrenman sekmesinden yeni bir program seçebilirsin.'); return null; }
  // Aynı programın bu tarihten önceki son kaydı: "geçen sefer" değerleri buradan gelir.
  const onceki = kayitlar.filter((k) => k.tip === 'program' && k.programId === (program || mevcut).id && k.id !== kayitId && k.tarih <= tarih)
    .sort((a, b) => (a.tarih < b.tarih ? 1 : -1))[0];
  const gecen = (ad) => onceki && onceki.hareketler.find((h) => h.ad === ad);
  const k = mevcut ? structuredClone(mevcut) : {
    id: uid(), tip: 'program', tarih, programId: program.id, ad: program.ad,
    hareketler: program.hareketler.map((h) => ({ ...h, ...(gecen(h.ad) ? { set: gecen(h.ad).set, tekrar: gecen(h.ad).tekrar, kilo: gecen(h.ad).kilo } : {}) })),
  };
  const sonuc = await sayfa({
    ciz: () => sayfaBas(k.ad) +
      `<p class="muted">${fmtKisa(k.tarih)}${onceki ? ` · önceki kayıt ${fmtKisa(onceki.tarih)}` : ' · bu programın ilk kaydı'}</p>
       ${k.hareketler.map((h, i) => `
         <div class="kutu"><strong>${esc(h.ad)}</strong>
           <span class="muted">${gecen(h.ad) ? `Geçen sefer: ${ozetH(gecen(h.ad))}` : 'Önceki kayıt yok'}</span>${ucGiris(h, i)}
         </div>`).join('')}
       <button class="btn btn-solid" data-a="kaydet">Antrenmanı kaydet</button>
       ${mevcut ? '<button class="btn btn-outline" data-a="sil">Kaydı sil</button>' : ''}`,
    deg(el) { if (el.dataset.f) k.hareketler[el.dataset.i][el.dataset.f] = el.value; },
    acts: {
      kaydet(_, api) { api.bitir('kaydet'); return false; },
      sil(_, api) { if (confirm('Bu antrenman kaydı silinsin mi?')) api.bitir('sil'); return false; },
    },
  });
  if (sonuc === 'kaydet') { await listeYaz('kayitlar', mevcut ? kayitlar.map((x) => (x.id === k.id ? k : x)) : [...kayitlar, k]); return k.id; }
  if (sonuc === 'sil') { await listeYaz('kayitlar', kayitlar.filter((x) => x.id !== k.id)); return 'sil'; }
  return null;
}

/* ---------- Koşu / kardiyo kaydı ---------- */
export async function kosuSayfa({ tarih, tur, kayitId }) {
  const kayitlar = await liste('kayitlar');
  const mevcut = kayitlar.find((x) => x.id === kayitId);
  const k = mevcut ? structuredClone(mevcut) : {
    id: uid(), tip: 'kosu', tarih, tur: tur || KOSU_TURLERI[0], km: '', sure: '', nabiz: '', nabizMaks: '',
    cihaz: (await ayar('cihaz')) || '', turlar: [], not: '',
  };
  const tempoMetin = () => tempo(sureSn(k.sure), num(k.km)) || '–';
  const sonuc = await sayfa({
    ciz: () => sayfaBas(mevcut ? 'Kaydı düzenle' : 'Koşu / kardiyo kaydı') +
      `<p class="muted">${fmtKisa(k.tarih)}</p>
       <label class="alan"><span>Tür</span><select data-f="tur">${KOSU_TURLERI.map((t) => `<option${t === k.tur ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
       <div class="ikili">
         <label class="alan"><span>Mesafe (km)</span><input data-f="km" inputmode="decimal" value="${esc(k.km)}" placeholder="5,2"></label>
         <label class="alan"><span>Süre (dk:sn)</span><input data-f="sure" inputmode="numbers-and-punctuation" value="${esc(k.sure)}" placeholder="32:15"></label>
       </div>
       <p class="muted">Ortalama tempo: <b id="tempo">${tempoMetin()}</b></p>
       <div class="ikili">
         <label class="alan"><span>Ort. nabız</span><input data-f="nabiz" inputmode="numeric" value="${esc(k.nabiz)}"></label>
         <label class="alan"><span>Maks. nabız</span><input data-f="nabizMaks" inputmode="numeric" value="${esc(k.nabizMaks)}"></label>
       </div>
       <label class="alan"><span>Cihaz</span><input data-f="cihaz" value="${esc(k.cihaz)}" placeholder="Saat ya da uygulama adı" autocomplete="off"></label>
       <h3>Turlar</h3>
       ${k.turlar.map((t, i) => `
         <div class="tur">
           <select data-f="tip" data-i="${i}" aria-label="Tur ${i + 1} türü">${TUR_TIPLERI.map((x) => `<option${x === t.tip ? ' selected' : ''}>${x}</option>`).join('')}</select>
           <input data-f="m" data-i="${i}" inputmode="numeric" value="${esc(t.m)}" placeholder="metre" aria-label="Tur ${i + 1} mesafe (metre)">
           <input data-f="sure" data-i="${i}" inputmode="numbers-and-punctuation" value="${esc(t.sure)}" placeholder="dk:sn" aria-label="Tur ${i + 1} süre">
           <button class="icon-btn soluk" data-a="tur-sil" data-i="${i}" aria-label="Tur ${i + 1} sil">${IKON.x}</button>
         </div>`).join('') || '<p class="muted">Interval ya da koş-yürü yaptıysan turları tek tek ekleyebilirsin.</p>'}
       <button class="btn btn-outline" data-a="tur-ekle">${IKON.arti} Tur ekle</button>
       <label class="alan"><span>Not</span><textarea data-f="not" rows="2">${esc(k.not)}</textarea></label>
       <button class="btn btn-solid" data-a="kaydet">Kaydet</button>
       ${mevcut ? '<button class="btn btn-outline" data-a="sil">Kaydı sil</button>' : ''}`,
    deg(el) {
      const f = el.dataset.f;
      if (!f) return;
      if (el.dataset.i !== undefined) k.turlar[el.dataset.i][f] = el.value;
      else k[f] = el.value;
      if (f === 'km' || f === 'sure') { const t = document.getElementById('tempo'); if (t && el.dataset.i === undefined) t.textContent = tempoMetin(); }
    },
    acts: {
      // Yeni tur, iki önceki turu örnek alır: 400 m koşu / 200 m yürüyüş gibi dönüşümlü girişler hızlanır.
      'tur-ekle'() { k.turlar.push({ ...(k.turlar.at(-2) || { tip: 'Koşu', m: '' }), sure: '' }); },
      'tur-sil'(el) { k.turlar.splice(Number(el.dataset.i), 1); },
      kaydet(_, api) { api.bitir('kaydet'); return false; },
      sil(_, api) { if (confirm('Bu kayıt silinsin mi?')) api.bitir('sil'); return false; },
    },
  });
  if (sonuc === 'kaydet') {
    if (k.cihaz.trim()) await ayarYaz('cihaz', k.cihaz.trim());
    await listeYaz('kayitlar', mevcut ? kayitlar.map((x) => (x.id === k.id ? k : x)) : [...kayitlar, k]);
    return k.id;
  }
  if (sonuc === 'sil') { await listeYaz('kayitlar', kayitlar.filter((x) => x.id !== k.id)); return 'sil'; }
  return null;
}

export const kosuOzet = (k) => [
  num(k.km) ? `${sayi(num(k.km), 2)} km` : '', k.sure ? snMetin(sureSn(k.sure)) : '', tempo(sureSn(k.sure), num(k.km)),
  k.nabiz ? `${k.nabiz} nabız` : '', k.turlar.length ? `${k.turlar.length} tur` : '',
].filter(Boolean).join(' · ') || 'Ayrıntı girilmedi';

/* ---------- Antrenman sekmesi ---------- */
export async function ciz() {
  const programlar = await liste('programlar');
  const kayitlar = (await liste('kayitlar')).sort((a, b) => (a.tarih < b.tarih ? 1 : -1)).slice(0, 30);
  return baslik('Antrenman') + `
  <section class="section">
    <div class="section-head"><h2>Programlar</h2></div>
    <div class="card">${programlar.map((p) => `
      <div class="satir bosluklu">
        <button class="satir-govde" data-act="prog-ac" data-id="${p.id}"><span class="satir-ad">${esc(p.ad)}</span><span class="muted">${p.hareketler.length} hareket · düzenle</span></button>
        <button class="btn btn-outline dar" data-act="prog-baslat" data-id="${p.id}">Başlat</button>
      </div>`).join('') || '<p class="empty">Henüz program yok. İlk programını oluştur, hareketlerini ekle.</p>'}</div>
    <button class="btn btn-outline" data-act="prog-yeni">${IKON.arti} Program oluştur</button>
  </section>
  <section class="section">
    <div class="section-head"><h2>Koşu ve kardiyo</h2></div>
    <button class="btn btn-outline" data-act="kosu-yeni">${IKON.arti} Koşu / kardiyo kaydı ekle</button>
  </section>
  <section class="section">
    <div class="section-head"><h2>Geçmiş</h2></div>
    <div class="card">${kayitlar.map((k) => `
      <div class="satir bosluklu">
        <button class="satir-govde" data-act="kayit-ac" data-id="${k.id}">
          <span class="satir-ad">${esc(k.tip === 'kosu' ? k.tur : k.ad)} <span class="muted normal">· ${fmtKisa(k.tarih)}</span></span>
          <span class="muted">${esc(k.tip === 'kosu' ? kosuOzet(k) : k.hareketler.map((h) => `${h.ad} ${ozetH(h)}`).join(', '))}${k.tip === 'kosu' && k.cihaz ? ` · ${esc(k.cihaz)}` : ''}</span>
        </button>
      </div>`).join('') || '<p class="empty">Kaydedilen antrenman yok.</p>'}</div>
  </section>`;
}

export const acts = {
  'prog-yeni': () => programSayfa(),
  'prog-ac': (el) => programSayfa(el.dataset.id),
  'prog-baslat': (el) => antrenmanSayfa({ tarih: bugun(), programId: el.dataset.id }),
  'kosu-yeni': () => kosuSayfa({ tarih: bugun() }),
  async 'kayit-ac'(el) {
    const k = (await liste('kayitlar')).find((x) => x.id === el.dataset.id);
    if (!k) return;
    return k.tip === 'kosu' ? kosuSayfa({ tarih: k.tarih, kayitId: k.id }) : antrenmanSayfa({ tarih: k.tarih, kayitId: k.id });
  },
};
