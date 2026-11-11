import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KILL='dmr23-s03',WILD='dmr22-s02',WAYOU='dmr23-s07',HADES='dmr23-008',SAZANJI='dmr21-037';
const DARK='dmr15-042',DARK_TWIN='dmrp06-006',DARK_SPELL='dm01-027';
const NATURE='dm01-108',DRAGON='dmr21-080',MULTI='dm24ex2-019',WATER='dm01-080';
const FIELD='dmr21-036',VV='dmr22-l01',GEN='dmrp15-km1',LOCK='dmrp08-014';
const WEAK='dm01-083',STRONG='dm01-036',COMPLEX='dm23rp4-S02',SWEEP='dm38-013';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision?.choices?.map(value)??[];
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(24).fill(NATURE));give(s,p,'grave',[]);}
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
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function resolveOrder(s,id){
 while(['entryOrder','effectOrder'].includes(s.decision?.type)){
  const entries=s.decision.type==='entryOrder'?s.triggers.entries:s.pendingEffects;
  const entry=entries.find(x=>x.player===s.decision.player&&(!id||x.source===id));
  assert.ok(entry);
  const action=e.getLegalActions(s).find(x=>x.effectId===entry.effectId);
  assert.ok(action);
  e.step(s,action);
 }
}

test('Phase 1009 pins five single prints, printed abilities, art and limits',()=>{
 const m=read('tools/support-phase-1009.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[KILL,WILD,WAYOU,HADES,SAZANJI]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1009}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:1009}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1009');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 assert.match(registry.get(SAZANJI).faces[0].abilityText,/−2000/);
});

