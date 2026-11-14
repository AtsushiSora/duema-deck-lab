import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MEL='dm14-002',GREG='dm04-012',MUST='dmr08-sec02',DUAL='dmc67-005';
const WATER='dm01-083',NATURE='dm01-108',DARK='dm01-090',HEAVY='dm01-s06',XX='dmd08-018';
const BOUNCE='dmrp20-036',TYPHOON='dm11-043',BONE='dmd04-005';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const blocker=(s,x)=>!!e.effectiveCard(x,s).blocker;

test('the four official definitions preserve IDs, images, printed information and the full specs',()=>{
 const m=read('tools/support-phase-1277.json');
 const refs=read('tools/image-reference-prints.json').prints;
 const catalog=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[MEL,GREG,MUST,DUAL]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces:[f],image}=row,c=e.card(id),detail=details.cards.find(x=>x.id===id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1277}),row.spec);
  const altered=structuredClone(detail);altered.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1277}));
  assert.deepEqual(catalog.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.ok(refs.some(ref=>ref.id===id&&ref.canonicalId===id&&ref.image===image));
  assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Melaniya grants Blocker only to its controller’s creatures while they have zero shields',()=>{
 const s=field(1),mel=add(s,0,'battle',MEL),ally=add(s,0,'battle',NATURE),enemy=add(s,1,'battle',WATER);
 assert.equal(e.effectiveCard(mel,s).breaker,2);
 assert.ok(!blocker(s,mel)&&!blocker(s,ally));
 give(s,0,'shields',[]);
 assert.ok(blocker(s,mel)&&blocker(s,ally)&&!blocker(s,enemy));
 attack(s,enemy.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===ally.uid));
 act(s,'block',a=>a.uid===ally.uid);drain(s);
 assert.ok(ally.tapped&&has(s,1,'grave',enemy));
 give(s,0,'shields',[DARK]);
 assert.ok(!blocker(s,mel)&&!blocker(s,ally));
});

test('Melaniya loses the grant while ignored or after leaving',()=>{
 const s=field(1),mel=add(s,0,'battle',MEL),ally=add(s,0,'battle',DARK);
 give(s,0,'shields',[]);
 mel.g35Ignored=s.turn;assert.ok(!blocker(s,ally));
 delete mel.g35Ignored;assert.ok(blocker(s,ally));
 cast(s,BOUNCE);pick(s,mel.uid);
 assert.ok(has(s,0,'hand',mel)&&!blocker(s,ally));
});

test('Gregoria gives each player’s Demon Commands power and usable Blocker, and both grants stack or expire',()=>{
 const s=field(1),a=add(s,0,'battle',HEAVY),b=add(s,1,'battle',HEAVY),other=add(s,0,'battle',DARK);
 const g=add(s,0,'battle',GREG),second=add(s,1,'battle',GREG);
 assert.equal(e.power(a,false,s),11000);assert.equal(e.power(b,false,s),11000);
 assert.equal(e.power(other,false,s),2000);assert.ok(!blocker(s,other)&&!blocker(s,g));
 assert.ok(blocker(s,a)&&blocker(s,b));
 second.g35Ignored=s.turn;
 assert.equal(e.power(a,false,s),9000);assert.equal(e.power(b,false,s),9000);
 attack(s,b.uid);act(s,'block',x=>x.uid===a.uid);drain(s);
 assert.ok(has(s,0,'grave',a)&&has(s,1,'grave',b));
 s.phase='main';cast(s,BOUNCE);pick(s,g.uid);
 const c=add(s,0,'battle',HEAVY);
 assert.equal(e.power(c,false,s),7000);assert.ok(!blocker(s,c));
});

test('Mustang offers both branches using current power and Blocker granted by Gregoria',()=>{
 const s=field(),must=add(s,0,'battle',MUST),discarded=add(s,0,'hand',DARK);
 add(s,0,'battle',GREG);
 const low=add(s,1,'battle',WATER,{powerModifiers:[{amount:4000}]}),highBlocker=add(s,1,'battle',HEAVY);
 const high=add(s,1,'battle','dm26-030');
 cast(s,TYPHOON);pick(s,0);pick(s,discarded.uid);
 assert.equal(e.effectiveCard(must,s).breaker,2);
 assert.deepEqual(new Set(values(s)),new Set([low.uid,highBlocker.uid]));
 pick(s,highBlocker.uid);
 assert.ok(has(s,1,'grave',highBlocker)&&has(s,1,'battle',high)&&has(s,1,'battle',low));
});

