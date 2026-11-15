import test from 'node:test';
import assert from 'node:assert/strict';
import {act,attack,cast,drain,e,inst,PRESETS} from './target-fixture.mjs';

const ZERO='dmrp12-mz1',DOG='dmex08-251',FILL='dm01-108',DARK='dm01-090';
const base={...structuredClone(PRESETS[0]),format:'advance'};
const zero={...base,grCards:[{id:DOG,count:12}],startCards:[{id:ZERO,count:1}]};
const create=()=>e.createGame([zero,base],{seed:25});
const part=(s,id)=>s.players[0].battle.find(x=>x.cardId==='dmrp12-mz'+id);
const pick=(s,value)=>act(s,'extended',a=>(s.decision.choices[a.choice]?.value?.uid??s.decision.choices[a.choice]?.value)===value);
function init(){
 const s=create();s.phase='main';
 const own=s.players[0];
 own.hand=[];own.mana=Array.from({length:18},()=>inst(DARK));
 return s;
}

test('零龍の5枚セットを別々に初期配置し、相手だけ追加で1枚引く',()=>{
 const s=create();
 assert.equal(s.players[0].battle.length,5);
 assert.equal(s.players[0].hand.length,5);
 assert.equal(s.players[1].hand.length,6);
 assert.ok(!s.players[0].battle.some(x=>x.startFlipped||x.ritualLinked));
 const cards=e.physicalCards(s);
 assert.equal(cards.length,97);
 assert.equal(new Set(cards.map(x=>x.uid)).size,97);
 assert.match(e.validateDeck({...zero,startCards:[{id:ZERO,count:1},{id:'dmr19-fl01',count:1}]}).join(),/最大1枚/);
});

test('手札の儀は手札が空のターン終了時にリンクしGR召喚する',()=>{
 const s=init(),own=s.players[0],piece=part(s,2);
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.decision.task.kind,'hand');
 pick(s,true);drain(s);
 assert.equal(piece.ritualLinked,true);
 assert.equal(own.gr.length,11);
 assert.equal(own.battle.at(-1).cardId,DOG);
});

test('墓地の儀は8枚目のカードでリンクし、選んだクリーチャーを−3000する',()=>{
 const s=init(),own=s.players[0];
 own.grave=Array.from({length:7},()=>inst(FILL));
 const enemy=inst('dm25rp3-S09');s.players[1].battle.push(enemy);
 const before=e.power(enemy,false,s);
 own.mana.push(inst(FILL));
 cast(s,'dm06-110');
 pick(s,true);pick(s,enemy.uid);
 assert.equal(part(s,3).ritualLinked,true);
 assert.equal(e.power(enemy,false,s),before-3000);
});

test('4枚目の儀で零龍卍誕し、そのターンの相手クリーチャーのパワーを固定する',()=>{
 const s=init(),own=s.players[0],host=part(s,1),partIds=own.battle.slice(1).map(x=>x.uid);
 for(const id of [2,3,4])part(s,id).ritualLinked=true;
 const target=inst('dm01-108');s.players[1].battle.push(target);
 const revived=inst('dm01-075');own.grave.push(revived);
 s.extTasks=[{op:'g34_Put',p:0,owner:0,source:ZERO,origin:'grave',target:revived.uid,execution:false}];
 act(s,'toAttack');
 drain(s);
 assert.equal(e.card(host).name,'零龍');
 assert.deepEqual(host.under.map(x=>x.uid),partIds);
 assert.ok(own.battle.includes(revived));
 assert.ok(s.players[1].grave.includes(target));
 assert.equal(e.power(host,false,s),0);
});


test('破壊の儀は同じターンの3体目の破壊でリンクし闇のカードを回収する',()=>{
 const s=init(),own=s.players[0],dark=inst(DARK);
 own.grave.push(dark);
 s.players[1].battle=Array.from({length:3},()=>inst(FILL));
 for(let i=0;i<3;i++){
  cast(s,'dm01-027');act(s,'effect');
  if(i<2)assert.equal(part(s,4).ritualLinked,undefined);
 }
 assert.equal(s.decision.task.kind,'destroy');
 pick(s,true);pick(s,dark.uid);
 assert.equal(part(s,4).ritualLinked,true);
 assert.ok(own.hand.includes(dark));
});

test('QA 40600: 零龍のパワー固定によりタコンチュの置換が山札切れまで続く',()=>{
 const s=init(),own=s.players[0],enemy=inst('dmr20-003');
 s.players[1].battle.push(enemy);
 for(const id of [2,3,4])part(s,id).ritualLinked=true;
 own.deck=Array.from({length:12},()=>inst(FILL));
 const revived=inst('dm01-075');own.grave.push(revived);
 s.extTasks=[{op:'g34_Put',p:0,owner:0,source:ZERO,origin:'grave',target:revived.uid,execution:false}];
 act(s,'toAttack');drain(s);
 assert.equal(e.power(enemy,false,s),0);
 assert.ok(s.players[1].battle.includes(enemy));
 assert.equal(s.winner,1);
});
