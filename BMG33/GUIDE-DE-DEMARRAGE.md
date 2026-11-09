# BMG Alpha 3.0 — Guide de démarrage (chantier vierge)

**Objectif :** saisir un chantier depuis zéro, sans aucune donnée financière fictive. Le guide interactif est disponible dans l’application via **Guide pas à pas**.

1. **Tableau de bord → Config :** renseigner nom, lieu, responsable, dates, montant du marché client HT, budget études déboursé HT et taux de frais généraux (15 % par défaut, modifiable). Déverrouiller les paramètres au besoin.
2. **Budget évolution :** créer chaque code d’imputation et son budget études (MO, matériaux, location, ST…). **Créer les codes ST ici uniquement.** Le code PRORATA démarre à zéro.
3. **ST :** compléter les entreprises, le **marché réellement signé** (indépendant du budget études), les OM signés (+/−), les travaux à régulariser (+/−) et le taux de prorata (2 % par défaut). Aucun marché ST fictif n’est prérempli.
4. **Prorata :** si applicable, affecter un budget PRORATA dans Budget évolution puis saisir le détail mensuel dans Prorata. Ne pas confondre cette enveloppe avec la retenue ST.
5. **RAD :** ventiler les dépenses prévisionnelles mensuelles et la facturation client de base, puis les avenants client. Les mois ST sont ajustés manuellement.
6. **Cahier d’épicier :** saisir les factures réelles HT avec le bon code et, pour une facture ST, le bon sous-traitant. Un avoir est négatif. Le total engagé tient compte des avoirs.
7. **RAD après factures :** réajuster manuellement les mois. Pour chaque ST, le solde RAD doit égaler **marché ST actualisé − retenue prorata − factures ST nettes**, à 0,01 € près. Les factures ne diminuent pas automatiquement le RAD. Les OM et régularisations négatifs diminuent le marché.
8. **Tableau de bord → Contrôles :** corriger les anomalies par onglet. **Export JSON** après chaque session importante.

## Points de vigilance

- **Budget études ≠ marché signé :** un écart est une information budgétaire, pas nécessairement une erreur de saisie.
- **Montants négatifs :** avoirs et moins-values sont permis, et ne sont pas automatiquement des anomalies.
- **Retenue prorata ST :** comparer les factures sur la même base nette que le RAD ; vérifier le traitement contractuel réel de la retenue.
- **Révision de prix :** désactivée dans un chantier vierge ; ne l’activer qu’après saisie des indices et des clauses applicables.
- **Chantier vierge :** le bouton *Nouveau chantier vierge* remplace les données ouvertes, après confirmation ; **exporter le JSON avant**.
- **Sauvegardes existantes :** BMG conserve le projet local déjà présent lors de la mise à jour. Pour démarrer vierge, utiliser le bouton dédié.
- **Accès :** le mot de passe côté navigateur n’est pas une authentification serveur sécurisée pour un déploiement public.

## Installation Windows

Dans le dossier extrait, ouvrir PowerShell puis exécuter :

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

Ouvrir l’URL locale affichée par Vite, habituellement `http://localhost:5173/`.
