import test from 'node:test';
import assert from 'node:assert/strict';
import {e,data,setup,inst,act,drain,give,PRESETS,attack,GEN} from './target-fixture.mjs';
import {verifyMainBatch} from './target8500-main-fixture.mjs';
import {put,pick,playFace} from './target8500-twin-fixture.mjs';
const m=verifyMainBatch(1663,{skipExecution:true});
const NYAT='dmr06-035',FIELD='dm23bd4-009',RAPIA='dmc51-005',DRAGON='dm08-049',UNKNOWN='dm25ex2-031',RED='dm01-097',GREEN='dm01-108',WATER='dm01-083',LIGHT='dm01-075';
const phys=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const saver=(s,x)=>legal(s,'replaceUltra').some(a=>a.uid===x.uid);
const choices=s=>(s.decision?.choices||[]).map(x=>x.value?.uid??x.value);
function add(s,p,z,id){const x=inst(id);x.cardOwner=p;s.players[p][z].push(x);return x;}
function field(p=0){const s=setup();s.active=p;for(const q of[0,1])give(s,q,'deck',Array(35).fill(GREEN));return s;}
function move(s,p,x,to='grave',nonDestroy=false){s.phase='main';s.extTasks=[nonDestroy?{op:'g34_Sweep',p:1-p,source:'dm01-050',owner:'opponent',filter:{exactUid:x.uid},g815PutInGrave:true}:{op:'g34_ExactMove',p:1-p,source:'dm01-050',owner:p,target:x.uid,to}];act(s,'toAttack');}
function finish(s){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<300);const a=e.getLegalActions(s).find(a=>['allowLeave','noBlock'].includes(a.kind));e.step(s,a??e.chooseAI(s));}}

for(const p of[0,1])for(const id of[NYAT,FIELD,RAPIA])test('Paid entry and printed mana retain the actual card and original payment '+[p,id],()=>{
 let s=field(p);const payments=s.players[p].mana.map(x=>x.uid),top=s.players[p].deck[0],x=playFace(s,id),before=phys(s);s=JSON.parse(JSON.stringify(s));drain(s);
 assert.ok(has(s,p,'battle',x));assert.equal(s.players[p].mana.filter(x=>payments.includes(x.uid)&&x.tapped).length,4);assert.deepEqual(phys(s),before);
 assert.equal(s.players[p].mana.length,50+(id===FIELD?1:0));if(id===FIELD){assert.ok(has(s,p,'mana',top));assert.equal(s.players[p].mana.find(x=>x.uid===top.uid).tapped,true);assert.equal(e.card(id).type,'field');assert.equal(e.isCreature(s,s.players[p].battle.find(y=>y.uid===x.uid)),false);}
 s=field(p);s.phase='charge';give(s,p,'hand',[id]);const charge=s.players[p].hand[0];act(s,'charge',a=>a.uid===charge.uid);assert.ok(has(s,p,'mana',charge));assert.equal(charge.tapped,id!==NYAT);assert.equal(e.card(id).manaValue,1);
});

