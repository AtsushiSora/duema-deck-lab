import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const OSHIKATSU='dm23rp2-047',REGATE='dm23rp1-029',ERIKATCHU='dm24ex1-015';
const GIANT='dm23rp1-048',MECHA='dm23rp2-028',MECHA_SEED='dmrp22-048',FAIRY='dmx04-015',FAIRY_SEED='dmsd20-015';
const PROTECTED_MECHA='dm09-s01',SMALL='dm01-108',APUL='dmrp22-042',REDIRECT='dm22ex1-086';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const put=(s,p,z,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

test('five verified prints resolve to three distinct supported cards',()=>{
 const manifest=read('support-phase-1205.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[OSHIKATSU,REGATE,ERIKATCHU]);
 assert.deepEqual(manifest.printAliases.map(c=>c.id),['dm23rp2x-047','dm24ex1-Sec05']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id),[face]=row.faces;
  const parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1205}),row.spec);
  const changed=structuredClone(parsed);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1205}));
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.ok(catalogue.get(id).supported);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual([live.cost,live.power,live.race,live.civilizations,live.manaValue,live.limit],
   [face.cost,+face.powerText,face.race,face.civilizations,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(c=>c.id===row.id&&c.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
 }
});

function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function run(s,op,p,options={}){
 s.phase='main';
 s.extTasks=[{op,p,source:OSHIKATSU,...options}];
 act(s,'toAttack');
}

function charge(s,id=SMALL){
 s.phase='charge';
 const x=put(s,s.active,'hand',id);
 act(s,'charge',a=>a.uid===x.uid);
 return x;
}
function raid(s,p,race,eligible,max){
 assert.equal(s.decision.player,p);
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.equal(s.decision.task.race,race);
 assert.equal(s.decision.task.max,max);
 assert.deepEqual(values(s),[eligible.uid,null]);
 pick(s,eligible.uid);
 drain(s);
 assert.ok(has(s,p,'battle',eligible));
}
const ramp=(s,p,n,g809Together=false)=>run(s,'g34_Ramp',p,{n,g809Together});
const sweep=(s,p,to,extra={})=>run(s,'g34_Sweep',p,{to,owner:'self',filter:{creature:true},...extra});

test('Oshikatsu counts a normal charge before summon and preserves the count through JSON',()=>{
 let s=setup();
 charge(s);
 cast(s,OSHIKATSU);
 assert.equal(s.decision,null);
 s=JSON.parse(JSON.stringify(s));
 give(s,0,'deck',[SMALL,GIANT,SMALL,SMALL,SMALL,SMALL]);
 const eligible=s.players[0].deck[1];
 ramp(s,0,1);
 raid(s,0,'ジャイアント',eligible,5);
 ramp(s,0,1);
 assert.equal(s.decision,null);
});

test('Oshikatsu counts each seat separately and can trigger during the opponent turn',()=>{
 const s=setup();
 put(s,0,'battle',OSHIKATSU);
 ramp(s,0,1);
 end(s);
 assert.equal(s.active,1);
 give(s,0,'deck',[SMALL,SMALL,GIANT,SMALL,SMALL,SMALL]);
 const eligible=s.players[0].deck[2];
 ramp(s,1,2,true);
 ramp(s,0,1);
 assert.equal(s.decision,null);
 ramp(s,0,1);
 raid(s,0,'ジャイアント',eligible,5);
});

test('Oshikatsu triggers once when three cards enter mana simultaneously (QA 43051)',()=>{
 const s=setup();
 put(s,0,'battle',OSHIKATSU);
 give(s,0,'deck',[SMALL,SMALL,SMALL,GIANT,GIANT,SMALL,SMALL,SMALL]);
 const [, , , first,second]=s.players[0].deck;
 ramp(s,0,3,true);
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.deepEqual(values(s),[first.uid,second.uid,null]);
 pick(s,first.uid);
 drain(s);
 assert.ok(has(s,0,'battle',first));
 assert.equal(s.players[0].battle.filter(x=>x.cardId===GIANT).length,1);
 assert.equal(s.players[0].deck.at(-2).uid,second.uid);
 assert.equal(s.decision,null);
});

