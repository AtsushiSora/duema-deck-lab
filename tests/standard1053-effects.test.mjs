import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const JILL='dmrp05-034',STREET='dmex14-043',MIRA='dmex01-068';
const GREEN='dm01-108',LIGHT='dm01-075',WATER='dm01-083',FIRE='dm01-097',DRAGON='dm08-049';
const SEED='dm22ex1-086',ONIKAMASU='dmrp01-041',MULTI='dm23bd5-003';
const LARGE='dm10-006',LARGE_SPELL='dmr13-033',HEAVENS='dm16-007',SURFER='dm05-024';
const RUPIA='dm06-062';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const live=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);

function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(GREEN));
  give(s,p,'grave',[]);
 }
 return s;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}
function breakSingleShield(s,x,shield){
 attack(s,x.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(shield.uid));
}

test('Official definitions retain the full text, single printing, ID, stats, images and limits',()=>{
 const manifest=read('tools/support-phase-1053.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[JILL,STREET,MIRA]);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of manifest.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.ok(cat.get(row.id).supported&&row.verification.facesMatched);
  assert.equal(cat.get(row.id).id,row.id);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,manifest.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1053}),row.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
});

test('Jill enters with a single targeted tap and does not lock the selected creature',()=>{
 const s=field(),jill=add(s,0,'hand',JILL),target=add(s,1,'battle',FIRE);
 add(s,1,'battle',ONIKAMASU);
 add(s,1,'battle',SEED);
 play(s,jill);
 assert.deepEqual(choices(s),[target.uid]);
 pick(s,target.uid);
 assert.ok(target.tapped&&!e.skipsStartUntap(s,target));
});

test('Jill uses the printed summon cost and locks all current enemy creatures for one turn start',()=>{
 const s=field(),large=add(s,0,'hand',LARGE);
 add(s,0,'battle',JILL);
 add(s,0,'battle',RUPIA);
 const target=add(s,1,'battle',ONIKAMASU),already=add(s,1,'battle',WATER,{tapped:true});
 const seed=add(s,1,'battle',SEED),all=physical(s);
 play(s,large);
 drain(s);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,7);
 assert.ok([target,already].every(x=>x.tapped&&e.skipsStartUntap(s,x)));
 assert.ok(!seed.tapped&&live(s,0,'battle',large));
 assert.deepEqual(physical(s),all);
 const later=add(s,1,'battle',FIRE,{tapped:true});
 end(s);
 assert.ok(target.tapped&&already.tapped&&!later.tapped);
 end(s);
 end(s);
 assert.ok(!target.tapped&&!already.tapped);
});

test('Jill observes a cost-eight spell cast by the opponent on Jill’s turn, before the source leaves',()=>{
 let s=field();
 const jill=add(s,0,'battle',JILL),attacker=add(s,0,'battle',DRAGON),enemy=add(s,1,'battle',LARGE);
 give(s,1,'shields',[LARGE_SPELL]);
 const shield=s.players[1].shields[0],all=physical(s);
 breakSingleShield(s,attacker,shield);
 s=restore(s);
 act(s,'useTrigger',a=>a.uid===shield.uid);
 drain(s);
 assert.ok(live(s,0,'grave',jill));
 assert.ok(live(s,1,'battle',enemy).tapped&&e.skipsStartUntap(s,live(s,1,'battle',enemy)));
 assert.deepEqual(physical(s),all);
});

test('Jill ignores high-cost creatures put into battle by a lower-cost spell and use on the other turn',()=>{
 const s=field(),deploy=add(s,0,'hand',HEAVENS),body=add(s,0,'hand',MULTI);
 add(s,0,'battle',JILL);
 const target=add(s,1,'battle',LARGE);
 play(s,deploy);
 drain(s);
 assert.ok(live(s,0,'battle',body)&&!target.tapped);
 s.active=1;
 s.phase='main';
 play(s,add(s,1,'hand',LARGE));
 drain(s);
 assert.ok(!target.tapped);
});

