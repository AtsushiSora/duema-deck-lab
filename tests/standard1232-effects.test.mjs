import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const NEX='dmex08-262',UP='dm23rp1-001',SHINOBI='dm23rp1-030',VOL='dm24rp2-S07';
const DRAGON='dm23rp1-026',STELLA='dm23sd2-007',NON='dm01-108',HIGH='dm01-s06';
const BOUNCE='dm01-086',TRIGGER='dm01-110';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));

function field(p=0){
 const s=setup();s.active=p;
 for(const who of [0,1]){give(s,who,'deck',Array(20).fill(NON));give(s,who,'grave',[]);}
 return s;
}
function add(s,p,z,id,props={}){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
function top(s,p,id){const x=inst(id);s.players[p].deck.unshift(x);return x;}
function pick(s,value){
 act(s,'extended',a=>{
  const v=s.decision.choices[a.choice].value;
  return (v?.uid??v)===value;
 });
}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const reveals=(s,id)=>s.log.filter(x=>x.type==='reveal'&&x.cardId===id);

test('official prints share one registered definition and preserve canonical IDs',()=>{
 const m=read('tools/support-phase-1232.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[NEX,UP,SHINOBI]);
 assert.deepEqual(m.printAliases.map(x=>x.canonicalId),[NEX,NEX,NEX,NEX,SHINOBI]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1232}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   ['creature',f.cost,+f.powerText,f.race,f.civilizations,1,4]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
 }
});

test('NEX discounts its summon by two per allied Dragon creature with a floor of one',()=>{
 const s=field();give(s,0,'battle',[DRAGON,VOL,NON]);give(s,1,'battle',[DRAGON]);
 assert.equal(e.summonCost(s,0,e.card(NEX)),11);
 s.players[0].battle[0].sealed=true;
 assert.equal(e.summonCost(s,0,e.card(NEX)),13);
 give(s,0,'battle',Array(8).fill(DRAGON));
 assert.equal(e.summonCost(s,0,e.card(NEX)),1);
});

test('NEX gives speed to itself and allied Dragons and breaks all opposing shields',()=>{
 const s=field();
 const nex=add(s,0,'battle',NEX,{entered:s.turn}),dragon=add(s,0,'battle',VOL,{entered:s.turn});
 const non=add(s,0,'battle',NON,{entered:s.turn}),enemy=add(s,1,'battle',VOL);
 s.phase='attack';
 const uids=e.getLegalActions(s).filter(a=>a.kind==='attack').map(a=>a.uid);
 assert.ok(uids.includes(nex.uid)&&uids.includes(dragon.uid)&&!uids.includes(non.uid));
 assert.ok(!e.effectiveCard(enemy,s).speedAttacker);
 assert.equal(e.effectiveCard(nex,s).worldBreaker,true);
 attack(s,nex.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,0);
});

test('NEX reveals the top on an allied Dragon attack and allows it to stay or enter',()=>{
 for(const [id,accept] of [[DRAGON,true],[DRAGON,false],[NON,false]]){
  const s=field(),nex=add(s,0,'battle',NEX),ally=add(s,0,'battle',VOL),shown=top(s,0,id);
  const size=s.players[0].deck.length;
  attack(s,ally.uid);
  assert.equal(s.decision?.source===NEX,id===DRAGON);
  if(id===DRAGON)pick(s,accept?shown.uid:null);
  if(s.decision?.type==='block')act(s,'noBlock');
  drain(s);
  assert.equal(has(s,0,'battle',shown),accept);
  assert.equal(s.players[0].deck.length,size-Number(accept));
  if(!accept)assert.equal(s.players[0].deck[0],shown);
  assert.ok(has(s,0,'battle',nex));
  assert.ok(reveals(s,NEX).some(x=>x.text.includes(e.card(id).name)));
 }
});

test('Hyper Voljaak causes the attacking NEX to trigger twice (QA45140)',()=>{
 const s=field(),nex=add(s,0,'battle',NEX),vol=add(s,0,'battle',VOL),donor=add(s,0,'battle',NON);
 const second=top(s,0,DRAGON),first=top(s,0,DRAGON);
 act(s,'hyper',a=>a.uid===vol.uid);pick(s,donor.uid);
 attack(s,nex.uid);
 assert.equal(s.pendingEffects.filter(x=>x.uid===nex.uid&&x.source===NEX).length,2);
 act(s,'orderEffect',a=>a.cardId===NEX);pick(s,first.uid);pick(s,second.uid);
 assert.ok(has(s,0,'battle',first)&&has(s,0,'battle',second));
});

test('Updrill taps creatures that are already in play and skips their next starting untap once',()=>{
 const s=field(),first=add(s,1,'battle',NON),second=add(s,1,'battle',HIGH,{tapped:true});
 const gear=add(s,1,'battle','dm16-008');
 cast(s,UP);
 assert.ok(first.tapped&&second.tapped&&first.skipUntap&&second.skipUntap);
 assert.equal(gear.tapped,false);
 const late=add(s,1,'battle',NON,{tapped:true});
 end(s);
 assert.ok(first.tapped&&second.tapped);
 assert.ok(!first.skipUntap&&!second.skipUntap&&!late.tapped);
 end(s);end(s);
 assert.ok(!first.tapped&&!second.tapped);
});

test('Updrill grants the Stella power and breaker aura while it remains in play',()=>{
 const s=field(),ally=add(s,0,'battle',STELLA),otherMecha=add(s,0,'battle','dm23rp1-028');
 const rival=add(s,1,'battle',STELLA),up=add(s,0,'battle',UP);
 assert.equal(e.power(ally,false,s),10000);
 assert.equal(e.effectiveCard(ally,s).poweredBreaker,true);
 assert.equal(e.power(otherMecha,false,s),9000);
 assert.equal(e.power(rival,false,s),4000);
 assert.equal(e.effectiveCard(up,s).breaker,3);
 s.players[0].battle.pop();
 assert.equal(e.power(ally,false,s),4000);
 assert.equal(e.effectiveCard(ally,s).poweredBreaker,undefined);
});

test('Updrill True Escape consumes two shields without their trigger and can replace bounce',()=>{
 const s=field(1),up=add(s,0,'battle',UP);
 give(s,0,'shields',[TRIGGER,TRIGGER]);
 cast(s,BOUNCE);act(s,'effect',a=>a.targets[0].uid===up.uid);
 act(s,'replaceEver');act(s,'everShield');act(s,'everShield');drain(s);
 assert.ok(has(s,0,'battle',up));
 assert.equal(s.players[0].shields.length,0);
 assert.deepEqual(s.players[0].hand.map(x=>x.cardId),[TRIGGER,TRIGGER]);
 assert.ok(!s.triggers);
});

test('n41kun4 declares after the opposing attack and resolves only with an allied Mecha',()=>{
 for(const mode of ['noMecha','ally','skip','enemy','sealed']){
  const s=field(1),user=add(s,0,'hand',SHINOBI),attacker=add(s,1,'battle',HIGH);
  if(mode!=='noMecha')add(s,mode==='enemy'?1:0,'battle',STELLA,{sealed:mode==='sealed'});
  attack(s,attacker.uid);
  assert.equal(s.decision?.task?.op,'ninjaDeclare');
  pick(s,mode==='skip'?null:true);
  if(mode==='ally'){
   assert.equal(s.decision?.task?.op,'g1232HandDefend');pick(s,true);
   assert.ok(has(s,0,'battle',user));
  }else assert.ok(has(s,0,'hand',user));
  assert.ok(!s.attack.ninjaUsed?.[0]);
  drain(s);end(s);
  if(mode==='ally')assert.ok(has(s,0,'battle',user));
 }
});

test('n41kun4 cannot attack and can save another Mecha or itself from leaving',()=>{
 for(const self of [false,true]){
  const s=field(),ninja=add(s,0,'battle',SHINOBI),ally=add(s,0,'battle',STELLA);
  s.phase='attack';
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===ninja.uid));
  s.active=1;s.phase='main';
  const target=self?ninja:ally;
  cast(s,BOUNCE);act(s,'effect',a=>a.targets[0].uid===target.uid);
  act(s,'replaceUltra',a=>a.uid===ninja.uid);drain(s);
  assert.ok(has(s,0,'grave',ninja)&&has(s,0,'battle',ally));
 }
});

