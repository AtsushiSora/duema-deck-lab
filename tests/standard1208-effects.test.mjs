import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {projectRoom} from '../server/duel-core.mjs';

const SHIRAZ='dm23rp2-056',GENJI='dm23rp2-066',SAD='dm23rp2-061';
const SMALL='dm01-108',MAGIC='dm23rp1-058',GHOST='dm01-094',ARMOR='dm23rp2-070',BIRD_SEED='dm25rp4-073';
const ABYSS_SPELL='dm23rp2-039',APUL='dmrp22-042',HAND='dm01-027';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(12).fill(SMALL));return s;};
const put=(s,p,z,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const setPower=(x,power)=>{x.powerModifiers=[{amount:power-e.card(x).power,expires:'end',who:0}];};
const play=(s,id,face=0)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);return x;};
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const reveals=s=>s.log.filter(x=>x.type==='reveal').map(x=>x.cardId);

test('eight verified prints resolve to three Twinpact cards with both full official faces',()=>{
 const m=read('support-phase-1208.json'),refs=read('image-reference-prints.json').prints,catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[SHIRAZ,GENJI,SAD]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dm23rp2x-056','dm23sd3-013','dm23rp2x-066','dm23rp2x-061','promoy22-022']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1208}),row.spec);
  for(const index of [0,1]){
   const d=structuredClone({...row,status:'complete'});d.faces[index].abilityText+='\n未知の能力。';
   assert.throws(()=>standardCardSpec(d,{phase:1208}));
  }
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.equal(catalogue.get(id).supported,true);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(live.limit,4);assert.equal(live.manaValue,1);
  assert.deepEqual(e.playFaces(live).map(c=>[c.type,c.cost,c.power,c.race,c.civilizations]),
   row.faces.map((f,i)=>[i?'spell':'creature',f.cost,i?undefined:+f.powerText,f.race,f.civilizations]));
  assert.equal(refs.find(c=>c.id===row.id&&c.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
 }
});

test('Shiraz gains 4000 only when it actually blocks, and its own player attack breaks two shields',()=>{
 for(const blocking of [true,false]){
  const s=field(),x=play(s,SHIRAZ),attacker=put(s,1,'battle',SMALL);
  setPower(attacker,9000);
  assert.equal(s.players[0].mana.filter(y=>y.tapped).length,5);
  assert.equal(e.power(x,false,s),6000);
  s.turn=2;s.active=1;
  if(!blocking)x.tapped=true;
  attack(s,attacker.uid,blocking?'player':x.uid);
  act(s,blocking?'block':'noBlock',a=>!blocking||a.uid===x.uid);drain(s);
  assert.ok(has(s,blocking?1:0,'grave',blocking?attacker:x));
  if(blocking){
   x.tapped=false;s.active=0;
   assert.equal(e.power(x,true,s),6000);
   attack(s,x.uid);drain(s);
   assert.equal(s.players[1].shields.length,3);
  }
 }
});

test('Magicle privately looks at two, lets the player take either Magic or an unrelated spell, and reveals only the pick',()=>{
 for(const choose of [MAGIC,GHOST]){
  const s=field();
  give(s,0,'deck',[MAGIC,GHOST,SMALL,SMALL]);
  const [magic,spell,below,last]=s.players[0].deck;
  const x=play(s,SHIRAZ,1);
  assert.equal(s.decision.task.op,'g34_LookPick');
  assert.deepEqual(values(s),[magic.uid,spell.uid,null]);
  const room={game:s,phase:'playing',hostUid:'a',guestUid:'b',profiles:[{name:'A'},{name:'B'}],decks:[{},{}],events:[],expiresAt:10000};
  assert.deepEqual(projectRoom(room,{uid:'a'},1).game.inspectedCards.map(y=>y.id),[MAGIC,GHOST]);
  assert.equal(projectRoom(room,{uid:'b'},1).game.inspectedCards,undefined);
  assert.deepEqual(reveals(s),[]);
  const chosen=choose===MAGIC?magic:spell,left=chosen===magic?spell:magic;
  pick(s,chosen.uid);
  assert.deepEqual(reveals(s),[choose]);
  assert.ok(has(s,0,'hand',chosen));
  assert.ok(has(s,0,'grave',x));
  assert.equal(s.players[0].mana.filter(y=>y.tapped).length,1);
  assert.deepEqual(s.players[0].deck.map(y=>y.uid),[below,last,left].map(y=>y.uid));
 }
});

test('Magicle excludes ordinary creatures and lets the player skip and order both cards at the bottom',()=>{
 const s=field();
 give(s,0,'deck',[SMALL,MAGIC,ARMOR]);
 const [wrong,magic,spell]=s.players[0].deck;
 play(s,SHIRAZ,1);
 assert.deepEqual(values(s),[magic.uid,null]);
 pick(s,null);
 assert.equal(s.decision.task.op,'g34_Order');
 pick(s,magic.uid);
 assert.deepEqual(s.players[0].deck.map(y=>y.uid),[spell,magic,wrong].map(y=>y.uid));
 assert.deepEqual(reveals(s),[]);assert.equal(s.players[0].hand.length,0);
});

test('Genji gains 4000 on offense only and its W Breaker breaks two shields',()=>{
 const s=field(),x=play(s,GENJI),enemy=put(s,1,'battle',SMALL,{tapped:true});
 setPower(enemy,7500);
 assert.equal(e.power(x,false,s),4000);
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,5);
 s.turn=2;
 attack(s,x.uid,enemy.uid);drain(s);
 assert.ok(has(s,1,'grave',enemy));assert.ok(has(s,0,'battle',x));
 x.tapped=false;attack(s,x.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Armaad looks at one if the only Birds are sealed, opposing, buried or outside battle',()=>{
 const s=field();
 const sealed=put(s,0,'battle',BIRD_SEED,{sealed:true});
 s.players[0].seals=[{...inst(SMALL),faceDown:true,sealOf:sealed.uid}];
 put(s,0,'battle',SMALL,{under:[inst(GENJI)]});
 put(s,1,'battle',GENJI);
 put(s,0,'grave',GENJI);
 give(s,0,'deck',[ARMOR,GENJI,SMALL,SMALL]);const [top,next]=s.players[0].deck;
 play(s,GENJI,1);
 assert.deepEqual(s.decision.task.ids,[top.uid]);
 assert.deepEqual(values(s),[top.uid,null]);
 pick(s,top.uid);
 assert.deepEqual(reveals(s),[ARMOR]);assert.ok(has(s,0,'hand',top));
 assert.equal(s.players[0].deck[0].uid,next.uid);
});

for(const bird of [GENJI,BIRD_SEED])test('Armaad sees four with a face-up friendly Bird '+bird,()=>{
 let s=field();
 put(s,0,'battle',bird,{tapped:true});
 give(s,0,'deck',[SMALL,GHOST,ARMOR,GENJI,ARMOR]);
 const [small,ghost,spell,twin,hidden]=s.players[0].deck;
 const source=play(s,GENJI,1);
 assert.deepEqual(s.decision.task.ids,[small,ghost,spell,twin].map(y=>y.uid));
 assert.deepEqual(values(s),[spell.uid,twin.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,twin.uid);
 assert.deepEqual(reveals(s),[GENJI]);
 assert.ok(has(s,0,'hand',twin));
 assert.equal(s.decision.task.op,'g34_Order');
 pick(s,ghost.uid);pick(s,spell.uid);
 assert.ok(has(s,0,'grave',source));
 assert.deepEqual(s.players[0].deck.map(y=>y.uid),[hidden,ghost,spell,small].map(y=>y.uid));
 assert.deepEqual(s.players[0].g34Protected,[]);
});

test('Abysaar mills before a mandatory Abyss selection and may recover a newly milled spell',()=>{
 const s=field(),old=put(s,0,'grave',SAD),wrong=put(s,0,'grave',SMALL);
 put(s,1,'grave',ABYSS_SPELL);
 give(s,0,'deck',[ABYSS_SPELL,SMALL,SMALL]);
 const top=s.players[0].deck[0],x=play(s,SAD,1);
 assert.ok(has(s,0,'grave',top));
 assert.deepEqual(values(s),[old.uid,top.uid]);
 assert.ok(!has(s,0,'grave',x));
 pick(s,top.uid);
 assert.ok(has(s,0,'hand',top));assert.ok(has(s,0,'grave',wrong));assert.ok(has(s,0,'grave',x));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,1);
});

test('Abysaar still mills under a grave movement lock and cannot recover the currently resolving card',()=>{
 for(const locked of [false,true]){
  const s=field();
  const top=s.players[0].deck[0];
  if(locked){put(s,1,'battle',APUL);put(s,0,'grave',SAD);}
  const x=play(s,SAD,1);
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'grave',top));assert.ok(has(s,0,'grave',x));
  assert.equal(s.players[0].hand.length,0);
 }
});

