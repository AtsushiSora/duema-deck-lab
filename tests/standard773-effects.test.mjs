import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-773.json',import.meta.url)));
const KURO='dm23rp4-018',MIDO='dm23rp4-025',RUBEL='dm23rp4-040';
const BODY='dm01-108',MECHA='dm28-073',ABYSS='dm22sd1-010',GIANT='dm03-053',SEED='dmrp21-069',APUL='dmrp22-042';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
test('three complete definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:773}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:773}));
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

function change(s,attacker){
 attack(s,attacker.uid);
 assert.equal(s.decision?.task?.op,'revDeclare');
 pick(s,true);
 assert.equal(s.decision?.task?.op,'revResolve');
 pick(s,attacker.uid);
}
function task(s,op,p,options){
 s.phase='main';
 s.extTasks=[{op,p,source:BODY,...options}];
 act(s,'toAttack');
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function pickUid(s,uid){
 assert.ok(s.decision.choices.some(x=>(x.value?.uid??x.value)===uid));
 pick(s,uid);
}
const live=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);

for(const id of [MECHA,ABYSS])test('Kuro changes from either eligible tribe and discards the chosen hidden position '+id,()=>{
 let s=setup();
 const attacker=put(s,0,'battle',id),source=put(s,0,'hand',KURO);
 const first=put(s,1,'hand',BODY),second=put(s,1,'hand','dm01-075');
 change(s,attacker);
 assert.equal(s.decision.task.op,'g34_BlindDiscard773');
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.choices.map(({label,value,cardId})=>[label,value,cardId]),
  [['裏向きの手札 1',0,undefined],['裏向きの手札 2',1,undefined]]);
 s=restore(s);
 pick(s,1);
 assert.ok(has(s,1,'hand',first)&&has(s,1,'grave',second));
 assert.ok(has(s,0,'battle',source)&&has(s,0,'hand',attacker));
 assert.equal(s.decision.type,'block');
});

test('Kuro discards only on Revolution Change and only the opponent’s mana enters tapped',()=>{
 const s=setup();
 const held=put(s,1,'hand',BODY),source=play(s,KURO);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'hand',held));
 const own=put(s,0,'hand',BODY);
 s.phase='charge';
 act(s,'charge',a=>a.uid===own.uid);
 assert.equal(live(s,0,'mana',own).tapped,false);
 s.active=1;
 s.phase='charge';
 act(s,'charge',a=>a.uid===held.uid);
 assert.equal(live(s,1,'mana',held).tapped,true);
 const ordinary=put(s,1,'hand',BODY);
 act(s,'play',a=>a.uid===ordinary.uid);
 assert.equal(live(s,1,'battle',ordinary).tapped,false);
 assert.ok(has(s,0,'battle',source));
});

test('Kuro does not allow a two-cost Mecha to declare its Revolution Change',()=>{
 const s=setup(),attacker=put(s,0,'battle','dm24rp1-031');
 put(s,0,'hand',KURO);
 attack(s,attacker.uid);
 assert.equal(s.decision.type,'block');
});

for(const id of [GIANT,ABYSS])test('Mido ramps on Revolution Change then lets the player recover the exact new mana '+id,()=>{
 let s=setup();
 const attacker=put(s,0,'battle',id),source=put(s,0,'hand',MIDO),top=s.players[0].deck[0];
 const before=s.players[0].mana.length;
 change(s,attacker);
 assert.ok(has(s,0,'mana',top));
 assert.equal(s.players[0].mana.length,before+1);
 assert.equal(s.decision.task.origin,'mana');
 s=restore(s);
 pickUid(s,top.uid);
 assert.ok(has(s,0,'hand',top)&&has(s,0,'hand',attacker)&&has(s,0,'battle',source));
 assert.equal(s.players[0].mana.length,before);
});

test('Mido may leave the ramp in mana and does not ramp on a normal summon',()=>{
 const s=setup(),attacker=put(s,0,'battle',GIANT),top=s.players[0].deck[0];
 play(s,MIDO);
 assert.equal(s.decision,null);
 assert.ok(!has(s,0,'mana',top));
 put(s,0,'hand',MIDO);
 change(s,attacker);
 pick(s,null);
 assert.ok(has(s,0,'mana',top));
});

