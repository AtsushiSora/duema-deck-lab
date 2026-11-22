import test from 'node:test';
import assert from 'node:assert/strict';
import {e,setup,inst,act,drain,give} from './target-fixture.mjs';
import {verifyMainBatch} from './target8500-main-fixture.mjs';
import {put,pick,playFace} from './target8500-twin-fixture.mjs';
verifyMainBatch(1614);
const P='dmr12-008',K='dm25rp4-045',R='dm33-018',N='dm01-108',W='dm01-083',D='dm08-049';
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function task(s,p,x,op){s.extTasks=[{op:'g34_'+op,p,source:x.cardId,uid:x.uid,incarnation:x.incarnation||0}];act(s,'toAttack');}
function destroy(s,p,x,to='grave',replacement=false){s.extTasks=[{op:'g34_Sweep',p:1-p,source:'dm01-075',to,filter:{creature:true},both:true,...(replacement?{replacement:true}:{})}];s.phase='main';act(s,'toAttack');}
for(const p of [0,1])test('Pacific start trigger returns source, hand and grave, then draws three before the normal draw '+p,()=>{
 let s=setup();const x=put(s,p,P),other=put(s,p,N),enemy=put(s,1-p,N);give(s,p,'hand',[N,W]);give(s,p,'grave',[N,W]);const original=physical(s),mana=s.players[p].mana.length,shields=s.players[p].shields.length,total=s.players[p].deck.length+5;
 s.active=1-p;s.phase='attack';act(s,'endTurn');drain(s);assert.equal(s.active,p);assert.equal(s.players[p].hand.length,4);assert.equal(s.players[p].grave.length,0);assert.equal(s.players[p].deck.length,total-4);assert.ok(!has(s,p,'battle',x));assert.ok(has(s,p,'battle',other)&&has(s,1-p,'battle',enemy));assert.equal(s.players[p].mana.length,mana);assert.equal(s.players[p].shields.length,shields);s=JSON.parse(JSON.stringify(s));assert.deepEqual(physical(s),original);
});
test('Pacific still resets other zones and draws after its source has left; it never moves a reincarnated source',()=>{
 const s=setup(),x=put(s,0,P);s.players[0].battle=s.players[0].battle.filter(y=>y!==x);s.players[0].mana.push(x);give(s,0,'hand',[N]);give(s,0,'grave',[W]);const before=physical(s);task(s,0,x,'PacificReset1614');drain(s);assert.equal(s.players[0].hand.length,3);assert.equal(s.players[0].grave.length,0);assert.ok(has(s,0,'mana',x));assert.deepEqual(physical(s),before);
 const y=Object.assign(put(s,0,P),{incarnation:1});s.phase='main';s.extTasks=[{op:'g34_PacificReset1614',p:0,source:P,uid:y.uid,incarnation:0}];act(s,'toAttack');drain(s);assert.ok(has(s,0,'battle',y));assert.equal(s.players[0].hand.length,3);
});
test('Pacific respects grave movement locks while still returning its source and hand',()=>{
 const s=setup(),x=put(s,0,P),lock=put(s,1,'dmrp08-014');assert.equal(e.canMoveZone(s,0,'grave'),false);give(s,0,'hand',[N]);give(s,0,'grave',[W]);const grave=s.players[0].grave[0],before=physical(s);task(s,0,x,'PacificReset1614');drain(s);assert.ok(has(s,0,'grave',grave));assert.ok(!has(s,0,'battle',x));assert.equal(s.players[0].hand.length,3);assert.ok(has(s,1,'battle',lock));assert.deepEqual(physical(s),before);
});
for(const evolved of [false,true])test('KUMPU may be summoned normally or G-NEO evolved on any creature '+evolved,()=>{
 let s=setup(),base=put(s,0,W),x=playFace(s,K);act(s,'evolve',a=>evolved?a.baseUid===base.uid:!a.baseUid);drain(s);assert.equal(e.isEvolution(x),evolved);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);const before=physical(s);s=JSON.parse(JSON.stringify(s));s.extTasks=[{op:'g34_Target',p:1,source:'dm01-075',to:'hand'}];s.phase='main';act(s,'toAttack');pick(s,x.uid);drain(s);assert.equal(has(s,0,'battle',x),evolved);assert.equal(has(s,0,'hand',x),!evolved);assert.equal(has(s,0,'hand',base),evolved);assert.deepEqual(physical(s),before);
});
for(const p of [0,1])for(const id of ['dmr23-002','dmrp02-036'])test('KUMPU allows foreign-color ordinary and NEO evolution on all own creatures '+[p,id],()=>{
 const s=setup();s.active=p;const source=put(s,p,K),base=put(s,p,N),enemy=put(s,1-p,N);assert.ok(e.evolutionBases(s,p,e.card(id)).some(x=>x.uid===base.uid));assert.ok(e.evolutionBases(s,p,e.card(id)).some(x=>x.uid===source.uid));assert.ok(!e.evolutionBases(s,1-p,e.card(id)).some(x=>x.uid===enemy.uid));const top=playFace(s,id);act(s,'evolve',a=>a.baseUid===base.uid);drain(s);assert.ok(top.under.some(x=>x.uid===base.uid));
});
test('KUMPU changes only the evolution civilization test, not races, printed mana colors, sealed or ignored abilities',()=>{
 const s=setup(),source=put(s,0,K),base=put(s,0,N);assert.ok(!e.evolutionBases(s,0,e.card('dm02-s02')).some(x=>x.uid===base.uid));assert.deepEqual(e.effectiveCard(base,s).civ,'自然');for(const attr of ['sealed','g35Ignored']){source[attr]=attr==='sealed'?true:s.turn;assert.ok(!e.evolutionBases(s,0,e.card('dmr23-002')).some(x=>x.uid===base.uid));delete source[attr];}s.players[0].battle=s.players[0].battle.filter(x=>x!==source);s.players[0].mana.push(source);assert.ok(!e.evolutionBases(s,0,e.card('dmr23-002')).some(x=>x.uid===base.uid));
});
for(const p of [0,1])for(const accept of [false,true])test('Rinne can replace its own destruction, or decline it '+[p,accept],()=>{
 let s=setup();s.active=p;const x=put(s,p,R),before=physical(s);s.extTasks=[{op:'g34_Target',p:1-p,source:'dm01-075',to:'grave'}];act(s,'toAttack');pick(s,x.uid);assert.ok(e.getLegalActions(s).some(a=>a.kind==='replaceShuffle731'));s=JSON.parse(JSON.stringify(s));act(s,accept?'replaceShuffle731':'allowLeave');drain(s);assert.ok(has(s,p,accept?'deck':'grave',x));assert.deepEqual(physical(s),before);
});
test('Rinne simultaneous destruction allows independently chosen zero, some or all eligible creatures',()=>{
 for(const accepted of [0,1,2,3]){const s=setup(),r=put(s,0,R),d=put(s,0,D),b=put(s,0,'dm12-050'),n=put(s,0,N),enemy=put(s,1,D),before=physical(s);destroy(s,0);let nAccepted=0;for(let i=0;s.decision&&i<30;i++){if(e.getLegalActions(s).some(a=>a.kind==='replaceShuffle731'))act(s,nAccepted++<accepted?'replaceShuffle731':'allowLeave');else act(s,'allowLeave');}drain(s);assert.equal([r,d,b].filter(x=>has(s,0,'deck',x)).length,accepted);assert.ok(has(s,0,'grave',n));assert.ok(has(s,1,'grave',enemy));assert.deepEqual(physical(s),before);}
});
test('Rinne excludes bounce and ability suppression; an opposing Rinne does not protect own creatures',()=>{
 for(const kind of ['bounce','ignored','sealed','enemy']){const s=setup(),r=put(s,kind==='enemy'?1:0,R),d=put(s,0,D);if(kind==='ignored')r.g35Ignored=s.turn;if(kind==='sealed'){r.sealed=true;s.players[0].seals.push({...inst(N),faceDown:true,sealOf:r.uid});}s.extTasks=[{op:'g34_Target',p:1,source:'dm01-075',to:kind==='bounce'?'hand':'grave'}];act(s,'toAttack');pick(s,d.uid);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='replaceShuffle731'),kind);drain(s);assert.ok(has(s,0,kind==='bounce'?'hand':'grave',d));}
});

