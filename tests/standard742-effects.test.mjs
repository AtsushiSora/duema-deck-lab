import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-742.json',import.meta.url)));

test('Phase 742 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:742}));
  assert.throws(()=>standardCardSpec(detail,{phase:741}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:742}));
 }
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  const stats=faces=>faces.map(({abilityText,...face})=>face);
  assert.deepEqual(stats(row.faces),stats(original.faces));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:742}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
 }
});

const KUMA='dmr17-063',GRAPH='dmrp13-031',ZEVO='dm22rp2-053';
const LOW='dm01-083',MED='dm01-108',BLOCK='dm01-079',LIGHT='dm01-043',SEED='dm25ex1-054';
const restore=s=>JSON.parse(JSON.stringify(s));
const values=s=>s.decision.choices.map(o=>o.value.uid);
const pick=(s,x)=>act(s,'extended',a=>s.decision.choices[a.choice].value.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(MED));
 return s;
}
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function finishAttack(s){
 act(s,'noBlock');
 drain(s);
}

test('Kumaus checks the shield-group count before breaking and can tap the blocker',()=>{
 const s=field(),first=put(s,0,KUMA),second=put(s,0,KUMA),blocker=put(s,1,BLOCK);
 give(s,1,'shields',[LOW,LOW,LOW]);
 attack(s,first.uid);
 assert.equal(s.decision.type,'block');
 finishAttack(s);
 assert.equal(s.players[1].shields.length,2);
 assert.equal(blocker.tapped,false);
 s.players[1].shields[0].shieldStack=[inst(LOW)];
 attack(s,second.uid);
 assert.deepEqual(values(s),[blocker.uid]);
 pick(s,blocker);
 assert.ok(blocker.tapped);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 finishAttack(s);
 end(s);
 assert.equal(blocker.tapped,true);
});

test('Kumaus can freeze an already tapped target without preventing a later effect untap',()=>{
 let s=field(),kuma=put(s,0,KUMA),target=put(s,1,MED,{tapped:true});
 give(s,1,'shields',[LOW,LOW]);
 attack(s,kuma.uid);
 s=restore(s);pick(s,target);
 finishAttack(s);end(s);
 const current=s.players[1].battle.find(x=>x.uid===target.uid);
 assert.ok(current.tapped);
 play(s,'dm26rp2-057');pick(s,target);
 assert.equal(current.tapped,false);
});

test('Graphi counts itself and other creatures, ignores a non-creature tamaseed, and does not trigger on the third',()=>{
 const s=field(),enemy=put(s,1,MED);
 play(s,GRAPH);
 assert.equal(s.decision,null);
 play(s,SEED);
 assert.equal(s.players[0].enteredThisTurn,1);
 assert.equal(s.decision,null);
 play(s,MED);
 assert.deepEqual(values(s),[enemy.uid]);
 pick(s,enemy);
 assert.ok(enemy.tapped);
 play(s,MED);
 assert.equal(s.players[0].enteredThisTurn,3);
 assert.equal(s.decision,null);
});

test('A Graphi that is itself the second creature triggers along with a Graphi already in play',()=>{
 const s=field(),a=put(s,1,MED),b=put(s,1,MED);
 const first=play(s,GRAPH),second=play(s,GRAPH);
 assert.ok(['entryOrder','effectOrder'].includes(s.decision.type));
 const queue=s.decision.type==='entryOrder'?s.triggers.entries:s.pendingEffects;
 assert.deepEqual(queue.filter(x=>x.source===GRAPH).map(x=>x.uid),[first.uid,second.uid]);
 act(s,s.decision.type==='entryOrder'?'orderEntry':'orderEffect',a=>a.effectId===queue.find(x=>x.uid===second.uid).effectId);
 pick(s,b);pick(s,a);
 assert.ok(a.tapped&&b.tapped);
});

test('A Graphi that enters after the second creature does not retroactively trigger',()=>{
 const s=field();
 put(s,1,MED);
 play(s,MED);play(s,LOW);play(s,GRAPH);
 assert.equal(s.players[0].enteredThisTurn,3);
 assert.equal(s.decision,null);
});

test('Graphi counts its own shield-trigger creatures on the other player’s turn and resets on a new turn',()=>{
 const s=field(1),target=put(s,1,MED),source=put(s,1,'dm01-s06');
 put(s,0,GRAPH);
 give(s,0,'shields',['dm04-042','dm04-042']);
 attack(s,source.uid);
 act(s,'noBlock');
 act(s,'useTrigger');act(s,'useTrigger');
 assert.equal(s.decision.type,'triggerOrder');
 assert.ok(!target.tapped);
 act(s,'orderTrigger');
 assert.equal(s.players[0].enteredThisTurn,2);
 assert.equal(s.decision.player,0);
 pick(s,target);
 assert.ok(target.tapped);
 end(s);
 assert.equal(s.players[0].enteredThisTurn,0);
 play(s,MED);
 assert.equal(s.decision,null);
});

for(const count of [2,3])test('Zevocart counts itself and light tamaseeds, with a threshold of three ('+count+' qualifying cards)',()=>{
 const s=field(),zevo=put(s,0,ZEVO),enemy=put(s,1,BLOCK),protectedEnemy=put(s,1,'dmrp01-041');
 put(s,0,SEED);put(s,0,MED);
 if(count===3)put(s,0,LIGHT);
 attack(s,zevo.uid);
 assert.equal(s.attack.target,'player');
 if(count===3){
  assert.deepEqual(values(s),[enemy.uid]);
  pick(s,enemy);
  assert.ok(enemy.tapped);
 }else assert.equal(s.decision.type,'block');
 finishAttack(s);
 end(s);
 assert.equal(enemy.tapped,count===3);
 assert.equal(protectedEnemy.tapped,false);
});
