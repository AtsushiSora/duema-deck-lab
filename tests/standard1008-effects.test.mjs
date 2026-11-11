import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BOW='dmr23-064',UNO='dmr22-003',HELL='dmr23-070',PON='dmr23-047',ROYAL='dmr23-006';
const NATURE='dm01-108',MULTI='dm24ex2-019',FIELD='dmrp08-005',WEAK='dm34-052',LARGE='dm01-036';
const ONE='dmx11-080',DUAL='dm24ex1-086',TWO_EVO='dmr05-017',ENTRY_LOCK='dmrp13-046';
const WATER_DRAW='dm06-085',SPELL='dmx22b-163',TWINPACT='dmex17-020';
const DEMON='dm01-027',CYCLE='dm22ex1-018',FIGHT='dm25rp2-077';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(22).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id,face=0){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}
function armor(s,n,faceDown=false){
 for(let i=0;i<n;i++)put(s,0,'mana',MULTI,{tapped:true,faceDown:faceDown&&i===n-1});
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Phase 1008 pins five single prints with matching identities, printed stats, art and limits',()=>{
 const m=read('tools/support-phase-1008.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BOW,UNO,HELL,PON,ROYAL]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1008}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:1008}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,parseInt(f.powerText,10)||0,f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1008');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 assert.match(registry.get(HELL).faces[0].abilityText,/−3000/);
});

for(const id of [BOW,HELL,ROYAL])test(id+' enters mana tapped',()=>{
 const s=field(),x=put(s,0,'hand',id);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x)&&x.tapped);
});

for(const mode of ['one','two','face-down'])test('Bow selects only an untapped opposing creature and uses visible multicolor mana '+mode,()=>{
 const s=field(),ally=put(s,0,'battle',NATURE),enemy=put(s,1,'battle',MULTI);
 const tapped=put(s,1,'battle',WEAK,{tapped:true}),fieldCard=put(s,1,'battle',FIELD);
 armor(s,mode==='one'?1:2,mode==='face-down');
 const bow=play(s,BOW),before=physical(s);
 assert.deepEqual(choices(s),[enemy.uid]);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'mana',enemy)&&enemy.tapped&&has(s,1,'battle',tapped)&&has(s,1,'battle',fieldCard));
 assert.ok(has(s,0,'grave',bow));
 assert.equal(!!e.effectiveCard(ally,s).blocker,mode==='two');
 assert.deepEqual(physical(s),before);
});

test('Bow checks mana armor after returning a borrowed creature to its owner',()=>{
 const s=field(),ally=put(s,0,'battle',NATURE);
 const borrowed=put(s,1,'battle',MULTI,{cardOwner:0});
 armor(s,1);
 play(s,BOW);
 pick(s,borrowed.uid);
 assert.ok(has(s,0,'mana',borrowed)&&!has(s,1,'mana',borrowed));
 assert.equal(e.effectiveCard(ally,s).blocker,true);
});

test('Bow still grants existing allies Blocker with no removal target and expires at the next own start',()=>{
 const s=field(),ally=put(s,0,'battle',NATURE);
 armor(s,2);
 play(s,BOW);
 assert.equal(e.effectiveCard(ally,s).blocker,true);
 const newcomer=play(s,NATURE);
 assert.equal(!!e.effectiveCard(newcomer,s).blocker,false);
 end(s);
 const a=put(s,1,'battle','dm01-083');
 attack(s,a.uid);
 act(s,'block',v=>v.uid===ally.uid);
 drain(s);
 assert.ok(has(s,0,'battle',ally)&&has(s,1,'grave',a));
 end(s);
 assert.equal(s.active,0);
 assert.equal(!!e.effectiveCard(ally,s).blocker,false);
});

for(const id of [BOW,HELL])test(id+' resolves through S-Trigger on the opponent turn',()=>{
 const s=field(),ally=put(s,0,'battle',NATURE),attacker=put(s,1,'battle',NATURE);
 const target=put(s,1,'battle',WEAK);
 give(s,0,'shields',[id]);
 armor(s,2);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===id);
 assert.ok(choices(s).includes(target.uid));
 pick(s,target.uid);
 drain(s);
 assert.ok(has(s,1,id===BOW?'mana':'grave',target));
 if(id===BOW)assert.ok(e.effectiveCard(ally,s).blocker);
 else assert.equal(e.power(ally,false,s),2000);
 end(s);
 assert.equal(!!e.effectiveCard(ally,s).blocker,false);
});

