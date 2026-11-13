import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,attack,cast,data,details,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const MOTHER='dmr01-045', ROMANOV='dm38-011', BASARA='dmbd21-016';
const LIGHT='dm01-076', WATER='dm01-083', DARK='dm01-087', FIRE='dm01-097', NATURE='dm01-108';
const MARTINI='dm37-024', CHEVAL='dm38-033', APRIL='dm36-053', OFLAME='dm36-059', JOHN='dm37-033';
const ONIKAMASU='dmrp01-041', DARK_COMMAND='dm01-s06';
const find=(rows,id)=>rows.find(x=>x.cardId===id);
const values=s=>s.decision?.choices?.map(c=>c.value)??[];
const pick=(s,x,back=false)=>act(s,'extended',a=>{
 const value=values(s)[a.choice];
 return value?.uid===x.uid&&!!value.g1104Back===back;
});
const choices=s=>values(s).map(value=>[value.uid,!!value.g1104Back]);

function table(){
 const extraCards=[MARTINI,CHEVAL,APRIL,OFLAME,JOHN].map(id=>({id,count:1}));
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards}));
 const s=e.createGame(decks,{seed:1107});
 s.turn=3;
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',[LIGHT,WATER,DARK,FIRE,NATURE].flatMap(id=>Array(3).fill(id)));
  give(s,p,'shields',Array(5).fill(NATURE));
 }
 return s;
}

test('Mother deploys only a non-evolution light blocker from hand, then chooses an eligible Psychic face',()=>{
 const s=table(),own=s.players[0],martini=find(own.extra,MARTINI),cheval=find(own.extra,CHEVAL),john=find(own.extra,JOHN);
 give(s,0,'hand',[LIGHT,'dm01-001','dm02-s01','dm01-075',WATER]);
 const [blocker,otherBlocker]=own.hand;
 cast(s,MOTHER);
 assert.deepEqual(choices(s),[[blocker.uid,false],[otherBlocker.uid,false]]);
 pick(s,blocker);
 assert.deepEqual(own.battle,[blocker]);
 assert.deepEqual(choices(s),[[martini.uid,false],[martini.uid,true],[cheval.uid,false],[john.uid,false]]);
 pick(s,martini,true);
 assert.deepEqual(own.battle,[blocker,martini]);
 assert.equal(e.card(martini).civ,'光');
 assert.ok(martini.g1085Awakened);
});

test('Mother can resolve either instruction on its own',()=>{
 for(const hasBlocker of [false,true]){
  const s=table(),own=s.players[0],john=find(own.extra,JOHN),blocker=inst(LIGHT);
  if(hasBlocker){own.extra=[];own.hand.push(blocker);}
  cast(s,MOTHER);
  pick(s,hasBlocker?blocker:john);
  assert.deepEqual(own.battle,[hasBlocker?blocker:john]);
  assert.equal(s.decision,null);
 }
});

test('Romanov lets the opponent choose their own creature, then the caster can deploy a cost-10 dark back face',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],april=find(own.extra,APRIL);
 const [protectedCreature,other,sealed]=[ONIKAMASU,DARK_COMMAND,DARK].map(inst);
 sealed.sealed=true;
 opp.seals.push({...inst(NATURE),sealOf:sealed.uid,faceDown:true});
 opp.battle.push(protectedCreature,other,sealed);
 own.battle.push(inst(NATURE));
 cast(s,ROMANOV);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[[protectedCreature.uid,false],[other.uid,false]]);
 pick(s,protectedCreature);
 assert.ok(opp.grave.includes(protectedCreature));
 assert.ok(opp.battle.includes(other));
 assert.equal(s.decision.player,0);
 assert.ok(choices(s).some(([uid,back])=>uid===april.uid&&back));
 assert.ok(!choices(s).some(([uid])=>uid===find(own.extra,OFLAME).uid));
 pick(s,april,true);
 assert.ok(own.battle.includes(april));
 assert.equal(e.card(april).cost,10);
});

test('Romanov still deploys a dark Psychic when the opponent has no creature',()=>{
 const s=table(),cheval=find(s.players[0].extra,CHEVAL);
 cast(s,ROMANOV);
 assert.equal(s.decision.player,0);
 pick(s,cheval);
 assert.ok(s.players[0].battle.includes(cheval));
});

