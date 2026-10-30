const make=(id,name,ids)=>({id,name,format:'original',cards:ids.map(id=>({id,count:4}))});
export const STANDARD169_DECKS=[
 make('standard169-1','登場時バトルと手札干渉の検証 1',["dm24rp4-036","dmrp18-081","promoy15-054","dmrp15-075","dmrp11-092","dmrp02-055","dmrp07-051","dmrp08-080","dmrp01-049","dmrp20-084"]),
 make('standard169-2','登場時バトルと手札干渉の検証 2',["dmrp14-057","dm22rp2-041","dm23rp3-062","dmrp12-050","dmrp20-039","dmrp17-046","dmrp02-081","dm23rp3-067","dm25rp3-069","dm01-108"])
];
