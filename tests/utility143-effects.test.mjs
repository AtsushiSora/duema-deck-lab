import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,GEN} from './target-fixture.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {UTILITY143_DECKS} from '../tools/fixtures/utility143.mjs';
const H='dm28-048',J='dm11-007',K='dm14-076',P='dm33-023',SP='dmr17-040',GU='dmr17-046',N='dm01-108',F='dm01-097',W='dm01-083',B='dm01-076',SYNC='dm23rp3-013';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-143.json',import.meta.url))),physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const options=s=>e.getLegalActions(s).map(a=>({...a,...(a.kind==='extended'?s.decision.choices[a.choice]:{})}));
function pick(s,value){const o=options(s).find(a=>typeof value==='function'?value(a):a.value===value||a.value?.uid===value||a.targets?.some(t=>t.uid===value));assert.ok(o,JSON.stringify(s.decision));e.step(s,e.getLegalActions(s).find(a=>a.id===o.id));}
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const shieldCount=(s,p,n)=>give(s,p,'shields',Array(n).fill(N));
const setPower=(x,n)=>x.powerModifiers=[{amount:n-e.card(x).power}];

test('six defense cards retain official faces, art, unrestricted limits and valid forty-card fixtures',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(manifest.cards.length,6);assert.ok(manifest.regulationVerification.allSixUnrestricted);
 for(const r of manifest.cards){const c=e.card(r.id),f=r.faces[0];assert.deepEqual(r.faces,details.cards.find(c=>c.id===r.id).faces);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(c.supportBatch,'phase-143');assert.equal(c.cost,f.cost);assert.equal(c.power,Number(f.powerText));assert.equal(c.race,f.race);assert.equal(c.limit,4);assert.equal(CARD_IMAGES[r.id],r.image);assert.ok(registry.get(r.id).supported);}
 for(const d of UTILITY143_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);assert.equal(d.cards.reduce((n,c)=>n+c.count,0),40);}
});

test('all six pay printed mana and preserve every physical card through their choices',()=>{
 for(const id of [H,J,K,P,SP,GU]){const s=setup();give(s,0,'hand',[id]);give(s,1,'battle',[F]);const before=physical(s);play(s,id);drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(id).cost);assert.ok(s.players[0][e.card(id).type==='creature'?'battle':'grave'].some(x=>x.cardId===id));assert.deepEqual(physical(s),before);}
});

test('Heart activates at two shields, may bounce either side or decline, and restores the pending choice',()=>{
 for(const owner of [0,1,null]){let s=setup();shieldCount(s,0,2);give(s,0,'hand',[H]);give(s,0,'battle',[W]);give(s,1,'battle',[F]);const uid=owner===null?null:s.players[owner].battle[0].uid,before=physical(s);play(s,H);assert.equal(s.decision.task.op,'g34_Target');const count=options(s).length;assert.ok(count>=4);s=JSON.parse(JSON.stringify(s));pick(s,uid);if(owner!==null)assert.ok(s.players[owner].hand.some(x=>x.uid===uid));else assert.equal(s.players[1].battle.length,1);assert.deepEqual(physical(s),before);assert.equal(s.decision,null);}
 const s=setup();shieldCount(s,0,3);give(s,1,'battle',[F]);cast(s,H);assert.equal(s.decision,null);assert.equal(s.players[1].battle.length,1);
});

test('Heart power and unblockability follow current shield count and disappear when abilities are ignored',()=>{
 const s=setup();give(s,0,'battle',[H]);const x=s.players[0].battle[0];assert.equal(e.power(x,false,s),1000);for(const n of [2,1,0]){shieldCount(s,0,n);assert.equal(e.power(x,false,s),5000);assert.ok(e.effectiveCard(x,s).unblockable);}shieldCount(s,0,3);assert.equal(e.power(x,false,s),1000);assert.ok(!e.effectiveCard(x,s).unblockable);shieldCount(s,0,2);give(s,1,'battle',[GEN]);assert.equal(e.power(x,false,s),1000);assert.ok(!e.effectiveCard(x,s).unblockable);
});