test('n41kun4 can be declared alongside Ninja Strike and grants no Ninja usage (506.3d)',()=>{
 const s=field(1),user=add(s,0,'hand',SHINOBI),hayabusa=add(s,0,'hand','dm29-037');
 const ally=add(s,0,'battle',STELLA),attacker=add(s,1,'battle',HIGH);
 attack(s,attacker.uid);pick(s,true);pick(s,true);
 assert.equal(s.decision?.type,'effectOrder');
 act(s,'orderEffect',a=>a.cardId===SHINOBI);pick(s,true);
 assert.ok(has(s,0,'battle',user));
 assert.ok(!s.attack.ninjaUsed?.[0]);
 assert.equal(s.decision?.task?.op,'ninjaResolve');
 pick(s,'strike');
 assert.ok(has(s,0,'battle',hayabusa));
 assert.equal(s.attack.ninjaUsed[0].strike,true);
 assert.ok(has(s,0,'battle',ally));
});

test('destroying the attack target ends the attack before n41kun4 can be declared (QA39094)',()=>{
 const s=field(1),user=add(s,0,'hand',SHINOBI),target=add(s,0,'battle',STELLA,{tapped:true});
 const attacker=add(s,1,'battle','dmx22b-128');
 attack(s,attacker.uid,target.uid);
 assert.equal(s.decision.player,1);
 drain(s);
 assert.ok(has(s,0,'grave',target)&&has(s,0,'hand',user));
 assert.equal(s.attack,null);
 assert.ok(!s.log.some(x=>x.type==='attackDeclare'&&x.cardId===SHINOBI));
});
