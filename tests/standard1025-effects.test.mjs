import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {handInspectorHTML} from '../dist/hand-ui.js';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {act,data,details,drain,e,give,inst,setup,snapshot,GEN} from './target-fixture.mjs';

const YOGI='dmrp04s-056', SHARK='dmrp04s-039', CIRCLE='dmrp04s-021';
const NATURE='dm01-108', WATER='dm01-083', DARK='dm01-090', MULTI_WATER='dmr04-048';
const WATER_SEED='dmrp21-057', NATURE_SEED='dmsd20-016', MAF8='dmex13-032', MAF9='dmrp06-s06';
const MAF_LOW='dmrp05-075', JD='dm23ex1-003';

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const restore=s=>decodeBattleData(encodeBattleData(s));
const tapped=s=>s.players[s.active].battle.filter(x=>x.tapped).map(x=>x.uid);
const alternatives=(s,x)=>e.getLegalActions(s).filter(a=>a.uid===x.uid&&a.role==='tapCast976');
function pick(s,value){act(s,'extended',a=>values(s)[a.choice]===value);}
function cast(s,x,alt=false){act(s,'play',a=>a.uid===x.uid&&(alt?a.role==='tapCast976':!a.alternative));}

test('three official spells retain catalogue IDs, printed costs, artwork and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1025.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const [id,cost,color] of [[YOGI,7,'自然'],[SHARK,6,'水'],[CIRCLE,7,'闇']]){
  const row=m.cards.find(c=>c.id===id),c=registry.get(id);
  assert.equal(c.supported,true);
  assert.equal(c.cost,cost);
  assert.equal(c.limit,4);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(c.g976TapCast,{color,type:'creature',count:4});
 }
});

for(const [id,body,wrong,seed] of [
 [YOGI,NATURE,WATER,NATURE_SEED],[SHARK,WATER,DARK,WATER_SEED],[CIRCLE,DARK,NATURE,WATER_SEED]
])test(id+' counts four untapped own creatures of the right color',()=>{
 const s=setup();
 give(s,0,'mana',[]);
 for(let i=0;i<3;i++)put(s,0,'battle',body,{entered:s.turn});
 put(s,0,'battle',wrong);
 put(s,0,'battle',seed);
 put(s,0,'battle',body,{tapped:true});
 const sealed=put(s,0,'battle',body,{sealed:true});
 put(s,0,'seals',NATURE,{sealOf:sealed.uid,faceDown:true});
 put(s,1,'battle',body);
 const x=put(s,0,'hand',id);
 assert.deepEqual(alternatives(s,x),[]);
 const fourth=put(s,0,'battle',id===SHARK?MULTI_WATER:body);
 assert.deepEqual(alternatives(s,x).map(a=>a.cost),[0]);
 cast(s,x,true);
 assert.deepEqual(values(s),[...s.players[0].battle.slice(0,3).map(y=>y.uid),fourth.uid,null]);
});

test('Yogi commits only after all four selections and places the top three in mana tapped',()=>{
 let s=setup();
 give(s,0,'mana',[]);
 give(s,0,'battle',Array(5).fill(NATURE));
 const [a,b,c,d,spare]=s.players[0].battle;
 const top=s.players[0].deck.slice(0,3).map(x=>x.uid);
 const x=put(s,0,'hand',YOGI),before=physical(s);
 cast(s,x,true);
 for(const selected of [a,b,c]){
  pick(s,selected.uid);
  assert.deepEqual(tapped(s),[]);
  assert.ok(!values(s).includes(selected.uid));
 }
 s=restore(s);
 pick(s,d.uid);
 drain(s);
 assert.deepEqual(tapped(s),[a.uid,b.uid,c.uid,d.uid]);
 assert.equal(s.players[0].battle.find(y=>y.uid===spare.uid).tapped,false);
 assert.deepEqual(s.players[0].mana.map(y=>[y.uid,y.tapped]),top.map(uid=>[uid,true]));
 assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));
 assert.equal(s.noManaUse[0],true);
 assert.deepEqual(physical(s),before);
});

test('cancelling after three selections leaves the fourth cost and all cards untouched',()=>{
 const s=setup();
 give(s,0,'battle',Array(4).fill(NATURE));
 const x=put(s,0,'hand',YOGI),deck=s.players[0].deck.length;
 cast(s,x,true);
 for(const ally of s.players[0].battle.slice(0,3))pick(s,ally.uid);
 pick(s,null);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].hand.includes(x));
 assert.deepEqual(tapped(s),[]);
 assert.equal(s.players[0].deck.length,deck);
 assert.ok(s.players[0].mana.every(y=>!y.tapped));
});

