import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PEPPER='dmx12a-011',OMEGA='dm19-s08',TANK='dmrp04s-054';
const NATURE='dm01-108',LIGHT='dm01-015',WATER='dm01-083',FIRE='dm01-097';
const SPELL='dm01-027',DRAKE='dm32-090',CADDY='dm22rp1-049',NEO='dmrp02-051';
const APUL='dmrp22-042',GNEO='dm25ex1-011',EVOLUTION='dm02-024';
const KALEIKO='dm22ex1-086';
const field=(active=0)=>Object.assign(setup(),{active});
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,uid)=>act(s,'extended',a=>values(s)[a.choice]===uid);
const uids=cards=>cards.map(x=>x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const has=(s,p,zone,x)=>uids(s.players[p][zone]).includes(x.uid);
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,base=null){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 if(s.decision?.type==='evolution')act(s,'evolve',a=>(a.baseUid||null)===(base?.uid??null));
 return x;
}

test('all three complete official prints resolve to unique supported names and stable IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1194.json',import.meta.url)));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[PEPPER,OMEGA,TANK]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const live=e.card(row.id),[printed]=row.faces;
  const verified=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(verified.faces,row.faces);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id:row.id,count:1}]);
  assert.equal(catalogue.get(row.id).supported,true);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
  assert.deepEqual([live.type,live.cost,live.power,live.civilizations,live.race,live.manaValue,live.limit],
   ['creature',printed.cost,+printed.powerText,printed.civilizations,printed.race,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===row.id)?.image,row.image);
  assert.deepEqual(standardCardSpec(verified,{phase:1194}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
  const changed={...verified,faces:[{...printed,abilityText:printed.abilityText+'\n未知の能力。'}]};
  assert.throws(()=>standardCardSpec(changed,{phase:1194}));
 }
});

test('Pepper offers the whole exchange and declining leaves its deck and mana intact',()=>{
 const s=field(),before=uids(s.players[0].deck),mana=uids(s.players[0].mana);
 play(s,PEPPER);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,null);
 assert.deepEqual(uids(s.players[0].deck),before);
 assert.deepEqual(uids(s.players[0].mana),mana);
 assert.equal(s.decision,null);
});

test('Pepper ramps four tapped and returns four mana in chosen bottom order after restoring',()=>{
 let s=field();
 give(s,0,'deck',[LIGHT,WATER,FIRE,SPELL,NATURE,NATURE]);
 const [a,b,c,d,...rest]=s.players[0].deck;
 const first=s.players[0].mana[0],second=put(s,0,'mana',NATURE,{faceDown:true}),size=s.players[0].mana.length;
 play(s,PEPPER);
 pick(s,true);
 assert.equal(s.players[0].mana.length,size+4);
 for(const x of [a,b,c,d])assert.ok(has(s,0,'mana',x)&&x.tapped);
 assert.ok(!values(s).includes(null));
 pick(s,first.uid);
 assert.ok(has(s,0,'mana',first));
 s=restore(s);
 for(const x of [d,second,b])pick(s,x.uid);
 assert.deepEqual(uids(s.players[0].deck),uids([...rest,first,d,second,b]));
 assert.equal(s.players[0].mana.length,size);
 assert.ok([a,c].every(x=>s.players[0].mana.find(y=>y.uid===x.uid)?.tapped));
});

test('Pepper still returns available mana when Kaleiko replaces the four ramp moves',()=>{
 const s=field();
 give(s,0,'mana',[NATURE,NATURE,NATURE]);
 give(s,0,'deck',[LIGHT,WATER,FIRE,SPELL,NATURE,NATURE]);
 const [first,second,third]=s.players[0].mana,[a,b,c,d,...rest]=s.players[0].deck;
 put(s,1,'battle',KALEIKO);
 play(s,PEPPER);
 pick(s,true);
 assert.deepEqual(uids(s.players[0].grave),uids([a,b,c,d]));
 assert.ok(!values(s).includes(null));
 for(const x of [third,first,second])pick(s,x.uid);
 assert.deepEqual(uids(s.players[0].deck),uids([...rest,third,first,second]));
 assert.equal(s.players[0].mana.length,0);
 assert.equal(s.decision,null);
});

