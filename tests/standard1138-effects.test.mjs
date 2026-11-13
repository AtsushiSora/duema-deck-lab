import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const HACHI='dm26ex1-N008',MANTRA='dm26ex2-087',DES='dm26rp2-S004';
const HUNTER='dmex12-096',ARMOR_GEAR='dm23ex1-024',GEAR='dm14-110';
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
 const manifest=read('tools/support-phase-1138.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[HACHI,MANTRA,DES]);
 assert.equal(manifest.printAliases.length,2);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,detail={...details.cards.find(x=>x.id===id),id:row.id,faces:row.faces};
  const spec=manifest.cards.find(x=>x.id===id).spec;
  const c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec(detail,{phase:1138}),spec);
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(ref=>ref.id===row.id&&ref.canonicalId===id&&ref.image===row.image));
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  detail.faces=structuredClone(row.faces);
  detail.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(detail,{phase:1138}));
 }
});

test('Hachi counts itself among four Hunters and untaps all other allies only',()=>{
 for(const n of [2,3]){
  const s=field(),hachi=play(s,HACHI);
  const hunters=Array.from({length:n},()=>put(s,0,'battle',HUNTER,{tapped:true}));
  const other=put(s,0,'battle',FIRE,{tapped:true}),enemy=put(s,1,'battle',FIRE,{tapped:true});
  assert.equal(e.effectiveCard(hachi,s).speedAttacker,true);
  assert.equal(e.effectiveCard(hachi,s).breaker,2);
  attack(s,hachi.uid);
  assert.ok(hachi.tapped&&enemy.tapped);
  assert.ok([...hunters,other].every(x=>x.tapped===(n===2)));
 }
});

test('each Hachi may save a Hunter, including itself, once during either turn',()=>{
 const s=field(),hachi=put(s,1,'battle',HACHI),hunter=put(s,1,'battle',HUNTER);
 const pay=put(s,1,'battle',FIRE),second=put(s,1,'battle',NATURE);
 const gear=put(s,1,'battle',GEAR);
 bounce(s,hachi.uid);
 assert.deepEqual(legal(s,'replaceHunter1138').map(a=>a.uid),[hunter.uid,pay.uid,second.uid]);
 assert.ok(!legal(s,'replaceHunter1138').some(a=>a.uid===gear.uid));
 const before=JSON.parse(JSON.stringify(s));
 assert.deepEqual(e.getLegalActions(before),e.getLegalActions(s));
 act(s,'replaceHunter1138',a=>a.uid===pay.uid);
 assert.ok(s.players[1].battle.includes(hachi)&&s.players[1].grave.includes(pay));
 bounce(s,hunter.uid);
 assert.ok(s.players[1].hand.includes(hunter));
 assert.ok(s.players[1].battle.includes(second));
 end(s);drain(s);act(s,'skipCharge');
 const ownHunter=put(s,1,'battle',HUNTER);
 const enemy=put(s,0,'battle','dm01-001',{tapped:true});
 assert.equal(s.active,1);
 attack(s,ownHunter.uid,enemy.uid);act(s,'noBlock');
 assert.ok(legal(s,'replaceHunter1138').some(a=>a.uid===second.uid));
 act(s,'replaceHunter1138',a=>a.uid===second.uid);
 assert.ok(s.players[1].battle.includes(ownHunter)&&s.players[1].grave.includes(second));
});

test('two Hachi sources can each replace a departure without reusing a payment',()=>{
 const s=field(),hachi=[put(s,1,'battle',HACHI),put(s,1,'battle',HACHI)];
 const targets=[put(s,1,'battle',HUNTER),put(s,1,'battle',HUNTER)];
 const payments=[put(s,1,'battle',NATURE),put(s,1,'battle',NATURE)];
 for(const [i,target] of targets.entries()){
  bounce(s,target.uid);
  const choices=legal(s,'replaceHunter1138').filter(a=>a.uid===payments[i].uid);
  assert.equal(choices.length,2-i);
  act(s,'replaceHunter1138',a=>a.uid===payments[i].uid&&a.key===choices[0].key);
  assert.ok(s.players[1].battle.includes(target));
 }
 assert.ok(hachi.every(x=>s.players[1].battle.includes(x)));
 assert.deepEqual(s.players[1].grave,payments);
});

test('Hachi can use a simultaneous destruction as payment and the payment cannot be replaced again',()=>{
 const s=field(),hachi=put(s,1,'battle',HACHI),hunter=put(s,1,'battle',HUNTER);
 const ex=put(s,1,'battle','dm26ex2-012'),shield=s.players[1].shields[0];
 ex.exLifeShieldUid=shield.uid;
 for(let n=0;n<3;n++)put(s,0,'battle',NATURE);
 play(s,'dm14-015');
 assert.equal(s.decision.uid,hachi.uid);
 act(s,'allowLeave');
 assert.equal(s.decision.uid,hunter.uid);
 act(s,'replaceHunter1138',a=>a.uid===ex.uid);
 drain(s);
 assert.deepEqual(s.players[1].battle,[hunter]);
 assert.ok(s.players[1].grave.includes(ex));
 assert.ok(s.players[1].shields.includes(shield));
 assert.equal(s.players[0].battle.length,0);
});

