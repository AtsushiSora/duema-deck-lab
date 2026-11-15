import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {act,attack,cast,data,details,drain,e,inst,setup,snapshot} from './target-fixture.mjs';

const DIAMOND='dm26-006',ALDORA='dm32-s02',SMALL='dm01-083',DIDANOS='dmrp13-km3';
const LIMIT='dm24rp3-061',GENMU='dmrp15-km1';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1331.json',import.meta.url)));
const registry=createCatalogue(snapshot,data.cards,details);
const put=(s,p,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p].battle.push(x);
 return x;
};
const attacks=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);
const toAttack=s=>act(s,'toAttack');
const end=s=>{if(s.phase==='charge')act(s,'skipCharge');if(s.phase==='main')toAttack(s);act(s,'endTurn');drain(s);};

test('Diamond Sword maps all six official print IDs to the same supported name and keeps their images',()=>{
 const references=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(manifest.cards.length,1);
 assert.equal(manifest.printAliases.length,5);
 assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey('ダイヤモンド・ソード')).map(c=>c.id),[DIAMOND]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:DIAMOND,count:1}]);
  assert.equal(row.faces[0].cost,3);
  assert.deepEqual(row.faces[0].civilizations,['光']);
  assert.match(row.verification.imageSha256,/^[a-f\d]{64}$/);
  assert.ok(references.some(r=>r.id===row.id&&r.canonicalId===DIAMOND&&r.image===row.image));
 }
 assert.equal(e.card(DIAMOND).limit,4);
 assert.equal(CARD_IMAGES[DIAMOND],manifest.cards[0].image);
});

test('Aldora may attack the opposing player without a Blocker entry this turn (QA 35807)',()=>{
 let s=setup();
 const aldora=put(s,0,ALDORA),rival=put(s,1,SMALL,{tapped:true});
 s.phase='attack';
 assert.deepEqual(attacks(s,aldora).map(a=>a.target),[rival.uid]);
 s.phase='main';
 cast(s,DIAMOND);drain(s);
 s=JSON.parse(JSON.stringify(s));
 attack(s,aldora.uid);drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('Diamond Sword covers present creatures, including those with summoning sickness, through this turn',()=>{
 const s=setup(),early=put(s,0,SMALL,{entered:s.turn}),tapped=put(s,0,SMALL,{entered:s.turn,tapped:true});
 put(s,1,SMALL,{tapped:true});
 cast(s,DIAMOND);drain(s);
 const later=put(s,0,SMALL,{entered:s.turn});
 toAttack(s);
 assert.ok(attacks(s,early).length);
 assert.ok(attacks(s,early).every(a=>a.target==='player'));
 assert.equal(attacks(s,tapped).length,0);
 assert.equal(attacks(s,later).length,0);
 end(s);end(s);
 assert.ok(!s.extLimits.some(l=>l.grant?.g1331Diamond));
});

test('Diamond Sword allows a lower-power creature to attack past Gigandidadanos (QA 40181)',()=>{
 const s=setup(),small=put(s,0,SMALL);
 put(s,1,DIDANOS);
 s.phase='attack';
 assert.equal(attacks(s,small).filter(a=>a.target==='player').length,0);
 s.phase='main';cast(s,DIAMOND);toAttack(s);
 assert.ok(attacks(s,small).some(a=>a.target==='player'));
});

test('Diamond Sword bypasses the active attack quota for player attacks (QA 39835 analogue)',()=>{
 const s=setup();s.active=1;
 const first=put(s,0,SMALL),second=put(s,0,SMALL),enemy=put(s,1,SMALL,{tapped:true});
 cast(s,LIMIT);end(s);act(s,'skipCharge');
 cast(s,DIAMOND);toAttack(s);
 attack(s,first.uid);drain(s);
 enemy.tapped=true;
 assert.ok(attacks(s,second).some(a=>a.target==='player'));
 assert.ok(attacks(s,second).every(a=>a.target!==enemy.uid));
 attack(s,second.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Diamond Sword grants no permission when its spell ability is ignored',()=>{
 const s=setup(),aldora=put(s,0,ALDORA);
 put(s,1,GENMU);
 cast(s,DIAMOND);drain(s);toAttack(s);
 assert.ok(!attacks(s,aldora).some(a=>a.target==='player'));
});
