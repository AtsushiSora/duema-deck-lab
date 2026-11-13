import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const AQUA='dmbd13-012',ONI='dmbd13-013',SHIELD='dm25ex2-075',SWORD='dm25ex2-078';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const SIGN='dmr13-016',HARDCORE='dmex12-s04',RED='dmr17-081',INVADER='dmr17-l02',CHANGE='dmex12-s20';
const JOHN='dm37-033',ANGEL='dm37-021',ORFLAME='dm36-059',CATLASS='dm36-047',GEO='dm25ex4-049';
const values=s=>s.decision?.choices?.map(c=>c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>(values(s)[a.choice]?.uid??values(s)[a.choice])===value);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

function table(format='original'){
 const decks=PRESETS.slice(0,2).map(d=>({...d,format,extraCards:[]}));
 const s=e.createGame(decks,{seed:1112});
 s.turn=3;
 s.phase='main';
 for(const p of [0,1]){
  for(const zone of ['hand','battle','grave'])give(s,p,zone,[]);
  give(s,p,'mana',[LIGHT,WATER,DARK,FIRE,NATURE].flatMap(id=>Array(3).fill(id)));
  give(s,p,'shields',Array(5).fill(NATURE));
 }
 return s;
}

function place(s,p,zone,id,attrs={}){
 const x={...inst(id),...attrs};
 s.players[p][zone].push(x);
 return x;
}

function play(s,id,face=0){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}

test('the four official definitions, seven prints and their canonical deck IDs agree',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1112.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 for(const row of manifest.cards){
  assert.deepEqual(row.faces,details.cards.find(d=>d.id===row.id).faces);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1112}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  const incomplete=structuredClone(details.cards.find(d=>d.id===row.id));
  incomplete.faces.at(-1).abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:1112}));
 }
 for(const row of manifest.printAliases){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1112}),row.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
 }
 assert.deepEqual(e.playFaces(e.card(AQUA)).map(c=>[c.cost,!!c.trigger]),[[3,false],[7,true]]);
 assert.deepEqual(e.playFaces(e.card(ONI)).map(c=>[c.cost,!!c.trigger]),[[5,true],[6,false]]);
});

test('Onimaru selects a single card underneath evolution and a seal as a zero-cost card',()=>{
 const s=table();
 const base=inst(WATER),top=place(s,1,'battle',INVADER,{under:[base]});
 const sealed=place(s,1,'battle',RED,{sealed:true});
 const seal=place(s,1,'seals',LIGHT,{faceDown:true,sealOf:sealed.uid});
 const gear=place(s,1,'battle','dm14-110');
 play(s,ONI);
 assert.ok(values(s).includes(base.uid));
 assert.ok(values(s).includes(seal.uid));
 assert.ok(values(s).includes(gear.uid));
 assert.ok(!values(s).includes(top.uid)&&!values(s).includes(sealed.uid));
 pick(s,base.uid);
 assert.ok(inZone(s,1,'grave',base));
 assert.ok(inZone(s,1,'battle',top)&&inZone(s,1,'battle',gear));
 play(s,ONI);
 pick(s,seal.uid);
 assert.ok(inZone(s,1,'grave',seal));
 assert.ok(!sealed.sealed);
});

test('Onimaru sends both borrowed top cards and borrowed evolution sources to their owner’s graveyard',()=>{
 const s=table();
 const base={...inst(WATER),cardOwner:0};
 const top=place(s,1,'battle',INVADER,{under:[base]});
 const gear=place(s,1,'battle','dm14-110',{cardOwner:0});
 play(s,ONI);
 pick(s,base.uid);
 assert.ok(inZone(s,0,'grave',base)&&inZone(s,1,'battle',top));
 play(s,ONI);
 pick(s,gear.uid);
 assert.ok(inZone(s,0,'grave',gear)&&!inZone(s,1,'grave',gear));
});

