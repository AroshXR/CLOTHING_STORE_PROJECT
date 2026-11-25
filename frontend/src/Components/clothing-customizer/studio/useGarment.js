import { useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import axios from 'axios';
import { mediaUrl, isApiMedia } from '../../../config/api';
import { useAuth } from '../../../AuthGuard/authGuard';
import { PANELS } from './design';
import { paintPanel, panelGeometry, panelMask, WIDTH, HEIGHT } from './paint';

const parts = { Object_6: 'trim', Object_8: 'trim', ChestDesignFace: 'front', Object_10: 'front', Object_11: 'front', Object_12: 'front', Object_14: 'back', Object_15: 'back', Object_16: 'back', Object_18: 'leftSleeve', Object_20: 'rightSleeve' };
function useArtwork(design) {
  const { token } = useAuth();
  const signature = JSON.stringify([...new Set(design.placedDesigns.map(layer => layer.preview))].sort());
  const [state, setState] = useState({ signature: '', images: {}, error: '', loading: false });
  useEffect(() => {
    const controller = new AbortController(), objects = [];
    let cancelled = false;
    setState({ signature, images: {}, loading: true, error: '' });
    Promise.all(JSON.parse(signature).map(async source => {
      let url = mediaUrl(source);
      if (isApiMedia(url)) {
        const response = await axios.get(url, { responseType: 'blob', signal: controller.signal, headers: token ? { Authorization: 'Bearer ' + token } : {} });
        if (cancelled) throw new Error('Cancelled');
        url = URL.createObjectURL(response.data); objects.push(url);
      }
      const img = new Image(); img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('Artwork could not be loaded. Sign in again if this is a private upload.')); img.src = url; });
      return [source, img];
    })).then(entries => { if (!cancelled) setState({ signature, images: Object.fromEntries(entries), loading: false, error: '' }); })
      .catch(error => { if (!cancelled) setState({ signature, images: {}, loading: false, error: error.message || 'Artwork could not be loaded.' }); });
    return () => { cancelled = true; controller.abort(); objects.forEach(url => URL.revokeObjectURL(url)); };
  }, [signature, token]);
  return state.signature === signature ? state : { images: {}, loading: true, error: '' };
}
export function useGarment(design) {
  const { nodes } = useGLTF('/models/t_shirt.glb');
  const meshes = useMemo(() => Object.entries(parts).filter(([name]) => nodes[name]?.geometry).map(([name, panel]) => ({ name, panel, geometry: panel === 'trim' ? nodes[name].geometry.clone() : panelGeometry(nodes[name].geometry, panel) })), [nodes]);
  const masks = useMemo(() => Object.fromEntries(PANELS.map(panel => [panel.id, panelMask(meshes, panel.id)])), [meshes]);
  const artwork = useArtwork(design);
  const { canvases, textures } = useMemo(() => {
    const nextCanvases = {};
    const nextTextures = {};
    for (const panel of PANELS) {
      const canvas = document.createElement('canvas');
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const texture = new THREE.CanvasTexture(canvas);
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.anisotropy = 4;
      nextCanvases[panel.id] = canvas;
      nextTextures[panel.id] = texture;
    }
    return { canvases: nextCanvases, textures: nextTextures };
  }, []);
  const prevPanelKeys = useRef({});
  const versionRef = useRef(0);
  useMemo(() => {
    let changed = false;
    for (const panel of PANELS) {
      const id = panel.id;
      const key = JSON.stringify({
        bg: design.panelColors[id] || design.color,
        trim: id.includes('Sleeve') ? design.trimColor : '',
        placed: design.placedDesigns.filter(layer => layer.side === id),
        lettering: design.lettering.filter(layer => layer.side === id),
        loading: artwork.loading
      });
      if (prevPanelKeys.current[id] !== key) {
        prevPanelKeys.current[id] = key;
        paintPanel(id, design, artwork.images, canvases[id]);
        textures[id].needsUpdate = true;
        changed = true;
      }
    }
    if (changed) versionRef.current += 1;
  }, [design, artwork.images, artwork.loading, canvases, textures]);
  useEffect(() => () => Object.values(textures).forEach(texture => texture.dispose()), [textures]);
  useEffect(() => () => meshes.forEach(mesh => mesh.geometry.dispose()), [meshes]);
  return { meshes, masks, canvases, textures, version: versionRef.current, trimColor: design.trimColor, loading: artwork.loading, error: artwork.error };
}
useGLTF.preload('/models/t_shirt.glb');
