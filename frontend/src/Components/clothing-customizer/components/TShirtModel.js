import React, { useMemo } from 'react';
import { loadDesign } from '../studio/design';
import { useGarment } from '../studio/useGarment';
import Garment from '../studio/Garment';
export function TShirtModel({ configuration, selectedColor, presetDesign, chestDesignUrl, ...props }) {
  const design = useMemo(() => loadDesign(configuration || { color: selectedColor || '#ffffff', selectedDesign: (presetDesign?.imageUrl || chestDesignUrl) ? { preview: presetDesign?.imageUrl || chestDesignUrl, size: 80, position: { x: 0, y: 0 } } : null }), [configuration, selectedColor, presetDesign, chestDesignUrl]);
  const resources = useGarment(design);
  return <Garment resources={resources} {...props} />;
}

