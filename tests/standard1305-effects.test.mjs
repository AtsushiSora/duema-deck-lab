import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const LYLA='dm39-031',COOK='dm24rp2-043',MUMU='dm25sp2-012';
const BASIC='dm01-108',BRAIN='dm01-052',EARTH='dm27-s05',FISH='dm01-079';
const FIGHT='dm25rp2-077',DOGI='dm24rp1-DM1',BLAZE='dm24rp2-045',PETROVA='dm24rp1-S01';
const GATE='dm16-007',GALAR='dmex16-061';
const GG='dm25rp3-S09',HEART='dmr01-020',CADDY='dm22rp1-049';
const pick=(s,value)=>act(s,'extended',a=>{
 const choice=s.decision.choices[a.choice].value;
 return (choice?.uid??choice)===(value?.uid??value);
});
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(BASIC));
 return s;
}
const add=(s,p,z,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

test('ten official prints verify and resolve to three canonical IDs in deck lists',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1305.json',import.meta.url)));
 const {prints}=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[LYLA,COOK,MUMU]);
 assert.equal(m.printAliases.length,7);
 for(const {id,canonicalId=id,name,image,source,faces,spec} of [...m.cards,...m.printAliases]){
  const c=e.card(canonicalId),f=faces[0];
  assert.deepEqual(spec,standardCardSpec({id,name,faces,status:'complete'},{phase:1305}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.limit,e.manaValue(c)],
   ['creature',f.cost,parseInt(f.powerText,10),f.race,4,1]);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId,name,image,source});
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).length,1);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

test('Lyla attacks on entry and retrieves her shield before an unblocked creature battle (QA 36251)',()=>{
 const s=field(),target=add(s,1,'battle',FISH,{tapped:true});
 add(s,0,'battle',EARTH);give(s,0,'shields',[BRAIN]);
 const shield=s.players[0].shields[0];
 cast(s,LYLA);
 const lyla=s.players[0].battle.find(x=>x.cardId===LYLA);
 attack(s,lyla.uid,target.uid);act(s,'noBlock');
 assert.equal(s.decision.task.op,'g55_ShieldHand');
 assert.ok(has(s,0,'battle',lyla));
 assert.ok(!s.log.some(x=>x.kind==='battle'));
 const resumed=JSON.parse(JSON.stringify(s));
 for(const game of [s,resumed]){
  pick(game,shield);drain(game);
  assert.ok(has(game,0,'hand',shield));
  assert.ok(has(game,0,'grave',lyla));
  assert.equal(game.metrics[0].triggers,0);
 }
});

test('Lyla retrieves on a blocked attack and in an effect battle',()=>{
 for(const blocked of [true,false]){
  const s=field(),lyla=add(s,0,'battle',LYLA),fish=add(s,1,'battle',FISH);
  const shield=s.players[0].shields[0];
  if(blocked){
   attack(s,lyla.uid);act(s,'block',a=>a.uid===fish.uid);
  }else{
   cast(s,FIGHT);pick(s,lyla);pick(s,fish);
  }
  assert.equal(s.decision.task.op,'g55_ShieldHand');
  assert.ok(has(s,0,'battle',lyla));
  pick(s,shield);drain(s);
  assert.ok(has(s,0,'hand',shield)&&has(s,0,'grave',lyla));
 }
});

test('Lyla never recovers a shield on an unblocked player attack',()=>{
 const s=field();
 cast(s,LYLA);
 const lyla=s.players[0].battle[0];
 attack(s,lyla.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[0].shields.length,5);
 assert.equal(s.players[1].shields.length,4);
});

test('GG does not suppress Lyla or Lovely Heart at the start of a battle (QA 48740)',()=>{
 for(const id of [LYLA,HEART]){
  const s=field(),attacker=add(s,0,'battle',id),gg=add(s,1,'battle',GG,{tapped:true,under:[inst(BASIC)]});
  attack(s,attacker.uid,gg.uid);act(s,'noBlock');
  assert.equal(s.decision.task.op,id===LYLA?'g55_ShieldHand':'g34_Offer');
  if(id===LYLA)pick(s,s.players[0].shields[0]);
  else pick(s,true);
  drain(s);
  assert.ok(has(s,id===LYLA?0:1,id===LYLA?'grave':'hand',id===LYLA?attacker:gg));
 }
});

