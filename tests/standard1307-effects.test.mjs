import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const KNG='promoy19-051',BETA='dmsd08-004',CRISDO='dmex18-s05';
const BASIC='dm01-108',EVO='dm02-s05',DRAGON='dm08-049',DRAGON_WORLD='dmex12-011';
const BRAIN='dm01-052',SPIRAL='dm01-086',BRACHIO='dmrp14-s05';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(30).fill(BASIC));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 drain(s);
}
const canAttack=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid);
const targetUids=s=>s.decision.choices.map(c=>c.value?.uid);
function drawUpTo(s,n){
 for(let i=0;i<n;i++){
  assert.equal(s.decision.task.op,'g34_DrawUpTo');
  pick(s,true);
 }
}

test('five verified prints resolve to three original card IDs',()=>{
 const m=read('tools/support-phase-1307.json');
 const {prints}=read('tools/image-reference-prints.json');
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[KNG,BETA,CRISDO]);
 assert.deepEqual(m.printAliases.map(c=>c.id),['dmrp12-026','dm24sp1-004']);
 for(const {id,canonicalId=id,name,image,source,faces,spec} of [...m.cards,...m.printAliases]){
  assert.deepEqual(spec,standardCardSpec({id,name,faces,status:'complete'},{phase:1307}));
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  const c=e.card(canonicalId),f=faces[0];
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.limit,e.manaValue(c)],['creature',f.cost,Number(f.powerText),f.race,4,1]);
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
 }
});

test('KNG has immediate Speed Attacker and W-Breaker and untaps only the chosen creature once',()=>{
 const s=field(),chosen=add(s,0,'battle',BASIC),other=add(s,0,'battle',BASIC);
 cast(s,KNG);
 const source=s.players[0].battle.find(x=>x.cardId===KNG);
 assert.equal(e.effectiveCard(source,s).breaker,2);
 assert.deepEqual(targetUids(s),[chosen.uid,other.uid]);
 pick(s,chosen.uid);
 attack(s,source.uid);
 finishAttack(s);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(source.tapped);
 attack(s,other.uid);
 finishAttack(s);
 assert.ok(other.tapped);
 const serialized=JSON.parse(JSON.stringify(s));
 for(const game of [s,serialized]){
  const attacker=game.players[0].battle.find(x=>x.uid===chosen.uid);
  attack(game,attacker.uid);
  finishAttack(game);
  assert.ok(!attacker.tapped);
  attack(game,attacker.uid);
  finishAttack(game);
  assert.ok(attacker.tapped);
 }
});

test('KNG’s delayed effect survives the source leaving and follows the chosen creature into evolution',()=>{
 const s=field(),chosen=add(s,0,'battle',BASIC);
 cast(s,KNG);
 pick(s,chosen.uid);
 const source=s.players[0].battle.find(x=>x.cardId===KNG);
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==source.uid);
 s.players[0].grave.push(source);
 const evolution=add(s,0,'hand',EVO);
 act(s,'play',a=>a.uid===evolution.uid);
 act(s,'evolve',a=>a.baseUid===chosen.uid);
 drain(s);
 attack(s,evolution.uid);
 finishAttack(s);
 assert.equal(s.players[0].battle.find(x=>x.uid===evolution.uid).tapped,false);
});

test('KNG’s unused delay expires at turn end',()=>{
 const s=field(),chosen=add(s,0,'battle',BASIC);
 cast(s,KNG);
 pick(s,chosen.uid);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 attack(s,chosen.uid);
 finishAttack(s);
 assert.equal(chosen.tapped,true);
});

test('Betabomegaphone counts itself and only its own creatures, then hastes one other creature',()=>{
 const s=field(),ally=add(s,0,'battle',BASIC,{entered:s.turn});
 add(s,1,'battle',BASIC);
 cast(s,BETA);
 const beta=s.players[0].battle.find(x=>x.cardId===BETA);
 assert.equal(e.effectiveCard(beta,s).speedAttacker,undefined);
 const third=add(s,0,'battle',BASIC,{entered:s.turn});
 assert.equal(e.effectiveCard(beta,s).speedAttacker,true);
 attack(s,beta.uid);
 assert.deepEqual(targetUids(s),[ally.uid,third.uid]);
 pick(s,ally.uid);
 finishAttack(s);
 assert.ok(canAttack(s,ally));
 assert.ok(!canAttack(s,third));
 assert.ok(e.effectiveCard(ally,s).speedAttacker);
 act(s,'endTurn');
 drain(s);
 assert.ok(!e.effectiveCard(ally,s).speedAttacker);
});

test('Crisdo has Just Diver and Triple Breaker and can draw up to five on its own entry',()=>{
 const s=field();
 cast(s,CRISDO);
 const crisdo=s.players[0].battle.find(x=>x.cardId===CRISDO);
 assert.equal(e.effectiveCard(crisdo,s).breaker,3);
 assert.equal(crisdo.justDiverActive,true);
 drawUpTo(s,5);
 assert.ok(!s.decision);
 assert.equal(s.players[0].hand.length,5);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(crisdo.justDiverActive,true);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.ok(!crisdo.justDiverActive);
});

test('Crisdo can stop early, watches own Dragons including a field, and ignores opponents and non-Dragons',()=>{
 const s=field();
 add(s,0,'battle',CRISDO);
 cast(s,BASIC);
 assert.ok(!s.decision);
 cast(s,DRAGON);
 drawUpTo(s,2);
 pick(s,null);
 assert.equal(s.players[0].hand.length,2);
 cast(s,DRAGON_WORLD);
 assert.equal(s.decision.task.op,'g34_DrawUpTo');
 pick(s,null);
 s.phase='attack';
 act(s,'endTurn');
 act(s,'skipCharge');
 cast(s,DRAGON);
 assert.ok(!s.decision);
});

test('Crisdo uses its own current hand size across hand and graveyard casting (QA 40834)',()=>{
 const s=field(),crisdo=add(s,1,'battle',CRISDO);
 give(s,1,'hand',Array(5).fill(BASIC));
 const brain=add(s,0,'hand',BRAIN),mana=add(s,0,'grave',BRAIN);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===brain.uid));
 assert.equal(e.canCastSpell(s,0,e.card(mana),'grave'),false);
 s.players[1].hand.pop();
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===brain.uid));
 assert.equal(e.canCastSpell(s,0,e.card(mana),'grave'),true);
 assert.equal(e.canCastSpell(s,1,e.card(SPIRAL)),true);
 s.players[1].hand.push(inst(BASIC));
 crisdo.sealed=true;
 assert.equal(e.canCastSpell(s,0,e.card(mana),'grave'),true);
});

test('Crisdo’s continuous restriction applies to free shield spells',()=>{
 const s=field();
 add(s,0,'battle',CRISDO);
 give(s,0,'hand',Array(3).fill(BASIC));
 give(s,1,'shields',[SPIRAL]);
 const attacker=add(s,0,'battle',BASIC);
 attack(s,attacker.uid);
 finishAttack(s);
 assert.equal(s.players[1].shields.length,0);
 assert.deepEqual(s.players[1].hand.map(x=>x.cardId),[SPIRAL]);
 assert.ok(s.players[0].battle.includes(attacker));
});

test('Crisdo does not draw for creature entry suppressed by Brachio (QA 47074)',()=>{
 const s=field();
 add(s,1,'battle',BRACHIO);
 assert.equal(e.card(BRACHIO).name,'ブラキオ龍樹');
 cast(s,CRISDO);
 assert.ok(!s.decision);
 cast(s,DRAGON);
 assert.ok(!s.decision);
 assert.equal(s.players[0].hand.length,0);
});
