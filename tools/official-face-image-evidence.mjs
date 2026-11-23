// Fill absent printed fields only with explicit, hash-verified official image evidence.
import assert from'node:assert/strict';
import{createHash}from'node:crypto';
import{parseDetail}from'./detail-parser.mjs';
export async function verifiedOfficialFaces(html,row,fetchImage=async source=>{const r=await fetch(source,{signal:AbortSignal.timeout(30000)});assert.ok(r.ok&&r.headers.get('content-type')?.startsWith('image/'));return Buffer.from(await r.arrayBuffer());}){
 const faces=parseDetail(html,row).faces,evidence=row.faceImageEvidence,combined=row.kingCellCombinedEvidence;
 if(combined){
  assert.equal(faces.length,2);assert.equal(faces[0].typeText,'キング・セル');
  assert.equal(faces[1].typeText,'');assert.equal(faces[1].abilityText,'');assert.ok(faces[1].missingFields.includes('type'));
  assert.ok(combined.reviewedAt&&combined.reason);assert.equal(new URL(combined.source).hostname,'dm.takaratomy.co.jp');
  const response=await fetch(combined.source,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok);const reference=await response.text();
  assert.equal(createHash('sha256').update(reference).digest('hex'),combined.htmlSha256);
  const complete=parseDetail(reference,{id:combined.id,name:row.name}).faces;
  assert.deepEqual(complete[0],faces[0]);assert.equal(complete[1].typeText,'呪文');assert.ok(complete[1].abilityText.length>0);
  assert.deepEqual({...complete[1],typeText:'',abilityText:'',missingFields:['type']},faces[1]);
  const urls=[...reference.matchAll(/class=["']card-img["'][^>]*>\s*<img[^>]*src=["']([^"']+)/g)].map(x=>new URL(x[1],combined.source).href);
  assert.equal(urls[1],combined.image);assert.equal(new URL(combined.image).hostname,'dm.takaratomy.co.jp');
  assert.equal(createHash('sha256').update(await fetchImage(combined.image)).digest('hex'),combined.imageSha256);
  return complete;
 }
 if(!evidence)return faces;
 assert.ok(evidence.reviewedAt&&evidence.reason);assert.match(evidence.sha256,/^[a-f0-9]{64}$/);
 const src=html.match(/class=["']card-img["'][^>]*>\s*<img[^>]*src=["']([^"']+)/)?.[1];assert.ok(src);
 assert.equal(new URL(evidence.source).hostname,'dm.takaratomy.co.jp');assert.equal(evidence.source,new URL(src,row.source).href);
 const bytes=await fetchImage(evidence.source);assert.ok(bytes.length>1000);assert.equal(createHash('sha256').update(bytes).digest('hex'),evidence.sha256);
 assert.ok(Array.isArray(evidence.faces)&&evidence.faces.length>0);const seen=new Set;
 for(const entry of evidence.faces){
  const hasType=Object.hasOwn(entry,'typeText'),hasCivil=Object.hasOwn(entry,'civilizationText')||Object.hasOwn(entry,'civilizations');
  assert.ok(hasType||hasCivil);assert.deepEqual(Object.keys(entry).sort(),['index',...(hasType?['typeText']:[]),...(hasCivil?['civilizationText','civilizations']:[])].sort());
  assert.ok(!seen.has(entry.index));seen.add(entry.index);const face=faces[entry.index];assert.ok(face);
  if(hasType){assert.ok(Number.isInteger(entry.index)&&entry.index>0&&faces.length>1);assert.equal(entry.typeText,'呪文');assert.equal(face.typeText,'');assert.ok(face.missingFields.includes('type'));face.typeText='呪文';face.missingFields=face.missingFields.filter(x=>x!=='type');}
  assert.equal(face.typeText,'呪文');
  if(hasCivil){assert.equal(face.civilizationText,'');assert.deepEqual(face.civilizations,[]);assert.ok(face.missingFields.includes('civilization'));
   assert.ok(entry.civilizations.length>=1&&entry.civilizations.length<=5&&entry.civilizations.every(c=>['光','水','闇','火','自然'].includes(c)));assert.equal(new Set(entry.civilizations).size,entry.civilizations.length);assert.equal(entry.civilizationText,entry.civilizations.join('/'));
   face.civilizationText=entry.civilizationText;face.civilizations=[...entry.civilizations];face.missingFields=face.missingFields.filter(x=>x!=='civilization');
  }
 }

 return faces;
}
