import assert from 'node:assert/strict';
import { stBalance, invoiceST } from '../src/stReconcile.js';
import { auditProject } from '../src/audit.js';
const st={id:7,code:'STEL',company:'Électricien',initialMarket:100000,modifications:5000,toRegularize:-2500,provision:0,radMonthly:[60000,32500]};
const invoices=[{id:'F1',subCode:'STEL',stId:'7',invoiceAmount:10000.01},{id:'F2',subCode:'STEL',stId:'7',invoiceAmount:499.99}];
const bal=stBalance(st,invoices,[st]);
assert.equal(bal.marketCents,10250000);
assert.equal(bal.billedCents,1050000);
assert.equal(bal.remainingCents,8995000);
assert.equal(bal.differenceCents,255000);
assert.equal(invoiceST(invoices[0],[st])?.id,7);
assert.equal(invoiceST({subCode:'STEL'},[st,{...st,id:8}]),null);
const base={months:['Jan','Fév'],clientBudget:0,clientSalesPlan:[0,0],overheadRate:15,imputationCodes:[{code:'STEL',family:'Sous-traitance',qty:1,pu:102500}],transfers:[],clientAmendments:[],subContractors:[st],radNonST:{},prorataItems:[],expenses:invoices,priceRevision:{enabled:false}};
assert(auditProject(base).some(x=>x.title.includes('Rapprochement ST au centime')));
const balanced={...base,subContractors:[{...st,radMonthly:[60000,29950]}]};
assert(!auditProject(balanced).some(x=>x.title.includes('Rapprochement ST au centime')));
const penny={...balanced,subContractors:[{...st,radMonthly:[60000,29950.01]}]};
assert(auditProject(penny).some(x=>x.title.includes('Rapprochement ST au centime')));
const neg={...balanced,subContractors:[{...st,modifications:-10000,toRegularize:-2500}]};
assert(auditProject(neg).some(x=>x.title.includes('Rapprochement ST au centime')));
const missing={...balanced,expenses:[{...invoices[0],stId:'999'}]};
assert(auditProject(missing).some(x=>x.title.includes('sans marché identifié')));
console.log('PASS: rapprochement ST au centime, OM ±, affectation facture et écart de 0,01 €');

const provisionCase={...st,provision:2000};
assert.equal(stBalance(provisionCase,invoices,[provisionCase]).marketCents,10250000,'La provision ne doit pas augmenter le marché ST');

// Moins-value OM, avoir et retenue prorata sur base contractuelle, au centime.
const negativeOM={...st, modifications:-10000, toRegularize:-2500, prorataRate:2, radMonthly:[0,0]};
const credit=[{id:'A1',subCode:'STEL',stId:'7',invoiceAmount:-1000.25}];
const creditBalance=stBalance(negativeOM,credit,[negativeOM]);
assert.equal(creditBalance.marketCents,8750000);
assert.equal(creditBalance.withheldCents,175000);
assert.equal(creditBalance.netMarketCents,8575000);
assert.equal(creditBalance.billedCents,-100025);
assert.equal(creditBalance.remainingCents,8675025);
assert.equal(stBalance({...negativeOM,radMonthly:[80000,6750.25]},credit,[negativeOM]).differenceCents,0);
assert(!auditProject({...base,subContractors:[{...negativeOM,radMonthly:[80000,6750.25]}],expenses:credit}).some(x=>x.title.includes('montant invalide')));
console.log('PASS: prorata net, OM négatifs, avoirs négatifs, rapprochement au centime');
