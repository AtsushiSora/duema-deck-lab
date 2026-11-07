const batch=[
  'promoy11-055','dmrp13-001','dmrp18-001','dmsd05-001','dmr09-050','dm39-023',
  'dmr20-027','dmrp08-094','dm30-033','dmr17-002','dmr13-s04','dm38-012',
  'dmex08-015','dmrp09-051'
];

export const STANDARD587_DECK={
  id:'standard587',name:'バトル勝利とアンタップ',format:'original',
  cards:[...batch.map(id=>({id,count:2})),...['dm01-075','dm01-097','dmx17-008'].map(id=>({id,count:4}))]
};
