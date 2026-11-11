import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BIO='dm23-025',LUNA='dm16-s02',TWIN='dm25ex1-040',SAVER='dm27-022';
const PLAIN='dm01-108',MECHA='dm28-073',BLOCKER='dm01-076',BOUNCE='dm01-086',DEATH='dm01-027';
const DRAW='dm06-085',SWEEP='dm14-015',LIGHT='dm01-075',MULTI='dm27-017';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const legal=(s,kind,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&pred(a));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(PLAIN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

test('Phase 951 verifies four complete names and resolves two reprints to the first-print IDs',()=>{
 const m=read('tools/support-phase-951.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BIO,LUNA,TWIN,SAVER]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmx11-076',BIO],['promoy5-065',BIO]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id),canonical=m.cards.find(x=>x.id===id);
  const d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:951}),canonical.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:951}));
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  if(row.faces.length===2){
   const spell=row.faces[1];
   assert.deepEqual([c.spellFace.name,c.spellFace.cost,c.spellFace.race],[spell.name,spell.cost,spell.race]);
   assert.throws(()=>standardCardSpec({...d,faces:[f,{...spell,abilityText:spell.abilityText+'不明な能力。'}]},{phase:951}));
  }
  assert.equal(c.supportBatch,'phase-951');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

for(const n of [0,1,2])test('Bio-K announces a hand copy before resolving and can draw '+n,()=>{
 let s=field(),mecha=put(s,0,'battle',MECHA),bio=put(s,0,'hand',BIO),other=put(s,0,'hand',BIO);
 const ids=e.physicalCards(s).map(x=>x.uid).sort();
 s.players[0].deck[0].cardId=BIO;
 attack(s,mecha.uid);act(s,'noBlock');
 assert.deepEqual(choices(s),[bio.uid,other.uid,null]);
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(BIO));
 pick(s,bio);
 assert.deepEqual(choices(s),[other.uid,null]);
 assert.equal(s.log.filter(x=>x.type==='reveal'&&x.cardId===BIO).length,0);
 s=restore(s);pick(s,null);
 assert.equal(s.log.filter(x=>x.type==='reveal'&&x.cardId===BIO).length,1);
 assert.ok(has(s,0,'hand',bio));
 pick(s,true);
 assert.ok(has(s,0,'grave',bio));
 for(let i=0;i<n;i++)pick(s,true);
 if(n<2)pick(s,null);
 assert.ok(has(s,0,'hand',other));
 assert.equal(s.players[0].hand.length,n+1);
 assert.equal(s.players[1].shields.length,4);
 assert.equal(s.decision,null);
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),ids);
});

for(const mode of ['decline','blocked','creature','race','battleOnly'])test('Bio-K keeps the hand and resolves no draw '+mode,()=>{
 const s=field(),mecha=put(s,0,'battle',mode==='race'?PLAIN:MECHA);
 const bio=put(s,0,mode==='battleOnly'?'battle':'hand',BIO);
 const blocker=['blocked','creature'].includes(mode)?put(s,1,'battle',BLOCKER,{tapped:mode==='creature'}):null;
 attack(s,mecha.uid,mode==='creature'?blocker.uid:'player');
 act(s,mode==='blocked'?'block':'noBlock');
 if(mode==='decline')pick(s,null);
 drain(s);
 assert.ok(has(s,0,mode==='battleOnly'?'battle':'hand',bio));
 assert.ok(s.log.every(x=>x.cardId!==BIO));
 assert.equal(s.players[0].deck.length,18);
});

for(const cardId of [LUNA,TWIN])for(const who of [0,1])test(cardId+' requires nine cards in one hand for G-Zero '+who,()=>{
 let s=field(),luna=put(s,0,'hand',cardId);
 const free=()=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===luna.uid&&a.freeSummon);
 give(s,1,'hand',Array(8).fill(PLAIN));
 for(let n=1;n<8;n++)put(s,0,'hand',PLAIN);
 assert.equal(free().length,0);
 put(s,who,'hand',PLAIN);
 assert.deepEqual(free().map(a=>[a.face,a.cost,a.freeSummon]),[[0,0,'G・ゼロ']]);
 s=restore(s);act(s,'play',a=>a.uid===luna.uid&&a.freeSummon==='G・ゼロ');
 assert.ok(has(s,0,'battle',luna)&&s.players[0].mana.every(x=>!x.tapped));
});

