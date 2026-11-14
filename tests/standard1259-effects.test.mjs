import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DREAD='dmx10-006',RURU='dm25ex1-033',GUCH='dm06-096';
const NATURE='dm01-108',FIRE='dm01-097',ANGEL='dm01-s01',SEED='dm25ex1-054';
const REPRINTS=['dm22ex2-039','dmx16-023','promoy17-026'];
const GATE='dm01-086',HAND='dm01-027',EX_LIFE='dm26rp3-042',MULTI_FIRE='dm24ex1-014';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));

function field(){
 const s=setup();s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,z,id,fields={}){
 const x=Object.assign(inst(id),fields);
 s.players[p][z].push(x);return x;
}
function seal(s,p,x){
 (s.players[p].seals??=[]).push({...inst(NATURE),sealOf:x.uid});
 x.sealed=true;
}
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,value)=>act(s,'extended',a=>options(s)[a.choice]===value);
const target=(s,x)=>act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));

test('the six official prints resolve to three cards with verified stats, abilities, limits and art',()=>{
 const m=read('tools/support-phase-1259.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[DREAD,RURU,GUCH]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),REPRINTS.map(id=>[id,DREAD]));
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1259}),row.spec);
  const unknown=structuredClone({...row,status:'complete'});
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:1259}));
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  if(id===canonicalId){
   assert.equal(CARD_IMAGES[id],image);
   assert.equal(c.text,f.abilityText);
  }
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
 }
});

test('Dread Blood selects two distinct allied creatures on its own start, destroys together and breaks twice',()=>{
 let s=field();
 const dread=add(s,1,'grave',DREAD),a=add(s,1,'battle',NATURE),b=add(s,1,'battle',FIRE);
 add(s,0,'battle',FIRE);
 end(s);
 assert.equal(s.decision?.task?.op,'g34_SacrificeAlly413');
 assert.deepEqual(options(s),[a.uid,b.uid,null]);
 pick(s,a.uid);
 assert.ok(has(s,1,'battle',a)&&has(s,1,'battle',b));
 assert.deepEqual(options(s),[b.uid,null]);
 s=JSON.parse(JSON.stringify(s));pick(s,b.uid);drain(s);
 assert.ok(has(s,1,'grave',a)&&has(s,1,'grave',b)&&has(s,1,'battle',dread));
 end(s);drain(s);end(s);drain(s);
 attack(s,dread.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[0].shields.length,3);
});

test('Dread Blood leaves the board intact when there are too few eligible allies or the player declines',()=>{
 for(const decline of [false,true]){
  const s=field(),dread=add(s,0,'grave',DREAD),a=add(s,0,'battle',NATURE);
  const b=add(s,0,'battle',FIRE);
  if(!decline)seal(s,0,b);
  add(s,1,'battle',FIRE);
  end(s);assert.equal(s.decision,null);
  end(s);
  if(decline){pick(s,a.uid);pick(s,null);}
  else assert.equal(s.decision,null);
  assert.ok(has(s,0,'battle',a)&&has(s,0,'battle',b)&&has(s,0,'grave',dread));
 }
});

test('Dread Blood revives even when EX Life replaces one destruction (QA 42955)',()=>{
 const s=field(),dread=add(s,1,'grave',DREAD),a=add(s,1,'battle',FIRE);
 const saved=add(s,1,'battle',EX_LIFE,{exLifeShieldUid:s.players[1].shields[0].uid});
 const shield=s.players[1].shields[0];
 end(s);pick(s,saved.uid);pick(s,a.uid);drain(s);
 assert.ok(has(s,1,'battle',saved)&&has(s,1,'grave',a)&&has(s,1,'battle',dread));
 assert.ok(has(s,1,'grave',shield));
});

test('the CPU chooses two low-cost allies when Dread Blood can return',()=>{
 const s=field(),dread=add(s,1,'grave',DREAD);
 const a=add(s,1,'battle',NATURE),b=add(s,1,'battle',FIRE);
 end(s);drain(s);
 assert.ok(has(s,1,'grave',a)&&has(s,1,'grave',b)&&has(s,1,'battle',dread));
});

test('Ruru counts its own race and a matching Tamaseed, excludes enemy and sealed cards, and can stop early',()=>{
 const s=field(),ruru=add(s,0,'hand',RURU);
 add(s,0,'battle',ANGEL);add(s,0,'battle',SEED);seal(s,0,add(s,0,'battle','dmr06-043'));
 add(s,0,'battle',NATURE);add(s,1,'battle',ANGEL);
 act(s,'play',a=>a.uid===ruru.uid);
 assert.equal(s.decision?.task?.op,'g34_DrawUpTo');
 assert.equal(s.decision.task.n,3);
 const [drawn]=s.players[0].deck;
 pick(s,true);
 assert.equal(s.decision.task.n,2);pick(s,null);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[drawn.uid]);
 assert.ok(s.extLimits.some(limit=>limit.kind==='g627Stay'&&limit.ref.uid===ruru.uid));
});

test('Ruru remains when all draws are declined, blocks, and loses protection at its next start',()=>{
 const s=field(),ruru=add(s,0,'hand',RURU);
 act(s,'play',a=>a.uid===ruru.uid);pick(s,null);
 assert.equal(s.players[0].hand.length,0);
 end(s);act(s,'skipCharge');
 cast(s,GATE);target(s,ruru);
 assert.ok(has(s,0,'battle',ruru));
 const enemy=add(s,1,'battle',FIRE);
 attack(s,enemy.uid);act(s,'block',a=>a.uid===ruru.uid);drain(s);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'battle',ruru));
 end(s);act(s,'skipCharge');
 const tapped=add(s,1,'battle',FIRE,{tapped:true});
 act(s,'toAttack');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===ruru.uid).map(a=>a.target),[tapped.uid]);
 end(s);act(s,'skipCharge');cast(s,HAND);target(s,ruru);
 assert.ok(has(s,0,'grave',ruru));
});

test('Guchellarion has attack-only power and W Breaker while no other allied fire creature is present',()=>{
 const s=field(),guch=add(s,0,'battle',GUCH);
 add(s,1,'battle',FIRE);add(s,0,'battle',NATURE);
 const stats=()=>[e.power(guch,false,s),e.power(guch,true,s),e.effectiveCard(guch,s).breaker??1];
 assert.deepEqual(stats(),[4000,7000,2]);
 const multi=add(s,0,'battle',MULTI_FIRE);
 assert.deepEqual(stats(),[4000,4000,1]);
 seal(s,0,multi);assert.deepEqual(stats(),[4000,7000,2]);
 const mono=add(s,0,'battle',FIRE);
 assert.deepEqual(stats(),[4000,4000,1]);
 s.players[0].battle=s.players[0].battle.filter(x=>x!==mono);
 attack(s,guch.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,3);
});
