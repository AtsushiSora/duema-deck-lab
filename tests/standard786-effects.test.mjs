import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-786.json',import.meta.url)));
const GACHA="dm24rp1-019",PETEN="dm25rp4-010",ROYAL="dm25rp2-076";
const BODY="dm01-108",FIRE="dm01-097",SPELL="dm01-110";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 786 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:786}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:786}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:786}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const HEAVY='dm01-001',PANE='dm24rp2-009',EINE='dm24rp2-015',NEO='dm25rp2-012',GNEO='dm25rp4-DM1';
const FIVE='dm01-036',NINGYO='dmrp22-033';
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);

test('Gachack summons from an S-Trigger and revives a creature of the chosen untapped target’s cost',()=>{
 const s=setup(),attacker=put(s,1,'battle',FIRE),target=put(s,1,'battle',FIVE);
 const revive=put(s,0,'grave',FIVE),overCost=put(s,0,'grave',HEAVY);
 s.active=1;
 give(s,0,'shields',[GACHA]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.deepEqual(choices(s),[target.uid]);
 pick(s,target.uid);
 assert.deepEqual(choices(s),[revive.uid]);
 pick(s,revive.uid);
 assert.ok(has(s,1,'grave',target)&&has(s,1,'battle',attacker));
 assert.ok(has(s,0,'battle',revive)&&has(s,0,'grave',overCost));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Gachack uses the chosen creature’s cost after a destruction replacement and reload',()=>{
 let s=setup();
 const gacha=put(s,0,'hand',GACHA),pane=put(s,1,'battle',PANE),substitute=put(s,1,'battle',HEAVY);
 const revive=put(s,0,'grave',FIVE),overCost=put(s,0,'grave',HEAVY);
 play(s,gacha);
 pick(s,pane.uid);
 assert.equal(s.decision.type,'leaveReplace');
 s=restore(s);
 act(s,'replaceAter',a=>a.uid===substitute.uid);
 assert.deepEqual(choices(s),[revive.uid]);
 pick(s,revive.uid);
 assert.ok(has(s,1,'battle',pane)&&has(s,1,'grave',substitute));
 assert.ok(has(s,0,'battle',revive)&&has(s,0,'grave',overCost));
});

test('Gachack does not revive anything without a valid untapped target',()=>{
 const s=setup(),gacha=put(s,0,'hand',GACHA),target=put(s,1,'battle',FIVE),revive=put(s,0,'grave',FIVE);
 target.tapped=true;
 play(s,gacha);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',target)&&has(s,0,'grave',revive));
});

test('Petens Gate taps every enemy creature, draws one and simultaneously breaks all of its controller’s shields',()=>{
 const s=setup(),peten=put(s,0,'hand',PETEN),top=s.players[0].deck[0];
 const ally=put(s,0,'battle',BODY),enemy=put(s,1,'battle',BODY),other=put(s,1,'battle',FIRE);
 give(s,0,'shields',[EINE,BODY,BODY]);
 const [trigger,...plain]=s.players[0].shields;
 play(s,peten);
 assert.ok(!ally.tapped&&enemy.tapped&&other.tapped);
 assert.ok(has(s,0,'hand',top)&&plain.every(x=>has(s,0,'hand',x)));
 assert.equal(s.players[0].shields.length,0);
 assert.equal(s.decision.uid,trigger.uid);
 act(s,'useTrigger');
 assert.ok(has(s,0,'battle',trigger)&&has(s,0,'grave',peten));
 assert.equal(s.metrics[0].breaks,3);
});

test('Petens Gate’s new shield trigger resolves ahead of the older declared trigger after reload',()=>{
 let s=setup();
 const attacker=put(s,1,'battle',PANE);
 give(s,0,'shields',[PETEN,EINE,SPELL]);
 const [peten,older,newer]=s.players[0].shields;
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.includes(peten.uid)&&a.shields.includes(older.uid));
 act(s,'useTrigger',a=>a.uid===peten.uid);
 act(s,'useTrigger',a=>a.uid===older.uid);
 act(s,'orderTrigger',a=>a.uid===peten.uid);
 assert.equal(s.decision.uid,newer.uid);
 assert.ok(has(s,0,'hand',older)&&!has(s,0,'battle',older));
 s=restore(s);
 act(s,'useTrigger',a=>a.uid===newer.uid);
 assert.ok(!has(s,0,'battle',older));
 act(s,'search',a=>a.uid===null);
 assert.ok(has(s,0,'grave',newer)&&has(s,0,'battle',older)&&has(s,0,'grave',peten));
});

test('Petens Gate still taps and draws when its controller has no shields',()=>{
 const s=setup(),peten=put(s,0,'hand',PETEN),enemy=put(s,1,'battle',BODY),top=s.players[0].deck[0];
 give(s,0,'shields',[]);
 play(s,peten);
 assert.ok(enemy.tapped&&has(s,0,'hand',top)&&has(s,0,'grave',peten));
 assert.equal(s.metrics[0].breaks,0);
});

for(const [label,id,draw,decline] of [
 ['NEO',NEO,true,false],['G-NEO',GNEO,true,false],['spell',SPELL,false,false],['decline',NEO,false,true]
])test('ROYAL-Gen A5 puts only a chosen hand card into mana tapped and draws only for NEO: '+label,()=>{
 const s=setup(),royal=put(s,0,'hand',ROYAL),payment=put(s,0,'hand',id),top=s.players[0].deck[0];
 put(s,1,'battle',NINGYO);
 play(s,royal);
 pick(s,decline?null:payment.uid);
 assert.equal(has(s,0,'hand',payment),decline);
 assert.equal(has(s,0,'mana',payment),!decline);
 assert.ok(!has(s,0,'grave',payment));
 if(!decline)assert.ok(payment.tapped);
 assert.equal(has(s,0,'hand',top),draw);
});
