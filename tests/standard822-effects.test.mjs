import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,drain,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-822.json',import.meta.url)));
const ATOMIC='dm35-014',VICTOR='dm32-105',ANSWER='dm33-015';
const NATURE='dm01-108',DARK='dm01-090',WATER='dm01-083',DEMON='dm01-027',BOUNCE='dm01-086';
const GEAR='dm14-110',BAIKEN='dm29-s02',MULTI='dmr02-054';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 822 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,3);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:822}));
  assert.throws(()=>standardCardSpec(detail,{phase:821}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:822}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);

test('the verified reprint resolves to the original definition',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(printAliases.length,1);
 for(const print of printAliases){
  const row=cards.find(x=>x.id===print.canonicalId);
  assert.equal(print.verification.facesMatched,true);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:822}),row.spec);
  assert.equal(regulationVerification.limits[print.id],e.card(row.id).limit);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,row.id);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
  assert.ok(!data.cards.some(x=>x.id===print.id));
 }
});

const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);

for(const [mode,amount] of [['single',1],['evolution',3],['linked',2],['short field',2],['star replacement',2]])test('Atomic Destroyer counts only constituent cards, then the opponent selects once per victim: '+mode,()=>{
 let s=setup();
 const target=put(s,0,'battle',mode==='linked'?'dmex17-033':mode==='single'?NATURE:'dm02-033');
 if(mode==='linked')target.godLinks=[inst('dmex17-059')];
 if(mode==='evolution'||mode==='short field')target.under=[inst(DARK),inst(NATURE)];
 if(mode==='star replacement')target.under=[inst(NATURE)];
 const gear=put(s,0,'battle',GEAR);
 gear.crossedTo={uid:target.uid,incarnation:target.incarnation||0};
 const victims=Array.from({length:mode==='short field'?2:4},(_,i)=>put(s,1,'battle',mode==='star replacement'&&!i?'dmrp17-074':NATURE));
 const starBase=inst(DARK);
 if(mode==='star replacement')victims[0].under=[starBase];
 victims[0].justDiverActive=true;
 const excluded=put(s,1,'battle',GEAR);
 const source=put(s,0,'hand',ATOMIC);
 play(s,source);
 assert.deepEqual(values(s),[target.uid]);
 pick(s,target.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),victims.map(x=>x.uid));
 s=JSON.parse(JSON.stringify(s));
 for(let i=0;i<amount;i++){
  pick(s,victims[i].uid);
  if(i+1<amount){
   assert.ok(has(s,1,'battle',victims[i]));
   assert.ok(!values(s).includes(victims[i].uid));
  }
 }
 drain(s);
 assert.ok(victims.slice(0,amount).every(x=>has(s,1,'grave',x)));
 assert.ok(victims.slice(amount).every(x=>has(s,1,'battle',x)));
 if(mode==='star replacement')assert.ok(has(s,1,'battle',starBase));
 assert.ok(has(s,1,'battle',excluded)&&has(s,0,'battle',target));
});

test('Atomic Destroyer leaves the opponent alone without a friendly creature',()=>{
 const s=setup(),enemy=put(s,1,'battle',NATURE);
 put(s,0,'battle',GEAR);
 play(s,put(s,0,'hand',ATOMIC));
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',enemy));
});

