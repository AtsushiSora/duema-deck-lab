import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD580_DECK} from '../tools/fixtures/standard580.mjs';

const {cards}=JSON.parse(readFileSync(new URL('../tools/support-phase-580.json',import.meta.url)));
const GIGA='dmr23-s02', WAVE='dmex14-074', KIGU='dmrp12-092', GOBLET='dm22rp2-039';
const CANNON='dmr15-050', MEGA='dmx23-007', SARDINE='dmrp19-034', CORAL='dmrp06-s04', LIB='dmrp10-031';
const FIRE='dm01-097', WATER='dm01-083', DARK='dm01-090', SEED='dmsd20-016', FIELD='dm23ex2-071';
const MID='dm26rp3-068', HIGH='dm05-s04', NEXT='dm24bd3-009', MULTI='dm23rp4-045';
const BLOCK='dm10-047', COMMAND='dmrp06-066';

function field(active=0){
  const s=setup();
  s.active=active;
  for(const p of [0,1])give(s,p,'deck',Array(28).fill(FIRE));
  return s;
}
function put(s,p,id,zone='battle'){
  const x=inst(id);
  s.players[p][zone].push(x);
  return x;
}
function play(s,id){
  const x=put(s,s.active,id,'hand');
  act(s,'play',a=>a.uid===x.uid);
  return x;
}
const choiceValue=o=>o.value?.uid??o.value;
function pick(s,value){
  act(s,'extended',a=>choiceValue(s.decision.choices[a.choice])===value);
}
function finish(s){
  for(let n=0;s.decision&&s.winner===null;n++){
    assert.ok(n<100,JSON.stringify(s.decision));
    const pass=e.getLegalActions(s).find(a=>a.kind==='noBlock');
    e.step(s,pass??e.chooseAI(s));
  }
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const targets=s=>s.decision?.choices?.map(choiceValue)??[];

for(const row of cards)test(row.name+' preserves the complete verified definition',()=>{
  const detail=details.cards.find(d=>d.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:580}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:579}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
});

for(const removeField of [false,true])test('Gigaspeed rechecks the D2 field after moving one physical card '+removeField,()=>{
  const s=field(),d2=put(s,0,FIELD),host=put(s,1,NEXT),under=inst(FIRE),other=put(s,1,WATER);
  host.under=[under];
  const x=play(s,GIGA),before=physical(s);
  assert.ok(!targets(s).includes(x.uid));
  assert.ok(targets(s).includes(under.uid)&&targets(s).includes(d2.uid));
  pick(s,removeField?d2.uid:under.uid);
  if(!removeField){assert.ok(targets(s).includes(other.uid));pick(s,other.uid);}
  assert.equal(s.decision,null);
  assert.ok(has(s,removeField?0:1,'hand',removeField?d2:under));
  assert.equal(has(s,1,'hand',other),!removeField);
  assert.deepEqual(physical(s),before);
});

test('Gigaspeed makes only allied Water Commands unblockable',()=>{
  const s=field(),giga=put(s,0,GIGA),command=put(s,0,COMMAND),water=put(s,0,WATER);
  put(s,1,BLOCK);
  assert.equal(e.effectiveCard(command,s).unblockable,true);
  assert.ok(!e.effectiveCard(water,s).unblockable);
  attack(s,command.uid);
  assert.deepEqual(e.getLegalActions(s).map(a=>a.kind),['noBlock']);
  finish(s);
  assert.ok(has(s,0,'battle',giga));
});

for(const dest of ['hand','mana'])test('Wave lets the owner choose where the selected card goes '+dest,()=>{
  let s=field(),host=put(s,1,NEXT),base=inst(MULTI);
  host.under=[base];
  const spell=play(s,WAVE),before=physical(s);
  assert.equal(s.decision.player,0);
  pick(s,base.uid);
  assert.equal(s.decision.player,1);
  assert.deepEqual(targets(s),['mana','hand']);
  s=JSON.parse(JSON.stringify(s));
  pick(s,dest);
  assert.ok(has(s,1,dest,base)&&has(s,1,'battle',host)&&has(s,0,'grave',spell));
  if(dest==='mana')assert.ok(s.players[1].mana.find(x=>x.uid===base.uid).tapped);
  assert.deepEqual(physical(s),before);
});

test('Wave may reveal a multicolor card after charging to untap itself',()=>{
  const s=field(),wave=put(s,0,WAVE,'hand'),multi=put(s,0,MULTI,'hand'),mono=put(s,0,FIRE,'hand');
  s.phase='charge';
  act(s,'charge',a=>a.uid===wave.uid);
  assert.ok(wave.tapped);
  assert.deepEqual(targets(s),[multi.uid,null]);
  pick(s,multi.uid);
  assert.ok(!wave.tapped&&has(s,0,'hand',multi)&&has(s,0,'hand',mono));
});

test('Kigurumi triggers after a prior attack that turn by a different creature',()=>{
  const s=field(),a=put(s,0,KIGU),first=put(s,0,FIRE),victim=put(s,1,SEED),high=put(s,1,HIGH);
  attack(s,first.uid);
  act(s,'noBlock');
  finish(s);
  attack(s,a.uid);
  assert.deepEqual(targets(s),[victim.uid,null]);
  pick(s,victim.uid);
  assert.ok(has(s,1,'grave',victim)&&has(s,1,'battle',high));
});

