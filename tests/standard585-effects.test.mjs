import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {shieldCards,shieldGroup} from '../dist/shield-state.js';
import {manualScreenHTML,newManualUI} from '../dist/manual-ui.js';
import {STANDARD585_DECK} from '../tools/fixtures/standard585.mjs';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-585.json',import.meta.url)));
const EVIL='dmex17-087', TICO='dm09-024', CHARGER='dmr17-072', MIND='dm02-043', LIQUID='dm03-043';
const DAN='dmr20-049', MAGNUS='dm26-045', WHITE='dmx11-004', AXE='dm26-047', SITO='dmrp16-062', ADMIS='dm06-043';
const FIRE='dm01-097', DARK='dm01-090', WATER='dm01-083', NATURE='dm01-108', ST='dm01-027';
const EXLIFE='dm23ex2-016', REDIRECT='dm22ex1-086', BLOCKER='dm01-001', HIDDEN='dm25rp3-S09';

function field(active=0){
  const s=setup();
  s.active=active;
  for(const p of [0,1])give(s,p,'deck',Array(26).fill(FIRE));
  return s;
}
function put(s,p,id,zone='battle'){
  const x=inst(id);
  s.players[p][zone].push(x);
  return x;
}
function play(s,id){
  const x=put(s,s.active,id,'hand');
  act(s,'play',a=>a.uid===x.uid);
  return x;
}
const choices=s=>s.decision?.choices??[];
const value=o=>o.value?.uid??o.value;
const targets=s=>choices(s).map(value);
const uids=rows=>rows.map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>value(choices(s)[a.choice])===v);}
const seen=s=>s.decision?.task?.g585Peek?.map(x=>x.id);
const markup=(s,mobile)=>manualScreenHTML(s,{...newManualUI(),mobile,mobilePanel:'actions'},{art:id=>'<img data-card="'+id+'">',icon:()=>''});

for(const row of cards)test(row.name+' matches the complete verified card and print',()=>{
  const detail=details.cards.find(d=>d.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:585}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:584}));
  for(const [key,expected] of Object.entries(row.spec))assert.deepEqual(c[key],expected);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
});

for(const n of [1,2,3])test('Mind Search privately sees up to three selected shields '+n,()=>{
  let s=field();
  give(s,1,'shields',[HIDDEN,WATER,DARK,NATURE]);
  const [a,b,c]=s.players[1].shields;
  a.shieldStack=[inst(FIRE)];
  const shields=structuredClone(s.players[1].shields);
  play(s,MIND);
  const before=physical(s);
  for(const [i,x] of [a,b,c].slice(0,n).entries()){
    assert.ok(choices(s).every(o=>!o.cardId));
    pick(s,x.uid);
    assert.deepEqual(seen(s),i===0?[HIDDEN,FIRE]:[x.cardId]);
    if(i===0)s=JSON.parse(JSON.stringify(s));
    pick(s,null);
  }
  if(n<3)pick(s,null);
  assert.equal(s.decision,null);
  assert.deepEqual(s.players[1].shields,shields);
  assert.deepEqual(physical(s),before);
  assert.ok(!JSON.stringify(s.log).includes(HIDDEN));
  assert.ok(!JSON.stringify(e.observation(s,1)).includes(HIDDEN));
});

for(const id of [TICO,LIQUID])test(id+' shows every physical shield and only Liquid also sees the hand',()=>{
  const s=field();
  give(s,1,'shields',[WATER,DARK]);
  s.players[1].shields[0].shieldStack=[inst(HIDDEN)];
  give(s,1,'hand',[FIRE,NATURE]);
  play(s,id);
  assert.deepEqual(seen(s),[WATER,HIDDEN,DARK,...(id===LIQUID?[FIRE,NATURE]:[])]);
  for(const mobile of [false,true]){
    const html=markup(s,mobile);
    assert.match(html,/aria-label="確認したカード"/);
    assert.ok(html.includes('data-id="'+HIDDEN+'"'));
    assert.ok(html.includes('相手のシールド 1'));
  }
  assert.ok(!JSON.stringify(e.observation(s,1)).includes(HIDDEN));
  pick(s,null);
  assert.ok(!markup(s,true).includes('data-card="'+HIDDEN+'"'));
  assert.equal(s.players[1].hand.length,2);
});

test('private shield inspection for the other player stays off the manual screen',()=>{
  const s=field(1);
  give(s,0,'shields',[HIDDEN]);
  play(s,TICO);
  assert.equal(s.decision.player,1);
  assert.deepEqual(seen(s),[HIDDEN]);
  assert.ok(!markup(s,true).includes('data-card="'+HIDDEN+'"'));
});

test('Liquid Scope can be used from a shield by its printed trigger',()=>{
  const s=field(1),a=put(s,1,FIRE),liquid=inst(LIQUID);
  s.players[0].shields=[liquid];
  give(s,1,'hand',[DARK]);
  attack(s,a.uid);
  act(s,'noBlock');
  act(s,'useTrigger',x=>x.uid===liquid.uid);
  assert.ok(seen(s).includes(DARK));
  pick(s,null);
  assert.ok(uids(s.players[0].grave).includes(liquid.uid));
});

for(const id of [CHARGER,AXE,MAGNUS])test(id+' resolves the remaining ability after shield confirmation',()=>{
  const s=field(),x=s.players[1].shields[0],b=put(s,1,BLOCKER),top=s.players[0].deck[0],n=s.players[0].mana.length;
  const source=play(s,id);
  pick(s,x.uid);
  assert.equal(s.players[0].mana.length,n);
  pick(s,null);
  if(id===MAGNUS){pick(s,b.uid);assert.ok(uids(s.players[1].grave).includes(b.uid));}
  else assert.ok(uids(s.players[0].mana).includes(id===AXE?top.uid:source.uid));
});

