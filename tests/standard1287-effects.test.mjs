import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BOLZ='dm23rp1-020',SEMI='dm23rp1-032',IRIS='dm23rp1-051';
const BIRD='dm24rp1-070',F='dm01-097',N='dm01-108',W='dm01-083',SEED='dmsd21-014';
const KILL='dm01-027',BIG='dm01-s09',BALA='dm22rp2-S6';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const manifest=read('tools/support-phase-1287.json');
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(N));
 return s;
}
function add(s,p,zone,id,extra={}){
 const x=Object.assign(inst(id),extra);s.players[p][zone].push(x);return x;
}
function play(s,id,face=0){
 const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);return x;
}
const picks=s=>s.decision.choices.map(({value})=>value?.uid??value);
const pick=(s,value)=>act(s,'extended',a=>Object.is(picks(s)[a.choice],value));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function passBlock(s){if(s.decision?.type==='block')act(s,'noBlock');}

test('four official prints share three canonical definitions and exact printed faces',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[BOLZ,SEMI,IRIS]);
 assert.equal(manifest.printAliases.length,1);
 for(const x of [...manifest.cards,...manifest.printAliases]){
  const id=x.canonicalId??x.id,c=e.card(id),[front,back]=x.faces;
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,parseInt(front.powerText,10),1,front.civilizations,front.race,4]);
  assert.equal(manifest.regulationVerification.limits[x.id],4);
  assert.equal(nameKey(c.name),nameKey(x.name));
  assert.deepEqual(standardCardSpec({...x,status:'complete'},{phase:1287}),x.spec);
  if(back){
   assert.deepEqual([c.spellFace.name,c.spellFace.cost,c.spellFace.civilizations,c.spellFace.text],
    [back.name,back.cost,back.civilizations,back.abilityText]);
  }
  assert.equal(registry.get(x.id).id,id);
  if(!x.canonicalId)assert.equal(CARD_IMAGES[id],x.image);
  assert.deepEqual(refs.find(y=>y.id===x.id),{id:x.id,canonicalId:id,name:x.name,image:x.image,source:x.source});
  const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Bolzard charges the selected face cost (QA 43087)',()=>{
 for(const [face,cost] of [[0,6],[1,2]]){
  const s=field();
  const x=add(s,0,'hand',BOLZ);
  assert.equal(e.getLegalActions(s).find(a=>a.uid===x.uid&&(a.face??0)===face)?.cost,cost);
  act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);drain(s);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,cost);
  assert.ok(has(s,0,face===0?'battle':'grave',x));
 }
});

test('Bolzard may fight an opponent on entry and grave Birds add 6000 only in battle',()=>{
 for(const scenario of ['decline','no own bird','own bird']){
  const s=field(),enemy=add(s,1,'battle',BIG);
  add(s,1,'grave',BIRD);
  if(scenario==='own bird')add(s,0,'grave',BIRD);
  else add(s,0,'grave',F);
  const x=play(s,BOLZ);
  assert.deepEqual(picks(s),[enemy.uid,null]);
  assert.equal(e.power(x,false,s),6000);
  assert.equal(e.matchupPower(x,enemy,false,s),scenario==='own bird'?12000:6000);
  pick(s,scenario==='decline'?null:enemy.uid);drain(s);
  assert.ok(has(s,0,scenario==='no own bird'?'grave':'battle',x));
  assert.ok(has(s,1,scenario==='own bird'?'grave':'battle',enemy));
 }
});

test('Bolzard keeps W Breaker and loses the battle bonus as the grave condition changes',()=>{
 const s=field(),x=add(s,0,'battle',BOLZ),enemy=add(s,1,'battle',BIG);
 give(s,0,'grave',[BIRD,BIRD]);
 assert.equal(e.matchupPower(x,enemy,false,s),12000);
 s.players[0].grave.length=0;
 assert.equal(e.matchupPower(x,enemy,false,s),6000);
 attack(s,x.uid);passBlock(s);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Bolzard spell discards, draws and then destroys a legal opponent up to 2000 power',()=>{
 for(const withHand of [false,true]){
  const s=field(),drawn=s.players[0].deck[0],ally=add(s,0,'battle',W);
  const weak=add(s,1,'battle',F),strong=add(s,1,'battle',BIG);
  const discard=withHand?add(s,0,'hand',BIRD):null;
  const spell=play(s,BOLZ,1);
  if(discard){
   assert.ok(!has(s,0,'hand',drawn));
   pick(s,discard.uid);
   assert.ok(has(s,0,'grave',discard));
  }
  assert.ok(has(s,0,'hand',drawn));
  assert.deepEqual(picks(s),[weak.uid]);
  pick(s,weak.uid);drain(s);
  assert.ok(has(s,1,'grave',weak)&&has(s,1,'battle',strong));
  assert.ok(has(s,0,'grave',spell)&&has(s,0,'battle',ally));
 }
});

