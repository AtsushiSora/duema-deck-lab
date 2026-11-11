import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const FOUR='dmr22-033',TAP='dmr22-030',FLEET='dmr22-014',REPRINT='dmex08-228',DORAN='dmr22-050',SERENADE='dmr22-s04';
const LIGHT='dm01-075',DARK='dm01-090',FIRE='dm01-008',NATURE='dm01-108';
const MULTI='dm24ex2-019',MARIA='dmr21-001',HIGH='dmr21-s10',EVO='dmr20-017',CHANGE='dm26rp2-068';
const ONIKAMASU='dmrp01-041',FIELD='dmrp08-005',BYPASS='dm25rp3-DM1',EIGHT='dm25ex2-016';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function multiMana(s,p,n){
 const mana=s.players[p].mana;
 for(let i=0;i<n;i++)mana.push({...inst(MULTI),tapped:true});
 return mana;
}
function canAttack(s,x){return e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid);}

test('Phase 1005 registers five official definitions and the Fleet reprint resolves to the original ID',()=>{
 const m=read('tools/support-phase-1005.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[FOUR,TAP,FLEET,DORAN,SERENADE]);
 const [reprint]=m.printAliases;
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[[REPRINT,FLEET]]);
 assert.equal(snapshot.aliases[REPRINT],FLEET);
 assert.equal(registry.get(REPRINT).id,FLEET);
 assert.equal(reprint.verification.facesMatched,true);
 assert.deepEqual(standardCardSpec({...reprint,status:'complete'},{phase:1005}),m.cards[2].spec);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1005}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1005}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,parseInt(f.powerText,10)||0,f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1005');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  for(const src of [data,details,snapshot])
   assert.deepEqual(src.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const {id,image,canonicalId=id} of [...m.cards,reprint])
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[canonicalId,image]]);
});

test('4-W can return a creature of either player including itself and can decline',()=>{
 for(const mode of ['own','opponent','self','decline']){
  const s=field(),own=put(s,0,'battle',LIGHT),opp=put(s,1,'battle',HIGH);
  put(s,1,'battle',EIGHT);
  put(s,1,'battle',ONIKAMASU);
  put(s,0,'battle',FIELD);
  const self=play(s,FOUR),chosen={own,opponent:opp,self}[mode];
  assert.deepEqual(choices(s).filter(Boolean).sort(),[own.uid,opp.uid,self.uid].sort());
  assert.ok(choices(s).includes(null));
  pick(s,chosen?.uid??null);
  if(chosen)assert.ok(has(s,mode==='opponent'?1:0,'hand',chosen));
  else assert.ok(has(s,0,'battle',own)&&has(s,1,'battle',opp)&&has(s,0,'battle',self));
 }
});

test('4-W can block but cannot declare an attack',()=>{
 const s=field(),wall=put(s,0,'battle',FOUR),enemy=put(s,1,'battle',NATURE);
 s.phase='attack';
 assert.equal(canAttack(s,wall),false);
 s.active=1;
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===wall.uid);
 drain(s);
 assert.ok(has(s,1,'grave',enemy));
});

for(const mode of ['three','four','face-down'])test('Sanctuary resolves a mandatory tap then up to two distinct extra targets '+mode,()=>{
 let s=field();
 const mana=multiMana(s,0,mode==='three'?3:4);
 if(mode==='face-down')mana.at(-1).faceDown=true;
 const foes=Array.from({length:4},()=>put(s,1,'battle',NATURE));
 foes[0].tapped=true;
 put(s,0,'battle',FIRE);
 put(s,1,'battle',ONIKAMASU);
 play(s,TAP);
 assert.deepEqual(choices(s),foes.map(x=>x.uid));
 pick(s,foes[0].uid);
 if(mode==='four'){
  assert.deepEqual(choices(s).filter(Boolean),foes.slice(1).map(x=>x.uid));
  s=JSON.parse(JSON.stringify(s));
  pick(s,foes[1].uid);
  assert.equal(s.players[1].battle.find(x=>x.uid===foes[1].uid).tapped,false);
  pick(s,foes[2].uid);
 }else assert.equal(s.decision,null);
 assert.deepEqual(s.players[1].battle.filter(x=>x.tapped).map(x=>x.uid),foes.slice(0,mode==='four'?3:1).map(x=>x.uid));
});

test('Sanctuary can use its S-Trigger without payment and decline extra taps',()=>{
 const s=field(),attacker=put(s,0,'battle',NATURE),target=put(s,0,'battle',FIRE);
 give(s,1,'shields',[TAP]);
 give(s,1,'mana',[]);
 multiMana(s,1,4);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===TAP);
 assert.equal(s.decision.player,1);
 pick(s,target.uid);
 assert.equal(target.tapped,true);
 pick(s,null);
 assert.equal(s.players[1].mana.filter(x=>x.tapped).length,4);
 assert.equal(s.players[1].shields.length,0);
});

test('Fleet resolves the mandatory return first and does not reselect a creature that stayed',()=>{
 const s=field(),maria=put(s,1,'battle',MARIA),own=put(s,0,'battle',NATURE);
 const foe=put(s,1,'battle',DARK),untargetable=put(s,1,'battle',ONIKAMASU);
 multiMana(s,0,4);
 play(s,FLEET);
 assert.ok(!choices(s).includes(null));
 pick(s,maria.uid);
 assert.ok(has(s,1,'battle',maria));
 assert.deepEqual(choices(s).filter(Boolean).sort(),[own.uid,foe.uid].sort());
 pick(s,own.uid);
 pick(s,foe.uid);
 assert.ok(has(s,0,'hand',own)&&has(s,1,'hand',foe)&&has(s,1,'battle',untargetable));
});

