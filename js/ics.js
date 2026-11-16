// Takvime aktarma: seçilen günün saatli öğün ve antrenmanlarını .ics dosyası yapar.
// iPhone bu dosyayı Takvim'e ekler; hatırlatmayı iOS kendisi verir (sunucu gerekmez).
const kac = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function icsUret(tarihStr, olaylar) {
  const gun = tarihStr.replace(/-/g, '');
  const damga = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const s = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hybrid//TR', 'CALSCALE:GREGORIAN'];
  for (const o of olaylar) {
    s.push('BEGIN:VEVENT', `UID:${o.id}-${gun}@hybrid`, `DTSTAMP:${damga}`,
      `DTSTART:${gun}T${o.saat.replace(':', '')}00`, `DURATION:PT${o.dakika || 30}M`,
      `SUMMARY:${kac(o.baslik)}`);
    if (o.aciklama) s.push(`DESCRIPTION:${kac(o.aciklama)}`);
    s.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${kac(o.baslik)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  }
  s.push('END:VCALENDAR');
  return s.join('\r\n') + '\r\n';
}
