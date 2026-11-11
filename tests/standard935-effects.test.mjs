import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BIRD='dm17-032',BRAM='dm16-s05',NAS='dm17-018',DMC42='dmc42-033',PROMO='promoy4-027';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const CLAW='dm14-110',THREE='dm15-048',KEYBOARD='dm17-046',TWIN='dmrp05-011',MULTI='dm10-064';
const VEGETABLE='dm10-106',EARTH='dmr09-103',ZERO='dmrp07-001',COURTNEY='dm13-015';
const DEATH='dm01-027',BOUNCE='dm01-086',APUL='dmrp22-042',KALEIKO='dm22ex1-086';

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


const attack=(s,x,target='player')=>{s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===(target.uid??target));};

test('Phase 935 supports three complete card definitions and resolves both Nasdeen reprints to the original ID',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-935.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[BIRD,BRAM,NAS]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[[DMC42,NAS],[PROMO,NAS]]);
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  const original=details.cards.find(x=>x.id===id),detail={...original,id:row.id,faces:row.faces};
  const spec=m.cards.find(x=>x.id===id).spec;
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec(detail,{phase:935}),spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:935}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   [id===BIRD?'spell':'creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(row.id).id,id);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.deepEqual(row.faces,original.faces);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const deck={id:'phase935',name:'印刷コストとマナを参照するカードの検証',cards:[PROMO,BIRD,BRAM,LIGHT,WATER,DARK,FIRE,NATURE,VEGETABLE,EARTH].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

for(const [id,killed] of [[CLAW,false],[NATURE,false],[THREE,true]])test('Bird Shot compares strict printed costs after choosing a creature: '+id,()=>{
 let s=field();
 const keyboard=put(s,0,'battle',KEYBOARD),own=put(s,0,'battle',DARK);
 const target=put(s,1,'battle',DARK),gear=put(s,1,'battle',CLAW);
 const top=inst(id);s.players[0].deck.unshift(top);
 assert.ok(find(s,0,'battle',keyboard));
 assert.equal(e.summonCost(s,1,e.card(DARK)),3);
 const spell=play(s,BIRD);
 assert.deepEqual(picks(s),[target.uid]);
 assert.ok(find(s,0,'deck',top));
 s=restore(s);pick(s,target);drain(s);
 assert.ok(find(s,0,'grave',spell)&&find(s,0,'grave',top));
 assert.ok(find(s,1,killed?'grave':'battle',target));
 assert.ok(find(s,1,'battle',gear)&&find(s,0,'battle',own));
});

for(const threshold of [2,5])test('Bird Shot lets the caster choose the milled twinpact face and uses only the target creature face: '+threshold,()=>{
 let s=field();
 const target=put(s,1,'battle',TWIN),milled=inst(TWIN);
 s.players[0].deck.unshift(milled);
 play(s,BIRD);pick(s,target);
 assert.deepEqual(picks(s),[2,5]);
 assert.ok(find(s,0,'grave',milled)&&find(s,1,'battle',target));
 s=restore(s);pick(s,threshold);drain(s);
 assert.ok(find(s,1,threshold===5?'grave':'battle',target));
});

test('Bird Shot mills with no eligible target and stops when milling the last card loses the game',()=>{
 for(const last of [false,true]){
  const s=field(),top=inst(THREE);
  const target=put(s,1,'battle',DARK,last?{}:{sealed:true});
  if(!last)put(s,1,'seals',LIGHT,{sealOf:target.uid,faceDown:true});
  if(last)s.players[0].deck=[top];
  else s.players[0].deck.unshift(top);
  play(s,BIRD);
  if(last)pick(s,target);
  assert.ok(find(s,0,'grave',top)&&find(s,1,'battle',target));
  assert.equal(s.winner,last?1:null);
 }
});

test('Bramglaire evolves on an Earth Dragon, counts every physical mana card and breaks three shields',()=>{
 const s=field();
 give(s,0,'mana',Array(7).fill(NATURE));give(s,1,'mana',[ZERO,MULTI]);
 put(s,0,'mana',LIGHT,{faceDown:true,tapped:true});
 const earth=put(s,0,'battle',EARTH);put(s,0,'battle',VEGETABLE);
 const source=play(s,BRAM);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[earth.uid]);
 act(s,'evolve',a=>a.baseUid===earth.uid);drain(s);
 const top=find(s,0,'battle',source);
 assert.equal(top.under[0].uid,earth.uid);
 assert.equal(e.power(top,false,s),11000);
 s.players[1].mana.pop();
 assert.equal(e.power(top,false,s),10000);
 top.g35Ignored=s.turn;
 assert.equal(e.power(top,false,s),1000);
 delete top.g35Ignored;
 attack(s,top);drain(s);
 assert.equal(s.players[1].shields.length,2);
});

