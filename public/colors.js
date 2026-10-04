(function(root){
 function color(hex,brightness){
  if(brightness==null)return hex;
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min;
  let h=0;if(delta){if(max===rgb[0])h=((rgb[1]-rgb[2])/delta)%6;else if(max===rgb[1])h=(rgb[2]-rgb[0])/delta+2;else h=(rgb[0]-rgb[1])/delta+4;}h=(h*60+360)%360;
  const l=(max+min)/2,s=delta?delta/(1-Math.abs(2*l-1)):0;
  return `hsl(${h.toFixed(2)} ${(s*100).toFixed(2)}% ${20+brightness*.65}%)`;
 }
 if(typeof module==='object')module.exports=color;else root.ColorbarColor=color;
})(globalThis);