for(const [id,attacker] of [[KILL,DARK],[WAYOU,DRAGON]])test(id+' changes and breaks two shields',()=>{
 const s=field(),a=put(s,0,'battle',attacker),c=put(s,0,'hand',id),before=physical(s);
 attack(s,a.uid);
 assert.equal(s.decision.task.op,'revDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'revResolve');
 pick(s,a.uid);
 drain(s);
 assert.ok(has(s,0,'hand',a)&&has(s,0,'battle',c)&&c.tapped);
 assert.equal(s.players[1].shields.length,3);
 assert.deepEqual(physical(s),before);
});

for(const [id,civ,race,cost] of [[KILL,'闇','コマンド',4],[KILL,'水','コマンド',5],
 [KILL,'闇','ドラゴン',5],[WAYOU,'火','ドラゴン',5],[WAYOU,'光','コマンド',5]])test(id+' rejects the attacker '+[civ,race,cost].join('/'),()=>{
 const s=field(),a=put(s,0,'battle',NATURE,{g34Grants:[{turn:s.turn,civilizations:[civ],race,cost}]});
 const c=put(s,0,'hand',id);
 attack(s,a.uid);
 assert.notEqual(s.decision?.task?.op,'revDeclare');
 drain(s);
 assert.ok(has(s,0,'hand',c));
});

for(const locked of [false,true])test('Kill filters dark creature faces and resolves the attempted movement '+locked,()=>{
 let s=field();
 const target=put(s,1,'battle',STRONG),dark=put(s,0,'grave',DARK_TWIN);
 const darkSpell=put(s,0,'grave',DARK_SPELL),other=put(s,0,'grave',NATURE);
 if(locked)put(s,1,'battle',LOCK);
 play(s,KILL);
 assert.deepEqual(choices(s),[dark.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 const before=physical(s);
 pick(s,dark.uid);
 if(locked)assert.ok(has(s,0,'grave',dark));
 else assert.equal(s.players[0].deck.at(-1).uid,dark.uid);
 pick(s,target.uid);
 assert.ok(has(s,1,'grave',target)&&has(s,0,'grave',darkSpell)&&has(s,0,'grave',other));
 assert.deepEqual(physical(s),before);
});

test('Kill skips destruction when the optional movement is declined',()=>{
 const s=field(),dark=put(s,0,'grave',DARK),enemy=put(s,1,'battle',STRONG);
 play(s,KILL);
 pick(s,null);
 assert.ok(!s.decision&&has(s,0,'grave',dark)&&has(s,1,'battle',enemy));
});

test('Wild privately sees two cards and deploys one eligible creature before placing the rest at the bottom',()=>{
 const s=field();
 give(s,0,'deck',[WATER,WILD,NATURE,...Array(16).fill(NATURE)]);
 const [water,expensive,next]=s.players[0].deck;
 play(s,WILD);
 assert.deepEqual(choices(s),[water.uid,null]);
 assert.ok(s.log.some(row=>row.type==='look'&&!row.text.includes(e.card(WATER).name)));
 pick(s,water.uid);
 drain(s);
 assert.ok(has(s,0,'battle',water));
 assert.ok(has(s,0,'hand',next));
 assert.equal(s.players[0].deck.at(-1).uid,expensive.uid);
});

test('Wild allows declining and orders both looked-at cards at the bottom',()=>{
 const s=field();
 give(s,0,'deck',[WATER,NATURE,...Array(16).fill(NATURE)]);
 const [first,second]=s.players[0].deck;
 play(s,WILD);
 pick(s,null);
 pick(s,second.uid);
 drain(s);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[second.uid,first.uid]);
});

for(const fieldOwner of [0,1])test('Wild adds Sonic Command only with its own field and affects seal removal '+fieldOwner,()=>{
 const s=field(),ally=put(s,0,'battle',NATURE),opponent=put(s,1,'battle',WATER);
 put(s,0,'battle',WILD);
 put(s,fieldOwner,'battle',FIELD);
 const vv=play(s,VV);
 drain(s);
 const before=s.players[0].seals.length;
 const newAlly=play(s,WATER);
 drain(s);
 const withField=fieldOwner===0;
 assert.equal(s.players[0].seals.length,before-Number(withField));
 assert.equal(before,3);
 assert.ok(has(s,0,'battle',vv));
 assert.equal(e.effectiveCard(ally,s).race.includes('ソニック・コマンド'),withField);
 assert.ok(e.effectiveCard(ally,s).race.includes(e.card(NATURE).race));
 assert.equal(e.effectiveCard(newAlly,s).race.includes('ソニック・コマンド'),withField);
 assert.equal(e.effectiveCard(opponent,s).race.includes('ソニック・コマンド'),false);
 if(withField){
  put(s,1,'battle',GEN);
  assert.ok(e.abilitiesIgnored(s,ally)&&e.effectiveCard(ally,s).race.includes('ソニック・コマンド'));
  s.players[0].battle=s.players[0].battle.filter(x=>x.cardId!==FIELD);
  assert.ok(!e.effectiveCard(ally,s).race.includes('ソニック・コマンド'));
 }
});

for(const id of [WAYOU,HADES])test(id+' charges tapped',()=>{
 const s=field(),x=put(s,0,'hand',id);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x)&&x.tapped);
});

test('Wayou simultaneously moves all multicolor cards and protects one chosen ally per card',()=>{
 const s=field(),first=put(s,0,'grave',MULTI),second=put(s,0,'grave',HADES);
 const mono=put(s,0,'grave',NATURE),ally=put(s,0,'battle',NATURE),other=put(s,0,'battle',STRONG);
 const wayou=play(s,WAYOU);
 assert.ok(e.effectiveCard(wayou,s).blocker&&first.tapped&&second.tapped);
 assert.ok(has(s,0,'mana',first)&&has(s,0,'mana',second)&&has(s,0,'grave',mono));
 resolveOrder(s,WAYOU);
 pick(s,ally.uid);
 resolveOrder(s,WAYOU);
 pick(s,wayou.uid);
 assert.ok(e.effectiveCard(ally,s).untargetable&&e.effectiveCard(wayou,s).untargetable);
 assert.ok(!e.effectiveCard(ally,s).cannotBeAttacked&&!e.effectiveCard(other,s).untargetable);
 put(s,1,'battle',GEN);
 assert.ok(e.abilitiesIgnored(s,ally)&&e.effectiveCard(ally,s).untargetable);
 end(s);
 s.phase='main';
 play(s,HADES);
 assert.deepEqual(choices(s),[other.uid]);
 pick(s,other.uid);
 end(s);
 assert.equal(s.active,0);
 assert.ok(!e.effectiveCard(ally,s).untargetable&&!e.effectiveCard(wayou,s).untargetable);
});

