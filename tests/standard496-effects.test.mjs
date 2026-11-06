import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{e,data,details,snapshot,setup,give,inst,act,GEN,GG,PRESETS}from'./target-fixture.mjs';import{standardCardSpec}from'../tools/standard-card-spec.mjs';import{createCatalogue}from'../dist/catalogue.js';import{CARD_IMAGES}from'../dist/card-images.js';import{STANDARD496_DECKS}from'../tools/fixtures/standard496.mjs';import{manualModel}from'../dist/manual-ui.js';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-496.json',import.meta.url))),rows=m.cards;
const N='dm01-108',F='dm01-097',W='dm01-083',D='dm01-090',L='dm01-075',GIGA='dm10-051',BERRY='dm10-107',HANA='dm10-059',BORG='dm10-055',MINE='dm10-030',MIL='dm10-080',LUNA='dm11-011',BLUG='dm10-043',RINDA='dm10-072',KAEM='dm10-073',SODA='dm10-038',BLOOD='dm10-099';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort(),put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const pick=(s,v)=>act(s,'extended',a=>{const x=s.decision.choices[a.choice].value;return typeof v==='function'?v(x):(x?.uid??x)===v;});
function field(p=0){const s=setup();s.active=p;for(const q of[0,1])give(s,q,'deck',Array(30).fill(N));return s;}
function finish(s){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<700,JSON.stringify(s.decision));if(s.decision.type==='block')act(s,'noBlock');else e.step(s,e.chooseAI(s));}}
function start(s,p){s.active=1-p;s.phase='attack';act(s,'endTurn');}
const silent=(s,yes)=>act(s,'silent496',a=>a.yes===yes);
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
function order(s,uid){act(s,'orderEffect',a=>a.uid===uid);}

