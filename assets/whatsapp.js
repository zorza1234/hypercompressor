import {encode,encodeUnderLimit} from './engine.js';
import {clamp,placement,imageKind,enhancePixels,rasterMetadata} from './dp-core.js';
const $=id=>document.getElementById('dp-'+id),canvas=(w,h=w)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
let source=null,downloadURL=null,generation=0,loading=false,rendering=false,queued=false,timer,job=0,worker,ready=false;
let pan={x:0,y:0};const pending=new Map(),points=new Map();
function status(s){$('status').textContent=s;}
function error(e){$('error').textContent=e.message||String(e);$('error').hidden=false;}
function discardExport(){if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=null;$('download').hidden=true;$('download').removeAttribute('href');}
function reset(){generation++;clearTimeout(timer);source&&(source.width=source.height=1);source=null;discardExport();$('result').hidden=true;$('settings').disabled=true;$('source').textContent='';$('remove').hidden=true;$('error').hidden=true;$('file').value='';$('preview').getContext('2d').clearRect(0,0,640,640);$('circle').getContext('2d').clearRect(0,0,320,320);pan={x:0,y:0};$('zoom').value=1;points.clear();}
function rpc(type,values,transfer=[]){return new Promise((resolve,reject)=>{const id=++job;const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('Processing took too long. Try a smaller image.'));},60000);pending.set(id,{resolve,reject,timeout});worker.postMessage({id,type,...values},transfer);});}
try{
  worker=new Worker('/assets/dp-worker.js',{type:'module'});
  worker.onmessage=({data})=>{if(data.ready){ready=true;$('file').disabled=false;status('Ready. Processing works offline while this page stays open.');return;}const task=pending.get(data.id);if(!task)return;pending.delete(data.id);clearTimeout(task.timeout);data.error?task.reject(new Error(data.error)):task.resolve(data);};
  worker.onerror=()=>{for(const p of pending.values()){clearTimeout(p.timeout);p.reject(new Error('The image worker stopped. Reload the page or try a smaller photo.'));}pending.clear();worker.terminate();worker=null;ready=true;$('file').disabled=false;status('Basic photo mode ready. HEIC decoding needs a browser with module workers.');};
}catch{ready=true;$('file').disabled=false;status('Basic photo mode ready. HEIC decoding is unavailable in this browser.');}
async function decode(file,kind){
  if(kind==='heic'){
    if(!worker)throw new Error('HEIC decoding requires a current browser with Web Workers. Try a JPG or update your browser.');
    const buffer=await file.arrayBuffer(),r=await rpc('heic',{buffer},[buffer]);const c=canvas(r.image.width,r.image.height);c.getContext('2d').putImageData(r.image,0,0);return {image:c,width:r.width,height:r.height};
  }
  // Browser decoders read EXIF orientation (including mirrored orientations) and
  // ICC/CMYK profiles before resampling. Bitmap decoding selects GIF frame zero.
  if(typeof createImageBitmap==='function'){
    const meta=rasterMetadata(new Uint8Array(await file.arrayBuffer()),kind);if(meta.width*meta.height>60000000||Math.max(meta.width,meta.height)>30000)throw new Error('Choose a photo below 60 megapixels and 30,000 pixels per side.');
    const ratio=meta.width&&meta.height?Math.min(1,2048/Math.max(meta.width,meta.height)):1;const resize=ratio<1?{resizeWidth:Math.max(1,Math.round(meta.width*ratio)),resizeHeight:Math.max(1,Math.round(meta.height*ratio)),resizeQuality:'high'}:{};
    let bitmap;try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image',colorSpaceConversion:'default',...resize});}catch{throw new Error('This image is corrupt or cannot be decoded. Export it as an RGB JPG or PNG and try again.');}
    return {image:bitmap,width:meta.width||bitmap.width,height:meta.height||bitmap.height};
  }
  if(kind==='gif')throw new Error('First-frame GIF decoding needs a newer browser. Export the first frame as PNG.');
  const url=URL.createObjectURL(file);try{const image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('This photo cannot be decoded. Export it as an RGB JPG or PNG.'));im.src=url;});return {image,width:image.naturalWidth,height:image.naturalHeight};}finally{URL.revokeObjectURL(url);}
}
async function select(file){
  if(!file||!ready)return;reset();loading=true;const token=generation;$('file').disabled=true;status('Reading and orienting your image on this device…');let decoded;
  try{
    if(file.size>25*1024*1024)throw new Error('This file exceeds 25 MB. Choose a smaller photo.');
    const kind=imageKind(new Uint8Array(await file.slice(0,64).arrayBuffer()));decoded=await decode(file,kind);
    if(token!==generation)return;
    const {width,height,image}=decoded;if(width*height>60000000||Math.max(width,height)>30000)throw new Error('Choose a photo below 60 megapixels and 30,000 pixels per side.');
    const ratio=Math.min(1,2048/Math.max(width,height));source=canvas(Math.max(1,Math.round(width*ratio)),Math.max(1,Math.round(height*ratio)));
    const ctx=source.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.fillStyle='white';ctx.fillRect(0,0,source.width,source.height);ctx.drawImage(image,0,0,source.width,source.height);
    $('source').textContent=`${width} × ${height} px${Math.min(width,height)<640?' · Low-resolution original: upscaling may look soft.':''}${kind==='gif'?' · First GIF frame only.':''}`;
    $('settings').disabled=false;$('remove').hidden=false;$('result').hidden=false;status('Photo ready. Adjust framing or enhancement.');schedule();
  }catch(e){if(token===generation){error(e);status('Choose another image to try again.');}}
  finally{decoded?.image?.close?.();if(decoded?.image instanceof HTMLCanvasElement)decoded.image.width=decoded.image.height=1;loading=false;$('file').disabled=false;}
}
function frame(){
  const c=canvas(640),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.fillStyle=$('color').value;ctx.fillRect(0,0,640,640);
  if($('mode').value==='fit'&&$('fill').value==='blur'){
    // A tiny resampled background is a Safari-compatible blur without ctx.filter.
    const tiny=canvas(24),tc=tiny.getContext('2d'),r=placement(source.width,source.height,'crop',1,0,0,24);tc.drawImage(source,r.x,r.y,r.width,r.height);ctx.drawImage(tiny,0,0,640,640);tiny.width=tiny.height=1;
  }
  const r=placement(source.width,source.height,$('mode').value,+$('zoom').value,pan.x,pan.y);ctx.drawImage(source,r.x,r.y,r.width,r.height);return c;
}
function showPreview(c){const ctx=$('preview').getContext('2d');ctx.clearRect(0,0,640,640);ctx.drawImage(c,0,0);const circle=$('circle').getContext('2d');circle.clearRect(0,0,320,320);circle.save();circle.beginPath();circle.arc(160,160,160,0,Math.PI*2);circle.clip();circle.drawImage(c,0,0,320,320);circle.restore();}
function controls(){const crop=$('mode').value==='crop';$('crop').hidden=!crop;$('background').hidden=crop;$('preview').style.touchAction=crop?'none':'pan-y';$('color').disabled=$('fill').value!=='solid';$('zoom-value').textContent=(+$('zoom').value).toFixed(2)+'×';$('intensity-value').textContent=$('intensity').value+'%';}
function schedule(){if(!source)return;controls();generation++;discardExport();$('error').hidden=true;$('details').textContent='Updating preview…';clearTimeout(timer);timer=setTimeout(render,100);}
async function render(){
  if(!source)return;if(rendering){queued=true;return;}rendering=true;const token=generation;let original,output;
  try{
    if(!$('target').checkValidity())throw new Error('Enter a target from 10 to 2,000 KB.');
    original=frame();showPreview(original);output=canvas(640);output.getContext('2d').drawImage(original,0,0);
    const intensity=$('enhance').value==='on'?+$('intensity').value:0;
    if(intensity){const ctx=output.getContext('2d'),pixels=ctx.getImageData(0,0,640,640);const enhanced=worker?(await rpc('enhance',{image:pixels,intensity,denoise:$('denoise').value==='on'},[pixels.data.buffer])).image:await enhancePixels(pixels,intensity,$('denoise').value==='on',()=>new Promise(r=>setTimeout(r,0)));if(token!==generation)return;ctx.putImageData(enhanced,0,0);}
    const format=$('format').value,target=+$('target').value*1000;
    // Reuse the site's size search, but never reduce below a mild quality floor.
    const safeEncoder=(c,f,q)=>encode(c,f,Math.max(.72,q));
    let blob=await encodeUnderLimit(output,format,target,.93,safeEncoder),note='';
    if(!blob){blob=await encode(output,format,format==='image/jpeg'?.72:1);note=format==='image/png'?'PNG is lossless and exceeds this target. Choose JPEG or increase the target.':'This target is too small without stronger quality loss. The best reasonable-quality result is shown; increase the target if needed.';}
    if(token!==generation)return;
    if($('compare').value==='before')showPreview(original);else if(typeof createImageBitmap==='function'){const finalPreview=await createImageBitmap(blob);if(token!==generation){finalPreview.close();return;}const ctx=output.getContext('2d');ctx.clearRect(0,0,640,640);ctx.drawImage(finalPreview,0,0);finalPreview.close();showPreview(output);}else showPreview(output);discardExport();downloadURL=URL.createObjectURL(blob);$('download').href=downloadURL;$('download').download='whatsapp-dp.'+(format==='image/png'?'png':'jpg');$('download').hidden=false;$('details').textContent=`640 × 640 px · ${(blob.size/1000).toFixed(1)} KB (${blob.size.toLocaleString()} bytes) · ${format==='image/png'?'PNG':'JPEG'}`;$('note').textContent=note;status('Ready to download. The exported image is square.');
  }catch(e){if(token===generation){error(e);$('details').textContent='';}}
  finally{if(original)original.width=original.height=1;if(output)output.width=output.height=1;rendering=false;if(queued){queued=false;render();}}
}
$('file').addEventListener('change',e=>select(e.target.files[0]));
for(const event of ['dragover','drop'])$('tool').addEventListener(event,e=>{e.preventDefault();if(event==='drop'&&!loading)select(e.dataTransfer.files[0]);});
document.addEventListener('paste',e=>{const f=[...(e.clipboardData?.items||[])].find(x=>x.kind==='file');if(f&&!loading){e.preventDefault();select(f.getAsFile());}});
$('settings').addEventListener('input',schedule);$('remove').addEventListener('click',()=>{reset();status('Ready for another photo.');});$('center').addEventListener('click',()=>{pan={x:0,y:0};$('zoom').value=1;schedule();});
const preview=$('preview');let gesture;
function touchState(){const a=[...points.values()];return {x:a.reduce((s,p)=>s+p.x,0)/a.length,y:a.reduce((s,p)=>s+p.y,0)/a.length,d:a.length>1?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0};}
preview.addEventListener('pointerdown',e=>{if($('mode').value!=='crop'||!source)return;preview.setPointerCapture(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=touchState();});
preview.addEventListener('pointermove',e=>{if(!points.has(e.pointerId)||!source)return;e.preventDefault();points.set(e.pointerId,{x:e.clientX,y:e.clientY});const next=touchState(),rect=preview.getBoundingClientRect();if(gesture.d&&next.d)$('zoom').value=clamp(+$('zoom').value*next.d/gesture.d,1,5);const r=placement(source.width,source.height,'crop',+$('zoom').value);if(r.width>640)pan.x=clamp(pan.x+(next.x-gesture.x)*640/rect.width/((r.width-640)/2),-1,1);if(r.height>640)pan.y=clamp(pan.y+(next.y-gesture.y)*640/rect.height/((r.height-640)/2),-1,1);gesture=next;const c=frame();showPreview(c);c.width=c.height=1;schedule();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])preview.addEventListener(name,e=>{points.delete(e.pointerId);gesture=points.size?touchState():null;});
preview.addEventListener('keydown',e=>{if($('mode').value!=='crop'||!source)return;const moves={ArrowLeft:[-.05,0],ArrowRight:[.05,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]};if(moves[e.key]){e.preventDefault();pan.x=clamp(pan.x+moves[e.key][0],-1,1);pan.y=clamp(pan.y+moves[e.key][1],-1,1);schedule();}else if(['+','=','-'].includes(e.key)){e.preventDefault();$('zoom').value=clamp(+$('zoom').value+(e.key==='-'?-.1:.1),1,5);schedule();}});
window.addEventListener('pagehide',e=>{reset();if(!e.persisted)worker?.terminate();});
controls();
