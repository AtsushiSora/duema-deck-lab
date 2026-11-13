import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const POP='dmr21-s01',SPY='dmex14-045',BABOOL='dmr22-s03',FIELD='dmr21-036';
const NATURE='dm01-108',LIGHT='dm01-075',WATER='dm01-083',FIRE='dm01-097';
const CASTLE='dm26rp1-057',HUSTLE='dm26rp1-047';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const field=()=>{
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
};
const put=(s,p,zone,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===(value?.uid??value);
});
const end=s=>{s.phase='attack';act(s,'endTurn');};
const startOwn=s=>{s.active=1;end(s);};
const untap=(s,x)=>{
 s.phase='main';
 s.extTasks=[{op:'g34_Sequence',p:0,source:x.cardId,uid:x.uid,incarnation:x.incarnation||0,defs:[{op:'Untap'}]}];
 act(s,'toAttack');
};

test('phase 1166 adds three complete official cards and two aliases without splitting their names',()=>{
 const m=read('tools/support-phase-1166.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[POP,SPY,BABOOL]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dmex08-105','dm25ex2-Cho003']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:1166}),row.spec);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.power,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,f.race,Number(f.powerText),1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1166}));
 }
});

test('Heavy Pop can deploy after declining the draw, or deploy the drawn Light creature',()=>{
 for(const draw of [0,1])for(const deploy of [false,true]){
  const s=field(),own=s.players[0],top=inst(LIGHT);
  own.deck.unshift(top);
  put(s,0,'battle',POP);
  const light=put(s,0,'hand',LIGHT);
  const water=put(s,0,'hand',WATER),high=put(s,0,'hand',POP);
  end(s);
  pick(s,draw);
  const opts=s.decision.choices.map(x=>x.value?.uid??x.value);
  assert.ok(opts.includes(light.uid)&&!opts.includes(water.uid)&&!opts.includes(high.uid));
  assert.equal(opts.includes(top.uid),!!draw);
  const chosen=draw?top:light;
  pick(s,deploy?chosen:null);
  drain(s);
  assert.equal(own.battle.includes(chosen),deploy);
  assert.equal(own.hand.includes(chosen),!deploy);
  assert.ok(own.mana.every(x=>!x.tapped));
  assert.equal(s.active,1);
 }
});

test('Heavy Pop wins with four allied creatures of another name and its own D2 field',()=>{
 for(const {count,owner,sealed,win} of [
  {count:4,owner:0,win:true},{count:3,owner:0,win:false},
  {count:4,owner:1,win:false},{count:4,owner:0,sealed:true,win:false}
 ]){
  const s=field();
  put(s,0,'battle',POP);
  put(s,owner,'battle',FIELD);
  for(let i=0;i<count;i++){
   const x=put(s,0,'battle',NATURE,{sealed:!!sealed&&i===0});
   if(x.sealed)put(s,0,'seals',NATURE,{faceDown:true,sealOf:x.uid});
  }
  put(s,1,'battle',NATURE);
  startOwn(s);
  drain(s);
  assert.equal(s.winner,win?0:null,JSON.stringify({count,owner,sealed}));
 }
});

test('Spy privately inspects the selected full shield, then may flip all cards in place',()=>{
 for(const reveal of [false,true]){
  const s=field(),own=s.players[0],spy=put(s,0,'battle',SPY);
  const [root,other]=own.shields;
  const hidden=inst(FIRE),castle={...inst(CASTLE),faceUp:true};
  root.shieldStack=[hidden,castle];
  end(s);
  assert.equal(s.decision.player,0);
  pick(s,root);
  assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[root.cardId,hidden.cardId,castle.cardId]);
  assert.deepEqual(e.observation(s,1).players[0].publicShields.map(x=>x.uid),[castle.uid]);
  assert.equal(s.log.some(x=>JSON.stringify(x).includes(e.card(FIRE).name)),false);
  pick(s,reveal?true:null);
  drain(s);
  assert.equal(own.shields[0],root);
  assert.deepEqual(root.shieldStack,[hidden,castle]);
  assert.equal(!!other.faceUp,false);
  assert.deepEqual(e.observation(s,1).players[0].publicShields.map(x=>x.uid),
   reveal?[root.uid,hidden.uid,castle.uid]:[castle.uid]);
  assert.equal(s.g159ShieldAddedTurns?.[0]===s.turn,false);
  assert.equal(e.effectiveCard(spy,s).blocker,true);
 }
});

test('Spy exposes a G Castle whose leave replacement applies while face up (rule 822.3)',()=>{
 const s=field(),own=s.players[0];
 const spy=put(s,0,'battle',SPY);
 give(s,0,'shields',[HUSTLE]);
 const castle=own.shields[0];
 end(s);
 pick(s,castle);
 pick(s,true);
 assert.equal(castle.faceUp,true);
 assert.equal(own.mana.length,50);
 assert.equal(e.effectiveCard(spy,s).blocker,true);
 const attacker=put(s,1,'battle',FIRE);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.deepEqual(own.shields,[]);
 assert.ok(!own.hand.includes(castle));
 assert.ok(own.grave.includes(castle));
});

test('Babool taps when it enters and needs an allied D2 field only for the turn-start untap',()=>{
 for(const owner of [null,0,1]){
  const s=field();
  cast(s,BABOOL);
  const x=s.players[0].battle.find(x=>x.cardId===BABOOL);
  assert.ok(x?.tapped);
  assert.equal(e.power(x,false,s),5000);
  if(owner!==null)put(s,owner,'battle',FIELD);
  startOwn(s);
  drain(s);
  assert.equal(x.tapped,owner!==0);
  assert.equal(e.power(x,false,s),owner===0?10000:5000);
  if(owner!==0){
   untap(s,x);
   assert.equal(x.tapped,false);
   assert.equal(e.power(x,false,s),10000);
  }
 }
});

test('Babool stacks two real untap bonuses on present allies, then expires both',()=>{
 const s=field(),enemy=put(s,1,'battle',NATURE),ally=put(s,0,'battle',LIGHT);
 const babools=[0,1].map(()=>put(s,0,'battle',BABOOL,{tapped:true}));
 const p=e.power(ally,false,s),q=e.power(enemy,false,s);
 for(const x of babools)untap(s,x);
 untap(s,babools[1]);
 assert.equal(e.power(ally,false,s),p+10000);
 assert.equal(e.power(enemy,false,s),q);
 const late=put(s,0,'battle',LIGHT);
 assert.equal(e.power(late,false,s),p);
 attack(s,ally.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 end(s);
 drain(s);
 assert.equal(e.power(ally,false,s),p);
 assert.ok(!s.extLimits?.some(l=>l.kind==='g412ExtraBreak'));
});
