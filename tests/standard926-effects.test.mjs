import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BLAZE='dm16-030',ERUPTION='dm05-017',NONARIS='dm16-s03';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const BIG='dm15-048',DRAGON='dm08-045',MULTI='dm10-068',GEAR='dm14-110',APUL='dmrp22-042';
const IMMUNE='dm07-051',BOLTAIL='dm03-015',PLAYER_ONLY='dm16-040',JAMOUR='dm24-056';
const put=(s,p,z,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===(v?.uid??v));
const picks=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const legal=(s,kind,predicate=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&predicate(a));
const canAttack=(s,x,t)=>legal(s,'attack',a=>a.uid===x.uid&&(t===undefined||a.target===(t.uid??t)));
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}
function attack(s,x,target='player'){
 s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===(target.uid??target));drain(s);
}

test('Phase 926 loads three unique official originals with their full abilities and images',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-926.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[BLAZE,ERUPTION,NONARIS]);
 assert.deepEqual(m.printAliases,[]);
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const {id,name,faces,spec,image,verification} of m.cards){
  const c=e.card(id),[f]=faces,detail=details.cards.find(x=>x.id===id);
  assert.ok(verification.facesMatched);
  assert.deepEqual(faces,detail.faces);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(standardCardSpec(detail,{phase:926}),spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:926}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   [id===ERUPTION?'spell':'creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(id).id,id);
  assert.equal(CARD_IMAGES[id],image);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,image]]);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 const deck={id:'phase926',name:'進化とマナの検証',cards:[BLAZE,ERUPTION,NONARIS,LIGHT,WATER,DARK,FIRE,NATURE,BIG,DRAGON].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

test('Blaze and Nonaris evolve from their own races, preserve tap state, and break two shields',()=>{
 for(const [id,baseId] of [[BLAZE,BIG],[NONARIS,DRAGON]]){
  const s=field(),base=put(s,0,'battle',baseId,{tapped:true}),wrong=put(s,0,'battle',FIRE);
  const played=play(s,id);
  assert.ok(!legal(s,'evolve',a=>a.baseUid===wrong.uid));
  act(s,'evolve',a=>a.baseUid===base.uid);
  const x=find(s,0,'battle',played);
  assert.ok(x.tapped&&x.under.some(y=>y.uid===base.uid));
  s.phase='attack';assert.ok(!canAttack(s,x,'player'));
  act(s,'endTurn');s.phase='attack';act(s,'endTurn');
  attack(s,x);assert.equal(s.players[1].shields.length,3);
 }
});

test('Only Blaze can attack an untapped crossed creature; inactive gear does not count',()=>{
 const s=field();s.active=1;
 const target=put(s,1,'battle',WATER),gear=play(s,GEAR);
 act(s,'crossGear',a=>a.uid===gear.uid&&(a.target===target.uid||a.targetUid===target.uid));
 s.phase='attack';act(s,'endTurn');
 const blaze=put(s,0,'battle',BLAZE),ordinary=put(s,0,'battle',FIRE);
 const tapped=put(s,1,'battle',NATURE,{tapped:true}),immune=put(s,1,'battle',IMMUNE);
 put(s,1,'battle',GEAR,{crossedTo:{uid:immune.uid,incarnation:0}});
 s.phase='attack';
 assert.ok(canAttack(s,blaze,target)&&canAttack(s,blaze,tapped));
 assert.ok(!canAttack(s,ordinary,target)&&!canAttack(s,blaze,immune));
 const attached=find(s,1,'battle',gear);
 attached.sealed=true;assert.ok(!canAttack(s,blaze,target));
 delete attached.sealed;
 blaze.g35Ignored=s.turn;assert.ok(!canAttack(s,blaze,target));
 delete blaze.g35Ignored;
 attack(s,blaze,target);
 assert.ok(find(s,1,'grave',target)&&find(s,1,'battle',gear));
});

test('Eruption picks up to the current friendly Nature creature count and moves the selected mana together',()=>{
 let s=field();
 put(s,0,'battle',NATURE);put(s,0,'battle',MULTI);
 const sealed=put(s,0,'battle',NATURE,{sealed:true});
 put(s,0,'seals',NATURE,{sealOf:sealed.uid,faceDown:true});put(s,1,'battle',NATURE);
 put(s,0,'battle',GEAR);put(s,0,'battle',WATER);
 give(s,1,'mana',[LIGHT,WATER,FIRE]);const [first,hidden,last]=s.players[1].mana;hidden.faceDown=true;
 const own=s.players[0].mana.map(x=>x.uid),cast=play(s,ERUPTION);
 assert.deepEqual(picks(s),[first.uid,hidden.uid,last.uid,null]);
 assert.equal(s.decision.choices.find(c=>c.value?.uid===hidden.uid).cardId??null,null);
 const physical=e.physicalCards(s).map(x=>x.uid).sort();
 pick(s,first);
 assert.equal(s.players[1].mana.length,3);
 assert.deepEqual(picks(s),[hidden.uid,last.uid,null]);
 s=restore(s);pick(s,hidden);drain(s);
 assert.deepEqual(s.players[1].mana.map(x=>x.uid),[last.uid]);
 assert.ok(find(s,1,'grave',first)&&find(s,1,'grave',hidden)&&!find(s,1,'grave',hidden).faceDown);
 assert.ok(find(s,0,'grave',cast));
 assert.deepEqual(s.players[0].mana.map(x=>x.uid),own);
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),physical);
});

