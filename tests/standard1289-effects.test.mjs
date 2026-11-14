import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SPINNER='dmrp04m-012',GEKI='dm23rp4-048',MENA='dm23rp4-049',MOTCHI='dm23rp4-051';
const DOKI='dm23rp3-013',DOWNFORCE='dm23rp1-009',KILL='dm01-027',FIRE='dm01-097';
const GREEN='dm01-108',SMALL='dm01-083',BIG='dm01-s09',EVOLUTION='dm02-033';
const ZADAN='dm26rp3-002',TOKOSHIE='dmrp17-025';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const manifest=read('tools/support-phase-1289.json');

function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(GREEN));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,face=0){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}
const picks=s=>s.decision?.choices?.map(({value})=>value?.uid??value);
const pick=(s,value)=>s.decision?.type==='effect'?
 act(s,'effect',a=>a.targets.some(target=>target.uid===value)):
 act(s,'extended',a=>Object.is(picks(s)[a.choice],value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

function trigger(s,attacker,id,{last=true,face=0}={}){
 give(s,1-s.active,'shields',last?[id]:[id,GREEN]);
 const shield=s.players[1-s.active].shields[0];
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type!=='trigger'&&e.getLegalActions(s).some(a=>a.kind==='breakShields'))
  act(s,'breakShields',a=>a.shields.includes(shield.uid));
 act(s,'useTrigger',a=>a.uid===shield.uid&&(a.face??0)===face);
 return shield;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 if(s.phase==='charge')act(s,'skipCharge');
}

test('eighteen official prints preserve four canonical card definitions and deck IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[SPINNER,GEKI,MENA,MOTCHI]);
 assert.equal(manifest.printAliases.length,14);
 for(const x of [...manifest.cards,...manifest.printAliases]){
  const id=x.canonicalId??x.id,c=e.card(id),[front,back]=x.faces;
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,parseInt(front.powerText,10),1,front.civilizations,front.race,4]);
  assert.equal(manifest.regulationVerification.limits[x.id],4);
  assert.equal(nameKey(c.name),nameKey(x.name));
  assert.deepEqual(standardCardSpec({...x,status:'complete'},{phase:1289}),x.spec);
  if(back)assert.deepEqual([c.spellFace.name,c.spellFace.cost,c.spellFace.civilizations,c.spellFace.text],
   [back.name,back.cost,back.civilizations,back.abilityText]);
  assert.equal(catalogue.get(x.id).id,id);
  if(!x.canonicalId)assert.equal(CARD_IMAGES[id],x.image);
  assert.deepEqual(refs.find(y=>y.id===x.id),{id:x.id,canonicalId:id,name:x.name,image:x.image,source:x.source});
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Spinner may cumulatively reduce a single creature to zero (QA 31683)',()=>{
 const s=field(),target=add(s,1,'battle',BIG,{powerModifiers:[{amount:1000,expires:'end',who:s.active}]});
 const grave=add(s,0,'grave',FIRE),spinner=play(s,SPINNER);
 for(const power of [6000,3000,0]){
  assert.deepEqual(picks(s),[target.uid]);
  pick(s,target.uid);
  if(power)assert.equal(e.power(target,false,s),power);
 }
 assert.ok(has(s,1,'grave',target)&&has(s,0,'battle',spinner)&&has(s,0,'grave',grave));
});

for(const protectedByDownforce of [false,true]){
 test('Spinner resolves each Doki selection separately with Downforce '+protectedByDownforce,()=>{
  const s=field(),doki=add(s,0,'battle',DOKI),attacker=add(s,0,'battle',FIRE);
  const reserve=add(s,1,'grave',SMALL);
  if(protectedByDownforce)play(s,DOWNFORCE,1);
  const spinner=trigger(s,attacker,SPINNER,{last:false});
  assert.deepEqual(picks(s),[doki.uid]);
  pick(s,doki.uid);
  if(protectedByDownforce){
   assert.equal(e.power(doki,false,s),-1000);
   for(const power of [-4000,-7000]){
    assert.deepEqual(picks(s),[doki.uid]);
    pick(s,doki.uid);
    assert.equal(e.power(doki,false,s),power);
   }
   assert.ok(has(s,0,'battle',doki)&&has(s,0,'battle',attacker));
  }else{
   assert.ok(has(s,0,'grave',doki));
   assert.deepEqual(picks(s),[attacker.uid]);
   pick(s,attacker.uid);
   assert.ok(has(s,0,'grave',attacker));
   assert.equal(s.decision.task.op,'g21Mega');
   pick(s,null);
  }
  assert.ok(has(s,1,'battle',spinner)&&has(s,1,'grave',reserve));
  assert.equal(s.decision,null);
 });
}

