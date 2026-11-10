import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const LAVA='dmr02-026',KURT='dm38-020',CLOSE='dm38-044',DIG='dmr03-041',PRINT='dmd10-014';
const LAND='dm01-108',WATER='dm01-083',FIRE='dm01-097',LIGHT='dm01-075',DARK='dm01-090',BIG='dm01-079';
const SPELL='dm01-086',MIXED='dmr23-025',LOCK='dmrp08-014';
const ANGEL='dm38-019',DEMON='dm01-s06',ANGEL_DRAGON='dmr14-034',WRONG_TWIN='dmex06-024',RIGHT_TWIN='dmex12-074';
const field=(active=0)=>Object.assign(setup(),{active});
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const restore=s=>JSON.parse(JSON.stringify(s));
const attacks=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 840 pins four complete definitions and the DMD-10 print without replacing IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-840.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[LAVA,KURT,CLOSE,DIG]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:840}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.cost,c.power,c.race??'',c.manaValue,c.limit],[f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(row.verification.facesMatched);
  assert.deepEqual(data.cards.filter(x=>x.name===c.name).map(x=>x.id),[row.id]);
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:840}));
 }
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[PRINT,DIG]]);
 assert.deepEqual(catalogue.resolveRows([{id:PRINT,count:1},{id:DIG,count:3}]),[{id:DIG,count:4}]);
 assert.equal(m.regulationVerification.limits[PRINT],4);
});

for(const [id,p,attrs,amount] of [
 [WATER,0,{},4000],[FIRE,0,{tapped:true},4000],[MIXED,0,{},4000],
 [LAND,0,{},2000],[WATER,1,{},2000],[FIRE,0,{sealed:true},2000]
])test('Lava uses the caster’s current water or fire creatures '+[id,p,amount].join(' '),()=>{
 let s=field(),target=put(s,1,'battle',BIG,{powerModifiers:[{amount:2000,expires:'end',who:0}]});
 const ally=put(s,p,'battle',id,attrs);
 if(attrs.sealed)s.players[p].seals=[{...inst(LIGHT),sealOf:ally.uid,faceDown:true}];
 play(s,LAVA);assert.ok(values(s).includes(target.uid));s=restore(s);
 pick(s,target.uid);drain(s);
 const live=s.players[1].battle.find(x=>x.uid===target.uid);
 assert.equal(e.power(live,false,s),6000-amount);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(e.power(live,false,s),4000);
});

test('Lava is a Shield Trigger and destroys an attacking creature at zero power',()=>{
 const s=field(1);
 give(s,0,'shields',[LAVA,LAND]);
 put(s,0,'battle',FIRE);
 const attacker=put(s,1,'battle',FIRE,{powerModifiers:[{amount:2000,expires:'end',who:1}]});
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');
 pick(s,attacker.uid);drain(s);
 assert.ok(has(s,1,'grave',attacker));
});

test('Kurt may attack a tapped creature without a Command and cannot attack a player or shield',()=>{
 const s=field(),kurt=put(s,0,'battle',KURT),enemy=put(s,1,'battle',WATER,{tapped:true});
 put(s,1,'battle',ANGEL);
 s.phase='attack';assert.deepEqual(attacks(s,kurt),[enemy.uid]);
 give(s,1,'shields',[]);assert.deepEqual(attacks(s,kurt),[enemy.uid]);
});

for(const id of [ANGEL,DEMON,ANGEL_DRAGON])test('An allied Command permits Kurt’s player attack only while present '+id,()=>{
 const s=field(),kurt=put(s,0,'battle',KURT),ally=put(s,0,'battle',id,{tapped:true});
 s.phase='attack';assert.ok(attacks(s,kurt).includes('player'));
 ally.sealed=true;assert.ok(!attacks(s,kurt).includes('player'));
 ally.sealed=false;kurt.entered=s.turn;
 assert.deepEqual(attacks(s,kurt),[]);
});

test('Kurt retains Blocker with no allied Command',()=>{
 const s=field(1),kurt=put(s,0,'battle',KURT),attacker=put(s,1,'battle',WATER);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===kurt.uid);drain(s);
 assert.ok(has(s,0,'battle',kurt)&&has(s,1,'grave',attacker));
});

