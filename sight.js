export function canWitness(eye,yaw,target,walls,furniture,doorAt){
  const dx=target.x-eye.x,dz=target.z-eye.z;
  const distance=Math.hypot(dx,dz);
  if(distance>5.9||(distance>.09&&(Math.sin(yaw)*dx+Math.cos(yaw)*dz)/distance<.52))return false;

  // The missing upper wall in the dollhouse view still separates the rooms.
  const segments=Math.ceil(Math.max(distance,Math.abs(target.y-eye.y))/.06);
  for(let i=1;i<segments;i++){
    const fraction=i/segments;
    const x=eye.x+dx*fraction,z=eye.z+dz*fraction;
    const y=eye.y+(target.y-eye.y)*fraction;
    if(y<2.55&&walls.some(wall=>Math.abs(x-wall.x)<wall.w/2&&Math.abs(z-wall.z)<wall.d/2))return false;
    if(y<2.10&&doorAt(x,z))return false;
    if(furniture.some(([cx,cz,w,d,height])=>y<height&&Math.abs(x-cx)<w/2&&Math.abs(z-cz)<d/2))return false;
  }
  return true;
}
