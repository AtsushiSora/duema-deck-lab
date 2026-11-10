import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const DOG='dmrp14-087',ASHIGA='dm23ex1-065',TWIN='dm22ex1-059';
const FORMULA='dmr06-010',CHRISTINA='dmrp04s-034',DRAW_END='dmex13-067';
const SMALL='dm01-108',WATER='dm01-083';
const AGASA='dmx11-015',HAND='dm01-027',FORTRESS='dm06-008',EX='dmrp18-s10';
const KALEIKO='dm22ex1-086',SITO='dmrp16-062';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(SMALL));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const hand=s=>s.players[0].hand.length;
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function task(s,op,p,source,props={}){
 s.phase='main';
 s.extTasks=[{op,p,source,...props}];
 act(s,'toAttack');
}
function topShields(s,p,n=1){
 task(s,'g34_ShieldTop',p,EX,{n,g779Simultaneous:true});
 drain(s);
}
function burn(s,uid){
 task(s,'g61_Core',1,FORTRESS);
 pick(s,uid);
 drain(s);
}

test('Phase 883 pins three full definitions and keeps the Twinpact distinct from both single-face cards',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-883.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[DOG,ASHIGA,TWIN]);
 assert.deepEqual(m.printAliases,[]);
 const rows=[FORMULA,CHRISTINA,TWIN].map(id=>({id,count:4}));
 assert.deepEqual(registry.resolveRows(rows),rows);
 for(const row of m.cards){
  const detail=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:883}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:882}));
  for(const face of row.faces.keys()){
   const changed=structuredClone(detail);
   changed.faces[face].abilityText+='\n未知の能力。';
   assert.throws(()=>standardCardSpec(changed,{phase:883}));
  }
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
 assert.deepEqual(e.card(TWIN).g174End,e.card(FORMULA).g174End);
 assert.deepEqual(e.card(TWIN).spellFace.g34Tasks,e.card(CHRISTINA).g34Tasks);
});

test('Watchdog triggers once per copy on the first simultaneous placement, even on the opposing turn',()=>{
 let s=field();
 give(s,0,'battle',[DOG,DOG]);
 topShields(s,0,2);
 assert.equal(s.players[0].shields.length,7);
 assert.equal(hand(s),2);
 s=restore(s);
 topShields(s,0);
 assert.equal(hand(s),2);
 end(s);
 topShields(s,1);
 assert.equal(hand(s),2);
 topShields(s,0);
 assert.equal(hand(s),4);
});

test('Watchdog tracks first placement before it enters or while it is ignored',()=>{
 for(const ignored of [false,true]){
  const s=field();
  const watcher=ignored?add(s,0,'battle',DOG,{g35Ignored:s.turn}):null;
  topShields(s,0);
  s.phase='main';
  if(watcher)delete watcher.g35Ignored;
  else cast(s,DOG);
  topShields(s,0);
  assert.equal(hand(s),0);
  end(s);
  topShields(s,0);
  assert.equal(hand(s),1);
 }
});

test('Watchdog triggers for shield stack additions and ignores a replacement that goes to the grave',()=>{
 const s=field(),redirect=add(s,1,'battle',KALEIKO);
 give(s,0,'battle',[DOG]);
 const shield=s.players[0].shields[0],first=s.players[0].deck[0];
 topShields(s,0);
 assert.ok(has(s,0,'grave',first));
 assert.equal(hand(s),0);
 s.players[1].battle=s.players[1].battle.filter(x=>x.uid!==redirect.uid);
 task(s,'g71_Plus',0,EX);
 pick(s,shield);
 drain(s);
 assert.equal(shield.shieldStack.length,1);
 assert.equal(hand(s),1);
});

test('Watchdog counts a shield swap as placement without treating the outgoing card as a grave move',()=>{
 const s=field();
 give(s,0,'battle',[DOG,ASHIGA]);
 const old=s.players[0].shields[0],incoming=s.players[0].deck[0];
 cast(s,SITO);
 pick(s,old);
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'shields',incoming)&&has(s,0,'hand',old));
 assert.equal(s.players[0].shields.length,5);
 assert.equal(hand(s),1);
 topShields(s,0);
 assert.equal(hand(s),1);
});

test('Watchdog and Ashiga do not react when the same simultaneous move removes their source',()=>{
 for(const reverse of [false,true]){
  const s=field();
  give(s,0,'battle',reverse?[DOG,SMALL]:[SMALL,DOG]);
  task(s,'g34_Sweep',1,EX,{to:'shields',filter:{creature:true}});
  drain(s);
  assert.equal(s.players[0].shields.length,7);
  assert.equal(hand(s),0);

  const t=field();
  if(!reverse)give(t,0,'battle',[ASHIGA]);
  cast(t,EX);
  drain(t);
  if(reverse)add(t,0,'battle',ASHIGA);
  task(t,'g34_Sweep',1,EX,{to:'grave',filter:{creature:true}});
  drain(t);
  assert.equal(t.players[0].shields.length,5);
  assert.deepEqual(t.players[0].battle.map(x=>x.cardId),[EX]);
 }
});

