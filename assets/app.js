import {loadImage,processImage} from './engine.js';
const $=id=>document.getElementById(id), es=document.documentElement.lang==='es';
const say=(en,sp)=>es?sp:en;
const config=JSON.parse($('tool-config').textContent);
let file=null,image=null,resultUrl=null,inputUrl=null,revision=0,busy=false;
const bytes=n=>`${(n/1000).toFixed(2)} KB`;
const clearResult=()=>{if(resultUrl) URL.revokeObjectURL(resultUrl); resultUrl=null;$('result').hidden=true;$('download').removeAttribute('href');};
function invalidate(){revision++;clearResult();$('status').textContent=file?say('Settings changed. Create a new image.','Ajustes cambiados. Crea una nueva imagen.'):'';}
function error(message){$('error').textContent=message;$('error').hidden=false;}
function track(name){if(typeof window.gtag==='function') window.gtag(name==='page'?'config':'event',name==='page'?'G-SQHRL04M0S':name,{tool:config.slug||'home'});}
async function selectFile(selected){
  if(!selected || busy)return;
  const token=++revision;clearResult();$('error').hidden=true;file=null;image=null;$('process').disabled=true;
  if(inputUrl) URL.revokeObjectURL(inputUrl);inputUrl=null;$('selected').hidden=true;
  $('status').textContent=say('Reading image…','Leyendo imagen…');
  try{const decoded=await loadImage(selected);if(token!==revision)return;file=selected;image=decoded;inputUrl=URL.createObjectURL(file);$('original-preview').src=inputUrl;$('filename').textContent=file.name;$('original-details').textContent=`${bytes(file.size)} · ${image.naturalWidth} × ${image.naturalHeight} px`;$('selected').hidden=false;$('process').disabled=false;$('status').textContent=say('Image ready. Check your settings below.','Imagen lista. Revisa los ajustes.');track('image_selected');}
  catch(e){if(token===revision){error(es?'No se pudo abrir la imagen. Usa JPG, PNG o WebP (máximo 20 MB, 24 megapíxeles y 8.000 px por lado).':e.message);$('status').textContent='';}}
}
$('file-input').addEventListener('change',e=>selectFile(e.target.files[0]));
const drop=$('drop-zone');
for(const event of ['dragenter','dragover'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add('dragging');});
for(const event of ['dragleave','drop'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.remove('dragging');});
drop.addEventListener('drop',e=>selectFile(e.dataTransfer.files[0]));
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>e.preventDefault());
$('quality').addEventListener('input',()=>{$('quality-value').textContent=$('quality').value+'%';});
$('settings').addEventListener('input',invalidate);
$('format').addEventListener('change',()=>{$('quality').disabled=$('format').value==='image/png';$('quality-note').textContent=$('format').value==='image/png'?say('PNG is lossless; quality does not change its size.','PNG es sin pérdida; la calidad no cambia su tamaño.'):say('Lower quality makes smaller files.','Una calidad menor produce archivos más pequeños.');});
function applyPreset(p){$('target').value=p.kb||'';$('width').value=p.w||'';$('height').value=p.h||'';$('minimum').value=p.min||'';invalidate();}
if(config.presets){$('preset').addEventListener('change',()=>applyPreset(config.presets[+$('preset').value]));applyPreset(config.presets[0]);}
for(const button of document.querySelectorAll('[data-kb]'))button.addEventListener('click',()=>{$('target').value=button.dataset.kb;invalidate();$('target').focus();});
$('tool-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!file || !image || busy)return;
  $('error').hidden=true;clearResult();const token=++revision;
  const options={format:$('format').value,kb:Number($('target').value)||0,width:Number($('width').value)||0,height:Number($('height').value)||0,fit:$('fit').value,quality:Number($('quality').value)/100};
  const minimum=Number($('minimum').value)||0;
  if(minimum && options.kb && minimum>options.kb){error(say('Minimum size must not exceed maximum size.','El mínimo no puede superar el máximo.'));return;}
  busy=true;$('settings').disabled=true;$('file-input').disabled=true;$('process').disabled=true;$('process').textContent=say('Working…','Procesando…');$('status').textContent=say('Processing on your device…','Procesando en tu dispositivo…');
  await new Promise(resolve=>setTimeout(resolve,30));
  try{
    const result=await processImage(image,file,options);if(token!==revision)return;
    resultUrl=URL.createObjectURL(result.blob);$('output-preview').src=resultUrl;$('download').href=resultUrl;
    const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[result.blob.type];
    $('download').download=(file.name.replace(/\.[^.]+$/,'')||'image')+'-hypercompressor.'+ext;
    $('result-size').textContent=bytes(result.blob.size);$('result-pixels').textContent=`${result.width} × ${result.height} px`;$('result-format').textContent=ext.toUpperCase();
    const savings=Math.min(99.9,Math.round((1-result.blob.size/file.size)*1000)/10);
    $('result-note').textContent=result.unchanged?say('Already efficient — your original file is the smaller option.','Tu archivo original ya es la opción más pequeña.') : savings>0?say(`${savings}% smaller than your original.`,`${savings}% menos que el original.`):say('This conversion is not smaller than the original. Try JPG, a lower quality or smaller dimensions.', 'Esta conversión no es más pequeña. Prueba JPG, una calidad menor o dimensiones más pequeñas.');
    $('minimum-warning').hidden=!minimum || result.blob.size>=minimum*1000;
    $('minimum-warning').textContent=say('The result is below your minimum size. Increase quality or dimensions and check your portal requirements before submitting.','El resultado es menor que el mínimo. Aumenta la calidad o las dimensiones y revisa los requisitos.');
    $('result').hidden=false;$('status').textContent=say('Done. Preview your image before downloading.','Listo. Revisa la imagen antes de descargar.');$('result').focus();track('image_processed');
  }catch(e){error(es?'No se pudo alcanzar el tamaño solicitado. Aumenta el límite en KB, cambia a JPG/WebP o borra las dimensiones para permitir una reducción.':e.message);$('status').textContent='';}
  finally{busy=false;$('settings').disabled=false;$('quality').disabled=$('format').value==='image/png';$('file-input').disabled=false;$('process').disabled=!file;$('process').textContent=say('Create my image','Crear mi imagen');}
});
$('download').addEventListener('click',()=>track('image_download'));
$('reset').addEventListener('click',()=>{revision++;clearResult();if(inputUrl)URL.revokeObjectURL(inputUrl);file=null;image=null;inputUrl=null;$('file-input').value='';$('selected').hidden=true;$('process').disabled=true;$('error').hidden=true;$('status').textContent='';$('file-input').focus();});
const search=$('tool-search');if(search)search.addEventListener('input',()=>{let count=0;for(const card of document.querySelectorAll('.tool-card')){card.hidden=!card.textContent.toLowerCase().includes(search.value.toLowerCase());if(!card.hidden)count++;}$('no-tools').hidden=count>0;});
