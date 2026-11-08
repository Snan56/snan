# Ajoute les badges et le bilan du dimanche à web/index.html
import sys
p = sys.argv[1] if len(sys.argv) > 1 else 'web/index.html'
s = open(p).read()
if 'K_BADGES' in s: print('déjà appliqué'); sys.exit(0)
js = open(sys.argv[2] if len(sys.argv) > 2 else 'scripts/badges.js').read()
def rep(a, b):
    global s
    assert a in s, 'introuvable : ' + a[:70]
    s = s.replace(a, b, 1)
rep("  // ---------- Navigation en cube 3D ----------", js + "\n  // ---------- Navigation en cube 3D ----------")
rep("    let html = weightHtml() + goalsHtml();", "    let html = weightHtml() + badgesHtml() + goalsHtml();")
rep("  // ---------- Navigation en cube 3D ----------", "  window.__badgeTick = () => { clearTimeout(window.__badgeT); window.__badgeT = setTimeout(() => { try { badgesCheck(); remindersApply(false); } catch (e) {} }, 400); };\n  // ---------- Navigation en cube 3D ----------")
rep("    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },",
    "    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return false; } try { if (/history|workoutlog|meals|weights/.test(k) && window.__badgeTick) window.__badgeTick(); } catch (e) {} return true; },")
rep("const LN = plugin('LocalNotifications'), any = settings.remWalk || settings.remMeals || settings.remWeigh;",
    "const LN = plugin('LocalNotifications'), any = settings.remWalk || settings.remMeals || settings.remWeigh || settings.remWeek;")
rep("await LN.cancel({ notifications: [1, 2, 3, 4].map(id => ({ id })) });", "await LN.cancel({ notifications: [1, 2, 3, 4, 5].map(id => ({ id })) });")
rep("      if (N.length) await LN.schedule({ notifications: N });",
    "      if (settings.remWeek) N.push({ id: 5, title: 'Parcours · ton bilan de la semaine', body: weekSummaryText(), schedule: { on: { weekday: 1, hour: 20, minute: 0 }, repeats: true } });\n      if (N.length) await LN.schedule({ notifications: N });")
rep("[['remWalk', 'remWalk'], ['remMeals', 'remMeals'], ['remWeigh', 'remWeigh']]", "[['remWalk', 'remWalk'], ['remMeals', 'remMeals'], ['remWeigh', 'remWeigh'], ['remWeek', 'remWeek']]")
i = s.index('<div class="row"><label for="remWeigh">')
s = s[:i] + '<div class="row"><label for="remWeek">Bilan de la semaine<small>Le dimanche à 20 h : tes sorties, séances, calories et ton poids de la semaine</small></label><span class="switch"><input id="remWeek" type="checkbox" role="switch"><span></span></span></div>\n      ' + s[i:]
s = s.replace("const n = ['remWalk', 'remMeals', 'remWeigh'].filter(", "const n = ['remWalk', 'remMeals', 'remWeigh', 'remWeek'].filter(", 1)
css = """  .bcount{font-size:13px;color:var(--gris);font-weight:600;letter-spacing:0;text-transform:none;margin-left:6px}
  .bgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
  .badge{display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:10px 6px;border-radius:14px;background:var(--nuit-3);opacity:.55}
  .badge.on{opacity:1;background:linear-gradient(160deg,rgba(255,122,47,.25),rgba(255,74,31,.08));box-shadow:inset 0 0 0 1px rgba(255,90,31,.45)}
  .bic{font-size:28px;filter:grayscale(1)}.badge.on .bic{filter:none}
  .badge b{font-size:12px;line-height:1.2}.badge small{font-size:10px;color:var(--gris);line-height:1.2}
  .bdate{font-style:normal;font-size:10px;color:var(--rouge);font-weight:700;margin-top:2px}
  .bbar{display:block;width:80%;height:4px;border-radius:2px;background:rgba(255,255,255,.1);margin-top:4px;overflow:hidden}.bbar u{display:block;height:100%;background:var(--rouge)}
"""
rep("  .chatfab{", css + "  .chatfab{")
open(p, 'w').write(s); print('ok : badges et bilan du dimanche ajoutés')
