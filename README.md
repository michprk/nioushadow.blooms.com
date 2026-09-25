# Nioushadow Blooms — site vitrine

Site de **Nioushadow Blooms**, fleuriste-atelier au Mont des Arts, à Bruxelles.

Direction artistique : un « broadside » botanique sur papier crème, inspiré de *How Many Plants*.
Le nom de la maison est posé sur des étagères olive, au milieu de vases, de livres et de cadres.
La palette est volontairement courte (crème, encre, olive doré, lavande, sarcelle), les angles sont
vifs et il n’y a qu’une seule ombre : un décalage dur de 6 px, couleur olive.

## Structure

```
index.html              page d’accueil
confidentialite.html    politique de confidentialité (RGPD) + cookies
cgu.html                conditions générales d’utilisation + mentions légales
404.html                page « introuvable » personnalisée
connexion.html          espace client : se connecter, créer un compte, mot de passe oublié
compte.html             espace client : « Mon espace » (profil, mot de passe, déconnexion)
assets/css/style.css    tout le style : couleurs, typographie, animations, responsive
assets/js/boot.js       chargé en premier : force le HTTPS, active les animations
assets/js/main.js       interactions, formulaire, anti-spam, bannière cookies
assets/js/auth.js       espace client (connexion via Supabase)
assets/js/vendor/       bibliothèque Supabase (licence MIT), hébergée sur le site
assets/fonts/           polices auto-hébergées (Fraunces + DM Mono), aucun appel à Google Fonts
assets/photos/          les photos du site (voir assets/photos/README.md)
assets/img/             favicons, icônes d’application, image de partage (og.jpg)
favicon.ico             favicon classique
site.webmanifest        icônes pour l’écran d’accueil des téléphones
robots.txt, sitemap.xml référencement
.htaccess               serveur Apache : HTTPS forcé, en-têtes de sécurité, page 404, cache
_headers                la même chose pour Netlify ou Cloudflare Pages
```

Aucune dépendance et aucune étape de compilation : ce sont des fichiers HTML, CSS et JS simples.

## Voir le site en local

```bash
npx http-server . -p 8080
# puis ouvrir http://localhost:8080
```

## Photos

Les photos viennent du site actuel de Nioushadow Blooms (voir
[`assets/photos/README.md`](assets/photos/README.md)). Elles ont été découpées dans une capture
d’écran : si la fleuriste fournit les fichiers originaux, il suffit de les remplacer (mêmes noms)
pour gagner en netteté. Une photo apparaît en fondu ; si un fichier manque, une illustration
s’affiche à sa place.

## Un seul appel à l’action

Tout le site pousse vers un seul bouton : **« Commander un bouquet »**. Il est dans le haut de
page, puis le même bouton se range en bas de l’écran pendant la lecture. Il disparaît quand le
formulaire ou le pied de page est visible, pour qu’il n’y en ait jamais deux à l’écran.

Ses animations : fond olive qui monte, texte qui roule, flèche qui s’échange, fleur qui tourne,
effet aimanté vers la souris et pétales qui s’envolent au clic.

## Formulaire de commande

- **Validation** : nom, e-mail (avec extension, ex. `.be`), date à partir de demain (commandes
  24 h à l’avance), message de 1000 caractères maximum, case de consentement RGPD obligatoire.
  Chaque erreur s’affiche sous le champ, en français, et est lue par les lecteurs d’écran.
- **Anti-spam** : champ piège invisible, envoi refusé s’il arrive moins de 3 secondes après la
  première saisie, un envoi par minute au maximum, un seul lien autorisé dans le message.