test('Sadrein normal summon has no rush; grave summon pays five, can break two shields, and returns to the bottom',()=>{
 for(const rush of [false,true]){
  let s=field();
  let x;
  if(rush){
   x=put(s,0,'grave',SAD);
   assert.ok(!e.getLegalActions(s).some(a=>a.uid===x.uid&&a.face===1));
   act(s,'play',a=>a.uid===x.uid&&a.manaPermit==='abyssRush');
  }else x=play(s,SAD);
  assert.ok(has(s,0,'battle',x));assert.equal(s.players[0].mana.filter(y=>y.tapped).length,5);
  s.phase='attack';
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'),rush);
  if(rush){attack(s,x.uid);drain(s);assert.equal(s.players[1].shields.length,3);}
  s=JSON.parse(JSON.stringify(s));
  end(s);
  if(rush)assert.equal(s.players[0].deck.at(-1).uid,x.uid);
  else assert.ok(has(s,0,'battle',x));
 }
});

test('Sadrein destroyed before its rush return stays in the grave (QA 41986)',()=>{
 const s=field(),x=put(s,0,'grave',SAD);
 act(s,'play',a=>a.uid===x.uid&&a.manaPermit==='abyssRush');
 give(s,1,'shields',[HAND,SMALL]);attack(s,x.uid);act(s,'noBlock');act(s,'useTrigger');drain(s);
 assert.ok(has(s,0,'grave',x));
 end(s);
 assert.ok(has(s,0,'grave',x));
});
