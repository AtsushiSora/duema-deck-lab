import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const LUC='dm23ex3-022',KAN='dm23ex3-025',SHER='dm24bd6-003',SCO='dm23ex3-006',REPRINT='dm24bd6-037';
const N='dm01-108',LIGHT='dm01-075',DARK='dm01-090',FIRE='dm01-097',BLOCKER='dm01-076';
const SPARK='dm01-015',BASIL='dm23ex3-033',SEED='dm22ex1-086',ZENITH='dm23ex1-010';

function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const cast=(s,x,origin='hand')=>act(s,'play',a=>a.uid===x.uid&&(a.origin||'hand')===origin);
const restore=s=>decodeBattleData(encodeBattleData(s));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}
function crystal(s,n,p=0){
 for(const x of s.players[p].mana.slice(0,n))x.faceDown=true;
}

test('four whole official card definitions and the alternate print preserve names, IDs, art and limits',()=>{
 const read=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url)));
 const m=read('tools/support-phase-1038.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[LUC,KAN,SHER,SCO]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,LUC]]);
 assert.deepEqual(registry.resolveRows([{id:REPRINT,count:1}]),[{id:LUC,count:1}]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,registered=registry.get(row.id),f=row.faces[0],base=m.cards.find(r=>r.id===id);
  const c=e.card(id);
  assert.ok(registered.supported&&row.verification.facesMatched);
  assert.deepEqual([registered.id,c.name,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [id,row.name,f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[id],base.image);
  assert.equal(refs.find(r=>r.id===row.id).image,row.image);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1038}),base.spec);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

for(const crystals of [3,4])test('Lucanid destroys a live Blocker up to 11000 and burns two shield groups only at four crystals '+crystals,()=>{
 let s=setup();
 crystal(s,crystals);
 give(s,1,'shields',[SPARK,N]);
 const [a,b]=s.players[1].shields,extra=inst(N);
 a.shieldStack=[extra];
 const attacker=add(s,0,'hand',LUC);
 const blocker=add(s,1,'battle',BLOCKER,{powerModifiers:[{amount:11000-e.card(BLOCKER).power}]});
 const large=add(s,1,'battle',BLOCKER,{powerModifiers:[{amount:11500-e.card(BLOCKER).power}]});
 const plain=add(s,1,'battle',N),all=physical(s);
 cast(s,attacker);
 assert.equal(e.effectiveCard(attacker,s).speedAttacker,true);
 attack(s,attacker.uid);
 assert.deepEqual(values(s),[blocker.uid]);
 choose(s,blocker.uid);
 assert.ok(has(s,1,'grave',blocker));
 assert.ok(has(s,1,'battle',large)&&has(s,1,'battle',plain));
 s=restore(s);
 act(s,'noBlock');
 if(crystals===3){
  assert.ok(e.getLegalActions(s).some(x=>x.kind==='useTrigger'));
  act(s,'skipTrigger');
 }
 assert.equal(s.players[1].shields.length,0);
 for(const x of [a,b,extra])assert.ok(has(s,1,crystals===4?'grave':'hand',x));
 assert.deepEqual(physical(s),all);
});

test('Kanaza privately looks at four, reveals up to one of each race, then offers the mana flip',()=>{
 let s=setup();
 give(s,0,'deck',[SEED,BASIL,LUC,ZENITH,N,N,N]);
 const [seed,basil,luc,zenith,next]=s.players[0].deck,mana=s.players[0].mana.at(-1),kan=add(s,0,'hand',KAN),all=physical(s);
 cast(s,kan);
 assert.deepEqual(values(s),[seed.uid,basil.uid,null]);
 assert.equal(s.decision.task.g585Peek.length,4);
 choose(s,seed.uid);
 assert.deepEqual(values(s),[luc.uid,null]);
 assert.ok(!has(s,0,'hand',seed));
 s=restore(s);
 choose(s,luc.uid);
 assert.deepEqual(values(s),[zenith.uid,null]);
 choose(s,zenith.uid);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[seed.uid,luc.uid,zenith.uid]);
 assert.deepEqual(s.log.filter(x=>x.type==='reveal'&&x.text.startsWith('呪華のサトリ カナザー')).map(x=>x.cardId),[SEED,LUC,ZENITH]);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 assert.equal(s.players[0].deck.at(-1).uid,basil.uid);
 assert.equal(s.decision.task.op,'g34_ManaDown426');
 choose(s,mana.uid);
 assert.ok(s.players[0].mana.find(x=>x.uid===mana.uid).faceDown);
 assert.deepEqual(physical(s),all);
});

test('Kanaza can skip every race, order the four remaining cards, and decline the flip',()=>{
 const s=setup();
 give(s,0,'deck',[BASIL,LUC,ZENITH,N,N,N]);
 const examined=s.players[0].deck.slice(0,4),kan=add(s,0,'hand',KAN);
 cast(s,kan);
 for(const _ of examined.slice(0,3))choose(s,null);
 assert.equal(s.decision.task.op,'g34_Order');
 for(const x of examined.slice(1).reverse())choose(s,x.uid);
 assert.deepEqual(s.players[0].deck.slice(-4).map(x=>x.uid),examined.slice().reverse().map(x=>x.uid));
 choose(s,null);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.players[0].mana.some(x=>x.faceDown),false);
});

