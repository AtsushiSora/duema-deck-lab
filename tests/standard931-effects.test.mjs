import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SCOOP='dm15-055',PROMO='promoy4-013',DAFT='dm22-012',ROCKET='dm15-051',SIRIUS='dm15-006';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const GEAR='dm14-110',SUIT='dm14-086',ARMOR='dm14-078',PETRO='dm15-008',URANUS='dm15-022',SAVER='dm15-021';
const APUL='dmrp22-042',NINGYO='dmrp22-033',MULTI='dmd03-007',NYAN='dm22-031';
const EVO='dm16-030',BASE='dm15-048',GEN='dm29-025',TREASURE='dm15-017',GENMU='dmrp15-km1';
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

test('Phase 931 supports four complete card definitions and resolves the Fairy Scoop reprint to the original ID',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-931.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[SCOOP,DAFT,ROCKET,SIRIUS]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[[PROMO,SCOOP]]);
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  const original=details.cards.find(x=>x.id===id),detail={...original,id:row.id,faces:row.faces};
  const spec=m.cards.find(x=>x.id===id).spec;
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec(detail,{phase:931}),spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:931}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   [{[SCOOP]:'gear',[DAFT]:'creature',[ROCKET]:'spell',[SIRIUS]:'creature'}[id],f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(row.id).id,id);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.deepEqual(row.faces,original.faces);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const deck={id:'phase931',name:'クロスギアと相手の手札の検証',cards:[PROMO,DAFT,ROCKET,SIRIUS,LIGHT,WATER,DARK,FIRE,NATURE,GEAR].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

const attack=(s,x,target='player')=>{s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===(target.uid??target));};
const cross=(s,g,x)=>act(s,'crossGear',a=>a.uid===g.uid&&a.target===x.uid);

const endTurn=s=>{s.phase='attack';act(s,'endTurn');};

test('Fairy Scoop moves any chosen grave card before blocking and preserves physical cards after save',()=>{
 let s=field();
 const host=put(s,0,'battle',FIRE),other=put(s,1,'battle',WATER,{tapped:true});
 const gear=play(s,SCOOP);cross(s,gear,host);
 const multi=put(s,0,'grave',MULTI),spell=put(s,0,'grave',ROCKET),enemyCard=put(s,1,'grave',NATURE);
 const all=physical(s);
 attack(s,host,other);
 assert.equal(s.decision.source,SCOOP);
 assert.deepEqual(picks(s),[multi.uid,spell.uid,null]);
 s=restore(s);pick(s,multi);
 assert.equal(find(s,0,'mana',multi).tapped,true);
 assert.ok(find(s,0,'grave',spell)&&find(s,1,'grave',enemyCard));
 drain(s);
 assert.deepEqual(physical(s),all);
});

test('Fairy Scoop follows its host through evolution and supports declining and grave restrictions',()=>{
 for(const mode of ['evolution','decline','locked','redirect','uncrossed']){
  const s=field(),host=put(s,0,'battle',BASE),gear=play(s,SCOOP),resource=put(s,0,'grave',ROCKET);
  if(mode!=='uncrossed')cross(s,gear,host);
  if(mode==='locked')put(s,1,'battle',APUL);
  if(mode==='redirect')put(s,1,'battle',NINGYO);
  let attacker=host;
  if(mode==='evolution'){
   attacker=play(s,EVO);act(s,'evolve',a=>a.baseUid===host.uid);
   assert.equal(find(s,0,'battle',gear).crossedTo.uid,attacker.uid);
  }
  attack(s,attacker);
  if(['evolution','decline','redirect'].includes(mode)){
   assert.deepEqual(picks(s),[resource.uid,null]);
   pick(s,mode==='decline'?null:resource);
  }else assert.notEqual(s.decision?.source,SCOOP);
  drain(s);
  assert.ok(find(s,0,mode==='evolution'?'mana':'grave',resource),mode);
 }
});

test('Dafthead adds an opponent draw during the turn start before the regular draw',()=>{
 const s=field(),daft=put(s,0,'battle',DAFT),nyan=put(s,1,'battle',NYAN,{tapped:true});
 give(s,1,'deck',[WATER,DARK,FIRE,NATURE]);const [first,second]=s.players[1].deck;
 endTurn(s);
 assert.equal(s.decision.source,NYAN);
 assert.equal(find(s,1,'battle',nyan).tapped,false);
 assert.equal(s.players[1].hand.length,0);
 pick(s,null);drain(s);
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),[first.uid,second.uid]);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.phase,'charge');
 attack(s,nyan);drain(s);
 const ownHandBeforeTurn=s.players[0].hand.length;
 endTurn(s);
 assert.ok(find(s,0,'battle',daft));
 assert.equal(s.players[0].hand.length,ownHandBeforeTurn+1);
 assert.equal(s.players[1].hand.length,2);
});

