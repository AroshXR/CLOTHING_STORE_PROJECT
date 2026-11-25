import React from 'react';
import { PANELS, panelLabel } from './design';
export default function DesignSummary({ design }) {
  if (design?.designVersion !== 2) return null;
  return <details className="ui-design-summary"><summary>View all garment panels and messages</summary>
    <dl>{PANELS.map(panel => <React.Fragment key={panel.id}><dt>{panel.label}</dt><dd>{design.panelColors?.[panel.id] || design.color} · {(design.placedDesigns || []).filter(layer => layer.side === panel.id).map(layer => layer.name + ' (' + layer.mode + ', rotation ' + layer.rotation + '°, x ' + layer.position?.x + ', y ' + layer.position?.y + ', ' + (layer.mode === 'graphic' ? 'scale ' + layer.size + '%' : 'density ' + layer.repeat) + ')').join('; ') || 'No artwork'}</dd></React.Fragment>)}<dt>Collar and cuffs</dt><dd>{design.trimColor}</dd></dl>
    {(design.lettering || []).map(layer => <p key={layer.layerId}>{panelLabel(layer.side)} message: “{layer.text}” · {layer.font}, {layer.color}, {layer.size}% · rotation {layer.rotation}° · x {layer.position?.x}, y {layer.position?.y}</p>)}
  </details>;
}
