/* Royal Layer — gentle, source-grounded SVG particle motion.
 * Coordinates come from actual GPO graph nodes. Motion is decorative only:
 * never manufactures new relationships, links or source events.
 */
const h32=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
export function offsetFor(key,ms,{reducedMotion=false,active=true,amplitude=5}={}){
 if(!active||reducedMotion)return {x:0,y:0};
 const seed=h32(key),a=seed%6283/1000,b=(seed>>>8)%6283/1000;
 const x=Math.sin(ms*.00042+a)*amplitude*.72+Math.sin(ms*.00083+b)*amplitude*.28;
 const y=Math.cos(ms*.00035+b)*amplitude*.68+Math.sin(ms*.00071+a)*amplitude*.32;
 return {x,y};
}
export function applyParticleFrame(points,lines,ms,active=true){
 const current=new Map();
 for(const n of points){
   const offset=offsetFor(n.key,ms,{active,amplitude:n.amplitude??5});
   const x=n.x+offset.x,y=n.y+offset.y;current.set(n.key,{x,y});
   n.element.setAttribute('transform','translate('+offset.x.toFixed(2)+' '+offset.y.toFixed(2)+')');
 }
 for(const line of lines){
   const a=current.get(line.from),b=current.get(line.to);
   if(a&&b){
     line.element.setAttribute('x1',a.x.toFixed(2));line.element.setAttribute('y1',a.y.toFixed(2));
     line.element.setAttribute('x2',b.x.toFixed(2));line.element.setAttribute('y2',b.y.toFixed(2));
   }
 }
}
export function attachParticleMotion(svg,points,lines,{enabled=true,onState=()=>{}}={}){
 let running=false,handle=0,active=enabled;
 const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const permitted=()=>active&&!reduce?.matches&&!document.hidden&&svg.isConnected&&!!svg.getClientRects().length;
 const frame=ms=>{
   if(!running)return;
   if(!permitted()){stop();return;}
   applyParticleFrame(points,lines,ms,true);
   handle=requestAnimationFrame(frame);
 };
 const stop=()=>{
   running=false;
   if(handle)cancelAnimationFrame(handle);handle=0;
   applyParticleFrame(points,lines,0,false);
 };
 const start=()=>{
   if(running||!permitted())return;
   running=true;handle=requestAnimationFrame(frame);
 };
 const visibility=()=>{if(permitted())start();else stop();};
 document.addEventListener('visibilitychange',visibility);
 reduce?.addEventListener?.('change',visibility);
 const cleanup=()=>{
   stop();
   document.removeEventListener('visibilitychange',visibility);
   reduce?.removeEventListener?.('change',visibility);
 };
 if(permitted())start();
 return {
   setEnabled(value){active=Boolean(value);visibility();onState(active);},
   get enabled(){return active;},
   cleanup,
   refresh:visibility
 };
}
