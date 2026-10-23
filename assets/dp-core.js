export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function placement(w,h,mode,zoom=1,x=0,y=0,size=640){
  const scale=(mode==='crop'?Math.max(size/w,size/h):Math.min(size/w,size/h))*(mode==='crop'?zoom:1);
  const width=w*scale,height=h*scale;
  return {width,height,x:(size-width)/2+(mode==='crop'?clamp(x,-1,1)*Math.max(0,(width-size)/2):0),y:(size-height)/2+(mode==='crop'?clamp(y,-1,1)*Math.max(0,(height-size)/2):0)};
}
// Luminance percentiles constrain the stretch; highlight headroom caps the mild lift.
export async function enhancePixels(image,intensity,denoise,yieldWork=()=>Promise.resolve()){
  const {data,width,height}=image,t=clamp(intensity/100,0,1);if(!t)return image;
  const hist=new Uint32Array(256),src=new Uint8ClampedArray(data);let sum=0;
  for(let i=0;i<src.length;i+=4){const l=Math.round(.2126*src[i]+.7152*src[i+1]+.0722*src[i+2]);hist[l]++;sum+=l;}
  const n=width*height;let low=0,high=255,total=0;
  for(let i=0;i<256;i++){total+=hist[i];if(total>=n*.01){low=i;break;}}
  total=0;for(let i=255;i>=0;i--){total+=hist[i];if(total>=n*.01){high=i;break;}}
  const span=high-low,gain=span>20?255/span:1;
  const lift=Math.min(8,Math.max(0,(118-sum/n)*.08));
  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){const i=(y*width+x)*4;
      for(let c=0;c<3;c++){const v=src[i+c];let avg=0,count=0;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){avg+=src[(clamp(y+dy,0,height-1)*width+clamp(x+dx,0,width-1))*4+c];count++;}
        avg/=count;const smooth=denoise&&Math.abs(v-avg)<24?v+(avg-v)*.25:v;
        const level=span>20?clamp((smooth-low)*gain,0,255):smooth,adjusted=smooth+clamp(level-smooth,-20,20)*.35+lift*(1-smooth/255);
        const sharp=Math.abs(v-avg)>2?clamp((v-avg)*.18,-8,8):0;
        data[i+c]=v+(clamp(adjusted+sharp,0,255)-v)*t;
      }
    }
    if(y%32===0)await yieldWork();
  }
  return image;
}
export function imageKind(bytes){
  const s=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpeg';
  if([137,80,78,71,13,10,26,10].every((v,i)=>v===bytes[i]))return 'png';
  if(s(0,6)==='GIF87a'||s(0,6)==='GIF89a')return 'gif';
  if(s(0,4)==='RIFF'&&s(8,12)==='WEBP')return 'webp';
  if(s(4,8)==='ftyp'&&/heic|heix|hevc|hevx|mif1|msf1/.test(s(8,64)))return 'heic';
  throw new Error('Choose a valid JPG, PNG, WebP, HEIC/HEIF or GIF image.');
}
// Inspect raster headers before allocating a decoded image. Rotation itself is
// delegated once to the browser's EXIF-aware decoder (never applied twice).
export function rasterMetadata(bytes,kind){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width=0,height=0,orientation=1;
  try{
    if(kind==='png'){
      width=v.getUint32(16);height=v.getUint32(20);let pos=8;
      while(pos+12<=bytes.length){const size=v.getUint32(pos),end=pos+12+size;if(end>bytes.length)break;
        if(String.fromCharCode(...bytes.slice(pos+4,pos+8))==='eXIf'){
          const t=pos+8,little=v.getUint16(t)===0x4949,dir=t+v.getUint32(t+4,little);
          if(v.getUint16(t+2,little)===42&&dir>=t&&dir+2<end-4){const count=v.getUint16(dir,little);for(let i=0;i<count;i++){const at=dir+2+i*12;if(at+12>end-4)break;if(v.getUint16(at,little)===274&&v.getUint16(at+2,little)===3&&v.getUint32(at+4,little)===1){const value=v.getUint16(at+8,little);if(value>=1&&value<=8)orientation=value;}}}
        }pos=end;
      }
    }
    if(kind==='gif'){width=v.getUint16(6,true);height=v.getUint16(8,true);}
    if(kind==='jpeg'){
      let pos=2;
      while(pos+4<=bytes.length){if(bytes[pos]!==255)break;const marker=bytes[pos+1];if(marker===218||marker===217)break;if(marker===255){pos++;continue;}const size=v.getUint16(pos+2),end=pos+2+size;if(size<2||end>bytes.length)break;
        if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&size>=8){height=v.getUint16(pos+5);width=v.getUint16(pos+7);}
        if(marker===225&&size>16&&String.fromCharCode(...bytes.slice(pos+4,pos+10))==='Exif\0\0'){
          const t=pos+10,little=v.getUint16(t)===0x4949;if(v.getUint16(t+2,little)===42){const dir=t+v.getUint32(t+4,little);if(dir>=t&&dir+2<end){const count=v.getUint16(dir,little);for(let i=0;i<count;i++){const at=dir+2+i*12;if(at+12>end)break;if(v.getUint16(at,little)===274&&v.getUint16(at+2,little)===3&&v.getUint32(at+4,little)===1){const value=v.getUint16(at+8,little);if(value>=1&&value<=8)orientation=value;}}}}
        }pos=end;
      }
    }
  }catch{/* Invalid metadata is left to the actual image decoder to reject. */}
  return orientation>=5?{width:height,height:width,orientation}:{width,height,orientation};
}
