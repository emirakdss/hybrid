import * as db from './db.js';
import { bugun, haftaBasi, ayBasi } from './util.js';
import * as gun from './gun.js';
import * as antrenman from './antrenman.js';
import * as beslenme from './beslenme.js';
import * as plan from './plan.js';

const SURUM = '0.2.0';
const YEDEK_BICIM = 1;
const $ = (s, kok = document) => kok.querySelector(s);

/* ---------- Ekranlar ---------- */
// Her ekran modülü ciz(S) (HTML döndürür) ve acts (data-act / data-form işleyicileri) verir.
const EKRANLAR = { bugun: gun, antrenman, beslenme, plan };
const b0 = bugun();
const S = { sekme: 'bugun', gun: b0, besGun: b0, planGun: b0, planHafta: haftaBasi(b0), planAy: ayBasi(b0) };

async function goster(sekme) {
  const degisti = sekme !== undefined;
  if (degisti) S.sekme = EKRANLAR[sekme] ? sekme : 'bugun';
  const y = window.scrollY;
  $('#view').innerHTML = await EKRANLAR[S.sekme].ciz(S);
  for (const t of document.querySelectorAll('.tab')) {
    if (t.dataset.tab === S.sekme) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  }
  window.scrollTo(0, degisti || S.basaDon ? 0 : y);
  S.basaDon = false;
}

async function calistir(ad, el) {
  const f = EKRANLAR[S.sekme].acts[ad];
  if (!f) return;
  try {
    if ((await f(el, S)) !== false) await goster();
  } catch (e) {
    console.error(e);
    alert('Bir şey ters gitti: ' + e.message);
  }
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && !el.closest('dialog')) calistir(el.dataset.act, el);
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]');
  if (f) { e.preventDefault(); calistir(f.dataset.form, f); }
});

window.addEventListener('hashchange', () => goster(location.hash.slice(1)));
$('.tabs').addEventListener('click', (e) => {
  const t = e.target.closest('.tab');
  if (!t) return;
  if (location.hash.slice(1) === t.dataset.tab || (!location.hash && t.dataset.tab === 'bugun')) goster(t.dataset.tab);
  else location.hash = t.dataset.tab;
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
    await goster();
    durum('Yedek geri yüklendi.');
  } catch (err) {
    durum('Geri yüklenemedi: ' + err.message);
  }
});

/* ---------- Başlangıç ---------- */
$('#surum').textContent = 'Sürüm ' + SURUM;
temaUygula(document.documentElement.dataset.theme || 'auto');
goster(location.hash.slice(1) || 'bugun');

// Tarayıcıdan verileri kendiliğinden silmemesini iste (garanti değildir; yedek almak yine gerekli).
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
