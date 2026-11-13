import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const HON='dmrp08-058',TOPAS='dmr20-050',YUKI='dm25-028';
const FIRE='dm01-097',WATER='dm01-083',NATURE='dm01-108';
const MULTI='dm24ex2-019',TAPPER='dmex17-102',GATE='dm26rp1-S008';
const DESTROY='dm01-027',BOUNCE='dm01-086',FIGHT='dmrp19-085',RAMP='dm06-110';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const put=(s,p,z,id,fields={})=>{const x=Object.assign(inst(id),fields);s.players[p][z].push(x);return x;};
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const attacks=(s,x)=>new Set(legal(s,'attack').filter(a=>a.uid===x.uid).map(a=>a.target));
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));return s;};
const fixedPower=n=>({powerModifiers:[{fixedPower:n,expires:'end',who:0}]});
const target=(s,x)=>act(s,'effect',a=>a.targets[0]?.uid===x.uid);
const pick=(s,x)=>act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===x.uid);
const charge=(s,id)=>{
 s.phase='charge';
 const x=put(s,0,'hand',id);
 act(s,'charge',a=>a.uid===x.uid);
 return x;
};

test('phase 1157 matches three official definitions and the Yukigon promo alias',()=>{
 const m=read('tools/support-phase-1157.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[HON,TOPAS,YUKI]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['promoy6-018',YUKI]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1157}),row.spec);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   ['creature',f.cost,parseInt(f.powerText,10),f.civilizations.filter(color=>color!=='無色'),f.race,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1157}));
 }
});

test('Honyaku limits only its own declared attack to the legal 2222-or-less targets',()=>{
 const s=field(),hon=put(s,0,'battle',HON),ally=put(s,0,'battle',FIRE);
 const low=put(s,1,'battle',FIRE,{tapped:true,...fixedPower(2222)});
 const high=put(s,1,'battle',FIRE,{tapped:true,...fixedPower(2223)});
 put(s,1,'battle',WATER);
 s.phase='attack';
 assert.deepEqual(attacks(s,hon),new Set([low.uid]));
 assert.ok(attacks(s,ally).has('player'));
 assert.equal(legal(s,'endTurn').length,1);
 low.tapped=false;
 assert.deepEqual(attacks(s,hon),new Set(['player',high.uid]));
});

test('Honyaku leaves alternatives when two attack requirements conflict',()=>{
 const s=field(),hon=put(s,0,'battle',HON);
 const lure=put(s,1,'battle','dmrp05-026',{tapped:true,...fixedPower(4000)});
 const low=put(s,1,'battle',WATER,{tapped:true});
 const common=put(s,1,'battle','dmrp05-026',{tapped:true,...fixedPower(2222)});
 s.phase='attack';
 assert.deepEqual(attacks(s,hon),new Set([common.uid]));
 s.players[1].battle.pop();
 assert.deepEqual(attacks(s,hon),new Set([lure.uid,low.uid]));
});

test('Honyaku does not restrict an attack while its abilities are ignored',()=>{
 const s=field(),hon=put(s,0,'battle',HON);
 const low=put(s,1,'battle',WATER,{tapped:true});
 put(s,1,'battle','dmrp15-km1');
 s.phase='attack';
 assert.deepEqual(attacks(s,hon),new Set(['player',low.uid]));
});

test('Topas can prevent destruction by putting exactly the selected copy into play',()=>{
 const s=field(),original=put(s,1,'battle',TOPAS,{tapped:true});
 const first=put(s,1,'hand',TOPAS),second=put(s,1,'hand',TOPAS);
 put(s,1,'hand',WATER);
 cast(s,DESTROY);target(s,original);
 assert.deepEqual(legal(s,'handSave1157').map(x=>x.uid),[first.uid,second.uid]);
 act(s,'handSave1157',a=>a.uid===second.uid);
 assert.deepEqual(s.players[1].battle,[original,second]);
 assert.equal(original.tapped,true);
 assert.equal(second.entered,s.turn);
 assert.equal(second.summonedTurn,undefined);
 assert.ok(s.players[1].hand.includes(first)&&!s.players[1].grave.length);
});

test('Topas may decline, cannot replace an ordinary bounce, and needs a legal entry',()=>{
 for(const mode of ['decline','bounce','empty','entryGate']){
  const s=field(),original=put(s,1,'battle',TOPAS);
  if(mode!=='empty')put(s,1,'hand',TOPAS);
  if(mode==='entryGate')put(s,0,'battle',GATE);
  cast(s,mode==='bounce'?BOUNCE:DESTROY);target(s,original);
  if(mode==='decline')act(s,'allowLeave');
  assert.equal(s.decision,null);
  assert.ok(s.players[1][mode==='bounce'?'hand':'grave'].includes(original));
 }
});

test('Topas entering as a replacement bypasses another entry replacement (QA42990)',()=>{
 const s=field(),original=put(s,0,'battle',TOPAS),backup=put(s,0,'hand',TOPAS);
 put(s,1,'battle','dmr20-066');
 give(s,0,'mana',['dm01-075','dm01-097']);
 s.active=1;
 cast(s,DESTROY);target(s,original);
 act(s,'handSave1157',a=>a.uid===backup.uid);
 assert.deepEqual(s.players[0].battle,[original,backup]);
 assert.equal(s.players[0].mana.length,2);
});

test('Topas replacements cannot reserve the same card for two simultaneous losses',()=>{
 const s=field(),one=put(s,0,'battle',TOPAS),two=put(s,0,'battle',TOPAS);
 const backup=put(s,0,'hand',TOPAS);
 cast(s,FIGHT);pick(s,one);pick(s,two);
 assert.equal(legal(s,'handSave1157').length,1);
 act(s,'handSave1157',a=>a.uid===backup.uid);
 drain(s);
 assert.ok(s.players[0].battle.includes(one)&&s.players[0].battle.includes(backup));
 assert.deepEqual(s.players[0].grave.filter(x=>x.cardId===TOPAS),[two]);
});

test('Yukigon applies before opposing tap placement (QA41196), including a hand charge',()=>{
 const s=field();
 put(s,0,'battle',YUKI);
 assert.equal(charge(s,MULTI).tapped,false);
 assert.equal(charge(s,NATURE).tapped,false);
 put(s,1,'battle',TAPPER);
 assert.equal(charge(s,MULTI).tapped,true);
 assert.equal(charge(s,NATURE).tapped,true);
});

test('Yukigon works on effect placement and a sealed source does not apply',()=>{
 const s=field(),yuki=put(s,0,'battle',YUKI);
 give(s,0,'deck',[MULTI,...Array(10).fill(NATURE)]);
 const top=s.players[0].deck[0];
 cast(s,RAMP);
 assert.ok(s.players[0].mana.includes(top)&&!top.tapped);
 const seal=put(s,0,'seals',FIRE,{faceDown:true,sealOf:yuki.uid});
 yuki.sealed=true;
 assert.equal(charge(s,MULTI).tapped,true);
 assert.ok(s.players[0].seals.includes(seal));
});
