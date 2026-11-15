import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const GAIARL='dmr04-v03',RYUSEI='dmr04-v02',PRINN='dmr04-051';
const HALL='dmbd13-015',MIXEL='dmrp05-011',DEMON='dm01-027',RAKUJO='dmr15-041';
const WATER='dm01-083',FIRE='dm01-097',DARK='dm01-090',NATURE='dm01-108',BLOCKER='dm01-076';
const NAME='唯我独尊ガイアール・オレドラゴン',parts=[GAIARL,RYUSEI,PRINN];
function table(){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',
  extraCards:parts.map(id=>({id,count:2}))}));
 const s=e.createGame(decks,{seed:1356});
 s.active=0;s.turn=3;s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',[BLOCKER,WATER,DARK,FIRE,NATURE].flatMap(id=>Array(3).fill(id)));
  give(s,p,'shields',Array(5).fill(NATURE));
 }
 return s;
}
function add(s,p,id,fields={}){
 const x=Object.assign(inst(id),fields);
 s.players[p].battle.push(x);
 return x;
}
function psychic(s,p,id,fields={}){
 const own=s.players[p],i=own.extra.findIndex(x=>x.cardId===id);
 assert.ok(i>=0,id);
 const [x]=own.extra.splice(i,1);
 own.battle.push(Object.assign(x,fields));
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const pick=(s,value)=>act(s,'extended',a=>{
 const choice=s.decision.choices[a.choice].value;
 return (choice?.uid??choice)===value;
});
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
function summon(s,id,mode=2){
 const x=s.players[s.active].extra.find(x=>x.cardId===id);
 assert.ok(x,id);
 cast(s,HALL);
 pick(s,x.uid);
 pick(s,mode);
 return x;
}

test('18 official Victory Psychic prints use three canonical IDs and the latest linked wording',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1356.json',import.meta.url)));
 assert.equal(m.cards.length+m.printAliases.length,18);
 const registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 for(const {id,canonicalId=id,name,source,image,verification} of [...m.cards,...m.printAliases]){
  assert.equal(registry.get(id).id,canonicalId);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).length,1);
  assert.match(verification.backImageSha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId,name,source,image});
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.equal(e.card(canonicalId).limit,4);
 }
 for(const row of m.cards){
  const {currentPrint:{id,faces},spec}=row;
  assert.deepEqual(spec,standardCardSpec({id,faces,status:'complete'},{phase:1356}));
  assert.match(e.card(row.id).text,/相手のシールドを２つブレイクする/);
 }
});

test('Mixel returns the real Victory Gaiarl after the Hall gives the seventh mana (QA 38717)',()=>{
 for(const mana of [6,7]){
  const s=table(),own=s.players[0];
  give(s,0,'mana',[WATER,FIRE,NATURE,BLOCKER,DARK,NATURE,NATURE].slice(0,mana));
  add(s,1,MIXEL);
  const gaiarl=summon(s,GAIARL);
  drain(s);
  assert.equal(own.mana.length,mana+1);
  assert.equal(has(s,0,'extra',gaiarl),mana===6);
  assert.equal(has(s,0,'battle',gaiarl),mana===7);
 }
});

test('Victory Gaiarl can attack an untapped creature on its entry turn only',()=>{
 const s=table(),target=add(s,1,NATURE),gaiarl=summon(s,GAIARL);
 drain(s);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===gaiarl.uid&&a.target===target.uid));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===gaiarl.uid&&a.target==='player'));
 end(s);end(s);s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===gaiarl.uid));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===gaiarl.uid&&a.target===target.uid));
});

