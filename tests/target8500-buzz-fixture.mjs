import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{e,data,details,snapshot,setup,inst,give,drain}from'./target-fixture.mjs';
import{standardCardSpec}from'../tools/standard-card-spec.mjs';import{createCatalogue}from'../dist/catalogue.js';import{CARD_IMAGES}from'../dist/card-images.js';
export function buzzField(){const s=setup();s.active=0;s.turn=3;for(const p of[0,1])give(s,p,'deck',Array(50).fill('dm01-108'));return s;}
export function buzzPlay(s,id,n=0,manual=false){const x=inst(id);s.players[0].hand.push(x);const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&(n?a.g1411BuzzN===n:!a.alternative));assert.ok(a);e.step(s,a,manual?{manualMana:true}:{});return x;}
export const buzzPut=(s,p,id)=>{const x={...inst(id),cardOwner:p};s.players[p].battle.push(x);return x;};
export function verifyBuzzBatch(phase){
 const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url)));
 test('buzz batch '+phase+' full official text, stats, image, limits and saved forty-card deck agree',()=>{
  const cat=createCatalogue(snapshot,data.cards,details),ids=[...m.cards.map(x=>x.id),'dm01-108','dm01-075','dm01-083','dm01-090','dm01-097','dm01-050','dm01-051'].slice(0,10),deck={id:'buzz-'+phase,name:'Buzz',cards:ids.map(id=>({id,count:4}))},saved=structuredClone(deck);
  for(const row of m.cards){const d=details.cards.find(c=>c.id===row.id);assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase}),row.spec);const bad=structuredClone(d);bad.faces[0].abilityText+='未対応';assert.throws(()=>standardCardSpec(bad,{phase}));assert.equal(CARD_IMAGES[row.id],row.image);assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.ok(cat.get(row.id).supported);}
  assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(cat.validate(deck),[]);assert.equal(e.physicalCards(e.createGame([deck,deck],{seed:phase})).length,80);assert.deepEqual(deck,saved);
 });
 for(const row of m.cards){const id=row.id;
  for(const n of[0,1,2])test(row.name+' manually pays base plus '+n+' additions, replays saved payment and conserves physical cards',()=>{
   let s=buzzField();buzzPlay(s,id,n,true);const before=e.physicalCards(s).map(x=>x.uid).sort();assert.equal(s.decision.type,'manaPayment');assert.equal(s.decision.cost,e.card(id).cost+n*row.spec.g1411BuzzRenda.cost);assert.deepEqual(s.decision.colors,e.civilizations(e.card(id)));s=JSON.parse(JSON.stringify(s));for(let i=0;s.decision?.type==='manaPayment';i++){assert.ok(i<120);e.step(s,e.chooseAI(s));}drain(s);assert.equal(s.metrics[0].played[id],1);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),before);assert.equal(e.card(id).cost,row.faces[0].cost);
  });
  test(row.name+' does not offer paid buzz actions without its base civilizations',()=>{const s=buzzField();give(s,0,'mana',Array(40).fill('dm01-090'));s.players[0].hand=[inst(id)];assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===id));});
 }
 return m;
}
