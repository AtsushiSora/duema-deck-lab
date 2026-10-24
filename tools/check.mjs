import{PHOTO_PHOENIX}from'./fixtures/photo-phoenix.mjs';
import{PHOTO_DARK_MADO}from'./fixtures/photo-dark-mado.mjs';
import{CARD_IMAGES}from'../dist/card-images.js';
import{PHOTO_WATER_MADO}from'./fixtures/photo-water-mado.mjs';
import{PHOTO_BOLSHACK}from'./fixtures/photo-bolshack.mjs';
import{resolveHeroDecks}from'../dist/hero-challenge.js';
import{resolveEnvironmentDecks}from'../dist/environment.js';
import{setCards,validateDeck}from'../dist/engine.js';
import{validateDetails}from'./detail-validation.mjs';
import{decodeFingerprint}from'../dist/card-fingerprint.js';
import{resolveStarter25Decks}from'../dist/starter25.js';
import{readdir,readFile}from'node:fs/promises';import{spawnSync}from'node:child_process';import{createCatalogue,nameKey}from'../dist/catalogue.js';
for(const folder of ['dist','tools','server','netlify/functions'])for(const file of(await readdir(new URL('../'+folder+'/',import.meta.url))).filter(x=>/\.m?js$/.test(x))){const r=spawnSync(process.execPath,['--check',new URL('../'+folder+'/'+file,import.meta.url).pathname],{stdio:'inherit'});if(r.status)process.exit(r.status);}
const snapshot=JSON.parse(await readFile(new URL('../dist/catalogue.json',import.meta.url),'utf8')),supported=JSON.parse(await readFile(new URL('../dist/cards.json',import.meta.url),'utf8')).cards;
const imageIndex=JSON.parse(await readFile(new URL('../dist/image-index.json',import.meta.url),'utf8')),imageIds=new Set(imageIndex.entries.map(e=>e[0])),canonicalIds=new Set(snapshot.cards.map(c=>c.id));
if(imageIndex.schemaVersion!==1||imageIndex.nameCount!==imageIds.size||imageIndex.printCount!==imageIndex.entries.length)throw Error('画像照合データの件数が一致しません');
for(const[id,signature,printId]of imageIndex.entries){if(!canonicalIds.has(id)||!printId)throw Error('画像照合のカードIDが不正です');decodeFingerprint(signature);}
console.log(`Image matching covers ${imageIds.size} names; other names use OCR and review.`);
if(snapshot.previewOnly||snapshot.processedRecordCount!==snapshot.officialResultCount||snapshot.namedRecordCount+snapshot.unnamedRecords.length!==snapshot.officialResultCount)throw Error('公式一覧の取り込みが完了していません');
const details=JSON.parse(await readFile(new URL('../dist/details.json',import.meta.url),'utf8')),detailStats=validateDetails(details,snapshot),registry=createCatalogue(snapshot,supported,details);if(registry.cards.length!==snapshot.registeredNameCount||registry.cards.length<10000)throw Error('カード名件数が一致しません');if(new Set(registry.cards.map(c=>nameKey(c.name))).size!==registry.cards.length)throw Error('同名カードが重複しています');for(const c of supported)if(registry.get(c.id)?.name!==c.name||!registry.get(c.id)?.supported)throw Error('既存の対戦用カードIDが変わっています：'+c.id);for(const c of registry.cards){if(!/^https:\/\/dm\.takaratomy\.co\.jp\/card\/detail\/\?id=/.test(c.source))throw Error('カードの出典がありません：'+c.name);if(!registry.get(c.id))throw Error('カードIDが不正です');}for(const id of Object.keys(snapshot.aliases))if(!registry.get(id))throw Error('再録カードIDの移行先がありません');console.log(`Checked ${registry.cards.length} canonical names, ${detailStats.faces} faces with card information, ${detailStats.partial} records with official blank fields, ${supported.length} implemented cards.`);
const starters=resolveStarter25Decks(registry);console.log(`Checked ${starters.length} official starter decks; ${starters.filter(d=>!registry.coverage(d).unsupported).length} with complete effect coverage.`);

setCards(supported);const environments=resolveEnvironmentDecks(registry);for(const d of environments){const errors=validateDeck(d);if(errors.length)throw Error(d.name+'：'+errors.join(' / '));}console.log(`Checked ${environments.length} environment decks with complete effect coverage.`);

const heroes=resolveHeroDecks(JSON.parse(await readFile(new URL('../dist/hero-decks.json',import.meta.url),'utf8')),registry);for(const d of heroes){const errors=validateDeck(d);if(errors.length)throw Error(d.name+'：'+errors.join(' / '));}console.log(`Checked ${heroes.length} protagonist challenge decks with forty supported cards each.`);

if(validateDeck(PHOTO_BOLSHACK).length||registry.coverage(PHOTO_BOLSHACK).unsupported)throw Error('画像の40枚が未対応です');console.log('Checked the screenshot Bolshack deck: 40 supported copies.');

if(validateDeck(PHOTO_WATER_MADO).length||registry.coverage(PHOTO_WATER_MADO).unsupported)throw Error('画像の水魔導具40枚が未対応です');console.log('Checked the screenshot water-mado deck: 40 supported copies.');

if(Object.keys(CARD_IMAGES).length!==supported.length||supported.some(c=>!/^https:\/\/dm\.takaratomy\.co\.jp\/wp-content\/card\/cardimage\/[A-Za-z0-9_.-]+\.(jpg|png|webp)$/.test(CARD_IMAGES[c.id]||'')))throw Error('実カード画像の参照が不足しています');console.log('Checked actual card image URLs for all '+supported.length+' supported cards.');

if(validateDeck(PHOTO_DARK_MADO).length||registry.coverage(PHOTO_DARK_MADO).unsupported)throw Error('画像の闇魔導具40枚が未対応です');console.log('Checked the screenshot dark-mado deck: 40 supported copies.');

if(validateDeck(PHOTO_PHOENIX).length||registry.coverage(PHOTO_PHOENIX).unsupported)throw Error('画像のフェニックス40枚が未対応です');console.log('Checked the screenshot Phoenix deck: 40 supported copies.');
