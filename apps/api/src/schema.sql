-- Esquema inicial de la base de datos de la PLU (SQLite).
-- Ver docs/02-modelo-de-datos.md para la explicación de cada tabla.
-- Todas las fechas se guardan como texto ISO 8601 (UTC).

-- ============================================================
-- Territorios: comunidades autónomas y ciudades autónomas (19).
-- La columna padre_id permite añadir provincias y municipios más adelante.
-- ============================================================
CREATE TABLE IF NOT EXISTS territorios (
  id        INTEGER PRIMARY KEY,
  codigo    TEXT NOT NULL UNIQUE,          -- siglas de 3 letras
  codigo_num TEXT UNIQUE,                  -- código INE de 2 dígitos: va dentro del número de afiliado
  nombre    TEXT NOT NULL,
  tipo      TEXT NOT NULL CHECK (tipo IN ('comunidad','ciudad_autonoma','provincia','municipio')),
  padre_id  INTEGER REFERENCES territorios(id)
);

-- ============================================================
-- Personas: simpatizantes y afiliados comparten tabla.
-- Lo que cambia entre ellos es "tipo" y "estado".
-- ============================================================
CREATE TABLE IF NOT EXISTS personas (
  id                   INTEGER PRIMARY KEY,
  tipo                 TEXT NOT NULL DEFAULT 'simpatizante' CHECK (tipo IN ('simpatizante','afiliado')),
  estado               TEXT NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('pendiente','activo','suspendido','baja','rechazado')),
  numero_afiliado      TEXT UNIQUE,            -- 8 cifras sin guion (territorio 2 + 6 aleatorias). Se muestra como 09-482915
  codigo_verificacion  TEXT UNIQUE,            -- código aleatorio que lleva el QR del carné
  nombre               TEXT NOT NULL,
  apellidos            TEXT NOT NULL,
  email                TEXT NOT NULL UNIQUE,
  telefono             TEXT,
  fecha_nacimiento     TEXT,
  pais                 TEXT NOT NULL DEFAULT 'España',
  codigo_postal        TEXT,
  poblacion            TEXT,
  territorio_id        INTEGER REFERENCES territorios(id),
  foto_path            TEXT,
  password_hash        TEXT,
  debe_cambiar_password INTEGER NOT NULL DEFAULT 1,  -- 1 mientras use la contraseña temporal
  password_temporal_expira_en TEXT,                  -- la temporal caduca (propuesta: 7 días)
  creado_en            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  actualizado_en       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  fecha_alta           TEXT,
  fecha_baja           TEXT
);
CREATE INDEX IF NOT EXISTS idx_personas_estado     ON personas(tipo, estado);
CREATE INDEX IF NOT EXISTS idx_personas_territorio ON personas(territorio_id);

