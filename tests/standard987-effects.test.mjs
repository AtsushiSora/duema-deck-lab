import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ZAN='dmr16g-011',MET='dmr16g-013',TRAP='dmr16g-017',TIG='dmr14-036',GO='dmr16s-003';
const PRINTS=[['dmr16s-011',ZAN],['dmr16s-014',MET],['promoy14-042',MET],['dmr16s-017',TRAP],['dmx22a-039',TIG]];
const NATURE='dm01-108',FIRE='dm01-097',DARK='dm01-090',LIGHT='dm01-075',WATER='dm01-083';
const BELL='dmr16g-016',BIG='dm01-001',IMMUNE='dm11-s01',SEED='dm22ex1-086';
const BRAIN='dmr21-090',JENNY='dmr01-056',TYPHOON='dm11-043',HAND='dm01-027',BLOCKER='dm01-076';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 987 registers five official definitions and maps five reprints to their canonical IDs',()=>{
 const m=read('tools/support-phase-987.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ZAN,MET,TRAP,TIG,GO]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),
  [{id:ZAN,count:1},{id:MET,count:2},{id:TRAP,count:1},{id:TIG,count:1}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:987}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:987}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-987');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId??row.id,row.image]]);
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:987}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const manaTapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
function seal(s,p,host,under=BELL){
 host.sealed=true;
 return put(s,p,'seals',under,{sealOf:host.uid,faceDown:true});
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Mana Armament gives each Dragon Shield Trigger at five matching mana including tapped mana',()=>{
 for(const [id,color] of [[ZAN,DARK],[MET,FIRE],[TRAP,NATURE]])for(const count of [4,5]){
  let s=field();
  s.active=1;
  give(s,0,'mana',[...Array(count).fill(color),...Array(8-count).fill(LIGHT)]);
  s.players[0].mana[0].tapped=true;
  give(s,0,'shields',[id]);
  const source=s.players[0].shields[0],attacker=put(s,1,'battle',FIRE);
  const all=physical(s);
  attack(s,attacker.uid);
  act(s,'noBlock');
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===source.uid),count===5);
  if(count===5){
   s=restore(s);
   act(s,'useTrigger',a=>a.uid===source.uid);
   if(id!==ZAN){assert.deepEqual(choices(s),[attacker.uid]);pick(s,attacker.uid);}
   assert.ok(has(s,0,'battle',source));
   assert.ok(has(s,1,id===TRAP?'mana':'grave',attacker));
  }else assert.ok(has(s,0,'hand',source));
  assert.equal(manaTapped(s,0),1);
  assert.deepEqual(physical(s),all);
 }
});

test('Zanjides applies a one-turn power reduction to the opposing creatures present at entry',()=>{
 const s=field(),mine=put(s,0,'battle',FIRE),small=put(s,1,'battle',FIRE);
 const big=put(s,1,'battle',BIG),protectedFoe=put(s,1,'battle',IMMUNE),seed=put(s,1,'battle',SEED);
 const before=e.power(protectedFoe,false,s);
 const dragon=play(s,ZAN);
 assert.equal(manaTapped(s,0),7);
 assert.equal(e.effectiveCard(dragon,s).breaker,2);
 assert.ok(has(s,1,'grave',small));
 assert.equal(e.power(big,false,s),e.card(BIG).power-2000);
 assert.equal(e.power(protectedFoe,false,s),before-2000);
 assert.equal(e.power(mine,false,s),2000);
 assert.ok(!seed.powerModifiers?.length);
 const late=put(s,1,'battle',FIRE);
 assert.equal(e.power(late,false,s),2000);
 end(s);
 assert.equal(e.power(big,false,s),e.card(BIG).power);
});

test('Metagillus and Traptops move one opposing non-evolution card through cost five',()=>{
 for(const [id,destination] of [[MET,'grave'],[TRAP,'mana']])for(const select of ['base','seal','limit','seed']){
  const s=field(),base=inst(FIRE),deepEvolution=inst(BELL);
  const stack=put(s,1,'battle',BELL,{under:[deepEvolution,base]}),own=put(s,0,'battle',FIRE);
  const high=put(s,1,'battle',BIG),limit=put(s,1,'battle','dmr16s-002'),hidden=seal(s,1,high);
  const seed=put(s,1,'battle',SEED),target={base,seal:hidden,limit,seed}[select];
  const dragon=play(s,id),all=physical(s);
  assert.equal(e.effectiveCard(dragon,s).breaker,2);
  assert.equal(manaTapped(s,0),7);
  assert.deepEqual(new Set(choices(s)),new Set([base.uid,limit.uid,hidden.uid,seed.uid]));
  assert.equal(s.decision.choices.find(c=>c.value===hidden.uid).cardId,undefined);
  pick(s,target.uid);
  assert.ok(has(s,1,destination,target)&&has(s,1,'battle',stack)&&has(s,0,'battle',own));
  assert.equal(!!high.sealed,select!=='seal');
  assert.deepEqual(physical(s),all);
 }
});

test('Traptops places a multicolored evolution base in its owner’s mana tapped',()=>{
 const s=field();
 const multi=data.cards.find(c=>c.type==='creature'&&!c.evolution&&c.cost<=5&&e.civilizations(c).length===2);
 assert.ok(multi);
 const base=inst(multi.id),stack=put(s,1,'battle',BELL,{under:[base]});
 play(s,TRAP);
 pick(s,base.uid);
 assert.ok(has(s,1,'battle',stack)&&has(s,1,'mana',base));
 assert.ok(base.tapped);
});

