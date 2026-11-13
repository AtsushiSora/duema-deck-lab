import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const SPELL='dmx06-017', KAISER='dmx08-s04', LESSER='dmr05-106';
const PSYCHIC='dm36-s07', ORDINARY='dm01-048', FIRE='dm01-097';
const extraCards=[{id:PSYCHIC,count:4}];

function setup(){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards}));
 const s=e.createGame(decks,{seed:1091});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',Array(6).fill(FIRE));
  give(s,p,'shields',Array(5).fill(ORDINARY));
 }
 return s;
}
function enterPsychic(s,p,props={}){
 const x=Object.assign(s.players[p].extra.shift(),props);
 s.players[p].battle.push(x);
 return x;
}
function targets(s){return s.decision?.choices.map(c=>c.value.uid);}
function choose(s,x){act(s,'extended',a=>targets(s)[a.choice]===x.uid);}

test('Buttobe Psychic filters by owner, Psychic type and current power, and sends the destroyed card back to its extra zone',()=>{
 const s=setup(),valid=enterPsychic(s,1,{powerModifiers:[{amount:5000}]});
 enterPsychic(s,0);
 enterPsychic(s,1,{powerModifiers:[{amount:6000}]});
 const high=enterPsychic(s,1,{g1085Awakened:true});
 s.players[1].battle.push(inst(ORDINARY));
 cast(s,SPELL);
 assert.deepEqual(targets(s),[valid.uid]);
 choose(s,valid);
 drain(s);
 assert.ok(s.players[1].extra.includes(valid));
 assert.ok(s.players[1].battle.includes(high));
 assert.ok(s.players[0].battle.some(x=>e.card(x).psychic));
 assert.ok(s.players[0].grave.some(x=>x.cardId===SPELL));
});

test('Buttobe Psychic is playable without mana from a broken shield',()=>{
 const s=setup(),attacker=enterPsychic(s,0);
 give(s,1,'shields',[SPELL,ORDINARY,ORDINARY]);
 give(s,1,'mana',[]);
 attack(s,attacker.uid);
 for(let i=0;i<20&&s.decision?.type!=='trigger';i++)e.step(s,e.chooseAI(s));
 act(s,'useTrigger',a=>a.cardId===SPELL);
 assert.deepEqual(targets(s),[attacker.uid]);
 choose(s,attacker);
 drain(s);
 assert.ok(s.players[0].extra.includes(attacker));
});

test('Oni Kaiser attacks on its entry turn, destroys an opposing Psychic regardless of power, and breaks two shields',()=>{
 const s=setup(),awakened=enterPsychic(s,1,{g1085Awakened:true});
 enterPsychic(s,0);
 s.players[1].battle.push(inst(ORDINARY));
 cast(s,KAISER);
 drain(s);
 const kaiser=s.players[0].battle.find(x=>x.cardId===KAISER);
 assert.equal(kaiser.entered,s.turn);
 attack(s,kaiser.uid);
 assert.deepEqual(targets(s),[awakened.uid]);
 choose(s,awakened);
 drain(s);
 assert.ok(s.players[1].battle.includes(awakened));
 assert.equal(e.card(awakened).name,'時空の火焔ボルシャック・ドラゴン');
 assert.equal(s.players[1].shields.length,3);
});

test('Lesser counts only visible opposing Psychic creatures in battle, including the awakened face',()=>{
 const s=setup(),lesser=inst(LESSER);
 s.players[0].battle.push(lesser);
 s.players[1].battle.push(inst(ORDINARY));
 enterPsychic(s,0);
 assert.equal(e.power(lesser,false,s),3000);
 const front=enterPsychic(s,1),back=enterPsychic(s,1,{g1085Awakened:true});
 enterPsychic(s,1,{sealed:true});
 assert.equal(e.power(lesser,false,s),13000);
 s.players[1].battle.splice(s.players[1].battle.indexOf(front),1);
 s.players[1].extra.push(front);
 assert.equal(e.power(lesser,false,s),8000);
 assert.ok(s.players[1].battle.includes(back));
});

test('the two Oni Kaiser reprint IDs resolve to one battle definition',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.equal(catalogue.get('dmx14-025').id,KAISER);
 assert.equal(catalogue.get('dmd18-013').id,KAISER);
 assert.deepEqual(catalogue.resolveRows([{id:KAISER,count:1},{id:'dmx14-025',count:1},{id:'dmd18-013',count:1}]),[{id:KAISER,count:3}]);
});
