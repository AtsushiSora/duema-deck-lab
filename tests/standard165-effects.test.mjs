import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const diagnostic=text=>{if(process.env.CARD_SUPPORT_DIAGNOSTICS)fs.writeSync(2,text+'\n');};
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,PRESETS,GEN} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {STANDARD165_DECKS} from '../tools/fixtures/standard165.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-165.json',import.meta.url))),registry=createCatalogue(snapshot,data.cards,details);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort(),N='dm01-108';
const id=name=>{const c=manifest.cards.find(c=>c.name===name);assert.ok(c,name);return c.id;};
function pick(s,value){const a=e.getLegalActions(s).find(a=>a.kind==='extended'&&s.decision.choices[a.choice].value===value);assert.ok(a,JSON.stringify(s.decision));e.step(s,a);}
test('all 243 reviewed names have exact official faces, real art, limits and legal forty-card coverage',()=>{
 assert.equal(manifest.cards.length,243);assert.ok(data.cards.length>=2218);
 for(const row of manifest.cards){assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(c=>c.id===row.id)));assert.equal(e.card(row.id).supportBatch,'phase-165');assert.ok(registry.get(row.id).supported);assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);}
 const covered=new Set(STANDARD165_DECKS.flatMap(d=>d.cards.map(c=>c.id)));for(const row of manifest.cards)assert.ok(covered.has(row.id));
 for(const deck of STANDARD165_DECKS){assert.deepEqual(e.validateDeck(deck),[]);assert.equal(registry.coverage(deck).unsupported,0);assert.equal(deck.cards.reduce((n,c)=>n+c.count,0),40);}
});
for(const row of manifest.cards)test('execution and conservation: '+row.name,()=>{
 diagnostic('Execute '+row.name);let s=setup();give(s,0,'deck',Array(15).fill(N));give(s,0,'grave',[N]);give(s,1,'battle',[N]);
 const c=e.card(row.id);if(c.evolution){const b=data.cards.find(x=>x.type==='creature'&&!x.evolution&&(c.evolution.race?x.race.includes(c.evolution.race):(x.civilizations||x.civ.split('/')).includes(c.evolution.civilization)));assert.ok(b,row.name);give(s,0,'battle',[b.id]);}
 const x=inst(row.id);s.players[0].hand.push(x);const before=physical(s),action=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid);assert.ok(action,row.name);e.step(s,action);
 s=JSON.parse(JSON.stringify(s));drain(s);assert.equal(s.winner,null);assert.equal(s.decision,null);assert.deepEqual(physical(s),before);assert.ok(s.players[0][c.type==='spell'?(c.normalCharger?'mana':'grave'):'battle'].some(y=>y.uid===x.uid));
});
test('classifier rejects unknown trailing clauses, alternate names and unsupported conditional variants',()=>{
 const base=structuredClone(details.cards.find(c=>c.id===id('アオジシ・スパイダー')));
 for(const text of['このクリーチャーが出た時、相手に1ダメージ。','ブロッカー\n相手の呪文を無視する。','このクリーチャーが出た時、自分の山札の上から1枚目をマナゾーンに置く。そうしたらカードを1枚引く。','このクリーチャーが破壊される時、墓地に置くかわりに自分のマナゾーンに置いてもよい。','自分のターンの終わりに、このクリーチャーをアンタップする。']){const d=structuredClone(base);d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d));}
 for(const name of['青銅の鎧(ブロンズ・アーム・トライブ)','炎のたてがみ(バーニング・ヘアー)','ワ・タンポ－ポ・タンク'])assert.throws(()=>standardCardSpec({...base,name}),/別表記/);
 const d=structuredClone(base);d.faces[0].abilityText='このクリーチャーが出た時、カードを1枚引く。\nこのクリーチャーが出た時、カードを1枚引く。';assert.throws(()=>standardCardSpec(d),/順序/);
});
test('draw-up-to reveals one draw before offering the next and can stop after any individual card',()=>{
 for(const stop of[0,1,2]){let s=setup();give(s,0,'deck',[N,N,N,N]);const n=s.players[0].deck.length;cast(s,id('イカスゼ・クロウラー'));assert.equal(s.decision.task.op,'g34_DrawUpTo');for(let i=0;i<stop;i++){pick(s,true);assert.equal(s.players[0].deck.length,n-i-1);s=JSON.parse(JSON.stringify(s));}if(stop<2)pick(s,null);drain(s);assert.equal(s.players[0].deck.length,n-stop);assert.equal(s.decision,null);}
});
test('optional exact-three draw offers zero or all three, never one or two',()=>{
 for(const yes of[false,true]){const s=setup();const n=s.players[0].deck.length;cast(s,id('滑奏！Eine&氷駆'));assert.equal(s.decision.task.op,'g34_Offer');assert.deepEqual(s.decision.choices.map(x=>x.value),[true,null]);pick(s,yes?true:null);drain(s);assert.equal(s.players[0].deck.length,n-(yes?3:0));}
});
test('draw-up-to may decline the last draw, while drawing it applies normal library-loss rules',()=>{
 for(const yes of[false,true]){const s=setup();give(s,0,'deck',[N]);cast(s,id('イカスゼ・クロウラー'));pick(s,yes?true:null);assert.equal(s.winner,yes?1:null);}
});
test('two end-of-turn untap abilities can be accepted and declined separately',()=>{
 const s=setup();const a=id('居合のアラゴナイト'),b=id('俊速の使徒ナイアル');give(s,0,'battle',[a,b]);for(const x of s.players[0].battle)x.tapped=true;s.phase='attack';act(s,'endTurn');const chosen=[];
 for(let i=0;s.active===0&&i<20;i++){const actions=e.getLegalActions(s);if(s.decision?.type==='untap'){const uid=s.decision.uids[0];chosen.push(uid);act(s,'endUntap',a=>a.yes===(chosen.length===1));}else e.step(s,actions[0]);}
 assert.equal(chosen.length,2);assert.equal(new Set(chosen).size,2);assert.equal(s.players[0].battle.find(x=>x.uid===chosen[0]).tapped,false);assert.equal(s.players[0].battle.find(x=>x.uid===chosen[1]).tapped,true);
});
test('mana ramp respects Nin-g yo replacement during the protected player turn',()=>{
 const ningyo=data.cards.find(c=>c.ningyo);assert.ok(ningyo);const s=setup();give(s,1,'battle',[ningyo.id]);give(s,0,'deck',[N,N,N]);const n=s.players[0].mana.length,uid=s.players[0].deck[0].uid;cast(s,id('メイプル超もみ人'));drain(s);assert.equal(s.players[0].mana.length,n);assert.ok(s.players[0].grave.some(x=>x.uid===uid));
});
test('new mana-summon creatures offer play from mana, and use their actual card',()=>{
 const s=setup(),c=id('かぐやば姫');s.players[0].mana.push(inst(c));const uid=s.players[0].mana.at(-1).uid,before=physical(s);act(s,'play',a=>a.uid===uid&&a.origin==='mana');drain(s);assert.ok(s.players[0].battle.some(x=>x.uid===uid));assert.deepEqual(physical(s),before);
});
test('new target spell excludes Just Diver, observes actual power, and draws after removal',()=>{
 const c=id('プラスワン・ハンド'),diver=id('レ・オ・ゼーレ'),s=setup();give(s,1,'battle',[diver,N]);s.players[1].battle[0].justDiverActive=true;const target=s.players[1].battle[1].uid,n=s.players[0].deck.length;cast(s,c);assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[target]);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===target));assert.equal(s.players[0].deck.length,n-1);
});
test('entry abilities are ignored by Genmu but their summoned physical creatures remain',()=>{
 for(const name of['アオジシ・スパイダー','電脳 ハルカス-１','白骨の守護者ホネンビー GS']){const s=setup();give(s,1,'battle',[GEN]);const n=s.players[0].deck.length;cast(s,id(name));drain(s);assert.equal(s.players[0].deck.length,n);assert.equal(s.players[0].battle.length,1);}
});
test('CPU runs every new forty-card fixture without illegal actions, deadlocks or lost cards',()=>{
 for(const [i,deck] of STANDARD165_DECKS.entries()){diagnostic('CPU '+deck.name);let s=e.createGame([deck,PRESETS[i%PRESETS.length]],{seed:16500+i,first:i%2});const before=physical(s);while(s.winner===null){assert.ok(s.actions<1400&&s.turn<160,deck.name+' action/turn limit '+s.actions+'/'+s.turn);const action=e.chooseAI(s);assert.ok(action,deck.name);e.step(s,action);assert.deepEqual(physical(s),before,deck.name);if(s.actions===20){const copy=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(copy),e.getLegalActions(s));s=copy;}}assert.ok([0,1].includes(s.winner));assert.equal(before.length,80);}
});
