// ===== AUTHENTIFICATION — Firebase Auth =====

let currentUser = null;   // { uid, email, name, role }

// ── Login / Logout ────────────────────────────────────────────────────

async function login(email, password) {
  const cred = await getAuth().signInWithEmailAndPassword(email, password);
  const profile = await getUserProfile(cred.user.uid);
  if (!profile) throw new Error('Profil utilisateur introuvable. Contactez l\'administrateur.');
  currentUser = { uid: cred.user.uid, email: cred.user.email, ...profile };
  return currentUser;
}

async function loginByCode(pharmacieCode, password) {
  const code = pharmacieCode.toUpperCase().trim();
  // Lookup public index: loginCodes/{code} → { emails: [...] }
  const idxDoc = await getDB().collection('loginCodes').doc(code).get();
  let emails = idxDoc.exists ? (idxDoc.data().emails || []) : [];

  // Fallback: query users collection directly (si index pas encore créé)
  if (!emails.length) {
    const snap = await getDB().collection('users').where('pharmacieId','==', code).get();
    emails = snap.docs.map(d => d.data().email).filter(Boolean);
  }
  if (!emails.length) throw new Error('Code pharmacie introuvable. Vérifiez le code.');

  let lastError = null;
  for (const email of emails) {
    try {
      const cred = await getAuth().signInWithEmailAndPassword(email, password);
      const profile = await getUserProfile(cred.user.uid);
      if (!profile) { await getAuth().signOut(); continue; }
      currentUser = { uid: cred.user.uid, email: cred.user.email, ...profile };
      return currentUser;
    } catch(e) {
      const wrongPwd = ['auth/wrong-password','auth/invalid-credential','auth/invalid-login-credentials'];
      if (wrongPwd.includes(e.code)) { lastError = e; continue; }
      throw e;
    }
  }
  throw new Error('Mot de passe incorrect.');
}

async function updateLoginCodesIndex(pharmacieId, email) {
  if (!pharmacieId || !email) return;
  const ref = getDB().collection('loginCodes').doc(pharmacieId.toUpperCase());
  await ref.set({ emails: firebase.firestore.FieldValue.arrayUnion(email) }, { merge: true });
}

async function removeFromLoginCodesIndex(pharmacieId, email) {
  if (!pharmacieId || !email) return;
  const ref = getDB().collection('loginCodes').doc(pharmacieId.toUpperCase());
  await ref.set({ emails: firebase.firestore.FieldValue.arrayRemove(email) }, { merge: true });
}

async function logout() {
  await getAuth().signOut();
  currentUser = null;
}

// Écoute des changements d'état d'auth Firebase
function onAuthReady(callback) {
  getAuth().onAuthStateChanged(async (fbUser) => {
    if (fbUser) {
      const profile = await getUserProfile(fbUser.uid);
      if (profile) {
        currentUser = { uid: fbUser.uid, email: fbUser.email, ...profile };
        callback('logged_in', currentUser);
      } else {
        await getAuth().signOut();
        callback('logged_out', null);
      }
    } else {
      currentUser = null;
      callback('logged_out', null);
    }
  });
}

// ── Gestion des comptes (Super Admin) ────────────────────────────────

async function createAccount(name, email, password, role, pharmacieId) {
  const secondary = firebase.initializeApp(FIREBASE_CONFIG, 'secondary_' + Date.now());
  let uid;
  try {
    const cred = await secondary.auth().createUserWithEmailAndPassword(email, password);
    uid = cred.user.uid;
    await secondary.auth().signOut();
  } finally {
    await secondary.delete();
  }
  await createUserProfile(uid, { name, email, role, pharmacieId: pharmacieId || null });
  if (pharmacieId) await updateLoginCodesIndex(pharmacieId, email);
  return uid;
}

async function updateAccount(uid, updates) {
  // updates peut contenir : name, role (pas email ni password via cette fonction)
  await updateUserProfile(uid, updates);
  // Mise à jour locale si c'est l'utilisateur courant
  if (currentUser && currentUser.uid === uid) {
    currentUser = { ...currentUser, ...updates };
  }
}

async function deleteAccount(uid) {
  if (currentUser && currentUser.uid === uid) {
    throw new Error('Impossible de supprimer votre propre compte.');
  }
  await deleteUserProfile(uid);
  // Note: la suppression du compte Firebase Auth nécessite le SDK Admin.
  // Le compte Auth reste inactif mais le profil Firestore est supprimé,
  // ce qui empêche la connexion (l'app vérifie le profil Firestore).
}

async function changePassword(newPassword) {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Non connecté.');
  await user.updatePassword(newPassword);
}

// ── Seed : Premier super administrateur ──────────────────────────────
// Appelé une seule fois lors de la première initialisation

async function seedSuperAdmin(name, email, password) {
  const cred = await getAuth().createUserWithEmailAndPassword(email, password);

  // Attendre que Firestore reçoive bien le token auth
  await new Promise((resolve, reject) => {
    const unsub = getAuth().onAuthStateChanged(async (user) => {
      if (user && user.uid === cred.user.uid) {
        unsub();
        try {
          await createUserProfile(user.uid, { name, email, role: 'superadmin' });
          await getDB().collection('config').doc('platform').set({ setupDone: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
          await getAuth().signOut();
          resolve();
        } catch(e) { reject(e); }
      }
    });
  });

  console.log('[Auth] Super admin créé:', email);
}