function evolveNas(s){
 const veg=put(s,0,'battle',VEGETABLE);put(s,0,'battle',EARTH);
 const source=play(s,NAS);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[veg.uid]);
 act(s,'evolve',a=>a.baseUid===veg.uid);drain(s);
 const top=find(s,0,'battle',source);
 assert.equal(top.under[0].uid,veg.uid);
 return top;
}

test('Nasdeen ramps one per distinct mana civilization, counts both colors of a multicolor, and breaks two shields',()=>{
 const s=field();
 give(s,0,'mana',[...Array(6).fill(NATURE),MULTI]);
 give(s,1,'mana',[FIRE,LIGHT]);
 give(s,0,'deck',[MULTI,LIGHT,FIRE,...Array(8).fill(NATURE)]);
 const [multi,light,fire,next]=s.players[0].deck;
 const source=evolveNas(s);
 assert.equal(s.players[0].mana.length,10);
 assert.equal(find(s,0,'mana',multi).tapped,true);
 assert.equal(find(s,0,'mana',light).tapped,false);
 assert.equal(find(s,0,'mana',fire).tapped,false);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 attack(s,source);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Nasdeen counts current mana colors, ignores colorless and face-down mana, and respects ramp replacement',()=>{
 for(const mode of ['ordinary','courtney','replacement']){
  const s=field();
  give(s,0,'mana',[...Array(7).fill(NATURE),ZERO]);
  put(s,0,'mana',LIGHT,{faceDown:true,tapped:true});
  if(mode==='courtney')put(s,0,'battle',COURTNEY);
  if(mode==='replacement')put(s,1,'battle',KALEIKO);
  const top=s.players[0].deck[0],count=s.players[0].deck.length;
  evolveNas(s);
  assert.equal(s.players[0].deck.length,count-(mode==='courtney'?5:1));
  assert.ok(find(s,0,mode==='replacement'?'grave':'mana',top));
 }
});

for(const mode of ['two','one','locked','bounce'])test('Nasdeen returns the required number of own mana cards on destruction: '+mode,()=>{
 let s=field();
 const x=put(s,0,'battle',NAS,{under:[inst(VEGETABLE)]});
 give(s,0,'mana',mode==='one'?[FIRE]:[FIRE,DEATH,CLAW]);
 const [first,second,kept]=s.players[0].mana,other=s.players[1].mana[0];
 s.active=1;
 if(mode==='locked')put(s,1,'battle',APUL);
 play(s,mode==='bounce'?BOUNCE:DEATH);
 act(s,'effect',a=>a.targets[0]?.uid===x.uid);
 if(mode==='two'||mode==='one'){
  assert.equal(s.decision.source,NAS);
  assert.ok(!picks(s).includes(null)&&!picks(s).includes(other.uid));
  pick(s,first);
  if(mode==='two'){
   assert.ok(find(s,0,'mana',first)&&!picks(s).includes(first.uid));
   s=restore(s);pick(s,second);
   assert.ok(find(s,0,'hand',second)&&find(s,0,'mana',kept));
  }
  assert.ok(find(s,0,'hand',first));
 }else{
  assert.notEqual(s.decision?.source,NAS);
  assert.ok(find(s,0,'mana',first)&&find(s,0,'mana',second));
 }
 drain(s);
 assert.ok(find(s,0,mode==='bounce'?'hand':'grave',x)&&find(s,1,'mana',other));
});
