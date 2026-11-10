import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const WINN='dm02-022',SPIRAL='dmr14-042',SUN='dmr19-049',KOKE='dmr19-027';
const WATER='dm01-083',LAND='dm01-108',FIRE='dm01-097',SECRET='dm01-s01',SECOND='dm02-024';
const ADAM='dmr19-s03',CMD='dmbd10-010',EXLIFE='dm23ex2-016',REDIRECT='dm22ex1-086',FUJIN='dmrp22-037';
const pick=(s,v)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===v;
});
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(LAND));
 return s;
}
function put(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function evolve(s,base){
 const x=play(s,ADAM);
 act(s,'evolve',a=>a.baseUid===base.uid);
 return x;
}

test('Phase 850 uses four verified original printings and their complete abilities',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-850.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[WINN,SPIRAL,SUN,KOKE]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:850}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:849}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:850}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,c.civilizations,c.limit],
   [f.name,f.typeText==='呪文'?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

for(const p of [0,1])test('Winn privately views one entire shield without moving its cards '+p,async()=>{
 const s=field(p),x=put(s,p,'battle',WINN);
 give(s,1-p,'shields',[SECRET,LAND]);
 const shield=s.players[1-p].shields[0];
 shield.shieldStack=[inst(SECOND)];
 const before=structuredClone(s.players[1-p].shields),rng=s.rng;
 attack(s,x.uid);
 assert.ok(s.decision.choices.every(c=>!c.cardId));
 pick(s,shield.uid);
 const {projectRoom}=await import('../server/duel-core.mjs');
 const room={game:structuredClone(s),phase:'playing',hostUid:'a',guestUid:'b',profiles:[{name:'A'},{name:'B'}],events:[],expiresAt:10000};
 const viewer={uid:p===0?'a':'b'},other={uid:p===0?'b':'a'};
 assert.deepEqual(projectRoom(room,viewer,1).game.inspectedCards.map(x=>x.id),[SECRET,SECOND]);
 assert.equal(projectRoom(room,other,1).game.inspectedCards,undefined);
 assert.ok(!JSON.stringify(room.game.log).includes(SECRET));
 pick(room.game,null);
 assert.equal(projectRoom(room,viewer,1).game.inspectedCards,undefined);
 assert.deepEqual(room.game.players[1-p].shields,before);
 assert.equal(room.game.rng,rng);
 assert.equal(room.game.decision.type,'block');
});

test('Winn may decline a peek and does not offer one if the opponent has no shields',()=>{
 for(const hasShield of [false,true]){
  const s=field(),x=put(s,0,'battle',WINN);
  if(!hasShield)give(s,1,'shields',[]);
  attack(s,x.uid);
  if(hasShield)pick(s,null);
  assert.equal(s.decision.type,'block');
  assert.ok(!s.log.some(x=>x.type==='look'));
 }
});

for(const [owner,accept] of [[0,true],[0,false],[1,false]])test('Spiral bounces either player and offers a draw only for the caster’s creature '+owner+'/'+accept,()=>{
 const s=field(),target=put(s,owner,'battle',WATER),[drawn]=s.players[0].deck;
 const other=put(s,1-owner,'battle',FIRE);
 play(s,SPIRAL);
 assert.deepEqual(new Set(s.decision.choices.map(c=>c.value?.uid)),new Set([target.uid,other.uid]));
 pick(s,target.uid);
 assert.ok(s.players[owner].hand.includes(target));
 if(owner===0){assert.equal(s.decision.task.op,'g34_Draw');pick(s,accept?1:0);}
 assert.equal(s.players[0].hand.includes(drawn),accept);
 assert.equal(s.decision,null);
});

test('Spiral still offers the draw when EX Life replaces the selected ally’s return',()=>{
 const s=field(),target=put(s,0,'battle',EXLIFE,{exLifeShieldUid:s.players[0].shields[0].uid});
 const [payment]=s.players[0].shields,[drawn]=s.players[0].deck;
 play(s,SPIRAL);
 pick(s,target.uid);
 assert.ok(s.players[0].battle.includes(target));
 assert.ok(s.players[0].grave.includes(payment));
 assert.equal(s.decision.task.op,'g34_Draw');
 pick(s,1);
 assert.deepEqual(s.players[0].hand,[drawn]);
});

test('Spiral resolves without a draw when there are no legal targets',()=>{
 const s=field(),[top]=s.players[0].deck;
 play(s,SPIRAL);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck[0],top);
});

for(const shieldFirst of [false,true])test('An evolution queues independent mana and shield effects '+shieldFirst,()=>{
 const s=field(),base=put(s,0,'battle',WATER);
 put(s,0,'battle',SUN);
 put(s,0,'battle',KOKE);
 put(s,1,'battle',SUN);
 put(s,1,'battle',KOKE);
 give(s,0,'deck',[CMD,SECRET,LAND,LAND]);
 const [first,second]=s.players[0].deck;
 const zones=['deck','mana','shields','hand','grave','battle'];
 const enemyCards=()=>zones.map(zone=>s.players[1][zone].map(x=>x.uid));
 const before=enemyCards();
 const x=evolve(s,base);
 assert.deepEqual(x.under,[base]);
 assert.equal(s.decision.type,'effectOrder');
 const chosen=shieldFirst?KOKE:SUN;
 act(s,'orderEffect',a=>s.pendingEffects.some(q=>q.effectId===a.effectId&&q.source===chosen));
 const mana=shieldFirst?second:first,shield=shieldFirst?first:second;
 assert.equal(s.players[0].mana.at(-1),mana);
 assert.equal(mana.tapped,!shieldFirst);
 assert.equal(s.players[0].shields.at(-1),shield);
 assert.equal(!!shield.faceUp,false);
 assert.equal(s.players[0].shields.length,6);
 assert.deepEqual(enemyCards(),before);
 assert.equal(s.decision,null);
});

for(const [id,mode] of [[SUN,'redirect'],[KOKE,'redirect'],[KOKE,'prohibit']])test('The evolution effects respect existing deck and shield rules '+id+'/'+mode,()=>{
 const s=field(),base=put(s,0,'battle',WATER);
 put(s,0,'battle',id);
 put(s,1,'battle',mode==='redirect'?REDIRECT:FUJIN);
 const [top]=s.players[0].deck,mana=s.players[0].mana.length;
 evolve(s,base);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].shields.length,5);
 assert.equal(s.players[0].mana.length,mana);
 assert.equal(s.players[0].grave.includes(top),mode==='redirect');
 assert.equal(s.players[0].deck.includes(top),mode==='prohibit');
});

test('Kokeshiel also triggers when Adamuski moves onto an attacking creature from battle',()=>{
 const s=field(),attacker=put(s,0,'battle',CMD),base=inst(WATER);
 const adamuski=put(s,0,'battle',ADAM,{under:[base]});
 put(s,0,'battle',KOKE);
 const [top]=s.players[0].deck;
 attack(s,attacker.uid);
 assert.equal(s.decision.task.op,'g23_Declare');
 pick(s,true);
 assert.equal(s.decision.task.op,'g23_Invade');
 pick(s,true);
 assert.equal(s.attack.attacker,adamuski.uid);
 assert.deepEqual(adamuski.under,[attacker]);
 assert.ok(s.players[0].battle.includes(base));
 assert.equal(s.players[0].shields.at(-1),top);
 assert.equal(!!top.faceUp,false);
});
