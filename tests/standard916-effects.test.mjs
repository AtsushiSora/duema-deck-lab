import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MUFFLER='dm10-050',OAKS='dm04-007',ARES='dm03-036';
const BODY='dm01-108',NO_ATTACK='dm27-042',CREATURE_ONLY='dm01-107',TAP_ABILITY='dm06-003';
const ONIKAMASU='dmrp01-041',SURFER='dm05-024',HAND='dm01-027',FUUJIN='dmrp22-037';
const DOKKOI='dm26rp1-009',SMOKE='dm01-093';
const restore=s=>JSON.parse(JSON.stringify(s));
const options=s=>e.getLegalActions(s);
const canEnd=s=>options(s).some(a=>a.kind==='endTurn');
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(BODY));
 return s;
}
function put(s,p,zone,id,attrs){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function main(s){
 assert.equal(s.phase,'charge');
 act(s,'skipCharge');
}
function chooseAttacker(s,x){
 assert.equal(s.decision.task.op,'g34_OpponentChooseAttacker916');
 act(s,'extended',a=>s.decision.choices[a.choice].value.uid===x.uid);
}
function destroy(s,x,spell=HAND){
 play(s,spell);
 act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
}

test('Phase 916 matches the three official definitions, original IDs, artwork and legal deck limits',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-916.json',import.meta.url)));
 assert.deepEqual(manifest.cards.map(c=>c.id),[MUFFLER,OAKS,ARES]);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of manifest.cards){
  const detail=details.cards.find(c=>c.id===row.id),card=e.card(row.id),[face]=row.faces;
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:916}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(card[key],value);
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:916}));
  assert.deepEqual([card.name,card.type,card.cost,card.power,card.civilizations,card.race,card.manaValue,card.limit],
   [row.name,'creature',face.cost,Number(face.powerText),face.civilizations,face.race,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  for(const source of [data,snapshot,details])
   assert.deepEqual(source.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
 }
 const deck={id:'phase916',name:'ターン開始とシールド',cards:[
  MUFFLER,OAKS,ARES,BODY,NO_ATTACK,CREATURE_ONLY,TAP_ABILITY,ONIKAMASU,HAND,SURFER
 ].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck(deck),[]);
 assert.equal(createCatalogue(snapshot,data.cards,details).coverage(deck).unsupported,0);
});

test('Muffler lets the opponent choose from actual legal attackers after turn-start untapping',()=>{
 let s=field();
 put(s,0,'battle',MUFFLER);
 const tap=put(s,1,'battle',TAP_ABILITY,{tapped:true});
 const protectedCreature=put(s,1,'battle',ONIKAMASU);
 const regular=put(s,1,'battle',BODY);
 put(s,1,'battle',BODY,{tapped:true,skipUntap:true});
 put(s,1,'battle',BODY,{entered:s.turn+1});
 put(s,1,'battle',NO_ATTACK);
 put(s,1,'battle',CREATURE_ONLY);
 const before=physical(s);
 end(s);
 assert.equal(s.decision.player,1);
 assert.equal(tap.tapped,false);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[tap.uid,protectedCreature.uid,regular.uid]);
 s=restore(s);
 chooseAttacker(s,tap);
 main(s);
 act(s,'toAttack');
 assert.equal(canEnd(s),false);
 assert.ok(e.effectiveCard(find(s,1,'battle',tap),s).mustAttack);
 assert.ok(!e.effectiveCard(find(s,1,'battle',regular),s).mustAttack);
 assert.ok(!options(s).some(a=>a.kind==='tapAbility'&&a.uid===tap.uid));
 attack(s,regular.uid);
 drain(s);
 assert.equal(canEnd(s),false);
 attack(s,tap.uid);
 drain(s);
 assert.equal(canEnd(s),true);
 assert.deepEqual(physical(s),before);
 end(s);
 assert.equal(s.active,0);
 assert.ok(!e.effectiveCard(find(s,1,'battle',tap),s).mustAttack);
});

test('Muffler includes a creature-only attacker when it has a legal battle target',()=>{
 const s=field(1);
 put(s,1,'battle',MUFFLER);
 const enemy=put(s,1,'battle',BODY,{tapped:true});
 const attacker=put(s,0,'battle',CREATURE_ONLY);
 end(s);
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[attacker.uid]);
 chooseAttacker(s,attacker);
 main(s);
 act(s,'toAttack');
 assert.equal(canEnd(s),false);
 assert.deepEqual(options(s).filter(a=>a.kind==='attack').map(a=>a.target),[enemy.uid]);
});

