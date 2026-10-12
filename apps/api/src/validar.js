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
