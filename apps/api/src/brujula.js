// Brújula PLU: preguntas, cálculo y agregados. Texto neutro, con preguntas en ambos sentidos para evitar el "sí a todo".
// Es una autoevaluación orientativa, no un diagnóstico ni una etiqueta: no se usa para decidir nada sobre nadie.
export const VERSION_TEST = 'brujula-1';
export const VERSION_CONSENTIMIENTO = 'brujula-consent-1';

export const EJES = {
  eco: { nombre: 'Economía', izq: 'Más mercado y libre competencia', der: 'Más intervención pública' },
  lib: { nombre: 'Libertades', izq: 'Libertad individual primero', der: 'Orden y tradición primero' },
  ter: { nombre: 'Territorio', izq: 'Decisiones más centralizadas', der: 'Más autonomía territorial' },
  par: { nombre: 'Participación', izq: 'Decide la representación profesional', der: 'Más democracia directa' },
};
// Posición de referencia de PLU (provisional: la base doctrinal está abierta a debate)
export const REFERENCIA = { eco: -40, lib: -50, ter: 40, par: 15 };

// sentido: +1 si estar de acuerdo empuja hacia la derecha del eje, -1 hacia la izquierda
export const PREGUNTAS = [
  { id: 1, eje: 'eco', sentido: -1, texto: 'Los impuestos deberían ser más bajos, aunque eso suponga recortar algunos servicios públicos.' },
  { id: 2, eje: 'eco', sentido: 1, texto: 'El Estado debe limitar por ley el precio del alquiler en las zonas con mucha demanda.' },
  { id: 3, eje: 'eco', sentido: -1, texto: 'La competencia entre empresas beneficia más a la ciudadanía que una regulación más estricta del mercado.' },
  { id: 4, eje: 'eco', sentido: 1, texto: 'Los servicios esenciales, como la sanidad y la educación, deberían ser sobre todo de gestión pública.' },
  { id: 5, eje: 'eco', sentido: -1, texto: 'Las ayudas públicas deben dirigirse a quien más las necesita, en lugar de ser universales.' },
  { id: 6, eje: 'lib', sentido: -1, texto: 'Cada persona debe poder decidir sobre su vida privada sin que el Estado intervenga, aunque yo no comparta sus decisiones.' },
  { id: 7, eje: 'lib', sentido: 1, texto: 'Es aceptable limitar algunas libertades para reforzar la seguridad.' },
  { id: 8, eje: 'lib', sentido: 1, texto: 'Las instituciones deben proteger activamente las tradiciones y costumbres del país.' },
  { id: 9, eje: 'lib', sentido: -1, texto: 'El Estado no debe decidir qué contenidos puede leer, ver o decir una persona adulta.' },
  { id: 10, eje: 'lib', sentido: 1, texto: 'Para mantener el orden social, las normas deberían aplicarse con más dureza.' },
  { id: 11, eje: 'ter', sentido: 1, texto: 'Las comunidades y los municipios deberían tener más competencias y más capacidad de decidir sobre sus recursos.' },
  { id: 12, eje: 'ter', sentido: -1, texto: 'Algunas decisiones funcionan mejor si se toman igual para todo el país desde un único gobierno.' },
  { id: 13, eje: 'ter', sentido: 1, texto: 'La identidad y la cultura propias de cada territorio deben tener reconocimiento institucional.' },
  { id: 14, eje: 'par', sentido: 1, texto: 'La ciudadanía debería votar directamente más leyes mediante consultas vinculantes.' },
  { id: 15, eje: 'par', sentido: -1, texto: 'Las decisiones complejas es mejor dejarlas en manos de profesionales y de representantes elegidos.' },
  { id: 16, eje: 'par', sentido: -1, texto: 'Los cargos públicos deberían acreditar formación y méritos para el puesto, más allá de ser elegidos.' },
];

export const ESCALA = [[-2, 'Muy en desacuerdo'], [-1, 'En desacuerdo'], [0, 'Neutral'], [1, 'De acuerdo'], [2, 'Muy de acuerdo']];

export const AREAS_INTERES = ['Libertades y derechos', 'Economía y empleo', 'Vivienda', 'Educación y juventud', 'Sanidad', 'Transporte', 'Medio ambiente', 'Democracia y transparencia', 'Territorio', 'Seguridad', 'Tecnología y digital', 'Cultura'];

// respuestas: { [idPregunta]: -2..2 } (las que falten o no sean válidas se ignoran = "prefiero no responder")
export function calcular(respuestas) {
  const suma = {}, n = {};
  for (const p of PREGUNTAS) {
    const v = Number(respuestas?.[p.id]);
    if (!Number.isInteger(v) || v < -2 || v > 2 || respuestas?.[p.id] === null || respuestas?.[p.id] === '' || respuestas?.[p.id] === undefined) continue;
    suma[p.eje] = (suma[p.eje] ?? 0) + p.sentido * v;
    n[p.eje] = (n[p.eje] ?? 0) + 1;
  }
  const ejes = {};
  for (const e of Object.keys(EJES)) if ((n[e] ?? 0) >= 2) ejes[e] = Math.round((suma[e] / (2 * n[e])) * 100);
  const claves = Object.keys(ejes);
  if (!claves.length) return { ejes, afinidad: null, respondidas: 0 };
  const cerca = claves.map((e) => Math.max(0, 1 - Math.abs(ejes[e] - REFERENCIA[e]) / 150));
  const afinidad = Math.round((cerca.reduce((a, b) => a + b, 0) / cerca.length) * 100);
  return { ejes, afinidad, respondidas: Object.values(n).reduce((a, b) => a + b, 0) };
}