test('Mido forces only attacks which can legally target it and does not force an attack',()=>{
 const s=setup(),source=put(s,0,'battle',MIDO),attacker=put(s,1,'battle',BODY),alternate=put(s,0,'battle',BODY);
 alternate.tapped=true;
 s.active=1;
 s.phase='attack';
 const targets=()=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===attacker.uid).map(a=>a.target);
 assert.ok(targets().includes('player')&&targets().includes(alternate.uid));
 assert.ok(!targets().includes(source.uid));
 source.tapped=true;
 assert.deepEqual(targets(),[source.uid]);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
});

test('Rubel chooses an element and mana without tapping them or revealing face-down mana',()=>{
 let s=setup();
 const seed=put(s,1,'battle',SEED),mana=s.players[1].mana[1];
 mana.faceDown=true;
 play(s,RUBEL);
 assert.equal(s.decision.task.op,'g34_Target');
 pickUid(s,seed.uid);
 s=restore(s);
 assert.equal(s.decision.task.op,'g34_StartManaLock773');
 const hidden=s.decision.choices.find(x=>x.value===mana.uid);
 assert.match(hidden.label,/^裏向きのマナ/);
 assert.equal(hidden.cardId,undefined);
 pickUid(s,mana.uid);
 assert.equal(live(s,1,'battle',seed).tapped,false);
 assert.equal(live(s,1,'mana',mana).tapped,false);
 assert.ok(live(s,1,'battle',seed).skipUntap&&live(s,1,'mana',mana).skipUntap);
});

test('Rubel affects just the next opponent start, after its source leaves',()=>{
 const s=setup();
 const target=put(s,1,'battle',BODY),other=put(s,1,'battle',BODY),mana=s.players[1].mana[2],spare=s.players[1].mana[3];
 for(const x of [target,other,mana,spare])x.tapped=true;
 const source=play(s,RUBEL);
 pickUid(s,target.uid);
 pickUid(s,mana.uid);
 task(s,'g34_ExactMove',0,{owner:0,target:source.uid,to:'hand'});
 end(s);
 assert.equal(s.active,1);
 assert.ok(target.tapped&&mana.tapped);
 assert.ok(!other.tapped&&!spare.tapped);
 end(s);
 end(s);
 assert.equal(s.active,1);
 assert.ok(!target.tapped&&!mana.tapped);
});

test('Rubel still allows effect-based untaps before the next turn and locks mana despite a movement prohibition',()=>{
 const s=setup(),target=put(s,1,'battle',BODY),mana=s.players[1].mana[0];
 put(s,0,'battle',APUL);
 target.tapped=true;
 mana.tapped=true;
 play(s,RUBEL);
 pickUid(s,target.uid);
 pickUid(s,mana.uid);
 task(s,'g34_Target',1,{owner:'self',untap:true});
 pickUid(s,target.uid);
 assert.equal(target.tapped,false);
 assert.equal(mana.skipUntap,true);
});

test('Rubel resolves either available zone when the other is empty',()=>{
 for(const zone of ['battle','mana']){
  const s=setup();
  give(s,1,'mana',[]);
  const target=put(s,1,zone,BODY);
  play(s,RUBEL);
  pickUid(s,target.uid);
  assert.equal(target.skipUntap,true);
  assert.equal(s.decision,null);
 }
});

test('Rubel triggers on a five-cost Mecha Revolution Change as on a normal summon',()=>{
 const s=setup(),attacker=put(s,0,'battle','dm22ex1-098'),source=put(s,0,'hand',RUBEL),mana=s.players[1].mana[0];
 change(s,attacker);
 assert.equal(s.decision.task.op,'g34_StartManaLock773');
 pickUid(s,mana.uid);
 assert.ok(has(s,0,'battle',source)&&has(s,0,'hand',attacker));
 assert.ok(mana.skipUntap);
});
