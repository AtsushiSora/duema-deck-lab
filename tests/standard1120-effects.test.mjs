import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ROMANO='dm30-027',COMET='dm25ex2-067',TORNADO='dm39-051';
const NATURE='dm01-108',DARK='dm01-090',WATER='dm01-083',BRAIN='dm01-052';
const BULLET='dm29-047',TWIN='dmex17-083',OTHER_KNIGHT='dm28-085',ETERNAL='dm25ex2-082';
const D2='dmr21-033',PSYCHIC='dm37-033',EDGE='dm01-048',HIGH='dm01-007';
const values=s=>s.decision.choices.map(c=>c.value);
const uidOf=v=>v?.uid??v;
const pick=(s,value)=>act(s,'extended',a=>uidOf(values(s)[a.choice])===value);
const spent=s=>s.players[0].mana.filter(x=>x.tapped).length;

function add(s,p,zone,id,props={}){
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('official full definitions, limits, images and the Romano reprint agree with the catalogue',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1120.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.equal(manifest.cards.length,3);
 for(const row of manifest.cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1120}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1120}));
 }
 assert.deepEqual(registry.resolveRows([{id:'dmc64-032',count:2}]),[{id:ROMANO,count:2}]);
});

test('Romano charges selected dark creatures, recovers spell faces and casts exactly one returned Knight Magic spell for free',()=>{
 const s=setup(),dark=add(s,0,'hand',DARK),nature=add(s,0,'hand',NATURE);
 const wrongFace=add(s,0,'hand','dmbd17-007'),inHand=add(s,0,'hand',OTHER_KNIGHT);
 const darkTwin=add(s,0,'hand','dm24bd4-007');
 const next=add(s,0,'mana',TWIN),plain=add(s,0,'mana',BRAIN),inMana=add(s,0,'mana',OTHER_KNIGHT);
 add(s,0,'mana',BULLET,{faceDown:true});
 give(s,1,'hand',[NATURE,NATURE,NATURE]);
 const romano=play(s,ROMANO);
 assert.equal(e.effectiveCard(romano,s).breaker,2);
 assert.ok(!values(s).map(uidOf).includes(wrongFace.uid));
 assert.ok(!values(s).map(uidOf).includes(nature.uid));
 pick(s,dark.uid);
 pick(s,darkTwin.uid);
 assert.ok(s.players[0].mana.some(x=>x.uid===dark.uid));
 assert.ok(s.players[0].mana.some(x=>x.uid===darkTwin.uid));
 assert.ok(!values(s).some(v=>s.players[0].mana.find(x=>x.uid===uidOf(v))?.faceDown));
 pick(s,next.uid);
 pick(s,plain.uid);
 assert.deepEqual(values(s).map(uidOf),[next.uid,null]);
 const beforeCast=spent(s);
 pick(s,next.uid);
 assert.equal(spent(s),beforeCast);
 assert.equal(s.decision.player,1);
 pick(s,uidOf(values(s)[0]));
 pick(s,true);
 pick(s,uidOf(values(s)[0]));
 assert.equal(s.players[1].hand.length,1);
 assert.ok(s.players[0].grave.some(x=>x.uid===next.uid));
 assert.ok(s.players[0].hand.some(x=>x.uid===plain.uid));
 assert.ok(s.players[0].hand.some(x=>x.uid===inHand.uid));
 assert.ok(s.players[0].mana.some(x=>x.uid===inMana.uid));
});

test('Romano can decline each stage and respects mana and spell locks',()=>{
 for(const stop of ['charge','recover','cast','manaLock','spellLock','king']){
  const s=setup(),dark=add(s,0,'hand',DARK);
  const spell=add(s,0,'mana',stop==='king'?ETERNAL:BULLET);
  if(stop==='manaLock')add(s,1,'battle','dmrp22-042');
  if(stop==='spellLock')add(s,1,'battle','dmx11-009');
  play(s,ROMANO);
  pick(s,stop==='charge'?null:dark.uid);
  if(stop==='recover')pick(s,null);
  else if(['cast','spellLock','king'].includes(stop)){
   pick(s,spell.uid);
   if(stop==='cast')pick(s,null);
   assert.ok(s.players[0].hand.some(x=>x.uid===spell.uid));
  }
  assert.equal(s.decision,null,stop);
  assert.ok(!s.players[0].grave.some(x=>x.uid===spell.uid));
  assert.equal(spent(s),7);
 }
});

