import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TRES='dm24ex1-045',SERAPH='dm23rp3-003',STEN='promoy14-039';
const SMALL='dm01-108',BIG='dm01-s01',MECHA='dm23rp2-030';
const MORNING='dmex12-015',DREAM='dm24ex1-014',DREAM_SPELL='dm24ex1-034';
const HAND='dm01-027',BOUNCE='dm01-086',APOCALYPSE='dm14-015',COMPLEX='dm23rp4-S02';
const put=(s,p,zone,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(({value})=>value?.uid??value);
const pick=(s,value)=>act(s,'extended',a=>options(s)[a.choice]===value);
const roundtrip=s=>JSON.parse(JSON.stringify(s));
const target=(s,x)=>act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function next(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}
const order=(s,x)=>act(s,'orderEffect',a=>s.pendingEffects.some(y=>y.effectId===a.effectId&&y.uid===x.uid));
function hyper(s,tres,other){
 act(s,'hyper',a=>a.uid===tres.uid);
 assert.equal(s.decision?.task?.op,'hyperCost');
 assert.ok(!options(s).includes(tres.uid));
 pick(s,other.uid);
}
const offer=(s,value)=>{
 assert.equal(s.decision?.task?.op,'g34_Offer');
 pick(s,value);
};

test('the six official prints resolve to three supported cards with their verified specs and art',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const manifest=read('support-phase-1200.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[TRES,SERAPH,STEN]);
 assert.deepEqual(manifest.printAliases.map(x=>x.id),['dmr19-038','dmx26-047','dmex12-062']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id),[face]=row.faces;
  const parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1200}),row.spec);
  const bad=structuredClone(parsed);
  bad.faces.at(-1).abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(bad,{phase:1200}));
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.ok(catalogue.get(id).supported);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([live.cost,live.power,live.race,live.civilizations,live.manaValue,live.limit],
   [face.cost,+face.powerText,face.race,face.civilizations,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
 }
});

test('Tres publicly reveals three cards, requires a Dreammate pick and orders the remaining two',()=>{
 let s=setup();
 const [spell,other,dream]=[DREAM_SPELL,SMALL,MORNING].map(inst);
 s.players[0].deck.unshift(spell,other,dream);
 play(s,TRES);
 assert.equal(s.decision?.task?.op,'g34_LookPick');
 assert.deepEqual(options(s),[spell.uid,dream.uid]);
 assert.ok(s.log.some(row=>row.type==='reveal'&&row.text.includes(e.card(other).name)));
 s=roundtrip(s);
 pick(s,spell.uid);
 assert.equal(s.decision?.task?.op,'g34_Order');
 pick(s,dream.uid);
 drain(s);
 assert.ok(has(s,0,'hand',spell));
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[dream.uid,other.uid]);
});

test('Tres cannot attack players in either mode; Hyper taps another creature, guards and expires on its own turn',()=>{
 const s=setup(),tres=put(s,0,'battle',TRES),ally=put(s,0,'battle',SMALL);
 const enemy=put(s,1,'battle',SMALL,{tapped:true});
 function targets(){
  s.phase='attack';
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===tres.uid).map(a=>a.target),[enemy.uid]);
  s.phase='main';
 }
 targets();
 assert.equal(e.effectiveCard(tres,s).power,3000);
 hyper(s,tres,ally);
 assert.ok(ally.tapped&&!tres.tapped);
 assert.equal(e.effectiveCard(tres,s).power,6000);
 targets();
 next(s);
 assert.equal(e.effectiveCard(tres,s).guardman,true);
 attack(s,enemy.uid,ally.uid);
 act(s,'guardman',a=>a.uid===tres.uid);
 drain(s);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'battle',ally));
 next(s);
 assert.equal(e.effectiveCard(tres,s).guardman,undefined);
 assert.equal(e.effectiveCard(tres,s).power,3000);
});

