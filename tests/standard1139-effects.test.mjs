import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KIRIKO='dm26rp1-S003',DRAG='dm26rp1-017',LOBBY='dm26rp2-050';
const WATER='dm01-083',GEAR='dm14-110',HYPER='dm24rp2-045';
const FIRE='dm01-097',DARK='dm01-090',NATURE='dm01-108',HAND='dm01-027',BOUNCE='dm01-086';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const put=(s,p,zone,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;};
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const values=s=>(s.decision?.choices??[]).map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));return s;};
const end=s=>{if(s.phase==='main')act(s,'toAttack');act(s,'endTurn');};
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const bounce=(s,uid)=>{play(s,BOUNCE);act(s,'effect',a=>a.targets[0]?.uid===uid);};

test('three official cards and five prints keep the canonical definitions and restrictions',()=>{
 const manifest=read('tools/support-phase-1139.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[KIRIKO,DRAG,LOBBY]);
 assert.equal(manifest.printAliases.length,2);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,detail={...details.cards.find(x=>x.id===id),id:row.id,faces:row.faces};
  const spec=manifest.cards.find(x=>x.id===id).spec;
  const c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec(detail,{phase:1139}),spec);
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,parseInt(f.powerText,10),f.race,1,4]);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(ref=>ref.id===row.id&&ref.canonicalId===id&&ref.image===row.image));
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  detail.faces=structuredClone(row.faces);
  detail.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(detail,{phase:1139}));
 }
});

test('Kiriko needs one water creature from hand and draws before evaluating the free element',()=>{
 const s=field(),base=put(s,0,'hand','dmbd10-010'),spell=put(s,0,'hand',BOUNCE);
 const dark=put(s,0,'hand',DARK),high=put(s,0,'hand','dm26ex1-N008');
 const gear=inst(GEAR);
 s.players[0].deck.unshift(gear,inst(FIRE),inst(NATURE));
 const kiriko=play(s,KIRIKO);
 assert.equal(s.decision.task.op,'g48_HandBases');
 assert.deepEqual(values(s),[base.uid]);
 pick(s,base.uid);
 assert.deepEqual(kiriko.under,[base]);
 assert.equal(s.players[0].hand.length,6);
 assert.equal(e.effectiveCard(kiriko,s).breaker,3);
 assert.ok(values(s).includes(gear.uid)&&values(s).includes(dark.uid));
 assert.ok(!values(s).includes(spell.uid)&&!values(s).includes(high.uid));
 const tapped=s.players[0].mana.filter(x=>x.tapped).length;
 pick(s,gear.uid);drain(s);
 assert.ok(s.players[0].battle.includes(gear));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,tapped);
});

test('Kiriko may choose no element and filters a second Kiriko by its own legal hand base',()=>{
 for(const hasWater of [false,true]){
  const s=field(),base=put(s,0,'hand',WATER);
  const next=put(s,0,'hand',KIRIKO);
  for(let i=0;i<3;i++)put(s,0,'hand',NATURE);
  if(hasWater)s.players[0].deck.unshift(inst(WATER));
  const first=play(s,KIRIKO);
  pick(s,base.uid);
  assert.equal(s.players[0].hand.length,7);
  assert.equal(values(s).includes(next.uid),hasWater);
  pick(s,null);
  assert.deepEqual(s.players[0].battle,[first]);
  assert.ok(s.players[0].hand.includes(next));
  assert.equal(legal(s,'play').some(a=>a.uid===next.uid),hasWater);
 }
});

test('Zoro sends the attempted Kiriko and Dedodam to extra; only Kiriko can return with a fresh base (QA48906)',()=>{
 for(const fresh of [false,true]){
  const s=field(),base=put(s,0,'hand','dmbd10-010');
  put(s,1,'battle','dm26rp2-S001');
  const kiriko=play(s,KIRIKO);
  pick(s,base.uid);
  assert.deepEqual(s.players[0].extra,[kiriko,base]);
  assert.equal(s.players[0].hand.length,0);
  end(s);drain(s);
  const later=fresh?put(s,0,'hand',WATER):null;
  act(s,'skipCharge');end(s);
  if(later){
   assert.equal(s.decision.task.op,'g48_HandBases');
   pick(s,later.uid);drain(s);
   assert.deepEqual(kiriko.under,[later]);
   assert.ok(s.players[0].battle.includes(kiriko));
  }else assert.ok(s.players[0].extra.includes(kiriko));
  assert.ok(s.players[0].extra.includes(base));
 }
});

