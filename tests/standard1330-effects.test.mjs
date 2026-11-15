import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const JIGEN='dmex12-021',STEN='promoy14-039',GALAXY='dm28-002';
const SMALL='dm01-108',LIGHT='dm01-075',LARGER='dm01-103',LIFE='dm06-110';
const add=(s,p,zone,id)=>{
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,zone,uid)=>s.players[p][zone].some(x=>x.uid===uid);
const pick=(s,uid)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===uid;
});
const next=s=>{
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
};

test('QA38619: 次元隠しの術で移したクリーチャーは超次元ゾーンに残る',()=>{
 const s=setup(),target=add(s,1,'battle',SMALL);
 cast(s,JIGEN);
 pick(s,target.uid);
 drain(s);
 assert.ok(has(s,1,'extra',target.uid));
 assert.ok(!has(s,1,'battle',target.uid));
 give(s,1,'hand',[SMALL,LARGER,LIFE]);
 next(s);
 act(s,'skipCharge');
 const actions=e.getLegalActions(s);
 assert.ok(!actions.some(a=>a.kind==='play'&&a.cardId===SMALL));
 for(const id of [LARGER,LIFE])assert.ok(actions.some(a=>a.kind==='play'&&a.cardId===id));
 assert.ok(!actions.some(a=>a.kind==='play'&&a.uid===target.uid));
 const saved=JSON.parse(JSON.stringify(s));
 assert.deepEqual(e.getLegalActions(saved),actions);
 next(saved);
 assert.equal(saved.active,0);
 assert.ok(e.canEnterCreature(saved,1,e.card(SMALL)));
});

test('QA38620: ギャラクシーがシールド・フォースで残っても同じコストの登場を止める',()=>{
 const s=setup();
 s.active=1;
 cast(s,GALAXY);
 pick(s,s.players[1].shields[0].uid);
 drain(s);
 const target=s.players[1].battle.find(x=>x.cardId===GALAXY);
 assert.ok(target);
 s.active=0;
 cast(s,JIGEN);
 pick(s,target.uid);
 drain(s);
 assert.ok(has(s,1,'battle',target.uid));
 assert.ok(!e.canEnterCreature(s,1,e.card(GALAXY)));
 assert.ok(e.canEnterCreature(s,0,e.card(GALAXY)));
});

test('QA38621: ステニャンコは自軍を破壊できるがコストが一致するため墓地にとどまる',()=>{
 const s=setup(),target=add(s,1,'battle',SMALL),ally=add(s,1,'battle',LIGHT);
 const sten=add(s,1,'grave',STEN);
 cast(s,JIGEN);
 pick(s,target.uid);
 drain(s);
 next(s);
 assert.equal(s.active,1);
 assert.equal(s.decision?.task?.op,'g34_SacrificeAlly413');
 pick(s,ally.uid);
 drain(s);
 assert.ok(has(s,1,'grave',ally.uid));
 assert.ok(has(s,1,'grave',sten.uid));
 assert.ok(!has(s,1,'battle',sten.uid));
});

test('次元隠しの術の再録は元の対戦IDに解決する',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.equal(catalogue.get('dmex18-016').id,JIGEN);
 assert.equal(catalogue.get(JIGEN).limit,4);
});

test('相手に選べるクリーチャーがいなければ登場制限は残らない',()=>{
 const s=setup();
 cast(s,JIGEN);
 drain(s);
 assert.ok(e.canEnterCreature(s,1,e.card(SMALL)));
});
