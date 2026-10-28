import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,PRESETS} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-53.json',import.meta.url))),registry=createCatalogue(snapshot,data.cards,details);
const D='dmr03-009',S='dm26rp2-014',M='dm01-022',E='dmrp17-073',X='dmrp05-011',DNA='dmr02-006',P='dmr08-055',O='dm38-016',I='dmc44-001',J='dmbd01-008',C='dmrp01-012',H='dm14-034',N='dm01-108';
const pick=(s,value)=>{const a=e.getLegalActions(s).find(a=>a.kind==='extended'&&JSON.stringify(s.decision.choices[a.choice].value)===JSON.stringify(value));assert.ok(a,JSON.stringify(s.decision));e.step(s,a);};
const play=(s,id,face=0)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id&&(a.face||0)===face);};
const queued=(s,p,id,origin='hand')=>{const x=inst(id);s.players[p][origin].push(x);s.extTasks=[{op:'putCreature',p,source:id,origin,uid:x.uid}];act(s,'toAttack');return x;};
const end=s=>{drain(s);s.phase='attack';act(s,'endTurn');drain(s);};
test('twelve live-verified recommended definitions have complete effects, canonical identities and four-copy limits',()=>{
 assert.equal(manifest.cards.length,12);assert.equal(data.cards.length,1685);assert.equal(data.supportExpansion.phase,119);
 for(const r of manifest.cards){const c=e.card(r.id);assert.equal(c.name,r.name);assert.deepEqual(details.cards.find(x=>x.id===r.id).faces,r.faces);for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v);assert.equal(c.limit,4);assert.equal(registry.get(r.id).supported,true);}
});
test('Dondon shows five, publicly takes a fire card, orders all misses then allows own creature bounce',()=>{
 const s=setup();give(s,0,'deck',['dm01-097',N,N,N,N,N,N]);give(s,0,'battle',[N]);const ids=s.players[0].deck.map(x=>x.uid),creature=s.players[0].battle[0];play(s,D);assert.equal(s.decision.choices.length,5);pick(s,ids[0]);assert.equal(s.decision.task.op,'g36Order');drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===ids[0]));assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId==='dm01-097'));assert.deepEqual(s.players[0].g36Protected,[]);
 const t=setup();give(t,0,'deck',['dm01-097',N,N,N,N,N]);give(t,0,'battle',[N]);const own=t.players[0].battle[0];play(t,D);pick(t,t.players[0].deck[0].uid);while(t.decision?.task.op==='g36Order')pick(t,t.decision.choices[0].value);assert.ok(t.decision.choices.some(x=>x.value===own.uid));pick(t,own.uid);assert.ok(t.players[0].hand.some(x=>x.uid===own.uid));
});
test('a non-fire/nature reveal creates no Dondon bounce; Surasura requires 6000 power and targets enemies only',()=>{
 const s=setup();give(s,0,'deck',['dm01-083',N,N,N,N,N]);give(s,1,'battle',[N]);play(s,D);pick(s,s.players[0].deck[0].uid);while(s.decision?.task.op==='g36Order')pick(s,s.decision.choices[0].value);assert.equal(s.decision,null);assert.equal(s.players[1].battle.length,1);
 const t=setup();give(t,0,'deck',['dmc27-004',N,N,N,N,N]);give(t,0,'battle',[N]);give(t,1,'battle',[N]);play(t,S);assert.equal(t.decision.choices.length,4);pick(t,t.players[0].deck[0].uid);while(t.decision?.task.op==='g36Order')pick(t,t.decision.choices[0].value);assert.ok(!t.decision.choices.some(x=>x.value===t.players[0].battle[0].uid));pick(t,t.players[1].battle[0].uid);assert.equal(t.players[1].battle.length,0);
});
test('Crystal Memory searches privately and shuffles without losing or duplicating a physical card',()=>{
 const s=setup();give(s,0,'deck',[N,N,'dmc27-004',N,N,N]);const target=s.players[0].deck[2],before=e.physicalCards(s).length;play(s,M);assert.equal(s.decision.choices.length,6);pick(s,target.uid);assert.ok(s.players[0].hand.some(x=>x.uid===target.uid));assert.ok(!s.log.some(x=>x.text.includes('サファイア')));assert.equal(e.physicalCards(s).length,before+1);assert.equal(s.players[0].deck.length,5);assert.deepEqual(s.players[0].g36Protected,[]);
});
test('Q.Q.QX blocks both kinds of library look but still allows Pixie top-card ramp',()=>{
 const qq=data.cards.find(c=>c.qqLock);assert.ok(qq);
 for(const id of [D,S,M]){const s=setup();give(s,1,'battle',[qq.id]);const before=s.players[0].deck.map(x=>x.uid);play(s,id);assert.equal(s.decision,null);assert.deepEqual(s.players[0].deck.map(x=>x.uid),before);assert.ok(s.log.some(x=>x.type==='libraryLocked'));}
 const s=setup();give(s,1,'battle',[qq.id]);const top=s.players[0].deck[0];play(s,P);pick(s,null);assert.ok(s.players[0].mana.some(x=>x.uid===top.uid));
});
test('Pixie ramps the actual top and can recover an existing or newly ramped colorless card',()=>{
 const s=setup();give(s,0,'deck',[C,N,N]);const top=s.players[0].deck[0],before=s.players[0].mana.length;play(s,P);assert.equal(s.players[0].mana.length,before+1);assert.ok(s.decision.choices.some(x=>x.value===top.uid));assert.ok(!s.decision.choices.some(x=>x.value===s.players[0].mana[0].uid));pick(s,top.uid);assert.ok(s.players[0].hand.some(x=>x.uid===top.uid));assert.equal(s.players[0].mana.length,before);
});
test('Purify selects a subset of the opposing grave, with no mandatory shuffle on declining',()=>{
 const s=setup();give(s,1,'grave',[C,N,E]);const [a,b,c]=s.players[1].grave,deck=s.players[1].deck.map(x=>x.uid);play(s,O);pick(s,a.uid);pick(s,c.uid);pick(s,null);assert.deepEqual(s.players[1].grave.map(x=>x.uid),[b.uid]);assert.ok(s.players[1].deck.some(x=>x.uid===a.uid));assert.equal(s.players[1].deck.length,deck.length+2);
 const t=setup();give(t,1,'grave',[C]);const rng=t.rng,ids=t.players[1].deck.map(x=>x.uid);play(t,O);pick(t,null);assert.equal(t.rng,rng);assert.deepEqual(t.players[1].deck.map(x=>x.uid),ids);assert.equal(t.players[1].grave.length,1);
});
test('DNA Spark taps enemies and adds an optional shield only at two or fewer',()=>{
 for(const n of [2,3]){const s=setup();give(s,0,'shields',Array(n).fill(N));give(s,0,'battle',[N]);give(s,1,'battle',[N,N]);play(s,DNA);assert.ok(s.players[1].battle.every(x=>x.tapped));assert.equal(s.players[0].battle[0].tapped,false);if(n===2){assert.equal(s.decision.task.op,'g36DNA');pick(s,true);assert.equal(s.players[0].shields.length,3);}else assert.equal(s.decision,null);}
});
test('Energy Re Light draws exactly two, while its shield face retains G Strike',()=>{
 const s=setup(),before=s.players[0].deck.length;play(s,E);assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].deck.length,before-2);assert.equal(e.card(E).gStrike,true);
});
test('Mixel uses printed cost at entry even when the entry ability increases mana before it resolves (QA38717)',()=>{
 const s=setup();give(s,0,'mana',[N,N]);give(s,1,'battle',[X]);give(s,0,'deck',['dmc27-004','dmc27-004',N,N,N]);const entered=queued(s,0,'dmbd16-011');drain(s);assert.equal(s.players[0].mana.length,4);assert.ok(!s.players[0].battle.some(x=>x.uid===entered.uid));assert.equal(s.players[0].deck.at(-1).uid,entered.uid);
 const t=setup();give(t,0,'mana',[N,N,N]);give(t,1,'battle',[X]);const small=queued(t,0,N);drain(t);assert.ok(t.players[0].battle.some(x=>x.uid===small.uid));
});
test('Jamming Chaff draws one and locks spells through an enemy extra turn, until the next own start',()=>{
 const s=setup();play(s,X,1);assert.equal(s.players[0].hand.length,1);end(s);assert.equal(e.canCastSpell(s,1,e.card(E)),false);s.extraTurns=[{player:1}];end(s);assert.equal(s.active,1);assert.equal(e.canCastSpell(s,1,e.card(E)),false);end(s);assert.equal(s.active,0);assert.equal(e.canCastSpell(s,1,e.card(E)),true);
});
test('Senno forbids non-summon entry on its opponents turn, allows summons and off-turn entry, and loses the ability under Genmu',()=>{
 const s=setup();give(s,1,'battle',[C]);assert.equal(e.canEnterCreature(s,0,e.card(N),{execution:false}),false);assert.equal(e.canEnterCreature(s,0,e.card(N),{origin:'grave',execution:true}),true);s.active=1;assert.equal(e.canEnterCreature(s,0,e.card(N),{execution:false}),true);s.active=0;s.players[0].battle.push(inst('dmrp15-km1'));assert.equal(e.canEnterCreature(s,0,e.card(N),{execution:false}),true);
});
test('Inferno Sign revives a non-evolution creature up to seven, and respects Senno',()=>{
 const s=setup();give(s,0,'grave',[C,'dmc27-004',data.cards.find(c=>c.evolution&&c.cost<=7).id]);const x=s.players[0].grave[0];play(s,I);assert.equal(s.decision.choices.length,1);pick(s,{uid:x.uid,origin:'grave',p:0});drain(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));
 const t=setup();give(t,1,'battle',[C]);give(t,0,'grave',[N]);play(t,I);assert.equal(t.players[0].battle.length,0);assert.equal(t.players[0].grave.length,2);
});
test('Jack removes an evolution base as a card and leaves the top in play (QA31579)',()=>{
 const s=setup();give(s,1,'battle',['dmc27-004']);const top=s.players[1].battle[0],base=inst(C);top.under=[base];play(s,J);assert.ok(s.decision.choices.some(x=>x.value===base.uid));assert.ok(!s.decision.choices.some(x=>x.value===top.uid));pick(s,base.uid);assert.equal(s.players[1].battle[0].uid,top.uid);assert.ok(s.players[1].grave.some(x=>x.uid===base.uid));assert.equal(s.players[1].battle[0].under?.length||0,0);
});
test('Hell Scrapper selects up to 5000 total and destroys the chosen group simultaneously',()=>{
 const s=setup();give(s,1,'battle',[C,'dm01-100','dmc27-004']);const [a,b,big]=s.players[1].battle;assert.equal(e.power(a,false,s),4000);assert.equal(e.power(b,false,s),1000);play(s,H);assert.ok(!s.decision.choices.some(x=>x.value===big.uid));pick(s,a.uid);pick(s,b.uid);assert.equal(s.players[1].battle.length,1);assert.equal(s.players[1].battle[0].uid,big.uid);assert.ok(s.players[1].grave.some(x=>x.uid===a.uid));assert.ok(s.players[1].grave.some(x=>x.uid===b.uid));
});
test('new choices survive JSON restore and neither analyze nor choose changes the live state',()=>{
 const s=setup();give(s,0,'deck',[N,C,E,D,S,N]);play(s,D);const restored=JSON.parse(JSON.stringify(s)),before=structuredClone(s);assert.deepEqual(e.getLegalActions(restored),e.getLegalActions(s));assert.deepEqual(e.analyzeAI(restored),e.analyzeAI(s));assert.deepEqual(s,before);
});
test('three utility lists finish legal games and preserve eighty physical identities across every action',()=>{
 const rows=ids=>ids.map(id=>({id,count:4})),lists=[{name:'水自然の選択',cards:rows([D,S,M,E,P,O,N,'dm01-106','dm01-083','dm01-086'])},{name:'白黒赤の防御',cards:rows([X,DNA,I,J,H,'dm01-075','dm01-090','dm01-097','dm01-108','dm01-089'])},{name:'ジョーカーズの妨害',cards:rows([C,P,E,D,S,'dmsd01-012','promoy19-014','dm24bd2-001','dm24bd2-010','dmex12-s03'])}];
 for(const [i,d]of lists.entries())for(const first of [0,1]){assert.deepEqual(e.validateDeck(d),[]);const s=e.createGame([d,PRESETS[i]],{seed:53001+i*101+first,first});while(s.winner===null&&s.actions<1500&&s.turn<100){const a=e.chooseAI(s);assert.ok(a);e.step(s,a);const all=e.physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(x=>x.uid)).size,80);}assert.notEqual(s.winner,null,d.name);}
});
