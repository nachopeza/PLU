// Generación del carné en PDF: rellena la plantilla diseñada por la organización (campos de formulario por nombre).
// Si no hay plantilla subida, crea un carné sencillo para poder probar.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL_PUBLICA } from './config.js';
import { db } from './db.js';
import { DATA_DIR } from './db.js';
import { formatoNumero } from './servicios.js';

export const CARPETA_PLANTILLAS = join(DATA_DIR, 'plantillas');
export const CAMPOS_OBLIGATORIOS = ['nombre', 'apellidos', 'numeroAfiliado', 'territorio', 'fechaAlta', 'validoHasta', 'qr'];
export const CAMPOS_OPCIONALES = ['nombreCompleto', 'comunidad'];

const fechaLarga = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

export function plantillaActiva() {
  const p = db.prepare('SELECT * FROM plantillas_carne WHERE territorio_id IS NULL AND activa = 1 ORDER BY id DESC LIMIT 1').get();
  return p && existsSync(join(CARPETA_PLANTILLAS, p.archivo_path)) ? p : null;
}

// Revisa qué campos tiene un PDF y cuáles faltan
export async function inspeccionarPlantilla(bytes) {
  const pdf = await PDFDocument.load(bytes);
  const campos = pdf.getForm().getFields().map((f) => f.getName());
  return {
    paginas: pdf.getPageCount(),
    campos,
    faltan: CAMPOS_OBLIGATORIOS.filter((c) => !campos.includes(c)),
    extra: campos.filter((c) => ![...CAMPOS_OBLIGATORIOS, ...CAMPOS_OPCIONALES].includes(c)),
  };
}

export function datosCarne(persona, carne) {
  const t = db.prepare('SELECT t.nombre, c.nombre AS comunidad FROM territorios t LEFT JOIN territorios c ON c.id = t.padre_id WHERE t.id = ?').get(persona.territorio_id);
  return {
    nombre: persona.nombre, apellidos: persona.apellidos, nombreCompleto: `${persona.nombre} ${persona.apellidos}`.trim(),
    numeroAfiliado: formatoNumero(persona.numero_afiliado), territorio: t?.nombre ?? '', comunidad: t?.comunidad ?? '',
    fechaAlta: fechaLarga(persona.fecha_alta), validoHasta: fechaLarga(carne.valido_hasta),
    codigo: persona.codigo_verificacion,
  };
}

const urlVerificacion = (codigo) => `${URL_PUBLICA}/prototipo/intranet.html?v=${encodeURIComponent(codigo)}`;
const qrPng = (codigo) => QRCode.toBuffer(urlVerificacion(codigo), { margin: 0, width: 600, errorCorrectionLevel: 'M' });

export async function generarCarnePdf(datos) {
  const plantilla = plantillaActiva();
  const png = await qrPng(datos.codigo);
  if (plantilla) {
    const pdf = await PDFDocument.load(readFileSync(join(CARPETA_PLANTILLAS, plantilla.archivo_path)));
    const form = pdf.getForm();
    for (const [k, v] of Object.entries(datos)) {
      if (k === 'codigo') continue;
      try { form.getTextField(k).setText(v); } catch { /* campo ausente: se ignora */ }
    }
    try { form.getButton('qr').setImage(await pdf.embedPng(png)); } catch { /* sin campo qr */ }
    form.flatten();
    return { bytes: await pdf.save({ useObjectStreams: false }), plantillaId: plantilla.id };
  }
  // Carné de prueba (85,6 × 54 mm) mientras no haya plantilla
  const mm = 72 / 25.4;
  const pdf = await PDFDocument.create();
  const pg = pdf.addPage([85.6 * mm, 54 * mm]);
  const f = await pdf.embedFont(StandardFonts.Helvetica), fb = await pdf.embedFont(StandardFonts.HelveticaBold);
  pg.drawRectangle({ x: 0, y: 0, width: 85.6 * mm, height: 54 * mm, color: rgb(0.05, 0.05, 0.06) });
  pg.drawText('PLU · CARNÉ DE AFILIADO', { x: 6 * mm, y: 46 * mm, size: 7, font: fb, color: rgb(1, 1, 1) });
  pg.drawText(datos.nombre, { x: 6 * mm, y: 30 * mm, size: 12, font: fb, color: rgb(1, 1, 1) });
  pg.drawText(datos.apellidos, { x: 6 * mm, y: 24 * mm, size: 12, font: fb, color: rgb(1, 1, 1) });
  pg.drawText(`Nº ${datos.numeroAfiliado}`, { x: 6 * mm, y: 16 * mm, size: 9, font: f, color: rgb(0.85, 0.85, 0.85) });
  pg.drawText(`${datos.territorio} · alta ${datos.fechaAlta} · válido hasta ${datos.validoHasta}`, { x: 6 * mm, y: 9 * mm, size: 5.5, font: f, color: rgb(0.7, 0.7, 0.7) });
  pg.drawRectangle({ x: 56 * mm, y: 8 * mm, width: 24 * mm, height: 24 * mm, color: rgb(1, 1, 1) });
  pg.drawImage(await pdf.embedPng(png), { x: 57.5 * mm, y: 9.5 * mm, width: 21 * mm, height: 21 * mm });
  pg.drawText('Carné de prueba (sin plantilla)', { x: 6 * mm, y: 3 * mm, size: 4.5, font: f, color: rgb(0.55, 0.55, 0.55) });
  return { bytes: await pdf.save({ useObjectStreams: false }), plantillaId: null };
}

