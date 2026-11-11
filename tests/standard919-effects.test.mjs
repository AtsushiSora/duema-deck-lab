import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KEJIME='dmrp05-060',AURORA='dm03-020',BENZO='dm10-088';
const NATURE='dm01-108',FIRE='dm01-097',DARK='dm01-090',WATER='dm01-083',LIGHT='dm01-075';
const HAND='dm01-027',SURFER='dm05-024',MULTI='dmrp20-027',PLUS='dm28-074',HANZAI='dmrp16-013';
const EX_LIFE='dmrp17-s07',FUUJIN='dmrp22-037',REDIRECT='dmrp22-033';
const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}
function put(s,p,zone,id,attrs){
 const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;
}
function pick(s,x){
 act(s,'extended',a=>{const value=s.decision.choices[a.choice].value;return (value?.uid??value)===(x?.uid??null);});
}
function attack(s,x){
 if(s.phase==='main')act(s,'toAttack');
 act(s,'attack',a=>a.uid===x.uid&&a.target==='player');
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
}

test('Phase 919 verifies complete card faces, six reprints and distinct Twinpact identities',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-919.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[KEJIME,AURORA,BENZO]);
 assert.equal(m.printAliases.length,6);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,original=m.cards.find(c=>c.id===id),c=e.card(id),[f]=row.faces;
  assert.equal(cat.get(row.id).id,id);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.ok(row.verification.facesMatched);
  const detail={...details.cards.find(c=>c.id===id),id:row.id,faces:row.faces};
  assert.deepEqual(standardCardSpec(detail,{phase:919}),original.spec);
  const tampered=structuredClone(detail);tampered.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(tampered,{phase:919}));
  for(const [k,v] of Object.entries(original.spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   [id===AURORA?'spell':'creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  const ref=refs.find(c=>c.id===row.id);
  assert.deepEqual([ref.canonicalId,ref.image],[id,row.image]);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(row.faces,details.cards.find(c=>c.id===id).faces);
   for(const source of [data,snapshot,details])
    assert.deepEqual(source.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  }
 }
 for(const [id,paired] of [[AURORA,'dmex04-047'],[BENZO,'dm22ex1-061']]){
  assert.equal(cat.get(paired).id,paired);
  assert.notEqual(nameKey(cat.get(id).name),nameKey(cat.get(paired).name));
  assert.ok(!data.cards.some(c=>c.id===paired));
 }
 const deck={id:'phase919',name:'シールド操作',cards:['dmsd07-012','dmx12b-082','dmr20-056',NATURE,FIRE,DARK,WATER,LIGHT,HAND,SURFER]
  .map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

test('Kejime gets +3000 per simultaneous placement, breaks exactly two shields, and resets at end of turn',()=>{
 const s=field(),x=put(s,0,'battle',KEJIME),opp=put(s,1,'battle',KEJIME);
 assert.equal(e.power(x,false,s),4000);
 const original=s.players[0].shields[0];
 play(s,HANZAI);pick(s,original);
 assert.equal(s.pendingEffects.filter(q=>q.source===KEJIME).length,2);
 drain(s);
 assert.equal(e.power(x,false,s),10000);
 assert.equal(e.power(x,true,s),10000);
 assert.equal(e.power(opp,false,s),4000);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 const old=s.players[1].shields.length;
 attack(s,x);
 assert.equal(s.players[1].shields.length,old-2);
 act(s,'endTurn');
 assert.equal(e.power(x,false,s),4000);
 assert.ok((e.effectiveCard(x,s).breaker??1)===1);
});

test('Kejime may use its W-breaker when another effect grants it T-breaker',()=>{
 const s=field(),x=put(s,0,'battle',KEJIME);
 play(s,PLUS);pick(s,s.players[0].shields[0]);drain(s);
 const triple=put(s,0,'hand','dmex15-b032');
 act(s,'play',a=>a.uid===triple.uid&&a.face===1&&!a.alternative);
 assert.equal(e.power(x,false,s),15000);
 assert.equal(e.effectiveCard(x,s).breaker,3);
 act(s,'toAttack');act(s,'attack',a=>a.uid===x.uid&&a.target==='player');
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_GrantedBreaker633');
 assert.deepEqual(s.decision.choices.map(o=>o.value),[2,3]);
 act(s,'extended',a=>s.decision.choices[a.choice].value===2);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Kejime reacts to an opponent-turn placement and to a new card on an existing shield',()=>{
 const s=field(1),x=put(s,0,'battle',KEJIME),owned=s.players[0].shields[0];
 const seal=put(s,0,'seals',DARK,{faceDown:true,sealOf:x.uid});x.sealed=true;
 play(s,'dmrp21-010');pick(s,seal);drain(s);
 assert.ok(find(s,0,'shields',seal));
 assert.equal(e.power(x,false,s),7000);
 act(s,'toAttack');act(s,'endTurn');
 assert.equal(e.power(x,false,s),4000);
 act(s,'skipCharge');play(s,PLUS);pick(s,owned);drain(s);
 assert.equal(owned.shieldStack.length,1);
 assert.equal(e.power(x,false,s),7000);
});

test('Kejime is unaffected by prohibited shield placement and cannot trigger when ignored',()=>{
 for(const id of [FUUJIN,GEN]){
  const s=field(),x=put(s,0,'battle',KEJIME);
  put(s,1,'battle',id);
  play(s,EX_LIFE);drain(s);
  assert.equal(s.players[0].shields.length,id===FUUJIN?5:6);
  assert.equal(e.power(x,false,s),4000);
  assert.ok((e.effectiveCard(x,s).breaker??1)===1);
 }
});

test('Aurora lets its caster stop at zero, including when the caster has no shields',()=>{
 for(const n of [0,3]){
  const s=field(1);give(s,1,'shields',Array(n).fill(NATURE));
  const original=s.players[1].shields.map(x=>x.uid),before=s.players[1].mana.length;
  const spell=play(s,AURORA);
  if(n){
   assert.equal(s.decision.player,1);
   assert.ok(s.decision.choices.every(o=>!o.cardId));
   assert.match(s.decision.choices.find(o=>o.value===null).label,/選ばず/);
   pick(s,null);
  }
  assert.equal(s.decision,null);
  assert.deepEqual(s.players[1].shields.map(x=>x.uid),original);
  assert.equal(s.players[1].mana.length,before);
  assert.ok(find(s,1,'grave',spell));
 }
});

test('Aurora moves multiple distinct shields and every card in their stacks together after resuming a choice',()=>{
 let s=field(1);
 const [a,b,left]=s.players[1].shields;
 const multi=inst(MULTI),trigger=inst(HAND);
 a.shieldStack=[multi,trigger];
 b.faceUp=true;
 const opp=s.players[0].shields.map(x=>x.uid),mana=s.players[1].mana.length,spell=play(s,AURORA),all=physical(s);
 assert.deepEqual(s.decision.choices.filter(o=>o.cardId).map(o=>o.value),[b.uid]);
 pick(s,a);
 assert.ok(!s.decision.choices.some(o=>o.value===a.uid));
 assert.equal(s.players[1].mana.length,mana);
 assert.equal(s.players[1].shields.length,5);
 s=JSON.parse(JSON.stringify(s));
 pick(s,b);
 assert.equal(s.players[1].mana.length,mana);
 assert.match(s.decision.choices.find(o=>o.value===null).label,/2つをマナに置く/);
 pick(s,null);
 for(const x of [a,b,trigger,multi]){
  const y=find(s,1,'mana',x);assert.ok(y&&!y.faceDown&&!y.faceUp);
  assert.equal(y.tapped,x.uid===multi.uid);
 }
 assert.ok(find(s,1,'shields',left)&&find(s,1,'grave',spell));
 assert.deepEqual(s.players[0].shields.map(x=>x.uid),opp);
 assert.equal(s.metrics[1].triggers,0);
 assert.equal(s.decision,null);
 assert.deepEqual(physical(s),all);
});

test('Aurora can choose all shields and applies existing mana redirection',()=>{
 const s=field();put(s,1,'battle',REDIRECT);
 give(s,0,'shields',[HAND,MULTI,NATURE]);
 const selected=[...s.players[0].shields],mana=s.players[0].mana.length;
 play(s,AURORA);
 for(const x of selected)pick(s,x);
 assert.equal(s.decision,null);
 assert.ok(selected.every(x=>find(s,0,'grave',x)));
 assert.equal(s.players[0].mana.length,mana);
 assert.equal(s.players[0].shields.length,0);
 assert.equal(s.metrics[0].triggers,0);
});

test('Benzo must take one own shield, and its stacked trigger declarations may be used or declined',()=>{
 let s=field(1);
 const root=s.players[1].shields[0],trigger=inst(HAND),declined=inst(SURFER);
 root.shieldStack=[trigger,declined];
 const enemy=put(s,0,'battle',NATURE),benzo=play(s,BENZO),all=physical(s);
 const before=s.metrics[1].breaks;
 assert.equal(s.decision.player,1);
 assert.ok(s.decision.choices.every(o=>o.value&&!o.cardId));
 s=JSON.parse(JSON.stringify(s));
 pick(s,root);
 assert.equal(s.metrics[1].breaks,before);
 assert.equal(s.players[1].shields.length,4);
 assert.equal(s.players[0].shields.length,5);
 assert.equal(s.decision.uid,trigger.uid);
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 assert.equal(s.decision.uid,declined.uid);
 act(s,'skipTrigger');
 act(s,'effect',a=>a.targets.some(t=>t.uid===enemy.uid));
 assert.ok(find(s,0,'grave',enemy)&&find(s,1,'grave',trigger));
 assert.ok(find(s,1,'hand',root)&&find(s,1,'hand',declined)&&find(s,1,'battle',benzo));
 assert.equal(s.players[1].mana.filter(x=>x.tapped).length,4);
 assert.deepEqual(physical(s),all);
});

test('Benzo ends its entry effect when there is no own shield',()=>{
 const s=field();give(s,0,'shields',[]);
 const x=play(s,BENZO);
 assert.ok(find(s,0,'battle',x));
 assert.equal(s.decision,null);
 assert.equal(s.players[1].shields.length,5);
});
