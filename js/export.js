// ===== EXPORT PDF & EXCEL =====

const MOIS_NOMS = ['','Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const C_PRIMARY  = [26,  58, 107];
const C_ACCENT   = [0,  180, 216];
const C_SUCCESS  = [46, 204, 113];
const C_DAFEANNE = [42,  82, 152];
const C_DEPOT    = [0,  150, 199];
const C_WHITE    = [255,255,255];
const C_LIGHT    = [240,244,248];
const C_GRAY     = [113,128,150];

function fmtF(v) {
  const n = Number(v || 0);
  return n === 0 ? '—' : n.toLocaleString('fr-FR') + ' F';
}
function periodLabel(p) {
  return `${p.quinzaine === 'Q1' ? '1ère' : '2ème'} Quinzaine — ${MOIS_NOMS[p.month]} ${p.year}`;
}
function t(p, path) {
  const keys = path.split('.');
  let v = p.totaux;
  for (const k of keys) { if (!v) return 0; v = v[k]; }
  return v || 0;
}

// ══════════════════════════════════════════════════════════════
//  PDF EXPORT
// ══════════════════════════════════════════════════════════════

async function exportPDF(periods, filename, reportTitle) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  // A4 landscape : 297 × 210 mm
  const W = 297, H = 210, ML = 10, MR = 10, MT = 38;

  function pageHeader() {
    doc.setFillColor(...C_PRIMARY);
    doc.rect(0, 0, W, 28, 'F');
    doc.setFillColor(...C_ACCENT);
    doc.rect(0, 25, W, 3, 'F');
    // Logo
    doc.setFillColor(...C_ACCENT);
    doc.roundedRect(10, 6, 16, 16, 2, 2, 'F');
    doc.setTextColor(...C_WHITE);
    doc.setFontSize(11); doc.setFont('helvetica','bold');
    doc.text('SI', 18, 17, {align:'center'});
    // Titre
    doc.setFontSize(13); doc.setFont('helvetica','bold');
    doc.text('PHARMACIE DAFEANNE — PHARMACIE', 32, 13);
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text(reportTitle, 32, 20);
    // Date
    doc.setFontSize(8);
    doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`, W-MR, 13, {align:'right'});
    doc.setTextColor(0,0,0);
  }

  function pageFooter(pageNum, totalPages) {
    doc.setFillColor(...C_LIGHT);
    doc.rect(0, H-8, W, 8, 'F');
    doc.setFontSize(7); doc.setTextColor(...C_PRIMARY);
    doc.text('PHARMACIE DAFEANNE — Document confidentiel', ML, H-2.5);
    doc.text(`Page ${pageNum} / ${totalPages}`, W/2, H-2.5, {align:'center'});
    doc.text(reportTitle, W-MR, H-2.5, {align:'right'});
    doc.setTextColor(0,0,0);
  }

  let isFirstPage = true;

  function newPage() {
    if (isFirstPage) { isFirstPage = false; }
    else { doc.addPage(); }
    pageHeader();
  }

  function checkY(y, needed) {
    if (y + needed > H - 12) { newPage(); return MT; }
    return y;
  }

  newPage();

  for (const period of periods) {
    let y = MT;

    // ── En-tête période ──
    doc.setFillColor(...C_PRIMARY);
    doc.roundedRect(ML, y, W-ML-MR, 10, 2, 2, 'F');
    doc.setTextColor(...C_WHITE);
    doc.setFontSize(11); doc.setFont('helvetica','bold');
    doc.text(periodLabel(period), W/2, y+7, {align:'center'});
    doc.setTextColor(0,0,0);
    y += 14;

    // ── Deux colonnes : DAFEANNE | DÉPÔT ──
    const colW = (W - ML - MR - 6) / 2;

    // Carte DAFEANNE
    doc.setFillColor(...C_DAFEANNE);
    doc.roundedRect(ML, y, colW, 8, 2, 2, 'F');
    doc.setTextColor(...C_WHITE);
    doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.text('💊  DAFEANNE', ML + colW/2, y+5.5, {align:'center'});

    // Carte DÉPÔT
    doc.setFillColor(...C_DEPOT);
    doc.roundedRect(ML + colW + 6, y, colW, 8, 2, 2, 'F');
    doc.text('🏪  DÉPÔT', ML + colW + 6 + colW/2, y+5.5, {align:'center'});
    doc.setTextColor(0,0,0);
    y += 10;

    // Stats des deux comptes
    const dStats = [
      ['INAM',  fmtF(t(period,'dafeanne.inam'))],
      ['AMU',   fmtF(t(period,'dafeanne.amu'))],
      ['TOTAL', fmtF(t(period,'dafeanne.total'))]
    ];
    const pStats = [
      ['INAM',  fmtF(t(period,'depot.inam'))],
      ['AMU',   fmtF(t(period,'depot.amu'))],
      ['TOTAL', fmtF(t(period,'depot.total'))]
    ];

    const rowH = 8;
    dStats.forEach(([lbl, val], i) => {
      const ry = y + i * rowH;
      const isTot = i === 2;
      doc.setFillColor(isTot ? C_DAFEANNE[0] : 248, isTot ? C_DAFEANNE[1] : 250, isTot ? C_DAFEANNE[2] : 252);
      doc.rect(ML, ry, colW, rowH, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', isTot ? 'bold' : 'normal');
      doc.setTextColor(isTot ? 255 : 42, isTot ? 255 : 82, isTot ? 255 : 152);
      doc.text(lbl, ML + 4, ry + 5.5);
      doc.text(val, ML + colW - 4, ry + 5.5, {align:'right'});

      doc.setFillColor(isTot ? C_DEPOT[0] : 248, isTot ? C_DEPOT[1] : 250, isTot ? C_DEPOT[2] : 252);
      doc.rect(ML + colW + 6, ry, colW, rowH, 'F');
      doc.setTextColor(isTot ? 255 : 0, isTot ? 255 : 150, isTot ? 255 : 199);
      doc.text(pStats[i][0], ML + colW + 10, ry + 5.5);
      doc.text(pStats[i][1], ML + colW + 6 + colW - 4, ry + 5.5, {align:'right'});
    });
    doc.setTextColor(0,0,0);
    y += dStats.length * rowH + 4;

    // Ligne de synthèse finale
    doc.setFillColor(...C_LIGHT);
    doc.rect(ML, y, W-ML-MR, 10, 'F');
    doc.setFontSize(8); doc.setFont('helvetica','bold');
    doc.setTextColor(...C_PRIMARY);
    doc.text(`TOTAL INAM : ${fmtF(t(period,'inam'))}`, ML + 6, y + 6.5);
    doc.text(`TOTAL AMU : ${fmtF(t(period,'amu'))}`, ML + (W-ML-MR)/3 + 6, y + 6.5);
    doc.setFontSize(10); doc.setTextColor(...C_SUCCESS);
    doc.text(`FACTURE QUINZAINE : ${fmtF(t(period,'global'))}`, W - MR - 6, y + 6.5, {align:'right'});
    doc.setTextColor(0,0,0);
    y += 14;

    // ── Tableau détaillé par lot ──
    y = checkY(y, 30);
    const head = [['LOT','BON',
      'DAFEANNE INAM','DAFEANNE AMU','TOTAL DAFEANNE',
      'DÉPÔT INAM','DÉPÔT AMU','TOTAL DÉPÔT',
      'TOTAL BON','OBSERVATION']];

    const body = [];
    (period.lots || []).forEach(lot => {
      (lot.bons || []).forEach(bon => {
        const df_i = (bon.dafeanne && bon.dafeanne.inam) || 0;
        const df_a = (bon.dafeanne && bon.dafeanne.amu)  || 0;
        const dp_i = (bon.depot    && bon.depot.inam)    || 0;
        const dp_a = (bon.depot    && bon.depot.amu)     || 0;
        body.push([
          `L${lot.numero}`, bon.label || `BON N°${bon.numero}`,
          fmtF(df_i), fmtF(df_a), fmtF(df_i + df_a),
          fmtF(dp_i), fmtF(dp_a), fmtF(dp_i + dp_a),
          fmtF(df_i + df_a + dp_i + dp_a),
          (bon.remarque || '').substring(0, 35)
        ]);
      });
      // Ligne total lot
      const lt = lot.totaux || {};
      const ltdi = (lt.dafeanne && lt.dafeanne.inam)||0, ltda = (lt.dafeanne && lt.dafeanne.amu)||0;
      const ltpi = (lt.depot    && lt.depot.inam)   ||0, ltpa = (lt.depot    && lt.depot.amu)  ||0;
      body.push([
        { content: `TOTAL LOT ${lot.numero}`, styles:{fontStyle:'bold', fillColor:C_LIGHT, textColor:C_PRIMARY} },
        { content: '', styles:{fillColor:C_LIGHT} },
        { content: fmtF(ltdi), styles:{fontStyle:'bold', fillColor:C_LIGHT, textColor:C_DAFEANNE} },
        { content: fmtF(ltda), styles:{fontStyle:'bold', fillColor:C_LIGHT, textColor:C_DAFEANNE} },
        { content: fmtF(ltdi+ltda), styles:{fontStyle:'bold', fillColor:C_LIGHT, textColor:C_DAFEANNE} },
        { content: fmtF(ltpi), styles:{fontStyle:'bold', fillColor:C_LIGHT, textColor:C_DEPOT} },
        { content: fmtF(ltpa), styles:{fontStyle:'bold', fillColor:C_LIGHT, textColor:C_DEPOT} },
        { content: fmtF(ltpi+ltpa), styles:{fontStyle:'bold', fillColor:C_LIGHT, textColor:C_DEPOT} },
        { content: fmtF(ltdi+ltda+ltpi+ltpa), styles:{fontStyle:'bold', fillColor:C_LIGHT, textColor:C_SUCCESS} },
        { content: '', styles:{fillColor:C_LIGHT} }
      ]);
    });

    doc.autoTable({
      head, body, startY: y,
      margin: {left: ML, right: MR},
      styles: {fontSize: 6.5, cellPadding: 1.5, overflow:'ellipsize'},
      headStyles: {fillColor:C_PRIMARY, textColor:C_WHITE, fontStyle:'bold', fontSize:7},
      alternateRowStyles: {fillColor:[250,252,255]},
      columnStyles: {
        0:{cellWidth:12}, 1:{cellWidth:20},
        2:{textColor:C_DAFEANNE}, 3:{textColor:C_DAFEANNE}, 4:{textColor:C_DAFEANNE,fontStyle:'bold'},
        5:{textColor:C_DEPOT},    6:{textColor:C_DEPOT},    7:{textColor:C_DEPOT,fontStyle:'bold'},
        8:{textColor:C_SUCCESS, fontStyle:'bold'},
        9:{cellWidth:35}
      },
      didAddPage: () => { pageHeader(); }
    });
    y = doc.lastAutoTable.finalY + 14;

    if (periods.indexOf(period) < periods.length - 1) {
      doc.addPage();
      newPage();
    }
  }

  // Numérotation des pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    pageFooter(i, totalPages);
  }

  doc.save(filename);
}

// ══════════════════════════════════════════════════════════════
//  EXCEL EXPORT
// ══════════════════════════════════════════════════════════════

function exportExcel(periods, filename) {
  const wb = XLSX.utils.book_new();

  // ── Feuille récapitulative ──
  const recap = [
    ['PHARMACIE DAFEANNE — RÉCAPITULATIF GÉNÉRAL'],
    [`Généré le ${new Date().toLocaleDateString('fr-FR')}`],
    [],
    ['PÉRIODE','QUINT.','DAFEANNE INAM','DAFEANNE AMU','TOTAL DAFEANNE',
     'DÉPÔT INAM','DÉPÔT AMU','TOTAL DÉPÔT','TOTAL INAM','TOTAL AMU','FACTURE FINALE']
  ];
  periods.forEach(p => {
    recap.push([
      `${MOIS_NOMS[p.month]} ${p.year}`, p.quinzaine,
      t(p,'dafeanne.inam'), t(p,'dafeanne.amu'), t(p,'dafeanne.total'),
      t(p,'depot.inam'),    t(p,'depot.amu'),    t(p,'depot.total'),
      t(p,'inam'), t(p,'amu'), t(p,'global')
    ]);
  });
  recap.push([
    'TOTAL GÉNÉRAL', '',
    periods.reduce((s,p)=>s+t(p,'dafeanne.inam'),0),
    periods.reduce((s,p)=>s+t(p,'dafeanne.amu'),0),
    periods.reduce((s,p)=>s+t(p,'dafeanne.total'),0),
    periods.reduce((s,p)=>s+t(p,'depot.inam'),0),
    periods.reduce((s,p)=>s+t(p,'depot.amu'),0),
    periods.reduce((s,p)=>s+t(p,'depot.total'),0),
    periods.reduce((s,p)=>s+t(p,'inam'),0),
    periods.reduce((s,p)=>s+t(p,'amu'),0),
    periods.reduce((s,p)=>s+t(p,'global'),0),
  ]);
  const wsRecap = XLSX.utils.aoa_to_sheet(recap);
  wsRecap['!cols'] = [18,8,16,16,16,16,16,16,16,16,16].map(w=>({wch:w}));
  XLSX.utils.book_append_sheet(wb, wsRecap, 'RÉCAPITULATIF');

  // ── Une feuille par quinzaine ──
  periods.forEach(period => {
    const title = `${period.quinzaine}_${MOIS_NOMS[period.month].slice(0,4)}_${period.year}`;
    const rows = [
      [`PHARMACIE DAFEANNE — ${periodLabel(period)}`],
      [],
      ['','DAFEANNE','','','DÉPÔT','','','',''],
      ['LOT','BON','DAFEANNE INAM','DAFEANNE AMU','TOTAL DAFEANNE','DÉPÔT INAM','DÉPÔT AMU','TOTAL DÉPÔT','TOTAL BON','OBSERVATION']
    ];

    (period.lots || []).forEach(lot => {
      (lot.bons || []).forEach(bon => {
        const di=(bon.dafeanne&&bon.dafeanne.inam)||0, da=(bon.dafeanne&&bon.dafeanne.amu)||0;
        const pi=(bon.depot&&bon.depot.inam)||0,       pa=(bon.depot&&bon.depot.amu)||0;
        rows.push([`LOT N°${lot.numero}`, bon.label||`BON N°${bon.numero}`,
          di, da, di+da, pi, pa, pi+pa, di+da+pi+pa, bon.remarque||'']);
      });
      const lt = lot.totaux||{};
      const ltdi=(lt.dafeanne&&lt.dafeanne.inam)||0, ltda=(lt.dafeanne&&lt.dafeanne.amu)||0;
      const ltpi=(lt.depot&&lt.depot.inam)||0,       ltpa=(lt.depot&&lt.depot.amu)||0;
      rows.push([`TOTAL LOT ${lot.numero}`,'',ltdi,ltda,ltdi+ltda,ltpi,ltpa,ltpi+ltpa,ltdi+ltda+ltpi+ltpa,'']);
      rows.push([]);
    });

    rows.push(['TOTAL QUINZAINE','',
      t(period,'dafeanne.inam'), t(period,'dafeanne.amu'), t(period,'dafeanne.total'),
      t(period,'depot.inam'),    t(period,'depot.amu'),    t(period,'depot.total'),
      t(period,'inam')+t(period,'amu'), ''
    ]);
    rows.push(['FACTURE FINALE','','','','','','','',t(period,'global'),'']);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [18,14,15,15,15,15,15,15,15,35].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0,31));
  });

  XLSX.writeFile(wb, filename);
}
