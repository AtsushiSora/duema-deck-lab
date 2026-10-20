import {writeFile,mkdir} from 'node:fs/promises';
const ids=[...Array.from({length:36},(_,i)=>i+75),...Array.from({length:16},(_,i)=>i+40)];
const records=[];
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
for(let i=0;i<ids.length;i+=4){
  await Promise.all(ids.slice(i,i+4).map(async n=>{
    const id=`dm01-${String(n).padStart(3,'0')}`,url=`https://dm.takaratomy.co.jp/card/detail/?id=${id}`;
    const html=await(await fetch(url)).text();
    const start=html.indexOf('カードの種類');
    const title=clean(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]||'');
    const text=clean(html.slice(start,html.indexOf('同名カード',start)));
    records.push({id,url,title,text});
  }));
}
await mkdir('tools/research',{recursive:true});
await writeFile('tools/research/official-cards.json',JSON.stringify(records.sort((a,b)=>a.id.localeCompare(b.id)),null,2));
for(const x of records.sort((a,b)=>a.id.localeCompare(b.id)))console.log(x.id,x.title,x.text.slice(0,700));
