import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SAE='dm26rp2-073',DOL='dm26rp2-064',RED='dm26ex2-069';
const WATER='dm01-083',GEAR='dm14-110',QUEEN='dm25ex1-065';
const FIRE='dm01-097',DARK='dm01-090',NATURE='dm01-108',HAND='dm01-027',BOUNCE='dm01-086';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const put=(s,p,zone,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;};
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const values=s=>(s.decision?.choices??[]).map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));return s;};
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);

test('three official cards and three prints keep the canonical definitions and restrictions',()=>{
 const manifest=read('tools/support-phase-1140.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[SAE,DOL,RED]);
 assert.equal(manifest.printAliases.length,0);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,detail={...details.cards.find(x=>x.id===id),id:row.id,faces:row.faces};
  const spec=manifest.cards.find(x=>x.id===id).spec;
  const c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec(detail,{phase:1140}),spec);
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
  assert.throws(()=>standardCardSpec(detail,{phase:1140}));
 }
});

const seal=(s,p,host,id)=>{
 host.sealed=true;
 return put(s,p,'seals',id,{faceDown:true,sealOf:host.uid});
};
const launcher=(s,base)=>{
 const red=play(s,RED);
 act(s,'evolve',a=>a.baseUid===base.uid);
 return red;
};

test('Saepoyo discounts only allied creatures and the execution cost bottoms at one',()=>{
 const s=field(),sae=put(s,0,'hand',SAE);
 const ally=put(s,0,'battle',NATURE,{tapped:true}),sealed=put(s,0,'battle',FIRE);
 seal(s,0,sealed,DARK);
 put(s,0,'battle',GEAR);
 put(s,1,'battle',NATURE);
 assert.equal(legal(s,'play').find(a=>a.uid===sae.uid).cost,6);
 for(let i=0;i<8;i++)put(s,0,'battle',NATURE);
 assert.equal(legal(s,'play').find(a=>a.uid===sae.uid).cost,1);
 act(s,'play',a=>a.uid===sae.uid);
 assert.ok(s.players[0].battle.includes(sae)&&ally.tapped);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.equal(e.effectiveCard(sae,s).breaker,3);
});

test('Saepoyo can replace a battle involving its ally by tapping and fighting instead',()=>{
 for(const accept of [true,false]){
  const s=field(),sae=put(s,1,'battle',SAE),ally=put(s,1,'battle',NATURE,{tapped:true});
  const attacker=put(s,0,'battle','dm01-001');
  attack(s,attacker.uid,ally.uid);act(s,'noBlock');
  assert.equal(s.decision.task.op,'g393SG_Battle');
  pick(s,accept?sae.uid:null);drain(s);
  assert.equal(sae.tapped,accept);
  assert.equal(s.players[0].grave.includes(attacker),accept);
  assert.equal(s.players[1].battle.includes(ally),accept);
 }
});

test('Doluter enters as a Command, then may recover exactly the matching seal it removed',()=>{
 for(const accept of [true,false]){
  const s=field(),host=put(s,0,'battle',DARK),other=put(s,0,'battle',FIRE);
  const own=seal(s,0,host,FIRE),wrong=seal(s,0,other,NATURE);
  const unrelated=put(s,0,'grave',FIRE);
  play(s,DOL);
  assert.equal(s.decision.task.op,'g23_Unseal');
  assert.deepEqual(values(s),[own.uid]);
  pick(s,own.uid);
  assert.equal(s.decision.task.op,'g34_Offer');
  assert.ok(s.players[0].grave.includes(own)&&!own.faceDown);
  pick(s,accept?true:null);
  assert.ok(s.players[0][accept?'hand':'grave'].includes(own));
  assert.ok(s.players[0].grave.includes(unrelated));
  assert.deepEqual(s.players[0].seals,[wrong]);
 }
});

test('Doluter sees each owned seal independently, with competing recoveries tracking the physical grave card',()=>{
 const s=field();
 put(s,0,'battle',DOL);put(s,0,'battle',DOL);
 const host=put(s,0,'battle',DARK),first=seal(s,0,host,NATURE),second=seal(s,0,host,FIRE);
 const attacker=put(s,1,'battle',DARK),opponentSeal=seal(s,1,attacker,WATER);
 s.extTasks=[first,second,opponentSeal].map((x,i)=>({op:'g23_Unseal',p:i===2?1:0,source:DOL,colors:['闇']}));
 act(s,'toAttack');
 pick(s,first.uid);pick(s,second.uid);pick(s,opponentSeal.uid);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect');
 assert.equal(s.decision.task.op,'g34_Offer');
 const recovered=s.players[0].grave.find(x=>x.uid===s.decision.task.uid);
 pick(s,true);drain(s);
 assert.ok(s.players[0].hand.includes(recovered));
 assert.ok(s.players[1].grave.includes(opponentSeal));
 assert.equal(s.players[0].grave.length+s.players[0].hand.length,2);
 assert.equal(e.physicalCards(s).filter(x=>x.uid===first.uid).length,1);
 assert.equal(e.physicalCards(s).filter(x=>x.uid===second.uid).length,1);
});

