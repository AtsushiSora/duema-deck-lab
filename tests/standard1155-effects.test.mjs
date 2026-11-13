import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const FEINT='dmrp09-074',AMOEBA='dm13-040',REIKAN='dmex08-057',HAUKS='dm06-025';
const FIRE='dm01-097',WATER='dm01-083',LIGHT='dm01-075',BIG='dm21-053';
const CLASH='dmrp19-085',BLOCKER='dm10-082',SLAYER='dm10-089';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,v)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===v;
});
const fight=(s,a,b)=>{
 cast(s,CLASH);
 pick(s,a.uid);
 pick(s,b.uid);
};
const noBlock=s=>act(s,'noBlock');
const boost=amount=>[{amount,expires:'end',who:0}];

test('phase 1155 matches four official definitions and both Hauks print aliases',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1155.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[FEINT,AMOEBA,REIKAN,HAUKS]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmex08-196',HAUKS],['promoy2-001',HAUKS]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1155}),row.spec);
  assert.equal(c.cost,f.cost);
  assert.equal(c.power,parseInt(f.powerText,10));
  assert.equal(c.manaValue,1);
  assert.equal(c.limit,m.regulationVerification.limits[row.id]);
  assert.deepEqual(c.civilizations,f.civilizations);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
 }
});

for(const result of ['win','loss','tie'])test('Feint follows the outcome of an effect battle '+result,()=>{
 const s=setup(),feint=put(s,0,FEINT);
 const other=result==='win'?put(s,1,FIRE):put(s,1,BIG,{powerModifiers:boost(result==='loss'?2000:1000)});
 fight(s,feint,other);
 drain(s);
 assert.equal(has(s,0,'hand',feint),result==='win');
 assert.equal(has(s,1,'hand',other),result==='loss');
 assert.equal(has(s,0,'grave',feint),result!=='win');
 assert.equal(has(s,1,'grave',other),result!=='loss');
});

test('Feint returns the winner after its battle-win draw',()=>{
 const s=setup(),feint=put(s,0,FEINT),winner=put(s,1,'promoy14-044',{powerModifiers:boost(2000)});
 const top=s.players[1].deck[0];
 fight(s,feint,winner);
 drain(s);
 assert.ok(has(s,0,'grave',feint)&&has(s,1,'hand',winner)&&has(s,1,'hand',top));
 const draw=s.log.findIndex(l=>l.type==='draw'&&l.player===1);
 const bounce=s.log.findIndex(l=>l.type==='afterBattle'&&l.cardId===FEINT);
 assert.ok(draw>=0&&bounce>draw);
});

test('Feint returns both survivors when both creatures are forced to win',()=>{
 const s=setup(),feint=put(s,0,FEINT),opponent=put(s,1,'dm26rp3-S008');
 feint.g34Grants=[{turn:s.turn,g34AlwaysWin:true}];
 fight(s,feint,opponent);
 drain(s);
 assert.ok(has(s,0,'hand',feint)&&has(s,1,'hand',opponent));
});

test('Amoeba resolves its delayed ability after the Hauks destruction trigger',()=>{
 const s=setup(),h=put(s,0,HAUKS),amoeba=put(s,1,AMOEBA,{tapped:true,powerModifiers:boost(5000)});
 const other=inst(WATER);
 s.players[0].hand.push(other);
 attack(s,h.uid,amoeba.uid);
 noBlock(s);
 drain(s);
 assert.ok(has(s,0,'grave',h)&&has(s,0,'grave',other)&&has(s,1,'battle',amoeba));
});

test('Amoeba returns the surviving attacker even if another creature blocks (QA 35250)',()=>{
 const s=setup(),attacker=put(s,0,BIG),amoeba=put(s,1,AMOEBA,{tapped:true});
 const blocker=put(s,1,BLOCKER);
 attack(s,attacker.uid,amoeba.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.ok(has(s,1,'battle',amoeba)&&has(s,1,'grave',blocker)&&has(s,0,'hand',attacker));
});

for(const boosted of [false,true])test('Amoeba does not return a defeated attacker (QA 35249) '+boosted,()=>{
 const s=setup(),attacker=put(s,0,FIRE),amoeba=put(s,1,AMOEBA,{tapped:true,powerModifiers:boost(boosted?2000:0)});
 attack(s,attacker.uid,amoeba.uid);
 noBlock(s);
 drain(s);
 assert.equal(has(s,0,'grave',attacker),boosted);
 assert.equal(has(s,0,'hand',attacker),!boosted);
 assert.equal(has(s,1,'battle',amoeba),boosted);
});

for(const slay of [false,true])test('Amoeba and Slayer can resolve in either order (QA 35251) '+slay,()=>{
 let s=setup();
 const attacker=put(s,0,FIRE),amoeba=put(s,1,AMOEBA,{tapped:true});
 put(s,1,SLAYER);
 attack(s,attacker.uid,amoeba.uid);
 noBlock(s);
 assert.equal(s.decision.type,'battleWinOrder');
 assert.equal(s.decision.player,1);
 assert.equal(e.getLegalActions(s).length,2);
 s=JSON.parse(JSON.stringify(s));
 act(s,'battleWinOrder',a=>a.winIndex===(slay?0:1));
 drain(s);
 assert.ok(has(s,1,'grave',amoeba)&&has(s,0,slay?'grave':'hand',attacker));
});

test('Reikan counts both battle zones and itself, skipping sealed cards and evolution sources',()=>{
 const s=setup(),han='dmrp06-057';
 put(s,0,han);
 put(s,1,'dmr21-038');
 const sealed=put(s,1,han,{sealed:true});
 s.players[1].seals.push({...inst(LIGHT),faceDown:true,sealOf:sealed.uid});
 put(s,1,LIGHT,{under:[inst(han)]});
 give(s,0,'hand',[han]);
 give(s,0,'grave',[han]);
 give(s,0,'deck',[LIGHT,FIRE,WATER,LIGHT,FIRE]);
 const expected=s.players[0].deck.slice(0,3);
 cast(s,REIKAN);
 for(let i=0;i<3;i++)pick(s,true);
 assert.equal(s.decision,null);
 assert.ok(expected.every(x=>has(s,0,'hand',x)));
 assert.equal(s.players[0].hand.length,4);
});

test('Reikan can stop after one draw',()=>{
 const s=setup();
 put(s,1,'dmrp06-057');
 cast(s,REIKAN);
 pick(s,true);
 pick(s,null);
 assert.equal(s.players[0].hand.length,1);
});

for(const destroy of [false,true])test('Hauks clears both hands only when it is destroyed '+destroy,()=>{
 const s=setup(),h=put(s,1,HAUKS);
 give(s,0,'hand',[FIRE,WATER]);
 give(s,1,'hand',[WATER,LIGHT]);
 const hands=s.players.map(p=>[...p.hand]);
 cast(s,destroy?'dm01-027':'dm01-086');
 act(s,'effect',a=>a.targets.some(x=>x.uid===h.uid));
 drain(s);
 if(destroy){
  assert.ok(has(s,1,'grave',h));
  for(const p of [0,1]){
   assert.equal(s.players[p].hand.length,0);
   assert.ok(hands[p].every(x=>has(s,p,'grave',x)));
  }
 }else{
  assert.ok(has(s,1,'hand',h));
  for(const p of [0,1])assert.ok(hands[p].every(x=>has(s,p,'hand',x)));
 }
});