test('Onishura Hole sweeps using current power, then offers Fire Psychic faces up to cost seven',()=>{
 const s=table('advance');
 const first=place(s,1,'battle',FIRE),second=place(s,1,'battle',WATER);
 const strengthened=place(s,1,'battle',DARK,{powerModifiers:[{amount:3000}]});
 const own=place(s,0,'battle',FIRE);
 const john=place(s,0,'extra',JOHN),orflame=place(s,0,'extra',ORFLAME),geo=place(s,0,'extra',GEO);
 const plain=place(s,0,'extra',FIRE);
 play(s,ONI,1);
 assert.ok(inZone(s,1,'grave',first)&&inZone(s,1,'grave',second));
 assert.ok(inZone(s,1,'battle',strengthened)&&inZone(s,0,'battle',own));
 assert.deepEqual(values(s).map(v=>[v.uid,!!v.g1104Back]),[[john.uid,true],[orflame.uid,false]]);
 pick(s,john.uid);
 assert.ok(inZone(s,0,'battle',john)&&inZone(s,0,'extra',geo)&&inZone(s,0,'extra',plain));
 assert.equal(e.card(s.players[0].battle.find(x=>x.uid===john.uid)).name,'冒険の覚醒者ジョンジョ・ジョン');
});

test('JCA Hole draws first, bottoms one physical hand card, then deploys the eligible Water back face',()=>{
 const s=table('advance'),own=s.players[0];
 const hand=place(s,0,'hand',NATURE);
 const draws=own.deck.slice(0,2);
 const angel=place(s,0,'extra',ANGEL),catlass=place(s,0,'extra',CATLASS);
 play(s,AQUA,1);
 assert.ok(draws.every(x=>inZone(s,0,'hand',x)));
 assert.deepEqual(new Set(values(s).map(v=>v.uid)),new Set([hand,...draws].map(x=>x.uid)));
 pick(s,hand.uid);
 assert.equal(own.deck.at(-1).uid,hand.uid);
 assert.deepEqual(values(s).map(v=>[v.uid,!!v.g1104Back]),[[angel.uid,true],[catlass.uid,false]]);
 pick(s,angel.uid);
 assert.ok(inZone(s,0,'battle',angel));
});

test('Aqua returns a summon reduced to zero, only during the opponent turn (QA 38714 equivalent)',()=>{
 for(const [id,expected] of [['dmsd01-012',true],[FIRE,false]]){
  const s=table();
  place(s,0,'battle','dmx13-034');
  place(s,1,'battle',AQUA);
  const entrant=play(s,id);
  if(expected){
   assert.equal(s.decision.task.op,'g34_PayAura560');
   pick(s,2);
   assert.equal(s.decision.player,1);
   assert.deepEqual(values(s),[true,null]);
   pick(s,true);
   assert.ok(inZone(s,0,'hand',entrant));
  }else{
   assert.equal(s.decision,null);
   assert.ok(inZone(s,0,'battle',entrant));
  }
 }
 const s=table();
 place(s,0,'battle',AQUA);
 const entrant=place(s,1,'hand',FIRE);
 s.extTasks=[{op:'putCreature',p:1,source:SIGN,origin:'hand',uid:entrant.uid}];
 act(s,'toAttack');
 assert.equal(s.decision,null);
 assert.ok(inZone(s,1,'battle',entrant));
});

test('Aqua still returns Emotional Hardcore after Hardcore names the watcher (QA 38716)',()=>{
 const s=table();
 const watcher=place(s,1,'battle',AQUA),hardcore=place(s,0,'hand',HARDCORE);
 play(s,SIGN);
 pick(s,hardcore.uid);
 const name=e.card(AQUA).name;
 const option=values(s).find(v=>typeof v==='string'&&(v===name||name.startsWith(v+' / ')));
 assert.ok(option,JSON.stringify(s.decision));
 pick(s,option);
 assert.equal(e.effectiveCard(watcher,s).g1112UnpaidBounce,undefined);
 pick(s,true);
 assert.ok(inZone(s,0,'hand',hardcore));
});