for(const crystals of [1,2])test('Kanaza attacks with a physical mana count limit on optional hand deployment '+crystals,()=>{
 const s=setup(),kan=add(s,0,'battle',KAN);
 give(s,0,'mana',[N,N,N,LIGHT,FIRE,DARK,N]);
 crystal(s,crystals);
 const exact=add(s,0,'hand',LUC),tooHigh=add(s,0,'hand',SHER),nonCreature=add(s,0,'hand',SPARK);
 attack(s,kan.uid);
 if(crystals===2){
  assert.deepEqual(values(s),[exact.uid,null]);
  choose(s,exact.uid);
  assert.ok(has(s,0,'battle',exact));
 }
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,0,'hand',tooHigh)&&has(s,0,'hand',nonCreature));
 assert.equal(has(s,0,'hand',exact),crystals===1);
});

test('Sherlock waits for both choices, then destroys the other creatures in one movement',()=>{
 let s=setup();
 crystal(s,4);
 const sher=add(s,0,'hand',SHER),keep=add(s,0,'battle',N),dead=add(s,0,'battle',N),enemy=add(s,1,'battle',N);
 const deadEnemy=add(s,1,'battle',N),seed=add(s,1,'battle',SEED),all=physical(s);
 cast(s,sher);
 assert.equal(s.decision.player,0);
 assert.deepEqual(new Set(values(s)),new Set([sher.uid,keep.uid,dead.uid]));
 choose(s,keep.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[enemy.uid,deadEnemy.uid]);
 assert.ok(has(s,0,'battle',sher)&&has(s,0,'battle',dead)&&has(s,1,'battle',deadEnemy));
 s=restore(s);
 choose(s,enemy.uid);
 assert.deepEqual(s.players[0].battle.map(x=>x.uid),[keep.uid]);
 assert.deepEqual(s.players[1].battle.map(x=>x.uid),[enemy.uid,seed.uid]);
 assert.ok(has(s,0,'grave',sher)&&has(s,0,'grave',dead)&&has(s,1,'grave',deadEnemy));
 assert.deepEqual(physical(s),all);
});

test('Sherlock skips an empty side and grants all three abilities continuously, including to itself',()=>{
 const s=setup(),sher=add(s,0,'hand',SHER),dead=add(s,0,'battle',N);
 crystal(s,4);
 cast(s,sher);
 choose(s,sher.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',dead));
 const ally=add(s,0,'hand',N);
 cast(s,ally);
 for(const x of [sher,ally]){
  const c=e.effectiveCard(x,s);
  assert.equal(c.blocker,true);
  assert.equal(c.speedAttacker,true);
  assert.equal(c.slayer,true);
 }
 s.players[0].mana[3].faceDown=false;
 assert.equal(!!e.effectiveCard(sher,s).blocker,false);
 assert.equal(!!e.effectiveCard(ally,s).slayer,false);
});

test('Scorpio pays a regular Darkness summon from grave, flips on entry, and can decline next own start',()=>{
 const s=setup(),scorpio=add(s,0,'grave',SCO),mana=s.players[0].mana.at(-1);
 crystal(s,3);
 const summons=e.getLegalActions(s).filter(x=>x.kind==='play'&&x.uid===scorpio.uid);
 assert.ok(summons.some(x=>x.origin==='grave'&&x.cost===6));
 cast(s,scorpio,'grave');
 assert.equal(e.effectiveCard(scorpio,s).blocker,true);
 assert.equal(e.effectiveCard(scorpio,s).breaker,2);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
 choose(s,mana.uid);
 assert.ok(mana.faceDown);
 end(s);
 assert.equal(s.decision,null);
 end(s);
 assert.equal(s.decision.task.op,'g34_ManaDown426');
 assert.equal(s.decision.player,0);
 choose(s,null);
 assert.equal(s.players[0].mana.filter(x=>x.faceDown).length,4);
});

for(const crystals of [3,4])test('Scorpio taps opponent mana, creatures, and noncreature cards only at crystal armor four '+crystals,()=>{
 const s=Object.assign(setup(),{active:1,phase:'charge'}),scorpio=add(s,0,'battle',SCO);
 crystal(s,crystals);
 const charged=add(s,1,'hand',N),creature=add(s,1,'hand',N),seed=add(s,1,'hand',SEED);
 act(s,'charge',x=>x.uid===charged.uid);
 assert.equal(!!charged.tapped,crystals===4);
 cast(s,creature);
 assert.equal(!!creature.tapped,crystals===4);
 cast(s,seed);
 assert.equal(!!seed.tapped,crystals===4);
 scorpio.sealed=true;
 const unaffected=add(s,1,'hand',N);
 cast(s,unaffected);
 assert.equal(!!unaffected.tapped,false);
});
