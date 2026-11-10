import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-805.json',import.meta.url)));
const RALFAS="dm25-042",PLATOON="dm24-073",SUN="dm25-037";
const FIRE="dm01-097",LIGHT="dm01-075",WATER="dm01-083",ZERO="dmrp07-001";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 805 definitions preserve their canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:805}));
  assert.throws(()=>standardCardSpec(detail,{phase:804}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:805}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Platoon promo resolves to its canonical supported deck card',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(printAliases.length,1);
 for(const print of printAliases){
  assert.equal(print.verification.facesMatched,true);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:805}),cards.find(x=>x.id===print.canonicalId).spec);
  assert.equal(regulationVerification.limits[print.id],e.card(print.canonicalId).limit);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,print.canonicalId);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const civs=(s,x)=>e.civilizations(e.effectiveCard(x,s));
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
function addColor(s,ralfas,target,color){
 s.phase='attack';
 act(s,'tapAbility',a=>a.uid===ralfas.uid);
 pick(s,target.uid);
 pick(s,color);
 drain(s);
}

for(const [id,color,want] of [[WATER,'自然',['水','自然']],[ZERO,'火',['火']],[FIRE,'火',['火']]]){
 test('Ralfas adds a chosen civilization through the current turn '+id+' '+color,()=>{
  let s=setup();
  const source=put(s,0,'battle',RALFAS),target=put(s,0,'battle',id),enemy=put(s,1,'battle',FIRE);
  const before=civs(s,target);
  s.phase='attack';
  act(s,'tapAbility',a=>a.uid===source.uid);
  assert.ok(source.tapped);
  assert.ok(choices(s).includes(source.uid)&&choices(s).includes(target.uid)&&!choices(s).includes(enemy.uid));
  pick(s,target.uid);
  assert.deepEqual(choices(s),['光','水','闇','火','自然']);
  s=JSON.parse(JSON.stringify(s));
  pick(s,color);
  const actual=s.players[0].battle.find(x=>x.uid===target.uid);
  assert.deepEqual(civs(s,actual),want);
  assert.ok(!s.attack);
  end(s);
  assert.deepEqual(civs(s,actual),before);
  assert.ok(!s.extLimits.some(x=>x.kind==='g805BattleColor'));
 });
}

test('Ralfas follows the creature through evolution and grants do not follow a card that leaves and returns',()=>{
 const s=setup();
 const source=put(s,0,'battle',RALFAS),target=put(s,0,'battle',WATER);
 addColor(s,source,target,'火');
 s.phase='main';
 const evo=put(s,0,'hand','dmr16g-021');
 play(s,evo);
 act(s,'evolve',a=>a.baseUid===target.uid);
 drain(s);
 const current=s.players[0].battle.find(x=>x.uid===evo.uid);
 assert.deepEqual(civs(s,current),['水','火']);
 s.phase='main';
 s.extTasks=[{op:'g34_ExactMove',p:0,source:RALFAS,owner:0,target:current.uid,to:'hand'}];
 act(s,'toAttack');
 drain(s);
 assert.ok(has(s,0,'hand',target));
 assert.deepEqual(e.civilizations(e.zoneCard(s,0,target,'hand')),['水']);
 s.phase='main';
 play(s,target);
 drain(s);
 assert.deepEqual(civs(s,s.players[0].battle.find(x=>x.uid===target.uid)),['水']);
});

test('Ralfas needs a legal unforced attack',()=>{
 const s=setup(),source=put(s,0,'battle',RALFAS),force=put(s,1,'battle','dmrp05-026');
 s.phase='attack';
 const ready=()=>e.getLegalActions(s).some(a=>a.kind==='tapAbility'&&a.uid===source.uid);
 assert.ok(ready());
 force.tapped=true;
 assert.ok(!ready());
 force.tapped=false;
 source.entered=s.turn;
 assert.ok(!ready());
});

test('Platoon taps both sides for any additional civilization while sparing the chosen mono and colorless',()=>{
 const s=setup(),source=put(s,0,'hand',PLATOON);
 const ally=put(s,0,'battle',FIRE),same=put(s,0,'battle',LIGHT),multi=put(s,1,'battle','dmrp13-084');
 const zero=put(s,1,'battle',ZERO),enemy=put(s,1,'battle',WATER),sealed=put(s,1,'battle',FIRE);
 const gear=put(s,1,'battle','dm23ex1-024');
 s.players[1].seals=[{...inst(LIGHT),sealOf:sealed.uid}];
 play(s,source);
 assert.deepEqual(choices(s),['光','水','闇','火','自然']);
 pick(s,'光');
 drain(s);
 assert.ok(ally.tapped&&multi.tapped&&enemy.tapped);
 assert.ok(!same.tapped&&!source.tapped&&!zero.tapped&&!sealed.tapped&&!gear.tapped);
});

test('Platoon may tap itself when it chooses a different civilization',()=>{
 const s=setup(),source=put(s,0,'hand',PLATOON);
 play(s,source);
 pick(s,'自然');
 drain(s);
 assert.ok(s.players[0].battle.find(x=>x.uid===source.uid).tapped);
});

test('Sun of Thunder gains 4000 only while the opposing battle zone has no multicolor cards',()=>{
 const s=setup(),source=put(s,0,'battle',SUN);
 const ally=put(s,0,'battle','dmrp13-084'),mono=put(s,1,'battle',WATER);
 put(s,1,'mana','dmrp13-084');
 assert.equal(e.power(source,false,s),7000);
 const gear=put(s,1,'battle','dm23ex1-024');
 assert.equal(e.power(source,false,s),3000);
 gear.sealed=true;
 assert.equal(e.power(source,false,s),7000);
 const other=put(s,1,'battle','dmrp13-084');
 assert.equal(e.power(source,false,s),3000);
 s.players[1].battle=s.players[1].battle.filter(x=>x!==other);
 assert.equal(e.power(source,false,s),7000);
 s.active=1;
 const ralfas=put(s,1,'battle',RALFAS);
 s.players[1].seals=[{...inst(LIGHT),sealOf:gear.uid}];
 addColor(s,ralfas,mono,'闇');
 assert.equal(e.power(source,false,s),3000);
 end(s);
 assert.equal(e.power(source,false,s),7000);
 assert.ok(has(s,0,'battle',ally));
});

test('Sun of Thunder retains its blocker and cannot attack the opponent directly',()=>{
 const s=setup(),source=put(s,0,'battle',SUN),enemy=put(s,1,'battle',FIRE);
 s.phase='attack';
 enemy.tapped=true;
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===source.uid).map(a=>a.target),[enemy.uid]);
 enemy.tapped=false;
 s.active=1;
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===source.uid);
 drain(s);
 assert.ok(has(s,0,'battle',source)&&has(s,1,'grave',enemy));
});

test('Ralfas changes how an affected creature is classified by single-color ability suppression',()=>{
 const s=setup(),source=put(s,0,'battle',RALFAS),blocker=put(s,0,'battle','dm01-084');
 addColor(s,source,blocker,'光');
 put(s,1,'battle','dm26ex4-017');
 assert.equal(e.effectiveCard(blocker,s).blocker,true);
 end(s);
 assert.equal(!!e.effectiveCard(blocker,s).blocker,false);
});