test('Aqua returns the exact entrant to its owner even when opposing effects cannot choose it',()=>{
 const s=table();
 place(s,1,'battle',AQUA);
 const entrant=place(s,0,'hand','dm11-007',{cardOwner:1});
 assert.equal(e.card(entrant).untargetable,true);
 const unrelated=place(s,0,'battle',FIRE);
 s.extTasks=[{op:'putCreature',p:0,source:SIGN,origin:'hand',uid:entrant.uid}];
 act(s,'toAttack');
 assert.equal(s.decision?.source,AQUA);
 pick(s,true);
 assert.ok(inZone(s,1,'hand',entrant)&&inZone(s,0,'battle',unrelated));
});

test('Aqua does not return the new attacker after the watched invasion leaves (QA 38715)',()=>{
 const s=table();
 const red=place(s,0,'battle',RED),watcher=place(s,1,'battle',AQUA);
 const invader=place(s,0,'hand',INVADER),replacement=place(s,0,'hand',CHANGE);
 attack(s,red.uid);
 assert.equal(s.decision.task.op,'revDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'g23_Declare');
 pick(s,true);
 const order=id=>act(s,'orderEffect',a=>s.pendingEffects.find(effect=>effect.effectId===a.effectId)?.source===id);
 order(INVADER);
 assert.equal(s.decision.task.op,'g23_Invade');
 pick(s,true);
 order(INVADER);
 assert.equal(s.decision.task.op,'revResolve');
 pick(s,invader.uid);
 assert.notEqual(s.decision?.source,AQUA);
 assert.ok(inZone(s,1,'grave',watcher)&&inZone(s,0,'hand',invader)&&inZone(s,0,'battle',replacement));
});

test('Princess Shield can bounce twice with a hand card, including in Original',()=>{
 const s=table();
 const first=place(s,1,'battle',FIRE),second=place(s,1,'battle',WATER);
 const large=place(s,1,'battle',INVADER),payment=place(s,0,'hand',NATURE);
 play(s,SHIELD);
 assert.ok(!values(s).some(v=>v?.uid===large.uid));
 pick(s,first.uid);
 assert.ok(inZone(s,1,'hand',first)&&inZone(s,1,'battle',second));
 pick(s,payment.uid);
 pick(s,second.uid);
 assert.ok(inZone(s,1,'hand',second)&&inZone(s,0,'extra',payment));
});

test('Princess Sword grants two distinct fresh creatures haste this turn if the repeat is used',()=>{
 const s=table();
 const first=place(s,0,'battle',FIRE,{entered:s.turn}),second=place(s,0,'battle',WATER,{entered:s.turn});
 const payment=place(s,0,'hand',DARK);
 play(s,SWORD);
 pick(s,first.uid);
 assert.equal(e.effectiveCard(first,s).speedAttacker,true);
 assert.equal(!!e.effectiveCard(second,s).speedAttacker,false);
 pick(s,payment.uid);
 pick(s,second.uid);
 assert.equal(e.effectiveCard(second,s).speedAttacker,true);
 assert.ok(inZone(s,0,'extra',payment));
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 assert.equal(!!e.effectiveCard(first,s).speedAttacker,false);
 assert.equal(!!e.effectiveCard(second,s).speedAttacker,false);
});

test('the Princess spells can decline the repeat and continue if the first effect lacks targets',()=>{
 for(const id of [SHIELD,SWORD]){
  const s=table();
  const payment=place(s,0,'hand',NATURE);
  play(s,id);
  assert.deepEqual(values(s).map(v=>v?.uid??v),[payment.uid,null]);
  pick(s,null);
  assert.ok(inZone(s,0,'hand',payment));
  assert.equal(s.decision,null);
  play(s,id);
  pick(s,payment.uid);
  assert.ok(inZone(s,0,'extra',payment));
  assert.equal(s.decision,null);
 }
});