for(const gsFirst of [true,false])test('QA 47076: Morning declares and resolves both shield abilities, G Strike first = '+gsFirst,()=>{
 let s=setup();
 const attacker=put(s,0,'battle',SMALL),later=put(s,0,'battle',BIG);
 put(s,1,'battle',TRES,{hyperActive:true,hyperResolved:true});
 give(s,1,'shields',[MORNING,SMALL,SMALL]);
 const morning=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision?.type,'trigger');
 act(s,'useTrigger',a=>a.uid===morning.uid);
 assert.equal(s.decision?.task?.op,'gsDeclare');
 pick(s,true);
 assert.equal(s.decision?.type,'triggerOrder');
 s=roundtrip(s);
 act(s,gsFirst?'orderGS':'orderTrigger',a=>a.uid===morning.uid);
 assert.equal(s.decision?.task?.op,'gsTarget');
 assert.equal(has(s,1,'battle',morning),!gsFirst);
 pick(s,later.uid);
 drain(s);
 assert.ok(has(s,1,'battle',morning));
 assert.equal(e.attackLocked(s,0,later),true);
});

for(const activeHyper of [false,true])test('only the defender’s Hyper applies to its Dreammate shield; active = '+activeHyper,()=>{
 const s=setup();
 const attacker=put(s,0,'battle',SMALL);
 put(s,0,'battle',TRES,{hyperActive:true,hyperResolved:true});
 put(s,1,'battle',TRES,{hyperActive:activeHyper,hyperResolved:activeHyper});
 give(s,1,'shields',[activeHyper?SMALL:DREAM,SMALL]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.log.some(row=>row.type==='gStrike'),false);
});

for(const sweep of [false,true])test('QA 45548: Escape only grants G Strike if Tres remains; simultaneous destruction = '+sweep,()=>{
 const s=setup();
 const mei=put(s,1,'battle',DREAM);
 const tres=put(s,1,'battle',TRES,{hyperActive:true,hyperResolved:true});
 const later=put(s,0,'battle',SMALL);
 for(let i=0;i<3;i++)put(s,0,'battle',SMALL);
 give(s,1,'shields',[MORNING]);
 const shield=s.players[1].shields[0];
 play(s,sweep?APOCALYPSE:HAND);
 if(!sweep)target(s,mei);
 assert.equal(s.decision?.uid,mei.uid);
 act(s,'replaceEscape',a=>a.shield===shield.uid);
 if(sweep){
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'grave',tres));
 }else{
  assert.equal(s.decision?.task?.op,'gsTarget');
  pick(s,later.uid);
  assert.equal(e.attackLocked(s,0,later),true);
 }
 assert.ok(has(s,1,'battle',mei)&&has(s,1,'hand',shield));
});

test('Seraph may decline its self entry and use each draw once independently on either turn',()=>{
 const s=setup(),own=s.players[0],ally=put(s,0,'battle',SMALL),other=put(s,0,'battle',SMALL);
 play(s,SERAPH);
 offer(s,null);
 play(s,SMALL);
 offer(s,true);
 play(s,SMALL);
 assert.equal(s.decision,null);
 next(s);
 play(s,HAND);
 target(s,ally);
 offer(s,null);
 play(s,HAND);
 target(s,other);
 const before=own.hand.length;
 offer(s,true);
 assert.equal(own.hand.length,before+1);
 play(s,HAND);
 target(s,own.battle.find(x=>x.cardId===SMALL));
 assert.equal(s.decision,null);
 next(s);
 play(s,SMALL);
 offer(s,true);
});

test('Seraph sees its own departure to hand and once-used entry draw does not prevent it',()=>{
 const s=setup(),seraph=play(s,SERAPH);
 offer(s,true);
 next(s);
 play(s,BOUNCE);
 target(s,seraph);
 assert.ok(has(s,0,'hand',seraph));
 offer(s,true);
});

