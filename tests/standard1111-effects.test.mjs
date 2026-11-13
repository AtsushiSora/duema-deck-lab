import test from 'node:test';
import assert from 'node:assert/strict';
import {act,cast,data,details,drain,e,give,inst,PRESETS} from './target-fixture.mjs';
import {readFileSync} from 'node:fs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const BRIGHT='dm25ex4-020', SIEGE='dmr05-021', CIGAR='dmx12b-006', ZERO='dmex15-b025';
const SEB='dm25ex4-040', GEO='dm25ex4-049', BOLSHACK='dm36-s07';
const LIGHT='dm01-075', WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', NATURE='dm01-108';
const TWIN='dm22ex1-030', SPIRAL='dm01-086', ESCAPE='dm23rp3-011', GENMU='dmrp15-km1';
const values=s=>s.decision?.choices?.map(c=>c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const pickCard=(s,x,back=false)=>act(s,'extended',a=>{
 const v=values(s)[a.choice];
 return v?.uid===x.uid&&!!v.g1104Back===back;
});

function table(extra=[]){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards:extra.map(id=>({id,count:1}))}));
 const s=e.createGame(decks,{seed:1111});
 s.phase='main';
 s.turn=3;
 for(const p of [0,1]){
  for(const zone of ['hand','battle','grave'])give(s,p,zone,[]);
  give(s,p,'mana',[LIGHT,WATER,DARK,FIRE,NATURE].flatMap(id=>Array(4).fill(id)));
  give(s,p,'shields',Array(5).fill(NATURE));
 }
 return s;
}

test('Brilliant Revival chooses different selected face names and deploys only after selection',()=>{
 let s=table([SEB,SEB,SEB,GEO,BOLSHACK]);
 const [first,second,third,geo,bolshack]=s.players[0].extra;
 cast(s,BRIGHT);
 pickCard(s,first);
 assert.equal(s.players[0].battle.length,0);
 assert.ok(!values(s).some(v=>v?.uid===first.uid));
 assert.ok(!values(s).some(v=>v?.uid===second.uid&&!v.g1104Back));
 s=JSON.parse(JSON.stringify(s));
 pickCard(s,second,true);
 assert.ok(!values(s).some(v=>v?.uid===third.uid));
 pickCard(s,geo,true);
 pickCard(s,bolshack,true);
 drain(s);
 assert.deepEqual(s.players[0].battle.map(x=>x.uid),[first.uid,second.uid,geo.uid,bolshack.uid]);
 assert.ok(s.players[0].extra.some(x=>x.uid===third.uid));
});

test('Brilliant Revival may choose zero and excludes non-Psychics and faces above cost fifteen',()=>{
 const s=table([GEO]),own=s.players[0],geo=own.extra[0];
 const over='phase1111-psychic-cost16';
 e.setCards([...data.cards,{...e.card(GEO),id:over,name:'Over-cost Psychic fixture',cost:16,g1085Back:undefined}]);
 try{
  own.extra.push(inst(over),inst(NATURE));
  cast(s,BRIGHT);
  assert.deepEqual(values(s).map(v=>v?.uid??null),[geo.uid,geo.uid,null]);
  pick(s,null);
  assert.deepEqual(own.battle,[]);
 }finally{e.setCards(data.cards);}
});

test('Knowledge Siege requires revealing one remaining hand card and draws its printed cost',()=>{
 const s=table(),own=s.players[0],shown=inst(WATER),start=own.deck.slice(0,2);
 own.hand.push(shown);
 cast(s,SIEGE);
 assert.deepEqual(values(s),[shown.uid]);
 pick(s,shown.uid);
 assert.deepEqual(own.hand,[shown,...start]);
 assert.ok(s.log.some(row=>row.type==='reveal'&&row.cardId===shown.cardId));
 const empty=table(),before=empty.players[0].deck.length;
 cast(empty,SIEGE);
 assert.equal(empty.decision,null);
 assert.equal(empty.players[0].deck.length,before);
});

test('Knowledge Siege lets its caster choose one printed Twinpact cost after reveal',()=>{
 for(const count of [3,7]){
  const s=table(),own=s.players[0],twin=inst(TWIN),top=own.deck.slice(0,count);
  own.hand.push(twin);
  cast(s,SIEGE);
  pick(s,twin.uid);
  assert.deepEqual(values(s),[7,3]);
  pick(s,count);
  assert.deepEqual(own.hand,[twin,...top]);
 }
});