for(const p of[0,1])for(const mode of['save','decline','bounce','mana','putGrave','wrongRace','enemy','ignored','sealed'])test('Nyattaramon Saver is optional and only protects own Unknown destruction '+[p,mode],()=>{
 let s=field(p);const source=put(s,p,NYAT),owner=mode==='enemy'?1-p:p,target=put(s,owner,mode==='wrongRace'?NYAT:UNKNOWN);
 if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='sealed'){source.sealed=true;s.players[p].seals.push({...inst(RED),faceDown:true,sealOf:source.uid});}
 const before=phys(s);move(s,owner,target,mode==='bounce'?'hand':mode==='mana'?'mana':'grave',mode==='putGrave');
 const available=['save','decline'].includes(mode);assert.equal(saver(s,source),available);
 if(available){s=JSON.parse(JSON.stringify(s));act(s,mode==='save'?'replaceUltra':'allowLeave',a=>mode!=='save'||a.uid===source.uid);}finish(s);
 assert.equal(has(s,p,'grave',source),mode==='save');assert.equal(has(s,owner,'battle',target),mode==='save');assert.deepEqual(phys(s),before);
});
for(const p of[0,1])test('Nyattaramon blocks, attacks tapped creatures and cannot attack the player '+p,()=>{
 const s=field(p),x=put(s,p,NYAT),target=put(s,1-p,RED);target.tapped=true;s.phase='attack';assert.ok(legal(s,'attack').some(a=>a.uid===x.uid&&a.target===target.uid));assert.ok(!legal(s,'attack').some(a=>a.uid===x.uid&&a.target==='player'));
 s.active=1-p;target.tapped=false;attack(s,target.uid);assert.ok(legal(s,'block').some(a=>a.uid===x.uid));act(s,'block',a=>a.uid===x.uid);finish(s);assert.ok(has(s,p,'battle',x));assert.ok(has(s,1-p,'grave',target));
});
for(const p of[0,1])test('One Nyattaramon can save only one simultaneous Unknown destruction '+p,()=>{
 const s=field(p),source=put(s,p,NYAT),a=put(s,p,UNKNOWN),b=put(s,p,UNKNOWN),before=phys(s);s.extTasks=[{op:'g34_Sweep',p:1-p,source:RED,owner:'opponent',filter:{race:'アンノウン'}}];act(s,'toAttack');assert.ok(saver(s,source));act(s,'replaceUltra',x=>x.uid===source.uid);assert.ok(!saver(s,source));finish(s);assert.equal([a,b].filter(x=>has(s,p,'battle',x)).length,1);assert.ok(has(s,p,'grave',source));assert.deepEqual(phys(s),before);
});

for(const p of[0,1])for(const mode of['live','ignoredSource','ignoredTarget','sourceLeft'])test('Dragon World grants speed only to live own Dragon creatures '+[p,mode],()=>{
 const s=field(p),source=put(s,p,FIELD),dragon=put(s,p,DRAGON),other=put(s,p,RED),enemy=put(s,1-p,DRAGON);for(const x of[dragon,other,enemy])x.entered=s.turn;
 if(mode==='ignoredSource')source.g35Ignored=s.turn;if(mode==='ignoredTarget')dragon.g35Ignored=s.turn;if(mode==='sourceLeft'){s.players[p].battle.splice(s.players[p].battle.indexOf(source),1);s.players[p].hand.push(source);}
 s.phase='attack';const attacks=legal(s,'attack').map(a=>a.uid);assert.equal(attacks.includes(dragon.uid),mode==='live');for(const x of[source,other,enemy])assert.ok(!attacks.includes(x.uid));assert.ok(has(s,p,mode==='sourceLeft'?'hand':'battle',source));
});
for(const p of[0,1])for(const to of['grave','hand','mana','deck','putGrave'])test('Dragon World Ultra Saver replaces every own Dragon departure including a noncreature Field '+[p,to],()=>{
 for(const id of[DRAGON,FIELD]){let s=field(p);const source=put(s,p,FIELD),target=put(s,p,id);if(id===DRAGON)target.under=[inst(GREEN)];const before=phys(s);move(s,p,target,to==='putGrave'?'grave':to,to==='putGrave');assert.ok(saver(s,source));s=JSON.parse(JSON.stringify(s));act(s,'replaceUltra',a=>a.uid===source.uid);finish(s);assert.ok(has(s,p,'battle',target));assert.ok(has(s,p,'grave',source));assert.deepEqual(phys(s),before);}
});
for(const p of[0,1])for(const mode of['nonDragon','enemy','ignored','sealed','indestructible','decline'])test('Dragon World protection requires a usable allied source and may be declined '+[p,mode],()=>{
 const s=field(p),source=put(s,p,FIELD),owner=mode==='enemy'?1-p:p,target=put(s,owner,mode==='nonDragon'?RED:DRAGON);
 if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='sealed'){source.sealed=true;s.players[p].seals.push({...inst(RED),faceDown:true,sealOf:source.uid});}if(mode==='indestructible')s.extLimits=[{kind:'g409AttackEffect',player:p,ref:{uid:source.uid,incarnation:source.incarnation||0},source:RED,effect:'destroySafe',expires:'end',who:s.active}];
 move(s,owner,target,'hand');assert.equal(saver(s,source),mode==='decline');if(mode==='decline')act(s,'allowLeave');finish(s);assert.ok(has(s,owner,'hand',target));assert.ok(has(s,p,'battle',source));
});
for(const p of[0,1])test('Historic Fields coexist, are not zero-power creatures, and remain active under Genmu '+p,()=>{
 const s=field(p);put(s,1-p,GEN);const a=playFace(s,FIELD);drain(s);const b=playFace(s,FIELD);drain(s);assert.ok(has(s,p,'battle',a)&&has(s,p,'battle',b));assert.equal(s.players[p].grave.length,0);const target=put(s,p,'dm05-s04');target.entered=s.turn;s.phase='attack';assert.ok(legal(s,'attack').some(x=>x.uid===target.uid));assert.ok(!legal(s,'attack').some(x=>x.uid===a.uid||x.uid===b.uid));
});
for(const p of[0,1])test('A single Field is reserved once during simultaneous Dragon departures '+p,()=>{
 const s=field(p),source=put(s,p,FIELD),a=put(s,p,DRAGON),b=put(s,p,DRAGON),before=phys(s);s.extTasks=[{op:'g34_Sweep',p:1-p,source:RED,owner:'opponent',to:'hand',filter:{creature:true,race:'ドラゴン'}}];act(s,'toAttack');assert.ok(saver(s,source));act(s,'replaceUltra',a=>a.uid===source.uid);assert.ok(!saver(s,source));finish(s);assert.equal([a,b].filter(x=>has(s,p,'battle',x)).length,1);assert.ok(has(s,p,'grave',source));assert.deepEqual(phys(s),before);
});

