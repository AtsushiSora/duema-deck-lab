import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {UTILITY142_DECKS} from '../tools/fixtures/utility142.mjs';
const A='dmbd02-009',R='dm22-041',T='dm08-051',P='dmx02-004',G='dmx05-010',FAL='dm32-043',DR='dm08-049',HD='dmx01-009',N='dm01-108',F='dm01-097',W='dm01-083',B='dm01-076',SPELL='dm06-085',SH='dmrp03-s03',AP='dmrp22-042',SILENCE='dmrp14-s05',STRATO='dm22rp2-048',HERO='dmbd16-009';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-142.json',import.meta.url))),physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const options=s=>e.getLegalActions(s).map(a=>({...a,...(a.kind==='extended'?s.decision.choices[a.choice]:{})}));
function pick(s,value){const o=options(s).find(a=>typeof value==='function'?value(a):a.value===value||a.value?.uid===value||a.targets?.some(t=>t.uid===value));assert.ok(o,JSON.stringify(s.decision));e.step(s,e.getLegalActions(s).find(a=>a.id===o.id));}
const play=(s,id)=>act(s,'play',a=>a.cardId===id&&!a.face);
const speed=(s,x)=>!!e.effectiveCard(x,s).speedAttacker;

test('all six official names, faces, art and limits are implemented in legal forty-card fixtures',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification.allSixUnrestricted);
 for(const r of manifest.cards){const c=e.card(r.id),f=r.faces[0];assert.deepEqual(r.faces,details.cards.find(c=>c.id===r.id).faces);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(c.supportBatch,'phase-142');assert.equal(c.type,'creature');assert.equal(c.cost,f.cost);assert.equal(c.power,Number(f.powerText));assert.equal(c.race,f.race);assert.equal(c.limit,4);assert.equal(CARD_IMAGES[r.id],r.image);assert.ok(registry.get(r.id).supported);}
 for(const d of UTILITY142_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);assert.equal(d.cards.reduce((n,c)=>n+c.count,0),40);}
});

test('all six summon for printed cost, preserve physical cards and resolve choices',()=>{
 for(const id of [A,R,T,P,G,FAL]){const s=setup();give(s,0,'hand',[id]);give(s,0,'grave',[SPELL]);const before=physical(s);play(s,id);if(id===A)pick(s,null);else drain(s);assert.ok(s.players[0].battle.some(x=>x.cardId===id));assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(id).cost);assert.deepEqual(physical(s),before);}
});

test('Anaris can decline sacrifice, retaining its body without drawing or ramping',()=>{
 const s=setup();give(s,0,'hand',[A]);const n=s.players[0].deck.length,m=s.players[0].mana.length;play(s,A);assert.equal(s.decision.task.op,'g51_Anaris');pick(s,null);assert.equal(s.decision,null);assert.equal(s.players[0].battle[0].cardId,A);assert.equal(s.players[0].deck.length,n);assert.equal(s.players[0].mana.length,m);assert.equal(s.players[0].hand.length,0);
});

test('Anaris chooses its mode only after sacrifice and preserves a single physical top card through JSON',()=>{
 for(const mode of ['mana','draw'])for(const topId of [W,A]){let s=setup();give(s,0,'hand',[A]);give(s,0,'deck',[topId,N,F]);const source=s.players[0].hand[0].uid,top=s.players[0].deck[0].uid,m=s.players[0].mana.length,before=physical(s);play(s,A);pick(s,true);assert.ok(s.players[0].grave.some(x=>x.uid===source));assert.equal(s.players[0].deck.length,3);assert.equal(s.decision.task.op,'g51_AnarisMode');assert.equal(s.decision.player,0);s=JSON.parse(JSON.stringify(s));pick(s,mode);assert.equal(s.players[0].deck.length,2);assert.equal(s.players[0].mana.length,m+(mode==='mana'?1:0));assert.equal(s.players[0].hand.length,mode==='draw'?1:0);assert.ok(s.players[0][mode==='mana'?'mana':'hand'].some(x=>x.uid===top));if(mode==='mana')assert.equal(s.players[0].mana.find(x=>x.uid===top).tapped,topId===A);assert.deepEqual(physical(s),before);}
});

test('Anaris charges tapped and cannot pay its two-color summon cost with only one civilization',()=>{
 const s=setup();give(s,0,'hand',[A]);s.phase='charge';act(s,'charge');assert.equal(s.players[0].mana.at(-1).cardId,A);assert.equal(s.players[0].mana.at(-1).tapped,true);
 for(const ids of [[W,W],[N,N],[W,N]]){const t=setup();give(t,0,'mana',ids);give(t,0,'hand',[A]);assert.equal(e.getLegalActions(t).some(a=>a.kind==='play'&&a.cardId===A),ids[0]!==ids[1]);}
});

