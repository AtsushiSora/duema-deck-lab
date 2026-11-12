import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const PAR='dmrp21-052',WALTZ='dmex13-009',KEN='dm24rp2-022',KEN_REPRINT='dm24ex3-029';
const WATER='dm01-083',NATURE='dm01-108',FIRE='dm01-097',SEED='dm22ex1-086',LIFE='dm06-110';
const ARCADIAS='dmrp18-km1',DEMON_HAND='dm01-027',DUG='dmrp07-042',BLOCKER='dm01-076';
const WATER_BLOCKER='dm01-048',POKO='dmex13-018',REX='dmrp18-060';
const TWIN='dm22ex1-062',TRIGGER='dm23-051',COST_THREE='dm01-103';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const live=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const restore=s=>decodeBattleData(encodeBattleData(s));

function add(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function end(s){
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}

test('Three official definitions and the Toolbox reprint keep canonical IDs, images and limits',()=>{
 const manifest=read('tools/support-phase-1048.json'),catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[PAR,WALTZ,KEN]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[[KEN_REPRINT,KEN]]);
 assert.deepEqual(catalogue.resolveRows([KEN,KEN_REPRINT].map(id=>({id,count:1}))),[{id:KEN,count:2}]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],base=manifest.cards.find(x=>x.id===id);
  assert.equal(catalogue.get(row.id).id,id);
  assert.ok(catalogue.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,manifest.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[id],base.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1048}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

test('Paradiso enters on a water base and can recover a seed, spell or spell face when it taps to attack',()=>{
 let s=field();
 const par=add(s,0,'hand',PAR),base=add(s,0,'battle',WATER);
 const seed=add(s,0,'grave',SEED),spell=add(s,0,'grave',LIFE),twin=add(s,0,'grave',TWIN),other=add(s,0,'grave',NATURE);
 const all=physical(s);
 play(s,par);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.decision,null);
 assert.equal(par.under[0].uid,base.uid);
 assert.ok(e.effectiveCard(par,s).blocker);
 attack(s,par.uid);
 assert.deepEqual(new Set(choices(s)),new Set([seed.uid,spell.uid,twin.uid,null]));
 assert.ok(!choices(s).includes(other.uid));
 s=restore(s);
 pick(s,twin.uid);
 drain(s);
 assert.ok(has(s,0,'hand',twin)&&has(s,0,'grave',seed));
 assert.deepEqual(physical(s),all);
});

test('Paradiso accepts a non-water RexStars base and excludes an unrelated nature creature',()=>{
 const s=field(),par=add(s,0,'hand',PAR),rex=add(s,0,'battle',REX),plain=add(s,0,'battle',NATURE);
 play(s,par);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='evolve'&&a.baseUid===plain.uid));
 act(s,'evolve',a=>a.baseUid===rex.uid);
 assert.equal(par.under[0].uid,rex.uid);
});

test('Paradiso enters tapped without recovering a card under the Arcadias ruling',()=>{
 const s=field(),par=add(s,0,'hand',PAR),base=add(s,0,'battle',WATER),spell=add(s,0,'grave',LIFE);
 add(s,1,'battle',ARCADIAS);
 play(s,par);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(par.tapped&&has(s,0,'grave',spell));
 assert.equal(s.decision,null);
});

test('Paradiso can recover by blocking and Star Evolution leaves the base after destruction',()=>{
 const s=field(),par=add(s,0,'hand',PAR),base=add(s,0,'battle',WATER),seed=add(s,0,'grave',SEED);
 play(s,par);
 act(s,'evolve',a=>a.baseUid===base.uid);
 s.active=1;
 const attacker=add(s,1,'battle',FIRE);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===par.uid);
 pick(s,seed.uid);
 drain(s);
 assert.ok(has(s,0,'hand',seed)&&has(s,1,'grave',attacker));
 s.phase='main';
 play(s,add(s,1,'hand',DEMON_HAND));
 drain(s);
 assert.ok(has(s,0,'grave',par)&&has(s,0,'battle',base));
});

test('Waltz can decline its turn-start effect without moving any shield',()=>{
 const s=Object.assign(field(),{active:1}),waltz=add(s,0,'battle',WALTZ);
 const blocker=add(s,0,'grave',BLOCKER);
 end(s);
 assert.ok(choices(s).includes(null));
 pick(s,null);
 assert.ok(has(s,0,'grave',blocker)&&has(s,0,'battle',waltz));
 assert.equal(s.players[0].shields.length,5);
});

