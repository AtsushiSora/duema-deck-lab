// New-card exercises only; no shipped deck recipe is edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY118_DECKS=[
 make('utility118-dragon','追加カード検証・進化ドラゴンと防御の連携',['dmc62-002','dm27-011','dmc46-012','dmc46-011','dm22-006','dmc34-007','dm01-008','dm01-106','dm06-110','dm06-085']),
 make('utility118-knight','追加カード検証・ナイト回収と光の防御',['dmc46-012','dmc46-011','dm22-006','dmc34-007','dm01-075','dm01-090','dmpcd03-a17','dm06-110','dm28-085','dm10-070'])
];
