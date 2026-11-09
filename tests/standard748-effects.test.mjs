import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-748.json',import.meta.url)));

test('Phase 748 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:748}));
  assert.throws(()=>standardCardSpec(detail,{phase:747}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:748}));
 }
});

const PANZER='dmsd05-003',GYRO='dm20-022',ZORGE='dmx15-s08';
const LOW='dm01-083',MED='dm01-108',MECHA='dmr10-051',OUTRAGE='dmr11-044',SLAYER='dm01-088';
const SIX='dm39-052',SEVEN='dmr01-066',NEO='dmrp01-087',EVOLUTION='dm02-033',MULTI='dm10-068';
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,predicate)=>act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
const select=(s,x)=>pick(s,v=>v?.uid===x.uid||v===x.uid);
const skip=s=>pick(s,v=>v===null);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
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

test('Panzer immediately attacks an untapped enemy and offers only eligible nature creature cards',()=>{
 let s=field(),enemy=put(s,1,LOW),panzer=play(s,PANZER);
 assert.equal(e.effectiveCard(panzer,s).breaker,3);
 const legal=e.getLegalActions({...s,phase:'attack'});
 assert.ok(legal.some(a=>a.kind==='attack'&&a.uid===panzer.uid&&a.target===enemy.uid));
 assert.ok(!legal.some(a=>a.kind==='attack'&&a.uid===panzer.uid&&a.target==='player'));
 give(s,0,'mana',[SIX,SEVEN,EVOLUTION,MULTI,LOW,MED,'dm01-100']);
 const [six,,,multi,,hidden]=s.players[0].mana;
 six.tapped=true;hidden.faceDown=true;
 fight(s,panzer,enemy);
 assert.equal(s.decision.task.op,'g34_Select');
 assert.deepEqual(s.decision.choices.flatMap(o=>o.value?[o.value.uid]:[]),[six.uid,multi.uid]);
 s=restore(s);select(s,six);drain(s);
 assert.ok(inZone(s,0,'battle',six));
 assert.ok(!inZone(s,0,'mana',six));
 assert.ok(inZone(s,0,'mana',multi));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Panzer may skip deployment and may use NEO evolution on an eligible mana card',()=>{
 for(const evolve of [false,true]){
  const s=field(),panzer=put(s,0,PANZER),enemy=put(s,1,LOW,{tapped:true});
  give(s,0,'mana',[NEO]);
  const neo=s.players[0].mana[0];
  fight(s,panzer,enemy);
  if(evolve){
   select(s,neo);
   assert.equal(s.decision.task.op,'g34_Put');
   select(s,panzer);drain(s);
   assert.ok(s.players[0].battle.some(x=>x.uid===neo.uid&&x.under?.some(y=>y.uid===panzer.uid)));
  }else{
   skip(s);drain(s);
   assert.ok(inZone(s,0,'mana',neo));
  }
 }
});

test('Gyro can tap to untap the exact Great Mechao winner after restoring the choice',()=>{
 let s=field(),gyro=put(s,0,GYRO),winner=put(s,0,MECHA),other=put(s,0,MECHA,{tapped:true});
 fight(s,winner,put(s,1,LOW,{tapped:true}));
 assert.equal(s.decision.task.op,'g34_TapToUntap748');
 s=restore(s);pick(s,v=>v===true);drain(s);
 const tapped=x=>s.players[0].battle.find(y=>y.uid===x.uid).tapped;
 assert.equal(tapped(gyro),true);
 assert.equal(tapped(winner),false);
 assert.equal(tapped(other),true);
 fight(s,winner,put(s,1,LOW,{tapped:true}));
 assert.notEqual(s.decision?.task?.op,'g34_TapToUntap748');
 drain(s);
 assert.equal(tapped(winner),true);
});

