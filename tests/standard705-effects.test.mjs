import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-705.json',import.meta.url)));

test('Phase 705 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:705}));
  assert.throws(()=>standardCardSpec(detail,{phase:704}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:705}));
 }
});

const SPIN='dm22ex1-091',SMOKE='dm22ex1-111',MARON='dm22ex1-125',VEIL='dm05-014';
const BODY='dm01-108',WAVE='dm11-053',SPELL='dm01-110',BIG='dm01-s01';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,predicate)=>act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
const play=(s,id)=>{
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
};
const end=s=>{s.phase='attack';act(s,'endTurn');};
const attacks=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);
const canEnd=s=>e.getLegalActions(s).some(a=>a.kind==='endTurn');

for(const origin of ['hand','deck',null])test('Spin may deploy one Wave Striker with Magibomber 3 before breaking shields from '+origin,()=>{
 let s=setup();
 const peer=put(s,1,WAVE);
 const spin=play(s,SPIN);
 assert.equal(spin.entered,s.turn);
 assert.equal(e.power(spin,false,s),3000);
 give(s,0,'hand',[WAVE,SPELL,BIG]);
 give(s,0,'deck',[WAVE,BODY]);
 const hand=s.players[0].hand[0],top=s.players[0].deck[0];
 const shields=s.players[1].shields.map(x=>x.uid);
 attack(s,spin.uid);
 assert.equal(s.decision.task.op,'g34_Magibomber321');
 assert.deepEqual(s.decision.choices.filter(c=>c.value).map(c=>c.value.uid).sort(),[hand.uid,top.uid].sort());
 s=restore(s);
 pick(s,v=>origin?v?.origin===origin:v===null);
 const current=s.players[0].battle.find(y=>y.uid===spin.uid);
 assert.ok(has(s,1,'battle',peer));
 assert.equal(e.power(current,true,s),origin?6000:3000);
 assert.equal(e.effectiveCard(current,s).breaker,origin?2:undefined);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.equal(has(s,0,'battle',hand),origin==='hand');
 assert.equal(has(s,0,'battle',top),origin==='deck');
 act(s,'noBlock');
 if(origin){
  const selected=shields.slice(2,4);
  act(s,'breakShields',a=>a.shields.length===selected.length&&selected.every(uid=>a.shields.includes(uid)));
  assert.deepEqual(s.players[1].shields.map(x=>x.uid),shields.filter(uid=>!selected.includes(uid)));
 }else{
  assert.equal(s.players[1].shields.length,shields.length-1);
 }
});

for(const origin of ['hand','grave'])test('Smoke pays Mugen Crime from '+origin+' and uses Wave Blocker and Slayer',()=>{
 let s=setup();
 const one=put(s,0,WAVE,{entered:s.turn}),two=put(s,0,WAVE,{entered:s.turn});
 const attacker=put(s,1,BIG),source=inst(SMOKE);
 s.players[0][origin].push(source);
 const physical=e.physicalCards(s).map(x=>x.uid).sort();
 act(s,'mugenStart',a=>a.uid===source.uid&&a.origin===origin&&a.cost===2);
 act(s,'mugenTap',a=>a.uid===one.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='mugenTap'&&a.uid===one.uid));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 s=restore(s);
 act(s,'mugenTap',a=>a.uid===two.uid);
 const smoke=s.players[0].battle.find(x=>x.uid===source.uid);
 assert.equal(smoke.summonedTurn,s.turn);
 assert.ok([one,two].every(y=>s.players[0].battle.find(x=>x.uid===y.uid).tapped));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
 assert.equal(smoke.tapped,false);
 assert.ok(e.effectiveCard(smoke,s).blocker&&e.effectiveCard(smoke,s).slayer);
 end(s);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===smoke.uid);
 assert.ok(has(s,0,'grave',smoke)&&has(s,1,'grave',attacker));
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),physical);
});