test('each Seraph draws at most once during simultaneous friendly departures, including its own',()=>{
 const s=setup(),seraph=put(s,1,'battle',SERAPH),saved=put(s,1,'battle',COMPLEX);
 for(let i=0;i<6;i++)put(s,1,'battle',SMALL);
 put(s,1,'battle',SERAPH);
 play(s,APOCALYPSE);
 drain(s);
 assert.ok(has(s,1,'battle',saved)&&has(s,1,'grave',seraph));
 assert.equal(s.players[1].hand.length,2);
});

test('only a Mecha can Revolution Change to Seraph and the incoming Seraph sees its own entry',()=>{
 const s=setup(),notMecha=put(s,0,'battle',SMALL),mecha=put(s,0,'battle',MECHA);
 const seraph=put(s,0,'hand',SERAPH);
 attack(s,notMecha.uid);
 assert.notEqual(s.decision?.task?.op,'revDeclare');
 drain(s);
 attack(s,mecha.uid);
 assert.equal(s.decision?.task?.op,'revDeclare');
 pick(s,true);
 assert.equal(s.decision?.task?.op,'revResolve');
 pick(s,mecha.uid);
 assert.ok(has(s,0,'hand',mecha)&&has(s,0,'battle',seraph));
 assert.equal(s.attack?.attacker,seraph.uid);
 offer(s,true);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const sacrifice of ['ally','none','protected'])test('Stenyanko only revives at its own turn start; choice = '+sacrifice,()=>{
 let s=setup();
 const sten=put(s,0,'grave',STEN);
 const ally=put(s,0,'battle',sacrifice==='protected'?COMPLEX:SMALL);
 next(s);
 assert.equal(s.active,1);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',sten));
 next(s);
 if(s.decision?.type==='effectOrder')order(s,sten);
 assert.equal(s.decision?.task?.op,'g34_SacrificeAlly413');
 s=roundtrip(s);
 pick(s,sacrifice==='none'?null:ally.uid);
 drain(s);
 assert.ok(has(s,0,sacrifice==='none'?'grave':'battle',sten));
 assert.ok(has(s,0,sacrifice==='ally'?'grave':'battle',ally));
});

for(const id of [SERAPH,STEN])test('Slayer destroys the stronger creature after battle for '+id,()=>{
 const s=setup(),slayer=put(s,0,'battle',id);
 const enemy=put(s,1,'battle',BIG,{tapped:true});
 attack(s,slayer.uid,enemy.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,0,'grave',slayer)&&has(s,1,'grave',enemy));
});

test('each active Tres adds a separate G Strike alongside a Dreammate shield’s printed one',()=>{
 let s=setup();
 const foes=[SMALL,SMALL,SMALL].map(id=>put(s,0,'battle',id));
 for(let i=0;i<2;i++)put(s,1,'battle',TRES,{hyperActive:true,hyperResolved:true});
 give(s,1,'shields',['dmrp19-093',SMALL]);
 attack(s,foes[0].uid);
 act(s,'noBlock');
 for(const use of [true,false,true]){
  assert.equal(s.decision?.task?.op,'gsDeclare');
  pick(s,use);
 }
 s=roundtrip(s);
 for(const foe of foes.slice(1)){
  assert.equal(s.decision?.task?.op,'gsTarget');
  pick(s,foe.uid);
  assert.equal(e.attackLocked(s,0,foe),true);
 }
 assert.equal(s.decision,null);
});

test('Stenyanko can sacrifice when a restriction prevents its move from the graveyard',()=>{
 const s=setup(),sten=put(s,0,'grave',STEN),ally=put(s,0,'battle',SMALL);
 put(s,1,'battle','dmrp22-042');
 next(s);
 next(s);
 assert.equal(s.decision?.task?.op,'g34_SacrificeAlly413');
 pick(s,ally.uid);
 drain(s);
 assert.ok(has(s,0,'grave',ally)&&has(s,0,'grave',sten));
});
