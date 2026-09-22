# Uncle Angry Secret Journal

*[Read this in English](README.en.md)*

Module Foundry VTT (v13/v14) qui transforme les pages de journal en véritables fiches — personnages, lieux, magasins et galeries d'images — plutôt qu'en simples pages de wiki. Indépendant de tout système de jeu : il ne repose que sur les champs natifs de Foundry (nom, image, propriétaire...), jamais sur le schéma d'un système précis.

## Types de fiches

Chaque type se crée depuis le sélecteur ajouté à la fenêtre de création de journal native de Foundry, et s'ouvre directement en tant que carte autonome (sans le chrome habituel d'un journal — barre latérale, liste de pages...).

- **Personnage** — une carte Présentation (portrait, infos en post-it déplaçables et verrouillables, couleur de fond personnalisée) et une carte Relations reliée, avec bascule d'un clic entre les deux. Les relations se lient par glisser-déposer ou recherche à un autre journal existant, avec un texte public et un texte intime dont la visibilité se règle par joueur.
- **Lieu** — icône, infos rapides, description en texte libre et un onglet Relations, le tout dans une seule fiche à onglets.
- **Magasin** — même structure que Lieu, avec en plus un onglet Marchandises : chaque article référence un vrai Item de votre système (glissé-déposé ou recherché), avec un prix et un stock propres à ce magasin plutôt qu'à l'objet lui-même.
- **Galerie** — une grille d'images, chacune avec son petit nom.
- **Image seule** — une fenêtre qui affiche directement une seule image.

## Fonctionnalités transversales

Présentes sur (presque) tous les types de fiches ci-dessus :

- **Ambiance sonore** — associez un son de vos playlists à une fiche ; il joue tant que la fiche reste ouverte. Clic gauche pour lecture/arrêt, clic droit pour changer le son (réservé au propriétaire).
- **Montrer aux joueurs** — diffuse la fiche (ou l'image) à des joueurs choisis, en un clic depuis la barre de titre.
- **Agrandissement et partage d'image** — cliquer une image l'agrandit, avec le bouton de partage natif de Foundry directement accessible (au lieu d'être caché dans un sous-menu).
- **Infos en chips** — de courtes informations (âge, faction, réputation...) que chaque propriétaire de fiche active et positionne librement, indépendamment des autres fiches.

## Notes d'utilisation

- Les infos en chips se choisissent depuis le menu ⋮ de la fenêtre (« Choisir les infos affichées »). Il faut ensuite passer en mode édition pour remplir leur valeur — c'est seulement une fois remplies qu'elles apparaissent en mode lecture, où elles peuvent alors être glissées et positionnées librement.
- La couleur de fond, elle aussi, ne se change qu'en mode édition ; le mode lecture ne fait que l'afficher.

## Compatibilité

- Foundry VTT v13 et v14.
- Aucune dépendance à un système de jeu précis — testé notamment avec un système personnalisé sans schéma d'objet standard.

## Installation

Dans Foundry, onglet **Modules complémentaires** → **Installer un module**, puis collez cette URL de manifest :

```
https://github.com/Angrimmer/Uncle-Angry-secret-journal/releases/latest/download/module.json
```

Vous pouvez aussi télécharger la dernière version depuis l'onglet [Releases](../../releases) de ce dépôt et l'extraire dans votre dossier `Data/modules`.

## Inspiration

La structure de certaines fiches (Lieu, Magasin) s'inspire de l'ergonomie du module [Monk's Enhanced Journal](https://foundryvtt.com/packages/monks-enhanced-journal) — repris comme référence de fonctionnement uniquement et visuel parfois. Aucun code n'en a été réutilisé ; ce module est développé indépendamment, de zéro.

## Pourquoi ce module

Je sais que des modules de ce genre existent déjà. J'ai simplement voulu en créer un qui corresponde à mes propres attentes, en mettant en avant ce qui comptait le plus pour moi. Je continuerai sans doute à le faire évoluer au fil de mes propres besoins de jeu — et si ça plaît à quelqu'un d'autre au passage, ça me fera très sincèrement plaisir.

## Langues

Français (complet), anglais (complet).

## Retours et suggestions

C'est mon tout premier module Foundry publié — tout avis, retour d'expérience ou suggestion d'amélioration est le bienvenu, n'hésitez pas à ouvrir une [issue](../../issues).

## Soutenir le projet

Si ce module vous a été utile, un petit coup de pouce sur [Ko-fi](https://ko-fi.com/angrimmer) fait toujours plaisir. Aucune obligation, bien sûr !

Pour ce qui est de l'utilisation de l'IA, elle m'aide notamment pour des tâches d'automatisation et de confort.