for(const p of[0,1])for(const n of[1,2])for(const reduction of[0,1])test('Rapia independently chooses optional Dragon reduction on each summon '+[p,n,reduction],()=>{
 const s=field(p);for(let i=0;i<n;i++)put(s,p,RAPIA);const x=playFace(s,DRAGON);assert.equal(s.decision?.task?.op,'g34_PayAura560');assert.ok(choices(s).includes(n));pick(s,reduction?n:0);drain(s);assert.ok(has(s,p,'battle',x));assert.equal(s.players[p].mana.filter(x=>x.tapped).length,Math.max(1,e.card(DRAGON).cost-(reduction?n:0)));
});
for(const p of[0,1])for(const mode of['ignored','sealed','enemy','nonDragon','field','cancel'])test('Rapia reduction respects controller, creature type, active abilities and cancellation '+[p,mode],()=>{
 const s=field(p),source=put(s,mode==='enemy'?1-p:p,RAPIA);if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='sealed'){source.sealed=true;s.players[p].seals.push({...inst(RED),faceDown:true,sealOf:source.uid});}
 const id=mode==='nonDragon'?RED:mode==='field'?FIELD:DRAGON,x=playFace(s,id),beforeMana=s.players[p].mana.filter(x=>x.tapped).length;
 if(mode==='cancel'){assert.equal(beforeMana,0);pick(s,false);assert.ok(has(s,p,'hand',x));assert.equal(s.players[p].mana.filter(x=>x.tapped).length,0);}else{assert.notEqual(s.decision?.task?.op,'g34_PayAura560');drain(s);assert.ok(has(s,p,'battle',x));}
});
for(const p of[0,1])for(const mode of['recover','declineRecover','declineMana','ignored','bounce','putGrave','noTarget','replacement'])test('Rapia recovers one own mana Dragon only after its actual optional destruction replacement '+[p,mode],()=>{
 let s=field(p);const source=put(s,p,RAPIA);if(mode==='ignored')source.g35Ignored=s.turn;const dragon=mode==='noTarget'?null:add(s,p,'mana',DRAGON),wrong=add(s,p,'mana',FIELD),hidden=add(s,p,'mana',DRAGON),enemy=add(s,1-p,'mana',DRAGON);hidden.faceDown=true;const before=phys(s);
 if(mode==='replacement'){const panesko=put(s,p,'dm24rp2-009');move(s,p,panesko);act(s,'replaceAter',a=>a.uid===source.uid);}else move(s,p,source,mode==='bounce'?'hand':'grave',mode==='putGrave');
 const available=['recover','declineRecover','declineMana','noTarget'].includes(mode);assert.equal(legal(s,'replaceYamata').length>0,available);
 if(available){if(mode==='declineMana')act(s,'allowLeave');else{act(s,'replaceYamata');assert.ok(has(s,p,'mana',source));assert.equal(s.players[p].mana.find(x=>x.uid===source.uid).tapped,true);assert.ok(!has(s,p,'battle',source));if(mode==='noTarget')assert.equal(s.decision,null);else{assert.equal(s.decision?.task?.op,'g34_Select');assert.deepEqual(choices(s).filter(x=>x!==null),[dragon.uid]);s=JSON.parse(JSON.stringify(s));pick(s,mode==='recover'?dragon.uid:null);}}}
 finish(s);assert.equal(!!dragon&&has(s,p,'hand',dragon),mode==='recover');assert.ok(has(s,p,'mana',wrong)&&has(s,p,'mana',hidden)&&has(s,1-p,'mana',enemy));if(mode!=='replacement')assert.deepEqual(phys(s),before);
});
for(const p of[0,1])test('Simultaneous Rapia replacements finish all zone moves before either optional recovery '+p,()=>{
 let s=field(p);const a=put(s,p,RAPIA),b=put(s,p,RAPIA),dragon1=add(s,p,'mana',DRAGON),dragon2=add(s,p,'mana',DRAGON),before=phys(s);s.extTasks=[{op:'g34_Sweep',p:1-p,source:RED,owner:'opponent',filter:{creature:true}}];act(s,'toAttack');act(s,'replaceYamata');act(s,'replaceYamata');assert.ok(has(s,p,'mana',a)&&has(s,p,'mana',b));assert.equal(s.decision?.task?.op,'g34_Select');pick(s,dragon1.uid);s=JSON.parse(JSON.stringify(s));pick(s,dragon2.uid);finish(s);assert.ok(has(s,p,'hand',dragon1)&&has(s,p,'hand',dragon2));assert.deepEqual(phys(s),before);
});
for(const p of[0,1])test('Rapia does not recover a Dragon when Driver supplies a different mana replacement '+p,()=>{
 const s=field(p),source=put(s,p,RAPIA);put(s,p,'dm22rp2-050');const dragon=add(s,p,'mana',DRAGON),before=phys(s);move(s,p,source);assert.equal(legal(s,'replaceYamata').length,2);act(s,'replaceYamata',a=>!!a.key);finish(s);assert.ok(has(s,p,'mana',source));assert.ok(has(s,p,'mana',dragon));assert.equal(s.players[p].hand.length,0);assert.deepEqual(phys(s),before);
});
for(const p of[0,1])test('Six Rapias retain the one mana floor and manual selection pays exactly the reduced cost '+p,()=>{
 let s=field(p);for(let i=0;i<6;i++)put(s,p,RAPIA);const x=add(s,p,'hand',DRAGON),play=legal(s,'play').find(a=>a.uid===x.uid);e.step(s,play,{manualMana:true});const reduction=legal(s,'extended').find(a=>s.decision.choices[a.choice].value===6);e.step(s,reduction,{manualMana:true});assert.equal(s.decision.type,'manaPayment');assert.equal(s.decision.cost,1);s=JSON.parse(JSON.stringify(s));const payment=s.players[p].mana.find(x=>x.cardId===RED);act(s,'selectMana',a=>a.uid===payment.uid);act(s,'confirmMana');drain(s);assert.ok(has(s,p,'battle',x));assert.equal(s.players[p].mana.filter(x=>x.tapped).length,1);
});
for(const p of[0,1])for(const id of[NYAT,FIELD,RAPIA])test('Online Saver and recovery choices are exposed only to the correct account '+[p,id],async()=>{
 const {projectRoom}=await import('../server/duel-core.mjs');try{
  const s=field(p),source=put(s,p,id),target=id===RAPIA?source:put(s,p,id===NYAT?UNKNOWN:DRAGON);const dragon=add(s,p,'mana',DRAGON);move(s,p,target);
  if(id===RAPIA)act(s,'replaceYamata');const room={hostUid:'h',guestUid:'g',phase:'playing',expiresAt:Date.now()+60000,profiles:[{name:'H'},{name:'G'}],events:[],game:s},own=projectRoom(room,{uid:p?'g':'h'}),other=projectRoom(room,{uid:p?'h':'g'});
  assert.equal(other.game.actions.length,0);assert.ok(own.game.actions.some(a=>a.kind===(id===RAPIA?'extended':'replaceUltra')));if(id===RAPIA){assert.ok(own.game.actions.some(a=>a.label.includes(e.card(DRAGON).name)));pick(s,dragon.uid);assert.ok(has(s,p,'hand',dragon));}else act(s,'replaceUltra',a=>a.uid===source.uid);finish(s);
 }finally{e.setRandomSource(null);}
});
for(const p of[0,1])for(const id of[NYAT,FIELD,RAPIA])test('AI ranking and hidden identities do not mutate the new cards or leak private information '+[p,id],()=>{
 const s=field(p);put(s,p,id);put(s,p,DRAGON);give(s,p,'hand',[id,DRAGON,RED]);const before=JSON.stringify(s),choice=e.chooseAI(s),rank=e.rankHeuristicActions(s);assert.equal(JSON.stringify(s),before);for(const z of['hand','deck','shields'])for(const x of s.players[1-p][z])x.cardId=GEN;assert.deepEqual(e.chooseAI(s),choice);assert.deepEqual(e.rankHeuristicActions(s),rank);
});
for(const first of[0,1])test('Legal forty-card game finishes after JSON continuation with eighty stable physical cards '+first,()=>{
 const deck={id:'phase1663',name:'Phase 1663',cards:[NYAT,FIELD,RAPIA,DRAGON,UNKNOWN,RED,GREEN,WATER,LIGHT,'dm01-050'].map(id=>({id,count:4}))};assert.deepEqual(e.validateDeck(deck),[]);let s=e.createGame([deck,PRESETS[first]],{seed:166301+first,first}),saved=false;const before=phys(s);while(s.winner===null&&s.actions<2200&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(phys(s),before);assert.equal(new Set(phys(s)).size,80);if(!saved&&s.actions>30){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);
});
test('Official reprints and the Field mana erratum add no duplicate identity or partial definition',()=>{
 for(const row of m.cards){assert.ok(row.verification.imageReviewed);assert.equal(data.cards.filter(x=>x.name===row.name).length,1);if(row.currentPrint){assert.ok(row.currentPrint.verification.facesMatched&&row.currentPrint.verification.imageReviewed);assert.match(row.currentPrint.verification.imageSha256,/^[a-f0-9]{64}$/);assert.ok(!data.cards.some(x=>x.id===row.currentPrint.id));}}
 assert.ok(m.rulingVerification.some(x=>x.source.endsWith('/38631/')));assert.ok(m.rulingVerification.some(x=>x.source.endsWith('/316658/')));assert.ok(m.deferredCandidates.some(x=>x.id==='dmx02-003'));assert.ok(!data.cards.some(x=>x.id==='dmx02-003'));
});
for(const p of[0,1])test('QA38631 actual Dragon World start ability still deploys its milled Dragon after the new Field saves it '+p,()=>{
 let s=field(1-p);const world=put(s,p,'dmex12-011'),source=put(s,p,FIELD);give(s,p,'deck',[DRAGON,GREEN,GREEN,GREEN]);const top=s.players[p].deck[0],before=phys(s);s.phase='attack';act(s,'endTurn');assert.equal(s.active,p);pick(s,true);assert.ok(saver(s,source));s=JSON.parse(JSON.stringify(s));act(s,'replaceUltra',a=>a.uid===source.uid);finish(s);assert.ok(has(s,p,'battle',world)&&has(s,p,'battle',top)&&has(s,p,'grave',source));assert.deepEqual(phys(s),before);
});
for(const p of[0,1])test('Zero-power Rapia uses its destruction replacement once, then recovers from mana without a lost physical card '+p,()=>{
 const s=field(p),source=put(s,p,RAPIA),dragon=add(s,p,'mana',DRAGON),before=phys(s);source.powerModifiers=[{amount:-3000,expires:'end',who:p}];act(s,'toAttack');assert.ok(legal(s,'replaceYamata').length);act(s,'replaceYamata');assert.ok(has(s,p,'mana',source));pick(s,dragon.uid);finish(s);assert.ok(has(s,p,'hand',dragon));assert.ok(!has(s,p,'grave',source));assert.deepEqual(phys(s),before);
});