test('Juliana cannot be selected by enemy effects but can attack tapped creatures and be attacked normally',()=>{
 const s=setup();give(s,1,'battle',[J,F]);const jul=s.players[1].battle[0];cast(s,SP);assert.deepEqual(options(s).map(a=>a.value.uid),[s.players[1].battle[1].uid]);pick(s,s.players[1].battle[1].uid);
 give(s,0,'battle',[F]);jul.tapped=true;s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===jul.uid));
 const t=setup();give(t,0,'battle',[J]);give(t,1,'battle',[F]);t.players[1].battle[0].tapped=true;t.phase='attack';assert.ok(e.getLegalActions(t).some(a=>a.kind==='attack'&&a.target===t.players[1].battle[0].uid));assert.ok(!e.getLegalActions(t).some(a=>a.kind==='attack'&&a.target==='player'));
});

test('Juliana remains a usable blocker; untargetability is not a ban on blocking',()=>{
 const s=setup();give(s,0,'battle',[J]);give(s,1,'battle',[F]);s.active=1;s.phase='attack';act(s,'attack',a=>a.target==='player');assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===s.players[0].battle[0].uid));act(s,'block');drain(s);assert.equal(s.players[0].shields.length,5);assert.ok(s.players[1].grave.some(x=>x.cardId===F));
});

test('Kyubera and Peace cannot attack players but may attack tapped creatures',()=>{
 for(const id of [K,P]){const s=setup();give(s,0,'battle',[id]);give(s,1,'battle',[W]);s.players[1].battle[0].tapped=true;s.phase='attack';const actions=e.getLegalActions(s);assert.ok(actions.some(a=>a.kind==='attack'&&a.target===s.players[1].battle[0].uid));assert.ok(!actions.some(a=>a.kind==='attack'&&a.target==='player'));}
});

test('destroyed blockers offer their owner an optional enemy tap after leaving, including through JSON',()=>{
 for(const id of [K,P])for(const yes of [false,true]){let s=setup();give(s,0,'battle',[id]);give(s,1,'battle',['dm01-004',F]);s.active=1;s.phase='attack';const target=s.players[1].battle[1].uid,before=physical(s);act(s,'attack',a=>a.uid===s.players[1].battle[0].uid&&a.target==='player');act(s,'block');assert.equal(s.decision.task.op,'g34_Target');assert.equal(s.decision.player,0);assert.ok(s.players[0].grave.some(x=>x.cardId===id));s=JSON.parse(JSON.stringify(s));pick(s,yes?target:null);assert.equal(s.players[1].battle.find(x=>x.uid===target).tapped,yes);assert.equal(s.players[0].shields.length,5);assert.deepEqual(physical(s),before);}
});

test('death tap does not trigger on a hand return or while the blocker ability was ignored',()=>{
 const s=setup();give(s,1,'battle',[K]);cast(s,SP);pick(s,s.players[1].battle[0].uid);assert.equal(s.decision,null);
 const t=setup();give(t,1,'battle',[K,GEN]);cast(t,'dm01-027');pick(t,t.players[1].battle.find(x=>x.cardId===K).uid);assert.equal(t.decision,null);assert.ok(t.players[1].grave.some(x=>x.cardId===K));
});

test('Rev Spiral adds the opponent-owned top-hand choice at zero through two shields, but not three',()=>{
 for(const n of [0,1,2,3]){let s=setup();shieldCount(s,0,n);give(s,0,'hand',[SP]);give(s,1,'battle',[F]);give(s,1,'hand',[W]);const returned=s.players[1].battle[0].uid,held=s.players[1].hand[0].uid,before=physical(s);play(s,SP);pick(s,returned);if(n<=2){assert.equal(s.decision.player,1);assert.equal(s.decision.task.op,'g52_TopHand');assert.ok(options(s).some(a=>a.value===returned));s=JSON.parse(JSON.stringify(s));pick(s,n===1?returned:held);assert.equal(s.players[1].deck[0].uid,n===1?returned:held);assert.equal(s.players[1].hand.length,1);}else{assert.equal(s.decision,null);assert.equal(s.players[1].hand.length,2);}assert.deepEqual(physical(s),before);}
});

