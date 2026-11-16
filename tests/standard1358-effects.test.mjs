import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const RIGEL='dmr01-053',HYDRA='dmr01-059',GARROWS='dmr01-v01',CHEVAL='dm38-033';
const ROMANOV='dm38-011',DEMON='dm01-027',SPIRAL='dm01-086';
const REV='dmr17-046',BRAJESCO='dm23rp3-061',BASIC='dm01-108';
const PARADISE='dm16-042',CYBER='dmx11-080';
const ids=[RIGEL,HYDRA,GARROWS,CHEVAL];

function table(){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards:
  ids.flatMap(id=>[{id,count:id===CHEVAL?1:2}])}));
 const s=e.createGame(decks,{seed:1358});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',['dm01-075','dm01-083','dm01-090','dm01-097',BASIC].flatMap(id=>Array(4).fill(id)));
  give(s,p,'shields',Array(5).fill(BASIC));
 }
 return s;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function add(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function place(s,p,id){
 const own=s.players[p],i=own.extra.findIndex(x=>x.cardId===id);
 assert.ok(i>=0);
 const [x]=own.extra.splice(i,1);
 own.battle.push(x);
 return x;
}
function pick(s,uid){
 act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===uid);
}
function playTarget(s,id,target){
 cast(s,id);
 if(s.decision.type==='extended')pick(s,target.uid);
 else act(s,'effect',a=>a.targets.some(x=>x.uid===target.uid));
}
function startOwnTurn(s,p){
 s.active=1-p;
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.active,p);
}
function linked(s,p){
 const [rigel,hydra,garrows]=[RIGEL,HYDRA,GARROWS].map(id=>place(s,p,id));
 startOwnTurn(s,p);
 assert.equal(e.card(rigel).name,'死海竜ガロウズ・デビルドラゴン');
 assert.deepEqual(new Set(rigel.psychicLinks.map(x=>x.uid)),new Set([hydra.uid,garrows.uid]));
 return {rigel,hydra,garrows};
}

test('the three physical IDs and the Rigel reprint preserve official text and both images',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1358.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),ids.slice(0,3));
 for(const row of [...m.cards,...m.printAliases]){
  const {id,name,canonicalId=id,faces,spec}=row;
  assert.equal(catalogue.get(id).id,canonicalId);
  assert.equal(data.cards.filter(c=>nameKey(c.name)===nameKey(name)).length,1);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1358}),spec);
  assert.equal(e.card(canonicalId).limit,4);
  assert.equal(e.card(canonicalId).manaValue,0);
  assert.equal(faces[1].name,'死海竜ガロウズ・デビルドラゴン');
  assert.match(row.verification.backImageSha256,/^[a-f0-9]{64}$/);
  if(id===canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.equal(e.card(id).g1355LinkedFace.image,row.backImage);
  }
 }
});

test('Romanov remains the source when the opponent chooses and destroys their own Alien (QA36348)',()=>{
 const s=table(),rigel=place(s,1,RIGEL),hydra=place(s,1,HYDRA);
 const retaliation=add(s,0,'battle',BASIC),cheval=s.players[0].extra.find(x=>x.cardId===CHEVAL);
 cast(s,ROMANOV);
 assert.equal(s.decision.player,1);
 pick(s,hydra.uid);
 assert.ok(has(s,1,'extra',hydra));
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.source,ROMANOV);
 pick(s,cheval.uid);
 assert.ok(has(s,0,'battle',cheval));
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.source,RIGEL);
 pick(s,retaliation.uid);
 assert.ok(has(s,0,'grave',retaliation));
 assert.ok(has(s,1,'battle',rigel));
});

test('Rigel fires for its own destruction but not a spell that returns it to the extra zone',()=>{
 for(const [spell,destroys] of [[DEMON,true],[SPIRAL,false]]){
  const s=table(),rigel=place(s,1,RIGEL),retaliation=add(s,0,'battle',BASIC);
  playTarget(s,spell,rigel);
  assert.ok(has(s,1,'extra',rigel));
  if(destroys){assert.equal(s.decision.source,RIGEL);pick(s,retaliation.uid);}
  assert.equal(has(s,0,'grave',retaliation),destroys);
 }
});

