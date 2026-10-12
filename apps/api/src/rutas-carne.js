// Plantilla del carné: subida del PDF diseñado, revisión de campos y vista previa.
import express, { Router } from 'express';
import { db } from './db.js';
import { auditar, requerirEquipo } from './sesion.js';
import { CAMPOS_OBLIGATORIOS, CAMPOS_OPCIONALES, DATOS_MUESTRA, generarCarnePdf, guardarPlantilla, inspeccionarPlantilla, plantillaActiva } from './carne.js';

export const rutasCarne = Router();
const ROLES = ['admin', 'gestor'];

// El PDF llega como binario (application/pdf), por eso esta ruta no usa JSON
rutasCarne.post('/plantillas', requerirEquipo(...ROLES), express.raw({ type: 'application/pdf', limit: '8mb' }), async (req, res) => {
  const bytes = req.body;
  if (!Buffer.isBuffer(bytes) || bytes.length < 100 || bytes.subarray(0, 5).toString() !== '%PDF-') return res.status(400).json({ error: 'El archivo no es un PDF' });
  let info;
  try { info = await inspeccionarPlantilla(bytes); } catch { return res.status(400).json({ error: 'No se pudo leer el PDF (¿está protegido con contraseña?)' }); }
  if (info.faltan.length) return res.status(422).json({ error: 'A la plantilla le faltan campos de formulario', ...info, obligatorios: CAMPOS_OBLIGATORIOS });
  const id = guardarPlantilla(bytes);
  auditar(req.equipo.id, 'subir_plantilla_carne', 'plantilla', id);
  res.status(201).json({ ok: true, id, ...info });
});

rutasCarne.get('/plantillas', requerirEquipo(...ROLES, 'auditor'), (_req, res) => {
  res.json({
    activa: plantillaActiva()?.id ?? null, obligatorios: CAMPOS_OBLIGATORIOS, opcionales: CAMPOS_OPCIONALES,
    lista: db.prepare('SELECT id, activa, creada_en FROM plantillas_carne ORDER BY id DESC').all(),
  });
});

rutasCarne.get('/plantillas/vista-previa.pdf', requerirEquipo(...ROLES), async (_req, res) => {
  try {
    const { bytes } = await generarCarnePdf(DATOS_MUESTRA);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="vista-previa-carne.pdf"');
    res.send(Buffer.from(bytes));
  } catch (e) { res.status(500).json({ error: 'No se pudo generar la vista previa' }); }
});
