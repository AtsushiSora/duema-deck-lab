import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-725.json',import.meta.url)));

test('Phase 725 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:725}));
  assert.throws(()=>standardCardSpec(detail,{phase:724}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:725}));
 }
});

const TRIBAL='dm19-040', SVETA='dm16-021', BAL='dm19-043', NATURE='dm01-108';
const MULTI_RACE='dm35-054', RELATED_RACE='dmr16s-052', SPECIES='ビーストフォーク';
const DARK='dm01-089', FIRE='dm01-097', DEMON='dm01-s06', DRAGON='dm08-049', BOTH_RACES='dmr15-042';
const HAND='dm01-027', CRIMSON='dm19-064', APOCALYPSE='dm14-015';
const SMALL='dm01-013', LARGE='dm01-011';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);

function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}

function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}

const blockUids=s=>e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid);
const attackPlayer=(s,x)=>e.getLegalActions({...s,phase:'attack'}).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player');

test('Tribal affects current allies of the exact race and checks blockers at the inclusive power boundary',()=>{
 let s=field();
 const ally=put(s,0,NATURE), multi=put(s,0,MULTI_RACE), similar=put(s,0,RELATED_RACE), enemy=put(s,1,NATURE);
 const small=put(s,1,SMALL), large=put(s,1,LARGE);
 play(s,TRIBAL);
 s=restore(s);
 pick(s,SPECIES);
 const powerOf=y=>e.power(s.players.flatMap(p=>p.battle).find(x=>x.uid===y.uid),false,s);
 for(const y of [ally,multi])assert.equal(powerOf(y),e.card(y).power+4000);
 for(const y of [similar,enemy])assert.equal(powerOf(y),e.card(y).power);
 const late=play(s,NATURE);
 assert.equal(powerOf(late),e.card(late).power);
 attack(s,ally.uid);
 assert.deepEqual(blockUids(s),[large.uid]);
 act(s,'noBlock');
 drain(s);
 attack(s,similar.uid);
 assert.deepEqual(blockUids(s),[small.uid,large.uid]);
 act(s,'noBlock');
 drain(s);
 act(s,'endTurn');
 assert.equal(powerOf(ally),e.card(ally).power);
});

test('Tribal uses the current blocker power, including changes from another effect',()=>{
 const s=field(), ally=put(s,0,NATURE);
 const small=put(s,1,SMALL,{powerModifiers:[{amount:1000,expires:'end',who:0}]}),
  large=put(s,1,LARGE,{powerModifiers:[{amount:-1000,expires:'end',who:0}]});
 play(s,TRIBAL);
 pick(s,SPECIES);
 attack(s,ally.uid);
 assert.equal(e.power(small,false,s),6000);
 assert.equal(e.power(large,false,s),5000);
 assert.deepEqual(blockUids(s),[small.uid]);
});

test('Tribal works as an S-Trigger on the enemy turn and expires at that turn end',()=>{
 const s=field(), ally=put(s,1,NATURE), attacker=put(s,0,NATURE);
 give(s,1,'mana',[]);
 give(s,1,'shields',[TRIBAL,NATURE]);
 const shield=s.players[1].shields[0], all=physical(s);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,SPECIES);
 assert.equal(e.power(ally,false,s),e.card(ally).power+4000);
 assert.ok(s.players[1].grave.includes(shield));
 assert.equal(s.players[1].mana.length,0);
 assert.deepEqual(physical(s),all);
 act(s,'endTurn');
 assert.equal(e.power(ally,false,s),e.card(ally).power);
});

test('Sveta gains exactly 4000 against a Demon Command or a race containing Dragon only in battle',()=>{
 const s=field(), sveta=play(s,SVETA);
 const [demon,dragon,both,plain]=[DEMON,DRAGON,BOTH_RACES,NATURE].map(id=>put(s,1,id));
 assert.equal(e.power(sveta,false,s),4000);
 for(const enemy of [demon,dragon,both])assert.equal(e.matchupPower(sveta,enemy,false,s),8000);
 assert.equal(e.matchupPower(sveta,plain,false,s),4000);
 assert.equal(attackPlayer(s,sveta),false);
});

