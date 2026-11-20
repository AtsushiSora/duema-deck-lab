import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,inst,act,drain,give} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
const N='dm01-108';
export const put=(s,p,id)=>{const x={...inst(id),cardOwner:p};s.players[p].battle.push(x);return x;};
export const nextOwn=s=>{s.phase='attack';act(s,'endTurn');drain(s);s.phase='attack';act(s,'endTurn');drain(s);};
export const pick=(s,v)=>act(s,'extended',a=>{const x=s.decision.choices[a.choice].value;return(x?.uid??x)===v;});
export function verifyGalaxyBatch(phase){
 const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url)));
 test('Galaxyshield '+phase+' full official text, basic data, image, limit and forty-card saved decks agree',()=>{
  const cat=createCatalogue(snapshot,data.cards,details),ids=[...manifest.cards.map(x=>x.id),N,'dm01-075','dm01-083','dm01-097','dm01-090','dm01-050','dm01-051'].slice(0,10),deck={id:'galaxy-'+phase,name:'Galaxy',cards:ids.map(id=>({id,count:4}))},saved=structuredClone(deck);
  for(const row of manifest.cards){const d=details.cards.find(x=>x.id===row.id);assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase}),row.spec);const bad=structuredClone(d);bad.faces[0].abilityText+='未対応';assert.throws(()=>standardCardSpec(bad,{phase}));assert.equal(CARD_IMAGES[row.id],row.image);assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);assert.ok(cat.get(row.id).supported);}
  assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(cat.validate(deck),[]);assert.equal(e.physicalCards(e.createGame([deck,deck],{seed:phase})).length,80);assert.deepEqual(deck,saved);
 });
 for(const row of manifest.cards){const id=row.id,g=row.spec.g1412GalaxyShield;
  test(row.name+' normal summon pays the printed cost and conserves physical cards',()=>{const s=setup();s.active=0;const x=inst(id);s.players[0].hand=[x];const before=e.physicalCards(s).map(x=>x.uid).sort();act(s,'play',a=>a.uid===x.uid&&!a.alternative);drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(id).cost);assert.ok(s.players[0].battle.includes(x));assert.equal(s.metrics[0].played[id],1);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),before);});
  test(row.name+' Galaxyshield uses its own mana/civilizations, survives saved payment and summons next own start',()=>{
   let s=setup();s.active=0;const x=inst(id),enemy=put(s,1,N);s.players[0].hand=[x];const before=e.physicalCards(s).map(x=>x.uid).sort(),a=e.getLegalActions(s).find(a=>a.kind==='galaxyShield'&&a.uid===x.uid);assert.equal(a.cost,g.cost);e.step(s,a,{manualMana:true});assert.equal(s.decision.type,'manaPayment');assert.equal(s.decision.cost,g.cost);assert.deepEqual(s.decision.colors,g.civilizations);s=JSON.parse(JSON.stringify(s));for(let n=0;s.decision?.type==='manaPayment';n++){assert.ok(n<100);e.step(s,e.chooseAI(s));}assert.equal(s.decision,null);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,g.cost);assert.equal(s.metrics[0].played[id]||0,0);assert.equal(s.players[0].hand.length,0);assert.ok(s.players[0].shields.some(y=>y.uid===x.uid&&y.faceUp));assert.ok(!s.players[1].battle.find(y=>y.uid===enemy.uid).tapped);
   s=JSON.parse(JSON.stringify(s));s.players[0].mana.forEach(y=>y.tapped=true);nextOwn(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.ok(!s.players[0].shields.some(y=>y.uid===x.uid));assert.equal(s.metrics[0].played[id],1);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),before);
  });
  test(row.name+' placement bypasses summon prohibition and its start summon waits until prohibition ends',()=>{const s=setup();s.active=0;put(s,1,'dmr18-l01');s.players[1].shields=[];s.players[0].hand=[inst(id)];assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===id));act(s,'galaxyShield',a=>a.cardId===id);drain(s);nextOwn(s);assert.ok(s.players[0].shields.some(x=>x.cardId===id));assert.ok(!s.players[0].battle.some(x=>x.cardId===id));s.players[1].battle=[];nextOwn(s);assert.ok(s.players[0].battle.some(x=>x.cardId===id));});
  test(row.name+' Galaxyshield requires its specified civilizations and ignores summon discounts',()=>{const s=setup();s.active=0;s.players[0].hand=[inst(id)];give(s,0,'mana',Array(12).fill('dm01-097'));assert.ok(!e.getLegalActions(s).some(a=>a.kind==='galaxyShield'));give(s,0,'mana',['dm01-075','dm01-083',N,'dm01-075','dm01-083',N,'dm01-075','dm01-083']);put(s,0,'dm01-083');act(s,'galaxyShield');assert.equal(s.players[0].mana.filter(x=>x.tapped).length,g.cost);});
 }
 return manifest;
}
