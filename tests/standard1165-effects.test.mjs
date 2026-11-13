import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const REV='dmx22b-057',FEST='dmr04-045',JUSTICE='dm23ex1-022';
const FIRE='dm01-097',NATURE='dm01-108',DARK='dm01-090',WATER='dm01-083',DRAGON='dmr23-072';
const TWIN_DRAGON='dm22ex1-030',COURTNEY='dmrp20-046',KAREIKO='dm22ex1-086',QQ='dmrp07-m01',CURVE='dmrp22-030';
const MADONNA='dmx08-006',EVO='dm10-017';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const field=()=>{
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
};
const put=(s,p,zone,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
const pick=(s,wanted)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===(wanted?.uid??wanted);
});
const fireFestival=(s,uid)=>{
 const spell=put(s,0,'hand',FEST);
 act(s,'play',a=>a.uid===spell.uid);
 pick(s,uid);
 return spell;
};

test('phase 1165 verifies three canonical definitions and the five official Fire Festival reprints',()=>{
 const m=read('tools/support-phase-1165.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[REV,FEST,JUSTICE]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dmx14-081','promoy16-012','dmart03-004','dm25ex2-103','dm26ex5-DP038']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1165}),row.spec);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.manaValue,c.limit],
   ['spell',f.cost,f.civilizations,f.race,1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1165}));
 }
});

test('Duema Revolution checks the shield count and reveals after the optional bottom move',()=>{
 assert.match(e.card(TWIN_DRAGON).race,/ドラゴン/);
 for(const shields of [2,3])for(const bottom of [false,true]){
  const s=field(),own=s.players[0];
  give(s,0,'shields',Array(shields).fill(NATURE));
  give(s,0,'deck',[NATURE,DRAGON,TWIN_DRAGON,WATER,...Array(12).fill(NATURE)]);
  const [first,dragon,twin,water,...rest]=own.deck;
  cast(s,REV);
  if(shields===2){
   assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[NATURE]);
   pick(s,bottom?first:null);
  }
  assert.deepEqual(own.hand,[dragon,twin]);
  const shifted=shields===2&&bottom;
  assert.deepEqual(own.grave.map(x=>x.uid).slice(0,-1),[shifted?water.uid:first.uid]);
  assert.deepEqual(own.deck,shifted?[...rest,first]:[water,...rest]);
  assert.deepEqual(own.g34Protected,[]);
 }
});

test('Duema Revolution respects a reveal limit and a deck inspection lock',()=>{
 for(const id of [CURVE,QQ]){
  const s=field(),own=s.players[0],before=own.deck.slice();
  put(s,1,'battle',id);
  cast(s,REV);
  assert.deepEqual(own.hand,[]);
  assert.deepEqual(own.deck,id===CURVE?before.slice(1):before);
  assert.deepEqual(own.grave.map(x=>x.cardId),id===CURVE?[NATURE,REV]:[REV]);
 }
});

test('Fire Festival taps the chosen mana, bottoms the other card and returns for Fire only',()=>{
 for(const fire of [true,false]){
  const s=field(),own=s.players[0];
  give(s,0,'deck',[FIRE,NATURE,...Array(12).fill(NATURE)]);
  const [red,green,...rest]=own.deck,chosen=fire?red:green;
  const spell=fireFestival(s,chosen);
  assert.equal(own.mana.at(-1),chosen);
  assert.equal(chosen.tapped,true);
  assert.deepEqual(own.deck,[...rest,fire?green:red]);
  assert.deepEqual(own.hand,fire?[spell]:[]);
  assert.deepEqual(own.grave,fire?[]:[spell]);
 }
});

test('Fire Festival uses the placed mana characteristics with Re:Courtney (QA 40648)',()=>{
 const s=field(),own=s.players[0];
 put(s,0,'battle',COURTNEY);
 own.deck.unshift(inst(DARK));
 const chosen=own.deck[0],spell=fireFestival(s,chosen);
 assert.ok(own.mana.includes(chosen));
 assert.deepEqual(own.hand,[spell]);
});