test('Victory Ryusei taps charged mono mana and Prinn prohibits attack and block until its controller starts',()=>{
 const s=table(),blocker=add(s,1,BLOCKER),attacker=add(s,0,NATURE);
 psychic(s,0,RYUSEI);
 summon(s,PRINN);
 pick(s,blocker.uid);
 attack(s,attacker.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
 act(s,'noBlock');drain(s);
 end(s);
 const charge=inst(NATURE);
 s.players[1].hand.push(charge);
 act(s,'charge',a=>a.uid===charge.uid);
 assert.ok(has(s,1,'mana',charge)&&charge.tapped);
 assert.ok(e.attackLocked(s,1,blocker));
 end(s);
 s.phase='attack';
 attacker.tapped=false;
 attack(s,attacker.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
});

test('V Awakening Link keeps the three actual cards and resolves before the next Hall instruction',()=>{
 const s=table(),ryusei=psychic(s,0,RYUSEI,{tapped:true}),gaiarl=psychic(s,0,GAIARL,{powerModifiers:[{amount:1000}]});
 const target=add(s,1,BLOCKER),prinn=s.players[0].extra.find(x=>x.cardId===PRINN);
 const physical=e.physicalCards(s).length;
 cast(s,HALL);
 pick(s,prinn.uid);
 assert.equal(e.card(prinn).name,NAME);
 assert.equal(e.power(prinn,false,s),27000);
 assert.equal(e.matchupPower(prinn,target,false,s),28000);
 assert.ok(prinn.tapped);
 assert.deepEqual(new Set(prinn.psychicLinks.map(x=>x.uid)),new Set([ryusei.uid,gaiarl.uid]));
 assert.equal(s.players[0].battle.length,1);
 pick(s,2);
 pick(s,target.uid);
 drain(s);
 assert.equal(e.physicalCards(s).length,physical+1);
 assert.equal(e.card(prinn).breaker,'∞');
});

test('if a link has two eligible copies of a piece, the controller chooses the three to flip',()=>{
 const s=table(),first=psychic(s,0,GAIARL),second=psychic(s,0,GAIARL);
 psychic(s,0,RYUSEI);
 const prinn=s.players[0].extra.find(x=>x.cardId===PRINN);
 cast(s,HALL);
 pick(s,prinn.uid);
 assert.equal(s.decision.type,'victoryLink1356');
 assert.equal(s.decision.groups.length,2);
 const replay=JSON.parse(JSON.stringify(s));
 for(const board of [s,replay]){
  act(board,'victoryLink1356',a=>board.decision.groups[a.choice].includes(second.uid));
  pick(board,2);
  drain(board);
  assert.ok(has(board,0,'battle',first));
  assert.ok(!has(board,0,'battle',second));
  assert.equal(e.card(board.players[0].battle.find(x=>x.uid===prinn.uid)).name,NAME);
 }
});

test('a battle win untaps Ore Dragon and its latest wording breaks two simultaneous shields',()=>{
 const s=table(),target=add(s,1,FIRE,{tapped:true});
 psychic(s,0,GAIARL);psychic(s,0,RYUSEI);
 const prinn=summon(s,PRINN);
 pick(s,target.uid);
 give(s,1,'shields',[DEMON,NATURE,NATURE]);
 const [trigger,second]=s.players[1].shields;
 attack(s,prinn.uid,target.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_Break497');
 assert.equal(prinn.tapped,false);
 pick(s,trigger.uid);
 assert.ok(has(s,1,'shields',trigger)&&has(s,1,'shields',second));
 pick(s,second.uid);
 assert.ok(has(s,1,'hand',trigger)&&has(s,1,'hand',second));
 assert.equal(s.players[1].shields.length,1);
 assert.equal(s.metrics[0].breaks,2);
});

test('a targeted cell can release the link into two creatures while preserving phase and power (QA 40691)',()=>{
 const s=table(),gaiarl=psychic(s,0,GAIARL,{powerModifiers:[{amount:1000}]}),ryusei=psychic(s,0,RYUSEI,{tapped:true});
 const prinn=summon(s,PRINN);
 drain(s);
 s.active=1;s.phase='main';
 cast(s,RAKUJO);
 pick(s,ryusei.uid);
 assert.equal(s.decision.type,'psychicUnlink');
 assert.equal(s.decision.player,0);
 act(s,'psychicUnlink',a=>a.uid===prinn.uid);
 drain(s);
 assert.ok(has(s,0,'extra',prinn));
 assert.deepEqual(new Set(s.players[0].battle.map(x=>x.uid)),new Set([gaiarl.uid,ryusei.uid]));
 assert.ok(gaiarl.tapped&&ryusei.tapped);
 assert.equal(e.power(gaiarl,false,s),6000);
 assert.equal(e.power(ryusei,false,s),7000);
});

test('the attacking player chooses which survivor continues an attack after link release (806.2a)',()=>{
 const s=table(),gaiarl=psychic(s,0,GAIARL),ryusei=psychic(s,0,RYUSEI),prinn=summon(s,PRINN);
 drain(s);
 give(s,1,'hand',['dmex12-001']);
 attack(s,prinn.uid);
 assert.equal(s.decision.task.op,'ninjaDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'ninjaResolve');
 pick(s,'strike');
 pick(s,prinn.uid);
 act(s,'psychicUnlink',a=>a.uid===prinn.uid);
 assert.equal(s.decision.stage,'continue');
 assert.equal(s.decision.player,0);
 act(s,'psychicUnlink',a=>a.uid===gaiarl.uid);
 assert.equal(s.attack.attacker,gaiarl.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 assert.ok(has(s,0,'battle',gaiarl)&&has(s,0,'battle',ryusei)&&has(s,0,'extra',prinn));
 assert.ok(!s.attack);
});

test('both survivors inherit Prinn’s lock and a cross gear follows the chosen survivor',()=>{
 for(const returnHost of [false,true]){
  const s=table(),gaiarl=psychic(s,0,GAIARL),ryusei=psychic(s,0,RYUSEI),prinn=summon(s,PRINN);
  drain(s);
  const gear=add(s,0,'dm23ex1-058',{crossedTo:{uid:prinn.uid,incarnation:prinn.incarnation||0}});
  s.active=1;s.phase='main';
  summon(s,PRINN);
  pick(s,prinn.uid);
  drain(s);
  cast(s,RAKUJO);
  pick(s,ryusei.uid);
  const returning=returnHost?prinn:ryusei;
  act(s,'psychicUnlink',a=>a.uid===returning.uid);
  assert.equal(s.decision.attachment,gear.uid);
  act(s,'psychicUnlink',a=>a.uid===gaiarl.uid);
  drain(s);
  assert.equal(gear.crossedTo.uid,gaiarl.uid);
  assert.ok(e.attackLocked(s,0,gaiarl));
  assert.ok(e.attackLocked(s,0,returnHost?ryusei:prinn));
 }
});

test('three linked parts can be ordered under an evolution and return as cells after reconstruction',()=>{
 const s=table(),gaiarl=psychic(s,0,GAIARL),ryusei=psychic(s,0,RYUSEI),prinn=summon(s,PRINN);
 drain(s);
 s.phase='main';
 const evolution='dmx04-013';
 cast(s,evolution);
 act(s,'evolve',a=>a.baseUid===prinn.uid);
 assert.equal(s.decision.task.op,'g34_PsychicBaseOrder1355');
 pick(s,ryusei.uid);
 pick(s,prinn.uid);
 drain(s);
 const evolved=s.players[0].battle.find(x=>x.cardId===evolution);
 assert.deepEqual(evolved.under.map(x=>[x.uid,e.card(x).type]),
  [[ryusei.uid,'cell'],[prinn.uid,'cell'],[gaiarl.uid,'cell']]);
 s.active=1;s.phase='main';
 cast(s,RAKUJO);
 pick(s,evolved.uid);
 drain(s);
 assert.ok([gaiarl,ryusei,prinn].every(x=>has(s,0,'extra',x)));
 assert.ok(has(s,0,'hand',evolved));
 assert.equal(s.players[0].battle.length,0);
});
