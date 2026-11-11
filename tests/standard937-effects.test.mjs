import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const OCEAN='dm20-026',LEAN='dm21-021',TABOO='dm21-014';
const RUBY='dm01-044',RUBY_REPRINT='dm18-055',PLAIN='dm01-108',WATER='dm01-083';
const GRAND='dm19-084',DEEP='dm21-043',BOUNCE='dm01-086',GEAR='dm15-008',DEPLOYER='dmr03-s03';
const put=(s,p,zone,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;};
const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===(v?.uid??v));
const legal=(s,kind,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&pred(a));
const castable=(s,p,id)=>e.canCastSpell(s,p,e.card(id),'hand');
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(PLAIN));
 return s;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 937 registers three complete printings and preserves the existing Ruby Grass definition',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-937.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[OCEAN,LEAN,TABOO]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),f=row.faces[0],c=e.card(row.id);
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:937}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:936}));
  const extra=structuredClone(d);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:937}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.cost,c.race,e.civilizations(c),c.manaValue,c.limit],[f.cost,f.race,f.civilizations,1,4]);
  if(c.type==='creature')assert.equal(c.power,Number(f.powerText));
  assert.equal(c.supportBatch,'phase-937');
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
 assert.equal(e.card(RUBY).endUntap,true);
 assert.ok(!data.cards.some(c=>c.id===RUBY_REPRINT));
 const deck={id:'phase937',name:'ブロッカーと召喚制限',cards:[OCEAN,LEAN,TABOO,RUBY,PLAIN,WATER,GRAND,DEEP,BOUNCE,GEAR].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

for(const accept of [true,false])test('Ocean can untap before the unblocked attack breaks a shield, or decline: '+accept,()=>{
 let s=field();
 const ocean=put(s,1,'battle',OCEAN,{tapped:true});
 const attacker=put(s,0,'battle',PLAIN);
 attack(s,attacker.uid);act(s,'noBlock');
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.op,'g34_Offer');
 assert.equal(s.players[1].shields.length,5);
 s=restore(s);pick(s,accept?true:null);
 assert.equal(find(s,1,'battle',ocean).tapped,!accept);
 drain(s);
 assert.equal(s.players[1].shields.length,4);
});

for(const mode of ['blocked','creature','ignored'])test('Ocean skips attacks that fail its trigger condition: '+mode,()=>{
 const s=field();
 const ocean=put(s,1,'battle',OCEAN,{tapped:true,...(mode==='ignored'?{g35Ignored:s.turn}:{})});
 const attacker=put(s,0,'battle',PLAIN);
 const ally=put(s,1,'battle',RUBY,{tapped:mode!=='blocked'});
 attack(s,attacker.uid,mode==='creature'?ally.uid:'player');
 if(mode==='blocked')act(s,'block',a=>a.uid===ally.uid);
 else act(s,'noBlock');
 assert.notEqual(s.decision?.task?.op,'g34_Offer');
 drain(s);
 assert.equal(find(s,1,'battle',ocean).tapped,true);
});

test('Ocean cannot attack either target but can block normally',()=>{
 const s=field();
 const ocean=put(s,0,'battle',OCEAN),target=put(s,1,'battle',PLAIN,{tapped:true});
 s.phase='attack';
 assert.ok(!legal(s,'attack',a=>a.uid===ocean.uid));
 s.active=1;target.tapped=false;
 attack(s,target.uid);
 assert.ok(legal(s,'block',a=>a.uid===ocean.uid));
});

