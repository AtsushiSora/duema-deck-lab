import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const JASHIN='dm22sd1-001',DORAN='dm22rp1-2B',MOMO='dmsd20-001';
const RITUAL='dmrp17-010',GAIA='dmex17-021',DARK='dm01-090',LIGHT='dm01-075',FIRE='dm01-097',SEED='dmrp22-048';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(FIRE));
 return s;
}
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
function endTurn(s){
 s.phase='attack';
 act(s,'endTurn');
}

test('phase 1176 definitions retain canonical IDs and official print aliases',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1176.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.equal(m.cards.length,3);
 assert.equal(m.printAliases.length,3);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.deepEqual([c.type,c.cost,c.race,c.power,c.limit],['creature',f.cost,f.race,+f.powerText,4]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1176}),row.spec);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1176}));
 }
});

test('Ritual can deploy Jashin without granting blocker or a battle (QA41993)',()=>{
 const s=field(),j=put(s,0,'grave',JASHIN),enemy=put(s,1,'battle',FIRE);
 cast(s,RITUAL);
 pick(s,j.uid);
 assert.ok(s.players[0].battle.includes(j));
 assert.equal(s.decision,null);
 assert.equal(e.effectiveCard(j,s).type,'seed');
 assert.ok(s.players[1].battle.includes(enemy));
 for(let i=0;i<3;i++)put(s,0,'battle',DARK);
 assert.equal(e.effectiveCard(j,s).type,'creature');
 assert.ok(!e.effectiveCard(j,s).blocker);
});

for(const mill of [false,true])test('Jashin can revive even if its optional turn-start mill is declined: '+mill,()=>{
 const s=field(),own=s.players[0];
 const j=put(s,0,'battle',JASHIN);
 const saved=put(s,0,'grave',DARK),top=inst(DARK);own.deck.unshift(top);
 s.active=1;
 endTurn(s);
 assert.equal(e.effectiveCard(j,s).type,'seed');
 assert.equal(s.decision.task.op,'g34_Mill');
 pick(s,mill?true:null);
 assert.equal(s.decision.task.op,'g34_Select');
 pick(s,mill?top.uid:saved.uid);
 drain(s);
 assert.ok(own.battle.includes(mill?top:saved));
});

test('Jashin already in play stays a tamaseed when Genmu enters until its condition is met (QA41998)',()=>{
 const s=field(),own=s.players[0];
 const j=put(s,0,'battle',JASHIN);
 put(s,1,'battle',GEN);
 assert.equal(e.isCreature(s,j),false);
 for(let i=0;i<3;i++)put(s,0,'battle',DARK);
 assert.equal(e.isCreature(s,j),true);
 const ally=own.battle.at(-1);
 cast(s,LIGHT);
 own.battle.splice(own.battle.indexOf(ally),1);
 assert.equal(e.isCreature(s,j),true);
});

for(const genmu of [false,true])test('Doran satisfies the Gaiaash entry condition only with Genmu in this position: '+genmu,()=>{
 const s=field(),d=put(s,0,'grave',DORAN);
 if(genmu)put(s,0,'battle',GEN);
 put(s,1,'hand',GAIA);
 cast(s,RITUAL);
 pick(s,d.uid);
 drain(s);
 assert.equal(e.isCreature(s,d),genmu);
 endTurn(s);
 assert.equal(s.decision?.type==='gaiaDeclare',genmu);
});

test('Doran taps up to two opponents and locks their next start untap while it is a tamaseed',()=>{
 const s=field(),a=put(s,1,'battle',FIRE),b=put(s,1,'battle',FIRE),c=put(s,1,'battle',FIRE);
 cast(s,DORAN);
 pick(s,a.uid);
 pick(s,b.uid);
 assert.ok(a.tapped&&b.tapped&&!c.tapped);
 endTurn(s);
 assert.ok(a.tapped&&b.tapped&&!c.tapped);
});

test('Doran counts allies after deployment and protects the creatures present through the opponent turn',()=>{
 const s=field(),d=put(s,0,'battle',DORAN);
 for(let i=0;i<3;i++)put(s,0,'battle',LIGHT);
 const deploy=put(s,0,'hand',DARK),target=put(s,1,'battle',FIRE,{tapped:true});
 for(let i=0;i<3;i++)put(s,1,'battle',FIRE);
 attack(s,d.uid,target.uid);
 pick(s,deploy.uid);
 drain(s);
 assert.ok(s.players[0].battle.includes(deploy));
 assert.ok(s.extLimits.some(l=>l.ref?.uid===deploy.uid&&l.grant?.g465DestroySafe));
 endTurn(s);
 assert.ok(s.extLimits.some(l=>l.ref?.uid===deploy.uid&&l.grant?.g465DestroySafe));
});

for(const keepNew of [false,true])test('S-MAX keeps one Momoking before the Ritual battle: '+keepNew,()=>{
 const s=field(),earlier=put(s,0,'battle',MOMO),latter=put(s,0,'grave',MOMO),enemy=put(s,1,'battle',FIRE);
 cast(s,RITUAL);
 pick(s,latter.uid);
 assert.equal(s.decision.task.op,'g15_SmaxKeep');
 pick(s,(keepNew?latter:earlier).uid);
 if(keepNew){
  assert.equal(s.decision.task.op,'g34_FightEnemy240');
  pick(s,enemy.uid);
 }
 assert.equal(s.decision,null);
 assert.ok(s.players[0].hand.includes(keepNew?earlier:latter));
 assert.equal(s.players[1].grave.includes(enemy),keepNew);
});

test('Momoking requires no evolution base and can attack, draw and deploy a tamaseed',()=>{
 const s=field(),own=s.players[0],seed=put(s,0,'hand',SEED);
 cast(s,MOMO);
 const [momo]=own.battle,hand=own.hand.length;
 attack(s,momo.uid);
 assert.equal(own.hand.length,hand+1);
 assert.equal(s.decision.task.op,'g34_Select');
 pick(s,seed.uid);
 drain(s);
 assert.ok(own.battle.includes(seed));
});

test('Never leaves Jashin on the battlefield when it enters as a tamaseed (QA41994)',()=>{
 const s=field(),j=put(s,0,'hand',JASHIN),spell=put(s,0,'hand','dmrp12-s01');
 act(s,'play',a=>a.uid===spell.uid&&a.face===1);
 pick(s,j.uid);
 assert.ok(s.players[0].battle.includes(j));
 assert.equal(e.isCreature(s,j),false);
});

for(const grow of [false,true])test('Abyss Rush applies to Jashin after it becomes a creature: '+grow,()=>{
 const s=field(),j=put(s,0,'grave',JASHIN),own=s.players[0];
 put(s,0,'battle','dm22rp1-1B');
 act(s,'play',a=>a.uid===j.uid&&a.manaPermit==='abyssRush');
 assert.equal(e.isCreature(s,j),false);
 if(grow){cast(s,DARK);cast(s,DARK);}
 s.phase='attack';
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===j.uid&&a.target==='player'),grow);
 endTurn(s);
 drain(s);
 assert.equal(own.deck.includes(j),grow);
 assert.equal(own.battle.includes(j),!grow);
});

for(const discard of [false,true])test('Momoking can prevent a direct attack loss using the field or hand copy: '+discard,()=>{
 const s=field(),defender=s.players[1];
 defender.shields=[];
 const attacker=put(s,0,'battle',FIRE),body=put(s,1,'battle',MOMO),copy=put(s,1,'hand',MOMO);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.ok(s.lossEvent);
 act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===(discard?copy:body).uid);
 assert.equal(s.winner,null);
 assert.ok(defender.grave.includes(discard?copy:body));
});
