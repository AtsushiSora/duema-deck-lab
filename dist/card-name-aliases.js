// Explicitly verified print-name variations. Do not erase significant spaces globally.
const aliases=new Map([['DX ブリキング','DXブリキング']]);
export function canonicalCardName(value){const name=String(value).normalize('NFKC').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();return aliases.get(name)??name;}
const verifiedTargets=new Set(aliases.values());
export const hasVerifiedCardNameAlias=value=>verifiedTargets.has(canonicalCardName(value));
