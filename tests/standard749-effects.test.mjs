import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-749.json',import.meta.url)));

test('Phase 749 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:749}));
  assert.throws(()=>standardCardSpec(detail,{phase:748}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:749}));
 }
});

const JACKPOT='dmx16-002',SHIVA='dmrp18-s11',MAGMA='dm23rp4-019';
const LOW='dm01-083',MED='dm01-108',HIGH='dm01-007',DEMON_HAND='dm01-027';
const LIFE_DRAGON='dmrp18-030',EVO_DRAGON='dm27-007',DOUBLE='dm10-006';
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,predicate)=>act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
const select=(s,x)=>pick(s,v=>v?.uid===x.uid||v===x.uid);
const skip=s=>pick(s,v=>v===null);
const use=s=>pick(s,v=>v===true);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(MED));
 return s;
}
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id){
 const x=inst(id);
 s.phase='main';
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function fight(s,attacker,target){
 attack(s,attacker.uid,target.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
}

test('Jackpot can attack immediately and may decline without revealing or moving cards',()=>{
 const s=field(),enemy=put(s,1,LOW,{tapped:true}),jackpot=play(s,JACKPOT);
 assert.equal(e.effectiveCard(jackpot,s).breaker,2);
 const before=s.players[0].deck.map(x=>x.uid);
 fight(s,jackpot,enemy);
 assert.equal(s.decision.task.op,'g34_Offer');
 skip(s);drain(s);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),before);
 assert.equal(s.players[0].grave.length,0);
});

test('Jackpot selects an eligible Dragon, deploys before milling, and reserves the other revealed cards for EX Life',()=>{
 let s=field(),jackpot=put(s,0,JACKPOT),enemy=put(s,1,LOW,{tapped:true});
 give(s,0,'deck',[MED,LIFE_DRAGON,EVO_DRAGON,HIGH,LOW,MED]);
 const [first,dragon,evo,ex,tail]=s.players[0].deck;
 fight(s,jackpot,enemy);use(s);
 assert.equal(s.decision.task.op,'g34_Select');
 assert.deepEqual(s.decision.choices.map(o=>o.value?.uid),[dragon.uid]);
 s=restore(s);select(s,dragon);drain(s);
 const deployed=s.players[0].battle.find(x=>x.uid===dragon.uid);
 assert.ok(deployed);
 assert.equal(deployed.exLifeShieldUid,ex.uid);
 assert.ok(has(s,0,'shields',ex));
 assert.ok(has(s,0,'grave',first));
 assert.ok(has(s,0,'grave',evo));
 assert.equal(s.players[0].deck[0].uid,tail.uid);
 assert.ok(!s.players[0].g34Protected?.length);
});

test('Jackpot mills all revealed cards when none match the deployment condition',()=>{
 const s=field(),jackpot=put(s,0,JACKPOT),enemy=put(s,1,LOW,{tapped:true});
 give(s,0,'deck',[EVO_DRAGON,MED,HIGH,LOW,MED]);
 const [a,b,c,tail]=s.players[0].deck;
 fight(s,jackpot,enemy);use(s);drain(s);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid).sort(),[a,b,c].map(x=>x.uid).sort());
 assert.equal(s.players[0].deck[0].uid,tail.uid);
});

test('Jackpot still mills the other cards after the chosen Dragon is redirected to mana',()=>{
 const s=field(),jackpot=put(s,0,JACKPOT),enemy=put(s,1,LOW,{tapped:true});
 put(s,1,'dmr20-066');give(s,0,'mana',[]);
 give(s,0,'deck',[LIFE_DRAGON,MED,HIGH,LOW,MED]);
 const [dragon,b,c,tail]=s.players[0].deck;
 fight(s,jackpot,enemy);use(s);select(s,dragon);drain(s);
 assert.ok(has(s,0,'mana',dragon));
 assert.ok(!has(s,0,'battle',dragon));
 assert.deepEqual(s.players[0].grave.map(x=>x.uid).sort(),[b,c].map(x=>x.uid).sort());
 assert.equal(s.players[0].deck[0].uid,tail.uid);
});

