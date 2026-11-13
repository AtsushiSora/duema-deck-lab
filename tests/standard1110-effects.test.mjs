import test from 'node:test';
import assert from 'node:assert/strict';
import {act,cast,drain,e,give,inst,PRESETS} from './target-fixture.mjs';

const GAGA='dm25ex4-037', SEB='dm25ex4-040', ZABI='dm25ex4-043';
const GILL='dm25ex4-046', GEO='dm25ex4-049', OFLAME='dm36-059';
const WHITE_RED='dmr03-050', BLUE_RED='dmr03-052', BLUE_GREEN='dmr03-053', BLACK_GREEN='dmr03-054';
const GAIARL='dmr01-034', SPIRAL='dm01-086', QQ='dmrp07-m01';
const LIGHT='dm01-075', WATER='dm01-083', DARK='dm01-087', FIRE='dm01-097', NATURE='dm01-108';
const colors=[LIGHT,WATER,DARK,FIRE,NATURE];
const values=s=>s.decision?.choices?.map(c=>c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const select=(s,x,back=false)=>act(s,'extended',a=>{
 const value=values(s)[a.choice];
 return value?.uid===x.uid&&!!value.g1104Back===back;
});
const selectReduction=(s,x)=>pick(s,values(s).find(value=>typeof value==='string'&&value.startsWith(x.uid+'@')));
const spent=s=>s.players[0].mana.filter(x=>x.tapped).length;

function table(ids=[GAGA,SEB,ZABI,GILL,GEO]){
 const extraCards=ids.map(id=>({id,count:1}));
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards}));
 const s=e.createGame(decks,{seed:1110});
 s.phase='main';
 s.turn=3;
 for(const p of [0,1]){
  for(const zone of ['hand','battle','grave'])give(s,p,zone,[]);
  give(s,p,'mana',colors.flatMap(id=>Array(4).fill(id)));
  give(s,p,'shields',Array(5).fill(NATURE));
 }
 return s;
}

function deploy(s,hole,id,back=true){
 const own=s.players[s.active],target=own.extra.find(x=>x.cardId===id);
 cast(s,hole);
 select(s,target,back);
 assert.ok(own.battle.includes(target));
 assert.equal(!!target.g1085Awakened,back);
 return target;
}

test('GQ 亜空-6110 makes the chosen top card a shield and moves the other to grave',()=>{
 const s=table(),own=s.players[0],top=own.deck.slice(0,2);
 deploy(s,WHITE_RED,GAGA);
 assert.deepEqual(values(s),top.map(x=>x.uid));
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),top.map(x=>x.cardId));
 pick(s,top[1].uid);
 assert.equal(own.shields.at(-1),top[1]);
 assert.ok(!top[1].faceUp);
 assert.ok(own.grave.includes(top[0]));
});

test('GQ 舞覇-10 discards a chosen card and draws two, including with an empty hand',()=>{
 for(const hasHand of [false,true]){
  const second=table(),controller=second.players[0],draw=controller.deck.slice(0,2);
  if(hasHand)give(second,0,'hand',[FIRE,NATURE]);
  const [discard,keep]=controller.hand;
  deploy(second,BLUE_RED,SEB);
  if(hasHand){
   pick(second,discard.uid);
   assert.ok(controller.grave.includes(discard));
   assert.ok(controller.hand.includes(keep));
  }
  assert.deepEqual(controller.hand.slice(-2),draw);
 }
});

test('GQ 怖鼠-0 puts one selected card into mana tapped and the other into grave',()=>{
 const s=table(),own=s.players[0],top=own.deck.slice(0,2);
 deploy(s,BLACK_GREEN,ZABI);
 assert.deepEqual(values(s),top.map(x=>x.uid));
 pick(s,top[0].uid);
 assert.equal(own.mana.at(-1),top[0]);
 assert.equal(top[0].tapped,true);
 assert.ok(own.grave.includes(top[1]));
});

test('GQ 突風-890 may break one opposing shield or decline',()=>{
 for(const accept of [true,false]){
  const s=table(),opp=s.players[1],shield=opp.shields[2];
  deploy(s,WHITE_RED,GILL);
  pick(s,accept?shield.uid:null);
  assert.equal(opp.shields.length,accept?4:5);
  assert.equal(opp.hand.includes(shield),accept);
 }
});

