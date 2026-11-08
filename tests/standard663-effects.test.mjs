import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-663.json',import.meta.url)));
const STEEL='dmr10-008',KABOO='dmr10-044',SOUL='dmx15-026',COTTON='dm26rp2-055',JET='dmr09-014',WHITE='dm26rp1-023';
const NATURE='dm01-108',FIRE='dm01-100',WATER='dm01-083',BIG='dm01-s04',SEED='dmsd20-016';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const cast=(s,id)=>act(s,'play',a=>a.cardId===id);
const addShield=(s,p,id,faceUp=true)=>{
 const x={...inst(id),faceUp};
 s.players[p].shields.push(x);
 return x;
};
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};

test('Phase 663 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:663}));
  assert.throws(()=>standardCardSpec(detail,{phase:662}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].id=row.id;
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Steel grants Shield Saver only to its owner’s creatures while it is face up',()=>{
 const s=setup();
 give(s,0,'battle',[NATURE]);
 give(s,1,'battle',[NATURE,SEED]);
 const [enemy]=s.players[0].battle,[ally,seed]=s.players[1].battle;
 const steel=addShield(s,1,STEEL,false);
 assert.equal(e.shieldSaverSources(s,1).length,0);
 steel.faceUp=true;
 assert.deepEqual(e.shieldSaverSources(s,1).map(x=>x.uid),[ally.uid]);
 assert.ok(!e.effectiveCard(enemy,s).g401ShieldSaver);
 assert.ok(!e.effectiveCard(seed,s).g401ShieldSaver);
 assert.equal(e.card(STEEL).blocker,true);
 assert.equal(e.card(STEEL).breaker,2);
});

test('Steel saves the selected shield with an allied creature, leaving the other break unchanged',()=>{
 let s=setup();
 give(s,0,'battle',[BIG]);
 give(s,1,'battle',[NATURE]);
 give(s,1,'shields',[NATURE]);
 const steel=addShield(s,1,STEEL),[ordinary]=s.players[1].shields,[ally]=s.players[1].battle;
 attack(s);
 noBlock(s);
 assert.equal(s.decision?.type,'shieldGuard');
 s=JSON.parse(JSON.stringify(s));
 act(s,'saveShield',a=>a.uid===ally.uid&&a.shield===ordinary.uid);
 assert.ok(has(s.players[1].grave,ally.uid));
 assert.ok(has(s.players[1].grave,steel.uid));
 assert.deepEqual(s.players[1].shields.map(x=>x.uid),[ordinary.uid]);
});

test('Kaboo gets an untapped target with its own face-up Shield Go card and remains summoning sick',()=>{
 const s=setup();
 give(s,0,'battle',[KABOO]);
 give(s,1,'battle',[NATURE]);
 const [kaboo]=s.players[0].battle,[enemy]=s.players[1].battle;
 const cotton=addShield(s,0,COTTON,false);
 addShield(s,1,JET);
 addShield(s,0,WHITE);
 const legal=()=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===kaboo.uid&&a.target===enemy.uid);
 s.phase='attack';
 assert.equal(legal(),false);
 cotton.faceUp=true;
 kaboo.entered=s.turn;
 assert.equal(legal(),false);
 kaboo.entered=0;
 assert.equal(legal(),true);
 assert.equal(e.power(kaboo,false,s),2000);
 assert.equal(e.power(kaboo,true,s),5000);
 cotton.faceUp=false;
 assert.equal(legal(),false);
 enemy.tapped=true;
 assert.equal(legal(),true);
});

for(const n of [0,2])test('Soul’s Guide discards one then one per face-up physical Shield Go card: '+n,()=>{
 const s=setup();
 give(s,0,'hand',[SOUL]);
 give(s,1,'hand',[NATURE,FIRE,WATER,NATURE]);
 const root=addShield(s,0,COTTON,n>0);
 root.shieldStack=[{...inst(JET),faceUp:n>0},inst(COTTON),{...inst(WHITE),faceUp:true}];
 addShield(s,1,COTTON);
 const before=s.players[1].hand.map(x=>x.uid);
 cast(s,SOUL);
 assert.equal(s.players[1].hand.length,3-n);
 assert.equal(s.players[1].grave.length,1+n);
 assert.equal(new Set(s.players[1].grave.map(x=>x.uid)).size,1+n);
 assert.ok(s.players[1].grave.every(x=>before.includes(x.uid)));
 assert.equal(s.decision,null);
});

test('Soul’s Guide can finish with fewer cards than the number of required discards',()=>{
 const s=setup();
 give(s,0,'hand',[SOUL]);
 give(s,1,'hand',[NATURE,FIRE]);
 for(let i=0;i<3;i++)addShield(s,0,COTTON);
 cast(s,SOUL);
 assert.equal(s.players[1].hand.length,0);
 assert.equal(s.players[1].grave.length,2);
 assert.equal(s.decision,null);
});