for(const mode of ['destroy','bounce','ignored','multicolor'])test('Victor mana evolves and applies its replacement only to destruction with active abilities: '+mode,()=>{
 let s=setup();
 const baseId=mode==='multicolor'?MULTI:NATURE;
 const [base,dark,spellOnly,natureSpell]=give(s,0,'mana',[baseId,DARK,'dm22ex1-062','dm32-070',WATER,'dm01-075','dm01-097']);
 const source=put(s,0,'hand',VICTOR);
 play(s,source);
 assert.equal(s.decision.type,'evolution');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 s=JSON.parse(JSON.stringify(s));
 act(s,'evolve',a=>a.baseUid===base.uid);
 const live=s.players[0].battle.find(x=>x.uid===source.uid);
 assert.deepEqual(live.under.map(x=>x.uid),[base.uid]);
 assert.ok(!has(s,0,'mana',base));
 assert.ok([dark,spellOnly,natureSpell].every(x=>has(s,0,'mana',x)));
 s.active=1;
 if(mode==='ignored')put(s,1,'battle',GEN);
 const spell=put(s,1,'hand',mode==='bounce'?BOUNCE:DEMON);
 play(s,spell);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===source.uid));
 const to=mode==='bounce'?'hand':mode==='ignored'?'grave':'mana';
 assert.ok(has(s,0,to,source)&&has(s,0,to,base));
 assert.ok(!has(s,0,'battle',source));
 if(mode==='multicolor')assert.equal(s.players[0].mana.find(x=>x.uid===base.uid).tapped,true);
});

test('Victor cannot use a creature in battle or under a mana lock',()=>{
 const s=setup(),source=put(s,0,'hand',VICTOR);
 put(s,0,'battle',NATURE);
 give(s,0,'mana',Array(7).fill('dm32-070'));
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===source.uid));
 put(s,0,'mana',NATURE);
 assert.ok(e.getLegalActions(s).some(a=>a.uid===source.uid));
 put(s,1,'battle','dmrp22-042');
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===source.uid));
});

for(const [mode,ids,accept] of [
 ['accept',[WATER,DARK,NATURE],true],['decline',[WATER,DARK,NATURE],false],
 ['one accept',[WATER],true],['one decline',[WATER],false],
 ['protected accept',[WATER,DARK,NATURE],true],['protected decline',[WATER,DARK,NATURE],false],
 ['replacement',[BAIKEN,DARK,NATURE],true],['replacement in rest',[WATER,BAIKEN,NATURE],false]
])test('Final Answer reveals no hand identities publicly and lets the opponent choose: '+mode,()=>{
 let s=setup();
 const cards=give(s,1,'hand',ids),[selected]=cards;
 if(mode.startsWith('protected'))put(s,1,'battle','dmbd04-003');
 play(s,put(s,0,'hand',ANSWER));
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.op,'g34_InspectHand');
 assert.deepEqual(s.decision.task.seen,ids);
 assert.deepEqual(values(s),cards.map(x=>x.uid));
 assert.ok(!('choices' in e.observation(s,1).decision));
 assert.ok(!s.log.some(x=>x.type==='reveal'));
 const log=s.log.find(x=>x.type==='look');
 assert.ok(log);
 assert.ok(ids.every(id=>!log.text.includes(e.card(id).name)));
 s=JSON.parse(JSON.stringify(s));
 pick(s,selected.uid);
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.op,'g34_DesignatedDiscard822');
 assert.deepEqual(values(s),[true,false]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,accept);
 const baiken=cards.find(x=>x.cardId===BAIKEN);
 if(baiken){
  assert.equal(s.decision.task.op,'discardChosen');
  pick(s,true);
  assert.equal(s.decision.task.op,'bounceAny');
  pick(s,null);
  assert.ok(has(s,1,'battle',baiken));
 }
 const discarded=(mode.startsWith('protected')?[]:accept?[selected]:cards.slice(1)).filter(x=>x!==baiken);
 assert.deepEqual(s.players[1].grave.map(x=>x.uid),discarded.map(x=>x.uid));
 const hand=cards.filter(x=>x!==baiken&&!discarded.includes(x));
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),hand.map(x=>x.uid));
});

test('Final Answer resolves with an empty opposing hand and under spell ignore',()=>{
 for(const ignored of [false,true]){
  const s=setup();
  if(ignored){put(s,1,'battle',GEN);put(s,1,'hand',DARK);}
  play(s,put(s,0,'hand',ANSWER));
  assert.equal(s.decision,null);
  assert.equal(s.players[1].hand.length,Number(ignored));
  assert.equal(s.players[1].grave.length,0);
 }
});
