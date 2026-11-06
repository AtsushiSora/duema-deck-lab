const groups=[
 ['dm23rp3-041','dm23rp3-070','dm23sd3-006','dm23sd3-011','dm23sd3-010','dm28-073','dmrp11-074','dm05-021','dm23rp3-064','dm06-085'],
 ['dm23rp3-044','dm23rp3-074','dm23rp3-045','promoy22-054','dm23rp3-073','dm09-053','dm01-066','dm24rp3-020','dm23sp1-008','dm06-110'],
 ['dm23rp3-071','dm23rp3-042','dm23rp4-042','dm23rp1-066','dmrp08-083','dm01-008','dm06-110','dm06-085','dm01-075','dm01-083']
];
export const STANDARD486_DECKS=groups.map((ids,i)=>({id:'standard486-'+i,name:'Tribal revolution change '+i,format:'original',cards:ids.map(id=>({id,count:4}))}));