test('Rinne does not chain its replacement onto destruction used to pay a Saver replacement (QA35893)',()=>{const s=setup(),r=put(s,0,R),saver=put(s,0,'dm22-049'),d=put(s,0,D),before=physical(s);s.extTasks=[{op:'g34_Target',p:1,source:'dm01-027',to:'grave'}];act(s,'toAttack');pick(s,d.uid);act(s,'replaceUltra',a=>a.uid===saver.uid);drain(s);assert.ok(has(s,0,'battle',r)&&has(s,0,'battle',d));assert.ok(has(s,0,'grave',saver));assert.ok(!has(s,0,'deck',saver));assert.deepEqual(physical(s),before);});

for(const muted of [false,true])test('Pacific start trigger does not fire on the opponent turn or while its abilities are ignored '+muted,()=>{const s=setup(),x=put(s,0,P);give(s,0,'hand',[N]);give(s,0,'grave',[W]);if(muted)x.g35Ignored=s.turn+1;s.active=muted?1:0;s.phase='attack';act(s,'endTurn');drain(s);assert.ok(has(s,0,'battle',x));assert.equal(s.players[0].grave.length,1);assert.equal(s.players[0].hand.length,1+Number(muted));});
test('Pacific reset respects the shuffle lock and preserves every card through insertion choices',()=>{let s=setup(),x=put(s,0,P);put(s,1,'dmrp07-m01');give(s,0,'hand',[N,W]);give(s,0,'grave',[W]);const before=physical(s);task(s,0,x,'PacificReset1614');assert.ok(s.decision);s=JSON.parse(JSON.stringify(s));drain(s);assert.equal(s.players[0].hand.length,3);assert.equal(s.players[0].grave.length,0);assert.ok(!has(s,0,'battle',x));assert.deepEqual(physical(s),before);});
for(const first of [0,1])test('new cards work in real forty-card games with JSON resume and no physical-card loss '+first,()=>{const ids=[P,K,R,D,'dm12-050',N,W,'dm01-075','dm01-090','dm01-097'],deck={id:'phase1614',name:'phase1614検証',cards:ids.map(id=>({id,count:4}))};assert.deepEqual(e.validateDeck(deck),[]);const saved=structuredClone(deck);let s=e.createGame([deck,deck],{seed:1614,first}),resumed=false;const before=physical(s);while(s.winner===null&&s.actions<170&&s.turn<16){const a=e.chooseAI(s);assert.ok(a);e.step(s,a);assert.deepEqual(physical(s),before);if(!resumed&&s.actions>=30){s=JSON.parse(JSON.stringify(s));resumed=true;}}assert.ok(resumed);assert.ok(s.log.some(x=>[P,K,R].includes(x.cardId)));assert.deepEqual(deck,saved);assert.deepEqual(physical(s),before);});
