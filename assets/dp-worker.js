import buildLibheif from './vendor/libheif.js';
import {enhancePixels} from './dp-core.js';
// Imported eagerly, so all decoder code is available offline before Ready is shown.
self.postMessage({ready:true});
self.onmessage=async({data:m})=>{try{
  if(m.type==='enhance'){const image=await enhancePixels(m.image,m.intensity,m.denoise);self.postMessage({id:m.id,image},[image.data.buffer]);return;}
  const lib=buildLibheif();let decoder,images,canvas;
  try{
    decoder=new lib.HeifDecoder();images=decoder.decode(m.buffer);if(!images.length)throw new Error('No readable HEIC image found.');
    const first=images[0],width=first.get_width(),height=first.get_height();
    if(width*height>60000000||Math.max(width,height)>30000)throw new Error('This HEIC is too large to decode safely. Use a photo below 60 megapixels.');
    const raw=new ImageData(width,height);for(let i=3;i<raw.data.length;i+=4)raw.data[i]=255;
    const decoded=await new Promise((resolve,reject)=>first.display(raw,r=>r?resolve(r):reject(new Error('Corrupt or unsupported HEIC image.'))));
    let image=decoded;
    if(typeof OffscreenCanvas!=='undefined'){
      canvas=new OffscreenCanvas(width,height);canvas.getContext('2d').putImageData(decoded,0,0);
      const ratio=Math.min(1,2048/Math.max(width,height)),small=new OffscreenCanvas(Math.max(1,Math.round(width*ratio)),Math.max(1,Math.round(height*ratio)));
      const ctx=small.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(canvas,0,0,small.width,small.height);image=ctx.getImageData(0,0,small.width,small.height);small.width=small.height=1;
    }
    self.postMessage({id:m.id,image,width,height},[image.data.buffer]);
  }finally{if(canvas)canvas.width=canvas.height=1;images?.forEach(i=>i.free());if(decoder?.decoder)lib.heif_context_free(decoder.decoder);}
}catch(e){self.postMessage({id:m.id,error:e.message||'Could not process this image.'});}};
