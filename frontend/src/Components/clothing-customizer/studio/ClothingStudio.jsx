import React, { Suspense, useEffect, useReducer, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowDown, ArrowUp, Check, Layers, Plus, Redo2, ShoppingBag, Trash2, Undo2, Upload } from 'lucide-react';
import { apiUrl } from '../../../config/api';
import { useAuth } from '../../../AuthGuard/authGuard';
import MediaImage from '../../MediaImage';
import StudioWorkspace from './StudioWorkspace';
import { COLORS, PANELS, emptyDesign, historyReducer, initialHistory, loadDesign, newLayerId, panelLabel, studioPrice, updateLayer } from './design';
import print1 from '../customizer_preset_designs/print 1.jpg';
import print2 from '../customizer_preset_designs/print 2.jpg';
import print3 from '../customizer_preset_designs/print 3.jpg';
import print4 from '../customizer_preset_designs/print 4.jpg';
import print5 from '../customizer_preset_designs/print 5.jpg';
import print6 from '../customizer_preset_designs/print 6.jpg';
import './Studio.css';
const presets = [print1, print2, print3, print4, print5, print6];
const fallbackPrices = { basePrices: { tshirt: 25 }, sizePrices: { S: 0, M: 0, L: 3, XL: 5, XXL: 8 }, customUploadPrice: 25, customTextPrice: 0, presetDesigns: [15,20,18,12,10,8].map((price, i) => ({ id: i + 1, name: 'Design ' + (i + 1), price, isActive: true })) };
const money = value => '$' + Number(value).toFixed(2);
function Slider({ label, value, min, max, onChange, onEnd, suffix = '' }) {
  return <label className="studio-slider"><span>{label}<span className="studio-slider-value" aria-hidden="true">{value}{suffix}</span></span><input aria-label={label} type="range" min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} onPointerUp={onEnd} onKeyUp={onEnd} onBlur={onEnd} /></label>;
}
export default function ClothingStudio() {
  const location = useLocation(), { token, isAuthenticated } = useAuth();
  const [history, dispatch] = useReducer(historyReducer, undefined, () => initialHistory(emptyDesign()));
  const design = history.present;
  const [panel, setPanel] = useState('front'), [selectedId, setSelectedId] = useState(null), [viewMode, setViewMode] = useState(() => window.innerWidth <= 760 ? '3d' : 'split'), [colorScope, setColorScope] = useState('all');
  const [prices, setPrices] = useState(fallbackPrices), [priceState, setPriceState] = useState('loading'), [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [savedState, setSavedState] = useState('');
  const loaded = useRef(false), uploadInput = useRef();
  const change = (update, group) => dispatch({ type: 'change', update, group });
  const end = () => dispatch({ type: 'end' });
  const layers = [...design.placedDesigns, ...design.lettering], selected = layers.find(layer => layer.layerId === selectedId);
  const panelLayers = layers.filter(layer => layer.side === panel), price = studioPrice(design, prices);
  const patchLayer = (changes, group) => change(current => updateLayer(current, selectedId, changes), group);
  useEffect(() => {
    const controller = new AbortController();
    axios.get(apiUrl('/customizer-prices'), { signal: controller.signal }).then(response => { if (response.data.status === 'ok') { setPrices(response.data.data); setPriceState('ready'); } else setPriceState('estimate'); }).catch(error => { if (error.code !== 'ERR_CANCELED') setPriceState('estimate'); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      if (new URLSearchParams(location.search).get('edit') === 'true') {
        const source = JSON.parse(localStorage.getItem('editItemData') || 'null');
        if (!source?._id) { setError('Open a saved design from your cart to edit it.'); return; }
        // Ownership and the current saved state are checked by the API.
        axios.get(apiUrl('/cloth-customizer/' + source._id)).then(response => {
          dispatch({ type: 'reset', design: loadDesign(response.data.data) }); setEditingId(source._id); localStorage.removeItem('editItemData');
        }).catch(() => setError('This design could not be opened. Sign in to the account that saved it.'));
      } else {
        const draft = sessionStorage.getItem('customizer-draft');
        if (draft) { dispatch({ type: 'reset', design: loadDesign(JSON.parse(draft)) }); sessionStorage.removeItem('customizer-draft'); }
      }
    } catch (_) { setError('The saved design could not be opened. You can start a new design.'); }
  }, [location.search]);
  function choosePanel(side) {
    setPanel(side); setSelectedId(layers.find(layer => layer.side === side)?.layerId || null); end();
  }
  function addArtwork(source) {
    if (design.placedDesigns.length >= 8) { setError('You can add up to eight artwork layers across your garment.'); return; }
    const layer = { ...source, layerId: newLayerId(), side: panel, position: { x: 0, y: 0 }, size: 80, mode: 'graphic', rotation: 0, repeat: 3 };
    change(current => ({ ...current, placedDesigns: [...current.placedDesigns, layer] })); setSelectedId(layer.layerId); setError(''); setNotice('');
  }
  function addText() {
    if (design.lettering.length >= 2) { setError('You can add up to two text layers.'); return; }
    const channels = (design.panelColors[panel] || design.color).slice(1).match(/../g).map(value => parseInt(value, 16));
    const ink = channels[0] * .299 + channels[1] * .587 + channels[2] * .114 > 150 ? '#182231' : '#ffffff';
    const layer = { layerId: newLayerId(), side: panel, text: 'Your message', font: 'sans', color: ink, size: 12, rotation: 0, position: { x: 0, y: 0 } };
    change(current => ({ ...current, lettering: [...current.lettering, layer] })); setSelectedId(layer.layerId); setError('');
  }
  function setColor(color) {
    change(current => colorScope === 'all' ? { ...current, color, panelColors: Object.fromEntries(PANELS.map(item => [item.id, color])), trimColor: color } : colorScope === 'trim' ? { ...current, trimColor: color } : { ...current, panelColors: { ...current.panelColors, [panel]: color } }, 'color');
  }
  const activeColor = colorScope === 'all' ? design.color : colorScope === 'trim' ? design.trimColor : design.panelColors[panel];
  function removeLayer(id) {
    change(current => ({ ...current, placedDesigns: current.placedDesigns.filter(layer => layer.layerId !== id), lettering: current.lettering.filter(layer => layer.layerId !== id) })); setSelectedId(null);
  }
  function reorder(direction) {
    change(current => {
      const list = [...current.placedDesigns], index = list.findIndex(layer => layer.layerId === selectedId);
      const indices = list.map((layer, i) => layer.side === panel ? i : -1).filter(i => i >= 0);
      const target = indices[indices.indexOf(index) - direction] ?? -1;
      if (index < 0 || target < 0) return current;
      [list[index], list[target]] = [list[target], list[index]]; return { ...current, placedDesigns: list };
    });
  }
  async function upload(event) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a PNG, JPG, GIF, or WebP image up to 5 MB.'); return; }
    if (design.placedDesigns.length >= 8) { setError('Remove an artwork layer before uploading another image.'); return; }
    setUploading(true); setError('');
    try { const data = new FormData(); data.append('image', file); const response = await axios.post(apiUrl('/upload/image'), data); addArtwork({ id: 'custom-' + Date.now(), name: 'Custom Image', preview: response.data.data.url, isCustomUpload: true, price: prices.customUploadPrice }); }
    catch (error) { setError(error.response?.data?.message || 'Your image could not be uploaded. Please sign in and try again.'); }
    finally { setUploading(false); }
  }
  async function save() {
    if (!isAuthenticated() || !token) { setError('Sign in to save your design to the cart.'); return; }
    if (design.lettering.some(layer => !layer.text.trim())) { setError('Add a message to each text layer, or remove the empty layer.'); return; }
    const payload = Object.fromEntries(['designVersion','clothingType','nickname','color','panelColors','trimColor','placedDesigns','lettering','size','quantity'].map(key => [key, design[key]]));
    setSaving(true); setError(''); setNotice('');
    try {
      const response = editingId ? await axios.put(apiUrl('/cloth-customizer/' + editingId), { ...payload, inCart: true }) : await axios.post(apiUrl('/cloth-customizer'), payload);
      setEditingId(response.data.data._id); setSavedState(JSON.stringify(design)); setNotice('Your design is saved in your cart.');
    } catch (error) { setError(error.response?.data?.message || 'Your design could not be saved. Please try again.'); }
    finally { setSaving(false); }
  }
  function newDesign() {
    if (!window.confirm('Start a new design? Unsaved changes will be cleared. Designs already in your cart will remain there.')) return;
    dispatch({ type: 'reset', design: emptyDesign() }); setEditingId(null); setSelectedId(null); setSavedState(''); setError(''); setNotice(''); setPanel('front');
  }
  return <div className="custom-studio" onKeyDown={event => {
    if (['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName) || !(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === 'z') { event.preventDefault(); dispatch({ type: event.shiftKey ? 'redo' : 'undo' }); }
  }}>
    <header className="studio-header"><div><span className="studio-eyebrow">YOUR IDEAS. YOUR EVERYDAY WEAR.</span><h1>Make it yours.</h1><p>A T-shirt with your point of view. Create it, turn it, wear it.</p></div><div className="studio-header-actions"><button onClick={newDesign}>New design</button><Link to="/orderManagement" className="ui-button"><ShoppingBag size={17} /> Your cart</Link></div></header>
    <div className="studio-toolbar"><div className="studio-segment" aria-label="Garment panel">{PANELS.map(item => <button key={item.id} aria-pressed={panel === item.id} onClick={() => choosePanel(item.id)}>{item.label}{layers.some(layer => layer.side === item.id) && <span className="studio-panel-mark" />}</button>)}</div>
      <div className="studio-toolbar-end"><div className="studio-segment" aria-label="Preview layout">{[{ id: '3d', label: '3D' }, { id: 'split', label: 'Split' }, { id: 'layout', label: 'Layout' }].map(view => <button key={view.id} aria-pressed={viewMode === view.id} onClick={() => setViewMode(view.id)}>{view.label}</button>)}</div><button aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!history.past.length} onClick={() => dispatch({ type: 'undo' })}><Undo2 size={17} /></button><button aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!history.future.length} onClick={() => dispatch({ type: 'redo' })}><Redo2 size={17} /></button></div>
    </div>
    <div className="studio-grid"><aside className="studio-controls" aria-label="Design tools">
      <section className="studio-card"><div className="studio-section-title"><h2>01 <span>Garment colours</span></h2><span className="studio-caption">T-SHIRT</span></div>
        <label className="studio-field">Apply colour to<select value={colorScope} onChange={event => { setColorScope(event.target.value); end(); }}><option value="all">Whole garment</option><option value="panel">{panelLabel(panel)} only</option><option value="trim">Collar &amp; cuffs</option></select></label>
        <div className="studio-palette">{COLORS.map(color => <button key={color} className="studio-swatch" style={{ backgroundColor: color }} aria-label={'Colour ' + color} aria-pressed={activeColor === color} onClick={() => { setColor(color); end(); }}>{activeColor === color && <Check size={15} color={['#f5f5f5','#fff176'].includes(color) ? '#182231' : '#fff'} />}</button>)}</div>
        <label className="studio-custom-colour"><input type="color" value={activeColor} onChange={event => setColor(event.target.value)} onBlur={end} /><span>Custom colour</span><code>{activeColor.toUpperCase()}</code></label>
      </section>
      <section className="studio-card"><div className="studio-section-title"><h2>02 <span>Artwork &amp; message</span></h2><span className="studio-caption">{panelLabel(panel)}</span></div><p className="studio-help">Start with one of your original presets, or bring your own artwork.</p>
        <div className="studio-presets">{prices.presetDesigns.filter(preset => preset.isActive !== false && presets[Number(preset.id) - 1]).map(preset => <button key={preset.id} onClick={() => addArtwork({ ...preset, preview: presets[Number(preset.id) - 1], isCustomUpload: false })} aria-label={'Add ' + preset.name + ' to ' + panelLabel(panel)} disabled={design.placedDesigns.length >= 8}><img src={presets[Number(preset.id) - 1]} alt="" /><span>{preset.name}<small>{money(preset.price)}</small></span></button>)}</div>
        <input hidden type="file" ref={uploadInput} accept="image/png,image/jpeg,image/gif,image/webp" onChange={upload} aria-label="Upload artwork file" />
        {token ? <button className="studio-wide" disabled={uploading || design.placedDesigns.length >= 8} onClick={() => uploadInput.current.click()}><Upload size={16} />{uploading ? 'Uploading…' : 'Upload your artwork'}</button> : <Link className="studio-signin" to="/login" onClick={() => sessionStorage.setItem('customizer-draft', JSON.stringify(design))}>Sign in to upload your artwork</Link>}
        <p className="studio-help studio-small">PNG, JPG, GIF or WebP · Up to 5 MB · Uploads stay private</p>
        <button className="studio-wide" onClick={addText} disabled={panel.includes('Sleeve') || design.lettering.length >= 2}><Plus size={16} />Add a message</button><p className="studio-help studio-small">Messages on the front or back · Up to 40 characters</p>
      </section>
      <section className="studio-card"><div className="studio-section-title"><h2>03 <span>Layers &amp; placement</span></h2><Layers size={16} /></div>
        {!panelLayers.length && <p className="studio-empty">Your {panelLabel(panel).toLowerCase()} is a blank canvas. Add artwork to get started.</p>}
        <div className="studio-layer-list">{[...panelLayers].reverse().map(layer => <div key={layer.layerId} className={selectedId === layer.layerId ? 'studio-layer is-selected' : 'studio-layer'}><button onClick={() => setSelectedId(layer.layerId)} aria-pressed={selectedId === layer.layerId}>{layer.text ? <span className="studio-text-icon">Aa</span> : <MediaImage src={layer.preview} alt="" />}<span>{layer.text || layer.name}<small>{layer.text ? 'Message' : layer.mode === 'graphic' ? 'Placed artwork' : 'Repeating pattern'}</small></span></button><button onClick={() => removeLayer(layer.layerId)} aria-label={'Remove ' + (layer.text || layer.name)}><Trash2 size={15} /></button></div>)}</div>
        {selected?.side === panel && <div className="studio-properties">
          {selected.text !== undefined ? <><label className="studio-field">Your message<input maxLength={40} value={selected.text} onChange={event => patchLayer({ text: event.target.value }, 'message')} onBlur={end} /></label><div className="studio-field-row"><label className="studio-field">Lettering<select value={selected.font} onChange={event => patchLayer({ font: event.target.value })}><option value="sans">Bold sans</option><option value="serif">Classic serif</option><option value="mono">Typewriter</option></select></label><label className="studio-field">Ink colour<input type="color" value={selected.color} onChange={event => patchLayer({ color: event.target.value }, 'ink')} onBlur={end} /></label></div></> : <label className="studio-field">Print style<select value={selected.mode} onChange={event => patchLayer({ mode: event.target.value })}><option value="graphic">Single graphic</option><option value="repeat">All-over pattern</option><option value="half-left">Pattern · left half</option><option value="half-right">Pattern · right half</option></select></label>}
          {selected.text !== undefined || selected.mode === 'graphic' ? <Slider label={selected.text !== undefined ? 'Text size' : 'Print scale'} min={selected.text !== undefined ? 4 : 20} max={selected.text !== undefined ? 25 : 160} value={selected.size} suffix="%" onChange={value => patchLayer({ size: value }, 'scale')} onEnd={end} /> : <Slider label="Pattern density" min={1} max={10} value={selected.repeat} onChange={value => patchLayer({ repeat: value }, 'repeat')} onEnd={end} />}
          <Slider label="Rotation" min={-180} max={180} value={selected.rotation} suffix="°" onChange={value => patchLayer({ rotation: value }, 'rotation')} onEnd={end} />
          <Slider label="Horizontal position" min={-100} max={100} value={selected.position.x} onChange={x => patchLayer({ position: { ...selected.position, x } }, 'x')} onEnd={end} />
          <Slider label="Vertical position" min={-100} max={100} value={selected.position.y} onChange={y => patchLayer({ position: { ...selected.position, y } }, 'y')} onEnd={end} />
          <div className="studio-property-actions"><button onClick={() => patchLayer({ position: { x: 0, y: 0 }, rotation: 0, size: selected.text !== undefined ? 12 : 80, repeat: 3 })}>Reset placement</button>{selected.text === undefined && <><button title="Bring forward" aria-label="Bring artwork forward" onClick={() => reorder(-1)}><ArrowUp size={15} /></button><button title="Send backward" aria-label="Send artwork backward" onClick={() => reorder(1)}><ArrowDown size={15} /></button></>}</div>
        </div>}
      </section>
    </aside><div className="studio-preview-column"><Suspense fallback={<div className="studio-loading" role="status">Preparing your design studio…</div>}><StudioWorkspace design={design} panel={panel} selected={selected} viewMode={viewMode} onMove={position => patchLayer({ position }, 'drag')} onEnd={end} /></Suspense>
      <section className="studio-order studio-card" aria-label="Design and order details"><div className="studio-order-fields"><label className="studio-field">Name your design<input value={design.nickname} maxLength={50} placeholder="My next favourite tee" onChange={event => change(current => ({ ...current, nickname: event.target.value }), 'nickname')} onBlur={end} /></label><label className="studio-field">Size<select value={design.size} onChange={event => change(current => ({ ...current, size: event.target.value }))}>{['S','M','L','XL','XXL'].map(size => <option key={size}>{size}</option>)}</select></label><label className="studio-field">Quantity<input type="number" min={1} max={999} step={1} value={design.quantity} onChange={event => { const quantity = Number(event.target.value); if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 999) change(current => ({ ...current, quantity }), 'quantity'); }} onBlur={end} /></label></div>
        <div className="studio-price-breakdown"><span>Base {money(price.base)}</span><span>Size {money(price.size)}</span><span>Artwork {money(price.artwork)}</span>{price.text > 0 && <span>Text {money(price.text)}</span>}<small>Artwork is priced per layer. Final price is checked when saved.</small></div>
        <div className="studio-checkout-row"><div><span className="studio-help">{design.quantity} {design.quantity === 1 ? 'T-shirt' : 'T-shirts'} · {priceState === 'ready' ? 'Design total' : 'Estimated total'}</span><strong className="studio-total">{money(price.total)}</strong></div>{token ? <button className="studio-primary" disabled={saving || uploading} onClick={save}><ShoppingBag size={18} />{saving ? 'Saving…' : editingId ? 'Update in cart' : 'Save to cart'}</button> : <Link className="studio-primary" to="/login" onClick={() => sessionStorage.setItem('customizer-draft', JSON.stringify(design))}>Sign in to save</Link>}</div>
        {priceState === 'estimate' && <p className="studio-help">Live pricing is temporarily unavailable. These are estimates.</p>}
        {error && <p className="studio-error" role="alert">{error}</p>}{notice && <p className="studio-success" role="status"><Check size={16} />{savedState === JSON.stringify(design) ? notice : 'You have changes to save.'} <Link to="/orderManagement">View cart</Link></p>}
      </section><p className="studio-footnote">Your original presets. Your own artwork. A design that belongs to you.</p>
    </div></div>
  </div>;
}
