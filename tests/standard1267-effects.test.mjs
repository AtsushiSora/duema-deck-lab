import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const XX='dmrp20-009',SNAKE='dmrp20-010',FINALE='dmrp20-011';
const FIRE='dm01-097',NATURE='dm01-108',HAND='dm01-027',WATER='dm01-083',DARK='dm01-090';
const BOLSHACK='dm01-008',TWIN='dmrp05-011',REDZONE='dmr17-l02',ALLY='dmrp20-022',DEDODAM='dmbd10-010',KIINARY='dm23bd1-007';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>options(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const end=s=>{act(s,'toAttack');act(s,'endTurn');};

test('all eleven official prints resolve to three original battle identities',()=>{
 const m=read('tools/support-phase-1267.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[XX,SNAKE,FINALE]);
 assert.equal(m.printAliases.length,8);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row;
  const definition={id,status:'complete',faces:row.faces},c=e.card(canonicalId);
  if(id===canonicalId)assert.deepEqual(row.faces,details.cards.find(x=>x.id===canonicalId).faces);
  assert.deepEqual(standardCardSpec(definition,{phase:1267}),row.spec);
  assert.throws(()=>standardCardSpec(definition,{phase:1266}));
  const extra=structuredClone(definition);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:1267}));
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
 }
});

test('XXDDZ grants itself and its allies Speed Attacker and Slayer, and creates its own EX Life',()=>{
 const s=field();cast(s,XX);cast(s,FIRE);
 const [x,ally]=s.players[0].battle,enemy=add(s,1,'battle',BOLSHACK,{tapped:true});
 assert.equal(e.exLifeShields(s,0,x).length,1);
 for(const c of [x,ally]){
  assert.ok(e.effectiveCard(c,s).speedAttacker&&e.effectiveCard(c,s).slayer);
  assert.ok(e.canCreatureAttack(s,0,c));
 }
 assert.ok(!e.effectiveCard(enemy,s).slayer);
 attack(s,ally.uid,enemy.uid);act(s,'noBlock');drain(s);
 assert.ok(inZone(s,0,'grave',ally)&&inZone(s,1,'grave',enemy));
});

for(const accept of [false,true])test('XXDDZ offers only its linked shield and prevents trigger spells through the next opposing turn: '+accept,()=>{
 let s=field();
 cast(s,ALLY);cast(s,XX);
 const [other,x]=s.players[0].battle,[linked]=e.exLifeShields(s,0,x),[notLinked]=e.exLifeShields(s,0,other);
 give(s,1,'shields',[HAND,NATURE]);const enemySpell=s.players[1].shields[0];
 attack(s,x.uid);assert.deepEqual(options(s),[linked.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,accept?linked.uid:null);act(s,'noBlock');drainBreak(s);
 assert.equal(inZone(s,0,'grave',linked),accept);
 assert.ok(inZone(s,0,'shields',notLinked));
 assert.equal(e.canCastSpell(s,1,e.card(HAND)),!accept);
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===enemySpell.uid),!accept);
 if(!accept)drain(s);
 act(s,'endTurn');drain(s);
 assert.equal(s.active,1);
 assert.equal(e.canCastSpell(s,1,e.card(HAND)),!accept);
 act(s,'skipCharge');end(s);drain(s);
 assert.equal(e.canCastSpell(s,1,e.card(HAND)),true);
});

test('XXDDZ can sacrifice its linked shield after the attacking creature evolves (QA40839)',()=>{
 const s=field();cast(s,XX);
 const x=s.players[0].battle[0],[linked]=e.exLifeShields(s,0,x),evolved=add(s,0,'hand',REDZONE);
 attack(s,x.uid);assert.equal(s.decision.task.op,'g23_Declare');pick(s,true);
 act(s,'orderEffect',a=>a.uid===evolved.uid);
 assert.equal(s.decision.task.op,'g23_Invade');pick(s,true);
 assert.equal(s.attack.attacker,evolved.uid);
 assert.ok(evolved.under.some(y=>y.uid===x.uid));
 act(s,'orderEffect',a=>a.uid===x.uid);
 assert.equal(s.decision.task.op,'g34_ExLifeGrave1267');
 pick(s,linked.uid);drain(s);
 assert.ok(inZone(s,0,'grave',linked));
 assert.equal(e.canCastSpell(s,1,e.card(HAND)),false);
});

test('XXDDZ without linked EX Life has no spell prohibition',()=>{
 const s=field(),x=add(s,0,'battle',XX);
 attack(s,x.uid);assert.equal(s.decision.type,'block');act(s,'noBlock');drain(s);
 assert.equal(e.canCastSpell(s,1,e.card(HAND)),true);
});

