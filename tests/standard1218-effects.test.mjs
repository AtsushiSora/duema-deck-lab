import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PIKA='dm22rp1-030',ROBE='dm22rp1-069',CATAPULT='dm22rp1-073';
const GREEN='dm01-108',FIRE='dm01-097',LIGHT='dm01-075';
const FIRE_SEED='dm22rp1-068',GREEN_SEED='dmsd20-016',LIGHT_SEED='dmsd20-005';
const field=(active=0)=>{
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(GREEN));
 return s;
};
const add=(s,p,id,zone='battle',props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>values(s)[a.choice]===x.uid);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const cast=(s,id)=>play(s,add(s,s.active,id,'hand'));
const end=s=>{s.phase='attack';act(s,'endTurn');if(s.phase==='charge')act(s,'skipCharge');};
const canAttack=(s,unit,target)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===unit.uid&&a.target===target);
const restore=s=>JSON.parse(JSON.stringify(s));

test('three official spell names resolve to supported, correctly illustrated definitions',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const manifest=read('support-phase-1218.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[PIKA,ROBE,CATAPULT]);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of manifest.cards){
  const c=e.card(row.id),[f]=row.faces,parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1218}),row.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id:row.id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
  assert.equal(catalogue.get(row.id).supported,true);
  assert.deepEqual([c.type,c.cost,c.race,c.civilizations,c.manaValue,c.limit],
   ['spell',f.cost,f.race,f.civilizations,1,manifest.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===row.id)?.image,row.image);
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  parsed.faces=structuredClone(parsed.faces);
  parsed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(parsed,{phase:1218}));
 }
});

test('Picabeam selects only an opposing creature or Tamaseed of cost at most five',()=>{
 let s=field();
 const evolution=add(s,1,'dmx17-008'),base=inst(FIRE);
 evolution.under=[base];
 const seed=add(s,1,'dmsd20-008'),fieldCard=add(s,1,'dmrp08-005');
 const big=add(s,1,'dm01-001'),immune=add(s,1,'dm09-s01'),ally=add(s,0,LIGHT);
 const before=s.players[1].shields.length;
 cast(s,PIKA);
 assert.deepEqual(new Set(values(s)),new Set([evolution.uid,seed.uid]));
 s=restore(s);pick(s,evolution);drain(s);
 assert.deepEqual(s.players[1].shields.slice(before).map(x=>x.uid),[evolution.uid,base.uid]);
 assert.ok(s.players[1].shields.slice(before).every(x=>!x.faceUp&&!x.shieldStack));
 assert.ok([seed,fieldCard,big,immune].every(x=>has(s,1,'battle',x))&&has(s,0,'battle',ally));
});

test('Picabeam counts a light creature and a light Tamaseed for its shield trigger',()=>{
 for(const eligible of [false,true]){
  const s=field(1),attacker=add(s,1,FIRE),seed=add(s,1,LIGHT_SEED);
  add(s,0,LIGHT,'battle',{tapped:true});
  add(s,eligible?0:1,LIGHT_SEED);
  give(s,0,'shields',[PIKA]);
  attack(s,attacker.uid);act(s,'noBlock');
  const trigger=e.getLegalActions(s).find(a=>a.kind==='useTrigger'&&a.cardId===PIKA);
  assert.equal(!!trigger,eligible);
  if(eligible){e.step(s,trigger);pick(s,seed);assert.ok(has(s,1,'shields',seed));assert.ok(s.players[0].mana.every(x=>!x.tapped));}
  else assert.ok(s.players[0].hand.some(x=>x.cardId===PIKA));
 }
});

for(const [id,keyword,body,seed] of [
 [ROBE,'speedAttacker',FIRE,FIRE_SEED],[CATAPULT,'machFighter',GREEN,GREEN_SEED]
]){
 test(id+' draws only with two matching battlefield cards and grants only the next friendly creature',()=>{
  for(const civilCount of [false,true]){
   let s=field();
   const existing=add(s,0,body,'battle',{tapped:true});
   add(s,civilCount?0:1,seed);
   add(s,0,body,'grave');
   const target=add(s,1,FIRE),tapped=add(s,1,FIRE,'battle',{tapped:true});
   const top=s.players[0].deck[0],before=s.players[0].deck.length;
   cast(s,id);
   assert.equal(has(s,0,'hand',top),civilCount);
   assert.equal(s.players[0].deck.length,before-Number(civilCount));
   assert.ok(!e.effectiveCard(existing,s)[keyword]);
   s=restore(s);
   cast(s,GREEN_SEED);drain(s);
   const first=add(s,0,FIRE,'hand'),second=add(s,0,FIRE,'hand');
   play(s,first);play(s,second);
   assert.equal(e.effectiveCard(first,s)[keyword],true);
   assert.ok(!e.effectiveCard(second,s)[keyword]);
   s.phase='attack';
   assert.equal(canAttack(s,first,'player'),keyword==='speedAttacker');
   assert.equal(canAttack(s,first,target.uid),keyword==='machFighter');
   assert.ok(canAttack(s,first,tapped.uid));
   assert.ok(!canAttack(s,second,'player')&&!canAttack(s,second,target.uid)&&!canAttack(s,second,tapped.uid));
   end(s);
   assert.ok(!e.effectiveCard(first,s)[keyword]);
  }
 });
}

test('both grants can apply to the same creature and unspent grants expire at turn end',()=>{
 const s=field();
 cast(s,ROBE);cast(s,CATAPULT);
 const first=add(s,0,FIRE,'hand');
 play(s,first);
 assert.ok(e.effectiveCard(first,s).speedAttacker&&e.effectiveCard(first,s).machFighter);
 cast(s,ROBE);cast(s,CATAPULT);
 end(s);end(s);
 const next=add(s,0,FIRE,'hand');
 play(s,next);
 assert.ok(!e.effectiveCard(next,s).speedAttacker&&!e.effectiveCard(next,s).machFighter);
});

test('an ignored spell neither draws nor grants an attack keyword',()=>{
 const s=field(),spell=add(s,0,ROBE,'hand');
 add(s,0,FIRE);add(s,0,FIRE_SEED);add(s,1,'dmrp15-km1');
 const before=s.players[0].deck.length;
 play(s,spell);
 assert.equal(s.players[0].deck.length,before);
 const first=add(s,0,FIRE,'hand');play(s,first);
 assert.ok(!e.effectiveCard(first,s).speedAttacker);
});

test('a replaced creature entry leaves the grant for the next creature that reaches the battlefield',()=>{
 const s=field(),redirect=add(s,1,'dmr20-066'),crossfire='dm23ex1-011';
 give(s,0,'mana',[FIRE,GREEN,FIRE,GREEN]);
 for(let i=0;i<4;i++)add(s,0,FIRE);
 cast(s,CATAPULT);
 const redirected=add(s,0,crossfire,'hand');
 act(s,'play',a=>a.uid===redirected.uid&&a.freeSummon==='G・ゼロ');
 assert.ok(has(s,0,'mana',redirected)&&has(s,1,'battle',redirect));
 const next=add(s,0,FIRE,'hand');
 play(s,next);
 assert.ok(!has(s,0,'battle',redirected)&&e.effectiveCard(next,s).machFighter);
});