for(const first of ['bonus','minus']){
 test('last-shield Spinner offers two entry abilities and optional revival: '+first,()=>{
  const s=field(),attacker=add(s,0,'battle',FIRE);
  const one=add(s,1,'grave',GREEN),two=add(s,1,'grave',SMALL);
  const excluded=[add(s,1,'grave',BIG),add(s,1,'grave',KILL),add(s,1,'grave',EVOLUTION)];
  const spinner=trigger(s,attacker,SPINNER);
  assert.equal(s.decision.type,'entryOrder');
  const entries=s.triggers.entries.filter(x=>x.source===SPINNER);
  assert.equal(entries.length,2);
  const bonus=entries.find(x=>x.task?.defs?.[0]?.op==='Select');
  assert.ok(bonus);
  const chosen=first==='bonus'?bonus:entries.find(x=>x!==bonus);
  const action=e.getLegalActions(s).find(a=>a.effectId===chosen.effectId);
  assert.ok(action);
  e.step(s,action);
  if(first==='minus')pick(s,attacker.uid);
  assert.deepEqual(picks(s),[one.uid,two.uid,null]);
  if(first==='bonus'){
   pick(s,one.uid);
   assert.deepEqual(picks(s),[two.uid,null]);
   pick(s,two.uid);
   pick(s,attacker.uid);
   assert.ok([one,two].every(x=>has(s,1,'battle',x)));
  }else{
   pick(s,null);
   assert.ok([one,two].every(x=>has(s,1,'grave',x)));
  }
  assert.ok(excluded.every(x=>has(s,1,'grave',x)));
  assert.ok(has(s,1,'battle',spinner)&&has(s,0,'grave',attacker));
 });
}

for(const replaced of [false,true]){
 test('Zadan’s Spinner has both entry abilities only if it enters: '+replaced,()=>{
  const s=field(),spinner=add(s,0,'grave',SPINNER),revival=add(s,0,'grave',FIRE);
  const enemy=add(s,1,'battle',replaced?TOKOSHIE:SMALL);
  for(let i=0;i<7;i++)add(s,0,'grave',KILL);
  play(s,ZADAN);
  assert.equal(s.decision.task.op,'g30_Zadan');
  pick(s,spinner.uid);
  assert.equal(s.decision.task.op,'g30_ZadanSuper');
  pick(s,true);
  if(replaced){
   assert.ok(has(s,0,'mana',spinner)&&has(s,0,'grave',revival)&&has(s,1,'battle',enemy));
   assert.equal(s.decision,null);
  }else{
   assert.ok(has(s,0,'battle',spinner));
   assert.equal(s.decision.type,'effectOrder');
   const entries=s.pendingEffects.filter(x=>x.source===SPINNER);
   assert.equal(entries.length,2);
   assert.ok(entries.some(x=>x.task?.defs?.[0]?.op==='Select'));
   drain(s);
   assert.ok(has(s,1,'grave',enemy)&&has(s,0,'battle',revival));
  }
  assert.equal(s.players[0].shields.length,5);
 });
}

test('Gekisha taps the chosen creature and suppresses exactly its next start untap',()=>{
 const s=field(),target=add(s,1,'battle',FIRE),other=add(s,1,'battle',GREEN,{tapped:true});
 play(s,GEKI);
 pick(s,target.uid);
 assert.ok(target.tapped&&e.skipsStartUntap(s,target));
 end(s);
 assert.ok(target.tapped&&!other.tapped);
 end(s);
 end(s);
 assert.equal(target.tapped,false);
});

test('Gekisha’s spell can trigger from a shield and remove up to two creatures within 7000 live power',()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE);
 const exact=add(s,0,'battle',GREEN,{powerModifiers:[{amount:3000,expires:'end',who:s.active}]});
 const over=add(s,0,'battle',BIG),own=add(s,1,'battle',SMALL);
 const spell=trigger(s,attacker,GEKI,{face:1});
 assert.deepEqual(picks(s),[attacker.uid,exact.uid,null]);
 pick(s,exact.uid);
 pick(s,attacker.uid);
 assert.ok([attacker,exact].every(x=>has(s,0,'grave',x)));
 assert.ok(has(s,1,'grave',spell)&&has(s,0,'battle',over)&&has(s,1,'battle',own));
 const skipped=field(),preserved=add(skipped,1,'battle',FIRE);
 play(skipped,GEKI,1);
 pick(skipped,null);
 assert.ok(has(skipped,1,'battle',preserved));
});

