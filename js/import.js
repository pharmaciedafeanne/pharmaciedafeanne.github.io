// ===== IMPORT EXCEL =====
// Structure par feuille (quinzaine) :
//   Col A (0) = label bon         Col E (4) = label bon (dupliqué)
//   Col B (1) = DAFEANNE INAM     Col F (5) = DAFEANNE AMU
//   Col C (2) = DÉPÔT INAM        Col G (6) = DÉPÔT AMU
//   Col D (3) = remarque INAM     Col H (7) = remarque AMU
//
//  10 bons par lot, lot total à chaque 12ème ligne (1-based: 18, 30, 42…)
//  0-based: 17, 29, 41… (lotTotalRow = 17 + lotIndex * 12)

const MOIS = {
  'janvier':1,'février':2,'fevrier':2,'fev':2,'fév':2,
  'mars':3,'avril':4,'mai':5,'juin':6,'juillet':7,
  'août':8,'aout':8,'septembre':9,'sep':9,'sept':9,
  'octobre':10,'oct':10,'novembre':11,'nov':11,
  'décembre':12,'decembre':12,'dec':12,'déc':12,
  'jan':1
};

function parseSheetName(name) {
  name = name.trim();
  const qm = name.match(/^(Q[12])[_ ]/i);
  if (!qm) return null;
  const quinzaine = qm[1].toUpperCase();
  const rest = name.slice(qm[0].length).toLowerCase();
  const ym = rest.match(/(\d{4})/);
  if (!ym) return null;
  const year = parseInt(ym[1]);
  const monthStr = rest.replace(/\d{4}/, '').trim();
  let month = null;
  for (const [k, v] of Object.entries(MOIS)) {
    if (monthStr.startsWith(k)) { month = v; break; }
  }
  if (!month) return null;
  return { quinzaine, year, month };
}

function parseSheet(ws) {
  function num(r, c) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    if (!cell || cell.v === undefined) return 0;
    const v = Number(cell.v);
    return isNaN(v) ? 0 : v;
  }
  function str(r, c) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    return cell && cell.v !== undefined ? String(cell.v).trim() : '';
  }

  const lots = [];
  // Lots : bons aux lignes [lotStart … lotStart+9], total à lotStart+10
  // 0-based : lot1 bons = rows 7..16, total = row 17
  //           lot2 bons = rows 18..27, total = row 29  ← 18+11=29 → gap?
  // Formule Excel : SUM(B18, B30, B42…) → totaux aux lignes 18,30,42 (1-based)
  // 0-based : 17, 29, 41 → pas de 12 mais de 12 (17+12=29 ✓)

  for (let lotIdx = 0; lotIdx < 60; lotIdx++) {
    const totalRow0 = 17 + lotIdx * 12;        // ligne du total (0-based)
    const bonStart0 = totalRow0 - 10;           // première ligne de bon

    const bons = [];
    for (let i = 0; i < 10; i++) {
      const r = bonStart0 + i;
      const di = num(r, 1); // DAFEANNE INAM
      const dp = num(r, 2); // DÉPÔT INAM
      const da = num(r, 5); // DAFEANNE AMU
      const dpa= num(r, 6); // DÉPÔT AMU
      const rem = str(r, 3) || str(r, 7);

      if (di || dp || da || dpa) {
        bons.push({
          id: `bon_${Date.now()}_${lotIdx}_${i}_${Math.random().toString(36).slice(2,6)}`,
          numero: i + 1,
          label: str(r, 0) || str(r, 4) || `BON N°${i + 1}`,
          dafeanne: { inam: di, amu: da },
          depot:    { inam: dp, amu: dpa },
          remarque: rem
        });
      }
    }

    if (bons.length > 0) {
      lots.push({ numero: lots.length + 1, bons, totaux: null });
    } else {
      // 3 lots vides consécutifs → fin de données
      const next1 = 17 + (lotIdx + 1) * 12;
      const next2 = 17 + (lotIdx + 2) * 12;
      const hasMore = [next1, next2].some(tr => {
        for (let i = 0; i < 10; i++) {
          const r = tr - 10 + i;
          if (num(r,1)||num(r,2)||num(r,5)||num(r,6)) return true;
        }
        return false;
      });
      if (!hasMore) break;
    }
  }

  return lots;
}

async function importExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const results = [];

        wb.SheetNames.forEach(name => {
          if (/^feuil/i.test(name.trim()) || !name.trim()) return;
          const meta = parseSheetName(name);
          if (!meta) return;
          const lots = parseSheet(wb.Sheets[name]);
          if (lots.length > 0) {
            const period = recalcPeriod({
              ...meta,
              lots,
              sheetName: name,
              importedAt: new Date().toISOString()
            });
            results.push(period);
          }
        });

        // Tri chronologique
        results.sort((a, b) =>
          a.year !== b.year ? a.year - b.year :
          a.month !== b.month ? a.month - b.month :
          a.quinzaine === 'Q1' ? -1 : 1
        );

        resolve(results);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
