import * as THREE from 'three';
export const WIDTH = 768, HEIGHT = 1152;
export const center = layer => ({ x: WIDTH * (.5 + (layer.position?.x || 0) * .004), y: HEIGHT * (.43 + (layer.position?.y || 0) * .0035) });
const fonts = { sans: 'Arial, sans-serif', serif: 'Georgia, serif', mono: 'Courier New, monospace' };
export function paintPanel(side, design, images) {
  const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = design.panelColors[side] || design.color; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  design.placedDesigns.filter(layer => layer.side === side).forEach(layer => {
    const img = images[layer.preview]; if (!img) return;
    const point = center(layer), rotation = (layer.rotation || 0) * Math.PI / 180;
    ctx.save();
    if (layer.mode && layer.mode !== 'graphic') {
      ctx.beginPath();
      ctx.rect(layer.mode === 'half-right' ? WIDTH / 2 : 0, 0, layer.mode.startsWith('half-') ? WIDTH / 2 : WIDTH, HEIGHT); ctx.clip();
      const tile = document.createElement('canvas'); tile.width = Math.round(WIDTH / (layer.repeat || 3)); tile.height = Math.max(1, Math.round(tile.width * img.height / img.width));
      tile.getContext('2d').drawImage(img, 0, 0, tile.width, tile.height);
      ctx.translate(point.x, point.y); ctx.rotate(rotation); ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(-WIDTH * 3, -HEIGHT * 3, WIDTH * 6, HEIGHT * 6);
    } else {
      const w = WIDTH * .55 * (layer.size || 80) / 80, h = w * img.height / img.width;
      ctx.translate(point.x, point.y); ctx.rotate(rotation); ctx.drawImage(img, -w / 2, -h / 2, w, h);
    }
    ctx.restore();
  });
  design.lettering.filter(layer => layer.side === side).forEach(layer => {
    const point = center(layer); ctx.save(); ctx.translate(point.x, point.y); ctx.rotate((layer.rotation || 0) * Math.PI / 180);
    ctx.fillStyle = layer.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold ' + WIDTH * layer.size / 100 + 'px ' + fonts[layer.font || 'sans'];
    ctx.fillText(layer.text, 0, 0, WIDTH * .9); ctx.restore();
  });
  if (side.includes('Sleeve')) { ctx.fillStyle = design.trimColor; ctx.fillRect(0, HEIGHT * .93, WIDTH, HEIGHT * .07); }
  return canvas;
}
// Shared physical projection for the curved garment and flat placement guide.
export function panelGeometry(source, side) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const pos = geometry.attributes.position, values = new Float32Array(pos.count * 2);
  const sign = side === 'leftSleeve' ? 1 : -1;
  let sleeveStart = Infinity, sleeveEnd = -Infinity;
  if (side.includes('Sleeve')) for (let i = 0; i < pos.count; i++) {
    const along = (pos.getX(i) - sign * .25) * sign * .65 + (pos.getY(i) - 1.465) * -.76;
    sleeveStart = Math.min(sleeveStart, along); sleeveEnd = Math.max(sleeveEnd, along);
  }
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (side.includes('Sleeve')) {
      const dx = x - sign * .25, dy = y - 1.465, dz = z + .035;
      const along = dx * sign * .65 + dy * -.76;
      const perpendicular = dx * .76 + dy * sign * .65;
      values[i * 2] = Math.atan2(perpendicular, dz) / (Math.PI * 2) + .5;
      values[i * 2 + 1] = (along - sleeveStart) / Math.max(.0001, sleeveEnd - sleeveStart);
    } else {
      values[i * 2] = side === 'back' ? 1 - (x + .208) / .416 : (x + .208) / .416;
      values[i * 2 + 1] = (1.63 - y) / .695;
    }
  }
  if (side.includes('Sleeve')) for (let i = 0; i < pos.count; i += 3) {
    const u = [values[i * 2], values[(i + 1) * 2], values[(i + 2) * 2]];
    if (Math.max(...u) - Math.min(...u) > .5) for (let j = 0; j < 3; j++) if (u[j] < .5) values[(i + j) * 2] += 1;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(values, 2)); return geometry;
}
// Rasterize the projection directly. Avoid a giant vector path containing all
// garment triangles, which can stall Canvas tessellation on integrated GPUs.
export function panelMask(descriptors, side) {
  const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d'), data = ctx.createImageData(WIDTH, HEIGHT);
  const pixels = new Uint32Array(data.data.buffer);
  descriptors.filter(mesh => mesh.panel === side).forEach(mesh => {
    const uv = mesh.geometry.attributes.uv;
    (side.includes('Sleeve') ? [-1, 0] : [0]).forEach(shift => {
      for (let i = 0; i < uv.count; i += 3) {
        const points = [0, 1, 2].map(j => [(uv.getX(i + j) + shift) * WIDTH, uv.getY(i + j) * HEIGHT]);
        const low = Math.max(0, Math.floor(Math.min(...points.map(p => p[1])))), high = Math.min(HEIGHT - 1, Math.ceil(Math.max(...points.map(p => p[1]))));
        for (let row = low; row <= high; row++) {
          const y = row + .5, xs = [];
          for (let edge = 0; edge < 3; edge++) {
            const a = points[edge], b = points[(edge + 1) % 3];
            if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
          }
          if (xs.length < 2) continue;
          const left = Math.max(0, Math.floor(Math.min(...xs))), right = Math.min(WIDTH, Math.ceil(Math.max(...xs)));
          if (right > left) pixels.fill(0xffffffff, row * WIDTH + left, row * WIDTH + right);
        }
      }
    });
  });
  ctx.putImageData(data, 0, 0); return canvas;
}
