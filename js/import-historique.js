// ===== IMPORT DONNÉES HISTORIQUES EXCEL =====
// Appeler importHistoricalData() une fois depuis la console ou le bouton d'import

const HIST_INAM = [
{date:"2025-06-16",entite:"INAM",quinzaine:"Q1 JUIN 2025",inamTotal:130431,amuTotal:0,inamPaye:130429,amuPaye:0,statut:"payé",dateVirement:"2025-07-15"},
{date:"2025-06-16",entite:"AMU",quinzaine:"Q1 JUIN 2025",inamTotal:0,amuTotal:39613,inamPaye:0,amuPaye:39613,statut:"payé",dateVirement:"2025-07-30"},
{date:"2025-07-01",entite:"INAM",quinzaine:"Q2 JUIN 2025",inamTotal:589449,amuTotal:0,inamPaye:584867,amuPaye:0,statut:"payé",dateVirement:"2025-08-27"},
{date:"2025-07-01",entite:"AMU",quinzaine:"Q2 JUIN 2025",inamTotal:0,amuTotal:68674,inamPaye:0,amuPaye:68674,statut:"payé",dateVirement:"2025-08-04"},
{date:"2025-07-16",entite:"INAM",quinzaine:"Q1 JUILLET 2025",inamTotal:679489,amuTotal:0,inamPaye:679489,amuPaye:0,statut:"payé",dateVirement:"2025-08-22"},
{date:"2025-07-16",entite:"AMU",quinzaine:"Q1 JUILLET 2025",inamTotal:0,amuTotal:212910,inamPaye:0,amuPaye:212910,statut:"payé",dateVirement:"2025-10-01"},
{date:"2025-08-01",entite:"INAM",quinzaine:"Q2 JUILLET 2025",inamTotal:2109840,amuTotal:0,inamPaye:2105394,amuPaye:0,statut:"payé",dateVirement:"2025-10-09"},
{date:"2025-08-01",entite:"AMU",quinzaine:"Q2 JUILLET 2025",inamTotal:0,amuTotal:393585,inamPaye:0,amuPaye:393585,statut:"payé",dateVirement:"2025-10-01"},
{date:"2025-08-18",entite:"INAM",quinzaine:"Q1 AOUT 2025",inamTotal:1388175,amuTotal:0,inamPaye:1388175,amuPaye:0,statut:"payé",dateVirement:"2025-09-19"},
{date:"2025-08-18",entite:"AMU",quinzaine:"Q1 AOUT 2025",inamTotal:0,amuTotal:310537,inamPaye:0,amuPaye:310537,statut:"payé",dateVirement:"2025-09-22"},
{date:"2025-09-01",entite:"INAM",quinzaine:"Q2 AOUT 2025",inamTotal:1599981,amuTotal:0,inamPaye:1594509,amuPaye:0,statut:"payé",dateVirement:"2025-10-01"},
{date:"2025-09-01",entite:"AMU",quinzaine:"Q2 AOUT 2025",inamTotal:0,amuTotal:382795,inamPaye:0,amuPaye:382795,statut:"payé",dateVirement:"2025-10-01"},
{date:"2025-09-16",entite:"INAM",quinzaine:"Q1 SEPT 2025",inamTotal:896672,amuTotal:0,inamPaye:896672,amuPaye:0,statut:"payé",dateVirement:"2025-10-16"},
{date:"2025-09-16",entite:"AMU",quinzaine:"Q1 SEPT 2025",inamTotal:0,amuTotal:342148,inamPaye:0,amuPaye:342148,statut:"payé",dateVirement:"2025-10-16"},
{date:"2025-10-01",entite:"INAM",quinzaine:"Q2 SEPT 2025",inamTotal:2714205,amuTotal:0,inamPaye:2714099,amuPaye:0,statut:"payé",dateVirement:"2025-11-10"},
{date:"2025-10-01",entite:"AMU",quinzaine:"Q2 SEPT 2025",inamTotal:0,amuTotal:533959,inamPaye:0,amuPaye:529551,statut:"payé",dateVirement:"2025-11-06"},
{date:"2025-10-16",entite:"AMU",quinzaine:"Q1 OCT 2025",inamTotal:0,amuTotal:868511,inamPaye:0,amuPaye:868511,statut:"payé",dateVirement:"2025-11-21"},
{date:"2025-10-17",entite:"INAM",quinzaine:"Q1 OCT 2025",inamTotal:4507716,amuTotal:0,inamPaye:4241789,amuPaye:0,statut:"payé",dateVirement:"2025-12-11"},
{date:"2025-11-03",entite:"AMU",quinzaine:"Q2 OCT 2025",inamTotal:0,amuTotal:522045,inamPaye:0,amuPaye:522045,statut:"payé",dateVirement:"18122025"},
{date:"2025-11-03",entite:"INAM",quinzaine:"Q2 OCT 2025",inamTotal:2567831,amuTotal:0,inamPaye:2341441,amuPaye:0,statut:"payé",dateVirement:"2026-02-10"},
{date:"2025-11-17",entite:"INAM",quinzaine:"Q1 NOV 2025",inamTotal:1756369,amuTotal:0,inamPaye:1642856,amuPaye:0,statut:"payé",dateVirement:"2025-12-22"},
{date:"2025-11-17",entite:"AMU",quinzaine:"Q1 NOV 2025",inamTotal:0,amuTotal:509099,inamPaye:0,amuPaye:509099,statut:"payé",dateVirement:"2025-12-12"},
{date:"2025-12-01",entite:"INAM",quinzaine:"Q2 NOV 2025",inamTotal:2218055,amuTotal:0,inamPaye:2218044,amuPaye:0,statut:"payé",dateVirement:"2026-01-20"},
{date:"2025-12-01",entite:"AMU",quinzaine:"Q2 NOV 2025",inamTotal:0,amuTotal:395124,inamPaye:0,amuPaye:395124,statut:"payé",dateVirement:"2025-12-24"},
{date:"2025-12-16",entite:"INAM",quinzaine:"Q1 DEC 2025",inamTotal:2385806,amuTotal:0,inamPaye:2385797,amuPaye:0,statut:"payé",dateVirement:"2026-02-05"},
{date:"2025-12-16",entite:"AMU",quinzaine:"Q1 DEC 2025",inamTotal:0,amuTotal:725157,inamPaye:0,amuPaye:706869,statut:"payé",dateVirement:"2026-01-28"},
{date:"2026-01-05",entite:"INAM",quinzaine:"Q2 DEC 2025",inamTotal:2126035,amuTotal:0,inamPaye:2070227,amuPaye:0,statut:"payé",dateVirement:"2026-02-18"},
{date:"2026-01-05",entite:"AMU",quinzaine:"Q2 DEC 2025",inamTotal:0,amuTotal:582796,inamPaye:0,amuPaye:582796,statut:"payé",dateVirement:"2026-02-18"},
{date:"2026-01-16",entite:"INAM",quinzaine:"Q1 JAN 2026",inamTotal:2720650,amuTotal:0,inamPaye:2718001,amuPaye:0,statut:"payé",dateVirement:"2026-04-01"},
{date:"2026-01-16",entite:"AMU",quinzaine:"Q1 JAN 2026",inamTotal:0,amuTotal:968177,inamPaye:0,amuPaye:968177,statut:"payé",dateVirement:"2026-03-12"},
{date:"2026-02-02",entite:"INAM",quinzaine:"Q2 JAN 2026",inamTotal:1547545,amuTotal:0,inamPaye:1443884,amuPaye:0,statut:"payé",dateVirement:"2026-03-25"},
{date:"2026-02-02",entite:"AMU",quinzaine:"Q2 JAN 2026",inamTotal:0,amuTotal:517887,inamPaye:0,amuPaye:517887,statut:"payé",dateVirement:"2026-04-24"},
{date:"2026-02-16",entite:"AMU",quinzaine:"Q1 FEV 2026",inamTotal:0,amuTotal:605816,inamPaye:0,amuPaye:605816,statut:"payé",dateVirement:"2026-03-23"},
{date:"2026-02-16",entite:"INAM",quinzaine:"Q1 FEV 2026",inamTotal:1979453,amuTotal:0,inamPaye:1979446,amuPaye:0,statut:"payé",dateVirement:"2026-04-22"},
{date:"2026-03-02",entite:"AMU",quinzaine:"Q2 FEV 2026",inamTotal:0,amuTotal:381834,inamPaye:0,amuPaye:381834,statut:"payé",dateVirement:"2026-04-29"},
{date:"2026-03-02",entite:"INAM",quinzaine:"Q2 FEV 2026",inamTotal:1101237,amuTotal:0,inamPaye:1101237,amuPaye:0,statut:"payé",dateVirement:"2026-05-05"},
{date:"2026-03-16",entite:"AMU",quinzaine:"Q1 MARS 2026",inamTotal:0,amuTotal:541659,inamPaye:0,amuPaye:541659,statut:"payé",dateVirement:"2026-04-16"},
{date:"2026-03-16",entite:"INAM",quinzaine:"Q1 MARS 2026",inamTotal:2193795,amuTotal:0,inamPaye:2193795,amuPaye:0,statut:"payé",dateVirement:"2026-06-17"},
{date:"2026-04-01",entite:"AMU",quinzaine:"Q2 MARS 2026",inamTotal:0,amuTotal:618178,inamPaye:0,amuPaye:618178,statut:"payé",dateVirement:"2026-04-29"},
{date:"2026-04-01",entite:"INAM",quinzaine:"Q2 MARS 2026",inamTotal:1844968,amuTotal:0,inamPaye:1827745,amuPaye:0,statut:"payé",dateVirement:"2026-06-06"},
{date:"2026-04-16",entite:"AMU",quinzaine:"Q1 Avril 2026",inamTotal:0,amuTotal:591619,inamPaye:0,amuPaye:591619,statut:"payé",dateVirement:"2026-05-26"},
{date:"2026-04-16",entite:"INAM",quinzaine:"Q1 Avril 2026",inamTotal:2062937,amuTotal:0,inamPaye:0,amuPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-05-04",entite:"AMU",quinzaine:"Q2 Avril 2026",inamTotal:0,amuTotal:569590,inamPaye:0,amuPaye:569590,statut:"payé",dateVirement:"2026-06-15"},
{date:"2026-05-04",entite:"INAM",quinzaine:"Q2 Avril 2026",inamTotal:1558412,amuTotal:0,inamPaye:0,amuPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-05-18",entite:"AMU",quinzaine:"Q1 MAI 2026",inamTotal:0,amuTotal:846367,inamPaye:0,amuPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-05-18",entite:"INAM",quinzaine:"Q1 MAI 2026",inamTotal:2240257,amuTotal:0,inamPaye:0,amuPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-06-01",entite:"AMU",quinzaine:"Q2 MAI 2026",inamTotal:0,amuTotal:627943,inamPaye:0,amuPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-06-01",entite:"INAM",quinzaine:"Q2 MAI 2026",inamTotal:2027661,amuTotal:0,inamPaye:0,amuPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-06-16",entite:"AMU",quinzaine:"Q1 JUIN 2026",inamTotal:0,amuTotal:1824989,inamPaye:0,amuPaye:0,statut:"non payé",dateVirement:""},
{date:"2026-06-16",entite:"INAM",quinzaine:"Q1 JUIN 2026",inamTotal:801676,amuTotal:0,inamPaye:0,amuPaye:0,statut:"non payé",dateVirement:""}
];

// ── Remapping HIST_INAM vers le nouveau modèle (montantFacture / montantPaye)
// Les anciens champs inamTotal/amuTotal/inamPaye/amuPaye sont convertis ici.
const HIST_INAM_FLAT = HIST_INAM.map(r => ({
  date:           r.date,
  entite:         r.entite,
  quinzaine:      r.quinzaine,
  montantFacture: r.entite === 'INAM' ? (r.inamTotal||0) : (r.amuTotal||0),
  montantPaye:    r.entite === 'INAM' ? (r.inamPaye||0)  : (r.amuPaye||0),
  statut:         r.statut,
  dateVirement:   r.dateVirement || ''
}));

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