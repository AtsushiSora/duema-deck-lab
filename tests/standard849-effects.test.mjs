import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const LAR='dm08-024',STATION='dmr19-030',KAN='dmr19-036',ADAM='dmr19-s03',DAMD='dmbd10-002';
const WATER='dm01-083',LAND='dm01-108',DARK='dm01-090',FIRE='dm01-097';
const CMD='dmbd10-010',SECRET='dm01-s01',SECRET_HAND='dm02-024',QX='dm25ex1-049';
const pick=(s,wanted)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===wanted;
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
function evolve(s,id,base){
 const x=play(s,id);
 act(s,'evolve',a=>a.baseUid===base.uid);
 return x;
}

test('Phase 849 uses the three verified original printings and their complete abilities',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-849.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[LAR,STATION,KAN]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:849}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:848}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:849}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,c.civilizations,c.limit],
   [f.name,'creature',f.cost,Number(f.powerText),f.race,f.civilizations,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

for(const p of [0,1])test('Laricius can view both zones privately from either seat '+p,async()=>{
 const s=field(p),x=put(s,p,'battle',LAR);
 const enemy=put(s,1-p,'battle',QX,{tapped:true});
 give(s,1-p,'deck',[SECRET,LAND]);
 give(s,1-p,'hand',[SECRET_HAND,WATER]);
 const before=structuredClone(s.players.map(x=>[x.deck,x.hand])),rng=s.rng;
 attack(s,x.uid,enemy.uid);
 assert.equal(s.decision.task.op,'g34_Offer');
 assert.ok(!JSON.stringify(s.decision).includes(SECRET));
 pick(s,true);
 assert.equal(s.decision.player,p);
 const expected=[{id:SECRET,label:'相手の山札の上'},{id:SECRET_HAND,label:'相手の手札'},{id:WATER,label:'相手の手札'}];
 assert.deepEqual(s.decision.task.g585Peek,expected);
 assert.ok(!JSON.stringify(s.log).includes(SECRET));
 assert.ok(!JSON.stringify(e.observation(s,1-p)).includes(SECRET));
 const {projectRoom}=await import('../server/duel-core.mjs');
 const room={game:structuredClone(s),phase:'playing',hostUid:'a',guestUid:'b',decks:[{format:'original'},{format:'original'}],profiles:[{name:'A'},{name:'B'}],events:[],expiresAt:10000};
 const viewer={uid:p===0?'a':'b'},other={uid:p===0?'b':'a'};
 assert.deepEqual(projectRoom(room,viewer,1).game.inspectedCards.map(({id,label})=>({id,label})),expected);
 assert.equal(projectRoom(room,other,1).game.inspectedCards,undefined);
 pick(room.game,null);
 assert.equal(projectRoom(room,viewer,1).game.inspectedCards,undefined);
 assert.deepEqual(room.game.players.map(x=>[x.deck,x.hand]),before);
 assert.equal(room.game.rng,rng);
 assert.equal(room.game.decision.type,'block');
});

test('Laricius can decline and an unrelated attacker does not trigger its ability',()=>{
 const s=field(),x=put(s,0,'battle',LAR),other=put(s,0,'battle',LAND);
 attack(s,x.uid);
 pick(s,null);
 assert.equal(s.decision.type,'block');
 act(s,'noBlock');
 attack(s,other.uid);
 assert.equal(s.decision.type,'block');
 assert.ok(!s.log.some(x=>x.type==='look'));
});

for(const zone of ['deck','hand'])test('Laricius views the available zone when the other is empty '+zone,()=>{
 const s=field(),x=put(s,0,'battle',LAR);
 give(s,1,'deck',zone==='deck'?[SECRET]:[]);
 give(s,1,'hand',zone==='hand'?[SECRET]:[]);
 if(zone==='hand')put(s,1,'battle','dmrp20-s10');
 attack(s,x.uid);
 pick(s,true);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[SECRET]);
 pick(s,null);
 assert.equal(s.decision.type,'block');
});

test('Station and Kanokke trigger on normal evolution, with the opponent selecting their discard',()=>{
 const s=field(),station=put(s,0,'battle',STATION),kan=put(s,0,'battle',KAN),base=put(s,0,'battle',WATER);
 put(s,1,'battle',STATION);
 const kept=put(s,1,'hand',LAND),discarded=put(s,1,'hand',FIRE),[drawn]=s.players[0].deck;
 const x=evolve(s,ADAM,base);
 assert.deepEqual(x.under,[base]);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>s.pendingEffects.some(q=>q.effectId===a.effectId&&q.uid===station.uid));
 assert.deepEqual(s.players[0].hand,[drawn]);
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.source,KAN);
 pick(s,discarded.uid);
 assert.deepEqual(s.players[1].hand,[kept]);
 assert.deepEqual(s.players[1].grave,[discarded]);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].battle.includes(kan));
});

test('Station triggers once for an evolution with two battlefield bases',()=>{
 const s=field();
 put(s,0,'battle',STATION);
 const a=put(s,0,'battle',DARK),b=put(s,0,'battle',FIRE),[drawn]=s.players[0].deck;
 const x=play(s,'dm27-s03');
 pick(s,a.uid);
 pick(s,b.uid);
 drain(s);
 assert.deepEqual(x.under,[a,b]);
 assert.deepEqual(s.players[0].hand,[drawn]);
});

for(const mode of ['used as base','ignored','opponent evolution','grave evolution'])test('Station does not trigger when '+mode,()=>{
 const s=field(mode==='opponent evolution'?1:0);
 const watcher=put(s,0,'battle',STATION,mode==='ignored'?{g35Ignored:s.turn}:{});
 if(mode==='grave evolution'){
  give(s,0,'grave',[DARK,FIRE,LAND]);
  const x=play(s,'dm25ex1-044');
  drain(s);
  assert.ok(s.players[0].battle.includes(x));
  assert.equal(x.under.length,3);
 }else{
  const base=mode==='used as base'?watcher:put(s,s.active,'battle',WATER);
  evolve(s,ADAM,base);
  drain(s);
 }
 assert.deepEqual(s.players[0].hand,[]);
});

for(const [id,origin,declare,resolve] of [
 [ADAM,'hand','g23_Declare','g23_Invade'],[ADAM,'battle','g23_Declare','g23_Invade'],
 [DAMD,'battle','g2_Declare','g2_Invade']
])test('Station sees '+id+' invading from '+origin,()=>{
 const s=field(),attacker=put(s,0,'battle',CMD);
 put(s,0,'battle',STATION);
 const [drawn]=s.players[0].deck;
 const originalBase=origin==='battle'?inst(WATER):null;
 const x=put(s,0,origin,id,originalBase?{under:[originalBase]}:{});
 attack(s,attacker.uid);
 assert.equal(s.decision.task.op,declare);
 pick(s,true);
 assert.equal(s.decision.task.op,resolve);
 pick(s,true);
 assert.equal(s.attack.attacker,x.uid);
 assert.deepEqual(x.under,[attacker]);
 if(originalBase)assert.ok(s.players[0].battle.includes(originalBase));
 if(id===DAMD){
  assert.equal(s.decision.type,'effectOrder');
  act(s,'orderEffect',a=>s.pendingEffects.some(q=>q.effectId===a.effectId&&q.source===STATION));
 }
 assert.deepEqual(s.players[0].hand,[drawn]);
});

test('Kanokke skips an empty opponent hand after evolution',()=>{
 const s=field(),base=put(s,0,'battle',WATER);
 put(s,0,'battle',KAN);
 evolve(s,ADAM,base);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[1].grave,[]);
});
