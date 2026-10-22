(() => {
  const get=k=>{try{return localStorage.getItem(k);}catch{return null;}},set=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
  const toggle=document.getElementById('theme-toggle');
  function theme(dark){document.documentElement.classList.toggle('dark',dark);toggle?.setAttribute('aria-pressed',String(dark));}
  theme(get('hc-theme')==='dark');
  toggle?.addEventListener('click',()=>{const dark=!document.documentElement.classList.contains('dark');theme(dark);set('hc-theme',dark?'dark':'light');});
  const box=document.getElementById('cookie-choice');let loaded=false;
  function analytics(allow){window['ga-disable-G-SQHRL04M0S']=!allow;if(allow&&!loaded){loaded=true;window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config','G-SQHRL04M0S');const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=G-SQHRL04M0S';document.head.appendChild(s);}if(!allow){for(const c of document.cookie.split(';')){const name=c.split('=')[0].trim();if(name.startsWith('_ga'))for(const domain of ['',`;domain=${location.hostname}`,`;domain=.hypercompressor.online`])document.cookie=`${name}=;Max-Age=0;path=/${domain};SameSite=Lax`;}}}
  analytics(get('hc-analytics')==='yes');if(!get('hc-analytics'))box.hidden=false;
  for(const [id,value]of [['analytics-accept','yes'],['analytics-decline','no']])document.getElementById(id)?.addEventListener('click',()=>{set('hc-analytics',value);box.hidden=true;analytics(value==='yes');});
  document.getElementById('analytics-settings')?.addEventListener('click',()=>{box.hidden=false;document.getElementById('analytics-decline').focus();});
})();
