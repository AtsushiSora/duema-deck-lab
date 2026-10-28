import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {shieldCards} from '../dist/shield-state.js';
import {UTILITY140_DECKS} from '../tools/fixtures/utility140.mjs';
const BOOK='dmrp15-036',GANGAN='dmrp03-086',GUILLOTINE='dmr06-046',CELEB='dm09-008',KUSARI='dmr01-094',PROTECT='dm06-046',B='dm01-076',N='dm01-108',F='dm01-097',W='dm01-083',D='dm01-090',FU='dmrp22-037',SYNC='dm23rp3-013';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-140.json',import.meta.url))),physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const options=s=>e.getLegalActions(s).map(a=>({...a,...(a.kind==='extended'?s.decision.choices[a.choice]:{})}));
function pick(s,uid){const o=options(s).find(a=>a.value===uid||a.value?.uid===uid);assert.ok(o,JSON.stringify(s.decision));e.step(s,e.getLegalActions(s).find(a=>a.id===o.id));}
function useTrigger(s,id){act(s,'useTrigger',a=>a.cardId===id);}
function breakOwnShield(s,id){give(s,0,'shields',[id]);give(s,1,'battle',[F]);s.active=1;s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');}

test('six additions match official faces, cost, art, unrestricted limits and supported forty-card decks',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification.allSixUnrestricted);
 for(const r of manifest.cards){assert.deepEqual(r.faces,details.cards.find(c=>c.id===r.id).faces);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);const c=e.card(r.id);assert.equal(c.supportBatch,'phase-140');assert.equal(c.type,'spell');assert.equal(c.limit,4);assert.equal(c.cost,r.faces[0].cost);assert.equal(CARD_IMAGES[r.id],r.image);assert.ok(registry.get(r.id).supported);}
 for(const d of UTILITY140_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);assert.equal(d.cards.reduce((n,c)=>n+c.count,0),40);}
});

test('each spell pays the printed amount and completes while preserving all physical cards',()=>{
 for(const id of [BOOK,GANGAN,GUILLOTINE,CELEB,KUSARI,PROTECT]){const s=setup();give(s,0,'hand',[id,N]);give(s,0,'battle',[B]);give(s,1,'battle',[B,N]);const before=physical(s);act(s,'play',a=>a.cardId===id);drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(id).cost);assert.equal(s.decision,null);assert.deepEqual(physical(s),before);assert.ok(s.players[0][[GUILLOTINE,CELEB].includes(id)?'mana':'grave'].some(x=>x.cardId===id));}
});

test('Book draws exactly two then allows an old or newly drawn hand card to be put on top',()=>{
 for(const fromDraw of [false,true]){let s=setup();give(s,0,'hand',[BOOK,N]);give(s,0,'deck',[F,W,D,N]);const held=s.players[0].hand[1].uid,drawn=s.players[0].deck[0].uid,second=s.players[0].deck[1].uid,before=physical(s);act(s,'play',a=>a.cardId===BOOK);
 assert.equal(s.decision.task.op,'g52_TopHand');assert.equal(s.decision.player,0);assert.equal(s.players[0].hand.length,3);assert.ok(s.players[0].hand.some(x=>x.uid===drawn));assert.ok(s.players[0].hand.some(x=>x.uid===second));assert.equal(options(s).length,3);
 s=JSON.parse(JSON.stringify(s));const top=fromDraw?drawn:held;pick(s,top);assert.equal(s.players[0].deck[0].uid,top);assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].deck.length,3);assert.equal(s.decision,null);assert.deepEqual(physical(s),before);}
});

test('Book mandatory drawing the last card resolves defeat or Shako victory before a top-hand choice',()=>{
 for(const shako of [false,true]){const s=setup();give(s,0,'deck',[N,F]);if(shako)give(s,0,'battle',['dmrp03-s03']);cast(s,BOOK);assert.equal(s.winner,shako?0:1);assert.equal(s.decision,null);}
});

test('Gangan destroys only an opposing live blocker, including a tapped blocker',()=>{
 const s=setup();give(s,0,'battle',[B]);give(s,1,'battle',[B,N,B]);s.players[1].battle[0].tapped=true;s.players[1].battle[2].sealed=true;s.players[1].seals=[{...inst(N),sealOf:s.players[1].battle[2].uid,faceDown:true}];const uid=s.players[1].battle[0].uid;cast(s,GANGAN);assert.deepEqual(options(s).map(a=>a.value.uid),[uid]);pick(s,uid);assert.ok(s.players[1].grave.some(x=>x.uid===uid));assert.equal(s.players[0].battle.length,1);assert.ok(s.players[1].battle.some(x=>x.cardId===N));
 const t=setup();give(t,1,'battle',[N]);cast(t,GANGAN);assert.equal(t.decision,null);
});

