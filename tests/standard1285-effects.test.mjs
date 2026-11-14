import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const JAGI='dm22rp2-018',FLARE='dm22rp2-008',BALA='dm22rp2-S6';
const N='dm01-108',W='dm01-083',F='dm01-097',L='dm01-075';
const CHEST='dm22rp2-026',SEED='dm22rp1-054',FIRE_SEED='dmsd21-014',BOL='dm01-008';
const phase=1285;
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1285.json',import.meta.url)));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(N));
 return s;
}
function add(s,p,zone,id,extra={}){
 const x=Object.assign(inst(id),extra);s.players[p][zone].push(x);return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;
}
const pick=(s,id)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===id;
});
const options=s=>s.decision.choices.map(({value})=>value?.uid??value);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const save=s=>JSON.parse(JSON.stringify(s));
function nextTurn(s){s.phase='attack';act(s,'endTurn');drain(s);}
function passBlock(s){if(s.decision?.type==='block')act(s,'noBlock');}

test('fourteen official prints share three canonical IDs, complete specs and regulation limits',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[JAGI,FLARE,BALA]);
 assert.equal(manifest.printAliases.length,11);
 for(const x of [...manifest.cards,...manifest.printAliases]){
  const id=x.canonicalId??x.id,c=e.card(id),face=x.faces[0];
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [face.cost,Number(face.powerText),1,face.civilizations,face.race,4]);
  assert.equal(manifest.regulationVerification.limits[x.id],4);
  assert.equal(nameKey(c.name),nameKey(x.name));
  assert.deepEqual(standardCardSpec({...x,status:'complete'},{phase}),x.spec);
  assert.equal(registry.get(x.id).id,id);
  if(!x.canonicalId)assert.equal(CARD_IMAGES[id],x.image);
  assert.deepEqual(refs.find(y=>y.id===x.id),{id:x.id,canonicalId:id,name:x.name,image:x.image,source:x.source});
  const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Jagi resolves two mandatory own choices per player, then destroys the rest as one batch',()=>{
 let s=field();
 const own=add(s,0,'battle',N),ownLoss=add(s,0,'battle',W);
 const seed=add(s,0,'battle',CHEST),seedLoss=add(s,0,'battle',SEED);
 const their=add(s,1,'battle','dm22rp2-032',{justDiverActive:true}),theirLoss=add(s,1,'battle',F);
 const theirSeed=add(s,1,'battle',SEED),theirSeedLoss=add(s,1,'battle',CHEST);
 const seal=add(s,1,'battle',W),other=add(s,1,'battle','dmrp08-005');
 (s.players[1].seals??=[]).push({...inst(N),sealOf:seal.uid});
 const spell=play(s,JAGI);
 assert.equal(s.decision.player,0);assert.deepEqual(options(s),[own.uid,ownLoss.uid]);pick(s,own.uid);
 assert.equal(s.decision.player,0);assert.deepEqual(options(s),[seed.uid,seedLoss.uid]);pick(s,seed.uid);
 s=save(s);assert.equal(s.decision.player,1);assert.deepEqual(options(s),[their.uid,theirLoss.uid]);pick(s,their.uid);
 assert.ok(has(s,0,'battle',ownLoss)&&has(s,1,'battle',theirLoss));
 assert.equal(s.decision.player,1);pick(s,theirSeed.uid);drain(s);
 for(const [p,x] of [[0,own],[0,seed],[1,their],[1,theirSeed],[1,seal],[1,other]])assert.ok(has(s,p,'battle',x),x.cardId);
 for(const [p,x] of [[0,spell],[0,ownLoss],[0,seedLoss],[1,theirLoss],[1,theirSeedLoss]])assert.ok(has(s,p,'grave',x),x.cardId);
});

test('Jagi permits a live hybrid in the creature slot and skips unavailable card types (QA 42500)',()=>{
 const s=field(),hybrid=add(s,1,'battle',BALA);
 const rest=[F,F,F].map(id=>add(s,1,'battle',id));
 assert.ok(e.isCreature(s,hybrid));play(s,JAGI);
 assert.equal(s.decision.player,1);
 assert.deepEqual(options(s),[hybrid.uid,...rest.map(x=>x.uid)]);pick(s,hybrid.uid);drain(s);
 assert.ok(has(s,1,'battle',hybrid)&&rest.every(x=>has(s,1,'grave',x)));
});

