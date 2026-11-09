import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-736.json',import.meta.url)));

test('Phase 736 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:736}));
  assert.throws(()=>standardCardSpec(detail,{phase:735}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:736}));
 }
});
const GREED='dm09-055',TOTEM='dm09-005',GIJO='dm09-031';
const BEAST='dm01-108',OTHER='dm01-083',DRAGON='dm01-s08',TWIN='dmex17-020';
const T_BREAKER='dm23ex1-021',NIN='dmrp22-033';
const field=(active=0)=>Object.assign(setup(),{active});
const restore=s=>JSON.parse(JSON.stringify(s));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);
const offered=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
function put(s,p,id,zone='battle',attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,face=0){
 const x=put(s,s.active,id,'hand');
 act(s,'play',a=>a.uid===x.uid&&!a.alternative&&(a.face??0)===face);
 return x;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}
const actions=(s,kind,x)=>e.getLegalActions(s).filter(a=>a.kind===kind&&(!x||a.uid===x.uid));

test('Greed chooses only matching hand creature faces and moves selected cards together after restore',()=>{
 let s=field();
 const mono=put(s,0,DRAGON,'hand'),multi=put(s,0,TWIN,'hand');
 const unrelated=put(s,0,BEAST,'hand'),spell=put(s,0,'dm01-027','hand');
 put(s,1,DRAGON,'hand');
 put(s,1,NIN);
 const source=play(s,GREED);
 pick(s,'ドラゴン');
 assert.deepEqual(new Set(offered(s)),new Set([mono.uid,multi.uid,null]));
 pick(s,multi.uid);
 assert.ok(has(s,0,'hand',multi)&&!has(s,0,'mana',multi));
 s=restore(s);
 pick(s,mono.uid);
 drain(s);
 assert.ok(has(s,0,'hand',unrelated)&&has(s,0,'hand',spell)&&has(s,0,'grave',source));
 const mana=s.players[0].mana;
 assert.equal(mana.find(y=>y.uid===multi.uid).tapped,true);
 assert.equal(mana.find(y=>y.uid===mono.uid).tapped,false);
});

test('Greed can decline its matching cards or name a race absent from hand and battle',()=>{
 for(const race of ['ビーストフォーク','リキッド・ピープル']){
  const s=field(),x=put(s,0,BEAST,'hand');
  const source=play(s,GREED);
  pick(s,race);
  if(race==='ビーストフォーク')pick(s,null);
  drain(s);
  assert.ok(has(s,0,'hand',x)&&has(s,0,'grave',source));
 }
});

test('Totem only triggers on another friendly creature and boosts all current Beast Folk once per entry',()=>{
 const s=field(),ally=put(s,0,BEAST),enemy=put(s,1,BEAST),other=put(s,0,OTHER);
 const source=play(s,TOTEM);
 drain(s);
 assert.equal(e.power(ally,false,s),2000);
 const arriving=play(s,BEAST);
 drain(s);
 assert.equal(e.power(arriving,false,s),4000);
 play(s,OTHER);
 drain(s);
 for(const x of [ally,enemy,arriving]){
  assert.equal(e.power(x,false,s),6000);
  assert.equal(e.effectiveCard(x,s).breaker,2);
 }
 assert.equal(e.power(other,false,s),1000);
 assert.equal(e.power(source,false,s),4000);
 const later=put(s,1,BEAST);
 assert.equal(e.power(later,false,s),2000);
 end(s);
 assert.equal(e.power(ally,false,s),2000);
 act(s,'skipCharge');
 play(s,BEAST);
 drain(s);
 assert.equal(e.power(enemy,false,s),2000);
});

test('Totem lets a Beast Folk with T-Breaker choose the granted W-Breaker during a real attack',()=>{
 const s=field(),attacker=put(s,0,T_BREAKER);
 put(s,0,TOTEM);
 play(s,OTHER);
 drain(s);
 assert.deepEqual(e.effectiveCard(attacker,s).g633BreakerChoices,[2,3]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_GrantedBreaker633');
 pick(s,2);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Gijo replaces its own attack, grants attack power and requires only matching legal attacks',()=>{
 let s=field();
 const source=put(s,0,GIJO),ally=put(s,0,BEAST),enemy=put(s,1,BEAST),other=put(s,0,OTHER);
 const sick=put(s,0,BEAST,'battle',{entered:s.turn});
 s.phase='attack';
 act(s,'tapAbility',a=>a.uid===source.uid);
 assert.ok(!s.attack);
 assert.equal(source.tapped,true);
 s=restore(s);
 pick(s,'ビーストフォーク');
 drain(s);
 const get=(p,x)=>s.players[p].battle.find(y=>y.uid===x.uid);
 assert.equal(e.power(get(0,ally),true,s),6000);
 assert.equal(e.power(get(0,ally),false,s),2000);
 assert.equal(e.effectiveCard(get(1,enemy),s).attackBonus,4000);
 assert.ok(!e.effectiveCard(get(0,other),s).mustAttack);
 assert.ok(!actions(s,'attack',sick).length&&!actions(s,'endTurn').length);
 attack(s,ally.uid);
 act(s,'noBlock');
 drain(s);
 end(s);
 assert.ok(!e.effectiveCard(get(1,enemy),s).mustAttack);
 assert.equal(e.power(get(1,enemy),true,s),2000);
});

test('Gijo cannot be used while summoning sick or to evade another Gijo obligation',()=>{
 const s=field(),first=put(s,0,GIJO),second=put(s,0,GIJO);
 const sick=put(s,0,GIJO,'battle',{entered:s.turn});
 s.phase='attack';
 assert.ok(!actions(s,'tapAbility',sick).length);
 act(s,'tapAbility',a=>a.uid===first.uid);
 pick(s,'ゼノパーツ');
 assert.ok(!actions(s,'tapAbility',second).length);
 assert.ok(actions(s,'attack',second).length&&!actions(s,'endTurn').length);
 attack(s,second.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 assert.equal(actions(s,'endTurn').length,1);
});


test('Gijo cannot replace an attack when it has no legal target',()=>{
 const s=field(),source=put(s,0,GIJO);
 s.phase='attack';
 s.extLimits=[{kind:'g567PlayerStop',ref:{uid:source.uid,incarnation:0},controller:1,spellCost:6,expires:'end',who:0}];
 assert.ok(!actions(s,'attack',source).length&&!actions(s,'tapAbility',source).length);
 put(s,1,OTHER,'battle',{tapped:true});
 assert.ok(actions(s,'attack',source).length&&actions(s,'tapAbility',source).length);
});

test('Totem reprint preserves saved deck quantities and its verified artwork without a separate battle card',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-736.json',import.meta.url)));
 const [reprint]=manifest.printAliases;
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 assert.equal(reprint.id,'dm18-015');
 assert.equal(reprint.canonicalId,TOTEM);
 assert.equal(canonicalCardName(reprint.name),'鼓舞の化身');
 assert.equal(catalogue.get(reprint.id).id,TOTEM);
 assert.equal(data.cards.some(c=>c.id===reprint.id),false);
 assert.deepEqual(catalogue.resolveRows([{id:reprint.id,count:3},{id:TOTEM,count:1}]),[{id:TOTEM,count:4}]);
 assert.deepEqual(details.printAliases.find(c=>c.id===reprint.id).faces,reprint.faces);
 assert.equal(refs.prints.find(c=>c.id===reprint.id).image,reprint.image);
 assert.ok(reprint.verification.facesMatched);
});
