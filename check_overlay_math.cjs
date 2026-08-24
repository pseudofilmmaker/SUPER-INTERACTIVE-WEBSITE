// Compute the radial-gradient alpha at various y-positions within a 1024x600 box
// radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.15), rgba(0,0,0,0.75) 80%)
// default size = farthest-corner
const W = 1024, H = 600;
const cx = W/2, cy = H/2;
// farthest corner distance
function ellipseRadiusAt(angle) {
  // for "farthest-corner" ellipse sizing, rx = max horizontal dist to corner, ry = max vertical dist to corner
  const rx = Math.max(cx, W-cx);
  const ry = Math.max(cy, H-cy);
  return {rx, ry};
}
const {rx, ry} = ellipseRadiusAt();
function alphaAt(x, y) {
  const dx = (x-cx)/rx, dy = (y-cy)/ry;
  const dist = Math.sqrt(dx*dx+dy*dy); // 0 at center, 1 at farthest corner
  const stop0 = 0, a0 = 0.15;
  const stop1 = 0.8, a1 = 0.75;
  let t = dist;
  if (t <= stop0) return a0;
  if (t >= stop1) return a1;
  return a0 + (a1-a0)*(t-stop0)/(stop1-stop0);
}
for (const y of [0, 50, 100, 150, 300]) {
  console.log(`y=${y} (top-center): alpha=${alphaAt(cx, y).toFixed(3)}`);
}
