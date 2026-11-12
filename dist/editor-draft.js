// Drafts are separate from registered decks and account backups.
export const EDITOR_DRAFT_KEY='duema.editorDraft.v1';
export function readEditorDraft(storage,registry){
 try{const value=JSON.parse(storage.getItem(EDITOR_DRAFT_KEY)||'null');if(value?.version!==1||!['mine','opponent'].includes(value.role)||typeof value.deck?.id!=='string'||typeof value.deck.name!=='string'||!Array.isArray(value.deck.cards)||value.deck.cards.length>40)return null;value.deck.cards=registry.resolveRows(value.deck.cards);if(value.deck.extraCards!==undefined){value.deck.extraCards=registry.resolveRows(value.deck.extraCards);if(value.deck.extraCards.reduce((n,r)=>n+r.count,0)>8)return null;}if(value.deck.cards.reduce((n,r)=>n+r.count,0)>40)return null;return value;}catch{return null;}
}
export function writeEditorDraft(storage,{deck,role,returnView='decks',tab='deck'}){
 try{storage.setItem(EDITOR_DRAFT_KEY,JSON.stringify({version:1,deck:structuredClone(deck),role,returnView,tab,savedAt:new Date().toISOString()}));return true;}catch{return false;}
}
export function clearEditorDraft(storage){try{storage.removeItem(EDITOR_DRAFT_KEY);return true;}catch{return false;}}
