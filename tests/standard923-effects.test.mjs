import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const FIST='dm20-001',JAMOUR='dm24-056',ISOPP='dm24-010';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const GONTA='dm10-068',HERO='dmr02-049',MECHA='dm28-073',MAGMA='dmr18-s07';
const PIT='dm01-027',BOUNCE='dm01-086',GEAR='dm14-110',SIMBO='dmx22b-090',PIRUDORU='dm32-096',TACO='dm37-025';
const SEVEN='dm03-015',EIGHT='dmex14-019';
const NATURE_TWIN='dmrp10-059',LIGHT_TWIN='dm22ex1-098';
const put=(s,p,z,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,v)=>act(s,'extended',a=>{const row=s.decision.choices[a.choice].value;return (row?.uid??row)===(v?.uid??v);});
const picks=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const end=s=>{s.phase='attack';act(s,'endTurn');};
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}
function breakTwo(s,x){
 const count=s.players[1-s.active].shields.length;
 s.phase='attack';
 act(s,'attack',a=>a.uid===x.uid&&a.target==='player');
 drain(s);
 assert.equal(s.players[1-s.active].shields.length,count-2);
}

test('Phase 923 enables exactly three verified original IDs with their full definitions and artwork',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-923.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[FIST,JAMOUR,ISOPP]);
 assert.deepEqual(m.printAliases,[]);
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of m.cards){
  const [f]=row.faces,c=e.card(row.id),detail=details.cards.find(x=>x.id===row.id);
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:923}),row.spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:923}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(row.id).id,row.id);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
 }
 const deck={id:'phase923',name:'3種類の検証',cards:[FIST,JAMOUR,ISOPP,LIGHT,WATER,DARK,FIRE,NATURE,HERO,MECHA].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

test('Knuckle Fist untaps friendly creatures for each qualifying ally in a simultaneous destruction',()=>{
 const s=field();s.active=1;
 const fist=put(s,0,'battle',FIST,{tapped:true}),ally=put(s,0,'battle',SEVEN,{tapped:true});
 const hero=put(s,0,'battle',HERO),mecha=put(s,0,'battle',MECHA);
 const opponent=put(s,1,'battle',SEVEN,{tapped:true}),mana=put(s,0,'mana',FIRE,{tapped:true});
 play(s,MAGMA);
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.pendingEffects.filter(x=>x.source===FIST).length,2);
 drain(s);
 assert.ok(find(s,0,'grave',hero)&&find(s,0,'grave',mecha));
 assert.ok(!fist.tapped&&!ally.tapped&&opponent.tapped&&mana.tapped);
 s.active=0;
 breakTwo(s,fist);
});

test('Knuckle Fist sees only itself when it and another matching ally are destroyed together',()=>{
 const s=field();s.active=1;
 const fist=put(s,0,'battle',FIST,{powerModifiers:[{amount:-2000}]}),hero=put(s,0,'battle',HERO);
 const survivor=put(s,0,'battle',SEVEN,{tapped:true});
 play(s,MAGMA);
 assert.ok(find(s,0,'grave',fist)&&find(s,0,'grave',hero));
 assert.equal(s.decision,null);
 assert.equal(survivor.tapped,false);
});

test('Knuckle Fist ignores opponent deaths, other races, returns and destruction replacements',()=>{
 for(const scenario of ['opponent','race','return','replacement']){
  const s=field();s.active=scenario==='opponent'?0:1;
  const p=1-s.active,fist=put(s,0,'battle',FIST,{tapped:true});
  const victim=put(s,p,'battle',scenario==='replacement'?TACO:scenario==='race'?WATER:MECHA);
  play(s,scenario==='return'?BOUNCE:PIT);
  act(s,'effect',a=>a.targets.some(t=>t.uid===victim.uid));
  drain(s);
  assert.ok(find(s,p,['return','replacement'].includes(scenario)?'hand':'grave',victim),scenario);
  assert.equal(fist.tapped,true,scenario);
 }
});

test('Jamour can cancel after seven selections without tapping any card',()=>{
 let s=field(),x=put(s,0,'battle',JAMOUR);
 give(s,0,'mana',Array(9).fill(NATURE));
 const [first,second,...others]=s.players[0].mana;
 s.phase='attack';
 const available=()=>e.getLegalActions(s).some(a=>a.kind==='tapAbility'&&a.uid===x.uid);
 first.tapped=second.tapped=true;assert.equal(available(),false);
 second.tapped=false;x.entered=s.turn;assert.equal(available(),false);
 x.entered=0;s.extLimits=[{kind:'attack',player:0,uid:x.uid,incarnation:0,expires:'end',who:0}];
 assert.equal(available(),false);s.extLimits=[];
 act(s,'tapAbility',a=>a.uid===x.uid);
 for(const mana of [second,...others].slice(0,7))pick(s,mana);
 assert.equal(s.decision.task.op,'g34_TapAbilityMana804');
 s=restore(s);pick(s,null);
 assert.deepEqual(s.players[0].mana.filter(y=>y.tapped).map(y=>y.uid),[first.uid]);
 assert.equal(find(s,0,'battle',x).tapped,false);
 assert.equal(available(),true);
});

