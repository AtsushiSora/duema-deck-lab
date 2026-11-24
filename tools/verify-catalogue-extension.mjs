import assert from'node:assert/strict';
import{nameKey}from'../dist/catalogue.js';
import{standardCardSpec}from'./standard-card-spec.mjs';
// Older official HTML sometimes appends the evolution method to the card type.
// Both printed images say 進化クリーチャー; require identical pinned full abilities below.
// Explicit evidence can equate the two wave-dash glyphs used by official reprints.
// This affects verification only; runtime name keys and saved IDs stay unchanged.
const waveName=name=>nameKey(name).replace(/[〜～~]/g,'~');
const printBasic=(faces,waveDash=false)=>faces.map(({abilityText,...basic})=>({...basic,
 ...(waveDash?{name:waveName(basic.name)}:{}),
 typeText:['進化クリーチャー(超無限進化・Ω)','進化クリーチャー(墓地進化)'].includes(basic.typeText?.normalize('NFKC'))?'進化クリーチャー':basic.typeText}));
// Preserve every saved entry. Verified print names may merge display counts without removing IDs.
export function assertVerifiedCatalogueExtension(before,current,{supported,manifests}){
 const remaining=structuredClone(current),added=[];
 if(current.registeredNameCount!==before.registeredNameCount){
  assert.equal(current.registeredNameCount,new Set(current.cards.map(c=>nameKey(c.name))).size,'Canonical name count differs from actual catalogue rows');
  const merged=new Set();
  for(const m of manifests)for(const a of m.nameAliases||[]){
   const from=before.cards.find(c=>c.name===a.from),to=before.cards.find(c=>c.name===a.to);
   assert.ok(from&&to&&from.id!==to.id,'Name alias must preserve two existing print records');
   assert.notEqual(a.from,a.to);assert.equal(nameKey(a.from),nameKey(a.to));
   const r=m.printAliases?.find(r=>r.id===from.id&&r.canonicalId===a.canonicalId),target=[...m.cards,...(m.existingCards||[])].find(r=>r.id===a.canonicalId);
   const canonical=supported.find(c=>c.id===a.canonicalId);
   assert.ok(r&&target&&canonical&&to.id===a.canonicalId,'Missing full official name-alias evidence');
   assert.equal(r.name,a.from);assert.equal(target.name,a.to);assert.equal(canonical.name,a.to);
   for(const row of[r,target]){
    assert.equal(new URL(row.source).hostname,'dm.takaratomy.co.jp');assert.equal(new URL(row.source).searchParams.get('id'),row.id);
    assert.ok(row.verification?.facesMatched&&row.imageReviewed&&row.allAbilitiesAndBasicInformationMatched);
    assert.match(row.verification.sha256,/^[a-f\d]{64}$/);assert.match(row.verification.imageSha256,/^[a-f\d]{64}$/);
    assert.ok([0,1,4].includes(m.regulationVerification?.limits[row.id]));
    assert.deepEqual(standardCardSpec({id:row.id,name:row.name,status:'complete',faces:row.faces},{phase:m.phase}),target.spec);
   }
   const basic=faces=>faces.map(({abilityText,...f})=>({...f,name:nameKey(f.name)}));
   assert.deepEqual(basic(r.faces),basic(target.faces));
   for(const[k,v]of Object.entries(target.spec))assert.deepEqual(canonical[k],v);
   merged.add(a.from);
  }
  assert.equal(before.registeredNameCount-current.registeredNameCount,merged.size,'Name count change lacks matching official print evidence');
  remaining.registeredNameCount=before.registeredNameCount;
 }
 for(const[id,canonicalId]of Object.entries(current.aliases||{})){
  if(Object.hasOwn(before.aliases||{},id))continue;
  const canonical=supported.find(c=>c.id===canonicalId);
  assert.ok(canonical,'Alias target is unsupported: '+id);
  const evidence=manifests.flatMap(m=>(m.printAliases||[]).map(r=>({m,r}))).find(({r})=>r.id===id&&r.canonicalId===canonicalId);
  assert.ok(evidence,'Missing official alias evidence: '+id);
  const{m,r}=evidence,target=m.cards.find(c=>c.id===canonicalId);
  assert.ok(target,'Alias target lacks a pinned full definition: '+id);
  const waveDash=r.printNameNormalization==='wave-dash-only';
  assert.equal(waveDash?waveName(r.name):nameKey(r.name),waveDash?waveName(canonical.name):nameKey(canonical.name));
  const existing=before.cards.find(c=>c.id===id);
  assert.ok(!supported.some(c=>c.id===id)&&(!existing||waveDash&&existing.name===r.name),
   'Alias would replace an existing ID without exact official wave-dash print evidence: '+id);
  assert.equal(new URL(r.source).hostname,'dm.takaratomy.co.jp');
  assert.equal(new URL(r.source).searchParams.get('id'),id);
  try{assert.deepEqual(r.faces,target.faces);}catch{
   assert.deepEqual(printBasic(r.faces,waveDash),printBasic(target.faces,waveDash),'Print basic fields differ: '+id);
   assert.deepEqual(standardCardSpec({id:r.id,name:r.name,status:'complete',faces:r.faces},{phase:m.phase}),target.spec,'Full print abilities differ: '+id);
  }
  assert.ok(r.verification?.facesMatched&&r.imageReviewed&&r.allAbilitiesAndBasicInformationMatched,'Unverified print alias: '+id);
  assert.match(r.verification.sha256,/^[a-f\d]{64}$/);
  assert.match(r.verification.imageSha256,/^[a-f\d]{64}$/);
  assert.ok([0,1,4].includes(m.regulationVerification?.limits[id]),'Alias restriction not verified: '+id);
  delete remaining.aliases[id];added.push({id,canonicalId,phase:m.phase});
 }
 assert.deepEqual(remaining,before,'Existing catalogue IDs, metadata or aliases changed');
 return added;
}
