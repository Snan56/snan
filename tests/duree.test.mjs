// Tests de la durée estimée — lancer avec : node --test tests/
// Les fonctions sont lues directement dans web/index.html (entre @duree-debut et @duree-fin).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const src = html.slice(html.indexOf('// @duree-debut'), html.indexOf('// @duree-fin'));
const { estDuration, durRange, fmtDurMin, fmtRange, userKmh } = new Function(src + '\nreturn { estDuration, durRange, fmtDurMin, fmtRange, userKmh };')();
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, a + ' ≠ ' + b);

test('marche : 4,5 km/h + 1 h par 600 m de D+', () => {
  near(estDuration(9, 0, 'marche'), 2);
  near(estDuration(9, 600, 'marche'), 3);
  near(estDuration(4.5, 300, 'rando'), 1.5);
});
test('course : 10 km/h + 1 min par 10 m de D+', () => {
  near(estDuration(10, 0, 'course'), 1);
  near(estDuration(10, 100, 'course') * 60, 70);
});
test('vélo : 18 km/h + 1 h par 800 m de montée', () => {
  near(estDuration(36, 0, 'velo'), 2);
  near(estDuration(36, 400, 'velo'), 2.5);
});
test('vitesse personnelle prioritaire, D+ négatif ignoré, cas invalides', () => {
  near(estDuration(12, 0, 'course', 12), 1);
  near(estDuration(9, -50, 'marche'), 2);
  assert.equal(estDuration(0, 100, 'course'), null);
  assert.equal(estDuration(NaN, 0, 'course'), null);
  near(estDuration(4.5, 0, 'inconnu'), 1); // sport inconnu -> marche
});
test('fourchette arrondie à 5 min, plus serrée si vitesse perso', () => {
  assert.deepEqual(durRange(1), [55, 65]);
  assert.deepEqual(durRange(1, true), [55, 65]);
  assert.deepEqual(durRange(2), [105, 135]);
  assert.deepEqual(durRange(2, true), [110, 130]);
  assert.deepEqual(durRange(0.02), [5, 10]); // jamais de fourchette vide
  assert.equal(durRange(null), null);
});
test('affichage lisible', () => {
  assert.equal(fmtDurMin(45), '45 min');
  assert.equal(fmtDurMin(60), '1 h');
  assert.equal(fmtDurMin(70), '1 h 10');
  assert.equal(fmtDurMin(125), '2 h 05');
  assert.equal(fmtRange([70, 85]), '1 h 10 – 1 h 25');
  assert.equal(fmtRange(null), '–');
});
test('vitesse moyenne réelle depuis l\'historique', () => {
  const run = (km, min, dplus = 0) => ({ activity: 'course', distanceM: km * 1000, durationMs: min * 60000, dplus });
  assert.equal(userKmh([run(10, 60)], 'course'), null); // une seule sortie : pas assez
  assert.equal(userKmh([run(10, 60), run(5, 30)], 'course'), 10);
  assert.equal(userKmh([run(10, 70, 100), run(10, 70, 100)], 'course'), 10); // le D+ est retiré
  assert.equal(userKmh([run(10, 60), run(10, 60)], 'velo'), null); // autre sport
  assert.equal(userKmh([run(10, 10), run(10, 10)], 'course'), null); // 60 km/h : aberrant
  const w = { activity: 'marche', distanceM: 5000, durationMs: 3600000 };
  assert.equal(userKmh([w, w], 'rando'), 5); // la rando utilise tes marches
});
