import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CUBE='dm23ex3-026',RITUAL='dmrp17-010',GOOGOL='dmrp21-5A';
const FIRE='dm01-097',NATURE='dm01-108',WATER='dm01-075';
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
const choices=s=>s.decision.choices.map(({value})=>value?.uid??value);
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
const DARK='dm01-090',UNKNOWN='dm23ex3-022',YUKI='dm25-028',MULTI='dm23rp3-OR2';

test('phase 1174 checks all official definitions and eight reprint IDs',()=>{
 const m=read('tools/support-phase-1174.json'),registry=createCatalogue(snapshot,data.cards,details);
 const images=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[CUBE,RITUAL,GOOGOL]);
 assert.equal(m.printAliases.length,8);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1174}),row.spec);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.power,c.manaValue,c.limit],
   [id===GOOGOL?'creature':'spell',f.cost,f.civilizations,f.race,Number(f.powerText),1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(images.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1174}));
 }
});

for(const tap of [true,false])test('Cube adds two mana, privately looks, then optionally taps the selected Unknown: '+tap,()=>{
 const s=field(),own=s.players[0];
 own.mana.slice(0,4).forEach(x=>{x.faceDown=true;});
 give(s,0,'deck',[FIRE,MULTI,NATURE,UNKNOWN,DARK,WATER]);
 const [mana,multi,a,unknown,b,tail]=own.deck;
 cast(s,CUBE);
 assert.ok(own.mana.includes(mana)&&own.mana.includes(multi)&&multi.tapped);
 assert.deepEqual(choices(s),[unknown.uid,null]);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[NATURE,UNKNOWN,DARK]);
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===CUBE));
 pick(s,unknown.uid);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,tap?true:null);
 assert.equal(unknown.tapped,tap);
 assert.ok(own.battle.includes(unknown));
 pick(s,b.uid);
 assert.deepEqual(own.deck.map(x=>x.uid),[tail.uid,b.uid,a.uid]);
});

test('Cube from a shield grants the attack restriction even without Crystal Armament',()=>{
 const s=field(),target=put(s,1,'battle',NATURE,{tapped:true});
 give(s,1,'shields',[CUBE]);
 const first=put(s,0,'battle',FIRE),other=put(s,0,'battle',DARK);
 const mana=s.players[1].mana.length;
 attack(s,first.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===CUBE);
 assert.equal(s.decision,null);
 assert.equal(s.players[1].mana.length,mana+2);
 assert.deepEqual([...new Set(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===other.uid).map(a=>a.target))],[target.uid]);
});

test('Ritual grants Blocker to the revived creature before the optional battle and expires at next own start',()=>{
 const s=field(),own=s.players[0];
 const existing=put(s,0,'battle',NATURE),revived=put(s,0,'grave',NATURE);
 const enemy=put(s,1,'battle',FIRE);
 cast(s,RITUAL);
 assert.deepEqual(choices(s),[revived.uid]);
 pick(s,revived.uid);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 assert.deepEqual(choices(s),[enemy.uid,null]);
 assert.ok(e.effectiveCard(revived,s).blocker);
 assert.ok(!e.effectiveCard(existing,s).blocker);
 pick(s,null);
 act(s,'toAttack');
 act(s,'endTurn');
 assert.ok(e.effectiveCard(revived,s).blocker);
 act(s,'skipCharge');
 act(s,'toAttack');
 act(s,'endTurn');
 assert.ok(own.battle.includes(revived));
 assert.ok(!e.effectiveCard(revived,s).blocker);
});

test('Ritual establishes EX Life before Mixel resolves on the opposing turn (QA43594)',()=>{
 const s=field();
 const mixel=put(s,0,'battle','dmrp05-011'),attacker=put(s,0,'battle',FIRE);
 const revived=put(s,1,'grave','dmrp17-km2');
 give(s,1,'shields',[RITUAL]);
 give(s,1,'mana',Array(6).fill(NATURE));
 const shield=s.players[1].deck[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===RITUAL);
 pick(s,revived.uid);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 assert.ok(s.players[1].shields.includes(shield));
 assert.ok(e.effectiveCard(revived,s).blocker);
 pick(s,null);
 drain(s);
 assert.ok(s.players[1].battle.includes(revived));
 assert.ok(s.players[1].grave.includes(shield));
 assert.ok(s.players[0].grave.includes(mixel));
});

test('Googol sets multi mana tapped after Yukigon’s replacement (QA41196)',()=>{
 const s=field();
 put(s,0,'battle',YUKI);
 const multi=put(s,0,'hand',MULTI);
 const googol=put(s,1,'battle',GOOGOL,{under:[inst(DARK)]});
 s.phase='charge';
 act(s,'charge',a=>a.uid===multi.uid);
 assert.ok(s.players[0].mana.includes(multi)&&multi.tapped);
 const ownCreature=put(s,0,'hand',FIRE);
 act(s,'play',a=>a.uid===ownCreature.uid);
 assert.ok(s.players[0].battle.includes(ownCreature)&&ownCreature.tapped);
 assert.ok(!googol.tapped);
});

test('Googol evolves from darkness, then offers only blind discard positions on attack',()=>{
 const s=field(),base=put(s,0,'battle',DARK),wrong=put(s,0,'battle',NATURE);
 const [first,second]=[put(s,1,'hand',NATURE),put(s,1,'hand',FIRE)];
 cast(s,GOOGOL);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 const googol=s.players[0].battle.find(x=>x.cardId===GOOGOL);
 assert.deepEqual(googol.under,[base]);
 assert.ok(s.players[0].battle.includes(wrong));
 attack(s,googol.uid);
 assert.equal(s.decision.task.op,'g34_BlindDiscard773');
 assert.equal(s.decision.choices.length,2);
 assert.ok(s.decision.choices.every(o=>o.label.includes('裏向き')&&!o.cardId));
 act(s,'extended',a=>a.choice===0);
 assert.equal(s.players[1].grave.filter(x=>x===first||x===second).length,1);
});

test('Googol also puts an opposing tamaseed onto the battlefield tapped',()=>{
 const s=field(),seed=put(s,0,'hand','dmrp22-048');
 put(s,1,'battle',GOOGOL,{under:[inst(DARK)]});
 assert.equal(e.card(seed).type,'seed');
 act(s,'play',a=>a.uid===seed.uid);
 drain(s);
 assert.ok(s.players[0].battle.includes(seed)&&seed.tapped);
});

test('Ritual can use its revived creature in battle before its entry triggers',()=>{
 const s=field(),revived=put(s,0,'grave','dmrp17-km2');
 const enemy=put(s,1,'battle',FIRE),survivor=put(s,1,'battle',DARK);
 cast(s,RITUAL);
 pick(s,revived.uid);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 assert.ok(e.effectiveCard(revived,s).blocker);
 assert.ok(s.players[1].battle.includes(enemy));
 pick(s,enemy.uid);
 drain(s);
 assert.ok(s.players[1].grave.includes(enemy));
 assert.ok(s.players[1].grave.includes(survivor));
 const battle=s.log.findIndex(x=>x.type==='battle');
 const destroyed=s.log.findIndex(x=>x.cardId===survivor.cardId&&x.type==='leave');
 assert.ok(battle>=0&&destroyed>battle,JSON.stringify(s.log));
});
