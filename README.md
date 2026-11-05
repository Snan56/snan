# Parcours : appli Android

Cette branche contient le code de l'appli Android de **Parcours**. L'appli suit tes sorties (marche, course, vélo) avec le GPS : distance, vitesse, pas, calories, dénivelé, temps par kilomètre, annonces vocales, carte 3D et records.

La version web est sur la branche `gh-pages` et en ligne ici : https://snan56.github.io/snan/

L'appli Android reprend la même page web, emballée avec [Capacitor](https://capacitorjs.com). Elle apporte en plus :

- **le suivi écran verrouillé** : le GPS continue grâce à un service au premier plan (plugin `@capacitor-community/background-geolocation`). Une notification « Parcours » reste affichée pendant la sortie ;
- **les annonces vocales** du téléphone (plugin `@capacitor-community/text-to-speech`) ;
- **le partage des images et des fichiers GPX** (plugins `@capacitor/filesystem` et `@capacitor/share`) ;
- **les librairies intégrées** (Three.js, MapLibre) : l'appli s'ouvre sans connexion. Les fonds de carte ont toujours besoin d'internet.

## Installer l'APK

1. Sur ton téléphone Android, télécharge l'APK : https://snan56.github.io/snan/parcours.apk
2. Ouvre le fichier. Si Android le demande, autorise l'installation depuis ce navigateur ou ce gestionnaire de fichiers.
3. Au premier lancement, accepte la **position** (choisis « Toujours » ou « Pendant l'utilisation ») et les **notifications**.
4. Conseil : dans Réglages → Applications → Parcours → Batterie, choisis « Sans restriction ». Certains téléphones arrêtent sinon le suivi après quelques minutes écran éteint.

C'est une version de test (« debug ») signée avec une clé de développement. Si une nouvelle version refuse de s'installer par-dessus, désinstalle d'abord l'ancienne. Exporte tes sorties importantes en GPX avant.

## Reconstruire l'appli

Il faut Node.js 20 ou plus, Java 21 et le SDK Android (plateforme 36).

```sh
npm install
npm run build:www          # prépare www/ à partir de web/ (librairies copiées en local)
npx cap sync android
cd android
./gradlew assembleDebug    # APK : android/app/build/outputs/apk/debug/app-debug.apk
```

Pour mettre à jour la page web de l'appli, remplace les fichiers du dossier `web/` par ceux de la branche `gh-pages`, puis relance les commandes ci-dessus.