test('Anaris cannot gain a second mode from a repeated trigger after the source is gone (QA38719)',()=>{
 const s=setup();give(s,0,'hand',[A]);const m=s.players[0].mana.length;play(s,A);s.extTasks.push(structuredClone(s.decision.task));pick(s,true);pick(s,'mana');assert.equal(s.players[0].mana.length,m+1);assert.equal(s.decision,null);assert.equal(s.players[0].grave.filter(x=>x.cardId===A).length,1);
});

test('Anaris may resolve its mode when the sacrifice is replaced with going to mana (QA42955)',()=>{
 const s=setup();give(s,0,'hand',[A]);give(s,1,'battle',[STRATO]);const source=s.players[0].hand[0].uid,m=s.players[0].mana.length,n=s.players[0].deck.length,before=physical(s);play(s,A);pick(s,true);assert.equal(s.decision.type,'leaveReplace');pick(s,a=>a.kind==='g47Replace'&&a.choice?.replacement==='strato');pick(s,source);pick(s,null);assert.equal(s.decision.task.op,'g51_AnarisMode');assert.ok(s.players[0].mana.some(x=>x.uid===source));pick(s,'draw');assert.equal(s.players[0].mana.length,m+1);assert.equal(s.players[0].deck.length,n-1);assert.equal(s.players[0].hand.length,1);assert.deepEqual(physical(s),before);
});

test('Rip offers one optional draw for each own Dragon entry and no draw for its own entry',()=>{
 for(const draw of [0,1]){const s=setup();give(s,0,'hand',[R,HD]);play(s,R);assert.equal(s.decision,null);const n=s.players[0].deck.length;play(s,HD);assert.equal(s.decision.task.op,'g34_Draw');assert.equal(s.decision.player,0);pick(s,draw);assert.equal(s.players[0].deck.length,n-draw);assert.equal(s.players[0].hand.length,draw);assert.equal(s.decision,null);}
});

test('Rip does not trigger from an opposing Dragon, a non-Dragon, or a Dragon twinpact cast as a spell',()=>{
 const s=setup();give(s,0,'battle',[R]);give(s,1,'hand',[HD]);s.active=1;const n=s.players[0].deck.length;play(s,HD);assert.equal(s.decision,null);assert.equal(s.players[0].deck.length,n);
 const t=setup();give(t,0,'battle',[R]);cast(t,F);assert.equal(t.decision,null);
 const u=setup();give(u,0,'battle',[R]);give(u,0,'hand',[HERO]);give(u,1,'battle',[N]);const count=u.players[0].deck.length;act(u,'play',a=>a.cardId===HERO&&a.face===1);pick(u,u.players[1].battle[0].uid);assert.equal(u.decision,null);assert.equal(u.players[0].deck.length,count);
});

test('two Rips trigger separately, and a triggered draw survives its source leaving',()=>{
 const s=setup();give(s,0,'battle',[R,R]);const n=s.players[0].deck.length;cast(s,HD);drain(s);assert.equal(s.players[0].deck.length,n-2);assert.equal(s.players[0].hand.length,2);
 const t=setup();give(t,0,'battle',[R]);cast(t,HD);assert.equal(t.decision.task.op,'g34_Draw');t.players[0].grave.push(t.players[0].battle.shift());const m=t.players[0].deck.length;pick(t,1);assert.equal(t.players[0].deck.length,m-1);
});

test('entry silence and ignored Rip abilities prevent its Dragon draw trigger',()=>{
 for(const blocker of [GEN,SILENCE]){const s=setup();give(s,0,'battle',[R]);give(s,1,'battle',[blocker]);const n=s.players[0].deck.length;cast(s,HD);assert.equal(s.decision,null);assert.equal(s.players[0].deck.length,n);}
});

test('Totto grants haste to both players Dragons and loses that grant immediately when it leaves',()=>{
 const s=setup();give(s,0,'battle',[T,DR,N]);give(s,1,'battle',[DR]);for(const p of s.players)for(const x of p.battle)x.entered=s.turn;const a=s.players[0].battle[1],b=s.players[1].battle[0];assert.ok(speed(s,a));assert.ok(speed(s,b));assert.ok(!speed(s,s.players[0].battle[0]));assert.ok(!speed(s,s.players[0].battle[2]));s.phase='attack';assert.ok(e.getLegalActions(s).some(x=>x.kind==='attack'&&x.uid===a.uid));s.players[0].grave.push(s.players[0].battle.shift());assert.ok(!speed(s,a));assert.ok(!speed(s,b));assert.ok(!e.getLegalActions(s).some(x=>x.kind==='attack'&&x.uid===a.uid));
});

test('Pippy grants haste only to its own Dragon AND Hunter, including creatures already on the field',()=>{
 const s=setup();give(s,0,'battle',[HD,DR]);give(s,1,'battle',[HD]);for(const p of s.players)for(const x of p.battle)x.entered=s.turn;const own=s.players[0].battle[0],other=s.players[1].battle[0];assert.ok(!speed(s,own));cast(s,P);assert.ok(speed(s,own));assert.ok(!speed(s,s.players[0].battle[1]));assert.ok(!speed(s,other));assert.ok(!speed(s,s.players[0].battle.at(-1)));s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===own.uid));
});

