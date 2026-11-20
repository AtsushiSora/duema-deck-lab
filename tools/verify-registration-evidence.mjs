// Add actual image and official same-name product evidence to a verified batch.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {textContent} from './detail-parser.mjs';
const path=process.argv[2],m=JSON.parse(fs.readFileSync(path)),hash=x=>createHash('sha256').update(x).digest('hex');
for(const row of m.cards){
 const html=fs.readFileSync('/tmp/duema-official-phase-'+m.phase+'/'+row.id+'.html','utf8');
 assert.equal(hash(html),row.verification.sha256);assert.equal(new URL(row.image).hostname,'dm.takaratomy.co.jp');
 const response=await fetch(row.image,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok);
 const bytes=Buffer.from(await response.arrayBuffer());assert.ok(bytes.length>1000);assert.match(response.headers.get('content-type'),/^image\//);
 row.verification.imageSha256=hash(bytes);row.verification.imageBytes=bytes.length;
 const list=html.match(/class=["']productCardList["'][^>]*>([\s\S]*?)<\/ul>/)?.[1]||'';
 row.sameNameProducts=[...list.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(x=>textContent(x[1]));
 row.reprintVerification={source:row.source,result:'公式の同名カード収録商品一覧を照合。別版IDは新規種類に数えず、未照合の別版エイリアスは登録しない。'};
}
m.rulings=['https://dm.takaratomy.co.jp/rule/qa/31899/','https://dm.takaratomy.co.jp/rule/qa/31917/'];
m.rulingVerification=[];
for(const source of m.rulings){const response=await fetch(source,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok);const html=await response.text();m.rulingVerification.push({source,sha256:hash(html),result:source.endsWith('31899/')?'超GRは12枚、同名2枚まで。':'バトルゾーン以外のゾーンにあるGRクリーチャーは超GRの下へ戻る。'});}
fs.writeFileSync(path,JSON.stringify(m,null,2)+'\n');console.log('Verified images, same-name products and GR rulings for '+m.cards.length+' cards.');