test('Mantra privately looks at two, can shield an Armored cross gear face up, and bottoms the rest',()=>{
 const s=field(),armor=inst(ARMOR_GEAR),other=inst(FIRE);
 s.players[0].deck.unshift(armor,other);
 play(s,MANTRA);
 assert.ok(values(s).includes(armor.uid)&&!values(s).includes(other.uid));
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[armor.cardId,other.cardId]);
 const enemy=e.observation(s,1);
 assert.ok(!JSON.stringify(enemy.decision).includes(armor.uid));
 pick(s,armor.uid);
 assert.ok(s.players[0].shields.includes(armor)&&armor.faceUp);
 assert.equal(s.players[0].deck.at(-1),other);
});

test('Mantra may decline a legal shield and orders both cards without revealing them',()=>{
 const s=field(),armor=inst(ARMOR_GEAR),other=inst(FIRE),count=s.players[0].shields.length;
 s.players[0].deck.unshift(armor,other);
 play(s,MANTRA);pick(s,null);pick(s,other.uid);
 assert.deepEqual(s.players[0].deck.slice(-2),[other,armor]);
 assert.equal(s.players[0].shields.length,count);
});

test('Des Shiraz only uses a dark creature from the grave and enters as one evolution',()=>{
 const s=field(),base=put(s,0,'grave',DARK),other=put(s,0,'grave',FIRE),spell=put(s,0,'grave',HAND);
 const des=play(s,DES);
 assert.equal(s.decision.task.op,'g31_Bases');
 assert.deepEqual(values(s),[base.uid]);
 pick(s,base.uid);
 assert.ok(e.isEvolution(des));
 assert.deepEqual(des.under,[base]);
 assert.deepEqual(s.players[0].grave,[other,spell]);
 assert.deepEqual(s.players[0].battle,[des]);
});

test('Des Shiraz has an optional two-card mill at its own turn start',()=>{
 for(const accept of [true,false]){
  const s=field();s.active=1;put(s,0,'battle',DES,{under:[inst(DARK)]});
  const top=s.players[0].deck.slice(0,2);
  end(s);
  assert.equal(s.decision.task.op,'g34_Mill');
  pick(s,accept?true:null);
  assert.deepEqual(s.players[0].grave,accept?top:[]);
 }
});

test('Des Shiraz counts the grave at resolution after the stack moves, and leaves opposing gear',()=>{
 for(const [spell,n,shouldSweep] of [[HAND,11,true],[HAND,10,false],[BOUNCE,13,true],[BOUNCE,12,false]]){
  const s=field(),des=put(s,1,'battle',DES,{under:[inst(DARK)]}),ally=put(s,0,'battle',FIRE);
  const gear=put(s,0,'battle',GEAR);
  give(s,1,'grave',Array(n).fill(FIRE));
  play(s,spell);act(s,'effect',a=>a.targets[0]?.uid===des.uid);drain(s);
  assert.equal(s.players[0].grave.includes(ally),shouldSweep);
  assert.ok(s.players[0].battle.includes(gear));
 }
});

test('Hachi can use Guard Strike when a shield is broken',()=>{
 const s=field();s.active=1;
 const attacker=put(s,1,'battle',FIRE),later=put(s,1,'battle',NATURE);
 give(s,0,'shields',[HACHI]);
 attack(s,attacker.uid);act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');pick(s,later.uid);
 assert.ok(e.attackLocked(s,1,later));
 assert.equal(later.tapped,false);
});

test('Zoro sets aside Des Shiraz and its grave evolution base, then uses a new base (QA48906)',()=>{
 for(const newBase of [false,true]){
  const s=field(),base=put(s,0,'grave',DARK);
  put(s,1,'battle','dm26rp2-S001');
  const des=play(s,DES);
  pick(s,base.uid);
  assert.deepEqual(s.players[0].extra,[des,base]);
  assert.equal(s.players[0].grave.length,0);
  end(s);drain(s);
  const later=newBase?put(s,0,'grave',DARK):null;
  act(s,'skipCharge');end(s);
  if(later){
   assert.ok(values(s).includes(later.uid));pick(s,later.uid);drain(s);
   assert.deepEqual(des.under,[later]);
  }else assert.ok(s.players[0].extra.includes(des));
  assert.ok(s.players[0].extra.includes(base));
 }
});
