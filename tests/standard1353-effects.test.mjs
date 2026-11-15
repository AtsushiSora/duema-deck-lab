import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CODE='dmrp11-m02',ZAHA='dmrp11-s06',WORLD='dmex12-011',DRAW='dm06-085',
 GR='dmsd11-014',ALT_GR='dmrp09-m01',BASIC='dm01-108';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(){
 const s=Object.assign(setup(),{active:0,format:'advance'});
 for(const p of [0,1]){
  give(s,p,'deck',Array(24).fill(BASIC));
  for(const zone of ['gr','extra','seals'])s.players[p][zone]=[];
 }
 return s;
}
function add(s,p,zone,id){
 const x={...inst(id),cardOwner:p};
 s.players[p][zone].push(x);
 return x;
}
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const end=s=>{s.phase='attack';act(s,'endTurn');};
function attach(s,host,id=CODE){
 const aura=add(s,0,'hand',id);
 act(s,'play',a=>a.uid===aura.uid);
 act(s,'attachAura1352',a=>a.uid===host.uid);
 return aura;
}

test('the two verified prints of Code:1059 resolve to one card',()=>{
 const manifest=read('tools/support-phase-1353.json'),registry=createCatalogue(snapshot,data.cards,details);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1353}),manifest.cards[0].spec);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:CODE,count:1}]);
 }
 const code=e.card(CODE);
 assert.equal(code.auraPower,4000);
 assert.equal(CARD_IMAGES[CODE],manifest.cards[0].image);
 assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(code.name)).length,1);
});

for(const newGR of [false,true])test('Dragon World attaches the milled Dragon aura without casting it: '+newGR,()=>{
 const s=field(),host=add(s,0,newGR?'gr':'battle',ALT_GR);
 cast(s,WORLD);
 give(s,0,'deck',[CODE,...Array(12).fill(BASIC)]);
 const code=s.players[0].deck[0];
 end(s);end(s);
 assert.ok(inZone(s,0,'grave',code));
 pick(s,true);
 assert.equal(s.decision.type,'aura1352');
 act(s,newGR?'grAura1352':'attachAura1352',a=>newGR||a.uid===host.uid);
 assert.ok(inZone(s,0,'battle',host));
 assert.ok(inZone(s,0,'battle',code));
 assert.equal(code.auraTo1352.uid,host.uid);
 assert.equal(s.metrics[0].played[CODE],undefined);
 assert.equal(e.power(host,false,s),7000);
 assert.equal(e.effectiveCard(host,s).breaker,2);
});

test('DL-Sys casts only an opponent graveyard spell and lets it finish before changing hosts',()=>{
 const s=field(),host=add(s,0,'battle',GR),alt=add(s,0,'battle',ALT_GR);
 const aura=attach(s,host),incarnation=aura.incarnation;
 const spell=add(s,1,'grave',DRAW),ownSpell=add(s,0,'grave',DRAW);
 const deck=s.players[0].deck.length,tapped=s.players[0].mana.filter(x=>x.tapped).length;
 attack(s,host.uid);drainUntil(s,'g34_GraveSpell594');
 assert.deepEqual(values(s),[spell.uid,null]);
 pick(s,spell.uid);
 assert.equal(s.players[1].deck.at(-1).uid,spell.uid);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.ok(inZone(s,0,'grave',ownSpell));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,tapped);
 assert.equal(aura.auraTo1352.uid,host.uid);
 assert.deepEqual(values(s),[alt.uid,null]);
 pick(s,alt.uid);
 assert.equal(aura.auraTo1352.uid,alt.uid);
 assert.equal(aura.incarnation,incarnation);
 assert.equal(e.power(host,false,s),2000);
 assert.equal(e.power(alt,false,s),7000);
});

test('DL-Sys respects the spell’s own Charger destination, then offers to reattach',()=>{
 const s=field(),host=add(s,0,'battle',GR),alt=add(s,0,'battle',ALT_GR);
 const aura=attach(s,host),charger=add(s,1,'grave','dm08-043');
 attack(s,host.uid);drainUntil(s,'g34_GraveSpell594');
 pick(s,charger.uid);
 assert.ok(inZone(s,1,'mana',charger));
 assert.ok(!inZone(s,0,'mana',charger)&&!inZone(s,1,'deck',charger));
 assert.deepEqual(values(s),[alt.uid,null]);
 pick(s,null);
 assert.equal(aura.auraTo1352.uid,host.uid);
});

test('QA32340 permits a new host when there is no spell, and Zaha sees the attachment',()=>{
 const s=field(),host=add(s,0,'battle',GR),alt=add(s,0,'battle',ALT_GR);
 attach(s,alt,ZAHA);pick(s,0);
 const aura=attach(s,host);pick(s,0);
 attack(s,host.uid);drainUntil(s,'g34_AuraReattach1353');
 assert.deepEqual(values(s),[alt.uid,null]);
 pick(s,alt.uid);
 const deck=s.players[0].deck.length;
 pick(s,1);
 assert.equal(aura.auraTo1352.uid,alt.uid);
 assert.equal(s.players[0].deck.length,deck-1);
});

test('Code:1059 GR summons at the end of its controller’s turn',()=>{
 const s=field(),host=add(s,0,'battle',GR),gr=add(s,0,'gr',ALT_GR);
 attach(s,host);
 end(s);drain(s);
 assert.ok(inZone(s,0,'battle',gr));
 assert.ok(!inZone(s,0,'gr',gr));
});

function drainUntil(s,op){
 for(let n=0;s.decision?.task?.op!==op&&s.decision;n++){
  assert.ok(n<30);
  e.step(s,e.chooseAI(s));
 }
 assert.equal(s.decision?.task?.op,op);
}
