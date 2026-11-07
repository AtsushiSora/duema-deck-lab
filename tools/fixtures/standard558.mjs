const cards=['dmex03-022','dm37-014','dm37-051','dm36-062','dm36-095','dm39-048','dm36-033','dm38-050','dm36-099','dm37-031'];
export const STANDARD558_DECKS=[{id:'standard558-0',name:'マーシャル・タッチの連携',format:'original',cards:cards.map(id=>({id,count:4}))},{id:'standard558-1',name:'マナ爆誕と登場能力の再利用',format:'original',cards:[...cards.slice(0,8),'dm01-080','dm06-110'].map(id=>({id,count:4}))}];
