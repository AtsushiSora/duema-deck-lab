import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD184_DECKS} from '../tools/fixtures/standard184.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-184.json',import.meta.url))),N='dm01-108',F='dm01-097',L='dm01-075',BLOCK='dm01-076',BIG='dmx22b-012',PIP='dm23rp2-068',BOL='dm24ex2-058',DAI='dmx22a-037',CHO='dmd13-004',DOK='dmrp15-094',KURI='dmx11-059',COLOR='dmex01-018',LIFE='dmrp20-047',IKIL='dm23rp4-074',GIO='dmr03-047',TOP='dm25rp3-075',RYO='dm15-005',IKAR='dmrp19-047',DE='dm01-027';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){s.players[s.active].hand.push(inst(id));const uid=s.players[s.active].hand.at(-1).uid;act(s,'play',a=>a.uid===uid&&!a.alternative);if(s.decision?.type==='evolution')act(s,'evolve',a=>e.card(id).neoEvolution?!a.baseUid:!!a.baseUid);return uid;}
function kill(s,p,uid){s.active=1-p;s.phase='main';play(s,DE);act(s,'effect',a=>a.targets.some(x=>x.uid===uid));}
const modes=m.cards.filter(c=>c.spec.g34Tasks?.[0]?.g184Modes);
test('twenty-five complete verified cards and images are present in three supported forty-card decks',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,25);for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:184}));assert.equal(e.card(row.id).supportBatch,'phase-184');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD184_DECKS.some(d=>d.cards.some(x=>x.id===row.id)));}for(const d of STANDARD184_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test(row.name+': complete execution preserves physical cards and all mode branches finish',()=>{
 const count=row.spec.g34Tasks?.[0]?.modes?.length||1;for(let mode=0;mode<count;mode++){let s=setup();give(s,0,'hand',[N,F,L]);give(s,0,'grave',[N,F,DE]);give(s,0,'deck',Array(30).fill(N));give(s,1,'battle',[N,BLOCK,BIG]);if(row.spec.evolution)give(s,0,'battle',['dm14-105']);const uid=play(s,row.id);const ids=physical(s);if(row.spec.g34Tasks?.[0]?.g184Modes){assert.equal(s.decision.task.op,'g34_Choose');s=JSON.parse(JSON.stringify(s));pick(s,mode);}drain(s);if(row.spec.g34Attack){const x=s.players[0].battle.find(x=>x.uid===uid);x.entered=0;s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target==='player');drain(s);}if(row.spec.g172Death){const x=s.players[0].battle.find(x=>x.uid===uid);kill(s,0,x.uid);drain(s);const after=physical(s);assert.equal(after.length,ids.length+1);}else assert.deepEqual(physical(s),ids);assert.equal(s.decision,null);assert.equal(s.winner,null);}
});
test('whole-text parser rejects incomplete modes, choose-two, conditional branches and unsupported lines; old batches remain pinned',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:183}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:184}));}
 const d=structuredClone(details.cards.find(x=>x.id===PIP));for(const text of['このクリーチャーが出た時、次のうち２つを選ぶ。\n▶カードを１枚引く。\n▶カードを２枚引く。','このクリーチャーが出た時、次のうちいずれか１つを選ぶ。\n▶カードを１枚引く。','このクリーチャーが出た時、次のうちいずれか１つを選ぶ。自分のクリーチャーがあれば両方を選んでもよい。\n▶カードを１枚引く。\n▶カードを２枚引く。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:184}));}
 for(let phase=168;phase<=183;phase++)for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase}),row.spec);
});
test('Pippi resolves only the chosen branch and a branch without a target remains a legal choice',()=>{
 for(const mode of[0,1]){const s=setup();give(s,1,'battle',[BLOCK]);const uid=s.players[1].battle[0].uid;play(s,PIP);assert.equal(s.players[0].hand.length,0);assert.ok(s.players[1].battle.some(x=>x.uid===uid));pick(s,mode);if(mode===0)pick(s,uid);drain(s);assert.equal(s.players[0].hand.length,mode===1?1:0);assert.equal(s.players[1].grave.some(x=>x.uid===uid),mode===0);}
 const t=setup();play(t,PIP);pick(t,0);assert.equal(t.decision,null);assert.equal(t.players[0].hand.length,0);
});
test('Bolshack sweep checks current power, bypasses target protection, and the mana branch instead selects one legal creature',()=>{
 const s=setup();give(s,1,'battle',[N,BLOCK,BIG]);s.players[1].battle[0].powerModifiers=[{amount:2000}];const protectedSmall=s.players[1].battle[1],big=s.players[1].battle[2].uid;protectedSmall.justDiverActive=true;protectedSmall.entered=s.turn;play(s,BOL);pick(s,0);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===protectedSmall.uid));assert.ok(s.players[1].battle.some(x=>x.uid===big));assert.equal(s.players[1].battle.length,2);
 const t=setup();give(t,1,'battle',[N,BIG]);const uid=t.players[1].battle[1].uid;play(t,BOL);pick(t,1);pick(t,uid);drain(t);assert.ok(t.players[1].mana.some(x=>x.uid===uid));assert.equal(t.players[1].grave.length,0);assert.equal(t.players[1].battle.length,1);
});
test('CPU chooses an available removal over an empty branch, area removal for many small creatures, and mana removal for a lone giant',()=>{
 for(const [id,enemy,expected]of[[PIP,[],1],[PIP,[BLOCK],0],[BOL,[N,N,N,N],0],[BOL,[BIG],1],[IKAR,[N],1],[IKAR,[BIG],0]]){const s=setup();give(s,1,'battle',enemy);play(s,id);const a=e.chooseAI(s);assert.equal(s.decision.choices[a.choice].value,expected,id);}
});
test('CPU chooses early ramp with little mana, draw with enough mana, and avoids lethal draw/ramp when removal can do nothing',()=>{
 for(const n of[3,8]){const s=setup();give(s,0,'mana',['dm01-083',...Array(n-1).fill(N)]);play(s,DAI);const a=e.chooseAI(s);assert.equal(s.decision.choices[a.choice].value,n===3?1:0);}
 const s=setup();give(s,0,'deck',[N,F]);play(s,CHO);assert.equal(s.decision.choices[e.chooseAI(s).choice].value,1);pick(s,1);assert.equal(s.winner,null);assert.equal(s.players[0].deck.length,2);
 const t=setup();give(t,0,'deck',[N,F]);give(t,0,'battle',['dmrp03-s03']);play(t,CHO);assert.equal(t.decision.choices[e.chooseAI(t).choice].value,0);pick(t,0);assert.equal(t.winner,0);
});
test('modal choices keep their original controller when used as an opposing shield trigger',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'shields',[BOL]);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');assert.equal(s.decision.player,1);pick(s,0);drain(s);assert.equal(s.players[0].battle.length,0);assert.ok(s.players[1].battle.some(x=>x.cardId===BOL));
});
test('Kurikuri distinguishes creature grave cards, creature mana recovery and blocked grave movement',()=>{
 for(const mode of[0,1]){const s=setup();give(s,0,'grave',[N,DE]);play(s,KURI);pick(s,mode);assert.ok(s.decision.choices.filter(x=>x.cardId).every(x=>e.card(x.cardId).type==='creature'));if(mode===0){const uid=s.players[0].grave.find(x=>x.cardId===N).uid;pick(s,uid);assert.ok(s.players[0].mana.some(x=>x.uid===uid&&x.tapped));}else{const uid=s.players[0].mana[0].uid;pick(s,uid);assert.ok(s.players[0].hand.some(x=>x.uid===uid));}}
 const t=setup();give(t,0,'grave',[N]);give(t,1,'battle',['dmrp22-042']);play(t,KURI);pick(t,0);assert.equal(t.decision,null);assert.equal(t.players[0].grave.length,1);
});
test('Colorful ramps all four cards tapped before any mana selection, then moves four distinct cards together',()=>{
 let s=setup();const top=s.players[0].deck.slice(0,4).map(x=>x.uid);play(s,COLOR);assert.equal(s.players[0].mana.length,54);assert.equal(s.players[0].deck.length,26);assert.ok(top.every(uid=>s.players[0].mana.some(x=>x.uid===uid&&x.tapped)));const ids=physical(s);for(let i=0;i<4;i++){pick(s,top[i]);if(i===0){assert.equal(s.players[0].mana.length,54);assert.ok(!s.decision.choices.some(x=>x.value?.uid===top[0]));s=JSON.parse(JSON.stringify(s));}}drain(s);assert.equal(s.players[0].mana.length,50);assert.ok(top.every(uid=>s.players[0].grave.some(x=>x.uid===uid)));assert.deepEqual(physical(s),ids);
});
test('Dandy Life and Desuikiru select either old mana or just-ramped mana and charger finishes after the loss',()=>{
 for(const id of[LIFE,IKIL]){const s=setup(),top=s.players[0].deck.slice(0,2).map(x=>x.uid);const uid=play(s,id),n=id===IKIL?2:1,ids=physical(s);for(const target of top.slice(0,n))pick(s,target);drain(s);assert.ok(top.slice(0,n).every(uid=>s.players[0].grave.some(x=>x.uid===uid)));assert.equal(s.players[0].mana.length,id===IKIL?51:51);assert.equal(s.players[0].mana.some(x=>x.uid===uid),id===IKIL);assert.deepEqual(physical(s),ids);}
});
test('mana loss hides facedown card identities and CPU preserves expensive mana',()=>{
 const s=setup();const x=s.players[0].mana[0];x.faceDown=true;play(s,GIO);const c=s.decision.choices.find(c=>c.value?.uid===x.uid);assert.equal(c.label,'裏向きのカード');assert.equal(c.cardId,undefined);pick(s,x.uid);pick(s,null);drain(s);assert.ok(s.players[0].grave.some(y=>y.uid===x.uid&&!y.faceDown));
 const t=setup();t.players[0].mana.push(inst(BIG));play(t,COLOR);const a=e.chooseAI(t);assert.notEqual(t.decision.choices[a.choice].cardId,BIG);drain(t);assert.equal(t.decision,null);assert.ok(t.players[0].mana.some(x=>x.cardId===BIG));
});
for(const row of m.cards.filter(c=>c.spec.g34Tasks?.[0]?.op==='Discard'))test(row.name+': self discards happen before drawing and an empty hand still draws',()=>{
 for(const full of[false,true]){const s=setup();give(s,0,'hand',full?[N,F]:[]);const n=row.spec.g34Tasks[0].n,draw=row.spec.g34Tasks[1].n;play(s,row.id);if(full){assert.equal(s.players[0].deck.length,30);const uids=s.players[0].hand.slice(0,n).map(x=>x.uid);for(const uid of uids)pick(s,uid);}drain(s);assert.equal(s.players[0].hand.length,(full?2-n:0)+draw);assert.equal(s.players[0].grave.length,(full?n:0)+(e.card(row.id).type==='spell'?1:0));}
});
test('Dokubari lets the human choose random enemy discard or a self-discard followed by two draws, never both',()=>{
 const s=setup();give(s,1,'hand',[N,F]);play(s,DOK);pick(s,0);assert.equal(s.players[1].hand.length,1);assert.equal(s.players[0].deck.length,30);
 const t=setup();give(t,0,'hand',[F]);give(t,1,'hand',[N]);const uid=t.players[0].hand[0].uid;play(t,DOK);pick(t,1);assert.equal(t.players[0].deck.length,30);pick(t,uid);drain(t);assert.equal(t.players[0].hand.length,2);assert.equal(t.players[1].hand.length,1);
});
test('death mana loss stays with the owner and does not appear after a bounce',()=>{
 for(const owner of[0,1]){const s=setup();give(s,owner,'battle',[TOP]);const uid=s.players[owner].battle[0].uid;kill(s,owner,uid);assert.equal(s.decision.player,owner);const mana=s.players[owner].mana[0].uid;pick(s,mana);drain(s);assert.ok(s.players[owner].grave.some(x=>x.uid===mana));assert.equal(s.players[owner].mana.length,49);}
});
test('Genmu ignores appropriate new entries and GG does not suppress a death mana effect',()=>{
 for(const id of[PIP,DAI,GIO]){const s=setup();give(s,1,'battle',[GEN]);play(s,id);assert.equal(s.decision,null);assert.equal(s.players[0].mana.length,50);assert.equal(s.players[0].hand.length,0);}
 const t=setup();give(t,1,'battle',[GG]);t.players[1].battle[0].under=[inst(N)];give(t,0,'battle',[TOP]);kill(t,0,t.players[0].battle[0].uid);assert.equal(t.decision.task.op,'g34_Select');drain(t);assert.equal(t.players[0].mana.length,49);
});
test('three CPU games finish with eighty physical cards and saved continuation',()=>{
 for(let i=0;i<3;i++){let s=e.createGame([STANDARD184_DECKS[i],PRESETS[i]],{seed:18401+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
