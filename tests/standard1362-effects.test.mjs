import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,drain,e,give,inst,setup,data,details,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KEN='dm35-004',GOU='dmex18-023',WHITE='dm29-048',TIGER='dm37-015',SISHIGAMI='dm29-004';
const AREA='dmr21-004',HAND='dm01-027',FROG='dm38-009',KUBRICK='dmr08s-005',NOTHING='dmex15-b025';
const FIRE='dm01-097',SLAYER='dm10-064',AURA='dmsd09-013',GR='dmrp09-m01';

const add=(s,p,zone,id,props={})=>{
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
};
const pick=(s,value)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
const target=(s,uid)=>act(s,'effect',a=>a.targets.some(x=>x.uid===uid));
const play=(s,id)=>{
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
};
function field({area=false,active=1}={}){
 const s=setup();s.active=active;s.turn=3;
 const ken=add(s,0,'battle',KEN,{under:[{...inst(GOU),under:[inst(TIGER)]}]});
 if(area){s.active=0;play(s,AREA);s.active=active;}
 return {s,ken};
}

test('the three names and reprints match their verified card data',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1362.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId||row.id;
  const detail=(row.canonicalId?details.printAliases:details.cards).find(x=>x.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1362}),row.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.equal(CARD_IMAGES[id],manifest.cards.find(x=>x.id===id).image);
  assert.equal(e.card(id).limit,manifest.regulationVerification.limits[row.id]);
 }
});

test('Soul Shift uses the selected matching top cards and quotes affordable choices (QA40885)',()=>{
 let s=setup();
 const nested=add(s,0,'battle',WHITE,{under:[inst(TIGER)]});
 const second=add(s,0,'battle',TIGER);
 const wrong=add(s,0,'battle',FIRE);
 const gou=add(s,0,'hand',GOU);
 const quote=ids=>e.summonCost(s,0,{...e.card(GOU),g27BaseUid:ids});
 assert.equal(quote([nested.uid]),12);
 assert.equal(quote([nested.uid,second.uid]),5);
 give(s,0,'mana',Array(5).fill(FIRE));
 assert.equal(e.getLegalActions(s).find(x=>x.uid===gou.uid)?.cost,5);
 act(s,'play',a=>a.uid===gou.uid);
 assert.ok(!s.decision.choices.some(x=>x.value===wrong.uid));
 pick(s,nested.uid);
 assert.ok(!s.decision.choices.some(x=>x.value===null));
 s=structuredClone(s);
 pick(s,second.uid);
 pick(s,null);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
 assert.deepEqual(s.players[0].battle.find(x=>x.uid===gou.uid).under.map(x=>x.uid),[nested.uid,second.uid]);
});

test('multi-base Soul Shift has a floor of one and can cancel without spending mana',()=>{
 const s=setup(),first=add(s,0,'battle',SISHIGAMI),second=add(s,0,'battle',SISHIGAMI);
 give(s,0,'mana',[FIRE]);
 const gou=play(s,GOU);
 pick(s,first.uid);
 pick(s,'cancel');
 assert.equal(s.players[0].mana[0].tapped,false);
 assert.ok(s.players[0].hand.includes(gou));
 act(s,'play',a=>a.uid===gou.uid);
 pick(s,first.uid);
 pick(s,second.uid);
 pick(s,null);
 assert.ok(s.players[0].mana[0].tapped);
});

test('Kengeki can use only a named Gouken evolution base and pays eight',()=>{
 const s=setup(),gou=add(s,0,'battle',GOU,{under:[inst(WHITE)]}),ken=add(s,0,'hand',KEN);
 add(s,0,'battle',TIGER);
 give(s,0,'mana',Array(7).fill(FIRE));
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===ken.uid));
 s.players[0].mana.push(inst(FIRE));
 act(s,'play',a=>a.uid===ken.uid&&a.cost===8);
 act(s,'evolve',a=>a.baseUid===gou.uid&&a.cost===8);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,8);
 assert.deepEqual(ken.under.map(x=>x.uid),[gou.uid]);
});

