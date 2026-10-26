import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,inst,give,setup,act,cast,drain,attack,GEN,GG,DOGI,VEG,RS} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';import {resolveEnvironmentDecks,environmentSupport} from '../dist/environment.js';import {manualScreenHTML,newManualUI} from '../dist/manual-ui.js';
const HACK='dm26rp1-014',DIAMOND='dmrp22-027',ADM='dm26rp1-S004',MUTE='dm23rp2-015',VAM='dm24ex1-028',JADO='dmrp14-003',GOOD='dm25rp3-S06',ATER='dm23rp3-S03',REV='dm26rp1-DM001',JAGAN='dm25rp1-S06',UR='dm25rp4-013';
const KAKU='dm24rp1-035',TEN='dm25ex1-057',KOKKO='dm22rp2-019',NIBAI='dm26rp1-S011',BAI='dm29-s02',RED='dm25rp3-DM1',CHAOS='dm23rp2-OR01',DARK='dm25ex2-016',VT='dm23ex1-003',XII='dmr22-l03',LOVE='dmex17-020',SNAKE='dm25rp2-072',CASTLE='dm26rp1-043',ICE='dm23rp4-003',MIRAGE='dm25rp1-S07';
const registry=createCatalogue(snapshot,data.cards,details),decks=resolveEnvironmentDecks(registry);
const pick=(s,v)=>{const i=s.decision?.choices?.findIndex(x=>typeof v==='function'?v(x.value,x):JSON.stringify(x.value)===JSON.stringify(v));assert.ok(i>=0,'choice '+JSON.stringify(v)+' '+JSON.stringify(s.decision));act(s,'extended',a=>a.choice===i);};
const modes=(s,...m)=>{for(const n of m)pick(s,n);};
const skipAll=s=>{let n=0;while(s.decision&&s.winner===null){assert.ok(n++<300);const a=e.getLegalActions(s).find(a=>/使わない|しない|選ばない|ここまで/.test(a.label))||e.chooseAI(s);e.step(s,a);}};
const task=(s,op,p,source,more={})=>{(s.extTasks??=[]).push({op,p,source,...more});act(s,'toAttack');};
const end=s=>{s.phase='attack';act(s,'endTurn');};
const neoCast=(s,id)=>{cast(s,id);act(s,'evolve',a=>!a.baseUid);};
const hit=(s,shields)=>{give(s,0,'battle',['dm01-075']);give(s,1,'shields',shields);attack(s);act(s,'noBlock');};

