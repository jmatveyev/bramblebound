'use strict';
// Fail visibly, including before game initialization. Never require pointer lock or network access.
const Support=(()=>{let failed=false,notes=[];function fail(e){if(failed)return;failed=true;notes.push(String(e?.stack||e));document.getElementById('boot').style.display='none';document.querySelectorAll('.screen').forEach(n=>n.classList.remove('on'));document.getElementById('failure').classList.add('on');document.getElementById('errorText').textContent=String(e?.message||e);}
window.addEventListener('error',e=>fail(e.error||e.message));window.addEventListener('unhandledrejection',e=>fail(e.reason));return{fail,note:m=>notes.push(String(m)),isFailed:()=>failed,report:()=>({game:'Bramblebound 1.1 - touch edition',time:new Date().toISOString(),browser:navigator.userAgent,size:[innerWidth,innerHeight],urlType:location.protocol,errors:notes})};})();
function downloadText(name,text,type='application/json'){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
document.getElementById('diagnosticsBtn').onclick=()=>downloadText('bramblebound-diagnostics.json',JSON.stringify(Support.report(),null,2));document.getElementById('safeBtn').onclick=()=>{location.hash='safe';location.reload();};
function loadJSON(key,fallback){try{let v=JSON.parse(localStorage.getItem(key));return v&&typeof v==='object'?v:fallback;}catch{return fallback;}}
let storageOK=true;function saveJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value));storageOK=true;return true;}catch{storageOK=false;return false;}}
const handheldDevice=(navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches)&&Math.min(innerWidth,innerHeight)<=900;
const defaultSettings={lookSensitivity:1,quality:handheldDevice?'low':'medium',music:.35,sfx:.65,assist:false,shake:true,touch:'auto',volume:.5,flashes:true};
let settings={...defaultSettings,...loadJSON('bramblebound-settings',{})};settings.quality=['low','medium','high'].includes(settings.quality)?settings.quality:'medium';for(const k of['music','sfx'])settings[k]=Math.max(0,Math.min(1,Number.isFinite(+settings[k])?+settings[k]:defaultSettings[k]));settings.touch=['auto','on','off'].includes(settings.touch)?settings.touch:'auto';
settings.lookSensitivity=Math.max(.4,Math.min(1.8,Number.isFinite(+settings.lookSensitivity)?+settings.lookSensitivity:1));
const safeGraphics=location.hash.includes('safe');if(safeGraphics)settings.quality='low';
const canvas=document.getElementById('world');let gl;
try{gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:true,stencil:false,powerPreference:'default'});if(!gl)throw new Error('WebGL 2 could not start. Check that graphics acceleration is available in this browser, or open the saved file in another browser.');}catch(e){Support.fail(e);}
function fatal(e){Support.fail(e);}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();try{window.Bramblebound?.saveCheckpoint?.();}catch(_){}Support.fail(new Error('The graphics device was reset. Reload with safe graphics to reduce graphics memory use.'));});