- **Envoi** : par défaut, la demande est préparée dans **WhatsApp** (+32 477 73 56 59). Pour la
  recevoir **par e-mail**, créer un formulaire gratuit sur [formspree.io](https://formspree.io) et
  coller son adresse dans `FORM_ENDPOINT`, en haut de `assets/js/main.js`.

## Cookies

Le site n’utilise aucun cookie publicitaire et aucune mesure d’audience n’est installée.
La bannière demande quand même l’accord du visiteur (« Tout refuser » et « Tout accepter » ont le
même poids) et le lien « Gérer les cookies » du pied de page permet de changer d’avis.
Pour ajouter une mesure d’audience plus tard, voir la fonction `loadAnalytics()` dans `main.js` :
elle ne se lance qu’avec l’accord du visiteur.

## Espace client (connexion)

Les visiteurs peuvent créer un compte, se connecter, retrouver leurs informations et commander
avec leur nom et leur e-mail déjà remplis. Un site statique ne peut pas stocker de comptes tout
seul : l’espace client s’appuie sur **Supabase** (gratuit). Pour l’activer (≈ 10 minutes) :

1. Créer un compte et un projet sur [supabase.com](https://supabase.com), région **Europe (Francfort)**.
2. *Project Settings → API* : copier l’**URL** du projet et la clé **anon public**.
3. Les coller en haut de `assets/js/auth.js` (`SUPABASE_URL` et `SUPABASE_ANON_KEY`).
4. *Authentication → URL Configuration* : mettre l’adresse du site dans **Site URL** et
   **Redirect URLs** (par ex. `https://michprk.github.io/nioushadow.blooms.com/*`).
5. *Authentication → Emails* : traduire les e-mails de confirmation en français si besoin.

Tant que ce n’est pas fait, la page de connexion affiche « L’espace client ouvre très bientôt »
et invite à commander par le formulaire ou par téléphone. Les comptes de l’ancien site Wix ne sont
pas repris : les clients recréent un compte.

## HTTPS et sécurité

- `boot.js` redirige automatiquement de `http://` vers `https://`.
- `.htaccess` (Apache) et `_headers` (Netlify / Cloudflare) font la redirection côté serveur et
  ajoutent les en-têtes de sécurité : HSTS, CSP stricte, anti-iframe, etc.
- Sur **GitHub Pages** : *Settings → Pages → Enforce HTTPS*.

## Mettre en ligne (GitHub Pages, gratuit)

1. Sur GitHub, ouvrir le dépôt → **Settings** → **Pages**.
2. *Source* : **Deploy from a branch** ; *Branch* : `claude/how-many-plants-site-vxs24q`, dossier **/ (root)** → **Save**.
3. Attendre 1 à 2 minutes : le site est en ligne sur **https://michprk.github.io/nioushadow.blooms.com/**
4. Cocher **Enforce HTTPS** sur la même page.

Chaque nouveau « push » sur cette branche met le site à jour automatiquement.

**Nom de domaine** : pour utiliser une adresse comme `nioushadow-blooms.com` (aujourd’hui sur Wix),
la fleuriste doit faire pointer son domaine vers GitHub Pages (*Settings → Pages → Custom domain*).
Remplacer alors `https://michprk.github.io/nioushadow.blooms.com` par la nouvelle adresse dans `index.html`, les pages légales,
`sitemap.xml` et `robots.txt`.

## Animations

- **Ouverture** : les étagères se déroulent, les lettres montent, les plantes poussent et les
  cadres se posent.
- **Au défilement** : barre de lecture olive en haut, titres qui apparaissent mot par mot, photos
  dévoilées par un balayage, bandeau de mots dont la vitesse suit le défilement, plantes qui
  penchent selon la vitesse (« le vent »), cadres de la galerie qui se posent un à un.
- **À la souris** : profondeur dans le haut de page, lettres du logo qui sautillent, aperçu photo
  dans la liste des créations, liens ondulés.
- **Entre les pages** : transition en fondu (navigateurs récents).
- Tout est coupé si le visiteur a demandé « réduire les animations » dans son système.

## Envoyer le site à la fleuriste

L’aperçu en ligne est privé : ouvre-le, clique sur **Share**, puis colle le lien dans ton e-mail.

## À compléter avant la mise en ligne

Dans `cgu.html` et `confidentialite.html`, les champs marqués **« à compléter »** :
forme juridique, numéro d’entreprise (BCE), numéro de TVA, adresse e-mail et hébergeur.
Vérifier aussi le compte Instagram (`@nioushadow`, celui de la maison NiouShadow) et le nom de
domaine final (utilisé dans les balises de partage, `sitemap.xml` et `robots.txt`).
