import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const AUS='dm17-021',BABY='dm17-042',DMX='dmx21-055',DMEX='dmex13-078',GARU='dm17-015';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const CLAW='dm14-110',JET='dm16-017',FOREST='dm16-019',SUIT='dm14-086',DOSS='dm23ex1-024',SAMURAI='dm23ex1-005';
const BABYLONIA='dm32-021',DIAMOND='dmrp22-027',GENMU='dmrp15-km1',TAKION='dm23ex1-058';
const SAVER='dm15-021',URANUS='dm15-022',ZEMEKIS='dm32-013',PROPHECY='dm23rp3-001',MANA='promoy15-064';

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
const cross=(s,g,x,n)=>act(s,'crossGear',a=>a.uid===g.uid&&a.target===x.uid&&a.cost===n);


test('Phase 933 supports three complete card definitions and resolves both Tempest Baby reprints to the original ID',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-933.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[AUS,BABY,GARU]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[[DMX,BABY],[DMEX,BABY]]);
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  const original=details.cards.find(x=>x.id===id),detail={...original,id:row.id,faces:row.faces};
  const spec=m.cards.find(x=>x.id===id).spec;
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec(detail,{phase:933}),spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:933}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(row.id).id,id);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.deepEqual(row.faces,original.faces);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const deck={id:'phase933',name:'クロスギアとドローの検証',cards:[DMEX,AUS,GARU,LIGHT,WATER,DARK,FIRE,NATURE,CLAW,FOREST].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

const crossCosts=(s,g,x)=>e.getLegalActions(s).filter(a=>a.kind==='crossGear'&&a.uid===g.uid&&a.target===x.uid).map(a=>a.cost);
const tapped=s=>s.players[s.active].mana.filter(x=>x.tapped).length;

test('Aus Luke offers each paid discount only to itself, preserves civilization, and uses the chosen price',()=>{
 let s=field(),aus=put(s,0,'battle',AUS),host=put(s,0,'battle',NATURE);
 const gear=put(s,0,'battle',JET),hand=put(s,0,'hand',JET);
 assert.deepEqual(crossCosts(s,gear,aus),[5,4,3]);
 assert.deepEqual(crossCosts(s,gear,host),[5]);
 assert.equal(e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===hand.uid).cost,5);
 give(s,0,'mana',[FIRE,NATURE,NATURE]);
 assert.deepEqual(crossCosts(s,gear,aus),[3]);
 const action=e.getLegalActions(s).find(a=>a.kind==='crossGear'&&a.target===aus.uid);
 e.step(s,action,{manualMana:true});
 assert.equal(s.decision.type,'manaPayment');
 assert.equal(s.decision.cost,3);
 s=restore(s);
 for(const m of s.players[0].mana)act(s,'selectMana',a=>a.uid===m.uid);
 act(s,'confirmMana');
 assert.equal(tapped(s),3);
 assert.equal(find(s,0,'battle',gear).crossedTo.uid,aus.uid);
 const other=field(),x=put(other,0,'battle',AUS),g=put(other,0,'battle',JET);
 give(other,0,'mana',Array(8).fill(NATURE));
 assert.deepEqual(crossCosts(other,g,x),[]);
});

test('Aus Luke honors the one-mana floor, other reducers, ability ignore and free crosses',()=>{
 const s=field(),aus=put(s,0,'battle',AUS),samurai=put(s,0,'battle',SAMURAI);
 const claw=put(s,0,'battle',CLAW),suit=put(s,0,'battle',SUIT),jet=put(s,0,'battle',JET),doss=put(s,0,'battle',DOSS);
 assert.deepEqual(crossCosts(s,claw,aus),[1]);
 assert.deepEqual(crossCosts(s,suit,aus),[2,1]);
 assert.deepEqual(crossCosts(s,doss,samurai),[0]);
 assert.deepEqual(crossCosts(s,doss,aus),[5,4,3]);
 const before=tapped(s);cross(s,doss,samurai,0);assert.equal(tapped(s),before);
 cross(s,doss,aus,4);assert.equal(tapped(s)-before,4);
 put(s,0,'battle',TAKION);
 assert.deepEqual(crossCosts(s,jet,aus),[4,3,2]);
 for(const id of [GENMU,DIAMOND]){
  const mute=put(s,1,'battle',id);
  assert.deepEqual(crossCosts(s,jet,aus),[id===GENMU?4:5]);
  s.players[1].battle.splice(s.players[1].battle.indexOf(mute),1);
 }
});

for(const n of [0,1,2])test('Tempest Baby returns the number drawn in the selected top order: '+n,()=>{
 let s=field();
 give(s,0,'deck',[DARK,FIRE,NATURE,WATER,NATURE]);
 const original=s.players[0].deck.map(x=>x.uid),old=put(s,0,'hand',LIGHT);
 const next=put(s,0,'hand',WATER);
 const entry=put(s,0,'hand',BABY),all=physical(s);
 act(s,'play',a=>a.uid===entry.uid);
 assert.deepEqual(picks(s),[0,1,2]);
 pick(s,n);
 if(n){
  assert.equal(s.decision.task.op,'g52_TopHand');
  assert.ok(picks(s).includes(old.uid)&&picks(s).includes(original[0]));
  pick(s,old);
  if(n===2){
   assert.ok(!picks(s).includes(old.uid));
   s=restore(s);pick(s,original[0]);
  }
 }
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),n===2?[old.uid,original[0],...original.slice(2)]:n===1?[old.uid,...original.slice(1)]:original);
 assert.equal(s.players[0].hand.length,2);
 assert.ok(find(s,0,'hand',next));
 assert.deepEqual(physical(s),all);
});

