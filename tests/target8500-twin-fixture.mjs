import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,inst,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
export const put=(s,p,id)=>{const x=inst(id);x.cardOwner=p;s.players[p].battle.push(x);return x;};
export function playFace(s,id,face=0){const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face&&!a.alternative);return x;}
export function pick(s,v){act(s,'extended',a=>{const x=s.decision?.choices?.[a.choice]?.value;return(x?.uid??x)===v;});}
export function verifyTwinBatch(phase){
 const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))),cat=createCatalogue(snapshot,data.cards,details),ids=manifest.cards.map(x=>x.id);
 test('phase '+phase+' pins both official faces, images and restrictions without new IDs for the spell sides',()=>{
  for(const row of manifest.cards){const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id);assert.deepEqual(row.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase}),row.spec);const bad=structuredClone(d);bad.faces[1].abilityText+='\n未対応の能力';assert.throws(()=>standardCardSpec(bad,{phase}));assert.equal(CARD_IMAGES[row.id],row.image);assert.match(row.verification.imageSha256,/^[a-f0-9]{64}$/);assert.equal(c.limit,manifest.regulationVerification.limits[row.id]);assert.equal(c.manaValue,1);assert.equal(c.type,'creature');assert.equal(c.spellFace.type,'spell');assert.equal(c.spellFace.cost,row.faces[1].cost);assert.equal(cat.get(row.id).id,row.id);}
 });
 test('phase '+phase+' saves one physical twin per slot and retains forty-card deck and game snapshots',()=>{
  const deck={id:'target8500-twins-'+phase,name:'Twins '+phase,cards:[...ids,...['dm01-108','dm01-097','dm01-083','dm01-075','dm01-090','dm01-050','dm01-051'].slice(0,10-ids.length)].map(id=>({id,count:4}))},before=structuredClone(deck);assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(cat.validate(deck),[]);const s=e.createGame([deck,deck],{seed:phase});assert.equal(s.players[0].deck.length,30);assert.equal(e.physicalCards(s).length,80);assert.deepEqual(deck,before);assert.deepEqual(e.getLegalActions(s),e.getLegalActions(JSON.parse(JSON.stringify(s))));
 });
 for(const row of manifest.cards)for(const face of[0,1])test(row.name+' pays only the chosen face and preserves its physical ID, face '+face,()=>{
  let s=setup();s.active=0;put(s,0,'dm01-108');put(s,1,'dm01-108');s.players[0].grave=[inst('dm01-108')];s.players[0].hand=[inst('dm01-108'),inst('dm01-097')];const x=inst(row.id);s.players[0].hand.push(x);const before=e.physicalCards(s).map(x=>x.uid).sort(),expectedCost=row.id==='dmex08-193'&&face===0?0:row.faces[face].cost;
  const legal=e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid&&!a.alternative);assert.equal(legal.length,2);assert.equal(legal.find(a=>(a.face||0)===face).cost,expectedCost);s=JSON.parse(JSON.stringify(s));act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face&&!a.alternative);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,Math.max(expectedCost,row.faces[face].civilizations.length));drain(s);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),before);assert.ok(s.players[0][face?(row.spec.spellFace.normalCharger?'mana':'grave'):'battle'].some(y=>y.uid===x.uid));assert.deepEqual(e.getLegalActions(s),e.getLegalActions(JSON.parse(JSON.stringify(s))));
 });
 return manifest;
}