test('Rev Spiral can apply revolution with no bounce target, and opponent hand identities stay private',()=>{
 const s=setup();shieldCount(s,0,2);give(s,1,'hand',[F,W]);cast(s,SP);assert.equal(s.decision.player,1);const view=e.observation(s,0);assert.ok(view.players[1].hand.every(x=>x.hidden));assert.equal(view.players[1].deckTop,undefined);pick(s,s.players[1].hand[0].uid);assert.equal(s.decision,null);
 const t=setup();shieldCount(t,0,2);cast(t,SP);assert.equal(t.decision,null);
});

test('Rev Guillotine applies one minus-2000 at three shields and a second minus-6000 at two',()=>{
 for(const n of [2,3]){const s=setup();shieldCount(s,0,n);give(s,1,'battle',[F]);const x=s.players[1].battle[0];setPower(x,10000);cast(s,GU);pick(s,x.uid);if(n===2){assert.equal(s.decision.task.power,-6000);pick(s,x.uid);}assert.equal(e.power(x,false,s),n===2?2000:8000);assert.equal(s.decision,null);s.phase='attack';act(s,'endTurn');assert.equal(e.power(x,false,s),10000);}
});

test('Rev Guillotine may choose distinct targets and destroys creatures reaching zero',()=>{
 const s=setup();shieldCount(s,0,2);give(s,1,'battle',[F,'dm01-004']);const [a,b]=s.players[1].battle;setPower(b,6000);cast(s,GU);pick(s,a.uid);assert.ok(s.decision);pick(s,b.uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===a.uid));assert.ok(s.players[1].grave.some(x=>x.uid===b.uid));assert.equal(s.decision,null);
});

test('Juliana and Just Diver are excluded from revolution spell targets; newly appearing Genmu suppresses spell power loss',()=>{
 const s=setup();shieldCount(s,0,2);give(s,1,'battle',[J,SYNC,F]);s.players[1].battle[1].justDiverActive=true;cast(s,GU);assert.deepEqual(options(s).map(a=>a.value.uid),[s.players[1].battle[2].uid]);pick(s,s.players[1].battle[2].uid);drain(s);
 const t=setup();shieldCount(t,0,3);give(t,1,'battle',['dm01-004']);const x=t.players[1].battle[0],base=e.power(x,false,t);cast(t,GU);pick(t,x.uid);assert.equal(e.power(x,false,t),base-2000);t.players[1].battle.push(inst(GEN));assert.equal(e.power(x,false,t),base);
});

test('all three S triggers work without mana and read shield count after the break',()=>{
 for(const id of [H,SP,GU]){const s=setup();give(s,0,'mana',[]);give(s,0,'shields',[id,N,N]);give(s,1,'battle',[F]);s.active=1;s.phase='attack';const uid=s.players[1].battle[0].uid;act(s,'attack',a=>a.target==='player'&&a.shield===s.players[0].shields[0].uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===id);assert.equal(s.players[0].shields.length,2);if(id===H)pick(s,uid);else if(id===SP){pick(s,uid);pick(s,uid);}else{pick(s,uid);drain(s);}assert.equal(s.players[0].mana.length,0);if(id===H){assert.ok(s.players[0].battle.some(x=>x.cardId===H));assert.equal(e.power(s.players[0].battle.find(x=>x.cardId===H),false,s),5000);}else assert.ok(s.players[0].grave.some(x=>x.cardId===id));}
});

test('CPU death tap chooses an untapped enemy and Guillotine favors a target its reduction can destroy',()=>{
 const s=setup();give(s,0,'battle',[K]);give(s,1,'battle',['dm01-004',F]);s.active=1;s.phase='attack';act(s,'attack',a=>a.uid===s.players[1].battle[0].uid&&a.target==='player');act(s,'block');assert.equal(options(s).find(a=>a.id===e.chooseHeuristicAI(s).id).value.uid,s.players[1].battle[1].uid);
 const t=setup();shieldCount(t,0,3);give(t,1,'battle',[F,'dm01-004']);cast(t,GU);assert.equal(options(t).find(a=>a.id===e.chooseHeuristicAI(t).id).value.uid,t.players[1].battle[0].uid);
});
