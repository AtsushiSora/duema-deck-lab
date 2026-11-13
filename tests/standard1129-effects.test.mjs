import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BAKURYU='dm25rp2-010',BEN='dm25rp2-025',TATE='dm25rp2-049';
const NATURE='dm01-108',BLOCKER='dm01-075',PAR='dm25rp2-S02';
const add=(s,p,zone,id,props={})=>{
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
};
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const play=(s,id)=>{
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
};
function evolve(s,base){
 if(s.decision?.type==='evolution')act(s,'evolve',a=>(a.baseUid||null)===(base?.uid??null));
}

test('seven official prints resolve to their canonical cards, with complete text and usage limits',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1129.json',import.meta.url)));
 const images=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[BAKURYU,BEN,TATE]);
 assert.equal(manifest.printAliases.length,4);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,detail={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(detail,{phase:1129}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.get(row.id).supported,true);
  assert.equal(e.card(id).limit,manifest.regulationVerification.limits[row.id]);
  assert.ok(images.prints.some(p=>p.id===row.id&&p.canonicalId===id&&p.image===row.image));
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  detail.faces=detail.faces.map(f=>({...f,abilityText:f.abilityText+'\n未知の能力'}));
  assert.throws(()=>standardCardSpec(detail,{phase:1129}));
 }
});

test('BAKURYU destroys an opposing blocker on arrival and on its immediate attack',()=>{
 const s=setup(),first=add(s,1,'battle',TATE),other=add(s,1,'battle',NATURE);
 const x=play(s,BAKURYU);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 assert.deepEqual(values(s),[first.uid]);
 pick(s,first.uid);
 const second=add(s,1,'battle',TATE);
 attack(s,x.uid);
 pick(s,second.uid);
 drain(s);
 assert.ok(inZone(s,1,'grave',first)&&inZone(s,1,'grave',second)&&inZone(s,1,'battle',other));
 assert.equal(s.players[1].shields.length,3);
});

for(const mode of ['printed','inherited','two inherited','decline'])test('BAKURYU responds to opponent selection after destruction: '+mode,()=>{
 const s=setup();s.active=1;
 const host=add(s,0,'battle',mode.includes('inherited')?NATURE:BAKURYU,{
  under:mode.includes('inherited')?Array.from({length:mode==='two inherited'?2:1},()=>inst(BAKURYU)):[]
 });
 const eligible=s.players[0].mana.find(x=>x.cardId===NATURE);
 const second=s.players[0].mana.find(x=>x.cardId===NATURE&&x!==eligible);
 const big=add(s,0,'mana',BAKURYU),hidden=add(s,0,'mana',NATURE,{faceDown:true});
 play(s,'dm01-027');
 act(s,'effect',a=>a.targets.some(x=>x.uid===host.uid));
 if(mode==='two inherited')act(s,'orderEffect');
 assert.equal(s.decision.source,BAKURYU);
 assert.equal(s.decision.player,0);
 assert.ok(values(s).includes(eligible.uid)&&!values(s).includes(big.uid)&&!values(s).includes(hidden.uid));
 pick(s,mode==='decline'?null:eligible.uid);
 if(mode==='two inherited')pick(s,second.uid);
 assert.ok(inZone(s,0,'grave',host));
 assert.equal(inZone(s,0,'battle',eligible),mode!=='decline');
 assert.equal(inZone(s,0,'battle',second),mode==='two inherited');
});

test('An attack declaration against BAKURYU is not opponent selection for its ability',()=>{
 const s=setup();s.active=1;
 const target=add(s,0,'battle',BAKURYU,{tapped:true}),attacker=add(s,1,'battle',NATURE);
 const mana=s.players[0].mana.length;
 attack(s,attacker.uid,target.uid);
 drain(s);
 assert.equal(s.players[0].mana.length,mana);
 assert.ok(inZone(s,0,'battle',target));
});

