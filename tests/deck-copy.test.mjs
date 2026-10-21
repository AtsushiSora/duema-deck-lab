import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCatalogue} from '../dist/catalogue.js';
import {prepareDeckCopy} from '../dist/deck-copy.js';
import {resolveEnvironmentDecks} from '../dist/environment.js';
import {PRESETS} from '../dist/decks.js';
import {setCards,validateDeck} from '../dist/engine.js';
const read=async file=>JSON.parse(await readFile(new URL('../dist/'+file,import.meta.url),'utf8'));
const [snapshot,supported]=await Promise.all([read('catalogue.json'),read('cards.json')]);
const registry=createCatalogue(snapshot,supported.cards);setCards(supported.cards);
test('own deck copied for an opponent has independent identity and editable card rows',()=>{
 const source=structuredClone(PRESETS[0]),before=structuredClone(source),existing=[];
 const result=prepareDeckCopy(existing,source,registry,{id:'opponent-copy',created:'now',category:'相手'});
 assert.equal(result.deck.category,'相手');assert.equal(result.deck.id,'opponent-copy');assert.deepEqual(result.deck.cards,source.cards);assert.deepEqual(validateDeck(result.deck),[]);assert.deepEqual(existing,[]);
 result.deck.cards[0].count--;result.deck.name='変更した相手';assert.deepEqual(source,before);
});
test('opponent and own collections can each keep the same forty cards without overwriting each other',()=>{
 const source=resolveEnvironmentDecks(registry)[0];
 const mine=prepareDeckCopy([],source,registry,{id:'mine',category:'自分'}).deck;
 const opponent=prepareDeckCopy([],source,registry,{id:'opponent',category:'相手'}).deck;
 assert.notEqual(mine.id,opponent.id);assert.equal(mine.category,'自分');assert.equal(opponent.category,'相手');
 assert.deepEqual(opponent.tournament,source.tournament);opponent.tournament.player='test';assert.notEqual(mine.tournament.player,'test');
 assert.equal(registry.coverage(opponent).unsupported,0);assert.deepEqual(validateDeck(opponent),[]);
});
test('selecting an existing opponent composition reuses its name and identity even after renaming',()=>{
 const deck=prepareDeckCopy([],PRESETS[1],registry,{id:'existing',category:'相手'}).deck;deck.name='自分で付けた相手名';deck.cards.reverse();
 const result=prepareDeckCopy([deck],PRESETS[1],registry,{id:'new',category:'相手'});assert.equal(result.alreadyExists,true);assert.equal(result.deck,deck);assert.equal(result.deck.name,'自分で付けた相手名');
});
test('invalid destination and non-forty decks cannot enter a collection through selection',()=>{
 assert.throws(()=>prepareDeckCopy([],PRESETS[0],registry,{id:'a',category:'account'}),/保存先/);
 const bad=structuredClone(PRESETS[0]);bad.cards.pop();assert.throws(()=>prepareDeckCopy([],bad,registry,{id:'a',category:'相手'}),/40枚/);
});