test('Ashiga makes one new shield per physical card in a burned stack and Watchdog draws only once',()=>{
 const s=field();
 give(s,0,'battle',[ASHIGA,DOG]);
 give(s,0,'shields',[SMALL]);
 const root=s.players[0].shields[0],extra=inst(WATER);
 root.shieldStack=[extra];
 const [first,drawn,third]=s.players[0].deck;
 task(s,'g61_Core',1,FORTRESS);
 pick(s,root);
 act(s,'orderEffect',a=>a.cardId===ASHIGA);
 act(s,'orderEffect',a=>a.cardId===DOG);
 drain(s);
 assert.ok(has(s,0,'grave',root)&&has(s,0,'grave',extra));
 assert.deepEqual(s.players[0].shields.map(x=>x.uid),[first.uid,third.uid]);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[drawn.uid]);
});

test('Ashiga triggers for EX Life shield loss, but not for a shield that enters hand before being cast',()=>{
 const s=field();
 give(s,0,'battle',[ASHIGA]);
 cast(s,EX);
 drain(s);
 const ex=s.players[0].battle.find(x=>x.cardId===EX),shield=e.exLifeShields(s,0,ex)[0];
 s.active=1;
 cast(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===ex.uid));
 drain(s);
 assert.ok(has(s,0,'grave',shield)&&has(s,0,'battle',ex));
 assert.equal(s.players[0].shields.length,6);

 const t=field();
 give(t,0,'battle',[ASHIGA]);
 give(t,0,'shields',[HAND]);
 const trigger=t.players[0].shields[0],attacker=add(t,1,'battle',SMALL);
 t.active=1;
 attack(t,attacker.uid);
 act(t,'noBlock');
 act(t,'useTrigger');
 drain(t);
 assert.ok(has(t,0,'grave',trigger));
 assert.equal(t.players[0].shields.length,0);
});

test('Ashiga triggers for a spell actually cast from the shield zone (QA 42651)',()=>{
 const s=field();
 give(s,0,'battle',[ASHIGA,AGASA]);
 give(s,0,'shields',[HAND]);
 const shield=s.players[0].shields[0];
 add(s,1,'battle',SMALL);
 s.active=1;
 cast(s,'dm06-085');
 assert.equal(s.decision.task.op,'g159S_AgasaSpell');
 pick(s,shield);
 drain(s);
 assert.ok(has(s,0,'grave',shield));
 assert.equal(s.players[0].shields.length,1);
});

test('Ashiga ignores a different player’s shield and a muted Ashiga cannot react',()=>{
 for(const ignored of [false,true]){
  const s=field();
  give(s,1,'battle',ignored?[ASHIGA,GEN]:[ASHIGA]);
  give(s,0,'battle',[ASHIGA]);
  burn(s,s.players[0].shields[0]);
  assert.deepEqual(s.players.map(p=>p.shields.length),[ignored?4:5,5]);
 }
});

test('Twinpact’s spell face taps a friendly creature and enemies strictly below its live power',()=>{
 const s=field(),ally=add(s,0,'battle',FORMULA),low=add(s,1,'battle',SMALL);
 const equal=add(s,1,'battle',FORMULA),spell=add(s,0,'hand',TWIN);
 act(s,'play',a=>a.uid===spell.uid&&a.face===1);
 pick(s,ally);
 assert.ok(ally.tapped&&low.tapped&&!equal.tapped);
 assert.ok(has(s,0,'grave',spell));
 assert.equal(s.players[0].battle.length,1);
});

test('Twinpact charges as a single tapped multicolored card and uses W-Breaker on its creature face',()=>{
 const s=field(),charged=add(s,0,'hand',TWIN);
 s.phase='charge';
 act(s,'charge',a=>a.uid===charged.uid);
 assert.ok(charged.tapped&&has(s,0,'mana',charged));
 s.phase='main';
 const unit=add(s,0,'hand',TWIN);
 act(s,'play',a=>a.uid===unit.uid&&a.face===0);
 assert.ok(has(s,0,'battle',unit));
 end(s);
 end(s);
 attack(s,unit.uid);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Twinpact checks the tapped state and tenth card at the end ability’s resolution',()=>{
 for(const [tapped,count,active,win] of [[true,10,0,true],[true,9,0,false],[false,10,0,false],[true,10,1,false]]){
  const s=field();
  s.active=active;
  add(s,0,'battle',TWIN,{tapped});
  give(s,0,'hand',Array(count).fill(SMALL));
  end(s);
  assert.equal(s.winner,win?0:null);
 }
 let s=field();
 add(s,0,'battle',TWIN,{tapped:true});
 add(s,0,'battle',DRAW_END);
 give(s,0,'hand',Array(9).fill(SMALL));
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.decision.type,'effectOrder');
 s=restore(s);
 act(s,'orderEffect',a=>a.cardId===DRAW_END);
 drain(s);
 assert.equal(hand(s),10);
 assert.equal(s.winner,0);
});
