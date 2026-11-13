import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const EATER='dmr03-024', HERO='dmr02-011', FUNK='dmr05-054';
const PSYCHIC='dm36-s07', SMALL='dm01-097', BIG='dm01-048';
function setup(){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards:[{id:PSYCHIC,count:4}]}));
 const s=e.createGame(decks,{seed:1094});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',['dm01-083','dm01-090',SMALL].flatMap(id=>Array(4).fill(id)));
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
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const modifiers=amount=>({powerModifiers:[{amount}]});

test('Psychic Eater triggers from a shield, blocks, and cannot declare attacks',()=>{
 const s=setup(),attacker=put(s,0,SMALL);
 give(s,1,'shields',[EATER,SMALL,SMALL]);
 give(s,1,'mana',[]);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===EATER);
 drain(s);
 const eater=s.players[1].battle.find(x=>x.cardId===EATER);
 assert.ok(eater);
 s.players[0].battle.push(inst(SMALL));
 const second=s.players[0].battle.at(-1);
 attack(s,second.uid);
 act(s,'block',a=>a.uid===eater.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 assert.ok(s.players[0].grave.includes(second));
 s.active=1;
 s.turn++;
 s.phase='attack';
 eater.tapped=false;
 put(s,0,SMALL,{tapped:true});
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===eater.uid));
});

test('Psychic Eater leaving by bounce lets its opponent choose only among their Psychic creatures',()=>{
 const s=setup();
 const eater=put(s,1,EATER),own=put(s,1,PSYCHIC);
 const first=put(s,0,PSYCHIC),second=put(s,0,PSYCHIC),normal=put(s,0,SMALL);
 cast(s,'dm01-086');
 act(s,'effect',a=>a.targets?.some(x=>x.uid===eater.uid));
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[first.uid,second.uid]);
 choose(s,second.uid);
 drain(s);
 assert.ok(s.players[1].hand.includes(eater));
 assert.ok(s.players[1].battle.includes(own));
 assert.ok(s.players[0].battle.includes(first)&&s.players[0].battle.includes(normal));
 assert.ok(s.players[0].extra.includes(second));
});

test('Psychic Eater may select an awakened Psychic and Release replaces its destruction',()=>{
 const s=setup(),eater=put(s,1,EATER);
 const awakened=put(s,0,PSYCHIC,{g1085Awakened:true});
 cast(s,'dm01-086');
 act(s,'effect',a=>a.targets?.some(x=>x.uid===eater.uid));
 assert.deepEqual(values(s),[awakened.uid]);
 choose(s,awakened.uid);
 drain(s);
 assert.ok(s.players[0].battle.includes(awakened));
 assert.equal(e.card(awakened).cost,7);
});

