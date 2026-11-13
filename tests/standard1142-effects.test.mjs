import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const STAGE='dm26rp2-027',RED='dm26rp2-025',ONI='dm26rp2-009',ERIKA='dm26rp2-046';
const BEETLE='dmrp01-027',ATER='dm23rp3-S03',COMMAND='dm26rp2-064',QQ='dmrp07-m01';
const N='dm01-108',F='dm08-049',D='dm01-090',BIG='dm01-001',HAND='dm01-027';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(12).fill(N));give(s,p,'grave',[]);}
 return s;
}
function add(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const choice=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choice(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const defend=s=>{if(legal(s,'noBlock').length)act(s,'noBlock');};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

test('three canonical definitions and five official prints preserve IDs, faces, images and copy limits',()=>{
 const m=read('tools/support-phase-1142.json'),r=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[STAGE,RED,ONI]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['promoy25-064',RED],['dm26rp2-SEC014',ONI]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],canonical=m.cards.find(x=>x.id===id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1142}),canonical.spec);
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(r.get(row.id).id,id);
  assert.equal(r.byName.get(nameKey(row.name)).id,id);
  assert.equal(CARD_IMAGES[id],canonical.image);
  assert.ok(read('tools/image-reference-prints.json').prints.some(x=>x.id===row.id&&x.image===row.image));
 }
});

test('Global Stage powers its own Guardman and Super Guardman, including itself, while opposing effects still apply',()=>{
 const s=field(),stage=add(s,0,'battle',STAGE,{entered:s.turn}),erika=add(s,0,'battle',ERIKA,{entered:s.turn});
 const beetle=add(s,0,'battle',BEETLE,{entered:s.turn}),plain=add(s,0,'battle',N,{entered:s.turn});
 const enemy=add(s,1,'battle',ERIKA);
 s.phase='attack';
 for(const [x,breaker] of [[stage,2],[erika,2],[beetle,3]]){
  const c=e.effectiveCard(x,s);
  assert.ok(c.speedAttacker&&c.poweredBreaker&&!c.noAttack);
  assert.equal(c.breaker,breaker);
  assert.ok(legal(s,'attack').some(a=>a.uid===x.uid&&a.target==='player'));
 }
 assert.ok(!e.effectiveCard(plain,s).speedAttacker&&!e.effectiveCard(enemy,s).speedAttacker);
 erika.g35NoAttack=[{turn:s.turn}];
 assert.ok(!legal(s,'attack').some(a=>a.uid===erika.uid));
 stage.sealed=true;
 assert.ok(e.effectiveCard(erika,s).noAttack&&!e.effectiveCard(beetle,s).poweredBreaker);
});

test('Global Stage changes only the battle and Ater can still substitute its own destruction (QA 48919)',()=>{
 const s=field(),ater=add(s,0,'battle',ATER),fodder=add(s,0,'battle',N);
 const target=add(s,1,'battle',N,{tapped:true}),stage=add(s,1,'battle',STAGE);
 attack(s,ater.uid,target.uid);defend(s);
 assert.equal(s.decision.task.op,'g393SG_Battle');
 pick(s,stage.uid);
 const save=legal(s,'replaceLeave').find(a=>a.label.includes(e.card(fodder).name));
 if(save)e.step(s,save);else drain(s);
 assert.ok(stage.tapped&&has(s,1,'battle',target)&&has(s,0,'battle',ater)&&has(s,0,'grave',fodder));
});

test('Redzone W uses the opponent library for the seal and the opponent Command can remove it',()=>{
 const s=field(),red=add(s,0,'hand',RED),target=add(s,1,'battle',D),other=add(s,1,'battle',N);
 const top=s.players[1].deck[0];
 play(s,red);
 assert.deepEqual(new Set(choice(s)),new Set([target.uid,other.uid]));
 pick(s,target.uid);
 assert.ok(target.sealed&&!other.sealed&&e.effectiveCard(red,s).speedAttacker);
 assert.equal(e.effectiveCard(red,s).breaker,2);
 assert.equal(s.players[1].seals[0],top);
 assert.ok(top.faceDown&&top.sealOf===target.uid);
 s.active=1;
 const command=add(s,1,'hand',COMMAND);play(s,command);
 assert.equal(s.decision.task.op,'g23_Unseal');
 pick(s,top.uid);pick(s,null);
 assert.ok(!target.sealed&&has(s,1,'grave',top));
});

