import test from 'node:test';
import assert from 'node:assert/strict';
import {act,cast,drain,e,give,inst,setup} from './target-fixture.mjs';

const FUKA='dm26ex2-004', PLAT='dm26ex4-022', CAMP='dm26rp3-030', KENT='dm26rp3-001', SC='dm23rp1-S4';
const GREEN='dm01-108', BLUE='dm01-083', DUEL='dm26ex2-030', SIGN='dm26ex2-046';
const add=(s,p,z,id)=>{const x=inst(id);s.players[p][z].push(x);return x;};
const field=()=>{const s=setup();s.active=0;for(const p of [0,1]){give(s,p,'grave',[]);give(s,p,'deck',Array(26).fill(GREEN));}return s;};
const choose=(s,v)=>act(s,'extended',a=>{const r=s.decision.choices[a.choice].value;return (r?.uid??r)===v;});
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

test('Fukafuchi alternative summon bounces, draws for its own entry and deploys from hand once on the opposing turn',()=>{
 const s=field(),ally=add(s,0,'battle',GREEN),x=add(s,0,'hand',FUKA);
 act(s,'play',a=>a.uid===x.uid&&a.role==='paidAlt568');
 while(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.find(y=>y.effectId===a.effectId)?.task.defs?.[0].op==='Target');
 if(s.decision?.task?.op==='g34_Draw')choose(s,1);
 choose(s,ally.uid);if(s.decision)choose(s,1);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 const y=add(s,0,'hand',FUKA);
 for(let i=0;i<3;i++)add(s,0,'hand',GREEN);
 s.phase='attack';act(s,'endTurn');act(s,'skipCharge');cast(s,BLUE);
 assert.equal(s.decision.player,0);choose(s,y.uid);
 drain(s);
 assert.ok(has(s,0,'battle',y));assert.equal(y.summonedTurn,undefined);
 const oldKey='g1088Fukafuchi:'+x.uid+'@'+x.incarnation;
 assert.equal(s.once[oldKey],s.turn);
 cast(s,BLUE);
 assert.notEqual(s.decision?.task?.uid,x.uid);
});

test('Platinum counts real opposing executions and offers only one free water execution per copy with thirteen cards',()=>{
 const s=field();const x=add(s,0,'hand',PLAT);act(s,'play',a=>a.uid===x.uid);assert.equal(x.justDiverActive,true);
 give(s,0,'hand',Array(12).fill(BLUE));give(s,0,'mana',[]);
 assert.ok(!e.getLegalActions(s).some(a=>a.freeSummon?.includes('プラチナム')));
 const y=add(s,0,'hand',BLUE);add(s,0,'hand',GREEN);
 assert.ok(!e.getLegalActions(s).some(a=>a.cardId===GREEN&&a.freeSummon?.includes('プラチナム')));
 act(s,'play',a=>a.uid===y.uid&&a.freeSummon?.includes('プラチナム'));
 assert.ok(has(s,0,'battle',y));
 assert.ok(!e.getLegalActions(s).some(a=>a.freeSummon?.includes('プラチナム')));
 s.phase='attack';act(s,'endTurn');act(s,'skipCharge');cast(s,BLUE);
 const n=s.players[0].hand.length;choose(s,1);assert.equal(s.players[0].hand.length,n+1);
});

test('Camp copies Kent’s shield mode with J Big and uses the entering opponent’s mana count',()=>{
 const s=field();add(s,0,'battle',KENT);const count=s.players[0].shields.length;
 cast(s,CAMP);choose(s,'jbig');act(s,'extended');
 assert.equal(s.players[0].shields.length,count+1);
 const entrant=add(s,1,'hand',BLUE);
 s.phase='attack';act(s,'endTurn');act(s,'skipCharge');
 // Leave one unit of real payment and use a free S-trigger instead for the over-mana entrant.
 give(s,1,'mana',[]);give(s,1,'battle',[BLUE,BLUE,BLUE,BLUE]);
 const free=add(s,1,'hand',PLAT);
 add(s,1,'battle',PLAT);
 for(let i=0;i<13;i++)add(s,1,'hand',BLUE);
 act(s,'play',a=>a.uid===free.uid&&a.freeSummon?.includes('プラチナム'));
 drain(s);assert.ok(has(s,1,'deck',free));assert.ok(has(s,1,'hand',entrant));
});

test('Kent can take a shield without its S-trigger to prevent one Joker from leaving each turn',()=>{
 const s=field(),j=add(s,0,'battle',CAMP);cast(s,KENT);choose(s,'shield');
 const shield=add(s,0,'shields',SIGN);add(s,1,'hand',BLUE);add(s,1,'hand',BLUE);
 s.phase='attack';act(s,'endTurn');act(s,'skipCharge');cast(s,DUEL);
 act(s,'g1088Kent',a=>a.choice.shield===shield.uid);
 drain(s);
 assert.ok(has(s,0,'hand',shield));
 assert.ok(!s.triggers);
 assert.equal(s.players[0].battle.filter(x=>[CAMP,KENT].includes(x.cardId)).length,1);
 if(has(s,0,'battle',j))assert.ok(!s.players[0].battle.some(x=>x.cardId===KENT));
});

test('SC deploys a twinpact when its hand spell goes to grave, casts a smaller spell in place, and can return to hand',()=>{
 const s=field(),sc=add(s,0,'battle',SC),twin=add(s,0,'hand','dmrp05-011');
 act(s,'play',a=>a.uid===twin.uid&&a.face===1);drain(s);assert.ok(has(s,0,'battle',twin));
 const charger=add(s,0,'hand','dmex04-016'),before=s.players[0].mana.length;
 act(s,'play',a=>a.uid===charger.uid&&a.face===0);drain(s);
 assert.ok(has(s,0,'battle',charger));assert.equal(s.players[0].mana.length,before);
 assert.ok(s.players[0].hand.length>=1);
 const miss=add(s,0,'hand','dm23ex3-024');
 act(s,'play',a=>a.uid===miss.uid&&a.face===1);drain(s);
 assert.ok(has(s,0,'mana',miss));assert.ok(!has(s,0,'battle',miss));
 s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===sc.uid));
 s.phase='main';cast(s,'dm01-070');choose(s,sc.uid);
 act(s,'replaceOmega',a=>a.label.includes('SC龍飛'));drain(s);assert.ok(has(s,0,'hand',sc));
});

test('Camp prevents destruction during battle but not destruction from Slayer afterward (QA46822)',()=>{
 for(const enemyId of [GREEN,'dmd05-003']){
  const s=field(),ally=add(s,0,'battle','dm01-050'),enemy=add(s,1,'battle',enemyId);
  ally.buff=0;enemy.buff=8000;enemy.tapped=true;
  cast(s,CAMP);choose(s,'battleSafe');choose(s,ally.uid);
  s.phase='attack';act(s,'attack',a=>a.uid===ally.uid&&a.target===enemy.uid);
  if(s.decision?.type==='block')act(s,'noBlock');drain(s);
  assert.equal(has(s,0,'battle',ally),enemyId===GREEN);
 }
});