test('Smoke can pay Mugen Crime under a grave movement lock and stays in its original zone',()=>{
 const s=setup();
 const one=put(s,0,WAVE),two=put(s,0,WAVE);
 put(s,1,'dmrp22-042');
 give(s,0,'grave',[BODY,SMOKE,BODY]);
 const grave=s.players[0].grave.map(x=>x.uid);
 act(s,'mugenStart',a=>a.uid===grave[1]&&a.origin==='grave');
 act(s,'mugenTap',a=>a.uid===one.uid);
 act(s,'mugenTap',a=>a.uid===two.uid);
 assert.ok(one.tapped&&two.tapped);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),grave);
 assert.equal(s.players[0].battle.length,2);
});

test('Smoke loses Blocker and Slayer below the Wave threshold and can summon normally without tapping allies',()=>{
 const s=setup();
 const ally=put(s,0,WAVE),enemy=put(s,1,WAVE);
 const smoke=play(s,SMOKE);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
 assert.equal(ally.tapped,false);
 assert.ok(e.effectiveCard(smoke,s).blocker&&e.effectiveCard(smoke,s).slayer);
 enemy.g35Ignored=s.turn;
 assert.ok(!e.effectiveCard(smoke,s).blocker&&!e.effectiveCard(smoke,s).slayer);
});

for(const wave of [false,true])test('Maron dashes for one mana and only attacks creatures on entry when Wave is active '+wave,()=>{
 let s=setup();
 const attacker=put(s,0,BODY),ally=put(s,0,WAVE);
 const enemy=put(s,1,wave?WAVE:BODY),other=put(s,1,BODY,{tapped:true}),source=inst(MARON);
 s.players[0].hand.push(source);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g14_DashDeclare');
 pick(s,v=>v===true);
 assert.equal(s.decision.task.op,'g14_DashResolve');
 s=restore(s);
 pick(s,v=>v!==null);
 const maron=s.players[0].battle.find(x=>x.uid===source.uid);
 assert.equal(maron.summonedTurn,s.turn);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.equal(s.players[0].mana.find(x=>x.tapped).cardId,BODY);
 assert.deepEqual(attacks(s,maron),wave?[enemy.uid,other.uid]:[]);
 if(wave){
  const liveAlly=s.players[0].battle.find(x=>x.uid===ally.uid);
  liveAlly.g35Ignored=s.turn;
  assert.deepEqual(attacks(s,maron),[]);
  delete liveAlly.g35Ignored;
  end(s);
  end(s);
  s.phase='attack';
  assert.ok(attacks(s,maron).includes('player'));
  assert.ok(!attacks(s,maron).includes(enemy.uid));
 }
});

test('Maron may stay in hand after a real break without paying the dash cost',()=>{
 const s=setup(),attacker=put(s,0,BODY),maron=inst(MARON);
 s.players[0].hand.push(maron);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g14_DashDeclare');
 pick(s,v=>v===null);
 assert.ok(has(s,0,'hand',maron));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Standalone Phantom Veil has the same effect as the distinct Twinpact spell and only applies next opposing turn',()=>{
 const s=setup(),ally=put(s,0,BODY),guard=put(s,1,'dm01-013');
 ally.tapped=true;
 assert.deepEqual(e.card(VEIL).g34Tasks,e.card('dm22ex1-109').spellFace.g34Tasks);
 const spell=play(s,VEIL);
 assert.ok(has(s,0,'grave',spell));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.ok(!e.effectiveCard(ally,s).mustAttack&&!e.effectiveCard(guard,s).mustAttack);
 end(s);
 s.phase='attack';
 assert.deepEqual(attacks(s,guard),[ally.uid]);
 assert.ok(!canEnd(s));
 attack(s,guard.uid,ally.uid);
 act(s,'noBlock');
 assert.ok(canEnd(s));
 end(s);
 assert.ok(!e.effectiveCard(guard,s).mustAttack);
});
