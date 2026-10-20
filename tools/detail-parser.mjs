import {extractName,canonicalName} from './catalogue-parser.mjs';
export const DETAIL_SCHEMA=2;
const iconNames={card_list_strigger:'S・トリガー',card_list_block:'ブロッカー',card_list_super_strigger:'スーパー・S・トリガー',card_list_strike_back:'ストライク・バック'};
const entities={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '};
export function textContent(html,{lines=false}={}){
 let s=String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi,'').replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/gi,'').replace(/<img\b[^>]*alt\s*=\s*(['"])(.*?)\1[^>]*>/gi,'$2');
 s=s.replace(/<br\s*\/?\s*>|<\/li>|<\/p>/gi,lines?'\n':' ').replace(/<[^>]*>/g,'');
 s=s.replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&(amp|quot|apos|lt|gt|nbsp);/g,(_,n)=>entities[n]);
 return lines?s.split('\n').map(x=>x.replace(/[\t\r ]+/g,' ').trim()).filter(Boolean).join('\n'):s.replace(/\s+/g,' ').trim();
}
const cell=(html,key)=>{const re=new RegExp('<td\\b[^>]*class\\s*=\\s*[\'\"]([^\'\"]*)[\'\"][^>]*>([\\s\\S]*?)<\\/td>','gi');for(const m of html.matchAll(re))if(m[1].split(/\s+/).includes(key))return {found:true,html:m[2],text:textContent(m[2])};return {found:false,html:'',text:''};};
const number=s=>/^\d+$/.test(s.normalize('NFKC').replace(/,/g,''))?Number(s.normalize('NFKC').replace(/,/g,'')):null;
export function parseDetail(html,expected){
 const title=extractName(html);if(!title||canonicalName(title)!==canonicalName(expected.name))throw Error('カード名を照合できません：'+expected.id);
 const sections=[...html.matchAll(/<h3\b[^>]*class\s*=\s*['"][^'"]*\bcard-name\b[^'"]*['"][^>]*>[\s\S]*?<\/h3>/gi)];
 const faces=sections.map((m,i)=>{
  const section=html.slice(m.index,sections[i+1]?.index??html.length),type=cell(section,'type'),civil=cell(section,'civil'),cost=cell(section,'cost'),skills=cell(section,'skills'),race=cell(section,'race'),power=cell(section,'power');
  const abilitySymbols=[];
  const skillHTML=skills.html.replace(/<img\b[^>]*>/gi,tag=>{const alt=tag.match(/\balt\s*=\s*(['"])(.*?)\1/i)?.[2],src=tag.match(/\bsrc\s*=\s*(['"])(.*?)\1/i)?.[2];if(alt)return alt;const key=src?.match(/([^/]+)\.(?:png|gif|jpg|svg)(?:\?|$)/i)?.[1];if(iconNames[key])return iconNames[key];if(src){const url=new URL(src,'https://dm.takaratomy.co.jp');if(url.origin==='https://dm.takaratomy.co.jp'){const token=`⟦公式記号${abilitySymbols.length+1}⟧`;abilitySymbols.push({token,source:url.href});return token;}}return '［公式記号：出典を参照］';});
  const typeText=type.text,civilizationText=civil.text,costText=cost.text,abilityText=textContent(skillHTML,{lines:true}),civilizations=['光','水','闇','火','自然'].filter(c=>civilizationText.includes(c));if(!civilizations.length&&/^(ゼロ|無色|0)$/.test(civilizationText))civilizations.push('無色');
  const missingFields=[['type',type],['civilization',civil],['cost',cost],['abilities',skills]].filter(([key,c])=>!c.found||key!=='abilities'&&!c.text).map(([key])=>key);
  return {name:extractName(m[0]),typeText,civilizationText,civilizations,cost:number(costText),costText,abilityText,...(abilitySymbols.length?{abilitySymbols}:{}),race:race.text,powerText:power.text,missingFields};
 });
 if(!faces.length)throw Error('カード詳細を読み取れません：'+expected.id);
 // The official twinpact page repeats the full name on each face.
 const parts=expected.name.split(/\s*\/\s*/);if(faces.length>1&&parts.length===faces.length&&faces.every(f=>canonicalName(f.name)===canonicalName(expected.name)))faces.forEach((f,i)=>f.name=parts[i]);
 return {id:expected.id,name:expected.name,source:expected.source,faces,status:faces.every(f=>!f.missingFields.length)?'complete':'partial',parserVersion:DETAIL_SCHEMA};
}
