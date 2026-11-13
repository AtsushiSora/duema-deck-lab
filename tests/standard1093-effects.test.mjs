import test from 'node:test';
import assert from 'node:assert/strict';
import {act,attack,cast,drain,e,give,inst,PRESETS} from './target-fixture.mjs';

const IRONY='dmr05-018', PEPPER='dmr08-011', CANCER='dmr03-035';
const PSYCHIC='dm36-s07', SMALL='dm01-097', BIG='dm01-048';
function setup(){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards:[{id:PSYCHIC,count:4}]}));
 const s=e.createGame(decks,{seed:1093});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',[...Array(8).fill('dm01-083'),...Array(4).fill('dm01-090')]);
  give(s,p,'shields',Array(5).fill(SMALL));
 }
 return s;
}
function put(s,p,id,props={}){
 const x=id===PSYCHIC?s.players[p].extra.shift():inst(id);
 Object.assign(x,props);
 s.players[p].battle.push(x);
 return x;
}
function values(s){return s.decision?.choices.map(c=>c.value?.uid??c.value);}
function choose(s,value){act(s,'extended',a=>values(s)[a.choice]===value);}
function contains(s,p,zone,x){return s.players[p][zone].some(y=>y.uid===x.uid);}
function end(s){s.phase='attack';act(s,'endTurn');}

test('Irony Spiral resolves its entry and attack modes separately on the same turn (QA36595)',()=>{
 const s=setup();
 put(s,0,'dmx09-006');
 const small=put(s,0,SMALL,{cardOwner:1}),large=put(s,1,BIG);
 const own=put(s,0,PSYCHIC),enemy=put(s,1,PSYCHIC,{cardOwner:0});
 cast(s,IRONY);
 assert.deepEqual(values(s),[0,1]);
 choose(s,0);
 assert.deepEqual(values(s),[small.uid]);
 choose(s,small.uid);
 assert.ok(contains(s,1,'hand',small));
 assert.ok(contains(s,1,'battle',large));
 const irony=s.players[0].battle.find(x=>x.cardId===IRONY);
 assert.equal(irony.entered,s.turn);
 attack(s,irony.uid);
 assert.deepEqual(values(s),[0,1]);
 choose(s,1);
 assert.deepEqual(values(s),[enemy.uid]);
 choose(s,enemy.uid);
 drain(s);
 assert.ok(contains(s,0,'battle',own));
 assert.ok(contains(s,0,'extra',enemy));
 assert.equal(s.players[1].shields.length,3);
});

for(const accept of [false,true])test('Pepper resolves both optional clauses in order, first return '+accept,()=>{
 const s=setup();
 put(s,0,PEPPER);
 const small=put(s,1,SMALL,{cardOwner:0}),big=put(s,1,IRONY);
 const psychic=put(s,1,PSYCHIC,{cardOwner:0});
 end(s);
 assert.deepEqual(new Set(values(s)),new Set([small.uid,big.uid,null]));
 choose(s,accept?small.uid:null);
 assert.deepEqual(values(s),[psychic.uid,null]);
 choose(s,psychic.uid);
 drain(s);
 assert.ok(contains(s,accept?0:1,accept?'hand':'battle',small));
 assert.ok(contains(s,1,'extra',psychic));
 assert.ok(contains(s,1,'battle',big));
});

test('Pepper may decline its second clause and does not activate on the opposing turn',()=>{
 const s=setup(),pepper=put(s,1,PEPPER),psychic=put(s,0,PSYCHIC);
 end(s);
 assert.ok(!s.decision);
 assert.equal(s.active,1);
 assert.ok(contains(s,0,'battle',psychic));
 end(s);
 assert.deepEqual(values(s),[null]);
 choose(s,null);
 assert.deepEqual(values(s),[psychic.uid,null]);
 choose(s,null);
 assert.ok(contains(s,0,'battle',psychic));
 assert.equal(e.card(pepper).breaker,2);
});

test('Cancer protects only its tapped Psychic allies from enemy choices, and attack declarations may target them',()=>{
 const s=setup(),source=put(s,1,CANCER);
 const protectedPsychic=put(s,1,PSYCHIC,{tapped:true}),open=put(s,1,PSYCHIC),attacker=put(s,0,IRONY);
 put(s,1,SMALL,{tapped:true});
 put(s,0,PSYCHIC,{tapped:true});
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===protectedPsychic.uid));
 attack(s,attacker.uid);
 choose(s,1);
 assert.deepEqual(values(s),[open.uid]);
 choose(s,open.uid);
 drain(s);
 assert.ok(contains(s,1,'battle',protectedPsychic));
 assert.ok(contains(s,1,'extra',open));
 source.g35Ignored=s.turn;
 s.phase='main';
 cast(s,IRONY);
 choose(s,1);
 assert.deepEqual(values(s),[protectedPsychic.uid]);
 choose(s,protectedPsychic.uid);
 assert.ok(contains(s,1,'extra',protectedPsychic));
});

test('Cancer does not prevent non-targeting Psychic sweeps',()=>{
 const s=setup(),psychic=put(s,1,PSYCHIC,{tapped:true});
 put(s,1,CANCER);
 cast(s,'dmx07-s01');
 drain(s);
 assert.ok(contains(s,1,'extra',psychic));
});
