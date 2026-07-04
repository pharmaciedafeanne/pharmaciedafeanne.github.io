// ═══════════════════════════════════════════════════════════════════════════
// MIGRATION — Upgrade des documents existants
// ═══════════════════════════════════════════════════════════════════════════

const Migration = (() => {
  return {
    // Migration v1 : Ajouter champs manquants sans écraser les données existantes
    async upgradeToV1(pharmacieId) {
      try {
        // ── Quinzaines ────────────────────────────────────────────────────
        const quinzainesSnap = await quinzainesRef(pharmacieId).get();
        let updatedQuinzaines = 0;

        for (const doc of quinzainesSnap.docs) {
          const data = doc.data();
          const updates = {};

          // Ajouter version si absent
          if (!data.version) {
            updates.version = 1;
          }

          // Ajouter deleted flag si absent
          if (data.deleted === undefined) {
            updates.deleted = false;
          }

          // Ajouter createdAt si absent (utiliser updatedAt comme fallback)
          if (!data.createdAt && data.updatedAt) {
            updates.createdAt = data.updatedAt;
          }

          // Ajouter updatedAt si absent
          if (!data.updatedAt) {
            updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
          }

          // Appliquer les updates si nécessaire
          if (Object.keys(updates).length > 0) {
            await quinzainesRef(pharmacieId).doc(doc.id).update(updates);
            updatedQuinzaines++;
          }
        }

        console.log(`[Migration] Mise à jour de ${updatedQuinzaines} quinzaines`);

        // ── Factures ──────────────────────────────────────────────────────
        const facturesSnap = await getDB()
          .collection(FIREBASE_COLLECTIONS.PHARMACIES)
          .doc(pharmacieId)
          .collection(FIREBASE_COLLECTIONS.FACTURES)
          .get();

        let updatedFactures = 0;

        for (const doc of facturesSnap.docs) {
          const data = doc.data();
          const updates = {};

          if (!data.version) updates.version = 1;
          if (data.deleted === undefined) updates.deleted = false;
          if (!data.createdAt && data.updatedAt) updates.createdAt = data.updatedAt;
          if (!data.updatedAt) updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

          if (Object.keys(updates).length > 0) {
            await getDB()
              .collection(FIREBASE_COLLECTIONS.PHARMACIES)
              .doc(pharmacieId)
              .collection(FIREBASE_COLLECTIONS.FACTURES)
              .doc(doc.id)
              .update(updates);
            updatedFactures++;
          }
        }

        console.log(`[Migration] Mise à jour de ${updatedFactures} factures`);

        // Marquer migration comme complète
        await getDB()
          .collection(FIREBASE_COLLECTIONS.PHARMACIES)
          .doc(pharmacieId)
          .update({
            migrationV1Completed: true,
            migrationV1Date: firebase.firestore.FieldValue.serverTimestamp(),
          });

        return {
          success: true,
          updatedQuinzaines,
          updatedFactures,
        };
      } catch (e) {
        console.error('[Migration] Erreur:', e);
        return { success: false, error: e.message };
      }
    },

    // Lancer la migration si nécessaire
    async checkAndMigrate(pharmacieId) {
      try {
        const pharmacyDoc = await getDB()
          .collection(FIREBASE_COLLECTIONS.PHARMACIES)
          .doc(pharmacieId)
          .get();

        const pharmacy = pharmacyDoc.data();

        if (!pharmacy || pharmacy.migrationV1Completed) {
          console.log('[Migration] V1 déjà complétée ou pharmacy introuvable');
          return { needed: false };
        }

        console.log('[Migration] V1 en cours...');
        const result = await this.upgradeToV1(pharmacieId);
        console.log('[Migration] V1 complétée:', result);

        return { needed: true, ...result };
      } catch (e) {
        console.error('[Migration] Erreur check:', e);
        return { needed: false, error: e.message };
      }
    },
  };
})();
