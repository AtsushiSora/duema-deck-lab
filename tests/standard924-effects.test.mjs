import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DEPTH='dm24-002',BEANS='dm20-033',CHUZA='dm20-031',CHAOS='dm01-034';
const REPRINTS=['dmx12a-020','dmex12-066','dmex17-w05','dm24rp1-T07','dm24ex3-TF30'];
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const PIT='dm01-027',BOUNCE='dm01-086',TRAP='dm01-039',SB='dm17-014',CREATURE_TRIGGER='dm23-051';
const MULTI='dm10-068',TWIN='dm22ex1-098',GEAR='dm14-110',NEO='dmrp02-s09',EVO='dmx22b-090';
const PROTECTED='dmrp01-041',UNATTACKABLE='dm07-051';
const put=(s,p,z,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,v)=>act(s,'extended',a=>{const row=s.decision.choices[a.choice].value;return (row?.uid??row)===(v?.uid??v);});
const picks=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const target=(s,x)=>act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
const legal=(s,kind,predicate=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&predicate(a));
const end=s=>{s.phase='attack';act(s,'endTurn');};
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}
function attack(s,x,target='player'){
 s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===target);
}
function payDepth(s){
 const x=put(s,s.active,'battle',DEPTH);
 give(s,s.active,'mana',Array(9).fill(WATER));
 const mana=s.players[s.active].mana;
 s.phase='attack';act(s,'tapAbility',a=>a.uid===x.uid);
 for(const y of mana.slice(0,8)){
  assert.ok(!x.tapped&&mana.every(m=>!m.tapped));
  pick(s,y);
 }
 assert.ok(x.tapped&&mana.slice(0,8).every(y=>y.tapped)&&!mana[8].tapped);
 assert.ok(!s.attack);
 assert.deepEqual(picks(s),['光','闇','火','自然']);
}

test('Phase 924 verifies nine official prints and maps the five Chuza reprints to its original ID',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-924.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[DEPTH,BEANS,CHUZA,CHAOS]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),REPRINTS.map(id=>[id,CHUZA]));
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces,spec=m.cards.find(r=>r.id===id).spec;
  const detail={...details.cards.find(x=>x.id===id),id:row.id,faces:row.faces};
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec(detail,{phase:924}),spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:924}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   [id===CHAOS?'spell':'creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(row.id).id,id);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(row.canonicalId)continue;
  assert.deepEqual(detail.faces,details.cards.find(x=>x.id===id).faces);
  assert.equal(CARD_IMAGES[id],row.image);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
 }
 const deck={id:'phase924',name:'初出と再録の検証',cards:[DEPTH,BEANS,CHAOS,LIGHT,WATER,DARK,FIRE,NATURE,GEAR]
  .map(id=>({id,count:4})).concat(REPRINTS.slice(0,4).map(id=>({id,count:1})))};
 const resolved=cat.resolveRows(deck.cards);
 assert.deepEqual(e.validateDeck({...deck,cards:resolved}),[]);
 assert.deepEqual(resolved.filter(x=>x.id===CHUZA),[{id:CHUZA,count:4}]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

test('Depth Noble chooses the civilization before revealing and takes both matching physical cards',()=>{
 let s=field();s.active=1;
 give(s,1,'deck',[MULTI,TWIN,WATER,FIRE,NATURE]);
 const [a,b,c,d,f]=s.players[1].deck;
 payDepth(s);
 const physical=e.physicalCards(s).map(x=>x.uid).sort();
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===DEPTH));
 assert.equal(s.decision.player,1);
 s=restore(s);pick(s,'火');
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),[a.uid,b.uid]);
 assert.deepEqual(s.players[1].deck.map(x=>x.uid),[c.uid,d.uid,f.uid]);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===DEPTH&&x.text.includes(e.card(MULTI).name)&&x.text.includes(e.card(TWIN).name)));
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),physical);
});

test('Depth Noble moves one match automatically or lets its controller order two nonmatches on the bottom',()=>{
 for(const choose of ['自然','闇']){
  const s=field();
  give(s,0,'deck',[MULTI,WATER,LIGHT,FIRE]);
  const [multi,water,light,fire]=s.players[0].deck;
  payDepth(s);pick(s,choose);
  if(choose==='自然'){
   assert.deepEqual(s.players[0].hand.map(x=>x.uid),[multi.uid]);
   assert.deepEqual(s.players[0].deck.map(x=>x.uid),[light.uid,fire.uid,water.uid]);
  }else{
   assert.equal(s.decision.task.op,'g34_Order');
   assert.deepEqual(new Set(picks(s)),new Set([multi.uid,water.uid]));
   pick(s,water);
   assert.deepEqual(s.players[0].deck.map(x=>x.uid),[light.uid,fire.uid,water.uid,multi.uid]);
   assert.equal(s.players[0].hand.length,0);
  }
 }
});

