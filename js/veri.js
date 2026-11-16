// Veri erişimi. Anahtarlar:
//   gun:YYYY-AA-GG  -> { ogunler: [], ekstra: [], antrenman: [] }   (o günün planı ve işaretleri)
//   yapilacak       -> [{ id, kapsam: 'gun'|'hafta'|'ay', t, metin, tamam }]
//   programlar      -> [{ id, ad, hareketler: [{ ad, bolge, set, tekrar, kilo }] }]
//   hareketler      -> [{ ad, bolge }]            (kullanıcının oluşturdukları)
//   besinler        -> [{ ad, kcal, p, k, y }]    (kullanıcının oluşturdukları, 100 g için)
//   kayitlar        -> yapılan antrenman ve koşu kayıtları
//   ayar:*          -> tema, hedef (kcal), cihaz
import * as db from './db.js';

export const gunAl = async (t) => ({ ogunler: [], ekstra: [], antrenman: [], ...(await db.getir('gun:' + t)) });
export const gunYaz = (t, g) => db.yaz('gun:' + t, g);
export const liste = async (k) => (await db.getir(k)) || [];
export const listeYaz = (k, v) => db.yaz(k, v);
export const ayar = (k) => db.getir('ayar:' + k);
export const ayarYaz = (k, v) => db.yaz('ayar:' + k, v);
