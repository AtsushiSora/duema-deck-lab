import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCatalogue} from '../dist/catalogue.js';
import {ENVIRONMENT_LISTS,resolveEnvironmentDecks,prepareEnvironmentCopy} from '../dist/environment.js';
import {setCards,validateDeck} from '../dist/engine.js';
const read=async file=>JSON.parse(await readFile(new URL('../dist/'+file,import.meta.url),'utf8'));
const [snapshot,supported]=await Promise.all([read('catalogue.json'),read('cards.json')]);
const registry=createCatalogue(snapshot,supported.cards),templates=resolveEnvironmentDecks(registry);setCards(supported.cards);

test('tournament lists resolve every full name into exactly forty registered cards with full battle support',()=>{
 assert.equal(templates.length,24);
 assert.equal(new Set(templates.map(d=>d.id)).size,24);
 for(const d of templates){assert.equal(d.cards.reduce((n,r)=>n+r.count,0),40);assert.deepEqual(registry.validate(d),[]);assert.equal(registry.coverage(d).unsupported,0);assert.equal(validateDeck(d).length>0,false);assert.match(d.tournament.source,/^https:\/\/dm\.takaratomy\.co\.jp\/coverage\//);assert.equal(d.tournament.checkedAt,['env-gp2026-grimoire','env-gp2026-pinky','env-gp2026-sara'].includes(d.id)?'2026-10-20':d.id==='env-nationals2025-dotto'?'2026-10-21':ENVIRONMENT_LISTS.find(x=>x.id===d.id).checkedAt);}
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
test('all templates use the official original composition while Gift remains banned under current restrictions',()=>{assert.equal(ENVIRONMENT_LISTS.filter(x=>x.practice).length,0);assert.equal(ENVIRONMENT_LISTS.filter(x=>!x.practice).length,24);for(const d of ENVIRONMENT_LISTS){assert.ok(!d.adjustments?.includes('未対応'));}assert.equal(registry.get('dm14-069').limit,0);for(const id of['dmr19-004','dmr19-s03','dm23bd7-003','dm39-026','dmrp09-053','dm12-007','dm24-086','dm23ex1-074','dm23rp2-016','dmrp07-023','dmrp12-s01','dmex16-078','dmrp04m-014','dm23sd2-007','dmr17-006','dmex12-023','dmsd20-013','dmrp14-024'])assert.ok(templates.some(d=>d.cards.some(x=>x.id===id)),id);});
test('years follow tournament seasons and checked Super CS dates, never card or verification dates',async()=>{const {groupEnvironmentDecks,environmentYear}=await import('../dist/environment.js');const before=structuredClone(templates),groups=groupEnvironmentDecks(templates);assert.deepEqual(groups.map(g=>[g.year,g.decks.length]),[[2026,8],[2025,5],[2024,6],[2023,5]]);assert.deepEqual(groups.flatMap(g=>g.decks).map(d=>d.id).sort(),templates.map(d=>d.id).sort());assert.deepEqual(templates,before);assert.equal(environmentYear(templates.find(d=>d.id==='env-lionel-practice')),2023);assert.equal(environmentYear(templates.find(d=>d.id==='env-viride-practice')),2026);assert.equal(environmentYear({tournament:{event:'全国大会2023 日本一決定戦',checkedAt:'2026-10-25'}}),2023);assert.equal(environmentYear({tournament:{event:'年代のない大会',checkedAt:'2026-10-25'}}),null);const unknown={id:'future',tournament:{event:'年代のない大会'}};assert.deepEqual(groupEnvironmentDecks([unknown,templates[0]]).map(g=>g.year),[2026,null]);});