test('Zapping Beans requires the opponent to pick their own creature, even when it has selection protection',()=>{
 const s=field(),own=put(s,0,'battle',NATURE);
 const protectedCard=put(s,1,'battle',PROTECTED),other=put(s,1,'battle',MULTI);
 put(s,1,'battle',GEAR);
 const x=play(s,BEANS);
 assert.equal(s.decision.player,1);
 assert.deepEqual(new Set(picks(s)),new Set([protectedCard.uid,other.uid]));
 pick(s,protectedCard);
 assert.ok(find(s,1,'mana',protectedCard)&&find(s,0,'battle',own)&&find(s,0,'battle',x));
});

test('Zapping Beans on destruction gives the opponent a mandatory non-evolution deployment from their own mana',()=>{
 let s=field();s.active=1;
 const x=put(s,0,'battle',BEANS);
 const candidate=put(s,1,'mana',NATURE,{tapped:true}),neo=put(s,1,'mana',NEO);
 const evolution=put(s,1,'mana',EVO),spell=put(s,1,'mana',PIT),hidden=put(s,1,'mana',MULTI,{faceDown:true});
 const base=put(s,1,'battle',NATURE);
 put(s,0,'mana',WATER);put(s,1,'hand',FIRE);
 play(s,PIT);target(s,x);
 assert.equal(s.decision.player,1);
 assert.deepEqual(new Set(picks(s)),new Set([...s.players[1].mana.filter(m=>![evolution.uid,spell.uid,hidden.uid].includes(m.uid)).map(m=>m.uid)]));
 assert.ok(picks(s).includes(candidate.uid)&&picks(s).includes(neo.uid)&&!picks(s).includes(null));
 s=restore(s);pick(s,neo);pick(s,base);drain(s);
 assert.ok(find(s,0,'grave',x)&&find(s,1,'battle',neo).under.some(y=>y.uid===base.uid));
});

test('Zapping Beans does nothing without an eligible opposing creature and does not deploy on mana removal',()=>{
 const s=field(),x=play(s,BEANS);
 assert.equal(s.decision,null);
 s.active=1;
 play(s,TRAP);target(s,x);drain(s);
 assert.ok(find(s,0,'mana',x));
 assert.equal(s.decision,null);
});

test('Zapping Beans leaves the opposing mana alone when destroyed with no eligible card there',()=>{
 const s=field(),x=put(s,0,'battle',BEANS);
 give(s,1,'mana',[EVO,PIT,GEAR]);
 const before=s.players[1].mana.map(y=>y.uid);
 play(s,'dm01-057');pick(s,x);drain(s);
 assert.ok(find(s,0,'grave',x));
 assert.deepEqual(s.players[1].mana.map(y=>y.uid),before);
 assert.equal(s.players[1].battle.length,0);
 assert.equal(s.decision,null);
});

test('Chuza must attack whenever legal, including if it untaps after its first attack',()=>{
 const s=field(),x=put(s,0,'battle',CHUZA,{entered:s.turn});
 s.phase='attack';
 assert.ok(legal(s,'endTurn')&&!legal(s,'attack',a=>a.uid===x.uid));
 x.entered=0;
 assert.ok(!legal(s,'endTurn')&&legal(s,'attack',a=>a.uid===x.uid));
 attack(s,x);drain(s);
 assert.ok(x.tapped&&legal(s,'endTurn'));
 x.tapped=false;
 assert.ok(!legal(s,'endTurn')&&legal(s,'attack',a=>a.uid===x.uid));
 s.extLimits=[{kind:'attack',player:0,uid:x.uid,incarnation:0,expires:'end',who:0}];
 assert.ok(legal(s,'endTurn')&&!legal(s,'attack',a=>a.uid===x.uid));
});

