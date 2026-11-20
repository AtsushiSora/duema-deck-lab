// The assertions and board are shared with abyss-effects' exhaustive entry-borrow test.
import assert from 'node:assert/strict';
import {e,data,setup,give,act,drain} from './target-fixture.mjs';
const M='dm22rp2-S5',F='dm23sp1-011',T='dm23rp2-005',N='dm01-108',H='dm01-075',B='dmbd10-009';
const reference={source:M,uid:'reference',incarnation:0,lastKnownPower:4000};
const pick=(s,value)=>{const i=s.decision?.choices?.findIndex(c=>JSON.stringify(c.value)===JSON.stringify(value));assert.ok(i>=0,JSON.stringify(s.decision));act(s,'extended',a=>a.choice===i);};
export function borrowedEntryCases(){
 const cases=[];
 for(const c of data.cards){const entries=e.entryAbilities(setup(),0,c.id,reference);for(let index=0;index<entries.length;index++)cases.push({cardId:c.id,name:c.name,index,label:entries[index].label??null});}
 return cases;
}
export function verifyBorrowedEntry(row){
 const c=e.card(row.cardId);assert.ok(c);const entries=e.entryAbilities(setup(),0,c.id,reference);assert.ok(entries[row.index]);assert.equal(entries[row.index].label??null,row.label);
 const s=setup();give(s,0,'battle',[M,F,T]);give(s,0,'hand',[N,H,F]);give(s,0,'grave',[N,F,B]);give(s,1,'battle',[N,N]);give(s,1,'hand',[N]);give(s,1,'grave',[c.id]);
 const before=e.physicalCards(s).length;
 s.phase='main';s.extTasks=[{op:'g13_Borrow',p:0,source:M,uid:s.players[0].battle[0].uid,incarnation:0,lastKnownPower:4000}];act(s,'toAttack');pick(s,s.players[1].grave[0].uid);
 const option=s.decision.choices[row.index];assert.ok(option.value?.entry);pick(s,option.value);drain(s);
 const all=e.physicalCards(s);assert.equal(all.length,before);assert.equal(new Set(all.map(x=>x.uid)).size,before);
 const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(restored),e.getLegalActions(s));
 return {physicalCards:before,decisions:s.actions};
}
