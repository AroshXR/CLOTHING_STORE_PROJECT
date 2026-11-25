import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Download, RotateCcw } from 'lucide-react';
import { useGarment } from './useGarment';
import Garment from './Garment';
import PrintLayout from './PrintLayout';
function Camera({ view, reset }) {
  const { camera } = useThree();
  const controls = useRef();
  useEffect(() => {
    camera.position.set(...(view === 'back' ? [0, .05, -3] : view === 'angle' ? [2.1, .4, 2.5] : view === 'leftSleeve' ? [3, .2, .3] : view === 'rightSleeve' ? [-3, .2, .3] : [0, .05, 3]));
    controls.current?.target.set(0, 0, 0); controls.current?.update();
  }, [view, reset, camera]);
  return <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={1.7} maxDistance={5} minPolarAngle={.45} maxPolarAngle={2.6} />;
}
export default function StudioWorkspace({ design, panel, selected, onMove, onEnd, viewMode }) {
  const resources = useGarment(design), renderer = useRef();
  const [cameraView, setCameraView] = useState(panel), [reset, setReset] = useState(0), [downloadError, setDownloadError] = useState('');
  useEffect(() => setCameraView(panel), [panel]);
  function download() {
    try {
      const link = document.createElement('a'); link.download = (design.nickname.trim().replace(/[^a-z0-9-]/gi, '-').slice(0, 50) || 'my-shirt') + '-preview.png';
      link.href = renderer.current.domElement.toDataURL('image/png'); link.click(); setDownloadError('');
    } catch (_) { setDownloadError('Preview download is unavailable. Try again after the artwork has loaded.'); }
  }
  return <section className="studio-workspace" aria-label="Live design preview">
    <div className="studio-workspace-tools"><div className="studio-segment" aria-label="Camera view">{['front','back','angle'].map(view => <button key={view} aria-pressed={cameraView === view} onClick={() => { setCameraView(view); setReset(value => value + 1); }}>{view === 'angle' ? '3/4 view' : view === 'front' ? 'Front view' : 'Back view'}</button>)}</div>
      <div className="studio-tool-actions"><button title="Reset camera" aria-label="Reset camera" onClick={() => setReset(value => value + 1)}><RotateCcw size={16} /></button><button onClick={download} disabled={resources.loading || !!resources.error || viewMode === 'layout'}><Download size={16} /> Save preview</button></div>
    </div>
    <div className={'studio-views studio-views--' + viewMode}>
      <div className="studio-model-view"><div className="studio-stage-label"><span className="studio-dot" />Live 3D</div>
        <Canvas frameloop="demand" camera={{ position: [0, .05, 3], fov: 38 }} dpr={[1, 1.5]} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => { renderer.current = gl; }}>
          <ambientLight intensity={.7} /><hemisphereLight args={['#e6f2ff', '#475267', .7]} /><directionalLight position={[2, 3, 4]} intensity={1.6} /><directionalLight position={[-3, 1, -2]} intensity={1.2} />
          <Garment resources={resources} /><Camera view={cameraView} reset={reset} />
        </Canvas><p className="studio-stage-hint">Drag to rotate · Scroll to zoom</p>
      </div>
      <PrintLayout resources={resources} panel={panel} selected={selected} onMove={onMove} onEnd={onEnd} />
    </div>
    {resources.loading && <p className="studio-preview-status" role="status">Loading artwork…</p>}
    {(resources.error || downloadError) && <p className="studio-error" role="alert">{resources.error || downloadError}</p>}
    <div className="studio-preview-footer"><span>One design, every angle.</span><span>Preview colours and placement may vary in production.</span></div>
  </section>;
}
