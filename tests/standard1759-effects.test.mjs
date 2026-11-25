import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,setup,inst,give,data} from './target-fixture.mjs';import {JUSTICE1759 as J,SAVES1759 as V,KING1759 as K,STANDARD1759_DECK} from '../tools/fixtures/standard1759.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {projectRoom,sealRoom,openRoom} from '../server/duel-core.mjs';import {randomBytes} from 'node:crypto';
const N='dm01-108',D='dmrp04s-m02';
function choose(s,pred){const actions=e.getLegalActions(s),a=actions.find(a=>pred(s.decision?.choices?.[a.choice]?.value,a));assert.ok(a,JSON.stringify(s.decision));e.step(s,a);}
function settle(s,draw=true){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<150,'decision chain completes');const d=s.decision,actions=e.getLegalActions(s);let a;if(d.task?.op==='g34_Select'&&d.task.optional)a=actions.find(a=>d.choices[a.choice]?.value===null);if(d.task?.op==='g34_Draw'&&d.task.optional)a=actions.find(a=>d.choices[a.choice]?.value===(draw?d.task.n:0));if(d.task?.op==='g34_Offer')a=actions.find(a=>d.choices[a.choice]?.value===(draw?true:null));e.step(s,a||e.chooseAI(s));}}
function play(s,id,kind='play'){const a=e.getLegalActions(s).find(a=>a.kind===kind&&a.cardId===id);assert.ok(a,kind+' '+id);e.step(s,a);return a;}
const faceUp=(s,ids)=>s.players[0].shields=ids.map(id=>({...inst(id),faceUp:true}));
function room(s){return {schemaVersion:1,hostUid:'host',guestUid:'guest',profiles:[{name:'host'},{name:'guest'}],code:'1234567890ABCDEF',phase:'playing',revision:1,engineVersion:e.ENGINE_VERSION,expiresAt:Date.now()+60000,updatedAt:Date.now(),events:[],game:s};}
test('phase1759 pins all full faces and legal forty while preserving canonical and original King-Cell IDs',()=>{
 const m=JSON.parse(fs.readFileSync('tools/support-phase-1759.json'));assert.equal(m.cards.length,4);for(const row of m.cards){assert.deepEqual(standardCardSpec({id:row.id,faces:row.faces},{phase:1759}),row.spec);assert.equal(e.card(row.id).limit,4);assert.ok(row.verification.facesMatched);const bad=structuredClone(row);bad.faces[0].abilityText+='X';assert.throws(()=>standardCardSpec(bad,{phase:1759}));}
 assert.deepEqual(e.validateDeck(STANDARD1759_DECK),[]);assert.equal(STANDARD1759_DECK.cards.reduce((n,x)=>n+x.count,0),40);assert.equal(e.card(J).breaker,3);assert.equal(e.card(V).breaker,3);for(const id of K)assert.equal(e.card(id).type,'cell');
});
test('Justice Galaxyshield pays six, draws exactly three optionally, never summons and respects mana civilization',()=>{
 for(const draw of [true,false]){const s=setup();give(s,0,'hand',[J]);const hand=s.players[0].hand.length,deck=s.players[0].deck.length;play(s,J,'galaxyShield');assert.equal(s.players[0].battle.length,0);settle(s,draw);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);assert.equal(s.players[0].hand.length,hand-1+(draw?3:0));assert.equal(s.players[0].deck.length,deck-(draw?3:0));assert.ok(s.players[0].shields.some(x=>x.cardId===J&&x.faceUp));}
 const s=setup();give(s,0,'hand',[J]);give(s,0,'mana',Array(10).fill(N));assert.ok(!e.getLegalActions(s).some(a=>a.kind==='galaxyShield'));
});
test('Justice selects hand shields as one group before moving, emits one self draw and separate Saves draws',()=>{
 const s=setup();give(s,0,'battle',[V]);give(s,0,'hand',[J,J,N]);const targets=s.players[0].hand.slice(1).map(x=>x.uid),deck=s.players[0].deck.length,shields=s.players[0].shields.length;
 play(s,J);choose(s,v=>v?.uid===targets[0]);assert.equal(s.players[0].shields.length,shields);assert.equal(s.players[0].hand.length,2);
 choose(s,v=>v?.uid===targets[1]);settle(s);assert.equal(s.players[0].shields.length,shields+2);assert.ok(targets.every(uid=>s.players[0].shields.some(x=>x.uid===uid&&x.faceUp)));assert.equal(s.players[0].deck.length,deck-5);assert.equal(s.players[0].hand.length,5);
});
test('Justice entry may choose zero cards and cannot remove hand cards if adding shields is prohibited',()=>{
 const s=setup();give(s,0,'hand',[J,N]);play(s,J);choose(s,v=>v===null);settle(s);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].shields.length,5);
 const blocked=setup();give(blocked,0,'hand',[J,N]);give(blocked,1,'battle',['dmrp17-s07']);play(blocked,J);settle(blocked);assert.equal(blocked.players[0].hand.length,1);assert.equal(blocked.players[0].shields.length,5);
});
test('Justice starts as a paid summon from an exact face-up shield after JSON restoration',()=>{
 const s=setup();s.active=1;s.phase='attack';const x={...inst(J),faceUp:true};s.players[0].shields.push(x);const mana=s.players[0].mana.filter(x=>x.tapped).length;
 e.step(s,e.getLegalActions(s).find(a=>a.kind==='endTurn'));const restored=JSON.parse(JSON.stringify(s));settle(restored,false);assert.ok(restored.players[0].battle.some(y=>y.uid===x.uid));assert.ok(!restored.players[0].shields.some(y=>y.uid===x.uid));assert.equal(restored.players[0].mana.filter(x=>x.tapped).length,mana);
});
test('Saves native sympathy counts every face-up physical shield card including stacked cards and has a two-mana floor',()=>{
 const s=setup();for(const [n,want]of [[0,9],[1,7],[2,5],[3,3],[4,2],[6,2]]){faceUp(s,Array(n).fill(N));assert.equal(e.summonCost(s,0,e.card(V)),want);}
 const a={...inst(N),faceUp:true},b={...inst(J),faceUp:true};a.shieldStack=[b];s.players[0].shields=[a];assert.equal(e.summonCost(s,0,e.card(V)),5);b.faceUp=false;assert.equal(e.summonCost(s,0,e.card(V)),7);
});
test('QA49428 Saves grants hand creatures independent floors for one through five civilizations without affecting spells or non-hand summons',()=>{
 const s=setup();give(s,0,'battle',[V]);faceUp(s,Array(10).fill(N));
 for(let n=1;n<=5;n++){const c=data.cards.find(c=>c.type==='creature'&&c.cost>=8&&c.cost!=='∞'&&e.civilizations(c).filter(x=>x!=='無色').length===n);assert.ok(c,'civilizations '+n);assert.equal(e.summonCost(s,0,{...c,summonOrigin:'hand'}),n);}
 assert.equal(e.summonCost(s,0,{...e.card(D),summonOrigin:'hand'}),1);assert.equal(e.summonCost(s,0,{...e.card(D),summonOrigin:'grave'}),7);assert.equal(e.summonCost(s,0,{...e.card(D),summonOrigin:'mana'}),7);
 const spell=data.cards.find(c=>c.type==='spell'&&c.cost===7&&!c.costReduction);assert.equal(e.summonCost(s,0,spell),7);
});
test('Saves grants stack, vanish with ignored/sealed sources, and never bypass an opposing reduction prohibition',()=>{
 const s=setup();faceUp(s,[N]);give(s,0,'battle',[V,V]);assert.equal(e.summonCost(s,0,e.card(D)),3);s.players[0].battle[0].sealed=true;assert.equal(e.summonCost(s,0,e.card(D)),5);s.players[0].battle[1].sealed=true;assert.equal(e.summonCost(s,0,e.card(D)),7);
 give(s,0,'battle',[V]);const noReduction=data.cards.find(c=>c.noCostReduction);give(s,1,'battle',[noReduction.id]);assert.equal(e.summonCost(s,0,e.card(D)),7);
});
test('Saves EX Life creates one face-down shield and replaces departure; Mach Fighter can attack a fresh untapped creature but not a player',()=>{
 const s=setup();give(s,0,'hand',[V]);give(s,1,'battle',[N]);const shieldCount=s.players[0].shields.length;play(s,V);settle(s);const x=s.players[0].battle.find(x=>x.cardId===V);assert.ok(x);assert.equal(s.players[0].shields.length,shieldCount+1);assert.ok(!s.players[0].shields.at(-1).faceUp);s.phase='attack';const attacks=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);assert.ok(attacks.some(a=>a.target===s.players[1].battle[0].uid));assert.ok(!attacks.some(a=>a.target==='player'));
 s.active=1;s.phase='main';give(s,1,'hand',['dm01-027']);play(s,'dm01-027');choose(s,(_,a)=>a.targets?.some(t=>t.uid===x.uid));settle(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.equal(s.players[0].shields.length,shieldCount);
});
test('Saves attack reveals only the top two, places one face-up shield and one multicolor tapped mana before optional draw',()=>{
 const s=setup();s.turn=5;give(s,0,'battle',[V]);give(s,1,'battle',[N]);s.players[1].battle[0].tapped=true;const top=[inst(J),inst(V)];s.players[0].deck.unshift(...top);const mana=s.players[0].mana.length,shield=s.players[0].shields.length,deck=s.players[0].deck.length;s.phase='attack';const a=e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===s.players[0].battle[0].uid&&a.target===s.players[1].battle[0].uid);assert.ok(a);e.step(s,a);
 assert.equal(s.decision.task.op,'g34_LookPick');for(const user of [{uid:'host'},{uid:'guest'}]){const p=projectRoom(room(s),user);assert.equal(p.game.inspectedCards.length,2);assert.equal(p.game.publicInspection,true);}
 choose(s,v=>v===top[0].uid);choose(s,v=>v===top[1].uid);settle(s,false);assert.equal(s.players[0].mana.length,mana+1);assert.ok(s.players[0].mana.find(x=>x.uid===top[1].uid).tapped);assert.equal(s.players[0].shields.length,shield+1);assert.ok(s.players[0].shields.find(x=>x.uid===top[0].uid).faceUp);assert.equal(s.players[0].deck.length,deck-2);
});
for(const origins of [['mana','mana','hand'],['hand','hand','hand'],['mana','mana','mana']])test('QA49427 King Cell exact physical parts get Saves sympathy only when a component is in hand '+origins.join('/'),()=>{
 const s=setup();give(s,0,'battle',[V]);faceUp(s,[N]);const parts=K.map(inst);for(let i=0;i<3;i++)s.players[0][origins[i]].push(parts[i]);const before=e.physicalCards(s).length,a=e.getLegalActions(s).find(a=>a.alternative==='combatKing');assert.ok(a);assert.equal(a.cost,origins.includes('hand')?7:9);const tapped=s.players[0].mana.filter(x=>x.tapped).length;e.step(s,a);settle(s);assert.equal(e.physicalCards(s).length,before);const king=s.players[0].battle.find(x=>e.card(x).name==='Volzeos-Balamord');assert.ok(king);assert.equal(e.physicalCards(s).filter(x=>parts.some(y=>y.uid===x.uid)).length,3);assert.ok(s.players[0].mana.filter(x=>x.tapped).length>=tapped);
});
test('new cards survive encrypted two-view projection while hidden hand and deck identities remain private',()=>{
 const s=e.createGame([STANDARD1759_DECK,STANDARD1759_DECK],{seed:1759,first:0}),r=room(s),key=randomBytes(32).toString('base64'),copy=openRoom(sealRoom(r,key),key);for(const uid of ['host','guest']){const v=projectRoom(copy,{uid}),other=v.game.players[1-v.seat];assert.deepEqual(other.hand,[]);for(const x of copy.game.players[1-v.seat].hand)assert.ok(!JSON.stringify(v).includes(JSON.stringify(x.uid)));}assert.equal(e.physicalCards(copy.game).length,80);
});
test('Justice optional draw is all three or none, and its G Strike actually stops the next attacker',()=>{
 const s=setup();give(s,0,'hand',[J]);play(s,J,'galaxyShield');assert.equal(s.decision.task.op,'g34_Offer');assert.deepEqual(s.decision.choices.map(x=>x.value),[true,null]);choose(s,v=>v===null);assert.equal(s.players[0].hand.length,0);
 const b=setup();b.active=1;b.turn=4;b.phase='attack';give(b,1,'battle',[N,N]);give(b,0,'shields',[J]);const [attacker,stopped]=b.players[1].battle;e.step(b,e.getLegalActions(b).find(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target==='player'));e.step(b,e.getLegalActions(b).find(a=>a.kind==='noBlock'));assert.equal(b.decision.task.op,'gsDeclare');choose(b,v=>v===true);choose(b,v=>v===stopped.uid);settle(b);assert.ok(!e.getLegalActions(b).some(a=>a.kind==='attack'&&a.uid===stopped.uid));
});
test('ignored Saves sources stop granting reductions and watching shield entries',()=>{
 const s=setup();faceUp(s,[N]);give(s,0,'battle',[V]);s.players[0].battle[0].g35Ignored=s.turn;assert.equal(e.summonCost(s,0,e.card(D)),7);
 give(s,0,'hand',[J]);const before=s.players[0].deck.length;play(s,J,'galaxyShield');settle(s);assert.equal(s.players[0].deck.length,before-3);assert.equal(s.players[0].hand.length,3);
});
test('shield ability suppression prevents Justice shield draw and its start-of-turn summon without muting a battlefield Saves',()=>{
 const s=setup();give(s,1,'battle',['dmrp16-s01']);give(s,0,'hand',[J]);const before=s.players[0].deck.length;play(s,J,'galaxyShield');settle(s);assert.equal(s.players[0].deck.length,before);s.active=1;s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='endTurn'));settle(s);assert.ok(s.players[0].shields.some(x=>x.cardId===J));assert.ok(!s.players[0].battle.some(x=>x.cardId===J));
});
test('each of two Saves independently offers its one-card draw on a face-up shield placement',()=>{
 const s=setup();give(s,0,'battle',[V,V]);give(s,0,'hand',[J]);const before=s.players[0].deck.length;play(s,J,'galaxyShield');let watched=0;
 for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<60);const d=s.decision,as=e.getLegalActions(s);let a;if(d.task?.op==='g34_Offer')a=as.find(a=>d.choices[a.choice]?.value===null);if(d.task?.op==='g34_Draw'&&d.source===V){const amount=watched++===0?1:0;a=as.find(a=>d.choices[a.choice]?.value===amount);}e.step(s,a||e.chooseAI(s));}
 assert.equal(watched,2);assert.equal(s.players[0].deck.length,before-1);assert.equal(s.players[0].hand.length,1);
});
test('King Cells have rules cost zero, cannot execute alone and untap when charged from hand',()=>{
 for(const id of K){const s=setup();s.phase='charge';give(s,0,'hand',[id]);const x=s.players[0].hand[0];assert.equal(e.costValue(e.card(id)),0);e.step(s,e.getLegalActions(s).find(a=>a.kind==='charge'&&a.uid===x.uid));assert.ok(s.players[0].mana.some(y=>y.uid===x.uid&&!y.tapped));assert.ok(!e.getLegalActions(s).some(a=>a.cardId===id));}
});
function summonKing(s){for(const id of K)s.players[0].hand.push(inst(id));const a=e.getLegalActions(s).find(a=>a.alternative==='combatKing');assert.ok(a);e.step(s,a);settle(s);return s.players[0].battle.find(x=>e.card(x).g50Volzeos);}
test('complete King face keeps extra EX Life, fresh unblockable world attack and opponent discard',()=>{
 const s=setup(),originalShields=s.players[0].shields.length,king=summonKing(s);assert.ok(king);assert.equal(s.players[0].shields.length,originalShields+2);
 const blocker=data.cards.find(c=>c.type==='creature'&&c.blocker&&c.cost===1);give(s,1,'battle',[blocker.id]);give(s,1,'hand',[N,N,N]);const hand=s.players[1].hand.map(x=>x.uid);s.phase='attack';const a=e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===king.uid&&a.target==='player');assert.ok(a);e.step(s,a);settle(s);
 assert.ok(hand.every(uid=>s.players[1].grave.some(x=>x.uid===uid)));assert.equal(s.players[1].shields.length,0);assert.ok(!s.players[1].battle[0].tapped);
});
test('King extra EX Life can replace two removals before all three exact cells leave together',()=>{
 const s=setup(),king=summonKing(s),cells=e.physicalCards(s).filter(x=>K.includes(x.cardId)).map(x=>x.uid);const initial=s.players[0].shields.length;s.active=1;s.phase='main';
 for(let n=0;n<3;n++){give(s,1,'hand',['dm01-027']);play(s,'dm01-027');choose(s,(_,a)=>a.targets?.some(t=>t.uid===king.uid));settle(s);assert.equal(s.players[0].battle.some(x=>x.uid===king.uid),n<2);assert.equal(s.players[0].shields.length,initial-Math.min(n+1,2));}
 assert.ok(cells.every(uid=>s.players[0].grave.some(x=>x.uid===uid)));
});
