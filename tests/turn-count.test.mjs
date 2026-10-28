import test from 'node:test';
import assert from 'node:assert/strict';
import {e,PRESETS,inst} from './target-fixture.mjs';
import {displayTurn} from '../dist/turn-count.js';
import {newManualUI,manualScreenHTML,manualLogHTML} from '../dist/manual-ui.js';
import {onlineScreenHTML} from '../dist/online-ui.js';
const game=first=>e.createGame([PRESETS[0],PRESETS[1]],{first,seed:42});
function end(s){s.phase='attack';const a=e.getLegalActions(s).find(a=>a.kind==='endTurn');assert.ok(a);e.step(s,a);assert.equal(s.winner,null);}
const h={art:()=>'',icon:()=>'',practice:true};

test('each opening order displays 1,1,2,2 while engine serial and personal turns advance independently',()=>{
 for(const first of [0,1]){
  const s=game(first);
  for(let serial=1;serial<=4;serial++){
   assert.equal(s.turn,serial);assert.equal(displayTurn(s),Math.ceil(serial/2));
   assert.match(manualScreenHTML(s,newManualUI(),h),new RegExp('TURN '+Math.ceil(serial/2)+'<'));
   assert.equal(e.runSummary(s).round,displayTurn(s));assert.equal(e.runSummary(s).turns,serial);
   if(serial<4)end(s);
  }
  assert.deepEqual(s.players.map(p=>p.turns),[2,2]);
  assert.deepEqual(s.log.filter(x=>['start','turn'].includes(x.type)).map(x=>x.round),[1,1,2,2]);
  assert.match(manualLogHTML(s),/T2 ·/);assert.doesNotMatch(manualLogHTML(s),/T[34] ·/);
 }
});

test('additional turns wait for both players; saved round survives JSON and old saves resume correctly',()=>{
 let s=game(0);s.extraTurns=[{player:0},{player:0}];
 end(s);assert.equal(s.active,0);assert.equal(displayTurn(s),1);
 s=JSON.parse(JSON.stringify(s));end(s);assert.equal(displayTurn(s),1);
 end(s);assert.equal(s.active,1);assert.equal(displayTurn(s),1);
 end(s);assert.equal(s.active,0);assert.equal(displayTurn(s),2);
 for(const first of [0,1]){const old=game(first);end(old);delete old.round;delete old.roundEnded;assert.equal(displayTurn(old),1);end(old);assert.equal(displayTurn(old),2);}
 assert.equal(displayTurn({turn:8}),4);assert.equal(displayTurn({turns:9}),5);
});

test('a skipped opponent turn completes the round without changing draw or turn-skip rules',()=>{
 const s=game(0),deck=s.players[1].deck.length;s.g43Skip=[0,1];end(s);
 assert.equal(s.active,0);assert.equal(s.turn,2);assert.equal(displayTurn(s),2);
 assert.equal(s.players[1].deck.length,deck);assert.equal(s.players[1].turns,0);
});

test('summoning sickness expires on the next player turn even within displayed turn 1',()=>{
 const s=game(0),c={...inst('dm01-108'),entered:s.turn};s.players[0].battle=[c];s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===c.uid));s.extraTurns=[{player:0}];end(s);
 assert.equal(s.turn,2);assert.equal(displayTurn(s),1);assert.equal(s.active,0);s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===c.uid));
});

test('online headings use explicit rounds and fall back for older servers',()=>{
 const player={name:'test',hand:[],battle:[],mana:[],grave:[],faceUpShields:[],handCount:0,shieldCount:5,deckCount:30};
 const state={connected:true,room:{seat:0,phase:'playing',game:{turn:6,phase:'charge',actor:0,players:[player,player],actions:[]}}};
 assert.match(onlineScreenHTML(state,{user:{}}),/TURN 3</);
 state.room.game.round=2;assert.match(onlineScreenHTML(state,{user:{}}),/TURN 2</);
});
