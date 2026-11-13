import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const GAGA='dmx05-004', GALLOWS='dmr01-050', RYUSEI='dmbd13-015', MIKADO='dmc63-004';
const SHACHIHOKO='dmx05-016', LIGHT='dm01-076', WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', NATURE='dm01-108';
const ALIEN='dmx11-080', APRIL='dm36-053', CHEVAL='dm38-033', MARTINI='dm37-024', BOLSHACK='dm36-s07';
const SMALL='dm01-092', MIXEL='dmrp05-011';
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const find=(rows,id)=>rows.find(x=>x.cardId===id);

function table(){
 const extraCards=[GAGA,APRIL,CHEVAL,MARTINI,BOLSHACK].map(id=>({id,count:1}));
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards}));
 const s=e.createGame(decks,{seed:1105});
 s.turn=3;
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',[LIGHT,WATER,DARK,FIRE,NATURE].flatMap(id=>Array(3).fill(id)));
  give(s,p,'shields',Array(5).fill(NATURE));
 }
 return s;
}

test('Gaga stays put when declined and optionally loop awakens in both directions (QA 36163)',()=>{
 const s=table(),own=s.players[0],gaga=own.extra.shift();
 own.battle.push(gaga);
 for(const [accept,back] of [[false,false],[true,true],[false,true],[true,false]]){
  end(s);
  assert.equal(s.decision,null);
  end(s);
  assert.equal(s.decision.player,0);
  assert.deepEqual(values(s),[true,null]);
  const oldTurn=gaga.g1085AwakenedTurn;
  pick(s,accept?true:null);
  const face=e.card(gaga);
  assert.equal(face.cost,7);
  assert.equal(face.civ,back?'水':'光');
  assert.equal(face.power,back?5000:12500);
  assert.equal(!!face.blocker,!back);
  assert.equal(!!face.noPlayerAttack,!back);
  assert.equal(!!face.cannotBeAttacked,back);
  assert.equal(!!face.unblockable,back);
  assert.equal(gaga.g1085AwakenedTurn,accept?s.turn:oldTurn);
 }
 assert.deepEqual(own.battle,[gaga]);
 assert.equal(s.log.filter(x=>x.type==='awaken'&&x.uid===gaga.uid).length,2);
});

test('Gaga can block and attack creatures; Lancer can attack a player without being blocked',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],gaga=own.extra.shift();
 const enemy=inst(NATURE),blocker=inst(LIGHT);
 own.battle.push(gaga);
 opp.battle.push(enemy,blocker);
 end(s);
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===gaga.uid);
 drain(s);
 assert.ok(opp.grave.includes(enemy));
 assert.ok(own.battle.includes(gaga));
 end(s);
 pick(s,null);
 const target=inst(NATURE);
 target.tapped=true;
 opp.battle.push(target);
 s.phase='attack';
 const gagaTargets=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===gaga.uid).map(a=>a.target);
 assert.deepEqual(gagaTargets,[target.uid]);
 end(s);
 end(s);
 pick(s,true);
 attack(s,gaga.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 act(s,'noBlock');
 assert.equal(opp.shields.length,4);
});

test('Shachihoko deploys either face of a real Alien after granting protection (QA 36423)',()=>{
 for(const back of [false,true]){
  const s=table(),own=s.players[0],opp=s.players[1],gaga=find(own.extra,GAGA),alien=inst(ALIEN);
  const enemy=inst(NATURE);
  own.battle.push(alien);
  opp.battle.push(enemy);
  cast(s,SHACHIHOKO);
  assert.deepEqual(s.decision.choices.map(c=>c.label),['時空のガガ・シリウス','時空のセブ・ランサー']);
  act(s,'extended',a=>!!s.decision.choices[a.choice].value.g1104Back===back);
  assert.equal(!!gaga.g1085Awakened,back);
  end(s);
  alien.tapped=gaga.tapped=true;
  if(back)gaga.g35Ignored=s.turn;
  s.phase='attack';
  const targets=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===enemy.uid).map(a=>a.target);
  assert.ok(targets.includes(gaga.uid));
  assert.ok(!targets.includes(alien.uid));
 }
});