test('both additions pin every official face and all four exact tournament lists now have forty supported copies',()=>{
 for(const phase of [15,16]){const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url)));assert.equal(m.cards.length,phase===15?11:15);for(const row of m.cards){const c=e.card(row.id),d=details.cards.find(x=>x.id===row.id);assert.deepEqual(row.faces,d.faces);assert.equal(c.source,row.source);for(const f of row.faces)assert.ok(c.text.includes(f.abilityText));for(const [k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);}}
 for(const d of decks){assert.equal(environmentSupport(d,registry).supportedCopies,40);assert.equal(environmentSupport(d,registry).unsupported.length,0);assert.deepEqual(e.validateDeck(d),[]);}assert.equal(data.cards.length,1232);
});
test('HACK rejects creature entries from grave, accepts spells and hand entries, and Z rush adds a temporary entry-turn attack ban',()=>{
 const s=setup();give(s,1,'battle',[HACK]);assert.equal(e.canEnterCreature(s,0,e.card(NIBAI),{origin:'grave',execution:false}),false);assert.equal(e.canEnterCreature(s,0,e.card(NIBAI),{origin:'hand',execution:false}),true);assert.equal(e.canEnterCreature(s,0,e.card(UR),{origin:'grave',execution:false}),true);
 s.players[1].battle[0].hyperActive=true;give(s,0,'battle',[NIBAI]);s.players[0].battle[0].entered=s.turn;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));s.players[0].battle[0].entered=0;assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'));
});
test('Diamond blocks, cannot attack players, prevents discounts, and permits the printed DDD alternate cost',()=>{
 const s=setup();give(s,1,'battle',[DIAMOND]);give(s,0,'battle',[NIBAI]);assert.equal(e.summonCost(s,0,e.card(VT)),8);assert.equal(e.dddPayment(s,0,e.card(RED)).cost,4);assert.equal(e.dddPayment(s,0,e.card(DOGI)),null);give(s,0,'battle',[DIAMOND]);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target==='player'));
});
test('Admiral draws for an opponent entry and its hyper attack can execute a noncreature up to the current hand size',()=>{
 const s=setup();give(s,1,'battle',[ADM]);const before=s.players[1].hand.length;cast(s,'dm01-108');pick(s,true);assert.equal(s.players[1].hand.length,before+1);
 const t=setup();give(t,0,'battle',[ADM]);t.players[0].battle[0].hyperActive=true;give(t,0,'hand',[CASTLE,'dm01-108']);attack(t);assert.equal(t.decision.task.op,'execute');pick(t,v=>v?.uid===t.players[0].hand[0].uid);assert.ok(t.players[0].shields.some(x=>x.faceUp&&x.cardId===CASTLE));
});
test('Mute optional loot can be declined, and its trigger-plus attack lock is an independent ability',()=>{
 const s=setup();cast(s,MUTE);assert.equal(s.decision.task.op,'optionalLoot');pick(s,null);assert.equal(s.players[0].hand.length,0);
 const t=setup();give(t,0,'battle',[BAI]);give(t,1,'shields',[MUTE,'dm01-108']);attack(t);act(t,'noBlock');act(t,'useTrigger');assert.equal(t.decision.type,'entryOrder');act(t,'orderEntry',a=>a.cardId===MUTE);skipAll(t);assert.ok(t.extLimits.some(x=>x.kind==='attack'&&x.player===0));t.phase='attack';t.players[0].battle[0].tapped=false;assert.ok(!e.getLegalActions(t).some(a=>a.kind==='attack'));
});
test('Vam bounces an element then its owner discards, can hyper by tapping one other creature, and taxes the second draw',()=>{
 const s=setup();give(s,1,'battle',[UR]);give(s,1,'hand',['dm01-108']);cast(s,VAM);const uid=s.players[1].battle[0].uid;pick(s,uid);assert.equal(s.players[1].battle.length,0);assert.equal(s.players[1].grave.length,1);assert.equal(s.players[1].hand.length,1);give(s,0,'battle',[VAM,NIBAI]);const before=s.players[0].hand.length;act(s,'hyper');pick(s,s.players[0].battle[1].uid);assert.equal(s.players[0].battle[0].hyperActive,true);assert.equal(s.players[0].battle[1].tapped,true);pick(s,null);assert.equal(s.players[0].hand.length,before);
 const t=setup();give(t,1,'battle',[VAM]);t.players[1].battle[0].hyperActive=true;cast(t,'dm06-085');assert.equal(t.players[0].drawsThisTurn,2);assert.equal(t.decision.task.op,'discard');pick(t,t.players[0].hand[0].uid);assert.equal(t.players[0].hand.length,1);
});
test('Jado adds a shield without S trigger, permits G strike, and then destroys an untapped enemy',()=>{
 const s=setup();give(s,0,'shields',[DIAMOND]);give(s,1,'battle',[KAKU]);cast(s,JADO);pick(s,s.players[0].shields[0].uid);assert.equal(s.decision.task.op,'gsTarget');pick(s,null);pick(s,s.players[1].battle[0].uid);assert.equal(s.players[1].battle.length,0);assert.ok(s.players[0].hand.some(x=>x.cardId===DIAMOND));assert.equal(e.power(s.players[0].battle[0],false,s),6000);
});
test('Good Evil chooses zero to two discards and makes the opponent discard the actual count',()=>{
 const s=setup();give(s,1,'hand',['dm01-108','dm01-108','dm01-108']);neoCast(s,GOOD);assert.equal(s.players[0].hand.length,3);pick(s,s.players[0].hand[0].uid);pick(s,null);assert.equal(s.players[0].grave.length,1);assert.equal(s.players[1].grave.length,1);assert.equal(s.players[1].hand.length,2);
});
test('a spell discarded on the opponent turn may be cast by Good Evil but finishes in the physical owner grave',()=>{
 const s=setup();give(s,1,'battle',[GOOD]);give(s,0,'hand',[SNAKE]);task(s,'discard',0,TEN,{n:1});pick(s,s.players[0].hand[0].uid);assert.equal(s.decision.task.op,'stealSpell');pick(s,true);assert.equal(s.decision.task.family,'serpent');modes(s,0);assert.equal(s.players[0].grave.filter(x=>x.cardId===SNAKE).length,1);assert.equal(s.players[1].grave.length,0);
});
test('Ater chooses both modes before execution and repeated mill modes send eight actual cards to the grave',()=>{
 const s=setup(),top=s.players[0].deck.slice(0,8).map(x=>x.uid);cast(s,ATER);modes(s,1,1);assert.deepEqual(s.players[0].grave.map(x=>x.uid),top);assert.equal(s.decision,null);
});
test('Ater minus power uses state actions before a second mode and its replacement can sacrifice a simultaneous victim',()=>{
 const s=setup();give(s,1,'battle',[KAKU]);cast(s,ATER);modes(s,0,1);pick(s,s.players[1].battle[0].uid);assert.equal(s.players[1].battle.length,0);assert.equal(s.players[0].grave.length,4);
 const t=setup();give(t,0,'battle',[ATER,'dm01-108']);const keep=t.players[0].battle[0].uid,sac=t.players[0].battle[1].uid;task(t,'destroyMin',1,RED); // smallest only; use a queued direct sweep for the simultaneous replacement below
 const u=setup();give(u,1,'battle',[ATER,'dm01-108']);u.players[1].battle[0].powerModifiers=[{amount:-4000,expires:'end',who:0}];give(u,0,'battle',[RED]);u.players[1].battle[1].powerModifiers=[{amount:2000,expires:'end',who:0}];task(u,'destroyMin',0,RED);assert.equal(u.decision.type,'leaveReplace');const uid=u.players[1].battle[0].uid;act(u,'replaceAter');skipAll(u);assert.ok(u.players[1].battle.some(x=>x.uid===uid));assert.equal(u.players[1].grave.length,1);
});
test('Reverse is untargetable and unblockable, locks only existing creatures, and burns shields before both players draw',()=>{
 const s=setup();give(s,1,'battle',[NIBAI]);cast(s,REV);assert.equal(s.extLimits.length,2);const later=inst(NIBAI);s.players[1].battle.push(later);assert.ok(!s.extLimits.some(l=>l.uid===later.uid));const r=s.players[0].battle[0];r.hyperActive=true;r.entered=0;const hand=s.players.map(x=>x.hand.length),shields=s.players[1].shields.map(x=>x.uid);attack(s,r.uid);assert.equal(e.getLegalActions(s).filter(a=>a.kind==='block').length,0);act(s,'noBlock');act(s,'breakShields');while(s.decision?.task?.op==='bottomOrder')pick(s,s.decision.task.uids[0]);assert.equal(s.players[1].brokenThisTurn||0,0);assert.equal(s.players[1].shields.length,2);assert.equal(s.players[0].hand.length,hand[0]+3);assert.equal(s.players[1].hand.length,hand[1]+3);assert.equal(s.players[1].deck.filter(x=>shields.includes(x.uid)).length,3);
});
test('Jagan mills two then revives a cost-five creature and at end can exchange another tapped creature for its namesake',()=>{
 const s=setup();give(s,0,'grave',[KAKU]);neoCast(s,JAGAN);assert.equal(s.players[0].grave.length,3);pick(s,s.players[0].grave[0].uid);assert.ok(s.players[0].battle.some(x=>x.cardId===KAKU));s.players[0].battle[0].tapped=true;give(s,0,'hand',[KAKU]);end(s);assert.equal(s.decision.task.op,'endJagan');pick(s,s.players[0].battle.find(x=>x.cardId===KAKU).uid);pick(s,s.players[0].hand[0].uid);assert.equal(s.players[0].battle.filter(x=>x.cardId===KAKU).length,1);assert.equal(s.active,1);
});
test('Ur is a seed that cannot attack or block; an eligible NEO may evolve over it and gain only Soul X blocker',()=>{
 const s=setup();give(s,0,'hand',[UR,JAGAN]);act(s,'play',a=>a.cardId===UR);assert.equal(s.players[0].battle[0].cardId,UR);assert.equal(s.decision.task.op,'urEvolve');pick(s,s.players[0].hand[0].uid);const x=s.players[0].battle[0];assert.equal(x.cardId,JAGAN);assert.equal(x.under[0].cardId,UR);assert.equal(e.effectiveCard(x,s).blocker,true);drain(s);
 const t=setup();give(t,0,'battle',[UR]);t.phase='attack';assert.ok(!e.getLegalActions(t).some(a=>a.kind==='attack'));
});
test('Kaku returns a nonsummoned opponent creature to that opponent chosen end of the deck',()=>{
 const s=setup();give(s,1,'battle',[KAKU]);give(s,0,'grave',[NIBAI]);task(s,'revive',0,JAGAN,{max:6,optional:true});pick(s,s.players[0].grave[0].uid);assert.equal(s.decision.type,'fight');act(s,'skipFight');assert.equal(s.decision.player,0);const uid=s.players[0].battle[0].uid;pick(s,'deckTop');assert.equal(s.players[0].deck[0].uid,uid);skipAll(s);
});
test('Kaku leaving on the opponent turn offers its own controller a one-card loot',()=>{
 const s=setup();give(s,1,'battle',[KAKU]);give(s,1,'hand',['dm01-108']);task(s,'destroyCost',0,KOKKO,{max:2});pick(s,s.players[1].battle[0].uid);assert.equal(s.decision.player,1);assert.equal(s.decision.task.op,'optionalLoot');pick(s,true);pick(s,s.players[1].hand[0].uid);assert.equal(s.players[1].grave.length,2);assert.equal(s.players[1].hand.length,1);
});
test('Tensai draws two, discards one and chooses one twinpact cost for its timed attack/block restriction',()=>{
 const s=setup();give(s,0,'hand',[TEN,LOVE]);give(s,1,'battle',[NIBAI]);act(s,'play',a=>a.cardId===TEN);pick(s,s.players[0].hand.find(x=>x.cardId===LOVE).uid);assert.equal(s.decision.task.op,'tensaiCost');pick(s,6);assert.equal(s.extLimits.length,2);assert.ok(s.extLimits.every(l=>l.cost===6&&l.who===0));s.active=1;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));
});
test('old Baiken discard replacement enters and completes its optional bounce without being a discard',()=>{
 const s=setup();give(s,1,'hand',[BAI]);give(s,0,'battle',[NIBAI]);const uid=s.players[1].hand[0].uid;task(s,'discard',1,TEN,{n:1,costLock:true});pick(s,s.players[1].hand[0].uid);pick(s,true);assert.equal(s.decision.task.op,'bounceAny');pick(s,s.players[0].battle[0].uid);assert.ok(s.players[1].battle.some(x=>x.uid===uid));assert.equal(s.players[1].grave.length,0);assert.equal(s.extLimits?.length||0,0);assert.equal(s.players[1].discardedThisTurn||false,false);
});
test('Nibaiken replaced discard queues its entry battle and every actual tap offers its two-card loot',()=>{
 const s=setup();give(s,1,'hand',[NIBAI]);give(s,0,'battle',['dm01-108']);task(s,'discard',1,TEN,{n:1});pick(s,s.players[1].hand[0].uid);pick(s,true);assert.equal(s.decision.type,'fight');act(s,'fight',a=>a.targetUid===s.players[0].battle[0].uid||a.uid===s.players[0].battle[0].uid||a.target===s.players[0].battle[0].uid);assert.equal(s.players[0].battle.length,0);const n=s.players[1].battle[0];n.entered=0;s.active=1;attack(s,n.uid);assert.equal(s.decision.task.op,'optionalLoot');pick(s,null);assert.equal(n.tapped,true);
});
test('Kokko lets its controller select either grave, the owner orders the bottom cards, then destroys by the selected count',()=>{
 const s=setup();give(s,1,'grave',['dm01-108','dm01-108']);give(s,1,'battle',[KAKU]);cast(s,KOKKO);pick(s,1);const ids=s.players[1].grave.map(x=>x.uid);pick(s,ids[0]);pick(s,ids[1]);pick(s,null);assert.equal(s.decision.player,1);pick(s,ids[1]);pick(s,ids[0]);assert.deepEqual(s.players[1].deck.slice(-2).map(x=>x.uid),[ids[1],ids[0]]);pick(s,s.players[1].battle[0].uid);assert.equal(s.players[1].battle.length,0);
});
test('Redzone untaps on entry, destroys every minimum-power enemy, and ignores player attack locks without gaining unblockable',()=>{
 const s=setup();give(s,1,'battle',[KAKU,KAKU,NIBAI]);neoCast(s,RED);drain(s);assert.equal(s.players[1].battle.length,1);assert.equal(s.players[1].battle[0].cardId,NIBAI);const r=s.players[0].battle[0];assert.equal(r.tapped,false);give(s,0,'battle',[RED,NIBAI]);s.extLimits=[{kind:'attack',player:0}];s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.cardId===NIBAI)||e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===s.players[0].battle[1].uid));
});
test('Chaos taps enemies on entry and prevents even speed attackers entering this turn from attacking',()=>{
 const s=setup();give(s,1,'battle',[NIBAI]);cast(s,CHAOS);assert.equal(s.players[1].battle[0].tapped,true);s.players[1].battle[0].tapped=false;s.players[1].battle[0].entered=s.turn;s.active=1;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));
});
test('VT discounts by creatures on both sides, bounces only power 5000-or-less, and restricts the next opposing turn',()=>{
 const s=setup();give(s,0,'battle',[UR,NIBAI]);give(s,1,'battle',[KAKU,NIBAI]);assert.equal(e.summonCost(s,0,e.card(VT)),5);cast(s,VT);assert.equal(s.players[1].battle.length,1);assert.equal(e.canEnterCreature(s,1,e.card(KAKU)),true);skipAll(s);end(s);assert.equal(e.canEnterCreature(s,1,e.card(KAKU)),false);assert.equal(e.canEnterCreature(s,1,e.card(NIBAI)),true);
});
test('LOVE creature prevents opposing spells through their turn; its spell face draws three and optionally chains a spell',()=>{
 const s=setup();cast(s,LOVE);assert.equal(e.canCastSpell(s,1,e.card(SNAKE)),false);assert.equal(e.canCastSpell(s,0,e.card(SNAKE)),true);end(s);assert.equal(e.canCastSpell(s,1,e.card(SNAKE)),false);end(s);assert.equal(e.canCastSpell(s,1,e.card(SNAKE)),true);
 const t=setup();give(t,0,'hand',[LOVE]);act(t,'play',a=>a.face===1);assert.equal(t.players[0].hand.length,3);pick(t,null);assert.equal(t.players[0].grave[0].cardId,LOVE);
});
test('Snake discards before modal execution and a draw mode draws exactly two',()=>{
 const s=setup();give(s,0,'hand',[SNAKE,KAKU]);act(s,'play',a=>a.cardId===SNAKE);pick(s,s.players[0].hand[0].uid);assert.equal(s.players[0].grave[0].cardId,KAKU);modes(s,0);assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].grave.at(-1).cardId,SNAKE);
});
test('castle executes into a new face-up shield, draws only for the first real discard each turn, and leaving resolves mandatory loot',()=>{
 const s=setup();cast(s,CASTLE);const x=s.players[0].shields.at(-1);assert.equal(x.faceUp,true);give(s,0,'hand',[KAKU,KAKU]);task(s,'discard',0,TEN,{n:1});pick(s,s.players[0].hand[0].uid);assert.equal(s.decision.task.op,'optionalDrawOne');pick(s,true);const before=s.players[0].hand.length;s.phase='main';task(s,'discard',0,TEN,{n:1});pick(s,s.players[0].hand[0].uid);assert.equal(s.decision,null);assert.equal(s.players[0].hand.length,before-1);
 const t=setup();give(t,1,'shields',[CASTLE]);t.players[1].shields[0].faceUp=true;give(t,1,'hand',[KAKU]);give(t,0,'battle',['dm01-075']);attack(t);act(t,'noBlock');assert.equal(t.decision.task.op,'discard');assert.equal(t.players[1].grave[0].cardId,CASTLE);pick(t,t.players[1].hand[0].uid);assert.equal(t.players[1].hand.length,2);assert.equal(t.players[1].brokenThisTurn||0,0);
});
test('Icicle chooses both modes first, executes printed order, can deploy a castle, and its conditional trigger exists only in shields',()=>{
 const s=setup();give(s,0,'hand',[ICE,CASTLE]);act(s,'play',a=>a.cardId===ICE);modes(s,2,0);assert.equal(s.decision.task.op,'execute');pick(s,v=>v?.uid===s.players[0].hand[0].uid);assert.ok(s.players[0].shields.some(x=>x.cardId===CASTLE&&x.faceUp));
 const t=setup();give(t,1,'grave',[SNAKE,ICE]);hit(t,[ICE]);assert.equal(t.decision.type,'trigger');act(t,'skipTrigger');assert.equal(t.players[1].brokenThisTurn,1);
});
test('Mirage executes a grave S trigger spell, which cannot select itself during resolution and finishes at the deck bottom',()=>{
 const s=setup();give(s,0,'grave',[SNAKE,ICE]);cast(s,MIRAGE);modes(s,1,1);assert.equal(s.decision.task.op,'execute');assert.deepEqual(s.decision.choices.map(x=>x.cardId),[SNAKE]);const uid=s.players[0].grave[0].uid;pick(s,v=>v?.uid===uid);modes(s,0);assert.equal(s.players[0].deck.at(-1).uid,uid);assert.ok(!s.players[0].grave.some(x=>x.cardId===SNAKE));assert.equal(s.players[0].grave.at(-1).cardId,MIRAGE);
});
test('Mirage shields evolution components as separate shields; G NEO may instead move only its bases',()=>{
 for(const id of ['dm01-s01',RED]){const s=setup(),x=inst(id);x.under=[inst(KAKU),inst(KAKU)];s.players[1].battle=[x];const before=s.players[1].shields.length;cast(s,MIRAGE);modes(s,2,2);pick(s,x.uid);if(id===RED){assert.equal(s.players[1].battle.length,1);assert.equal(s.players[1].shields.length,before+2);pick(s,x.uid);}assert.equal(s.players[1].battle.length,0);assert.equal(s.players[1].shields.length,before+3);}
});
test('end Mirage can be declared below three entries, then Gaia resolves first to satisfy the condition',()=>{
 const s=setup();give(s,1,'hand',['dmex17-021',MIRAGE]);s.noManaUse=[true,false];s.creaturesEntered=2;end(s);act(s,'declareGaia');assert.equal(s.decision.type,'mirageDeclare');act(s,'declareGaia');assert.equal(s.decision.type,'endAbilityOrder');act(s,'orderEndAbility',a=>a.cardId==='dmex17-021');act(s,'summonGaia');assert.equal(s.decision.task.family,'mirage');modes(s,0,0);skipAll(s);assert.equal(s.active,1);assert.ok(s.players[1].grave.some(x=>x.cardId===MIRAGE));
});
test('Ninja Strike uses a player-specific once-per-attack flag, old Baiken draws, and the Shinobi returns to bottom at end',()=>{
 const s=setup();give(s,0,'battle',[BAI]);give(s,1,'battle',[BAI]);give(s,1,'hand',[TEN]);attack(s);assert.equal(s.decision.task.op,'ninjaDeclare');pick(s,true);pick(s,'strike');const n=s.players[1].battle.find(x=>x.cardId===TEN);assert.ok(n.uraNinja);assert.equal(s.attack.ninjaUsed[1].strike,true);skipAll(s);end(s);skipAll(s);assert.ok(!s.players[1].battle.some(x=>x.cardId===TEN));assert.equal(s.players[1].deck.at(-1).cardId,TEN);
});
test('Ninja Change after blocking replaces the attacking creature, carries the blocked attack on, and does not reopen attack triggers',()=>{
 const s=setup();give(s,0,'battle',[BAI]);give(s,0,'hand',[CHAOS]);give(s,1,'battle',[DIAMOND]);attack(s);act(s,'block');assert.equal(s.decision.task.op,'ninjaDeclare');pick(s,true);pick(s,s.players[0].battle[0].uid);assert.equal(s.players[0].battle[0].cardId,CHAOS);assert.equal(s.players[0].battle[0].tapped,true);assert.ok(s.players[1].grave.some(x=>x.cardId===DIAMOND));assert.equal(s.players[1].shields.length,5);assert.equal(s.attack,null);
});
test('Revolution Change keeps attack state and Dark final revolution mills two then revives a multicolor up to seven',()=>{
 const s=setup();give(s,0,'battle',[NIBAI]);give(s,0,'hand',[DARK]);give(s,0,'grave',[NIBAI]);attack(s);pick(s,true);act(s,'orderEffect',a=>a.effectId&&a.cardId===DARK);pick(s,s.players[0].battle[0].uid);assert.equal(s.players[0].battle[0].cardId,DARK);assert.equal(s.players[0].battle[0].tapped,true);assert.ok(s.players[0].hand.some(x=>x.cardId===NIBAI));drain(s);assert.ok(s.finalUsed[0]);assert.ok(s.players[0].battle.some(x=>x.cardId===NIBAI));
});
test('XII final revolution prevents small summons including ninja strike, but permits non-summon entries',()=>{
 const s=setup();give(s,0,'battle',[BAI]);give(s,0,'hand',[XII]);attack(s);pick(s,true);pick(s,s.players[0].battle[0].uid);drain(s);assert.ok(s.finalUsed[0]);assert.equal(e.canEnterCreature(s,1,e.card(TEN)),false);assert.equal(e.canEnterCreature(s,1,e.card(TEN),{origin:'hand',execution:false}),true);
});
test('Genmu suppresses ordinary low-cost creatures and spell effects while creature G strike remains usable',()=>{
 const s=setup();give(s,0,'battle',[GEN]);give(s,1,'shields',[DIAMOND]);attack(s);act(s,'noBlock'); // infinite break selects a count
 if(s.decision?.type==='infinityCount'){act(s,'infinityCount',a=>a.n===1);act(s,'infinityShield');}
 assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);assert.equal(s.decision.task.op,'gsTarget');pick(s,s.players[0].battle[0].uid);assert.ok(s.extLimits.some(x=>x.kind==='attack'));
 const t=setup();give(t,1,'battle',[GEN]);cast(t,SNAKE);assert.equal(t.decision,null);assert.equal(t.players[0].grave[0].cardId,SNAKE);
});
test('all environment pairings terminate reproducibly, survive JSON reloads and conserve eighty unique cards after every action',()=>{
 for(let i=0;i<decks.length;i++)for(let j=0;j<decks.length;j++)for(let seed=1;seed<=6;seed++){let s=e.createGame([decks[i],decks[j]],{seed,first:seed%2}),n=0;while(s.winner===null&&n++<2500){const a=e.chooseAI(s);assert.ok(a);e.step(s,a);const all=e.physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);if(n%9===0)s=JSON.parse(JSON.stringify(s));}assert.notEqual(s.winner,null);const again=e.runGame([decks[i],decks[j]],{seed,first:seed%2});assert.deepEqual(e.runSummary(s),e.runSummary(again));}
});
test('manual interface renders every actual decision from the new decks without mutation and offers the extended actions',()=>{
 let count=0;for(const d of [decks[0],decks[2]]){const s=e.createGame([d,d],{seed:71});while(s.winner===null&&s.actions<500){if(s.decision?.player===0){const before=structuredClone(s),html=manualScreenHTML(s,{...newManualUI(),mobile:true,mobilePanel:'actions'},{art:id=>'<i>'+id+'</i>',icon:()=>''});assert.ok(html.includes(e.getLegalActions(s)[0].label.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')));assert.deepEqual(s,before);count++;}e.step(s,e.chooseAI(s));}}assert.ok(count>20);
});

test('castle leave waits for shield trigger declarations and use, so it cannot discard a not-yet-declared Mute',()=>{
 const s=setup();give(s,0,'battle',[BAI]);give(s,1,'shields',[CASTLE,MUTE]);s.players[1].shields[0].faceUp=true;give(s,1,'hand',[KAKU]);attack(s);act(s,'noBlock');assert.equal(s.decision.type,'trigger');assert.equal(s.decision.source,MUTE);act(s,'useTrigger');assert.equal(s.decision.type,'entryOrder');act(s,'orderEntry',a=>a.cardId===MUTE);assert.equal(s.decision.task.op,'optionalLoot');pick(s,null);assert.equal(s.decision.task.op,'discard');assert.ok(s.players[1].battle.some(x=>x.cardId===MUTE));pick(s,s.players[1].hand[0].uid);assert.equal(s.players[1].hand.length,2);
});
test('ordinary Jado shield pickup sends a face-up castle to grave and waits until the current effect finishes before castle loot',()=>{
 const s=setup();give(s,0,'shields',[CASTLE]);s.players[0].shields[0].faceUp=true;give(s,1,'battle',['dm01-108']);give(s,0,'hand',[JADO,KAKU]);act(s,'play',a=>a.cardId===JADO);pick(s,s.players[0].shields[0].uid);assert.equal(s.decision.task.op,'destroyUntapped');assert.ok(!s.players[0].hand.some(x=>x.cardId===CASTLE));assert.ok(s.players[0].grave.some(x=>x.cardId===CASTLE));pick(s,s.players[1].battle[0].uid);assert.equal(s.decision.task.op,'discard');pick(s,s.players[0].hand[0].uid);assert.equal(s.players[0].hand.length,2);
});
test('Mirage excludes illegal creature and seed executions before removing a card from its grave',()=>{
 for(const [gate,grave]of [[HACK,'dm05-024'],[VEG,UR]]){const s=setup();give(s,1,'battle',[gate]);give(s,0,'grave',[grave]);cast(s,MIRAGE);modes(s,1,1);assert.equal(s.decision,null);assert.equal(s.players[0].grave.filter(x=>x.cardId===grave).length,1);assert.ok(s.players[0].grave.some(x=>x.cardId===MIRAGE));}
});
test('Kaku leave uses pre-move abilities: Genmu suppresses it, while an Ater replacement sacrifice still triggers it',()=>{
 const s=setup();give(s,0,'battle',[GEN]);give(s,1,'battle',[KAKU]);task(s,'destroyCost',0,KOKKO,{max:2});pick(s,s.players[1].battle[0].uid);assert.equal(s.decision,null);
 const t=setup();give(t,1,'battle',[ATER,KAKU]);task(t,'destroyCost',0,KOKKO,{max:6});pick(t,t.players[1].battle[0].uid);act(t,'replaceAter');assert.equal(t.decision.task.op,'optionalLoot');assert.equal(t.decision.player,1);pick(t,null);assert.ok(t.players[1].battle.some(x=>x.cardId===ATER));
});
test('multi-card discard selects its original batch before a Baiken replacement can return another card to hand',()=>{
 const s=setup();give(s,1,'hand',[BAI,'dm01-108']);give(s,1,'battle',[KAKU]);const before=s.players[1].hand.map(x=>x.uid),returned=s.players[1].battle[0].uid;task(s,'discard',1,GOOD,{n:2,random:true});if(s.decision?.task.op==='discardChosen')pick(s,true);if(s.decision?.task.op==='bounceAny')pick(s,returned);skipAll(s);assert.ok(s.players[1].hand.some(x=>x.uid===returned));assert.ok(s.players[1].grave.some(x=>x.uid===before[1]));assert.ok(s.players[1].battle.some(x=>x.uid===before[0]));
});
test('Tensai only locks the currently matching cost creatures, with no lock on later entrants',()=>{
 const s=setup();give(s,1,'battle',[NIBAI]);give(s,0,'hand',[TEN,LOVE]);act(s,'play',a=>a.cardId===TEN);pick(s,s.players[0].hand.find(x=>x.cardId===LOVE).uid);pick(s,6);const old=s.players[1].battle[0],later=inst(NIBAI);s.players[1].battle.push(later);s.active=1;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===old.uid));assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===later.uid));
});
test('Ninja Change into a creature being attacked preserves the target and battle instead of cancelling the attack',()=>{
 const s=setup();give(s,0,'battle',['dm01-075']);give(s,1,'battle',[BAI]);s.players[1].battle[0].tapped=true;give(s,1,'hand',[CHAOS]);const target=s.players[1].battle[0].uid;attack(s,s.players[0].battle[0].uid,target);pick(s,true);pick(s,target);assert.equal(s.attack.target,s.players[1].battle[0].uid);assert.equal(s.players[1].battle[0].cardId,CHAOS);act(s,'noBlock');assert.equal(s.players[0].battle.length,0);assert.equal(s.players[1].shields.length,5);
});
test('Dark battle trigger is consumed by its first entry event even when its optional battle is declined',()=>{
 const s=setup();give(s,0,'battle',[DARK]);give(s,1,'battle',['dm01-075']);cast(s,NIBAI);act(s,'orderEffect',a=>a.cardId===DARK);assert.equal(s.decision.task.op,'darkFight');pick(s,null);act(s,'skipFight');s.phase='main';cast(s,NIBAI);assert.equal(s.decision.type,'fight');assert.ok(!(s.pendingEffects||[]).some(e=>e.source===DARK));act(s,'skipFight');
});
test('DDD Redzone pays four fire mana and untaps the evolved attacking creature without retriggering attack',()=>{
 const s=setup();give(s,0,'battle',['dm01-097']);give(s,0,'hand',[RED]);attack(s);act(s,'declareDDD');assert.equal(s.decision.type,'dddSummon');const a=e.getLegalActions(s).find(a=>a.kind==='summonDDD'&&a.baseUid);assert.ok(a);assert.equal(a.cost,4);e.step(s,a);drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);assert.equal(s.players[0].battle[0].cardId,RED);assert.equal(s.players[0].battle[0].tapped,false);
});
test('a replaced Baiken discard does not trigger castle draw or Good Evil spell theft',()=>{
 const s=setup();give(s,1,'hand',[BAI]);give(s,1,'shields',[CASTLE]);s.players[1].shields[0].faceUp=true;task(s,'discard',1,TEN,{n:1});pick(s,s.players[1].hand[0].uid);pick(s,true);pick(s,null);assert.equal(s.decision,null);assert.equal(s.players[1].discardedThisTurn||false,false);
});
test('resolved hyper power persists under Genmu while Z rush abilities and power are ignored until it leaves',()=>{
 const s=setup();give(s,0,'battle',[VAM,HACK]);s.players[0].battle[0].hyperActive=true;s.players[0].battle[1].hyperActive=true;give(s,1,'battle',[GEN]);assert.equal(e.power(s.players[0].battle[0],false,s),6000);assert.equal(e.effectiveCard(s.players[0].battle[0],s).drawDiscard,undefined);assert.equal(e.power(s.players[0].battle[1],false,s),2000);give(s,1,'battle',[]);assert.equal(e.power(s.players[0].battle[1],false,s),5000);
});
test('random legal choices across the new environment decks never deadlock, lose a card or change choices after JSON restoration',()=>{
 for(let seed=1;seed<=60;seed++){const s=e.createGame([decks[seed%4],decks[Math.floor(seed/4)%4]],{seed:seed*173,first:seed%2}),r={rng:seed};for(let n=0;n<600&&s.winner===null;n++){const options=e.getLegalActions(s);assert.ok(options.length,JSON.stringify({seed,n,s}));const a=options[Math.floor(e.random(r)*options.length)];e.step(s,a);const all=e.physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(restored),e.getLegalActions(s));assert.deepEqual(e.chooseAI(restored),e.chooseAI(s));}}
});
test('the production worker runs both added decks against all four environment lists and returns completed finite statistics',async()=>{
 const messages=[];globalThis.self={};globalThis.postMessage=x=>messages.push(structuredClone(x));try{await import('../dist/worker.js?all-tournament');for(const deck of [decks[0],decks[2]])await self.onmessage({data:{cards:data.cards,deck,opponents:decks,count:20,first:'random',seed:1516}});assert.ok(!messages.some(x=>x.type==='error'),JSON.stringify(messages));const done=messages.filter(x=>x.type==='done');assert.equal(done.length,2);for(const batch of done)for(const result of batch.results){assert.equal(result.games.length,20);assert.equal(result.stats.completed,20);assert.equal(result.stats.unresolved,0);assert.ok(Number.isFinite(result.stats.rate));assert.ok(result.games.every(x=>x.version===e.ENGINE_VERSION));}}finally{delete globalThis.self;delete globalThis.postMessage;}
});
test('Redzone also ignores Chaos and Gaia entry-turn attack restrictions while preserving its allies own attack rules',()=>{
 const s=setup();give(s,0,'battle',[RED,NIBAI]);give(s,1,'battle',[CHAOS,'dmex17-021']);s.players[0].battle[1].entered=s.turn;s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===s.players[0].battle[1].uid&&a.target==='player'));
});
test('a previously declared S trigger or G strike discarded by another trigger is removed from the remaining queue',()=>{
 for(const second of [MUTE,DIAMOND]){const s=setup();give(s,0,'battle',[BAI]);give(s,1,'shields',[SNAKE,second]);attack(s);act(s,'noBlock');act(s,'useTrigger');if(second===MUTE)act(s,'useTrigger');else pick(s,true);act(s,'orderTrigger',a=>a.cardId===SNAKE);pick(s,s.players[1].hand.find(x=>x.cardId===second).uid);modes(s,0);assert.equal(s.triggers,null);assert.equal(s.decision,null);assert.ok(s.players[1].grave.some(x=>x.cardId===second));assert.ok(!s.players[1].battle.some(x=>x.cardId===second));}
});
test('a declared end-step card discarded while resolving another Mirage does not remain a stale selectable ability',()=>{
 const s=setup();give(s,1,'hand',[MIRAGE,MIRAGE,MIRAGE]);s.creaturesEntered=3;end(s);for(let i=0;i<3;i++)act(s,'declareGaia');act(s,'orderEndAbility');modes(s,0,0);const removed=s.players[1].hand[0].uid;pick(s,removed);pick(s,s.players[1].hand[0].uid);skipAll(s);assert.equal(s.active,1);assert.equal(s.endStep,null);
});
test('using Ninja Change first still permits Ninja Strike in the same attack, with separate per-player usage flags',()=>{
 const s=setup();give(s,0,'battle',[BAI]);give(s,1,'battle',[BAI]);give(s,1,'hand',[CHAOS,TEN]);attack(s);pick(s,true);pick(s,true);assert.equal(s.decision.type,'effectOrder');act(s,'orderEffect',a=>a.cardId===CHAOS);pick(s,s.players[1].battle[0].uid);assert.equal(s.attack.ninjaUsed[1].any,true);assert.equal(s.attack.ninjaUsed[1].strike,undefined);act(s,'orderEffect',a=>a.cardId===TEN);pick(s,'strike');assert.ok(s.players[1].battle.some(x=>x.cardId===TEN));assert.equal(s.attack.ninjaUsed[1].strike,true);assert.equal(s.attack.ninjaUsed[0],undefined);skipAll(s);
});
test('the player-wide Final Revolution use prevents a second final effect during the same turn',()=>{
 const s=setup();s.extTasks=[{op:'finalDark',p:0,source:DARK},{op:'finalLight',p:0,source:XII}];act(s,'toAttack');assert.equal(s.finalUsed[0],true);assert.ok(!(s.extLimits||[]).some(x=>x.kind==='summon'));assert.equal(s.players[0].grave.length,2);
});
