import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-704.json',import.meta.url)));

test('Phase 704 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:704}));
  assert.throws(()=>standardCardSpec(detail,{phase:703}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:704}));
 }
});

const TRONBO='dm22ex1-082',RADISH='dm22ex1-093',HAZARIA='dm22ex1-109';
const BODY='dm01-108',WAVE='dm11-024',SPELL='dm01-110',HASTE='dm05-049';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const play=(s,id,face=0)=>{
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
};
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===value);
const peers=s=>{put(s,0,WAVE);put(s,1,WAVE);};
const canEnd=s=>e.getLegalActions(s).some(a=>a.kind==='endTurn');
const end=s=>{s.phase='attack';act(s,'endTurn');};
const trigger=(s,id,attacker)=>{
 give(s,1,'shields',[id]);
 const shield=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid&&(a.face??0)===1);
 return shield;
};

for(const [twin,single] of [[TRONBO,'dm13-011'],[RADISH,'dm12-055'],[HAZARIA,'dm11-013']])test(twin+' preserves the single-face effect and has its own deck identity',()=>{
 const row=cards.find(x=>x.id===twin),original=details.cards.find(x=>x.id===single);
 const {spellFace,...front}=row.spec;
 assert.deepEqual(front,standardCardSpec(original,{phase:703}));
 const deck=structuredClone(PRESETS[0]);
 deck.cards.splice(0,2,{id:single,count:4},{id:twin,count:4});
 assert.equal(deck.cards.reduce((n,c)=>n+c.count,0),40);
 assert.deepEqual(e.validateDeck(deck),[]);
 const unknown=structuredClone(details.cards.find(x=>x.id===twin));
 unknown.faces[1].abilityText+='\n未知の能力';
 assert.throws(()=>standardCardSpec(unknown,{phase:704}));
 const s=setup();
 put(s,0,WAVE);
 put(s,1,BODY);
 give(s,0,'grave',[BODY]);
 const top=s.players[0].deck[0];
 play(s,twin);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.equal(s.players[0].grave.length,1);
 assert.equal(s.players[1].battle.length,1);
});

for(const recover of [false,true])test('Tronbo can recover only an own grave creature or decline '+recover,()=>{
 let s=setup();
 peers(s);
 give(s,0,'grave',[SPELL,BODY]);
 give(s,1,'grave',[BODY]);
 const creature=s.players[0].grave[1];
 play(s,TRONBO);
 assert.deepEqual(choices(s),[creature.uid,null]);
 s=restore(s);
 pick(s,recover?creature.uid:null);
 assert.equal(has(s,0,'hand',creature),recover);
 assert.equal(has(s,0,'grave',creature),!recover);
 assert.equal(s.players[1].grave.length,1);
});

for(const mill of [false,true])test('Devil Hand triggers, destroys the chosen creature and optionally mills exactly three '+mill,()=>{
 let s=setup();
 const attacker=put(s,0,BODY),target=put(s,0,BODY),ally=put(s,1,BODY);
 give(s,1,'deck',Array(5).fill(BODY));
 const top=s.players[1].deck.slice(0,3).map(x=>x.uid);
 const spell=trigger(s,TRONBO,attacker);
 assert.deepEqual(choices(s),[attacker.uid,target.uid]);
 pick(s,target.uid);
 assert.ok(has(s,0,'grave',target));
 assert.ok(has(s,0,'battle',attacker)&&has(s,1,'battle',ally));
 assert.equal(s.decision.task.op,'g34_Mill');
 s=restore(s);
 pick(s,mill?true:null);
 assert.deepEqual(s.players[1].grave.filter(x=>x.uid!==spell.uid).map(x=>x.uid).sort(),mill?[...top].sort():[]);
 assert.ok(has(s,1,'grave',spell));
 assert.equal(s.players[1].mana.filter(x=>x.tapped).length,0);
});

