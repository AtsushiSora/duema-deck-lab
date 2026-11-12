import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {handInspectorHTML} from '../dist/hand-ui.js';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {act,data,details,drain,e,give,inst,setup,snapshot,GEN} from './target-fixture.mjs';

const LIFE='dm26ex4-053', SYNC='dmrp03-056', UCHI='dmrp22-057';
const NATURE='dm01-108', WATER='dm01-083', SEED='dmrp21-057', OTHER_SEED='dmrp22-055';
const NATURE_SEED='dmsd20-016';

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
function pick(s,value){
 act(s,'extended',a=>values(s)[a.choice]===value);
}
function cast(s,x,role=null){
 act(s,'play',a=>a.uid===x.uid&&(role?a.role===role:!a.alternative));
}
const restore=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

test('three official spells use the existing IDs, art and normal costs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1024.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const [id,cost] of [[LIFE,4],[SYNC,5],[UCHI,3]]){
  const row=m.cards.find(c=>c.id===id),c=registry.get(id);
  assert.equal(c.supported,true);
  assert.equal(c.cost,cost);
  assert.equal(c.limit,4);
  assert.equal(CARD_IMAGES[id],row.image);
 }
});

for(const [alternative,accept,returns] of [[false,false,true],[true,true,true],[true,false,false]])
 test('Life resolves the opponent offer before its tapped ramp and optional recovery: '+[alternative,accept,returns].join(' '),()=>{
  let s=setup();
  const [first,second]=s.players[0].deck;
  const enemyTop=s.players[1].deck[0];
  const x=put(s,0,'hand',LIFE),before=physical(s);
  const paid=alternative?3:4,ownMana=s.players[0].mana.length,oppMana=s.players[1].mana.length;
  cast(s,x,alternative?'paidAlt568':null);
  if(alternative){
   assert.equal(s.decision.player,1);
   assert.equal(s.players[0].mana.length,ownMana);
   s=restore(s);
   pick(s,accept?true:null);
  }
  assert.equal(s.decision.player,0);
  assert.equal(s.players[1].mana.length,oppMana+Number(accept));
  if(accept)assert.equal(s.players[1].mana.find(x=>x.uid===enemyTop.uid).tapped,true);
  assert.deepEqual(s.players[0].mana.slice(-2).map(x=>[x.uid,x.tapped]),[[first.uid,true],[second.uid,true]]);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,paid+2);
  pick(s,returns?first.uid:null);
  drain(s);
  assert.equal(s.players[0].hand.some(x=>x.uid===first.uid),returns);
  assert.equal(s.players[0].mana.length,ownMana+2-Number(returns));
  assert.deepEqual(physical(s),before);
 });

test('Life can return a face-down mana card and turns it face up in its owner’s hand',()=>{
 const s=setup();
 const hidden=s.players[0].mana[0];
 hidden.faceDown=true;
 cast(s,put(s,0,'hand',LIFE));
 pick(s,hidden.uid);
 drain(s);
 assert.ok(s.players[0].hand.some(x=>x.uid===hidden.uid&&!x.faceDown));
});

for(const [id,payer1,payer2,wrong,wrongType,to] of [
 [SYNC,NATURE,NATURE,WATER,NATURE_SEED,'mana'],
 [UCHI,SEED,OTHER_SEED,NATURE_SEED,WATER,'hand']
])test(id+' taps only two distinct eligible allies and moves the chosen opposing creature',()=>{
 let s=setup();
 give(s,0,'mana',[]);
 const a=put(s,0,'battle',payer1,{entered:s.turn});
 const b=put(s,0,'battle',payer2);
 put(s,0,'battle',wrong);
 put(s,0,'battle',wrongType);
 put(s,0,'battle',payer1,{tapped:true});
 const sealed=put(s,0,'battle',payer2,{sealed:true});
 put(s,0,'seals',NATURE,{sealOf:sealed.uid,faceDown:true});
 const enemy=put(s,1,'battle',NATURE);
 put(s,1,'battle',SEED);
 const x=put(s,0,'hand',id),before=physical(s);
 cast(s,x,'tapCast976');
 assert.deepEqual(values(s),[a.uid,b.uid,null]);
 pick(s,a.uid);
 assert.equal(a.tapped,false);
 assert.deepEqual(values(s),[b.uid,null]);
 s=restore(s);
 pick(s,b.uid);
 assert.deepEqual(values(s),[enemy.uid]);
 pick(s,enemy.uid);
 drain(s);
 for(const uid of [a.uid,b.uid])assert.ok(s.players[0].battle.find(x=>x.uid===uid)?.tapped);
 assert.ok(s.players[1][to].some(x=>x.uid===enemy.uid));
 assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));
 assert.equal(s.players[0].mana.length,0);
 assert.equal(s.noManaUse[0],true);
 assert.deepEqual(physical(s),before);
});

