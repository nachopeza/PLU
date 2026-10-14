-- Esquema inicial de la base de datos de la PLU (SQLite).
-- Ver docs/02-modelo-de-datos.md para la explicación de cada tabla.
-- Todas las fechas se guardan como texto ISO 8601 (UTC).

-- ============================================================
-- Territorios: comunidades y ciudades autónomas (19) y las 52 provincias (INE).
-- El nivel de trabajo es la PROVINCIA: cada persona pertenece a una provincia, y cada
-- provincia cuelga de su comunidad mediante padre_id. Los municipios se podrían añadir después.
-- ============================================================
CREATE TABLE IF NOT EXISTS territorios (
  id        INTEGER PRIMARY KEY,
  codigo    TEXT NOT NULL UNIQUE,          -- comunidad: siglas de 3 letras. Provincia: 'P' + código INE (P28)
  codigo_num TEXT UNIQUE,                  -- solo provincias: código INE de 2 dígitos. Va en el número de afiliado
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
  numero_afiliado      TEXT UNIQUE,            -- 8 cifras sin guion (provincia INE 2 + 6 aleatorias). Se muestra como 28-482915
  codigo_verificacion  TEXT UNIQUE,            -- código aleatorio que lleva el QR del carné
  nombre               TEXT NOT NULL,
  apellidos            TEXT NOT NULL,
  email                TEXT NOT NULL UNIQUE,
  telefono             TEXT,
  fecha_nacimiento     TEXT,                   -- mínimo 16 años: lo valida la API
  documento_tipo       TEXT CHECK (documento_tipo IN ('DNI','NIE')),
  documento_cifrado    TEXT,                   -- número cifrado (AES-GCM, clave en variable de entorno)
  documento_hash       TEXT UNIQUE,            -- HMAC del número: detecta duplicados sin descifrar
  pais                 TEXT NOT NULL DEFAULT 'España',
  codigo_postal        TEXT,
  poblacion            TEXT,
  territorio_id        INTEGER REFERENCES territorios(id),   -- siempre una provincia
  foto_path            TEXT,
  password_hash        TEXT,                   -- solo afiliados. Los simpatizantes no tienen cuenta ni portal
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
  rol            TEXT NOT NULL CHECK (rol IN ('admin','gestor','moderador','coordinador','verificador','tesoreria','auditor')),
  territorio_id  INTEGER REFERENCES territorios(id),   -- solo para el rol coordinador (una provincia)
  totp_secreto_cifrado TEXT,                           -- doble verificación con app autenticadora
  totp_activo    INTEGER NOT NULL DEFAULT 0,
  codigos_recuperacion_hash TEXT,
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
                 ('cambio_datos','cambio_provincia','baja','duplicado_carne','renovacion_carne','certificado','otra')),
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

