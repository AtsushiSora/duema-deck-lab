// Only fill an absent spell civilization after reviewing the exact official image.
import assert from'node:assert/strict';
import{createHash}from'node:crypto';
import{parseDetail}from'./detail-parser.mjs';
export async function verifiedOfficialFaces(html,row,fetchImage=async source=>{const r=await fetch(source,{signal:AbortSignal.timeout(30000)});assert.ok(r.ok&&r.headers.get('content-type')?.startsWith('image/'));return Buffer.from(await r.arrayBuffer());}){
 const faces=parseDetail(html,row).faces,evidence=row.faceImageEvidence;if(!evidence)return faces;
 assert.ok(evidence.reviewedAt&&evidence.reason);assert.match(evidence.sha256,/^[a-f0-9]{64}$/);
 const src=html.match(/class=["']card-img["'][^>]*>\s*<img[^>]*src=["']([^"']+)/)?.[1];assert.ok(src);
 assert.equal(new URL(evidence.source).hostname,'dm.takaratomy.co.jp');assert.equal(evidence.source,new URL(src,row.source).href);
 const bytes=await fetchImage(evidence.source);assert.ok(bytes.length>1000);assert.equal(createHash('sha256').update(bytes).digest('hex'),evidence.sha256);
 assert.ok(Array.isArray(evidence.faces)&&evidence.faces.length>0);const seen=new Set;
 for(const entry of evidence.faces){assert.deepEqual(Object.keys(entry).sort(),['civilizationText','civilizations','index']);assert.ok(!seen.has(entry.index));seen.add(entry.index);const face=faces[entry.index];assert.ok(face&&face.typeText==='呪文');assert.equal(face.civilizationText,'');assert.deepEqual(face.civilizations,[]);assert.ok(face.missingFields.includes('civilization'));
  assert.ok(entry.civilizations.length>=1&&entry.civilizations.length<=5&&entry.civilizations.every(c=>['光','水','闇','火','自然'].includes(c)));assert.equal(new Set(entry.civilizations).size,entry.civilizations.length);assert.equal(entry.civilizationText,entry.civilizations.join('/'));
  face.civilizationText=entry.civilizationText;face.civilizations=[...entry.civilizations];face.missingFields=face.missingFields.filter(x=>x!=='civilization');
 }
 return faces;
}
