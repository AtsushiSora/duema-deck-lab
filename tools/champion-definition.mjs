// Only explicitly implemented specs are eligible for the battle catalogue.
export function championDefinition(row,batch='phase-64'){
 const f=row.faces[0];return{id:row.id,name:row.name,civ:f.civilizationText,civilizations:f.civilizations.filter(c=>['光','水','闇','火','自然'].includes(c)),manaValue:1,type:f.typeText==='呪文'?'spell':f.typeText.includes('タマシード')?'seed':f.typeText.includes('フィールド')?'field':'creature',cost:f.costText==='∞'?'∞':f.cost,power:parseInt(f.powerText,10)||0,race:f.race,text:row.faces.map(f=>f.abilityText).join('\n【呪文面】\n'),source:row.source,limit:4,...row.spec,supportBatch:batch,supportKind:'effect'};
}