test('GQ 笑沙-4 may add the looked-at card to hand or mana, or leave it on top',()=>{
 for(const destination of ['hand','mana',null]){
  const s=table(),own=s.players[0],top=own.deck[0];
  deploy(s,BLUE_GREEN,GEO);
  assert.deepEqual(values(s),[top.uid,null]);
  pick(s,destination?top.uid:null);
  if(destination)pick(s,destination);
  assert.equal(own[destination||'deck'].includes(top),true);
  if(!destination)assert.equal(own.deck[0],top);
 }
});

test('Q.Q.QX. prevents the looked-at card from moving (QA 31782)',()=>{
 const s=table(),own=s.players[0],before=own.deck.slice();
 s.players[1].battle.push(inst(QQ));
 deploy(s,BLUE_GREEN,GEO);
 assert.equal(s.decision,null);
 assert.deepEqual(own.deck,before);
 assert.equal(own.hand.length,0);
});

test('Seb can save the reduction, use it on a spell, and cannot also use it for a creature that turn',()=>{
 const s=table(),own=s.players[0],enemy=inst(FIRE);
 s.players[1].battle.push(enemy);
 const seb=deploy(s,BLUE_RED,SEB,false);
 let before=spent(s);
 cast(s,WATER);
 assert.equal(s.decision.task.op,'g34_PayOnce464');
 pick(s,null);
 assert.equal(spent(s)-before,2);
 assert.equal(e.summonCost(s,0,e.card(SPIRAL)),1);
 before=spent(s);
 cast(s,SPIRAL);
 selectReduction(s,seb);
 pick(s,null);
 drain(s);
 assert.equal(spent(s)-before,1);
 assert.equal(e.summonCost(s,0,e.card(WATER)),2);
 assert.equal(e.summonCost(s,0,e.card(FIRE)),2);
 s.phase='attack';
 act(s,'endTurn');
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(e.summonCost(s,0,e.card(WATER)),1);
 assert.ok(own.battle.includes(seb));
});

test('The reverse ability matches both civilizations and Release preserves the creature',()=>{
 const s=table(),own=s.players[0],seb=deploy(s,BLUE_RED,SEB);
 assert.equal(e.summonCost(s,0,e.card(FIRE)),1);
 cast(s,FIRE);
 selectReduction(s,seb);
 pick(s,null);
 assert.equal(e.summonCost(s,0,e.card(WATER)),2);
 seb.tapped=true;
 const incarnation=seb.incarnation;
 cast(s,SPIRAL);
 act(s,'effect',a=>a.targets[0]?.uid===seb.uid);
 assert.equal(seb.incarnation,incarnation);
 assert.equal(seb.tapped,true);
 assert.equal(e.card(seb).name,'セブ・マイパッド');
 assert.ok(own.battle.includes(seb));
 assert.equal(e.summonCost(s,0,e.card(WATER)),1);
 assert.equal(e.summonCost(s,0,e.card(FIRE)),2);
});

test('Gaial Hole deploys two real fire Psychic backs at exactly eight total cost',()=>{
 const s=table([GILL,SEB,OFLAME]),own=s.players[0];
 const [gill,seb,oflame]=own.extra;
 cast(s,GAIARL);
 select(s,gill,true);
 assert.ok(!values(s).some(v=>v?.uid===oflame.uid));
 assert.deepEqual(own.battle,[]);
 select(s,seb,true);
 drain(s);
 assert.deepEqual(own.battle,[gill,seb]);
 assert.equal(e.card(gill).cost+e.card(seb).cost,8);
});

test('Surprise Hole can use the water side of Geo exactly as in the official match report',()=>{
 const s=table(),own=s.players[0],geo=own.extra.find(x=>x.cardId===GEO);
 const top=own.deck[0],spell=inst('dm22ex1-127');
 own.hand.push(spell);
 act(s,'play',a=>a.uid===spell.uid&&a.face===1);
 pick(s,1);
 select(s,geo,true);
 pick(s,top.uid);
 pick(s,'mana');
 assert.ok(own.mana.includes(top));
 assert.equal(e.card(geo).name,'GQ 笑沙-4');
});

