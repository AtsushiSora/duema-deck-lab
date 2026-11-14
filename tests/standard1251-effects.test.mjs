import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {projectRoom} from '../server/duel-core.mjs';

const ROYZER='dmrp05-s04',KAITEI='dm23rp3-014',HOMA='dmx23-021',BRAIN='dmex18-018';
const SMALL='dm01-108',DARK='dm01-027',DRAW='dm06-085';
const TWIN='dm23bd7-003',DOREMI='promoy15-063',LIGHT='dm01-001',TAP='dm25-007';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(SMALL));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const mana=(s,p=0)=>s.players[p].mana.filter(x=>x.tapped).length;
const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
const target=(s,x)=>act(s,'effect',a=>a.targets[0].uid===x.uid);
const room=s=>({game:s,phase:'playing',hostUid:'a',guestUid:'b',decks:[],profiles:[{},{}],events:[],expiresAt:10000});
function attackShield(s,attacker,shield){
 s.phase='attack';
 act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player'&&a.shield===shield.uid);
 act(s,'noBlock');
}
function order(s,filter){
 const entry=s.decision?.type==='entryOrder',queue=entry?s.triggers.entries:s.pendingEffects;
 const choice=queue.find(filter);
 assert.ok(choice,JSON.stringify(s.decision));
 act(s,entry?'orderEntry':'orderEffect',a=>a.effectId===choice.effectId);
}
function startKaitei(s,previous){
 const attacker=add(s,1,'battle',SMALL);
 give(s,0,'shields',[KAITEI,SMALL]);give(s,0,'mana',[]);
 s.players[0].brokenThisTurn=previous;
 const source=s.players[0].shields[0];
 attackShield(s,attacker,source);
 act(s,'useTrigger',a=>a.uid===source.uid);
 assert.ok(has(s,0,'battle',source));
 return source;
}

test('Six official prints preserve three original IDs, images and complete rules',()=>{
 const m=read('tools/support-phase-1251.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ROYZER,KAITEI,HOMA]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dmex18-s06',ROYZER],['promoy22-043',KAITEI],['dmex04-038',HOMA]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),face=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1251}),row.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [face.cost,Number(face.powerText),face.race,face.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Royzer draws two, blocks and cannot be chosen by an enemy spell',()=>{
 const s=field(),royzer=add(s,0,'hand',ROYZER);
 play(s,royzer);assert.equal(s.players[0].hand.length,2);
 const other=add(s,0,'battle',SMALL),attacker=add(s,1,'battle',SMALL);
 s.active=1;s.phase='main';
 play(s,add(s,1,'hand',DARK));
 assert.deepEqual(s.decision.targets,[{player:0,uid:other.uid}]);target(s,other);
 attack(s,attacker.uid);act(s,'block',a=>a.uid===royzer.uid);drain(s);
 assert.ok(has(s,0,'battle',royzer)&&has(s,0,'grave',other)&&has(s,1,'grave',attacker));
});

test('Royzer recasts the Coral face of the same physical twinpact, never its Brain face (QA40924)',()=>{
 const s=field(),royzer=add(s,0,'battle',ROYZER),old=add(s,0,'grave',BRAIN),twin=add(s,0,'hand',BRAIN);
 play(s,twin,1);
 assert.ok(has(s,0,'grave',old)&&has(s,0,'grave',twin));
 assert.equal(s.decision.task.target,twin.uid);assert.equal(s.decision.task.face,1);
 assert.deepEqual(values(s),[true,null]);assert.equal(mana(s),8);
 pick(s,true);drain(s);
 assert.equal(s.players[0].hand.length,6);
 assert.equal(s.metrics[0].played[BRAIN],2);
 assert.ok(has(s,0,'battle',royzer)&&has(s,0,'grave',twin));assert.equal(mana(s),8);
});

test('Royzer sees S-Trigger hand casts, but skips a spell that returns to hand (QA31709)',()=>{
 const s=field(1);add(s,0,'battle',ROYZER);
 give(s,0,'shields',[DARK,SMALL]);
 const attacker=add(s,1,'battle',SMALL),other=add(s,1,'battle',SMALL),shield=s.players[0].shields[0];
 attackShield(s,attacker,shield);act(s,'useTrigger',a=>a.uid===shield.uid);
 target(s,attacker);pick(s,true);target(s,other);drain(s);
 assert.equal(s.metrics[0].played[DARK],2);assert.equal(mana(s),0);
 assert.ok(has(s,0,'grave',shield));
 const b=field();add(b,0,'battle',ROYZER);
 const brain=add(b,0,'hand',BRAIN);play(b,brain);
 pick(b,b.players[0].deck[0].uid);assert.equal(b.decision,null);
 assert.ok(has(b,0,'hand',brain));assert.equal(b.metrics[0].played[BRAIN],1);
});

