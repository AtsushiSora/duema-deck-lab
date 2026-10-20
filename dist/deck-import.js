// Exact name matching for text imports; OCR corrections are handled separately.
import {nameKey} from './catalogue.js';
export function parseList(text,registry){
 const counts=new Map();
 for(const raw of text.split('\n')){
  const line=raw.normalize('NFKC').trim();if(!line)continue;
  const leading=line.match(/^(\d{1,2})\s+(.+)$/),trailing=line.match(/^(.+?)(?:\s*[×x✕]\s*|\s+)(\d{1,2})\s*(?:枚)?$/);
  if(!leading&&!trailing)throw Error('「4 カード名」または「カード名 ×4」で入力してください：'+line);
  const count=Number(leading?leading[1]:trailing[2]),name=(leading?leading[2]:trailing[1]).trim(),c=registry.byName.get(nameKey(name));
  if(!c)throw Error('未登録のカード名です：'+name);if(count<1||count>40)throw Error('枚数は1〜40で指定してください');counts.set(c.id,(counts.get(c.id)||0)+count);
 }
 if(!counts.size)throw Error('カード名と枚数を入力してください');
 return registry.resolveRows([...counts].map(([id,count])=>({id,count})));
}
