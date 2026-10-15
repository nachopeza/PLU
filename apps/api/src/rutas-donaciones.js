// Donaciones por transferencia: la persona avisa de su donación (con identificación obligatoria) y tesorería la confirma al ver el ingreso.
// No se procesan pagos. Pendiente de revisión jurídica (identificación del donante, límites anuales, declaración al Tribunal de Cuentas).
import { Router } from 'express';
import { db } from './db.js';
import { auditar, requerirEquipo } from './sesion.js';
import { cifrar, descifrar, limitar, tokenAleatorio } from './seguridad.js';
import { esEmail, limpio, normalizarDocumento, tipoDocumento, enmascarar } from './validar.js';

export const donacionesPublicas = Router();
export const donacionesIntranet = Router();
const GESTION = ['admin', 'gestor'];
const LIMITE_EUR = 50000; // tope orientativo por persona y año (Ley Orgánica 8/2007); confirmar con asesoría
const CLAVES = ['iban', 'titular', 'banco', 'nota'];

const ajuste = (k) => db.prepare('SELECT valor FROM ajustes WHERE clave = ?').get('don_' + k)?.valor ?? '';
const refNueva = () => 'PLU-D-' + tokenAleatorio(5).replace(/[^A-Za-z0-9]/g, 'x').slice(0, 6).toUpperCase();

