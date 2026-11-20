import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,inst,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
export function verifyVividBatch(phase){
 const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))),cat=createCatalogue(snapshot,data.cards,details),ids=m.cards.map(x=>x.id),deck={id:'vivid-'+phase,name:'Vivid '+phase,cards:[...ids,...['dm01-108','dm01-097','dm01-083','dm01-075','dm01-090','dm01-050','dm01-051'].slice(0,10-ids.length)].map(id=>({id,count:4}))};
 test('phase '+phase+' agrees with full official abilities, stats, images, restrictions and saved forty-card decks',()=>{
  for(const row of m.cards){const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id);assert.deepEqual(row.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase}),row.spec);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未実装の能力';assert.throws(()=>standardCardSpec(bad,{phase}));assert.equal(CARD_IMAGES[row.id],row.image);assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);assert.equal(c.limit,m.regulationVerification.limits[row.id]);assert.equal(c.g1335VividDraw,row.spec.g1335VividDraw);assert.equal(c.cost,row.faces[0].cost);}
  const before=structuredClone(deck);assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(cat.validate(deck),[]);const s=e.createGame([deck,deck],{seed:phase});assert.equal(e.physicalCards(s).length,80);assert.deepEqual(deck,before);assert.ok(!s.log.some(x=>x.type==='vividDraw'));assert.ok(!e.getLegalActions(s).some(a=>a.alternative==='vividDraw1335'));
 });
 for(const row of m.cards)for(const reveal of[false,true])test(row.name+' can reveal only when drawn and pays its chosen ordinary or Vivid cost: '+reveal,()=>{
  let s=setup();s.active=1;const x=inst(row.id),enemy=inst('dm01-108');s.players[0].deck=[x,...Array.from({length:20},()=>inst('dm01-108'))];s.players[0].hand=[inst('dm01-108'),inst('dm01-097')];s.players[1].battle=[enemy];s.phase='attack';act(s,'endTurn');assert.equal(s.decision.stage,'vivid');assert.equal(s.decision.source,row.id);act(s,'vividReveal',a=>a.reveal===reveal);act(s,'skipCharge');assert.equal(s.players[0].hand.some(y=>y.uid===x.uid),true);
  const alternative=e.getLegalActions(s).find(a=>a.uid===x.uid&&a.alternative==='vividDraw1335');assert.equal(!!alternative,reveal);const physical=e.physicalCards(s).map(x=>x.uid).sort();s=JSON.parse(JSON.stringify(s));act(s,'play',a=>a.uid===x.uid&&(reveal?a.alternative==='vividDraw1335':!a.alternative));drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,Math.max(reveal?row.spec.g1335VividDraw:row.faces[0].cost,row.faces[0].civilizations.length));assert.ok(s.players[0][e.card(row.id).type==='spell'?'grave':'battle'].some(y=>y.uid===x.uid));assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),physical);
 });
 for(const row of m.cards)test(row.name+' does not gain Vivid permission from merely being in hand and loses a prior reveal next turn',()=>{
  const s=setup();s.active=0;const x=inst(row.id);s.players[0].hand=[x];assert.ok(!e.getLegalActions(s).some(a=>a.uid===x.uid&&a.alternative==='vividDraw1335'));x.g1335Vivid=s.turn;assert.ok(e.getLegalActions(s).some(a=>a.uid===x.uid&&a.alternative==='vividDraw1335'));s.phase='attack';act(s,'endTurn');drain(s);s.phase='attack';act(s,'endTurn');drain(s);act(s,'skipCharge');assert.ok(!e.getLegalActions(s).some(a=>a.uid===x.uid&&a.alternative==='vividDraw1335'));
 });
 return m;
}
