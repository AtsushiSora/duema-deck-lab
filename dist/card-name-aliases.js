// Explicitly verified print-name variations. Do not erase significant spaces globally.
const aliases=new Map([['神拳の超人(アヴァランチ・ジャイアント)','神拳の超人'],['DX ブリキング','DXブリキング'],['月の死神ベル・ヘル・デ・スカル','月の死神 ベル・ヘル・デ・スカル'],['守護炎龍レヴィヤ・ターン','守護炎龍 レヴィヤ・ターン']]);
export function canonicalCardName(value){const name=String(value).normalize('NFKC').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();return aliases.get(name)??name;}
const verifiedTargets=new Set(aliases.values());
export const hasVerifiedCardNameAlias=value=>verifiedTargets.has(canonicalCardName(value));
