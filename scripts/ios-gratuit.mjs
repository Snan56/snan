// Prépare le projet iPhone pour un compte Apple GRATUIT : Apple refuse alors l'accès à Santé (HealthKit),
// donc on retire cette autorisation du projet. Dans l'appli, Santé passe par les raccourcis.
// Pour revenir à la version avec Santé direct (compte payant) : git checkout ios/App/App.xcodeproj/project.pbxproj
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'ios/App/App.xcodeproj/project.pbxproj';
const s = readFileSync(p, 'utf8'), t = s.replace(/^\s*CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;\n/gm, '');
writeFileSync(p, t);
console.log(s === t ? 'Déjà prêt pour un compte gratuit.' : 'Projet prêt pour un compte Apple gratuit (sans Santé direct).');
