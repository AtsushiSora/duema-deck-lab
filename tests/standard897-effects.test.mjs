import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN,GG} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
const VEVE='dmrp14-007',GOU='dmrp13-s03',MERI='dmrp16-046',REPRINT='dm24bd5-045';
const SMALL='dm01-108',WATER='dm01-083',FIRE='dm01-097',LIGHT='dm01-075',DARK='dm01-090',BIG='dm05-s04',SPELL='dm06-085',SEED='dmsd20-016',ZERO='dmsd01-012';
function field(p=0){const s=setup();s.active=p;for(const q of [0,1])give(s,q,'deck',Array(30).fill(SMALL));return s;}
function add(s,p,z,id,props){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
function play(s,id){s.phase='main';const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
const vals=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>typeof v==='function'?v(s.decision.choices[a.choice].value):vals(s)[a.choice]===(v?.uid??v));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
function invoke(s,p,defs){s.phase='main';s.extTasks=[{op:'g34_Sequence',p,source:VEVE,defs}];act(s,'toAttack');}
function deploy(s,p,x,origin='hand'){invoke(s,p,[{op:'Put',origin,target:x.uid}]);}
function seal(s,p,x){x.sealed=true;add(s,p,'seals',SMALL,{sealOf:x.uid,faceDown:true});}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function finishToUntap(s){for(let n=0;s.decision&&!(s.decision.type==='extended'&&s.decision.task?.op==='g34_Target');n++){assert.ok(n<100);if(s.decision.type==='block')act(s,'noBlock');else e.step(s,e.chooseAI(s));}}
function move(s,p,x,to='grave'){invoke(s,1-p,[{op:'ExactMove',owner:p,target:x.uid,targetIncarnation:x.incarnation||0,to}]);}
function shields(s,n){give(s,0,'shields',Array(Math.min(n,3)).fill(SMALL));give(s,1,'shields',Array(Math.max(0,n-3)).fill(SMALL));}

test('Phase 897 verifies three whole definitions, four official prints and original deck IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-897.json',import.meta.url))),cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[VEVE,GOU,MERI]);assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,MERI]]);
 for(const row of [...m.cards,...m.printAliases]){const canonical=m.cards.find(c=>c.id===(row.canonicalId||row.id));assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:897}),canonical.spec);assert.ok(row.verification.facesMatched);assert.equal(m.regulationVerification.limits[row.id],4);}
 assert.deepEqual(cat.resolveRows([{id:MERI,count:2},{id:REPRINT,count:2}]),[{id:MERI,count:4}]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;assert.deepEqual(d.faces,row.faces);assert.throws(()=>standardCardSpec(d,{phase:896}));
  const changed=structuredClone(d);changed.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(changed,{phase:897}));for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);assert.equal(CARD_IMAGES[row.id],row.image);assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
 const deck={id:'phase897',name:'最初の攻撃と鬼札',cards:[VEVE,GOU,MERI,SMALL,WATER,FIRE,LIGHT,DARK,BIG,SPELL].map(id=>({id,count:4}))};assert.deepEqual(e.validateDeck(deck),[]);assert.equal(cat.coverage(deck).unsupported,0);
});

for(const p of [0,1])test('Veve has real speed attacker and untaps a chosen ally only after the first completed attack '+p,()=>{
 let s=field(p),ally=add(s,p,'battle',SMALL,{tapped:true}),source=play(s,VEVE),before=ids(s);attack(s,source.uid);assert.ok(source.tapped);assert.equal(s.decision.type,'block');finishToUntap(s);
 assert.equal(s.players[1-p].shields.length,4);assert.deepEqual(new Set(vals(s)),new Set([ally.uid,source.uid]));s=JSON.parse(JSON.stringify(s));pick(s,source);assert.equal(s.players[p].battle.find(x=>x.uid===source.uid).tapped,false);
 attack(s,source.uid);drain(s);assert.equal(s.players[1-p].shields.length,3);assert.ok(s.players[p].battle.find(x=>x.uid===source.uid).tapped);assert.deepEqual(ids(s),before);
});

for(const p of [0,1])test('Veve also watches the opponent first attack and can untap itself after blocking (QA33588) '+p,()=>{
 const s=field(p),source=add(s,1-p,'battle',VEVE),attacker=add(s,p,'battle',SMALL),other=add(s,1-p,'battle',WATER,{tapped:true});attack(s,attacker.uid);act(s,'block',a=>a.uid===source.uid);assert.ok(source.tapped);finishToUntap(s);
 assert.ok(has(s,p,'grave',attacker));assert.equal(s.players[1-p].shields.length,5);assert.deepEqual(new Set(vals(s)),new Set([source.uid,other.uid]));pick(s,source);assert.equal(source.tapped,false);
});

