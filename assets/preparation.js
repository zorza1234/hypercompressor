export function encodedFormat(bytes){
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
  if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
  throw new Error('Use a valid JPG, PNG or WebP image.');
}
export function checkRequirements(file,width,height,r){
  if(r.min && r.max && r.min>r.max)throw new Error('Minimum size cannot exceed maximum size.');
  const checks=[];const add=(label,pass,detail)=>checks.push({label,pass,detail});
  if(r.min)add('Minimum file size',file.size>=r.min*r.unit,`${file.size} bytes; minimum ${Math.ceil(r.min*r.unit)}`);
  if(r.max)add('Maximum file size',file.size<=r.max*r.unit,`${file.size} bytes; maximum ${Math.floor(r.max*r.unit)}`);
  if(r.width)add('Exact width',width===r.width,`${width} px; required ${r.width}`);
  if(r.height)add('Exact height',height===r.height,`${height} px; required ${r.height}`);
  if(r.format)add('File format',file.type===r.format,`${file.type}; required ${r.format}`);
  return checks;
}
export function cropRectangle(width,height,crop){
  const values=['top','right','bottom','left'].map(k=>Number(crop[k]));
  if(values.some(v=>!Number.isFinite(v)||v<0||v>=100)||values[0]+values[2]>=100||values[1]+values[3]>=100)throw new Error('Keep some image visible: opposite crop edges must add up to less than 100%.');
  const x=Math.floor(width*crop.left/100), y=Math.floor(height*crop.top/100);
  return {x,y,width:Math.max(1,Math.floor(width*(1-(crop.left+crop.right)/100))),height:Math.max(1,Math.floor(height*(1-(crop.top+crop.bottom)/100)))};
}
export function inkBounds(data,width,height){
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,a=data[i+3]/255;const light=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])*a+255*(1-a);if(light<190){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}}
  if(right<0)throw new Error('No dark ink was found. Adjust the crop manually or use a clearer image.');
  const pad=Math.max(4,Math.ceil(Math.max(width,height)*.015));
  return {left:Math.max(0,left-pad)/width*100,top:Math.max(0,top-pad)/height*100,right:Math.max(0,width-1-right-pad)/width*100,bottom:Math.max(0,height-1-bottom-pad)/height*100};
}
export function stampCanvas(image,name,date){
  name=name.trim();if(!name&&!date)throw new Error('Enter a name, a date, or both.');
  const w=image.naturalWidth,h=image.naturalHeight;
  const lines=[name,date].filter(Boolean),font=Math.max(12,Math.round(w*.045)),strip=Math.max(42,Math.ceil(font*1.5*lines.length+font));
  if(h+strip>8000||w*(h+strip)>24000000)throw new Error('The added strip would make this image too large. Resize the original first.');
  const c=document.createElement('canvas');c.width=w;c.height=h+strip;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,w,c.height);ctx.drawImage(image,0,0);ctx.fillStyle='#111';ctx.textAlign='center';ctx.textBaseline='middle';
  lines.forEach((line,i)=>{let size=font;ctx.font=`${size}px Arial`;while(ctx.measureText(line).width>w*.92&&size>8){size--;ctx.font=`${size}px Arial`;}if(ctx.measureText(line).width>w*.92)throw new Error('This text is too long for the image width. Shorten it or use a larger original.');ctx.fillText(line,w/2,h+strip*(i+1)/(lines.length+1));});return c;
}
