import {canonicalName}from'./catalogue-parser.mjs';
const decode=s=>s.replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&quot;/g,'"').replace(/&#039;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
const clean=s=>decode(s.replace(/<rt[^>]*>[\s\S]*?<\/rt>/g,'').replace(/<\/?[a-z][a-z0-9:-]*(?:\s[^<>]*)?\s*\/?\s*>/gi,'')).trim();
export function parseStarter25Page(html,byName){
 const name=clean(html.match(/<h1[^>]*class="h1_basic01[^"]*"[^>]*>([\s\S]*?)<\/h1>/)?.[1]||'');
 const section=html.split(/<h3[^>]*>\s*カード枚数\s*<\/h3>/)[1]?.split(/<h3[^>]*>\s*このデッキの使い方\s*<\/h3>/)[0];if(!name||!section)throw Error('公式デッキの構成欄を読み取れません');
 const cards=[...section.matchAll(/(\d+)枚\s*<a[^>]*href=['"]\/card\/detail\/\?id=([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/g)].map(m=>{const officialName=clean(m[3]).replace(/^《|》$/g,''),c=byName.get(canonicalName(officialName));if(!c)throw Error('未登録の公式カード名：'+officialName);return{count:Number(m[1]),name:c.name,id:c.id,printId:decode(m[2]),officialName};});
 if(cards.reduce((n,r)=>n+r.count,0)!==40||new Set(cards.map(r=>r.id)).size!==cards.length)throw Error('公式デッキの40枚を確認できません');
 return{name,cards};
}
