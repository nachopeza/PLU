// Abre la base de datos SQLite y crea las tablas la primera vez.
// Usa el módulo node:sqlite que viene con Node 22 (no hace falta instalar nada).
import './env.js';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aquí = dirname(fileURLToPath(import.meta.url));

// Carpeta de datos: por defecto apps/api/data. En producción será un volumen persistente.
export const DATA_DIR = resolve(process.env.PLU_DATA_DIR ?? join(aquí, '..', 'data'));
mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, 'plu.db'));

// Claves foráneas activas y modo WAL (más seguro y rápido con varias lecturas a la vez)
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Si la base de datos es de una versión anterior (antes de guardar el DNI cifrado), avisamos con claridad.
// Todavía no hay datos reales, así que basta con borrarla y dejar que se cree de nuevo.
const columnas = db.prepare("PRAGMA table_info('personas')").all().map((c) => c.name);
if (columnas.length && !columnas.includes('documento_hash')) {
  console.error('\n⚠ La base de datos local es de una versión anterior y no tiene las columnas nuevas.');
  console.error('  Para empezar de cero (solo si NO hay datos reales): cierra el servidor y ejecuta');
  console.error('    rm apps/api/data/plu.db apps/api/data/plu.db-shm apps/api/data/plu.db-wal');
  console.error('  Luego vuelve a arrancar con: npm run dev\n');
  process.exit(1);
}

// El esquema usa CREATE TABLE IF NOT EXISTS, así que se puede ejecutar siempre sin romper nada.
db.exec(readFileSync(join(aquí, 'schema.sql'), 'utf8'));

// Migraciones ligeras: añade columnas nuevas a bases de datos ya creadas (CREATE TABLE IF NOT EXISTS no las añade).
function asegurarColumna(tabla, columna, definicion) {
  const hay = db.prepare(`PRAGMA table_info('${tabla}')`).all().some((c) => c.name === columna);
  if (!hay) db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
}
asegurarColumna('usuarios_intranet', 'debe_cambiar_password', 'INTEGER NOT NULL DEFAULT 0');
asegurarColumna('usuarios_intranet', 'ultimo_acceso', 'TEXT');

