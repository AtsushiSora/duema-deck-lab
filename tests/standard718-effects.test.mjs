import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-718.json',import.meta.url)));

test('Phase 718 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:718}));
  assert.throws(()=>standardCardSpec(detail,{phase:717}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  if(regulationVerification.limits[row.id]===0)assert.ok(e.validateDeck(deck).some(error=>error.includes(row.name)));
  else assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:718}));
 }
});

const RUNE='dm07-019',KEYBOARD='dm17-046',WAR='dm17-054';
const DARK='dm01-090',DARK_FIRE='dmex14-108',FIRE='dm01-097',NATURE='dm01-108';
const ST_SPELL='dm01-052',ST_CREATURE='dmr01-092',STRIKE='dmrp17-025';
const HULCUS='dm01-080',EVOLUTION='dm10-017';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function hit(s,x){
 attack(s,x.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
}
function play(s,id){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
const pick=(s,x)=>act(s,'extended',a=>s.decision.choices[a.choice].value===(x?.uid??x));
const options=s=>s.decision.choices.map(c=>c.value);

test('Trap Tree reprint resolves to the phase 717 ID and shares its deck copy count',()=>{
 const [row]=printAliases;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const original=e.card(row.canonicalId);
 assert.equal(row.canonicalId,'dm07-007');
 const print=details.printAliases.find(x=>x.id===row.id);
 assert.equal(print.canonicalId,row.canonicalId);
 assert.deepEqual(row.faces,print.faces);
 assert.deepEqual(row.spec,{g401ShieldSaver:true});
 assert.deepEqual(row.spec,standardCardSpec({...row,status:'complete'},{phase:718}));
 assert.ok(row.verification.facesMatched);
 assert.match(row.image,/^https:\/\/dm\.takaratomy\.co\.jp\/.*\.jpg$/);
 assert.equal(regulationVerification.limits[row.id],original.limit);
 assert.equal(catalogue.get(row.id).id,row.canonicalId);
 const rows=[{id:row.id,count:3},{id:row.canonicalId,count:2}];
 assert.deepEqual(catalogue.resolveRows(rows),[{id:row.canonicalId,count:5}]);
 assert.ok(catalogue.validate({cards:rows}).some(error=>error.includes(original.name)&&error.includes('4枚')));
 assert.equal(data.cards.filter(x=>canonicalCardName(x.name)===original.name).length,1);
 const oldSnapshot=structuredClone(snapshot);
 delete oldSnapshot.aliases[row.id];
 oldSnapshot.cards.push({id:row.id,name:row.name,source:row.source});
 const oldDetails={...details,cards:[...details.cards,print]};
 assert.deepEqual(createCatalogue(oldSnapshot,data.cards,oldDetails).resolveRows(rows),[{id:row.canonicalId,count:5}]);
});

test('Rune stops the opponent’s spell and creature triggers while untapped and through another attacker',()=>{
 for(const id of [ST_SPELL,ST_CREATURE]){
  const s=field(),rune=put(s,0,RUNE),attacker=put(s,0,FIRE);
  give(s,1,'shields',[id]);
  const shield=s.players[1].shields[0];
  hit(s,attacker);
  assert.equal(rune.tapped,false);
  assert.equal(s.decision,null);
  assert.deepEqual(s.players[1].hand.map(x=>x.uid),[shield.uid]);
  assert.equal(s.metrics[1].triggers,0);
 }
});

test('Rune retains W Breaker and the opponent can still declare G Strike',()=>{
 const s=field(),rune=put(s,0,RUNE);
 give(s,1,'shields',[ST_SPELL,STRIKE]);
 const [spell,strike]=s.players[1].shields;
 hit(s,rune);
 assert.equal(s.decision.task.op,'gsDeclare');
 assert.equal(s.decision.task.uid,strike.uid);
 pick(s,false);
 drain(s);
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),[spell.uid,strike.uid]);
 assert.equal(s.metrics[0].breaks,2);
});

test('Rune does not block its owner’s triggers and stops applying when its abilities are ignored',()=>{
 for(const mode of ['own','ignored']){
  const s=field(),rune=put(s,0,RUNE);
  if(mode==='ignored')rune.g35Ignored=s.turn;
  const p=mode==='own'?0:1;
  s.active=1-p;
  const attacker=put(s,1-p,FIRE);
  give(s,p,'shields',[ST_SPELL]);
  hit(s,attacker);
  assert.equal(s.decision?.type,'trigger');
  assert.equal(s.decision.player,p);
 }
});