test('Guillotine filters cost six inclusively instead of power, then becomes untapped mana',()=>{
 const s=setup();give(s,1,'battle',['dm01-004','dm01-s04']);s.players[1].battle[0].powerModifiers=[{amount:100000}];s.players[1].battle[1].powerModifiers=[{amount:1-e.card('dm01-s04').power}];const uid=s.players[1].battle[0].uid,n=s.players[0].mana.length;assert.equal(e.card('dm01-004').cost,6);assert.equal(e.card('dm01-s04').cost,7);cast(s,GUILLOTINE);assert.deepEqual(options(s).map(a=>a.value.uid),[uid]);assert.ok(!s.players[0].mana.some(x=>x.cardId===GUILLOTINE));pick(s,uid);assert.ok(s.players[1].grave.some(x=>x.uid===uid));assert.equal(s.players[0].mana.length,n+1);assert.equal(s.players[0].mana.at(-1).cardId,GUILLOTINE);assert.equal(s.players[0].mana.at(-1).tapped,false);
});

test('chargers finish in mana even with no target, spare hand, or when shield addition is prohibited',()=>{
 for(const [id,locked] of [[GUILLOTINE,false],[CELEB,false],[CELEB,true]]){const s=setup();give(s,0,'hand',[id,...locked?[N]:[]]);if(locked)give(s,1,'battle',[FU]);const n=s.players[0].mana.length,shields=s.players[0].shields.length;act(s,'play',a=>a.cardId===id);assert.equal(s.decision,null);assert.equal(s.players[0].mana.length,n+1);assert.ok(s.players[0].mana.some(x=>x.cardId===id));assert.equal(s.players[0].shields.length,shields);if(locked)assert.equal(s.players[0].hand.length,1);}
});

test('Celeb adds the selected physical hand card face down, announces no private identity, and can restore the choice',()=>{
 let s=setup();give(s,0,'hand',[CELEB,BOOK,N]);const uid=s.players[0].hand[1].uid,before=physical(s),shields=s.players[0].shields.length;act(s,'play',a=>a.cardId===CELEB);assert.equal(s.decision.player,0);s=JSON.parse(JSON.stringify(s));pick(s,uid);assert.equal(s.players[0].shields.length,shields+1);const added=s.players[0].shields.flatMap(shieldCards).find(x=>x.uid===uid);assert.ok(added);assert.ok(!added.faceUp);assert.equal(s.players[0].hand.length,1);assert.equal(e.observation(s,1).players[0].publicShields.length,0);assert.deepEqual(physical(s),before);
});

test('Kusari makes the opponent choose only its own untapped creatures, including Just Diver',()=>{
 let s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[SYNC,N,B]);const target=s.players[1].battle[0];target.justDiverActive=true;s.players[1].battle[1].tapped=true;s.players[1].battle[2].sealed=true;s.players[1].seals=[{...inst(N),sealOf:s.players[1].battle[2].uid,faceDown:true}];cast(s,KUSARI);assert.equal(s.decision.player,1);assert.equal(s.decision.task.controller,0);assert.deepEqual(options(s).map(a=>a.value),[target.uid]);s=JSON.parse(JSON.stringify(s));pick(s,target.uid);assert.ok(s.players[1].grave.some(x=>x.uid===target.uid));assert.equal(s.players[0].battle.length,1);if(s.decision?.task?.op==='g21Mega')pick(s,null);assert.equal(s.decision,null);
});

test('Kusari completes with no untapped target and honors normal destruction replacements',()=>{
 const s=setup();give(s,1,'battle',[N]);s.players[1].battle[0].tapped=true;cast(s,KUSARI);assert.equal(s.decision,null);assert.equal(s.players[1].battle.length,1);
 const t=setup();give(t,1,'battle',['dm31-041']);const uid=t.players[1].battle[0].uid;cast(t,KUSARI);pick(t,uid);drain(t);assert.ok(t.players[1].hand.some(x=>x.uid===uid));assert.equal(t.players[1].grave.length,0);
});

