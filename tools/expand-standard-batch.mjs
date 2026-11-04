// Discover once, verify the pinned manifest, then apply. No inferred support at runtime.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {scanStandardCandidates} from './scan-standard-candidates.mjs';
import {standardCardSpec} from './standard-card-spec.mjs';
import {championDefinition} from './champion-definition.mjs';
const read=f=>JSON.parse(fs.readFileSync(f)),write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');
const phase=Number(process.argv.find(a=>a.startsWith('--phase='))?.slice(8));
assert.ok(Number.isSafeInteger(phase)&&phase>=396,'Specify --phase=396 or a later phase');
const file=`tools/support-phase-${phase}.json`,batch=`phase-${phase}`,data=read('dist/cards.json'),details=read('dist/details.json');
if(process.argv.includes('--prepare')){
 assert.equal(data.supportExpansion.phase+1,phase,'Prepare only the next phase');
 assert.ok(!fs.existsSync(file),'A pinned manifest already exists; do not discard verification');
 const result=scanStandardCandidates(details.cards,data.cards,{phase});
 assert.ok(result.candidates.length,'No fully recognized candidates');
 write(file,{phase,checkedAt:new Date().toISOString().slice(0,10),baseCount:data.cards.length,description:'能力文全体を認識し、公式情報との照合後にまとめて対戦対応する。',rules:['https://dm.takaratomy.co.jp/rule/regulation/','https://dm.takaratomy.co.jp/rule/qa_old/35713/','https://dm.takaratomy.co.jp/rule/qa_old/36084/'],cards:result.candidates});
 console.log(JSON.stringify({candidates:result.candidates.length,blocked:result.blocked}));
}else{
 const m=read(file),refs=read('tools/image-reference-prints.json');
 assert.equal(m.phase,phase);assert.ok(m.cards.length&&m.regulationVerification?.limits);
 assert.ok(data.supportExpansion.phase===phase-1||data.supportExpansion.phase===phase);
 const seen=new Set();
 for(const row of m.cards){
  assert.ok(!seen.has(row.id));seen.add(row.id);
  const detail=details.cards.find(c=>c.id===row.id);assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase}));
  assert.ok(row.verification?.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(new URL(row.image).hostname,'dm.takaratomy.co.jp');
  const limit=m.regulationVerification.limits[row.id];assert.ok([0,1,4].includes(limit));
  const old=data.cards.find(c=>c.id===row.id||c.name===row.name);assert.ok(!old||old.supportBatch===batch,'Do not overwrite an existing definition');
  const c={...championDefinition(row,batch),limit:row.spec.g314Unlimited&&limit===4?40:limit,supportKind:row.faces[0].abilityText.trim()?'effect':'vanilla'};
  if(old)data.cards[data.cards.indexOf(old)]=c;else data.cards.push(c);
  const ref={id:row.id,canonicalId:row.id,name:row.name,image:row.image,source:row.source},i=refs.prints.findIndex(c=>c.id===row.id);if(i<0)refs.prints.push(ref);else refs.prints[i]=ref;
 }
 const old=data.supportExpansion,vanilla=m.cards.filter(c=>!c.faces[0].abilityText.trim()).length;
 assert.equal(data.cards.length,m.baseCount+m.cards.length);
 data.supportExpansion={phase,checkedAt:m.checkedAt,baseCount:m.baseCount,newEffectCards:m.cards.length-vanilla,newVanillaCards:vanilla,totalCount:data.cards.length,ruleSource:m.rules,next:['未対応能力を共通化し、公式照合と効果検証を済ませたカードをまとめて追加する'],history:[...(old.history||[]),Object.fromEntries(Object.entries(old).filter(([k])=>k!=='history'))].filter(x=>x.phase<phase)};
 write('dist/cards.json',data);write('tools/image-reference-prints.json',refs);
 console.log(`Added ${m.cards.length} types; ${data.cards.length} supported.`);
}
