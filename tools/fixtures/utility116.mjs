// New-card exercises only; no shipped deck recipe is edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY116_DECKS=[
 make('utility116-shield','追加カード検証・文明防御とシールド連動',['dm10-062','dmpcd03-a17','dm10-s08','dmr05-047','dm01-080','dm01-075','dm01-083','dm06-110','dm06-085','dm01-108']),
 make('utility116-tempo','追加カード検証・手札干渉と攻撃時ドロー',['dm10-063','dm13-030','dmr05-047','dm01-080','dm01-008','dm01-083','dm01-097','dm01-090','dm06-085','dm01-027'])
];
