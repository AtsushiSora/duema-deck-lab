import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-818.json',import.meta.url)));
const KING='dm32-083',STRIKE='dm30-051',GAINER='dm35-007';
const NATURE='dm01-108',WATER='dm01-083',EVO='dm02-033',NEO='dmrp01-087';
const KNIGHT='dm31-048',NIGHTMARE='dmr14-044',TRIPLE='dmd21-002',GEAR='dm14-110';
const BABYLONIA='dm32-021',BIGBANG='dmrp20-s10',CALEICO='dm22ex1-086';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 818 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,3);
 assert.deepEqual(printAliases,[]);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:818}));
  assert.throws(()=>standardCardSpec(detail,{phase:817}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:818}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);

const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const evolve=(s,card,base)=>act(s,'evolve',a=>a.uid===card.uid&&(a.baseUid??null)===(base?.uid??null));

for(const mode of ['normal','decline','neo','plain','babylonia','no draw'])test('Bullfang bottoms exactly one hand card after its successful optional draw: '+mode,()=>{
 let s=setup();
 const king=put(s,0,'battle',KING),base=put(s,0,'battle',NATURE);
 const evo=put(s,0,'hand',mode==='neo'||mode==='plain'?NEO:EVO);
 const old=put(s,0,'hand',WATER);
 const [first,second,tail]=give(s,0,'deck',mode==='no draw'?[]:[NATURE,WATER,NATURE]);
 let revive;
 if(mode==='babylonia')put(s,0,'battle',BABYLONIA);
 if(mode==='no draw'){
  put(s,0,'battle',BIGBANG);
  revive=put(s,0,'grave',WATER);
 }
 play(s,evo);
 evolve(s,evo,mode==='plain'?null:base);
 if(mode==='plain'){
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'hand',old)&&has(s,0,'deck',first));
  return;
 }
 assert.equal(s.decision.task.source,king.cardId);
 pick(s,mode==='decline'?null:true);
 if(mode==='decline'){
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'hand',old)&&has(s,0,'deck',first));
  return;
 }
 if(mode==='no draw'){
  assert.equal(s.decision.task.op,'g10_Draws');
  pick(s,revive.uid);
  assert.ok(has(s,0,'battle',revive));
  assert.ok(has(s,0,'hand',old));
  assert.equal(s.decision,null);
  return;
 }
 if(mode==='babylonia'){
  act(s,'replaceDraw',a=>a.replace);
  s=JSON.parse(JSON.stringify(s));
  act(s,'discardDraw',a=>a.uid===second.uid);
  assert.ok(has(s,0,'grave',second));
 }
 assert.deepEqual(values(s),[old.uid,first.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,first.uid);
 assert.equal(s.players[0].deck.at(-1).uid,first.uid);
 assert.ok(has(s,0,'deck',tail)&&has(s,0,'hand',old));
 assert.equal(s.decision,null);
});

for(const mode of ['no knight','nightmare','decline','same','different'])test('Bakuretsu chooses its own creature per use and repeats once with an actual Knight: '+mode,()=>{
 let s=setup();
 const first=put(s,0,'battle',NATURE),second=put(s,0,'battle',TRIPLE);
 const enemy=put(s,1,'battle',KNIGHT);
 if(mode==='nightmare')put(s,0,'battle',NIGHTMARE);
 const knight=['decline','same','different'].includes(mode)?put(s,0,'battle',KNIGHT):null;
 const spell=put(s,0,'hand',STRIKE);
 const live=x=>s.players[0].battle.find(y=>y.uid===x.uid);
 const original=e.power(live(second),false,s);
 play(s,spell);
 assert.ok(values(s).includes(first.uid)&&values(s).includes(second.uid)&&!values(s).includes(enemy.uid));
 pick(s,first.uid);
 if(knight){
  assert.equal(s.decision.task.op,'g70_Knight');
  s=JSON.parse(JSON.stringify(s));
  pick(s,mode==='decline'?false:true);
  if(mode!=='decline')pick(s,mode==='same'?first.uid:second.uid);
 }
 assert.equal(s.decision,null);
 assert.equal(e.power(live(first),false,s),mode==='same'?8000:5000);
 assert.equal(e.effectiveCard(live(first),s).breaker,2);
 assert.equal(e.power(live(second),false,s),original+(mode==='different'?3000:0));
 assert.equal(s.metrics[0].played[STRIKE],1);
 assert.ok(has(s,0,'grave',spell));
 if(mode==='different'){
  attack(s,second.uid);
  act(s,'noBlock');
  assert.deepEqual([...values(s)].sort(),[2,3]);
  pick(s,2);
  act(s,'breakShields',a=>a.shields.length===2);
  assert.equal(s.players[1].shields.length,3);
  act(s,'endTurn');
  assert.equal(e.power(live(first),false,s),2000);
  assert.equal(e.effectiveCard(live(second),s).breaker,3);
 }
});

for(const mode of ['single','evolution','linked','redirect'])test('Atomic Gainer adds one new hidden shield per constituent card: '+mode,()=>{
 let s=setup();
 const target=put(s,0,'battle',mode==='linked'?'dmex17-033':mode==='evolution'?EVO:NATURE);
 const ally=put(s,0,'battle',WATER),gear=put(s,0,'battle',GEAR);
 const enemy=put(s,1,'battle',WATER);
 gear.crossedTo={uid:target.uid,incarnation:0};
 if(mode==='evolution'||mode==='linked')target.under=[inst(NATURE)];
 if(mode==='linked')target.godLinks=[{...inst('dmex17-059'),under:[inst(WATER)]}];
 if(mode==='redirect')put(s,1,'battle',CALEICO);
 const [top]=give(s,0,'deck',Array(9).fill(NATURE));
 const deck=s.players[0].deck.map(x=>x.uid);
 const shields=s.players[0].shields.map(x=>x.uid);
 const spell=put(s,0,'hand',GAINER);
 play(s,spell);
 assert.deepEqual(values(s),[target.uid,ally.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,target.uid);
 const count=mode==='linked'?4:mode==='evolution'?2:1;
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck.slice(count));
 assert.deepEqual(s.players[0].shields.map(x=>x.uid),mode==='redirect'?shields:[...shields,...deck.slice(0,count)]);
 assert.ok(s.players[0].shields.slice(shields.length).every(x=>!x.faceUp&&!x.shieldStack));
 if(mode==='redirect')assert.ok(has(s,0,'grave',top));
 assert.ok(has(s,0,'battle',gear)&&has(s,1,'battle',enemy)&&has(s,0,'grave',spell));
});

test('Bakuretsu stops modifying power and breaker while its spell effect is ignored',()=>{
 const s=setup(),ally=put(s,0,'battle','dm01-004'),other=put(s,0,'battle','dm01-001');
 const original=e.power(ally,false,s);
 play(s,put(s,0,'hand',STRIKE));
 pick(s,ally.uid);
 assert.equal(e.power(ally,false,s),original+3000);
 assert.equal(e.effectiveCard(ally,s).breaker,2);
 const genmu=put(s,1,'battle','dmrp15-km1');
 assert.equal(e.power(ally,false,s),original);
 assert.equal(e.effectiveCard(ally,s).breaker??1,1);
 s.players[1].battle=s.players[1].battle.filter(x=>x.uid!==genmu.uid);
 assert.equal(e.effectiveCard(ally,s).breaker,2);
 assert.ok(has(s,0,'battle',other));
});
