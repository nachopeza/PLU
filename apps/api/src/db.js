// Abre la base de datos SQLite y crea las tablas la primera vez.
// Usa el módulo node:sqlite que viene con Node 22 (no hace falta instalar nada).
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

// El esquema usa CREATE TABLE IF NOT EXISTS, así que se puede ejecutar siempre sin romper nada.
db.exec(readFileSync(join(aquí, 'schema.sql'), 'utf8'));