test('Superhero sweeps both sides at distinct live power thresholds, with Psychic Release',()=>{
 const s=setup();
 const small=put(s,0,SMALL,modifiers(1000)),above=put(s,1,SMALL,modifiers(1500));
 const otherSmall=put(s,1,BIG,modifiers(-2000));
 const verySmallPsychic=put(s,0,PSYCHIC,modifiers(-3000));
 const smallPsychic=put(s,1,PSYCHIC,modifiers(-1000)),largePsychic=put(s,1,PSYCHIC);
 const awakened=put(s,1,PSYCHIC,{g1085Awakened:true,...modifiers(-7000)});
 cast(s,HERO);
 drain(s);
 assert.ok(s.players[0].grave.includes(small)&&s.players[1].grave.includes(otherSmall));
 assert.ok(s.players[1].battle.includes(above)&&s.players[1].battle.includes(largePsychic));
 assert.ok(s.players[0].extra.includes(verySmallPsychic)&&s.players[1].extra.includes(smallPsychic));
 assert.ok(s.players[1].extra.includes(awakened));
 assert.ok(s.log.some(x=>x.cardId===PSYCHIC&&x.text.includes('解除')));
 const hero=s.players[0].battle.find(x=>x.cardId===HERO);
 s.turn++;
 attack(s,hero.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Superhero evaluates Psychic power after destroying Funk in the first sweep',()=>{
 const s=setup(),funk=put(s,0,FUNK,modifiers(-2000)),psychic=put(s,1,PSYCHIC);
 assert.equal(e.power(psychic,false,s),1000);
 cast(s,HERO);
 drain(s);
 assert.ok(s.players[0].grave.includes(funk));
 assert.ok(s.players[1].battle.includes(psychic));
 assert.equal(e.power(psychic,false,s),6000);
});

test('Superhero completes both sweeps before a destruction trigger resolves (QA36374 timing)',()=>{
 const s=setup();
 const deathDraw=put(s,0,'dmrp01-085'),psychic=put(s,1,PSYCHIC,modifiers(-1000));
 const drawn=s.players[0].deck[0];
 cast(s,HERO);
 drain(s);
 assert.ok(s.players[0].grave.includes(deathDraw));
 assert.ok(s.players[1].extra.includes(psychic));
 assert.ok(s.players[0].hand.includes(drawn));
 const events=s.log.slice(-12);
 const destroyed=events.findIndex(x=>x.cardId===PSYCHIC);
 const draw=events.findIndex(x=>x.type==='draw');
 assert.ok(destroyed>=0&&draw>destroyed,JSON.stringify(events));
});

test('Funk applies distinct opposing reductions, including the awakened face, and copies stack',()=>{
 const s=setup(),funk=put(s,0,FUNK);
 const ally=put(s,0,SMALL),ownPsychic=put(s,0,PSYCHIC);
 const enemy=put(s,1,BIG),enemyPsychic=put(s,1,PSYCHIC,{g1085Awakened:true});
 assert.equal(e.power(ally,false,s),2000);
 assert.equal(e.power(ownPsychic,false,s),6000);
 assert.equal(e.power(enemy,false,s),4000);
 assert.equal(e.power(enemyPsychic,false,s),7000);
 const other=put(s,0,FUNK);
 assert.equal(e.power(enemy,false,s),3000);
 assert.equal(e.power(enemyPsychic,false,s),2000);
 funk.g35Ignored=s.turn;
 assert.equal(e.power(enemyPsychic,false,s),7000);
 s.players[0].battle.splice(s.players[0].battle.indexOf(other),1);
 assert.equal(e.power(enemy,false,s),5000);
 assert.equal(e.power(enemyPsychic,false,s),12000);
});

test('Funk destroys a 1000-power entrant and its entry ability still resolves (QA36616)',()=>{
 const s=setup(),glen='dmr03-051';
 put(s,1,FUNK);
 const top=s.players[0].deck[0];
 cast(s,glen);
 assert.ok(s.players[0].grave.some(x=>x.cardId===glen));
 assert.equal(s.decision.source,glen);
 act(s,'draw',a=>a.n===1);
 assert.ok(s.players[0].hand.includes(top));
});

test('Funk also destroys a shield-trigger entrant before its queued draw resolves',()=>{
 const s=setup(),banner='dmrp08-016',attacker=put(s,0,SMALL);
 put(s,0,FUNK);
 give(s,1,'shields',[banner]);
 const draws=s.players[1].deck.slice(0,2);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===banner);
 drain(s);
 assert.ok(s.players[1].grave.some(x=>x.cardId===banner));
 assert.deepEqual(s.players[1].hand,draws);
 const leave=s.log.findIndex(x=>x.cardId===banner&&x.type==='leave');
 const draw=s.log.findIndex(x=>x.type==='draw');
 assert.ok(leave>=0&&draw>leave,JSON.stringify(s.log));
});

test('Funk sends a Psychic reduced to zero back to its extra zone',()=>{
 const s=setup(),psychic=put(s,1,PSYCHIC,modifiers(-1000));
 cast(s,FUNK);
 drain(s);
 assert.ok(s.players[1].extra.includes(psychic));
 assert.ok(!s.players[1].battle.includes(psychic));
});

test('all five mono Superhero reprints resolve to its canonical card and the Twinpact has its own ID',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 for(const id of ['dmex04-029','dmx18-004','promoy11-026','promoy12-011','promoy13-007']){
  assert.equal(catalogue.get(id)?.id,HERO);
 }
 assert.equal(catalogue.get('dmbd16-009')?.id,'dmbd16-009');
 assert.equal(catalogue.get('dmbd16-009')?.spellFace.name,'超英雄タイム');
});