test('Veve tracks the first attack across different attackers, including attacks before the source entered',()=>{
 const s=field(),a=add(s,0,'battle',SMALL);attack(s,a.uid);drain(s);const source=play(s,VEVE),b=add(s,0,'battle',BIG);attack(s,b.uid);drain(s);assert.ok(b.tapped);assert.equal(s.decision,null);assert.ok(has(s,0,'battle',source));
});

test('Veve resolves each source separately and does not require its chosen ally to be tapped',()=>{
 const s=field(),a=add(s,0,'battle',VEVE),b=add(s,0,'battle',VEVE),ally=add(s,0,'battle',SMALL);attack(s,a.uid);while(s.decision?.type==='block'||s.decision?.type==='breakChoice')e.step(s,e.chooseAI(s));
 assert.equal(s.decision.type,'effectOrder');act(s,'orderEffect',x=>x.uid===a.uid);pick(s,ally);assert.equal(s.decision.task.op,'g34_Target');pick(s,a);assert.equal(a.tapped,false);assert.equal(b.tapped,false);
});

test('Veve is checked at attack end, so a source entering during the first attack can trigger and a departed source cannot',()=>{
 for(const mode of ['late','left','ignored','sealed','genmu']){
  const s=field(),a=add(s,0,'battle',BIG),source=mode==='late'?null:add(s,0,'battle',VEVE);attack(s,a.uid);
  if(mode==='late')add(s,0,'battle',VEVE);if(mode==='left')s.players[0].grave.push(s.players[0].battle.splice(s.players[0].battle.indexOf(source),1)[0]);if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='sealed')seal(s,0,source);if(mode==='genmu')add(s,1,'battle',GEN);
  finishToUntap(s);assert.equal(!!s.decision,mode==='late',mode);if(mode==='late'){pick(s,a);assert.equal(a.tapped,false);}
 }
});

test('Veve first-attack history resets each turn and GG does not suppress an attack-end ability',()=>{
 const s=field(),source=add(s,0,'battle',VEVE);add(s,1,'battle',GG).under=[inst(SMALL)];attack(s,source.uid);finishToUntap(s);pick(s,source);attack(s,source.uid);drain(s);assert.ok(source.tapped);end(s);const enemy=add(s,1,'battle',SMALL);attack(s,enemy.uid);finishToUntap(s);pick(s,source);assert.equal(source.tapped,false);
});

for(const p of [0,1])for(const to of ['grave','hand','mana','deck'])test('Gouken can replace its departure to '+to+' by discarding any one hand card '+p,()=>{
 let s=field(p),source=add(s,p,'battle',GOU),cost=add(s,p,'hand',WATER),spell=add(s,p,'hand',SPELL),seed=add(s,p,'hand',SEED),before=ids(s);move(s,p,source,to);assert.equal(s.decision.type,'leaveReplace');act(s,'replaceJashin');assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='leaveHand').map(a=>a.uid),[cost.uid,spell.uid,seed.uid]);
 s=JSON.parse(JSON.stringify(s));act(s,'leaveHand',a=>a.uid===cost.uid);drain(s);assert.ok(has(s,p,'battle',source)&&has(s,p,'grave',cost)&&has(s,p,'hand',spell)&&has(s,p,'hand',seed));assert.deepEqual(ids(s),before);
});

test('Gouken can cancel its hand selection, decline the replacement, and leaves without a hand card',()=>{
 const s=field(),source=add(s,0,'battle',GOU);add(s,0,'hand',WATER);move(s,0,source);act(s,'replaceJashin');act(s,'cancelLeaveHand');act(s,'allowLeave');assert.ok(has(s,0,'grave',source));assert.equal(s.players[0].hand.length,1);
 const t=field(),x=add(t,0,'battle',GOU);move(t,0,x,'hand');assert.equal(t.decision,null);assert.ok(has(t,0,'hand',x));
});

test('Two Gouken sources cannot pay for simultaneous departures with the same hand card',()=>{
 const s=field(),a=add(s,0,'battle',GOU),b=add(s,0,'battle',GOU),cost=add(s,0,'hand',WATER),before=ids(s);invoke(s,1,[{op:'Sweep',to:'grave',filter:{creature:true}}]);act(s,'replaceJashin');act(s,'leaveHand',x=>x.uid===cost.uid);drain(s);assert.equal(s.players[0].battle.filter(x=>x.cardId===GOU).length,1);assert.equal(s.players[0].grave.filter(x=>x.cardId===GOU).length,1);assert.deepEqual(ids(s),before);assert.ok(a&&b);
});

