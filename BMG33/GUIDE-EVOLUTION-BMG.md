# BMG 3.2 — Évolution du BMG

1. Compléter les budgets, les factures et le RAD.
2. Ouvrir **Évolution du BMG** et cliquer **Figer et présenter ce BMG**. Cela crée un instantané historique, conservé dans le projet.
3. Après les nouvelles factures et prévisions, revenir dans l’onglet et comparer la présentation figée avec le **BMG actuel (non figé)**.
4. Lors de la présentation suivante, figer un nouveau BMG. Comparer n’importe quelles présentations à l’aide des sélecteurs.
5. Exporter une sauvegarde JSON après chaque présentation. Les instantanés sont inclus dans la sauvegarde et repris à l’import.

## Règles de calcul

- Budget de référence par code : budget études ajusté des avenants et transferts à la date de chaque présentation.
- Coût final prévisionnel : factures réelles HT (avoirs négatifs) + RAD restant.
- Gain/perte : budget ajusté − coût final prévisionnel.
- Évolution : gain de la présentation comparée − gain de la présentation de référence.
- Évolution négative : dégradation ; positive : amélioration.
- Les instantanés sont figés dans le JSON et ne changent pas lorsque le BMG actuel évolue.
- Un changement de budget entre deux présentations influe aussi sur l’évolution du gain.
- Les codes supprimés restent visibles dans la comparaison historique.

**Important** : ne pas vider le stockage du navigateur sans sauvegarde JSON. Il n’y a pas de synchronisation entre ordinateurs. Les instantanés sont déclaratifs : la fonction ne constitue pas une signature ni une validation par la direction.
