import * as db from './db.js';

const SURUM = '0.1.0';
const YEDEK_BICIM = 1;
const $ = (s, kok = document) => kok.querySelector(s);

/* ---------- Ekranlar ---------- */
const bugunTarih = () =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date());

const AYAR_DUGMESI = `
  <button class="icon-btn" data-ayarlar aria-label="Ayarlar">
    <svg aria-hidden="true" viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.2" fill="var(--bg)"/><circle cx="15" cy="12" r="2.2" fill="var(--bg)"/><circle cx="8" cy="17" r="2.2" fill="var(--bg)"/></svg>
  </button>`;

const baslik = (ad, ust = '') => `
  <header class="head">
    <div class="head-text">${ust ? `<span class="muted">${ust}</span>` : ''}<h1>${ad}</h1></div>
    ${AYAR_DUGMESI}
  </header>`;

const bolum = (ad, bosMetin) => `
  <section class="section">
    <div class="section-head"><h2>${ad}</h2></div>
    <div class="card"><p class="empty">${bosMetin}</p></div>
  </section>`;

const EKRANLAR = {
  bugun: () => baslik('Bugün', bugunTarih()) +
    bolum('Öğünler', 'Bugün için öğün planlanmadı.') +
    bolum('Antrenman', 'Bugün için antrenman planlanmadı.') +
    bolum('Yapılacaklar', 'Bugün için yapılacak yok.') +
    `<button class="btn btn-solid" disabled>Yarını planla</button>`,
  antrenman: () => baslik('Antrenman') +
    bolum('Programlar', 'Henüz program yok. Bu bölüm Faz 3 ile gelecek.') +
    bolum('Koşu ve kardiyo', 'Henüz kayıt yok. Bu bölüm Faz 5 ile gelecek.'),
  beslenme: () => baslik('Beslenme') +
    bolum('Öğün planı', 'Henüz plan yok. Bu bölüm Faz 4 ile gelecek.'),
  plan: () => baslik('Plan') +
    bolum('Günlük', 'Henüz madde yok. Bu bölüm Faz 2 ile gelecek.') +
    bolum('Haftalık', 'Henüz madde yok.') +
    bolum('Aylık', 'Henüz madde yok.'),
};

function goster(sekme) {
  if (!EKRANLAR[sekme]) sekme = 'bugun';
  $('#view').innerHTML = EKRANLAR[sekme]();
  for (const t of document.querySelectorAll('.tab')) {
    if (t.dataset.tab === sekme) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => goster(location.hash.slice(1)));
$('.tabs').addEventListener('click', (e) => {
  const t = e.target.closest('.tab');
  if (t) location.hash = t.dataset.tab;
});

/* ---------- Tema ---------- */
const koyuMu = matchMedia('(prefers-color-scheme: dark)');

function temaUygula(tema) {
  document.documentElement.dataset.theme = tema;
  const koyu = tema === 'dark' || (tema === 'auto' && koyuMu.matches);
  $('#theme-color').content = koyu ? '#1F1E1B' : '#F4F3EE';
  for (const b of document.querySelectorAll('[data-tema]')) {
    b.setAttribute('aria-pressed', String(b.dataset.tema === tema));
  }
}
function temaSec(tema) {
  try { localStorage.setItem('tema', tema); } catch (e) {}
  db.yaz('ayar:tema', tema).catch(() => {});
  temaUygula(tema);
}
koyuMu.addEventListener('change', () => temaUygula(document.documentElement.dataset.theme));

/* ---------- Ayarlar ---------- */
const ayarlar = $('#ayarlar');
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-ayarlar]')) ayarlar.showModal();
  const t = e.target.closest('[data-tema]');
  if (t) temaSec(t.dataset.tema);
});
$('#ayarlar-kapat').addEventListener('click', () => ayarlar.close());
ayarlar.addEventListener('click', (e) => { if (e.target === ayarlar) ayarlar.close(); });

/* ---------- Yedekleme ---------- */
const durum = (m) => { $('#yedek-durum').textContent = m; };

$('#yedek-al').addEventListener('click', async () => {
  try {
    const yedek = { uygulama: 'planlayici', bicim: YEDEK_BICIM, tarih: new Date().toISOString(), veri: await db.hepsiniAl() };
    const ad = `hybrid-yedek-${yedek.tarih.slice(0, 10)}.json`;
    const dosya = new File([JSON.stringify(yedek, null, 2)], ad, { type: 'application/json' });
    // iPhone'da paylaşım menüsü açılır ("Dosyalar'a Kaydet"); diğer yerlerde doğrudan iner.
    if (navigator.canShare && navigator.canShare({ files: [dosya] })) {
      await navigator.share({ files: [dosya] });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(dosya);
      a.download = ad;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    durum('Yedek hazırlandı.');
  } catch (e) {
    if (e.name !== 'AbortError') durum('Yedek alınamadı: ' + e.message);
  }
});

$('#yedek-yukle').addEventListener('click', () => $('#yedek-dosya').click());
$('#yedek-dosya').addEventListener('change', async (e) => {
  const dosya = e.target.files[0];
  e.target.value = '';
  if (!dosya) return;
  try {
    const yedek = JSON.parse(await dosya.text());
    if (yedek.uygulama !== 'planlayici' || typeof yedek.veri !== 'object' || yedek.veri === null) {
      throw new Error('Bu dosya bir Hybrid yedeği değil.');
    }
    if (yedek.bicim > YEDEK_BICIM) throw new Error('Yedek daha yeni bir sürümle alınmış.');
    const gun = (yedek.tarih || '').slice(0, 10);
    if (!confirm(`${gun} tarihli yedek yüklensin mi? Telefondaki mevcut veriler silinip yedektekiler yazılacak.`)) return;
    await db.hepsiniDegistir(yedek.veri);
    const tema = yedek.veri['ayar:tema'] || 'auto';
    try { localStorage.setItem('tema', tema); } catch (err) {}
    temaUygula(tema);
    goster(location.hash.slice(1));
    durum('Yedek geri yüklendi.');
  } catch (err) {
    durum('Geri yüklenemedi: ' + err.message);
  }
});

/* ---------- Başlangıç ---------- */
$('#surum').textContent = 'Sürüm ' + SURUM;
temaUygula(document.documentElement.dataset.theme || 'auto');
goster(location.hash.slice(1));

// Tarayıcıdan verileri kendiliğinden silmemesini iste (garanti değildir; yedek almak yine gerekli).
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
