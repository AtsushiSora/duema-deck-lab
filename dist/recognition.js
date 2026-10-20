export function normalizeName(s){return String(s).normalize('NFKC').toLowerCase().replace(/[\s・･「」『』《》ー\-―_!！?？。、,:：/\\()（）]/g,'');}
function distance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return row[b.length];}
export function parseCandidates(text,cards){
 const rows=new Map();let unknown=0;
 for(const raw of text.split('\n').filter(x=>x.trim())){
  const line=raw.normalize('NFKC').trim();
  const match=line.match(/(?:[×x✕]\s*|\s)([1-4])\s*(?:枚)?\s*$/)||line.match(/^\s*([1-4])\s+/);
  const nameText=line.replace(/^\s*[1-4]\s+/,'').replace(/(?:[×x✕]\s*|\s)[1-4]\s*(?:枚)?\s*$/,'');
  const n=normalizeName(nameText);if(n.length<3)continue;
  let candidate=cards.find(c=>n.includes(normalizeName(c.name))),fuzzy=false;
  if(!candidate){const ranked=cards.map(c=>({c,score:1-distance(n,normalizeName(c.name))/Math.max(n.length,normalizeName(c.name).length)})).sort((a,b)=>b.score-a.score);if(ranked[0]?.score>=.64){candidate=ranked[0].c;fuzzy=true;}}
  if(!candidate){if(match)rows.set('unknown-'+unknown++,{id:'',count:Number(match[1]),confirmed:false,original:line.slice(0,70)});continue;}
  const count=match?Number(match[1]):1,prev=rows.get(candidate.id);if(prev)prev.count=Math.min(4,prev.count+count);else rows.set(candidate.id,{id:candidate.id,count,confirmed:false,fuzzy,original:line.slice(0,70)});
 }
 return [...rows.values()];
}
