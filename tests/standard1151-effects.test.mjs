import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MODES='dmd31-002',SANDBOX='dmx12a-018',GUNAM='dmex06-025',REPRINT='dmex13-012';
const NATURE='dm01-108',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097';
const TRIGGER='dmrp04m-051',LEGACY_MULTI='dmr02-054',DARK_TWIN='dm22ex2-070';
function add(s,p,zone,id,attrs={}){
 const card=Object.assign(inst(id),attrs);
 s.players[p][zone].push(card);
 return card;
}
const value=c=>c.value?.uid??c.value;
const options=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

test('three canonical cards and the Gunam reprint match official faces, images and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1151.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[MODES,SANDBOX,GUNAM]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[[REPRINT,GUNAM]]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1151}),row.spec);
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  assert.equal(c.cost,f.cost);
  assert.equal(c.power,Number(f.powerText));
  assert.deepEqual(c.civilizations,f.civilizations);
  assert.equal(c.limit,4);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.equal(c.manaValue,1);
  assert.equal(catalogue.get(row.id).id,row.id);
  assert.equal(catalogue.byName.get(nameKey(row.name)).id,row.id);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
 const reprint=m.printAliases[0];
 assert.deepEqual(standardCardSpec({...reprint,status:'complete'},{phase:1151}),m.cards[2].spec);
 assert.equal(catalogue.get(REPRINT).id,GUNAM);
 assert.deepEqual(catalogue.resolveRows([{id:GUNAM,count:1},{id:REPRINT,count:2}]),[{id:GUNAM,count:3}]);
});

test('Modes can deploy one eligible dark or fire creature, including a Twinpact creature face',()=>{
 const s=setup();
 give(s,0,'grave',[DARK,FIRE,DARK_TWIN,WATER,'dm01-027','dmr14-012']);
 give(s,1,'grave',[DARK]);
 const [dark,fire,twin,...excluded]=s.players[0].grave;
 cast(s,MODES);
 assert.deepEqual(new Set(options(s)),new Set([dark.uid,fire.uid,twin.uid,null]));
 pick(s,twin.uid);drain(s);
 assert.ok(s.players[0].battle.includes(twin));
 assert.ok([dark,fire,...excluded].every(x=>s.players[0].grave.includes(x)));
 assert.equal(s.players[1].grave.length,1);
});

test('Modes can deploy again on attack and may decline either trigger',()=>{
 const s=setup(),first=add(s,0,'grave',DARK),second=add(s,0,'grave',FIRE);
 const mode=add(s,0,'hand',MODES);
 act(s,'play',a=>a.uid===mode.uid);
 pick(s,null);
 assert.deepEqual(s.players[0].grave,[first,second]);
 s.turn++;
 attack(s,mode.uid);
 pick(s,second.uid);drain(s);
 assert.ok(s.players[0].battle.includes(second));
 assert.deepEqual(s.players[0].grave,[first]);
});

test('Modes has no grave deployment when Apul forbids leaving the graveyard',()=>{
 const s=setup(),x=add(s,0,'grave',DARK);
 add(s,1,'battle','dmrp22-042');
 cast(s,MODES);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].grave.includes(x));
});

test('Sunabao can deploy two creatures with no printed abilities, including old mana reminder text',()=>{
 const s=setup();
 give(s,0,'grave',[DARK,LEGACY_MULTI,FIRE,TRIGGER,'dm01-027']);
 give(s,1,'grave',[DARK]);
 const [dark,multi,fire,trigger,spell]=s.players[0].grave;
 cast(s,SANDBOX);
 assert.deepEqual(new Set(options(s)),new Set([dark.uid,multi.uid,fire.uid,null]));
 pick(s,multi.uid);pick(s,dark.uid);drain(s);
 assert.ok(s.players[0].battle.includes(multi)&&s.players[0].battle.includes(dark));
 assert.deepEqual(s.players[0].grave,[fire,trigger,spell]);
 assert.equal(s.players[1].grave.length,1);
});

test('Sunabao may stop after zero or one eligible creature',()=>{
 for(const n of [0,1]){
  const s=setup(),a=add(s,0,'grave',DARK),b=add(s,0,'grave',FIRE);
  cast(s,SANDBOX);
  if(n)pick(s,a.uid);
  pick(s,null);drain(s);
  assert.equal(s.players[0].battle.includes(a),n===1);
  assert.ok(s.players[0].grave.includes(b));
 }
});

test('Gunam destroys only the opponent’s unpaid creature while that opponent is the turn player',()=>{
 const s=setup(),watcher=add(s,1,'battle',GUNAM);
 const paid=add(s,0,'hand',DARK),free=add(s,0,'grave',FIRE);
 act(s,'play',a=>a.uid===paid.uid);
 cast(s,MODES);pick(s,free.uid);drain(s);
 assert.ok(s.players[0].battle.includes(paid));
 assert.ok(s.players[0].grave.includes(free));
 assert.ok(s.players[1].battle.includes(watcher));
});

test('Gunam allows a defensive Shield Trigger summon during its own turn',()=>{
 const s=setup(),watcher=add(s,0,'battle',GUNAM);
 give(s,1,'shields',[TRIGGER]);
 attack(s,watcher.uid);act(s,'noBlock');act(s,'useTrigger');drain(s);
 assert.ok(s.players[1].battle.some(x=>x.cardId===TRIGGER));
});

test('Gunam does not destroy its controller’s own unpaid creature and loses the ability while ignored',()=>{
 for(const isAlly of [false,true]){
  const s=setup(),free=add(s,0,'grave',FIRE);
  add(s,isAlly?0:1,'battle',GUNAM);
  if(!isAlly){
   const gunam=s.players[1].battle[0];
   gunam.g35Ignored=s.turn;
   assert.equal(e.effectiveCard(gunam,s).g601UnpaidDestroy,undefined);
  }
  cast(s,MODES);pick(s,free.uid);drain(s);
  assert.ok(s.players[0].battle.includes(free));
 }
});