test('Kigurumi has no removal on the first attack of a turn',()=>{
  const s=field(),a=put(s,0,KIGU),victim=put(s,1,SEED);
  attack(s,a.uid);
  assert.equal(s.decision.type,'block');
  finish(s);
  assert.ok(has(s,1,'battle',victim));
});

test('Goblet excludes only the physical card first chosen by the opponent',()=>{
  let s=field(),host=put(s,1,NEXT),base=inst(FIRE),seed=put(s,1,SEED);
  host.under=[base];
  const x=play(s,GOBLET),before=physical(s);
  assert.equal(s.decision.player,1);
  assert.deepEqual(new Set(targets(s)),new Set([host.uid,base.uid,seed.uid]));
  pick(s,host.uid);
  assert.equal(s.decision.player,0);
  assert.deepEqual(new Set(targets(s)),new Set([base.uid,seed.uid]));
  s=JSON.parse(JSON.stringify(s));
  pick(s,base.uid);
  assert.ok(has(s,1,'grave',base)&&has(s,1,'battle',host)&&has(s,0,'battle',x));
  assert.deepEqual(physical(s),before);
});

test('Goblet can be summoned with Abyss Rush and a single protected card leaves no target',()=>{
  const s=field(),x=put(s,0,GOBLET,'grave'),a=put(s,1,FIRE);
  act(s,'play',q=>q.uid===x.uid&&q.origin==='grave');
  pick(s,a.uid);
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'battle',a)&&has(s,0,'battle',x));
});

test('the cannon can destroy a cost-four card and cannot select a higher one',()=>{
  const s=field(),a=put(s,1,MID),b=put(s,1,SEED),high=put(s,1,HIGH);
  play(s,CANNON);
  assert.deepEqual(new Set(targets(s)),new Set([a.uid,b.uid]));
  pick(s,a.uid);
  assert.ok(has(s,1,'grave',a)&&has(s,1,'battle',high));
});

for(const dest of [null,1])test('Mega can decline or shuffle the opposing graveyard after removing a card '+dest,()=>{
  const s=field(),x=put(s,0,MEGA),target=put(s,1,MID),grave=put(s,1,DARK,'grave');
  const before=physical(s);
  attack(s,x.uid);
  pick(s,target.uid);
  assert.equal(s.decision.task.op,'g22Shuffle');
  pick(s,dest);
  finish(s);
  assert.ok(has(s,1,dest===null?'grave':'deck',target)&&has(s,1,dest===null?'grave':'deck',grave));
  assert.deepEqual(physical(s),before);
});

test('Sardine may recycle its own graveyard',()=>{
  const s=field(),x=put(s,0,WATER,'grave');
  const sardine=play(s,SARDINE);
  assert.deepEqual(targets(s),[0,1,null]);
  pick(s,0);
  assert.ok(has(s,0,'deck',x)&&has(s,0,'battle',sardine));
});

for(const active of [0,1])test('Coralian replaces destruction with hand only on the opposing turn '+active,()=>{
  const s=field(active),x=put(s,0,CORAL);
  s.extTasks=[{op:'g34_ExactMove',p:1,source:FIRE,owner:0,target:x.uid,targetIncarnation:0,to:'grave'}];
  act(s,'toAttack');
  assert.ok(has(s,0,active===0?'grave':'hand',x));
});

test('Coralian’s G-Zero requires four own spells that turn',()=>{
  const s=field(),x=put(s,0,CORAL,'hand'),enemy=put(s,1,SEED);
  const free=()=>e.getLegalActions(s).some(a=>a.uid===x.uid&&a.freeSummon==='G・ゼロ');
  s.g37Spells=[{turn:s.turn,n:3},{turn:s.turn,n:4}];
  assert.ok(!free());
  s.g37Spells[0].n=4;
  assert.ok(free());
  act(s,'play',a=>a.uid===x.uid&&a.freeSummon==='G・ゼロ');
  pick(s,enemy.uid);
  assert.ok(has(s,1,'hand',enemy));
  assert.equal(s.players[0].mana.filter(y=>y.tapped).length,0);
});

test('Ribrizio can send an opposing buried seed to mana on attack',()=>{
  const s=field(),x=put(s,0,LIB),host=put(s,1,NEXT),seed=inst(SEED);
  host.under=[seed];
  attack(s,x.uid);
  assert.deepEqual(targets(s),[seed.uid,null]);
  pick(s,seed.uid);
  assert.ok(has(s,1,'mana',seed)&&has(s,1,'battle',host));
});

test('legal forty CPU match finishes through JSON continuation conserving cards',()=>{
  assert.deepEqual(e.validateDeck(STANDARD580_DECK),[]);
  let s=e.createGame([STANDARD580_DECK,PRESETS[0]],{seed:58001,first:0}),saved=false;
  const before=physical(s);
  while(s.winner===null&&s.actions<3000&&s.turn<160){
    e.step(s,e.chooseAI(s));
    assert.deepEqual(physical(s),before);
    if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}
  }
  assert.ok(saved);
  assert.notEqual(s.winner,null);
  assert.equal(new Set(physical(s)).size,80);
});
