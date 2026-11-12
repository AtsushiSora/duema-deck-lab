import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const ALCA='dmx17-001',BAJURA='dmx24-002',BAROM='dmx04-s01',KODORIAN='dm22ex1-121',DEAD='dmbd10-007';
const LIGHT_DRAGON='dmr14-034',FIRE_DRAGON='dmx17-008',ANGEL='dm01-s01';
const NATURE='dm01-108',WATER='dm01-083',DARK='dm01-055',HUNTER='dmr01-093',OTHER_HUNTER='dmr05-076';
const SPARK='dm01-015',RAINBOW='dmr23-039',DEMON='dm01-027',BOUNCE='dm01-086';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const ids=xs=>xs.map(x=>x.uid);
const physical=s=>ids(e.physicalCards(s)).sort();
const restore=s=>decodeBattleData(encodeBattleData(s));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const choiceValue=o=>o.value?.uid??o.value;
const choices=s=>s.decision.choices.map(choiceValue);
const pick=(s,v)=>act(s,'extended',a=>choiceValue(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,x){
 act(s,'play',a=>a.uid===x.uid);
}
function evolve(s,source,base,eligible=[base]){
 play(s,source);
 assert.equal(s.decision.type,'evolution');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),ids(eligible));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.deepEqual(ids(source.under),[base.uid]);
}
function resolveAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
}

test('Five evolution creatures and the Bajura print retain verified card IDs, images and limits',()=>{
 const m=read('tools/support-phase-1072.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(r=>r.id),[ALCA,BAJURA,BAROM,KODORIAN,DEAD]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[['dmx24-Sec2',BAJURA]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.ok(row.verification.facesMatched&&cat.get(row.id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1072}),m.cards.find(r=>r.id===id).spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,c.civ,c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizationText,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.id===id)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
 }
});

test('Arcadias D needs a light Dragon and lets both players cast light or light multicolor spells',()=>{
 const s=field(),source=add(s,0,'hand',ALCA),base=add(s,0,'battle',LIGHT_DRAGON);
 add(s,0,'battle',FIRE_DRAGON);
 add(s,0,'battle',ANGEL);
 evolve(s,source,base);
 assert.equal(e.card(source).breaker,3);
 for(const p of [0,1]){
  s.active=p;
  const playable=[SPARK,RAINBOW,'dm01-097'].map(id=>add(s,p,'hand',id));
  const blocked=[DEMON,BOUNCE].map(id=>add(s,p,'hand',id));
  const actions=e.getLegalActions(s).filter(a=>a.kind==='play');
  assert.ok(playable.every(x=>actions.some(a=>a.uid===x.uid)));
  assert.ok(blocked.every(x=>!actions.some(a=>a.uid===x.uid)));
 }
 s.players[0].battle=s.players[0].battle.filter(x=>x!==source);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===DEMON));
});

test('Arcadias D stops a non-light shield trigger and preserves a light multicolor shield trigger',()=>{
 for(const [shieldId,canTrigger] of [[DEMON,false],[RAINBOW,true]]){
  const s=field(),source=add(s,0,'battle',ALCA,{under:[inst(LIGHT_DRAGON)]});
  const [shield]=give(s,1,'shields',[shieldId]);
  attack(s,source.uid);
  act(s,'noBlock');
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===shield.uid),canTrigger);
  if(!canTrigger)assert.ok(has(s,1,'hand',shield));
 }
});

test('Bajura can select one opposing mana card or decline before combat',()=>{
 for(const accept of [false,true]){
  let s=field();
  const source=add(s,0,'hand',BAJURA),base=add(s,0,'battle',FIRE_DRAGON);
  add(s,0,'battle',NATURE);
  evolve(s,source,base);
  const [visible,hidden]=give(s,1,'mana',[NATURE,WATER]);
  hidden.faceDown=true;
  const all=physical(s);
  attack(s,source.uid);
  assert.equal(s.decision.player,0);
  assert.deepEqual(choices(s),[visible.uid,hidden.uid,null]);
  const hiddenChoice=s.decision.choices.find(o=>choiceValue(o)===hidden.uid);
  assert.equal(hiddenChoice.label,'裏向きのカード');
  assert.equal(hiddenChoice.cardId,undefined);
  s=restore(s);
  pick(s,accept?hidden.uid:null);
  resolveAttack(s);
  assert.equal(has(s,1,'grave',hidden),accept);
  assert.ok(has(s,1,'mana',visible));
  assert.equal(s.players[1].shields.length,2);
  assert.deepEqual(physical(s),all);
 }
});

