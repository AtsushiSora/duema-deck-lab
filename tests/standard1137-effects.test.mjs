import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SPELL='dm25rp2-S10',AGE='dm25rp2-004',JAOU='dm26ex1-N012';
const NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-083',DARK='dm01-090';
const NEO='dm25rp2-019',GEAR='dm14-110';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const put=(s,p,zone,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;};
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const values=s=>(s.decision?.choices??[]).map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const field=()=>{
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(15).fill(NATURE));
 return s;
};

test('three official definitions and all eleven prints resolve without duplicate card IDs',()=>{
 const manifest=read('tools/support-phase-1137.json');
 const refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(row=>row.id),[SPELL,AGE,JAOU]);
 assert.equal(manifest.printAliases.length,8);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  const detail={...details.cards.find(c=>c.id===id),id:row.id,faces:row.faces};
  const spec=manifest.cards.find(c=>c.id===id).spec;
  assert.deepEqual(standardCardSpec(detail,{phase:1137}),spec);
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.manaValue,c.limit],
   [id===SPELL?'spell':'creature',f.cost,f.powerText?Number(f.powerText):c.power,f.race,1,4]);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(ref=>ref.id===row.id&&ref.canonicalId===id&&ref.image===row.image));
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  detail.faces=structuredClone(row.faces);
  detail.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(detail,{phase:1137}));
 }
});

test('the spell has an optional four-mana payment at six grave cards and preselects duplicate modes',()=>{
 const s=field(),spell=put(s,0,'hand',SPELL);
 give(s,0,'mana',[WATER,DARK,FIRE,NATURE]);
 give(s,0,'grave',Array(5).fill(NATURE));
 const options=()=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===spell.uid);
 assert.equal(options().length,0);
 const sixth=put(s,0,'grave',NATURE);
 const top=s.players[0].deck[0];
 act(s,'play',a=>a.uid===spell.uid&&a.role==='paidAlt568'&&a.cost===4);
 pick(s,0);
 assert.equal(s.players[0].hand.length,0);
 pick(s,0);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.players[0].grave.includes(top),true);
 assert.equal(s.players[0].grave.includes(sixth),true);
 assert.ok(s.players[0].mana.every(x=>x.tapped));
});

test('the spell may also pay six and returns a gear before choosing a hidden discard',()=>{
 const s=field(),target=put(s,1,'battle',GEAR),held=put(s,1,'hand',NATURE);
 play(s,SPELL);
 pick(s,1);pick(s,0);
 pick(s,target.uid);
 assert.deepEqual(s.players[1].hand,[held,target]);
 assert.equal(s.decision.task.op,'g34_BlindDiscard773');
 assert.ok(s.decision.choices.every(c=>!c.cardId));
 pick(s,1);
 assert.ok(s.players[1].grave.includes(target));
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
});

test('the spell can deploy two grave creatures, grant speed, and destroy both at turn end',()=>{
 const s=field();
 const targets=[put(s,0,'grave',NATURE),put(s,0,'grave',FIRE)];
 const tooLarge=put(s,0,'grave',AGE);
 play(s,SPELL);
 pick(s,2);pick(s,2);
 assert.ok(!values(s).includes(tooLarge.uid));
 for(const x of targets)pick(s,x.uid);
 assert.ok(targets.every(x=>s.players[0].battle.includes(x)&&e.effectiveCard(x,s).speedAttacker));
 act(s,'toAttack');act(s,'endTurn');drain(s);
 assert.ok(targets.every(x=>s.players[0].grave.includes(x)));
});

test('Age selects up to two opponents within a total cost of nine, before destroying either',()=>{
 const s=field(),first=put(s,1,'battle',AGE),small=put(s,1,'battle',FIRE),big=put(s,1,'battle',JAOU);
 play(s,AGE);
 pick(s,first.uid);
 assert.ok(s.players[1].battle.includes(first));
 assert.ok(values(s).includes(small.uid));
 assert.ok(!values(s).includes(big.uid));
 pick(s,small.uid);drain(s);
 assert.ok(s.players[1].grave.includes(first)&&s.players[1].grave.includes(small));
 assert.ok(s.players[1].battle.includes(big));
});

function loseDirect(s){
 const x=put(s,0,'battle',FIRE);
 give(s,1,'shields',[]);
 attack(s,x.uid);act(s,'noBlock');
}

test('an evolved creature can spend all its bases through Age to avoid direct defeat',()=>{
 const s=field(),nested=inst(FIRE),age=Object.assign(inst(AGE),{under:[nested]});
 const host=put(s,1,'battle',NEO,{under:[age]});
 loseDirect(s);
 assert.equal(s.decision.task.op,'g12Loss');
 assert.ok(values(s).includes(null));
 pick(s,host.uid);
 assert.equal(s.winner,null);
 assert.ok(s.players[1].battle.includes(host));
 assert.ok(!e.isEvolution(host));
 assert.deepEqual(new Set(s.players[1].grave),new Set([age,nested]));
 loseDirect(s);
 assert.equal(s.winner,0);
});

