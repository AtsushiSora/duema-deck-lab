// Effect-test decks only.
const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
const added=['dm37-041','dm19-s10','dm19-026','dm32-012','dm10-058','dm25-015'];
export const UTILITY150_DECKS=[
 make('utility150-support','追加カード検証・種族と手札',[...added,'dm01-076','dm01-083','dm01-090','dm01-108']),
 make('utility150-mana','追加カード検証・防御とマナ',[...added,'dm01-075','dm01-083','dm01-097','dm01-108'])
];
