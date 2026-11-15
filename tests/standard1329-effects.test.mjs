import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const CAROL='dmx14-031',NEMESIS='dm23rp4-009',KEDO='dmrp16-017';
const TUBE='dmex14-003',ACTOR='dmrp20-008',DEVICE='dm22rp2-064',ALDE='dm23rp4-027',HIPPO='dm39-034';
const WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108',LIGHT='dm01-075';
function put(s,p,zone,id){const x=inst(id);s.players[p][zone].push(x);return x;}
const pick=(s,value)=>act(s,'extended',a=>{
 const item=s.decision.choices[a.choice].value;
 return (item?.uid??item)===value;
});
const contains=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

test('QA39440: キャロルが手札にとどまるとV・チューブのバウンスは誘発しない',()=>{
 const s=setup();
 const carol=put(s,0,'hand',CAROL),target=put(s,1,'battle',FIRE);
 put(s,0,'battle',ACTOR);
 cast(s,TUBE);pick(s,carol.uid);
 assert.equal(s.decision,null);
 assert.ok(contains(s,0,'hand',carol)&&contains(s,1,'battle',target));
 assert.ok(!contains(s,0,'grave',carol));
});

test('QA40666: キャロルの置換後、次に捨てた実カードをアクターシャが選べる',()=>{
 const s=setup();
 const actor=put(s,0,'battle',ACTOR);
 const carol=put(s,0,'hand',CAROL),payment=put(s,0,'hand',NATURE);
 attack(s,actor.uid);pick(s,carol.uid);
 assert.equal(s.decision?.task?.op,undefined);
 drain(s);
 assert.ok(contains(s,0,'hand',carol));
 actor.tapped=false;
 attack(s,actor.uid);pick(s,payment.uid);
 assert.equal(s.decision.task.op,'g34_FirstDiscardUse1268');
 pick(s,payment.uid);drain(s);
 assert.ok(contains(s,0,'battle',payment));
});

test('QA42487: デバイスはキャロルが手札に残っても相手を選び、パワーを変更しない',()=>{
 const s=setup(),carol=put(s,0,'hand',CAROL),foe=put(s,1,'battle',NATURE);
 cast(s,DEVICE);pick(s,carol.uid);
 assert.deepEqual(s.decision.choices.map(x=>x.value?.uid??x.value),[foe.uid]);
 pick(s,foe.uid);drain(s);
 assert.ok(contains(s,0,'hand',carol)&&contains(s,1,'battle',foe));
 assert.equal(e.power(foe,false,s),2000);
});

test('キャロルは破壊を手札戻しに置換し、条件を満たさなければ墓地に置かれる',()=>{
 for(const condition of [true,false]){
  const s=setup(),carol=put(s,1,'battle',CAROL);
  if(!condition)give(s,1,'mana',[]);
  cast(s,'dm01-027');act(s,'effect',a=>a.targets.some(t=>t.uid===carol.uid));drain(s);
  assert.ok(contains(s,1,condition?'hand':'grave',carol));
 }
});

test('QA44196: ネメシスの選択耐性があってもアルデの召喚のためタップできる',()=>{
 const s=setup(),nemesis=put(s,0,'battle',NEMESIS),alde=put(s,0,'hand',ALDE);
 give(s,0,'mana',[LIGHT,NATURE,NATURE]);
 act(s,'play',a=>a.uid===alde.uid&&a.tapUid===nemesis.uid);
 drain(s);
 assert.ok(nemesis.tapped&&contains(s,0,'battle',alde));
});

test('ネメシスは無色マナで軽減と登場ターンの対プレイヤー攻撃を得る',()=>{
 const s=setup(),nemesis=put(s,0,'hand',NEMESIS);
 assert.equal(e.summonCost(s,0,e.card(nemesis)),7);
 put(s,0,'mana','dmrp07-001');
 assert.equal(e.summonCost(s,0,e.card(nemesis)),6);
 act(s,'play',a=>a.uid===nemesis.uid);drain(s);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===nemesis.uid&&a.target==='player'));
 assert.ok(e.effectiveCard(nemesis,s).unblockable&&e.effectiveCard(nemesis,s).cannotBeAttacked);
});

test('QA39622: ケドケドがいると陰陽の舞のマナ爆誕0を宣言できない',()=>{
 const s=setup(),hippo=put(s,0,'mana',HIPPO);
 assert.ok(e.getLegalActions(s).some(a=>a.uid===hippo.uid&&a.origin==='mana'));
 put(s,1,'battle',KEDO);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===hippo.uid&&a.origin==='mana'));
 assert.equal(e.canEnterCreature(s,0,e.card(NATURE),{origin:'shields'}),false);
 assert.equal(e.canEnterCreature(s,0,e.card(NATURE),{origin:'hand'}),true);
});

