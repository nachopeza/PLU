// Validaciones de datos de entrada.
const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

export function normalizarDocumento(texto) {
  return String(texto ?? '').toUpperCase().replace(/[\s.-]/g, '');
}
// Devuelve 'DNI', 'NIE' o null si el formato o la letra no cuadran.
export function tipoDocumento(doc) {
  if (/^\d{8}[A-Z]$/.test(doc)) return LETRAS_DNI[Number(doc.slice(0, 8)) % 23] === doc[8] ? 'DNI' : null;
  if (/^[XYZ]\d{7}[A-Z]$/.test(doc)) {
    const n = Number('XYZ'.indexOf(doc[0]) + doc.slice(1, 8));
    return LETRAS_DNI[n % 23] === doc[8] ? 'NIE' : null;
  }
  return null;
}
export function edadEn(fechaNac, ref = new Date()) {
  const [a, m, d] = String(fechaNac).split('-').map(Number);
  if (!a || !m || !d) return null;
  let edad = ref.getUTCFullYear() - a;
  if (ref.getUTCMonth() + 1 < m || (ref.getUTCMonth() + 1 === m && ref.getUTCDate() < d)) edad--;
  return edad;
}
export const esEmail = (s) => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export const limpio = (s, max = 120) => String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
// Máscara para quien no necesita ver el documento entero: ****123A
export const enmascarar = (doc) => (doc ? `****${doc.slice(-4)}` : '');

// ---- Datos de perfil (dirección, municipio, ocupación, sector) ----
import { readFileSync } from 'node:fs';
export const CATALOGOS = JSON.parse(readFileSync(new URL('./catalogos.json', import.meta.url), 'utf8'));
const SITUACIONES = new Set(CATALOGOS.situaciones.map((x) => x[0]));
const SECTORES = new Set(CATALOGOS.sectores.map((x) => x[0]));

// Valida y normaliza los datos de perfil. `parcial` = solo se validan los campos presentes (ediciones).
// Devuelve { datos, errores }; en `datos` solo van los campos presentes.
export function datosPerfil(b = {}, { parcial = false, exigirResidencia = true } = {}) {
  const datos = {};
  const errores = {};
  const tiene = (k) => !parcial || b[k] !== undefined;
  if (tiene('direccion')) {
    datos.direccion = limpio(b.direccion, 160);
    if (exigirResidencia && !datos.direccion) errores.direccion = 'Escribe tu dirección';
  }
  if (tiene('poblacion')) {
    datos.poblacion = limpio(b.poblacion ?? b.municipio, 80);
    if (exigirResidencia && !datos.poblacion) errores.poblacion = 'Escribe tu municipio';
  }
  if (tiene('codigo_postal')) {
    datos.codigo_postal = limpio(b.codigo_postal, 5);
    if (!/^\d{5}$/.test(datos.codigo_postal)) errores.codigo_postal = 'Código postal de 5 cifras';
  }
  if (tiene('telefono')) {
    datos.telefono = limpio(b.telefono, 20) || null;
    if (datos.telefono && !/^[+\d\s]{6,20}$/.test(datos.telefono)) errores.telefono = 'Teléfono no válido';
  }
  if (tiene('ocupacion')) datos.ocupacion = limpio(b.ocupacion, 80) || null;
  if (tiene('situacion_laboral')) {
    datos.situacion_laboral = limpio(b.situacion_laboral, 30) || null;
    if (datos.situacion_laboral && !SITUACIONES.has(datos.situacion_laboral)) errores.situacion_laboral = 'Situación no válida';
  }
  if (tiene('sector')) {
    datos.sector = limpio(b.sector, 30) || null;
    if (datos.sector && !SECTORES.has(datos.sector)) errores.sector = 'Sector no válido';
  }
  return { datos, errores };
}