test('Gyro may decline on the opposing turn and watches only its own Great Mechaos',()=>{
 const s=field(1),gyro=put(s,0,GYRO),winner=put(s,0,MECHA,{tapped:true});
 fight(s,put(s,1,LOW),winner);
 assert.equal(s.decision.player,0);
 skip(s);drain(s);
 assert.equal(gyro.tapped,false);
 assert.equal(winner.tapped,true);
 fight(s,put(s,1,LOW),winner);
 pick(s,v=>v===true);drain(s);
 assert.equal(winner.tapped,false);
 const nonMecha=put(s,0,MED,{tapped:true});
 fight(s,put(s,1,LOW),nonMecha);drain(s);
 assert.equal(nonMecha.tapped,true);
 const attacker=put(s,1,MECHA);
 fight(s,attacker,nonMecha);drain(s);
 assert.equal(attacker.tapped,true);
});

test('Gyro may pay its tap even if the winner is prevented from untapping',()=>{
 const s=field(),gyro=put(s,0,GYRO),winner=put(s,0,MECHA,{tapLocks:[1]});
 fight(s,winner,put(s,1,LOW,{tapped:true}));
 pick(s,v=>v===true);drain(s);
 assert.equal(gyro.tapped,true);
 assert.equal(winner.tapped,true);
});

test('Zorge enters the mana zone tapped and breaks two shields on an ordinary attack',()=>{
 const s=field(),manaCopy=inst(ZORGE);
 s.phase='charge';s.players[0].hand.push(manaCopy);
 act(s,'charge',a=>a.uid===manaCopy.uid);
 assert.ok(s.players[0].mana.find(x=>x.uid===manaCopy.uid)?.tapped);
 const zorge=put(s,0,ZORGE);
 assert.equal(e.effectiveCard(zorge,s).breaker,2);
 attack(s,zorge.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Zorge may battle on its own entry and may draw before the defeated Slayer resolves',()=>{
 let s=field(),enemy=put(s,1,SLAYER),zorge=play(s,ZORGE);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 s=restore(s);select(s,enemy);
 assert.ok(inZone(s,1,'grave',enemy));
 assert.ok(inZone(s,0,'battle',zorge));
 assert.equal(s.decision.task.op,'g34_Offer');
 const drawn=s.players[0].deck[0];
 pick(s,v=>v===true);drain(s);
 assert.ok(inZone(s,0,'hand',drawn));
 assert.ok(inZone(s,0,'grave',zorge));
});

test('Zorge battles with the actual allied Outrage that entered and only draws for allied Outrage wins',()=>{
 const s=field(),zorge=put(s,0,ZORGE),strong=put(s,1,MECHA),weak=put(s,1,LOW,{tapped:true});
 const first=play(s,OUTRAGE);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 select(s,strong);drain(s);
 assert.ok(inZone(s,0,'grave',first));
 assert.ok(inZone(s,0,'battle',zorge));
 assert.ok(inZone(s,1,'battle',strong));
 const second=play(s,OUTRAGE);
 select(s,weak);
 assert.equal(s.decision.task.op,'g34_Offer');
 assert.ok(inZone(s,1,'grave',weak));
 assert.ok(inZone(s,0,'battle',second));
 const before=s.players[0].hand.length;
 skip(s);drain(s);
 assert.equal(s.players[0].hand.length,before);
 const nonOutrage=play(s,MECHA);
 assert.equal(s.decision,null);
 for(let i=0;i<2;i++){s.phase='attack';act(s,'endTurn');drain(s);}
 fight(s,nonOutrage,put(s,1,LOW,{tapped:true}));
 assert.notEqual(s.decision?.task?.op,'g34_Offer');
});

test('Zorge can skip the allied Outrage entry battle and ignores enemy entries',()=>{
 const s=field(),enemy=put(s,1,LOW);
 put(s,0,ZORGE);
 const ally=play(s,OUTRAGE);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 skip(s);drain(s);
 assert.ok(inZone(s,1,'battle',enemy));
 assert.ok(inZone(s,0,'battle',ally));
 s.active=1;
 const other=play(s,OUTRAGE);
 assert.equal(s.decision,null);
 assert.ok(inZone(s,1,'battle',other));
});