test('Menakaa can attack an untapped creature immediately but cannot attack the player that turn',()=>{
 const s=field(),target=add(s,1,'battle',SMALL),mena=play(s,MENA);
 s.phase='attack';
 const actions=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===mena.uid);
 assert.deepEqual(actions.map(a=>a.target),[target.uid]);
 attack(s,mena.uid,target.uid);
 drain(s);
 assert.ok(has(s,1,'grave',target)&&has(s,0,'battle',mena));
});

for(const castFromShield of [false,true]){
 test('Menakaa’s spell destroys first and mills two cards from the caster only: '+castFromShield,()=>{
  const s=field(),caster=castFromShield?1:0,enemy=add(s,1-caster,'battle',FIRE);
  const own=s.players[caster],other=s.players[1-caster];
  const top=own.deck.slice(0,2).map(x=>x.uid);
  const theirTop=other.deck[0].uid;
  const spell=castFromShield?trigger(s,enemy,MENA,{face:1}):play(s,MENA,1);
  assert.equal(own.grave.length,0);
  pick(s,enemy.uid);
  assert.ok(has(s,1-caster,'grave',enemy)&&has(s,caster,'grave',spell));
  assert.deepEqual(own.grave.filter(x=>x.uid!==spell.uid).map(x=>x.uid),top);
  assert.equal(other.deck[0].uid,theirTop);
 });
}

test('Menakaa mills even without a destruction target',()=>{
 const s=field(),top=s.players[0].deck.slice(0,2).map(x=>x.uid);
 const spell=play(s,MENA,1);
 assert.deepEqual(s.players[0].grave.filter(x=>x.uid!==spell.uid).map(x=>x.uid),top);
});

test('Motchi blocks and its spell taps at most three chosen enemy creatures',()=>{
 const s=field(1),attacker=add(s,1,'battle',SMALL),blocker=add(s,0,'battle',MOTCHI);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 assert.ok(has(s,0,'grave',blocker)&&has(s,1,'grave',attacker));
 assert.equal(s.decision?.task?.op,'g21Mega');
 pick(s,null);
 const cast=field(),own=add(cast,0,'battle',FIRE);
 const enemies=Array.from({length:4},()=>add(cast,1,'battle',GREEN));
 play(cast,MOTCHI,1);
 for(const x of enemies.slice(0,3))pick(cast,x.uid);
 assert.deepEqual(enemies.map(x=>x.tapped),[true,true,true,false]);
 assert.equal(own.tapped,false);
});

for(const [origin,removal] of [['hand','dm01-086'],['mana','dmc27-055'],['grave',KILL],['shields','dm22rp1-030']]){
 test('Motchi’s Mega Last Burst handles departure to '+origin,()=>{
  let s=field(1);
  const motchi=add(s,0,'battle',MOTCHI),target=add(s,1,'battle',FIRE),other=add(s,1,'battle',GREEN);
  play(s,removal);
  pick(s,motchi.uid);
  assert.ok(has(s,0,origin,motchi));
  if(origin==='shields'){
   assert.equal(s.decision,null);
   return;
  }
  assert.equal(s.decision.task.op,'g21Mega');
  s=JSON.parse(JSON.stringify(s));
  pick(s,true);
  assert.deepEqual(picks(s),[target.uid,other.uid,null]);
  pick(s,target.uid);
  pick(s,null);
  assert.ok(s.players[1].battle.find(x=>x.uid===target.uid).tapped);
  assert.ok(!s.players[1].battle.find(x=>x.uid===other.uid).tapped);
  assert.ok(has(s,0,'grave',motchi));
 });
}

test('Motchi cannot use the burst after a second zone move within the same spell (QA 43768)',()=>{
 const s=field(1),motchi=add(s,0,'battle',MOTCHI);
 play(s,'dm11-032');
 pick(s,motchi.uid);
 assert.ok(has(s,0,'grave',motchi));
 assert.equal(s.decision,null);
});
