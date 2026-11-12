import test from 'node:test';
import assert from 'node:assert/strict';
import {act,attack,drain,e,give,inst,setup} from './target-fixture.mjs';

const TRAINING='dmrp22-040',ALL_YES='dm31-019',LEGEND='dm28-008',KUCHIKU='dmrp20-026';
const MOON='dm32-s07',YAMATO='dm26-s02',MUSHA='dm24-s04',PLAIN='dm01-108';
const LOW='dm01-s04',MID='dm10-006';
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const field=()=>{
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(10).fill(PLAIN));
 return s;
};
function play(s,id){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function cross(s,gear,host){
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===host.uid);
}

test('Training doubles the creature draw and leaves All Yes blind discard at one',()=>{
 const s=field(),[attacker]=give(s,0,'battle',[KUCHIKU]);
 give(s,1,'hand',[PLAIN,PLAIN,PLAIN]);
 const gear=play(s,ALL_YES);
 cross(s,gear,attacker);
 play(s,TRAINING);
 pick(s,attacker.uid);
 attack(s,attacker.uid);
 drain(s);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.players[1].hand.length,3);
 assert.equal(s.players[1].grave.length,1);
});

test('Musha Legend adds a second name, two races and 2000 power, then destroys at most 6000',()=>{
 const s=field(),[host]=give(s,0,'battle',[PLAIN]),[low,high]=give(s,1,'battle',[LOW,MID]);
 const gear=play(s,LEGEND);
 cross(s,gear,host);
 const identity=e.effectiveCard(host,s);
 assert.equal(identity.name,e.card(PLAIN).name);
 assert.deepEqual(identity.additionalNames,[e.card(MUSHA).name]);
 assert.deepEqual(identity.race.split('/'),[e.card(PLAIN).race,'アーマード・ドラゴン','サムライ']);
 assert.equal(e.power(host,false,s),4000);
 attack(s,host.uid);
 const shield=s.players[0].shields[0];
 pick(s,shield.uid);
 assert.ok(s.players[0].grave.includes(shield));
 assert.deepEqual(choices(s),[low.uid]);
 pick(s,low.uid);
 assert.ok(s.players[1].grave.includes(low));
 assert.ok(s.players[1].battle.includes(high));
});

test('Yamato extends Musha single destruction to 12000, and does not extend Drag Moon selection',()=>{
 for(const id of [MUSHA,MOON]){
  const s=field(),[attacker,yamato]=give(s,0,'battle',[id,YAMATO]),[low,high]=give(s,1,'battle',[LOW,MID]);
  const gear=play(s,LEGEND);
  cross(s,gear,attacker);
  assert.ok(e.power(high,false,s)>6000&&e.power(high,false,s)<=12000);
  assert.ok(s.players[0].battle.includes(yamato));
  attack(s,attacker.uid);
  act(s,'orderEffect',a=>a.cardId===id);
  if(id===MUSHA){
   pick(s,s.players[0].shields[0].uid);
   assert.ok(choices(s).includes(high.uid));
   pick(s,high.uid);
   assert.ok(s.players[1].grave.includes(high));
  }else{
   assert.ok(choices(s).includes(low.uid));
   assert.ok(!choices(s).includes(high.uid));
   pick(s,low.uid);
   assert.ok(s.players[1].grave.includes(low));
   assert.ok(s.players[1].battle.includes(high));
  }
 }
});

test('Yamato counts fire cards only during its own attack',()=>{
 const s=field(),[yamato]=give(s,0,'battle',[YAMATO]);
 give(s,0,'grave',[MUSHA,LEGEND,PLAIN]);
 assert.equal(e.power(yamato,false,s),6000);
 assert.equal(e.power(yamato,true,s),8000);
 assert.equal(e.effectiveCard(yamato,s).speedAttacker,true);
 assert.equal(e.effectiveCard(yamato,s).breaker,2);
});
