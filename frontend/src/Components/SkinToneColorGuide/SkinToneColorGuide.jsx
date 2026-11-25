import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Copy, Asterisk } from 'lucide-react';
import { useBranding } from '../../config/branding';
import Reveal from '../Editorial/Reveal';
import { toneGuides, universalColors, undertoneTips } from './guideData';
import '../Editorial/Editorial.css';
import '../Editorial/Information.css';
import './SkinToneColorGuide.css';

const names = { fair: ['Sapphire blue', 'Deep blue', 'Amethyst purple', 'Navy', 'Burgundy', 'Blush'], medium: ['Coral', 'Terracotta', 'Mustard', 'Olive green', 'Burnt orange', 'Bronze'], deep: ['Cobalt blue', 'Hot pink', 'Royal purple', 'Lime green', 'Golden yellow', 'Bright white'] };
export default function SkinToneColorGuide() {
  const { branding } = useBranding();
  const [selected, setSelected] = useState({ name: 'Navy blue', hex: '#1f3a5f' }), [copyMessage, setCopyMessage] = useState('');
  function choose(name, hex) { setSelected({ name, hex }); setCopyMessage(''); }
  async function copy() {
    try { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(selected.hex.toUpperCase()); setCopyMessage('Hex value copied.'); }
    catch (_) { setCopyMessage('Select the hex value above to copy it manually.'); }
  }
  function swatch(name, hex, className = '') {
    return <button type="button" key={hex} className={'ed-swatch ' + className} aria-pressed={selected.hex.toLowerCase() === hex.toLowerCase()} aria-label={'Select ' + name + ' (' + hex.toUpperCase() + ')'} onClick={() => choose(name, hex)}><span className="ed-swatch-sample" style={{ backgroundColor: hex }} aria-hidden="true" /><span className="ed-swatch-name">{name}</span><code>{hex.toUpperCase()}</code></button>;
  }
  return <div className="ed-page ed-information ed-colour-guide">
    <section className="ed-information-hero ed-colour-hero ed-pad"><div className="ed-hero-meta"><span>{branding.name} / COLOUR GUIDE</span><span>A DIFFERENT SHADE OF YOU.</span></div><div className="ed-information-hero-grid"><Reveal><span className="ed-kicker">YOUR STYLE, IN FULL COLOUR</span><h1>YOUR<br />COLOUR.</h1><p>Explore palettes, compare contrasts, and find a starting point for your next look. Your favourite colours are always yours to choose.</p><a className="ed-button ed-button--light" href="#colour-palettes">Explore the palettes <ArrowUpRight size={18} /></a></Reveal><Reveal className="ed-palette-art" delay={.15}><div className="ed-art-tile ed-fold-left"><span style={{ backgroundColor: '#cf5c36' }} /><p>TERRACOTTA<br /><small>COLOUR STUDY / 01</small></p></div><div className="ed-art-tile ed-art-tile--main"><span data-testid="selected-colour-preview" style={{ backgroundColor: selected.hex }} /><p>{selected.name}<br /><small>{selected.hex.toUpperCase()}</small></p></div><div className="ed-art-tile ed-fold-right"><span style={{ backgroundColor: '#dedcd5' }} /><p>OFF WHITE<br /><small>COLOUR STUDY / 03</small></p></div></Reveal></div></section>
    <section className="ed-colour-palettes ed-pad" id="colour-palettes"><Reveal className="ed-section-heading"><div><span className="ed-kicker">A PALETTE WITH A POINT OF VIEW</span><h2>FIND YOUR<br />STARTING POINT.</h2></div><p>Use the skin-tone palettes as inspiration. Try shades in natural light and choose the contrast you enjoy.</p></Reveal>
      <div className="ed-colour-selection"><div className="ed-colour-selected-chip" style={{ backgroundColor: selected.hex }} aria-hidden="true" /><div><span className="ed-kicker">YOUR SELECTED SHADE</span><p role="status">{selected.name} <code>{selected.hex.toUpperCase()}</code></p></div><button type="button" onClick={copy}><Copy size={15} /> Copy hex</button><Link to="/customizer">Open design studio <ArrowUpRight size={16} /></Link>{copyMessage && <p role="status" className="ed-copy-message">{copyMessage}</p>}</div>
      <div className="ed-tone-grid">{toneGuides.map(tone => <Reveal key={tone.id} viewport={{ once: true, amount: 0 }}><article className="ed-tone" id={tone.id}><span className="ed-kicker">COLOUR NOTES / {tone.id.toUpperCase()}</span><h3>{tone.title}</h3><div className="ed-tone-swatches" aria-label={tone.title + ' palette'}>{tone.palette.map((hex, index) => swatch(names[tone.id][index], hex))}</div><div className="ed-tone-notes"><h4>Explore these shades</h4><p>{tone.bestColors.join(' · ')}</p><h4>Try with a contrasting layer</h4><p>{tone.avoidColors.join(' · ')}</p></div></article></Reveal>)}</div>
    </section>
    <section className="ed-undertones ed-pad"><Reveal><Asterisk size={50} strokeWidth={1.2} /><span className="ed-kicker">THE SUBTLE DETAILS</span><h2>WARM.<br />COOL.<br />YOUR WAY.</h2><p>Compare warm and cool shades in natural light. Jewellery preferences can offer another starting point.</p></Reveal><div>{undertoneTips.map(tip => <Reveal key={tip.title}><article><h3>{tip.title}</h3><p>{tip.description}</p><ul>{tip.suggestions.map(value => <li key={value}>{value}</li>)}</ul></article></Reveal>)}</div></section>
    <section className="ed-colour-staples ed-pad"><Reveal className="ed-section-heading"><div><span className="ed-kicker">A FEW GOOD ANCHORS</span><h2>BUILD YOUR<br />COLOUR STORY.</h2></div><p>Start with a familiar wardrobe shade, then add the colours that feel like you.</p></Reveal><div className="ed-staples-grid">{universalColors.map(colour => <Reveal key={colour.name}>{swatch(colour.name, colour.swatch, 'ed-swatch--large')}</Reveal>)}</div></section>
    <section className="ed-information-close ed-pad"><Reveal><span className="ed-kicker">PUT YOUR IDEAS INTO COLOUR</span><h2>MAKE IT<br />PERSONAL.</h2></Reveal><Reveal delay={.1}><p>Try a colour in the 3D studio, explore the collection, or find an outfit for your next occasion.</p><div className="ed-colour-links"><Link className="ed-button ed-button--light" to="/customizer">Open the studio <ArrowUpRight size={18} /></Link><Link className="ed-text-link" to="/outlet">Shop the collection <ArrowUpRight size={18} /></Link><Link className="ed-text-link" to="/rentalHome">Explore rentals <ArrowUpRight size={18} /></Link></div></Reveal></section>
  </div>;
}