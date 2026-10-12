# Plantilla del carné: qué debe llevar

El carné **no lleva foto**. Lo diseñas tú (Illustrator, InDesign, Figma, Acrobat…) y lo subes como **PDF con campos de formulario**. La plataforma rellena los campos, inserta el QR y entrega el PDF al afiliado.

## Formato
- Tamaño: **85,6 × 54 mm** (tarjeta ISO/ID-1), apaisado. Si quieres impresión: añade sangrado de 3 mm.
- Una página (anverso). Si quieres reverso, ponlo como **página 2 estática** (sin campos).
- Tipografías incrustadas en el PDF. Color RGB para pantalla (CMYK solo si vas a imprimir).
- Los campos de texto deben tener **nombre exacto** (mayúsculas y minúsculas importan).

## Datos que se rellenan (campos de formulario)
| Nombre del campo | Qué contiene | Ejemplo | Obligatorio |
|---|---|---|---|
| `nombre` | Nombre | María | Sí |
| `apellidos` | Apellidos | García López | Sí |
| `numeroAfiliado` | Número con guion | 28-482915 | Sí |
| `territorio` | Provincia | Madrid | Sí |
| `fechaAlta` | Fecha de alta | 01/01/2027 | Sí |
| `validoHasta` | Caducidad | 01/01/2032 | Sí |
| `qr` | **Botón con imagen** (push button) donde se inserta el QR | — | Sí |
| `nombreCompleto` | Nombre y apellidos juntos | María García López | No |
| `comunidad` | Comunidad autónoma | Comunidad de Madrid | No |

- Deja espacio para nombres largos (hasta ~40 caracteres) y alineación sin cortes.
- **QR:** cuadrado de **al menos 18 × 18 mm**, con margen blanco alrededor y buen contraste (oscuro sobre claro). Se crea como campo de tipo *botón de imagen* llamado `qr` (en Acrobat: Preparar formulario → Botón → Opciones: "Solo icono").

## Texto fijo recomendado (en el diseño, no como campo)
- Nombre de la organización y logo.
- "Carné de afiliado".
- Leyenda: "Este carné no sustituye a un documento oficial de identidad."
- Dirección web o contacto para dudas (cuando haya dominio).

## Qué NO poner
- DNI/NIE, fecha de nacimiento, teléfono o correo.
- Foto.

## Cómo subirla
Intranet → **Carné** → elegir el PDF → *Subir y activar*. La plataforma te dice qué campos encuentra y cuáles faltan. Con **Ver vista previa** compruebas el resultado con datos de ejemplo. La plantilla anterior queda archivada. Los carnés ya emitidos se regeneran al descargarse con la plantilla activa.

## Vigencia
Hasta la baja, o **5 años** (menores de 30 el día de emisión) / **10 años** (30 o más). La renovación y la baja se piden desde el portal.

## Verificación
El QR abre la pantalla de verificación de la intranet (solo equipo con rol admin, gestor o verificador): muestra *válido, caducado, revocado, suspendido, de baja o no existe*. No existe verificación pública.