test('Comet reduces both summon groups once, requires civilization even at zero and loses its aura on D2 replacement',()=>{
 const s=setup();
 const comet=play(s,COMET);
 const initial=e.card('dmr21-032'),both=e.card('dmr20-060'),name=e.card('dm26rp2-OR001');
 const tiny=e.card('dmr21-083');
 assert.equal(spent(s),3);
 assert.equal(e.summonCost(s,0,initial),2);
 assert.equal(e.summonCost(s,0,both),3);
 assert.equal(e.summonCost(s,0,name),0);
 assert.equal(e.summonCost(s,0,tiny),0);
 assert.equal(e.summonCost(s,0,e.card(ROMANO)),7);
 assert.equal(e.summonCost(s,0,e.card(BRAIN)),4);
 assert.equal(e.summonCost(s,1,both),5);
 const tinySummon=play(s,'dmr21-083');
 assert.ok(s.players[0].battle.some(x=>x.uid===tinySummon.uid));
 assert.equal(spent(s),4);
 const summoned=play(s,'dmr21-032');
 drain(s);
 assert.ok(s.players[0].battle.some(x=>x.uid===summoned.uid));
 assert.equal(spent(s),6);
 s.active=1;
 const replacement=play(s,D2);
 assert.ok(s.players[1].battle.some(x=>x.uid===replacement.uid));
 assert.ok(s.players[0].grave.some(x=>x.uid===comet.uid));
 assert.equal(e.summonCost(s,0,both),5);
});

test('Comet leaves the civilization requirement in force and can reduce an eligible colorless summon to zero (QA 49424)',()=>{
 const s=setup();
 play(s,COMET);
 give(s,0,'mana',[]);
 const tiny=add(s,0,'hand','dmr21-083');
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===tiny.uid));
 const colorless={...e.card(tiny),civ:'ゼロ',civilizations:[]};
 assert.equal(e.summonCost(s,0,colorless),0);
 assert.deepEqual(e.manaPayment([],{...colorless,cost:0}),[]);
});

test('Comet uses G Strike when added from shields without entering battle (QA 40695)',()=>{
 const s=setup();
 s.active=1;
 s.phase='attack';
 const attacker=add(s,1,'battle',NATURE),later=add(s,1,'battle',NATURE);
 give(s,0,'shields',[COMET]);
 act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 pick(s,later.uid);
 drain(s);
 assert.ok(e.attackLocked(s,1,later));
 assert.equal(later.tapped,false);
 assert.ok(s.players[0].hand.some(x=>x.cardId===COMET));
 assert.equal(s.players[0].battle.length,0);
});

test('Tornado counts only an unsealed allied Psychic in battle and uses current power for both destructions',()=>{
 for(const source of ['battle','sealed','extra','opponent']){
  const s=setup(),first=add(s,1,'battle',EDGE),second=add(s,1,'battle',NATURE);
  const buffed=add(s,1,'battle',EDGE,{powerModifiers:[{amount:1000,expires:'end',who:0}]}),high=add(s,1,'battle',HIGH);
  const psychic=add(s,source==='opponent'?1:0,source==='extra'?'extra':'battle',PSYCHIC,source==='sealed'?{sealed:true}:{});
  if(source==='sealed')add(s,0,'seals',NATURE,{faceDown:true,sealOf:psychic.uid});
  play(s,TORNADO);
  assert.ok(!values(s).map(uidOf).includes(buffed.uid));
  assert.ok(!values(s).map(uidOf).includes(high.uid));
  pick(s,first.uid);
  if(source==='battle'){
   assert.deepEqual(values(s).map(uidOf),[second.uid]);
   pick(s,second.uid);
  }
  assert.equal(s.decision,null,source);
  assert.ok(s.players[1].grave.some(x=>x.uid===first.uid));
  assert.equal(s.players[1].grave.some(x=>x.uid===second.uid),source==='battle');
 }
});

test('Tornado excludes the first creature even when its destruction is prevented',()=>{
 const s=setup();
 add(s,0,'battle',PSYCHIC);
 const first=add(s,1,'battle',EDGE,{g34Grants:[{turn:s.turn,g465DestroySafe:true}]});
 const other=add(s,1,'battle',WATER);
 play(s,TORNADO);
 pick(s,first.uid);
 assert.ok(s.players[1].battle.some(x=>x.uid===first.uid));
 assert.deepEqual(values(s).map(uidOf),[other.uid]);
 pick(s,other.uid);
 assert.ok(s.players[1].grave.some(x=>x.uid===other.uid));
});