test('Age still loses to empty-library checks after spending the bases and can decline the payment',()=>{
 for(const accept of [false,true]){
  const s=field(),host=put(s,0,'battle',NEO,{under:[inst(AGE)]});
  give(s,0,'deck',[NATURE]);
  s.extTasks=[{op:'draw',p:0,source:AGE,n:1}];
  act(s,'toAttack');
  assert.equal(s.lossEvent.condition,'deck');
  pick(s,accept?host.uid:null);
  assert.equal(s.winner,1);
  assert.equal(s.players[0].grave.length,Number(accept));
 }
});

test('ordinary special victory can be replaced by Age, while a replacement victory cannot chain',()=>{
 for(const replacement of [false,true]){
  const s=field(),host=put(s,1,'battle',NEO,{under:[inst(AGE)]});
  const winner=data.cards.find(c=>replacement?c.shako:c.effect==='mikadoreo').id;
  put(s,0,'battle',winner);
  if(replacement){
   give(s,0,'deck',[NATURE]);
   s.extTasks=[{op:'draw',p:0,source:winner,n:1}];
   act(s,'toAttack');
   assert.equal(s.winner,0);
   assert.equal(host.under.length,1);
  }else{
   for(let i=0;i<3;i++)put(s,0,'battle','dmr06-v01');
   s.extTasks=[{op:'g20Win',p:0,source:winner}];
   act(s,'toAttack');
   assert.equal(s.decision.task.op,'g12Loss');
   pick(s,host.uid);
   assert.equal(s.winner,null);
   assert.equal(s.players[1].grave.length,1);
  }
 }
});
test('Jaouga declares from either hand, summons free, and removes according to cards actually moved',()=>{
 for(const who of [0,1]){
  const s=field(),attacker=put(s,0,'battle',FIRE),jaou=put(s,who,'hand',JAOU);
  give(s,who,'shields',[]);
  give(s,who,'grave',[FIRE,NATURE,DARK]);
  const low=put(s,1-who,'battle',NATURE),high=put(s,1-who,'battle',AGE);
  const tapped=s.players[who].mana.filter(x=>x.tapped).length;
  attack(s,attacker.uid);
  assert.equal(s.decision.task.op,'g3_Declare');
  pick(s,true);
  assert.equal(s.decision.task.op,'g3_AttackSpell');
  pick(s,true);
  assert.equal(s.decision.task.op,'g34_GraveBottom589');
  pick(s,who);
  assert.equal(s.players[who].grave.length,0);
  assert.ok(values(s).includes(low.uid)&&!values(s).includes(high.uid));
  pick(s,low.uid);
  assert.ok(s.players[1-who].grave.includes(low));
  assert.ok(s.players[who].battle.includes(jaou));
  assert.equal(s.players[who].mana.filter(x=>x.tapped).length,tapped);
  assert.equal(e.effectiveCard(jaou,s).slayer,true);
 }
});

test('Jaouga can declare before its condition is met and cannot use Oni End from the grave',()=>{
 const s=field(),attacker=put(s,0,'battle',FIRE),jaou=put(s,0,'hand',JAOU);
 put(s,0,'battle','dm26ex2-012',{hyperActive:true});
 const inGrave=put(s,0,'grave',JAOU);
 attack(s,attacker.uid);
 assert.deepEqual(s.decision.task.remaining.map(x=>x.uid),[jaou.uid]);
 pick(s,true);
 assert.ok(!s.players[0].battle.includes(jaou));
 assert.ok(s.players[0].grave.includes(inGrave));
 assert.notEqual(s.decision?.task?.op,'g3_AttackSpell');
});

test('Jaouga with Apul can destroy a zero-cost creature when no grave cards move (official QA 48749)',()=>{
 const s=field(),apul=put(s,1,'battle','dmrp22-042'),croc=put(s,1,'battle','dm23ex2-065');
 put(s,1,'battle',GEAR,{crossedTo:{uid:croc.uid,incarnation:croc.incarnation||0}});
 const grave=[put(s,0,'grave',FIRE),put(s,0,'grave',NATURE)];
 play(s,JAOU);
 pick(s,0);
 assert.deepEqual(s.players[0].grave,grave);
 assert.ok(values(s).includes(croc.uid));
 assert.ok(!values(s).includes(apul.uid));
 pick(s,croc.uid);
 assert.ok(s.players[1].grave.includes(croc));
});
