import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {makeAccountSnapshot} from '../dist/account-data.js';
import {readEditorDraft,writeEditorDraft} from '../dist/editor-draft.js';
import {deckContentSnapshot,deckCardChanges} from '../dist/deck-history.js';
import {resolveLastMatch,lastMatchSetup} from '../dist/recent-match.js';
import {act,attack,cast,data,details,drain,e,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const WAVE='dmsd11-005',DOG='dmex08-251',NECK='dmsd11-014',JAY='dmrp11-039',DOKINDAM='dmr19-fl01';
const REBIRTH='dmd27-017',FAIRY='dm06-110';
const base={...structuredClone(PRESETS[0]),format:'advance'};
const stock=[{id:DOG,count:8},{id:NECK,count:2},{id:JAY,count:2}];
const deck={...base,grCards:stock,startCards:[{id:DOKINDAM,count:1}]};
const registry=createCatalogue(snapshot,data.cards,details);
const read={getItem:()=>read.value,setItem:(_key,value)=>{read.value=value;}};
const option=(s,uid)=>act(s,'extended',a=>s.decision.choices[a.choice]?.value===uid);

test('旧デッキを保持し、超GR・開始時カードをデッキと履歴に往復できる',()=>{
 assert.deepEqual(e.validateDeck(base),[]);
 assert.deepEqual(registry.validate(deck),[]);
 assert.deepEqual(e.validateDeck(deck),[]);
 assert.match(e.validateDeck({...deck,grCards:[{id:DOG,count:11}]}).join(),/12枚必要/);
 assert.match(e.validateDeck({...deck,grCards:[{id:DOG,count:9},{id:JAY,count:3}]}).join(),/2枚まで/);
 assert.match(e.validateDeck({...deck,format:'original'}).join(),/オリジナルでは超GR/);
 assert.ok(e.validateDeck({...deck,cards:[...deck.cards,{id:DOG,count:1}]}).some(x=>x.includes('超GR')));
 assert.equal(registry.get('dmex08-106').id,DOKINDAM);
 assert.equal(registry.get('dmbd11-a14').id,JAY);
 const saved={decks:[base],friends:[{...deck,id:'advance-friend'}],selected:base.id};
 const backup=makeAccountSnapshot(saved,registry);
 assert.ok(!Object.hasOwn(backup.decks[0],'grCards'));
 assert.deepEqual(backup.friends[0].grCards,stock);
 assert.deepEqual(backup.friends[0].startCards,deck.startCards);
 assert.deepEqual(deckContentSnapshot(deck).grCards,stock);
 assert.equal(deckCardChanges(base,deck).find(x=>x.id===DOG).zone,'gr');
 writeEditorDraft(read,{deck,role:'mine'});
 assert.deepEqual(readEditorDraft(read,registry).deck,deck);
 saved.lastMatch=lastMatchSetup({deck:base,opponent:saved.friends[0]});
 assert.deepEqual(resolveLastMatch(saved,e.validateDeck).opponent.grCards,stock);
});

test('対戦の初期配置で封印はシールドと手札より先に置かれ、超GRは山札と独立する',()=>{
 const plain=e.createGame([base,base],{seed:42});
 const s=e.createGame([deck,base],{seed:42});
 const a=s.players[0],b=plain.players[0],host=a.battle[0];
 assert.equal(host.cardId,DOKINDAM);
 assert.equal(a.seals.length,6);
 assert.ok(a.seals.every(x=>x.faceDown&&x.sealOf===host.uid));
 assert.deepEqual(a.seals.map(x=>x.uid),[...b.shields,...b.hand].slice(0,6).map(x=>x.uid));
 assert.equal(a.deck.length,24);
 assert.equal(a.gr.length,12);
 assert.deepEqual(s.players[1],plain.players[1]);
 assert.equal(new Set(e.physicalCards(s).map(x=>x.uid)).size,93);
 const view=e.observation(s,1);
 assert.ok(!view.players[0].gr?.length);
});

function waveGame(){
 const s=setup();s.active=0;s.format='advance';
 s.players[0].gr=[inst(NECK),inst(DOG)];
 return s;
}

test('Wave ウェイブは召喚時に墓地の呪文を唱え、最初の呪文だけでGR召喚する',()=>{
 const s=waveGame();
 s.players[0].grave.push(inst(FAIRY));
 cast(s,WAVE);
 assert.equal(s.decision.task.op,'waveGraveCast');
 const use=e.getLegalActions(s).find(a=>a.kind==='extended'&&s.decision.choices[a.choice].value);
 e.step(s,use);drain(s);
 const gr=s.players[0].battle.find(x=>x.cardId===NECK);
 assert.equal(gr.summonedTurn,s.turn);
 assert.equal(s.players[0].gr.length,1);
 cast(s,FAIRY);drain(s);
 assert.equal(s.players[0].gr.length,1);
});

test('GR召喚禁止で公開されたカードは超GRの上に残る',()=>{
 const s=waveGame();
 s.players[0].battle.push(inst(WAVE));
 const top=s.players[0].gr[0];
 s.extLimits=[{kind:'summon',player:0,max:7}];
 cast(s,FAIRY);drain(s);
 assert.equal(s.players[0].gr[0],top);
 assert.ok(s.log.some(x=>x.type==='grPrevented'&&x.cardId===NECK));
});

test('GRクリーチャーを破壊すると超GRに戻り、墓地に残らない',()=>{
 const s=waveGame();s.active=1;
 const gr=s.players[0].gr.shift();gr.cardOwner=0;s.players[0].battle.push(gr);
 cast(s,'dm01-027');drain(s);
 assert.ok(!s.players[0].grave.includes(gr));
 assert.equal(s.players[0].gr.at(-1),gr);
});

test('ワンワンワンは他のアウトレイジ犬につき+1111',()=>{
 const s=waveGame(),dogs=[inst(DOG),inst(DOG)];
 s.players[0].battle.push(...dogs,inst(NECK));s.players[1].battle.push(inst(DOG));
 assert.equal(e.power(dogs[0],false,s),2222);
});

test('ジェイ-SHOCKERは他のジョーカーズを戻し、選んだコストの登場を止める',()=>{
 const s=waveGame(),jay=inst(JAY),ally=inst(JAY);
 s.players[0].battle.push(jay,ally);ally.cardOwner=0;
 attack(s,jay.uid);
 option(s,ally.uid);drain(s);
 assert.equal(s.players[0].gr.at(-1),ally);
 assert.equal(e.canEnterCreature(s,1,e.card(NECK),{origin:'hand'}),true);
 assert.equal(e.canEnterCreature(s,1,e.card(JAY),{origin:'gr'}),false);
});

test('相手ターンのS・トリガーで禁断解放し、相手クリーチャーを封印する',()=>{
 const s=e.createGame([base,deck],{seed:42});
 s.players[1].seals.splice(1);
 const attacker=inst('dmx22b-010'),host=s.players[1].battle[0];
 attacker.powerModifiers=[{amount:15000}];
 s.players[0].battle.push(attacker);
 s.players[1].shields=[inst(REBIRTH)];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===REBIRTH);
 drain(s);
 assert.equal(e.card(host).name,'伝説の禁断 ドキンダムX');
 assert.equal(attacker.sealed,true);
});

