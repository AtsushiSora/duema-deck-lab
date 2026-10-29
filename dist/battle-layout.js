// Use available screen space rather than identifying a particular phone model.
export const PHONE_LANDSCAPE_QUERY='(min-width: 480px) and (max-width: 1100px) and (max-height: 600px) and (orientation: landscape)';
export function manualLayout(view=globalThis.window){
 const landscape=!!view?.matchMedia?.(PHONE_LANDSCAPE_QUERY)?.matches;
 return {landscape,mobile:!!view?.matchMedia?.('(max-width: 850px)')?.matches&&!landscape};
}