test('Admis taps instead of attacking and may inspect either player’s shield',()=>{
  const s=field(),source=put(s,0,ADMIS),x=s.players[0].shields[0];
  s.phase='attack';
  act(s,'tapAbility',a=>a.uid===source.uid);
  assert.equal(source.tapped,true);
  assert.deepEqual(new Set(choices(s).map(o=>o.value.player)),new Set([0,1]));
  pick(s,x.uid);
  assert.deepEqual(seen(s),[x.cardId]);
  pick(s,null);
  assert.ok(!s.attack);
});

test('Dan Darts inspects only on the first own attack of the turn',()=>{
  const s=field(),first=put(s,0,FIRE),second=put(s,0,WATER);
  put(s,0,DAN);
  attack(s,first.uid);
  pick(s,s.players[1].shields[0].uid);
  pick(s,null);
  act(s,'noBlock');
  attack(s,second.uid);
  assert.notEqual(s.decision?.task?.op,'g34_Peek585');
});

for(const index of [0,1])test('Sito swaps only the selected physical shield card in a stack '+index,()=>{
  let s=field();
  give(s,0,'shields',[WATER,DARK]);
  const [a,b]=s.players[0].shields;
  a.shieldStack=[inst(HIDDEN),inst(NATURE)];
  const stack=shieldCards(a),chosen=stack[index],top=s.players[0].deck[0],group=shieldGroup(a);
  const ex=put(s,0,EXLIFE);
  ex.exLifeShieldUid=group;
  play(s,SITO);
  const before=physical(s);
  pick(s,chosen.uid);
  assert.deepEqual(seen(s),[chosen.cardId]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,true);
  assert.equal(s.players[0].deck[0].uid,chosen.uid);
  assert.deepEqual(uids(shieldCards(s.players[0].shields[0])),uids(stack.map(x=>x.uid===chosen.uid?top:x)));
  assert.equal(shieldGroup(s.players[0].shields[0]),group);
  assert.equal(s.players[0].shields[1].uid,b.uid);
  assert.equal(s.players[0].battle[0].exLifeShieldUid,group);
  assert.ok(shieldCards(s.players[0].shields[0]).slice(1).every(x=>!x.shieldStack));
  assert.deepEqual(physical(s),before);
});

test('Sito creates a new shield identity and clears the removed EX Life reference',()=>{
  const s=field(),x=s.players[0].shields[0],top=s.players[0].deck[0],ex=put(s,0,EXLIFE);
  ex.exLifeShieldUid=x.uid;
  play(s,SITO);
  pick(s,x.uid);
  pick(s,true);
  assert.equal(s.players[0].shields[0].uid,top.uid);
  assert.equal(s.players[0].deck[0].uid,x.uid);
  assert.equal(ex.exLifeShieldUid,undefined);
});

test('Sito can swap the last card without emptying the deck',()=>{
  const s=field(),shield=s.players[0].shields[0];
  give(s,0,'deck',[FIRE]);
  play(s,SITO);
  pick(s,shield.uid);
  pick(s,true);
  assert.equal(s.players[0].deck[0].uid,shield.uid);
  assert.equal(s.winner,null);
});

for(const blocked of [true,false])test('Sito can inspect without replacing its shield '+blocked,()=>{
  const s=field(),shield=s.players[0].shields[0],top=s.players[0].deck[0];
  if(blocked)put(s,1,REDIRECT);
  play(s,SITO);
  pick(s,shield.uid);
  assert.deepEqual(seen(s),[shield.cardId]);
  assert.equal(targets(s).includes(true),!blocked);
  pick(s,null);
  assert.equal(s.players[0].shields[0].uid,shield.uid);
  assert.equal(s.players[0].deck[0].uid,top.uid);
});

for(const accept of [true,false])test('White Galaga can take a shield at own turn start without S Trigger '+accept,()=>{
  const s=field(1),shield=inst(ST);
  s.players[0].shields=[shield];
  put(s,0,WHITE);
  s.phase='attack';
  act(s,'endTurn');
  assert.equal(s.decision.player,0);
  pick(s,accept?shield.uid:null);
  assert.equal(uids(s.players[0].hand).includes(shield.uid),accept);
  assert.ok(!s.triggers);
  assert.equal(s.phase,'charge');
});

for(const n of [4,7])test('Evil Eye counts shields after recovery and floors the discard at zero '+n,()=>{
  const s=field();
  give(s,0,'shields',Array(n).fill(ST));
  give(s,1,'hand',[WATER,FIRE,DARK]);
  const target=s.players[0].shields[0];
  play(s,EVIL);
  pick(s,target.uid);
  assert.ok(uids(s.players[0].hand).includes(target.uid));
  assert.equal(s.players[1].grave.length,n===4?2:0);
  assert.ok(!s.triggers);
});

test('legal forty CPU match finishes through JSON continuation conserving cards',()=>{
  assert.deepEqual(e.validateDeck(STANDARD585_DECK),[]);
  let s=e.createGame([STANDARD585_DECK,PRESETS[0]],{seed:58501,first:0}),saved=false;
  const before=physical(s);
  while(s.winner===null&&s.actions<3000&&s.turn<160){
    e.step(s,e.chooseAI(s));
    assert.deepEqual(physical(s),before);
    if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}
  }
  assert.ok(saved);
  assert.notEqual(s.winner,null);
  assert.equal(new Set(physical(s)).size,80);
});
