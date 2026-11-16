// Telefonda kalıcı kayıt: IndexedDB üzerinde basit anahtar-değer deposu.
// Tüm uygulama verisi bu depodan geçer; yedekleme de buradan alınır.
const DB_AD = 'planlayici';
const DEPO = 'kv';
let dbSoz;

function ac() {
  if (!dbSoz) {
    dbSoz = new Promise((coz, red) => {
      const istek = indexedDB.open(DB_AD, 1);
      istek.onupgradeneeded = () => istek.result.createObjectStore(DEPO);
      istek.onsuccess = () => coz(istek.result);
      istek.onerror = () => red(istek.error);
    });
  }
  return dbSoz;
}

async function islem(mod, fn) {
  const db = await ac();
  return new Promise((coz, red) => {
    const tx = db.transaction(DEPO, mod);
    const sonuc = fn(tx.objectStore(DEPO));
    tx.oncomplete = () => coz(sonuc && 'result' in sonuc ? sonuc.result : undefined);
    tx.onerror = () => red(tx.error);
    tx.onabort = () => red(tx.error);
  });
}

export const getir = (anahtar) => islem('readonly', (d) => d.get(anahtar));
export const yaz = (anahtar, deger) => islem('readwrite', (d) => { d.put(deger, anahtar); });
export const sil = (anahtar) => islem('readwrite', (d) => { d.delete(anahtar); });

// Yedek: depodaki her şeyi tek nesne olarak verir.
export async function hepsiniAl() {
  const db = await ac();
  return new Promise((coz, red) => {
    const veri = {};
    const tx = db.transaction(DEPO, 'readonly');
    const imlec = tx.objectStore(DEPO).openCursor();
    imlec.onsuccess = () => {
      const c = imlec.result;
      if (c) { veri[c.key] = c.value; c.continue(); }
    };
    tx.oncomplete = () => coz(veri);
    tx.onerror = () => red(tx.error);
  });
}

// Geri yükleme: mevcut veriyi siler, yedektekini yazar (tek işlemde; yarıda kalırsa hiçbiri uygulanmaz).
export function hepsiniDegistir(veri) {
  return islem('readwrite', (d) => {
    d.clear();
    for (const [k, v] of Object.entries(veri)) d.put(v, k);
  });
}