test('Oshikatsu ignores a mana placement replaced by a move to grave',()=>{
 const s=setup();
 put(s,0,'battle',OSHIKATSU);
 const redirect=put(s,1,'battle',REDIRECT);
 const [top]=s.players[0].deck;
 charge(s);
 ramp(s,0,1);
 assert.ok(has(s,0,'grave',top));
 assert.equal(s.decision,null);
 s.players[1].battle=s.players[1].battle.filter(x=>x.uid!==redirect.uid);
 give(s,0,'deck',[SMALL,GIANT,SMALL,SMALL,SMALL]);
 const eligible=s.players[0].deck[1];
 ramp(s,0,1);
 raid(s,0,'ジャイアント',eligible,5);
});

test('Oshikatsu checks the board after simultaneous mana moves under the July 2026 ruling',()=>{
 for(const survives of [false,true]){
  const s=setup();
  const others=[put(s,0,'battle',SMALL),put(s,0,'battle',SMALL)];
  const source=put(s,0,'battle',OSHIKATSU);
  give(s,0,'deck',[GIANT,SMALL,SMALL,SMALL]);
  const eligible=s.players[0].deck[0];
  sweep(s,0,'mana',survives?{excludeUid:source.uid}:{});
  assert.ok(others.every(x=>has(s,0,'mana',x)));
  if(survives)raid(s,0,'ジャイアント',eligible,5);
  else{
   assert.ok(has(s,0,'mana',source));
   assert.equal(s.decision,null);
  }
 }
});

test('Regate taps exactly three distinct Mecha including an opposing Tamaseed and untargetable Mecha (rule 701.34b)',()=>{
 let s=setup();
 const own=put(s,0,'battle',MECHA),seed=put(s,1,'battle',MECHA_SEED);
 const protectedMecha=put(s,1,'battle',PROTECTED_MECHA);
 const tapped=put(s,1,'battle',MECHA,{tapped:true}),nonMecha=put(s,0,'battle',SMALL);
 give(s,0,'deck',[MECHA,SMALL,SMALL,SMALL,SMALL]);
 const eligible=s.players[0].deck[0];
 cast(s,REGATE);
 const source=s.players[0].battle.find(x=>x.cardId===REGATE);
 assert.deepEqual(new Set(values(s)),new Set([own.uid,seed.uid,protectedMecha.uid,source.uid,null]));
 pick(s,protectedMecha.uid);
 assert.equal(protectedMecha.tapped,false);
 assert.ok(!values(s).includes(protectedMecha.uid));
 s=JSON.parse(JSON.stringify(s));
 pick(s,seed.uid);
 pick(s,source.uid);
 for(const [p,x] of [[1,protectedMecha],[1,seed],[0,source],[1,tapped]])
  assert.equal(s.players[p].battle.find(y=>y.uid===x.uid).tapped,true);
 for(const x of [own,nonMecha])assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).tapped,false);
 raid(s,0,'メカ',eligible,8);
});

test('Regate leaves all Mecha untapped on decline or when three eligible Mecha are unavailable',()=>{
 for(const enough of [false,true]){
  const s=setup();
  const own=put(s,0,'battle',MECHA);
  if(enough)put(s,1,'battle',MECHA_SEED);
  const original=s.players[0].deck.map(x=>x.uid);
  cast(s,REGATE);
  if(enough){
   pick(s,own.uid);
   pick(s,null);
  }
  assert.ok(s.players.flatMap(x=>x.battle).every(x=>!x.tapped));
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),original);
  assert.equal(s.decision,null);
 }
});

