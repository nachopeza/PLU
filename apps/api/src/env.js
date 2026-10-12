// Carga apps/api/.env (si existe) antes que nada. Requiere Node 22.10 o superior.
try { process.loadEnvFile?.(new URL('../.env', import.meta.url)); } catch { /* sin .env: no pasa nada */ }
