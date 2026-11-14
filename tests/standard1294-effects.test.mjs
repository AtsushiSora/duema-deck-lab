import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const H='dmex14-021',S='dm23rp4-044',B='dmex02-057';
const N='dm01-108',W='dm01-083',KILL='dm01-027',GIANT='dm09-053';
const JOCKEY='dmrp01-084',EVOLUTION='dm10-017';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const shieldHas=(s,p,x)=>s.players[p].shields.flatMap(y=>[y,...(y.shieldStack||[])]).some(y=>y.uid===x.uid);
const add=(s,p,zone,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
function field(active=0){
 const s=setup();
 s.active=active;
 return s;
}
function cast(s,id){
 s.phase='main';
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===0);
 return x;
}
function pick(s,uid){
 if(s.decision?.type==='effect')act(s,'effect',a=>a.targets.some(t=>t.uid===uid));
 else act(s,'extended',a=>{
  const value=s.decision.choices[a.choice].value;
  return (value?.uid??value)===uid;
 });
}
function effectsThrough(s,op){
 while(s.decision?.type==='effectOrder'){
  const row=s.pendingEffects.find(x=>x.player===s.decision.player&&x.task?.op===op);
  if(!row)break;
  act(s,'orderEffect',a=>a.effectId===row.effectId);
 }
}

test('five official prints retain three canonical IDs, card art and the four-copy limit',()=>{
 const manifest=read('tools/support-phase-1294.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[H,S,B]);
 assert.equal(manifest.printAliases.length,2);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),front=row.faces[0];
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,Number(front.powerText),1,front.civilizations,front.race,4]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1294}),row.spec);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).length,1);
  assert.deepEqual(refs.find(x=>x.id===row.id),{id:row.id,canonicalId:id,name:row.name,image:row.image,source:row.source});
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Hacchaki offers only face-up creatures of at most seven including one card of a shield stack',()=>{
 let s=field(),attacker=add(s,0,'battle',H);
 const hidden=s.players[0].shields[0],member=Object.assign(inst(N),{faceUp:true,shieldCardOnly:true});
 hidden.shieldStack=[member];
 const above=add(s,0,'shields',B,{faceUp:true}),spell=add(s,0,'shields',KILL,{faceUp:true});
 const foreign=add(s,1,'shields',N,{faceUp:true});
 attack(s,attacker.uid);
 effectsThrough(s,'g34_FaceUpShieldPut1294');
 assert.equal(s.decision.task.op,'g34_FaceUpShieldPut1294');
 assert.deepEqual(s.decision.choices.map(x=>x.value),[member.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,member.uid);
 assert.ok(has(s,0,'battle',member));
 assert.ok(shieldHas(s,0,hidden)&&shieldHas(s,0,above)&&shieldHas(s,0,spell)&&shieldHas(s,1,foreign));
 assert.ok(!shieldHas(s,0,member));
});

test('Hacchaki can decline or select a legal evolution base for its face-up shield',()=>{
 for(const accept of [false,true]){
  const s=field(),attacker=add(s,0,'battle',H),base=add(s,0,'battle',W);
  const evo=add(s,0,'shields',EVOLUTION,{faceUp:true});
  attack(s,attacker.uid);
  effectsThrough(s,'g34_FaceUpShieldPut1294');
  assert.ok(s.decision.choices.some(x=>x.value===evo.uid));
  pick(s,accept?evo.uid:null);
  if(accept){
   assert.equal(s.decision.task.op,'g34_Put');
   pick(s,base.uid);
   assert.deepEqual(s.players[0].battle.find(x=>x.uid===evo.uid).under.map(x=>x.uid),[base.uid]);
   assert.ok(!shieldHas(s,0,evo));
  }else assert.ok(shieldHas(s,0,evo)&&has(s,0,'battle',base));
 }
});

test('Scorpion changes from a cost-five Giant and adds both cards to mana',()=>{
 const s=field(),old=add(s,0,'battle',GIANT),change=add(s,0,'hand',S);
 const mana=s.players[0].mana.length,tops=s.players[0].deck.slice(0,2).map(x=>x.uid);
 attack(s,old.uid);
 assert.equal(s.decision.task.op,'revDeclare');
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'hand',old)&&has(s,0,'battle',change));
 assert.deepEqual(s.players[0].mana.slice(mana).map(x=>x.uid),tops);
 assert.equal(e.card(S).breaker,2);
});