test('Mustang triggers once per creature milled and skips a spell',()=>{
 const s=field();add(s,0,'battle',MUST);
 give(s,0,'deck',[NATURE,DARK,'dm01-086',NATURE,NATURE]);
 const a=add(s,1,'battle',WATER),b=add(s,1,'battle',WATER),c=add(s,1,'battle',WATER);
 cast(s,BONE);act(s,'orderEffect');pick(s,a.uid);pick(s,b.uid);
 assert.ok(has(s,1,'grave',a)&&has(s,1,'grave',b)&&has(s,1,'battle',c));
 assert.equal(s.decision,null);
 const last=add(s,1,'battle',WATER);
 cast(s,BONE);pick(s,c.uid);
 assert.ok(has(s,1,'grave',c)&&has(s,1,'battle',last));
 assert.equal(s.decision,null);
});

test('Mustang triggers from a creature removed from its controller’s mana and one destroyed by an effect',()=>{
 const s=field(1);
 add(s,0,'battle',MUST);const victim=add(s,0,'battle',DARK),mana=s.players[0].mana[0];
 const wilhelm=add(s,1,'hand','dmr07-s05'),first=add(s,1,'battle',WATER),second=add(s,1,'battle',WATER);
 act(s,'play',a=>a.uid===wilhelm.uid);pick(s,victim.uid);pick(s,mana.uid);
 act(s,'orderEffect');pick(s,0);pick(s,0);
 act(s,'orderEffect');pick(s,first.uid);pick(s,second.uid);
 assert.ok(has(s,0,'grave',victim)&&has(s,0,'grave',mana)&&has(s,1,'grave',first)&&has(s,1,'grave',second));
});

test('Mustang triggers when its controller’s creature loses a battle',()=>{
 const s=field(1);
 add(s,0,'battle',MUST);
 const victim=add(s,0,'battle',DARK,{tapped:true});
 const attacker=add(s,1,'battle',WATER,{powerModifiers:[{amount:3000}]});
 attack(s,attacker.uid,victim.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 pick(s,attacker.uid);
 assert.ok(has(s,0,'grave',victim)&&has(s,1,'grave',attacker));
});

test('Mustang does not trigger if it leaves in the same destruction batch',()=>{
 const s=field(1),must=add(s,0,'battle',MUST);
 const allies=Array.from({length:4},()=>add(s,0,'battle',DARK));
 const shield=s.players[1].shields[0];
 const enemy=add(s,1,'battle','dm22ex1-057',{exLifeShieldUid:shield.uid});
 cast(s,'dm14-015');drain(s);
 assert.ok(has(s,0,'grave',must)&&allies.every(x=>has(s,0,'grave',x)));
 assert.ok(has(s,1,'grave',shield)&&has(s,1,'battle',enemy));
});

test('Mustang does not trigger for a cast spell entering the grave',()=>{
 const s=field(),target=add(s,1,'battle',WATER),must=add(s,0,'battle',MUST);
 const spell=add(s,0,'hand','dm01-086');
 cast(s,TYPHOON);pick(s,0);pick(s,spell.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',spell)&&s.players[0].grave.some(x=>x.cardId===TYPHOON));
 assert.ok(has(s,0,'battle',must)&&has(s,1,'battle',target));
});

test('A face-down Mustang does not trigger for its controller’s discarded creature',()=>{
 const s=field(),target=add(s,1,'battle',WATER);
 const faceDown=add(s,0,'battle',MUST,{faceDown:true});
 const discarded=add(s,0,'hand',DARK);
 cast(s,TYPHOON);pick(s,0);pick(s,discarded.uid);
 assert.ok(has(s,0,'battle',faceDown)&&has(s,0,'grave',discarded)&&has(s,1,'battle',target));
});

for(const [label,id] of [['NEX','dm34-s04'],['XX',XX]])test('Dual Bellforce uses its controller’s '+label+' for attacking power and Triple Breaker',()=>{
 const s=field(),dual=add(s,0,'hand',DUAL);
 add(s,1,'battle',id);
 act(s,'play',a=>a.uid===dual.uid);
 assert.equal(e.power(dual,false,s),11000);assert.equal(e.power(dual,true,s),11000);
 assert.equal(e.effectiveCard(dual,s).breaker,2);
 const ally=add(s,0,'battle',id);
 assert.equal(e.power(dual,false,s),11000);assert.equal(e.power(dual,true,s),16000);
 assert.equal(e.effectiveCard(dual,s).breaker,3);
 attack(s,dual.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==ally.uid);
 assert.equal(e.effectiveCard(dual,s).breaker,2);
 assert.equal(e.power(dual,true,s),11000);
});
