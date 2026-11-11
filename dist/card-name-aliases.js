// Explicitly verified print-name variations. Do not erase significant spaces globally.
// The alternate delta glyph denotes the same card (official QA 32408).
const aliases=new Map([['終断δ ドルハカバ','終断Δ ドルハカバ'],["鼓舞の化身(ダンシング・トーテム)","鼓舞の化身"],['神拳の超人(アヴァランチ・ジャイアント)','神拳の超人'],['光封樹(トラップ・ツリー)','光封樹'],['DX ブリキング','DXブリキング'],['月の死神ベル・ヘル・デ・スカル','月の死神 ベル・ヘル・デ・スカル'],['守護炎龍レヴィヤ・ターン','守護炎龍 レヴィヤ・ターン'],["\\\"BC\\\" ヒット","\"BC\" ヒット"]]);
export function canonicalCardName(value){const name=String(value).normalize('NFKC').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();return aliases.get(name)??name;}
const verifiedTargets=new Set(aliases.values());
export const hasVerifiedCardNameAlias=value=>verifiedTargets.has(canonicalCardName(value));
