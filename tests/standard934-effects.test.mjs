import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PUNISH='dm17-023',PROCY='dm17-006',PROMO30='promoy4-030',PROMO31='promoy4-031';
const PARA='dm17-039',SOLARIO='dm16-023';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const CLAW='dm14-110',FOREST='dm16-019',URANUS='dm15-022',APUL='dmrp22-042';
const DEATH='dm01-027',BOUNCE='dm01-086',GENMU='dmrp15-km1',FUJIN='dmrp22-037',RALFAS='dm25-042';

const put=(s,p,z,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const picks=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===(v?.uid??v));
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const legal=(s,kind,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&pred(a));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}


const attack=(s,x,target='player')=>{s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===(target.uid??target));};

test('Phase 934 supports four complete card definitions and resolves both Procyous promos to the original ID',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-934.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[PUNISH,PROCY,PARA,SOLARIO]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[[PROMO30,PROCY],[PROMO31,PROCY]]);
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  const original=details.cards.find(x=>x.id===id),detail={...original,id:row.id,faces:row.faces};
  const spec=m.cards.find(x=>x.id===id).spec;
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec(detail,{phase:934}),spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:934}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   [id===PUNISH?'spell':'creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(row.id).id,id);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.deepEqual(row.faces,original.faces);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const deck={id:'phase934',name:'光のカード4種の検証',cards:[PROMO31,PUNISH,PARA,SOLARIO,LIGHT,WATER,DARK,FIRE,NATURE,CLAW].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

for(const n of [0,1,2])test('Punish Hold selects up to two distinct creatures of either player before tapping: '+n,()=>{
 let s=field();
 const ally=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',NATURE);
 const gear=put(s,1,'battle',CLAW),sealed=put(s,1,'battle',WATER,{sealed:true});
 put(s,1,'seals',DARK,{sealOf:sealed.uid,faceDown:true});
 const spell=play(s,PUNISH);
 assert.equal(s.decision.source,PUNISH);
 assert.deepEqual(new Set(picks(s)),new Set([enemy.uid,ally.uid,null]));
 if(n){
  pick(s,ally);
  assert.equal(find(s,0,'battle',ally).tapped,false);
  assert.deepEqual(new Set(picks(s)),new Set([enemy.uid,null]));
  s=restore(s);pick(s,n===2?enemy:null);
 }else pick(s,null);
 assert.equal(find(s,0,'battle',ally).tapped,n>0);
 assert.equal(find(s,1,'battle',enemy).tapped,n===2);
 assert.equal(find(s,1,'battle',gear).tapped,false);
 assert.ok(find(s,0,'grave',spell));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
});

test('Punish Hold can be used from hand with a light shield and zero mana, but not with a different color',()=>{
 for(const [id,enabled] of [[LIGHT,true],[DARK,false]]){
  let s=field();s.active=1;
  give(s,0,'mana',[]);give(s,0,'shields',[id]);
  const shield=s.players[0].shields[0],source=put(s,0,'hand',PUNISH);
  const attacker=put(s,1,'battle',FIRE),next=put(s,1,'battle',DARK);
  attack(s,attacker);act(s,'noBlock');
  if(enabled){
   assert.equal(s.decision.task.op,'g13_SB');
   s=restore(s);
   act(s,'extended',a=>{
    const v=s.decision.choices[a.choice].value;
    return v?.uid===source.uid&&v.cost===shield.uid;
   });
   assert.equal(s.decision.source,PUNISH);
   pick(s,next);pick(s,null);
   assert.ok(find(s,0,'grave',shield)&&find(s,0,'grave',source));
   assert.equal(find(s,1,'battle',next).tapped,true);
  }else{
   assert.notEqual(s.decision?.task?.op,'g13_SB');
   assert.ok(find(s,0,'hand',source)&&find(s,0,'hand',shield));
   assert.equal(find(s,1,'battle',next).tapped,false);
  }
  drain(s);
  assert.equal(s.players[0].mana.length,0);
 }
});

for(const owner of [0,1])test('Procyous shields one eligible gear face down for its owner and breaks two shields: '+owner,()=>{
 let s=field();
 const host=put(s,1,'battle',FIRE),ally=put(s,0,'battle',CLAW);
 const crossed=put(s,1,'battle',FOREST,{crossedTo:{uid:host.uid,incarnation:0}});
 const uranus=put(s,1,'battle',URANUS);
 const protectedGear=put(s,1,'battle',CLAW,{crossedTo:{uid:uranus.uid,incarnation:0}});
 const gear=owner===0?ally:crossed,entry=put(s,0,'hand',PROCY),all=physical(s);
 act(s,'play',a=>a.uid===entry.uid);
 assert.deepEqual(new Set(picks(s)),new Set([ally.uid,crossed.uid,null]));
 s=restore(s);pick(s,gear);
 const shield=find(s,owner,'shields',gear);
 assert.ok(shield);
 assert.equal(shield.faceUp,undefined);
 assert.equal(shield.crossedTo,undefined);
 assert.equal(s.players[owner].shields.length,6);
 assert.equal(e.observation(s,1-owner).players[owner].publicShields.length,0);
 assert.ok(find(s,1,'battle',host)&&find(s,1,'battle',protectedGear));
 assert.deepEqual(physical(s),all);
 const x=find(s,0,'battle',entry);x.entered=0;
 const before=s.players[1].shields.length;
 attack(s,x);drain(s);
 assert.equal(s.players[1].shields.length,before-2);
});

test('Procyous can decline and respects a restriction on adding a shield',()=>{
 for(const deny of [false,true]){
  const s=field(),gear=put(s,0,'battle',CLAW);
  if(deny)put(s,1,'battle',FUJIN);
  play(s,PROCY);
  if(s.decision?.source===PROCY)pick(s,deny?gear:null);
  assert.ok(find(s,0,'battle',gear));
  assert.equal(s.players[0].shields.length,5);
 }
});

test('Para Procyon checks current own creature civilizations and applies its power bonus only once',()=>{
 const s=field(),para=put(s,0,'battle',PARA);
 put(s,1,'battle',NATURE);put(s,0,'battle',FOREST);
 assert.equal(e.power(para,false,s),500);
 const water=put(s,0,'battle',WATER),nature=put(s,0,'battle',NATURE);
 assert.equal(e.power(para,false,s),2500);
 s.players[0].battle.splice(s.players[0].battle.indexOf(nature),1);
 assert.equal(e.power(para,false,s),2500);
 water.sealed=true;put(s,0,'seals',LIGHT,{sealOf:water.uid,faceDown:true});
 assert.equal(e.power(para,false,s),500);
 const ralfas=put(s,0,'battle',RALFAS);
 s.phase='attack';act(s,'tapAbility',a=>a.uid===ralfas.uid);
 pick(s,para);pick(s,'水');drain(s);
 s.players[0].battle.splice(s.players[0].battle.indexOf(ralfas),1);
 assert.equal(e.power(para,false,s),2500);
 act(s,'endTurn');drain(s);
 assert.equal(e.power(para,false,s),500);
});

test('Para Procyon can block with the boosted power and can attack a creature',()=>{
 const s=field(),para=put(s,0,'battle',PARA);
 put(s,0,'battle',NATURE);
 const enemy=put(s,1,'battle',FIRE,{tapped:true});
 s.phase='attack';
 assert.equal(legal(s,'attack',a=>a.uid===para.uid&&a.target==='player'),false);
 assert.equal(legal(s,'attack',a=>a.uid===para.uid&&a.target===enemy.uid),true);
 s.active=1;enemy.tapped=false;
 attack(s,enemy);act(s,'block',a=>a.uid===para.uid);drain(s);
 assert.ok(find(s,0,'battle',para)&&find(s,1,'grave',enemy));
});

test('Solario blocks and untaps its own eligible creatures when destroyed on the opponent turn',()=>{
 const s=field();s.active=1;
 const source=put(s,0,'battle',SOLARIO),ally=put(s,0,'battle',PARA,{tapped:true});
 const locked=put(s,0,'battle',LIGHT,{tapped:true,tapLocks:[0]}),gear=put(s,0,'battle',CLAW,{tapped:true});
 const first=put(s,1,'battle',APUL),second=put(s,1,'battle',FIRE,{tapped:true});
 attack(s,first);act(s,'block',a=>a.uid===source.uid);drain(s);
 assert.ok(find(s,0,'grave',source));
 assert.equal(ally.tapped,false);
 assert.equal(locked.tapped,true);
 assert.equal(gear.tapped,true);
 assert.equal(second.tapped,true);
 second.tapped=false;
 attack(s,second);
 assert.equal(legal(s,'block',a=>a.uid===ally.uid),true);
});

test('Solario does not untap its allies on its own turn, on a bounce, or while abilities are ignored',()=>{
 for(const mode of ['own','bounce','ignored']){
  const s=field(),source=put(s,0,'battle',SOLARIO),ally=put(s,0,'battle',NATURE,{tapped:true});
  if(mode==='own'){
   const opponent=put(s,1,'battle',APUL,{tapped:true});
   s.phase='attack';
   assert.equal(legal(s,'attack',a=>a.uid===source.uid&&a.target==='player'),false);
   attack(s,source,opponent);
  }else{
   s.active=1;
   if(mode==='ignored')put(s,1,'battle',GENMU);
   play(s,mode==='bounce'?BOUNCE:DEATH);
   act(s,'effect',a=>a.targets[0]?.uid===source.uid);
  }
  drain(s);
  assert.ok(find(s,0,mode==='bounce'?'hand':'grave',source));
  assert.equal(ally.tapped,true);
 }
});
