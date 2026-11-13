import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DECNO='dmrp04s-093',REVELATION='dmd27-017',CLIMAX='promoy24-006';
const FIRE='dm01-097',NATURE='dm01-108',WATER='dm01-075',ABYSS='dm24rp3-042';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));

function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
}
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function seal(s,p,host,id){
 host.sealed=true;
 return put(s,p,'seals',id,{faceDown:true,sealOf:host.uid});
}
const choices=s=>s.decision.choices.map(({value})=>value?.uid??value);
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
const attacks=(s,x)=>new Set(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target));

test('phase 1173 validates all three definitions, restrictions and Revelation reprints',()=>{
 const m=read('tools/support-phase-1173.json'),registry=createCatalogue(snapshot,data.cards,details);
 const images=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[DECNO,REVELATION,CLIMAX]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dmx23-045',REVELATION],['dmx22b-091',REVELATION],['promoy14-046',REVELATION]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1173}),row.spec);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.power,c.manaValue,c.limit],
   ['spell',f.cost,f.civilizations,f.race,0,1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(images.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1173}));
 }
});

test('Decno restricts only opponents already on board and ends at the caster’s next start (QA46872)',()=>{
 const s=field(),target=put(s,0,'battle',NATURE,{tapped:true});
 const affected=put(s,1,'battle',FIRE);
 cast(s,DECNO);
 const later=put(s,1,'battle',WATER);
 act(s,'toAttack');
 act(s,'endTurn');
 act(s,'skipCharge');
 act(s,'toAttack');
 assert.equal(s.active,1);
 assert.deepEqual(attacks(s,affected),new Set([target.uid]));
 assert.deepEqual(attacks(s,later),new Set(['player',target.uid]));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 target.tapped=false;
 assert.deepEqual(attacks(s,affected),new Set(['player']));
 act(s,'endTurn');
 assert.ok(!s.extLimits.some(l=>l.grant?.g1173AttackCreatureIfAble));
});

test('Decno from a shield restricts the other attackers during the same turn',()=>{
 const s=field();
 give(s,1,'shields',[DECNO]);
 const target=put(s,1,'battle',NATURE,{tapped:true});
 const first=put(s,0,'battle',FIRE),other=put(s,0,'battle',WATER);
 attack(s,first.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===DECNO);
 assert.equal(s.decision,null);
 assert.deepEqual(attacks(s,other),new Set([target.uid]));
});

test('Revelation destroys at most 9999 power, then removes one chosen own seal',()=>{
 const s=field();
 const weak=put(s,1,'battle',FIRE,{powerModifiers:[{amount:7999}]}),strong=put(s,1,'battle','dm23rp3-OR2');
 assert.equal(e.power(weak,false,s),9999);
 const host=put(s,0,'battle',WATER),own=seal(s,0,host,FIRE);
 const other=seal(s,0,put(s,0,'battle',NATURE),WATER);
 const enemy=seal(s,1,put(s,1,'battle',FIRE),NATURE);
 cast(s,REVELATION);
 assert.deepEqual(choices(s),[weak.uid]);
 pick(s,weak.uid);
 assert.ok(s.players[1].grave.includes(weak));
 assert.ok(s.players[1].battle.includes(strong));
 assert.equal(s.decision.task.op,'g34_OwnSealGrave1156');
 assert.deepEqual(choices(s),[own.uid,other.uid]);
 pick(s,own.uid);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].seals,[other]);
 assert.deepEqual(s.players[1].seals,[enemy]);
 assert.ok(s.players[0].grave.includes(own));
 assert.ok(!host.sealed);
});

test('Revelation from a shield removes a seal even when no creature can be destroyed',()=>{
 const s=field(),first=put(s,0,'battle','dmx22b-010');
 const own=seal(s,1,put(s,1,'battle',WATER),NATURE);
 give(s,1,'shields',[REVELATION]);
 attack(s,first.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===REVELATION);
 assert.equal(s.decision,null);
 assert.ok(s.players[1].grave.includes(own));
 assert.ok(s.players[0].battle.includes(first));
});

for(const battle of [true,false])test('Climax fights with the exact revived Abyss only when chosen: '+battle,()=>{
 let s=field();
 const existing=put(s,0,'battle',ABYSS),revived=put(s,0,'grave',ABYSS,{incarnation:3});
 const wrong=put(s,0,'grave',FIRE),expensive=put(s,0,'grave','dm24rp2-017');
 const enemy=put(s,1,'battle',NATURE);
 cast(s,CLIMAX);
 assert.deepEqual(choices(s),[revived.uid]);
 pick(s,revived.uid);
 assert.equal(revived.incarnation,4);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 assert.deepEqual(s.decision.task.fighter,{uid:revived.uid,incarnation:4});
 assert.deepEqual(choices(s),[enemy.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,battle?enemy.uid:null);
 assert.ok(s.players[0].battle.some(x=>x.uid===existing.uid));
 assert.ok(s.players[0].battle.some(x=>x.uid===revived.uid));
 assert.ok(s.players[0].grave.some(x=>x.uid===wrong.uid));
 assert.ok(s.players[0].grave.some(x=>x.uid===expensive.uid));
 assert.equal(s.players[1].grave.some(x=>x.uid===enemy.uid),battle);
});

test('Climax has no fighter if no creature can be revived',()=>{
 const s=field(),enemy=put(s,1,'battle',NATURE);
 put(s,0,'battle',ABYSS);
 put(s,0,'grave',FIRE);
 cast(s,CLIMAX);
 assert.equal(s.decision,null);
 assert.ok(s.players[1].battle.includes(enemy));
});


test('Climax lets the selected Abyss evolve before it fights',()=>{
 const s=field(),base=put(s,0,'battle',ABYSS);
 const revived=put(s,0,'grave','promoy24-005'),enemy=put(s,1,'battle',NATURE);
 cast(s,CLIMAX);
 pick(s,revived.uid);
 assert.equal(s.decision.task.op,'g34_Put');
 pick(s,base.uid);
 assert.deepEqual(revived.under,[base]);
 assert.equal(s.decision.task.fighter.uid,revived.uid);
 pick(s,enemy.uid);
 assert.ok(s.players[1].grave.includes(enemy));
});

test('Climax cannot fight if Segare replaces the selected creature’s entry',()=>{
 const s=field();
 give(s,0,'mana',['dm01-090',FIRE,FIRE,FIRE,FIRE,FIRE]);
 const revived=put(s,0,'grave','dm24rp4-062'),existing=put(s,0,'battle',ABYSS);
 const segare=put(s,1,'battle','dmrp19-044'),enemy=put(s,1,'battle',NATURE);
 assert.ok(e.card(revived).cost>6&&e.card(revived).cost<=8);
 cast(s,CLIMAX);
 pick(s,revived.uid);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].mana.includes(revived));
 assert.deepEqual(s.players[0].battle,[existing]);
 assert.ok(s.players[1].mana.includes(segare));
 assert.ok(s.players[1].battle.includes(enemy));
});
