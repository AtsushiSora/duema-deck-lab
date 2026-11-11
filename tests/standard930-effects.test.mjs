import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SUBMARINE='dm15-011',TREASURE='dm15-017',NYAN='dm22-031';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const GEAR='dm14-110',SPELL='dm01-078',BLOCKER='dm01-076',QX='dmrp07-m01',TSUKAZE='dmrp22-030';
const TWIN='dmsd05-002',BIG='dm01-001',APUL='dmrp22-042',DRAGON='dm01-s08',EVOLUTION='dm27-007',NEO='dm25rp4-DM1';
const put=(s,p,z,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const picks=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===(v?.uid??v));
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const legal=(s,kind,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&pred(a));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}

test('Phase 930 supports three complete card definitions with their original IDs and no additional prints',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-930.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[SUBMARINE,TREASURE,NYAN]);
 assert.deepEqual(m.printAliases,[]);
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of m.cards){
  const id=row.id,c=e.card(id),[f]=row.faces;
  const original=details.cards.find(x=>x.id===id),detail={...original,id:row.id,faces:row.faces};
  const spec=m.cards.find(x=>x.id===id).spec;
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec(detail,{phase:930}),spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:930}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   [{[SUBMARINE]:'gear',[TREASURE]:'spell',[NYAN]:'creature'}[id],f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(row.id).id,id);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.deepEqual(row.faces,original.faces);assert.equal(CARD_IMAGES[id],row.image);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const deck={id:'phase930',name:'山札とドラゴンの検証',cards:[SUBMARINE,TREASURE,NYAN,LIGHT,WATER,DARK,FIRE,NATURE,GEAR,DRAGON].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

const attack=(s,x,target='player')=>{s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===(target.uid??target));};
const cross=(s,g,x)=>act(s,'crossGear',a=>a.uid===g.uid&&a.target===x.uid);

const deckOrder=(s,p)=>s.players[p].deck.map(x=>x.uid);
const nextOwnTurn=s=>{s.active=1;s.phase='attack';act(s,'endTurn');};

test('Submarine Laber privately looks at four, takes one, and orders the remainder before blocking',()=>{
 let s=field();
 const attacker=put(s,0,'battle',FIRE),blocker=put(s,1,'battle',BLOCKER);
 const gear=play(s,SUBMARINE);cross(s,gear,attacker);
 give(s,0,'deck',[LIGHT,WATER,DARK,FIRE,NATURE,SUBMARINE]);
 const [a,b,c,d,e1,f]=s.players[0].deck,all=physical(s);
 attack(s,attacker);assert.equal(s.decision.source,SUBMARINE);
 assert.deepEqual(picks(s),[true,null]);
 assert.deepEqual(deckOrder(s,0),[a,b,c,d,e1,f].map(x=>x.uid));
 pick(s,true);
 assert.deepEqual(picks(s),[a,b,c,d].map(x=>x.uid));
 assert.ok(!s.log.some(row=>row.type==='reveal'));
 pick(s,b);assert.ok(find(s,0,'hand',b));
 s=restore(s);pick(s,d);pick(s,a);
 assert.deepEqual(deckOrder(s,0),[e1,f,d,a,c].map(x=>x.uid));
 assert.deepEqual(s.players[0].g34Protected,[]);
 act(s,'block',action=>action.uid===blocker.uid);
 drain(s);assert.equal(s.players[1].shields.length,5);
 assert.deepEqual(physical(s),all);
});

test('Submarine Laber is optional and only triggers for the crossed attacker',()=>{
 for(const mode of ['decline','other attacker','uncrossed']){
  const s=field(),host=put(s,0,'battle',FIRE),other=put(s,0,'battle',WATER),gear=play(s,SUBMARINE);
  if(mode!=='uncrossed')cross(s,gear,host);
  const before=deckOrder(s,0);
  attack(s,mode==='other attacker'?other:host);
  if(mode==='decline')pick(s,null);
  assert.ok(!s.decision||s.decision.type==='block');
  drain(s);
  assert.deepEqual(deckOrder(s,0),before,mode);
  assert.equal(s.players[0].hand.length,0);
 }
});

test('Submarine Laber follows QX and Tsukaze library limits and handles a short library',()=>{
 for(const lock of [QX,TSUKAZE,null]){
  const s=field(),host=put(s,0,'battle',FIRE),gear=play(s,SUBMARINE);
  cross(s,gear,host);
  if(lock)put(s,1,'battle',lock);
  give(s,0,'deck',[LIGHT,WATER,DARK]);
  const [a,b,c]=s.players[0].deck;
  attack(s,host);pick(s,true);
  if(lock===QX){
   assert.deepEqual(deckOrder(s,0),[a,b,c].map(x=>x.uid));
  }else{
   assert.deepEqual(picks(s),(lock===TSUKAZE?[a]:[a,b,c]).map(x=>x.uid));
   pick(s,a);
   if(!lock)pick(s,c);
   assert.ok(find(s,0,'hand',a));
   assert.deepEqual(deckOrder(s,0),(lock?[b,c]:[c,b]).map(x=>x.uid));
  }
  drain(s);
  assert.equal(s.log.some(row=>row.type==='reveal'),lock===TSUKAZE);
 }
});