test('only the effect that crosses zero triggers Rigel, once (QA45086)',()=>{
 for(const spellLast of [true,false]){
  const s=table(),hydra=place(s,1,HYDRA);
  place(s,1,RIGEL);
  const retaliation=add(s,0,'battle',BASIC);
  const spell=()=>playTarget(s,REV,hydra);
  const creature=()=>playTarget(s,BRAJESCO,hydra);
  (spellLast?creature:spell)();
  assert.ok(has(s,1,'battle',hydra));
  (spellLast?spell:creature)();
  if(spellLast){assert.equal(s.decision.source,RIGEL);pick(s,retaliation.uid);}
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'extra',hydra));
  assert.equal(has(s,0,'grave',retaliation),spellLast);
 }
});

test('Hydra watches G-Zero and S-Trigger but neither paid spells nor ordinary Psychic entry',()=>{
 const s=table(),hydra=place(s,1,HYDRA),own=s.players[0];
 add(s,0,'battle',CYBER);
 const paradise=add(s,0,'hand',PARADISE);
 act(s,'play',a=>a.uid===paradise.uid&&a.freeSummon);
 assert.equal(s.decision.source,HYDRA);
 assert.equal(s.decision.player,0);
 const first=own.mana[0];
 pick(s,first.uid);
 assert.ok(has(s,0,'grave',first));
 cast(s,ROMANOV);
 pick(s,hydra.uid);
 const other=own.extra.find(x=>x.cardId===RIGEL);
 pick(s,other.uid);
 assert.equal(s.decision,null);
 place(s,1,HYDRA);
 const shield=add(s,0,'shields',SPIRAL);
 for(const old of own.shields.slice(0,-1))own.shields.splice(own.shields.indexOf(old),1);
 s.active=1;
 const attacker=add(s,1,'battle',BASIC);
 attack(s,attacker.uid,'player');
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===SPIRAL);
 act(s,'effect',a=>a.targets.some(x=>x.uid===attacker.uid));
 assert.equal(s.decision.source,HYDRA);
 assert.equal(s.decision.player,0);
 const second=own.mana[0];
 pick(s,second.uid);
 assert.ok(has(s,0,'grave',second));
 assert.ok(has(s,0,'grave',shield));
});

test('Garrows can decline or take one card when an opposing creature attacks',()=>{
 for(const accept of [false,true]){
  const s=table(),garrows=place(s,1,GARROWS),attacker=add(s,0,'battle',BASIC);
  const count=s.players[1].hand.length;
  attack(s,attacker.uid,'player');
  assert.equal(s.decision.source,GARROWS);
  assert.equal(s.decision.player,1);
  pick(s,Number(accept));
  assert.equal(s.players[1].hand.length,count+Number(accept));
  assert.equal(e.card(garrows).breaker,2);
 }
});

test('at the start of the turn Rigel chooses a complete set if more than one copy is present',()=>{
 const s=table(),rigel=place(s,0,RIGEL),hydra=place(s,0,HYDRA);
 const first=place(s,0,GARROWS),second=place(s,0,GARROWS);
 assert.equal(e.card(rigel).name,'竜骨なる者ザビ・リゲル');
 startOwnTurn(s,0);
 const picks=s.decision.choices.map(x=>x.value);
 assert.deepEqual(picks,[[first.uid,hydra.uid],[second.uid,hydra.uid]]);
 act(s,'extended',a=>picks[a.choice][0]===second.uid);
 assert.ok(has(s,0,'battle',first));
 assert.deepEqual(rigel.psychicLinks.map(x=>x.uid),[second.uid,hydra.uid]);
 assert.equal(e.power(rigel,false,s),12000);
 assert.equal(e.card(rigel).breaker,3);
});