test('Eruption may stop early and cannot move mana prohibited by Apul',()=>{
 for(const mode of ['zero','skip','one','apul']){
  const s=field();
  if(mode!=='zero'){put(s,0,'battle',NATURE);put(s,0,'battle',MULTI);}
  if(mode==='apul')put(s,0,'battle',APUL);
  give(s,1,'mana',[LIGHT,WATER,FIRE]);const [first]=s.players[1].mana;
  play(s,ERUPTION);
  if(mode==='skip'||mode==='one'){
   if(mode==='one')pick(s,first);
   pick(s,null);
  }
  assert.equal(s.decision,null);
  assert.equal(s.players[1].mana.length,mode==='one'?2:3);
  assert.equal(Boolean(find(s,1,'grave',first)),mode==='one');
 }
});

test('Nonaris compels only creatures that can legally attack it, without fixing the attack order',()=>{
 const s=field(),attacker=put(s,0,'battle',BOLTAIL),jamour=put(s,0,'battle',JAMOUR);
 const playerOnly=put(s,0,'battle',PLAYER_ONLY),fresh=put(s,0,'battle',FIRE,{entered:s.turn});
 const nonaris=put(s,1,'battle',NONARIS),other=put(s,1,'battle',NATURE,{tapped:true});
 s.phase='attack';
 const jamourTap=()=>legal(s,'tapAbility',a=>a.uid===jamour.uid);
 assert.ok(canAttack(s,attacker,other)&&canAttack(s,attacker,'player')&&legal(s,'endTurn')&&jamourTap());
 nonaris.tapped=true;
 assert.ok(canAttack(s,attacker,nonaris)&&canAttack(s,jamour,nonaris)&&canAttack(s,playerOnly,'player'));
 assert.ok(!canAttack(s,attacker,'player')&&!canAttack(s,attacker,other)&&!canAttack(s,fresh,nonaris));
 assert.ok(!legal(s,'endTurn')&&!jamourTap());
 nonaris.g35Ignored=s.turn;
 assert.ok(legal(s,'endTurn')&&jamourTap());
 delete nonaris.g35Ignored;
 const second=put(s,1,'battle',NONARIS,{tapped:true});
 assert.ok(canAttack(s,attacker,nonaris)&&canAttack(s,attacker,second));
 attack(s,attacker,nonaris);
 assert.ok(find(s,1,'grave',nonaris)&&!legal(s,'endTurn')&&canAttack(s,jamour,second));
 second.tapped=false;
 assert.ok(legal(s,'endTurn')&&jamourTap()&&canAttack(s,jamour,other));
});

test('An attacker that can attack untapped creatures is compelled by untapped Nonaris',()=>{
 const s=field(),nonaris=put(s,1,'battle',NONARIS),yuki=put(s,1,'battle','dm14-105');
 const bazaga=play(s,'dm06-031'),ordinary=put(s,0,'battle',FIRE);
 s.phase='attack';
 assert.ok(canAttack(s,bazaga,nonaris));
 assert.ok(!canAttack(s,bazaga,yuki)&&!canAttack(s,bazaga,'player'));
 assert.ok(canAttack(s,ordinary,'player')&&!canAttack(s,ordinary,nonaris));
 assert.ok(!legal(s,'endTurn'));
 attack(s,bazaga,nonaris);
 assert.ok(find(s,1,'grave',nonaris)&&find(s,0,'grave',bazaga)&&legal(s,'endTurn'));
});

test('Nonaris compels the declared target but still allows a blocker to intercept',()=>{
 const s=field(),harp=put(s,0,'battle','dm15-044'),nonaris=put(s,1,'battle',NONARIS,{tapped:true});
 const lentia=put(s,1,'battle','dm14-072');
 s.phase='attack';act(s,'attack',a=>a.uid===harp.uid&&a.target===nonaris.uid);
 act(s,'block',a=>a.uid===lentia.uid);drain(s);
 assert.ok(find(s,1,'battle',nonaris)&&find(s,1,'grave',lentia)&&find(s,0,'grave',harp));
});
