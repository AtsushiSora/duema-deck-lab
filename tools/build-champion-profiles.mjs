import fs from 'node:fs';
import {createCatalogue} from '../dist/catalogue.js';
const root=new URL('../',import.meta.url),read=f=>JSON.parse(fs.readFileSync(new URL(f,root))),registry=createCatalogue(read('dist/catalogue.json'),read('dist/cards.json').cards,read('dist/details.json'));
const profiles=read('dist/champion-decks.json').records.filter(r=>r.mainCount===40&&!r.extraCount).map(r=>{
 const cards=registry.resolveRows(r.cards),limits={};for(const row of cards){const c=registry.get(row.id);if(c.supported&&row.count>c.limit)limits[c.id]=row.count;}
 return{id:r.id,event:r.event,player:r.player,source:r.source,checkedAt:r.checkedAt,year:r.year,limits,cards};
});
fs.writeFileSync(new URL('dist/champion-profiles.js',root),'// Exact official main decks only. Extra zones and non-forty lists stay in the recipe archive.\nexport const CHAMPION_PROFILES='+JSON.stringify(profiles,null,2)+';\n');
console.log(`Generated ${profiles.length} unchanged main-deck profiles.`);
