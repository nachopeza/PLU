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
    'encuestas y votaciones y gestionar sus datos. Afiliarse es gratis y no obliga a nada.',
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
  // v2: se añaden las que falten aunque ya existan otras noticias (se comparan por título), una sola vez
  if (db.prepare("SELECT 1 FROM semillas WHERE nombre = 'noticias_ejemplo_v2'").get()) return;
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
      c: 'PLU abre su plataforma de afiliación. Afiliarse es gratis, lleva unos minutos y no hace falta ningún trámite en papel.\n\n## Cómo funciona\n\n- Rellenas tus datos y eliges tu provincia.\n- Revisamos la solicitud y te damos de alta.\n- Recibes por correo tu carné en PDF y el acceso a tu portal.\n\nDesde el portal puedes descargar tu carné, apoyar y comentar ideas, participar en encuestas y votaciones y pedir cambios en tus datos cuando quieras.\n\n## Tus datos, protegidos\n\nTratamos los datos conforme al RGPD. El documento de identidad se guarda cifrado y no aparece nunca en listados ni exportaciones.\n\n> ¿Prefieres empezar más despacio? Afiliarte es gratis y no te obliga a nada: recibirás avisos de campañas, eventos y encuestas.\n\nEn el documento adjunto encontrarás la nota de prensa completa. Para cualquier consulta escríbenos a hola@somosplu.com.' },
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
      c: 'Estamos preparando los primeros encuentros abiertos de PLU. La idea es sencilla: sentarnos, escuchar y tomar nota de lo que importa en cada territorio.\n\n## Qué vamos a hacer\n\n- Conversación abierta en grupos pequeños.\n- Recogida de necesidades e ideas.\n- Un rato para conocernos sin prisa.\n\nPublicaremos la fecha y el lugar en la [Agenda](/eventos). Si quieres que avisemos a tu provincia, hazte afíliate y te llegará el aviso.' },
    { dias: 14, cat: 'Noticia', img: 'photo-1768299947895-06b676197f74',
      t: 'Tu carné de afiliado, siempre a mano', r: 'Descárgalo en PDF desde el portal y pide un duplicado cuando lo necesites.',
      c: 'El carné de PLU es digital. Lo recibes por correo al afiliarte y puedes volver a descargarlo cuando quieras desde tu portal.\n\n## Qué incluye\n\n- Tu nombre y número de afiliado.\n- Tu provincia y la fecha de validez.\n- Un código QR que permite comprobar que el carné es auténtico.\n\nSi lo pierdes o cambias de provincia, pídelo en la sección Solicitudes del portal y te enviaremos el nuevo por correo. El anterior deja de ser válido.' },
    { dias: 16, cat: 'Opinión', img: 'photo-1758691461935-202e2ef6b69f',
      t: 'Sanidad: cuando pedir cita es una carrera de fondo', r: 'Recogemos vuestras experiencias para entender dónde se atascan las listas de espera.',
      c: 'Una de las cosas que más nos cuentan es lo difícil que resulta conseguir cita con el especialista. No tenemos todas las respuestas, pero sí una forma de trabajar.\n\n## Qué estamos haciendo\n\n- Recoger casos concretos, sin datos personales.\n- Hablar con profesionales que conocen el sistema desde dentro.\n- Publicar lo que aprendemos para que se pueda debatir.\n\n> Si trabajas en sanidad o has esperado una cita durante meses, tu experiencia nos ayuda.\n\nCuéntanos tu caso desde el formulario de la portada.' },
    { dias: 19, cat: 'Noticia', img: 'photo-1752747115265-1e4cfb2c1212',
      t: 'Educación: lo que nos pide el alumnado y el profesorado', r: 'Formación que conecte con el empleo y menos burocracia en las aulas, entre lo más repetido.',
      c: 'En las primeras semanas hemos recibido propuestas muy distintas sobre educación. Hay dos temas que se repiten.\n\n## Lo más repetido\n\n- Que la formación profesional conecte mejor con el empleo.\n- Menos carga burocrática para el profesorado.\n- Becas y ayudas más fáciles de pedir.\n\nTodas las propuestas pasan por el mismo recorrido público: se leen, se estudian y se votan.' },
    { dias: 23, cat: 'Evento', img: 'photo-1529209076408-5a115ec9f1c6',
      t: 'Taller abierto: cómo escribir una buena propuesta', r: 'Una hora para aprender a convertir un problema cotidiano en una propuesta clara.',
      c: 'Una buena propuesta empieza con un problema concreto y termina con algo que se pueda decidir. En este taller lo practicamos juntas y juntos.\n\n## Programa\n\n- Cómo describir un problema en una frase.\n- Qué diferencia una queja de una propuesta.\n- Ejercicio en grupos pequeños.\n\nLa participación es gratuita y no hace falta ser afiliado.' },
    { dias: 27, cat: 'Comunicado', img: 'photo-1519313825-713a373f2bce',
      t: 'Transporte: queremos saber cómo te mueves cada día', r: 'Abrimos una consulta para conocer los trayectos que más cuestan en cada provincia.',
      c: 'El transporte público no es igual en una capital que en un pueblo. Para entenderlo, abrimos una consulta abierta.\n\n## Qué preguntamos\n\n- Cómo te mueves habitualmente.\n- Qué trayecto te cuesta más tiempo o dinero.\n- Qué mejorarías primero.\n\nLas respuestas se publicarán agrupadas y sin datos personales.' },
    { dias: 31, cat: 'Noticia', img: 'photo-1556798542-13bfa5d6d01e',
      t: 'Transparencia: así se publicarán nuestras cuentas', r: 'Ingresos, gastos y decisiones, explicados de forma que cualquiera pueda entenderlos.',
      c: 'Pedir transparencia a los demás obliga a practicarla primero. Estas son las reglas que nos damos desde el principio.\n\n## Nuestros compromisos\n\n- Publicar de dónde viene el dinero y en qué se gasta.\n- Declarar los posibles conflictos de interés.\n- Explicar cada decisión importante.\n\nVerás la información actualizada en la sección de transparencia.' },
    { dias: 36, cat: 'Nota de prensa', img: 'photo-1663162550938-60f70fab5d31',
      t: 'PLU arranca: un movimiento que nace escuchando', r: 'Presentamos la plataforma y las ideas con las que empezamos a trabajar.',
      c: 'PLU nace con una idea sencilla: antes de proponer, escuchar. Nuestra primera tarea es recoger lo que la gente necesita y ordenarlo.\n\n## Los primeros pasos\n\n- Abrimos la web con un formulario para contar qué necesitas.\n- Publicamos los principios de partida para debatirlos.\n- Preparamos los primeros encuentros abiertos.\n\nNada de esto está cerrado: se concreta con lo que aporte la gente.' },
    { dias: 41, cat: 'Opinión', img: 'photo-1520127877998-122c33e8eb38',
      t: 'Participar también es escuchar a quien piensa distinto', r: 'Por qué las normas de debate son parte del proyecto y no un adorno.',
      c: 'Un movimiento abierto necesita un debate sano. Escuchar a quien piensa distinto no es una concesión: es la forma de acertar más.\n\n## Tres hábitos\n\n- Leer antes de responder.\n- Criticar la idea, no a la persona.\n- Cambiar de opinión cuando hay buenos argumentos.\n\nSi un comentario rompe las normas, el equipo de moderación lo explica y lo retira.' },
    { dias: 46, cat: 'Evento', img: 'photo-1758613171176-ea64579c2dcf',
      t: 'Voluntariado: cómo echar una mano desde tu ciudad', r: 'Hay tareas para todos los tiempos: desde difundir hasta organizar un encuentro.',
      c: 'Muchas personas nos preguntan cómo ayudar. Hay formas para todos los tiempos y capacidades.\n\n## Formas de colaborar\n\n- Difundir las propuestas en tu entorno.\n- Ayudar a organizar encuentros locales.\n- Aportar tu conocimiento profesional.\n\nApúntate desde la sección de voluntariado y te escribimos.' },
  ];
  const ins = db.prepare('INSERT INTO noticias (titulo, resumen, cuerpo, imagen, categoria, adjuntos, publicada, fecha) VALUES (?, ?, ?, ?, ?, ?, 1, ?)');
  for (const n of N) {
    if (db.prepare('SELECT 1 FROM noticias WHERE titulo = ?').get(n.t)) continue;
    ins.run(n.t, n.r, n.c, foto(n.img), n.cat, n.adj ?? '[]', dias(n.dias));
  }
  db.prepare("INSERT INTO semillas (nombre) VALUES ('noticias_ejemplo_v2')").run();
  console.log('Noticias de ejemplo creadas.');
}
