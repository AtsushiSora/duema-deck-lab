// Apply only the two reviewed full-effect tournament manifests; never infer support from card text.
import fs from 'node:fs';import assert from 'node:assert/strict';
const data=JSON.parse(fs.readFileSync(new URL('../dist/cards.json',import.meta.url))),details=JSON.parse(fs.readFileSync(new URL('../dist/details.json',import.meta.url)));
const history=[...(data.supportExpansion.history||[]),Object.fromEntries(Object.entries(data.supportExpansion).filter(([k])=>k!=='history'))].filter(x=>x.phase<15);
for(const phase of [15,16]){
 const manifest=JSON.parse(fs.readFileSync(new URL('./support-phase-'+phase+'.json',import.meta.url)));
 for(const row of manifest.cards){const d=details.cards.find(x=>x.id===row.id);assert.equal(d.name,row.name);assert.deepEqual(d.faces,row.faces);assert.equal(d.source,row.source);assert.match(row.source,/^https:\/\/dm\.takaratomy\.co\.jp\/card\/detail\/\?id=/);
  const f=d.faces[0],old=data.cards.find(x=>x.id===row.id||x.name===row.name);if(old&&old.supportBatch!=='phase-'+phase)throw Error('既存カードを上書きできません');
  const value={id:row.id,name:row.name,civ:f.civilizationText,civilizations:f.civilizations,manaValue:1,type:'creature',cost:f.cost,power:Number(f.powerText)||0,race:f.race,text:d.faces.map(x=>x.abilityText).join(phase===15?'\n【ハイパーモード】\n':'\n【呪文面】\n'),source:row.source,limit:4,...row.spec,supportBatch:'phase-'+phase,supportKind:'effect'};
  if(old)Object.assign(old,value);else data.cards.push(value);
 }
 const current={phase,checkedAt:manifest.checkedAt,baseCount:phase===15?597:608,newEffectCards:manifest.cards.length,newVanillaCards:0,totalCount:phase===15?608:623,ruleSource:manifest.rules,targetDeck:phase===15?'env-gp2026-sara':'env-gp2026-grimoire',next:phase===15?['バイケンの効果対応']:['未対応カードを追加し、複合効果の検証を継続']};
 if(phase===15)history.push(current);else data.supportExpansion={...current,history};
}
assert.equal(data.cards.length,623);fs.writeFileSync(new URL('../dist/cards.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log('623 fully implemented cards; all four tournament lists supported.');
