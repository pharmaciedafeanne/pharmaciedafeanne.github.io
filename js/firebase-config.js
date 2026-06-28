// ╔══════════════════════════════════════════════════════════════════╗
// ║         CONFIGURATION FIREBASE — PHARMACIE DAFEANNE                  ║
// ║  Remplissez avec vos clés depuis console.firebase.google.com     ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// ÉTAPES :
//  1. Allez sur https://console.firebase.google.com
//  2. Créez un projet "suivi-inam-amu"
//  3. Ajoutez une app Web (icône </>)
//  4. Copiez les valeurs ci-dessous
//  5. Activez Authentication → Email/Password
//  6. Activez Firestore Database (mode production)

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAL6lB3CljO0zERddTOEbojpPmHKh2ffa4",
  authDomain:        "pharmacie-dafeanne.firebaseapp.com",
  projectId:         "pharmacie-dafeanne",
  storageBucket:     "pharmacie-dafeanne.firebasestorage.app",
  messagingSenderId: "500849630968",
  appId:             "1:500849630968:web:74d55d2241e6e3f6c0a50d"
};

// ── Règles Firestore à copier dans la console Firebase ──────────────
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     function isAuth() { return request.auth != null; }
//     function isSuperAdmin() {
//       return isAuth() &&
//         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
//     }
//     match /quinzaines/{doc} {
//       allow read, write: if isAuth();
//     }
//     match /users/{uid} {
//       allow read: if isAuth();
//       allow create, update, delete: if isSuperAdmin();
//     }
//   }
// }
// ────────────────────────────────────────────────────────────────────

// Initialisation Firebase (ne pas modifier)
let _app, _db, _auth;

function initFirebase() {
  if (_app) return;
  try {
    _app  = firebase.initializeApp(FIREBASE_CONFIG);
    _db   = firebase.firestore();
    _auth = firebase.auth();
    console.log('[Firebase] Connecté au projet:', FIREBASE_CONFIG.projectId);
  } catch (e) {
    console.error('[Firebase] Erreur init:', e.message);
    throw new Error('Configuration Firebase invalide. Vérifiez firebase-config.js');
  }
}

function getDB()   { if (!_db)   initFirebase(); return _db;   }
function getAuth() { if (!_auth) initFirebase(); return _auth; }
