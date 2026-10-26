import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,PRESETS} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-57.json',import.meta.url))),registry=createCatalogue(snapshot,data.cards,details);
const TRIPLE='dm14-021',BRAIN='dm08-043',CRIMSON='dm08-032',REVERSE='dm08-047',N='dm01-108',GEN='dmrp15-km1';
const play=(s,id)=>{const x=inst(id);s.players[0].hand.push(x);act(s,'play',a=>a.cardId===id);return x;};
const pick=(s,value)=>{const a=e.getLegalActions(s).find(a=>a.kind==='extended'&&JSON.stringify(s.decision.choices[a.choice].value)===JSON.stringify(value));assert.ok(a,JSON.stringify(s.decision));e.step(s,a);};
test('four utility definitions preserve canonical names, official effects, real art and four-copy limits',()=>{
 assert.equal(manifest.cards.length,4);assert.equal(data.cards.length,1422);assert.equal(data.supportExpansion.phase,74);
 for(const row of manifest.cards){const c=e.card(row.id);assert.equal(c.name,row.name);assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);for(const[k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);assert.equal(c.limit,4);assert.equal(registry.get(row.id).supported,true);assert.equal(CARD_IMAGES[row.id],row.image);}
});
test('Triple Brain chooses zero to three cards and preserves library order and physical identities',()=>{
 for(let n=0;n<=3;n++){const s=setup();give(s,0,'deck',Array(6).fill(N));const top=s.players[0].deck.map(x=>x.uid),mana=s.players[0].mana.length,x=play(s,TRIPLE),ids=e.physicalCards(s).map(x=>x.uid).sort();assert.equal(s.decision.type,'draw');assert.deepEqual(e.getLegalActions(s).map(a=>a.n),[0,1,2,3]);act(s,'draw',a=>a.n===n);drain(s);assert.deepEqual(s.players[0].hand.map(x=>x.uid),top.slice(0,n));assert.deepEqual(s.players[0].deck.map(x=>x.uid),top.slice(n));assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));assert.equal(s.players[0].mana.length,mana);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),ids);}
});
test('Brain Charger draws exactly one then puts its own physical card into mana untapped',()=>{
 const s=setup(),top=s.players[0].deck[0],before=s.players[0].mana.length,x=play(s,BRAIN);assert.equal(s.decision,null);assert.deepEqual(s.players[0].hand.map(y=>y.uid),[top.uid]);assert.equal(s.players[0].mana.length,before+1);assert.equal(s.players[0].mana.find(y=>y.uid===x.uid)?.tapped,false);assert.ok(!x.faceDown);assert.ok(!s.players[0].grave.some(y=>y.uid===x.uid));
});
test('Crimson Charger offers only enemy creatures at current power 2000 or less, then charges',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[N,N]);const small=s.players[1].battle[0],boosted=s.players[1].battle[1];boosted.powerModifiers=[{amount:2000,expires:'end',who:0}];const before=s.players[0].mana.length,x=play(s,CRIMSON);assert.equal(s.decision.type,'effect');const targets=e.getLegalActions(s);assert.equal(targets.length,1);assert.equal(targets[0].targets[0].uid,small.uid);e.step(s,targets[0]);drain(s);assert.ok(s.players[1].grave.some(y=>y.uid===small.uid));assert.ok(s.players[1].battle.some(y=>y.uid===boosted.uid));assert.equal(s.players[0].battle.length,1);assert.equal(s.players[0].mana.length,before+1);assert.ok(s.players[0].mana.some(y=>y.uid===x.uid));
});
test('Crimson Charger still charges when no opposing target exists',()=>{
 const s=setup(),before=s.players[0].mana.length,x=play(s,CRIMSON);drain(s);assert.equal(s.decision,null);assert.equal(s.players[0].mana.length,before+1);assert.ok(s.players[0].mana.some(y=>y.uid===x.uid));
});
test('Reverse Charger requires a creature from its own grave, resolves recovery before charging and resumes from JSON',()=>{
 let s=setup();give(s,0,'grave',[N,TRIPLE,'dmrp02-s09']);give(s,1,'grave',[N]);const x=play(s,REVERSE),recover=s.players[0].grave[2],before=s.players[0].mana.length,ids=e.physicalCards(s).map(y=>y.uid).sort();assert.equal(s.decision.task.op,'g34_Select');assert.equal(s.decision.choices.length,2);assert.ok(s.decision.choices.every(o=>o.value.p===0));assert.ok(!s.players[0].mana.some(y=>y.uid===x.uid));s=JSON.parse(JSON.stringify(s));pick(s,{uid:recover.uid,origin:'grave',p:0});drain(s);assert.ok(s.players[0].hand.some(y=>y.uid===recover.uid));assert.ok(s.players[0].grave.some(y=>y.cardId===TRIPLE));assert.equal(s.players[1].grave.length,1);assert.equal(s.players[0].mana.length,before+1);assert.ok(s.players[0].mana.some(y=>y.uid===x.uid));assert.deepEqual(e.physicalCards(s).map(y=>y.uid).sort(),ids);
});
test('Reverse Charger still charges when the grave has only spells',()=>{
 const s=setup();give(s,0,'grave',[TRIPLE,BRAIN]);const x=play(s,REVERSE);drain(s);assert.equal(s.players[0].hand.length,0);assert.equal(s.players[0].grave.length,2);assert.ok(s.players[0].mana.some(y=>y.uid===x.uid));
});
test('Genmu ignores both the primary spell instructions and the Charger mana replacement',()=>{
 for(const id of[TRIPLE,BRAIN,CRIMSON,REVERSE]){const s=setup();give(s,1,'battle',[GEN]);give(s,0,'grave',[N]);const before=s.players[0].mana.length,deck=s.players[0].deck.length,x=play(s,id);drain(s);assert.equal(s.players[0].hand.length,0);assert.equal(s.players[0].deck.length,deck);assert.equal(s.players[0].mana.length,before);assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));}
});
test('a Charger cast without paying mana still moves its same physical card to mana',()=>{
 const s=setup();give(s,0,'hand',[BRAIN]);give(s,0,'mana',[]);const x=s.players[0].hand[0];s.extTasks=[{op:'execute',p:0,source:BRAIN,origin:'hand',spellOnly:true,max:4,optional:false}];act(s,'toAttack');pick(s,{uid:x.uid,face:0});drain(s);assert.equal(s.players[0].mana.length,1);assert.equal(s.players[0].mana[0].uid,x.uid);assert.equal(s.players[0].hand.length,1);
});
test('the four additions complete CPU games from both initiative positions while conserving eighty cards',()=>{
 const deck={id:'simple-utilities-check',name:'simple-utilities-check',format:'original',cards:[TRIPLE,BRAIN,CRIMSON,REVERSE,'dm06-110','dm01-083','dm01-097',N,'dm01-090','dm01-075'].map(id=>({id,count:4}))};assert.deepEqual(e.validateDeck(deck),[]);let newPlays=0;
 for(const first of[0,1]){let s=e.createGame([deck,PRESETS[0]],{seed:95110+first,first,maxTurns:100,maxActions:1500});const ids=e.physicalCards(s).map(x=>x.uid).sort();let resumed=false;while(s.winner===null){const legal=e.getLegalActions(s),a=e.chooseAI(s);assert.ok(legal.some(x=>JSON.stringify(x)===JSON.stringify(a)));e.step(s,a);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),ids);if(!resumed&&s.actions>=25){s=JSON.parse(JSON.stringify(s));resumed=true;}}assert.ok(resumed);assert.ok([0,1].includes(s.winner));newPlays+=[TRIPLE,BRAIN,CRIMSON,REVERSE].reduce((n,id)=>n+(s.metrics[0].played[id]||0),0);}assert.ok(newPlays>0);
});
