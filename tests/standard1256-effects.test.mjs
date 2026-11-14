import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const DECOY='dmr18-054',CLUB='dmrp18-087',AIDORU='dmrp22-020';
const WATER='dm01-083',BLOCKER='dm01-084',FIRE='dm01-097',BIG='dm01-108',EVO='dm10-032',STAR='dmrp18-km2';
const DEMON='dm01-027',GATE='dm01-086',SPARK='dm01-015';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(BIG));
 return s;
}
function add(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const attacks=(s,x)=>[...new Set(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target))];
const endAvailable=s=>e.getLegalActions(s).some(a=>a.kind==='endTurn');
const chooseBasic=(s,x)=>act(s,'effect',a=>a.targets?.[0]?.uid===x.uid);
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function closeTurn(s){
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');drain(s);act(s,'skipCharge');
}
function basicTargets(s){
 if(s.decision?.choices)return values(s);
 return s.decision?.targets?.map(x=>x.uid)??[];
}

test('the three official prints resolve by name and ID to the complete verified definitions and art',()=>{
 const m=read('tools/support-phase-1256.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[DECOY,CLUB,AIDORU]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces:[f],image}=row,c=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1256}),row.spec);
  assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  assert.deepEqual(catalogue.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.text,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.abilityText,f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(CARD_IMAGES[id],image);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===id&&x.image===image));
 }
});

test('the third Water card activates Decoy, even tapped, and two Decoys remain legal choices (QA 37288)',()=>{
 const s=field(),d=add(s,1,'battle',DECOY),ally=add(s,1,'battle',BIG),second=add(s,1,'battle',DECOY);
 give(s,1,'mana',[WATER,WATER,BIG]);
 cast(s,CLUB);assert.deepEqual(basicTargets(s),[d.uid,ally.uid,second.uid]);pick(s,d.uid);
 add(s,1,'mana',WATER,{tapped:true});
 cast(s,CLUB);assert.deepEqual(basicTargets(s),[d.uid,second.uid]);pick(s,second.uid);
 d.g35Ignored=s.turn;second.g35Ignored=s.turn;
 cast(s,CLUB);assert.deepEqual(basicTargets(s),[d.uid,ally.uid,second.uid]);pick(s,ally.uid);
});

test('an unselectable Decoy still protects allies; own selection and blanket effects are unaffected (QA 37289)',()=>{
 const s=field(),d=add(s,1,'battle',DECOY),ally=add(s,1,'battle',BIG),own=add(s,0,'battle',WATER);
 d.g34Grants=[{turn:s.turn,untargetable:true}];
 cast(s,CLUB);
 assert.equal(s.decision,null);assert.equal(e.effectiveCard(ally,s).mustAttack,undefined);
 cast(s,GATE);
 assert.deepEqual(basicTargets(s),[own.uid]);
 chooseBasic(s,own);
 assert.ok(inZone(s,0,'hand',own));
 cast(s,SPARK);
 assert.ok(d.tapped&&ally.tapped);
});

test('Decoy does not change whom the opponent can attack or which defenders can block',()=>{
 const s=field(),a=add(s,0,'battle',WATER),ally=add(s,1,'battle',BIG,{tapped:true});
 add(s,1,'battle',DECOY);
 const blocker=add(s,1,'battle',BLOCKER);
 attack(s,a.uid,ally.uid);
 act(s,'block',x=>x.uid===blocker.uid);
 assert.ok(inZone(s,1,'battle',ally));
 drain(s);
});

test('Club forces only its target to attack, prioritizes eligible creatures, and expires on the caster’s next turn',()=>{
 const s=field(),victim=add(s,1,'battle',FIRE),other=add(s,1,'battle',WATER);
 const creature=add(s,0,'battle',BIG,{tapped:true});
 cast(s,CLUB);pick(s,victim.uid);
 closeTurn(s);act(s,'toAttack');
 assert.deepEqual(attacks(s,victim),[creature.uid]);
 assert.deepEqual(attacks(s,other),['player',creature.uid]);
 assert.equal(endAvailable(s),false);
 creature.tapped=false;
 assert.deepEqual(attacks(s,victim),['player']);assert.equal(endAvailable(s),false);
 victim.tapped=true;
 assert.equal(endAvailable(s),true);
 closeTurn(s);
 assert.equal(e.effectiveCard(victim,s).mustAttack,undefined);
 assert.ok(!s.extLimits.some(l=>l.grant?.g1173AttackCreatureIfAble));
});

