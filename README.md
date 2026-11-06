# Parcours : applis Android et iPhone

Cette branche contient le code des applis Android et iPhone de **Parcours**. L'appli suit tes sorties (marche, course, vélo) avec le GPS : distance, vitesse, pas, calories, dénivelé, temps par kilomètre, annonces vocales, carte 3D et records.

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


## Appli iPhone

Le dossier `ios/` contient l'appli iPhone (même page web, emballée avec Capacitor). En plus du site, elle apporte :

- **Apple Santé en automatique** (plugin `@capgo/capacitor-health`) : les sorties, séances, tests navette et repas sont ajoutés dans Santé (énergie active, pas, distance, énergie alimentaire) sans rien toucher, et les pas du jour et le dernier poids sont lus à chaque ouverture de l'appli ;
- **le GPS écran verrouillé**, comme sur Android.

Il n'y a pas besoin de Mac : [Codemagic](https://codemagic.io) construit l'appli sur ses Mac (500 minutes gratuites par mois) avec `codemagic.yaml`, puis l'envoie sur **TestFlight**.

### À faire une seule fois

1. **Compte développeur Apple** (environ 99 € par an) : https://developer.apple.com/programs/
2. **Identifiant de l'appli** : sur https://developer.apple.com/account/resources/identifiers, ajoute un App ID `fr.snan56.parcours` et coche **HealthKit**.
3. **Fiche de l'appli** : sur https://appstoreconnect.apple.com, Apps → « + » → Nouvelle app, nom « Parcours », identifiant `fr.snan56.parcours`.
4. **Clé API** : App Store Connect → Utilisateurs et accès → Intégrations → Clés API d'App Store Connect → « + » (accès « Gestionnaire d'apps »). Télécharge le fichier `.p8` et note l'Issuer ID et le Key ID.
5. **Codemagic** : crée un compte avec GitHub, ajoute le dépôt `Snan56/snan`. Dans Team settings → Integrations → Developer Portal, ajoute la clé API sous le nom **Parcours**.
6. Lance le workflow **Parcours iPhone (TestFlight)** sur la branche `appli-android`. Environ 15 minutes plus tard, l'appli arrive dans **TestFlight** (app gratuite de l'App Store) sur ton iPhone.

Au premier lancement, accepte la position (« Toujours » pour l'écran verrouillé), puis active **Réglages → Apple Santé → Connecter à Apple Santé**.

### Sans compte payant (compte Apple gratuit, avec un Mac)

Tu peux installer l'appli sur ton iPhone gratuitement depuis un Mac. Apple refuse alors l'accès direct à Santé : dans l'appli, l'envoi vers Santé passe par les raccourcis, comme sur le site. Le GPS écran verrouillé marche. L'appli s'arrête au bout de **7 jours** : il suffit de la réinstaller depuis le Mac (tes données restent).

1. Installe **Xcode** (App Store du Mac) et **Node.js** LTS (https://nodejs.org).
2. Dans Terminal :
   ```sh
   git clone -b appli-android https://github.com/Snan56/snan.git parcours
   cd parcours && npm ci && PARCOURS_WEB=web npm run ios:gratuit
   ```
3. Dans Xcode : Settings → Accounts → ajoute ton identifiant Apple. Clique sur **App** → **Signing & Capabilities** → Team : ton nom (Personal Team).
4. Branche l'iPhone, choisis-le en haut, appuie sur ▶️. Sur l'iPhone, active **Réglages → Confidentialité et sécurité → Mode développeur**, puis dans **Réglages → Général → VPN et gestion de l'appareil**, fais confiance à ton identifiant.

Tous les 7 jours, ou pour une nouvelle version : `cd parcours && git pull && PARCOURS_WEB=web npm run ios:gratuit`, puis ▶️ dans Xcode.
