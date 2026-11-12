import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const ARCA='dmx21-029',WAR='promoy23-082',ZARI='dmex03-006';
const ANGEL='dm01-s01',DEMON='dmr15-042',WATER='dm01-083',LIGHT='dm01-075',FIRE='dm01-097',NATURE='dm01-108',DARK='dm01-090';
const SPARK='dm01-015',RAINBOW='dmr23-039',BOUNCE='dm01-086';
const SEED='dm22ex1-086',SEED_CREATURE='dm22rp1-8A',COLORLESS='dmrp01-058';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const ids=xs=>xs.map(x=>x.uid);
const physical=s=>ids(e.physicalCards(s)).sort();
const restore=s=>decodeBattleData(encodeBattleData(s));
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
 return x;
}
function evolve(s,source,base){
 play(s,source);
 assert.equal(s.decision.type,'evolution');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.deepEqual(ids(source.under),[base.uid]);
}

test('Three evolution creatures and the Warbalom print retain verified card IDs, images and limits',()=>{
 const m=read('tools/support-phase-1073.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(r=>r.id),[ARCA,WAR,ZARI]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[['promoy23-Sec082',WAR]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.ok(row.verification.facesMatched&&cat.get(row.id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1073}),m.cards.find(r=>r.id===id).spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,c.civ,c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizationText,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.id===id)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
 }
});

test('Arcafeus evolves from an Angel Command and restricts spells for both players',()=>{
 const s=field(),source=add(s,0,'hand',ARCA),base=add(s,0,'battle',ANGEL);
 add(s,0,'battle',LIGHT);
 evolve(s,source,base);
 assert.equal(e.card(source).breaker,3);
 for(const p of [0,1]){
  s.active=p;
  const allowed=[SPARK,RAINBOW].map(id=>add(s,p,'hand',id));
  const forbidden=add(s,p,'hand',BOUNCE);
  const legal=e.getLegalActions(s).filter(a=>a.kind==='play');
  assert.ok(allowed.every(x=>legal.some(a=>a.uid===x.uid)));
  assert.ok(!legal.some(a=>a.uid===forbidden.uid));
 }
 source.g35Ignored=s.turn;
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===BOUNCE));
});

test('Arcafeus makes non-light creatures enter tapped on both sides, including colorless ones',()=>{
 const s=field(),source=add(s,0,'battle',ARCA,{under:[inst(ANGEL)]});
 const existing=add(s,0,'battle',FIRE);
 for(const p of [0,1]){
  s.active=p;
  assert.equal(play(s,add(s,p,'hand',FIRE)).tapped,true);
  assert.equal(play(s,add(s,p,'hand',COLORLESS)).tapped,true);
  assert.equal(play(s,add(s,p,'hand',LIGHT)).tapped,false);
  const war=add(s,p,'hand',WAR),base=add(s,p,'battle',DEMON);
  evolve(s,war,base);
  assert.equal(war.tapped,false);
 }
 assert.equal(existing.tapped,false);
 source.g35Ignored=s.turn;
 assert.equal(play(s,add(s,1,'hand',FIRE)).tapped,false);
});

test('Arcafeus checks card type before entry, including a Tamaseed creature',()=>{
 const s=field();
 add(s,1,'battle',ARCA,{under:[inst(ANGEL)]});
 const seed=play(s,add(s,0,'hand',SEED));
 assert.equal(seed.tapped,false);
 const dual=play(s,add(s,0,'hand',SEED_CREATURE));
 drain(s);
 assert.equal(e.isCreature(s,dual),false);
 assert.equal(dual.tapped,true);
});

test('Warbalom requires one mana of each civilization, a sixth mana, and an allied Demon Command',()=>{
 const s=field(),source=add(s,0,'hand',WAR);
 const [light,water,dark,fire,nature,extra]=give(s,0,'mana',[LIGHT,WATER,DARK,FIRE,NATURE,DARK]);
 add(s,0,'battle',ANGEL);
 add(s,1,'battle',DEMON);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===source.uid));
 const base=add(s,0,'battle',DEMON);
 nature.tapped=true;
 add(s,0,'mana',DARK);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===source.uid));
 nature.tapped=false;
 extra.tapped=true;
 const spare=s.players[0].mana.at(-1);
 spare.tapped=true;
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===source.uid));
 extra.tapped=false;
 evolve(s,source,base);
 assert.ok([light,water,dark,fire,nature,extra].every(x=>x.tapped));
 assert.equal(e.card(source).breaker,3);
});

test('Warbalom charges tapped and provides one mana when untapped',()=>{
 const s=field(),source=add(s,0,'hand',WAR);
 give(s,0,'mana',[DARK]);
 s.phase='charge';
 act(s,'charge',a=>a.uid===source.uid);
 assert.equal(s.players[0].mana.find(x=>x.uid===source.uid).tapped,true);
 assert.equal(e.manaValueAt(s,0,source),1);
 assert.deepEqual(e.manaCivilizations(e.card(source)),['光','水','闇','火','自然']);
 source.tapped=false;
 play(s,add(s,0,'hand',WATER));
 assert.ok(s.players[0].mana.every(x=>x.tapped));
});

test('Zariganinzo puts one water hand creature under itself and attacks immediately without being blocked',()=>{
 let s=field();
 const source=add(s,0,'hand',ZARI);
 add(s,0,'hand',BOUNCE);
 add(s,0,'hand','dm24bd4-007');
 const fieldWater=add(s,0,'battle',WATER);
 const blocker=add(s,1,'battle','dm01-076');
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===source.uid));
 const twin=add(s,0,'hand','dmex06-024'),water=add(s,0,'hand',WATER),all=physical(s);
 play(s,source);
 assert.equal(s.decision.task.op,'g48_HandBases');
 assert.deepEqual(choices(s),[twin.uid,water.uid]);
 s=restore(s);
 pick(s,twin.uid);
 const evolution=s.players[0].battle.find(x=>x.uid===source.uid);
 assert.deepEqual(ids(evolution.under),[twin.uid]);
 assert.equal(s.players[0].enteredThisTurn,1);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,8);
 assert.ok(s.players[0].battle.some(x=>x.uid===fieldWater.uid));
 assert.equal(e.effectiveCard(blocker,s).blocker,true);
 attack(s,evolution.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 assert.deepEqual(physical(s),all);
});