test('Inferno Dragoon uses a real shield trigger, enters as a blocker, and mills three together',()=>{
 const s=field();s.active=1;
 const attacker=put(s,1,'battle',FIRE);
 give(s,0,'shields',[DRAG]);
 const source=s.players[0].shields[0],milled=s.players[0].deck.slice(0,3);
 attack(s,attacker.uid);act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===source.uid);drain(s);
 assert.ok(s.players[0].battle.includes(source));
 assert.equal(e.effectiveCard(source,s).blocker,true);
 assert.deepEqual(s.players[0].grave,milled);
});

test('Inferno Dragoon can bottom itself on destruction and deploy only a Hyper Beast costing at most five',()=>{
 const s=field(),drag=put(s,1,'battle',DRAG),hyper=put(s,1,'grave',HYPER);
 const big=put(s,1,'grave','dm24rp1-DM1'),plain=put(s,1,'grave',FIRE);
 play(s,HAND);act(s,'effect',a=>a.targets[0]?.uid===drag.uid);
 assert.equal(s.decision.task.op,'g34_SelfGraveBottom839');pick(s,true);
 assert.equal(s.players[1].deck.at(-1),drag);
 assert.deepEqual(values(s),[hyper.uid]);
 pick(s,hyper.uid);drain(s);
 assert.deepEqual(s.players[1].battle,[hyper]);
 assert.deepEqual(s.players[1].grave,[big,plain]);
});

test('Inferno Dragoon may decline, and returning it to hand never opens its destruction ability',()=>{
 for(const destroy of [true,false]){
  const s=field(),drag=put(s,1,'battle',DRAG);
  const hyper=put(s,1,'grave',HYPER);
  play(s,destroy?HAND:BOUNCE);act(s,'effect',a=>a.targets[0]?.uid===drag.uid);
  if(destroy){assert.equal(s.decision.task.op,'g34_SelfGraveBottom839');pick(s,null);}
  assert.equal(s.decision,null);
  assert.ok(s.players[1][destroy?'grave':'hand'].includes(drag));
  assert.ok(s.players[1].grave.includes(hyper));
 }
});

test('Lobby gains 2000 per other creature leaving either side, then loses the bonuses at turn end',()=>{
 const s=field(),lobby=put(s,0,'battle',LOBBY),ally=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',FIRE);
 assert.equal(e.effectiveCard(lobby,s).blocker,true);
 assert.equal(e.effectiveCard(lobby,s).poweredBreaker,true);
 bounce(s,enemy.uid);
 assert.equal(e.power(lobby,false,s),5000);
 play(s,BOUNCE);act(s,'effect',a=>a.targets[0]?.uid===ally.uid);
 assert.equal(e.power(lobby,false,s),7000);
 const before=s.players[1].shields.length;
 attack(s,lobby.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,before-2);
 end(s);drain(s);
 assert.equal(e.power(lobby,false,s),3000);
});

test('Lobby cannot trigger for its own simultaneous departure, an ignored ability, or a departing gear',()=>{
 const s=field(),lobby=put(s,0,'battle',LOBBY);
 for(const p of [0,1])for(let i=0;i<(p?3:2);i++)put(s,p,'battle',NATURE);
 play(s,'dm14-015');drain(s);
 assert.ok(s.players[0].grave.includes(lobby));
 assert.equal(s.pendingEffects?.length??0,0);
 assert.ok(!s.log.some(x=>x.cardId===LOBBY&&x.type==='power'));
 const t=field(),watcher=put(t,0,'battle',LOBBY),genmu=put(t,1,'battle','dmrp15-km1');
 play(t,HAND);act(t,'effect',a=>a.targets[0]?.uid===genmu.uid);
 assert.equal(e.power(watcher,false,t),3000);
 const gear=put(t,1,'battle',GEAR);
 play(t,'dm25rp2-S10');pick(t,1);pick(t,0);pick(t,gear.uid);drain(t);
 assert.equal(e.power(watcher,false,t),3000);
});

test('Inferno Dragoon cannot use its grave payment under Apul',()=>{
 const s=field(),drag=put(s,1,'battle',DRAG),hyper=put(s,1,'grave',HYPER);
 put(s,0,'battle','dmrp22-042');
 play(s,HAND);act(s,'effect',a=>a.targets[0]?.uid===drag.uid);
 assert.equal(s.decision,null);
 assert.ok(s.players[1].grave.includes(drag)&&s.players[1].grave.includes(hyper));
});

test('Lobby triggers once for each creature in a sweep it survives',()=>{
 const s=field(),lobby=put(s,0,'battle',LOBBY);
 put(s,1,'battle',NATURE);put(s,1,'battle',FIRE);
 s.extTasks=[{op:'g34_Sweep',p:0,source:'dm01-027',filter:{creature:true}}];
 act(s,'toAttack');drain(s);
 assert.equal(s.players[1].grave.length,2);
 assert.equal(e.power(lobby,false,s),7000);
});
