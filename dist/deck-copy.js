// Copies belong to the destination collection. Never share editable card rows.
const fingerprint=(deck,registry)=>JSON.stringify(registry.resolveRows(deck.cards).sort((a,b)=>a.id.localeCompare(b.id)));
export function prepareDeckCopy(existing,source,registry,{id,created,category='自分'}={}){
 if(!['自分','相手'].includes(category))throw Error('保存先が正しくありません');
 const errors=registry.validate(source);if(errors.length)throw Error(errors.join(' / '));
 const signature=fingerprint(source,registry);
 const found=existing.find(d=>{try{return d.format===source.format&&fingerprint(d,registry)===signature;}catch{return false;}});
 if(found)return {deck:found,alreadyExists:true};
 if(!id||existing.some(d=>d.id===id))throw Error('新しいデッキIDが必要です');
 return {deck:{...structuredClone(source),cards:registry.resolveRows(source.cards),id,category,created,updated:created,templateId:source.id},alreadyExists:false};
}