test('Doluter ignores non-grave seal movement and an ordinary card sent to the grave',()=>{
 const s=field();
 put(s,0,'battle',DOL);const host=put(s,0,'battle',DARK);
 const covered=seal(s,0,host,NATURE);
 s.active=1;play(s,'dmrp08-037');pick(s,covered.uid);drain(s);
 assert.ok(s.players[0].hand.includes(covered));
 const ordinary=put(s,0,'battle',FIRE);
 play(s,HAND);act(s,'effect',a=>a.targets[0]?.uid===ordinary.uid);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].grave.includes(ordinary));
});

test('Red Launcher selects only fire or nature creatures in mana and has Mach Fighter and W Breaker',()=>{
 const s=field(),red=play(s,RED);
 const options=legal(s,'evolve').map(a=>s.players[0].mana.find(x=>x.uid===a.baseUid).cardId);
 assert.deepEqual(new Set(options),new Set([FIRE,NATURE]));
 const base=s.players[0].mana.find(x=>x.cardId===FIRE);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.deepEqual(red.under,[base]);
 assert.ok(!s.players[0].mana.includes(base));
 assert.equal(e.effectiveCard(red,s).breaker,2);
 const defender=put(s,1,'battle',NATURE);
 attack(s,red.uid,defender.uid);act(s,'noBlock');drain(s);
 assert.ok(s.players[1].grave.includes(defender));
});

test('Queen replaces a four-mana Red Launcher entry using the three remaining mana (QA 49082)',()=>{
 for(const count of [4,5]){
  const s=field();
  give(s,0,'mana',[FIRE,NATURE,DARK,WATER,...(count===5?[NATURE]:[])]);
  const base=s.players[0].mana[0];
  put(s,1,'battle',QUEEN);
  const physical=e.physicalCards(s).length;
  const red=launcher(s,base);
  if(count===4){
   assert.ok(s.players[0].mana.includes(red)&&s.players[0].mana.includes(base));
   assert.ok(red.tapped&&base.tapped);
   assert.equal(s.players[0].battle.length,0);
  }else assert.deepEqual(red.under,[base]);
  assert.equal(e.physicalCards(s).length,physical+1);
 }
});

test('Zoro moves Red Launcher and its mana evolution base to the extra zone (QA 48906)',()=>{
 const s=field(),base=s.players[0].mana.find(x=>x.cardId===NATURE);
 put(s,1,'battle','dm26rp2-S001');
 const red=launcher(s,base);
 assert.deepEqual(s.players[0].extra,[red,base]);
 assert.equal(s.players[0].battle.length,0);
 assert.deepEqual(s.g35Deferred.map(x=>x.uid),[red.uid]);
});

test('Redzone Z moves the summoned creature and its mana evolution base to the graveyard',()=>{
 const s=field(),base=s.players[0].mana.find(x=>x.cardId===NATURE);
 put(s,1,'battle','dm25rp3-005');put(s,1,'battle','dm26ex2-069');
 s.active=1;
 const red=put(s,0,'hand',RED);
 s.extTasks=[{op:'putCreature',p:0,source:RED,uid:red.uid,origin:'hand',execution:true}];
 act(s,'toAttack');
 act(s,'extended',a=>values(s)[a.choice]===base.uid);
 assert.deepEqual(s.players[0].grave,[red,base]);
 assert.equal(s.players[0].battle.length,0);
 assert.ok(!s.players[0].mana.includes(base));
});

test('Red Launcher sends its whole stack to mana on destruction and to hand on bounce',()=>{
 for(const [spell,zone] of [[HAND,'mana'],[BOUNCE,'hand']]){
  const s=field(),base=s.players[0].mana.find(x=>x.cardId===NATURE),red=launcher(s,base);
  s.active=1;
  play(s,spell);act(s,'effect',a=>a.targets[0]?.uid===red.uid);
  assert.ok(s.players[0][zone].includes(red)&&s.players[0][zone].includes(base));
  assert.ok(!red.under);
  assert.equal(s.players[0].grave.length,0);
  if(zone==='mana')assert.equal(red.tapped,true);
 }
});