test('Tignus blocks and can attack a tapped creature while its player attack is unavailable',()=>{
 const s=field(),guard=play(s,TIG),enemy=put(s,1,'battle',FIRE);
 assert.equal(manaTapped(s,0),2);
 end(s);
 assert.equal(s.active,1);
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===guard.uid);
 assert.ok(has(s,1,'grave',enemy)&&guard.tapped);
 const defender=put(s,1,'battle',FIRE,{tapped:true});
 end(s);
 assert.equal(s.active,0);
 s.phase='attack';
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===guard.uid).map(a=>a.target),[defender.uid]);
 attack(s,guard.uid,defender.uid);
 act(s,'noBlock');
 assert.ok(has(s,1,'grave',defender));
});

test('Tignus prevents opposing spell and creature discard while the spell still draws',()=>{
 for(const id of [BRAIN,JENNY]){
  const s=field();
  put(s,1,'battle',TIG);
  const hidden=put(s,1,'hand',FIRE);
  play(s,id);
  drain(s);
  assert.ok(has(s,1,'hand',hidden));
  assert.equal(s.players[1].grave.length,0);
  assert.equal(s.players[0].hand.length,id===BRAIN?1:0);
 }
});

test('Tignus permits discarding by its controller’s spell',()=>{
 const s=field();
 play(s,TIG);
 const discard=put(s,0,'hand',FIRE);
 play(s,TYPHOON);
 assert.equal(s.decision.task.op,'g34_Draw');
 pick(s,0);
 pick(s,discard.uid);
 assert.ok(has(s,0,'grave',discard));
});

function evolveGo(s){
 const base=put(s,0,'battle',FIRE,{entered:s.turn});
 const wrong=put(s,0,'battle',WATER);
 const go=play(s,GO);
 const action=e.getLegalActions(s).filter(a=>a.kind==='evolve');
 if(action.length){
  assert.deepEqual(action.map(a=>a.baseUid),[base.uid]);
  act(s,'evolve',a=>a.baseUid===base.uid);
 }
 assert.ok(go.under.some(x=>x.uid===base.uid)&&has(s,0,'battle',wrong));
 return go;
}
function passBlock(s){
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
}

test('Go Breakdragon attacks immediately and only an actual Fire tap after the attack untaps it',()=>{
 for(const mode of ['ready','already tapped','self','decline']){
  let s=field();
  const go=evolveGo(s),ready=put(s,0,'battle',FIRE),tapped=put(s,0,'battle',MET,{tapped:true});
  put(s,1,'battle',FIRE);
  assert.equal(manaTapped(s,0),5);
  const all=physical(s);
  attack(s,go.uid);
  assert.equal(s.decision.type,'block');
  assert.ok(go.tapped&&!ready.tapped);
  assert.equal(s.attackLifecycle.g542After.length,1);
  s=restore(s);
  passBlock(s);
  assert.equal(s.players[1].shields.length,3);
  assert.deepEqual(new Set(choices(s)),new Set([go.uid,ready.uid,tapped.uid,null]));
  assert.equal(value(s.decision.choices[e.chooseAI(s).choice]),ready.uid);
  pick(s,{ready:ready.uid,'already tapped':tapped.uid,self:go.uid,decline:null}[mode]);
  assert.equal(find(s,0,'battle',go).tapped,mode!=='ready');
  assert.equal(find(s,0,'battle',ready).tapped,mode==='ready');
  assert.deepEqual(physical(s),all);
 }
});

test('Go Breakdragon resolves its tap choice after combat with a blocker and can trigger again',()=>{
 const s=field(),go=evolveGo(s),first=put(s,0,'battle',FIRE),second=put(s,0,'battle',FIRE);
 const blocker=put(s,1,'battle',BLOCKER);
 attack(s,go.uid);
 assert.ok(!first.tapped&&!second.tapped);
 act(s,'block',a=>a.uid===blocker.uid);
 assert.ok(has(s,1,'grave',blocker));
 assert.equal(s.players[1].shields.length,5);
 pick(s,first.uid);
 assert.ok(!go.tapped&&first.tapped);
 attack(s,go.uid);
 passBlock(s);
 pick(s,second.uid);
 assert.ok(!go.tapped&&second.tapped);
});

test('Go Breakdragon may still tap a Fire creature when a Shield Trigger removes it (QA 37233)',()=>{
 const s=field(),go=evolveGo(s),ally=put(s,0,'battle',FIRE);
 give(s,1,'shields',[HAND,NATURE,NATURE,NATURE,NATURE]);
 const all=physical(s);
 attack(s,go.uid);
 passBlock(s);
 assert.ok(!ally.tapped);
 act(s,'useTrigger');
 act(s,'effect',a=>a.targets?.some(t=>t.uid===go.uid));
 assert.ok(has(s,0,'grave',go));
 assert.deepEqual(new Set(choices(s)),new Set([ally.uid,null]));
 pick(s,ally.uid);
 assert.ok(ally.tapped&&has(s,0,'grave',go));
 assert.deepEqual(physical(s),all);
});

test('Evolution into Go Breakdragon during an attack creates no delayed tap choice (QA 37232)',()=>{
 const s=field(),base=put(s,0,'battle',FIRE),ally=put(s,0,'battle',FIRE),go=put(s,0,'hand',GO);
 attack(s,base.uid);
 assert.ok(!s.attackLifecycle.g542After);
 s.extTasks=[{op:'g34_Put',p:0,source:base.cardId,target:go.uid,origin:'hand'}];
 passBlock(s);
 assert.equal(s.decision?.task?.op,'g34_Put');
 pick(s,base.uid);
 assert.ok(!s.decision&&go.tapped&&!ally.tapped);
 assert.ok(go.under.some(x=>x.uid===base.uid));
});