test('Kaitei normally draws and privately orders two hand cards, including on a first shield break',()=>{
 for(const shield of [false,true]){
  const s=field(shield?1:0),early=add(s,0,'hand',DARK),[first,second,third]=s.players[0].deck;
  const unit=shield?startKaitei(s,0):add(s,0,'hand',KAITEI);
  if(!shield)play(s,unit);
  assert.equal(s.decision.task.op,'g34_Select');
  assert.ok(values(s).includes(first.uid)&&values(s).includes(third.uid));
  assert.equal(projectRoom(room(s),{uid:'b'},1).game.actions.length,0);
  pick(s,second.uid);pick(s,early.uid);drain(s);
  assert.deepEqual(s.players[0].deck.slice(0,2),[second,early]);assert.ok(has(s,0,'hand',first)&&has(s,0,'battle',unit));
  assert.ok(!s.log.some(l=>l.type==='reveal'&&l.cardId===KAITEI));
 }
});

test('Kaitei Plus triggers independently and offers either spell face from one physical card (QA43786)',()=>{
 for(const face of [0,1]){
  const s=field(1);give(s,0,'deck',Array(12).fill(BRAIN));
  const unit=startKaitei(s,1);
  order(s,x=>x.source===KAITEI&&x.task?.defs.some(d=>d.op==='RevealTopCreatureOrSpell1251'));
  const used=s.players[0].deck[0];
  assert.deepEqual(values(s),[0,1,null]);
  assert.equal(s.decision.task.target,used.uid);
  assert.ok(s.log.some(l=>l.type==='reveal'&&l.text.includes(e.card(BRAIN).name)));
  pick(s,face);
  if(face===0)pick(s,s.players[0].deck[0].uid);
  else if(s.decision?.task?.op==='g34_Execute')pick(s,null);
  assert.equal(s.metrics[0].played[BRAIN],1);
  assert.ok(has(s,0,face===0?'hand':'grave',used));
  assert.equal(s.decision?.task?.op,'g34_Select');
  const [a,b]=values(s);pick(s,a);pick(s,b);drain(s);
  assert.equal(s.metrics[0].played[BRAIN],1);assert.ok(has(s,0,'battle',unit));assert.equal(mana(s),0);
 }
});

test('Kaitei Plus lets the player resolve its draw first and directly deploy a creature face (QA43787)',()=>{
 const s=field(1);give(s,0,'deck',Array(12).fill(TWIN));startKaitei(s,1);
 order(s,x=>x.source===KAITEI&&x.effect==='entry');
 const [first,second]=values(s);pick(s,first);pick(s,second);
 assert.deepEqual(values(s),[0,1,null]);
 const top=s.players[0].deck[0];pick(s,0);drain(s);
 assert.ok(has(s,0,'battle',top));
 assert.equal(s.metrics[0].played[TWIN],undefined);
 assert.equal(mana(s),0);
});

test('Kaitei may decline a reveal, and casting the last card loses before its ability (QA43078)',()=>{
 const s=field(1);give(s,0,'deck',Array(10).fill(DRAW));startKaitei(s,1);
 order(s,x=>x.source===KAITEI&&x.effect==='extended');
 const top=s.players[0].deck[0];pick(s,null);
 assert.ok(!s.metrics[0].played[DRAW]&&has(s,0,'hand',top));drain(s);
 const one=field(1);give(one,0,'deck',[BRAIN]);startKaitei(one,1);
 order(one,x=>x.source===KAITEI&&x.effect==='extended');
 pick(one,0);drain(one);
 assert.equal(one.winner,1);assert.equal(one.metrics[0].played[BRAIN],1);
 assert.equal(one.decision,null);
});

test('Homa draws before offering only light spells up to cost five and plays for no extra mana',()=>{
 for(const use of [true,false]){
  const s=field(),homa=add(s,0,'hand',HOMA);
  const costly=add(s,0,'hand',DOREMI),dark=add(s,0,'hand',DARK),lightCreature=add(s,0,'hand',LIGHT);
  give(s,0,'deck',[TAP,...Array(10).fill(SMALL)]);
  const drawn=s.players[0].deck[0];play(s,homa);
  assert.deepEqual(values(s),[drawn.uid,null]);
  const paid=mana(s);pick(s,use?drawn.uid:null);drain(s);
  assert.equal(paid,6);assert.equal(mana(s),paid);
  assert.ok(has(s,0,use?'grave':'hand',drawn)&&has(s,0,'hand',costly)&&has(s,0,'hand',dark)&&has(s,0,'hand',lightCreature));
 }
});
