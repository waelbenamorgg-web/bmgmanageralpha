// Format versionne pour les exports BMG. Les anciennes sauvegardes sont des objets chantier bruts.
export const BACKUP_FORMAT = 'bmg-project-backup';
export const SCHEMA_VERSION = 1;
export const APP_VERSION = '3.2.0-beta-evolution';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const arrays = ['imputationCodes', 'subContractors', 'expenses', 'transfers', 'prorataItems', 'clientAmendments'];
export function makeBackup(project) {
  return { format: BACKUP_FORMAT, schemaVersion: SCHEMA_VERSION, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), project };
}
export function inspectBackup(input) {
  if (!isObject(input)) throw new Error('Le fichier JSON ne contient pas un chantier BMG.');
  const wrapped = input.format === BACKUP_FORMAT;
  if (input.format && !wrapped) throw new Error('Format de sauvegarde inconnu.');
  if (wrapped && (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 1)) throw new Error('Version de sauvegarde invalide.');
  if (wrapped && input.schemaVersion > SCHEMA_VERSION) throw new Error('Sauvegarde provenant d’une version plus récente de BMG. Import refusé pour protéger les données.');
  const project = wrapped ? input.project : input;
  if (!isObject(project) || !Array.isArray(project.months) || project.months.length === 0 || !Array.isArray(project.imputationCodes)) {
    throw new Error('Structure du chantier incomplète : mois ou codes d’imputation absents.');
  }
  if (project.months.length > 240) throw new Error('Le chantier dépasse 240 mois : import à vérifier manuellement.');
  for (const key of arrays) if (project[key] !== undefined && !Array.isArray(project[key])) throw new Error(`La rubrique ${key} est invalide.`);
  if (project.radNonST !== undefined && !isObject(project.radNonST)) throw new Error('Le RAD est invalide.');
  const warnings = [];
  if (!wrapped) warnings.push('Ancien JSON détecté : conversion vers le format versionné.');
  const codeSet = new Set();
  for (const code of project.imputationCodes) {
    if (!isObject(code) || typeof code.code !== 'string' || !code.code.trim()) throw new Error('Un code d’imputation est invalide.');
    if (codeSet.has(code.code)) warnings.push(`Code d’imputation en double : ${code.code}.`);
    codeSet.add(code.code);
  }
  for (const st of project.subContractors || []) {
    if (!isObject(st) || typeof st.code !== 'string') throw new Error('Un sous-traitant est invalide.');
    if (!codeSet.has(st.code)) warnings.push(`Sous-traitant ${st.code} sans code dans Budget évolution.`);
  }
  for (const [key, values] of Object.entries(project.radNonST || {})) {
    if (!Array.isArray(values)) throw new Error(`RAD invalide pour ${key}.`);
    if (values.length !== project.months.length) warnings.push(`RAD ${key} : ${values.length} mois au lieu de ${project.months.length}.`);
  }
  for (const st of project.subContractors || []) if (Array.isArray(st.radMonthly) && st.radMonthly.length !== project.months.length) warnings.push(`RAD ST ${st.code} : nombre de mois différent.`);
  return { project, sourceVersion: wrapped ? `${input.appVersion || 'inconnue'} (schéma ${input.schemaVersion})` : 'Ancienne sauvegarde non versionnée', warnings, counts: { months: project.months.length, codes: project.imputationCodes.length, contractors: (project.subContractors || []).length, expenses: (project.expenses || []).length } };
}
