import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BADES='dm19-002',DRAGFORCE='dm23-015',PROMO='promoy5-061',MADUCAS='dm22-016',SICKLE='dm28-067';
const SERAPH='dm19-109',DRAKE='dm19-089',TYLER='dm01-098',PLAIN='dm01-108',MULTI='dmr02-054';
const SEED='dmrp21-014',GEAR='dm14-110',KIRA='dm21-s04',SERVO='dm22-042';
const DEATH='dm01-027',BOUNCE='dm01-086',NINNGYO='dm22ex1-086';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const ids=rows=>rows.map(x=>x.uid);
const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const legal=(s,kind,filter=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&filter(a));
const power=(s,x,attacking=false)=>e.power(x,attacking,s);
const restore=s=>JSON.parse(JSON.stringify(s));

function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(PLAIN));
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

function removeCreature(s,id,creature){
 play(s,id);
 act(s,'effect',a=>a.targets.some(t=>t.uid===creature.uid));
}

test('Phase 943 verifies four complete official cards and resolves the promo to its canonical ID',()=>{
 const m=read('tools/support-phase-943.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BADES,DRAGFORCE,MADUCAS,SICKLE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[PROMO,DRAGFORCE]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id);
  const original=details.cards.find(x=>x.id===id),d={...original,id:row.id,faces:row.faces};
  const spec=m.cards.find(x=>x.id===id).spec;
  assert.deepEqual(row.faces,original.faces);
  assert.deepEqual(standardCardSpec(d,{phase:943}),spec);
  const altered={...d,faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]};
  assert.throws(()=>standardCardSpec(altered,{phase:943}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-943');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(cat.resolveRows([{id:row.id,count:1}])[0].id,id);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const cards=[BADES,PROMO,MADUCAS,SICKLE,SERAPH,DRAKE,TYLER,PLAIN,GEAR,BOUNCE].map(id=>({id,count:4}));
 assert.deepEqual(e.validateDeck({name:'アーク・セラフィムとティラノ・ドレイク',cards:cat.resolveRows(cards)}),[]);
 assert.equal(cat.coverage({cards}).unsupported,0);
});

for(const untap of [true,false])test('Bades boosts only other friendly Arc Seraphim and can untap all of them at its turn end '+untap,()=>{
 let s=field();
 const bades=play(s,BADES);
 bades.tapped=true;
 const first=put(s,0,'battle',SERAPH,{tapped:true}),second=put(s,0,'battle',SERAPH,{tapped:true});
 const locked=put(s,0,'battle',SERAPH,{tapped:true,tapLocks:[0]});
 const other=put(s,0,'battle',PLAIN,{tapped:true}),enemy=put(s,1,'battle',SERAPH,{tapped:true});
 assert.deepEqual([power(s,bades),power(s,first),power(s,second),power(s,other),power(s,enemy)],[3500,4000,4000,2000,2000]);
 end(s);
 assert.equal(s.decision.source,BADES);
 assert.deepEqual(values(s),[true,null]);
 s=restore(s);
 pick(s,untap?true:null);
 for(const x of [first,second])assert.equal(find(s,0,'battle',x).tapped,!untap);
 for(const x of [bades,locked,other])assert.equal(find(s,0,'battle',x).tapped,true);
 assert.equal(s.active,1);
 assert.equal(s.decision,null);
});

test('Bades blocks normally and the aura ends immediately if it leaves',()=>{
 const s=field(),ally=put(s,1,'battle',SERAPH),bades=put(s,1,'battle',BADES);
 const attacker=put(s,0,'battle',PLAIN);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===bades.uid);
 assert.ok(find(s,0,'grave',attacker)&&find(s,1,'battle',bades));
 assert.equal(power(s,ally),4000);
 s.phase='main';
 removeCreature(s,BOUNCE,bades);
 assert.equal(power(s,ally),2000);
});

test('Dragforce needs a friendly Tyranno Drake, grants haste and breaks two shields',()=>{
 const s=field(),evo=put(s,0,'hand',DRAGFORCE);
 const wrong=put(s,0,'battle',PLAIN);
 put(s,1,'battle',DRAKE);
 assert.ok(!legal(s,'play',a=>a.uid===evo.uid));
 const base=put(s,0,'battle',DRAKE);
 act(s,'play',a=>a.uid===evo.uid);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.deepEqual(ids(find(s,0,'battle',evo).under),[base.uid]);
 const fresh=play(s,TYLER),enemy=put(s,1,'battle',PLAIN,{entered:s.turn});
 assert.equal(e.effectiveCard(fresh,s).speedAttacker,true);
 assert.equal(e.effectiveCard(wrong,s).speedAttacker,true);
 assert.ok(!e.effectiveCard(enemy,s).speedAttacker);
 s.phase='attack';
 assert.ok(legal(s,'attack',a=>a.uid===fresh.uid));
 attack(s,evo.uid);
 act(s,'noBlock');
 act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Dragforce returns all other friendly creatures and leaves its own stack and noncreatures',()=>{
 const s=field(),sourceBase=inst(DRAKE),otherBase=inst(DRAKE);
 const source=put(s,0,'battle',DRAGFORCE,{under:[sourceBase]});
 const other=put(s,0,'battle',KIRA,{under:[otherBase]});
 const ally=put(s,0,'battle',SERAPH),seed=put(s,0,'battle',SEED),gear=put(s,0,'battle',GEAR);
 const sealed=put(s,0,'battle',PLAIN,{sealed:true});
 s.players[0].seals.push({...inst(PLAIN),faceDown:true,sealOf:sealed.uid});
 const enemy=put(s,1,'battle',DRAKE);
 end(s);
 assert.equal(s.active,1);
 assert.deepEqual(new Set(ids(s.players[0].hand)),new Set([other.uid,otherBase.uid,ally.uid]));
 assert.deepEqual(ids(find(s,0,'battle',source).under),[sourceBase.uid]);
 assert.ok([source,seed,gear,sealed].every(x=>find(s,0,'battle',x)));
 assert.ok(find(s,1,'battle',enemy));
 end(s);
 assert.equal(s.active,0);
 assert.equal(s.players[0].hand.length,4);
});

test('Maducas grants additive Power Attacker to itself and to other friendly creatures only',()=>{
 const s=field(),maducas=play(s,MADUCAS);
 const tyler=put(s,0,'battle',TYLER),other=put(s,1,'battle',TYLER);
 assert.deepEqual([power(s,maducas),power(s,tyler),power(s,other)],[2000,1000,1000]);
 assert.deepEqual([power(s,maducas,true),power(s,tyler,true),power(s,other,true)],[6000,7000,3000]);
 const second=put(s,0,'battle',MADUCAS);
 assert.equal(power(s,tyler,true),11000);
 maducas.g35Ignored=s.turn;
 assert.equal(power(s,tyler,true),7000);
 second.g35Ignored=s.turn;
 assert.equal(power(s,tyler,true),3000);
});

test('Maducas requires an eligible ally to attack again if it untaps and allows ending with only ineligible allies',()=>{
 const s=field(),maducas=play(s,MADUCAS);
 const ready=put(s,0,'battle',TYLER),fresh=play(s,TYLER);
 const stopped=put(s,0,'battle',SERVO);
 const canEnd=()=>legal(s,'endTurn');
 s.phase='attack';
 assert.ok(!canEnd());
 for(const x of [maducas,fresh,stopped])assert.ok(!legal(s,'attack',a=>a.uid===x.uid));
 attack(s,ready.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(canEnd());
 ready.tapped=false;
 assert.ok(!canEnd());
 attack(s,ready.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(canEnd());
});

for(const accept of [true,false])test('Bronze Chain Sickle ramps on entry and offers a hidden Shield Plus only on destruction '+accept,()=>{
 let s=field();
 const top=give(s,0,'deck',[MULTI,BOUNCE,PLAIN,PLAIN]).slice(),shield=s.players[0].shields[2];
 const old=inst(PLAIN);
 shield.shieldStack=[old];
 const sickle=play(s,SICKLE);
 assert.ok(find(s,0,'mana',top[0])?.tapped);
 assert.equal(s.decision,null);
 s.active=1;
 removeCreature(s,DEATH,sickle);
 assert.ok(find(s,0,'grave',sickle));
 assert.equal(s.decision.task.op,'g71_Plus');
 assert.equal(s.decision.player,0);
 assert.ok(s.decision.choices.every(c=>!c.cardId));
 const before=s.players[0].shields.length;
 s=restore(s);
 pick(s,accept?shield:null);
 const group=find(s,0,'shields',shield);
 assert.equal(s.players[0].shields.length,before);
 assert.deepEqual(ids(group.shieldStack),accept?[old.uid,top[1].uid]:[old.uid]);
 if(accept)assert.ok(!group.shieldStack.at(-1).faceUp);
 else assert.equal(s.players[0].deck[0].uid,top[1].uid);
});

test('Bronze Chain Sickle does not add a shield when bounced or when no shield exists',()=>{
 for(const [spell,noShields] of [[BOUNCE,false],[DEATH,true]]){
  const s=field(),top=s.players[0].deck[0];
  const sickle=put(s,0,'battle',SICKLE);
  if(noShields)give(s,0,'shields',[]);
  s.active=1;
  removeCreature(s,spell,sickle);
  if(s.decision)assert.deepEqual(values(s),[null]);
  drain(s);
  assert.equal(s.players[0].deck[0].uid,top.uid);
  assert.ok(find(s,0,noShields?'grave':'hand',sickle));
 }
});

test('Bronze Chain Sickle uses the normal deck-to-mana replacement',()=>{
 const s=field(),top=s.players[0].deck[0];
 put(s,1,'battle',NINNGYO);
 const sickle=play(s,SICKLE);
 assert.ok(find(s,0,'battle',sickle)&&find(s,0,'grave',top));
 assert.ok(!find(s,0,'mana',top));
});