test('Jagi requires only the seed choice when a hybrid lacks enough fire permanents',()=>{
 const s=field(),a=add(s,1,'battle',BALA),b=add(s,1,'battle',CHEST);
 assert.ok(!e.isCreature(s,a));
 play(s,JAGI);assert.equal(s.decision.player,1);
 assert.deepEqual(options(s),[a.uid,b.uid]);pick(s,b.uid);drain(s);
 assert.ok(has(s,1,'grave',a)&&has(s,1,'battle',b));
});

test('Jagi offers destruction replacements with both players’ losses in the same batch',()=>{
 const s=field(),kept=add(s,0,'battle',N),lost=add(s,0,'battle',F);
 const otherKept=add(s,1,'battle',N),otherLost=add(s,1,'battle',F);
 const strato=add(s,1,'battle','dm22rp2-048');
 play(s,JAGI);pick(s,kept.uid);pick(s,otherKept.uid);pick(s,strato.uid);
 assert.equal(s.decision.type,'leaveReplace');
 assert.deepEqual(new Set(s.leaving.rows.map(x=>x.uid)),new Set([lost.uid,otherLost.uid]));
 act(s,'g47Replace');
 while(s.decision?.type==='leaveReplace')act(s,s.decision.foreignOnly?'g47Decline':'allowLeave');
 drain(s);
 assert.ok(has(s,0,'mana',lost)&&has(s,1,'grave',otherLost));
});

test('Flare counts actual creatures untapped by the turn start and honors the two-mana minimum (QA 38590)',()=>{
 for(const n of [0,2,5]){
  let s=field(1);
  for(let i=0;i<n;i++)add(s,0,'battle',N,{tapped:true});
  add(s,0,'battle',N);add(s,0,'battle',CHEST,{tapped:true});
  const frozen=add(s,0,'battle',N,{tapped:true,skipUntap:true});
  const spell=add(s,0,'hand',FLARE);
  nextTurn(s);s=save(s);act(s,'skipCharge');
  assert.equal(frozen.tapped,true);
  assert.equal(e.getLegalActions(s).find(a=>a.uid===spell.uid&&a.kind==='play')?.cost,5-Math.min(n,3));
  act(s,'play',a=>a.uid===spell.uid);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5-Math.min(n,3));
  pick(s,0);pick(s,0);drain(s);
 }
});

test('Flare ignores later untaps and the previous turn in both actions and CPU observation',()=>{
 const s=field(1);
 const ready=add(s,0,'battle',N,{tapped:true}),late=add(s,0,'battle',F,{tapped:true,skipUntap:true});
 const spell=add(s,0,'hand',FLARE);
 nextTurn(s);act(s,'skipCharge');
 assert.ok(!ready.tapped&&late.tapped);
 play(s,'dm22rp2-055');pick(s,late.uid);drain(s);
 assert.ok(!late.tapped);
 assert.equal(e.getLegalActions(s).find(a=>a.uid===spell.uid)?.cost,4);
 assert.deepEqual(e.observation(s,0).g1285StartUntap,{turn:s.turn,player:0,count:1});
 nextTurn(s);
 assert.equal(e.observation(s,0).g1285StartUntap,undefined);
 assert.equal(e.summonCost(s,0,e.card(FLARE)),5);
});

test('Flare preselects repeated modes before drawing and can put the drawn creatures into battle',()=>{
 const s=field();
 give(s,0,'deck',[F,L,...Array(12).fill(N)]);
 const [fire,light]=s.players[0].deck;
 const ineligible=add(s,0,'hand',N),tooBig=add(s,0,'hand',BOL);
 const spell=play(s,FLARE);pick(s,1);
 assert.equal(s.players[0].deck[0].uid,fire.uid);
 pick(s,1);assert.deepEqual(options(s),[fire.uid]);pick(s,fire.uid);
 assert.deepEqual(options(s),[light.uid]);pick(s,light.uid);drain(s);
 assert.ok(has(s,0,'battle',fire)&&has(s,0,'battle',light)&&has(s,0,'grave',spell));
 assert.ok(has(s,0,'hand',ineligible)&&has(s,0,'hand',tooBig));
});

test('Flare taps two legal opponents, and gives one fresh creature haste and battle-only power',()=>{
 const s=field();
 const a=add(s,1,'battle',W),b=add(s,1,'battle',W),c=add(s,1,'battle','dm01-103');
 const d=add(s,1,'battle','dm22rp2-032',{justDiverActive:true});
 const ally=add(s,0,'battle',F,{entered:s.turn});
 play(s,FLARE);pick(s,2);pick(s,0);
 assert.deepEqual(options(s),[a.uid,b.uid,c.uid]);pick(s,a.uid);pick(s,b.uid);
 pick(s,ally.uid);drain(s);
 assert.deepEqual([a,b,c,d].map(x=>x.tapped),[true,true,false,false]);
 assert.equal(e.power(ally,false,s),2000);assert.equal(e.matchupPower(ally,a,true,s),6000);
 assert.ok(e.canCreatureAttack(s,0,ally));
 nextTurn(s);assert.equal(e.matchupPower(ally,a,false,s),2000);assert.ok(!e.effectiveCard(ally,s).speedAttacker);
});

