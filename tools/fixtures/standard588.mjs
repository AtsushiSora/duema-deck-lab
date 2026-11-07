const batch=[
  'dmrp04m-s06','dmr03-044','dmr03-003','dmr03-025','dmr01-019','dmrp05-053',
  'dmex16-016','dm20-030','dmrp05-010','dmrp06-026','dmrp12-052','dmr18-060',
  'dmd15-001','dmr14-029','dmex14-067','dmr10-s05','dmsd19-011'
];

export const STANDARD588_DECK={
  id:'standard588',name:'バトル勝利と手札からの登場',format:'original',
  cards:[...batch.map(id=>({id,count:2})),...['dm01-108','dmx17-008','dmrp19-085'].map(id=>({id,count:2}))]
};
