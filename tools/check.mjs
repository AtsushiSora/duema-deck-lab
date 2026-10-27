import {UTILITY111_DECKS} from './fixtures/utility111.mjs';
import {UTILITY110_DECKS} from './fixtures/utility110.mjs';
import {UTILITY109_DECKS} from './fixtures/utility109.mjs';
import {UTILITY108_DECKS} from './fixtures/utility108.mjs';
import {UTILITY107_DECKS} from './fixtures/utility107.mjs';
import {UTILITY106_DECKS} from './fixtures/utility106.mjs';
import {PHOTO_OCTOBER_DECKS,PHOTO_OCTOBER_28_DECKS} from '../dist/photo-october-decks.js';
import {resolveChampions} from '../dist/champions.js';
import {PHOTO_REVISED_TWO} from './fixtures/photo-revised-two.mjs';
import {PHOTO_REVISED_THREE} from './fixtures/photo-revised-three.mjs';
import {APP_VERSION} from '../dist/app-updates.js';
import {PHOTO_FIFTEEN_DECKS} from './fixtures/photo-fifteen-decks.mjs';
import {PHOTO_SIX_DECKS} from './fixtures/photo-six-decks.mjs';
import {PHOTO_HIKARISMA} from './fixtures/photo-hikarisma.mjs';
import {PHOTO_KENJI_MUGEN} from './fixtures/photo-kenji-mugen.mjs';
import{PHOTO_PHOENIX}from'./fixtures/photo-phoenix.mjs';
import{PHOTO_DARK_MADO}from'./fixtures/photo-dark-mado.mjs';
import{CARD_IMAGES}from'../dist/card-images.js';
import{PHOTO_WATER_MADO}from'./fixtures/photo-water-mado.mjs';
import{PHOTO_BOLSHACK}from'./fixtures/photo-bolshack.mjs';
import{resolveHeroDecks,resolveRivalDecks}from'../dist/hero-challenge.js';
import{resolveEnvironmentDecks}from'../dist/environment.js';
import{setCards,validateDeck,ENGINE_VERSION}from'../dist/engine.js';
import{validateDetails}from'./detail-validation.mjs';
import{decodeFingerprint}from'../dist/card-fingerprint.js';
import{resolveStarter25Decks}from'../dist/starter25.js';
import{readdir,readFile}from'node:fs/promises';import{spawnSync}from'node:child_process';import{createCatalogue,nameKey}from'../dist/catalogue.js';
for(const folder of ['dist','tools','server','netlify/functions'])for(const file of(await readdir(new URL('../'+folder+'/',import.meta.url))).filter(x=>/\.m?js$/.test(x))){const r=spawnSync(process.execPath,['--check',new URL('../'+folder+'/'+file,import.meta.url).pathname],{stdio:'inherit'});if(r.status)process.exit(r.status);}
const release=JSON.parse(await readFile(new URL('../dist/release.json',import.meta.url),'utf8')),pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));if(release.version!==APP_VERSION||pkg.version!==APP_VERSION||release.engineVersion!==ENGINE_VERSION)throw Error('公開版のバージョンが一致しません');console.log('Checked release manifest v'+APP_VERSION);
const snapshot=JSON.parse(await readFile(new URL('../dist/catalogue.json',import.meta.url),'utf8')),supported=JSON.parse(await readFile(new URL('../dist/cards.json',import.meta.url),'utf8')).cards;
const imageIndex=JSON.parse(await readFile(new URL('../dist/image-index.json',import.meta.url),'utf8')),imageIds=new Set(imageIndex.entries.map(e=>e[0])),canonicalIds=new Set(snapshot.cards.map(c=>c.id));
if(imageIndex.schemaVersion!==1||imageIndex.nameCount!==imageIds.size||imageIndex.printCount!==imageIndex.entries.length)throw Error('画像照合データの件数が一致しません');
for(const[id,signature,printId]of imageIndex.entries){if(!canonicalIds.has(id)||!printId)throw Error('画像照合のカードIDが不正です');decodeFingerprint(signature);}
console.log(`Image matching covers ${imageIds.size} names; other names use OCR and review.`);
if(snapshot.previewOnly||snapshot.processedRecordCount!==snapshot.officialResultCount||snapshot.namedRecordCount+snapshot.unnamedRecords.length!==snapshot.officialResultCount)throw Error('公式一覧の取り込みが完了していません');
const details=JSON.parse(await readFile(new URL('../dist/details.json',import.meta.url),'utf8')),detailStats=validateDetails(details,snapshot),registry=createCatalogue(snapshot,supported,details);if(registry.cards.length!==snapshot.registeredNameCount||registry.cards.length<10000)throw Error('カード名件数が一致しません');if(new Set(registry.cards.map(c=>nameKey(c.name))).size!==registry.cards.length)throw Error('同名カードが重複しています');for(const c of supported)if(registry.get(c.id)?.name!==c.name||!registry.get(c.id)?.supported)throw Error('既存の対戦用カードIDが変わっています：'+c.id);for(const c of registry.cards){if(!/^https:\/\/dm\.takaratomy\.co\.jp\/card\/detail\/\?id=/.test(c.source))throw Error('カードの出典がありません：'+c.name);if(!registry.get(c.id))throw Error('カードIDが不正です');}for(const id of Object.keys(snapshot.aliases))if(!registry.get(id))throw Error('再録カードIDの移行先がありません');console.log(`Checked ${registry.cards.length} canonical names, ${detailStats.faces} faces with card information, ${detailStats.partial} records with official blank fields, ${supported.length} implemented cards.`);
const starters=resolveStarter25Decks(registry);console.log(`Checked ${starters.length} official starter decks; ${starters.filter(d=>!registry.coverage(d).unsupported).length} with complete effect coverage.`);

