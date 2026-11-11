import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const JIM='dmrp01-040',HARSH='dmsd12-011',POLICE='dmrp06-080',FOG='dmrp02-014';
const NATURE='dm01-108',LIGHT='dm01-075',MOU='dmrp12-076',CASH='promoy21-014';
const DESTROY='dm01-027',BOUNCE='dm01-086',APUL='dmrp22-042',EIGHT='dm03-s01',NINE='dm03-s03';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const choiceUid=c=>c.value?.uid??c.value;
const pick=(s,uid)=>act(s,'extended',a=>choiceUid(s.decision.choices[a.choice])===uid);

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

test('Phase 971 verifies four canonical cards and the Harshil print alias',()=>{
 const m=read('tools/support-phase-971.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[JIM,HARSH,POLICE,FOG]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmrp10-050',HARSH]]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],d={...row,status:'complete'},c=e.card(id);
  assert.deepEqual(standardCardSpec(d,{phase:971}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:970}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:971}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations.filter(x=>x!=='無色'),1,4]);
  assert.equal(c.supportBatch,'phase-971');
  assert.equal(CARD_IMAGES[id],row.image);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
 for(const {id,canonicalId,faces} of m.printAliases){
  assert.deepEqual(catalogue.resolveRows([{id,count:1},{id:canonicalId,count:1}]),[{id:canonicalId,count:2}]);
  assert.deepEqual(standardCardSpec({id,faces,status:'complete'},{phase:971}),m.cards.find(row=>row.id===canonicalId).spec);
 }
 const rows=[...m.cards,...m.printAliases];
 for(const row of rows){
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[row.canonicalId??row.id,row.image]]);
 }
});

function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

const attackOptions=s=>e.getLegalActions(s).filter(a=>a.kind==='attack');
const canTarget=(s,source,target)=>attackOptions(s).some(a=>a.uid===source.uid&&a.target===(target.uid??target));

for(const accept of [true,false])test('Jimmy offers graveyard recovery at the end of its own turn '+accept,()=>{
 let s=field();
 const x=put(s,0,'grave',JIM,{incarnation:4,zoneSerial:7}),mou=put(s,0,'battle',MOU);
 const before=physical(s);
 mou.g35Ignored=s.turn;
 end(s);s=restore(s);
 assert.equal(s.decision.source,JIM);
 pick(s,accept?true:null);
 assert.ok(inZone(s,0,accept?'hand':'grave',x));
 assert.equal(s.active,1);
 assert.deepEqual(physical(s),before);
});

test('Jimmy requires a present allied Mutopia and only returns from the graveyard',()=>{
 for(const mode of ['opponent','seal','under','battle','opponentTurn']){
  const s=field(mode==='opponentTurn'?1:0);
  const x=put(s,0,mode==='battle'?'battle':'grave',JIM);
  if(mode==='opponent')put(s,1,'battle',MOU);
  if(mode==='seal'){
   const sealed=put(s,0,'battle',MOU,{sealed:true});
   put(s,0,'seals',NATURE,{faceDown:true,sealOf:sealed.uid});
  }
  if(mode==='under')put(s,0,'battle',NATURE,{under:[inst(MOU)]});
  if(['battle','opponentTurn'].includes(mode))put(s,0,'battle',MOU);
  end(s);
  assert.equal(s.decision,null,mode);
  assert.ok(inZone(s,0,mode==='battle'?'battle':'grave',x));
 }
});

test('Harshil returns on the next opposing turn even after an extra own turn',()=>{
 let s=field(),x=put(s,0,'battle',HARSH,{zoneSerial:3,incarnation:2});
 const source=put(s,0,'hand',CASH),before=physical(s);
 s.extraTurns=[{player:0}];
 act(s,'play',a=>a.uid===source.uid);pick(s,x.uid);
 assert.ok(inZone(s,0,'grave',x));
 end(s);s=restore(s);
 assert.equal(s.active,0);
 assert.ok(inZone(s,0,'grave',x));
 end(s);
 assert.equal(s.active,1);
 assert.ok(inZone(s,0,'battle',x));
 assert.deepEqual(physical(s),before);
});

test('Harshil skips non-destruction and destruction on the opposing turn',()=>{
 for(const mode of ['bounce','opponent']){
  const s=field(1),x=put(s,0,'battle',HARSH);
  cast(s,mode==='bounce'?BOUNCE:DESTROY);
  act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
  assert.ok(!s.g537Delays?.some(t=>t.source===HARSH));
  end(s);end(s);
  assert.ok(inZone(s,0,mode==='bounce'?'hand':'grave',x));
 }
});

test('Harshil attempts entry only at the specified start and honors the graveyard lock',()=>{
 const s=field(),x=put(s,0,'battle',HARSH),apul=put(s,1,'battle',APUL);
 cast(s,CASH);pick(s,x.uid);
 end(s);
 assert.equal(s.active,1);
 assert.ok(inZone(s,0,'grave',x));
 s.phase='main';
 cast(s,BOUNCE);act(s,'effect',a=>a.targets.some(t=>t.uid===apul.uid));
 end(s);end(s);
 assert.ok(inZone(s,0,'grave',x));
});

