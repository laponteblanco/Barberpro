import 'dotenv/config';
import { spawnSync } from 'child_process';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!supabaseUrl) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL no está definida en el archivo .env");
  process.exit(1);
}

if (!serviceAccount) {
  console.error("Error: FIREBASE_SERVICE_ACCOUNT no está definida en el archivo .env");
  process.exit(1);
}

const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!match) {
  console.error("Error: No se pudo extraer el project-ref de NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl);
  process.exit(1);
}
const projectRef = match[1];

console.log(`\n=== CONFIGURACIÓN Y DESPLIEGUE DE EDGE FUNCTION ===`);
console.log(`Proyecto Supabase detectado: ${projectRef}\n`);

// 1. Configurar secretos
console.log("Pasó 1: Configurando el secreto FIREBASE_SERVICE_ACCOUNT en Supabase...");
const secretResult = spawnSync('npx', [
  'supabase',
  'secrets',
  'set',
  `FIREBASE_SERVICE_ACCOUNT=${serviceAccount}`,
  '--project-ref',
  projectRef
], { stdio: 'inherit', shell: true });

if (secretResult.status !== 0) {
  console.error("\n[ERROR] Falló la configuración de secretos en Supabase.");
  process.exit(1);
}
console.log("¡Secreto configurado exitosamente!\n");

// 2. Desplegar función
console.log("Paso 2: Desplegando la Edge Function 'enviar-push'...");
const deployResult = spawnSync('npx', [
  'supabase',
  'functions',
  'deploy',
  'enviar-push',
  '--project-ref',
  projectRef
], { stdio: 'inherit', shell: true });

if (deployResult.status !== 0) {
  console.error("\n[ERROR] Falló el despliegue de la Edge Function.");
  process.exit(1);
}

console.log("\n¡Edge Function 'enviar-push' desplegada exitosamente con éxito!");
console.log(`URL de la función: https://${projectRef}.supabase.co/functions/v1/enviar-push\n`);