test('linked Garrows disables unpaid execution while allowing paid casts and then unlinks',()=>{
 const s=table(),{rigel,hydra,garrows}=linked(s,1);
 s.active=0;
 s.phase='main';
 add(s,0,'battle',CYBER);
 const paradise=add(s,0,'hand',PARADISE);
 assert.ok(e.getLegalActions(s).some(a=>a.uid===paradise.uid&&a.kind==='play'&&!a.freeSummon));
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===paradise.uid&&a.freeSummon));
 playTarget(s,SPIRAL,rigel);
 assert.equal(s.decision.type,'psychicUnlink');
 act(s,'psychicUnlink',a=>a.partUid===garrows.uid||a.part===garrows.uid||a.uid===garrows.uid||a.cardId===GARROWS);
 assert.ok(has(s,1,'extra',garrows));
 assert.ok(has(s,1,'battle',hydra));
 assert.ok(has(s,1,'battle',rigel));
 assert.ok(e.getLegalActions(s).some(a=>a.uid===paradise.uid&&a.freeSummon));
});

test('linked Garrows may return one creature from each side to their owners and block a shield spell',()=>{
 const s=table(),{rigel}=linked(s,0);
 const ally=add(s,0,'battle',BASIC),enemy=add(s,1,'battle',BASIC);
 give(s,1,'shields',[DEMON,BASIC,BASIC]);
 attack(s,rigel.uid,'player');
 assert.equal(s.decision.source,RIGEL);
 pick(s,ally.uid);
 pick(s,enemy.uid);
 assert.ok(has(s,0,'hand',ally)&&has(s,1,'hand',enemy));
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===DEMON);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='orderTrigger'));
 drain(s);
 assert.ok(s.players[1].hand.some(x=>x.cardId===DEMON));
 assert.equal(s.metrics[1].played[DEMON],undefined);
 assert.ok(has(s,0,'battle',rigel));
});

test('Garrows prevents the Forever Occult alternative before sacrificing any creatures',()=>{
 const s=table();
 linked(s,1);
 s.active=0;
 s.phase='main';
 const occult=add(s,0,'hand','dmr14-012');
 const allies=Array.from({length:3},()=>add(s,0,'battle',BASIC));
 const plays=e.getLegalActions(s).filter(x=>x.uid===occult.uid&&x.kind==='play');
 assert.ok(plays.some(x=>!x.alternative));
 assert.ok(!plays.some(x=>x.role==='destroySummon1148'));
 act(s,'play',x=>x.uid===occult.uid&&!x.alternative);
 assert.ok(has(s,0,'battle',occult));
 for(const x of allies)assert.ok(has(s,0,'battle',x));
});

test('the linked lock permits non-summon entry and an ordinary paid spell',()=>{
 const s=table(),{rigel}=linked(s,1),target=s.players[0].extra.find(x=>x.cardId===RIGEL);
 s.active=0;
 s.phase='main';
 add(s,1,'battle',BASIC);
 cast(s,ROMANOV);
 const unit=s.players[1].battle.find(x=>x.uid!==rigel.uid);
 pick(s,unit.uid);
 pick(s,target.uid);
 assert.ok(has(s,0,'battle',target));
 assert.equal(s.metrics[0].played[ROMANOV],1);
});

test('a paid creature may trigger Mecha Mekraid but the linked lock preserves the revealed cards',()=>{
 const s=table();
 linked(s,1);
 s.active=0;
 s.phase='main';
 add(s,0,'battle','dm23rp2-012');
 give(s,0,'deck',[BASIC,'dm24rp3-015','dm23rp4-005',BASIC,BASIC]);
 cast(s,'dm24rp4-056');
 const initial=s.players[0].deck.map(x=>x.uid).sort();
 assert.equal(s.decision.task.op,'g19Mekraid');
 pick(s,true);
 assert.equal(s.decision.task.op,'g19MekraidLook');
 assert.deepEqual(s.decision.choices.map(x=>x.value),[null]);
 pick(s,null);
 drain(s);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid).sort(),initial);
 assert.equal(s.players[0].g19Holding.length,0);
});
