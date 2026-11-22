import assert from'node:assert/strict';
import{nameKey}from'../dist/catalogue.js';
// Preserve every saved catalogue entry. Only new, fully verified print aliases may be appended.
export function assertVerifiedCatalogueExtension(before,current,{supported,manifests}){
 const remaining=structuredClone(current),added=[];
 for(const[id,canonicalId]of Object.entries(current.aliases||{})){
  if(Object.hasOwn(before.aliases||{},id))continue;
  const canonical=supported.find(c=>c.id===canonicalId);
  assert.ok(canonical,'Alias target is unsupported: '+id);
  assert.ok(!before.cards.some(c=>c.id===id)&&!supported.some(c=>c.id===id),'Alias would replace an existing ID: '+id);
  const evidence=manifests.flatMap(m=>(m.printAliases||[]).map(r=>({m,r}))).find(({r})=>r.id===id&&r.canonicalId===canonicalId);
  assert.ok(evidence,'Missing official alias evidence: '+id);
  const{m,r}=evidence,target=m.cards.find(c=>c.id===canonicalId);
  assert.ok(target,'Alias target lacks a pinned full definition: '+id);
  assert.equal(nameKey(r.name),nameKey(canonical.name));
  assert.equal(new URL(r.source).hostname,'dm.takaratomy.co.jp');
  assert.equal(new URL(r.source).searchParams.get('id'),id);
  assert.deepEqual(r.faces,target.faces,'Print faces differ: '+id);
  assert.ok(r.verification?.facesMatched&&r.imageReviewed&&r.allAbilitiesAndBasicInformationMatched,'Unverified print alias: '+id);
  assert.match(r.verification.sha256,/^[a-f\d]{64}$/);
  assert.match(r.verification.imageSha256,/^[a-f\d]{64}$/);
  assert.ok([0,1,4].includes(m.regulationVerification?.limits[id]),'Alias restriction not verified: '+id);
  delete remaining.aliases[id];added.push({id,canonicalId,phase:m.phase});
 }
 assert.deepEqual(remaining,before,'Existing catalogue IDs, metadata or aliases changed');
 return added;
}
