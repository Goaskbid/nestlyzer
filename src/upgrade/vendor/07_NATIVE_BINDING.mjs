import {validateScope,filterPlaces,createRequestGate,canonical,dismissPlace,undoDismiss,visiblePlaces} from './05_UPGRADE.mjs';
/* Host callbacks bridge the existing native state and saved store. No window/S mutation here. */
export function bindTransfers(host) {
  for(const k of ['read','dispatch','loadCountries','rankedRecords'])if(typeof host[k]!=='function')throw new TypeError('Host must implement '+k);
  const gate=createRequestGate(()=>host.read());let pending=null;
  const snapshot=()=>{const s=host.read();return {profile:s.profile,mode:s.mode,scope:s.scope,versions:s.versions};};
  return {
    proposeViewport(bounds){pending=validateScope({areas:[{kind:'bbox',...bounds}],excluded:[]});return structuredClone(pending);},
    clearProposal(){pending=null;},
    async applyScope(scope,requiredCountries){
      const normalized=validateScope(scope);const before=canonical(snapshot());
      if(!Array.isArray(requiredCountries)||new Set(requiredCountries).size!==requiredCountries.length||requiredCountries.some(c=>!/^[A-Z]{2}$/.test(c)))throw new TypeError('Resolved unique country list required');
      const result=await gate.run(async()=>{await host.loadCountries(requiredCountries);return host.rankedRecords();});
      if(!result.accepted||before!==canonical(snapshot()))return {accepted:false,reason:'stale_snapshot'};
      const filtered=filterPlaces(result.data,normalized);
      host.dispatch({type:'SET_GEOGRAPHIC_SCOPE',scope:normalized,expectedSnapshot:before});pending=null;
      return {accepted:true,...filtered};
    },
    async searchHere(requiredCountries){if(!pending)throw new Error('No pending viewport');return this.applyScope(pending,requiredCountries);},
    hide(id){const s=host.read();host.dispatch({type:'SET_DISCOVERY_VISIBILITY',value:dismissPlace(s.discoveryVisibility,id,snapshot())});},
    undo(){host.dispatch({type:'SET_DISCOVERY_VISIBILITY',value:undoDismiss(host.read().discoveryVisibility)});},
    visible(rows){const s=host.read();return visiblePlaces(rows,s.discoveryVisibility,snapshot());},
    invalidate(){gate.invalidate();},
    destroy(){gate.invalidate();pending=null;}
  };
}
export function bindMapViewport(map,onProposal) {
  const listener=()=>{const b=map.getBounds();const west=b.getWest(),east=b.getEast(),span=east-west;
    if(span>=360){onProposal({west:-180,south:Math.max(-90,b.getSouth()),east:180,north:Math.min(90,b.getNorth())});return;}
    const wrap=x=>((x+180)%360+360)%360-180;
    onProposal({west:wrap(west),south:Math.max(-90,b.getSouth()),east:wrap(east),north:Math.min(90,b.getNorth())});
  };
  map.on('moveend',listener);return ()=>map.off('moveend',listener);
}
