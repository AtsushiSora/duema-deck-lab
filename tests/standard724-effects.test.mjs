import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-724.json',import.meta.url)));

test('Phase 724 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:724}));
  assert.throws(()=>standardCardSpec(detail,{phase:723}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:724}));
 }
});

const LENG='dm19-044', CRIMSON='dm19-064', SOLAR='dm19-016', NATURE='dm01-108';
const MULTI_RACE='dm35-054', RELATED_RACE='dmr16s-052', SPECIES='ビーストフォーク';
const BLOCKER='dm01-011', GEAR='dm14-086', TWIN='dm22ex1-030', SPELL='dm01-040';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
const uids=xs=>xs.map(x=>x.uid);
const physical=s=>uids(e.physicalCards(s)).sort();
const offered=(s,v)=>s.decision?.choices?.some(c=>(c.value?.uid??c.value)===v);
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}

test('the official Lengston promo uses its canonical battle ID and preserves saved deck quantities',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const [print]=printAliases, original=cards.find(x=>x.id===LENG);
 assert.equal(print.canonicalId,LENG);
 assert.deepEqual(print.faces,original.faces);
 assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:724}),original.spec);
 assert.ok(print.verification.facesMatched);
 assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[LENG]);
 assert.deepEqual(catalogue.resolveRows([{id:print.id,count:3},{id:LENG,count:1}]),[{id:LENG,count:4}]);
 assert.ok(!data.cards.some(x=>x.id===print.id));
});

test('Lengston counts itself and reveals the right number, taking the spells together and ordering the rest after restore',()=>{
 let s=field();
 for(let i=0;i<3;i++)put(s,0,'battle',NATURE);
 put(s,0,'battle',GEAR);
 const sealed=put(s,0,'battle',NATURE);
 put(s,0,'seals',NATURE,{faceDown:true,sealOf:sealed.uid});
 put(s,1,'battle',NATURE);
 give(s,0,'deck',[NATURE,SPELL,TWIN,BLOCKER,GEAR]);
 const [first,spell,twin,last,unrevealed]=s.players[0].deck;
 play(s,LENG);
 const all=physical(s);
 assert.deepEqual(uids(s.players[0].hand),[spell.uid,twin.uid]);
 assert.ok(!s.log.some(row=>row.type==='draw'));
 assert.equal(s.decision.task.op,'g34_Order');
 assert.deepEqual(s.decision.choices.map(c=>c.value),[first.uid,last.uid]);
 assert.ok(s.log.some(row=>row.type==='reveal'&&JSON.stringify(row).includes(e.card(TWIN).name)));
 s=restore(s);
 pick(s,last.uid);
 assert.deepEqual(uids(s.players[0].deck),[last.uid,first.uid,unrevealed.uid]);
 assert.deepEqual(s.players[0].g34Protected,[]);
 assert.deepEqual(physical(s),all);
 assert.equal(s.decision,null);
});

test('Lengston uses a short library and checks for defeat only once all mandatory spells move',()=>{
 const s=field();
 put(s,0,'battle',NATURE);
 put(s,0,'battle',NATURE);
 give(s,0,'deck',[TWIN,SPELL]);
 const revealed=uids(s.players[0].deck);
 play(s,LENG);
 assert.deepEqual(uids(s.players[0].hand),revealed);
 assert.deepEqual(s.players[0].deck,[]);
 assert.deepEqual(s.players[0].g34Protected,[]);
 assert.equal(s.winner,1);
});

test('Lengston observes an opposing library lock',()=>{
 const s=field();
 put(s,1,'battle','dmrp07-m01');
 give(s,0,'deck',[SPELL,NATURE]);
 const before=uids(s.players[0].deck);
 play(s,LENG);
 assert.deepEqual(uids(s.players[0].deck),before);
 assert.deepEqual(s.players[0].hand,[]);
 assert.equal(s.decision,null);
});

test('Crimson counts only exact allied races and destroys selected opposing blockers together',()=>{
 let s=field();
 for(const id of [NATURE,MULTI_RACE,RELATED_RACE])put(s,0,'battle',id);
 const sealed=put(s,0,'battle',NATURE);
 put(s,0,'seals',NATURE,{faceDown:true,sealOf:sealed.uid});
 const a=put(s,1,'battle',BLOCKER), b=put(s,1,'battle',BLOCKER), spare=put(s,1,'battle',BLOCKER);
 const nonblocker=put(s,1,'battle',NATURE);
 const diver=put(s,1,'battle','dm23rp1-058',{justDiverActive:true,g34Grants:[{turn:s.turn,blocker:true}]});
 const source=play(s,CRIMSON), all=physical(s);
 pick(s,SPECIES);
 assert.equal(s.decision.task.n,2);
 assert.equal(offered(s,nonblocker.uid),false);
 assert.equal(offered(s,diver.uid),false);
 pick(s,b.uid);
 assert.equal(offered(s,b.uid),false);
 assert.ok(s.players[1].battle.includes(b));
 s=restore(s);
 pick(s,a.uid);
 assert.deepEqual(uids(s.players[1].grave).sort(),[a.uid,b.uid].sort());
 assert.ok(s.players[1].battle.some(y=>y.uid===spare.uid));
 assert.ok(s.players[0].grave.some(y=>y.uid===source.uid));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,3);
 assert.deepEqual(physical(s),all);
});

test('Solar triggers for free during an enemy attack and can tap fewer targets than its count',()=>{
 const s=field();
 for(const id of [NATURE,MULTI_RACE])put(s,1,'battle',id);
 give(s,1,'mana',[]);
 give(s,1,'shields',[SOLAR,NATURE]);
 const [shield]=s.players[1].shields;
 const attacker=put(s,0,'battle',NATURE), a=put(s,0,'battle',BLOCKER), b=put(s,0,'battle',BLOCKER);
 const all=physical(s);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.player,1);
 pick(s,SPECIES);
 assert.equal(s.decision.task.n,2);
 pick(s,a.uid);
 assert.equal(a.tapped,false);
 pick(s,null);
 assert.equal(a.tapped,true);
 assert.equal(b.tapped,false);
 assert.equal(s.metrics[1].triggers,1);
 assert.equal(s.players[1].mana.length,0);
 assert.ok(s.players[1].grave.includes(shield));
 assert.deepEqual(physical(s),all);
});

for(const id of [CRIMSON,SOLAR])test(e.card(id).name+' may name an existing race with no matching allies',()=>{
 const s=field(), target=put(s,1,'battle',BLOCKER);
 play(s,id);
 pick(s,'ガーディアン');
 assert.ok(s.players[1].battle.includes(target));
 assert.equal(target.tapped,false);
 assert.equal(s.decision,null);
});