test('Regate untaps up to two of its controller’s creatures only at their end step',()=>{
 for(const n of [0,1,2]){
  const s=setup();
  const source=put(s,0,'battle',REGATE,{tapped:true});
  const others=[put(s,0,'battle',SMALL,{tapped:true}),put(s,0,'battle',SMALL,{tapped:true})];
  const seed=put(s,0,'battle',MECHA_SEED,{tapped:true}),enemy=put(s,1,'battle',SMALL,{tapped:true});
  end(s);
  assert.equal(s.active,0);
  assert.deepEqual(new Set(values(s)),new Set([source.uid,...others.map(x=>x.uid),null]));
  for(const x of others.slice(0,n))pick(s,x.uid);
  if(n<2)pick(s,null);
  assert.equal(source.tapped,true);
  assert.deepEqual(others.map(x=>x.tapped),[n<1,n<2]);
  assert.equal(seed.tapped,true);
  assert.equal(s.active,1);
  enemy.tapped=true;
  end(s);
  assert.equal(s.active,0);
  assert.equal(enemy.tapped,true);
  assert.equal(s.decision,null);
 }
});

test('Erikatchu replaces destruction of itself and friendly Snow Fairies only',()=>{
 const s=setup();
 const source=put(s,0,'battle',ERIKATCHU),fairy=put(s,0,'battle',FAIRY);
 const seed=put(s,0,'battle',FAIRY_SEED),ordinary=put(s,0,'battle',SMALL),enemy=put(s,1,'battle',FAIRY);
 sweep(s,0,'grave',{owner:'opponent',both:true,filter:{element:true}});
 assert.ok([source,fairy,seed].every(x=>has(s,0,'mana',x)));
 assert.ok(has(s,0,'grave',ordinary)&&has(s,1,'grave',enemy));
 assert.equal(s.decision,null);
});

test('Erikatchu has Just Diver and breaks two shields',()=>{
 const s=setup();
 cast(s,ERIKATCHU);
 const source=s.players[0].battle.find(x=>x.cardId===ERIKATCHU);
 const ordinary=put(s,0,'battle',SMALL);
 const enemy=put(s,1,'battle',SMALL);
 end(s);
 pick(s,null);
 assert.equal(s.active,1);
 run(s,'g34_Target',1,{to:'grave'});
 assert.ok(values(s).includes(ordinary.uid)&&!values(s).includes(source.uid));
 pick(s,ordinary.uid);
 assert.ok(has(s,0,'grave',ordinary));
 end(s);
 pick(s,null);
 assert.equal(s.active,0);
 enemy.tapped=false;
 attack(s,source.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const active of [0,1]){
 test('Erikatchu can pay with any mana card at the end of player '+active+'’s turn',()=>{
  const s=setup();
  s.active=active;
  put(s,0,'battle',ERIKATCHU);
  give(s,0,'mana',[SMALL]);
  give(s,0,'deck',[FAIRY,MECHA,SMALL,SMALL,SMALL]);
  const payment=s.players[0].mana[0],eligible=s.players[0].deck[0];
  end(s);
  assert.equal(s.decision.player,0);
  assert.deepEqual(values(s),[payment.uid,null]);
  pick(s,payment.uid);
  assert.ok(has(s,0,'grave',payment));
  raid(s,0,'スノーフェアリー',eligible,5);
  assert.equal(s.active,1-active);
 });
}

test('Erikatchu Mekraids even when Apul prevents the attempted payment (QA 45222)',()=>{
 let s=setup();
 put(s,0,'battle',ERIKATCHU);
 put(s,1,'battle',APUL);
 give(s,0,'mana',[SMALL]);
 give(s,0,'deck',[FAIRY,SMALL,SMALL,SMALL,SMALL]);
 const payment=s.players[0].mana[0],eligible=s.players[0].deck[0];
 end(s);
 assert.deepEqual(values(s),[payment.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,payment.uid);
 assert.ok(has(s,0,'mana',payment));
 assert.equal(s.players[0].grave.length,0);
 raid(s,0,'スノーフェアリー',eligible,5);
});

test('Erikatchu has no Mekraid after declining or with an empty mana zone',()=>{
 for(const n of [0,1]){
  const s=setup();
  put(s,0,'battle',ERIKATCHU);
  give(s,0,'mana',Array(n).fill(SMALL));
  const deck=s.players[0].deck.map(x=>x.uid);
  end(s);
  if(n)pick(s,null);
  assert.equal(s.players[0].mana.length,n);
  assert.equal(s.players[0].grave.length,0);
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck);
  assert.equal(s.active,1);
 }
});
