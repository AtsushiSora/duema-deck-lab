import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const OCCULT='dmr14-012',AVATAR='dm26rp2-036',BRAIZE='dm26rp1-S005';
const N='dm01-108',D='dm01-090',F='dm01-097',BAKI='dmex17-071',LAB='dmrp05-046';
const DECISION='dm26rp1-011',PLUS='dm26rp1-065',SIGN='dmr13-016';
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(16).fill(N));give(s,p,'grave',[]);}
 return s;
}
function add(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);
const plays=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid);
const play=(s,x,alt=false)=>act(s,'play',a=>a.uid===x.uid&&!!a.alternative===alt);

test('three canonical cards and three reprints match official faces, images and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1148.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[OCCULT,AVATAR,BRAIZE]);
 assert.equal(m.printAliases.length,3);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1148}),row.spec);
  assert.deepEqual(row.spec,m.cards.find(x=>x.id===id).spec);
  assert.equal(c.power,Number.parseInt(f.powerText));
  assert.equal(c.cost,f.cost);
  assert.deepEqual(c.civilizations,f.civilizations);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(catalogue.get(row.id).id,id);
  assert.equal(catalogue.byName.get(nameKey(row.name)).id,id);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Occult pays three creatures with no mana and recovers a creature on attack',()=>{
 const s=field(),own=s.players[0],x=add(s,0,'hand',OCCULT);
 const a=add(s,0,'battle',N),b=add(s,0,'battle',D);
 give(s,0,'mana',[]);
 assert.equal(plays(s,x).length,0);
 const lab=add(s,0,'battle',LAB),enemyHand=add(s,1,'hand',N);
 play(s,x,true);pick(s,lab.uid);pick(s,a.uid);
 assert.deepEqual(own.grave,[]);
 pick(s,b.uid);
 assert.deepEqual(new Set(own.grave),new Set([a,b,lab]));
 assert.ok(own.battle.includes(x)&&s.players[1].hand.includes(enemyHand));
 assert.equal(own.mana.length,0);
 s.turn++;attack(s,x.uid);
 pick(s,a.uid);
 assert.ok(own.hand.includes(a));
 assert.equal(e.card(x).breaker,2);
});

test('Occult replacement payment and Baki entry replacement are independent (QA 40394)',()=>{
 const s=field(),own=s.players[0],x=add(s,0,'hand',OCCULT);
 const a=add(s,0,'battle',N);
 const b=add(s,0,'hand',F),c=add(s,0,'hand',D);
 add(s,1,'battle',BAKI);play(s,b);play(s,c);
 const before=own.mana.filter(y=>y.tapped).length;
 play(s,x,true);pick(s,a.uid);pick(s,b.uid);pick(s,c.uid);
 assert.deepEqual(own.grave,[a,b,c,x]);
 assert.deepEqual(own.battle,[]);
 assert.equal(own.enteredThisTurn,2);
 assert.equal(own.mana.filter(y=>y.tapped).length,before);
});

test('Occult ignores further replacements during payment and excludes protected creatures',()=>{
 const s=field(),own=s.players[0],x=add(s,0,'hand',OCCULT);
 const protectedCreature=add(s,0,'battle',N,{g26Stay:1});
 const ex=add(s,0,'battle','dmrp17-s11',{exLifeShieldUid:own.shields[0].uid});
 const a=add(s,0,'battle',N),b=add(s,0,'battle',D);
 const shield=own.shields[0];
 play(s,x,true);
 assert.ok(!s.decision.choices.some(c=>c.value===protectedCreature.uid));
 pick(s,ex.uid);pick(s,a.uid);pick(s,b.uid);
 assert.ok(own.grave.includes(ex)&&own.shields.includes(shield)&&own.battle.includes(x));
});