export function guardarPlantilla(bytes) {
  mkdirSync(CARPETA_PLANTILLAS, { recursive: true });
  const nombre = `carne-${Date.now()}.pdf`;
  writeFileSync(join(CARPETA_PLANTILLAS, nombre), bytes);
  db.prepare('UPDATE plantillas_carne SET activa = 0 WHERE territorio_id IS NULL').run();
  const r = db.prepare('INSERT INTO plantillas_carne (territorio_id, archivo_path, activa) VALUES (NULL, ?, 1)').run(nombre);
  return Number(r.lastInsertRowid);
}

export const DATOS_MUESTRA = {
  nombre: 'María', apellidos: 'García López', nombreCompleto: 'María García López', numeroAfiliado: '28-482915',
  territorio: 'Madrid', comunidad: 'Comunidad de Madrid', fechaAlta: '01/01/2027', validoHasta: '01/01/2032', codigo: 'MUESTRA-NO-VALIDO',
};

// Certificado de afiliación (A4). No incluye el documento de identidad. El QR lleva a la verificación.
const ESTADO_TXT = { activo: 'afiliado/a en activo', suspendido: 'afiliado/a con la afiliación suspendida', baja: 'dado/a de baja', pendiente: 'pendiente de aprobación' };
export async function generarCertificadoPdf(persona) {
  const mm = 72 / 25.4;
  const pdf = await PDFDocument.create();
  const pg = pdf.addPage([210 * mm, 297 * mm]);
  const f = await pdf.embedFont(StandardFonts.Helvetica), fb = await pdf.embedFont(StandardFonts.HelveticaBold);
  const t = db.prepare('SELECT nombre FROM territorios WHERE id = ?').get(persona.territorio_id);
  const negro = rgb(0.08, 0.1, 0.09), gris = rgb(0.4, 0.43, 0.41);
  pg.drawText('PLU', { x: 25 * mm, y: 262 * mm, size: 28, font: fb, color: negro });
  pg.drawText('Plataforma Liberal Unida', { x: 25 * mm, y: 254 * mm, size: 10, font: f, color: gris });
  pg.drawText('CERTIFICADO DE AFILIACIÓN', { x: 25 * mm, y: 225 * mm, size: 16, font: fb, color: negro });
  const nombre = `${persona.nombre} ${persona.apellidos}`.trim();
  const lineas = [
    `PLU certifica que ${nombre}, con número de afiliado ${formatoNumero(persona.numero_afiliado)},`,
    `figura en el registro de personas afiliadas como ${ESTADO_TXT[persona.estado] ?? persona.estado}`,
    `${persona.fecha_alta ? `desde el ${fechaLarga(persona.fecha_alta)}` : ''}${t?.nombre ? `, con residencia en la provincia de ${t.nombre}` : ''}.`,
    '',
    `Y para que conste, se expide el presente certificado el ${fechaLarga(new Date().toISOString())}.`,
  ];
  lineas.forEach((l, i) => pg.drawText(l, { x: 25 * mm, y: (205 - i * 8) * mm, size: 11, font: f, color: negro }));
  if (persona.codigo_verificacion) {
    pg.drawImage(await pdf.embedPng(await qrPng(persona.codigo_verificacion)), { x: 25 * mm, y: 120 * mm, width: 30 * mm, height: 30 * mm });
    pg.drawText('Comprueba la autenticidad de este certificado escaneando el código.', { x: 60 * mm, y: 133 * mm, size: 8, font: f, color: gris });
  }
  pg.drawText('Documento de carácter informativo. Los datos personales se tratan conforme a la política de privacidad de PLU.', { x: 25 * mm, y: 20 * mm, size: 7, font: f, color: gris });
  return await pdf.save({ useObjectStreams: false });
}