test('Fleet checks Mana Armament after returning a friendly Courtney',()=>{
 const s=field(),courtney=put(s,0,'battle','dm13-015'),foe=put(s,1,'battle',FIRE);
 play(s,FLEET);
 pick(s,courtney.uid);
 assert.ok(has(s,0,'hand',courtney)&&has(s,1,'battle',foe));
 assert.equal(s.decision,null);
});

test('Fleet S-Trigger without four multicolor mana can return the attacker only once',()=>{
 const s=field(),attacker=put(s,0,'battle',NATURE),other=put(s,0,'battle',FIRE);
 give(s,1,'shields',[FLEET]);
 give(s,1,'mana',[]);
 multiMana(s,1,3);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===FLEET);
 pick(s,attacker.uid);
 assert.ok(has(s,0,'hand',attacker)&&has(s,0,'battle',other));
 assert.equal(s.decision,null);
});

test('Doran gains and loses Slayer and the Crystal Dragon race with visible friendly Darkness',()=>{
 const s=field(),doran=play(s,DORAN);
 put(s,1,'battle',DARK);
 const ally=put(s,0,'battle',DARK,{sealed:true});
 const live=()=>e.effectiveCard(doran,s);
 assert.equal(!!live().slayer,false);
 assert.equal(live().race,'グランド・デビル');
 delete ally.sealed;
 assert.equal(live().slayer,true);
 assert.equal(live().race,'グランド・デビル/クリスタル・ドラゴン');
 s.players[0].battle.pop();
 assert.equal(!!live().slayer,false);
 assert.equal(live().race,'グランド・デビル');
});

test('Doran destroys a stronger creature through its granted Slayer',()=>{
 const s=field(),doran=put(s,0,'battle',DORAN),foe=put(s,1,'battle',FIRE,{tapped:true});
 put(s,0,'battle',DARK);
 attack(s,doran.uid,foe.uid);
 drain(s);
 assert.ok(has(s,0,'grave',doran)&&has(s,1,'grave',foe));
});

for(const p of [0,1])test('Serenade restricts fresh Speed Attackers for either player but leaves older creatures and ordinary evolutions free '+p,()=>{
 const s=field();
 s.active=p;s.phase='attack';
 put(s,0,'battle',SERENADE);
 const fresh=put(s,p,'battle',MULTI,{entered:s.turn});
 const old=put(s,p,'battle',MULTI);
 const evo=put(s,p,'battle',EVO,{entered:s.turn,under:[inst(DARK)]});
 assert.ok(e.attackLocked(s,p,fresh));
 assert.equal(canAttack(s,fresh),false);
 assert.ok(canAttack(s,old)&&canAttack(s,evo));
 fresh.entered=s.turn-1;
 assert.equal(canAttack(s,fresh),true);
});

test('Serenade checks gained Speed Attacker and ignores sealed sources',()=>{
 const s=field(),source=put(s,1,'battle',SERENADE);
 const x=put(s,0,'battle',EVO,{entered:s.turn,under:[inst(DARK)],g34Grants:[{turn:s.turn,speedAttacker:true}]});
 s.phase='attack';
 assert.equal(canAttack(s,x),false);
 source.sealed=true;
 assert.equal(canAttack(s,x),true);
});

test('Serenade permits a Speed Attacker to continue a Revolution Change attack',()=>{
 const s=field(),old=put(s,0,'battle',FIRE),next=put(s,0,'hand',CHANGE);
 put(s,1,'battle',SERENADE,{tapped:true});
 attack(s,old.uid);
 assert.equal(s.decision?.task?.op,'revDeclare');
 pick(s,true);
 assert.equal(s.decision?.task?.op,'revResolve');
 pick(s,old.uid);
 drain(s);
 assert.ok(has(s,0,'hand',old)&&has(s,0,'battle',next));
 assert.equal(s.players[1].shields.length,4);
 assert.ok(e.attackLocked(s,0,next));
});

test('An allied Red Zone ignores the opposing restriction but cannot ignore its own Serenade',()=>{
 const s=field(),x=put(s,0,'battle',MULTI,{entered:s.turn});
 put(s,0,'battle',BYPASS);
 put(s,1,'battle',SERENADE);
 s.phase='attack';
 assert.ok(canAttack(s,x));
 put(s,0,'battle',SERENADE);
 assert.equal(canAttack(s,x),false);
});

test('Serenade charges tapped and blocks an opposing attack',()=>{
 const s=field(),copy=put(s,0,'hand',SERENADE);
 s.phase='charge';
 act(s,'charge',a=>a.uid===copy.uid);
 assert.equal(s.players[0].mana.find(x=>x.uid===copy.uid).tapped,true);
 const self=play(s,SERENADE);
 const attacker=put(s,1,'battle',NATURE);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===self.uid);
 drain(s);
 assert.ok(has(s,1,'grave',attacker));
 assert.equal(e.effectiveCard(self,s).breaker,2);
});
