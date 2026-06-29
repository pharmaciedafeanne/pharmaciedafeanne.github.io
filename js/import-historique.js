// ===== IMPORT DONNÉES HISTORIQUES INAM/AMU =====
// Données directement au format { date, entite, quinzaine, montantFacture, montantPaye, statut, dateVirement }
// Source : SUIVI PAIEMENT FOURNISSEURS_DAFEANNE_bonne version.xlsx — onglet INAM AMU

const HIST_INAM_FLAT = [
{date:"2025-06-16",entite:"INAM",quinzaine:"Q1 JUIN 2025",montantFacture:130431,montantPaye:130429,statut:"payé",dateVirement:"2025-07-15"},
{date:"2025-06-16",entite:"AMU",quinzaine:"Q1 JUIN 2025",montantFacture:39613,montantPaye:39613,statut:"payé",dateVirement:"2025-07-30"},
{date:"2025-07-01",entite:"INAM",quinzaine:"Q2 JUIN 2025",montantFacture:589449,montantPaye:584867,statut:"payé",dateVirement:"2025-08-27"},
{date:"2025-07-01",entite:"AMU",quinzaine:"Q2 JUIN 2025",montantFacture:68674,montantPaye:68674,statut:"payé",dateVirement:"2025-08-04"},
{date:"2025-07-16",entite:"INAM",quinzaine:"Q1 JUILLET 2025",montantFacture:679489,montantPaye:679489,statut:"payé",dateVirement:"2025-08-22"},
{date:"2025-07-16",entite:"AMU",quinzaine:"Q1 JUILLET 2025",montantFacture:212910,montantPaye:212910,statut:"payé",dateVirement:"2025-10-01"},
{date:"2025-08-01",entite:"INAM",quinzaine:"Q2 JUILLET 2025",montantFacture:2109840,montantPaye:2105394,statut:"payé",dateVirement:"2025-10-09"},
{date:"2025-08-01",entite:"AMU",quinzaine:"Q2 JUILLET 2025",montantFacture:393585,montantPaye:393585,statut:"payé",dateVirement:"2025-10-01"},
{date:"2025-08-18",entite:"INAM",quinzaine:"Q1 AOUT 2025",montantFacture:1388175,montantPaye:1388175,statut:"payé",dateVirement:"2025-09-19"},
{date:"2025-08-18",entite:"AMU",quinzaine:"Q1 AOUT 2025",montantFacture:310537,montantPaye:310537,statut:"payé",dateVirement:"2025-09-22"},
{date:"2025-09-01",entite:"INAM",quinzaine:"Q2 AOUT 2025",montantFacture:1599981,montantPaye:1594509,statut:"payé",dateVirement:"2025-10-01"},
{date:"2025-09-01",entite:"AMU",quinzaine:"Q2 AOUT 2025",montantFacture:382795,montantPaye:382795,statut:"payé",dateVirement:"2025-10-01"},
{date:"2025-09-16",entite:"INAM",quinzaine:"Q1 SEPT 2025",montantFacture:896672,montantPaye:896672,statut:"payé",dateVirement:"2025-10-16"},
{date:"2025-09-16",entite:"AMU",quinzaine:"Q1 SEPT 2025",montantFacture:342148,montantPaye:342148,statut:"payé",dateVirement:"2025-10-16"},
{date:"2025-10-01",entite:"INAM",quinzaine:"Q2 SEPT 2025",montantFacture:2714205,montantPaye:2714099,statut:"payé",dateVirement:"2025-11-10"},
{date:"2025-10-01",entite:"AMU",quinzaine:"Q2 SEPT 2025",montantFacture:533959,montantPaye:529551,statut:"payé",dateVirement:"2025-11-06"},
{date:"2025-10-16",entite:"AMU",quinzaine:"Q1 OCT 2025",montantFacture:868511,montantPaye:868511,statut:"payé",dateVirement:"2025-11-21"},
{date:"2025-10-17",entite:"INAM",quinzaine:"Q1 OCT 2025",montantFacture:4507716,montantPaye:4241789,statut:"payé",dateVirement:"2025-12-11"},
{date:"2025-11-03",entite:"AMU",quinzaine:"Q2 OCT 2025",montantFacture:522045,montantPaye:522045,statut:"payé",dateVirement:"2025-12-18"},
{date:"2025-11-03",entite:"INAM",quinzaine:"Q2 OCT 2025",montantFacture:2567831,montantPaye:2341441,statut:"payé",dateVirement:"2026-02-10"},
{date:"2025-11-17",entite:"INAM",quinzaine:"Q1 NOV 2025",montantFacture:1756369,montantPaye:1642856,statut:"payé",dateVirement:"2025-12-22"},
{date:"2025-11-17",entite:"AMU",quinzaine:"Q1 NOV 2025",montantFacture:509099,montantPaye:509099,statut:"payé",dateVirement:"2025-12-12"},
{date:"2025-12-01",entite:"INAM",quinzaine:"Q2 NOV 2025",montantFacture:2218055,montantPaye:2218044,statut:"payé",dateVirement:"2026-01-20"},
{date:"2025-12-01",entite:"AMU",quinzaine:"Q2 NOV 2025",montantFacture:395124,montantPaye:395124,statut:"payé",dateVirement:"2025-12-24"},
{date:"2025-12-16",entite:"INAM",quinzaine:"Q1 DEC 2025",montantFacture:2385806,montantPaye:2385797,statut:"payé",dateVirement:"2026-02-05"},
{date:"2025-12-16",entite:"AMU",quinzaine:"Q1 DEC 2025",montantFacture:725157,montantPaye:706869,statut:"payé",dateVirement:"2026-01-28"},
{date:"2026-01-05",entite:"INAM",quinzaine:"Q2 DEC 2025",montantFacture:2126035,montantPaye:2070227,statut:"payé",dateVirement:"2026-02-18"},
{date:"2026-01-05",entite:"AMU",quinzaine:"Q2 DEC 2025",montantFacture:582796,montantPaye:582796,statut:"payé",dateVirement:"2026-02-18"},
{date:"2026-01-16",entite:"INAM",quinzaine:"Q1 JAN 2026",montantFacture:2720650,montantPaye:2718001,statut:"payé",dateVirement:"2026-04-01"},
{date:"2026-01-16",entite:"AMU",quinzaine:"Q1 JAN 2026",montantFacture:968177,montantPaye:968177,statut:"payé",dateVirement:"2026-03-12"},
{date:"2026-02-02",entite:"INAM",quinzaine:"Q2 JAN 2026",montantFacture:1547545,montantPaye:1443884,statut:"payé",dateVirement:"2026-03-25"},
{date:"2026-02-02",entite:"AMU",quinzaine:"Q2 JAN 2026",montantFacture:517887,montantPaye:517887,statut:"payé",dateVirement:"2026-04-24"},
{date:"2026-02-16",entite:"AMU",quinzaine:"Q1 FEV 2026",montantFacture:605816,montantPaye:605816,statut:"payé",dateVirement:"2026-03-23"},
{date:"2026-02-16",entite:"INAM",quinzaine:"Q1 FEV 2026",montantFacture:1979453,montantPaye:1979446,statut:"payé",dateVirement:"2026-04-22"},
{date:"2026-03-02",entite:"AMU",quinzaine:"Q2 FEV 2026",montantFacture:381834,montantPaye:381834,statut:"payé",dateVirement:"2026-04-29"},
{date:"2026-03-02",entite:"INAM",quinzaine:"Q2 FEV 2026",montantFacture:1101237,montantPaye:1101237,statut:"payé",dateVirement:"2026-05-05"},
{date:"2026-03-16",entite:"AMU",quinzaine:"Q1 MARS 2026",montantFacture:541659,montantPaye:541659,statut:"payé",dateVirement:"2026-04-16"},
{date:"2026-03-16",entite:"INAM",quinzaine:"Q1 MARS 2026",montantFacture:2193795,montantPaye:2193795,statut:"payé",dateVirement:"2026-06-17"},
{date:"2026-04-01",entite:"AMU",quinzaine:"Q2 MARS 2026",montantFacture:618178,montantPaye:618178,statut:"payé",dateVirement:"2026-04-29"},
{date:"2026-04-01",entite:"INAM",quinzaine:"Q2 MARS 2026",montantFacture:1844968,montantPaye:1827745,statut:"payé",dateVirement:"2026-06-06"},
{date:"2026-04-16",entite:"AMU",quinzaine:"Q1 AVRIL 2026",montantFacture:591619,montantPaye:591619,statut:"payé",dateVirement:"2026-05-26"},
{date:"2026-04-16",entite:"INAM",quinzaine:"Q1 AVRIL 2026",montantFacture:2062937,montantPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-05-04",entite:"AMU",quinzaine:"Q2 AVRIL 2026",montantFacture:569590,montantPaye:569590,statut:"payé",dateVirement:"2026-06-15"},
{date:"2026-05-04",entite:"INAM",quinzaine:"Q2 AVRIL 2026",montantFacture:1558412,montantPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-05-18",entite:"AMU",quinzaine:"Q1 MAI 2026",montantFacture:846367,montantPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-05-18",entite:"INAM",quinzaine:"Q1 MAI 2026",montantFacture:2240257,montantPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-06-01",entite:"AMU",quinzaine:"Q2 MAI 2026",montantFacture:627943,montantPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-06-01",entite:"INAM",quinzaine:"Q2 MAI 2026",montantFacture:2027661,montantPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-06-16",entite:"AMU",quinzaine:"Q1 JUIN 2026",montantFacture:1824989,montantPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-06-16",entite:"INAM",quinzaine:"Q1 JUIN 2026",montantFacture:801676,montantPaye:0,statut:"non payé",dateVirement:""}
];

async function importHistoricalData() {
  if (!confirm('Importer les données historiques INAM/AMU ? Si déjà lancé, cela écrasera sans dupliquer.')) return;

  const btn = document.getElementById('btn-import-historique');
  const setStatus = (txt) => { if (btn) btn.textContent = txt; };
  if (btn) btn.disabled = true;

  const pid = getPharmacieId() || 'DAFEANNE';
  const db  = getDB();
  const pharmacieRef = db.collection('pharmacies').doc(pid);

  try {
    const LIMIT = 499;
    let ok = 0;
    for (let i = 0; i < HIST_INAM_FLAT.length; i += LIMIT) {
      const chunk = HIST_INAM_FLAT.slice(i, i + LIMIT);
      const batch = db.batch();
      chunk.forEach((item, j) => {
        const docId = 'hist_inam_' + (i + j);
        const ref = pharmacieRef.collection('inam_amu').doc(docId);
        batch.set(ref, { ...item, id: docId });
      });
      await batch.commit();
      ok += chunk.length;
      setStatus('Import INAM/AMU : ' + ok + '/' + HIST_INAM_FLAT.length + '…');
    }
    const msg = 'Import terminé : ' + ok + ' enregistrements INAM/AMU importés.';
    alert(msg);
    toast(msg, 'success');
  } catch(e) {
    alert('Erreur import : ' + e.message);
    toast('Erreur : ' + e.message, 'error');
    console.error(e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📥 Importer données Excel'; }
  }
}