test('Fire Festival does not return if mana is redirected or the deck is locked',()=>{
 for(const id of [KAREIKO,QQ]){
  const s=field(),own=s.players[0];
  own.deck.unshift(inst(FIRE));
  const before=own.deck.slice();
  put(s,1,'battle',id);
  cast(s,FEST);
  if(id===KAREIKO)pick(s,before[0]);
  assert.deepEqual(own.hand,[]);
  assert.ok(!own.mana.includes(before[0]));
  assert.deepEqual(own.deck,id===KAREIKO?[...before.slice(2),before[1]]:before);
  assert.equal(own.grave.includes(before[0]),id===KAREIKO);
  assert.equal(own.grave.at(-1).cardId,FEST);
 }
});

test('Fire Festival puts its final card in mana and loses (QA 36539)',()=>{
 const s=field(),own=s.players[0];
 give(s,0,'deck',[FIRE]);
 const last=own.deck[0];
 fireFestival(s,last);
 assert.equal(own.mana.at(-1),last);
 assert.equal(last.tapped,true);
 assert.equal(s.winner,1);
});

test('Fire Festival moves only the revealed card under Curved Wind',()=>{
 const s=field(),own=s.players[0],top=inst(FIRE);
 const rest=own.deck.slice();
 own.deck.unshift(top);
 put(s,1,'battle',CURVE);
 const spell=fireFestival(s,top);
 assert.equal(own.mana.at(-1),top);
 assert.deepEqual(own.deck,rest);
 assert.deepEqual(own.hand,[spell]);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===FEST&&x.text.includes(e.card(FIRE).name)));
});

test('Justice makes the opposing player choose between a return and shield placement',()=>{
 for(const to of ['hand','shields']){
  const s=field(),own=s.players[0],victim=put(s,1,'battle',NATURE),top=own.deck[0];
  cast(s,JUSTICE);
  assert.equal(s.decision.player,0);
  pick(s,victim);
  assert.equal(s.decision.player,1);
  const resumed=JSON.parse(JSON.stringify(s));
  pick(resumed,to);
  assert.equal(resumed.players[1][to].at(-1).uid,victim.uid);
  assert.equal(resumed.players[0].hand.length,to==='hand'?2:0);
  assert.equal(resumed.players[0].shields.some(x=>x.uid===top.uid),to==='shields');
  assert.equal(resumed.players[0].grave.at(-1).cardId,JUSTICE);
  if(to==='shields')assert.ok(!resumed.players[1].shields.at(-1).faceUp);
 }
});

test('Justice resolves the chosen branch when the chosen creature cannot leave (QA 43470)',()=>{
 for(const to of ['hand','shields']){
  const s=field(),own=s.players[0],opp=s.players[1],top=own.deck[0];
  const victim=put(s,1,'battle',MADONNA);
  cast(s,JUSTICE);
  pick(s,victim);
  pick(s,to);
  assert.ok(opp.battle.includes(victim));
  assert.equal(own.hand.length,to==='hand'?2:0);
  assert.equal(own.shields.includes(top),to==='shields');
 }
});

test('Justice shields evolution cards as individual face-down shields',()=>{
 const s=field(),opp=s.players[1],base=inst(WATER);
 const evolution=put(s,1,'battle',EVO,{under:[base]});
 cast(s,JUSTICE);
 pick(s,evolution);
 pick(s,'shields');
 assert.deepEqual(opp.shields.slice(-2).map(x=>x.uid),[evolution.uid,base.uid]);
 assert.ok(opp.shields.slice(-2).every(x=>!x.faceUp&&!x.shieldStack));
});

test('Justice does nothing if there is no target (QA 43591)',()=>{
 const s=field(),own=s.players[0],before=own.deck.slice();
 cast(s,JUSTICE);
 assert.equal(s.decision,null);
 assert.deepEqual(own.hand,[]);
 assert.deepEqual(own.deck,before);
 assert.equal(own.shields.length,5);
});

test('Justice can use G Strike and stays in hand when broken',()=>{
 const s=field(),attacker=put(s,1,'battle',NATURE),later=put(s,1,'battle',NATURE);
 s.active=1;
 give(s,0,'shields',[JUSTICE]);
 const [spell]=s.players[0].shields;
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');
 pick(s,later);
 drain(s);
 assert.ok(s.players[0].hand.includes(spell));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===later.uid));
});