test('Dafthead offers one private discard before W-Breaker and allows declining',()=>{
 for(const take of [true,false]){
  let s=field();const x=put(s,0,'battle',DAFT),own=put(s,0,'hand',GEAR);
  const a=put(s,1,'hand',ROCKET),b=put(s,1,'hand',SIRIUS);
  attack(s,x);
  assert.equal(s.decision.player,0);
  assert.deepEqual(picks(s),[a.uid,b.uid,null]);
  assert.equal(s.players[1].shields.length,5);
  assert.ok(!s.log.some(row=>row.type==='reveal'));
  assert.ok(e.observation(s,0).players[1].hand.every(card=>card.hidden));
  s=restore(s);pick(s,take?a:null);drain(s);
  assert.ok(find(s,1,take?'grave':'hand',a)&&find(s,1,'hand',b)&&find(s,0,'hand',own));
  assert.equal(s.players[1].shields.length,3);
 }
});

test('Screw Rocket uses six or seven physical mana cards and replaces the normal selection',()=>{
 for(const [mana,count] of [[6,1],[7,0],[7,1],[7,2]]){
  let s=field();
  give(s,0,'mana',Array(mana).fill(FIRE));
  const own=put(s,0,'battle',GEAR),host=put(s,1,'battle',FIRE);
  const first=put(s,1,'battle',GEAR,{crossedTo:{uid:host.uid,incarnation:0}});
  const second=put(s,1,'battle',SUIT),third=put(s,1,'battle',ARMOR);
  const protectedHost=put(s,1,'battle',URANUS);
  const protectedGear=put(s,1,'battle',GEAR,{crossedTo:{uid:protectedHost.uid,incarnation:0}});
  play(s,ROCKET);
  const choices=[first.uid,second.uid,third.uid];
  assert.deepEqual(picks(s),mana===6?choices:[...choices,null]);
  if(count){
   pick(s,first);
   if(mana===7){
    assert.ok(find(s,1,'battle',first));
    assert.deepEqual(picks(s),[second.uid,third.uid,null]);
    s=restore(s);pick(s,count===2?second:null);
   }
  }else pick(s,null);
  drain(s);
  assert.ok(find(s,1,count?'grave':'battle',first));
  assert.ok(find(s,1,count===2?'grave':'battle',second));
  assert.ok(find(s,1,'battle',third)&&find(s,1,'battle',protectedGear)&&find(s,0,'battle',own));
  assert.ok(find(s,1,'battle',host)&&find(s,1,'battle',protectedHost));
 }
});

test('Screw Rocket respects Saver when a chosen gear would go to the graveyard',()=>{
 const s=field();give(s,0,'mana',Array(6).fill(FIRE));
 const gear=put(s,1,'battle',GEAR),saver=put(s,1,'battle',SAVER);
 play(s,ROCKET);pick(s,gear);
 assert.equal(s.decision.type,'leaveReplace');
 assert.equal(s.decision.player,1);
 act(s,'replaceUltra',a=>a.uid===saver.uid);
 drain(s);
 assert.ok(find(s,1,'battle',gear)&&find(s,1,'grave',saver));
});

test('Sirius draws optionally for its own normal or Samurai generation but ignores crossing and deployment',()=>{
 for(const mode of ['paid','samurai','deployment','opponent','muted']){
  const s=field(),sirius=put(s,0,'battle',SIRIUS);
  if(mode==='muted')put(s,1,'battle',GENMU);
  if(mode==='opponent')s.active=1;
  const gear=inst(GEAR),first=s.players[0].deck[0];
  if(mode==='deployment'){
   s.players[0].deck.unshift(gear);play(s,TREASURE);pick(s,gear);
  }else if(mode==='samurai'){
   s.players[0].hand.push(gear);play(s,GEN);pick(s,gear);
  }else{
   s.players[s.active].hand.push(gear);act(s,'play',a=>a.uid===gear.uid);
  }
  if(mode==='paid'||mode==='samurai'){
   assert.equal(s.decision.source,SIRIUS);
   assert.deepEqual(picks(s),[0,1]);
   pick(s,mode==='paid'?1:0);
  }
  drain(s);
  assert.ok(find(s,s.active,'battle',gear));
  if(s.active===0){cross(s,gear,sirius);assert.equal(s.decision,null);}
  assert.equal(!!find(s,0,'hand',first),mode==='paid');
 }
});

test('Sirius may attack a tapped creature and can block on the other turn',()=>{
 const s=field(),sirius=put(s,0,'battle',SIRIUS),other=put(s,1,'battle',FIRE,{tapped:true});
 s.phase='attack';
 assert.ok(!legal(s,'attack',a=>a.uid===sirius.uid&&a.target==='player'));
 assert.ok(legal(s,'attack',a=>a.uid===sirius.uid&&a.target===other.uid));
 const enemy=put(s,1,'battle',DARK);
 s.active=1;attack(s,enemy);
 act(s,'block',a=>a.uid===sirius.uid);
 drain(s);
 assert.ok(find(s,1,'grave',enemy));
 assert.equal(s.players[0].shields.length,5);
});
