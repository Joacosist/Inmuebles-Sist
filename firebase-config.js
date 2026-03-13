/**
 * FIREBASE CONFIG — Inmuebles Sist
 *
 * ── INSTRUCCIONES DE CONFIGURACIÓN ──────────────────────────────────────────
 *
 *  1. Ir a https://console.firebase.google.com
 *  2. Crear un nuevo proyecto (cualquier nombre, ej: "inmuebles-sist")
 *  3. Activar autenticación:
 *     - Menú izquierdo: Build → Authentication → Get started
 *     - Sign-in providers → Email/Password → Enable → Save
 *  4. Crear base de datos:
 *     - Menú izquierdo: Build → Firestore Database → Create database
 *     - Elegir "Start in production mode" → Next
 *     - Ubicación: southamerica-east1 (Brasil, más cercano a Argentina)
 *  5. Copiar la configuración de tu app:
 *     - Click en ⚙️ (ruedita) → Project settings
 *     - Bajar hasta "Your apps" → hacer click en el ícono </> (Web)
 *     - Registrar la app (cualquier nombre), NO marcar Firebase Hosting
 *     - Copiar los valores del objeto firebaseConfig que aparece
 *  6. Pegar los valores en el objeto de abajo (reemplazá los "..." vacíos)
 *  7. Guardar y recargar la app — ¡listo!
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

const firebaseConfig = {
  apiKey: "AIzaSyCabzruHk3WIesSD5xY2-ouSj0WIqEk1RE",
  authDomain: "inmuebles-sist.firebaseapp.com",
  databaseURL: "https://inmuebles-sist-default-rtdb.firebaseio.com",
  projectId: "inmuebles-sist",
  storageBucket: "inmuebles-sist.firebasestorage.app",
  messagingSenderId: "1043678799746",
  appId: "1:1043678799746:web:1a49e528c7ded73870d19b",
  measurementId: "G-YSNVH0HKRL"
};

// Automático: true si Firebase está configurado, false si no
const FIREBASE_ENABLED = !!(firebaseConfig.apiKey && firebaseConfig.projectId);