test('Radish ramps before a mandatory mana recovery and can return the same creature after restoring',()=>{
 let s=setup();
 peers(s);
 give(s,0,'deck',[BODY,BODY,BODY]);
 const top=s.players[0].deck[0],mana=s.players[0].mana.length;
 s.players[0].mana.push(inst(SPELL));
 play(s,RADISH);
 assert.ok(has(s,0,'mana',top));
 assert.ok(choices(s).includes(top.uid));
 assert.ok(!choices(s).includes(null));
 assert.ok(!choices(s).includes(s.players[0].mana.find(x=>x.cardId===SPELL).uid));
 s=restore(s);
 pick(s,top.uid);
 assert.ok(has(s,0,'hand',top));
 assert.equal(s.players[0].mana.length,mana+1);
});

test('Naturatrue Trap triggers, sends the selected enemy to its owner’s mana and draws the deck top',()=>{
 const s=setup();
 const attacker=put(s,0,BODY),target=put(s,0,BODY),ally=put(s,1,BODY),top=s.players[1].deck[0];
 const spell=trigger(s,RADISH,attacker);
 assert.deepEqual(choices(s),[attacker.uid,target.uid]);
 pick(s,target.uid);
 assert.ok(has(s,0,'battle',attacker)&&has(s,1,'battle',ally));
 assert.ok(has(s,0,'mana',target));
 assert.ok(has(s,1,'hand',top)&&has(s,1,'grave',spell));
 assert.equal(s.players[1].mana.filter(x=>x.tapped).length,0);
});

test('Naturatrue Trap still draws when no opposing creature can be chosen',()=>{
 const s=setup(),top=s.players[0].deck[0];
 const spell=play(s,RADISH,1);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'hand',top)&&has(s,0,'grave',spell));
});

test('Hazaria has the opponent choose even their own protected creature',()=>{
 const s=setup();
 peers(s);
 const other=s.players[1].battle[0];
 const protectedEnemy=put(s,1,BODY,{justDiverActive:true,g34Grants:[{turn:s.turn,justDiver:true}]});
 play(s,HAZARIA);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[other.uid,protectedEnemy.uid]);
 pick(s,protectedEnemy.uid);
 assert.ok(has(s,1,'grave',protectedEnemy)&&has(s,1,'battle',other));
});

test('Phantom Veil covers opposing creatures that enter later and expires after that turn',()=>{
 let s=setup();
 const own=put(s,0,BODY),waiting=put(s,1,BODY);
 const spell=play(s,HAZARIA,1);
 assert.ok(has(s,0,'grave',spell));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.ok(!e.effectiveCard(own,s).mustAttack&&!e.effectiveCard(waiting,s).mustAttack);
 end(s);
 s.phase='main';
 const newCreature=play(s,BODY),hasty=play(s,HASTE);
 assert.ok(e.effectiveCard(waiting,s).mustAttack&&e.effectiveCard(newCreature,s).mustAttack&&e.effectiveCard(hasty,s).mustAttack);
 s=restore(s);
 s.phase='attack';
 const attackers=e.getLegalActions(s).filter(a=>a.kind==='attack').map(a=>a.uid);
 assert.deepEqual([...new Set(attackers)],[waiting.uid,hasty.uid]);
 assert.ok(!canEnd(s));
 for(const x of [waiting,hasty]){
  attack(s,x.uid);
  act(s,'noBlock');
 }
 assert.ok(canEnd(s));
 end(s);
 end(s);
 s.phase='attack';
 assert.ok(!e.effectiveCard(s.players[1].battle.find(x=>x.uid===waiting.uid),s).mustAttack);
 assert.ok(canEnd(s));
});

test('Phantom Veil requires a legal creature attack even when the player cannot be attacked',()=>{
 const s=setup(),target=put(s,0,'dm01-001',{tapped:true}),guard=put(s,1,'dm01-013');
 play(s,HAZARIA,1);
 end(s);
 s.phase='attack';
 const attacks=e.getLegalActions(s).filter(a=>a.kind==='attack');
 assert.equal(attacks.length,1);
 assert.equal(attacks[0].uid,guard.uid);
 assert.equal(attacks[0].target,target.uid);
 assert.ok(!canEnd(s));
 attack(s,guard.uid,target.uid);
 act(s,'noBlock');
 assert.ok(has(s,1,'grave',guard));
 assert.ok(canEnd(s));
});