test('Jamour pays exactly eight mana, then gives a chosen ally +6000 and W-Breaker for one turn',()=>{
 const s=field();s.active=1;
 const x=put(s,1,'battle',JAMOUR),target=put(s,1,'battle',FIRE),enemy=put(s,0,'battle',NATURE);
 const gear=put(s,1,'battle',GEAR);
 give(s,1,'mana',[...Array(7).fill(NATURE),GONTA,WATER]);
 const mana=s.players[1].mana;mana[7].faceDown=true;
 s.phase='attack';act(s,'tapAbility',a=>a.uid===x.uid);
 for(const y of mana.slice(0,8)){
  assert.ok(!x.tapped&&mana.every(z=>!z.tapped));
  pick(s,y);
 }
 assert.ok(x.tapped&&mana.slice(0,8).every(y=>y.tapped)&&!mana[8].tapped);
 assert.ok(!s.attack);
 assert.deepEqual(new Set(picks(s)),new Set([x.uid,target.uid]));
 assert.ok(!picks(s).some(uid=>[gear.uid,enemy.uid].includes(uid)));
 pick(s,target);
 assert.equal(e.power(target,false,s),e.card(FIRE).power+6000);
 breakTwo(s,target);
 end(s);
 assert.equal(e.power(target,false,s),e.card(FIRE).power);
 assert.equal(e.effectiveCard(target,s).breaker,undefined);
});

test('Isopp requires two separate evolution bases and inherits a tapped base through save and resume',()=>{
 let s=field();
 const x=put(s,0,'hand',ISOPP),both=put(s,0,'battle',GONTA,{tapped:true});
 const water=put(s,0,'battle',WATER),enemy=put(s,1,'battle',FIRE);
 const canPlay=()=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid);
 assert.equal(canPlay(),false);
 const fire=put(s,0,'battle',FIRE);
 assert.equal(canPlay(),true);act(s,'play',a=>a.uid===x.uid);
 assert.deepEqual(new Set(picks(s)),new Set([both.uid,fire.uid]));
 pick(s,both);s=restore(s);
 assert.deepEqual(picks(s),[fire.uid]);pick(s,fire);
 const evolved=find(s,0,'battle',x);
 assert.ok(evolved.tapped);
 assert.deepEqual(new Set(evolved.under.map(y=>y.uid)),new Set([both.uid,fire.uid]));
 assert.ok(find(s,0,'battle',water)&&find(s,1,'battle',enemy));
});

test('Isopp charges tapped and breaks two shields after evolving from untapped bases',()=>{
 const s=field(),mana=put(s,0,'hand',ISOPP);
 s.phase='charge';
 act(s,'charge',a=>a.uid===mana.uid);
 assert.ok(find(s,0,'mana',mana).tapped);
 put(s,0,'battle',FIRE);put(s,0,'battle',NATURE);
 const x=play(s,ISOPP);drain(s);
 breakTwo(s,find(s,0,'battle',x));
});

test('Isopp offers one Fire or Nature creature costing up to seven at the start of its own turn',()=>{
 const s=field(),x=put(s,0,'battle',ISOPP);
 give(s,0,'mana',[SEVEN,NATURE,GONTA,EIGHT,LIGHT,GEAR,FIRE,NATURE_TWIN,LIGHT_TWIN]);
 const [fire,nature,multi,,,,hidden,natureTwin]=s.players[0].mana;
 hidden.faceDown=true;fire.tapped=true;
 put(s,0,'hand',SEVEN);put(s,0,'grave',NATURE);put(s,1,'mana',SEVEN);
 end(s);assert.equal(s.active,1);assert.equal(s.decision,null);
 end(s);assert.equal(s.active,0);assert.equal(s.decision.source,ISOPP);
 assert.deepEqual(new Set(picks(s)),new Set([fire.uid,nature.uid,multi.uid,natureTwin.uid,null]));
 pick(s,fire);drain(s);
 assert.ok(find(s,0,'battle',fire)&&find(s,0,'battle',x));
 assert.ok(!find(s,0,'mana',fire)&&find(s,0,'mana',nature)&&find(s,0,'mana',multi));
});

test('Isopp can decline the deployment or choose a legal evolution from mana',()=>{
 for(const deploy of [false,true]){
  const s=field();s.active=1;put(s,0,'battle',ISOPP);
  give(s,0,'mana',[SIMBO,PIRUDORU]);
  const [valid,invalid]=s.players[0].mana,base=put(s,0,'battle',NATURE);
  end(s);assert.deepEqual(picks(s),[valid.uid,null]);
  pick(s,deploy?valid:null);
  if(deploy){
   pick(s,base);drain(s);
   assert.equal(find(s,0,'battle',valid).under[0].uid,base.uid);
  }else assert.ok(find(s,0,'mana',valid)&&find(s,0,'battle',base));
  assert.ok(find(s,0,'mana',invalid));
 }
});