test('Avatar offers normal and reduced summon, cancels cleanly, and applies reduction through EX Life',()=>{
 const s=field(),own=s.players[0],x=add(s,0,'hand',AVATAR);
 const shield=own.shields[0],ex=add(s,0,'battle','dmrp17-s11',{exLifeShieldUid:shield.uid});
 assert.deepEqual(plays(s,x).map(a=>a.cost),[7,3]);
 play(s,x,true);pick(s,null);
 assert.ok(own.hand.includes(x)&&own.shields.includes(shield));
 give(s,0,'mana',[D,D]);
 assert.equal(plays(s,x).length,0);
 give(s,0,'mana',[D,D,D]);play(s,x,true);pick(s,ex.uid);drain(s);
 assert.ok(own.battle.includes(x)&&own.battle.includes(ex)&&own.grave.includes(shield));
 assert.ok(own.mana.every(y=>y.tapped));
 assert.ok(e.effectiveCard(x,s).blocker&&e.card(x).breaker===2);
});

test('Braize requires two shields, a creature and dark mana to summon from the grave',()=>{
 const s=field(),own=s.players[0],x=add(s,0,'grave',BRAIZE);
 give(s,0,'mana',[D,D,D]);
 assert.equal(plays(s,x).length,0);
 const ally=add(s,0,'battle',N);
 give(s,0,'shields',[N]);assert.equal(plays(s,x).length,0);
 give(s,0,'shields',[N,N]);give(s,0,'mana',[N,N,N]);assert.equal(plays(s,x).length,0);
 give(s,0,'mana',[D,N,N]);assert.equal(plays(s,x)[0].cost,3);
 play(s,x,true);pick(s,ally.uid);drain(s);
 assert.ok(own.battle.includes(x)&&own.grave.includes(ally));
 assert.equal(own.shields.length,0);
 assert.ok(own.mana.every(y=>y.tapped));
});

test('Braize untaps when an allied creature is destroyed after entry',()=>{
 const s=field(),x=add(s,0,'battle',BRAIZE,{tapped:true}),ally=add(s,0,'battle',N);
 s.active=1;play(s,add(s,1,'hand','dm01-027'));
 act(s,'effect',a=>a.targets[0].uid===ally.uid);
 assert.equal(x.tapped,false);
 assert.ok(s.players[0].grave.includes(ally));
});

test('Braize starts the nested shield trigger sequence in QA 49147',()=>{
 const s=field(),x=add(s,0,'grave',BRAIZE),ally=add(s,0,'battle',N);
 give(s,0,'mana',[D,D,D]);
 give(s,0,'shields',[DECISION,SIGN]);give(s,1,'shields',[PLUS,N]);
 const [spell,sign]=s.players[0].shields,[plus,other]=s.players[1].shields;
 play(s,x,true);pick(s,ally.uid);pick(s,spell.uid);pick(s,sign.uid);
 act(s,'useTrigger',a=>a.uid===spell.uid);act(s,'useTrigger',a=>a.uid===sign.uid);
 act(s,'orderTrigger',a=>a.uid===spell.uid);
 pick(s,2);pick(s,2);pick(s,plus.uid);
 assert.equal(s.decision.uid,plus.uid);
 act(s,'useTrigger',a=>a.uid===plus.uid);
 assert.ok(s.players[1].shields.includes(other)&&s.players[0].hand.includes(sign));
 act(s,'extended');pick(s,other.uid);drain(s);
 assert.ok(s.players[1].grave.includes(plus)&&s.players[1].hand.includes(other));
 assert.ok(s.players[0].grave.includes(spell)&&s.players[0].grave.includes(sign));
});

test('summon restrictions prevent sacrifice declarations and a reduction lock only affects Avatar',()=>{
 const s=field(),occult=add(s,0,'hand',OCCULT),avatar=add(s,0,'hand',AVATAR);
 for(let i=0;i<3;i++)add(s,0,'battle',N);
 add(s,1,'battle','dmrp22-027');
 assert.deepEqual(plays(s,avatar).map(a=>a.cost),[7]);
 assert.ok(plays(s,occult).some(a=>a.alternative));
 (s.extLimits??=[]).push({kind:'entryCost',player:0,max:8});
 assert.equal(plays(s,occult).length,0);
 assert.equal(s.players[0].battle.length,3);
});