test('the player may cancel seed payment without tapping a card or spending the spell',()=>{
 const s=setup(),a=put(s,0,'battle',SEED),b=put(s,0,'battle',OTHER_SEED);
 const x=put(s,0,'hand',UCHI);
 cast(s,x,'tapCast976');
 pick(s,a.uid);
 pick(s,null);
 assert.equal(a.tapped,false);
 assert.equal(b.tapped,false);
 assert.ok(s.players[0].hand.includes(x));
 assert.equal(s.decision,null);
});

for(const [id,payer,to,cost] of [[SYNC,NATURE,'mana',5],[UCHI,SEED,'hand',3]])
 test(id+' also resolves with ordinary mana and leaves eligible elements untapped',()=>{
  const s=setup(),ally=put(s,0,'battle',payer),enemy=put(s,1,'battle',NATURE);
  cast(s,put(s,0,'hand',id));
  pick(s,enemy.uid);
  drain(s);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,cost);
  assert.equal(ally.tapped,false);
  assert.ok(s.players[1][to].some(x=>x.uid===enemy.uid));
 });

test('an ignored tap-cast spell offers no alternative payment',()=>{
 const s=setup();
 give(s,0,'battle',[SEED,OTHER_SEED]);
 give(s,1,'battle',[GEN]);
 const x=put(s,0,'hand',UCHI);
 assert.ok(e.getLegalActions(s).some(a=>a.uid===x.uid&&a.kind==='play'&&!a.alternative));
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===x.uid&&a.role==='tapCast976'));
});

test('the hand inspector distinguishes tapping seeds from ordinary mana payment',()=>{
 const s=setup();
 give(s,0,'battle',[SEED,OTHER_SEED]);
 const x=put(s,0,'hand',UCHI);
 const html=handInspectorHTML(s,{hand:x.uid,handFace:0},{art:()=>''});
 assert.match(html,/水のタマシードを2枚タップして唱える/);
 assert.match(html,/呪文を使う · 3マナ/);
});

test('a tamaseed that is also a creature can pay the water tamaseed cost',()=>{
 const s=setup();
 give(s,0,'battle',[NATURE,NATURE,NATURE,SEED]);
 const dual=put(s,0,'battle','dm22rp2-S8');
 const x=put(s,0,'hand',UCHI);
 const enemy=put(s,1,'battle',NATURE);
 (s.extLimits??=[]).push({kind:'g805BattleColor',turn:s.turn,uid:dual.uid,incarnation:dual.incarnation??0,color:'水'});
 assert.equal(e.isCreature(s,dual),true);
 cast(s,x,'tapCast976');
 assert.ok(values(s).includes(dual.uid));
 pick(s,dual.uid);
 pick(s,s.players[0].battle.find(y=>y.cardId===SEED).uid);
 pick(s,enemy.uid);
 drain(s);
 assert.ok(dual.tapped);
});

test('Life needs nature mana for its alternative and can use only three mana',()=>{
 const s=setup(),x=put(s,0,'hand',LIFE);
 give(s,0,'mana',[WATER,WATER,WATER]);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid));
 s.players[0].mana[0]=inst(NATURE);
 const actions=e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid);
 assert.deepEqual(actions.map(a=>[a.role,a.cost]),[['paidAlt568',3]]);
});
