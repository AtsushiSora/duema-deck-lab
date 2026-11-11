import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BANANA='dm19-035',AUTHOR='dm20-018',BATTAN='dm20-034';
const PRINTS=['dmc41-009','dmc55-061','promoy5-043'];
const VEG='dm10-106',DREAM='dm34-052',BEE='dm21-053',PLAIN='dm01-108',TWIN='dmex12-045';
const DESTROY='dm01-027',BOUNCE='dm01-086',TAP='dm01-078';
const put=(s,p,zone,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===(v?.uid??v));
const restore=s=>JSON.parse(JSON.stringify(s));
const ids=xs=>xs.map(x=>x.uid);
const physical=s=>ids(e.physicalCards(s)).sort();
const play=(s,id)=>{
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
};
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(14).fill(PLAIN));
 return s;
}

test('Phase 936 registers three complete definitions and resolves all Battan reprints to the original ID',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-936.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BANANA,AUTHOR,BATTAN]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS.map(id=>[id,BATTAN]));
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,d=details.cards.find(x=>x.id===id),f=row.faces[0],c=e.card(id);
  const spec=m.cards.find(x=>x.id===id).spec;
  const printing={...d,id:row.id,faces:row.faces};
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(printing,{phase:936}),spec);
  assert.throws(()=>standardCardSpec(printing,{phase:935}));
  const extra=structuredClone(printing);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:936}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.equal(c.supportBatch,'phase-936');
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.manaValue,c.limit,c.breaker],['creature',f.cost,Number(f.powerText),f.race,1,4,2]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.ok(row.verification.facesMatched);
  assert.equal(cat.get(row.id).id,id);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const deck={id:'phase936',name:'進化と登場履歴',cards:[BANANA,AUTHOR,PRINTS[2],VEG,DREAM,BEE,PLAIN,DESTROY,BOUNCE,TAP].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

for(const take of [true,false])test('Banana chooses one card from its nested evolution stack or declines: '+take,()=>{
 let s=field();
 const bottom=inst(DESTROY),base=put(s,0,'battle',VEG,{under:[bottom]});
 put(s,0,'battle',DREAM);
 const allBefore=physical(s),held=play(s,BANANA),all=[...allBefore,held.uid].sort();
 const legal=e.getLegalActions(s).filter(a=>a.kind==='evolve');
 assert.deepEqual(legal.map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.uid===held.uid&&a.baseUid===base.uid);
 attack(s,held.uid);
 assert.deepEqual(choices(s),[base.uid,bottom.uid,null]);
 s=restore(s);pick(s,take?base:null);
 assert.equal(has(s,0,'hand',base),take);
 const evolved=s.players[0].battle.find(x=>x.uid===held.uid);
 assert.deepEqual(ids(evolved.under),[take?bottom.uid:base.uid]);
 assert.deepEqual(physical(s),all);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const suppressed of [false,true])test('Banana has no choice with no undercard or with its ability ignored: '+suppressed,()=>{
 const s=field();
 const x=put(s,0,'battle',BANANA,suppressed?{under:[inst(VEG)],g35Ignored:s.turn}:{});
 attack(s,x.uid);
 assert.notEqual(s.decision?.task?.op,'g34_StackHand936');
 drain(s);
 assert.equal(s.players[0].hand.length,0);
});

test('Chudelsen resolves after the opposing spell has destroyed it, reveals the chosen creature, and shuffles',()=>{
 let s=field();
 const base=put(s,0,'battle',DREAM),wrong=put(s,0,'battle',BEE),held=play(s,AUTHOR);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.uid===held.uid&&a.baseUid===base.uid);
 assert.ok(has(s,0,'battle',wrong));
 const target=put(s,0,'deck',TWIN),other=put(s,0,'deck',DREAM);
 s.active=1;s.phase='main';
 const spell=play(s,DESTROY);
 assert.equal(s.decision.type,'effect');
 act(s,'effect',a=>a.targets?.[0]?.uid===held.uid);
 assert.ok(has(s,0,'grave',held)&&has(s,1,'grave',spell));
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[target.uid,other.uid,null]);
 const all=physical(s),remaining=ids(s.players[0].deck).filter(uid=>uid!==target.uid);
 s=restore(s);pick(s,target);
 assert.ok(has(s,0,'hand',target));
 assert.ok(!has(s,0,'deck',target));
 assert.notDeepEqual(ids(s.players[0].deck),remaining);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===TWIN));
 assert.deepEqual(physical(s),all);
});

