import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DIABLO='dmrp20-025',ACTOR='dmrp20-008',TECHNO='dmrp20-005',BARA='dmrp20-s06';
const NATURE='dm01-108',BLAZE='dm01-100',BOLSHACK='dm01-008',TWIN='dmrp05-011';
const KIRIN='dmrp20-023',SEB='dmrp20-022',KIINARY='dm23bd1-007';
const LOST='dmrp20-017',WINTER='dmrp20-036',TUTOR='dmrp20-035',BRAIN='dmrp18-071',HAND='dm01-027';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>options(s)[a.choice]===v);
const save=s=>JSON.parse(JSON.stringify(s));

test('five verified prints resolve to four original battle identities',()=>{
 const m=read('tools/support-phase-1268.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[DIABLO,ACTOR,TECHNO,BARA]);
 assert.equal(m.printAliases.length,1);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row;
  const def={id,status:'complete',faces:row.faces},c=e.card(canonicalId);
  if(id===canonicalId)assert.deepEqual(row.faces,details.cards.find(x=>x.id===id).faces);
  assert.deepEqual(standardCardSpec(def,{phase:1268}),row.spec);
  assert.throws(()=>standardCardSpec(def,{phase:1267}));
  def.faces=structuredClone(def.faces);def.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(def,{phase:1268}));
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
 }
});

test('Diablo counts the first summon costing at least eight and can deploy up to eight without summoning',()=>{
 let s=field();cast(s,DIABLO);const x=s.players[0].battle[0];
 assert.equal(e.exLifeShields(s,0,x).length,1);
 assert.ok(e.effectiveCard(x,s).blocker);
 cast(s,NATURE);
 const eligible=add(s,0,'mana',SEB),large=add(s,0,'mana',KIINARY),spell=add(s,0,'mana',HAND);
 cast(s,KIRIN);
 assert.ok(options(s).includes(eligible.uid));
 assert.ok(!options(s).includes(large.uid)&&!options(s).includes(spell.uid));
 assert.ok(options(s).includes(null));
 s=save(s);pick(s,eligible.uid);drain(s);
 assert.ok(has(s,0,'battle',eligible));
 assert.equal(s.metrics[0].played[SEB]??0,0);
 cast(s,KIRIN);assert.equal(s.decision,null);
});

test('Diablo does not count a high cost creature deployed without a summon',()=>{
 const s=field();cast(s,DIABLO);
 const first=add(s,0,'grave',KIRIN),second=add(s,0,'mana',KIRIN);
 cast(s,'dm19-027');pick(s,first.uid);drain(s);
 assert.ok(has(s,0,'battle',first)&&has(s,0,'mana',second));
 cast(s,KIRIN);
 assert.ok(options(s).includes(second.uid));
});

test('Diablo can trigger on the opposing turn from a free Shield Trigger summon',()=>{
 const s=field(1);add(s,0,'battle',DIABLO);
 const candidate=add(s,0,'mana',NATURE),trigger=inst('dmr18-045');
 s.players[0].shields=[trigger];
 const attacker=add(s,1,'battle',BLAZE);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.uid===trigger.uid);
 assert.ok(options(s).includes(candidate.uid));
 pick(s,candidate.uid);drain(s);
 assert.ok(has(s,0,'battle',trigger)&&has(s,0,'battle',candidate));
});

test('Diablo cannot trigger from a first high-cost summon that predated its entry',()=>{
 const s=field();cast(s,KIRIN);cast(s,DIABLO);
 const eligible=add(s,0,'mana',SEB);
 cast(s,KIRIN);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'mana',eligible));
});

test('Actor attacks immediately, draws, and deploys its first discarded creature without summoning',()=>{
 const s=field();cast(s,ACTOR);const actor=s.players[0].battle[0];
 assert.equal(e.exLifeShields(s,0,actor).length,1);
 const chosen=add(s,0,'hand',NATURE),unpicked=add(s,0,'hand',NATURE),drawn=s.players[0].deck[0];
 attack(s,actor.uid);assert.ok(has(s,0,'hand',drawn));pick(s,chosen.uid);
 assert.equal(s.decision.task.op,'g34_FirstDiscardUse1268');
 pick(s,chosen.uid);drain(s);
 assert.ok(has(s,0,'battle',chosen)&&has(s,0,'hand',unpicked));
 assert.equal(s.metrics[0].played[NATURE]??0,0);
 assert.equal(s.players[1].shields.length,3);
});

test('Actor chooses only one card from a first simultaneous discard (QA40670)',()=>{
 let s=field(1);add(s,0,'battle',ACTOR);
 const a=add(s,0,'hand',TUTOR),b=add(s,0,'hand',WINTER),tooLarge=add(s,0,'hand',HAND);
 cast(s,LOST);
 assert.equal(s.decision.player,0);assert.equal(s.decision.task.op,'g34_FirstDiscardUse1268');
 assert.deepEqual(options(s).filter(Boolean),[a.uid,b.uid]);
 s=save(s);pick(s,b.uid);drain(s);
 assert.equal(s.metrics[0].played[WINTER],1);
 assert.equal(s.metrics[0].played[TUTOR]??0,0);
 assert.ok(has(s,0,'grave',tooLarge));
});