test('Rune still allows the opponent to use S Back',()=>{
 const s=field(),attacker=put(s,0,FIRE);
 put(s,0,RUNE);
 give(s,1,'hand',['dm17-035']);
 give(s,1,'shields',[NATURE]);
 give(s,1,'mana',[]);
 const [back]=s.players[1].hand,[shield]=s.players[1].shields;
 hit(s,attacker);
 assert.equal(s.decision.task.op,'g13_SB');
 act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===back.uid);
 pick(s,null);
 drain(s);
 assert.ok(s.players[1].battle.some(x=>x.uid===back.uid));
 assert.ok(s.players[1].grave.some(x=>x.uid===shield.uid));
});

test('Keyboard adds one per copy to both players’ paid Dark summons, including multicolor and another Keyboard',()=>{
 const s=field();
 const own=put(s,0,KEYBOARD),enemy=put(s,1,KEYBOARD);
 for(const p of [0,1]){
  s.active=p;
  give(s,p,'hand',[DARK,DARK_FIRE,KEYBOARD,FIRE,ST_SPELL]);
  const prices=Object.fromEntries(e.getLegalActions(s).filter(a=>a.kind==='play').map(a=>[a.cardId,a.cost]));
  assert.deepEqual(prices,{[DARK]:4,[DARK_FIRE]:4,[KEYBOARD]:4,[FIRE]:2,[ST_SPELL]:4});
 }
 enemy.g35Ignored=s.turn;
 assert.equal(e.getLegalActions(s).find(a=>a.kind==='play'&&a.cardId===DARK).cost,3);
 const untapped=s.players[1].mana.filter(x=>!x.tapped).length;
 act(s,'play',a=>a.cardId===DARK);
 assert.equal(s.players[1].mana.filter(x=>!x.tapped).length,untapped-3);
 assert.ok(s.players[0].battle.includes(own));
});

test('Keyboard does not charge mana for a Dark creature summoned by S Trigger',()=>{
 const s=field(),attacker=put(s,0,FIRE);
 put(s,0,KEYBOARD);
 give(s,1,'mana',[]);
 give(s,1,'shields',[ST_CREATURE]);
 hit(s,attacker);
 act(s,'useTrigger');
 drain(s);
 assert.equal(s.players[1].battle[0].cardId,ST_CREATURE);
 assert.equal(s.players[1].mana.length,0);
});

test('War offers only the opponent a free creature of cost 3 or less and survives restoring the choice',()=>{
 let s=field();
 put(s,0,KEYBOARD);
 give(s,1,'mana',[]);
 give(s,1,'hand',[DARK,HULCUS,RUNE,ST_SPELL,EVOLUTION]);
 const [dark,hulcus,big,spell,evolution]=s.players[1].hand;
 play(s,WAR);
 assert.equal(s.decision.player,1);
 assert.deepEqual(options(s),[dark.uid,hulcus.uid,null]);
 assert.ok(!options(s).some(x=>[big.uid,spell.uid,evolution.uid].includes(x)));
 s=restore(s);
 pick(s,dark);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[1].battle.map(x=>x.uid),[dark.uid]);
 assert.equal(s.players[1].mana.length,0);
 assert.equal(s.g34DeployBatch,undefined);
});

test('War allows decline or a legal evolution and resolves the chosen creature’s entry ability',()=>{
 for(const mode of ['decline','evolution','entry']){
  const s=field(),base=put(s,1,HULCUS);
  give(s,1,'hand',[EVOLUTION,HULCUS,DARK]);
  const [evolution,hulcus,dark]=s.players[1].hand,deck=s.players[1].deck.length;
  play(s,WAR);
  pick(s,mode==='decline'?null:mode==='evolution'?evolution:hulcus);
  if(mode==='evolution')pick(s,base);
  drain(s);
  assert.equal(s.players[1].hand.some(x=>x.uid===dark.uid),true);
  assert.equal(s.players[1].battle.some(x=>x.uid===evolution.uid),mode==='evolution');
  if(mode==='evolution')assert.deepEqual(s.players[1].battle.find(x=>x.uid===evolution.uid).under.map(x=>x.uid),[base.uid]);
  assert.equal(s.players[1].battle.some(x=>x.uid===hulcus.uid),mode==='entry');
  assert.equal(s.players[1].deck.length,deck-Number(mode==='entry'));
 }
});
