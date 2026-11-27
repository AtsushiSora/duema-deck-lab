// Only complete, individually verified official prints are enabled in this campaign.
import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import assert from 'node:assert/strict';
const pins=JSON.parse(readFileSync(new URL('./target10000-card-spec.json',import.meta.url),'utf8'));
// Keep the original incomplete HTML intact; only the exact recorded blank may be supplemented.
export function target10000OfficialFaces(row,phase){
 const p=pins[row?.id];if(!p||phase<p.phase)return row?.faces;
 if(row.status==='complete'&&isDeepStrictEqual(row.faces,p.faces))return structuredClone(p.faces);
 const raw=p.rawOfficialDetail,evidence=p.faceImageEvidence;
 if(row.status!=='partial'||raw?.status!=='partial'||!isDeepStrictEqual(row.faces,raw.faces)||!evidence)
  throw Error('公式能力全文の不一致: '+row.id);
 assert.ok(evidence.reviewedAt&&evidence.reason);assert.match(evidence.sha256,/^[a-f0-9]{64}$/);
 assert.equal(new URL(evidence.source).hostname,'dm.takaratomy.co.jp');
 assert.ok(evidence.faces?.length);const faces=structuredClone(row.faces),seen=new Set();
 for(const entry of evidence.faces){
  assert.deepEqual(Object.keys(entry).sort(),['index','civilizationText','civilizations'].sort());
  assert.ok(Number.isInteger(entry.index)&&entry.index>0&&!seen.has(entry.index));seen.add(entry.index);
  const face=faces[entry.index];assert.equal(face?.typeText,'呪文');
  assert.equal(face.civilizationText,'');assert.deepEqual(face.civilizations,[]);assert.deepEqual(face.missingFields,['civilization']);
  assert.ok(entry.civilizations.length>0&&entry.civilizations.every(c=>['光','水','闇','火','自然'].includes(c)));
  assert.equal(new Set(entry.civilizations).size,entry.civilizations.length);
  assert.equal(entry.civilizationText,entry.civilizations.join('/'));
  face.civilizationText=entry.civilizationText;face.civilizations=[...entry.civilizations];face.missingFields=[];
 }
 assert.ok(faces.every(f=>f.missingFields.length===0));assert.deepEqual(faces,p.faces);
 assert.deepEqual(p.spec.spellFace.civilizations,faces[1].civilizations);
 return faces;
}
export function target10000CardSpec(row,phase){const p=pins[row?.id];if(!p||phase<p.phase)return null;target10000OfficialFaces(row,phase);return structuredClone(p.spec);}