setCards(supported);const environments=resolveEnvironmentDecks(registry);for(const d of environments){const errors=validateDeck(d);if(errors.length)throw Error(d.name+'：'+errors.join(' / '));}console.log(`Checked ${environments.length} environment decks with complete effect coverage.`);

const championData=JSON.parse(await readFile(new URL('../dist/champion-decks.json',import.meta.url),'utf8')),championManifest=JSON.parse(await readFile(new URL('../tools/champion-sources-v0.97.0.json',import.meta.url),'utf8'));if(JSON.stringify(championData)!==JSON.stringify(championManifest))throw Error('公式優勝リストの照合記録が一致しません');const champions=resolveChampions(championData,registry);for(const r of champions.records.filter(r=>r.playable))if(validateDeck(r.deck).length)throw Error('対戦可能な優勝リストを確認してください');console.log('Checked '+champions.records.length+' intact official champion recipes; '+champions.records.filter(r=>r.playable).length+' battle-ready; '+champions.gaps.length+' source gaps retained explicitly.');

const heroes=resolveHeroDecks(JSON.parse(await readFile(new URL('../dist/hero-decks.json',import.meta.url),'utf8')),registry);for(const d of heroes){const errors=validateDeck(d);if(errors.length)throw Error(d.name+'：'+errors.join(' / '));}console.log(`Checked ${heroes.length} protagonist challenge decks with forty supported cards each.`);

const rivals=resolveRivalDecks(JSON.parse(await readFile(new URL('../dist/rival-decks.json',import.meta.url),'utf8')),registry);for(const d of rivals){const errors=validateDeck(d);if(errors.length)throw Error(d.name+'：'+errors.join(' / '));}console.log(`Checked ${rivals.length} rival challenge decks with forty supported cards each.`);

if(validateDeck(PHOTO_BOLSHACK).length||registry.coverage(PHOTO_BOLSHACK).unsupported)throw Error('画像の40枚が未対応です');console.log('Checked the screenshot Bolshack deck: 40 supported copies.');

if(validateDeck(PHOTO_WATER_MADO).length||registry.coverage(PHOTO_WATER_MADO).unsupported)throw Error('画像の水魔導具40枚が未対応です');console.log('Checked the screenshot water-mado deck: 40 supported copies.');

if(Object.keys(CARD_IMAGES).length!==supported.length||supported.some(c=>!/^https:\/\/dm\.takaratomy\.co\.jp\/wp-content\/card\/cardimage\/[A-Za-z0-9_.-]+\.(jpg|png|webp)$/.test(CARD_IMAGES[c.id]||'')))throw Error('実カード画像の参照が不足しています');console.log('Checked actual card image URLs for all '+supported.length+' supported cards.');

if(validateDeck(PHOTO_DARK_MADO).length||registry.coverage(PHOTO_DARK_MADO).unsupported)throw Error('画像の闇魔導具40枚が未対応です');console.log('Checked the screenshot dark-mado deck: 40 supported copies.');

if(validateDeck(PHOTO_PHOENIX).length||registry.coverage(PHOTO_PHOENIX).unsupported)throw Error('画像のフェニックス40枚が未対応です');console.log('Checked the screenshot Phoenix deck: 40 supported copies.');

