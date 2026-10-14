// Publicaciones de ejemplo (una sola vez) para que el blog no arranque vacío. Se pueden editar o borrar desde la intranet.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DATA_DIR, db } from './db.js';

const foto = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=75`;
const dias = (n) => new Date(Date.now() - n * 86400_000).toISOString();

async function pdfNotaDePrensa() {
  const pdf = await PDFDocument.create();
  const pg = pdf.addPage([595, 842]);
  const f = await pdf.embedFont(StandardFonts.Helvetica), fb = await pdf.embedFont(StandardFonts.HelveticaBold);
  const verde = rgb(0.13, 0.58, 0.28), gris = rgb(0.35, 0.38, 0.36), negro = rgb(0.08, 0.1, 0.09);
  pg.drawRectangle({ x: 0, y: 842 - 10, width: 595, height: 10, color: verde });
  pg.drawText('PLU', { x: 56, y: 770, size: 28, font: fb, color: negro });
  pg.drawText('Plataforma Liberal Unida', { x: 56, y: 750, size: 10, font: f, color: gris });
  pg.drawText('NOTA DE PRENSA', { x: 56, y: 700, size: 10, font: fb, color: verde });
  pg.drawText('Ya puedes afiliarte a PLU desde somosplu.com', { x: 56, y: 670, size: 20, font: fb, color: negro });
  const parrafos = [
    'PLU abre su plataforma de afiliacion. Afiliarse es gratuito, se completa en cuatro pasos y el carne de',
    'afiliado llega por correo electronico, junto con el acceso al portal del afiliado.',
    '',
    'Desde el portal, las personas afiliadas pueden descargar su carne, apoyar y comentar ideas, participar en',
    'encuestas y votaciones y gestionar sus datos. Quien solo quiera recibir informacion puede hacerse',
    'simpatizante sin compromiso.',
    '',
    'Los datos personales se tratan conforme al RGPD y el documento de identidad se guarda cifrado.',
    '',
    'Contacto de prensa: hola@somosplu.com',
  ];
  parrafos.forEach((t, i) => pg.drawText(t, { x: 56, y: 620 - i * 18, size: 11, font: f, color: negro }));
  pg.drawText('Documento de ejemplo generado por la plataforma. Sustituyelo por tu nota de prensa real.', { x: 56, y: 60, size: 8, font: f, color: gris });
  return pdf.save();
}

export async function sembrarNoticias() {
  if (db.prepare("SELECT 1 FROM semillas WHERE nombre = 'noticias_ejemplo'").get()) return;
  if (db.prepare('SELECT COUNT(*) AS n FROM noticias').get().n > 0) { db.prepare("INSERT INTO semillas (nombre) VALUES ('noticias_ejemplo')").run(); return; }
  let adjuntos = '[]';
  try {
    const bytes = Buffer.from(await pdfNotaDePrensa());
    const id = randomBytes(16).toString('hex');
    mkdirSync(join(DATA_DIR, 'media'), { recursive: true });
    writeFileSync(join(DATA_DIR, 'media', `${id}.pdf`), bytes);
    db.prepare('INSERT INTO medios (id, ext, bytes) VALUES (?, ?, ?)').run(id, 'pdf', bytes.length);
    adjuntos = JSON.stringify([{ nombre: 'Nota de prensa · Afiliación abierta', url: `/media/${id}.pdf`, bytes: bytes.length }]);
  } catch (e) { console.error('PDF de ejemplo:', e.message); }

  const N = [
    { dias: 0, cat: 'Nota de prensa', img: 'photo-1761839262867-af53d08b0eb5', adj: adjuntos,
      t: 'Ya puedes afiliarte a PLU desde somosplu.com', r: 'La afiliación es gratuita, se completa en cuatro pasos y el carné llega por correo.',
      c: 'PLU abre su plataforma de afiliación. Afiliarse es gratis, lleva unos minutos y no hace falta ningún trámite en papel.\n\n## Cómo funciona\n\n- Rellenas tus datos y eliges tu provincia.\n- Revisamos la solicitud y te damos de alta.\n- Recibes por correo tu carné en PDF y el acceso a tu portal.\n\nDesde el portal puedes descargar tu carné, apoyar y comentar ideas, participar en encuestas y votaciones y pedir cambios en tus datos cuando quieras.\n\n## Tus datos, protegidos\n\nTratamos los datos conforme al RGPD. El documento de identidad se guarda cifrado y no aparece nunca en listados ni exportaciones.\n\n> ¿Prefieres empezar más despacio? Hazte simpatizante y recibe avisos de campañas, eventos y encuestas sin compromiso.\n\nEn el documento adjunto encontrarás la nota de prensa completa. Para cualquier consulta escríbenos a hola@somosplu.com.' },
    { dias: 2, cat: 'Noticia', img: 'photo-1517048676732-d65bc937f952',
      t: 'Cómo avanza una idea en PLU: de tu propuesta a la votación', r: 'Cada propuesta sigue un recorrido público que cualquiera puede consultar.',
      c: 'Cualquier persona puede proponer una idea desde la web. Lo importante es que el camino que sigue sea visible para todos.\n\n## El recorrido\n\n- **Recibida:** la leemos y comprobamos que cumple las normas de participación.\n- **En estudio:** el equipo la clasifica y la relaciona con otras parecidas.\n- **En debate:** se abre a comentarios de las personas afiliadas.\n- **En votación:** se somete a votación con el quórum que se haya fijado.\n\nEn cada paso queda registrado qué ha pasado y por qué. Si una idea se descarta, también lo explicamos.\n\n## Cómo participar\n\nEntra en [Ideas](/ideas), apoya las que te importen y deja tu comentario desde el portal del afiliado.' },
    { dias: 5, cat: 'Comunicado', img: 'photo-1555069855-e580a9adbf43',
      t: 'Nuestras normas de participación: respeto, claridad y sin ruido', r: 'Un debate útil necesita reglas sencillas y las mismas para todas las personas.',
      c: 'Queremos que el debate en PLU sea cómodo para todo el mundo. Por eso hemos publicado unas normas de participación cortas y claras.\n\n## Lo esencial\n\n- Se debate sobre ideas, no sobre personas.\n- Un comentario, un asunto.\n- Sin insultos, sin spam y sin datos personales de terceros.\n\nEl equipo de moderación puede ocultar comentarios que incumplan las normas y siempre deja constancia de ello. Cualquier persona afiliada puede denunciar un comentario desde su portal.\n\nPuedes leer las normas completas en [Normas de participación](/normas).' },
    { dias: 8, cat: 'Opinión', img: 'photo-1741156386380-0236c72eb6f9',
      t: 'Por qué la vivienda tiene que ser el primer gran debate', r: 'Es lo que más nos cuentan y lo que más condiciona el resto de decisiones de vida.',
      c: 'Cuando preguntamos a la gente qué le preocupa, la vivienda aparece una y otra vez. No es casualidad: dónde y cómo vives condiciona tu trabajo, tu tiempo, tus ahorros y hasta cuándo puedes plantearte tener hijos.\n\n## Un debate con todas las voces\n\nNo queremos un programa cerrado en un despacho. Queremos recoger necesidades reales, estudiarlas con calma y votarlas entre quienes forman PLU.\n\n## Cómo sumarte\n\nSi tienes una idea sobre vivienda, cuéntanosla en [Ideas](/ideas). Cuantas más personas la compartan, más fuerza tendrá.\n\nEquipo de PLU' },
    { dias: 11, cat: 'Evento', img: 'photo-1590650046871-92c887180603',
      t: 'Primer encuentro abierto: ven a contarnos qué necesitas', r: 'Una conversación en persona, sin guion, para escuchar antes de proponer.',
      c: 'Estamos preparando los primeros encuentros abiertos de PLU. La idea es sencilla: sentarnos, escuchar y tomar nota de lo que importa en cada territorio.\n\n## Qué vamos a hacer\n\n- Conversación abierta en grupos pequeños.\n- Recogida de necesidades e ideas.\n- Un rato para conocernos sin prisa.\n\nPublicaremos la fecha y el lugar en la [Agenda](/eventos). Si quieres que avisemos a tu provincia, hazte simpatizante o afíliate y te llegará el aviso.' },
    { dias: 14, cat: 'Noticia', img: 'photo-1768299947895-06b676197f74',
      t: 'Tu carné de afiliado, siempre a mano', r: 'Descárgalo en PDF desde el portal y pide un duplicado cuando lo necesites.',
      c: 'El carné de PLU es digital. Lo recibes por correo al afiliarte y puedes volver a descargarlo cuando quieras desde tu portal.\n\n## Qué incluye\n\n- Tu nombre y número de afiliado.\n- Tu provincia y la fecha de validez.\n- Un código QR que permite comprobar que el carné es auténtico.\n\nSi lo pierdes o cambias de provincia, pídelo en la sección Solicitudes del portal y te enviaremos el nuevo por correo. El anterior deja de ser válido.' },
  ];
  const ins = db.prepare('INSERT INTO noticias (titulo, resumen, cuerpo, imagen, categoria, adjuntos, publicada, fecha) VALUES (?, ?, ?, ?, ?, ?, 1, ?)');
  for (const n of N) ins.run(n.t, n.r, n.c, foto(n.img), n.cat, n.adj ?? '[]', dias(n.dias));
  db.prepare("INSERT INTO semillas (nombre) VALUES ('noticias_ejemplo')").run();
  console.log('Noticias de ejemplo creadas.');
}
