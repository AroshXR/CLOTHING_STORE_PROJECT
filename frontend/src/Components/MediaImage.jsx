import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { mediaUrl, isApiMedia } from '../config/api';
import { useAuth } from '../AuthGuard/authGuard';
export function useMediaUrl(source) {
  const url = mediaUrl(source), token = useAuth()?.token;
  const [resolved, setResolved] = useState(isApiMedia(url) ? '' : url);
  useEffect(() => {
    if (!url || !isApiMedia(url)) { setResolved(url); return undefined; }
    const controller = new AbortController();
    let objectUrl;
    setResolved('');
    axios.get(url, { responseType: 'blob', signal: controller.signal }).then(response => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(response.data); setResolved(objectUrl);
    }).catch(error => { if (error.code !== 'ERR_CANCELED') setResolved(''); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, token]);
  return resolved;
}
export default function MediaImage({ src, alt = '', ...props }) {
  const resolved = useMediaUrl(src);
  return <img {...props} src={resolved || undefined} alt={alt} aria-busy={Boolean(src && !resolved)} />;
}