for(const p of [0,1])test('Omega triggers on its own entry and both choices precede destruction for player '+p,()=>{
 let s=field(p);
 const own=put(s,p,'battle',NATURE),rival=put(s,1-p,'battle',CADDY);
 const drake=put(s,p,'battle',DRAKE),enemyDrake=put(s,1-p,'battle',DRAKE);
 const omega=play(s,OMEGA);
 assert.equal(s.decision.task.op,'g34_EachPlayer459');
 assert.equal(s.decision.player,p);
 assert.deepEqual(values(s),[own.uid]);
 pick(s,own.uid);
 assert.equal(s.decision.player,1-p);
 assert.deepEqual(values(s),[rival.uid]);
 assert.ok(has(s,p,'battle',own)&&has(s,1-p,'battle',rival));
 s=restore(s);
 pick(s,rival.uid);
 drain(s);
 assert.ok(has(s,p,'grave',own)&&has(s,1-p,'mana',rival));
 assert.ok(has(s,p,'battle',omega)&&has(s,p,'battle',drake)&&has(s,1-p,'battle',enemyDrake));
});

test('Omega ignores unrelated or opposing entrants and watches a later allied multitribe Drake',()=>{
 const s=field();
 put(s,0,'battle',OMEGA);
 const rival=put(s,1,'battle',NATURE);
 s.active=1;
 play(s,DRAKE);
 assert.equal(s.decision,null);
 s.active=0;
 const ordinary=play(s,NATURE);
 assert.equal(s.decision,null);
 const drake=play(s,DRAKE);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[ordinary.uid]);
 pick(s,ordinary.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[rival.uid]);
 pick(s,rival.uid);
 assert.ok(has(s,0,'battle',drake));
 assert.ok(has(s,0,'grave',ordinary)&&has(s,1,'grave',rival));
});

test('Omega skips the player with no eligible creature',()=>{
 const s=field(),rival=put(s,1,'battle',NATURE);
 play(s,OMEGA);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[rival.uid]);
 pick(s,rival.uid);
 assert.ok(has(s,1,'grave',rival));
});

for(const mode of ['standalone','evolved','G-NEO','decline','locked','opponent','ordinary','conventional'])test('Tank attaches only to its qualifying entrant: '+mode,()=>{
 let s=field(mode==='opponent'?1:0);
 const watcher=put(s,0,'battle',TANK);
 const oldBase=mode==='evolved'?put(s,0,'battle',NATURE):mode==='conventional'?put(s,0,'battle',WATER):null;
 const chosen=put(s,0,'mana',FIRE,{tapped:true});
 const spell=put(s,0,'mana',SPELL);
 const hidden=put(s,0,'mana',NATURE,{faceDown:true});
 if(mode==='locked')put(s,1,'battle',APUL);
 const id=mode==='ordinary'?NATURE:mode==='conventional'?EVOLUTION:mode==='G-NEO'?GNEO:NEO;
 const entrant=play(s,id,oldBase);
 if(['locked','opponent','ordinary','conventional'].includes(mode)){
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'mana',chosen));
  return;
 }
 assert.equal(s.decision.source,TANK);
 assert.equal(s.decision.task.origin,'mana');
 assert.ok(values(s).includes(chosen.uid)&&!values(s).includes(spell.uid)&&!values(s).includes(hidden.uid)&&values(s).includes(null));
 s=restore(s);
 pick(s,mode==='decline'?null:chosen.uid);
 const host=s.players[0].battle.find(x=>x.uid===entrant.uid);
 assert.ok(has(s,0,'mana',spell));
 assert.equal(has(s,0,'mana',chosen),mode==='decline');
 assert.deepEqual(uids(host.under??[]),mode==='decline'?[]:oldBase?[oldBase.uid,chosen.uid]:[chosen.uid]);
 assert.equal(e.isEvolution(host),mode!=='decline');
 assert.equal(s.players[0].battle.find(x=>x.uid===watcher.uid).under,undefined);
 assert.equal(s.decision,null);
});
