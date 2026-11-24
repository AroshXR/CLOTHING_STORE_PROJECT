import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { apiUrl, mediaUrl } from './api';
import './branding.css';

export const defaultBranding = Object.freeze({
  name: 'Your Store', tagline: 'Custom clothing, made for you.', logoUrl: '',
  primaryColor: '#111827', accentColor: '#2563eb',
  contactEmail: '', contactPhone: '', address: '', websiteUrl: '',
  socialLinks: { instagram: '', facebook: '', twitter: '' },
  heroTitle: 'Create your perfect T-shirt',
  heroDescription: 'Design custom clothing, browse ready-made pieces, and reserve outfits for your next occasion.',
  aboutText: 'Discover and personalize clothing that suits your style.'
});
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const csvCell = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
export const brandSlug = name => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\d]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'store';
const onColor = hex => {
  const rgb = hex.slice(1).match(/../g)?.map(part => {
    const channel = parseInt(part, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) || [0, 0, 0];
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? '#111827' : '#ffffff';
};
const BrandingContext = createContext({ branding: defaultBranding, loading: false, error: '' });
export const useBranding = () => useContext(BrandingContext);
export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(defaultBranding), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const reload = useCallback(async signal => {
    setLoading(true); setError('');
    try {
      const { data } = await axios.get(apiUrl('/site-settings'), { signal });
      if (!signal?.aborted) setBranding({ ...defaultBranding, ...data.data });
    } catch (err) {
      if (!signal?.aborted) setError(err.response?.data?.message || 'Unable to load site settings.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController(); reload(controller.signal);
    return () => controller.abort();
  }, [reload]);
  const save = useCallback(async settings => {
    const { data } = await axios.put(apiUrl('/site-settings'), settings);
    setBranding({ ...defaultBranding, ...data.data });
    return data.data;
  }, []);
  useEffect(() => {
    document.title = branding.name;
    document.documentElement.style.setProperty('--brand-primary', branding.primaryColor);
    document.documentElement.style.setProperty('--brand-accent', branding.accentColor);
    document.documentElement.style.setProperty('--brand-on-primary', onColor(branding.primaryColor));
    document.documentElement.style.setProperty('--brand-on-accent', onColor(branding.accentColor));
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = branding.heroDescription;
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.content = branding.primaryColor;
    const icon = document.querySelector('link[rel="icon"]');
    if (icon) { icon.href = branding.logoUrl ? mediaUrl(branding.logoUrl) : '/favicon.svg'; icon.removeAttribute('type'); }
    const manifest = document.querySelector('link[rel="manifest"]');
    if (manifest) manifest.href = apiUrl('/site-settings/manifest.webmanifest');
  }, [branding]);
  const value = useMemo(() => ({ branding, loading, error, reload, save }), [branding, loading, error, reload, save]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}