test('ケドケドはバトルゾーンからマナへの移動を止める',()=>{
 for(const locked of [false,true]){
  const s=setup(),target=put(s,1,'battle',FIRE);
  if(locked)put(s,0,'battle',KEDO);
  cast(s,'dm01-039');drain(s);
  assert.ok(contains(s,1,locked?'battle':'mana',target));
 }
});

test('ネメシスはコスト4の呪文では選べず、コスト6の呪文では選べる',()=>{
 const s=setup(),nemesis=put(s,1,'battle',NEMESIS),other=put(s,1,'battle',FIRE);
 cast(s,'dm01-093');
 const actions=e.getLegalActions(s).filter(a=>a.kind==='effect');
 assert.ok(actions.some(a=>a.targets.some(t=>t.uid===other.uid)));
 assert.ok(!actions.some(a=>a.targets.some(t=>t.uid===nemesis.uid)));
 drain(s);
 cast(s,'dm01-027');act(s,'effect',a=>a.targets.some(t=>t.uid===nemesis.uid));drain(s);
 assert.ok(contains(s,1,'grave',nemesis));
});

test('QA34346とQA34347: 進化元または能力を無視されたキャロルは墓地に置かれる',()=>{
 for(const covered of [false,true]){
  const s=setup(),carol=put(s,1,'battle',CAROL);
  if(covered){
   s.players[1].battle.pop();
   const evolution=put(s,1,'battle','dm02-001');
   evolution.under=[carol];
  }else put(s,0,'battle','dmrp15-km1');
  cast(s,'dm01-027');drain(s);
  assert.ok(contains(s,1,'grave',carol));
 }
});

test('QA44193: ドゥポイズの選ぶ必要のない破壊はネメシスにも適用される',()=>{
 const s=setup(),nemesis=put(s,0,'battle',NEMESIS);
 const dupoiz=put(s,0,'hand','dmrp04m-014');
 act(s,'play',a=>a.uid===dupoiz.uid);drain(s);
 assert.ok(contains(s,0,'grave',nemesis));
});

test('QA39089: ケドケドの常在能力がフシギバースの宣言を止める',()=>{
 const s=setup(),dida=put(s,0,'grave','dmrp13-km3');
 put(s,0,'battle',FIRE);
 const fushi=()=>e.getLegalActions(s).some(a=>a.uid===dida.uid&&a.alternative==='fushigibirth');
 assert.ok(fushi());
 put(s,0,'battle',KEDO);
 assert.ok(!fushi());
});

test('ケドケドがいるとフシギダケのマナへの置換ができず破壊される',()=>{
 for(const locked of [false,true]){
  const s=setup(),mushroom=put(s,1,'battle','dmrp13-056');
  if(locked)put(s,0,'battle',KEDO);
  cast(s,'dm01-027');act(s,'effect',a=>a.targets.some(t=>t.uid===mushroom.uid));drain(s);
  assert.ok(contains(s,1,locked?'grave':'mana',mushroom));
 }
});

test('QA39099: ケドケド自身もサッヴァークでシールドに置けない',()=>{
 const s=setup(),kedo=put(s,1,'battle',KEDO);
 cast(s,'dmrp04s-m02');
 assert.equal(s.decision.task.op,'g8_Savak');
 pick(s,kedo.uid);pick(s,s.players[1].shields[0].uid);drain(s);
 assert.ok(contains(s,1,'battle',kedo));
});

test('QA39087: ケドケドがいても手札で解決するS・トリガーで召喚できる',()=>{
 const s=setup(),attacker=put(s,0,'battle',FIRE);
 put(s,0,'battle',KEDO);
 give(s,1,'shields',['dm05-024',NATURE]);
 const shield=s.players[1].shields[0];
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(e.getLegalActions(s).some(a=>a.kind==='breakShields'))act(s,'breakShields',a=>a.shields.includes(shield.uid));
 act(s,'useTrigger',a=>a.uid===shield.uid);drain(s);
 assert.ok(contains(s,1,'battle',shield));
});

test('公式画像で確認した金箔再録とキャロルの再録は既存の対戦IDに解決する',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.equal(catalogue.get('dm22rp2-1S').id,'dm22rp2-OR1');
 assert.equal(catalogue.get('dmex13-056').id,CAROL);
 assert.equal(new Set(data.cards.map(row=>nameKey(row.name))).size,data.cards.length);
});

test('墓地に置かれる直前のマナにキャロル自身の水と火がある場合は手札に戻る',()=>{
 const s=setup();
 give(s,1,'mana',[CAROL]);
 const carol=s.players[1].mana[0];
 cast(s,'dm02-035');pick(s,carol.uid);drain(s);
 assert.ok(contains(s,1,'hand',carol));
 assert.ok(!contains(s,1,'grave',carol));
});
