import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-768.json',import.meta.url)));
const BELIA='dm23rp3-025',LITTLE='dm23rp2-042',SUN='dm23rp2-070',FISH='dm23rp3-033',MENDOZA='dm23rp3-053';
const BODY='dm01-108',SEED='dm25ex1-054',ARMORED='dm23rp3-063',ARMOR_TWIN='dmbd16-009',RAID_TWIN='dm23rp1-042',EXPENSIVE_SPELL_FACE='dm24bd4-007';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function task(s,op,p,options){
 s.phase='main';
 s.extTasks=[{op,p,source:BODY,...options}];
 act(s,'toAttack');
}
function deploy(s,p,id){
 const x=put(s,p,'hand',id);
 task(s,'putCreature',p,{origin:'hand',uid:x.uid});
 assert.ok(has(s,p,'battle',x));
 return x;
}

test('five complete definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:768}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:768}));
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
   assert.deepEqual(print.faces.map(f=>({...f,abilityText:f.abilityText.replace(/ /g,'')})),row.faces.map(f=>({...f,abilityText:f.abilityText.replace(/ /g,'')})));
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});test('Belia uses Guardman and its opposing-turn power in real combat',()=>{
 const s=setup(),guard=put(s,0,'battle',BELIA),ally=put(s,0,'battle',BODY);
 const attacker=put(s,1,'battle',BODY);
 assert.equal(e.power(guard,false,s),2000);
 s.active=1;
 assert.equal(e.power(guard,false,s),12000);
 ally.tapped=true;
 attack(s,attacker.uid,ally.uid);
 act(s,'guardman',a=>a.uid===guard.uid);
 drain(s);
 assert.ok(has(s,0,'battle',guard)&&has(s,0,'battle',ally)&&has(s,1,'grave',attacker));
});

test('Belia distinguishes paid entries and can ramp repeatedly from opposing unpaid elements',()=>{
 const s=setup();
 put(s,0,'battle',BELIA);
 s.active=1;
 play(s,BODY);
 assert.equal(s.decision,null);
 deploy(s,1,SEED);
 const declined=s.players[0].deck[0];
 pick(s,null);
 assert.equal(s.players[0].deck[0].uid,declined.uid);
 for(let i=0;i<2;i++){
  const top=s.players[0].deck[0];
  deploy(s,1,BODY);
  pick(s,true);
  assert.ok(has(s,0,'mana',top));
 }
 s.active=0;
 deploy(s,0,BODY);
 assert.equal(s.decision,null);
});

test('Little counts declarations before it arrives and raids only on the second attack',()=>{
 let s=setup();
 const first=put(s,0,'battle',BODY),second=put(s,0,'battle',BODY),third=put(s,0,'battle',BODY);
 give(s,0,'deck',[ARMORED,BODY,RAID_TWIN,BODY,BODY]);
 attack(s,first.uid);
 drain(s);
 put(s,0,'battle',LITTLE);
 s=restore(s);
 attack(s,second.uid);
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.deepEqual(s.decision.choices.map(c=>c.value?.face).filter(x=>x!==undefined),[0,0,1]);
 const chosen=s.players[0].deck[0];
 pick(s,chosen.uid);
 drain(s);
 assert.ok(has(s,0,'battle',chosen));
 attack(s,third.uid);
 assert.notEqual(s.decision?.task?.op,'g34_RaidPick');
 drain(s);
});

test('Little can count its own attack and restarts the count next turn',()=>{
 const s=setup(),little=put(s,0,'battle',LITTLE),other=put(s,0,'battle',BODY);
 give(s,0,'deck',[ARMORED,BODY,BODY,BODY]);
 attack(s,other.uid);
 drain(s);
 attack(s,little.uid);
 assert.equal(s.decision.task.op,'g34_RaidPick');
 pick(s,null);
 drain(s);
 s.turn++;
 s.players[0].battle.forEach(x=>x.tapped=false);
 attack(s,little.uid);
 assert.notEqual(s.decision?.task?.op,'g34_RaidPick');
 drain(s);
 attack(s,other.uid);
 assert.equal(s.decision.task.op,'g34_RaidPick');
});

test('Sun grants Speed Attacker after raid resolution to present allies including the raided creature',()=>{
 let s=setup();
 const ally=play(s,BODY),rival=put(s,1,'battle',BODY);
 give(s,0,'deck',[ARMORED,BODY,BODY,BODY,BODY]);
 const raided=s.players[0].deck[0];
 play(s,SUN);
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.equal(!!e.effectiveCard(ally,s).speedAttacker,false);
 s=restore(s);
 pick(s,raided.uid);
 drain(s);
 assert.ok(has(s,0,'battle',raided));
 for(const uid of [ally.uid,raided.uid]){
  const x=s.players[0].battle.find(x=>x.uid===uid);
  assert.equal(e.effectiveCard(x,s).speedAttacker,true);
 }
 const later=play(s,BODY);
 assert.equal(!!e.effectiveCard(later,s).speedAttacker,false);
 assert.equal(!!e.effectiveCard(s.players[1].battle.find(x=>x.uid===rival.uid),s).speedAttacker,false);
 s.turn++;
 assert.equal(!!e.effectiveCard(s.players[0].battle.find(x=>x.uid===ally.uid),s).speedAttacker,false);
});

test('Fish draws before the mandatory discard and can discard the just-drawn card',()=>{
 const s=setup();
 put(s,0,'hand',BODY);
 const top=s.players[0].deck[0];
 play(s,FISH);
 pick(s,0);
 assert.equal(s.decision.task.op,'discard');
 assert.ok(s.decision.choices.every(c=>c.value!==null));
 pick(s,top.uid);
 assert.ok(has(s,0,'grave',top));
});

test('Fish checks the spell face cost and returns the whole twinpact',()=>{
 const s=setup(),valid=put(s,0,'grave',ARMOR_TWIN),wrong=put(s,0,'grave',EXPENSIVE_SPELL_FACE);
 put(s,0,'grave',BODY);
 play(s,FISH);
 pick(s,1);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[valid.uid]);
 pick(s,valid.uid);
 assert.ok(has(s,0,'hand',valid)&&has(s,0,'grave',wrong));
});

test('Mendoza publicly reveals and takes a matching twinpact without a choice',()=>{
 const s=setup();
 give(s,0,'deck',[ARMOR_TWIN,BODY,BODY]);
 const top=s.players[0].deck[0];
 play(s,MENDOZA);
 assert.ok(has(s,0,'hand',top));
 assert.equal(s.decision,null);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.text.includes('ボルシャック・スーパーヒーロー')));
});

test('Mendoza can keep or bottom the revealed miss and restore the pending choice',()=>{
 for(const accept of [false,true]){
  let s=setup();
  give(s,0,'deck',[BODY,ARMORED,BODY]);
  const [top,next]=s.players[0].deck;
  play(s,MENDOZA);
  assert.equal(s.decision.task.op,'g34_Offer');
  s=restore(s);
  pick(s,accept?true:null);
  assert.equal(s.players[0].deck[0].uid,accept?next.uid:top.uid);
  if(accept)assert.equal(s.players[0].deck.at(-1).uid,top.uid);
  assert.ok(!s.players[0].g34Protected.includes(top.uid));
 }
});

test('Sun still grants Speed Attacker when a deck lock prevents the Mekraid look',()=>{
 const s=setup(),ally=play(s,BODY);
 put(s,1,'battle','dm25ex1-049');
 const deck=s.players[0].deck.map(x=>x.uid);
 play(s,SUN);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck);
 assert.equal(e.effectiveCard(ally,s).speedAttacker,true);
});
