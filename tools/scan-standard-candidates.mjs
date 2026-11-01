// Discovery only. Enabling cards still requires official verification and effect tests.
import fs from'node:fs';
import{fileURLToPath}from'node:url';
import{standardCardSpec}from'./standard-card-spec.mjs';
const nameKey=s=>String(s).normalize('NFKC').replace(/\s/g,'');
function exactNames(value,out=new Set()){
 if(!value||typeof value!=='object')return out;
 if(typeof value.g201ExactName==='string')out.add(value.g201ExactName);
 for(const v of Object.values(value))exactNames(v,out);
 return out;
}
export function scanStandardCandidates(details,implemented,{phase}={}){
 if(!Number.isSafeInteger(phase)||phase<165)throw Error('有効な対応段階を指定してください');
 const known=new Set(implemented.map(c=>nameKey(c.name))),candidates=[],blocked=[],reasons={};
 for(const row of details){
  if(known.has(nameKey(row.name)))continue;
  let spec;try{spec=standardCardSpec(row,{phase});}catch(e){const reason=e.message.split(':')[0];reasons[reason]=(reasons[reason]||0)+1;continue;}
  const missing=[...exactNames(spec)].filter(n=>!known.has(nameKey(n))&&nameKey(n)!==nameKey(row.name));
  if(missing.length){blocked.push({id:row.id,name:row.name,missingExactNames:missing});continue;}
  candidates.push({id:row.id,name:row.name,source:row.detailSource||row.source,faces:row.faces,spec});
 }
 return{phase,candidates,blocked,reasons};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'));
 const data=read('../dist/cards.json'),details=read('../dist/details.json');
 const arg=process.argv.find(a=>a.startsWith('--phase=')),phase=arg?Number(arg.slice(8)):data.supportExpansion.phase;
 console.log(JSON.stringify(scanStandardCandidates(details.cards,data.cards,{phase}),null,2));
}