test('Kurt sees a race added by an allied creature’s active ability',()=>{
 const s=field(),kurt=put(s,0,'battle',KURT);
 const ally=put(s,0,'battle','dm15-037'),gear=put(s,0,'battle','dm14-110');
 gear.crossedTo={uid:ally.uid,incarnation:ally.incarnation||0};
 s.phase='attack';
 assert.ok(e.effectiveCard(ally,s).race.includes('エンジェル・コマンド'));
 assert.ok(attacks(s,kurt).includes('player'));
 delete gear.crossedTo;assert.ok(!attacks(s,kurt).includes('player'));
});

test('Close places exactly two cards at the bottom in the selected order and excludes mixed Darkness targets',()=>{
 let s=field();
 const close=put(s,0,'battle',CLOSE),one=put(s,0,'grave',DARK),two=put(s,0,'grave',SPELL),other=put(s,0,'grave',LAND);
 const victim=put(s,1,'battle',BIG),dark=put(s,1,'battle',DARK),mixed=put(s,1,'battle',MIXED);
 attack(s,close.uid);pick(s,two.uid);s=restore(s);pick(s,one.uid);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[two.uid,one.uid]);
 assert.ok(has(s,0,'grave',other));assert.deepEqual(values(s),[victim.uid]);
 pick(s,victim.uid);drain(s);
 assert.ok(has(s,1,'grave',victim)&&has(s,1,'battle',dark)&&has(s,1,'battle',mixed));
});

for(const mode of ['short','decline','partial','locked'])test('Close handles insufficient cards, decline and a grave lock '+mode,()=>{
 const s=field(),close=put(s,0,'battle',CLOSE),victim=put(s,1,'battle',WATER);
 const first=put(s,0,'grave',DARK),second=mode==='short'?null:put(s,0,'grave',SPELL);
 if(mode==='locked')put(s,1,'battle',LOCK);
 attack(s,close.uid);
 if(mode==='short')assert.notEqual(s.decision?.task?.op,'g34_Select');
 else if(mode==='decline')pick(s,null);
 else if(mode==='partial'){pick(s,first.uid);pick(s,null);}
 else{
  pick(s,first.uid);pick(s,second.uid);
  assert.ok(values(s).includes(victim.uid));pick(s,victim.uid);
 }
 drain(s);
 assert.ok(has(s,0,'grave',first)&&(!second||has(s,0,'grave',second)));
 assert.equal(has(s,1,'grave',victim),mode==='locked');
});

for(const [id,draw] of [[LIGHT,true],[LAND,true],[RIGHT_TWIN,true],[DARK,false],[WRONG_TWIN,false]])
 test('Dig checks the actual recovered creature face before offering an optional draw '+id,()=>{
  let s=field();
  const candidate=put(s,0,'grave',id),spell=put(s,0,'grave',SPELL),opponent=put(s,1,'grave',LAND),top=s.players[0].deck[0];
  play(s,DIG);assert.deepEqual(values(s),[candidate.uid]);s=restore(s);pick(s,candidate.uid);
  assert.ok(has(s,0,'hand',candidate)&&has(s,0,'grave',spell)&&has(s,1,'grave',opponent));
  if(draw){assert.deepEqual(values(s),[0,1]);pick(s,1);}
  else assert.equal(s.decision,null);
  drain(s);assert.equal(has(s,0,'hand',top),draw);
 });

test('Dig may decline the draw and a grave lock prevents both recovery and draw',()=>{
 for(const locked of [false,true]){
  const s=field(),candidate=put(s,0,'grave',LAND),top=s.players[0].deck[0];
  if(locked)put(s,1,'battle',LOCK);
  play(s,DIG);
  if(!locked){pick(s,candidate.uid);pick(s,0);}
  else assert.equal(s.decision,null);
  assert.equal(has(s,0,'hand',candidate),!locked);
  assert.equal(s.players[0].deck[0].uid,top.uid);
 }
});

test('Dig can recover and draw as a Shield Trigger during the other turn',()=>{
 const s=field(1);give(s,0,'shields',[DIG,LAND]);
 const target=put(s,0,'grave',LIGHT),attacker=put(s,1,'battle',LAND),top=s.players[0].deck[0];
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');
 pick(s,target.uid);pick(s,1);drain(s);
 assert.ok(has(s,0,'hand',target)&&has(s,0,'hand',top));
});
