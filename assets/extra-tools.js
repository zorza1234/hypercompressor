import {loadImage,drawImage,encode,processImage} from './engine.js';
import {encodedFormat,checkRequirements,cropRectangle,inkBounds,stampCanvas} from './preparation.js';
const $=id=>document.getElementById(id),config=JSON.parse($('extra-config').textContent);let file,image,actualType,originalURL,outputURL,busy=false,version=0;
function invalidate(){version++;$('extra-result').hidden=true;if(outputURL)URL.revokeObjectURL(outputURL);outputURL=null;$('extra-download').removeAttribute('href');$('extra-error').hidden=true;}
function fail(e){$('extra-error').textContent=e.message;$('extra-error').hidden=false;}
async function select(selected){if(!selected||busy)return;invalidate();const token=version;file=null;image=null;$('extra-submit').disabled=true;$('extra-preview').hidden=true;$('extra-original').textContent='Reading image…';if($('auto-crop'))$('auto-crop').disabled=true;if(originalURL)URL.revokeObjectURL(originalURL);try{const detected=encodedFormat(new Uint8Array(await selected.slice(0,12).arrayBuffer()));const decoded=await loadImage(selected);if(token!==version)return;image=decoded;file=selected;actualType=detected;originalURL=URL.createObjectURL(file);$('extra-preview').src=originalURL;$('extra-preview').hidden=false;$('extra-original').textContent=`${file.name} · ${file.size.toLocaleString()} bytes · ${(file.size/1000).toFixed(2)} KB · ${image.naturalWidth} × ${image.naturalHeight} px · ${actualType}`;$('extra-submit').disabled=false;if($('auto-crop'))$('auto-crop').disabled=false;}catch(e){if(token===version){$('extra-original').textContent='';fail(e);}}}
$('extra-file').addEventListener('change',e=>select(e.target.files[0]));
for(const ev of ['dragover','drop'])$('extra-tool').addEventListener(ev,e=>{e.preventDefault();if(ev==='drop'){// Remove native required-file validation for a successfully dropped file.
$('extra-file').required=false;select(e.dataTransfer.files[0]);}});
$('extra-settings').addEventListener('input',invalidate);
$('auto-crop')?.addEventListener('click',()=>{if(!image||busy)return;invalidate();try{const scale=Math.min(1,1200/Math.max(image.naturalWidth,image.naturalHeight));const c=drawImage(image,Math.round(image.naturalWidth*scale),Math.round(image.naturalHeight*scale),'fit',true);const crop=inkBounds(c.getContext('2d').getImageData(0,0,c.width,c.height).data,c.width,c.height);for(const key of Object.keys(crop))$('crop-'+key).value=crop[key].toFixed(1);$('extra-status').textContent='Crop suggested. Create a preview and check that every pen stroke remains visible.';}catch(e){fail(e);}});
$('extra-form').addEventListener('submit',async e=>{e.preventDefault();if(!file||!image||busy)return;invalidate();const token=version;busy=true;$('extra-submit').disabled=true;$('extra-file').disabled=true;$('extra-settings').disabled=true;$('extra-status').textContent='Working on your device…';try{
  const report=$('extra-report');report.replaceChildren();
  if(config.mode==='checker'){
    const r={min:+$('check-min').value,max:+$('check-max').value,unit:+$('check-unit').value,width:+$('check-width').value,height:+$('check-height').value,format:$('check-format').value};
    const checks=checkRequirements({size:file.size,type:actualType},image.naturalWidth,image.naturalHeight,r);
    const title=document.createElement('p');title.className='check-summary';title.textContent=checks.length?(checks.every(x=>x.pass)?'Pass: all entered technical requirements match.':'Some entered requirements do not match.'):'No requirements entered. Your original measurements are shown above.';report.append(title);
    const list=document.createElement('ul');list.className='check-list';for(const c of checks){const li=document.createElement('li');li.textContent=`${c.pass?'PASS':'FAIL'} — ${c.label}: ${c.detail}`;li.className=c.pass?'check-pass':'check-fail';list.append(li);}report.append(list);
    const note=document.createElement('p');note.textContent='This does not check identity, face position, background or acceptance by a portal.';report.append(note);
  }else{
    let canvas;
    if(config.mode==='cropper'){const crop=Object.fromEntries(['top','right','bottom','left'].map(x=>[x,+$('crop-'+x).value]));const r=cropRectangle(image.naturalWidth,image.naturalHeight,crop);canvas=document.createElement('canvas');canvas.width=r.width;canvas.height=r.height;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,r.width,r.height);ctx.drawImage(image,r.x,r.y,r.width,r.height,0,0,r.width,r.height);}
    else{let date=$('stamp-date').value;if(date&&$('date-style').value==='dmy')date=date.split('-').reverse().join('-');canvas=stampCanvas(image,$('stamp-name').value,date);}
    const intermediate=new File([await encode(canvas,'image/png',1)],'prepared.png',{type:'image/png'});
    // Decode the known local canvas output without the input-file byte cap.
    const temporary=URL.createObjectURL(intermediate);const prepared=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Could not prepare output'));im.src=temporary;}).finally(()=>URL.revokeObjectURL(temporary));
    const result=await processImage(prepared,intermediate,{format:'image/jpeg',quality:.92,width:0,height:0,fit:'fit',kb:+$('extra-max').value||0});
    if(token!==version)return;outputURL=URL.createObjectURL(result.blob);$('extra-output').src=outputURL;$('extra-output').hidden=false;$('extra-download').href=outputURL;$('extra-download').download=file.name.replace(/\.[^.]+$/,'')+'-'+config.mode+'.jpg';$('extra-download').hidden=false;const details=document.createElement('p');details.textContent=`${result.blob.size.toLocaleString()} bytes · ${(result.blob.size/1000).toFixed(2)} KB · ${result.width} × ${result.height} px · JPG. Check the preview before saving.`;report.append(details);
  }
  $('extra-result').hidden=false;$('extra-result').focus();$('extra-status').textContent='Done.';if(typeof window.gtag==='function')window.gtag('event','preparation_completed',{tool:config.slug});
}catch(e){fail(e);$('extra-status').textContent='';}finally{busy=false;$('extra-submit').disabled=!file;$('extra-file').disabled=false;$('extra-settings').disabled=false;}});