test('Cook gives the next Hyper Creature a summed discount and grants it Speed Attacker on entry',()=>{
 const s=field();
 cast(s,COOK);cast(s,COOK);cast(s,BASIC);
 const target=add(s,0,'hand',DOGI);
 const play=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===target.uid);
 assert.equal(play.cost,1);
 act(s,'play',a=>a.uid===target.uid);drain(s);
 assert.ok(has(s,0,'battle',target));
 assert.ok(e.effectiveCard(target,s).speedAttacker);
 assert.equal(target.g34Grants.filter(g=>g.speedAttacker).length,2);
 assert.equal(e.summonCost(s,0,e.card(DOGI)),6);
 cast(s,BLAZE);drain(s);
 const blaze=s.players[0].battle.find(x=>x.cardId===BLAZE);
 assert.ok(!e.effectiveCard(blaze,s).speedAttacker);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.ok(!e.effectiveCard(target,s).speedAttacker);
});

test('Cook saves its reduction for a summon when Heaven’s Gate puts a Hyper Creature into play',()=>{
 const s=field(),petrova=add(s,0,'hand',PETROVA);
 cast(s,COOK);cast(s,GATE);
 pick(s,petrova);
 if(s.decision?.task?.op==='g20Select')pick(s,null);
 drain(s);
 assert.ok(has(s,0,'battle',petrova));
 assert.ok(!e.effectiveCard(petrova,s).speedAttacker);
 assert.equal(e.summonCost(s,0,e.card(DOGI)),3);
});

test('Cook consumes the discount on the next summon even if an entry replacement moves the creature to mana',()=>{
 const s=field(),dogi=add(s,0,'hand',DOGI);
 cast(s,COOK);
 add(s,1,'battle',CADDY);
 give(s,0,'mana',['dm01-108',...Array(4).fill('dm01-097')]);
 assert.equal(e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===dogi.uid).cost,3);
 act(s,'play',a=>a.uid===dogi.uid);drain(s);
 assert.ok(has(s,0,'mana',dogi));
 assert.ok(!dogi.g34Grants?.some(g=>g.speedAttacker));
 assert.equal(e.summonCost(s,0,e.card(DOGI)),6);
});

test('Cook consumes the next reduction only for this turn even if no Hyper Creature was summoned',()=>{
 const s=field();cast(s,COOK);
 assert.equal(e.summonCost(s,0,e.card(DOGI)),3);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(e.summonCost(s,0,e.card(DOGI)),6);
});

test('Teiozaka has Blocker and W-Breaker and the opponent chooses exactly five discards',()=>{
 const s=field();
 give(s,1,'hand',Array(6).fill(BASIC));
 const [keep,...discard]=s.players[1].hand;
 cast(s,MUMU);
 const host=s.players[0].battle[0];
 assert.ok(e.effectiveCard(host,s).blocker);
 assert.equal(e.effectiveCard(host,s).breaker,2);
 assert.equal(s.decision.player,1);
 for(const x of discard)pick(s,x);
 drain(s);
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),[keep.uid]);
 assert.deepEqual(new Set(s.players[1].grave.map(x=>x.uid)),new Set(discard.map(x=>x.uid)));
});

test('Teiozaka’s own attack can choose Galar and reduces even infinite power to minus infinity',()=>{
 const s=field(),mumu=add(s,0,'battle',MUMU),galar=add(s,1,'battle',GALAR);
 attack(s,mumu.uid);assert.equal(s.decision.task.op,'g34_Target');pick(s,galar);drain(s);
 assert.ok(has(s,1,'grave',galar));
 const t=field(),source=add(t,0,'battle',MUMU),infinite=add(t,1,'battle','dmrp15-km1');
 assert.equal(e.power(infinite,false,t),Infinity);
 attack(t,source.uid);pick(t,infinite);drain(t);
 assert.ok(has(t,1,'grave',infinite));
});