-- ============================================================
-- Consentimientos: qué aceptó cada persona, con qué texto y cuándo.
-- ============================================================
CREATE TABLE IF NOT EXISTS consentimientos (
  id            INTEGER PRIMARY KEY,
  persona_id    INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  finalidad     TEXT NOT NULL CHECK (finalidad IN ('novedades','afiliacion','participacion')),
  version_texto TEXT NOT NULL,
  otorgado      INTEGER NOT NULL CHECK (otorgado IN (0,1)),
  fecha         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ============================================================
-- Usuarios de la intranet (equipo). Los afiliados NO están aquí: están en "personas".
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios_intranet (
  id             INTEGER PRIMARY KEY,
  username       TEXT NOT NULL UNIQUE,
  nombre         TEXT NOT NULL,
  email          TEXT,
  password_hash  TEXT NOT NULL,
  rol            TEXT NOT NULL CHECK (rol IN ('admin','gestor','moderador','coordinador','verificador','auditor')),
  territorio_id  INTEGER REFERENCES territorios(id),   -- solo para el rol coordinador
  activo         INTEGER NOT NULL DEFAULT 1,
  creado_en      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ============================================================
-- Movimientos de afiliación: historial inmutable de lo que le pasa a cada persona.
-- ============================================================
CREATE TABLE IF NOT EXISTS movimientos_afiliacion (
  id          INTEGER PRIMARY KEY,
  persona_id  INTEGER NOT NULL REFERENCES personas(id),
  tipo        TEXT NOT NULL CHECK (tipo IN
                ('inscripcion','alta','cambio_tipo','cambio_territorio','suspension','reactivacion','baja','rechazo')),
  desde       TEXT,
  hasta       TEXT,
  motivo      TEXT,
  usuario_id  INTEGER REFERENCES usuarios_intranet(id),  -- quién lo hizo; NULL si fue la propia persona
  fecha       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_movimientos_persona ON movimientos_afiliacion(persona_id, fecha);

-- ============================================================
-- Carné: plantillas PDF y carnés emitidos (con versiones y revocación).
-- ============================================================
CREATE TABLE IF NOT EXISTS plantillas_carne (
  id             INTEGER PRIMARY KEY,
  territorio_id  INTEGER REFERENCES territorios(id),    -- NULL = plantilla general
  archivo_path   TEXT NOT NULL,
  activa         INTEGER NOT NULL DEFAULT 1,
  creada_en      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS carnes (
  id                  INTEGER PRIMARY KEY,
  persona_id          INTEGER NOT NULL REFERENCES personas(id),
  version             INTEGER NOT NULL DEFAULT 1,
  plantilla_id        INTEGER REFERENCES plantillas_carne(id),
  numero_afiliado     TEXT NOT NULL,
  emitido_en          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  valido_hasta        TEXT,
  revocado_en         TEXT,
  motivo_revocacion   TEXT,
  pdf_path            TEXT,
  UNIQUE (persona_id, version)
);

-- ============================================================
-- Solicitudes que hace una persona desde su portal.
-- ============================================================
CREATE TABLE IF NOT EXISTS solicitudes (
  id           INTEGER PRIMARY KEY,
  persona_id   INTEGER NOT NULL REFERENCES personas(id),
  tipo         TEXT NOT NULL CHECK (tipo IN
                 ('cambio_datos','cambio_territorio','hacerse_afiliado','baja','duplicado_carne','certificado','otra')),
  estado       TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','en_revision','resuelta','rechazada')),
  detalle      TEXT,
  resolucion   TEXT,
  resuelta_por INTEGER REFERENCES usuarios_intranet(id),
  creada_en    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  resuelta_en  TEXT
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado, creada_en);

-- ============================================================
-- Encuestas. Para que sean anónimas de verdad, quién participó (participaciones)
-- y qué respondió (respuestas) van en tablas separadas y sin enlace entre ellas.
-- ============================================================
CREATE TABLE IF NOT EXISTS encuestas (
  id                   INTEGER PRIMARY KEY,
  titulo               TEXT NOT NULL,
  descripcion          TEXT,
  estado               TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','abierta','cerrada')),
  ambito_territorio_id INTEGER REFERENCES territorios(id),  -- NULL = toda la organización
  solo_afiliados       INTEGER NOT NULL DEFAULT 1,
  anonima              INTEGER NOT NULL DEFAULT 1,
  abre_en              TEXT,
  cierra_en            TEXT,
  creada_por           INTEGER REFERENCES usuarios_intranet(id),
  creada_en            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS preguntas (
  id            INTEGER PRIMARY KEY,
  encuesta_id   INTEGER NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  orden         INTEGER NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('opcion_unica','opcion_multiple','escala','texto')),
  texto         TEXT NOT NULL,
  opciones_json TEXT,
  obligatoria   INTEGER NOT NULL DEFAULT 1
);

-- Quién ha participado (para impedir votar dos veces). No guarda qué respondió.
CREATE TABLE IF NOT EXISTS participaciones (
  encuesta_id INTEGER NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  persona_id  INTEGER NOT NULL REFERENCES personas(id),
  fecha       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (encuesta_id, persona_id)
);

-- Qué se respondió. persona_id solo se rellena en encuestas NO anónimas.
CREATE TABLE IF NOT EXISTS respuestas (
  id          INTEGER PRIMARY KEY,
  encuesta_id INTEGER NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  pregunta_id INTEGER NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
  valor       TEXT NOT NULL,
  persona_id  INTEGER REFERENCES personas(id)
);

-- ============================================================
-- Sesiones, auditoría y registro de correos.
-- ============================================================
CREATE TABLE IF NOT EXISTS sesiones (
  id         TEXT PRIMARY KEY,
  tipo       TEXT NOT NULL CHECK (tipo IN ('persona','staff')),
  sujeto_id  INTEGER NOT NULL,
  expira_en  TEXT NOT NULL,
  creada_en  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS auditoria (
  id           INTEGER PRIMARY KEY,
  usuario_id   INTEGER REFERENCES usuarios_intranet(id),
  accion       TEXT NOT NULL,
  entidad      TEXT NOT NULL,
  entidad_id   INTEGER,
  detalle_json TEXT,
  fecha        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS correos (
  id           INTEGER PRIMARY KEY,
  persona_id   INTEGER REFERENCES personas(id),
  tipo         TEXT NOT NULL,
  destinatario TEXT NOT NULL,
  estado       TEXT NOT NULL CHECK (estado IN ('enviado','error','omitido')),
  error        TEXT,
  fecha        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ============================================================
-- Datos iniciales: los 19 territorios (17 comunidades + Ceuta y Melilla), con su código INE.
-- ============================================================
INSERT OR IGNORE INTO territorios (codigo, codigo_num, nombre, tipo) VALUES
  ('AND','01','Andalucía','comunidad'),
  ('ARA','02','Aragón','comunidad'),
  ('AST','03','Principado de Asturias','comunidad'),
  ('BAL','04','Illes Balears','comunidad'),
  ('CAN','05','Canarias','comunidad'),
  ('CNT','06','Cantabria','comunidad'),
  ('CYL','07','Castilla y León','comunidad'),
  ('CLM','08','Castilla-La Mancha','comunidad'),
  ('CAT','09','Catalunya','comunidad'),
  ('VAL','10','Comunitat Valenciana','comunidad'),
  ('EXT','11','Extremadura','comunidad'),
  ('GAL','12','Galicia','comunidad'),
  ('MAD','13','Comunidad de Madrid','comunidad'),
  ('MUR','14','Región de Murcia','comunidad'),
  ('NAV','15','Comunidad Foral de Navarra','comunidad'),
  ('PVA','16','Euskadi','comunidad'),
  ('RIO','17','La Rioja','comunidad'),
  ('CEU','18','Ceuta','ciudad_autonoma'),
  ('MEL','19','Melilla','ciudad_autonoma');