for(const zone of ['mana','grave'])test('Deathsnake draws, recovers a card, then may use only the opponents blind choice: '+zone,()=>{
 let s=field();cast(s,SNAKE);
 const x=s.players[0].battle[0],enemy=add(s,1,'battle',FIRE);
 const take=add(s,0,zone,TWIN),unselected=add(s,0,'hand',ALLY),drawn=s.players[0].deck[0];
 const other=add(s,0,zone=== 'mana'?'grave':'mana',NATURE);
 const tapped=s.players[0].mana.filter(y=>y.tapped).length,before=physical(s);
 assert.equal(e.exLifeShields(s,0,x).length,1);
 attack(s,x.uid,enemy.uid);
 assert.ok(inZone(s,0,'hand',drawn));
 assert.ok(options(s).includes(take.uid)&&options(s).includes(other.uid)&&!options(s).includes(null));
 pick(s,take.uid);
 assert.equal(s.decision.player,1);
 assert.ok(s.decision.choices.every(o=>o.label.startsWith('裏向き')&&!o.cardId));
 const index=s.players[0].hand.findIndex(y=>y.uid===take.uid);
 s=JSON.parse(JSON.stringify(s));pick(s,index);
 assert.equal(s.decision.player,0);
 assert.deepEqual(options(s),[take.uid,take.uid,null]);
 act(s,'extended',a=>s.decision.choices[a.choice].value?.face===0);
 act(s,'noBlock');drain(s);
 assert.ok(inZone(s,0,'battle',take)&&inZone(s,0,'hand',unselected));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,tapped);
 assert.deepEqual(physical(s),before);
});

test('Deathsnake can decline the card privately even when no card can be recovered',()=>{
 const s=field(),x=add(s,0,'battle',SNAKE);
 give(s,0,'mana',[]);
 const drawn=s.players[0].deck[0];
 attack(s,x.uid);assert.equal(s.decision.task.op,'g34_BlindReveal803');pick(s,0);pick(s,null);
 assert.ok(inZone(s,0,'hand',drawn));
 assert.ok(!s.log.some(l=>l.type==='reveal'&&l.cardId===drawn.cardId));
 act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,3);
});

test('Deathsnake cannot summon the blindly selected evolution without an eligible base (QA40664)',()=>{
 const s=field(),x=add(s,0,'battle',SNAKE);
 give(s,0,'mana',[]);give(s,0,'deck',[REDZONE,...Array(12).fill(NATURE)]);
 const selected=s.players[0].deck[0];
 assert.ok(e.card(selected).evolution);
 attack(s,x.uid);pick(s,0);
 assert.equal(s.decision.type,'block');
 assert.ok(inZone(s,0,'hand',selected));
 act(s,'noBlock');drain(s);
});

test('Deathsnake may cast the exact blindly selected spell without paying',()=>{
 const s=field(),x=add(s,0,'battle',SNAKE),spell=add(s,0,'grave',HAND),other=add(s,0,'hand',HAND);
 give(s,0,'mana',[]);
 const victim=add(s,1,'battle',BOLSHACK);
 attack(s,x.uid);pick(s,spell.uid);pick(s,s.players[0].hand.findIndex(y=>y.uid===spell.uid));
 pick(s,spell.uid);drain(s);
 assert.ok(inZone(s,0,'grave',spell)&&inZone(s,0,'hand',other));
 assert.ok(inZone(s,1,'grave',victim));
});

test('Finale places two chosen cards in mana simultaneously, taps the multicolor one, then reads the new mana count',()=>{
 let s=field();
 give(s,0,'mana',[WATER,DARK,NATURE,FIRE,NATURE]);
 give(s,0,'deck',[DEDODAM,FIRE,WATER,...Array(12).fill(NATURE)]);
 const [multi,mono,toHand]=s.players[0].deck;
 const enemy=add(s,1,'battle',XX),spell=add(s,0,'hand',FINALE),before=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.deepEqual(options(s),[multi.uid,mono.uid,toHand.uid]);
 pick(s,mono.uid);assert.ok(inZone(s,0,'deck',mono));
 s=JSON.parse(JSON.stringify(s));pick(s,multi.uid);
 if(s.decision.task.op==='g34_LookPick')pick(s,toHand.uid);
 const mana=s.players[0].mana;
 assert.ok(mana.find(y=>y.uid===multi.uid)?.tapped);
 assert.equal(mana.find(y=>y.uid===mono.uid)?.tapped,false);
 assert.ok(inZone(s,0,'hand',toHand));
 pick(s,enemy.uid);assert.equal(e.power(s.players[1].battle[0],false,s),1000);
 assert.deepEqual(physical(s),before);
 end(s);drain(s);assert.equal(e.power(s.players[1].battle[0],false,s),8000);
});

test('Finale only offers free casting when the attacker is a Dispector with all three civilizations',()=>{
 for(const id of [KIINARY,ALLY,DEDODAM]){
  const s=field(),x=add(s,0,'battle',id),spell=add(s,0,'hand',FINALE);
  give(s,0,'mana',[]);
  attack(s,x.uid);
  const eligible=id===KIINARY;
  if(eligible){
   assert.equal(s.decision.task.op,'g34_Chance417');pick(s,true);drain(s);
   assert.ok(inZone(s,0,'grave',spell));
  }else{
   assert.notEqual(s.decision?.task?.op,'g34_Chance417');
   assert.ok(inZone(s,0,'hand',spell));
  }
 }
});

function drainBreak(s){
 while(s.decision?.type==='selectShield'||s.decision?.type==='shieldBreak')e.step(s,e.chooseAI(s));
}
