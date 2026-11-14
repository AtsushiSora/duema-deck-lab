import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {projectRoom} from '../server/duel-core.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const MINO='dmrp20-s07',MOJITO='dmr01-004',ABRISE='dm22ex2-S03',NELZA='dmex18-013';
const BASIC='dm01-108',WATER='dm01-083',EVOLUTION='dm02-s05',SPELL='dm01-052';
const REX='dmrp17-078',SEED='dm22ex1-086',TRIGGER='dm01-027';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(30).fill(BASIC));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

test('five verified official prints register three names and resolve to their original IDs',()=>{
 const m=read('tools/support-phase-1309.json');
 const {prints}=read('tools/image-reference-prints.json');
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[MINO,MOJITO,ABRISE]);
 assert.deepEqual(m.printAliases.map(c=>c.id),['dm22ex2-1A','dm22ex2-1B']);
 for(const {id,canonicalId=id,name,image,source,faces,spec} of [...m.cards,...m.printAliases]){
  assert.deepEqual(spec,standardCardSpec({id,name,faces,status:'complete'},{phase:1309}));
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  const card=e.card(canonicalId),face=faces[0];
  assert.deepEqual([card.type,card.cost,card.power,card.race,card.limit,e.manaValue(card)],
   ['creature',face.cost,Number.parseInt(face.powerText,10),face.race,4,1]);
  for(const [key,expected] of Object.entries(spec))assert.deepEqual(card[key],expected);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
 }
});

function minoShield(s,count){
 const attacker=add(s,0,'battle',BASIC),lock=add(s,0,'battle',BASIC);
 if(count===2)add(s,1,'battle',NELZA);
 give(s,1,'shields',[MINO]);
 const mino=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 for(let i=0;i<count;i++){
  assert.equal(s.decision.task.op,'gsDeclare');
  pick(s,true);
 }
 assert.equal(s.decision.task.op,'gsTarget');
 pick(s,lock.uid);
 assert.equal(e.attackLocked(s,0,s.players[0].battle.find(x=>x.uid===lock.uid)),true);
 if(count===2)pick(s,null);
 return mino;
}

test('Nelza grants a second Minogami reveal and each deploys a Rex but only one evolves (QA 40942)',()=>{
 let s=field();
 const first=inst(REX),second=inst(REX);
 s.players[1].deck.unshift(first,second);
 const mino=minoShield(s,2);
 assert.equal(s.decision.type,'entryOrder');
 act(s,'orderEntry',a=>a.cardId===MINO);
 assert.equal(s.decision?.task?.op,'g34_Offer');
 assert.match(s.decision.title,/オメデット/);
 s=JSON.parse(JSON.stringify(s));
 pick(s,true);
 if(s.decision.type==='entryOrder')act(s,'orderEntry',a=>a.cardId===MINO);
 if(s.decision.task?.op==='g34_FightEnemy240')pick(s,null);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,true);
 drain(s);
 assert.equal(s.players[1].battle.find(x=>x.uid===mino.uid).under[0].uid,first.uid);
 assert.ok(has(s,1,'battle',second));
 assert.ok(!has(s,1,'hand',mino));
});

test('Minogami waits for G Strike and can evolve over the Shinkalize Rex it revealed',()=>{
 const s=field(),seed=inst(SEED);
 s.players[1].deck.unshift(seed);
 const mino=minoShield(s,1);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,true);
 drain(s);
 assert.equal(s.players[1].battle.find(x=>x.uid===mino.uid).under[0].uid,seed.uid);
});

test('Minogami reveals the exact top card and leaves it there if it is not a Rex',()=>{
 const s=field(),notRex=inst(WATER),rex=inst(REX);
 s.players[1].deck.unshift(notRex,rex);
 const mino=minoShield(s,1);
 drain(s);
 assert.deepEqual(s.players[1].deck.slice(0,2).map(x=>x.uid),[notRex.uid,rex.uid]);
 assert.ok(has(s,1,'hand',mino));
});

test('Red Zone F prohibits Minogami’s declaration and reveal (QA 42377)',()=>{
 const s=field(),source=add(s,0,'battle','dm22ex1-011'),rex=inst(REX);
 s.players[1].deck.unshift(rex);
 give(s,1,'shields',[MINO]);
 attack(s,source.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].deck[0].uid,rex.uid);
 assert.equal(s.players[1].hand[0].cardId,MINO);
 assert.ok(!s.log.some(x=>x.type==='gStrike'||x.type==='reveal'));
});