-- Enlaces de un solo uso para encuestas directas a simpatizantes (no tienen portal).
-- Se guarda solo el hash del enlace. Este enlace NO se guarda junto a las respuestas.
CREATE TABLE IF NOT EXISTS enlaces_encuesta (
  id          INTEGER PRIMARY KEY,
  encuesta_id INTEGER NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  persona_id  INTEGER NOT NULL REFERENCES personas(id),
  token_hash  TEXT NOT NULL UNIQUE,
  expira_en   TEXT NOT NULL,
  usado_en    TEXT
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
-- Donaciones: se reciben por transferencia y las registra tesorería al conciliar el banco.
-- Importes en céntimos de euro. Ver docs/10-donaciones.md (falta asesoría jurídica).
-- ============================================================
CREATE TABLE IF NOT EXISTS donaciones (
  id                        INTEGER PRIMARY KEY,
  persona_id                INTEGER REFERENCES personas(id),    -- NULL si quien dona no está en la base
  donante_nombre            TEXT NOT NULL,
  donante_documento_cifrado TEXT,
  importe_centimos          INTEGER NOT NULL CHECK (importe_centimos > 0),
  fecha                     TEXT NOT NULL,
  metodo                    TEXT NOT NULL DEFAULT 'transferencia' CHECK (metodo IN ('transferencia')),
  referencia                TEXT,
  estado                    TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmada','rechazada')),
  justificante_path         TEXT,
  registrada_por            INTEGER REFERENCES usuarios_intranet(id),
  creada_en                 TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ============================================================
-- Datos iniciales: 19 comunidades y ciudades autónomas y 52 provincias (código INE).
-- ============================================================
INSERT OR IGNORE INTO territorios (codigo, nombre, tipo) VALUES
  ('AND','Andalucía','comunidad'),
  ('ARA','Aragón','comunidad'),
  ('AST','Principado de Asturias','comunidad'),
  ('BAL','Illes Balears','comunidad'),
  ('CAN','Canarias','comunidad'),
  ('CNT','Cantabria','comunidad'),
  ('CYL','Castilla y León','comunidad'),
  ('CLM','Castilla-La Mancha','comunidad'),
  ('CAT','Catalunya','comunidad'),
  ('VAL','Comunitat Valenciana','comunidad'),
  ('EXT','Extremadura','comunidad'),
  ('GAL','Galicia','comunidad'),
  ('MAD','Comunidad de Madrid','comunidad'),
  ('MUR','Región de Murcia','comunidad'),
  ('NAV','Comunidad Foral de Navarra','comunidad'),
  ('PVA','Euskadi','comunidad'),
  ('RIO','La Rioja','comunidad'),
  ('CEU','Ceuta','ciudad_autonoma'),
  ('MEL','Melilla','ciudad_autonoma');

INSERT OR IGNORE INTO territorios (codigo, codigo_num, nombre, tipo, padre_id) VALUES
  ('P01','01','Araba/Álava','provincia',(SELECT id FROM territorios WHERE codigo='PVA')),
  ('P02','02','Albacete','provincia',(SELECT id FROM territorios WHERE codigo='CLM')),
  ('P03','03','Alicante/Alacant','provincia',(SELECT id FROM territorios WHERE codigo='VAL')),
  ('P04','04','Almería','provincia',(SELECT id FROM territorios WHERE codigo='AND')),
  ('P05','05','Ávila','provincia',(SELECT id FROM territorios WHERE codigo='CYL')),
  ('P06','06','Badajoz','provincia',(SELECT id FROM territorios WHERE codigo='EXT')),
  ('P07','07','Illes Balears','provincia',(SELECT id FROM territorios WHERE codigo='BAL')),
  ('P08','08','Barcelona','provincia',(SELECT id FROM territorios WHERE codigo='CAT')),
  ('P09','09','Burgos','provincia',(SELECT id FROM territorios WHERE codigo='CYL')),
  ('P10','10','Cáceres','provincia',(SELECT id FROM territorios WHERE codigo='EXT')),
  ('P11','11','Cádiz','provincia',(SELECT id FROM territorios WHERE codigo='AND')),
  ('P12','12','Castellón/Castelló','provincia',(SELECT id FROM territorios WHERE codigo='VAL')),
  ('P13','13','Ciudad Real','provincia',(SELECT id FROM territorios WHERE codigo='CLM')),
  ('P14','14','Córdoba','provincia',(SELECT id FROM territorios WHERE codigo='AND')),
  ('P15','15','A Coruña','provincia',(SELECT id FROM territorios WHERE codigo='GAL')),
  ('P16','16','Cuenca','provincia',(SELECT id FROM territorios WHERE codigo='CLM')),
  ('P17','17','Girona','provincia',(SELECT id FROM territorios WHERE codigo='CAT')),
  ('P18','18','Granada','provincia',(SELECT id FROM territorios WHERE codigo='AND')),
  ('P19','19','Guadalajara','provincia',(SELECT id FROM territorios WHERE codigo='CLM')),
  ('P20','20','Gipuzkoa','provincia',(SELECT id FROM territorios WHERE codigo='PVA')),
  ('P21','21','Huelva','provincia',(SELECT id FROM territorios WHERE codigo='AND')),
  ('P22','22','Huesca','provincia',(SELECT id FROM territorios WHERE codigo='ARA')),
  ('P23','23','Jaén','provincia',(SELECT id FROM territorios WHERE codigo='AND')),
  ('P24','24','León','provincia',(SELECT id FROM territorios WHERE codigo='CYL')),
  ('P25','25','Lleida','provincia',(SELECT id FROM territorios WHERE codigo='CAT')),
  ('P26','26','La Rioja','provincia',(SELECT id FROM territorios WHERE codigo='RIO')),
  ('P27','27','Lugo','provincia',(SELECT id FROM territorios WHERE codigo='GAL')),
  ('P28','28','Madrid','provincia',(SELECT id FROM territorios WHERE codigo='MAD')),
  ('P29','29','Málaga','provincia',(SELECT id FROM territorios WHERE codigo='AND')),
  ('P30','30','Murcia','provincia',(SELECT id FROM territorios WHERE codigo='MUR')),
  ('P31','31','Navarra','provincia',(SELECT id FROM territorios WHERE codigo='NAV')),
  ('P32','32','Ourense','provincia',(SELECT id FROM territorios WHERE codigo='GAL')),
  ('P33','33','Asturias','provincia',(SELECT id FROM territorios WHERE codigo='AST')),
  ('P34','34','Palencia','provincia',(SELECT id FROM territorios WHERE codigo='CYL')),
  ('P35','35','Las Palmas','provincia',(SELECT id FROM territorios WHERE codigo='CAN')),
  ('P36','36','Pontevedra','provincia',(SELECT id FROM territorios WHERE codigo='GAL')),
  ('P37','37','Salamanca','provincia',(SELECT id FROM territorios WHERE codigo='CYL')),
  ('P38','38','Santa Cruz de Tenerife','provincia',(SELECT id FROM territorios WHERE codigo='CAN')),
  ('P39','39','Cantabria','provincia',(SELECT id FROM territorios WHERE codigo='CNT')),
  ('P40','40','Segovia','provincia',(SELECT id FROM territorios WHERE codigo='CYL')),
  ('P41','41','Sevilla','provincia',(SELECT id FROM territorios WHERE codigo='AND')),
  ('P42','42','Soria','provincia',(SELECT id FROM territorios WHERE codigo='CYL')),
  ('P43','43','Tarragona','provincia',(SELECT id FROM territorios WHERE codigo='CAT')),
  ('P44','44','Teruel','provincia',(SELECT id FROM territorios WHERE codigo='ARA')),
  ('P45','45','Toledo','provincia',(SELECT id FROM territorios WHERE codigo='CLM')),
  ('P46','46','Valencia/València','provincia',(SELECT id FROM territorios WHERE codigo='VAL')),
  ('P47','47','Valladolid','provincia',(SELECT id FROM territorios WHERE codigo='CYL')),
  ('P48','48','Bizkaia','provincia',(SELECT id FROM territorios WHERE codigo='PVA')),
  ('P49','49','Zamora','provincia',(SELECT id FROM territorios WHERE codigo='CYL')),
  ('P50','50','Zaragoza','provincia',(SELECT id FROM territorios WHERE codigo='ARA')),
  ('P51','51','Ceuta','provincia',(SELECT id FROM territorios WHERE codigo='CEU')),
  ('P52','52','Melilla','provincia',(SELECT id FROM territorios WHERE codigo='MEL'));

-- ============================================================
-- Participación: propuestas ciudadanas, apoyos, comentarios, eventos, noticias y voluntariado.
-- ============================================================
CREATE TABLE IF NOT EXISTS propuestas (
  id              INTEGER PRIMARY KEY,
  titulo          TEXT NOT NULL,
  texto           TEXT NOT NULL,
  area            TEXT,
  autor_nombre    TEXT NOT NULL,
  autor_email     TEXT NOT NULL,                 -- nunca se muestra en público
  estado          TEXT NOT NULL DEFAULT 'recibida'
                    CHECK (estado IN ('recibida','rechazada','en_estudio','en_debate','en_votacion','aprobada','descartada','en_marcha')),
  motivo_rechazo  TEXT,
  votacion_id     INTEGER REFERENCES encuestas(id),
  creada_en       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  actualizada_en  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_propuestas_estado ON propuestas(estado, creada_en);

CREATE TABLE IF NOT EXISTS propuesta_historial (
  id          INTEGER PRIMARY KEY,
  propuesta_id INTEGER NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  estado      TEXT NOT NULL,
  nota        TEXT,                              -- visible en público
  usuario_id  INTEGER REFERENCES usuarios_intranet(id),
  fecha       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS propuesta_apoyos (
  propuesta_id INTEGER NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  persona_id   INTEGER NOT NULL REFERENCES personas(id),
  fecha        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (propuesta_id, persona_id)
);

CREATE TABLE IF NOT EXISTS comentarios (
  id           INTEGER PRIMARY KEY,
  propuesta_id INTEGER NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  persona_id   INTEGER NOT NULL REFERENCES personas(id),
  texto        TEXT NOT NULL,
  oculto       INTEGER NOT NULL DEFAULT 0,
  creado_en    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_comentarios_propuesta ON comentarios(propuesta_id, creado_en);

CREATE TABLE IF NOT EXISTS denuncias (
  id            INTEGER PRIMARY KEY,
  comentario_id INTEGER NOT NULL REFERENCES comentarios(id) ON DELETE CASCADE,
  persona_id    INTEGER NOT NULL REFERENCES personas(id),
  motivo        TEXT,
  resuelta      INTEGER NOT NULL DEFAULT 0,
  creada_en     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (comentario_id, persona_id)
);

CREATE TABLE IF NOT EXISTS eventos (
  id          INTEGER PRIMARY KEY,
  titulo      TEXT NOT NULL,
  descripcion TEXT,
  lugar       TEXT,
  inicio      TEXT NOT NULL,
  fin         TEXT,
  aforo       INTEGER,                           -- NULL = sin límite
  estado      TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','publicado','cancelado')),
  creado_en   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE TABLE IF NOT EXISTS eventos_inscripciones (
  id        INTEGER PRIMARY KEY,
  evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  nombre    TEXT NOT NULL,
  email     TEXT NOT NULL,
  creada_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (evento_id, email)
);

CREATE TABLE IF NOT EXISTS noticias (
  id        INTEGER PRIMARY KEY,
  titulo    TEXT NOT NULL,
  resumen   TEXT,
  cuerpo    TEXT NOT NULL,
  publicada INTEGER NOT NULL DEFAULT 0,
  fecha     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  autor_id  INTEGER REFERENCES usuarios_intranet(id)
);

CREATE TABLE IF NOT EXISTS voluntarios (
  id        INTEGER PRIMARY KEY,
  nombre    TEXT NOT NULL,
  email     TEXT NOT NULL,
  telefono  TEXT,
  area      TEXT NOT NULL,
  mensaje   TEXT,
  estado    TEXT NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo','contactado','incorporado','descartado')),
  creada_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ============================================================
-- Contenido editable de la web (textos e imágenes) y biblioteca de medios.
-- ============================================================
CREATE TABLE IF NOT EXISTS contenidos (
  pagina         TEXT NOT NULL,                  -- 'index', 'proyecto'… o 'global' (cabecera y pie)
  clave          TEXT NOT NULL,
  valor          TEXT NOT NULL,                  -- HTML ya limpiado (solo em, strong, b, i, br y enlaces) o /media/…
  actualizado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  usuario_id     INTEGER REFERENCES usuarios_intranet(id),
  PRIMARY KEY (pagina, clave)
);
CREATE TABLE IF NOT EXISTS contenidos_historial (
  id             INTEGER PRIMARY KEY,
  pagina         TEXT NOT NULL,
  clave          TEXT NOT NULL,
  valor_anterior TEXT,
  fecha          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  usuario_id     INTEGER REFERENCES usuarios_intranet(id)
);
CREATE TABLE IF NOT EXISTS medios (
  id         TEXT PRIMARY KEY,                   -- 32 hex; el archivo es <id>.<ext>
  ext        TEXT NOT NULL,
  bytes      INTEGER NOT NULL,
  subido_en  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  usuario_id INTEGER REFERENCES usuarios_intranet(id)
);

-- Recuperación de contraseña por correo (el enlace caduca en 1 hora; solo se guarda el hash del token)
CREATE TABLE IF NOT EXISTS recuperaciones (
  token_hash TEXT PRIMARY KEY,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  expira_en  TEXT NOT NULL
);

-- Noticias: comentarios de afiliados y "me gusta"
CREATE TABLE IF NOT EXISTS noticia_comentarios (
  id         INTEGER PRIMARY KEY,
  noticia_id INTEGER NOT NULL REFERENCES noticias(id) ON DELETE CASCADE,
  persona_id INTEGER NOT NULL REFERENCES personas(id),
  texto      TEXT NOT NULL,
  oculto     INTEGER NOT NULL DEFAULT 0,
  creado_en  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_noticia_com ON noticia_comentarios(noticia_id, creado_en);
CREATE TABLE IF NOT EXISTS noticia_likes (
  noticia_id INTEGER NOT NULL REFERENCES noticias(id) ON DELETE CASCADE,
  persona_id INTEGER NOT NULL REFERENCES personas(id),
  PRIMARY KEY (noticia_id, persona_id)
);

-- Contenido de ejemplo que se crea una sola vez (para que la web no arranque vacía)
CREATE TABLE IF NOT EXISTS semillas (
  nombre    TEXT PRIMARY KEY,
  creada_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
