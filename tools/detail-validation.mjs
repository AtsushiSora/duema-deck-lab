import{canonicalName}from'./catalogue-parser.mjs';
export function validateDetails(details,catalogue){
 if(details.previewOnly||details.processedCount!==catalogue.cards.length||details.registeredNameCount!==catalogue.cards.length||details.cards.length!==catalogue.cards.length)throw Error('カード詳細の全件取得が完了していません');
 const byId=new Map(details.cards.map(c=>[c.id,c]));if(byId.size!==details.cards.length)throw Error('カード詳細のIDが重複しています');
 let complete=0,partial=0,faces=0;
 for(const c of catalogue.cards){const r=byId.get(c.id);if(!r||canonicalName(r.name)!==canonicalName(c.name)||r.source!==c.source)throw Error('カード詳細の照合に失敗しました：'+c.id);if(r.detailSource&&!/^https:\/\/dm\.takaratomy\.co\.jp\/card\/detail\/\?id=/.test(r.detailSource))throw Error('再録の出典が不正です：'+c.id);if(!Array.isArray(r.faces)||!r.faces.length)throw Error('カードの面がありません：'+c.id);
  for(const f of r.faces){faces++;for(const key of ['name','typeText','civilizationText','costText','abilityText'])if(typeof f[key]!=='string')throw Error('カードの必須項目が不正です：'+c.id+' / '+key);if(f.cost!==null&&(!Number.isSafeInteger(f.cost)||f.cost<0))throw Error('コストが不正です：'+c.id);if(!Array.isArray(f.civilizations)||f.civilizations.some(x=>!['光','水','闇','火','自然','無色'].includes(x)))throw Error('文明が不正です：'+c.id);if(!Array.isArray(f.missingFields))throw Error('未掲載項目の情報がありません：'+c.id);for(const symbol of f.abilitySymbols||[]){if(!f.abilityText.includes(symbol.token)||new URL(symbol.source).origin!=='https://dm.takaratomy.co.jp')throw Error('能力文の記号が不正です：'+c.id);}}
  const expected=r.faces.some(f=>f.missingFields.length)?'partial':'complete';if(r.status!==expected)throw Error('情報の取得状態が一致しません：'+c.id);if(expected==='complete')complete++;else partial++;
 }
 if(details.completeCount!==complete||details.partialCount!==partial)throw Error('詳細の集計件数が一致しません');return {registered:byId.size,complete,partial,faces};
}