test('Street Spark taps only the chosen three and the multicolor bonus includes a previously tapped target',()=>{
 let s=field();
 const street=add(s,0,'hand',STREET),support=add(s,0,'battle',MULTI);
 const a=add(s,1,'battle',FIRE),b=add(s,1,'battle',WATER,{tapped:true}),c=add(s,1,'battle',GREEN);
 const untouched=add(s,1,'battle',LIGHT,{tapped:true}),protectedCard=add(s,1,'battle',ONIKAMASU);
 const all=physical(s);
 play(s,street);
 assert.ok(!choices(s).includes(protectedCard.uid));
 pick(s,a.uid);
 s=restore(s);
 pick(s,b.uid);
 pick(s,c.uid);
 assert.ok(live(s,0,'battle',support));
 assert.ok([a,b,c].every(x=>live(s,1,'battle',x).tapped&&e.skipsStartUntap(s,live(s,1,'battle',x))));
 assert.ok(!e.skipsStartUntap(s,live(s,1,'battle',untouched)));
 assert.deepEqual(physical(s),all);
 end(s);
 assert.ok([a,b,c].every(x=>live(s,1,'battle',x).tapped));
 assert.ok(!live(s,1,'battle',untouched).tapped);
});

test('Street Spark can be cast as a Shield Trigger and tap fewer than three without a friendly multicolor creature',()=>{
 const s=field(),attacker=add(s,0,'battle',DRAGON),other=add(s,0,'battle',MULTI);
 give(s,1,'shields',[STREET]);
 const shield=s.players[1].shields[0];
 breakSingleShield(s,attacker,shield);
 act(s,'useTrigger',a=>a.uid===shield.uid);
 assert.equal(s.decision.player,1);
 pick(s,other.uid);
 pick(s,null);
 assert.ok(other.tapped&&!e.skipsStartUntap(s,other));
 assert.ok(live(s,1,'grave',shield));
});

test('Street Spark may select no targets',()=>{
 const s=field(),street=add(s,0,'hand',STREET),target=add(s,1,'battle',GREEN);
 add(s,0,'battle',MULTI);
 play(s,street);
 pick(s,null);
 assert.ok(!target.tapped&&live(s,0,'grave',street));
});

test('Miradante f evolves on a non-Light Dragon, taps the entire opposing creature board and breaks three shields',()=>{
 const s=field(),mira=add(s,0,'hand',MIRA),dragon=add(s,0,'battle',DRAGON),ordinary=add(s,0,'battle',LIGHT);
 const target=add(s,1,'battle',ONIKAMASU),other=add(s,1,'battle',GREEN,{tapped:true});
 const seed=add(s,1,'battle',SEED);
 play(s,mira);
 assert.deepEqual(e.getLegalActions(s).filter(x=>x.kind==='evolve').map(x=>x.baseUid),[dragon.uid]);
 act(s,'evolve',x=>x.baseUid===dragon.uid);
 assert.ok(live(s,0,'battle',ordinary)&&live(s,0,'battle',mira).under[0].uid===dragon.uid);
 assert.ok(target.tapped&&other.tapped&&!seed.tapped);
 assert.ok(e.skipsStartUntap(s,target)&&e.skipsStartUntap(s,other));
 attack(s,mira.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('Miradante f Revolution 0 prevents paid and trigger summons while allowing a spell to put a creature into battle',()=>{
 const s=field(),mira=add(s,0,'battle',MIRA),attacker=add(s,0,'battle',FIRE);
 s.players[0].shields=[];
 give(s,1,'shields',[SURFER]);
 const shield=s.players[1].shields[0];
 breakSingleShield(s,attacker,shield);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===shield.uid));
 drain(s);
 assert.ok(live(s,1,'hand',shield));
 s.active=1;
 s.phase='main';
 const gate=add(s,1,'hand',HEAVENS),creature=add(s,1,'hand',MULTI);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===creature.uid));
 play(s,gate);
 drain(s);
 assert.ok(live(s,1,'battle',creature));
 const unlocked=add(s,1,'hand',GREEN);
 add(s,0,'shields',GREEN);
 assert.ok(live(s,0,'battle',mira));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===unlocked.uid));
});
