// Prépare le dossier www de l'appli Android à partir de la version web (librairies embarquées, sans CDN).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
const SRC = process.env.PARCOURS_WEB || 'web';
rmSync('www', { recursive: true, force: true });
mkdirSync('www/lib', { recursive: true });
let html = readFileSync(`${SRC}/index.html`, 'utf8');
const swap = (a, b) => { if (!html.includes(a)) throw new Error('introuvable : ' + a); html = html.split(a).join(b); };
swap('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', './lib/three.module.js');
swap('https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js', 'lib/maplibre-gl.js');
swap('https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css', 'lib/maplibre-gl.css');
swap('<link rel="manifest" href="manifest.webmanifest">\n', '');
swap('<script>\n(() => {', '<script src="capacitor.js"></script>\n<script>\n(() => {');
writeFileSync('www/index.html', html);
copyFileSync('node_modules/three/build/three.module.js', 'www/lib/three.module.js');
copyFileSync('node_modules/maplibre-gl/dist/maplibre-gl.js', 'www/lib/maplibre-gl.js');
copyFileSync('node_modules/maplibre-gl/dist/maplibre-gl.css', 'www/lib/maplibre-gl.css');
copyFileSync('node_modules/@capacitor/core/dist/capacitor.js', 'www/capacitor.js');
for (const f of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) copyFileSync(`${SRC}/${f}`, `www/${f}`);
console.log('www prêt');