test('Lean buffs the resolving group, including itself, through the opposing turn',()=>{
 let s=field();
 const old=put(s,0,'battle',OCEAN),non=put(s,0,'battle',PLAIN),enemy=put(s,1,'battle',RUBY);
 const lean=play(s,LEAN),late=play(s,RUBY);
 assert.equal(e.power(lean,false,s),10000);
 assert.equal(e.power(old,false,s),7000);
 assert.equal(e.power(non,false,s),2000);
 assert.equal(e.power(enemy,false,s),3000);
 assert.equal(e.power(late,false,s),3000);
 s=restore(s);
 const source=find(s,0,'battle',lean);source.entered=0;
 const enemyCreature=find(s,1,'battle',enemy);enemyCreature.tapped=true;
 s.phase='attack';
 assert.ok(legal(s,'attack',a=>a.uid===lean.uid&&a.target===enemy.uid));
 assert.ok(!legal(s,'attack',a=>a.uid===lean.uid&&a.target==='player'));
 end(s);
 assert.equal(e.power(find(s,0,'battle',old),false,s),7000);
 end(s);
 assert.equal(e.power(find(s,0,'battle',old),false,s),3000);
 assert.equal(e.power(find(s,0,'battle',lean),false,s),6000);
});

test('Two Lean buffs add, and the first remains after its source leaves',()=>{
 const s=field(),ally=put(s,0,'battle',OCEAN);
 const first=play(s,LEAN),second=play(s,LEAN);
 assert.equal(e.power(ally,false,s),11000);
 assert.equal(e.power(first,false,s),14000);
 assert.equal(e.power(second,false,s),10000);
 play(s,BOUNCE);act(s,'effect',a=>a.targets?.[0]?.uid===first.uid);
 assert.ok(find(s,0,'hand',first));
 assert.equal(e.power(ally,false,s),11000);
});

test('Devil Link pays once per qualifying creature and respects the one-mana floor',()=>{
 const s=field();
 give(s,0,'mana',Array(10).fill('dm01-090'));
 put(s,0,'battle',GRAND);put(s,0,'battle',DEEP);
 put(s,0,'battle',GRAND,{sealed:true});put(s,1,'battle',GRAND);
 put(s,0,'battle',PLAIN,{under:[inst(GRAND)]});
 const cost=()=>e.summonCost(s,0,e.card(TABOO));
 assert.equal(cost(),8);
 const original=e.card(GRAND);
 e.setCards(data.cards.map(c=>c.id===GRAND?{...original,race:'グランド・デビル/ディープ・マリーン'}:c));
 try{
  assert.equal(cost(),8);
  for(let i=0;i<10;i++)put(s,0,'battle',GRAND);
  assert.equal(cost(),1);
  const spell=play(s,TABOO);
  assert.ok(find(s,0,'grave',spell));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 }finally{e.setCards(data.cards);}
});

test('Devil Link waits for the affected player’s next actual turn, allows direct entry, and expires at that turn’s end',()=>{
 let s=field();
 const spell=play(s,TABOO);
 assert.ok(find(s,0,'grave',spell));
 assert.ok(castable(s,1,BOUNCE)&&castable(s,1,WATER));
 s.extraTurns=[{player:0}];
 end(s);
 assert.equal(s.active,0);
 assert.ok(castable(s,1,BOUNCE)&&castable(s,1,WATER));
 end(s);
 assert.equal(s.active,1);
 s=restore(s);s.phase='main';
 const deployer=put(s,1,'battle',DEPLOYER);
 const creature=put(s,1,'hand',WATER),otherSpell=put(s,1,'hand',BOUNCE),gear=put(s,1,'hand',GEAR);
 assert.ok(!castable(s,1,BOUNCE)&&!castable(s,1,WATER));
 assert.ok(!e.canEnterCreature(s,1,e.card(WATER),{origin:'hand',execution:true}));
 assert.ok(e.canEnterCreature(s,1,e.card(WATER),{origin:'hand',execution:false}));
 assert.ok(!legal(s,'play',a=>a.uid===creature.uid||a.uid===otherSpell.uid));
 assert.ok(legal(s,'play',a=>a.uid===gear.uid));
 assert.ok(castable(s,0,BOUNCE));
 attack(s,deployer.uid);
 pick(s,creature);
 assert.ok(find(s,1,'battle',creature));
 drain(s);end(s);
 assert.equal(s.active,0);
 assert.ok(castable(s,1,BOUNCE)&&castable(s,1,WATER));
 end(s);s.phase='main';
 assert.ok(legal(s,'play',a=>a.uid===otherSpell.uid));
});