test('ignored or sealed haste sources grant nothing; a separate active source still works',()=>{
 for(const id of [T,P]){const s=setup();give(s,0,'battle',[id,HD]);const source=s.players[0].battle[0],dragon=s.players[0].battle[1];assert.ok(speed(s,dragon));source.g35Ignored=s.turn;assert.ok(!speed(s,dragon));delete source.g35Ignored;source.sealed=true;s.players[0].seals=[{...inst(N),sealOf:source.uid,faceDown:true}];assert.ok(!speed(s,dragon));s.players[0].battle.push(inst(id));assert.ok(speed(s,dragon));}
});

test('an ignored recipient gains no haste and Genmu suppresses the small haste sources',()=>{
 const s=setup();give(s,0,'battle',[T,HD]);s.players[0].battle[1].g35Ignored=s.turn;assert.ok(!speed(s,s.players[0].battle[1]));delete s.players[0].battle[1].g35Ignored;give(s,1,'battle',[GEN]);assert.ok(!speed(s,s.players[0].battle[1]));
});

test('Gaga optional draw permits zero, one and a deliberate Shako victory on the final card',()=>{
 for(const n of [0,1]){const s=setup();const count=s.players[0].deck.length;cast(s,G);pick(s,n);assert.equal(s.players[0].deck.length,count-n);}
 const t=setup();give(t,0,'battle',[SH]);give(t,0,'deck',[N]);cast(t,G);pick(t,1);assert.equal(t.winner,0);
});

test('Fal recovers an optional physical spell including a twinpact and respects grave movement locks',()=>{
 for(const id of [SPELL,HERO]){let s=setup();give(s,0,'grave',[id,N]);give(s,0,'hand',[FAL]);const uid=s.players[0].grave[0].uid,before=physical(s);play(s,FAL);assert.ok(options(s).some(a=>a.value===uid));assert.ok(!options(s).some(a=>a.value===s.players[0].grave[1].uid));s=JSON.parse(JSON.stringify(s));pick(s,uid);assert.ok(s.players[0].hand.some(x=>x.uid===uid));assert.equal(s.players[0].grave.length,1);assert.deepEqual(physical(s),before);}
 const t=setup();give(t,0,'grave',[SPELL]);give(t,1,'battle',[AP]);cast(t,FAL);pick(t,null);assert.equal(t.players[0].grave.length,1);
});

test('Anaris, Gaga and Fal entry abilities are ignored under Genmu without consuming library or grave cards',()=>{
 for(const id of [A,G,FAL]){const s=setup();give(s,1,'battle',[GEN]);give(s,0,'grave',[SPELL]);const n=s.players[0].deck.length;cast(s,id);assert.equal(s.decision,null);assert.equal(s.players[0].deck.length,n);assert.equal(s.players[0].grave.length,1);assert.ok(s.players[0].battle.some(x=>x.cardId===id));}
});

test('CPU declines optional library depletion and chooses the winning Anaris draw with Shako',()=>{
 const s=setup();give(s,0,'deck',[N]);cast(s,A);assert.equal(options(s).find(a=>a.id===e.chooseHeuristicAI(s).id).value,null);
 const t=setup();give(t,0,'battle',[SH]);give(t,0,'deck',[N]);cast(t,A);assert.equal(options(t).find(a=>a.id===e.chooseHeuristicAI(t).id).value,true);pick(t,true);assert.equal(options(t).find(a=>a.id===e.chooseHeuristicAI(t).id).value,'draw');pick(t,'draw');assert.equal(t.winner,0);
 for(const shako of [false,true]){const u=setup();if(shako)give(u,0,'battle',[SH]);give(u,0,'deck',[N]);cast(u,G);assert.equal(options(u).find(a=>a.id===e.chooseHeuristicAI(u).id).value,shako?1:0);}
});

test('CPU values haste support when it releases a newly entered matching Dragon',()=>{
 const score=(s,id)=>{give(s,0,'hand',[id]);return e.rankHeuristicActions(s).find(x=>x.a.kind==='play'&&x.a.cardId===id).value;};for(const id of [T,P]){const s=setup(),t=setup();give(s,0,'battle',[HD]);s.players[0].battle[0].entered=s.turn;assert.ok(score(s,id)>score(t,id));}
});

test('Anaris ramping the final card loses even with Shako because it was not drawn',()=>{
 const s=setup();give(s,0,'hand',[A]);give(s,0,'battle',[SH]);give(s,0,'deck',[N]);play(s,A);pick(s,true);pick(s,'mana');assert.equal(s.winner,1);assert.equal(s.decision,null);
});
