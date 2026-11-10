import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-766.json',import.meta.url)));
const KOONI='dm24rp4-063',SIRIX='dm24rp4-023',SKY='dm23rp2-050';
const BODY='dm01-108',SIX='dm36-048',TRIGGER='dmr19-081';
const DRAW='dmrp17-073',TWIN='dm23rp2-045',SEED='dm25ex1-054';
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const order=(s,effectId)=>act(s,'orderEffect',a=>a.effectId===effectId);

test('three complete definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:766}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:766}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(print.faces.map(f=>({...f,abilityText:f.abilityText.replace(/ /g,'')})),row.faces.map(f=>({...f,abilityText:f.abilityText.replace(/ /g,'')})));
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

function play(s,id,face=0){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
 return x;
}
const locate=(s,p,zone,uid)=>s.players[p][zone].find(x=>x.uid===uid);
function seek(s,predicate){
 for(let n=0;s.decision&&!predicate(s.decision);n++){
  assert.ok(n<30);
  e.step(s,e.chooseAI(s));
 }
 assert.ok(s.decision&&predicate(s.decision),JSON.stringify(s.decision));
}

test('Kooni may return only when a friendly cost-six or greater creature actually enters by summoning',()=>{
 let s=setup();
 const first=put(s,0,'grave',KOONI),second=put(s,0,'grave',KOONI);
 play(s,BODY);
 assert.equal(s.decision,null);
 s.active=1;
 play(s,SIX);
 assert.equal(s.decision,null);
 s.active=0;
 const deployed=put(s,0,'hand',SIX);
 s.extTasks=[{op:'putCreature',p:0,source:BODY,origin:'hand',uid:deployed.uid}];
 act(s,'toAttack');
 assert.ok(locate(s,0,'battle',deployed.uid));
 assert.equal(s.decision,null);
 play(s,SIX);
 assert.equal(s.decision.type,'effectOrder');
 const effect=s.pendingEffects.find(x=>x.uid===first.uid);
 order(s,effect.effectId);
 s=restore(s);
 pick(s,true);
 assert.ok(locate(s,0,'battle',first.uid));
 assert.equal(locate(s,0,'battle',first.uid).summonedTurn,undefined);
 pick(s,null);
 assert.ok(locate(s,0,'grave',second.uid));
});

test('Kooni sees a real Shield Trigger summon during the other turn',()=>{
 const s=setup(),kooni=put(s,0,'grave',KOONI);
 give(s,0,'shields',[TRIGGER]);
 s.active=1;
 const attacker=put(s,1,'battle',BODY);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision?.task?.uid,kooni.uid);
 assert.equal(s.decision.player,0);
 pick(s,true);
 assert.ok(locate(s,0,'battle',kooni.uid));
});

test('Kooni cannot follow a pending effect to a new grave visit',()=>{
 let s=setup();
 const kooni=put(s,0,'grave',KOONI,{zoneSerial:4});
 play(s,SIX);
 assert.equal(s.decision?.task?.uid,kooni.uid);
 s=restore(s);
 locate(s,0,'grave',kooni.uid).zoneSerial++;
 pick(s,true);
 assert.ok(locate(s,0,'grave',kooni.uid));
 assert.ok(!locate(s,0,'battle',kooni.uid));
});

test('Sirix requires a spell to attack and can decline, use on the next spell, and use again next turn',()=>{
 let s=setup();
 const sirix=put(s,0,'battle',SIRIX);
 const small=put(s,0,'hand',BODY);
 const canAttack=()=>e.getLegalActions({...s,phase:'attack'}).some(a=>a.kind==='attack'&&a.uid===sirix.uid);
 assert.equal(canAttack(),false);
 s.active=1;
 play(s,DRAW);
 assert.equal(s.decision,null);
 s.active=0;
 assert.equal(canAttack(),false);
 play(s,DRAW);
 seek(s,d=>d.task?.g766SpellUse);
 pick(s,null);
 assert.equal(canAttack(),true);
 play(s,DRAW);
 seek(s,d=>d.task?.g766SpellUse);
 s=restore(s);
 pick(s,small.uid);
 assert.ok(locate(s,0,'battle',small.uid));
 assert.equal(locate(s,0,'battle',small.uid).summonedTurn,undefined);
 const later=put(s,0,'hand',BODY);
 play(s,DRAW);
 assert.equal(s.decision,null);
 assert.ok(locate(s,0,'hand',later.uid));
 end(s);end(s);
 assert.equal(canAttack(),false);
 play(s,DRAW);
 seek(s,d=>d.task?.g766SpellUse);
 pick(s,later.uid);
 assert.ok(locate(s,0,'battle',later.uid));
});