test('Tempest Baby ignores replacement draws for the return count and resumes after Babylonia',()=>{
 let s=field();
 put(s,0,'battle',BABYLONIA);
 give(s,0,'deck',[DARK,FIRE,WATER,NATURE,LIGHT]);
 const [kept,discard,direct]=s.players[0].deck;
 const hand=put(s,0,'hand',LIGHT);
 play(s,BABY);
 pick(s,2);
 assert.equal(s.decision?.type,'drawReplacement');
 act(s,'replaceDraw',a=>a.replace);
 s=restore(s);
 act(s,'discardDraw',a=>a.uid===discard.uid);
 act(s,'replaceDraw',a=>!a.replace);
 assert.equal(s.decision.task.op,'g52_TopHand');
 assert.equal(s.decision.task.n,1);
 pick(s,hand);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck[0].uid,hand.uid);
 assert.ok(find(s,0,'hand',kept)&&find(s,0,'hand',direct)&&find(s,0,'grave',discard));
});

test('Tempest Baby loses upon drawing the last library card before any hand return',()=>{
 const s=field(),old=put(s,0,'hand',FIRE);
 give(s,0,'deck',[DARK]);
 const last=s.players[0].deck[0];
 play(s,BABY);
 pick(s,1);
 assert.equal(s.winner,1);
 assert.ok(find(s,0,'hand',old)&&find(s,0,'hand',last));
 assert.equal(s.players[0].deck.length,0);
 assert.notEqual(s.decision?.task?.op,'g52_TopHand');
});

for(const owner of [0,1])test('Garuwind must choose an eligible gear, then offers a draw before W-Breaker: owner '+owner,()=>{
 const s=field(),garu=put(s,0,'battle',GARU),own=put(s,0,'battle',CLAW);
 const host=put(s,1,'battle',FIRE),enemy=put(s,1,'battle',FOREST,{crossedTo:{uid:host.uid,incarnation:0}});
 const uranus=put(s,1,'battle',URANUS),protectedGear=put(s,1,'battle',CLAW,{crossedTo:{uid:uranus.uid,incarnation:0}});
 const gear=owner===0?own:enemy,top=s.players[0].deck[0];
 attack(s,garu);
 assert.deepEqual(picks(s),[own.uid,enemy.uid]);
 pick(s,gear);
 assert.equal(s.decision.source,GARU);
 assert.deepEqual(picks(s),[0,1]);
 assert.equal(s.players[1].shields.length,5);
 pick(s,owner);
 drain(s);
 assert.ok(find(s,owner,'grave',gear)&&find(s,1,'battle',host)&&find(s,1,'battle',protectedGear));
 assert.ok(find(s,0,owner?'hand':'deck',top));
 assert.equal(s.players[1].shields.length,3);
});

test('Garuwind sees one optional draw per simultaneous gear put into either graveyard',()=>{
 const s=field();
 put(s,0,'battle',GARU);put(s,1,'battle',GARU);
 const own=put(s,0,'battle',CLAW),enemy=put(s,1,'battle',SUIT);
 const hand=s.players.map(x=>x.hand.length);
 play(s,ZEMEKIS);drain(s);
 assert.ok(find(s,0,'grave',own)&&find(s,1,'grave',enemy));
 assert.deepEqual(s.players.map(x=>x.hand.length),hand.map(n=>n+2));
});

test('Garuwind does not draw if the watcher leaves simultaneously or the gear is saved',()=>{
 const s=field(),garu=put(s,0,'battle',GARU),gear=put(s,1,'battle',CLAW),saver=put(s,1,'battle',SAVER);
 const top=s.players[0].deck[0];
 attack(s,garu);pick(s,gear);
 assert.equal(s.decision.type,'leaveReplace');
 act(s,'replaceUltra',a=>a.uid===saver.uid);drain(s);
 assert.ok(find(s,1,'battle',gear)&&find(s,0,'deck',top));
 s.phase='main';
 play(s,PROPHECY);drain(s);
 assert.ok(find(s,0,'grave',garu)&&find(s,1,'grave',gear));
 assert.ok(find(s,0,'deck',top));
});

test('Garuwind ignores a gear moved to mana and a suppressed watcher',()=>{
 const s=field(),watcher=put(s,0,'battle',GARU),gear=put(s,1,'battle',CLAW);
 const top=s.players[0].deck[0];
 play(s,MANA);pick(s,1);pick(s,gear);drain(s);
 assert.ok(find(s,1,'mana',gear)&&find(s,0,'deck',top));
 const other=put(s,0,'battle',SUIT);
 watcher.g35Ignored=s.turn;
 play(s,ZEMEKIS);drain(s);
 assert.ok(find(s,0,'grave',other)&&find(s,0,'deck',top));
});