test('Treasure Chance mills first and uses strict current power comparison with an enemy target',()=>{
 let s=field();
 const top=inst(FIRE);s.players[0].deck.unshift(top);
 const ally=put(s,0,'battle',WATER),small=put(s,1,'battle',WATER),equal=put(s,1,'battle',LIGHT);
 const boosted=put(s,1,'battle',WATER),protectedTarget=put(s,1,'battle','dm01-081');
 boosted.powerModifiers=[{amount:1000}];
 put(s,1,'battle','dm15-008',{crossedTo:{uid:protectedTarget.uid,incarnation:0}});
 play(s,TREASURE);
 assert.ok(find(s,0,'grave',top));
 assert.deepEqual(picks(s),[small.uid]);
 s=restore(s);pick(s,small);drain(s);
 assert.ok(find(s,1,'grave',small));
 assert.ok(find(s,0,'battle',ally));
 for(const x of [equal,boosted,protectedTarget])assert.ok(find(s,1,'battle',x));
});

test('Treasure Chance reads a twinpact creature face and leaves a plain spell in the graveyard',()=>{
 for(const id of [TWIN,SPELL]){
  const s=field(),enemy=put(s,1,'battle',BIG);
  const top=inst(id);s.players[0].deck.unshift(top);
  play(s,TREASURE);
  if(id===TWIN){assert.deepEqual(picks(s),[enemy.uid]);pick(s,enemy);}
  assert.equal(s.decision,null);
  assert.ok(find(s,0,'grave',top));
  assert.ok(find(s,1,id===TWIN?'grave':'battle',enemy));
 }
});

test('Treasure Chance optionally deploys only the newly milled gear, with grave locks and deck loss',()=>{
 for(const mode of ['deploy','decline','locked','last']){
  const s=field(),earlier=put(s,0,'grave',SUBMARINE),top=inst(GEAR);
  const host=put(s,0,'battle',FIRE);
  if(mode==='locked')put(s,1,'battle',APUL);
  if(mode==='last')s.players[0].deck=[];
  s.players[0].deck.unshift(top);
  play(s,TREASURE);
  if(mode==='deploy'||mode==='decline'){
   assert.ok(find(s,0,'grave',top));
   assert.deepEqual(picks(s),[top.uid,null]);
   pick(s,mode==='deploy'?top:null);drain(s);
  }
  assert.ok(find(s,0,'grave',earlier));
  const result=find(s,0,mode==='deploy'?'battle':'grave',top);
  assert.ok(result,mode);
  assert.equal(result.crossedTo,undefined);
  assert.ok(find(s,0,'battle',host));
  assert.equal(s.decision,null);
  assert.equal(s.winner,mode==='last'?1:null);
 }
});

test('Nyampatta can and must attack on the turn it enters',()=>{
 const s=field(),nyan=play(s,NYAN);
 assert.equal(nyan.entered,s.turn);
 s.phase='attack';
 assert.ok(legal(s,'attack',a=>a.uid===nyan.uid&&a.target==='player'));
 assert.ok(!legal(s,'endTurn'));
 attack(s,nyan);drain(s);
 assert.equal(s.players[1].shields.length,4);
 assert.ok(legal(s,'endTurn'));
 act(s,'endTurn');assert.equal(s.decision,null);
});

test('Nyampatta may decline either part of the own turn start effect or deploy only a Dragon from hand',()=>{
 for(const mode of ['decline destruction','decline deployment','deploy']){
  let s=field();
  const nyan=put(s,0,'battle',NYAN,{tapped:true}),dragon=put(s,0,'hand',DRAGON);
  const evo=put(s,0,'hand',EVOLUTION),nonDragon=put(s,0,'hand',NYAN),graveDragon=put(s,0,'grave',DRAGON);
  const all=physical(s);
  nextOwnTurn(s);
  assert.equal(s.decision.source,NYAN);
  assert.deepEqual(picks(s),[true,null]);
  pick(s,mode==='decline destruction'?null:true);
  if(mode!=='decline destruction'){
   assert.ok(find(s,0,'grave',nyan));
   assert.deepEqual(picks(s),[dragon.uid,null]);
   s=restore(s);pick(s,mode==='deploy'?dragon:null);
  }
  drain(s);
  assert.ok(find(s,0,mode==='decline destruction'?'battle':'grave',nyan));
  assert.ok(find(s,0,mode==='deploy'?'battle':'hand',dragon));
  assert.ok(find(s,0,'hand',evo)&&find(s,0,'hand',nonDragon)&&find(s,0,'grave',graveDragon));
  assert.ok(s.players[0].mana.every(x=>!x.tapped));
  assert.deepEqual(physical(s),all);
 }
});

test('Nyampatta can select a NEO Dragon from hand and resolve its existing entry procedure',()=>{
 const s=field(),nyan=put(s,0,'battle',NYAN),neo=put(s,0,'hand',NEO);
 const base=put(s,0,'battle',FIRE);
 nextOwnTurn(s);pick(s,true);
 assert.ok(find(s,0,'grave',nyan));
 assert.deepEqual(picks(s),[neo.uid,null]);
 pick(s,neo);
 assert.deepEqual(picks(s),[null,base.uid]);
 pick(s,base);drain(s);
 const entered=find(s,0,'battle',neo);
 assert.ok(entered);
 assert.equal(entered.under[0].uid,base.uid);
});
