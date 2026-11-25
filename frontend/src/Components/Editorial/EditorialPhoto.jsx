import React from 'react';
import triptych from '../../assets/editorial/studio-triptych.png';
export default function EditorialPhoto({ panel = 0, alt = '', className = '', eager = false }) {
  return <div className={'ed-photo ed-photo--' + panel + ' ' + className}><img src={triptych} alt={alt} loading={eager ? 'eager' : 'lazy'} style={{ transform: 'translateX(-' + panel * 100 / 3 + '%)' }} /></div>;
}