test('Muffler has no choice with no legal attackers or when its ability is ignored',()=>{
 for(const ignored of [false,true]){
  const s=field();
  put(s,0,'battle',MUFFLER);
  put(s,1,'battle',ignored?GEN:NO_ATTACK);
  end(s);
  assert.equal(s.decision,null);
  assert.equal(s.phase,'charge');
 }
});

test('Muffler preserves the chosen requirement when its source leaves',()=>{
 const s=field();
 const source=put(s,0,'battle',MUFFLER);
 const attacker=put(s,1,'battle',BODY);
 end(s);
 chooseAttacker(s,attacker);
 main(s);
 play(s,SURFER);
 act(s,'effect',a=>a.targets.some(t=>t.uid===source.uid));
 assert.ok(find(s,0,'hand',source));
 act(s,'toAttack');
 assert.equal(canEnd(s),false);
});

test('Muffler allows ending when the chosen creature loses all legal targets before attack',()=>{
 const s=field();
 put(s,0,'battle',MUFFLER);
 const target=put(s,0,'battle',BODY,{tapped:true});
 const attacker=put(s,1,'battle',CREATURE_ONLY);
 end(s);
 chooseAttacker(s,attacker);
 main(s);
 play(s,SURFER);
 act(s,'effect',a=>a.targets.some(t=>t.uid===target.uid));
 act(s,'toAttack');
 assert.ok(e.effectiveCard(attacker,s).mustAttack);
 assert.equal(canEnd(s),true);
});

for(const id of [OAKS,ARES]){
 test(id+' replaces the attempted grave move with one new face-down shield',()=>{
  const s=field(1);
  const x=put(s,0,'battle',id);
  const before=physical(s),shieldCount=s.players[0].shields.length;
  destroy(s,x,id===OAKS?HAND:SMOKE);
  const shield=find(s,0,'shields',x);
  assert.ok(shield&&!shield.faceUp);
  assert.equal(s.players[0].shields.length,shieldCount+1);
  assert.ok(!find(s,0,'grave',x)&&!find(s,0,'battle',x));
  assert.deepEqual(physical(s).filter(uid=>before.includes(uid)),before);
 });

 test(id+' moves to hand normally when returned from the battle zone',()=>{
  const s=field(1),x=put(s,0,'battle',id);
  play(s,SURFER);
  act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
  assert.ok(find(s,0,'hand',x));
  assert.ok(!find(s,0,'shields',x));
 });

 test(id+' goes to the graveyard when its controller cannot add shields',()=>{
  const s=field(),x=put(s,0,'battle',id);
  put(s,1,'battle',FUUJIN,{tapped:true});
  const target=put(s,1,'battle',BODY,{tapped:true});
  attack(s,x.uid,target.uid);
  drain(s);
  assert.ok(find(s,0,'grave',x));
  assert.ok(!find(s,0,'shields',x));
 });
}

test('Oaks and Ares can choose one of the competing mandatory replacements after saving',()=>{
 for(const useShield of [false,true]){
  let s=field(1);
  const x=put(s,0,'battle',useShield?ARES:OAKS);
  put(s,0,'battle',DOKKOI);
  destroy(s,x);
  s=restore(s);
  assert.equal(s.decision.type,'leaveReplace');
  assert.equal(s.decision.player,0);
  assert.ok(!options(s).some(a=>a.kind==='allowLeave'));
  if(useShield)act(s,'replaceShield842');
  else act(s,'g47Replace',a=>a.choice.to==='hand');
  assert.ok(find(s,0,useShield?'shields':'hand',x));
  assert.ok(!find(s,0,'grave',x));
 }
});

test('Genmu suppresses the five-cost Oaks and the six-cost Ares retains its replacement',()=>{
 const s=field(1);
 const oaks=put(s,0,'battle',OAKS),ares=put(s,0,'battle',ARES);
 put(s,1,'battle',GEN);
 destroy(s,oaks);
 destroy(s,ares);
 assert.ok(find(s,0,'grave',oaks));
 assert.ok(find(s,0,'shields',ares));
});

test('Oaks and Ares become separate new shields when they lose the same battle',()=>{
 const s=field(),oaks=put(s,0,'battle',OAKS),ares=put(s,1,'battle',ARES,{tapped:true});
 const before=physical(s);
 attack(s,oaks.uid,ares.uid);
 drain(s);
 for(const [p,x] of [[0,oaks],[1,ares]]){
  const shield=find(s,p,'shields',x);
  assert.ok(shield&&!shield.faceUp);
  assert.ok(!find(s,p,'grave',x));
 }
 assert.deepEqual(physical(s),before);
});