test('Redzone W offers Revolution Change only for fire or darkness at current power 4000 or higher',()=>{
 for(const [id,amount,eligible] of [[F,0,true],[F,-1,false],[N,6000,false],[D,5000,true]]){
  const s=field(),attacker=add(s,0,'battle',id,{powerModifiers:[{amount}]}),red=add(s,0,'hand',RED);
  const target=add(s,1,'battle',N,{tapped:true}),sealTarget=add(s,1,'battle',N);
  attack(s,attacker.uid,target.uid);
  assert.equal(s.decision?.task?.op==='revDeclare',eligible);
  if(!eligible)continue;
  pick(s,true);pick(s,attacker.uid);
  assert.equal(s.decision.task.op,'g34_Target');
  pick(s,sealTarget.uid);defend(s);drain(s);
  assert.ok(has(s,0,'hand',attacker)&&has(s,0,'battle',red)&&sealTarget.sealed);
 }
});

function oniBattle(s){
 const oni=add(s,0,'hand',ONI),target=add(s,1,'battle',BIG);
 target.powerModifiers=[{amount:4000}];
 play(s,oni);
 assert.equal(e.power(oni,false,s),9000);
 assert.equal(e.effectiveCard(oni,s).breaker,2);
 attack(s,oni.uid,target.uid);defend(s);
 assert.ok(has(s,0,'battle',oni)&&has(s,1,'grave',target));
 return oni;
}

test('Onimaru wins two judges, loses the third and then makes the same opponent move two choices',()=>{
 const s=field(),victim=add(s,1,'battle',N);
 give(s,0,'deck',[BIG,BIG,HAND,N]);give(s,1,'deck',[HAND,BIG,BIG,N]);
 const ownReveals=s.players[0].deck.slice(0,3),oppReveals=s.players[1].deck.slice(0,3);
 const shield=s.players[1].shields[0];
 oniBattle(s);
 assert.equal(s.decision.task.wins,1);
 assert.ok(!victim.tapped&&has(s,1,'shields',shield));
 pick(s,true);assert.equal(s.decision.task.wins,2);pick(s,true);
 assert.equal(s.decision.player,1);
 assert.deepEqual(s.players[0].deck.slice(-3),ownReveals);
 assert.deepEqual(s.players[1].deck.slice(-3),oppReveals);
 pick(s,victim.uid);pick(s,shield.uid);
 assert.ok(has(s,1,'mana',victim)&&has(s,1,'mana',shield));
 assert.equal(s.decision,null);
});

test('Onimaru can stop after one win and moves a shield stack to each card owner without triggering it',()=>{
 const s=field();
 give(s,0,'deck',[BIG,N]);give(s,1,'deck',[HAND,BIG]);
 const shield=s.players[1].shields[0];
 const guest=Object.assign(inst(HAND),{cardOwner:0});
 shield.shieldStack=[guest];
 oniBattle(s);
 assert.equal(s.decision.task.wins,1);
 pick(s,null);pick(s,shield.uid);
 assert.ok(has(s,1,'mana',shield)&&has(s,0,'mana',guest));
 assert.equal(s.decision,null);
});

test('a first judge loss yields no reward, including when the ability user cannot reveal (QA 43489)',()=>{
 for(const lock of [false,true]){
  const s=field();
  if(lock)add(s,1,'battle',QQ);
  give(s,0,'deck',[lock?BIG:HAND,N]);give(s,1,'deck',[lock?HAND:BIG,N]);
  const [top]=s.players[0].deck,mana=s.players[1].mana.length;
  oniBattle(s);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].deck[lock?0:1],top);
  assert.equal(s.players[1].mana.length,mana);
 }
});

test('Onimaru wins when only the opponent cannot reveal, or when neither can reveal (QA 47365)',()=>{
 for(const both of [false,true]){
  const s=field();
  add(s,0,'battle',QQ);
  if(both)add(s,1,'battle',QQ);
  give(s,0,'deck',[HAND,N]);give(s,1,'deck',[BIG,N]);
  const own=s.players[0].deck[0],opp=s.players[1].deck[0];
  oniBattle(s);
  assert.equal(s.decision.task.wins,1);
  assert.equal(s.players[0].deck[both?0:1],own);
  assert.equal(s.players[1].deck[0],opp);
  pick(s,null);drain(s);
 }
});
