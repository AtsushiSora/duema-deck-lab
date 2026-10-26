import fs from 'node:fs';import assert from 'node:assert/strict';import{championDefinition}from'./champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url)));
const parts=['junior','control','saga','seed','cyber','firebird','combat'].map(name=>read('./support-champion-'+name+'.json'));
const rows=parts.flatMap(x=>x.cards);assert.equal(rows.length,93);assert.equal(new Set(rows.map(x=>x.id)).size,93);
const manifest={phase:64,checkedAt:'2026-10-26',description:'残るオリジナル大会優勝15構成を、公式のカードと枚数を変えず対戦可能にする93種類。',rules:[...new Set(parts.flatMap(x=>x.rules||[]))],cards:rows};
const data=read('../dist/cards.json'),details=read('../dist/details.json');
for(const row of rows){assert.ok(row.verification?.facesMatched&&row.verification.sha256,'公式検証:'+row.id);assert.equal(details.cards.find(c=>c.id===row.id)?.name,row.name);const old=data.cards.find(c=>c.id===row.id||c.name===row.name);if(old&&old.supportBatch!=='phase-64')throw Error('既存の定義は上書きしません：'+row.name);const value=championDefinition(row);if(old)data.cards[data.cards.indexOf(old)]=value;else data.cards.push(value);}
const old=data.supportExpansion,history=[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<64);
data.supportExpansion={phase:64,checkedAt:manifest.checkedAt,baseCount:1242,newEffectCards:93,newVanillaCards:0,totalCount:data.cards.length,ruleSource:manifest.rules,next:['対応済みカードの対戦検証と改善'],history};assert.equal(data.cards.length,1335);
const refs=read('./image-reference-prints.json');for(const r of rows){const value={id:r.id,canonicalId:r.id,name:r.name,image:r.image,source:r.source};const i=refs.prints.findIndex(x=>x.id===r.id);if(i<0)refs.prints.push(value);else refs.prints[i]=value;}
for(const[f,v]of[['../dist/cards.json',data],['./support-phase-64.json',manifest],['./image-reference-prints.json',refs]])fs.writeFileSync(new URL(f,import.meta.url),JSON.stringify(v,null,2)+'\n');
console.log('Implemented 93 card types; '+data.cards.length+' supported types.');
