import React, { useEffect, useRef } from 'react';
import { center, WIDTH, HEIGHT } from './paint';
import { panelLabel } from './design';
const clamp = value => Math.max(-100, Math.min(100, Math.round(value)));
export default function PrintLayout({ resources, panel, selected, onMove, onEnd }) {
  const canvas = useRef(), drag = useRef();
  useEffect(() => {
    const ctx = canvas.current.getContext('2d');
    ctx.clearRect(0, 0, WIDTH, HEIGHT); ctx.drawImage(resources.canvases[panel], 0, 0);
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(resources.masks[panel], 0, 0); ctx.globalCompositeOperation = 'source-over';
    if (selected?.side === panel) {
      const point = center(selected); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.setLineDash([9, 7]);
      ctx.strokeRect(point.x - 32, point.y - 32, 64, 64); ctx.setLineDash([]);
      ctx.strokeStyle = '#3dd6b0'; ctx.beginPath(); ctx.moveTo(point.x - 16, point.y); ctx.lineTo(point.x + 16, point.y); ctx.moveTo(point.x, point.y - 16); ctx.lineTo(point.x, point.y + 16); ctx.stroke();
    }
  }, [resources.canvases, resources.masks, panel, selected]);
  const canMove = selected?.side === panel;
  return <div className="studio-layout-view">
    <div className="studio-stage-label"><span className="studio-dot" />{panelLabel(panel)} placement</div>
    <canvas ref={canvas} width={WIDTH} height={HEIGHT} tabIndex={0} role="img" aria-label={panelLabel(panel) + ' print layout. Select a layer, then drag or use arrow keys to move it.'}
      className={canMove ? 'is-editable' : ''}
      onPointerDown={event => { if (!canMove) return; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus(); drag.current = { x: event.clientX, y: event.clientY, position: selected.position || { x: 0, y: 0 } }; }}
      onPointerMove={event => { if (!drag.current) return; const rect = event.currentTarget.getBoundingClientRect(); onMove({ x: clamp(drag.current.position.x + (event.clientX - drag.current.x) / rect.width / .004), y: clamp(drag.current.position.y + (event.clientY - drag.current.y) / rect.height / .0035) }); }}
      onPointerUp={() => { drag.current = null; onEnd(); }} onPointerCancel={() => { drag.current = null; onEnd(); }}
      onKeyDown={event => { if (!canMove || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return; event.preventDefault(); const step = event.shiftKey ? 10 : 2; onMove({ x: clamp((selected.position?.x || 0) + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0)), y: clamp((selected.position?.y || 0) + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0)) }); }} onKeyUp={onEnd} />
    <p className="studio-stage-hint">{canMove ? 'Drag your layer · Arrow keys to fine-tune' : 'Select a layer to position your artwork'}</p>
    <small>Visual placement guide</small>
  </div>;
}
