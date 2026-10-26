import {nameKey} from '../dist/catalogue.js';
// Read official deck tables without deleting angle brackets in evolution-card names.
export const officialText=s=>s.replace(/<!--[\s\S]*?-->/g,'').replace(/<\/?(?:a|b|strong|span|small|font|i|em)\b[^>]*>/gi,'').replace(/<\/?(?:p|div|br|h\d|td|tr|li)\b[^>]*>/gi,'\n').replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/\n\s*\n/g,'\n').trim();
const compact=s=>nameKey(s).replace(/\s/g,'');
function resolveOfficialCard(registry,raw,printId){
 const direct=registry.byName.get(nameKey(raw))||registry.get(printId);if(direct)return direct;
 const matches=registry.cards.filter(c=>compact(c.name)===compact(raw));if(matches.length===1)return matches[0];
 // The older catalogue truncated this name at '<'. Verified against the original official card detail.
 if(compact(raw)===compact('キャンベロ <レッゾ.Star>'))return registry.get('dmrp19-s05');
}
function result(header,cards){return{header,player:header[0],cards,mainCount:cards.filter(c=>c.zone==='main').reduce((n,c)=>n+c.count,0),extraCount:cards.filter(c=>c.zone!=='main').reduce((n,c)=>n+c.count,0)};}
export function parseOfficialHistory(html,registry){
 const table=html.match(/<table class="deckList">([\s\S]*?)<\/table>/)?.[1],meta=html.match(/<table class="deckName">([\s\S]*?)<\/table>/)?.[1];if(!table||!meta)return[];
 const metadata=[...meta.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m=>officialText(m[1])),[deckName,date,event,player]=metadata,cards=[];let zone='main';
 for(const m of table.matchAll(/<td\b[^>]*class="zone"[^>]*>([\s\S]*?)<\/td>|<td>\s*(\d+)\s*<\/td>\s*<td>\s*<a[^>]*href=['"]\/card\/detail\/\?id=([^'"]*)['"][^>]*>([\s\S]*?)<\/a>\s*<\/td>/g)){
  if(m[1]){zone=officialText(m[1]);continue;}
  const raw=officialText(m[4]).replace(/^[《≪]|[》≫]$/g,'').trim(),card=resolveOfficialCard(registry,raw,m[3]);cards.push({id:card?.id||null,name:card?.name||raw,printedName:raw,printId:m[3],count:Number(m[2]),zone});
 }
 return[{...result([player,event,date,deckName],cards),deckName,date,event}];
}
export function parseOfficialDeckLists(html,registry){
 if(html.includes('class="deckList"'))return parseOfficialHistory(html,registry);
 const heads=[...html.matchAll(/<td\b[^>]*align=["']?center["']?[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>({index:m.index,label:officialText(m[1])})).filter(x=>/構築|デッキリスト|DMGP|DM.?GP|全国大会|超CS|超ＣＳ|グランプリ/.test(x.label)&&x.label.split('\n').length>=2);
 return heads.map((h,i)=>{const part=html.slice(h.index,heads[i+1]?.index||html.length),lines=h.label.split('\n').map(x=>x.trim()).filter(Boolean),sections=[...part.matchAll(/<font[^>]*>([\s\S]*?)<\/font>/g)].map(m=>({index:m.index,label:officialText(m[1])})).filter(x=>/^\s*\d+/.test(x.label)),cards=[];
 for(const m of part.matchAll(/(\d+)\s*(?:<\/(?:b|strong)>)?\s*<a[^>]*href=['"](?:https:\/\/dm\.takaratomy\.co\.jp)?\/card\/detail\/\?id=([^'"]*)['"][^>]*>([\s\S]*?)<\/a>/g)){
 const raw=officialText(m[3]).replace(/^[《≪]|[》≫]$/g,'').trim(),card=resolveOfficialCard(registry,raw,m[2]),heading=sections.filter(x=>x.index<m.index).at(-1)?.label||'メインデッキ',zone=/超次元|超GR|超ＧＲ|最終禁断|零龍|禁断|外部|超ガチャ/.test(heading)?heading.replace(/^\d+\s*/, ''):'main';
 cards.push({id:card?.id||null,name:card?.name||raw,printedName:raw,printId:m[2],count:Number(m[1]),zone});
 }
 return result(lines,cards);
 }).filter(d=>d.cards.length);
}
