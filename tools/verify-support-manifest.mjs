// Fetch and compare every official face before enabling a batch. Never execute page content.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseDetail,textContent,printedManaValue} from './detail-parser.mjs';
import {standardCardSpec} from './standard-card-spec.mjs';
const file=process.argv[2];assert.match(file||'',/^tools\/support-phase-\d+\.json$/);
const m=JSON.parse(fs.readFileSync(file)),cache='/tmp/duema-official-phase-'+m.phase;
fs.mkdirSync(cache,{recursive:true});
// Verify alternate print names without registering a second battle definition.
const rows=[...m.cards,...(m.printAliases||[])];
async function fetchPage(url){assert.equal(new URL(url).hostname,'dm.takaratomy.co.jp');for(let i=0;i<3;i++)try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.ok(r.ok,url+' '+r.status);return await r.text();}catch(e){if(i===2)throw e;}}
async function verifyMana(row,html){
 const expected=row.spec?.manaValue??1,printed=printedManaValue(html);
 if(!row.manaReference){assert.equal(printed,expected,row.name+'：公式のマナ数が一致しません');return;}
 // A catalogue print with a dash for mana can use a same-name printing with matching rules.
 assert.equal(printed,0);
 const ref=row.manaReference,reference=await fetchPage(ref.source);
 assert.equal(ref.name,row.name);
 const detail=parseDetail(reference,ref);
 assert.deepEqual(detail.faces,ref.faces);
 const stats=faces=>faces.map(({abilityText,...face})=>face);
 assert.deepEqual(stats(detail.faces),stats(row.faces));
 const normalizeLabels=(key,value)=>key==='label'?value.replace(/\s/g,''):value;
 assert.equal(JSON.stringify(standardCardSpec(detail,{phase:m.phase}),normalizeLabels),JSON.stringify(row.spec,normalizeLabels));
 assert.equal(printedManaValue(reference),expected);
 ref.verification={checkedAt:m.checkedAt,sha256:createHash('sha256').update(reference).digest('hex'),facesMatched:true,manaValue:expected};
}
let index=0,completed=0;
await Promise.all(Array.from({length:6},async()=>{for(;;){const row=rows[index++];if(!row)return;const path=cache+'/'+row.id+'.html',html=process.argv.includes('--resume')&&fs.existsSync(path)?fs.readFileSync(path,'utf8'):await fetchPage(row.source);assert.deepEqual(parseDetail(html,row).faces,row.faces,row.name);await verifyMana(row,html);fs.writeFileSync(path,html);const image=html.match(/class=["']card-img["'][^>]*>\s*<img[^>]*src=["']([^"']+)/)?.[1];assert.ok(image,row.name);row.image=new URL(image,row.source).href;row.verification={checkedAt:m.checkedAt,sha256:createHash('sha256').update(html).digest('hex'),facesMatched:true};if(row.currentPrint){const q=row.currentPrint,currentHtml=await fetchPage(q.source);assert.equal(q.name,row.name);assert.deepEqual(parseDetail(currentHtml,q).faces,q.faces,row.name+'：後発の公式表記');assert.equal(row.spec?.manaValue??1,printedManaValue(currentHtml));fs.writeFileSync(cache+'/'+q.id+'.html',currentHtml);q.verification={checkedAt:m.checkedAt,sha256:createHash('sha256').update(currentHtml).digest('hex'),facesMatched:true};}if(++completed%25===0)console.log('Verified official faces '+completed+'/'+rows.length);}}));
const source='https://dm.takaratomy.co.jp/rule/regulation/',html=await fetchPage(source);fs.writeFileSync(cache+'/regulation.html',html);
const clean=html.replace(/<!--[\s\S]*?-->/g,''),norm=s=>s.replace(/[《》≪≫\s]/g,'').normalize('NFKC'),names=s=>[...s.matchAll(/<a\b[^>]*href=["'][^"']*card\/detail\/\?[^>]*>([\s\S]*?)<\/a>/g)].map(x=>norm(textContent(x[1]))),prem=clean.indexOf('<h2>プレミアム殿堂入りカード</h2>'),one=clean.indexOf('<h2>殿堂入りカード</h2>'),end=clean.indexOf('<h2>使用禁止カード</h2>');
assert.ok(prem>=0&&one>prem&&end>one);const bans=names(clean.slice(prem,one)),ones=names(clean.slice(one,end)),limits={};for(const row of rows){const n=norm(row.name);limits[row.id]=bans.includes(n)?0:ones.includes(n)?1:4;}
m.regulationVerification={source,checkedAt:m.checkedAt,sha256:createHash('sha256').update(html).digest('hex'),cardNameCount:bans.length+ones.length,scope:'Current premium and restricted headings excluding comments',limits};
fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');console.log('Verified '+completed+' official definitions and restrictions. Limited cards: '+JSON.stringify(m.cards.filter(c=>limits[c.id]!==4).map(c=>[c.name,limits[c.id]])));