test('Uno mills three, forces one of each available cost, and waits to resolve entry triggers',()=>{
 let s=field();
 give(s,0,'deck',[ONE,DUAL,DEMON,...Array(16).fill(NATURE)]);
 give(s,0,'grave',[WEAK,WEAK,NATURE,MULTI]);
 give(s,1,'grave',[ONE]);
 const [firstThree,secondThree,two,large]=s.players[0].grave;
 const [one,dual,spell]=s.players[0].deck;
 const uno=play(s,UNO),all=physical(s);
 assert.ok([one,dual,spell].every(x=>has(s,0,'grave',x)));
 assert.deepEqual(choices(s),[firstThree.uid,secondThree.uid,two.uid,one.uid,dual.uid]);
 pick(s,secondThree.uid);
 assert.deepEqual(choices(s),[two.uid,one.uid,dual.uid]);
 s=restore(s);
 pick(s,dual.uid);
 assert.deepEqual(choices(s),[one.uid]);
 assert.equal(s.players[0].hand.length,0);
 pick(s,one.uid);
 assert.equal(s.players[0].hand.length,1);
 assert.deepEqual(s.players[0].battle.map(x=>x.uid),[uno,secondThree,dual,one].map(x=>x.uid));
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),[firstThree,two,large,spell].map(x=>x.uid));
 assert.deepEqual(physical(s),all);
 s.turn++;
 attack(s,uno.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Uno can use a previously deployed creature as an evolution base and skips absent costs',()=>{
 const s=field(),one=put(s,0,'grave',ONE),evo=put(s,0,'grave',TWO_EVO);
 give(s,0,'deck',[DEMON,DEMON,DEMON,...Array(14).fill(NATURE)]);
 play(s,UNO);
 assert.deepEqual(choices(s),[one.uid]);
 pick(s,one.uid);
 assert.deepEqual(choices(s),[evo.uid]);
 pick(s,evo.uid);
 if(s.decision)pick(s,one.uid);
 assert.deepEqual(s.players[0].battle.at(-1).under.map(x=>x.uid),[one.uid]);
 assert.ok(has(s,0,'battle',evo));
 assert.equal(s.decision,null);
});

test('Uno respects ordered entry replacements and never repeats a cost',()=>{
 const s=field();
 put(s,1,'battle',ENTRY_LOCK);
 give(s,0,'grave',[ONE,NATURE,WEAK]);
 const [one,two,three]=s.players[0].grave;
 play(s,UNO);
 pick(s,three.uid);
 pick(s,one.uid);
 assert.ok(has(s,0,'battle',three)&&has(s,0,'mana',one));
 assert.ok(choices(s).includes(two.uid)&&!choices(s).includes(one.uid));
 pick(s,two.uid);
 assert.ok(has(s,0,'mana',two));
 assert.equal(s.decision,null);
});

for(const mode of ['one','two','face-down'])test('Rainbow Hell weakens its target and boosts only battle power at the mana threshold '+mode,()=>{
 const s=field(),ally=put(s,0,'battle',NATURE),foe=put(s,1,'battle',WEAK,{tapped:true});
 const target=put(s,1,'battle',LARGE);
 armor(s,mode==='one'?1:2,mode==='face-down');
 play(s,HELL);
 pick(s,target.uid);
 assert.equal(e.power(target,false,s),2000);
 assert.equal(e.power(ally,false,s),2000);
 assert.equal(e.power(ally,true,s),2000);
 attack(s,ally.uid,foe.uid);
 drain(s);
 assert.equal(has(s,0,'battle',ally),mode==='two');
 assert.equal(has(s,1,'grave',foe),mode==='two');
 end(s);
 assert.equal(e.power(target,false,s),5000);
});

test('Rainbow Hell destroys a creature at exactly zero and boosts only allies present during resolution',()=>{
 const s=field(),ally=put(s,0,'battle',NATURE),target=put(s,1,'battle',WEAK);
 armor(s,2);
 play(s,HELL);
 pick(s,target.uid);
 assert.ok(has(s,1,'grave',target));
 const newcomer=play(s,NATURE);
 newcomer.entered=0;
 const first=put(s,1,'battle',WEAK,{tapped:true}),second=put(s,1,'battle',WEAK,{tapped:true});
 attack(s,newcomer.uid,first.uid);
 drain(s);
 assert.ok(has(s,0,'grave',newcomer));
 attack(s,ally.uid,second.uid);
 drain(s);
 assert.ok(has(s,0,'battle',ally)&&has(s,1,'grave',second));
});

test('Rainbow Hell stacks and applies to an effect battle, then expires at the end of the turn',()=>{
 let s=field();
 const fighter=put(s,0,'battle',NATURE),high=put(s,1,'battle',LARGE);
 armor(s,2);
 for(let i=0;i<2;i++){
  const target=put(s,1,'battle',WEAK);
  play(s,HELL);
  pick(s,target.uid);
 }
 play(s,FIGHT);
 pick(s,fighter.uid);
 const before=physical(s);
 s=restore(s);
 pick(s,high.uid);
 drain(s);
 assert.ok(has(s,0,'battle',fighter)&&has(s,1,'grave',high));
 assert.deepEqual(physical(s),before);
 const resumedFighter=s.players[0].battle.find(x=>x.uid===fighter.uid);
 resumedFighter.tapped=true;
 end(s);
 const later=put(s,1,'battle',NATURE);
 attack(s,later.uid,fighter.uid);
 drain(s);
 assert.ok(has(s,0,'grave',fighter)&&has(s,1,'grave',later));
});

