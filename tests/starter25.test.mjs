import test from'node:test';import assert from'node:assert/strict';
import {createCatalogue}from'../dist/catalogue.js';import{resolveStarter25Decks,starter25Matches}from'../dist/starter25.js';import{STARTER25_DATA}from'../dist/starter25-data.js';import{prepareDeckCopy}from'../dist/deck-copy.js';import{dealOpening}from'../dist/draw.js';import{setCards,validateDeck}from'../dist/engine.js';import{data,snapshot,details}from'./target-fixture.mjs';
const registry=createCatalogue(snapshot,data.cards,details),decks=resolveStarter25Decks(registry);setCards(data.cards);
test('all25 official numbered lists resolve to distinct, registered forty-card decks with provenance',()=>{
 assert.equal(decks.length,25);assert.equal(new Set(decks.map(d=>d.id)).size,25);assert.deepEqual(decks.map(d=>d.product.number),Array.from({length:25},(_,i)=>i+1));
 for(const d of decks){assert.equal(d.cards.reduce((n,r)=>n+r.count,0),40);assert.deepEqual(registry.validate(d),[]);assert.equal(new Set(d.cards.map(r=>r.id)).size,d.cards.length);assert.ok(d.cards.every(r=>registry.get(r.id)));assert.ok(d.product.officialName);assert.match(d.product.source,new RegExp('/deck'+String(d.product.number).padStart(2,'0')+'/$'));const hand=dealOpening(d,registry,42);assert.equal(hand.hand.length,5);assert.equal(hand.deck.length,30);}
});
test('the official nine-copy Hachiko exception survives registration and copies',()=>{
 const d=decks[10],row=d.cards.find(r=>registry.get(r.id).name==='特攻の忠剣ハチ公');assert.equal(row.count,9);assert.ok(registry.get(row.id).faces[0].abilityText.includes('４枚より多く'));for(const category of['自分','相手']){const copied=prepareDeckCopy([],d,registry,{id:category,category}).deck;assert.equal(copied.cards.find(r=>r.id===row.id).count,9);assert.deepEqual(copied.product,d.product);assert.deepEqual(registry.validate(copied),[]);}
});
test('missing, duplicate, oversized, incomplete or mismatched official rows fail closed',()=>{
 for(const change of [r=>r.decks.pop(),r=>r.decks[0].number=2,r=>r.decks[0].source='https://example.com/',r=>r.decks[0].cards[0].name='架空のカード',r=>r.decks[0].cards[0].id=r.decks[1].cards[0].id,r=>r.decks[0].cards[0].count=41,r=>r.decks[0].cards[0].count--,r=>r.decks[0].cards.push({...r.decks[0].cards[0]})]){const bad=structuredClone(STARTER25_DATA);change(bad);assert.throws(()=>resolveStarter25Decks(registry,bad));}
});
test('number, full-width text, themes and contained card names find the expected decks',()=>{
 assert.deepEqual(decks.filter(d=>starter25Matches(d,'Ｎｏ．１１',registry)).map(d=>d.product.number),[11]);assert.ok(starter25Matches(decks[10],'特攻の忠剣ハチ公',registry));assert.ok(starter25Matches(decks[23],'墓地',registry));assert.equal(decks.filter(d=>starter25Matches(d,'存在しない検索語',registry)).length,0);
});
test('partial effect coverage cannot enable battle and personal edits cannot mutate the official list',()=>{
 for(const d of decks){assert.equal(registry.coverage(d).unsupported===0,[2,3,5,6,7,9,10,12,14,15,16,17,18,19,20,21,22,25].includes(d.product.number));assert.equal(validateDeck(d).length===0,[2,3,5,6,7,9,10,12,14,15,16,17,18,19,20,21,22,25].includes(d.product.number));}
 const before=structuredClone(decks),copied=prepareDeckCopy([],decks[0],registry,{id:'copy'}).deck;copied.cards[0].count=1;copied.product.officialName='changed';assert.deepEqual(decks,before);
});