test('Flare stacks both battle power bonuses on the same creature if both modes select it',()=>{
 const s=field(),ally=add(s,0,'battle',F),enemy=add(s,1,'battle',W);
 play(s,FLARE);pick(s,2);pick(s,2);pick(s,ally.uid);pick(s,ally.uid);drain(s);
 assert.equal(e.matchupPower(ally,enemy,true,s),10000);
 assert.equal(e.power(ally,true,s),2000);
});

test('Flare keeps battle power and haste on its target when it evolves',()=>{
 const s=field(),base=add(s,0,'battle',N),foe=add(s,1,'battle',W);
 play(s,FLARE);pick(s,2);pick(s,2);pick(s,base.uid);pick(s,base.uid);drain(s);
 const evolution=play(s,'dm02-033');act(s,'evolve',a=>a.baseUid===base.uid);drain(s);
 assert.ok(e.effectiveCard(evolution,s).speedAttacker);
 assert.equal(e.matchupPower(evolution,foe,true,s)-e.power(evolution,true,s),8000);
});

test('Bala watches an allied Bolshack even while a seed, and puts a matching revealed creature into battle',()=>{
 const s=field(),bala=play(s,BALA),bol=add(s,0,'battle',BOL);
 const top=s.players[0].deck[0];top.cardId=F;
 assert.ok(!e.isCreature(s,bala));
 attack(s,bol.uid);passBlock(s);drain(s);
 assert.ok(has(s,0,'battle',top));
 assert.ok(s.log.some(x=>x.cardId===BALA&&x.type==='reveal'&&x.text.includes(e.card(F).name)));
 assert.equal(s.metrics[0].played[F],undefined);
 assert.ok(!s.players[0].g34Protected?.length);
});

test('Bala counts fire creatures and seeds once and can attack immediately at four fire permanents',()=>{
 const s=field();give(s,0,'battle',[F,F,FIRE_SEED]);
 const bala=play(s,BALA);const top=s.players[0].deck[0];top.cardId=FIRE_SEED;
 assert.ok(e.isCreature(s,bala)&&e.canCreatureAttack(s,0,bala));
 assert.equal(e.effectiveCard(bala,s).breaker,2);
 attack(s,bala.uid);passBlock(s);drain(s);
 assert.ok(has(s,0,'battle',top));
 assert.equal(s.players[1].shields.length,3);
});

test('Bala puts a nonmatching card in the graveyard and ignores attacks without a Bolshack name',()=>{
 for(const id of [W,FLARE,'dm22rp2-041']){
  const s=field(),bol=add(s,0,'battle',BOL),other=add(s,0,'battle',F);
  add(s,0,'battle',BALA);
  const top=s.players[0].deck[0];top.cardId=id;
  attack(s,other.uid);passBlock(s);drain(s);assert.ok(has(s,0,'deck',top));
  attack(s,bol.uid);passBlock(s);drain(s);assert.ok(has(s,0,'grave',top));
 }
});

test('separate Bala watchers use successive library cards and can deploy a matching twinpact creature',()=>{
 const s=field(),attacker=add(s,0,'battle',BOL),first=add(s,0,'battle',BALA);
 add(s,0,'battle',BALA);
 give(s,0,'deck',[W,'dmex04-027',...Array(10).fill(N)]);
 const [discarded,played]=s.players[0].deck;
 attack(s,attacker.uid);act(s,'orderEffect',a=>a.uid===first.uid);drain(s);
 assert.ok(has(s,0,'grave',discarded)&&has(s,0,'battle',played));
});

test('Bala keeps a matching card at the top if deployment is prohibited and releases the reveal',()=>{
 for(const restriction of ['dmrp01-012','dmrp07-m01']){
  const s=field(),bol=add(s,0,'battle',BOL);
  add(s,0,'battle',BALA);add(s,1,'battle',restriction);
  const top=s.players[0].deck[0];top.cardId=F;
  attack(s,bol.uid);passBlock(s);drain(s);
  assert.equal(s.players[0].deck[0].uid,top.uid);
  assert.equal(s.log.some(x=>x.cardId===BALA&&x.type==='reveal'),restriction==='dmrp01-012');
  assert.ok(!s.players[0].g34Protected?.length);
 }
});
