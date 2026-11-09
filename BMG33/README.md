# BMG Alpha 3.0 — Version vierge avec guide interactif

Voir [GUIDE-DE-DEMARRAGE.md](GUIDE-DE-DEMARRAGE.md).

Projet dérivé de BMG 2.9. Démarrage vierge si aucun projet local n’existe ; bouton **Nouveau chantier vierge** avec confirmation pour repartir à zéro. Le guide intégré accompagne 8 étapes.

Lancer : `npm install`, `npm run test`, `npm run build`, `npm run dev`.

## Migration Alpha → Bêta

Les exports JSON sont désormais versionnés (`format`, `schemaVersion`, `appVersion`, `exportedAt`, `project`). Les sauvegardes anciennes non versionnées restent importables après analyse et confirmation. Voir `GUIDE-TRANSITION-ALPHA-BETA.md`.
