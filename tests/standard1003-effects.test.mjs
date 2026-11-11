import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const FEN='dmr20-045',KAMA='dmr20-041',MOKE='dmr19-023',PUSH='dmr20-017',DUEL='dmr20-029';
const DARK='dm01-090',FIRE='dm01-097',WATER='dm01-083',NATURE='dm01-108',LIGHT='dm01-075';
const MULTI='dm24ex2-019',HAND='dm01-027',ENERGY='dm06-085',FIELD='dmrp08-005';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(12).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 1003 registers exactly five unique official cards',()=>{
 const m=read('tools/support-phase-1003.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[FEN,KAMA,MOKE,PUSH,DUEL]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1003}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1003}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1003');
  if(id===PUSH)assert.deepEqual(c.evolution,{civilization:'闇'});
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
});

function destroy(s,target){
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(x=>x.uid===target.uid));
}

for(const mode of ['shield','decline','below'])test('Fenicul checks Light mana and makes shield replacement optional '+mode,()=>{
 let s=field();
 const fen=play(s,FEN),old=s.players[0].shields.length;
 give(s,0,'mana',[LIGHT,MULTI,LIGHT,WATER]);
 s.players[0].mana[0].tapped=true;
 s.players[0].mana[2].faceDown=mode==='below';
 s.active=1;destroy(s,fen);
 if(mode==='below')assert.equal(s.decision,null);
 else{
  assert.equal(s.decision.type,'leaveReplace');
  assert.deepEqual(e.getLegalActions(s).map(a=>a.kind),['replaceShield842','allowLeave']);
  s=JSON.parse(JSON.stringify(s));
  act(s,mode==='shield'?'replaceShield842':'allowLeave');
 }
 assert.equal(s.players[0].shields.length,old+Number(mode==='shield'));
 if(mode==='shield'){
  const shield=s.players[0].shields.at(-1);
  assert.equal(shield.uid,fen.uid);
  assert.ok(!shield.faceUp);
  assert.ok(!has(s,0,'grave',fen));
 }else assert.ok(has(s,0,'grave',fen));
});

test('Fenicul does not replace a return to hand even with Light mana armed',()=>{
 const s=field(),fen=play(s,FEN),shieldCount=s.players[0].shields.length;
 s.active=1;
 play(s,'dm01-021');pick(s,fen.uid);drain(s);
 assert.ok(has(s,0,'hand',fen));
 assert.equal(s.players[0].shields.length,shieldCount);
});

test('Kamaitachi counts shield groups and pays from mana, including the source itself',()=>{
 let s=field();
 give(s,0,'mana',[DARK,DARK,DARK,DARK,KAMA]);
 give(s,0,'shields',[NATURE,NATURE]);
 s.players[0].shields[0].shieldStack=[inst(LIGHT)];
 const source=s.players[0].mana[4];
 const action=()=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===source.uid&&a.origin==='mana');
 put(s,0,'battle',DARK);put(s,0,'battle',FIELD);put(s,0,'battle',FIRE,{sealed:true});
 assert.equal(action(),undefined);
 put(s,0,'battle',NATURE);
 assert.equal(action()?.cost,5);
 e.step(s,action(),{manualMana:true});
 assert.equal(s.decision.type,'manaPayment');
 s=JSON.parse(JSON.stringify(s));
 act(s,'selectMana',a=>a.uid===source.uid);
 for(const x of s.players[0].mana.filter(x=>x.uid!==source.uid))act(s,'selectMana',a=>a.uid===x.uid);
 act(s,'confirmMana');
 const arrived=s.players[0].battle.find(x=>x.uid===source.uid);
 assert.ok(arrived&&!arrived.tapped);
 assert.equal(e.effectiveCard(arrived,s).breaker,2);
 assert.ok(s.players[0].mana.every(x=>x.tapped));
});

test('Kamaitachi has an ordinary hand summon even with fewer creatures than shields',()=>{
 const s=field(),arrived=play(s,KAMA);
 assert.ok(has(s,0,'battle',arrived));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
});

test('Mokedake forces only a legal attack target and its ally can redirect the attack as Guardman',()=>{
 const s=field(),moke=play(s,MOKE),guard=put(s,0,'battle','dm01-008'),other=put(s,0,'battle',NATURE,{tapped:true});
 const attacker=put(s,1,'battle',FIRE);
 const targets=()=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===attacker.uid).map(a=>a.target);
 assert.ok(!e.effectiveCard(moke,s).guardman&&!e.effectiveCard(attacker,s).guardman);
 assert.ok(e.effectiveCard(guard,s).guardman);
 s.active=1;s.phase='attack';
 assert.deepEqual(new Set(targets()),new Set(['player',other.uid]));
 moke.tapped=true;
 assert.deepEqual(targets(),[moke.uid]);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 attack(s,attacker.uid,moke.uid);
 act(s,'guardman',a=>a.uid===guard.uid);drain(s);
 assert.ok(guard.tapped&&has(s,0,'battle',moke));
});

for(const shields of [1,2])test('Push evolves from Darkness and counts the evolved stack as one on attack '+shields,()=>{
 const s=field();
 const wrong=put(s,0,'battle',FIRE,{sealed:true}),unit=put(s,0,'hand',PUSH);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===unit.uid));
 const base=put(s,0,'battle',DARK);
 const untapped=put(s,1,'battle',WATER),tapped=put(s,1,'battle',FIRE,{tapped:true});
 give(s,0,'shields',Array(shields).fill(NATURE));
 s.players[0].shields[0].shieldStack=[inst(LIGHT)];
 act(s,'play',a=>a.uid===unit.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(has(s,0,'battle',wrong));
 assert.deepEqual(unit.under.map(x=>x.uid),[base.uid]);
 assert.equal(e.effectiveCard(unit,s).breaker,2);
 attack(s,unit.uid);
 if(shields===1){
  assert.deepEqual(choices(s),[untapped.uid]);pick(s,untapped.uid);
  assert.ok(has(s,1,'grave',untapped));
 }else assert.ok(has(s,1,'battle',untapped));
 assert.ok(has(s,1,'battle',tapped));
 drain(s);
});

test('Duelrow draws two before the opponent draws one',()=>{
 const s=field(),ownTop=s.players[0].deck.slice(0,2),oppTop=s.players[1].deck[0];
 play(s,DUEL);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),ownTop.map(x=>x.uid));
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),[oppTop.uid]);
 assert.deepEqual(s.log.filter(x=>x.type==='draw').slice(-2).map(x=>x.player),[0,1]);
});

for(const amount of [0,1,2])test('Duelrow permits declining or choosing a Water spell discount '+amount,()=>{
 let s=field();play(s,DUEL);
 assert.equal(e.summonCost(s,0,e.card(ENERGY)),1);
 assert.equal(e.summonCost(s,1,e.card(ENERGY)),3);
 assert.equal(e.summonCost(s,0,e.card(HAND)),6);
 assert.equal(e.summonCost(s,0,e.card(WATER)),2);
 give(s,0,'mana',[WATER,WATER,WATER]);
 const energy=play(s,ENERGY);
 assert.deepEqual(choices(s),[2,1,0,false]);
 s=JSON.parse(JSON.stringify(s));pick(s,amount);drain(s);
 assert.ok(has(s,0,'grave',energy));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3-amount);
});
