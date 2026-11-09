import assert from 'node:assert/strict';
import { inspectBackup, makeBackup } from '../src/backupMigration.js';
const base={name:'Chantier X',months:['Janvier 2026','Février 2026'],imputationCodes:[{code:'STDE'}],subContractors:[{code:'STDE',initialMarket:85000,modificationOrders:[{amount:-2000}],radMonthly:[0,81340]}],expenses:[{invoiceAmount:-500}],radNonST:{ACHA:[1000,-500]}};
const old=inspectBackup(base);assert.match(old.sourceVersion,/Ancienne/);assert.equal(old.counts.expenses,1);
const newer=inspectBackup(makeBackup(base));assert.equal(newer.project.subContractors[0].modificationOrders[0].amount,-2000);assert.equal(newer.project.expenses[0].invoiceAmount,-500);
assert.throws(()=>inspectBackup({...makeBackup(base),schemaVersion:99}),/plus récente/);
assert.throws(()=>inspectBackup({name:'invalide'}),/incomplète/);
assert.throws(()=>inspectBackup({...base,expenses:{}}),/invalide/);
assert.equal(inspectBackup({...base,subContractors:[{code:'STINCONNU'}]}).warnings.length,2); // ancien JSON + code manquant
console.log('Migration JSON : 6 scénarios réussis');
