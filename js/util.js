// Ortak yardımcılar: tarih, biçimlendirme, kimlik.
const pad = (n) => String(n).padStart(2, '0');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Tarihler 'YYYY-AA-GG' metni olarak tutulur (saat dilimi kayması olmasın diye yerel tarihten üretilir).
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const bugun = () => iso(new Date());
export const tarih = (s) => { const [y, m, g] = s.split('-').map(Number); return new Date(y, m - 1, g); };
export const gunEkle = (s, n) => { const d = tarih(s); d.setDate(d.getDate() + n); return iso(d); };
export const haftaBasi = (s) => { const d = tarih(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };
export const ayBasi = (s) => s.slice(0, 8) + '01';
export const ayEkle = (s, n) => { const d = tarih(ayBasi(s)); d.setMonth(d.getMonth() + n); return iso(d); };

const bicim = (o) => new Intl.DateTimeFormat('tr-TR', o);
export const fmtGun = (s) => bicim({ day: 'numeric', month: 'long', weekday: 'long' }).format(tarih(s));
export const fmtKisa = (s) => bicim({ day: 'numeric', month: 'short' }).format(tarih(s));
export const fmtAy = (s) => bicim({ month: 'long', year: 'numeric' }).format(tarih(s));
export const fmtHafta = (s) => `${fmtKisa(s)} – ${fmtKisa(gunEkle(s, 6))}`;
export const sayi = (n, k = 0) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: k }).format(n || 0);
export const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

// "32:15" ya da "1:05:30" -> saniye; boş/hatalı ise 0.
export function sureSn(metin) {
  const p = String(metin || '').trim().split(':').map((x) => parseInt(x, 10));
  if (!p.length || p.some((x) => !Number.isFinite(x) || x < 0)) return 0;
  return p.reduce((a, x) => a * 60 + x, 0) * (p.length === 1 ? 60 : 1);   // tek sayı dakika sayılır
}
export function snMetin(sn) {
  sn = Math.round(sn);
  const s = Math.floor(sn / 3600), d = Math.floor((sn % 3600) / 60), k = sn % 60;
  return s ? `${s}:${pad(d)}:${pad(k)}` : `${d}:${pad(k)}`;
}
// Tempo: dk/km
export const tempo = (sn, km) => (sn > 0 && km > 0 ? snMetin(sn / km) + ' /km' : '');
