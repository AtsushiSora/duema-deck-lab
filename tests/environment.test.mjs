import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCatalogue} from '../dist/catalogue.js';
import {ENVIRONMENT_LISTS,resolveEnvironmentDecks,prepareEnvironmentCopy} from '../dist/environment.js';
import {setCards,validateDeck} from '../dist/engine.js';
const read=async file=>JSON.parse(await readFile(new URL('../dist/'+file,import.meta.url),'utf8'));
const [snapshot,supported]=await Promise.all([read('catalogue.json'),read('cards.json')]);
const registry=createCatalogue(snapshot,supported.cards),templates=resolveEnvironmentDecks(registry);setCards(supported.cards);

test('tournament lists resolve every full name into exactly forty registered cards without enabling battles',()=>{
 assert.equal(templates.length,4);
 assert.equal(new Set(templates.map(d=>d.id)).size,4);
 for(const d of templates){assert.equal(d.cards.reduce((n,r)=>n+r.count,0),40);assert.deepEqual(registry.validate(d),[]);assert.equal(registry.coverage(d).unsupported,['env-gp2026-pinky','env-nationals2025-dotto'].includes(d.id)?0:d.id==='env-gp2026-sara'?37:40);assert.equal(validateDeck(d).length>0,!['env-gp2026-pinky','env-nationals2025-dotto'].includes(d.id));assert.match(d.tournament.source,/^https:\/\/dm\.takaratomy\.co\.jp\/coverage\//);assert.equal(d.tournament.checkedAt,d.id==='env-nationals2025-dotto'?'2026-10-21':'2026-10-20');}
});
test('unknown names, duplicate canonical names, excessive copies and non-forty lists fail closed',()=>{
 for(const change of [l=>l.cards[0].name='未登録の架空カード',l=>l.cards.push({...l.cards[0]}),l=>l.cards[0].count=5,l=>l.cards[0].count=3]){const lists=structuredClone(ENVIRONMENT_LISTS);change(lists[0]);assert.throws(()=>resolveEnvironmentDecks(registry,lists));}
});
test('creating a personal copy preserves tournament provenance, existing decks, and the original list',()=>{
 const before=structuredClone(templates),existing=[{id:'personal',name:'自分の既存デッキ',format:'original',cards:[{id:'dm01-097',count:40}]}],old=structuredClone(existing);
 const {deck,alreadyExists}=prepareEnvironmentCopy(existing,templates[0],registry,{id:'new',created:'2026-10-20T00:00:00Z'});
 assert.equal(alreadyExists,false);assert.equal(deck.category,'自分');assert.equal(deck.templateId,templates[0].id);assert.deepEqual(deck.tournament,templates[0].tournament);assert.deepEqual(existing,old);
 deck.cards[0].count--;deck.tournament.player='changed';assert.deepEqual(templates,before);
});
test('repeated creation selects an identical saved composition even when reordered and renamed',()=>{
 const {deck}=prepareEnvironmentCopy([],templates[0],registry,{id:'new',created:'now'});deck.name='変更した名前';deck.cards.reverse();
 const result=prepareEnvironmentCopy([deck],templates[0],registry,{id:'another'});assert.equal(result.alreadyExists,true);assert.equal(result.deck,deck);
 const edited=structuredClone(deck);edited.cards[0].count--;edited.cards[1].count++;
 assert.equal(prepareEnvironmentCopy([edited],templates[0],registry,{id:'another'}).alreadyExists,false);
});
test('copy rejects invalid templates and identifier collisions while tolerating malformed older records',()=>{
 const bad=structuredClone(templates[0]);bad.cards.pop();assert.throws(()=>prepareEnvironmentCopy([],bad,registry,{id:'new'}));
 assert.throws(()=>prepareEnvironmentCopy([{id:'taken',cards:[]}],templates[0],registry,{id:'taken'}));
 assert.equal(prepareEnvironmentCopy([{id:'broken',cards:null}],templates[0],registry,{id:'new'}).alreadyExists,false);
});
