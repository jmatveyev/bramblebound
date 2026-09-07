const $=id=>document.getElementById(id), TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
const V={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],scale:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(...a),norm:a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)}};
const M={identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),mul:(a,b)=>{let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o},perspective:(f,a,n,z)=>{let t=1/Math.tan(f/2),d=1/(n-z);return new Float32Array([t/a,0,0,0,0,t,0,0,0,0,(z+n)*d,-1,0,0,2*z*n*d,0])},ortho:(l,r,b,t,n,f)=>new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]),look:(eye,target,up=[0,1,0])=>{let z=V.norm(V.sub(eye,target)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1])},point:(m,p)=>{let w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return[(m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12])/w,(m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13])/w,(m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14])/w,w]}};
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const random=rng(42619);const hex=h=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
const Engine=(()=>{
if(!gl)return null;
try {
function program(v,f){let s=(type,code)=>{let t=gl.createShader(type);gl.shaderSource(t,code);gl.compileShader(t);if(!gl.getShaderParameter(t,gl.COMPILE_STATUS))throw Error('Graphics shader: '+gl.getShaderInfoLog(t));return t};let vs=s(gl.VERTEX_SHADER,v),fs=s(gl.FRAGMENT_SHADER,f),p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Graphics pipeline: '+gl.getProgramInfoLog(p));return p}
const meshVS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUV;
layout(location=3) in mat4 aModel;layout(location=7) in vec4 aColor;layout(location=8) in vec4 aParams;
uniform mat4 uVP,uLight;uniform float uTime;out vec3 vWorld,vNormal;out vec2 vUV;out vec4 vColor,vParams,vShadow;
void main(){vec4 w=aModel*vec4(aPos,1.);if(aParams.z>4.5&&aParams.z<6.5)w.xz+=vec2(sin(uTime*1.3+w.x*.5+w.z*.24),cos(uTime*.8+w.z*.4))*.045*(aPos.y+.5);vWorld=w.xyz;mat3 m=mat3(aModel);vec3 sc=vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2]));vNormal=normalize(m*(aNormal/max(sc,vec3(.00001))));vUV=aUV;vColor=aColor;vParams=aParams;vShadow=uLight*w;gl_Position=uVP*w;}`;
const meshFS=`#version 300 es
precision highp float;
in vec3 vWorld,vNormal;in vec2 vUV;in vec4 vColor,vParams,vShadow;
uniform vec3 uCam,uSun,uFlashPos,uFlashDir;uniform vec3 uLP[4],uLC[4];uniform sampler2D uShadow;uniform float uTime,uShadowTexel,uMood;uniform int uViewMode,uQuality;out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float shadow(vec3 n){if(uQuality==0)return 1.;vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(p.z>1.||p.z<0.||p.x<.001||p.x>.999||p.y<.001||p.y>.999)return 1.;float bias=max(.0006*(1.-dot(n,uSun)),.00025);float s=0.;for(int i=0;i<9;i++){vec2 o=vec2(float(i%3)-1.,float(i/3)-1.)*uShadowTexel*1.4;s+=p.z-bias<=texture(uShadow,p.xy+o).r?1.:0.;}return s/9.;}
void main(){vec3 n=normalize(vNormal),v=normalize(uCam-vWorld);float type=vParams.z;vec3 base=pow(vColor.rgb,vec3(2.2));float grain=noise(vWorld.xz*1.4)+noise(vWorld.xz*5.)*.24;
if(type>0.5&&type<1.5){base*=.90+grain*.15;float moss=noise(vWorld.xz*.5+vWorld.y);base=mix(base,base*vec3(.65,.91,.45),smoothstep(.72,.91,moss)*.4);}
if(type>1.5&&type<2.5){float line=sin(vWorld.x*1.2+vWorld.z*4.3+noise(vWorld.xz*2.)*2.5);base*=.85+line*.06+grain*.17;}
if(type>2.5&&type<3.5){base*=.93+grain*.11;vec2 tile=abs(fract(vWorld.xz*.44)-.5);base*=1.-.11*max(smoothstep(.48,.5,tile.x),smoothstep(.48,.5,tile.y));}
if(type>4.5&&type<6.5){base*=.84+grain*.13+noise(vWorld.xz*.3)*.15;}
if(type>6.5&&type<7.5){float w=sin(vWorld.x*1.7+uTime*1.6+sin(vWorld.z*1.3-uTime))*.5+sin(vWorld.z*2.5-uTime*1.4)*.3;n=normalize(n+vec3(w*.12,0.,cos(vWorld.x*2.+uTime)*.09));float foam=smoothstep(.77,.88,sin(vWorld.x*2.3+sin(vWorld.z*2.)+uTime*.7)*sin(vWorld.z*1.8-uTime*.6));base=mix(base,vec3(.35,.8,.74),foam*.38);}
float sun=max(dot(n,uSun),0.);float s=shadow(n);float band=smoothstep(-.22,.72,dot(n,uSun));vec3 hemi=mix(vec3(.26,.32,.43),vec3(.68,.8,.82),n.y*.5+.5);
hemi=mix(hemi,vec3(.19,.28,.40)+vec3(.07,.13,.15)*max(n.y,0.),uMood);vec3 key=mix(vec3(1.25,1.10,.80),vec3(.35,.63,.88),uMood);vec3 col=base*(hemi*.7+key*(s*.77+.23)*band*.83);
float rim=pow(1.-max(dot(n,v),0.),3.);col+=base*vec3(.5,.61,.49)*rim*.25;
vec3 h=normalize(v+uSun);float spec=pow(max(dot(n,h),0.),mix(65.,8.,vParams.x))*(1.-vParams.x)*.27;col+=vec3(1.,.94,.7)*spec*s;
for(int i=0;i<4;i++){vec3 delta=uLP[i]-vWorld;float d2=dot(delta,delta);col+=base*uLC[i]/(1.+d2*.3)*(.5+.5*max(dot(n,normalize(delta)),0.));}
col+=vColor.rgb*vColor.a;float dist=length(uCam-vWorld);float fog=(1.-exp(-max(0.,dist-30.)*.009));col=mix(col,mix(vec3(.42,.66,.68),vec3(.075,.16,.22),uMood),fog);outColor=vec4(col,1.);}`;
const depthVS=`#version 300 es
precision highp float;layout(location=0) in vec3 aPos;layout(location=3) in mat4 aModel;uniform mat4 uLight;void main(){gl_Position=uLight*aModel*vec4(aPos,1.);}`;
const depthFS=`#version 300 es
precision highp float;void main(){}`;
const fullVS=`#version 300 es
precision highp float;out vec2 vUV;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUV=p;gl_Position=vec4(p*2.-1.,0,1);}`;
const skyFS=`#version 300 es
precision highp float;in vec2 vUV;uniform vec3 uForward,uRight,uUp,uSun;uniform float uAspect,uTan,uTime,uMood;out vec4 outColor;
void main(){vec2 uv=vUV*2.-1.;vec3 d=normalize(uForward+uRight*uv.x*uAspect*uTan+uUp*uv.y*uTan);vec3 c=mix(vec3(.66,.83,.80),vec3(.20,.46,.59),clamp(d.y*.75+.3,0.,1.));float sun=pow(max(dot(d,uSun),0.),70.);c=mix(c,mix(vec3(.10,.20,.27),vec3(.025,.07,.14),clamp(d.y*.75+.3,0.,1.)),uMood);c+=mix(vec3(.8,.61,.28),vec3(.2,.32,.4),uMood)*sun;outColor=vec4(c,1.);}`;
const brightFS=`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uTex;uniform vec2 uPixel;out vec4 outColor;void main(){vec3 c=texture(uTex,vUV).rgb;float l=max(c.r,max(c.g,c.b));outColor=vec4(c*max(0.,l-.9)/(l+.001),1.);}`;
const blurFS=`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uTex;uniform vec2 uDir;out vec4 outColor;void main(){vec3 c=texture(uTex,vUV).rgb*.227027;c+=texture(uTex,vUV+uDir*1.384615).rgb*.316216;c+=texture(uTex,vUV-uDir*1.384615).rgb*.316216;c+=texture(uTex,vUV+uDir*3.230769).rgb*.070270;c+=texture(uTex,vUV-uDir*3.230769).rgb*.070270;outColor=vec4(c,1.);}`;
const postFS=`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uTex,uBloom;uniform float uBloomPower,uTime,uHurt,uScan;uniform vec2 uPixel;out vec4 outColor;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}void main(){vec3 c=texture(uTex,vUV).rgb;vec3 n=texture(uTex,vUV+vec2(0,uPixel.y)).rgb,s=texture(uTex,vUV-vec2(0,uPixel.y)).rgb,e=texture(uTex,vUV+vec2(uPixel.x,0)).rgb,w=texture(uTex,vUV-vec2(uPixel.x,0)).rgb;float l=dot(c,vec3(.299,.587,.114)),range=max(max(dot(n,vec3(.299,.587,.114)),dot(s,vec3(.299,.587,.114))),max(dot(e,vec3(.299,.587,.114)),dot(w,vec3(.299,.587,.114))))-l;if(range>.12)c=mix(c,(n+s+e+w)*.25,.22);c+=texture(uBloom,vUV).rgb*uBloomPower;c=aces(c*1.02);c=pow(c,vec3(1./2.2));c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,1.06);vec2 p=vUV*2.-1.;float vig=smoothstep(.28,1.55,dot(p,p));c*=1.-vig*.10;c+=vec3(.07,-.018,-.018)*uHurt*vig;c+=vec3(.01,.025,.025)*uScan*vig;float grain=fract(sin(dot(vUV*vec2(1920,1080)+fract(uTime),vec2(12.9898,78.233)))*43758.5453);c+=(grain-.5)*.002;outColor=vec4(c,1.);}`;
const particleVS=`#version 300 es
precision highp float;layout(location=0)in vec3 aPos;layout(location=1)in vec4 aColor;layout(location=2)in float aSize;uniform mat4 uVP;uniform float uHeight;out vec4 vColor;void main(){vec4 p=uVP*vec4(aPos,1.);gl_Position=p;gl_PointSize=clamp(aSize*uHeight/max(p.w,.1),1.,100.);vColor=aColor;}`;
const particleFS=`#version 300 es
precision highp float;in vec4 vColor;out vec4 outColor;void main(){vec2 p=gl_PointCoord*2.-1.;float a=1.-dot(p,p);if(a<0.)discard;outColor=vec4(vColor.rgb*1.9,a*a*vColor.a);}`;
let prog,depth,sky,bright,blur,post,part;try{prog=program(meshVS,meshFS);depth=program(depthVS,depthFS);sky=program(fullVS,skyFS);bright=program(fullVS,brightFS);blur=program(fullVS,blurFS);post=program(fullVS,postFS);part=program(particleVS,particleFS)}catch(e){fatal(e);return null}
const locations=new Map();function loc(p,n){let m=locations.get(p);if(!m){m={};locations.set(p,m)}if(!(n in m))m[n]=gl.getUniformLocation(p,n);return m[n]}
const uf=(p,n,v)=>gl.uniform1f(loc(p,n),v),ui=(p,n,v)=>gl.uniform1i(loc(p,n),v),uv=(p,n,v)=>gl.uniform3fv(loc(p,n),v),um=(p,n,v)=>gl.uniformMatrix4fv(loc(p,n),false,v),u2=(p,n,x,y)=>gl.uniform2f(loc(p,n),x,y);
let geom={};function addGeo(name,data){const vao=gl.createVertexArray(),buf=gl.createBuffer(),inst=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,i===2?2:3,gl.FLOAT,false,32,i===0?0:i===1?12:24)}gl.bindBuffer(gl.ARRAY_BUFFER,inst);gl.bufferData(gl.ARRAY_BUFFER,24*4*24000,gl.DYNAMIC_DRAW);for(let i=0;i<6;i++){let a=3+i;gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,4,gl.FLOAT,false,96,i*16);gl.vertexAttribDivisor(a,1)}geom[name]={vao,buf,inst,vertices:data.length/8,static:[],dyn:new Float32Array(24*10000),n:0,s:0,view:new Float32Array(24*300),vn:0};}
function tri(a,b,c,na,nb,nc,uv=[[0,0],[1,0],[1,1]],out){[a,b,c].forEach((p,i)=>out.push(...p,...[na,nb,nc][i],...uv[i]));}
let b=[];let faces=[[[1,0,0],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]],[[-1,0,0],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]],[[0,1,0],[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5]],[[0,-1,0],[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5]],[[0,0,1],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5],[-.5,-.5,.5]],[[0,0,-1],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5],[.5,-.5,-.5]]];for(let[n,a,c,d,e]of faces){tri(a,c,d,n,n,n,[[0,0],[0,1],[1,1]],b);tri(a,d,e,n,n,n,[[0,0],[1,1],[1,0]],b)}addGeo('box',b);
// Rounded edge geometry catches key lights on machined surfaces without texture assets.
let bv=[];const steps=[0,.06,.94,1];for(let face of faces){let [normal,a,c,d,e]=face;function rounded(u,v){let p=a.map((val,k)=>val+(e[k]-val)*u+(c[k]-val)*v),core=p.map(t=>clamp(t,-.44,.44)),n=V.norm(V.sub(p,core));return{p:V.add(core,V.scale(n,.06)),n};}for(let j=0;j<3;j++)for(let i=0;i<3;i++){let a=rounded(steps[i],steps[j]),c=rounded(steps[i],steps[j+1]),d=rounded(steps[i+1],steps[j+1]),e=rounded(steps[i+1],steps[j]);tri(a.p,c.p,d.p,a.n,c.n,d.n,undefined,bv);tri(a.p,d.p,e.p,a.n,d.n,e.n,undefined,bv);}}addGeo('bevel',bv);
let cy=[];for(let i=0;i<24;i++){let a=i/24*TAU,c=(i+1)/24*TAU,n1=[Math.cos(a),0,Math.sin(a)],n2=[Math.cos(c),0,Math.sin(c)],p1=[n1[0]*.5,-.5,n1[2]*.5],p2=[n1[0]*.5,.5,n1[2]*.5],p3=[n2[0]*.5,.5,n2[2]*.5],p4=[n2[0]*.5,-.5,n2[2]*.5];tri(p1,p2,p3,n1,n1,n2,undefined,cy);tri(p1,p3,p4,n1,n2,n2,undefined,cy);tri([0,.5,0],p3,p2,[0,1,0],[0,1,0],[0,1,0],undefined,cy);tri([0,-.5,0],p1,p4,[0,-1,0],[0,-1,0],[0,-1,0],undefined,cy)}addGeo('cyl',cy);
let sp=[];const sph=(a,b)=>[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];for(let y=0;y<12;y++)for(let x=0;x<20;x++){let a=sph(y/12*Math.PI,x/20*TAU),b=sph((y+1)/12*Math.PI,x/20*TAU),c=sph((y+1)/12*Math.PI,(x+1)/20*TAU),d=sph(y/12*Math.PI,(x+1)/20*TAU);tri(a.map(t=>t*.5),c.map(t=>t*.5),b.map(t=>t*.5),a,c,b,undefined,sp);tri(a.map(t=>t*.5),d.map(t=>t*.5),c.map(t=>t*.5),a,d,c,undefined,sp)}addGeo('sphere',sp);
let to=[];function tor(a,b){return{p:[(.5+Math.cos(b)*.055)*Math.cos(a),Math.sin(b)*.055,(.5+Math.cos(b)*.055)*Math.sin(a)],n:[Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a)]}}for(let i=0;i<48;i++)for(let j=0;j<8;j++){let a=tor(i/48*TAU,j/8*TAU),b=tor((i+1)/48*TAU,j/8*TAU),c=tor((i+1)/48*TAU,(j+1)/8*TAU),d=tor(i/48*TAU,(j+1)/8*TAU);tri(a.p,c.p,b.p,a.n,c.n,b.n,undefined,to);tri(a.p,d.p,c.p,a.n,d.n,c.n,undefined,to)}addGeo('torus',to);

let co=[];for(let i=0;i<20;i++){let a=i/20*TAU,b=(i+1)/20*TAU,p=[Math.cos(a)*.5,-.5,Math.sin(a)*.5],q=[Math.cos(b)*.5,-.5,Math.sin(b)*.5],t=[0,.5,0],n=V.norm([Math.cos((a+b)/2),.5,Math.sin((a+b)/2)]);tri(p,t,q,n,n,n,undefined,co);tri([0,-.5,0],p,q,[0,-1,0],[0,-1,0],[0,-1,0],undefined,co);}addGeo('cone',co);
let lf=[],ln=[0,0,1];tri([-.14,0,0],[.14,0,0],[0,1,.12],ln,ln,ln,undefined,lf);tri([.14,0,0],[-.14,0,0],[0,1,.12],ln.map(v=>-v),ln.map(v=>-v),ln.map(v=>-v),undefined,lf);addGeo('leaf',lf);
let ico=[];const lv=8,lh=12;function stone(y,x){let a=y/lv*Math.PI,b=x/lh*TAU,r=.5*(1+.08*Math.sin(x*8.4+y*3.5));return[Math.sin(a)*Math.cos(b)*r,Math.cos(a)*.5,Math.sin(a)*Math.sin(b)*r];}for(let y=0;y<lv;y++)for(let x=0;x<lh;x++){let a=stone(y,x),b=stone(y+1,x),c=stone(y+1,x+1),d=stone(y,x+1);for(let points of[[a,c,b],[a,d,c]]){let n=V.norm(V.cross(V.sub(points[1],points[0]),V.sub(points[2],points[0])));tri(...points,n,n,n,undefined,ico);}}addGeo('rock',ico);

const material=(c,rough=.65,metal=.15,type=0,emit=0)=>[...hex(c),emit,rough,metal,type,0];
function record(g,mat,x,y,z,sx,sy,sz,yaw=0,pitch=0,roll=0,target='dyn'){let out,at;if(target==='static'){out=g.static;at=out.length;for(let i=0;i<24;i++)out.push(0)}else if(target==='view'){out=g.view;at=g.vn++*24;if(at+24>out.length){g.vn--;return}}else{out=g.dyn;at=g.n++*24;if(at+24>out.length){g.n--;return}}let cy=Math.cos(yaw),syi=Math.sin(yaw),cx=Math.cos(pitch),sxi=Math.sin(pitch),cz=Math.cos(roll),szi=Math.sin(roll);out[at]=(cy*cz+syi*sxi*szi)*sx;out[at+1]=cx*szi*sx;out[at+2]=(-syi*cz+cy*sxi*szi)*sx;out[at+3]=0;out[at+4]=(-cy*szi+syi*sxi*cz)*sy;out[at+5]=cx*cz*sy;out[at+6]=(syi*szi+cy*sxi*cz)*sy;out[at+7]=0;out[at+8]=syi*cx*sz;out[at+9]=-sxi*sz;out[at+10]=cy*cx*sz;out[at+11]=0;out[at+12]=x;out[at+13]=y;out[at+14]=z;out[at+15]=1;for(let i=0;i<8;i++)out[at+16+i]=mat[i];return at;}
const draw=(name,mat,x,y,z,sx=1,sy=1,sz=1,yaw=0,pitch=0,roll=0,target='dyn')=>record(geom[name],mat,x,y,z,sx,sy,sz,yaw,pitch,roll,target);
function beam(a,b,width,mat,target='dyn'){let d=V.sub(b,a),len=V.len(d);if(len<.0001)return;let mid=V.scale(V.add(a,b),.5),dir=V.scale(d,1/len),right=V.norm(V.cross(Math.abs(dir[1])>.99?[1,0,0]:[0,1,0],dir)),forward=V.cross(right,dir),g=geom.cyl,at=record(g,mat,...mid,width,len,width,0,0,0,target);if(at===undefined)return;let ar=target==='static'?g.static:target==='view'?g.view:g.dyn;for(let j=0;j<3;j++){ar[at+j]=right[j]*width;ar[at+4+j]=dir[j]*len;ar[at+8+j]=forward[j]*width;}}
function finalize(){for(let g of Object.values(geom)){g.s=g.static.length/24;gl.bindBuffer(gl.ARRAY_BUFFER,g.inst);gl.bufferSubData(gl.ARRAY_BUFFER,0,new Float32Array(g.static));}}
function clear(){for(let g of Object.values(geom)){g.n=0;g.vn=0;}}
const fullVAO=gl.createVertexArray();
let hdr=!safeGraphics&&!!gl.getExtension('EXT_color_buffer_float');let W=0,H=0,bW=0,bH=0,targets=[],renderScale=1;const viewportLimits=gl.getParameter(gl.MAX_VIEWPORT_DIMS);const dimensionLimit=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),viewportLimits[0],viewportLimits[1]);
function disposeTarget(t){if(!t)return;gl.deleteFramebuffer(t.f);gl.deleteTexture(t.t);if(t.rb)gl.deleteRenderbuffer(t.rb);}
function target(w,h,dep){
  const t=gl.createTexture(),f=gl.createFramebuffer();let rb=null;
  try{
    if(!t||!f)throw Error('Graphics memory allocation failed.');
    gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,hdr?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,hdr?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
    if(dep){rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rb);}
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('The graphics driver could not create a '+(hdr?'HDR':'standard')+' render target ('+w+' x '+h+').');
    return{t,f,rb};
  }catch(e){disposeTarget({t,f,rb});throw e;}
}
let shadowSize=Math.min(safeGraphics?256:2048,dimensionLimit),shadowTex=gl.createTexture(),shadowF=gl.createFramebuffer();gl.bindTexture(gl.TEXTURE_2D,shadowTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,shadowSize,shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.bindFramebuffer(gl.FRAMEBUFFER,shadowF);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTex,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);const shadowSupported=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;if(!shadowSupported)Support.note('Shadow framebuffer unavailable; shadow pass disabled.');
function resize(){
  const budget=safeGraphics?650000:handheldDevice?(settings.quality==='high'?1400000:settings.quality==='low'?720000:1000000):settings.quality==='high'?8400000:settings.quality==='low'?850000:1700000;
  const d=Math.min(window.devicePixelRatio||1,handheldDevice?1.5:settings.quality==='high'?2:1.25);
  const rw=Math.max(1,Math.floor((canvas.clientWidth||innerWidth)*d)),rh=Math.max(1,Math.floor((canvas.clientHeight||innerHeight)*d));
  const fit=Math.min(1,Math.sqrt(budget/(rw*rh)),dimensionLimit/rw,dimensionLimit/rh)*renderScale;
  const desiredW=Math.max(1,Math.floor(rw*fit)),desiredH=Math.max(1,Math.floor(rh*fit));
  if(desiredW===W&&desiredH===H)return;
  for(const old of targets)disposeTarget(old);targets=[];
  const attempts=[{float:hdr,scale:1},{float:false,scale:1},{float:false,scale:.72},{float:false,scale:.5}];let lastError;
  for(const attempt of attempts){
    if(gl.isContextLost())throw Error('The graphics device was reset during startup. Reload with safe graphics.');
    hdr=attempt.float;const w=Math.max(1,Math.floor(desiredW*attempt.scale)),h=Math.max(1,Math.floor(desiredH*attempt.scale));const bw=Math.max(1,Math.floor(w/4)),bh=Math.max(1,Math.floor(h/4));const next=[];
    try{
      next.push(target(w,h,true));next.push(target(bw,bh,false));next.push(target(bw,bh,false));
      targets=next;W=w;H=h;bW=bw;bH=bh;canvas.width=W;canvas.height=H;renderScale*=attempt.scale;gl.bindFramebuffer(gl.FRAMEBUFFER,null);return;
    }catch(e){lastError=e;for(const t of next)disposeTarget(t);gl.bindFramebuffer(gl.FRAMEBUFFER,null);Support.note('Graphics fallback: '+e.message);}
  }
  throw new Error((lastError?lastError.message:'Graphics initialization failed.')+' Select RETRY WITH SAFE GRAPHICS or use a smaller browser window.');
}
window.addEventListener('resize',()=>{if(Support.isFailed())return;try{resize();}catch(e){fatal(e);}});resize();
const pVAO=gl.createVertexArray(),pBuff=gl.createBuffer(),pData=new Float32Array(8*2500);gl.bindVertexArray(pVAO);gl.bindBuffer(gl.ARRAY_BUFFER,pBuff);gl.bufferData(gl.ARRAY_BUFFER,pData.byteLength,gl.DYNAMIC_DRAW);[3,4,1].forEach((n,i)=>{gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,32,i===0?0:i===1?12:28)});
const SUN=V.norm([-.45,.82,.38]);let currentVP=M.identity(),frameCalls=0,frameTris=0;
function meshDraw(view=false){for(let g of Object.values(geom)){let count=view?g.vn:g.s+g.n;if(!count)continue;gl.bindVertexArray(g.vao);gl.bindBuffer(gl.ARRAY_BUFFER,g.inst);if(view)gl.bufferSubData(gl.ARRAY_BUFFER,0,g.view.subarray(0,g.vn*24));gl.drawArraysInstanced(gl.TRIANGLES,0,g.vertices,count);frameCalls++;frameTris+=g.vertices/3*count;}}
function render(cam,time,particles,lights,hurt=0,scan=0,view=true){frameCalls=0;frameTris=0;let {eye,yaw,pitch,fov}=cam;if(cam.target){let dv=V.sub(cam.target,eye);yaw=Math.atan2(-dv[0],-dv[2]);pitch=Math.atan2(dv[1],Math.hypot(dv[0],dv[2]));}const cp=Math.cos(pitch),sp=Math.sin(pitch),sy=Math.sin(yaw),cy=Math.cos(yaw),forward=[-sy*cp,sp,-cy*cp],right=[cy,0,-sy],up=[sy*sp,cp,cy*sp];let proj=M.perspective(fov*Math.PI/180,W/H,.055,330),v=M.look(eye,V.add(eye,forward));let vp=M.mul(proj,v);currentVP=vp;let center=cam.target||[eye[0],0,eye[2]-12],leye=V.add(center,V.scale(SUN,85)),light=M.mul(M.ortho(-34,34,-34,34,1,170),M.look(leye,center));
for(let g of Object.values(geom)){gl.bindBuffer(gl.ARRAY_BUFFER,g.inst);if(g._viewDirty){gl.bufferSubData(gl.ARRAY_BUFFER,0,new Float32Array(g.static));g._viewDirty=false}if(g.n)gl.bufferSubData(gl.ARRAY_BUFFER,g.s*96,g.dyn.subarray(0,g.n*24))}
gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
if(settings.quality!=='low'&&shadowSupported){gl.bindFramebuffer(gl.FRAMEBUFFER,shadowF);gl.viewport(0,0,shadowSize,shadowSize);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(depth);um(depth,'uLight',light);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.6,2.5);meshDraw();gl.disable(gl.POLYGON_OFFSET_FILL)}
gl.bindFramebuffer(gl.FRAMEBUFFER,targets[0].f);gl.viewport(0,0,W,H);gl.clearColor(.05,.08,.1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(sky);uv(sky,'uForward',forward);uv(sky,'uRight',right);uv(sky,'uUp',up);uv(sky,'uSun',SUN);uf(sky,'uAspect',W/H);uf(sky,'uTan',Math.tan(fov*Math.PI/360));uf(sky,'uTime',time);uf(sky,'uMood',cam.mood||0);gl.bindVertexArray(fullVAO);gl.drawArrays(gl.TRIANGLES,0,3);
gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.useProgram(prog);um(prog,'uVP',vp);um(prog,'uLight',light);uv(prog,'uCam',eye);uv(prog,'uSun',SUN);uv(prog,'uFlashPos',eye);uv(prog,'uFlashDir',forward);uf(prog,'uTime',time);uf(prog,'uMood',cam.mood||0);uf(prog,'uShadowTexel',1/shadowSize);ui(prog,'uQuality',settings.quality==='low'||!shadowSupported?0:1);ui(prog,'uViewMode',0);ui(prog,'uShadow',0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,shadowTex);for(let i=0;i<4;i++){uv(prog,`uLP[${i}]`,lights[i]?.p||[0,-50,0]);uv(prog,`uLC[${i}]`,lights[i]?.c||[0,0,0]);}meshDraw();
if(particles.length){let n=Math.min(particles.length,2500);for(let i=0;i<n;i++){let p=particles[i],a=i*8;pData[a]=p.x;pData[a+1]=p.y;pData[a+2]=p.z;pData[a+3]=p.c[0];pData[a+4]=p.c[1];pData[a+5]=p.c[2];pData[a+6]=p.alpha??Math.min(1,p.life/p.max);pData[a+7]=p.size;}gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.useProgram(part);um(part,'uVP',vp);uf(part,'uHeight',H);gl.bindVertexArray(pVAO);gl.bindBuffer(gl.ARRAY_BUFFER,pBuff);gl.bufferSubData(gl.ARRAY_BUFFER,0,pData.subarray(0,n*8));gl.drawArrays(gl.POINTS,0,n);gl.depthMask(true);gl.disable(gl.BLEND)}
if(view){gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.CULL_FACE);gl.useProgram(prog);um(prog,'uVP',M.perspective(64*Math.PI/180,W/H,.025,10));uv(prog,'uCam',[0,0,0]);ui(prog,'uViewMode',1);meshDraw(true);for(let g of Object.values(geom))if(g.vn)g._viewDirty=true;}
gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.bindVertexArray(fullVAO);let bloomTex=targets[1].t;
if(settings.quality!=='low'){gl.bindFramebuffer(gl.FRAMEBUFFER,targets[1].f);gl.viewport(0,0,bW,bH);gl.useProgram(bright);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,targets[0].t);ui(bright,'uTex',0);u2(bright,'uPixel',1/W,1/H);gl.drawArrays(gl.TRIANGLES,0,3);gl.useProgram(blur);ui(blur,'uTex',0);for(let i=0;i<4;i++){let src=i%2?targets[2]:targets[1],dest=i%2?targets[1]:targets[2];gl.bindFramebuffer(gl.FRAMEBUFFER,dest.f);gl.bindTexture(gl.TEXTURE_2D,src.t);u2(blur,'uDir',i%2?0:(1+i*.7)/bW,i%2?(1+i*.7)/bH:0);gl.drawArrays(gl.TRIANGLES,0,3)}}
gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);gl.useProgram(post);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,targets[0].t);ui(post,'uTex',0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,bloomTex);ui(post,'uBloom',1);uf(post,'uBloomPower',settings.quality==='low'?0:settings.flashes?.05:.12);uf(post,'uTime',time);uf(post,'uHurt',hurt);uf(post,'uScan',scan);u2(post,'uPixel',1/W,1/H);gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0);
}
function reset(){for(let g of Object.values(geom)){g.static=[];g.s=0;g.n=0;g.vn=0;}}
return{draw,beam,material,finalize,clear,render,resize,reset,get vp(){return currentVP},get stats(){return{calls:frameCalls,triangles:frameTris,width:W,height:H,hdr,shadows:shadowSupported&&settings.quality!=='low',safeGraphics}},geom};
}catch(e){fatal(e);return null;}
})();