test('Harshil ignores a later grave visit by the same card',()=>{
 const s=field(),x=put(s,0,'battle',HARSH);
 cast(s,CASH);pick(s,x.uid);
 assert.equal(s.g537Delays.length,1);
 x.zoneSerial++;
 end(s);
 assert.ok(inZone(s,0,'grave',x));
});

test('Police selects only an opposing untapped creature and excludes itself from the grant',()=>{
 let s=field();
 const target=put(s,1,'battle',LIGHT),other=put(s,1,'battle',LIGHT),tapped=put(s,1,'battle',NATURE,{tapped:true});
 const immune=put(s,1,'battle',LIGHT,{justDiverActive:true});
 put(s,1,'battle','dmsd20-016');
 const ally=put(s,0,'battle',NATURE),source=put(s,0,'hand',POLICE);
 act(s,'play',a=>a.uid===source.uid);
 assert.deepEqual(s.decision.choices.map(choiceUid),[target.uid,other.uid]);
 pick(s,target.uid);
 source.entered=0;
 s.phase='attack';s=restore(s);
 assert.ok(canTarget(s,ally,target)&&canTarget(s,ally,tapped));
 assert.ok(!canTarget(s,ally,other)&&!canTarget(s,ally,immune)&&!canTarget(s,source,target));
 attack(s,ally.uid,target.uid);act(s,'noBlock');
 assert.ok(inZone(s,1,'grave',target));
});

test('Police permits a fresh ally to attack the chosen creature even after the source leaves',()=>{
 const s=field(),target=put(s,1,'battle',LIGHT),other=put(s,1,'battle',LIGHT);
 const source=put(s,0,'hand',POLICE),newcomer=put(s,0,'hand',NATURE);
 act(s,'play',a=>a.uid===source.uid);pick(s,target.uid);
 cast(s,BOUNCE);act(s,'effect',a=>a.targets.some(t=>t.uid===source.uid));
 act(s,'play',a=>a.uid===newcomer.uid);
 s.phase='attack';
 assert.ok(canTarget(s,newcomer,target));
 assert.ok(!canTarget(s,newcomer,other)&&!canTarget(s,newcomer,'player'));
 target.tapped=true;
 assert.ok(canTarget(s,newcomer,target));
});

test('Police keeps the target through evolution and expires at the active turn end',()=>{
 const s=field(),target=put(s,1,'battle',MOU),ally=put(s,0,'battle',NATURE);
 cast(s,POLICE);pick(s,target.uid);
 const evo=put(s,1,'battle','dmr16g-021',{under:[target]});
 s.players[1].battle=s.players[1].battle.filter(x=>x.uid!==target.uid);
 s.phase='attack';
 assert.ok(canTarget(s,ally,evo));
 end(s);end(s);s.phase='attack';
 assert.ok(!canTarget(s,ally,evo));
});

test('Police does not permit attacks on a later incarnation of the chosen card',()=>{
 const s=field(),target=put(s,1,'battle',LIGHT),ally=put(s,0,'battle',NATURE);
 cast(s,POLICE);pick(s,target.uid);
 target.incarnation=1;
 s.phase='attack';
 assert.ok(!canTarget(s,ally,target));
});

test('Police may have no legal target and does not grant an attack through an explicit lock',()=>{
 for(const mode of ['tapped','lock']){
  const s=field(),target=put(s,1,'battle',LIGHT,{tapped:mode==='tapped'}),ally=put(s,0,'battle',NATURE);
  cast(s,POLICE);
  if(mode==='lock'){
   pick(s,target.uid);
   s.extLimits.push({kind:'attack',player:0,uid:ally.uid,incarnation:0,expires:'end',who:0});
  }else assert.equal(s.decision,null);
  s.phase='attack';
  if(mode==='lock')assert.ok(!canTarget(s,ally,target));
  else assert.ok(!s.extLimits?.some(l=>l.kind==='g971AttackTarget'));
 }
});

for(const accept of [true,false])test('Oogiri draws first and may deploy a newly drawn light creature of cost eight '+accept,()=>{
 let s=field(1),x=put(s,0,'battle',FOG);
 give(s,1,'shields',Array(4).fill(NATURE));
 give(s,0,'deck',[EIGHT,NATURE,NATURE]);
 put(s,0,'hand',NATURE);put(s,0,'hand',NINE);
 const drawn=s.players[0].deck[0];
 cast(s,DESTROY);act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));s=restore(s);
 assert.ok(inZone(s,0,'grave',x)&&inZone(s,0,'hand',drawn));
 assert.deepEqual(s.decision.choices.map(choiceUid),[drawn.uid,null]);
 pick(s,accept?drawn.uid:null);
 assert.ok(inZone(s,0,accept?'battle':'hand',drawn));
 assert.equal(s.players[0].drawsThisTurn,1);
});

test('Oogiri does not draw when its shield groups are tied or fewer',()=>{
 for(const n of [4,5]){
  const s=field(1),x=put(s,0,'battle',FOG),deck=s.players[0].deck.length;
  give(s,0,'shields',Array(n).fill(NATURE));
  s.players[0].shields[0].shieldStack=[inst(NATURE),inst(NATURE)];
  put(s,0,'hand',EIGHT);
  cast(s,DESTROY);act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
  assert.equal(s.players[0].deck.length,deck);
  assert.equal(s.decision,null);
 }
});
