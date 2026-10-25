import {HISTORICAL_DECKS} from './historical-decks.js';
// Historical exceptions apply only to a verified, unchanged tournament forty.
// Dates, tournament labels or caller-supplied limits never grant an exception.
const profiles=new Map(HISTORICAL_DECKS.map(p=>[p.id,p]));
function signature(rows){if(!Array.isArray(rows))return null;const counts=new Map();for(const r of rows){if(!r||typeof r.id!=='string'||!Number.isSafeInteger(r.count)||r.count<1||r.count>40)return null;counts.set(r.id,(counts.get(r.id)||0)+r.count);}return JSON.stringify([...counts].sort(([a],[b])=>a.localeCompare(b)));}
const signatures=new Map(HISTORICAL_DECKS.map(p=>[p.id,signature(p.cards)]));
export function historicalProfile(deck,rows=deck?.cards){const p=profiles.get(deck?.historicalId);return p&&signature(rows)===signatures.get(p.id)?p:null;}
export function deckCopyLimit(card,deck,rows=deck?.cards){return historicalProfile(deck,rows)?.limits[card.id]??card.limit;}
// The editor can restore the original counts; validation still requires the full forty.
export function editingCopyLimit(card,deck){const p=profiles.get(deck?.historicalId);return p?.limits[card.id]??card.limit;}
export function historicalMetadata(deck,rows=deck?.cards){const p=historicalProfile(deck,rows);return p?{historicalId:p.id}:{};}