test('Gouken repeated zero-power cleanup consumes separate cards and can eventually be declined',()=>{
 const s=field(),source=add(s,0,'battle',GOU);give(s,0,'hand',[WATER,SPELL]);source.powerModifiers=[{amount:-6000,expires:'end',who:0}];s.phase='main';act(s,'toAttack');for(let i=0;i<2;i++){act(s,'replaceJashin');act(s,'leaveHand');}assert.ok(has(s,0,'grave',source));assert.equal(s.players[0].hand.length,0);
});

test('Gouken replacement is ignored or sealed, and does not recursively replace another replacement',()=>{
 for(const mode of ['ignored','sealed','genmu']){const s=field(),source=add(s,0,'battle',GOU);add(s,0,'hand',WATER);if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='sealed')seal(s,0,source);if(mode==='genmu')add(s,1,'battle',GEN);move(s,0,source);drain(s);assert.ok(has(s,0,mode==='sealed'?'battle':'grave',source));assert.equal(s.players[0].hand.length,1);}
 const s=field(),source=add(s,0,'battle',GOU),cost=add(s,0,'hand',WATER),other=add(s,0,'battle','dm23rp3-S03');invoke(s,1,[{op:'Target',to:'grave',filter:{exactUid:other.uid}}]);pick(s,other);act(s,'replaceAter',a=>a.uid===source.uid);assert.ok(has(s,0,'battle',other)&&has(s,0,'grave',source)&&has(s,0,'hand',cost));assert.equal(s.decision,null);
});

for(const total of [6,7])test('Gouken Oni Time taps every opposing creature color including colorless, but not own creatures or seeds '+total,()=>{
 for(const id of [WATER,ZERO]){
  const s=field(1);shields(s,total);add(s,0,'battle',GOU);const x=play(s,id);drain(s);assert.equal(x.tapped,total===6,id);
 }
 const s=field();shields(s,total);add(s,0,'battle',GOU);const x=play(s,WATER);drain(s);assert.equal(x.tapped,false);s.active=1;const seed=play(s,SEED);drain(s);assert.equal(seed.tapped,false);
});

test('Gouken Oni Time reads current shield totals and disappears immediately with its source',()=>{
 const s=field(1),source=add(s,0,'battle',GOU);shields(s,7);const a=play(s,WATER);assert.equal(a.tapped,false);shields(s,6);const b=play(s,WATER);assert.equal(b.tapped,true);source.g35Ignored=s.turn;const c=play(s,WATER);assert.equal(c.tapped,false);
});

test('Gouken really has W-Breaker',()=>{const s=field(),source=add(s,0,'battle',GOU);attack(s,source.uid);act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,3);});

for(const p of [0,1])test('Meriris optionally ramps on each opposing entry after the first, including both turns '+p,()=>{
 let s=field(p),source=add(s,1-p,'battle',MERI),mana=s.players[1-p].mana.length;play(s,WATER);assert.equal(s.decision,null);play(s,FIRE);assert.equal(s.decision.task.op,'g34_Offer');assert.equal(s.decision.player,1-p);s=JSON.parse(JSON.stringify(s));pick(s,true);assert.equal(s.players[1-p].mana.length,mana+1);play(s,LIGHT);pick(s,null);assert.equal(s.players[1-p].mana.length,mana+1);assert.ok(has(s,1-p,'battle',source));
});

test('Meriris counts actual nonsummon entries and each creature in a multi-deploy, ignoring seeds and replaced entries',()=>{
 const s=field();add(s,1,'battle',MERI);const seed=play(s,SEED);drain(s);assert.ok(seed);const a=add(s,0,'grave',WATER),b=add(s,0,'grave',FIRE);invoke(s,0,[{op:'Select',origin:'grave',deploy:true,n:2,filter:{creature:true}}]);pick(s,a);pick(s,b);assert.equal(s.decision.task.op,'g34_Offer');pick(s,true);assert.equal(s.players[1].mana.length,51);assert.equal(s.players[0].enteredThisTurn,2);
 const t=field();add(t,1,'battle',MERI);add(t,1,'battle','dm22rp1-049');give(t,0,'mana',[]);const x=add(t,0,'hand',WATER);deploy(t,0,x);assert.ok(has(t,0,'mana',x));assert.equal(t.players[0].enteredThisTurn||0,0);assert.equal(t.decision,null);
});

