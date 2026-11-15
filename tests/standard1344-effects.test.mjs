import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const MELKIS='dm10-s09',REPRINT='dmc66-018',DENDEN='dm17-028',SPIRAL='dm01-086';
const FIRE='dm01-097',SURFER='dm05-024',HAND='dm01-027',ALCADIAS='dm04-001';
const add=(s,p,z,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const spell=(s,uid)=>act(s,'extended',a=>s.decision.choices[a.choice].value.uid===uid);
const target=(s,uid)=>act(s,'effect',a=>a.targets.some(x=>x.uid===uid));

test('both official Melkis prints are one canonical ID, with the newer wording covering all spells',()=>{
 const {cards:[row],printAliases:[alias]}=JSON.parse(readFileSync(new URL('../tools/support-phase-1344.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details),c=e.card(MELKIS);
 assert.equal(row.id,MELKIS);
 assert.equal(alias.id,REPRINT);
 assert.deepEqual(catalogue.resolveRows([{id:REPRINT,count:1}]),[{id:MELKIS,count:1}]);
 assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[MELKIS]);
 assert.equal(CARD_IMAGES[MELKIS],row.image);
 assert.deepEqual([c.cost,c.power,c.race,c.civ,c.limit,c.breaker],[6,8500,'ガーディアン','光/水',4,2]);
 assert.match(c.text,/呪文をすべて/);
});

test('Melkis casts the opponent’s Spiral Gate, Denden remains and the actual spell goes to its owner (old QA35384)',()=>{
 const s=setup(),melkis=add(s,0,'battle',MELKIS),denden=add(s,1,'battle',DENDEN);
 give(s,1,'shields',[SPIRAL,FIRE]);
 const [original,other]=s.players[1].shields;
 const before=e.physicalCards(s).map(x=>x.uid).sort();
 attack(s,melkis.uid);act(s,'noBlock');
 assert.equal(s.decision.task.op,'g1344MelkisSpells');
 spell(s,original.uid);
 assert.equal(s.decision.player,0);
 target(s,denden.uid);drain(s);
 assert.ok(has(s,1,'battle',denden));
 assert.ok(has(s,1,'grave',original));
 assert.ok(has(s,1,'hand',other));
 assert.equal(s.metrics[0].played[SPIRAL],1);
 assert.equal(s.metrics[1].played[SPIRAL],undefined);
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),before);
});

test('all trigger spells in one shield can be cast in the chosen order after serializing',()=>{
 let s=setup();
 const melkis=add(s,0,'battle',MELKIS),ourTarget=add(s,0,'battle',FIRE),enemy=add(s,1,'battle',FIRE);
 give(s,1,'shields',[SPIRAL,FIRE]);
 const [root]=s.players[1].shields,under=inst(HAND);
 root.shieldStack=[under];
 attack(s,melkis.uid);act(s,'noBlock');
 assert.deepEqual(new Set(s.decision.choices.map(x=>x.value.uid)),new Set([root.uid,under.uid]));
 s=JSON.parse(JSON.stringify(s));
 spell(s,under.uid);target(s,enemy.uid);
 spell(s,root.uid);target(s,ourTarget.uid);drain(s);
 assert.ok(has(s,1,'grave',root)&&has(s,1,'grave',under)&&has(s,1,'grave',enemy));
 assert.ok(has(s,0,'hand',ourTarget));
});

test('a creature trigger is added to the defender’s hand and can be declared by that defender',()=>{
 const s=setup(),melkis=add(s,0,'battle',MELKIS);
 give(s,1,'shields',[SURFER,FIRE]);
 const [defender]=s.players[1].shields;
 attack(s,melkis.uid);act(s,'noBlock');
 assert.ok(has(s,1,'hand',defender));
 assert.ok(s.triggers.undeclared.includes(defender.uid));
 assert.equal(s.triggers.player,1);
 drain(s);
});

test('a prohibition on casting a revealed non-light spell leaves it available to move to hand',()=>{
 const s=setup(),melkis=add(s,0,'battle',MELKIS);
 add(s,1,'battle',ALCADIAS);
 give(s,1,'shields',[SPIRAL,FIRE]);
 const [blocked]=s.players[1].shields;
 attack(s,melkis.uid);act(s,'noBlock');drain(s);
 assert.ok(has(s,1,'hand',blocked));
 assert.ok(!has(s,1,'grave',blocked));
});

test('if the first stolen spell removes Melkis the remaining shields break normally',()=>{
 const s=setup(),melkis=add(s,0,'battle',MELKIS);
 give(s,1,'shields',[SPIRAL,SPIRAL]);
 const [first,second]=s.players[1].shields;
 attack(s,melkis.uid);act(s,'noBlock');spell(s,first.uid);target(s,melkis.uid);
 assert.ok(has(s,0,'hand',melkis));
 assert.ok(has(s,1,'grave',first));
 assert.ok(has(s,1,'hand',second)&&s.triggers.undeclared.includes(second.uid));
});