test('Gouken privately looks at seven, evolves while attacking, and shuffles',()=>{
 const s=setup(),gou=add(s,0,'battle',GOU,{under:[inst(WHITE)]});
 give(s,0,'deck',[FIRE,FIRE,FIRE,KEN,FIRE,FIRE,FIRE,KEN,FIRE]);
 const pickable=s.players[0].deck[3],hidden=s.players[0].deck[7],rng=s.rng;
 attack(s,gou.uid);
 assert.ok(s.decision.choices.some(x=>x.value===pickable.uid));
 assert.ok(!s.decision.choices.some(x=>x.value===hidden.uid));
 pick(s,pickable.uid);
 assert.ok(s.players[0].battle.includes(pickable));
 assert.equal(pickable.under[0].uid,gou.uid);
 assert.equal(pickable.tapped,true);
 assert.equal(s.attack?.attacker,pickable.uid);
 assert.notEqual(s.rng,rng);
 assert.equal(s.players[0].g34Protected.length,0);
 assert.ok(s.log.some(x=>x.type==='look'&&x.cardId===GOU));
});

test('Gouken can decline the evolution and still shuffles',()=>{
 const s=setup(),gou=add(s,0,'battle',GOU,{under:[inst(WHITE)]});
 give(s,0,'deck',[KEN,FIRE,FIRE,FIRE,FIRE,FIRE,FIRE,FIRE]);
 const rng=s.rng;
 attack(s,gou.uid);
 pick(s,null);
 assert.equal(s.attack?.attacker,gou.uid);
 assert.notEqual(s.rng,rng);
 assert.ok(s.players[0].deck.some(x=>x.cardId===KEN));
});

test('opposing spell removal wins, while Dokindam Area seals first (QA40956)',()=>{
 for(const area of [false,true]){
  const {s,ken}=field({area});
  play(s,HAND);
  target(s,ken.uid);
  assert.equal(s.winner,area?null:0);
  if(area){
   assert.ok(s.players[0].battle.includes(ken));
   assert.equal(ken.sealed,true);
   assert.equal(s.players[0].seals[0].sealOf,ken.uid);
  }else assert.ok(s.players[0].battle.includes(ken));
 }
});

test('zero power from opposing Eternal Nothing does not grant a win (QA40960)',()=>{
 const {s,ken}=field();
 play(s,NOTHING);
 drain(s);
 assert.ok(s.players[0].grave.includes(ken));
 assert.equal(s.winner,null);
});

test('Kerodi Frog keeps battlefield provenance after it leaves (QA40959)',()=>{
 const {s,ken}=field({active:0});
 const frog=add(s,1,'battle',FROG);
 play(s,HAND);
 target(s,frog.uid);
 assert.ok(s.players[1].grave.includes(frog));
 pick(s,ken.uid);
 assert.equal(s.winner,0);
});

test('Kubrick triggered in the graveyard does not grant a win (QA40957)',()=>{
 const {s,ken}=field();
 const kubrick=add(s,1,'hand',KUBRICK);
 play(s,'dm11-043');
 pick(s,0);
 pick(s,kubrick.uid);
 pick(s,ken.uid);
 assert.ok(s.players[0].hand.includes(ken));
 assert.equal(s.winner,null);
});

test('Slayer grants the win after its source loses the battle (old QA35986)',()=>{
 const {s,ken}=field({active:0});
 const slayer=add(s,1,'battle',SLAYER,{tapped:true});
 attack(s,ken.uid,slayer.uid);
 drain(s);
 assert.ok(s.players[1].grave.includes(slayer));
 assert.equal(s.winner,0);
});

