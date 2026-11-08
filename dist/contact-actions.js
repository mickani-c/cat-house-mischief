import * as T from './vendor/three.module.min.js';
const down=new T.Vector3(0,-1,0);
// Two short foreleg bones. Reach is clamped instead of stretching the cat's limbs.
export function poseContact(actor,point,height,progress){
  const paw=actor.paws[3],shin=actor.shins[3];
  actor.body.updateWorldMatrix(true,true);
  const target=actor.body.worldToLocal(new T.Vector3(point[0],height+.045,point[1]));
  const rest=paw.position.clone().add(new T.Vector3(0,-.24,.034));
  const weight=Math.sin(T.MathUtils.clamp(progress,0,1)*Math.PI);
  const end=rest.lerp(target,weight),delta=end.sub(paw.position),length=T.MathUtils.clamp(delta.length(),.065,.238);
  const direction=delta.normalize(),bend=new T.Vector3(0,0,-1);
  bend.addScaledVector(direction,-bend.dot(direction)).normalize();
  const first=.15,second=.09;
  const along=(first*first-second*second+length*length)/(2*length);
  const elbow=direction.clone().multiplyScalar(along).addScaledVector(bend,Math.sqrt(Math.max(0,first*first-along*along)));
  paw.quaternion.setFromUnitVectors(down,elbow.clone().normalize());
  const lower=direction.multiplyScalar(length).sub(elbow).normalize().applyQuaternion(paw.quaternion.clone().invert());
  shin.quaternion.setFromUnitVectors(down,lower);
}