test('禁断解放後のドキンダムXが離れると持ち主は敗北する',()=>{
 const s=e.createGame([base,deck],{seed:42});
 s.phase='main';
 const host=s.players[1].battle[0];
 s.players[1].seals=[];
 host.startFlipped=true;
 s.players[0].mana=Array.from({length:6},()=>inst('dm01-090'));
 cast(s,'dm01-027');drain(s);
 assert.equal(s.winner,0);
 assert.match(s.reason,/ドキンダムX/);
});

test('QA 39624: ジェイ-SHOCKERの登場禁止中はオカルトの代替コストを宣言できない',()=>{
 const s=waveGame();s.active=1;
 const jay=inst(JAY),joker=inst('dmrp01-011');
 s.players[1].battle.push(jay,joker);
 s.players[0].battle.push(...Array.from({length:3},()=>inst(NECK)));
 const occult=inst('dmr14-012');
 s.players[0].hand.push(occult);
 attack(s,jay.uid);
 option(s,joker.uid);drain(s);
 assert.equal(e.canEnterCreature(s,0,e.card(occult)),false);
 s.active=0;s.phase='main';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===occult.uid));
 assert.equal(s.players[0].battle.length,3);
});

test('QA 41166: Wave ウェイブで墓地から唱えた呪文が同じ墓地に戻ってもヴィルヘルムは誘発しない',()=>{
 const s=waveGame(),spell=inst('dm01-086'),wilhelm=inst('dmr07-s05');
 s.players[0].grave.push(spell);
 const target=inst(NECK),enemyMana=s.players[1].mana.length;
 s.players[1].battle.push(wilhelm,target);
 cast(s,WAVE);
 const use=e.getLegalActions(s).find(a=>a.kind==='extended'&&s.decision.choices[a.choice].value?.uid===spell.uid);
 e.step(s,use);
 act(s,'effect',a=>a.targets?.[0]?.uid===target.uid);
 drain(s);
 assert.ok(s.players[0].grave.includes(spell));
 assert.ok(s.players[1].battle.includes(wilhelm));
 assert.equal(s.players[1].mana.length,enemyMana);
});