test('Minogami normally evolves, fights on entry, may draw on victory and leaves only its top card when destroyed',()=>{
 const s=field(),water=add(s,0,'battle',WATER),enemy=add(s,1,'battle',BASIC),top=s.players[0].deck[0];
 const mino=add(s,0,'hand',MINO);
 act(s,'play',a=>a.cardId===MINO);
 act(s,'evolve',a=>a.baseUid===water.uid);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 pick(s,enemy.uid);
 assert.equal(s.decision.task.op,'g34_Draw');
 pick(s,1);
 drain(s);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'hand',top));
 s.active=1;
 cast(s,TRIGGER);
 act(s,'effect',a=>a.targets.some(t=>t.uid===mino.uid));
 drain(s);
 assert.ok(has(s,0,'battle',water)&&has(s,0,'grave',mino));
});

function mojitoStart(s){
 add(s,0,'battle',MOJITO);
 s.active=1;
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.active,0);
 assert.equal(s.decision.task.op,'g34_BlindReveal803');
 assert.equal(s.decision.player,1);
}

test('Mojito provides only numbered slots to the opponent, then deploys the revealed creature after returning an ally',()=>{
 let s=field();
 const revealed=add(s,0,'hand',WATER),ally=add(s,0,'battle',BASIC);
 add(s,0,'hand',SPELL);
 mojitoStart(s);
 assert.deepEqual(s.decision.choices.map(({label,cardId})=>[label,cardId]),
  [['裏向きの手札 1',undefined],['裏向きの手札 2',undefined]]);
 const room={game:s,phase:'playing',hostUid:'host',guestUid:'guest',decks:[],profiles:[{},{}],events:[],expiresAt:10000};
 const view=projectRoom(room,{uid:'guest'},1).game;
 assert.equal(view.players[0].hand.length,0);
 assert.equal(view.actions.filter(a=>a.kind==='extended').length,2);
 assert.ok(!JSON.stringify(view).includes(revealed.uid));
 const slot=s.decision.task.slots.indexOf(revealed.uid);
 assert.ok(slot>=0);
 s=JSON.parse(JSON.stringify(s));
 pick(s,slot);
 assert.equal(s.decision.player,0);
 pick(s,ally.uid);
 drain(s);
 assert.ok(has(s,0,'hand',ally)&&has(s,0,'battle',revealed));
});

for(const id of [SPELL,EVOLUTION])test('Mojito stops after revealing '+id,()=>{
 const s=field(),revealed=add(s,0,'hand',id);
 mojitoStart(s);
 pick(s,0);
 drain(s);
 assert.ok(has(s,0,'hand',revealed));
 assert.deepEqual(s.players[0].battle.map(x=>x.cardId),[MOJITO]);
});

test('Mojito can decline the optional return and keep the revealed creature in hand',()=>{
 const s=field(),revealed=add(s,0,'hand',WATER);
 mojitoStart(s);
 pick(s,0);
 pick(s,null);
 drain(s);
 assert.ok(has(s,0,'hand',revealed));
 assert.deepEqual(s.players[0].battle.map(x=>x.cardId),[MOJITO]);
});

test('Mojito leaves the revealed creature in hand when EX Life replaces the return',()=>{
 const s=field(),revealed=add(s,0,'hand',WATER);
 cast(s,NELZA);
 const nelza=s.players[0].battle.find(x=>x.cardId===NELZA);
 assert.equal(e.exLifeShields(s,0,nelza).length,1);
 mojitoStart(s);
 pick(s,0);
 pick(s,nelza.uid);
 drain(s);
 assert.ok(has(s,0,'battle',nelza)&&has(s,0,'hand',revealed));
 assert.equal(e.exLifeShields(s,0,nelza).length,0);
});

test('Abrise breaks three of its controller’s shields at once with S Trigger, and powered breaker counts grave creatures',()=>{
 const s=field(),enemy=add(s,1,'battle',BASIC);
 give(s,0,'shields',[TRIGGER,BASIC,BASIC,BASIC,BASIC]);
 const [first,second,third]=s.players[0].shields;
 give(s,0,'grave',[BASIC,WATER,SPELL]);
 give(s,1,'grave',[REX]);
 cast(s,ABRISE);
 for(const x of [first,second,third])pick(s,x.uid);
 assert.equal(s.players[0].shields.length,2);
 assert.equal(s.players[1].shields.length,5);
 assert.ok([first,second,third].every(x=>has(s,0,'hand',x)));
 act(s,'useTrigger',a=>a.cardId===TRIGGER);
 drain(s);
 assert.ok(has(s,1,'grave',enemy));
 const abrise=s.players[0].battle.find(x=>x.cardId===ABRISE);
 assert.equal(e.power(abrise,false,s),9000);
 abrise.entered=0;
 attack(s,abrise.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Abrise breaks all available shields when fewer than three remain',()=>{
 const s=field();
 give(s,0,'shields',[BASIC,BASIC]);
 cast(s,ABRISE);
 drain(s);
 assert.equal(s.players[0].shields.length,0);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.winner,null);
});