donacionesPublicas.get('/info', (_req, res) => {
  const t = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(importe_centimos),0) AS c FROM donaciones WHERE estado = 'confirmada'`).get();
  const iban = ajuste('iban');
  res.json({ activo: !!iban, iban, titular: ajuste('titular'), banco: ajuste('banco'), nota: ajuste('nota'), donaciones: t.n, total_eur: Math.round(t.c / 100), limite_eur: LIMITE_EUR });
});

donacionesPublicas.post('/', (req, res) => {
  if (!limitar(`don:${req.ip}`, 6, 3600_000)) return res.status(429).json({ error: 'Demasiados intentos. Prueba más tarde.' });
  if (!ajuste('iban')) return res.status(503).json({ error: 'Las donaciones aún no están habilitadas.' });
  const b = req.body ?? {}, errores = {};
  const nombre = limpio(b.nombre, 160), email = limpio(b.email, 254).toLowerCase();
  const doc = normalizarDocumento(b.documento);
  const euros = Number(String(b.importe ?? '').replace(',', '.'));
  if (!nombre) errores.nombre = 'Escribe tu nombre completo';
  if (!esEmail(email)) errores.email = 'Correo no válido';
  if (!tipoDocumento(doc)) errores.documento = 'DNI o NIE no válido (la ley exige identificar a quien dona)';
  if (!Number.isFinite(euros) || euros < 1 || euros > LIMITE_EUR) errores.importe = `Importe entre 1 y ${LIMITE_EUR} €`;
  if (b.acepta !== true) errores.acepta = 'Hace falta aceptar el tratamiento de tus datos';
  if (Object.keys(errores).length) return res.status(400).json({ error: 'Revisa el formulario', errores });
  const persona = db.prepare('SELECT id FROM personas WHERE email = ?').get(email);
  const ref = refNueva();
  db.prepare(`INSERT INTO donaciones (persona_id, donante_nombre, donante_documento_cifrado, importe_centimos, fecha, referencia, estado)
              VALUES (?,?,?,?,?,?,'pendiente')`).run(persona?.id ?? null, nombre, cifrar(doc), Math.round(euros * 100), new Date().toISOString().slice(0, 10), ref);
  res.status(201).json({ ok: true, referencia: ref, iban: ajuste('iban'), titular: ajuste('titular'),
    mensaje: `Gracias. Haz una transferencia de ${euros.toFixed(2).replace('.', ',')} € a ${ajuste('iban')}${ajuste('titular') ? ' (' + ajuste('titular') + ')' : ''} indicando como concepto ${ref}. Tesorería la confirmará al recibirla.` });
});

// ---- Intranet ----
const LEER = [...GESTION, 'auditor'];
const fila = (d) => ({ id: d.id, nombre: d.donante_nombre, documento: (() => { try { return enmascarar(descifrar(d.donante_documento_cifrado)); } catch { return ''; } })(),
  importe: d.importe_centimos / 100, fecha: d.fecha, referencia: d.referencia, estado: d.estado, creada_en: d.creada_en });
donacionesIntranet.get('/donaciones', requerirEquipo(...LEER), (req, res) => {
  const est = ['pendiente', 'confirmada', 'rechazada'].includes(req.query.estado) ? req.query.estado : 'pendiente';
  const filas = db.prepare('SELECT * FROM donaciones WHERE estado = ? ORDER BY id DESC LIMIT 500').all(est).map(fila);
  const tot = db.prepare(`SELECT estado, COUNT(*) AS n, COALESCE(SUM(importe_centimos),0) AS c FROM donaciones GROUP BY estado`).all();
  res.json({ filas, totales: Object.fromEntries(tot.map((t) => [t.estado, { n: t.n, eur: t.c / 100 }])) });
});
donacionesIntranet.post('/donaciones/:id/estado', requerirEquipo(...GESTION), (req, res) => {
  if (!['confirmada', 'rechazada', 'pendiente'].includes(req.body?.estado)) return res.status(400).json({ error: 'Estado no válido' });
  const r = db.prepare('UPDATE donaciones SET estado = ?, registrada_por = ? WHERE id = ?').run(req.body.estado, req.equipo.id, Number(req.params.id));
  if (!r.changes) return res.status(404).json({ error: 'No existe' });
  auditar(req.equipo.id, 'donacion_' + req.body.estado, 'donacion', Number(req.params.id));
  res.json({ ok: true });
});
// Alta manual (ingreso recibido sin aviso previo)
donacionesIntranet.post('/donaciones', requerirEquipo(...GESTION), (req, res) => {
  const b = req.body ?? {}, nombre = limpio(b.nombre, 160), doc = normalizarDocumento(b.documento), euros = Number(String(b.importe ?? '').replace(',', '.'));
  if (!nombre || !tipoDocumento(doc) || !(euros >= 1 && euros <= LIMITE_EUR)) return res.status(400).json({ error: 'Nombre, DNI/NIE válido e importe (1–' + LIMITE_EUR + ' €) obligatorios' });
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha ?? '') ? b.fecha : new Date().toISOString().slice(0, 10);
  const i = db.prepare(`INSERT INTO donaciones (donante_nombre, donante_documento_cifrado, importe_centimos, fecha, referencia, estado, registrada_por) VALUES (?,?,?,?,?,'confirmada',?)`)
    .run(nombre, cifrar(doc), Math.round(euros * 100), fecha, limpio(b.referencia, 40) || null, req.equipo.id);
  auditar(req.equipo.id, 'donacion_alta_manual', 'donacion', Number(i.lastInsertRowid));
  res.status(201).json({ ok: true });
});
donacionesIntranet.get('/donaciones/export.csv', requerirEquipo(...GESTION), (req, res) => {
  const q = (s) => '"' + String(s ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1") + '"';
  const filas = db.prepare(`SELECT * FROM donaciones WHERE estado = 'confirmada' ORDER BY fecha`).all();
  const csv = ['fecha,donante,documento,importe_eur,referencia'].concat(filas.map((d) => {
    let doc = ''; try { doc = descifrar(d.donante_documento_cifrado); } catch { /* ilegible */ }
    return [d.fecha, q(d.donante_nombre), q(doc), (d.importe_centimos / 100).toFixed(2), q(d.referencia)].join(',');
  })).join('\n');
  auditar(req.equipo.id, 'exportar_donaciones', 'donacion', null, { filas: filas.length });
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="donaciones.csv"' }).send('﻿' + csv);
});
donacionesIntranet.get('/ajustes/donaciones', requerirEquipo(...LEER), (_req, res) => res.json(Object.fromEntries(CLAVES.map((k) => [k, ajuste(k)]))));
donacionesIntranet.post('/ajustes/donaciones', requerirEquipo('admin'), (req, res) => {
  const b = req.body ?? {};
  const iban = String(b.iban ?? '').replace(/\s+/g, '').toUpperCase();
  if (iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return res.status(400).json({ error: 'IBAN no válido' });
  const guarda = db.prepare(`INSERT INTO ajustes (clave, valor, actualizado_en) VALUES (?,?,strftime('%Y-%m-%dT%H:%M:%SZ','now')) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, actualizado_en = excluded.actualizado_en`);
  guarda.run('don_iban', iban); guarda.run('don_titular', limpio(b.titular, 120)); guarda.run('don_banco', limpio(b.banco, 80)); guarda.run('don_nota', String(b.nota ?? '').trim().slice(0, 600));
  auditar(req.equipo.id, 'editar_ajustes_donaciones', 'ajustes', null);
  res.json({ ok: true });
});

// ---- Panel de resumen y actividad (cada rol ve solo lo suyo) ----
donacionesIntranet.get('/panel', requerirEquipo('admin', 'gestor', 'coordinador', 'moderador', 'auditor', 'verificador'), (req, res) => {
  const rol = req.equipo.rol, out = { rol };
  const gestion = ['admin', 'gestor', 'coordinador'].includes(rol);
  const mod = ['admin', 'moderador'].includes(rol);
  const alcance = rol === 'coordinador' ? { sql: ' AND p.territorio_id = ?', args: [req.equipo.territorio_id ?? -1] } : { sql: '', args: [] };
  if (gestion) {
    const est = db.prepare(`SELECT p.estado, COUNT(*) AS n FROM personas p WHERE p.tipo = 'afiliado'${alcance.sql} GROUP BY p.estado`).all(...alcance.args);
    out.afiliados = Object.fromEntries(est.map((r) => [r.estado, r.n]));
    out.simpatizantes = db.prepare(`SELECT COUNT(*) AS n FROM personas p WHERE p.tipo = 'simpatizante'${alcance.sql}`).get(...alcance.args).n;
    out.solicitudes_abiertas = db.prepare(`SELECT COUNT(*) AS n FROM solicitudes s JOIN personas p ON p.id = s.persona_id WHERE s.estado IN ('abierta','en_revision')${alcance.sql}`).get(...alcance.args).n;
    // altas por semana (últimas 8 semanas, de la más antigua a la actual)
    const semanas = [];
    for (let i = 7; i >= 0; i--) {
      const d = db.prepare(`SELECT COUNT(*) AS n FROM personas p WHERE p.tipo = 'afiliado' AND p.estado != 'rechazado' AND p.creado_en >= date('now', ?) AND p.creado_en < date('now', ?)${alcance.sql}`)
        .get(`-${(i + 1) * 7 - 1} days`, `-${i * 7 - 1} days`, ...alcance.args);
      semanas.push(d.n);
    }
    out.altas_semanas = semanas;
    out.provincias = db.prepare(`SELECT t.nombre, COUNT(*) AS n FROM personas p JOIN territorios t ON t.id = p.territorio_id WHERE p.tipo = 'afiliado' AND p.estado = 'activo'${alcance.sql} GROUP BY t.nombre ORDER BY n DESC LIMIT 8`).all(...alcance.args);
  }
  if (mod) {
    out.propuestas_nuevas = db.prepare(`SELECT COUNT(*) AS n FROM propuestas WHERE estado = 'recibida'`).get().n;
    out.denuncias_abiertas = db.prepare('SELECT COUNT(*) AS n FROM denuncias WHERE resuelta = 0').get().n;
  }
  if (['admin', 'gestor', 'moderador'].includes(rol)) out.voluntarios_nuevos = db.prepare(`SELECT COUNT(*) AS n FROM voluntarios WHERE estado = 'nuevo'`).get().n;
  if (['admin', 'gestor'].includes(rol)) {
    const d = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(importe_centimos),0) AS c FROM donaciones WHERE estado = 'pendiente'`).get();
    const t = db.prepare(`SELECT COALESCE(SUM(importe_centimos),0) AS c FROM donaciones WHERE estado = 'confirmada'`).get();
    out.donaciones = { pendientes: d.n, pendientes_eur: d.c / 100, confirmadas_eur: t.c / 100 };
  }
  if (['admin', 'auditor'].includes(rol)) {
    out.actividad = db.prepare(`SELECT a.fecha, a.accion, a.entidad, u.username FROM auditoria a LEFT JOIN usuarios_intranet u ON u.id = a.usuario_id ORDER BY a.id DESC LIMIT 12`).all();
  }
  res.json(out);
});