for(const r of rows)test(r.name+' complete verified face, art, stats, mana, restriction and strict phase boundary',()=>{
 const d=details.cards.find(c=>c.id===r.id),before=JSON.stringify(d),c=e.card(r.id);assert.deepEqual(r.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase:496}),r.spec);assert.throws(()=>standardCardSpec(d,{phase:495}));assert.equal(JSON.stringify(d),before);for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v);assert.equal(c.cost,d.faces[0].cost);assert.equal(c.power,parseInt(d.faces[0].powerText)||0);assert.equal(c.manaValue,1);assert.equal(c.limit,m.regulationVerification.limits[r.id]);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[r.id],r.image);
 const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(bad,{phase:496}));
});
test('two legal forties cover all twelve complete silent skills',()=>{const cat=createCatalogue(snapshot,data.cards,details);assert.equal(rows.length,12);for(const deck of STANDARD496_DECKS){assert.deepEqual(e.validateDeck(deck),[]);assert.equal(cat.coverage(deck).unsupported,0);assert.equal(deck.cards.reduce((n,c)=>n+c.count,0),40);}for(const r of rows)assert.ok(STANDARD496_DECKS.some(d=>d.cards.some(c=>c.id===r.id)));});
for(const r of rows)test(r.name+' paid summon has no silent effect on entry and pays the printed cost',()=>{
 const s=field(),victim=put(s,1,N);give(s,0,'grave',[F]);const all=physical(s),x=play(s,r.id);finish(s);assert.ok(s.players[0].battle.includes(x));assert.equal(s.players[0].deck.length,30);assert.equal(s.players[0].shields.length,5);assert.equal(s.players[0].grave.length,1);assert.ok(s.players[1].battle.includes(victim));assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(r.id).cost);assert.deepEqual(physical(s).filter(uid=>uid!==x.uid),all);
});
for(const r of rows)for(const p of[0,1])test(r.name+' can remain tapped and queue its effect before the ordinary draw for player '+p,()=>{
 const s=field(1-p),x=put(s,p,r.id),victim=put(s,1-p,L);x.tapped=true;give(s,p,'grave',[N]);s.players[p].mana.forEach(x=>x.tapped=true);const all=physical(s);start(s,p);assert.equal(s.decision.type,'silent496');assert.equal(s.decision.player,p);assert.equal(s.decision.uid,x.uid);assert.equal(s.players[p].deck.length,30);assert.ok(s.players[p].mana.every(x=>x.tapped));silent(s,true);finish(s);assert.equal(s.phase,'charge');assert.ok(x.tapped||s.players[p].grave.some(y=>y.uid===x.uid));assert.ok(s.players[p].mana.every(x=>!x.tapped));assert.deepEqual(physical(s),all);
});
for(const r of rows)test(r.name+' may untap instead and resolves only the normal draw',()=>{
 const s=field(1),x=put(s,0,r.id),victim=put(s,1,N);x.tapped=true;give(s,0,'grave',[F]);start(s,0);silent(s,false);finish(s);assert.ok(!x.tapped);assert.equal(s.players[0].deck.length,29);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].shields.length,5);assert.equal(s.players[0].mana.length,50);assert.ok(s.players[1].battle.includes(victim));assert.equal(s.players[0].grave.length,1);
});
for(const r of rows)test(r.name+' does not offer an untapped, sealed or untap-prohibited source',()=>{
 for(const mode of['untapped','sealed','skip','lock']){const s=field(1),x=put(s,0,r.id);x.tapped=mode!=='untapped';if(mode==='sealed')s.players[0].seals.push({...inst(N),sealOf:x.uid,faceDown:true});if(mode==='skip')x.skipUntap=true;if(mode==='lock')x.tapLocks=[1];start(s,0);assert.notEqual(s.decision?.type,'silent496');finish(s);assert.equal(s.players[0].deck.length,29);assert.equal(s.players[0].shields.length,5);}
});
for(const r of rows.filter(r=>r.faces[0].cost<=5))test(r.name+' cannot replace untapping when its ability is ignored by Genmu',()=>{
 const s=field(1),x=put(s,0,r.id);put(s,1,GEN);x.tapped=true;start(s,0);assert.notEqual(s.decision?.type,'silent496');finish(s);assert.ok(!x.tapped);assert.equal(s.players[0].deck.length,29);
});
test('the six-cost silent skill remains active under Genmu and activated silent skills are not attack or entry triggers stopped by GG',()=>{
 for(const mute of[GEN,GG]){const s=field(1),x=put(s,0,mute===GEN?BLUG:MIL),lock=put(s,1,mute);if(mute===GG)lock.under=[inst(N)];x.tapped=true;start(s,0);silent(s,true);finish(s);assert.ok(x.tapped);assert.equal(s.players[0].shields.length,mute===GEN?6:5);assert.equal(s.players[0].deck.length,28);}
});
test('all silent decisions happen before any card untaps or any silent effect resolves',()=>{
 let s=field(1),a=put(s,0,MIL),b=put(s,0,BERRY),normal=put(s,0,N);a.tapped=b.tapped=normal.tapped=true;s.players[0].mana.forEach(x=>x.tapped=true);const all=physical(s);start(s,0);silent(s,true);assert.equal(s.decision.uid,b.uid);assert.ok(normal.tapped&&s.players[0].mana.every(x=>x.tapped));assert.equal(s.players[0].deck.length,30);s=JSON.parse(JSON.stringify(s));silent(s,true);assert.equal(s.decision.type,'effectOrder');assert.ok(!s.players[0].battle.find(x=>x.uid===normal.uid).tapped);assert.ok(s.players[0].mana.every(x=>!x.tapped));order(s,b.uid);finish(s);assert.equal(s.players[0].mana.length,51);assert.equal(s.players[0].deck.length,27);assert.deepEqual(physical(s),all);
});
test('a waiting silent ability survives its source being destroyed by another silent skill',()=>{
 const s=field(1),a=put(s,0,KAEM),b=put(s,0,BORG),enemy=put(s,1,N);a.tapped=b.tapped=true;const all=physical(s);start(s,0);silent(s,true);silent(s,true);order(s,b.uid);finish(s);assert.ok(s.players[0].grave.includes(a)&&s.players[0].grave.includes(b)&&s.players[1].grave.includes(enemy));assert.equal(s.players[0].shields.length,6);assert.equal(s.players[0].deck.length,28);assert.deepEqual(physical(s),all);
});
test('silent and actual-untap abilities enter the same priority queue after untapping',()=>{
 const s=field(1),a=put(s,0,MIL),b=put(s,0,'dm25rp3-038');a.tapped=b.tapped=true;give(s,1,'hand',[N,F,W]);start(s,0);silent(s,true);assert.equal(s.decision.type,'effectOrder');assert.ok(a.tapped&&!b.tapped);order(s,a.uid);assert.equal(s.players[0].deck.length,29);assert.equal(s.decision.player,1);const ids=s.players[1].hand.map(x=>x.uid);pick(s,ids[0]);pick(s,ids[1]);finish(s);assert.equal(s.players[1].hand.length,1);assert.equal(s.players[0].deck.length,28);
});
test('silent draw happens before normal drawing and both are subject to real deck-out rules',()=>{
 const s=field(1),x=put(s,0,MIL);x.tapped=true;give(s,0,'deck',[N]);start(s,0);silent(s,true);finish(s);assert.equal(s.winner,1);assert.equal(s.players[0].hand.length,1);
});
test('silent choice precedes restricted mana untapping, which finishes before silent effects or drawing',()=>{
 const s=field(1),x=put(s,0,MIL);x.tapped=true;put(s,1,'dm23ex2-022');give(s,0,'mana',[N,N,W,W,F]);s.players[0].mana.forEach(x=>x.tapped=true);start(s,0);silent(s,true);assert.equal(s.decision.task.op,'g4_Untap');assert.equal(s.players[0].deck.length,30);const ids=s.players[0].mana.slice(0,3).map(x=>x.uid);for(const uid of ids)pick(s,uid);finish(s);assert.equal(s.players[0].mana.filter(x=>!x.tapped).length,3);assert.equal(s.players[0].deck.length,28);assert.ok(x.tapped);
});
test('AI uses beneficial shield additions but declines known deck-out and unfavorable symmetric destruction',()=>{
 for(const id of[BLUG,KAEM]){const s=field(1),x=put(s,0,id);x.tapped=true;start(s,0);assert.equal(e.chooseAI(s).yes,true);}
 const s=field(1),x=put(s,0,MIL);x.tapped=true;give(s,0,'deck',[N,N]);start(s,0);assert.equal(e.chooseAI(s).yes,false);
 const t=field(1),y=put(t,0,BORG);y.tapped=true;for(let n=0;n<4;n++)put(t,0,N);put(t,1,N);start(t,0);assert.equal(e.chooseAI(t).yes,false);
});
test('the same tapped creature can use a silent skill on successive own turns, never on the opponent turn',()=>{
 const s=field(1),x=put(s,0,MIL);x.tapped=true;start(s,0);silent(s,true);finish(s);s.phase='attack';act(s,'endTurn');finish(s);assert.ok(x.tapped);assert.equal(s.active,1);s.phase='attack';act(s,'endTurn');silent(s,true);finish(s);assert.equal(s.players[0].deck.length,26);
});
test('Hustle Berry ramps the exact top card with multicolor tapping before the normal draw',()=>{
 const s=field(1),x=put(s,0,BERRY);x.tapped=true;give(s,0,'deck',['dmrp19-057',...Array(10).fill(N)]);const top=s.players[0].deck[0];start(s,0);silent(s,true);finish(s);assert.ok(s.players[0].mana.includes(top)&&top.tapped);assert.equal(s.players[0].deck.length,9);
});
for(const recover of[false,true])test('Hanasaki may reveal a creature from the library or decline and still shuffles before drawing '+recover,()=>{
 const s=field(1),x=put(s,0,HANA);x.tapped=true;give(s,0,'deck',[F,'dm06-110',...Array(10).fill(N)]);const target=s.players[0].deck[0];start(s,0);silent(s,true);assert.ok(s.decision.choices.every(c=>!c.cardId||e.card(c.cardId).type==='creature'));pick(s,recover?target.uid:null);finish(s);assert.equal(s.players[0].hand.length,recover?2:1);assert.equal(s.players[0].deck.length,recover?10:11);if(recover)assert.ok(s.players[0].hand.includes(target));
});
test('Giga recovery honors an opponent grave lock while the source remains tapped',()=>{
 const s=field(1),x=put(s,0,GIGA);x.tapped=true;put(s,1,'dmrp22-042');give(s,0,'grave',[F]);start(s,0);silent(s,true);finish(s);assert.equal(s.players[0].grave.length,1);assert.equal(s.players[0].hand.length,1);assert.ok(x.tapped);
});
for(const n of[0,1,3])test('Luna returns up to three distinct mana cards and can stop early '+n,()=>{
 const s=field(1),x=put(s,0,LUNA);x.tapped=true;const mana=s.players[0].mana.slice(0,n);start(s,0);silent(s,true);for(const y of mana)pick(s,y.uid);if(n<3)pick(s,null);finish(s);assert.equal(s.players[0].mana.length,50-n);assert.equal(s.players[0].hand.length,n+1);for(const y of mana)assert.ok(s.players[0].hand.includes(y));
});
test('Rindahof taps only the chosen opposing creatures and allows selecting none',()=>{
 for(const use of[false,true]){const s=field(1),x=put(s,0,RINDA),a=put(s,1,N),b=put(s,1,F),own=put(s,0,W);x.tapped=true;start(s,0);silent(s,true);assert.ok(!s.decision.choices.some(c=>(c.value?.uid??c.value)===own.uid));pick(s,use?a.uid:null);if(use)pick(s,null);finish(s);assert.equal(a.tapped,use);assert.ok(!b.tapped);}
});
test('Sodalite lets the opponent choose their creature, includes their untargetable creature, and stays unblockable',()=>{
 const s=field(1),x=put(s,0,SODA),a=put(s,1,N),b=put(s,1,F);x.tapped=true;a.justDiverActive=true;start(s,0);silent(s,true);assert.equal(s.decision.player,1);pick(s,a.uid);finish(s);assert.ok(s.players[1].grave.includes(a)&&s.players[1].battle.includes(b));assert.ok(e.effectiveCard(x,s).unblockable);x.tapped=false;x.entered=0;s.phase='attack';act(s,'attack',a=>a.uid===x.uid);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));finish(s);
});
test('Blood destroys only an opposing blocker when the silent skill resolves',()=>{
 const s=field(1),x=put(s,0,BLOOD),a=put(s,1,'dmrp04m-008'),b=put(s,1,N);x.tapped=true;assert.ok(e.card(a.cardId).blocker);start(s,0);silent(s,true);assert.ok(!s.decision.choices.some(c=>(c.value?.uid??c.value)===b.uid));pick(s,a.uid);finish(s);assert.ok(s.players[1].grave.includes(a)&&s.players[1].battle.includes(b));
});
test('silent choices appear in manual play with a source and meaningful labels; AI analysis is pure and hides opposing cards',()=>{
 const s=field(1),x=put(s,0,MIL);x.tapped=true;start(s,0);const model=manualModel(s,{});assert.equal(model.title,'サイレントスキルを使いますか？');assert.equal(s.decision.source,MIL);assert.ok(e.getLegalActions(s).every(a=>a.label.includes('アンタップ')));const before=JSON.stringify(s),a=e.chooseAI(s);e.analyzeAI(s);assert.equal(JSON.stringify(s),before);const t=JSON.parse(before);for(const z of['hand','deck','shields'])t.players[1][z].reverse().forEach(x=>x.cardId=GEN);assert.deepEqual(e.chooseAI(t),a);assert.equal(a.yes,true);
});
test('manual DDD instructions use the declared card civilization and distinguish spells from NEO summons',()=>{
 for(const[id,color,kind]of[['dm25rp3-062','水','呪文'],['dm25rp3-048','自然','召喚'],['dm25rp3-045','火','召喚']]){const s=field(),x=put(s,0,N);give(s,0,'hand',[id]);s.phase='attack';act(s,'attack',a=>a.uid===x.uid);act(s,'declareDDD');const model=manualModel(s,{});assert.ok(model.help.includes(color)&&model.help.includes(kind));assert.ok(!model.help.includes('光・火を含む3'));}
});
test('duplicate, missing, unknown and differently timed silent clauses cannot be registered',()=>{
 const original=details.cards.find(c=>c.id===MIL);for(const mutate of[r=>{r.faces[0].abilityText=r.faces[0].abilityText.split('\n')[0];},r=>{r.faces[0].abilityText+='\n'+r.faces[0].abilityText.split('\n')[0];},r=>{r.faces[0].abilityText+='\n未知の能力。';},r=>{r.faces[0].abilityText=r.faces[0].abilityText.replace('自分のターンのはじめ','相手のターンのはじめ');}]){const r=structuredClone(original);mutate(r);assert.throws(()=>standardCardSpec(r,{phase:496}));}
});
for(const i of[0,1])test('legal forty CPU game conserves 80 cards and resumes from JSON '+i,()=>{
 let s=e.createGame([STANDARD496_DECKS[i],PRESETS[i]],{seed:49601+i,first:i}),saved=false;const all=physical(s);while(s.winner===null&&s.actions<2000&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),all);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);
});