test('Meriris counts entries before its arrival, while ignored or sealed, and multiple sources each offer separately',()=>{
 for(const mode of ['absent','ignored','sealed','genmu']){
  const s=field();let source=mode==='absent'?null:add(s,1,'battle',MERI),lock;if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='sealed')seal(s,1,source);if(mode==='genmu')lock=add(s,0,'battle',GEN);play(s,WATER);drain(s);if(!source)source=add(s,1,'battle',MERI);delete source.g35Ignored;source.sealed=false;s.players[1].seals=[];if(lock){s.players[0].grave.push(lock);s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==lock.uid);}play(s,FIRE);assert.equal(s.decision.task.op,'g34_Offer',mode);pick(s,true);assert.equal(s.players[1].mana.length,51);
 }
 const s=field();add(s,1,'battle',MERI);add(s,1,'battle',MERI);play(s,WATER);play(s,FIRE);drain(s);assert.equal(s.players[1].mana.length,52);
});

test('Meriris never watches own entries, resets each turn, and its queued ramp survives departure',()=>{
 let s=field(),source=add(s,1,'battle',MERI);play(s,WATER);play(s,FIRE);assert.equal(s.decision.task.op,'g34_Offer');s.players[1].grave.push(s.players[1].battle.pop());s=JSON.parse(JSON.stringify(s));pick(s,true);assert.equal(s.players[1].mana.length,51);s.players[1].battle.push(s.players[1].grave.pop());end(s);play(s,WATER);assert.equal(s.decision,null);const enemy=add(s,0,'grave',WATER);deploy(s,0,enemy,'grave');assert.equal(s.decision,null);assert.ok(source);
});

test('Meriris optional ramp honors deck movement replacement, unavailable deck cards, and can decline the final card',()=>{
 for(const mode of ['replace','held','last']){
  const s=field();add(s,1,'battle',MERI);if(mode==='replace')add(s,1,'battle','dm22ex1-086');if(mode==='held')s.players[1].g34Protected=s.players[1].deck.map(x=>x.uid);if(mode==='last')give(s,1,'deck',[SMALL]);const top=s.players[1].deck[0];play(s,WATER);play(s,FIRE);pick(s,mode==='last'?null:true);drain(s);assert.equal(s.players[1].mana.length,50);if(mode==='replace')assert.ok(has(s,1,'grave',top));if(mode==='held'||mode==='last')assert.ok(has(s,1,'deck',top));assert.equal(s.winner,null);
 }
});

test('Gouken can discard a hand card already scheduled to leave in the same multi-zone effect (QA49400 principle)',()=>{
 const s=field(1),source=add(s,0,'battle',GOU),keep=add(s,0,'battle',WATER);give(s,0,'shields',Array(4).fill(SMALL));give(s,0,'hand',[WATER,SPELL,FIRE]);const kept=s.players[0].hand.slice(0,2),cost=s.players[0].hand[2],before=ids(s),enemy=play(s,'dm24rp4-DM1');
 for(let n=0;s.decision?.task?.op==='g394_Keep';n++){
  assert.ok(n<12);const stage=s.decision.task.stage;
  if(stage===0)pick(s,s.decision.choices[0].value);
  if(stage===1)pick(s,v=>kept.some(x=>x.uid===v));
  if(stage===2)pick(s,keep);
 }
 assert.equal(s.decision.type,'leaveReplace');act(s,'replaceJashin');act(s,'leaveHand',a=>a.uid===cost.uid);drain(s);
 assert.ok(has(s,0,'battle',source)&&has(s,0,'battle',keep)&&has(s,0,'grave',cost));assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].shields.length,3);assert.deepEqual(ids(s),[...before,enemy.uid].sort());
});

test('Meriris fixes the entry ordinal at trigger time, and GG does not suppress an opposing-entry watcher',()=>{
 const s=field();add(s,1,'battle',MERI);add(s,1,'battle',GG).under=[inst(SMALL)];play(s,WATER);play(s,FIRE);assert.equal(s.decision.task.op,'g34_Offer');s.players[0].enteredThisTurn=0;pick(s,true);assert.equal(s.players[1].mana.length,51);
});

test('Veve cannot gain another first-attack trigger by re-enabling an ignored source',()=>{
 const s=field(),source=add(s,0,'battle',VEVE);source.g35Ignored=s.turn;const a=add(s,0,'battle',SMALL);attack(s,a.uid);drain(s);delete source.g35Ignored;attack(s,source.uid);drain(s);assert.ok(source.tapped);assert.equal(s.decision,null);
});