test('Scorpion optionally sends an allied creature to its owner’s hand instead of destruction',()=>{
 for(const take of [false,true]){
  let s=field(1);
  const scorpion=add(s,0,'battle',S),ally=add(s,0,'battle',N,{cardOwner:1});
  cast(s,KILL);
  pick(s,ally.uid);
  assert.equal(s.decision.type,'leaveReplace');
  assert.equal(s.decision.player,0);
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='replaceOmega'));
  s=structuredClone(s);
  act(s,take?'replaceOmega':'allowLeave',a=>!take||a.allyLeaveHand);
  assert.ok(has(s,take?1:0,take?'hand':'grave',ally));
  assert.ok(has(s,0,'battle',scorpion));
 }
});

test('Scorpion can replace its own destruction and stops offering the ability when ignored',()=>{
 for(const muted of [false,true]){
  const s=field(1),scorpion=add(s,0,'battle',S,muted?{g35Ignored:s.turn}:{});
  cast(s,KILL);
  pick(s,scorpion.uid);
  if(!muted)act(s,'replaceOmega',a=>a.allyLeaveHand);
  assert.ok(has(s,0,muted?'grave':'hand',scorpion));
 }
});

test('Bouncer has speed and protects only its controller’s Beat Jockeys on that controller’s turn',()=>{
 const s=field(),bouncer=cast(s,B),jockey=add(s,0,'battle',JOCKEY),other=add(s,0,'battle',N);
 assert.equal(e.card(B).breaker,2);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===bouncer.uid&&a.target==='player'));
 s.phase='main';
 cast(s,'dmr18-s07');
 drain(s);
 assert.ok(has(s,0,'battle',jockey));
 assert.ok(has(s,0,'grave',other));
 s.active=1;
 cast(s,KILL);
 pick(s,jockey.uid);
 assert.ok(has(s,0,'grave',jockey));
});

test('Bouncer keeps its controller alive through an extra turn with an empty library (QA 33303)',()=>{
 const s=field(),bouncer=add(s,0,'battle',B);
 s.players[0].deck.length=0;
 s.extraTurns=[{player:0,source:B}];
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(s.active,0);
 assert.equal(s.turn,2);
 assert.equal(s.winner,null);
 assert.ok(has(s,0,'battle',bouncer));
 if(s.phase==='charge')act(s,'skipCharge');
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.active,1);
 assert.equal(s.winner,1);
});

test('Shield Go sends Hacchaki’s selected face-up creature to its graveyard',()=>{
 const s=field(),attacker=add(s,0,'battle',H);
 const id='dmr10-013';
 assert.ok(e.card(id).shieldGo);
 const shield=add(s,0,'shields',id,{faceUp:true});
 attack(s,attacker.uid);
 effectsThrough(s,'g34_FaceUpShieldPut1294');
 pick(s,shield.uid);
 assert.ok(has(s,0,'grave',shield));
 assert.ok(!shieldHas(s,0,shield)&&!has(s,0,'battle',shield));
});

test('a shield destination is replaced by the selected hand destination',()=>{
 const s=field(),scorpion=add(s,0,'battle',S),ally=add(s,0,'battle',N);
 cast(s,'dmr03-021');
 pick(s,ally.uid);
 act(s,'replaceOmega',a=>a.allyLeaveHand);
 assert.ok(has(s,0,'hand',ally)&&has(s,0,'battle',scorpion));
 assert.ok(!shieldHas(s,0,ally));
});


test('Scorpion’s replacement remains separate from the moving creature’s own replacement',()=>{
 const s=field(1),scorpion=add(s,0,'battle',S),ally=add(s,0,'battle','dm23rp1-S4',{cardOwner:1});
 cast(s,KILL);
 pick(s,ally.uid);
 const options=e.getLegalActions(s).filter(a=>a.kind==='replaceOmega');
 assert.deepEqual(options.map(a=>!!a.allyLeaveHand).sort(),[false,true]);
 act(s,'replaceOmega',a=>a.allyLeaveHand);
 assert.ok(has(s,1,'hand',ally)&&has(s,0,'battle',scorpion));
});
