import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {act,cast,data,details,e,give,PRESETS,setup,snapshot} from './target-fixture.mjs';

const JENNY='dm23rp2-065',NORON='dmbd10-017',FIRST_NORON='dmr23-067',PLAIN='dm01-108';
const variants={
 [JENNY]:['dm23rp2x-065','dm23rp2-18A','dm23rp2x-18A','dm23rp2-20B','dm23rp2x-20B','dm24ex1-075'],
 [NORON]:[FIRST_NORON,'dmbd22-025','dm26ex5-039']
};
const catalogue=createCatalogue(snapshot,data.cards,details);

test('Jenny and Noron reprints resolve to their existing physical card definitions and limits',()=>{
 const {prints}=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 for(const [id,aliases] of Object.entries(variants)){
  for(const alias of aliases){
   assert.equal(catalogue.get(alias),catalogue.get(id));
   const image=prints.find(x=>x.id===alias);
   assert.equal(image.canonicalId,id);
   assert.equal(image.source,'https://dm.takaratomy.co.jp/card/detail/?id='+alias);
   const deck=structuredClone(PRESETS[0]);
   for(const copy of deck.cards.slice(0,2))copy.count-=2;
   deck.cards.push({id,count:2},{id:alias,count:2});
   const resolved=catalogue.resolveRows(JSON.parse(JSON.stringify(deck.cards)));
   assert.equal(resolved.find(x=>x.id===id).count,4);
   assert.deepEqual(e.validateDeck({...deck,cards:resolved}),[]);
  }
 }
 assert.equal(nameKey('【問２】ノロン&#x2934'),nameKey('【問２】ノロン⤴'));
 assert.equal(catalogue.byName.get(nameKey('【問２】ノロン&#x2934')).id,NORON);
 assert.ok(snapshot.cards.some(x=>x.id===FIRST_NORON));
 assert.ok(details.cards.some(x=>x.id===FIRST_NORON));
});

test('Noron resolves two draws and two discards and still charges tapped',()=>{
 const id=catalogue.get(FIRST_NORON).id,s=setup();
 give(s,0,'deck',[PLAIN,PLAIN,PLAIN]);
 cast(s,id);
 assert.equal(s.players[0].hand.length,2);
 for(let i=0;i<2;i++)act(s,'extended',a=>!!s.decision.choices[a.choice].value);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.players[0].grave.length,2);
 const t=setup();
 t.phase='charge';give(t,0,'hand',[id]);act(t,'charge',a=>a.cardId===id);
 assert.equal(t.players[0].mana.at(-1).tapped,true);
});
