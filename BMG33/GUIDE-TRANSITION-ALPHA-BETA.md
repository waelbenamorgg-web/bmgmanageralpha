# BMG 3.1 — Transition Alpha vers Bêta

1. Sur l’ancien ordinateur, ouvrez BMG Alpha et exportez le chantier en JSON. Conservez le fichier original.
2. Déployez le nouveau code BMG 3.1 sur GitHub / Vercel, sans envoyer `node_modules` ni `dist`.
3. Sur le nouvel ordinateur, ouvrez BMG, puis cliquez **Import JSON**.
4. Sélectionnez le fichier Alpha. Vérifiez la **prévisualisation** (nom, mois, codes, ST, factures et avertissements).
5. Cliquez **Confirmer et importer**. BMG déclenche une sauvegarde du chantier actuellement ouvert avant son remplacement : vérifiez son téléchargement.
6. Vérifiez le **Tableau de bord → Contrôles**, les marchés ST, les proratas et les totaux mensuels.
7. Cliquez **Export JSON** pour enregistrer le chantier dans le nouveau format versionné.

Le JSON d’origine n’est jamais modifié. Les fichiers plus récents que le schéma pris en charge sont refusés. La migration est une conversion structurelle, pas une garantie d’identité de résultats si les formules de l’application ont évolué. La sauvegarde reste locale : il n’y a pas de synchronisation automatique entre ordinateurs.

**Attention** : la sauvegarde de sécurité est téléchargée via le navigateur. Assurez-vous qu’elle est bien présente avant de poursuivre votre travail.