test('Protect chooses only own blockers, grants real defending power and expires at this turn end',()=>{
 const s=setup();give(s,0,'battle',[B,B,N]);give(s,1,'battle',[B]);s.players[0].battle[1].tapped=true;const x=s.players[0].battle[0],base=e.power(x,false,s);cast(s,PROTECT);assert.deepEqual(options(s).map(a=>a.value).sort(),s.players[0].battle.slice(0,2).map(x=>x.uid).sort());pick(s,x.uid);assert.equal(e.power(x,false,s),base+4000);assert.equal(e.power(s.players[1].battle[0],false,s),e.card(B).power);s.phase='attack';act(s,'endTurn');assert.equal(e.power(x,false,s),base);
});

test('Protect has no choice without a blocker; Genmu appearing later suppresses the spell-sourced modifier',()=>{
 const s=setup();give(s,0,'battle',[N]);cast(s,PROTECT);assert.equal(s.decision,null);
 const t=setup();give(t,0,'battle',['dm01-004']);const x=t.players[0].battle[0],base=e.power(x,false,t);cast(t,PROTECT);pick(t,x.uid);assert.equal(e.power(x,false,t),base+4000);give(t,1,'battle',[GEN]);assert.equal(e.power(x,false,t),base);
});

test('Book, Gangan and Protect work as free S triggers without consuming mana',()=>{
 for(const id of [BOOK,GANGAN,PROTECT]){const s=setup();give(s,0,'mana',[]);give(s,0,'battle',[B]);breakOwnShield(s,id);if(id===GANGAN)s.players[1].battle.push(inst(B));useTrigger(s,id);drain(s);assert.equal(s.decision,null);assert.equal(s.players[0].mana.length,0);assert.ok(s.players[0].grave.some(x=>x.cardId===id));if(id===PROTECT)assert.equal(e.power(s.players[0].battle[0],false,s),e.card(B).power+4000);if(id===GANGAN)assert.ok(s.players[1].grave.some(x=>x.cardId===B));}
});

test('Genmu ignores the four small spells but does not ignore either six-cost charger',()=>{
 for(const id of [BOOK,GANGAN,KUSARI,PROTECT,CELEB,GUILLOTINE]){const s=setup();give(s,0,'hand',[id,N]);give(s,0,'battle',['dm01-004']);give(s,1,'battle',[GEN,B]);const n=s.players[0].deck.length;act(s,'play',a=>a.cardId===id);drain(s);if([BOOK,GANGAN,KUSARI,PROTECT].includes(id)){assert.equal(s.players[0].deck.length,n);assert.ok(s.players[1].battle.some(x=>x.cardId===B));assert.ok(s.players[0].grave.some(x=>x.cardId===id));}else assert.ok(s.players[0].mana.some(x=>x.cardId===id));}
});

test('CPU values useful legal removal and avoids Book when its forced draw would lose',()=>{
 const score=(s,id)=>{give(s,0,'hand',[id,N]);return e.rankHeuristicActions(s).find(x=>x.a.kind==='play'&&x.a.cardId===id).value;};
 for(const id of [GANGAN,GUILLOTINE,KUSARI]){const s=setup(),t=setup();give(s,1,'battle',[B]);assert.ok(score(s,id)>score(t,id));}
 const s=setup(),t=setup();give(t,0,'deck',[N,F]);assert.ok(score(s,BOOK)>score(t,BOOK));give(t,0,'battle',['dmrp03-s03']);assert.ok(score(t,BOOK)>0);
 const u=setup();give(u,0,'hand',[KUSARI]);give(u,1,'battle',[N,'dm01-004']);cast(u,KUSARI);const chosen=e.chooseHeuristicAI(u),o=options(u).find(x=>x.id===chosen.id);assert.equal(o.value,u.players[1].battle[0].uid);
});

test('Brain Storm still chooses up to three draws and then returns two hand cards',()=>{
 const s=setup();give(s,0,'hand',['dmr05-086',N,F,W]);act(s,'play',a=>a.cardId==='dmr05-086');pick(s,0);assert.equal(s.decision.task.op,'g52_TopHand');pick(s,s.players[0].hand[0].uid);assert.ok(s.decision);pick(s,s.players[0].hand[1].uid);assert.equal(s.decision,null);assert.equal(s.players[0].hand.length,1);
});