for(const mode of ['accept','decline','opponent','late','sealed'])test('Luna checks only the first actual draw of its own turn '+mode,()=>{
 const s=field(mode==='opponent'?1:0),luna=put(s,0,'battle',LUNA,{sealed:mode==='sealed'});
 if(mode==='sealed')s.players[0].seals.push({...inst(PLAIN),faceDown:true,sealOf:luna.uid});
 if(mode==='late')s.players[0].drawsThisTurn=1;
 cast(s,DRAW);
 const first=mode==='accept'||mode==='decline';
 assert.equal(s.players[s.active].hand.length,2);
 if(first){assert.equal(s.decision.source,LUNA);pick(s,mode==='accept'?1:0);}
 assert.equal(s.decision,null);
 assert.equal(s.players[s.active].hand.length,mode==='accept'?3:2);
 cast(s,DRAW);
 assert.equal(s.decision,null);
 assert.equal(s.players[s.active].hand.length,mode==='accept'?5:4);
 if(mode==='sealed')assert.ok(luna.sealed);
});

test('both Luna versions see the same turn draw independently and resume from JSON',()=>{
 let s=field(1);
 put(s,0,'battle',LUNA);const twin=put(s,0,'battle',TWIN);
 s.phase='attack';act(s,'endTurn');
 assert.equal(s.active,0);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.decision?.type,'effectOrder');
 s=restore(s);
 act(s,'orderEffect',a=>a.uid===twin.uid);
 pick(s,1);pick(s,1);
 assert.equal(s.players[0].hand.length,3);
 assert.equal(s.players[0].drawsThisTurn,3);
});

test('the Twinpact spell draws two and returns both sides’ blockers including unchoosable ones',()=>{
 const s=field(),spell=put(s,0,'hand',TWIN),self=put(s,0,'battle',BLOCKER);
 const enemy=put(s,1,'battle',BLOCKER),plain=put(s,1,'battle',PLAIN);
 enemy.g34Grants=[{turn:s.turn,untargetable:true}];
 act(s,'play',a=>a.uid===spell.uid&&a.face===1);
 assert.equal(s.players[0].hand.length,3);
 assert.ok(has(s,0,'hand',self)&&has(s,1,'hand',enemy)&&has(s,1,'battle',plain));
 assert.ok(has(s,0,'grave',spell));
});

const replace=(s,saver)=>act(s,'replaceUltra',a=>a.uid===saver.uid);
function targetSpell(s,id,target){cast(s,id);act(s,'effect',a=>a.targets?.some(x=>x.uid===target.uid));}
for(const mode of ['twoColors','multicolor','repeated','faceDown','decline','bounce','enemy'])test('La Francis checks the threatened creature and distinct mana civilizations '+mode,()=>{
 let s=field(mode==='enemy'?0:1),saver=put(s,0,'battle',SAVER),ally=put(s,mode==='enemy'?1:0,'battle',LIGHT);
 if(mode!=='enemy')give(s,0,'mana',mode==='repeated'?Array(3).fill(PLAIN):mode==='multicolor'?[MULTI]:[PLAIN,LIGHT]);
 if(mode==='faceDown')s.players[0].mana[1].faceDown=true;
 targetSpell(s,mode==='bounce'?BOUNCE:DEATH,ally);
 const saves=mode==='twoColors'||mode==='multicolor',eligible=saves||mode==='decline';
 assert.equal(legal(s,'replaceUltra',a=>a.uid===saver.uid),eligible);
 if(eligible){
  s=restore(s);
  if(mode==='decline')act(s,'allowLeave');
  else replace(s,saver);
 }
 assert.equal(has(s,0,'grave',saver),saves);
 assert.equal(has(s,0,'battle',ally),saves);
 if(mode==='enemy')assert.ok(has(s,1,'grave',ally));
});

test('La Francis in the same destruction batch can save one of two creatures',()=>{
 const s=field(1),saver=put(s,0,'battle',SAVER),first=put(s,0,'battle',BLOCKER),second=put(s,0,'battle',BLOCKER);
 for(let n=0;n<3;n++)put(s,1,'battle',PLAIN);
 cast(s,SWEEP);
 if(s.decision?.uid===saver.uid)act(s,'allowLeave');
 assert.equal(s.decision?.uid,first.uid);replace(s,saver);drain(s);
 assert.ok(has(s,0,'grave',saver)&&has(s,0,'grave',second)&&has(s,0,'battle',first));
});