test('Wayou triggers for a regular mana charge and may protect the same ally',()=>{
 const s=field(),ally=put(s,0,'battle',WAYOU);
 const x=put(s,0,'hand',NATURE);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 pick(s,ally.uid);
 assert.ok(e.effectiveCard(ally,s).untargetable);
});

for(const n of [3,4])test('Hades bounces to the owner and checks visible multicolor mana '+n,()=>{
 const s=field(),borrowed=put(s,1,'battle',STRONG,{cardOwner:0});
 for(let i=0;i<4;i++)put(s,0,'mana',MULTI,{tapped:true,faceDown:i>=n});
 play(s,HADES);
 pick(s,borrowed.uid);
 assert.ok(has(s,0,'hand',borrowed)&&!has(s,1,'hand',borrowed));
 assert.equal(!!s.decision,n===4);
 if(n===4){
  const top=s.players[0].deck[0];
  drain(s);
  assert.ok(has(s,0,'hand',top));
 }
});

test('Hades watches opposing entries and separate departures, and its draw can be declined',()=>{
 const s=field(),hades=put(s,0,'battle',HADES);
 for(let i=0;i<4;i++)put(s,0,'mana',MULTI);
 s.active=1;
 play(s,STRONG);
 assert.equal(s.decision.player,0);
 pick(s,0);
 assert.equal(s.players[0].hand.length,0);
 play(s,FIELD);
 assert.ok(!s.decision);
 put(s,1,'battle',WEAK);
 put(s,1,'battle',WEAK);
 s.active=0;
 const hell=play(s,SWEEP);
 for(let i=0;i<2;i++){
  resolveOrder(s,HADES);
  assert.deepEqual(choices(s),[0,1]);
  pick(s,1);
 }
 assert.equal(s.players[0].hand.length,2);
 assert.ok(!s.decision&&has(s,0,'battle',hades)&&has(s,0,'grave',hell));
});

test('Hades sees neither an ally leaving nor an enemy leaving simultaneously with itself',()=>{
 const s=field(),hades=put(s,0,'battle',HADES);
 for(let i=0;i<4;i++)put(s,0,'mana',MULTI);
 const ally=put(s,0,'battle',WEAK);
 play(s,SWEEP);
 assert.ok(!s.decision&&has(s,0,'grave',ally));
 hades.powerModifiers=[{amount:-3000,expires:'end',who:0}];
 const enemy=put(s,1,'battle',WEAK);
 play(s,SWEEP);
 assert.ok(!s.decision&&has(s,0,'grave',hades)&&has(s,1,'grave',enemy));
});

test('Sazanji can decline, sacrifice itself or attempt to destroy a creature that stays',()=>{
 for(const mode of ['decline','self','complex']){
  const s=field(),enemy=put(s,1,'battle',WEAK),large=put(s,1,'battle',STRONG);
  const protectedAlly=mode==='complex'&&put(s,0,'battle',COMPLEX,{tapped:true});
  const source=play(s,SAZANJI),before=physical(s);
  pick(s,mode==='decline'?null:mode==='self'?source.uid:protectedAlly.uid);
  drain(s);
  assert.equal(has(s,0,'grave',source),mode==='self');
  if(protectedAlly)assert.ok(has(s,0,'battle',protectedAlly));
  assert.equal(has(s,1,'grave',enemy),mode!=='decline');
  assert.equal(e.power(large,false,s),e.card(STRONG).power-(mode==='decline'?0:2000));
  assert.deepEqual(physical(s),before);
  end(s);
  assert.equal(e.power(large,false,s),e.card(STRONG).power);
 }
});

test('Sazanji resolves S-Trigger as a creature during the opponent turn',()=>{
 const s=field(),attacker=put(s,1,'battle',NATURE),ally=put(s,0,'battle',WEAK);
 give(s,0,'shields',[SAZANJI]);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===SAZANJI);
 pick(s,ally.uid);
 drain(s);
 assert.ok(has(s,0,'grave',ally)&&has(s,1,'grave',attacker));
 assert.ok(s.players[0].battle.some(x=>x.cardId===SAZANJI));
});