test('Ponpin can block or attack a creature, and has no player attack',()=>{
 const s=field(),pon=put(s,0,'battle',PON),enemy=put(s,1,'battle',WEAK,{tapped:true});
 s.phase='attack';
 const actions=e.getLegalActions(s);
 assert.ok(actions.some(a=>a.kind==='attack'&&a.uid===pon.uid&&a.target===enemy.uid));
 assert.ok(!actions.some(a=>a.kind==='attack'&&a.uid===pon.uid&&a.target==='player'));
 s.active=1;
 const attacker=put(s,1,'battle',WEAK);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===pon.uid);
 drain(s);
 assert.ok(has(s,1,'grave',attacker)&&has(s,0,'battle',pon));
});

for(const order of ['pon-first','dual-first'])test('Ponpin observes the second creature only when already in play '+order,()=>{
 const s=field(),pon=put(s,0,'grave',PON),dual=put(s,0,'grave',DUAL);
 const target=put(s,1,'battle',WEAK);
 play(s,UNO);
 for(const x of order==='pon-first'?[pon,dual]:[dual,pon])pick(s,x.uid);
 drain(s);
 assert.equal(target.tapped,order==='pon-first');
});

test('Ponpin triggers for its own light/water spell and creature, with each pair on one card',()=>{
 const s=field(),pon=put(s,0,'battle',PON),target=put(s,1,'battle',WEAK);
 const opponentDual=put(s,1,'hand',DUAL);
 play(s,PON);
 play(s,'dm01-083');
 play(s,WATER_DRAW);
 drain(s);
 assert.equal(target.tapped,false);
 play(s,SPELL);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.uid===pon.uid);
 assert.deepEqual(choices(s),[target.uid]);
 pick(s,target.uid);
 // Both copies trigger separately, even if the only legal target is already tapped.
 assert.deepEqual(choices(s),[target.uid]);
 pick(s,target.uid);
 assert.equal(target.tapped,true);
 target.tapped=false;
 s.active=1;
 act(s,'play',a=>a.uid===opponentDual.uid);
 drain(s);
 assert.equal(target.tapped,false);
 assert.equal(pon.tapped,false);
});

test('Royal One watches each own qualifying hand cast and only offers strictly cheaper creatures',()=>{
 const s=field();
 put(s,0,'battle',ROYAL);
 give(s,0,'deck',Array(22).fill(MULTI));
 const first=put(s,0,'hand',NATURE),second=put(s,0,'hand',WEAK);
 const equal=put(s,0,'hand',LARGE),over=put(s,0,'hand',MULTI),spell=put(s,0,'hand',WATER_DRAW);
 play(s,SPELL);
 assert.deepEqual(choices(s),[first.uid,second.uid,null]);
 pick(s,first.uid);
 play(s,SPELL);
 assert.deepEqual(choices(s),[second.uid,null]);
 pick(s,second.uid);
 assert.ok(has(s,0,'battle',first)&&has(s,0,'battle',second));
 assert.ok([equal,over,spell].every(x=>has(s,0,'hand',x)));
 const third=put(s,0,'hand',NATURE);
 act(s,'play',a=>a.uid===spell.uid);
 assert.deepEqual(choices(s),[third.uid,null]);
 pick(s,third.uid);
 assert.ok(has(s,0,'battle',third));
});

test('Royal One uses the cast face cost and allows optional selection',()=>{
 const s=field();
 put(s,0,'battle',ROYAL);
 give(s,0,'deck',Array(22).fill(MULTI));
 const under=put(s,0,'hand',LARGE),equal=put(s,0,'hand','dm01-008');
 play(s,TWINPACT,1);
 if(s.decision?.task?.op==='execute')pick(s,null);
 assert.deepEqual(choices(s),[under.uid,null]);
 pick(s,null);
 assert.ok(has(s,0,'hand',under)&&has(s,0,'hand',equal));
});

test('Royal One accepts a qualifying S-Trigger cast from hand',()=>{
 const s=field(),ally=put(s,0,'hand',NATURE);
 put(s,0,'battle',ROYAL);
 give(s,0,'shields',['dmr22-042']);
 s.active=1;
 attack(s,put(s,1,'battle',NATURE).uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId==='dmr22-042');
 while(s.decision?.task?.op==='g34_Select'&&!s.decision.task.g195HandDeploy)pick(s,null);
 assert.ok(s.decision.task.g195HandDeploy);
 pick(s,ally.uid);
 drain(s);
 assert.ok(has(s,0,'battle',ally));
});

test('Royal One ignores nonqualifying colors, opponent casts and spells cast from grave',()=>{
 const s=field(),ally=put(s,0,'hand',NATURE);
 put(s,0,'battle',ROYAL);
 put(s,1,'battle',WEAK);
 play(s,DEMON);
 drain(s);
 assert.ok(has(s,0,'hand',ally));
 s.active=1;
 play(s,WATER_DRAW);
 drain(s);
 assert.ok(has(s,0,'hand',ally));
 s.active=0;
 const graveSpell=put(s,0,'grave',WATER_DRAW);
 play(s,CYCLE);
 assert.ok(choices(s).includes(graveSpell.uid));
 pick(s,graveSpell.uid);
 drain(s);
 assert.ok(has(s,0,'hand',ally));
 assert.equal(s.metrics[0].played[WATER_DRAW],1);
});