for(const hit of [false,true])test('Chudelsen always shuffles after looking, even when no card is taken: '+hit,()=>{
 const s=field();
 put(s,0,'battle',AUTHOR);
 put(s,0,'battle',VEG);
 if(hit)put(s,0,'deck',DREAM);
 const before=ids(s.players[0].deck);
 s.active=1;
 play(s,TAP);
 act(s,'effect');
 if(hit)pick(s,null);
 assert.equal(s.players[0].hand.length,0);
 assert.notDeepEqual(ids(s.players[0].deck),before);
 assert.deepEqual(ids(s.players[0].deck).sort(),before.sort());
});

test('Chudelsen reacts to the opponent shield-trigger spell during its own turn',()=>{
 const s=field();
 const source=put(s,0,'battle',AUTHOR),target=put(s,0,'deck',DREAM);
 give(s,1,'shields',[BOUNCE,PLAIN,PLAIN]);
 const trigger=s.players[1].shields[0];
 attack(s,source.uid);act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.includes(trigger.uid));act(s,'useTrigger');
 act(s,'effect',a=>a.targets?.[0]?.uid===source.uid);
 assert.ok(has(s,0,'hand',source));
 assert.equal(s.decision.player,0);
 pick(s,target);
 assert.ok(has(s,0,'hand',target));
 drain(s);
});

test('Chudelsen ignores its controller’s spells and stops watching while its own ability is ignored',()=>{
 const s=field();
 const watcher=put(s,0,'battle',AUTHOR);
 put(s,0,'deck',DREAM);
 put(s,1,'battle',PLAIN);
 const before=ids(s.players[0].deck);
 play(s,TAP);act(s,'effect');
 watcher.g35Ignored=s.turn;
 s.active=1;play(s,TAP);act(s,'effect');
 assert.equal(s.decision,null);
 assert.deepEqual(ids(s.players[0].deck),before);
});

test('Battan counts its own entry, skips the opposing end step, and dies on the next empty own turn',()=>{
 let s=field();
 const x=play(s,BATTAN);
 s=restore(s);
 end(s);
 assert.ok(has(s,0,'battle',x));
 assert.equal(s.active,1);
 playAtMain(s,BEE);
 end(s);
 assert.ok(has(s,0,'battle',x));
 assert.equal(s.active,0);
 end(s);
 assert.ok(has(s,0,'grave',x));
});

function playAtMain(s,id){s.phase='main';return play(s,id);}

for(const id of [DREAM,BEE,PLAIN])test('Battan checks the race at entry, including a matching creature that has left: '+id,()=>{
 let s=field();
 const x=put(s,0,'battle',BATTAN),entrant=play(s,id);
 play(s,BOUNCE);
 act(s,'effect',a=>a.targets?.[0]?.uid===entrant.uid);
 assert.ok(has(s,0,'hand',entrant));
 s=restore(s);end(s);
 assert.ok(has(s,0,id===PLAIN?'grave':'battle',x));
});

test('Battan evaluates its end-step condition after another end ability deploys a qualifying creature',()=>{
 const s=field();
 const x=put(s,0,'battle',BATTAN);
 const helper=put(s,0,'battle',VEG);
 const entrant=put(s,0,'hand',DREAM);
 const original=e.card(VEG);
 e.setCards(data.cards.map(c=>c.id===VEG?{...original,g174End:[{op:'Select',origin:'hand',n:1,deploy:true,optional:true,filter:{race:'ドリームメイト'}}]}:c));
 try{
  s.phase='attack';act(s,'endTurn');
  act(s,'orderEffect',a=>s.pendingEffects.find(q=>q.effectId===a.effectId)?.uid===helper.uid);
  pick(s,entrant);
  drain(s);
  assert.ok(has(s,0,'battle',entrant)&&has(s,0,'battle',x));
 }finally{e.setCards(data.cards);}
});