test('Waltz can revive a light or dark blocker, including Dug without retroactive turn-start destruction',()=>{
 const s=Object.assign(field(),{active:1});
 add(s,0,'battle',WALTZ);
 const dug=add(s,0,'grave',DUG),light=add(s,0,'grave',BLOCKER),plain=add(s,0,'grave',NATURE);
 add(s,0,'grave',WATER_BLOCKER);
 const shield=s.players[0].shields[0];
 end(s);
 pick(s,shield.uid);
 assert.deepEqual(new Set(choices(s)),new Set([dug.uid,light.uid]));
 pick(s,dug.uid);
 drain(s);
 assert.ok(has(s,0,'grave',shield)&&has(s,0,'grave',plain)&&has(s,0,'battle',dug));
 assert.equal(s.players[0].shields.length,4);
});

test('Waltz creates a new face-down shield when tapped by blocking and keeps W Breaker',()=>{
 const s=Object.assign(field(),{active:1}),waltz=add(s,0,'battle',WALTZ),top=s.players[0].deck[0];
 const attacker=add(s,1,'battle',FIRE),all=physical(s);
 assert.equal(e.effectiveCard(waltz,s).breaker,2);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===waltz.uid);
 drain(s);
 assert.equal(s.players[0].shields.length,6);
 assert.ok(has(s,0,'shields',top)&&!top.faceUp&&has(s,1,'grave',attacker));
 assert.deepEqual(physical(s),all);
});

test('Waltz and Poko’s Abare Chain can be resolved in either order on the first attack',()=>{
 for(const first of [WALTZ,POKO]){
  const s=field(),waltz=add(s,0,'battle',WALTZ),top=s.players[0].deck[0];
  add(s,0,'battle',POKO);
  attack(s,waltz.uid);
  assert.equal(s.decision.type,'effectOrder');
  assert.deepEqual(new Set(e.getLegalActions(s).map(a=>a.cardId)),new Set([WALTZ,POKO]));
  act(s,'orderEffect',a=>a.cardId===first);
  assert.equal(has(s,0,'shields',top),first===WALTZ);
  drain(s);
  assert.ok(has(s,0,'shields',top));
 }
});

test('Toolbox adds a shield to hand without allowing the shield trigger',()=>{
 const s=field(),ken=add(s,0,'hand',KEN);
 give(s,0,'shields',[TRIGGER,NATURE]);
 const shield=s.players[0].shields[0],all=physical(s);
 play(s,ken);
 assert.deepEqual(choices(s),s.players[0].shields.map(x=>x.uid));
 pick(s,shield.uid);
 assert.ok(has(s,0,'hand',shield)&&!has(s,0,'battle',shield));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
 assert.deepEqual(physical(s),all);
});

test('Toolbox may discard a twinpact and use its spell cost to destroy only a strictly cheaper creature',()=>{
 let s=Object.assign(field(),{active:1});
 const ken=add(s,0,'battle',KEN),twin=add(s,0,'hand',TWIN),seed=add(s,1,'battle',SEED);
 const cheaper=add(s,1,'battle',FIRE),equal=add(s,1,'battle',COST_THREE);
 ken.tapped=true;
 end(s);
 assert.ok(choices(s).includes(null)&&choices(s).includes(twin.uid));
 pick(s,twin.uid);
 assert.deepEqual(new Set(choices(s)),new Set([9,3]));
 s=restore(s);
 pick(s,3);
 assert.deepEqual(choices(s),[cheaper.uid]);
 pick(s,cheaper.uid);
 assert.ok(has(s,0,'grave',twin)&&has(s,1,'grave',cheaper));
 assert.ok(has(s,1,'battle',equal)&&has(s,1,'battle',seed)&&!live(s,0,'battle',ken).tapped);
});

test('Toolbox can discard a spell with no creature face, or decline the untap effect',()=>{
 for(const decline of [true,false]){
  const s=Object.assign(field(),{active:1});
  const ken=add(s,0,'battle',KEN),spell=add(s,0,'hand',LIFE),enemy=add(s,1,'battle',BLOCKER);
  ken.tapped=true;
  end(s);
  pick(s,decline?null:spell.uid);
  if(!decline)pick(s,enemy.uid);
  assert.equal(has(s,0,'hand',spell),decline);
  assert.equal(has(s,1,'battle',enemy),decline);
 }
});