test('Basara chooses an opposing creature, takes its seal from the opponent deck, and limits the Psychic face',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],oflame=find(own.extra,OFLAME),john=find(own.extra,JOHN);
 const enemy=inst(NATURE),opponentTop=opp.deck[0],ownTop=own.deck[0];
 opp.battle.push(enemy,inst(ONIKAMASU));
 own.battle.push(inst(NATURE));
 cast(s,BASARA);
 assert.deepEqual(choices(s),[[enemy.uid,false]]);
 pick(s,enemy);
 assert.ok(enemy.sealed);
 assert.equal(opp.seals.find(x=>x.sealOf===enemy.uid)?.uid,opponentTop.uid);
 assert.equal(own.deck[0].uid,ownTop.uid);
 assert.deepEqual(choices(s),[[find(own.extra,CHEVAL).uid,false],[find(own.extra,APRIL).uid,false],[oflame.uid,false],[john.uid,true]]);
 pick(s,john,true);
 assert.ok(own.battle.includes(john));
 assert.equal(e.card(john).civ,'火');
});

test('Basara still deploys a Psychic if no opposing creature can be chosen',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],oflame=find(own.extra,OFLAME);
 opp.battle.push(inst(ONIKAMASU));
 cast(s,BASARA);
 assert.ok(choices(s).some(([uid,back])=>uid===oflame.uid&&!back));
 pick(s,oflame);
 assert.ok(own.battle.includes(oflame));
 assert.equal(opp.seals.length,0);
});

test('A matching Command entering later removes the seal that Basara placed',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],cheval=find(own.extra,CHEVAL);
 const enemy=inst(DARK),seal=opp.deck[0];
 opp.battle.push(enemy);
 cast(s,BASARA);
 pick(s,enemy);
 pick(s,cheval);
 assert.ok(enemy.sealed);
 s.phase='attack';
 act(s,'endTurn');
 s.phase='main';
 cast(s,DARK_COMMAND);
 act(s,'extended',a=>values(s)[a.choice]===seal.uid);
 assert.equal(enemy.sealed,undefined);
 assert.equal(opp.seals.length,0);
 assert.ok(opp.grave.includes(seal));
});

test('Basara may trigger from a broken shield only with an unsealed friendly dark or fire Command',()=>{
 for(const mode of ['dark','fire','ignored','sealed','wrong race','enemy Command']){
  const s=table(),attacker=inst(NATURE),own=s.players[0],opp=s.players[1];
  own.battle.push(attacker);
  const command=inst(mode==='fire'?OFLAME:mode==='wrong race'?DARK:DARK_COMMAND);
  if(mode==='ignored')command.g35Ignored=s.turn;
  if(mode==='sealed'){
   command.sealed=true;
   opp.seals.push({...inst(NATURE),sealOf:command.uid,faceDown:true});
  }
  (mode==='enemy Command'?own:opp).battle.push(command);
  give(s,1,'shields',[BASARA]);
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  const eligible=['dark','fire','ignored'].includes(mode);
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='useTrigger'),eligible,mode);
  if(eligible){
   const mana=opp.mana.map(x=>x.tapped);
   act(s,'useTrigger');
   pick(s,attacker);
   pick(s,find(opp.extra,APRIL));
   assert.ok(attacker.sealed);
   assert.deepEqual(opp.mana.map(x=>x.tapped),mana);
  }else assert.ok(find(opp.hand,BASARA));
 }
});

test('Basara enters the mana zone tapped and the reprints resolve to their original IDs',()=>{
 const s=table(),catalogue=createCatalogue(snapshot,data.cards,details);
 give(s,0,'hand',[BASARA]);
 s.phase='charge';
 act(s,'charge',a=>a.cardId===BASARA);
 assert.equal(s.players[0].mana.at(-1).tapped,true);
 for(const [id,alias] of [[MOTHER,'dmr01-045M'],[MOTHER,'dmex15-b082'],[ROMANOV,'dmd19-017'],[BASARA,'dm25ex4-T18']]){
  assert.equal(catalogue.get(id).limit,4);
  assert.equal(catalogue.get(alias),catalogue.get(id));
 }
});