test('Gallows bounces either player’s non-Psychic and deploys a matching face',()=>{
 for(const returnAlly of [true,false]){
  const s=table(),own=s.players[0],opp=s.players[1],ally=inst(NATURE),enemy=inst(FIRE),psychic=opp.extra.pop();
  const gaga=find(own.extra,GAGA);
  own.battle.push(ally);
  opp.battle.push(enemy,psychic);
  cast(s,GALLOWS);
  assert.deepEqual(values(s),[ally.uid,enemy.uid]);
  pick(s,returnAlly?ally.uid:enemy.uid);
  assert.ok((returnAlly?own:opp).hand.includes(returnAlly?ally:enemy));
  assert.ok(opp.battle.includes(psychic));
  const option=s.decision.choices.find(c=>c.value.uid===gaga.uid);
  assert.equal(option.label,'時空のセブ・ランサー');
  assert.equal(option.value.g1104Back,true);
  pick(s,gaga.uid);
  assert.equal(e.card(gaga).civ,'水');
  assert.equal(gaga.g1085AwakenedTurn,undefined);
  s.active=1;
  cast(s,'dm01-027');
  act(s,'effect',a=>a.targets?.some(target=>target.uid===gaga.uid));
  assert.ok(own.extra.includes(gaga));
  assert.equal(e.card(gaga).name,'時空のガガ・シリウス');
 }
});

test('Gallows returns a controlled creature to its original owner’s hand',()=>{
 const s=table(),ally=inst(NATURE);
 ally.cardOwner=1;
 s.players[0].battle.push(ally);
 cast(s,GALLOWS);
 pick(s,ally.uid);
 assert.ok(s.players[1].hand.includes(ally));
 assert.ok(!s.players[0].hand.includes(ally));
});

test('Gallows can deploy with no return target (QA 37743)',()=>{
 const s=table(),own=s.players[0],april=find(own.extra,APRIL);
 cast(s,GALLOWS);
 pick(s,april.uid);
 assert.deepEqual(own.battle,[april]);
});

test('Ryusei deploys before each of draw, destruction, and ramp',()=>{
 for(const mode of [0,1,2]){
  const s=table(),own=s.players[0],opp=s.players[1],gaga=find(own.extra,GAGA);
  const top=own.deck[0],enemy=inst(SMALL),large=inst(BOLSHACK);
  opp.battle.push(enemy,large);
  const initialMana=own.mana.length;
  cast(s,RYUSEI);
  assert.ok(!values(s).includes(find(own.extra,APRIL).uid));
  pick(s,gaga.uid);
  assert.deepEqual(own.battle,[gaga]);
  assert.equal(e.card(gaga).name,'時空のセブ・ランサー');
  pick(s,mode);
  if(mode===1){
   assert.deepEqual(values(s),[enemy.uid]);
   pick(s,enemy.uid);
  }
  assert.equal(own.hand.includes(top),mode===0);
  assert.equal(opp.grave.includes(enemy),mode===1);
  assert.equal(own.mana.length,initialMana+(mode===2?1:0));
  assert.equal(own.mana.includes(top),mode===2);
 }
});

test('Ryusei checks Mixel on entry before its seventh mana arrives (QA 38717)',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],bolshack=find(own.extra,BOLSHACK);
 give(s,0,'mana',[WATER,FIRE,NATURE,LIGHT,DARK,NATURE]);
 opp.battle.push(inst(MIXEL));
 cast(s,RYUSEI);
 pick(s,bolshack.uid);
 pick(s,2);
 drain(s);
 assert.equal(own.mana.length,7);
 assert.ok(own.extra.includes(bolshack));
 assert.ok(!own.battle.includes(bolshack));
});

test('Mikado applies its temporary power reduction before deploying only an eligible dark face',()=>{
 for(const dies of [true,false]){
  const s=table(),own=s.players[0],opp=s.players[1],april=find(own.extra,APRIL),enemy=inst(dies?DARK:BOLSHACK);
  opp.battle.push(enemy);
  const before=e.power(enemy,false,s);
  cast(s,MIKADO);
  pick(s,enemy.uid);
  if(dies)assert.ok(opp.grave.includes(enemy));
  else assert.equal(e.power(enemy,false,s),before-2000);
  assert.deepEqual(values(s),[april.uid,find(own.extra,CHEVAL).uid]);
  pick(s,april.uid);
  assert.deepEqual(own.battle,[april]);
  if(!dies){
   end(s);
   assert.equal(e.power(enemy,false,s),before);
  }
 }
});

test('the official reprints use existing canonical identities and current copy limits',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const [id,aliases] of [[GAGA,[]],[GALLOWS,['dmx25-017','dmbd13-019','dmex17-079','dm22ex1-078']],
  [RYUSEI,['dm22ex1-130','dm25ex4-T30']],[MIKADO,['dmc68-013','dmd04-013','dmd19-009']]]){
  assert.equal(registry.get(id).id,id);
  assert.equal(registry.get(id).limit,4);
  for(const alias of aliases)assert.equal(registry.get(alias),registry.get(id));
 }
});