for(const mode of ['ordinary','evolved','public one','blocked shield','deck replacement','short deck'])test('BEN assigns the looked-at cards to separate destinations: '+mode,()=>{
 let s=setup();
 give(s,0,'deck',mode==='short deck'?[NATURE,TATE]:[NATURE,TATE,BAKURYU,NATURE,NATURE]);
 const [first,second,third,fourth]=s.players[0].deck;
 if(mode==='public one')add(s,1,'battle','dmrp22-030');
 if(mode==='deck replacement')add(s,1,'battle','dm22ex1-086');
 if(mode==='blocked shield')add(s,1,'battle',data.cards.find(c=>c.g39Fuujin).id);
 const base=mode==='evolved'?add(s,0,'battle',NATURE):null;
 const host=play(s,BEN);
 evolve(s,base);
 assert.equal(s.decision.task.op,'g34_LookPick');
 assert.equal(s.players[0].deck[0].uid,first.uid);
 assert.equal(values(s).length,mode==='public one'?1:mode==='short deck'?2:3);
 pick(s,first.uid);
 if(mode==='public one')assert.ok(inZone(s,0,'shields',first)&&s.players[0].deck[0].uid===second.uid);
 else{
  assert.ok(inZone(s,0,'deck',first)&&inZone(s,0,'deck',second));
  pick(s,second.uid);
  if(third){
   s=JSON.parse(JSON.stringify(s));
   pick(s,third.uid);
  }
  if(mode==='deck replacement'){
   for(const x of [first,second,third])assert.ok(inZone(s,0,'grave',x));
  }else{
   assert.ok(inZone(s,0,mode==='blocked shield'?'deck':'shields',first));
   assert.ok(inZone(s,0,'mana',second));
   if(third){
    const top=s.players[0].battle.find(x=>x.uid===host.uid);
    assert.ok(top.under.some(x=>x.uid===third.uid)&&e.isEvolution(top));
    if(base)assert.ok(top.under.some(x=>x.uid===base.uid));
   }
  }
  if(fourth&&mode!=='blocked shield')assert.equal(s.players[0].deck[0].uid,fourth.uid);
  if(mode==='short deck')assert.equal(s.winner,1);
 }
 assert.equal(s.players[0].g34Protected?.length??0,0);
});

test('Tateroll is a blocker without an on-entry choice when it enters unevolved',()=>{
 const s=setup(),enemy=add(s,1,'battle',NATURE),x=play(s,TATE);
 evolve(s,null);
 assert.ok(e.effectiveCard(x,s).blocker&&!s.decision&&inZone(s,1,'battle',enemy));
});

for(const to of ['hand','mana','shields',null])test('Evolved Tateroll chooses a destination for each layer under its owner: '+to,()=>{
 const s=setup(),base=add(s,0,'battle',NATURE);
 const layer=inst(NATURE),enemy=add(s,1,'battle',TATE,{cardOwner:0,under:[layer]});
 play(s,TATE);
 evolve(s,base);
 assert.equal(s.decision.source,TATE);
 pick(s,to===null?null:enemy.uid);
 if(to===null)assert.ok(inZone(s,1,'battle',enemy));
 else{
  pick(s,to);
  assert.ok(inZone(s,0,to,enemy)&&inZone(s,1,to,layer));
 }
});

test('Tateroll triggers as an evolution base using its own cost (QA47068)',()=>{
 const s=setup(),source=add(s,0,'battle',TATE),enemy=add(s,1,'battle',PAR);
 assert.ok(e.card(enemy).cost>e.card(source).cost);
 const evo=data.cards.find(c=>c.cost===5&&c.evolution&&!c.neoEvolution&&!c.g34Tasks&&e.evolutionBases(s,0,c).some(y=>y.uid===source.uid));
 assert.ok(evo);
 play(s,evo.id);
 evolve(s,source);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.find(q=>q.effectId===a.effectId).source===TATE);
 assert.equal(s.decision.source,TATE);
 assert.deepEqual(values(s),[null]);
 pick(s,null);
 assert.ok(inZone(s,1,'battle',enemy));
});

test('Tateroll can use its Shield Trigger to enter evolved and remove a creature',()=>{
 const s=setup(),attacker=add(s,0,'battle',NATURE),base=add(s,1,'battle',NATURE);
 give(s,1,'shields',[TATE,NATURE,NATURE,NATURE,NATURE]);
 const shield=s.players[1].shields[0];
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid);
 act(s,'triggerEvolve',a=>a.baseUid===base.uid);
 assert.equal(s.decision.source,TATE);
 pick(s,attacker.uid);
 pick(s,'hand');
 assert.ok(inZone(s,0,'hand',attacker)&&inZone(s,1,'battle',shield));
});

for(const isNeo of [true,false])test('Tateroll moved under a battle creature triggers only for an evolution base: '+isNeo,()=>{
 const s=setup(),host=add(s,0,'battle',isNeo?'dm25rp2-058':NATURE),source=add(s,0,'battle',TATE);
 const enemy=add(s,1,'battle',NATURE),six=data.cards.find(c=>c.g35Role==='sixfall');
 s.extTasks=[{op:'g35_Custom',p:1,source:six.id,name:'sixfall',owner:0}];
 act(s,'toAttack');
 pick(s,host.uid);
 pick(s,source.uid);
 assert.ok(host.under.some(x=>x.uid===source.uid));
 if(isNeo){
  assert.equal(s.decision.source,TATE);
  pick(s,enemy.uid);
  pick(s,'shields');
 }
 assert.equal(inZone(s,1,'shields',enemy),isNeo);
});
