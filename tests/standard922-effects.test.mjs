import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const STINGER='dm01-057',REPRINT='dm18-071',WARP='dm14-084',BALAM='dm24-019';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const MULTI='dm10-068',CADDY='dm22rp1-049',CLAW='dm14-110',FRAME='dm15-008',EVO='dm10-017';
const BIRTH='dm24-108',FRAPPE='dm24-047',PEPPER='dmr04-054',LOCK='dmrp08-014',URANUS='dm15-022';
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const restore=s=>JSON.parse(JSON.stringify(s));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}
function put(s,p,z,id,attrs){
 const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;
}
function pick(s,value){
 act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===(value?.uid??value);});
}
function cross(s,gear,host){act(s,'crossGear',a=>a.uid===gear.uid&&a.target===host.uid);}
function attack(s,x){
 s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');
}
function orderBalam(s){
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===BALAM);
 assert.equal(s.decision?.task?.op,'g34_Offer');
 assert.equal(s.decision?.source,BALAM);
}

test('Phase 922 verifies four prints and both Stinger prints use the current wording under one original ID',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-922.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[STINGER,WARP,BALAM]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[[REPRINT,STINGER]]);
 assert.notEqual(m.cards[0].faces[0].abilityText,m.printAliases[0].faces[0].abilityText);
 assert.equal(e.card(STINGER).text,m.printAliases[0].faces[0].abilityText);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),original=m.cards.find(x=>x.id===id),[f]=row.faces;
  assert.equal(cat.get(row.id).id,id);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.ok(row.verification.facesMatched);
  const detail={...details.cards.find(c=>c.id===id),id:row.id,faces:row.faces};
  assert.deepEqual(standardCardSpec(detail,{phase:922}),original.spec);
  const changed=structuredClone(detail);changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:922}));
  for(const [key,value] of Object.entries(original.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   [id===WARP?'spell':'creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  const ref=refs.find(c=>c.id===row.id);
  assert.deepEqual([ref.canonicalId,ref.image],[id,row.image]);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(row.faces,details.cards.find(c=>c.id===id).faces);
   for(const source of [data,snapshot,details])
    assert.deepEqual(source.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  }
 }
 const deck={id:'phase922',name:'装備と墓地',cards:[REPRINT,WARP,BALAM,LIGHT,WATER,DARK,FIRE,NATURE,MULTI,CLAW]
  .map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

test('Stinger Worm can choose itself even while another friendly creature is present, but cannot decline',()=>{
 const s=field(1),other=put(s,1,'battle',FIRE),enemy=put(s,0,'battle',DARK);
 const x=play(s,STINGER);
 assert.equal(s.decision.player,1);
 assert.deepEqual(new Set(s.decision.choices.map(o=>o.value.uid)),new Set([x.uid,other.uid]));
 assert.ok(s.decision.choices.every(o=>o.value));
 pick(s,x);
 assert.ok(find(s,1,'grave',x)&&find(s,1,'battle',other)&&find(s,0,'battle',enemy));
});

test('Stinger Worm must destroy itself when alone and can choose a creature with a destruction replacement',()=>{
 for(const replacement of [false,true]){
  const s=field(),other=replacement?put(s,0,'battle',CADDY):null;
  const x=play(s,STINGER);
  pick(s,other??x);drain(s);
  if(replacement)assert.ok(find(s,0,'mana',other)&&find(s,0,'battle',x)&&!find(s,0,'grave',other));
  else assert.ok(find(s,0,'grave',x));
 }
});

test('Warp Rifle returns the selected gear and an unselectable wearer, without returning other gear',()=>{
 let s=field(1),host=put(s,1,'battle',WATER),chosen=play(s,CLAW),other=play(s,FRAME);
 cross(s,chosen,host);cross(s,other,host);
 s.active=0;
 const source=play(s,WARP),before=physical(s);
 assert.ok(s.decision.choices.some(o=>o.value===chosen.uid));
 assert.ok(!s.decision.choices.some(o=>o.value===host.uid));
 s=restore(s);pick(s,chosen);drain(s);
 assert.ok(find(s,1,'hand',chosen)&&find(s,1,'hand',host));
 assert.ok(find(s,1,'battle',other)&&!find(s,1,'battle',other).crossedTo);
 assert.ok(find(s,0,'grave',source));
 assert.deepEqual(physical(s),before);
});

test('Warp Rifle can select an unattached friendly gear, but cannot select a protected opposing gear',()=>{
 const s=field(1),host=put(s,1,'battle',URANUS),protectedGear=play(s,CLAW);
 cross(s,protectedGear,host);s.active=0;
 const own=play(s,FRAME),source=play(s,WARP);
 assert.deepEqual(s.decision.choices.map(o=>o.value),[own.uid]);
 pick(s,own);drain(s);
 assert.ok(find(s,0,'hand',own)&&find(s,0,'grave',source));
 assert.ok(find(s,1,'battle',protectedGear)&&find(s,1,'battle',host));
});

test('Warp Rifle follows a gear through evolution and does nothing when no gear can be chosen',()=>{
 const s=field(1),base=put(s,1,'battle',WATER),gear=play(s,CLAW);
 cross(s,gear,base);const evolved=play(s,EVO);
 act(s,'evolve',a=>a.baseUid===base.uid);drain(s);
 assert.equal(gear.crossedTo.uid,evolved.uid);
 s.active=0;play(s,WARP);pick(s,gear);drain(s);
 assert.ok([gear,evolved,base].every(x=>find(s,1,'hand',x)));
 const unused=play(s,WARP);
 assert.ok(find(s,0,'grave',unused));
 assert.equal(s.decision,null);
});

test('Balam offers each copy separately on a multicolor summon and follows the same grave visit through JSON',()=>{
 let s=field(),first=put(s,0,'grave',BALAM),second=put(s,0,'grave',BALAM),other=put(s,1,'grave',BALAM);
 const summon=play(s,MULTI),all=physical(s);
 orderBalam(s);
 const accepted=s.decision.task.uid===first.uid?first:second,declined=accepted===first?second:first;
 s=restore(s);
 pick(s,true);orderBalam(s);pick(s,null);drain(s);
 assert.ok(find(s,0,'hand',accepted)&&find(s,0,'grave',declined)&&find(s,1,'grave',other));
 assert.ok(find(s,0,'battle',summon));
 assert.deepEqual(physical(s),all);
});

test('Balam ignores monocolor summons even if the creature gains a second color on entry, and ignores deployments',()=>{
 const s=field(),x=put(s,0,'grave',BALAM);
 put(s,0,'battle',FRAPPE);const mono=play(s,LIGHT);
 assert.ok(e.civilizations(e.effectiveCard(mono,s)).includes('水'));
 assert.equal(s.decision,null);
 give(s,0,'deck',[MULTI,NATURE,NATURE]);
 const deployed=s.players[0].deck[0];
 play(s,BIRTH);pick(s,deployed);drain(s);
 assert.ok(find(s,0,'battle',deployed)&&find(s,0,'grave',x));
 assert.equal(s.decision,null);
});

test('A multicolor creature summoned as a shield trigger can recover Balam even on the opposing turn',()=>{
 const s=field(),x=put(s,1,'grave',BALAM),a=put(s,0,'battle',NATURE);
 give(s,1,'shields',[PEPPER]);
 const shield=s.players[1].shields[0];
 attack(s,a);act(s,'noBlock');act(s,'useTrigger',r=>r.uid===shield.uid);
 orderBalam(s);pick(s,true);drain(s);
 assert.equal(s.active,0);
 assert.ok(find(s,1,'battle',shield)&&find(s,1,'hand',x));
 assert.ok(s.players[1].mana.every(y=>!y.tapped));
});

test('Balam cannot leave a locked graveyard, still charges untapped as one mana and breaks two shields',()=>{
 const s=field(),x=put(s,0,'grave',BALAM);put(s,1,'battle',LOCK);
 play(s,MULTI);drain(s);
 assert.ok(find(s,0,'grave',x));assert.equal(s.decision,null);
 const charge=put(s,0,'hand',BALAM);
 s.phase='charge';act(s,'charge',a=>a.uid===charge.uid);
 assert.ok(find(s,0,'mana',charge)&&!charge.tapped);assert.equal(e.card(BALAM).manaValue,1);
 const body=put(s,0,'battle',BALAM);
 attack(s,body);act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Stinger’s mandatory entry destruction is ignored under Genmu',()=>{
 const s=field();put(s,1,'battle',GEN);
 const x=play(s,STINGER);drain(s);
 assert.ok(find(s,0,'battle',x));assert.equal(s.decision,null);
});
