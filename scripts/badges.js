  // ---------- Badges ----------
  const K_BADGES = 'parcours.badges';
  function badgeStats() {
    const hist = store.get(K_HIST, []), wlog = store.get(K_WLOG, []), meals = store.get(K_MEALS, []), W = store.get('parcours.weights', []);
    const st = goalStats(), km = hist.reduce((a, h) => a + (h.distanceM || 0), 0) / 1000;
    const months = {}; hist.forEach(h => { const d = new Date(h.date), k = d.getFullYear() + '-' + d.getMonth(); months[k] = (months[k] || 0) + (h.distanceM || 0) / 1000; });
    const walkLong = hist.filter(h => h.activity !== 'velo').reduce((a, h) => Math.max(a, (h.distanceM || 0) / 1000), 0);
    // meilleure série de jours d'affilée (sorties + séances)
    const days = [...new Set(hist.map(h => dayKey(h.date)).concat(wlog.map(l => dayKey(l.date))))].sort();
    let best = 0, cur = 0, prev = null;
    days.forEach(k => { const t = new Date(k + 'T12:00').getTime(); cur = prev != null && Math.round((t - prev) / 864e5) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = t; });
    return {
      sorties: hist.length, km, monthKm: Math.max(0, ...Object.values(months)), longest: walkLong, streak: Math.max(best, st.streak),
      muscu: wlog.filter(l => l.kind === 'muscu').length, guided: wlog.filter(l => !l.kind).length, navette: wlog.filter(l => l.kind === 'navette').length,
      mealDays: new Set(meals.map(m => dayKey(m.date))).size, weighs: W.length,
      early: hist.some(h => new Date(h.date).getHours() < 7), night: hist.some(h => new Date(h.date).getHours() >= 21),
      lost: W.length >= 2 ? W[0].kg - W[W.length - 1].kg : 0
    };
  }
  const BADGES = [
    ['first', '👟', 'Premier pas', 'Ta première sortie', s => s.sorties, 1],
    ['streak3', '🔥', 'Lancé', '3 jours d\'affilée', s => s.streak, 3],
    ['streak7', '🔥', 'Semaine parfaite', '7 jours d\'affilée', s => s.streak, 7],
    ['streak30', '🌋', 'Inarrêtable', '30 jours d\'affilée', s => s.streak, 30],
    ['km10', '🥉', '10 km', '10 km au total', s => s.km, 10],
    ['km100', '🥈', '100 km', '100 km au total', s => s.km, 100],
    ['km500', '🥇', '500 km', '500 km au total', s => s.km, 500],
    ['month100', '📅', 'Mois de feu', '100 km dans le même mois', s => s.monthKm, 100],
    ['long10', '🏞', 'Longue route', 'Une sortie à pied de 10 km', s => s.longest, 10],
    ['half', '🏅', 'Semi', 'Une sortie à pied de 21 km', s => s.longest, 21.1],
    ['muscu1', '💪', 'Première séance', '1 séance de muscu', s => s.muscu, 1],
    ['muscu10', '🏋️', 'Habitué de la salle', '10 séances de muscu', s => s.muscu, 10],
    ['muscu50', '🦍', 'Machine', '50 séances de muscu', s => s.muscu, 50],
    ['guided10', '⏱', 'Discipliné', '10 séances guidées', s => s.guided, 10],
    ['navette', '↔️', 'Testé', 'Faire le test navette', s => s.navette, 1],
    ['meals7', '🍽', 'Bien noté', 'Repas notés 7 jours différents', s => s.mealDays, 7],
    ['meals30', '📒', 'Carnet complet', 'Repas notés 30 jours différents', s => s.mealDays, 30],
    ['weigh4', '⚖️', 'Suivi sérieux', '4 pesées notées', s => s.weighs, 4],
    ['lost2', '📉', '−2 kg', 'Perdre 2 kg depuis ta première pesée', s => s.lost, 2],
    ['early', '🌅', 'Lève-tôt', 'Une sortie avant 7 h', s => s.early ? 1 : 0, 1],
    ['night', '🌙', 'Oiseau de nuit', 'Une sortie après 21 h', s => s.night ? 1 : 0, 1]
  ];
  function badgesCheck() { // retourne la liste des badges gagnés ; annonce les nouveaux
    let s; try { s = badgeStats(); } catch (e) { return store.get(K_BADGES, {}); }
    const got = store.get(K_BADGES, {}), fresh = [];
    BADGES.forEach(([id, , t, , f, n]) => { if (!got[id] && f(s) >= n) { got[id] = Date.now(); fresh.push(t); } });
    if (fresh.length) {
      store.set(K_BADGES, got);
      const first = Object.keys(got).length === fresh.length && fresh.length > 2; // premier calcul avec des données anciennes : un seul message
      toast(first ? '🏅 ' + fresh.length + ' badges débloqués ! Va voir dans Progrès.' : '🏅 Nouveau badge : ' + fresh.join(', ') + ' !');
    }
    return got;
  }
  function badgesHtml() {
    const got = badgesCheck(); let s; try { s = badgeStats(); } catch (e) { s = {}; }
    const n = BADGES.filter(b => got[b[0]]).length;
    return '<div class="block"><div class="bh">Mes badges <small class="bcount">' + n + ' / ' + BADGES.length + '</small></div><div class="bgrid">' + BADGES.map(([id, ic, t, d, f, goal]) => {
      const on = !!got[id], v = Math.min(goal, f(s) || 0), p = Math.round(v / goal * 100);
      return '<div class="badge' + (on ? ' on' : '') + '" title="' + esc(d) + '"><span class="bic">' + ic + '</span><b>' + esc(t) + '</b><small>' + esc(d) + '</small>' +
        (on ? '<i class="bdate">' + new Date(got[id]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + '</i>' : '<i class="bbar"><u style="width:' + p + '%"></u></i>') + '</div>';
    }).join('') + '</div></div>';
  }

  // ---------- Bilan du dimanche soir (notification) ----------
  function weekSummaryText() {
    const ws = weekStart(Date.now()), hist = store.get(K_HIST, []).filter(h => h.date >= ws), wlog = store.get(K_WLOG, []).filter(l => l.date >= ws);
    const km = hist.reduce((a, h) => a + (h.distanceM || 0), 0) / 1000, kcal = hist.reduce((a, h) => a + (h.kcal || 0), 0) + wlog.reduce((a, l) => a + (l.kcal || 0), 0);
    const muscu = wlog.filter(l => l.kind === 'muscu').length, W = store.get('parcours.weights', []).filter(w => w.t >= ws - 7 * 864e5);
    const parts = [hist.length + ' sortie' + (hist.length > 1 ? 's' : '') + ' (' + nf1.format(km) + ' km)', wlog.length + ' séance' + (wlog.length > 1 ? 's' : '') + (muscu ? ' dont ' + muscu + ' de muscu' : ''), nf0.format(Math.round(kcal)) + ' kcal dépensées'];
    if (W.length >= 2) { const d = W[W.length - 1].kg - W[0].kg; parts.push('poids ' + (d > 0 ? '+' : d < 0 ? '−' : '') + nf1.format(Math.abs(d)) + ' kg'); }
    const st = goalStats(); if (st.streak >= 2) parts.push(st.streak + ' jours d\'affilée');
    return 'Ta semaine : ' + parts.join(', ') + '. ' + (hist.length + wlog.length ? 'Bravo, continue comme ça !' : 'Nouvelle semaine demain : on s\'y remet ?');
  }
  window.__weekSummary = weekSummaryText;
