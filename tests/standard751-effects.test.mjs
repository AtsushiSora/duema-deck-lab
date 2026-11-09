import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-751.json',import.meta.url)));

test('Phase 751 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:751}));
  assert.throws(()=>standardCardSpec(detail,{phase:750}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:751}));
 }
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  const stats=faces=>faces.map(({abilityText,...face})=>face);
  assert.deepEqual(stats(row.faces),stats(original.faces));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:751}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
 }
});

const DOGI='dmx26-l02',ROCK='dmsd02-009',BAT='dmrp15-050',SHY='dm22rp2-027';
const LOW='dm01-083',NATURE='dm01-108',FIRE='dm01-097',LIGHT='dm01-075',SLAYER='dm01-088';
const SEED='dm25rp4-013',DUAL='dm26-038';
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
}
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function fight(s,attacker,target){
 attack(s,attacker.uid,target.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const attacks=(s,x)=>e.getLegalActions({...s,phase:'attack'}).filter(a=>a.kind==='attack'&&a.uid===x.uid);

test('Dogiragon can attack an untapped creature on entry, and the attack permission expires',()=>{
 const s=field(),enemy=put(s,1,LOW),other=put(s,1,LOW),dogi=play(s,DOGI);
 assert.ok(attacks(s,dogi).some(a=>a.target===enemy.uid));
 fight(s,dogi,enemy);
 assert.ok(has(s,1,'grave',enemy));
 assert.equal(e.effectiveCard(dogi,s).breaker,3);
 end(s);end(s);
 assert.ok(!attacks(s,dogi).some(a=>a.target===other.uid));
});

test('Dogiragon survives a lethal direct attack through save and source departure, until its next turn',()=>{
 let s=field();
 give(s,0,'shields',[]);
 const slayer=put(s,1,SLAYER),direct=put(s,1,FIRE),later=put(s,1,FIRE),dogi=play(s,DOGI);
 fight(s,dogi,slayer);drain(s);
 assert.ok(has(s,0,'grave',dogi));
 s=restore(s);end(s);
 attack(s,direct.uid);drain(s);
 assert.equal(s.winner,null);
 assert.ok(s.log.some(x=>x.type==='lossPrevented'&&x.player===0));
 end(s);end(s);
 attack(s,later.uid);drain(s);
 assert.equal(s.winner,1);
});

test('Iwasai wins at equal shields, adds the top card face down and immediately gains Labyrinth',()=>{
 const s=field(),rock=put(s,0,ROCK),target=put(s,1,LOW,{tapped:true});
 assert.equal(e.power(rock,false,s),3000);
 assert.ok((e.effectiveCard(rock,s).breaker??1)===1);
 const top=s.players[0].deck[0],next=s.players[0].deck[1];
 fight(s,rock,target);
 assert.equal(s.players[0].shields.length,6);
 assert.equal(s.players[0].shields.at(-1).uid,top.uid);
 assert.ok(!s.players[0].shields.at(-1).faceUp);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 assert.equal(e.power(rock,false,s),6000);
 assert.equal(e.effectiveCard(rock,s).breaker,2);
});

test('Iwasai counts shields on the opposing turn and the bonus disappears at equality',()=>{
 const s=field(1),rock=put(s,0,ROCK,{tapped:true}),enemy=put(s,1,FIRE);
 fight(s,enemy,rock);
 assert.equal(s.players[0].shields.length,6);
 assert.equal(e.power(rock,false,s),6000);
 s.players[1].shields.push(inst(NATURE));
 assert.equal(e.power(rock,false,s),3000);
 assert.equal(e.effectiveCard(rock,s).breaker??1,1);
});

for(const choice of [0,1,2])test('Bat lets its owner choose exactly one shield, mana or decline after a dual-color victory: '+choice,()=>{
 let s=field(),bat=put(s,0,BAT),target=put(s,1,LOW,{tapped:true});
 s.players[0].deck.unshift(inst(DUAL));
 const top=s.players[0].deck[0],mana=s.players[0].mana.length;
 fight(s,bat,target);
 assert.equal(s.decision.task.op,'g34_Choose');
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.choices.map(c=>c.value),[0,1,2]);
 assert.ok(s.decision.choices.every(c=>!c.cardId));
 s=restore(s);
 pick(s,choice);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].shields.length,5+Number(choice===0));
 assert.equal(s.players[0].mana.length,mana+Number(choice===1));
 if(choice===0){
  assert.equal(s.players[0].shields.at(-1).uid,top.uid);
  assert.ok(!s.players[0].shields.at(-1).faceUp);
 }
 if(choice===1){
  assert.equal(s.players[0].mana.at(-1).uid,top.uid);
  assert.ok(s.players[0].mana.at(-1).tapped);
 }
 if(choice===2)assert.equal(s.players[0].deck[0].uid,top.uid);
});

test('Bat watches eligible allies on either turn, but excludes wrong colors and enemy victories',()=>{
 const allied=field(1);
 put(allied,0,BAT);
 const nature=put(allied,0,NATURE,{tapped:true}),enemy=put(allied,1,LOW);
 fight(allied,enemy,nature);
 assert.equal(allied.decision.player,0);
 pick(allied,2);
 for(const active of [0,1]){
  const s=field(active);
  put(s,0,BAT);
  const winner=put(s,active,active===0?FIRE:NATURE),loser=put(s,1-active,LOW,{tapped:true});
  fight(s,winner,loser);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].shields.length,5);
 }
});

for(const partners of [1,2])test('Sha Irock uses Civil Count after a winning block, counting each light element once: '+partners,()=>{
 const s=field(1),shy=put(s,0,SHY),attacker=put(s,1,FIRE);
 put(s,0,SEED);
 put(s,0,NATURE);
 if(partners===2)put(s,0,LIGHT);
 const top=s.players[0].deck[0];
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===shy.uid);
 assert.ok(has(s,1,'grave',attacker));
 assert.equal(e.effectiveCard(shy,s).breaker,2);
 if(partners===1){
  assert.equal(s.decision,null);
  assert.equal(s.players[0].deck[0].uid,top.uid);
 }else{
  assert.equal(s.decision.task.op,'g34_Offer');
  assert.equal(s.decision.player,0);
  const decline=restore(s);
  pick(decline,null);
  assert.equal(decline.players[0].deck[0].uid,top.uid);
  pick(s,true);
  assert.equal(s.players[0].shields.length,6);
  assert.equal(s.players[0].shields.at(-1).uid,top.uid);
  assert.ok(!s.players[0].shields.at(-1).faceUp);
 }
});