test('Shiva grants Mach Fighter to its own creatures, draws first and breaks the chosen shield',()=>{
 const s=field(),ex=s.players[0].deck[0],shiva=play(s,SHIVA),drawn=s.players[0].deck[0];
 assert.equal(e.effectiveCard(shiva,s).breaker,4);
 assert.ok(has(s,0,'shields',ex));
 const ally=play(s,MED),enemy=put(s,1,LOW);
 const [first,chosen]=s.players[1].shields;
 assert.equal(e.effectiveCard(shiva,s).machFighter,true);
 assert.equal(e.effectiveCard(ally,s).machFighter,true);
 assert.equal(e.effectiveCard(enemy,s).machFighter,undefined);
 assert.ok(!e.getLegalActions({...s,phase:'attack'}).some(a=>a.kind==='attack'&&a.uid===ally.uid&&a.target==='player'));
 fight(s,ally,enemy);
 assert.ok(has(s,0,'hand',drawn));
 assert.equal(s.decision.task.op,'g34_Break278');
 select(s,chosen);drain(s);
 assert.ok(has(s,1,'hand',chosen));
 assert.ok(has(s,1,'shields',first));
});

test('Shiva may decline the shield break and its aura lasts through EX Life but ends when it leaves',()=>{
 const s=field(),ex=s.players[0].deck[0],shiva=play(s,SHIVA),ally=play(s,MED),enemy=put(s,1,LOW);
 fight(s,ally,enemy);
 skip(s);drain(s);
 assert.equal(s.players[1].shields.length,5);
 s.active=1;
 play(s,DEMON_HAND);act(s,'effect',a=>a.targets[0].uid===shiva.uid);drain(s);
 assert.ok(has(s,0,'battle',shiva));
 assert.ok(has(s,0,'grave',ex));
 assert.equal(e.effectiveCard(ally,s).machFighter,true);
 play(s,DEMON_HAND);act(s,'effect',a=>a.targets[0].uid===shiva.uid);drain(s);
 assert.ok(has(s,0,'grave',shiva));
 assert.equal(e.effectiveCard(ally,s).machFighter,undefined);
});

test('Magma may choose two creatures on the same side or decline its entry battle',()=>{
 for(const accept of [false,true]){
  const s=field(),a=put(s,1,HIGH),b=put(s,1,LOW),magma=play(s,MAGMA);
  assert.equal(s.decision.task.op,'g34_FightPair586');
  if(accept){select(s,a);select(s,b);}else skip(s);
  drain(s);
  assert.equal(has(s,1,'grave',b),accept);
  assert.ok(has(s,0,'battle',magma));
  assert.equal(s.players[0].hand.length,0);
 }
});

function triggerMagma(count){
 const s=field(1),enemy=put(s,1,count===1?LOW:DOUBLE);
 give(s,0,'shields',count===1?[MAGMA]:[MAGMA,MED]);
 const magma=s.players[0].shields[0];
 attack(s,enemy.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===magma.uid);
 assert.equal(s.players[0].brokenThisTurn,count);
 return {s,magma,enemy};
}

test('Magma uses S Trigger, fights before its separately ordered self-destruction, and draws when it wins',()=>{
 let {s,magma,enemy}=triggerMagma(1);
 assert.equal(s.decision.type,'entryOrder');
 const battle=s.triggers.entries.find(x=>x.uid===magma.uid&&x.effect==='entry');
 assert.ok(battle);
 act(s,'orderEntry',a=>a.effectId===battle.effectId);
 select(s,magma);
 s=restore(s);select(s,enemy);drain(s);
 assert.ok(has(s,1,'grave',enemy));
 assert.ok(has(s,0,'grave',magma));
 assert.equal(s.players[0].hand.length,1);
});

test('Magma survives entry after two shields are actually broken and may skip the fight',()=>{
 const {s,magma}=triggerMagma(2);
 assert.equal(s.decision.task.op,'g34_FightPair586');
 skip(s);drain(s);
 assert.ok(has(s,0,'battle',magma));
 assert.equal(s.players[0].hand.length,1);
});