test('Knowledge Siege can reference a printed infinite cost with the last-card replacement',()=>{
 const s=table(),own=s.players[0],revealed=inst(GENMU);
 give(s,0,'deck',[NATURE,WATER]);
 own.hand.push(revealed);
 own.battle.push(inst('dmrp03-s03'));
 cast(s,SIEGE);
 pick(s,revealed.uid);
 assert.equal(s.winner,0);
 assert.equal(own.deck.length,0);
});

test('Cigarros draws first, stacks its bonus, and the bonus survives until the creature leaves',()=>{
 const s=table(),own=s.players[0],target=inst(WATER),enemy=inst(FIRE),top=own.deck[0];
 own.battle.push(target);
 s.players[1].battle.push(enemy);
 for(const power of [2000,3000]){
  cast(s,CIGAR);
  assert.ok(own.hand.includes(top));
  assert.deepEqual(values(s).map(v=>v.uid),[target.uid]);
  pickCard(s,target);
  assert.equal(e.power(target,false,s),power);
 }
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(e.power(target,false,s),3000);
 s.phase='attack';
 act(s,'endTurn');
 s.phase='main';
 cast(s,SPIRAL);
 act(s,'effect',a=>a.targets[0].uid===target.uid);
 act(s,'play',a=>a.uid===target.uid);
 assert.equal(e.power(target,false,s),1000);
});

test('Cigarros draws even without an allied creature',()=>{
 const s=table(),top=s.players[0].deck[0];
 s.players[1].battle.push(inst(FIRE));
 cast(s,CIGAR);
 assert.deepEqual(s.players[0].hand,[top]);
 assert.equal(s.decision,null);
});

test('Eternal Nothingness fixes power before the spell goes to grave (QA 39748)',()=>{
 const s=table(),own=s.players[0],opp=s.players[1];
 const target=inst(ESCAPE),unused=inst(FIRE);
 target.powerModifiers=[{amount:10000}];
 opp.battle.push(target,unused);
 cast(s,ZERO);
 pickCard(s,target);
 assert.equal(e.power(target,false,s),0);
 assert.equal(own.grave.some(x=>x.cardId===ZERO),false);
 assert.ok(s.extSpells.some(x=>x.inst.cardId===ZERO));
 drain(s);
 assert.ok(opp.grave.includes(target));
 assert.ok(opp.battle.includes(unused));
 assert.ok(own.grave.some(x=>x.cardId===ZERO));
});

test('Eternal Nothingness is ignored when Genmu suppresses cost-five spells',()=>{
 const s=table(),opp=s.players[1],target=inst(WATER);
 opp.battle.push(target,inst(GENMU));
 cast(s,ZERO);
 assert.ok(opp.battle.includes(target));
 assert.equal(s.decision,null);
});

test('Official definitions match the source text, stats and art without changing the prior compiler phase',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1111.json',import.meta.url),'utf8'));
 for(const row of manifest.cards){
  const detail=details.cards.find(x=>x.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1111}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:1110}));
  assert.deepEqual(c.g34Tasks,row.spec.g34Tasks);
  assert.equal(c.limit,manifest.regulationVerification.limits[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
});

test('Knowledge Siege preserves draw replacements after the library is empty',()=>{
 const s=table(),own=s.players[0],revealed=inst(GENMU);
 const bigBang=inst('dmrp20-s10');
 const revived=[inst(WATER),inst(NATURE)];
 give(s,0,'deck',[FIRE]);
 own.hand.push(revealed);
 own.battle.push(bigBang);
 own.grave.push(...revived);
 cast(s,SIEGE);
 pick(s,revealed.uid);
 assert.equal(s.decision.task.op,'g10_Draws');
 for(const x of revived)pick(s,x.uid);
 assert.equal(s.decision,null);
 assert.equal(s.winner,null);
 assert.deepEqual(own.battle,[bigBang,...revived]);
});

test('Eternal Nothingness expires after the turn when destruction is prevented',()=>{
 const s=table(),opp=s.players[1],target=inst(NATURE);
 target.g34Grants=[{turn:s.turn,g465DestroySafe:true}];
 opp.battle.push(target);
 cast(s,ZERO);
 pickCard(s,target);
 assert.ok(opp.battle.includes(target));
 assert.equal(e.matchupPower(target,null,false,s),0);
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(e.power(target,false,s),2000);
 assert.ok(opp.battle.includes(target));
});
