// New-card exercises only; no shipped deck recipe is edited.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const UTILITY117_DECKS=[
 make('utility117-dragon','追加カード検証・ドラゴンと墓地の補充',['dmc39-003','dmc39-004','dm10-070','dm24-s10','dm29-025','dm19-010','dm06-110','dm01-106','dm01-080','dm06-085']),
 make('utility117-grave','追加カード検証・墓地活用と侍流ジェネレート',['dmc39-003','dmc39-004','dm10-070','dm24-s10','dm29-025','dm19-010','dm01-008','dm06-110','dm28-033','dm06-085'])
];