test('Sveta wins a real block against a 7000 Demon Command but loses to an unrelated 7000 attacker',()=>{
 for(const id of [DEMON,NATURE]){
  const s=field(), sveta=put(s,0,SVETA), attacker=put(s,1,id);
  if(id===NATURE)attacker.powerModifiers=[{amount:7000-e.card(attacker).power,expires:'end',who:1}];
  s.active=1;
  attack(s,attacker.uid);
  act(s,'block',a=>a.uid===sveta.uid);
  drain(s);
  assert.equal(s.players[0].battle.includes(sveta),id===DEMON);
  assert.equal(s.players[1].grave.includes(attacker),id===DEMON);
 }
});

test('Bal can decline or accept an untap after a qualifying opponent death and a saved choice',()=>{
 for(const [id,answer] of [[DARK,null],[FIRE,true]]){
  let s=field();
  const bal=put(s,0,BAL,{tapped:true}), victim=put(s,1,id);
  play(s,HAND);
  act(s,'effect',a=>a.targets.some(t=>t.uid===victim.uid));
  assert.equal(s.decision.task.op,'g34_Offer');
  assert.equal(s.decision.task.source,BAL);
  assert.equal(s.decision.player,0);
  s=restore(s);
  pick(s,answer);
  assert.equal(s.players[0].battle[0].tapped,answer!==true);
  assert.equal(attackPlayer(s,s.players[0].battle[0]),false);
 }
});

test('Bal sees two separate opposing deaths in the same batch',()=>{
 const s=field(), bal=put(s,0,BAL,{tapped:true});
 put(s,0,LARGE);
 const victims=[put(s,1,DARK),put(s,1,FIRE,{g34Grants:[{turn:s.turn,blocker:true}]})];
 play(s,CRIMSON);
 pick(s,'ガーディアン');
 for(const v of victims)pick(s,v.uid);
 let choices=0;
 for(let step=0;s.decision;step++){
  assert.ok(step<10&&choices<3);
  if(s.decision.task?.source===BAL){
   pick(s,++choices===2?true:null);
  }else{
   e.step(s,e.chooseAI(s));
  }
 }
 assert.equal(choices,2);
 assert.equal(bal.tapped,false);
 assert.equal(s.players[1].grave.length,2);
});

test('Bal ignores a nonmatching death and a destruction replacement',()=>{
 const s=field(), bal=put(s,0,BAL,{tapped:true});
 for(const victim of [put(s,1,NATURE),put(s,1,DARK,{g26Stay:true})]){
  play(s,HAND);
  act(s,'effect',a=>a.targets.some(t=>t.uid===victim.uid));
  assert.equal(s.decision,null);
  assert.equal(bal.tapped,true);
 }
});

test('Bal does not trigger if it leaves in the same destruction batch',()=>{
 const s=field();
 const bal=put(s,0,BAL,{tapped:true});
 for(let i=0;i<2;i++)put(s,0,NATURE);
 put(s,1,DARK);
 put(s,1,FIRE);
 put(s,1,NATURE);
 play(s,APOCALYPSE);
 assert.equal(s.decision,null);
 assert.equal(s.pendingEffects?.length??0,0);
 assert.ok(s.players[0].grave.includes(bal));
});

test('Bal can ready itself after blocking and destroying an opposing Fire attacker',()=>{
 const s=field(), bal=put(s,0,BAL), attacker=put(s,1,FIRE);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===bal.uid);
 assert.ok(s.players[1].grave.includes(attacker));
 assert.equal(s.decision.task.source,BAL);
 assert.equal(bal.tapped,true);
 pick(s,true);
 assert.equal(bal.tapped,false);
});