test('Barom destroys non-Hunters on both sides and keeps creatures with Hunter among multiple races',()=>{
 const s=field(),source=add(s,0,'hand',BAROM),base=add(s,0,'battle',HUNTER);
 const ally=add(s,0,'battle',DARK),enemy=add(s,1,'battle',WATER);
 const allyHunter=add(s,0,'battle',OTHER_HUNTER),enemyHunter=add(s,1,'battle',OTHER_HUNTER);
 const seed=add(s,1,'battle','dm25rp4-013'),all=physical(s);
 evolve(s,source,base,[base,allyHunter]);
 assert.ok(has(s,0,'grave',ally)&&has(s,1,'grave',enemy));
 assert.ok(has(s,0,'battle',allyHunter)&&has(s,1,'battle',enemyHunter));
 assert.ok(has(s,1,'battle',seed)&&has(s,0,'battle',source));
 assert.deepEqual(physical(s),all);
});

test('Kodorian uses a tapped nature creature from mana and moves the whole stack to mana on destruction',()=>{
 const s=field(),source=add(s,0,'hand',KODORIAN);
 const [base,spell]=give(s,0,'mana',['dmr02-054','dm32-070',DARK,WATER,LIGHT_DRAGON,FIRE_DRAGON]);
 base.tapped=true;
 add(s,0,'battle',NATURE);
 const removal=add(s,1,'hand',DEMON),all=physical(s);
 evolve(s,source,base);
 assert.equal(source.tapped,false);
 assert.ok(!has(s,0,'mana',base)&&has(s,0,'mana',spell));
 s.active=1;
 play(s,removal);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===source.uid));
 assert.ok(has(s,0,'mana',source)&&has(s,0,'mana',base));
 assert.equal(s.players[0].mana.find(x=>x.uid===base.uid).tapped,true);
 assert.deepEqual(physical(s),all);
});

test('Kodorian goes to hand on a bounce and needs an eligible card in mana',()=>{
 const s=field(),source=add(s,0,'hand',KODORIAN);
 give(s,0,'mana',Array(5).fill('dm32-070'));
 add(s,0,'battle',NATURE);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===source.uid));
 const base=add(s,0,'mana',NATURE);
 evolve(s,source,base);
 s.active=1;
 play(s,add(s,1,'hand',BOUNCE));
 act(s,'effect',a=>a.targets?.some(t=>t.uid===source.uid));
 assert.ok(has(s,0,'hand',source)&&has(s,0,'hand',base));
});

test('Dead 55 evolves from a dark creature in its graveyard through Tokoshie and mills exactly two',()=>{
 let s=field();
 const source=add(s,0,'hand',DEAD),dark=add(s,0,'grave',DARK),other=add(s,0,'grave',HUNTER);
 const wrong=add(s,0,'grave',NATURE),spell=add(s,0,'grave',DEMON);
 add(s,1,'grave',DARK);
 add(s,1,'battle','dmrp17-025');
 const [first,second,third]=s.players[0].deck,all=physical(s);
 play(s,source);
 assert.equal(s.decision.task.op,'g31_Bases');
 assert.deepEqual(new Set(choices(s)),new Set([dark.uid,other.uid]));
 s=restore(s);
 pick(s,dark.uid);
 assert.deepEqual(ids(s.players[0].battle.find(x=>x.uid===source.uid).under),[dark.uid]);
 assert.deepEqual(ids(s.players[0].grave),[other.uid,wrong.uid,spell.uid,first.uid,second.uid]);
 assert.equal(s.players[0].deck[0].uid,third.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.deepEqual(physical(s),all);
});