test('Tapped Chuza prevents both players casting from every origin and allows creatures; untap or ability loss lifts the lock',()=>{
 const s=field(),x=put(s,0,'battle',CHUZA,{tapped:true});
 const spell=put(s,0,'hand',PIT),creature=put(s,0,'hand',FIRE);
 assert.ok(!legal(s,'play',a=>a.uid===spell.uid)&&legal(s,'play',a=>a.uid===creature.uid));
 for(const p of [0,1])for(const origin of ['hand','grave','mana','deck','shields']){
  assert.ok(!e.canCastSpell(s,p,e.card(PIT),origin));
  assert.ok(e.canCastSpell(s,p,e.card(FIRE),origin));
 }
 end(s);assert.equal(s.active,1);assert.ok(!e.canCastSpell(s,1,e.card(PIT),'hand'));
 end(s);assert.equal(s.active,0);assert.equal(x.tapped,false);
 assert.ok(e.canCastSpell(s,0,e.card(PIT),'hand'));
 x.tapped=true;put(s,1,'battle',GEN);
 assert.ok(e.canCastSpell(s,0,e.card(PIT),'hand'));
});

test('Chuza blocks spell S-Triggers and spell S-Back as soon as it attacks',()=>{
 for(const [shieldId,heldId] of [[PIT,null],[DARK,SB],[CREATURE_TRIGGER,null]]){
  const s=field(),x=put(s,0,'battle',CHUZA);
  give(s,1,'shields',[shieldId]);
  const shield=s.players[1].shields[0],held=heldId&&put(s,1,'hand',heldId);
  attack(s,x);
  if(legal(s,'noBlock'))act(s,'noBlock');
  if(legal(s,'breakShield'))act(s,'breakShield');
  if(shieldId===CREATURE_TRIGGER){
   act(s,'useTrigger',a=>a.uid===shield.uid);
   drain(s);assert.ok(find(s,1,'battle',shield));
  }else{
   assert.ok(!legal(s,'useTrigger')&&s.decision?.task?.op!=='g13_SB');
   drain(s);assert.ok(find(s,1,'hand',shield));
   if(held)assert.ok(find(s,1,'hand',held));
  }
 }
});

test('Chaos Strike makes one opposing creature attackable without tapping it or enabling a fresh attacker',()=>{
 const s=field(),ready=put(s,0,'battle',FIRE),fresh=put(s,0,'battle',NATURE,{entered:s.turn});
 const marked=put(s,1,'battle',WATER),other=put(s,1,'battle',DARK),protectedCard=put(s,1,'battle',PROTECTED);
 const source=play(s,CHAOS);
 assert.deepEqual(new Set(picks(s)),new Set([marked.uid,other.uid]));
 assert.ok(!picks(s).includes(protectedCard.uid));
 pick(s,marked);
 s.phase='attack';
 assert.ok(find(s,0,'grave',source)&&!marked.tapped);
 assert.ok(legal(s,'attack',a=>a.uid===ready.uid&&a.target===marked.uid));
 assert.ok(!legal(s,'attack',a=>a.target===other.uid||a.uid===fresh.uid));
 attack(s,ready,marked.uid);drain(s);
 assert.ok(find(s,1,'grave',marked)&&find(s,1,'battle',other));
});

test('Chaos Strike follows the same creature through evolution and expires at turn end',()=>{
 let s=field(),attacker=put(s,0,'battle',FIRE),base=put(s,1,'battle',NATURE);
 play(s,CHAOS);pick(s,base);s=restore(s);
 // Stage the opposing evolution in the same turn, as if it were put out by an effect.
 s.active=1;const evo=play(s,EVO);act(s,'evolve',a=>a.baseUid===base.uid);
 s.active=0;s.phase='attack';
 const canTarget=()=>legal(s,'attack',a=>a.uid===attacker.uid&&a.target===evo.uid);
 assert.equal(canTarget(),true);
 end(s);end(s);s.phase='attack';
 assert.equal(canTarget(),false);
});

test('Chaos Strike does not override attack immunity or persist after a creature leaves and returns',()=>{
 const s=field(),attacker=put(s,0,'battle',FIRE);
 const immune=put(s,1,'battle',UNATTACKABLE),other=put(s,1,'battle',WATER);
 play(s,CHAOS);pick(s,immune);play(s,CHAOS);pick(s,other);
 s.phase='attack';
 assert.ok(!legal(s,'attack',a=>a.target===immune.uid)&&legal(s,'attack',a=>a.target===other.uid));
 s.phase='main';play(s,BOUNCE);target(s,other);
 s.active=1;act(s,'play',a=>a.uid===other.uid);
 s.active=0;s.phase='attack';
 assert.ok(!legal(s,'attack',a=>a.uid===attacker.uid&&a.target===other.uid));
});
