import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { panelGeometry, panelMask, WIDTH, HEIGHT } from './paint';
// Exercise the actual shipped garment rather than a second implementation of
// its UV mapping; a changed model should reveal projection/seam regressions.
const bytes = fs.readFileSync(path.join(process.cwd(), 'public/models/t_shirt.glb'));
const jsonLength = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
const binary = bytes.subarray(28 + jsonLength);
function attribute(index, size) {
  const accessor = gltf.accessors[index], view = gltf.bufferViews[accessor.bufferView];
  const TypedArray = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[accessor.componentType];
  const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const copy = Uint8Array.from(binary.subarray(offset, offset + accessor.count * size * TypedArray.BYTES_PER_ELEMENT));
  return new THREE.BufferAttribute(new TypedArray(copy.buffer), size);
}
function mesh(name) {
  const node = gltf.nodes.find(node => node.name === name), primitive = gltf.meshes[node.mesh].primitives[0], geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', attribute(primitive.attributes.POSITION, 3)); geometry.setIndex(attribute(primitive.indices, 1)); return geometry;
}
test('front and back artwork is oriented toward each viewer and does not mutate the shared model', () => {
  const original = mesh('Object_10'), front = panelGeometry(original, 'front'), back = panelGeometry(original, 'back');
  expect(original.index).not.toBeNull(); expect(original.getAttribute('uv')).toBeUndefined();
  let maxMirrorError = 0, finite = true;
  for (let i = 0; i < front.attributes.uv.count; i++) { maxMirrorError = Math.max(maxMirrorError, Math.abs(front.attributes.uv.getX(i) + back.attributes.uv.getX(i) - 1)); finite = finite && Number.isFinite(front.attributes.uv.getY(i)); }
  expect(maxMirrorError).toBeLessThan(.00001); expect(finite).toBe(true);
  original.dispose(); front.dispose(); back.dispose();
});
test('both sleeves include the full cuff and no triangle crosses the texture seam', () => {
  for (const [name, side] of [['Object_18','leftSleeve'],['Object_20','rightSleeve']]) {
    const original = mesh(name), geometry = panelGeometry(original, side), uv = geometry.attributes.uv;
    let low = Infinity, high = -Infinity, maxSeamSpan = 0;
    for (let i = 0; i < uv.count; i += 3) {
      const values = [0,1,2].map(j => uv.getX(i + j)); maxSeamSpan = Math.max(maxSeamSpan, Math.max(...values) - Math.min(...values));
      for (let j = 0; j < 3; j++) { low = Math.min(low, uv.getY(i + j)); high = Math.max(high, uv.getY(i + j)); }
    }
    expect(maxSeamSpan).toBeLessThanOrEqual(.50001); expect(low).toBeCloseTo(0); expect(high).toBeCloseTo(1); original.dispose(); geometry.dispose();
  }
});
test('the actual garment produces a clipped placement silhouette without vector tessellation', () => {
  let rendered;
  const create = vi.spyOn(document, 'createElement').mockReturnValue({ getContext: () => ({ createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData: data => { rendered = data.data; } }) });
  const original = mesh('Object_10'), geometry = panelGeometry(original, 'front');
  try {
    panelMask([{ panel: 'front', geometry }], 'front');
    let pixels = 0; for (let i = 3; i < rendered.length; i += 4) if (rendered[i]) pixels++;
    expect(pixels).toBeGreaterThan(WIDTH * HEIGHT * .2); expect(pixels).toBeLessThan(WIDTH * HEIGHT * .99);
  } finally { create.mockRestore(); original.dispose(); geometry.dispose(); }
});
