import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';


import MediaImage from '../../Components/MediaImage';
import { useBranding } from '../../config/branding';
import { apiUrl } from '../../config/api';
import './SiteSettings.css';

export default function SiteSettings() {
  const { branding, loading, error: loadError, reload, save } = useBranding();
  const [draft, setDraft] = useState(branding), [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  useEffect(() => { setDraft(branding); }, [branding]);
  const change = (field, value) => { setDraft(previous => ({ ...previous, [field]: value })); setMessage(''); };
  async function upload(file) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a PNG, JPEG, GIF or WebP image up to 5 MB.'); return;
    }
    setUploading(true); setError('');
    try {
      const form = new FormData(); form.append('image', file);
      const { data } = await axios.post(apiUrl('/upload/image'), form);
      change('logoUrl', data.data.url);
    } catch (err) { setError(err.response?.data?.message || 'Unable to upload the logo.'); }
    finally { setUploading(false); }
  }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { await save(draft); setMessage('Site settings saved. Your branding is now live on this installation.'); }
    catch (err) { setError(err.response?.data?.message || 'Unable to save site settings.'); }
    finally { setSaving(false); }
  }
  const field = (key, label, maxLength, type = 'text') => <label key={key}>{label}
    <input type={type} value={draft[key]} maxLength={maxLength} required={['name', 'heroTitle'].includes(key)} onChange={event => change(key, event.target.value)} />
  </label>;
  return <><section className="site-settings">
    <header><Link to="/admin-hub">Back to Admin Hub</Link><h1>Site settings</h1>
      <p>Make this installation your own. Changes apply to the storefront, rental pages, reports, and email branding.</p></header>
    {(error || loadError) && <p role="alert" className="site-settings__error">{error || loadError}</p>}
    {loadError && <button onClick={() => reload()}>Retry loading settings</button>}
    {message && <p role="status" className="site-settings__success">{message}</p>}
    {loading ? <p>Loading settings…</p> : <form onSubmit={submit}>
      <fieldset disabled={saving || uploading || Boolean(loadError)}><legend>Identity and appearance</legend>
        <div className="site-settings__grid">{field('name', 'Site name', 80)}{field('tagline', 'Tagline', 160)}</div>
        <label>Logo image<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={event => { upload(event.target.files[0]); event.target.value = ''; }} /></label>
        <p className="site-settings__hint">PNG, JPEG, GIF or WebP, up to 5 MB. The logo becomes public when you save.</p>
        {field('logoUrl', 'Logo URL (optional)', 2048)}
        {draft.logoUrl && <div className="site-settings__logo"><MediaImage src={draft.logoUrl} alt="Logo preview" /><button type="button" onClick={() => change('logoUrl', '')}>Remove logo</button></div>}
        <label>Colour theme<select value={draft.appearanceMode || 'monochrome'} onChange={event => change('appearanceMode', event.target.value)}><option value="monochrome">Editorial black &amp; white</option><option value="custom">Custom brand colours</option></select></label>
        <p className="site-settings__hint">The editorial theme uses black, charcoal, and off-white. Choose custom brand colours to apply the colours below to shared navigation and controls.</p>
        <div className="site-settings__grid">{field('primaryColor', 'Header color', 7, 'color')}{field('accentColor', 'Accent color', 7, 'color')}</div>
        <div className="site-settings__preview" style={{ background: draft.primaryColor, borderBottomColor: draft.accentColor }}>
          <span style={{ background: '#ffffff', color: '#111827', padding: 12, borderRadius: 6 }}>{draft.name || 'Your Store'}</span>
          <p style={{ background: '#ffffff', color: '#111827', padding: 12, borderRadius: 6 }}>{draft.tagline}</p>
        </div>
      </fieldset>
      <fieldset disabled={saving || uploading || Boolean(loadError)}><legend>Homepage</legend>
        {field('heroTitle', 'Homepage heading', 120)}{field('heroDescription', 'Homepage description', 600)}
        <label>About your business<textarea rows="5" maxLength={8000} value={draft.aboutText} onChange={event => change('aboutText', event.target.value)} /></label>
      </fieldset>
      <fieldset disabled={saving || uploading || Boolean(loadError)}><legend>Contact and social links</legend>
        <div className="site-settings__grid">{field('contactEmail', 'Public contact email', 254, 'email')}{field('contactPhone', 'Public phone number', 40, 'tel')}</div>
        {field('websiteUrl', 'Website URL', 2048, 'url')}
        <label>Business address<textarea rows="3" maxLength={500} value={draft.address} onChange={event => change('address', event.target.value)} /></label>
        {['instagram', 'facebook', 'twitter'].map(key => <label key={key}>{key === 'twitter' ? 'X / Twitter' : key[0].toUpperCase() + key.slice(1)} URL
          <input type="url" maxLength={2048} value={draft.socialLinks[key]} onChange={event => { setDraft(previous => ({ ...previous, socialLinks: { ...previous.socialLinks, [key]: event.target.value } })); setMessage(''); }} />
        </label>)}
      </fieldset>
      <div className="site-settings__actions"><button type="button" disabled={saving || uploading} onClick={() => { setDraft(branding); setError(''); setMessage(''); }}>Discard changes</button>
        <button type="submit" disabled={saving || uploading || Boolean(loadError)}>{saving ? 'Saving…' : uploading ? 'Uploading…' : 'Save site settings'}</button></div>
    </form>}
  </section></>;
}
