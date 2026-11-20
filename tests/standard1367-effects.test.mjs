import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {e,act,attack,cast,data,details,drain,give,inst,setup,snapshot} from './target-fixture.mjs';
import {nameKey,createCatalogue} from '../dist/catalogue.js';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {extraDeckZone} from '../dist/deck-format.js';
const STEIN='dm25ex4-SPR01',M='dm25ex4-SPR06',TAP='dm25ex4-SPR07',LOOK='dm25ex4-SPR08',BASIC='dm01-108',TROY='dm23sd2-014',BACK='dm23rp1-055',DEMON='dm01-027',RAKUJO='dmr15-041';
const field=()=>{const s=setup();s.format='advance';for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));give(s,0,'extra',[M,TAP,LOOK]);return s;};
const add=(s,p,z,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const pick=(s,v)=>act(s,'extended',a=>{const x=s.decision.choices[a.choice].value;return(x?.uid??x)===(v?.uid??v);});
const use=(s,id)=>act(s,'duelist1367',a=>a.cardId===id);
function expireProtection(s){s.active=1;s.phase='attack';act(s,'endTurn');drain(s);s.active=1;s.phase='main';}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const unique=s=>{const xs=e.physicalCards(s);assert.equal(xs.length,new Set(xs.map(x=>x.uid)).size);return xs.length;};
function linked(last=M){const s=field();cast(s,STEIN);for(const id of [M,TAP,LOOK].filter(id=>id!==last).concat(last)){use(s,id);drain(s);if(id!==last)s.turn++;}return s;}
test('the five official prints pin all faces, aliases, mana, full text, art and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1367.json',import.meta.url))),cat=createCatalogue(snapshot,data.cards,details);
 assert.equal(m.cards.length,4);for(const row of m.cards){const d=details.cards.find(x=>x.id===row.id);assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:1367}),row.spec);const bad=structuredClone(d);bad.faces.at(-1).abilityText+='未照合';assert.throws(()=>standardCardSpec(bad,{phase:1367}));for(const [k,v] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[k],v);assert.equal(e.card(row.id).limit,4);assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).length,1);assert.equal(cat.get(row.id).id,row.id);assert.match(row.image,/dm25ex4/);}
 assert.equal(cat.get('dm25ex4-SecSPR1').id,STEIN);assert.equal(e.card(STEIN).type,'duelist');for(const id of [M,TAP,LOOK]){assert.equal(e.card(id).manaValue,0);assert.equal(extraDeckZone(e.card(id)),'extraCards');}
});
test('a paid duelist enters as an untappable noncreature and forbids its owner’s second copy',()=>{
 const s=field();cast(s,STEIN);const stein=s.players[0].battle[0];assert.equal(e.card(stein).power,0);s.phase='attack';assert.ok(!e.getLegalActions(s).some(x=>x.kind==='attack'&&x.uid===stein.uid));s.phase='main';const second=add(s,0,'hand',STEIN);assert.ok(!e.getLegalActions(s).some(x=>x.kind==='play'&&x.uid===second.uid));cast(s,BACK);assert.equal(stein.tapped,false);assert.deepEqual(s.decision.choices.map(x=>x.value),[null]);pick(s,null);assert.equal(s.decision,null);
});
test('QA48142: the actual 7r0y returns Stein and deploys a qualifying creature',()=>{
 const s=field();cast(s,STEIN);const stein=s.players[0].battle[0],creature=add(s,0,'hand','dm28-073');cast(s,TROY);assert.ok(s.decision.choices.some(x=>x.value?.uid===stein.uid));pick(s,stein.uid);assert.ok(has(s,0,'hand',stein));pick(s,creature.uid);drain(s);assert.ok(has(s,0,'battle',creature));
});
test('duelist execution checks mana count, once per turn, unpaid locks and cannot pay for duelmates from hand',()=>{
 const s=field();give(s,0,'mana',Array(2).fill('dm01-075'));cast(s,STEIN);assert.deepEqual(e.getLegalActions(s).filter(x=>x.kind==='duelist1367').map(x=>x.cardId),[M]);use(s,M);assert.ok(!e.getLegalActions(s).some(x=>x.kind==='duelist1367'));const mate=add(s,0,'hand',TAP);assert.ok(!e.getLegalActions(s).some(x=>x.kind==='play'&&x.uid===mate.uid));s.turn++;give(s,0,'mana',Array(4).fill('dm01-075'));assert.ok(e.getLegalActions(s).some(x=>x.kind==='duelist1367'&&x.cardId===TAP));
});
test('the tap spell taps all opposing creatures and resolves beneath Stein without entering the grave',()=>{
 const s=field();cast(s,STEIN);const stein=s.players[0].battle[0],enemy=add(s,1,'battle',BASIC),own=add(s,0,'battle',BASIC),enemyStein=add(s,1,'battle',STEIN);use(s,TAP);assert.equal(enemy.tapped,true);assert.equal(own.tapped,false);assert.equal(enemyStein.tapped,false);assert.equal(stein.under[0].cardId,TAP);assert.equal(s.players[0].grave.length,0);
});
test('the reveal spell accepts a Mecha noncreature, orders every remainder, and attaches only after resolution',()=>{
 let s=field();cast(s,STEIN);const stein=s.players[0].battle[0];give(s,0,'deck',[STEIN,BASIC,BASIC,BASIC,BASIC,BASIC]);const wanted=s.players[0].deck[0],count=unique(s);use(s,LOOK);assert.ok(s.extSpells.some(f=>f.spell.id===LOOK));assert.ok(!stein.under?.length);pick(s,wanted.uid);s=JSON.parse(JSON.stringify(s));drain(s);assert.ok(has(s,0,'hand',wanted));assert.equal(s.players[0].deck.length,5);assert.equal(s.players[0].battle[0].under[0].cardId,LOOK);assert.equal(unique(s),count);
});
test('Magao is a blocker and its untargetable grant expires at the next actual own turn start',()=>{
 const s=field();cast(s,STEIN);use(s,M);const magao=s.players[0].battle[1];assert.equal(e.effectiveCard(magao,s).blocker,true);assert.equal(e.effectiveCard(magao,s).untargetable,true);s.active=1;s.phase='attack';act(s,'endTurn');drain(s);assert.ok(!e.effectiveCard(magao,s).untargetable);
});
test('QA48147/48144: final Magao links before its entry resolves and grants protection to the same body',()=>{
 const s=linked();const body=s.players[0].battle.find(x=>x.psychicLinks);assert.equal(e.card(body).name,'最後の名 シャーロック・アルタモント');assert.equal(e.card(body).cost,10);assert.equal(e.card(body).power,11500);assert.equal(e.card(body).breaker,2);assert.equal(body.entered,s.turn);assert.equal(e.effectiveCard(body,s).untargetable,true);assert.equal(body.psychicLinks.length,2);assert.ok(!s.players[0].battle[0].under?.length);unique(s);
});
test('linking retains Magao tap state and all physical cards through a saved spell continuation',()=>{
 let s=field();cast(s,STEIN);use(s,M);const magao=s.players[0].battle[1];magao.tapped=true;s.turn++;use(s,TAP);s.turn++;use(s,LOOK);const before=unique(s);s=JSON.parse(JSON.stringify(s));drain(s);const body=s.players[0].battle.find(x=>x.psychicLinks);assert.equal(body.uid,magao.uid);assert.equal(body.tapped,true);assert.equal(unique(s),before);
});
test('the linked creature attacks immediately, optionally deploys one matching cost-five creature and bottoms the rest',()=>{
 const s=linked();const body=s.players[0].battle.find(x=>x.psychicLinks);give(s,0,'deck',['dm28-073',STEIN,BASIC,BASIC]);const wanted=s.players[0].deck[0];attack(s,body.uid);pick(s,wanted.uid);drain(s);assert.ok(has(s,0,'battle',wanted));assert.equal(s.players[0].deck.length,3);assert.equal(s.players[1].shields.length,3);
});
test('the attack deployment can be declined and never deploys a noncreature',()=>{
 const s=linked();const body=s.players[0].battle.find(x=>x.psychicLinks);give(s,0,'deck',[STEIN,BASIC,BASIC,BASIC]);attack(s,body.uid);drain(s);assert.equal(s.players[0].battle.length,2);assert.equal(s.players[0].deck.length,4);
});
test('the mandatory leave replacement destroys Stein and keeps the linked creature',()=>{
 const s=linked(LOOK);const stein=s.players[0].battle[0],body=s.players[0].battle[1];expireProtection(s);cast(s,DEMON);act(s,'effect',a=>a.targets[0].uid===body.uid);assert.equal(s.decision.type,'leaveReplace');assert.equal(s.decision.mandatory,true);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='allowLeave'));drain(s);assert.ok(has(s,0,'battle',body));assert.ok(has(s,0,'grave',stein));assert.equal(s.players[0].extra.length,0);unique(s);
});
test('without Stein the whole linked creature leaves and all three cards return to the extra zone',()=>{
 const s=linked(LOOK);const stein=s.players[0].battle.shift(),body=s.players[0].battle[0];s.players[0].hand.push(stein);expireProtection(s);cast(s,DEMON);act(s,'effect',a=>a.targets[0].uid===body.uid);drain(s);assert.equal(s.players[0].battle.length,0);assert.equal(s.players[0].extra.length,3);assert.ok(s.players[0].extra.every(x=>!x.psychicCell&&!x.psychicLinks));unique(s);
});
test('QA48138: Rakujou can select a cost-zero cell and Stein replaces that individual cell movement',()=>{
 const s=linked(LOOK);const stein=s.players[0].battle[0],body=s.players[0].battle[1];expireProtection(s);cast(s,RAKUJO);pick(s,body.psychicLinks[0].uid);assert.equal(s.decision.type,'leaveReplace');drain(s);assert.ok(has(s,0,'battle',body));assert.ok(has(s,0,'grave',stein));assert.equal(s.players[0].extra.length,0);unique(s);
});
test('a cell departs without a creature leave trigger and all cells and bases remain conserved',()=>{
 const s=linked(LOOK),stein=s.players[0].battle.shift(),body=s.players[0].battle[0];s.players[0].hand.push(stein);const base=inst(BASIC);body.under=[base];add(s,0,'battle','dmrp05-030');const hand=s.players[0].hand.length,count=unique(s);expireProtection(s);s.active=0;cast(s,RAKUJO);pick(s,body.uid);drain(s);assert.equal(s.players[0].battle.length,1);assert.equal(s.players[0].hand.length,hand+1);assert.equal(s.players[0].extra.length,3);assert.ok(has(s,0,'grave',base));assert.equal(unique(s),count+1);
});
test('an ignored Stein offers neither a duelmate execution nor a link',()=>{
 const s=field();cast(s,STEIN);const stein=s.players[0].battle[0];stein.g35Ignored=s.turn;assert.ok(!e.getLegalActions(s).some(x=>x.kind==='duelist1367'));for(const x of s.players[0].extra.splice(0))add(s,0,'battle',x.cardId);cast(s,'dm01-052');drain(s);assert.ok(!s.players[0].battle.some(x=>x.psychicLinks));
});
test('ignoring a super creature removes its attacks and replacement but preserves its summon-sickness exception',()=>{
 const s=linked(),body=s.players[0].battle[1];body.g35Ignored=s.turn;give(s,0,'deck',Array(4).fill(BASIC));attack(s,body.uid);assert.notEqual(s.decision?.task?.op,'g34_Select');drain(s);assert.equal(s.players[0].deck.length,4);assert.equal(s.players[1].shields.length,4);
});
test('ignored duelmate spells do not tap or attach and return to the extra zone',()=>{
 const s=field();cast(s,STEIN);const genmu=add(s,1,'battle','dmrp15-km1'),enemy=add(s,1,'battle',BASIC);use(s,TAP);assert.equal(enemy.tapped,false);assert.ok(s.players[0].extra.some(x=>x.cardId===TAP));assert.ok(!s.players[0].battle[0].under?.length);assert.equal(e.card(genmu).cost,'∞');
});
test('a duelist that leaves takes both attached spell cards back to the extra zone',()=>{
 const s=field();cast(s,STEIN);const stein=s.players[0].battle[0];use(s,TAP);s.turn++;use(s,LOOK);drain(s);cast(s,TROY);pick(s,stein.uid);if(s.decision)pick(s,null);drain(s);assert.ok(has(s,0,'hand',stein));assert.equal(s.players[0].extra.length,3);assert.ok(s.players[0].extra.every(x=>!x.psychicLinks&&!x.psychicCell));unique(s);
});
test('each saved native link choice selects one of multiple physical pairs without cloning cards',()=>{
 const s=field();s.players[0].extra.push(inst(TAP));cast(s,STEIN);for(const id of [TAP,TAP,LOOK]){use(s,id);drain(s);s.turn++;}use(s,M);assert.equal(s.decision.type,'duelistLink1367');const count=unique(s),clone=JSON.parse(JSON.stringify(s)),action=e.getLegalActions(s)[1];assert.equal(action.kind,'linkDuelmate1367');for(const state of [s,clone]){e.step(state,action);drain(state);assert.equal(state.players[0].battle.filter(x=>x.psychicLinks).length,1);assert.equal(state.players[0].battle[0].under.length,1);assert.equal(unique(state),count);}assert.deepEqual(JSON.parse(JSON.stringify(s)),clone);
});
test('CPU chooses the native duelmate action and human desktop/mobile controls expose every execution',async()=>{
 const {manualScreenHTML,newManualUI}=await import('../dist/manual-ui.js');const s=field();const stein=add(s,0,'hand',STEIN);const h0={art:id=>`<span>${id}</span>`,icon:()=>''};assert.match(manualScreenHTML(s,{...newManualUI(),hand:stein.uid},h0),/デュエリストを使う/);act(s,'play',a=>a.uid===stein.uid);assert.equal(e.chooseAI(s).kind,'duelist1367');const h={art:id=>`<span>${id}</span>`,icon:()=>''};for(const mobile of [false,true]){const html=manualScreenHTML(s,{...newManualUI(),mobile},h);if(!mobile)for(const a of e.getLegalActions(s).filter(a=>a.kind==='duelist1367'))assert.ok(html.includes(`data-index="${a.id}"`));assert.match(html,/デュエリスト/);}
});
test('Radon blocks the unpaid Magao execution while leaving both spell executions available',()=>{
 const s=field();cast(s,STEIN);add(s,1,'battle','dmrp08-s10');assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='duelist1367').map(a=>a.cardId),[TAP,LOOK]);
});
test('Gaiging’s actual element deployment accepts Stein without counting a creature entry',()=>{
 const s=field();give(s,0,'deck',[STEIN,BASIC,BASIC]);cast(s,'dm26rp2-S005');pick(s,true);pick(s,true);drain(s);assert.ok(s.players[0].battle.some(x=>x.cardId===STEIN));assert.equal(s.creaturesEntered,1);
});
test('duelmate starting zones preserve the existing 40-card deck and eight-card extra limits',async()=>{
 const {extraDeckErrors}=await import('../dist/deck-format.js');const deck={format:'advance',cards:[{id:STEIN,count:4},...['dm01-075','dm01-089','dm01-083','dm01-052','dm01-108','dm01-027','dm01-086','dm01-090','dm01-097'].map(id=>({id,count:4}))],extraCards:[M,TAP,LOOK].map(id=>({id,count:1}))};assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(extraDeckErrors(deck,e.card),[]);assert.ok(extraDeckErrors({...deck,format:'original'},e.card).length);assert.ok(extraDeckErrors({...deck,extraCards:[{id:M,count:5},{id:TAP,count:4}]},e.card).length);const s=e.createGame([deck,{...deck}],{seed:1367});assert.equal(e.physicalCards(s).length,86);assert.equal(s.players[0].extra.length,3);
});