test('an opposing creature entry effect still wins after resuming the target prompt',()=>{
 let {s,ken}=field();
 play(s,'dm05-024');
 assert.equal(s.decision.creatureOrigin,1);
 s=JSON.parse(JSON.stringify(s));
 target(s,ken.uid);
 assert.equal(s.winner,0);
});

test('Nyamibaun grants its GR host power; its optional bounce does not grant Kengeki a win (QA38763)',()=>{
 const {s,ken}=field();
 s.format='advance';s.players[1].gr=[];
 const host=add(s,1,'battle',GR);
 const before=e.power(host,false,s);
 const aura=play(s,AURA);
 act(s,'attachAura1352',a=>a.uid===host.uid);
 assert.equal(e.power(host,false,s),before+2000);
 pick(s,ken.uid);
 assert.equal(s.winner,null);
 assert.ok(s.players[0].hand.includes(ken));
 assert.ok(s.players[1].battle.includes(aura));
});

test('Nyamibaun can use an S-Trigger, summon its GR host, and decline the bounce',()=>{
 const {s,ken}=field({active:0});
 s.format='advance';
 give(s,1,'shields',[AURA]);
 give(s,1,'gr',[GR]);
 const gr=s.players[1].gr[0];
 attack(s,ken.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='shieldBreak')act(s,'breakShield');
 act(s,'useTrigger',a=>a.cardId===AURA);
 act(s,'grAura1352');
 pick(s,null);
 assert.ok(s.players[1].battle.includes(gr));
 assert.ok(s.players[1].battle.some(x=>x.cardId===AURA&&x.auraTo1352.uid===gr.uid));
 assert.equal(s.players[1].mana.some(x=>x.tapped),false);
});

test('Kengeki put into the grave from a seal was never a battlefield creature (QA33286)',()=>{
 const s=setup();s.format='advance';s.active=1;
 const field=add(s,0,'battle',AREA);
 const host=add(s,0,'battle',FIRE,{sealed:true});
 const seals=Array.from({length:6},(_,i)=>add(s,0,'seals',i===0?KEN:FIRE,{sealOf:host.uid,faceDown:true}));
 act(s,'toAttack');
 act(s,'endTurn');
 pick(s,true);
 for(const seal of seals)pick(s,seal.uid);
 assert.ok(field.g1175DSwitched);
 assert.ok(s.players[0].grave.includes(seals[0]));
 assert.equal(s.winner,null);
});

test('Tizoris does not duplicate the departure victory (QA41280)',()=>{
 const {s,ken}=field();
 add(s,0,'battle','dmrp12-008');
 play(s,HAND);
 target(s,ken.uid);
 assert.equal(s.winner,0);
 assert.equal(s.log.filter(x=>x.type==='finish').length,1);
 assert.ok(!s.pendingEffects?.some(entry=>entry.source===KEN));
});

test('losing a normal battle does not grant Kengeki a win (old QA35985)',()=>{
 const {s,ken}=field({active:0});
 const enemy=add(s,1,'battle','dmrp19-km1',{tapped:true,under:[inst(FIRE)]});
 attack(s,ken.uid,enemy.uid);
 drain(s);
 assert.ok(s.players[0].grave.includes(ken));
 assert.equal(s.winner,null);
});

test('a defeat replacement resumes the original departure without retrying the victory',()=>{
 let {s,ken}=field({active:0});
 const blade=add(s,1,'hand','dmrp16-s10');
 const frog=add(s,1,'battle',FROG);
 play(s,HAND);
 target(s,frog.uid);
 pick(s,ken.uid);
 assert.ok(s.players[0].battle.includes(ken));
 assert.ok(s.lossEvent);
 s=JSON.parse(JSON.stringify(s));
 pick(s,blade.uid);
 assert.ok(s.players[0].hand.some(x=>x.uid===ken.uid));
 assert.equal(s.players[1].deck.at(-1).uid,blade.uid);
 assert.equal(s.lossEvent,undefined);
 assert.equal(s.winner,null);
});
