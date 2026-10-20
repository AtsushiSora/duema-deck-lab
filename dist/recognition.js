export function normalizeName(s){return String(s).normalize('NFKC').toLowerCase().replace(/[\s・･「」『』《》ー\-―_!！?？。、,:：/\\()（）]/g,'');}
function distance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return row[b.length];}
const prepared=new WeakMap();
export function parseCandidates(text,cards){
 let index=prepared.get(cards);if(!index){index=cards.map(c=>({c,n:normalizeName(c.name)})).sort((a,b)=>b.n.length-a.n.length);prepared.set(cards,index);}
 const rows=new Map();let unknown=0;
 for(const raw of text.split('\n').filter(x=>x.trim())){
  const line=raw.normalize('NFKC').trim();
  const match=line.match(/(?:[×x✕]\s*|\s)([1-9]\d?)\s*(?:枚)?\s*$/)||line.match(/^\s*([1-9]\d?)\s+/);
  const nameText=line.replace(/^\s*[1-9]\d?\s+/,'').replace(/(?:[×x✕]\s*|\s)[1-9]\d?\s*(?:枚)?\s*$/,'');
  const n=normalizeName(nameText);if(n.length<1||n.length>120)continue;
  let candidate=index.find(x=>n.includes(x.n))?.c,fuzzy=false;
  if(!candidate&&n.length>=3){let best=.64;for(const x of index){if(Math.min(n.length,x.n.length)/Math.max(n.length,x.n.length)<best)continue;const score=1-distance(n,x.n)/Math.max(n.length,x.n.length);if(score>=best){candidate=x.c;best=score;fuzzy=true;}}}
  if(!candidate){if(match)rows.set('unknown-'+unknown++,{id:'',count:Number(match[1]),confirmed:false,original:line.slice(0,70)});continue;}
  const count=match?Number(match[1]):1,prev=rows.get(candidate.id);if(prev)prev.count=Math.min(40,prev.count+count);else rows.set(candidate.id,{id:candidate.id,count,confirmed:false,fuzzy,original:line.slice(0,70)});
 }
 return [...rows.values()];
}