test('Actor cannot fire on a later discard even if the first discarded card cost more than five',()=>{
 const s=field();cast(s,ACTOR);cast(s,ACTOR);const [a,b]=s.players[0].battle;
 const tooLarge=add(s,0,'hand',HAND),small=add(s,0,'hand',NATURE);
 attack(s,a.uid);pick(s,tooLarge.uid);drain(s);
 attack(s,b.uid);pick(s,small.uid);drain(s);
 assert.ok(has(s,0,'grave',small));
});

test('Actor ignores a discard replaced by a move to mana and still sees the first actual discard',()=>{
 const s=field(),a=add(s,0,'battle',ACTOR),b=add(s,0,'battle',ACTOR);
 add(s,0,'battle','dmrp19-s10');
 const replaced=add(s,0,'hand',NATURE),discarded=add(s,0,'hand',NATURE);
 attack(s,a.uid);pick(s,replaced.uid);act(s,'extended',v=>s.decision.choices[v.choice].value?.g1090Mana);
 drain(s);assert.ok(has(s,0,'mana',replaced));
 attack(s,b.uid);pick(s,discarded.uid);pick(s,false);
 act(s,'orderEffect',v=>v.uid===a.uid);pick(s,discarded.uid);drain(s);
 assert.ok(has(s,0,'battle',discarded));
});

for(const id of [BRAIN,TWIN])test('two Actors resolve the same discard with the real graveyard destination: '+id,()=>{
 let s=field();const a=add(s,0,'battle',ACTOR),b=add(s,0,'battle',ACTOR),x=add(s,0,'hand',id);
 attack(s,a.uid);pick(s,x.uid);
 act(s,'orderEffect',v=>v.uid===a.uid);
 act(s,'extended',v=>s.decision.choices[v.choice].value?.type==='spell');
 if(id===TWIN){
  if(s.decision?.type==='effectOrder')act(s,'orderEffect',v=>v.uid===b.uid);
  s=save(s);act(s,'extended',v=>s.decision.choices[v.choice].value?.type==='creature');
  assert.ok(has(s,0,'battle',x));
 }else assert.ok(has(s,0,'mana',x));
 drain(s);
 assert.equal(s.metrics[0].played[id],1);
});

for(const firstUsesProxy of [true,false])test('Techno battle replacement respects turn order and never chains: '+firstUsesProxy,()=>{
 let s=field();cast(s,TECHNO);const t=s.players[0].battle[0];
 const opposing=add(s,1,'battle',TECHNO),a=add(s,0,'battle',BLAZE),b=add(s,1,'battle',BLAZE,{tapped:true});
 const recover=add(s,firstUsesProxy?0:1,'mana',NATURE),winner=firstUsesProxy?t:opposing;
 const owner=firstUsesProxy?0:1,top=s.players[owner].deck[0];
 attack(s,a.uid,b.uid);act(s,'noBlock');
 assert.equal(s.decision.player,0);
 if(!firstUsesProxy){pick(s,null);assert.equal(s.decision.player,1);}
 pick(s,winner.uid);
 assert.deepEqual(s.log.filter(x=>x.type==='battleReplace').map(x=>x.player),[owner]);
 assert.ok(has(s,1-owner,'grave',firstUsesProxy?b:a));
 assert.ok(has(s,owner,'battle',firstUsesProxy?a:b));
 s=save(s);pick(s,recover.uid);drain(s);
 assert.ok(has(s,owner,'hand',recover)&&has(s,owner,'mana',top));
});

test('Techno may decline the mana recovery after winning and then does not ramp',()=>{
 const s=field();cast(s,TECHNO);const x=s.players[0].battle[0];
 const enemy=add(s,1,'battle',BOLSHACK,{tapped:true}),top=s.players[0].deck[0];
 x.entered=0;
 attack(s,x.uid,enemy.uid);act(s,'noBlock');pick(s,null);drain(s);
 assert.ok(has(s,0,'deck',top));
});

test('Bara star evolves and stops player attacks only while itself tapped',()=>{
 const s=field(1),base=add(s,1,'battle',NATURE),x=add(s,1,'hand',BARA);
 act(s,'play',a=>a.uid===x.uid);act(s,'evolve',a=>a.baseUid===base.uid);
 act(s,'toAttack');act(s,'endTurn');drain(s);
 act(s,'skipCharge');const attacker=add(s,0,'battle',BLAZE);act(s,'toAttack');
 const legal=target=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===target);
 assert.ok(legal('player'));
 x.tapped=true;
 assert.equal(legal('player'),false);
 assert.ok(legal(x.uid));
 s.phase='main';
 cast(s,HAND);act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));drain(s);
 assert.ok(has(s,1,'battle',base));assert.ok(has(s,1,'grave',x));
});

test('Bara only deploys a natural creature up to the opposing entrant cost, without summoning',()=>{
 let s=field(1);const x=add(s,0,'battle',BARA),base=add(s,0,'battle',NATURE);
 s.players[0].battle=s.players[0].battle.filter(y=>y!==base);x.under=[base];
 const eligible=add(s,0,'mana',NATURE),tooLarge=add(s,0,'mana',KIRIN),wrongColor=add(s,0,'mana',BLAZE);
 cast(s,NATURE);
 assert.equal(s.decision.player,0);
 assert.ok(options(s).includes(eligible.uid));
 assert.ok(!options(s).includes(tooLarge.uid)&&!options(s).includes(wrongColor.uid));
 s=save(s);pick(s,eligible.uid);drain(s);
 assert.ok(has(s,0,'battle',eligible));
 assert.equal(s.metrics[0].played[NATURE]??0,0);
});