test('Purin can deploy a new Psychic on its Alien back face',()=>{
 const s=table(),own=s.players[0],gaga=own.extra.find(x=>x.cardId===GAGA);
 const top=own.deck[0],purin=inst('dm24ex2-036');
 own.battle.push(purin);
 s.active=1;
 s.phase='attack';
 act(s,'endTurn');
 pick(s,true);
 select(s,gaga,true);
 pick(s,top.uid);
 assert.ok(own.shields.includes(top));
 assert.ok(own.extra.includes(purin));
 assert.equal(e.card(gaga).name,'GQ 亜空-6110');
});

test('Each face has the official civilizations, costs and art, and is restricted to the extra deck',()=>{
 for(const [id,front,back] of [[GAGA,'光','光/闇'],[SEB,'水','水/火'],[ZABI,'闇','闇/自然'],[GILL,'火','光/火'],[GEO,'自然','水/自然']]){
  const c=e.card(id);
  assert.deepEqual([c.civ,c.g1085Back.civ],[front,back]);
  assert.deepEqual([c.cost,c.g1085Back.cost,c.manaValue,c.limit],[2,4,0,4]);
  assert.ok(c.psychic&&c.g1085Back.g1085Release);
  assert.ok(c.g1085Back.image.endsWith(id+'b.jpg'));
 }
});

test('Cross Gear generation can spend the reduction; a printed cost of one leaves it available',()=>{
 const s=table(),seb=deploy(s,BLUE_RED,SEB,false);
 const cheap='dm01-084',gear='dm14-086';
 assert.equal(e.card(cheap).cost,1);
 cast(s,cheap);
 drain(s);
 assert.equal(seb.g464UsedTurn,undefined);
 const before=spent(s);
 cast(s,gear);
 selectReduction(s,seb);
 pick(s,null);
 assert.equal(spent(s)-before,1);
 assert.equal(seb.g464UsedTurn,s.turn);
 assert.ok(s.players[0].battle.some(x=>x.cardId===gear));
});

test('Rinne can pay seven with Geo and leaves Baraghiara on the battlefield',()=>{
 const s=table(),own=s.players[0],geo=deploy(s,BLUE_GREEN,GEO,false);
 const baraghiara=inst('dmrp08-mh05');
 own.battle.push(baraghiara);
 give(s,0,'mana',Array(7).fill(NATURE));
 act(s,'play',a=>a.alternative==='rinne'&&a.cost===7);
 assert.ok(!values(s).includes(null));
 selectReduction(s,geo);
 pick(s,null);
 drain(s);
 assert.equal(spent(s),7);
 assert.equal(geo.g464UsedTurn,s.turn);
 assert.ok(own.battle.includes(baraghiara));
 assert.equal(own.mana.length,8);
});

test('Sasage and an optional Psychic reduction can pay for the same summon',()=>{
 const s=table(),own=s.players[0],gill=deploy(s,WHITE_RED,GILL,false);
 const donor=inst('dmrp19-028');
 const rod='dm23ex2-016';
 own.battle.push(donor);
 give(s,0,'mana',[LIGHT,FIRE,NATURE]);
 give(s,0,'hand',[rod]);
 act(s,'play',a=>a.alternative==='sasage'&&a.sasage.includes(donor.uid));
 selectReduction(s,gill);
 pick(s,null);
 drain(s);
 assert.ok(own.grave.includes(donor));
 assert.ok(own.battle.some(x=>x.cardId===rod));
 assert.equal(gill.g464UsedTurn,s.turn);
});

test('Each front reduces its own civilization only and independent copies may stack',()=>{
 for(const [id,index] of [[GAGA,0],[SEB,1],[ZABI,2],[GILL,3],[GEO,4]]){
  const s=table([id,id]),own=s.players[0];
  const [one]=own.extra.splice(0,1);
  own.battle.push(one);
  for(const [i,target] of colors.entries()){
   assert.equal(e.summonCost(s,0,e.card(target)),Math.max(1,e.card(target).cost-Number(i===index)));
  }
 }
 const s=table([GILL,GILL]),own=s.players[0];
 const [one,two]=own.extra.splice(0);
 own.battle.push(one,two);
 cast(s,GAIARL);
 selectReduction(s,one);
 selectReduction(s,two);
 pick(s,null);
 assert.equal(spent(s),4);
 assert.equal(one.g464UsedTurn,s.turn);
 assert.equal(two.g464UsedTurn,s.turn);
});
