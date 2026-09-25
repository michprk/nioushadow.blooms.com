# Nioushadow Blooms — site vitrine

Site d’une page pour **Nioushadow Blooms**, fleuriste-atelier au Mont des Arts, à Bruxelles.

Direction artistique : un « broadside » botanique sur papier crème, inspiré de *How Many Plants*.
Le nom de la maison est posé sur des étagères olive, au milieu de vases, de livres et de cadres.
La palette est volontairement courte (crème, encre, olive doré, lavande, sarcelle), les angles sont
vifs et il n’y a qu’une seule ombre : un décalage dur de 6 px, couleur olive.

## Structure

```
index.html             la page (textes, illustrations SVG, sections)
assets/css/style.css   tout le style : couleurs, typographie, animations, responsive
assets/js/main.js      les interactions (animations, menu, galerie, formulaire)
assets/fonts/          polices auto-hébergées : Fraunces + DM Mono
assets/photos/         les photos du site (voir assets/photos/README.md)
assets/img/            favicon + image de partage (og.jpg)
```

Aucune dépendance et aucune étape de compilation : ce sont des fichiers HTML, CSS et JS simples.

## Voir le site en local

```bash
npx http-server . -p 8080
# puis ouvrir http://localhost:8080
```

## Ajouter les photos

Dépose les photos dans `assets/photos/` avec les noms listés dans
[`assets/photos/README.md`](assets/photos/README.md). Tant qu’une photo manque, une illustration
s’affiche à sa place.

## Formulaire de commande

Par défaut, le formulaire prépare la demande dans **WhatsApp** (+32 477 73 56 59) : le client n’a
plus qu’à appuyer sur « Envoyer ».

Pour recevoir les demandes **par e-mail** à la place :

1. créer un formulaire gratuit sur [formspree.io](https://formspree.io) ;
2. copier son adresse (par exemple `https://formspree.io/f/abcdwxyz`) ;
3. la coller dans `FORM_ENDPOINT`, en haut de `assets/js/main.js`.

## Mettre en ligne

Le site fonctionne sur n’importe quel hébergement statique (GitHub Pages, Netlify, Vercel…).
Avec GitHub Pages : *Settings → Pages → Deploy from a branch*, dossier racine.

## Animations

- Ouverture : les étagères se déroulent, les lettres montent, les plantes « poussent » et les
  cadres se posent.
- Au défilement : les titres apparaissent mot par mot, les photos se révèlent par un balayage.
- Au survol : les boutons se décollent avec leur ombre olive, les liens ondulent, un aperçu
  photo suit la souris dans la liste des créations.
- Les plantes se balancent doucement en continu.
- Tout est désactivé si le visiteur a demandé « réduire les animations » dans son système.

## À confirmer avec la cliente

- Adresse e-mail (le site n’en affiche aucune pour l’instant ; contact par téléphone et WhatsApp).
- Compte Instagram : le lien pointe vers `@nioushadow`, le compte de la maison NiouShadow.
- Horaires d’ouverture, tarifs éventuels, liste définitive des prestations.
- Nom de domaine final (utilisé dans `og:image` et `og:url` de `index.html`).