test('Semipuro draws three and returns exactly two hand cards in specified top order after save',()=>{
 let s=field();
 give(s,0,'deck',[F,N,W,...Array(17).fill(N)]);
 const [a,b,c,oldTop]=s.players[0].deck;
 const oldHand=add(s,0,'hand',BIG);
 const spell=play(s,SEMI,1);
 assert.deepEqual(new Set(picks(s)),new Set([a.uid,b.uid,c.uid,oldHand.uid]));
 pick(s,b.uid);
 assert.deepEqual(new Set(picks(s)),new Set([a.uid,c.uid,oldHand.uid]));
 s=JSON.parse(JSON.stringify(s));pick(s,oldHand.uid);drain(s);
 assert.deepEqual(s.players[0].deck.slice(0,3).map(x=>x.uid),[b.uid,oldHand.uid,oldTop.uid]);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[a.uid,c.uid]);
 assert.ok(has(s,0,'grave',spell)&&!has(s,0,'battle',spell));
});

test('Semipuro is a creature-only Shield Trigger and on destruction returns an opponent to its owner',()=>{
 const s=field(1);give(s,0,'mana',[]);give(s,0,'shields',[SEMI]);
 const shield=s.players[0].shields[0];
 const first=add(s,1,'battle',F),attacker=add(s,1,'battle',BIG);
 const controlled=add(s,1,'battle',W,{cardOwner:0}),ally=add(s,0,'battle',F);
 attack(s,first.uid);passBlock(s);
 assert.equal(e.getLegalActions(s).filter(a=>a.kind==='useTrigger'&&a.cardId===SEMI).length,1);
 act(s,'useTrigger',a=>a.cardId===SEMI);drain(s);
 assert.ok(has(s,0,'battle',shield));
 assert.equal(s.metrics[0].triggers,1);
 assert.equal(s.players[0].hand.length,0);
 attack(s,attacker.uid);act(s,'block',a=>a.uid===shield.uid);
 assert.ok(!picks(s).includes(ally.uid)&&picks(s).includes(controlled.uid));
 pick(s,controlled.uid);drain(s);
 assert.ok(has(s,0,'grave',shield)&&has(s,0,'hand',controlled)&&!has(s,1,'battle',controlled));
});

test('Semipuro does not trigger when returned to hand instead of destroyed',()=>{
 const s=field(1),x=add(s,0,'battle',SEMI),attacker=add(s,1,'battle',BIG);
 play(s,'dm23rp1-056',1);pick(s,x.uid);drain(s);
 assert.ok(has(s,0,'hand',x)&&has(s,1,'battle',attacker)&&!s.decision);
});

test('Iris untaps its creatures before allowing any prefix of individual draws (QA 31572)',()=>{
 for(const n of [0,1,4]){
  const s=field();
  const ally=add(s,0,'battle',N,{tapped:true});
  const alreadyReady=add(s,0,'battle',W);
  const sealed=add(s,0,'battle',F,{tapped:true});
  (s.players[0].seals??=[]).push({...inst(N),sealOf:sealed.uid});
  const seed=add(s,0,'battle',SEED,{tapped:true});
  const dormant=add(s,0,'battle',BALA,{tapped:true});
  const third=add(s,0,'battle',W,{tapped:true});
  const enemy=add(s,1,'battle',F,{tapped:true});
  const drawn=s.players[0].deck.slice(0,4);
  const x=play(s,IRIS);
  assert.ok([ally,alreadyReady,third,x].every(y=>!y.tapped));
  assert.ok([sealed,seed,dormant,enemy].every(y=>y.tapped));
  assert.equal(e.effectiveCard(x,s).blocker,true);
  for(let i=0;i<n;i++){
   pick(s,true);
   assert.deepEqual(s.players[0].hand.map(y=>y.uid),drawn.slice(0,i+1).map(y=>y.uid));
  }
  if(n<4)pick(s,null);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].hand.length,n);
 }
});

test('Iris spell chooses and taps before drawing, and also draws with no available target',()=>{
 for(const target of ['untapped','tapped','none']){
  const s=field(),top=s.players[0].deck[0];
  const ally=add(s,0,'battle',N),seed=add(s,1,'battle',SEED);
  const x=target==='none'?null:add(s,1,'battle',F,{tapped:target==='tapped'});
  const spell=play(s,IRIS,1);
  if(x){
   assert.deepEqual(picks(s),[x.uid]);
   assert.ok(!has(s,0,'hand',top));
   pick(s,x.uid);
   assert.ok(x.tapped);
  }
  drain(s);
  assert.ok(!ally.tapped&&!seed.tapped&&has(s,0,'hand',top)&&has(s,0,'grave',spell));
 }
});
