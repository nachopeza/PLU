#!/bin/bash
# Descarga las fotos de Unsplash a la carpeta fotos/ (macOS o Linux). Ejecutar desde esta carpeta:
#   cd apps/web/public/prototipo && bash descargar-fotos.sh
set -e
mkdir -p fotos
for id in photo-1517048676732-d65bc937f952 photo-1519313825-713a373f2bce photo-1520095972714-909e91b038e5 photo-1520127877998-122c33e8eb38 photo-1520880867055-1e30d1cb001c photo-1529209076408-5a115ec9f1c6 photo-1555069855-e580a9adbf43 photo-1556798542-13bfa5d6d01e photo-1590650046871-92c887180603 photo-1593250785690-dcb40957506f photo-1663162550938-60f70fab5d31 photo-1741156386380-0236c72eb6f9 photo-1752747115265-1e4cfb2c1212 photo-1758613171176-ea64579c2dcf photo-1758691461935-202e2ef6b69f photo-1761839262867-af53d08b0eb5 photo-1768299947895-06b676197f74; do
  echo "Descargando $id"
  curl -fsSL "https://images.unsplash.com/$id?auto=format&fit=crop&w=1800&q=75" -o "fotos/$id.jpg" || echo "  (no se pudo: $id)"
done
echo "Listo. Abre index.html"