if(validateDeck(PHOTO_KENJI_MUGEN).length||registry.coverage(PHOTO_KENJI_MUGEN).unsupported)throw Error('画像のケンジ・キングダム40枚が未対応です');console.log('Checked the screenshot Kenji/Mugen deck:22 identities and40 supported physical cards.');

if(validateDeck(PHOTO_HIKARISMA).length||registry.coverage(PHOTO_HIKARISMA).unsupported)throw Error('画像のヒカリスマ40枚が未対応です');console.log('Checked the screenshot Hikarisma deck:14 identities and40 supported physical cards.');

for(const deck of PHOTO_SIX_DECKS)if(validateDeck(deck).length||registry.coverage(deck).unsupported)throw Error('6枚の画像に未対応カードがあります：'+deck.name);console.log('Checked all six screenshots:106 names /240 physical copies.');

for(const deck of PHOTO_FIFTEEN_DECKS)if(validateDeck(deck).length||registry.coverage(deck).unsupported)throw Error('15枚の画像に未対応カードがあります：'+deck.name);console.log('Checked all fifteen screenshots:159 names /600 physical copies.');

for(const deck of PHOTO_REVISED_TWO)if(validateDeck(deck).length||registry.coverage(deck).unsupported)throw Error('追加の2枚の画像に未対応カードがあります：'+deck.name);console.log('Checked both revised screenshots:80 supported copies.');
for(const d of PHOTO_REVISED_THREE)if(validateDeck(d).length||registry.coverage(d).unsupported)throw Error('改訂3画像の40枚構成を確認してください：'+d.name);console.log('Checked three revised screenshots:53 supported identities and120 physical copies.');

for(const d of PHOTO_OCTOBER_DECKS)if(validateDeck(d).length||registry.coverage(d).unsupported||d.cards.reduce((n,r)=>n+r.count,0)!==40)throw Error('今回の画像の40枚が未対応です：'+d.name);console.log('Checked both October screenshots: 37 identities and 80 supported copies.');

const photoTruth=JSON.parse(await readFile(new URL('./fixtures/photo-october28-slots.json',import.meta.url),'utf8'));for(const[d,i]of PHOTO_OCTOBER_28_DECKS.map((d,i)=>[d,i])){const grouped=new Map();for(const id of photoTruth.slots[i])grouped.set(id,(grouped.get(id)||0)+1);if(validateDeck(d).length||registry.coverage(d).unsupported||photoTruth.slots[i].length!==40||JSON.stringify([...grouped])!==JSON.stringify(d.cards.map(r=>[r.id,r.count])))throw Error('10月28日の画像の40枚を確認してください：'+d.name);}console.log('Checked all three October28 screenshots: 52 list identities and 120 supported copies.');

for(const d of UTILITY106_DECKS)if(validateDeck(d).length||registry.coverage(d).unsupported||d.cards.reduce((n,r)=>n+r.count,0)!==40)throw Error('第106段階の検証用40枚を確認してください：'+d.name);console.log('Checked both phase106 effect-test decks: six new names in legal forty-card lists.');

for(const d of UTILITY107_DECKS)if(validateDeck(d).length||registry.coverage(d).unsupported||d.cards.reduce((n,r)=>n+r.count,0)!==40)throw Error('第107段階の検証用40枚を確認してください：'+d.name);console.log('Checked both phase107 effect-test decks: six new names in legal forty-card lists.');

for(const d of UTILITY108_DECKS)if(validateDeck(d).length||registry.coverage(d).unsupported||d.cards.reduce((n,r)=>n+r.count,0)!==40)throw Error('第108段階の検証用40枚を確認してください：'+d.name);console.log('Checked both phase108 effect-test decks: six new names in legal forty-card lists.');

for(const d of UTILITY109_DECKS)if(validateDeck(d).length||registry.coverage(d).unsupported||d.cards.reduce((n,r)=>n+r.count,0)!==40)throw Error('第109段階の検証用40枚を確認してください：'+d.name);console.log('Checked both phase109 effect-test decks: six new names in legal forty-card lists.');

for(const d of UTILITY110_DECKS)if(validateDeck(d).length||registry.coverage(d).unsupported||d.cards.reduce((n,r)=>n+r.count,0)!==40)throw Error('第110段階の検証用40枚を確認してください：'+d.name);console.log('Checked both phase110 effect-test decks: six new names in legal forty-card lists.');

for(const d of UTILITY111_DECKS)if(validateDeck(d).length||registry.coverage(d).unsupported||d.cards.reduce((n,r)=>n+r.count,0)!==40)throw Error('第111段階の検証用40枚を確認してください：'+d.name);console.log('Checked both phase111 effect-test decks: six new names in legal forty-card lists.');
