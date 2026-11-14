import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {shieldCards,shieldGroup} from '../dist/shield-state.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const SCHWEIN='dm17-030',SHUFFLE='dm22-029',HOLY_GROUND='dmex17-066';
const VANILLA='dm01-108',MANA_CRISIS='dm02-035',NASUO='dmex01-018',STORM_CRAWLER='dm06-050';
const ZARD='dmrp17-s07',GALAXY='dm26rp1-S001',CANNON='dmex11-006';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const add=(s,p,zone,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(VANILLA));
 return s;
}
const uid=({value})=>value?.uid??value;
const pick=(s,x)=>act(s,'extended',a=>uid(s.decision.choices[a.choice])===x.uid);
const power=(s,x,attacking=true)=>e.power(x,attacking,s);

test('three official prints use unique canonical IDs and validate in saved decks',()=>{
 const m=read('tools/support-phase-1301.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[SCHWEIN,SHUFFLE,HOLY_GROUND]);
 assert.equal(m.printAliases.length,0);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(spec,standardCardSpec({id,name,faces,status:'complete'},{phase:1301}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.limit],
   [f.typeText==='呪文'?'spell':'creature',f.cost,parseInt(f.powerText,10)||0,f.civilizations,f.race,4]);
  assert.deepEqual(refs.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.equal(CARD_IMAGES[id],image);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).length,1);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

test('Schwein gains power attacker from both players’ mana, stacks it, and expires at turn end',()=>{
 const s=field(),ally=add(s,0,'battle',SCHWEIN),enemy=add(s,1,'battle',SCHWEIN);
 cast(s,MANA_CRISIS);
 const spent=s.players[1].mana[0];
 pick(s,spent);
 drain(s);
 assert.ok(has(s,1,'grave',spent));
 assert.deepEqual([power(s,ally),power(s,enemy),power(s,ally,false)],[5000,5000,2000]);
 cast(s,NASUO);
 for(const x of s.players[0].mana.slice(0,4))pick(s,x);
 drain(s);
 assert.deepEqual([power(s,ally),power(s,enemy),power(s,enemy,false)],[17000,17000,2000]);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.deepEqual([power(s,ally),power(s,enemy)],[2000,2000]);
});

test('Schwein ignores mana returned to a hand and ignores suppressed copies',()=>{
 const s=field(),ally=add(s,0,'battle',SCHWEIN),ignored=add(s,0,'battle',SCHWEIN,{g35Ignored:s.turn});
 cast(s,STORM_CRAWLER);
 const returned=s.players[0].mana[0];
 pick(s,returned);
 drain(s);
 assert.ok(has(s,0,'hand',returned));
 assert.equal(power(s,ally),2000);
 cast(s,MANA_CRISIS);
 pick(s,s.players[1].mana[0]);
 drain(s);
 assert.equal(ally.powerModifiers?.length,1);
 assert.equal(ignored.powerModifiers,undefined);
});

test('shield shuffle preserves group sizes, EX Life and Shield Force slots without shield additions (QA 37439, 39544, 33516)',()=>{
 const s=field();
 give(s,0,'shields',[VANILLA,VANILLA,VANILLA]);
 const [first,second,last]=s.players[0].shields;
 first.shieldGroup='detached-old-root';
 first.shieldStack=[Object.assign(inst(VANILLA),{faceUp:true,shieldCardOnly:true})];
 last.shieldStack=[Object.assign(inst(VANILLA),{faceUp:true,shieldCardOnly:true}),inst(VANILLA)];
 second.faceUp=true;
 const original=s.players[0].shields.flatMap(shieldCards).map(x=>x.uid);
 const zard=add(s,0,'battle',ZARD,{exLifeShieldUid:shieldGroup(first)});
 const galaxy=add(s,0,'battle',GALAXY,{g35ShieldForce:last.uid});
 add(s,0,'battle',CANNON);
 add(s,1,'battle',VANILLA);
 const before=JSON.stringify(s),opposing=structuredClone(s.players[1].shields);
 cast(s,SHUFFLE);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[1].shields,opposing);
 const roots=s.players[0].shields;
 assert.deepEqual(roots.map(x=>shieldCards(x).length),[2,1,3]);
 const result=roots.flatMap(shieldCards);
 assert.deepEqual(result.map(x=>x.uid).sort(),[...original].sort());
 assert.notDeepEqual(result.map(x=>x.uid),original);
 assert.ok(result.every(x=>!x.faceUp&&!x.shieldCardOnly));
 assert.deepEqual(e.exLifeShields(s,0,zard).map(x=>x.uid),[roots[0].uid]);
 assert.ok(shieldCards(roots[2]).some(x=>x.uid===galaxy.g35ShieldForce));
 const replay=JSON.parse(before);
 cast(replay,SHUFFLE);
 assert.deepEqual(replay.players[0].shields.map(shieldCards),roots.map(shieldCards));
});

test('Holy Ground puts even a tapped creature into mana tapped and requires a strictly cheaper creature',()=>{
 const s=field(),source=add(s,0,'battle',SCHWEIN,{tapped:true}),enemy=add(s,1,'battle',SCHWEIN);
 const sameCost=add(s,0,'mana',SCHWEIN),spell=add(s,0,'mana',MANA_CRISIS);
 const hidden=add(s,0,'mana',VANILLA,{faceDown:true}),cheaper=s.players[0].mana[0];
 cast(s,HOLY_GROUND);
 assert.deepEqual(s.decision.choices.map(uid),[source.uid]);
 pick(s,source);
 assert.ok(has(s,0,'mana',source)&&source.tapped&&has(s,1,'battle',enemy));
 assert.ok([source,sameCost,spell,hidden].every(x=>!s.decision.choices.map(uid).includes(x.uid)));
 pick(s,cheaper);
 drain(s);
 assert.ok(has(s,0,'battle',cheaper));
});

test('Holy Ground uses the selected creature’s cost after EX Life replaces its move (QA 42017)',()=>{
 const s=field(),shield=s.players[0].shields[0],zard=add(s,0,'battle',ZARD,{exLifeShieldUid:shield.uid});
 const cheaper=s.players[0].mana[0];
 cast(s,HOLY_GROUND);
 pick(s,zard);
 drainUntilManaChoice(s,cheaper);
 assert.ok(has(s,0,'grave',shield)&&has(s,0,'battle',zard)&&!zard.tapped);
 pick(s,cheaper);
 drain(s);
 assert.ok(has(s,0,'battle',cheaper));
});
function drainUntilManaChoice(s,x){
 for(let n=0;s.decision&&!s.decision.choices?.some(c=>uid(c)===x.uid);n++){
  assert.ok(n<30);
  e.step(s,e.chooseAI(s));
 }
}

test('Holy Ground stops when there is no creature to reference or no cheaper creature in mana',()=>{
 const s=field(),enemy=add(s,1,'battle',VANILLA);
 const before=s.players[0].mana.map(x=>x.uid);
 cast(s,HOLY_GROUND);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].mana.map(x=>x.uid),before);
 assert.ok(has(s,1,'battle',enemy));
 const equal=add(s,0,'battle',VANILLA);
 cast(s,HOLY_GROUND);
 pick(s,equal);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'mana',equal)&&equal.tapped);
});
