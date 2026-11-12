import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const DOKAN='promoy14-013',MASAMUNE='dmx11-030',JAYANAGI='dm36-035';
const HUMANOID='dm01-097',NATURE='dm01-108',WATER='dm01-083',SOUL='dm36-106',MARUPIA='dm24rp4-050';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const ids=xs=>xs.map(x=>x.uid);
const physical=s=>ids(e.physicalCards(s)).sort();
const restore=s=>decodeBattleData(encodeBattleData(s));
const bonus=(s,x)=>e.effectiveCard(x,s).extraBreak??0;

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,x){
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function evolve(s,source,base){
 play(s,source);
 assert.equal(s.decision.type,'evolution');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.deepEqual(ids(source.under),[base.uid]);
}
function finishAttack(s,expected){
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.length===expected);
 drain(s);
}

test('Three evolution creatures match their verified text, canonical IDs, images and limits',()=>{
 const m=read('tools/support-phase-1074.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(r=>r.id),[DOKAN,MASAMUNE,JAYANAGI]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.ok(row.verification.facesMatched&&cat.get(row.id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1074}),row.spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,c.civ,c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizationText,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id:row.id,count:1}]);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[row.id,row.image]]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
 }
 assert.deepEqual(e.card(JAYANAGI).g558Souls,['W']);
});

test('Dokan evolves from Fire and grants two extra breaks to other allies at two shield groups',()=>{
 let s=field();
 const source=add(s,0,'hand',DOKAN),base=add(s,0,'battle',HUMANOID);
 const ally=add(s,0,'battle',WATER),enemy=add(s,1,'battle',HUMANOID);
 const [first,second,third]=give(s,0,'shields',[NATURE,NATURE,NATURE]);
 first.shieldStack=[inst(NATURE)];
 const all=physical(s);
 evolve(s,source,base);
 assert.equal(e.card(source).breaker,3);
 assert.equal(bonus(s,ally),0);
 s.players[0].shields=[first,second];
 s.players[0].hand.push(third);
 assert.equal(bonus(s,source),0);
 assert.equal(bonus(s,enemy),0);
 assert.equal(bonus(s,ally),2);
 attack(s,ally.uid);
 s=restore(s);
 finishAttack(s,3);
 assert.equal(s.players[1].shields.length,2);
 assert.deepEqual(physical(s),all);
});

test('Dokan increases a break performed by an allied creature ability',()=>{
 const s=field();
 const source=add(s,0,'battle',DOKAN,{under:[inst(HUMANOID)]});
 give(s,0,'shields',[NATURE]);
 const marupia=add(s,0,'hand',MARUPIA);
 play(s,marupia);
 assert.ok(s.decision?.choices.some(o=>o.label.includes('ブレイク')));
 act(s,'extended',a=>s.decision.choices[a.choice].label.includes('ブレイク'));
 assert.equal(s.decision?.task.op,'g34_Break497');
 for(const shield of s.players[1].shields.slice(0,3)){
  act(s,'extended',a=>s.decision.choices[a.choice].value===shield.uid);
 }
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 assert.equal(bonus(s,source),0);
});

test('Masamune grants another Humanoid an extra break once Masamune attacks and taps',()=>{
 const s=field();
 const source=add(s,0,'hand',MASAMUNE),base=add(s,0,'battle',HUMANOID);
 const other=add(s,0,'battle',WATER),enemy=add(s,1,'battle',HUMANOID);
 evolve(s,source,base);
 const ally=add(s,0,'battle',HUMANOID);
 give(s,1,'shields',Array(6).fill(NATURE));
 assert.equal(bonus(s,ally),0);
 attack(s,source.uid);
 finishAttack(s,2);
 assert.equal(s.players[1].shields.length,4);
 assert.equal(bonus(s,ally),1);
 assert.equal(bonus(s,other),0);
 assert.equal(bonus(s,enemy),0);
 assert.equal(bonus(s,source),0);
 attack(s,ally.uid);
 finishAttack(s,2);
 assert.equal(s.players[1].shields.length,2);
 source.tapped=false;
 assert.equal(bonus(s,ally),0);
});

test('Jayanagi evolves from a W Soul and adds a break to an ignored ally with a printed W Soul',()=>{
 const s=field();
 const source=add(s,0,'hand',JAYANAGI),base=add(s,0,'battle',SOUL);
 const other=add(s,0,'battle',NATURE,{under:[inst(SOUL)]});
 const enemy=add(s,1,'battle',SOUL);
 evolve(s,source,base);
 const ally=add(s,0,'battle',SOUL,{g35Ignored:s.turn});
 assert.equal(e.card(source).breaker,2);
 assert.equal(bonus(s,source),0);
 assert.equal(bonus(s,ally),1);
 assert.equal(bonus(s,enemy),0);
 assert.equal(bonus(s,other),0);
 attack(s,ally.uid);
 finishAttack(s,2);
 assert.equal(s.players[1].shields.length,3);
 source.g35Ignored=s.turn;
 assert.equal(bonus(s,ally),0);
});

test('Two live Jayanagi sources add their effects and have W Soul themselves',()=>{
 const s=field();
 const a=add(s,0,'battle',JAYANAGI,{under:[inst(SOUL)]});
 const b=add(s,0,'battle',JAYANAGI,{under:[inst(SOUL)]});
 const ally=add(s,0,'battle',SOUL);
 assert.deepEqual([bonus(s,a),bonus(s,b),bonus(s,ally)],[1,1,2]);
 a.sealed=true;
 assert.equal(bonus(s,ally),1);
});
