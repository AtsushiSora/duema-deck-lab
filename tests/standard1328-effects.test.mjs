import test from 'node:test';
import assert from 'node:assert/strict';
import {act,attack,cast,drain,e,inst,PRESETS} from './target-fixture.mjs';

const STAR='dmr23-ffl01',COMMAND='dmr13-095',WEAK='dm01-083',FIRE='dm01-097',DARK='dm01-090';
const base={...structuredClone(PRESETS[0]),format:'advance'};
const deck={...base,startCards:[{id:STAR,count:1}]};
const choice=(s,value)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
function setup(){
 const s=e.createGame([deck,base],{seed:42});
 s.phase='main';
 for(const [i,def] of [FIRE,DARK].entries()){
  s.players[i].hand=[];
  s.players[i].mana=Array.from({length:25},()=>inst(def));
 }
 return s;
}

test('全5枚の最終禁断フィールドと4隅の封印が初期配置される',()=>{
 const s=setup(),field=s.players[0].battle[0];
 assert.equal(field.under.length,4);
 assert.deepEqual(s.players[0].seals.map(x=>x.forbiddenCorner),[0,1,2,3]);
 assert.ok(s.players[0].seals.every(x=>x.sealOf===field.uid));
 assert.equal(s.players[0].deck.length,26);
 assert.equal(e.costValue(e.card(STAR)),Number.NaN);
});

test('コマンドの召喚は各ターン1回だけ封印を外し、左上はパワー1111以下を破壊する',()=>{
 const s=setup(),own=s.players[0],weak=inst(WEAK);
 s.players[1].battle.push(weak);
 cast(s,COMMAND);
 assert.equal(s.decision.task.op,'finalForbiddenUnseal');
 choice(s,own.seals[0].uid);
 if(s.decision?.task?.op==='finalForbiddenCorner')choice(s,weak.uid);
 drain(s);
 assert.ok(s.players[1].grave.includes(weak));
 assert.equal(own.seals.length,3);
 cast(s,COMMAND);drain(s);
 assert.equal(own.seals.length,3);
});

test('最終禁断フィールドがある間は普通のクリーチャーのみ攻撃できなくなる',()=>{
 const s=setup(),ally=inst(WEAK),command=inst(COMMAND);
 s.players[0].battle.push(ally,command);
 assert.equal(e.canCreatureAttack(s,0,ally),false);
 assert.equal(e.canCreatureAttack(s,0,command),true);
});

test('右下を最後に外すと禁断爆発し、相手を封印してコアによる置換もできる',()=>{
 const s=setup(),own=s.players[0],field=own.battle[0],enemy=inst(WEAK);
 own.seals=own.seals.filter(x=>x.forbiddenCorner===3);
 s.players[1].battle.push(enemy);
 cast(s,COMMAND);
 if(s.decision?.task?.op==='finalForbiddenUnseal')choice(s,own.seals[0].uid);
 drain(s);
 assert.equal(e.card(field).name,'終焉の禁断 ドルマゲドンX');
 assert.equal(enemy.sealed,true);
 s.active=1;s.phase='main';
 const before=own.shields.length;
 cast(s,'dm01-027');act(s,'effect');
 act(s,'replaceFinalForbiddenCore');
 drain(s);
 assert.ok(own.battle.includes(field));
 assert.equal(field.under.filter(x=>x.forbiddenCoreSpent).length,2);
 assert.equal(own.shields.length,before-1);
});

test('右下を先に外しても禁断爆発せず、別の封印を最後に外しても裏返らない',()=>{
 const s=setup(),own=s.players[0],field=own.battle[0];
 own.seals=own.seals.filter(x=>[0,3].includes(x.forbiddenCorner));
 cast(s,COMMAND);choice(s,own.seals.find(x=>x.forbiddenCorner===3).uid);drain(s);
 assert.equal(field.startFlipped,undefined);
 s.turn++;
 cast(s,COMMAND);
 if(s.decision?.task?.op==='finalForbiddenUnseal')choice(s,own.seals[0].uid);
 drain(s);
 assert.equal(own.seals.length,0);
 assert.equal(field.startFlipped,undefined);
});

test('QA38649: 水/闇のクリーチャーが出てからタコンチュでコマンドを得ても封印は外れない',()=>{
 const s=setup(),own=s.players[0],nonCommand='dmr22-069';
 own.battle.push(inst('dmr20-003'));
 own.mana.push(inst('dm01-083'),inst(DARK));
 cast(s,nonCommand);drain(s);
 assert.match(e.effectiveCard(own.battle.find(x=>x.cardId===nonCommand),s).race,/コマンド/);
 assert.equal(own.seals.length,4);
});

test('QA40664: 進化元がないレッドゾーンは召喚されず、封印が残る',()=>{
 const s=setup(),own=s.players[0],attacker=inst('dmrp20-010'),redzone=inst('dmr17-l02');
 own.battle.push(attacker);own.deck.unshift(redzone);own.mana=[];
 attack(s,attacker.uid);
 choice(s,0);
 assert.equal(s.decision.type,'block');
 assert.ok(own.hand.includes(redzone));
 act(s,'noBlock');drain(s);
 assert.equal(own.seals.length,4);
});

test('禁断爆発後のドルマゲドンXが離れるとクリーチャーを破壊して敗北する',()=>{
 const s=setup(),own=s.players[0],field=own.battle[0];
 own.seals=[];field.startFlipped=true;
 for(const core of field.under)core.startFlipped=true;
 const other=inst(WEAK);
 own.battle.push(other);
 s.active=1;
 cast(s,'dm01-027');act(s,'effect',a=>a.targets?.[0]?.uid===field.uid);
 act(s,'allowLeave');
 drain(s);
 assert.ok(own.grave.includes(field)&&own.grave.includes(other));
 assert.equal(s.winner,1);
});


test('QA33262: 龍世界 ドラゴ大王がコマンドの登場を置換しても封印を外す',()=>{
 const s=setup(),own=s.players[0],enemy=s.players[1],command='dmr09-095';
 enemy.battle.push(inst('dmx16-001'));
 cast(s,command);
 assert.ok(own.grave.some(x=>x.cardId===command));
 assert.equal(s.decision.task.op,'finalForbiddenUnseal');
 choice(s,own.seals[0].uid);drain(s);
 assert.equal(own.seals.length,3);
});

test('残る2隅は選んだクリーチャーにスレイヤーとパワーアタッカーを与える',()=>{
 const s=setup(),own=s.players[0],ally=inst(WEAK);
 own.battle.push(ally);
 const power=e.power(ally,true,s);
 for(const corner of [1,2]){
  cast(s,COMMAND);
  choice(s,own.seals.find(x=>x.forbiddenCorner===corner).uid);
  choice(s,ally.uid);
  if(corner===1)assert.equal(e.effectiveCard(ally,s).slayer,true);
  else assert.equal(e.power(ally,true,s),power+2222);
  drain(s);s.turn++;
 }
});
