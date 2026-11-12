import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const HOPE='dmd24-013', SERENADE='dm24ex2-062', SUNRISE='dmx07-004';
const WHITE='dm06-s08', WHITE_GS='dmsp02-002', ZENITH='dm23ex1-010', CELES='dm23rp3-001';
const DARK='dm01-090', DARK_MULTI='dmr04-050', NATURE='dm01-108';

function play(s,id,face=0){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face&&!a.alternative);
 return x;
}

function pick(s,uid){
 act(s,'extended',a=>{
  const value=s.decision.choices[a.choice].value;
  return (value?.uid??value)===uid;
 });
}

function cost(s,uid,face=0){
 return e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===uid&&(a.face??0)===face&&!a.alternative)?.cost;
}

test('three canonical cards and six official reprints resolve to the correct definitions',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1022.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.equal(manifest.cards.length,3);
 assert.equal(manifest.printAliases.length,6);
 for(const row of manifest.cards){
  const c=registry.get(row.id);
  assert.equal(c.supported,true);
  assert.equal(c.limit,4);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
 for(const row of manifest.printAliases)assert.equal(registry.get(row.id).id,row.canonicalId);
});

for(const choice of [WHITE,WHITE_GS,null])test('Hope draws two before offering one named White Dragon: '+choice,()=>{
 let s=setup();
 give(s,0,'hand',[WHITE_GS,NATURE]);
 give(s,0,'deck',[WHITE,NATURE,NATURE,NATURE]);
 const original=s.players[0].deck[0];
 const gs=s.players[0].hand[0];
 play(s,HOPE);
 assert.equal(s.players[0].hand.length,4);
 assert.deepEqual(s.decision.choices.filter(c=>c.value!==null).map(c=>c.value.uid).sort(),[original.uid,gs.uid].sort());
 s=decodeBattleData(encodeBattleData(s));
 pick(s,choice===WHITE?original.uid:choice===WHITE_GS?gs.uid:null);
 drain(s);
 assert.deepEqual(s.players[0].battle.map(x=>x.cardId),choice?[choice]:[]);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
});

test('Hope enters mana tapped',()=>{
 const s=setup();
 s.phase='charge';
 give(s,0,'hand',[HOPE]);
 const uid=s.players[0].hand[0].uid;
 act(s,'charge',a=>a.uid===uid);
 assert.equal(s.players[0].mana.find(x=>x.uid===uid).tapped,true);
});

for(const flip of [true,false])test('Serenade discounts one Zenith or Zenith Celes summon and can decline the mana flip: '+flip,()=>{
 let s=setup();
 give(s,0,'hand',[ZENITH,CELES,NATURE]);
 const [zenith,celes,other]=s.players[0].hand;
 const old=[cost(s,zenith.uid),cost(s,celes.uid),cost(s,other.uid),cost(s,zenith.uid,1)];
 play(s,SERENADE);
 const mana=s.players[0].mana.find(x=>x.tapped);
 s=decodeBattleData(encodeBattleData(s));
 pick(s,flip?mana.uid:null);
 const resolved=s.players[0].mana.find(x=>x.uid===mana.uid);
 assert.equal(!!resolved.faceDown,flip);
 assert.equal(resolved.tapped,true);
 assert.deepEqual([cost(s,zenith.uid),cost(s,celes.uid),cost(s,other.uid),cost(s,zenith.uid,1)],
  [old[0]-4,old[1]-4,old[2],old[3]]);
 act(s,'play',a=>a.uid===other.uid);
 drain(s);
 assert.equal(cost(s,celes.uid),old[1]-4);
 act(s,'play',a=>a.uid===zenith.uid&&(a.face??0)===0);
 drain(s);
 assert.equal(cost(s,celes.uid),old[1]);
});

test('Unused Serenade discount ends with the turn',()=>{
 const s=setup();
 give(s,0,'hand',[CELES]);
 const celes=s.players[0].hand[0];
 play(s,SERENADE);
 pick(s,null);
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 act(s,'skipCharge');
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 act(s,'skipCharge');
 assert.equal(cost(s,celes.uid),10);
});

test('Sunrise snapshots own face-up dark mana and the creatures on both sides',()=>{
 let s=setup();
 give(s,0,'mana',[DARK,DARK_MULTI,DARK,NATURE,NATURE,NATURE,NATURE]);
 s.players[0].mana[2].faceDown=true;
 give(s,1,'mana',[DARK,DARK,DARK]);
 give(s,0,'battle',[WHITE,NATURE]);
 give(s,1,'battle',[WHITE_GS,NATURE]);
 const own=s.players[0].battle[0],enemy=s.players[1].battle[0];
 play(s,SUNRISE);
 drain(s);
 s=decodeBattleData(encodeBattleData(s));
 const ownLive=s.players[0].battle[0],enemyLive=s.players[1].battle[0];
 assert.equal(ownLive.uid,own.uid);
 assert.equal(enemyLive.uid,enemy.uid);
 assert.equal(e.power(ownLive,false,s),5000);
 assert.equal(e.power(enemyLive,false,s),5000);
 assert.equal(s.players[0].grave.filter(x=>x.cardId===NATURE).length,1);
 assert.equal(s.players[1].grave.filter(x=>x.cardId===NATURE).length,1);
 s.players[0].mana[0].faceDown=true;
 s.players[0].mana.push(inst(DARK),inst(DARK));
 assert.equal(e.power(ownLive,false,s),5000);
 const late=inst(WHITE);
 s.players[0].battle.push(late);
 assert.equal(e.power(late,false,s),7000);
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(ownLive,false,s),7000);
 assert.equal(e.power(enemyLive,false,s),7000);
});
