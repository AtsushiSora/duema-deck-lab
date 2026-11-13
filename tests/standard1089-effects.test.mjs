import test from 'node:test';
import assert from 'node:assert/strict';
import {act,attack,cast,drain,e,give,inst,setup} from './target-fixture.mjs';

const REV='dm26rp2-003', MIZU='dm25ex2-004', PRADOX='dm25ex2-028', ROD='dm23ex2-016', WADA='dm25ex2-023';
const GREEN='dm01-108', BLUE='dm01-083', FIRE='dm01-097', SPELL='dm01-093';
const add=(s,p,z,id)=>{const x=inst(id);s.players[p][z].push(x);return x;};
const field=()=>{const s=setup();s.active=0;for(const p of [0,1]){give(s,p,'grave',[]);give(s,p,'deck',Array(20).fill(GREEN));}return s;};
const choose=(s,v)=>act(s,'extended',a=>{const r=s.decision.choices[a.choice].value;return (r?.uid??r)===v;});
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

test('Revolt reveals a water creature at zero shields, evolves, and lets the attacker put its creature on top',()=>{
 const s=field(),enemy=add(s,0,'battle',FIRE),rev=add(s,1,'hand',REV),base=inst(BLUE);
 s.players[1].deck.unshift(base);s.players[1].shields=[];
 attack(s,enemy.uid);
 assert.equal(s.decision.player,1);choose(s,true);
 assert.ok(has(s,1,'battle',rev));assert.equal(rev.under[0].uid,base.uid);
 assert.equal(rev.summonedTurn,undefined);
 choose(s,enemy.uid);assert.equal(s.decision.player,0);
 choose(s,'deckTop');assert.equal(s.players[0].deck[0].uid,enemy.uid);
 assert.equal(s.winner,null);
});

test('Revolt’s normal evolution and attack also let the opponent choose the bottom',()=>{
 const s=field(),base=add(s,0,'battle',BLUE),first=add(s,1,'battle',GREEN),second=add(s,1,'battle',FIRE);
 cast(s,REV);act(s,'evolve',a=>a.baseUid===base.uid);choose(s,first.uid);choose(s,'deck');
 assert.equal(s.players[1].deck.at(-1).uid,first.uid);
 attack(s,s.players[0].battle[0].uid);choose(s,second.uid);choose(s,'deck');
 assert.equal(s.players[1].deck.at(-1).uid,second.uid);
 drain(s);
});

test('Mizuhanome mills only the first revealed creature and uses its own power for Rod Zorgia’s ability (QA47488)',()=>{
 const s=field(),big=add(s,1,'battle','dmrp07-s03'),small=add(s,1,'battle',FIRE);
 give(s,1,'deck',[SPELL,ROD,GREEN,GREEN]);
 const rod=s.players[1].deck[1],first=s.players[1].deck[0];
 cast(s,MIZU);assert.ok(has(s,1,'grave',rod));assert.ok(has(s,1,'deck',first));
 choose(s,true);
 assert.ok(e.getLegalActions(s).some(a=>a.targets?.some(x=>x.uid===small.uid)));
 assert.ok(!e.getLegalActions(s).some(a=>a.targets?.some(x=>x.uid===big.uid)));
 act(s,'effect',a=>a.targets.some(x=>x.uid===small.uid));assert.ok(has(s,1,'grave',small));
});

test('Mizuhanome respects the top-only reveal rule and grants one choice for a copied modal ability',()=>{
 const s=field();add(s,0,'battle','dmrp22-030');give(s,1,'deck',[SPELL,WADA,GREEN,GREEN]);
 cast(s,MIZU);assert.equal(s.players[1].grave.length,0);
 const t=field();give(t,1,'deck',[WADA,GREEN,GREEN]);cast(t,MIZU);choose(t,true);
 assert.equal(t.decision.choices.length,2);
 choose(t,1);
 assert.equal(t.players[0].hand.length,3);
});

test('Mizuhanome chooses only legal attack targets, before attacks and breaks are processed (QA47489–47492)',()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE),mizu=add(s,1,'battle',MIZU);
 mizu.tapped=true;add(s,1,'battle',GREEN);
 attack(s,attacker.uid);
 assert.equal(s.decision.player,1);
 assert.equal(attacker.tapped,false);
 const targets=e.getLegalActions(s).map(a=>a.target);
 assert.deepEqual(targets,['player',mizu.uid]);
 act(s,'g1089AttackTarget',a=>a.target===mizu.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.ok(has(s,0,'grave',attacker));
 assert.ok(has(s,1,'battle',mizu));
});

test('Mizuhanome is unselectable by opposing spells, then copies an entry ability at own start',()=>{
 const s=field(),mizu=add(s,1,'battle',MIZU),victim=add(s,1,'battle',GREEN);
 cast(s,'dm01-093');
 assert.ok(e.getLegalActions(s).some(a=>a.targets?.some(x=>x.uid===victim.uid)));
 assert.ok(!e.getLegalActions(s).some(a=>a.targets?.some(x=>x.uid===mizu.uid)));
 drain(s);
 give(s,0,'deck',[WADA,GREEN,GREEN]);s.phase='attack';act(s,'endTurn');
 choose(s,true);choose(s,1);
 assert.ok(s.players[0].grave.some(x=>x.cardId===WADA));
 assert.ok(s.players[1].hand.length>=3);
});

test('Pradox copied by Mizuhanome only offers the other civilizations if Mizuhanome was summoned (QA47487)',()=>{
 const s=field();give(s,1,'deck',[PRADOX,GREEN,GREEN]);give(s,0,'deck',[GREEN,BLUE,FIRE,GREEN,GREEN,GREEN]);
 cast(s,MIZU);choose(s,true);choose(s,'水');
 act(s,'extended',a=>a.cardId===BLUE);
 assert.equal(s.decision.task.op,'g34_PradoxRemaining1089');
 act(s,'extended',a=>a.cardId===FIRE);
 drain(s);
 assert.ok(s.players[0].battle.some(x=>x.cardId===BLUE));
 assert.ok(s.players[0].battle.some(x=>x.cardId===FIRE));
});

test('Pradox copied at the next turn start has no second deployment step',()=>{
 const s=field();add(s,0,'battle',MIZU);give(s,1,'deck',[PRADOX,GREEN,GREEN]);give(s,0,'deck',[GREEN,GREEN,BLUE,FIRE,GREEN,GREEN,GREEN]);
 s.active=1;s.phase='attack';act(s,'endTurn');choose(s,true);choose(s,'水');
 act(s,'extended',a=>a.cardId===BLUE);drain(s);
 assert.ok(s.players[0].battle.some(x=>x.cardId===BLUE));
 assert.ok(!s.players[0].battle.some(x=>x.cardId===FIRE));
});
