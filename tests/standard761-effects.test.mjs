import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-761.json',import.meta.url)));
const KANMI='dmr21-018',MITSUME='dmr12-015',PHARAOH='dmrp16-030';
const NATURE='dm01-108',GIANT='dm36-103',SMALL='dm23rp4-057',DREAM='dm23ex3-068';
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const option=s.decision.choices[a.choice].value;
 return (option?.uid??option)===value;
});
const battleCard=(s,p,uid)=>s.players[p].battle.find(x=>x.uid===uid);
function toTarget(s){
 while(s.decision?.type==='effectOrder')e.step(s,e.chooseAI(s));
 assert.equal(s.decision?.task?.op,'g34_Target');
}

test('three complete definitions keep their existing catalogue IDs and verified images',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:761}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:761}));
  assert.deepEqual(registry.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(registry.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Kanmi untaps both eligible mana races, including a twinpact, and respects locks and face-down mana',()=>{
 const s=setup();
 const dream=put(s,0,'mana',DREAM,{tapped:true}),giant=put(s,0,'mana','dm23rp2-045',{tapped:true});
 const other=put(s,0,'mana',NATURE,{tapped:true}),locked=put(s,0,'mana',GIANT,{tapped:true,tapLocks:[1]});
 const hidden=put(s,0,'mana',GIANT,{tapped:true,faceDown:true}),rival=put(s,1,'mana',GIANT,{tapped:true});
 cast(s,KANMI);
 drain(s);
 assert.ok(!dream.tapped&&!giant.tapped);
 assert.ok(other.tapped&&locked.tapped&&hidden.tapped&&rival.tapped);
});

test('Kanmi boosts other friendly Giants from cost seven, and its aura disappears when suppressed',()=>{
 const s=setup(),kanmi=put(s,0,'battle',KANMI);
 const high=put(s,0,'battle',GIANT),low=put(s,0,'battle',SMALL);
 const other=put(s,0,'battle',NATURE),rival=put(s,1,'battle',GIANT);
 const stats=x=>[e.power(x,false,s),e.effectiveCard(x,s).extraBreak??0];
 assert.deepEqual(stats(kanmi),[7000,0]);
 assert.deepEqual(stats(high),[14000,1]);
 assert.deepEqual(stats(low),[4000,0]);
 assert.deepEqual(stats(other),[2000,0]);
 assert.deepEqual(stats(rival),[9000,0]);
 kanmi.g35Ignored=s.turn;
 assert.deepEqual(stats(high),[9000,0]);
 delete kanmi.g35Ignored;
 attack(s,high.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('two Mitsume boost each other as in QA 37034 and stack on even a low-cost Giant',()=>{
 const s=setup(),first=put(s,0,'battle',MITSUME),second=put(s,0,'battle',MITSUME);
 const low=put(s,0,'battle',SMALL);
 for(const x of [first,second]){
  assert.equal(e.power(x,false,s),13000);
  assert.equal(e.effectiveCard(x,s).extraBreak,1);
 }
 assert.equal(e.power(low,false,s),14000);
 assert.equal(e.effectiveCard(low,s).extraBreak,2);
 attack(s,first.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('extra breaking also applies when the boosted creature breaks a shield by effect',()=>{
 const s=setup(),giant=put(s,0,'battle',GIANT),kanmi=put(s,0,'battle',KANMI);
 s.extTasks=[{op:'g34_Break497',p:0,source:GIANT,uid:giant.uid,n:1,g747CreatureBreak:true}];
 act(s,'toAttack');
 const ids=s.players[1].shields.slice(0,2).map(x=>x.uid);
 pick(s,ids[0]);
 pick(s,ids[1]);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(s.players[1].hand.some(x=>x.uid===ids[0])&&s.players[1].hand.some(x=>x.uid===ids[1]));
 assert.ok(s.players[0].battle.includes(kanmi));
});

test('Pharaoh triggers for each card in a broken shield stack and resumes the chosen direction after saving',()=>{
 let s=setup();
 const attacker=put(s,0,'battle',NATURE),enemy=put(s,0,'battle',NATURE);
 const ally=put(s,1,'battle',NATURE,{tapped:true});
 put(s,1,'battle',PHARAOH);
 give(s,1,'shields',[NATURE]);
 s.players[1].shields[0].shieldStack=[inst(NATURE)];
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 toTarget(s);
 assert.equal(s.decision.player,1);
 assert.ok(!s.decision.choices.some(o=>o.value===null));
 pick(s,ally.uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,false);
 assert.equal(battleCard(s,1,ally.uid).tapped,false);
 toTarget(s);
 pick(s,enemy.uid);
 pick(s,true);
 assert.equal(battleCard(s,0,enemy.uid).tapped,true);
 assert.equal(s.players[1].hand.length,2);
 assert.equal(s.decision,null);
});

test('Pharaoh never reacts to the opponent’s shield leaving',()=>{
 const s=setup(),pharaoh=put(s,0,'battle',PHARAOH),enemy=put(s,1,'battle',NATURE);
 attack(s,pharaoh.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(s.decision,null);
 assert.equal(s.players[1].shields.length,4);
 assert.ok(!enemy.tapped);
});
