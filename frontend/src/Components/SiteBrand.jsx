import React, { useState } from 'react';
import { useBranding } from '../config/branding';
import { mediaUrl } from '../config/api';
export default function SiteBrand() {
  const { branding } = useBranding();
  const [failedUrl, setFailedUrl] = useState('');
  return <span className="site-brand">
    {branding.logoUrl && failedUrl !== branding.logoUrl && <img src={mediaUrl(branding.logoUrl)} alt="" onError={() => setFailedUrl(branding.logoUrl)} />}
    <span className="site-brand__name">{branding.name}</span>
  </span>;
}
