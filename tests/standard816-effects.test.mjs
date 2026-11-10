import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-816.json',import.meta.url)));
const PAPURA='dm31-031',KESHO='dm32-067',MIKA='dm31-045';
const NATURE='dm01-108',WATER='dm01-083',GEAR='dm14-110',DRAW='dm06-085',BLOCKER='dm01-076';
const EVOLUTION='dm02-033',NEO='dmrp01-087',TWIN='dm23ex2-005';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 816 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,3);
 assert.deepEqual(printAliases,[]);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:816}));
  assert.throws(()=>standardCardSpec(detail,{phase:815}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:816}));
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

const targets=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const canDefend=(s,kind,x)=>e.getLegalActions(s).some(a=>a.kind===kind&&a.uid===x.uid);
const evolve=(s,x,base)=>act(s,'evolve',a=>a.uid===x.uid&&(a.baseUid??null)===(base?.uid??null));

test('Papura must select one enemy blocker and only stops its block through the turn end',()=>{
 let s=setup();
 const papura=put(s,0,'battle',PAPURA),ally=put(s,0,'battle',BLOCKER);
 const chosen=put(s,1,'battle',BLOCKER),other=put(s,1,'battle',BLOCKER);
 const victim=put(s,1,'battle',WATER);
 victim.tapped=true;
 chosen.g34Grants=[{turn:s.turn,guardman:true}];
 play(s,put(s,0,'hand',DRAW));
 assert.deepEqual(targets(s),[chosen.uid,other.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,chosen.uid);
 assert.ok(e.effectiveCard(s.players[1].battle[0],s).blocker);
 attack(s,papura.uid,victim.uid);
 assert.ok(!canDefend(s,'block',chosen)&&canDefend(s,'block',other));
 assert.ok(canDefend(s,'guardman',chosen));
 assert.ok(!s.extLimits.some(x=>x.kind==='attack'&&x.uid===chosen.uid));
 act(s,'noBlock');
 act(s,'endTurn');
 assert.ok(!s.extLimits.some(x=>x.kind==='block'&&x.uid===chosen.uid));
 assert.ok(has(s,0,'battle',ally));
});

test('Papura ignores the opponent casting and is suppressed while its ability is ignored',()=>{
 for(const mode of ['opponent','ignored']){
  const s=setup(),papura=put(s,0,'battle',PAPURA);
  put(s,1,'battle',BLOCKER);
  if(mode==='opponent')s.active=1;
  else papura.g35Ignored=s.turn;
  play(s,put(s,s.active,'hand',DRAW));
  assert.equal(s.decision,null);
  assert.ok(!(s.extLimits||[]).some(x=>x.kind==='block'));
 }
});

test('Kesho may deploy a small evolution without summoning it or triggering itself again',()=>{
 const s=setup(),watch=put(s,0,'battle',KESHO),base=put(s,0,'battle',NATURE);
 const first=put(s,0,'hand',EVOLUTION),second=put(s,0,'hand',EVOLUTION),small=put(s,0,'hand',WATER);
 const expensive=put(s,0,'hand',TWIN),spell=put(s,0,'hand',DRAW);
 play(s,first);
 evolve(s,first,base);
 assert.deepEqual(targets(s),[second.uid,small.uid,null]);
 const mana=s.players[0].mana.map(x=>x.tapped);
 pick(s,second.uid);
 if(s.decision?.task?.op==='g34_Put')pick(s,watch.uid);
 assert.ok(has(s,0,'battle',second)&&has(s,0,'hand',small));
 assert.ok(has(s,0,'hand',expensive)&&has(s,0,'hand',spell));
 assert.deepEqual(s.players[0].mana.map(x=>x.tapped),mana);
 assert.equal(s.players[0].battle.find(x=>x.uid===second.uid).summonedTurn,undefined);
 assert.equal(s.decision,null);
});

for(const mode of ['base','neo','plain','ignored'])test('Kesho handles evolution summon timing: '+mode,()=>{
 const s=setup(),watch=put(s,0,'battle',KESHO),small=put(s,0,'hand',WATER);
 const evo=put(s,0,'hand',mode==='neo'||mode==='plain'?NEO:EVOLUTION);
 if(mode==='ignored')watch.g35Ignored=s.turn;
 play(s,evo);
 evolve(s,evo,mode==='plain'?null:watch);
 if(mode==='plain'||mode==='ignored'){
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'hand',small));
 }else{
  assert.deepEqual(targets(s),[small.uid,null]);
  pick(s,mode==='neo'?null:small.uid);
  assert.equal(has(s,0,'battle',small),mode==='base');
  assert.equal(s.players[0].battle.find(x=>x.uid===evo.uid).under[0].uid,watch.uid);
 }
});

for(const mode of ['decline gear','decline draw','one','two','cannot move'])test('Mikazuki draws up to two only after its Cross Gear reaches the graveyard: '+mode,()=>{
 let s=setup();
 const mika=put(s,0,'battle',MIKA),gear=put(s,0,'battle',GEAR);
 const ally=put(s,0,'battle',NATURE),opposing=put(s,1,'battle',GEAR);
 gear.crossedTo={uid:ally.uid,incarnation:0};
 if(mode==='cannot move')gear.g26Stay=true;
 const before=s.players[0].hand.length;
 const deck=s.players[0].deck.slice(0,2).map(x=>x.uid);
 attack(s,mika.uid);
 assert.deepEqual(targets(s),[gear.uid,null]);
 pick(s,mode==='decline gear'?null:gear.uid);
 const moved=mode!=='decline gear'&&mode!=='cannot move';
 assert.equal(has(s,0,'grave',gear),moved);
 assert.ok(has(s,1,'battle',opposing)&&has(s,0,'battle',ally));
 if(moved){
  assert.equal(s.decision.task.op,'g34_DrawUpTo');
  s=JSON.parse(JSON.stringify(s));
  pick(s,mode==='one'||mode==='two'?true:null);
  if(mode==='one'||mode==='two')pick(s,mode==='two'?true:null);
 }
 const count=mode==='two'?2:mode==='one'?1:0;
 assert.equal(s.players[0].hand.length,before+count);
 assert.deepEqual(s.players[0].hand.slice(before).map(x=>x.uid),deck.slice(0,count));
 assert.equal(s.decision.type,'block');
});
