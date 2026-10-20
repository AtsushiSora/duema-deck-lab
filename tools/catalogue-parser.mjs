export const canonicalName=s=>String(s).normalize('NFKC').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
// Official query spelling is significant, including literal plus and dollar symbols.
export const officialDetailURL=id=>'https://dm.takaratomy.co.jp/card/detail/?id='+id;
const decode=s=>s.replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&quot;/g,'"').replace(/&#039;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
export function extractName(html){const match=html.match(/<h3[^>]*class=['"][^'"]*card-name[^'"]*['"][^>]*>([\s\S]*?)<\/h3>/i);if(!match)return '';return decode(match[1].replace(/<span[^>]*class=['"]packname['"][\s\S]*$/i,'').replace(/<rt[^>]*>[\s\S]*?<\/rt>/g,'').replace(/<[^>]*>/g,'')).replace(/\s+/g,' ').trim();}
export function extractIndex(html){const total=Number(html.match(/id\s*=\s*['"]total_count['"][^>]*>(\d+)/)?.[1]);const ids=[...new Set([...html.matchAll(/data-href=['"]\/card\/detail\/\?id=([^'"]+)/g)].map(m=>m[1]))];return {total,ids};}
export function mergeCatalogue(rows,supported){
 const byName=new Map(),aliases={};
 for(const c of supported)byName.set(canonicalName(c.name),{id:c.id,name:c.name,source:c.source,supported:true,limit:c.limit});
 for(const row of rows){if(!row||!row.name||!row.id)throw Error('Invalid card record');const key=canonicalName(row.name),previous=byName.get(key);if(previous){if(previous.id!==row.id)aliases[row.id]=previous.id;}else byName.set(key,{...row,supported:false});}
 const cards=[...byName.values()].sort((a,b)=>a.name.localeCompare(b.name,'ja'));return {cards,aliases};
}