test('Sirix uses the actual three-cost face and excludes equal cost and tamaseeds',()=>{
 const s=setup();
 put(s,0,'battle',SIRIX);
 const low=put(s,0,'hand',BODY),equal=put(s,0,'hand','dm01-103');
 put(s,0,'hand',SIX);
 put(s,0,'hand',SEED);
 assert.equal(e.card(equal.cardId).cost,3);
 play(s,TWIN,1);
 seek(s,d=>d.task?.g766SpellUse);
 assert.equal(s.decision.task.filter.belowCost,3);
 assert.deepEqual(s.decision.choices.filter(x=>x.value).map(x=>x.value.uid),[low.uid]);
 pick(s,low.uid);
 assert.ok(locate(s,0,'battle',low.uid));
});

test('two Sirix copies can each deploy one creature from the same spell',()=>{
 const s=setup();
 put(s,0,'battle',SIRIX);
 put(s,0,'battle',SIRIX);
 const low=put(s,0,'hand',BODY),other=put(s,0,'hand',BODY);
 play(s,DRAW);
 seek(s,d=>d.task?.g766SpellUse);
 pick(s,low.uid);
 seek(s,d=>d.task?.g766SpellUse);
 pick(s,other.uid);
 assert.ok(locate(s,0,'battle',low.uid)&&locate(s,0,'battle',other.uid));
 put(s,0,'hand',BODY);
 play(s,DRAW);
 assert.equal(s.decision,null);
});

test('Sirix counts a spell cast from the opposing graveyard by its controller',()=>{
 const s=setup(),sirix=put(s,0,'battle',SIRIX),low=put(s,0,'hand',BODY);
 const foreign=put(s,1,'grave',DRAW);
 s.extTasks=[{op:'g34_GraveSpell594',p:0,source:'dm26rp3-015',max:9}];
 act(s,'toAttack');
 pick(s,foreign.uid);
 seek(s,d=>d.task?.g766SpellUse);
 pick(s,low.uid);
 assert.ok(locate(s,0,'battle',low.uid));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===sirix.uid));
 assert.equal(s.players[1].deck.at(-1).uid,foreign.uid);
});

test('Sky can attack immediately and block',()=>{
 const s=setup();
 const sky=play(s,SKY);
 assert.ok(e.getLegalActions({...s,phase:'attack'}).some(a=>a.kind==='attack'&&a.uid===sky.uid));
 const enemy=put(s,1,'battle',BODY);
 s.active=1;
 attack(s,enemy.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===sky.uid));
 act(s,'block',a=>a.uid===sky.uid);
 drain(s);
 assert.ok(locate(s,0,'battle',sky.uid).tapped);
});

test('Sky reacts to an opposing creature untapping at turn start, and not to mana alone',()=>{
 for(const mode of ['creature','mana','seed','locked','ignored']){
  const s=setup();
  const sky=put(s,0,'battle',SKY,{tapped:true});
  if(mode==='ignored')sky.g35Ignored=s.turn+1;
  if(mode==='locked')sky.tapLocks=[0];
  if(mode==='mana')put(s,1,'mana',BODY,{tapped:true});
  else if(mode==='seed')put(s,1,'battle',SEED,{tapped:true});
  else put(s,1,'battle',BODY,{tapped:true});
  end(s);
  assert.equal(sky.tapped,mode!=='creature',mode);
 }
});

test('Sky reacts to a real effect untap and cascades only through actual changes',()=>{
 let s=setup();
 const first=put(s,0,'battle',SKY,{tapped:true}),second=put(s,1,'battle',SKY,{tapped:true});
 const source=put(s,1,'battle',BODY,{tapped:true});
 const gott='dm24rp2-051';
 play(s,gott);
 pick(s,source.uid);
 pick(s,null);
 s=restore(s);
 pick(s,false);
 drain(s);
 for(const [p,x] of [[0,first],[1,second],[1,source]])assert.equal(locate(s,p,'battle',x.uid).tapped,false);
 assert.equal(s.decision,null);
});
