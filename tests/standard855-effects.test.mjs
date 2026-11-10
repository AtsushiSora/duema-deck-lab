import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const MECHA='dmr06-042',PURE='dm30-008',CANDLE='dmr06-043',REPRINT='dm23ex1-032';
const BODY='dm01-108',ROBOT='dm28-073',GEAR='dm14-110',GEAR2='dm23ex1-058';
const QX='dmrp07-m01',TSU='dmrp22-030',LOCK='dm25rp2-022',NO_BATTLE='dm06-032';
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(({value})=>value?.uid??value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(BODY));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function order(s,cards){
 for(const x of cards){
  assert.equal(s.decision.task.op,'g34_Order');
  pick(s,x.uid);
 }
}

test('Phase 855 validates all official clauses and joins the Pure Ikazuchi reprint',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-855.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[MECHA,PURE,CANDLE]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:855}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:854}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:855}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.name,c.cost,c.race,c.civilizations,c.manaValue,c.limit],[f.name,f.cost,f.race,f.civilizations,1,4]);
  if(c.type==='creature')assert.equal(c.power,Number(f.powerText));
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
 const [alias]=m.printAliases;
 assert.equal(m.printAliases.length,1);
 assert.deepEqual([alias.id,alias.canonicalId],[REPRINT,PURE]);
 assert.deepEqual(standardCardSpec({...alias,status:'complete'},{phase:855}),m.cards[1].spec);
 assert.equal(m.regulationVerification.limits[REPRINT],4);
 assert.deepEqual(registry.resolveRows([{id:REPRINT,count:3},{id:PURE,count:1}]),[{id:PURE,count:4}]);
 assert.ok(!data.cards.some(x=>x.id===REPRINT));
});

test('Mecha Machine draws two after a normal four-mana cast',()=>{
 const s=field();
 const top=s.players[0].deck.slice(0,2),spell=play(s,MECHA);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),top.map(x=>x.uid));
 assert.ok(has(s,0,'grave',spell));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
});

test('A spell drawn by Mecha Machine misses the same attack timing (QA 36649)',()=>{
 let s=field();
 const robot=add(s,0,'battle',ROBOT),spell=add(s,0,'hand',MECHA);
 give(s,0,'deck',[MECHA,BODY,BODY,BODY]);
 give(s,0,'mana',[]);
 const second=s.players[0].deck[0];
 attack(s,robot.uid);
 assert.equal(s.decision.task.op,'g34_Chance417');
 s=structuredClone(s);
 pick(s,true);
 assert.ok(has(s,0,'grave',spell)&&has(s,0,'hand',second));
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.decision.type,'block');
});

test('Mecha Machine is optional, requires the attacker race and remains pending if the attacker leaves',()=>{
 for(const [id,accept] of [[BODY,false],[ROBOT,false],[ROBOT,true]]){
  const s=field(),attacker=add(s,0,'battle',id),spell=add(s,0,'hand',MECHA);
  attack(s,attacker.uid);
  if(id===BODY)assert.equal(s.decision.type,'block');
  else{
   assert.equal(s.decision.task.op,'g34_Chance417');
   if(accept){
    s.players[0].battle.splice(0,1);
    s.players[0].grave.push(attacker);
   }
   pick(s,accept?true:null);
  }
  assert.equal(has(s,0,'grave',spell),accept);
  assert.equal(has(s,0,'hand',spell),!accept);
 }
});

test('Pure Ikazuchi deploys exactly one gear from five revealed cards and orders all remaining cards',()=>{
 let s=field();
 give(s,0,'deck',[GEAR,MECHA,GEAR2,CANDLE,BODY,GEAR,BODY]);
 const [first,spell,selected,creature,body,...tail]=s.players[0].deck;
 const pure=play(s,PURE);
 assert.deepEqual(values(s),[first.uid,selected.uid]);
 assert.match(s.log.find(x=>x.type==='reveal').text,/山札の上5枚/);
 s=structuredClone(s);
 pick(s,selected.uid);
 assert.ok(has(s,0,'battle',selected)&&has(s,0,'battle',pure));
 assert.ok(!s.players[0].battle.find(x=>x.uid===selected.uid).crossedTo);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
 assert.deepEqual(values(s),[first.uid,spell.uid,creature.uid,body.uid]);
 order(s,[creature,first,body]);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[...tail,creature,first,body,spell].map(x=>x.uid));
 assert.deepEqual(s.players[0].g34Protected,[]);
});

for(const blocked of [false,true])test('Pure Ikazuchi still orders the revealed cards without a deployable gear: '+blocked,()=>{
 const s=field();
 if(blocked)add(s,1,'battle',LOCK);
 give(s,0,'deck',[blocked?GEAR:BODY,CANDLE,BODY,MECHA]);
 const [a,b,c,d]=s.players[0].deck;
 play(s,PURE);
 assert.equal(s.decision.task.op,'g34_Order');
 order(s,[d,b,a]);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[d,b,a,c].map(x=>x.uid));
 assert.equal(s.players[0].battle.length,1);
});

test('Pure Ikazuchi reveals nothing against QX and only the top card against Tsu',()=>{
 for(const gate of [QX,TSU]){
  const s=field();
  add(s,1,'battle',gate);
  give(s,0,'deck',[GEAR,GEAR2,BODY]);
  const [first,second,last]=s.players[0].deck;
  play(s,PURE);
  if(gate===QX){
   assert.equal(s.decision,null);
   assert.ok(!s.log.some(x=>x.type==='reveal'));
   assert.deepEqual(s.players[0].deck.map(x=>x.uid),[first,second,last].map(x=>x.uid));
  }else{
   assert.deepEqual(values(s),[first.uid]);
   pick(s,first.uid);
   assert.ok(has(s,0,'battle',first));
   assert.deepEqual(s.players[0].deck.map(x=>x.uid),[second,last].map(x=>x.uid));
  }
 }
});

test('Candle destroys itself after a battle caused by its block',()=>{
 const s=field(),attacker=add(s,0,'battle',BODY),candle=add(s,1,'battle',CANDLE);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===candle.uid);
 assert.ok(has(s,0,'grave',attacker)&&has(s,1,'grave',candle));
 assert.ok(s.log.findIndex(x=>x.type==='afterBattle'&&x.cardId===CANDLE)>s.log.findIndex(x=>x.type==='battle'));
 assert.equal(s.players[1].shields.length,5);
});

test('Candle survives a block without a battle and a normal offensive battle',()=>{
 const s=field(),lizard=add(s,0,'battle',NO_BATTLE),candle=add(s,1,'battle',CANDLE);
 attack(s,lizard.uid);
 act(s,'block',a=>a.uid===candle.uid);
 assert.ok(has(s,1,'battle',candle));
 assert.ok(!s.log.some(x=>x.type==='battle'||x.type==='afterBattle'));
 const t=field(),source=add(t,0,'battle',CANDLE),target=add(t,1,'battle',BODY,{tapped:true});
 attack(t,source.uid,target.uid);
 act(t,'noBlock');
 assert.ok(has(t,0,'battle',source)&&has(t,1,'grave',target));
});

test('Candle can attack players and break two shields',()=>{
 const s=field(),candle=add(s,0,'battle',CANDLE);
 give(s,1,'shields',[BODY,BODY]);
 attack(s,candle.uid);
 act(s,'noBlock');
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.players[1].hand.length,2);
 assert.ok(has(s,0,'battle',candle));
});