test('Club used as a shield trigger forces an eligible attacker during the current turn',()=>{
 const s=field();give(s,1,'shields',[CLUB]);
 const first=add(s,0,'battle',FIRE),other=add(s,0,'battle',WATER),target=add(s,1,'battle',BIG,{tapped:true});
 attack(s,first.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===CLUB);pick(s,other.uid);
 assert.deepEqual(attacks(s,other),[target.uid]);
 assert.equal(endAvailable(s),false);
 attack(s,other.uid,target.uid);act(s,'noBlock');drain(s);
 assert.equal(endAvailable(s),true);closeTurn(s);
 assert.ok(!s.extLimits.some(l=>l.grant?.g1173AttackCreatureIfAble));
});

function destroy(s,victim){
 cast(s,DEMON);
 chooseBasic(s,victim);
}
test('AIDORU reveals only on declaration and deploys one copy without paying',()=>{
 const s=field(),a=add(s,1,'hand',AIDORU),b=add(s,1,'hand',AIDORU);
 const evo=add(s,1,'battle',EVO,{under:[inst(BIG)]});
 const mana=s.players[1].mana.map(x=>x.tapped);
 destroy(s,evo);
 assert.ok(inZone(s,1,'grave',evo));
 assert.equal(s.decision?.task?.op,'g34_AidoruDeclare1256');
 assert.ok(!JSON.stringify(e.observation(s,0)).includes(AIDORU));
 pick(s,true);pick(s,true);drain(s);
 assert.equal(s.players[1].battle.filter(x=>x.cardId===AIDORU).length,1);
 assert.equal([a,b].filter(x=>inZone(s,1,'hand',x)).length,1);
 assert.deepEqual(s.players[1].mana.map(x=>x.tapped),mana);
});

test('AIDORU is optional, ignores other destructions and bounces, and checks only its own same-name cards',()=>{
 let s=field(),a=add(s,1,'hand',AIDORU);
 destroy(s,add(s,1,'battle',FIRE));
 assert.equal(s.decision,null);assert.ok(inZone(s,1,'hand',a));
 const bounced=add(s,1,'battle',EVO,{under:[inst(BIG)]});
 cast(s,GATE);
 chooseBasic(s,bounced);
 assert.equal(s.decision,null);assert.ok(inZone(s,1,'hand',a));assert.ok(inZone(s,1,'hand',bounced));
 add(s,0,'battle',AIDORU);
 destroy(s,add(s,1,'battle',EVO,{under:[inst(BIG)]}));
 assert.equal(s.decision?.task?.op,'g34_AidoruDeclare1256');
 pick(s,null);assert.ok(inZone(s,1,'hand',a));
 const existing=add(s,1,'battle',AIDORU);
 destroy(s,add(s,1,'battle',EVO,{under:[inst(BIG)]}));
 pick(s,true);drain(s);
 assert.ok(inZone(s,1,'battle',existing));assert.ok(inZone(s,1,'hand',a));
 s=field();
 add(s,0,'hand',AIDORU);
 destroy(s,add(s,1,'battle',EVO,{under:[inst(BIG)]}));
 assert.equal(s.decision,null);
});

test('AIDORU reacts to the destroyed Star Evolution top card and can attack on the turn it enters',()=>{
 const s=field(),a=add(s,1,'hand',AIDORU),base=inst(FIRE);
 const star=add(s,1,'battle',STAR,{under:[base]});
 destroy(s,star);
 assert.ok(inZone(s,1,'grave',star)&&inZone(s,1,'battle',base));
 pick(s,true);
 assert.equal(s.decision?.type,'effectOrder');
 act(s,'orderEffect',x=>x.cardId===AIDORU);drain(s);
 assert.ok(inZone(s,1,'battle',a));
 const fresh=add(s,0,'hand',AIDORU);
 act(s,'play',x=>x.uid===fresh.uid);act(s,'toAttack');
 assert.ok(attacks(s,fresh).includes('player'));
});


test('AIDORU drawn after the destruction cannot declare for that event (QA 39985)',()=>{
 const s=field(),evo=add(s,1,'battle',EVO,{under:[inst(BIG)]});
 give(s,1,'deck',[AIDORU,...Array(19).fill(BIG)]);
 add(s,1,'battle','dm04-028');
 destroy(s,evo);
 assert.notEqual(s.decision?.task?.op,'g34_AidoruDeclare1256');
 // The living Scum Man may draw when the other creature goes to the graveyard.
 assert.equal(s.decision?.source,'dm04-028');
 pick(s,1);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[1].hand.map(x=>x.cardId),[AIDORU]);
});

test('Club’s external requirement survives ability suppression on its target',()=>{
 const s=field(),victim=add(s,1,'battle',FIRE),target=add(s,0,'battle',BIG,{tapped:true});
 cast(s,CLUB);pick(s,victim.uid);
 closeTurn(s);victim.g35Ignored=s.turn;act(s,'toAttack');
 assert.deepEqual(attacks(s,victim),[target.uid]);
 assert.equal(endAvailable(s),false);
});
