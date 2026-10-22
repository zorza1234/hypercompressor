export function dimensions(iw, ih, width, height) {
  const w = Number(width), h = Number(height);
  if (![w,h].every(v=>Number.isInteger(v) && v>=0 && v<=8000)) throw new Error('Dimensions must be whole numbers from 1 to 8,000, or blank.');
  const result = {width:w || (h ? Math.max(1,Math.round(iw*h/ih)) : iw),height:h || (w ? Math.max(1,Math.round(ih*w/iw)) : ih)};
  if(result.width>8000 || result.height>8000 || result.width*result.height>24000000) throw new Error('The requested image is too large. Use at most 8,000 pixels per side and 24 megapixels.');
  return result;
}
export function drawImage(image, width, height, fit, white) {
  const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx) throw new Error('Your browser could not create an image canvas.');
  if(white){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);}
  const iw=image.naturalWidth || image.width, ih=image.naturalHeight || image.height;
  if(fit==='stretch') ctx.drawImage(image,0,0,width,height);
  else {const ratio=(fit==='crop'?Math.max:Math.min)(width/iw,height/ih);ctx.drawImage(image,(width-iw*ratio)/2,(height-ih*ratio)/2,iw*ratio,ih*ratio);}
  return canvas;
}
export function encode(canvas,format,quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
  if(!blob) return reject(new Error('Your browser could not encode this image. Try a smaller size.'));
  if(blob.type!==format) return reject(new Error('Your browser does not support this output format. Choose JPG or PNG.'));
  resolve(blob);
},format,quality));}
export async function encodeUnderLimit(canvas,format,maxBytes,quality,encoder=encode){
  let best=await encoder(canvas,format,quality);
  if(!maxBytes || best.size<=maxBytes) return best;
  if(format==='image/png') return null;
  let low=0.02,high=quality;
  best=await encoder(canvas,format,low);
  if(best.size>maxBytes) return null;
  for(let i=0;i<9;i++){const q=(low+high)/2;const candidate=await encoder(canvas,format,q);if(candidate.size<=maxBytes){best=candidate;low=q;}else high=q;}
  return best;
}
export async function processImage(image, file, options){
  let {width,height}=dimensions(image.naturalWidth,image.naturalHeight,options.width,options.height);
  const exact=Boolean(options.width || options.height), maxBytes=options.kb*1000;
  for(let attempt=0;attempt<40;attempt++){
    const canvas=drawImage(image,width,height,options.fit,options.format==='image/jpeg');
    let blob=await encodeUnderLimit(canvas,options.format,maxBytes,options.quality);
    if(blob){
      let unchanged=false;
      if(!exact && !maxBytes && options.format===file.type && file.size<=blob.size){blob=file;unchanged=true;}
      return {blob,width,height,unchanged};
    }
    if(exact) throw new Error('The size limit cannot be reached at these exact dimensions. Increase the KB limit, choose JPG/WebP, or clear the dimensions to allow resizing.');
    if(width===1 && height===1) break;
    width=Math.max(1,Math.floor(width*.8));height=Math.max(1,Math.floor(height*.8));
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  throw new Error('This file-size limit cannot be reached. Please use a larger limit.');
}
export async function loadImage(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image. PDF, SVG, GIF and HEIC are not supported.');
  if(file.size>20*1024*1024) throw new Error('Choose an image smaller than 20 MB.');
  const url=URL.createObjectURL(file);
  try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{
    if(img.naturalWidth*img.naturalHeight>24000000 || Math.max(img.naturalWidth,img.naturalHeight)>8000) reject(new Error('Choose an image up to 24 megapixels and 8,000 pixels per side.'));
    else resolve(img);
  };img.onerror=()=>reject(new Error('This image cannot be read. Try exporting it as JPG or PNG again.'));img.src=url;});}
  finally{URL.revokeObjectURL(url);}
}
