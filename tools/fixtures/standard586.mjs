const batch=[
  'dmrp22-067','dmrp05-092','dm30-011','dmd15-005','dm24rp3-056','dmrp05-051',
  'promoy13-008','dm19-s04','dm22rp2-065','promoy14-058','dmrp19-085','dmr09-034',
  'dmrp08-041','dmr05-070','dm39-014','dm20-053','dm01-005'
];

export const STANDARD586_DECK={
  id:'standard586',name:'効果によるバトルとバトル勝利',format:'original',
  cards:[...batch.map(id=>({id,count:2})),{id:'dm01-097',count:2},{id:'dm19-074',count:2},{id:'dmx17-008',count:2}]
};
