// Keep the full ability catalogue off the startup path. Failed loads can be retried.
export function createCardDetailsLoader({fetcher=globalThis.fetch,url='details.json?v=0.121.0',expectedCount,onLoad=()=>{}}={}){
 let request=null,loaded=false;
 return {get loaded(){return loaded;},load(){if(!request)request=(async()=>{try{const response=await fetcher(url);if(!response.ok)throw Error('カード詳細を読み込めませんでした');const data=await response.json();if(!Array.isArray(data.cards)||!data.previewOnly&&data.processedCount!==expectedCount)throw Error('カード詳細の件数が一致しません');await onLoad(data);loaded=true;return data;}catch(e){request=null;throw e;}})();return request;}};
}