test('King Shark sweeps only tapped opposing creatures, including an untargetable one',()=>{
 const s=setup();
 give(s,0,'mana',[]);
 give(s,0,'battle',Array(4).fill(WATER));
 const a=put(s,1,'battle',NATURE,{tapped:true});
 const diver=put(s,1,'battle',JD,{tapped:true,justDiverActive:true});
 const ready=put(s,1,'battle',NATURE);
 const seed=put(s,1,'battle',WATER_SEED,{tapped:true});
 const x=put(s,0,'hand',SHARK),before=physical(s);
 cast(s,x,true);
 for(const y of s.players[0].battle)pick(s,y.uid);
 drain(s);
 assert.deepEqual(s.players[1].hand.map(y=>y.uid).sort(),[a.uid,diver.uid].sort());
 assert.deepEqual(s.players[1].battle.map(y=>y.uid),[ready.uid,seed.uid]);
 assert.equal(s.players[0].battle.filter(y=>y.tapped).length,4);
 assert.deepEqual(physical(s),before);
});

test('King Shark returns a tapped borrowed creature to its physical owner',()=>{
 const s=setup(),borrowed=put(s,1,'battle',WATER,{tapped:true,cardOwner:0});
 cast(s,put(s,0,'hand',SHARK));
 drain(s);
 assert.ok(s.players[0].hand.some(y=>y.uid===borrowed.uid));
 assert.ok(!s.players[1].hand.some(y=>y.uid===borrowed.uid));
});

test('Circle chooses one owned Mafia Gang creature up to cost eight after paying four taps',()=>{
 let s=setup();
 give(s,0,'mana',[]);
 give(s,0,'battle',Array(4).fill(DARK));
 give(s,0,'grave',[MAF8,MAF9,NATURE,MAF_LOW]);
 give(s,1,'grave',[MAF8]);
 const [eight,,,low]=s.players[0].grave,x=put(s,0,'hand',CIRCLE),before=physical(s);
 cast(s,x,true);
 for(const ally of s.players[0].battle)pick(s,ally.uid);
 assert.deepEqual(values(s).sort(),[eight.uid,low.uid].sort());
 s=restore(s);
 pick(s,eight.uid);
 drain(s);
 assert.ok(s.players[0].battle.some(y=>y.uid===eight.uid));
 assert.ok(s.players[0].grave.some(y=>y.uid===low.uid));
 assert.equal(s.players[1].grave.length,1);
 assert.equal(s.players[0].mana.length,0);
 assert.deepEqual(physical(s),before);
});

test('Circle respects a grave movement lock and finishes without a pending choice',()=>{
 const s=setup();
 give(s,0,'grave',[MAF8]);
 give(s,1,'battle',['dmrp22-042']);
 cast(s,put(s,0,'hand',CIRCLE));
 drain(s);
 assert.deepEqual(s.players[0].grave.map(x=>x.cardId),[MAF8,CIRCLE]);
 assert.equal(s.players[0].battle.length,0);
});

for(const [id,paid] of [[YOGI,7],[SHARK,6],[CIRCLE,7]])test(id+' also casts for its printed mana cost',()=>{
 const s=setup();
 const paidBefore=s.players[0].mana.map(y=>y.uid);
 cast(s,put(s,0,'hand',id));
 drain(s);
 assert.equal(s.players[0].mana.filter(y=>paidBefore.includes(y.uid)&&y.tapped).length,paid);
});

test('Genmu leaves the alternatives for printed costs six and seven available',()=>{
 for(const [id,ally] of [[YOGI,NATURE],[SHARK,WATER],[CIRCLE,DARK]]){
  const s=setup();
  give(s,0,'battle',Array(4).fill(ally));
  give(s,1,'battle',[GEN]);
  assert.equal(alternatives(s,put(s,0,'hand',id)).length,1);
 }
});

test('the hand inspector shows the four-creature payment and the normal cost',()=>{
 const s=setup();
 give(s,0,'battle',Array(4).fill(NATURE));
 const x=put(s,0,'hand',YOGI);
 const html=handInspectorHTML(s,{hand:x.uid,handFace:0},{art:()=>''});
 assert.match(html,/自然のクリーチャーを4体タップして唱える/);
 assert.match(html,/呪文を使う · 7マナ/);
});
