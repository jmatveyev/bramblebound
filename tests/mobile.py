"""Browser-driven mobile regressions. Run under Xvfb; hardware is not emulated."""
from pathlib import Path
import json, math, traceback, hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'tests'/'mobile-qa';OUT.mkdir(exist_ok=True)
HTML=(ROOT/'bramblebound.html').read_text()
tests=[];errors=[];logs=[];requests=[]
def check(name,value,detail=None):
 tests.append({'name':name,'passed':bool(value),'detail':detail})
 print(('PASS' if value else 'FAIL'),name,detail if not value else '',flush=True)
def load(b,w=844,h=390,setup=None):
 p=b.new_page(viewport={'width':w,'height':h},has_touch=True,is_mobile=True,device_scale_factor=3)
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.on('console',lambda m:logs.append(m.text) if m.type in ['warning','error'] else None)
 p.on('request',lambda r:requests.append(r.url))
 p.evaluate("location.hash='qa'")
 if setup:p.evaluate(setup)
 p.set_content(HTML);p.wait_for_function('!!window.__BB',timeout=25000)
 p.wait_for_function('document.getElementById("boot").style.display==="none"')
 p.evaluate('__BB.stop()')
 return p
class Touch:
 def __init__(self,p):self.p=p;self.c=p.context.new_cdp_session(p);self.points={}
 def emit(self,t):self.c.send('Input.dispatchTouchEvent',{'type':t,'touchPoints':list(self.points.values())})
 def down(self,i,x,y):
  self.points[i]={'id':i,'x':x,'y':y,'radiusX':4,'radiusY':4,'force':1};self.emit('touchStart')
 def move(self,i,x,y):
  self.points[i].update(x=x,y=y);self.emit('touchMove')
 def up(self,i):
  ended=self.points.pop(i,None);self.c.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[ended] if ended else []})
 def cancel(self):self.points.clear();self.emit('touchCancel')
 def button(self,i,sel):
  r=self.p.locator(sel).bounding_box();self.down(i,r['x']+r['width']/2,r['y']+r['height']/2)
 def stick(self,i,x=0,y=0):
  r=self.p.locator('#stick').bounding_box();self.down(i,r['x']+r['width']/2+x*r['width']*.37,r['y']+r['height']/2+y*r['height']*.37)
 def tap(self,sel):
  self.button(19,sel);self.up(19)

def step(p,n=1):p.evaluate('(n)=>__BB.step(n)',n)
def ready(p):
 p.evaluate('__BB.clear();__BB.teleport(0,0,18);__BB.player.attack=0;__BB.player.attackCD=0;__BB.player.spin=0;__BB.player.roll=0;__BB.player.rollCD=0;__BB.step(3)')
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
  p=load(b);t=Touch(p)
  p.locator('#newBtn').tap();step(p,100)
  check('Touch-capable phone activates complete controls',p.evaluate('document.body.classList.contains("touch-on")') and p.locator('#stick').is_visible())
  check('Phone starts with performance graphics',p.evaluate('__BB.settings.quality')=='low')
  check('DPR 3 framebuffer stays within 720k pixels',p.evaluate('__BB.engine.stats.width*__BB.engine.stats.height')<=720000)
  check('Phone does not require mouse capture',p.evaluate('document.pointerLockElement===null'))
  check('First objective uses touch vocabulary', 'Press E' not in p.inner_text('#goalDesc') and 'tap Use' in p.inner_text('#goalDesc'))
  check('Locked ring button is visibly disabled',p.locator('#touchRing').is_disabled())
  # Real browser touch event ownership, not synthetic mouse movement.
  ready(p);t.stick(1,.04,0);step(p,20);check('Joystick center deadzone prevents drifting',abs(p.evaluate('__BB.player.x'))<.001);t.up(1)
  ready(p);t.stick(1,1,0);step(p,35);speed=p.evaluate('Math.hypot(__BB.player.vx,__BB.player.vz)');check('Joystick outer rim provides full sprint speed',speed>8.7,speed);check('Full joystick moves the character',p.evaluate('__BB.player.x')>3);t.up(1);step(p,20);check('Lifting movement thumb stops motion',p.evaluate('Math.hypot(__BB.player.vx,__BB.player.vz)<.01&&!__BB.input.running'))
  ready(p);t.stick(1,.65,0);step(p,40);speed=p.evaluate('Math.hypot(__BB.player.vx,__BB.player.vz)');check('Partial stick provides slower controlled walking',2.5<speed<5.5,speed);t.up(1)
  ready(p);t.stick(1,1,0);old=p.evaluate('__BB.input.stickID');t.stick(2,-1,0);check('A second joystick touch cannot steal first thumb',p.evaluate('__BB.input.stickID')==old and p.evaluate('__BB.input.touch.x')>.9);t.up(2);check('Lifting unrelated joystick touch does not stop first thumb',p.evaluate('__BB.input.touch.x')>.9);t.up(1)
  ready(p);t.stick(1,1,0);t.button(2,'#touchJump');step(p,20);check('Movement and held jump work simultaneously',p.evaluate('__BB.player.x>1.5&&__BB.player.y>1'));t.up(2);check('Jump release does not cancel movement thumb',p.evaluate('__BB.input.touch.x')>.9);t.up(1)
  ready(p);t.button(2,'#touchJump');step(p,23);high=p.evaluate('__BB.player.y');t.up(2);ready(p);t.button(2,'#touchJump');step(p,1);t.up(2);step(p,22);low=p.evaluate('__BB.player.y');check('Holding Jump produces a higher leap than tapping',high>low+0.5,{'held':high,'tap':low})
  ready(p);p.evaluate('__BB.data.airjump=true');t.button(2,'#touchJump');step(p,20);t.up(2);step(p,2);t.button(2,'#touchJump');step(p,1);check('Second touch jump triggers unlocked air jump',p.evaluate('__BB.player.jumps===2&&__BB.player.vy>9'));t.up(2)
  ready(p);t.tap('#touchBlade');step(p,1);check('Quick touchscreen blade tap survives between frames',p.evaluate('__BB.player.attack')>0)
  ready(p);t.stick(1,.6,0);t.button(2,'#touchBlade');step(p,20);t.up(1);check('Lifting joystick does not release a held blade',p.evaluate('__BB.input.held.includes("KeyJ")'));step(p,22);p.evaluate('__BB.updateHUD()');check('Charged spin has visible release feedback',p.inner_text('#bladeCaption')=='RELEASE');t.up(2);step(p,1);check('Releasing held Blade executes charged spin',p.evaluate('__BB.player.spin')>.35)
  ready(p);t.button(2,'#touchBlade');step(p,45);t.cancel();step(p,1);check('System touch cancellation clears charge without an unintended spin',p.evaluate('__BB.player.spin===0&&__BB.player.charge===0&&!__BB.input.held.includes("KeyJ")'))
  ready(p);t.button(2,'#touchBlade');t.button(3,'#touchBlade');step(p,20);t.up(2);check('Two touches on same action keep it held until last finger lifts',p.evaluate('__BB.input.held.includes("KeyJ")'));t.up(3);step(p,1);check('Last action finger releases exactly once',p.evaluate('!__BB.input.held.includes("KeyJ")&&__BB.input.actionOwners===0'))
  ready(p);t.tap('#touchRoll');step(p,1);check('Roll button activates evasive tumble',p.evaluate('__BB.player.roll')>.2)
  ready(p);p.evaluate('__BB.data.ring=true;__BB.updateHUD()');t.stick(1,.6,0);t.tap('#touchRing');step(p,1);check('Ring launches while movement thumb stays held',p.evaluate('!!__BB.world.sunring&&__BB.input.touch.x>.1'));t.up(1);step(p,150)
  # Real drag/pinch and camera recenter, simultaneous with left-stick movement.
  ready(p);yaw=p.evaluate('__BB.camera.yaw');t.stick(1,.5,0);t.down(2,450,210);t.move(2,530,210);check('Touch camera drag works while moving',abs(p.evaluate('__BB.camera.yaw')-yaw)>.3 and p.evaluate('__BB.input.touch.x')>.2);t.up(2);t.up(1)
  t.down(1,300,210);t.down(2,470,210);dist=p.evaluate('__BB.camera.distance');t.move(1,270,210);t.move(2,500,210);check('Pinch-out zooms camera in without page zoom',p.evaluate('__BB.camera.distance')<dist and p.evaluate('visualViewport.scale')==1);t.up(1);t.up(2)
  t.tap('#touchCenter');check('View button restores camera yaw and distance',p.evaluate('__BB.camera.yaw===0&&__BB.camera.distance===19'))
  # Critical item progression with actual touch controls and ordinary interactions.
  p.evaluate('__BB.start();__BB.teleport(5.8,0,2.2);__BB.step(3)');check('Nearby crate labels context action Push',p.inner_text('#useCaption')=='Push');t.stick(1,0,-.88);t.button(2,'#touchUse');step(p,110);t.up(2);t.up(1);step(p,3);check('Hold Push plus movement solves workshop plate',p.evaluate('!!__BB.data.flags.workshop'))
  p.evaluate('__BB.teleport(12.5,0,-4);__BB.step(2)');t.tap('#touchUse');step(p,1);check('Touch Use opens real sunring chest reward',p.evaluate('__BB.state==="reward"&&__BB.data.ring'));p.locator('#rewardContinue').tap();check('Reward is dismissible without keyboard',p.evaluate('__BB.state')=='playing')
  p.evaluate('__BB.teleport(0,0,5);__BB.step(2)');t.tap('#touchUse');step(p,1);check('Touch Talk opens NPC dialogue',p.evaluate('__BB.state')=='dialogue');check('Dialogue displays tap instruction',p.locator('#dialogue .mobile-only').is_visible());check('NPC tutorial contains no keyboard-only Hold E', 'Hold E' not in p.inner_text('#dialogLine'))
  for i in range(8):
   if p.evaluate('__BB.state')!='dialogue':break
   step(p,15);p.locator('#dialogNext').tap()
  check('All dialogue pages advance with taps',p.evaluate('__BB.state')=='playing')
  p.evaluate('__BB.data.coins=150;__BB.openShop()');before=p.evaluate('__BB.player.maxHp');p.locator('#shopCards button').nth(0).tap();check('Shop purchase is touch accessible',p.evaluate('__BB.player.maxHp')==before+2);p.locator('#shopClose').tap();check('Shop exit returns to play by touch',p.evaluate('__BB.state')=='playing')
  p.evaluate('__BB.load("moon",[-16,0,-7.8]);__BB.step(3)');di=p.evaluate('__BB.world.prisms[0].dir');t.tap('#touchUse');step(p,1);check('Touch Turn rotates a puzzle prism',p.evaluate('__BB.world.prisms[0].dir')==(di+1)%4)
  p.locator('#mapBtn').tap();check('Atlas opens by touch',p.evaluate('__BB.state')=='map');p.locator('#hintBtn').tap();check('Puzzle hints use mobile controls', 'press of E' not in p.inner_text('#journalGoal') and 'tap of Use' in p.inner_text('#journalGoal'));p.locator('#mapClose').tap();check('Atlas closes by touch',p.evaluate('__BB.state')=='playing')
  # Pause, settings, and auto-reset paths.
  t.stick(1,.8,0);t.button(2,'#touchBlade');step(p,8);p.locator('#pauseBtn').tap();t.cancel();check('Pause clears all ongoing touches and charge',p.evaluate('__BB.state==="paused"&&__BB.input.actionOwners===0&&__BB.input.stickID===null&&__BB.player.charge===0'));pos=p.evaluate('[__BB.player.x,__BB.player.z]');step(p,90);check('Paused game simulation does not move',pos==p.evaluate('[__BB.player.x,__BB.player.z]'))
  p.locator('#pauseSettings').tap();p.select_option('#showTouch','off');check('Disabling touch exposes touch-only rescue',p.locator('#touchRescue').is_visible());p.locator('#touchRescue').tap();check('Touch controls can be restored without keyboard',p.evaluate('__BB.settings.touch==="on"&&document.body.classList.contains("touch-on")'))
  p.locator('#lookSensitivity').evaluate('(e)=>{e.value=150;e.dispatchEvent(new Event("input"))}');check('Touch camera speed setting updates',p.evaluate('__BB.settings.lookSensitivity')==1.5)
  p.locator('#settingsBack').tap();p.locator('#resumeBtn').tap();check('Touch resume works after settings',p.evaluate('__BB.state')=='playing')
  t.stick(1,.7,0);t.button(2,'#touchBlade');p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(160);t.cancel();check('Rotating during two-thumb play pauses and clears controls',p.evaluate('__BB.state==="paused"&&__BB.input.actionOwners===0&&__BB.input.stickID===null'))
  p.locator('#resumeBtn').tap();step(p,5);check('Resuming after rotation does not keep an old action held',p.evaluate('__BB.input.held.length===0&&__BB.player.charge===0'))
  p.evaluate('window.dispatchEvent(new Event("blur"))');check('App interruption / blur pauses gameplay',p.evaluate('__BB.state')=='paused');p.locator('#resumeBtn').tap();p.evaluate('window.dispatchEvent(new Event("pagehide"))');check('Pagehide pauses before browser suspension',p.evaluate('__BB.state')=='paused')
  # Mobile file export and text import use real UI, not direct import helpers.
  p.evaluate('__BB.data.coins=77');p.locator('#saveBtn').tap();check('Phone export opens portable save panel',p.evaluate('__BB.state')=='saveTools');code=p.input_value('#saveCode');check('Portable code contains current progress',json.loads(code)['coins']==77)
  check('Share is hidden when unsupported',not p.locator('#saveShare').is_visible())
  with p.expect_download() as download:p.locator('#saveDownload').tap()
  path=OUT/'mobile-save.json';download.value.save_as(path);check('Touch JSON export produces valid file',json.loads(path.read_text())['coins']==77)
  p.locator('#saveCopy').tap();check('Unavailable clipboard has a readable copy fallback',bool(p.inner_text('#saveToolsStatus')) and p.evaluate('__BB.state')=='saveTools')
  p.locator('#saveToolsBack').tap();p.locator('#pauseImportCode').tap();p.locator('#saveCode').fill('not a game save');p.locator('#saveImportCode').tap();check('Invalid pasted save preserves existing story',p.evaluate('__BB.data.coins')==77 and 'not been changed' in p.inner_text('#saveToolsStatus'))
  p.locator('#saveCode').fill(code);p.locator('#saveImportCode').tap();check('Valid pasted save restores through touch UI',p.evaluate('__BB.state==="playing"&&__BB.data.coins===77'))
  p.locator('#pauseBtn').tap();p.locator('#quitBtn').tap();p.set_input_files('#saveImport',str(path));p.wait_for_function('__BB.state==="playing"');check('Phone file-picker import restores JSON save',p.evaluate('__BB.data.coins')==77)
  # No-storage and lifecycle audio behavior.
  p.locator('#pauseBtn').tap();check('Unavailable storage directs player to portable saves','unavailable' in p.inner_text('#saveStatus').lower());p.locator('#resumeBtn').tap();p.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))');p.wait_for_timeout(100);check('Hidden tab pauses and suspends audio',p.evaluate('__BB.state==="paused"&&(__BB.audioState==="suspended"||__BB.audioState==="not-created")'))
  p.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>false})');p.locator('#resumeBtn').tap();check('User tap resumes after hidden-tab pause',p.evaluate('__BB.state')=='playing');p.close()
  # Layout, safe areas, and actual scrolling on a range of phone sizes.
  for w,h in [(320,568),(360,640),(390,844),(430,932),(667,375),(844,390),(1024,768)]:
   p=load(b,w,h);p.locator('#newBtn').tap();step(p,90);p.evaluate('__BB.player.invuln=0;__BB.render()')
   boxes=p.evaluate('''()=>[...document.querySelectorAll('#stick,.touchbtn,#mapBtn,#pauseBtn')].map(e=>{const r=e.getBoundingClientRect();return{id:e.id,x:r.x,y:r.y,w:r.width,h:r.height}})''')
   inside=all(x['x']>=-1 and x['y']>=-1 and x['x']+x['w']<=w+1 and x['y']+x['h']<=h+1 for x in boxes)
   check(f'{w}x{h}: all gameplay touch targets fit viewport',inside,boxes if not inside else None)
   check(f'{w}x{h}: action targets are at least 44 CSS px',all(x['w']>=44 and x['h']>=44 for x in boxes))
   overlaps=[]
   for i,a in enumerate(boxes):
    for bb in boxes[i+1:]:
     if a['x']<bb['x']+bb['w'] and a['x']+a['w']>bb['x'] and a['y']<bb['y']+bb['h'] and a['y']+a['h']>bb['y']:overlaps.append([a['id'],bb['id']])
   check(f'{w}x{h}: joystick, action, and HUD hitboxes do not overlap',not overlaps,overlaps)
   check(f'{w}x{h}: no page horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   if (w,h) in [(390,844),(844,390)]:p.screenshot(path=str(OUT/f'playing-{w}x{h}.png'),scale='css')
   p.locator('#pauseBtn').tap();p.locator('#pauseSettings').tap();p.locator('#settings').evaluate('(e)=>e.scrollTop=0');before=p.locator('#settings').evaluate('(e)=>e.scrollTop');cdp=p.context.new_cdp_session(p)
   swipe=Touch(p);startY=min(h-70,h*.8);swipe.down(7,w*.48,startY)
   for k in range(1,15):
    swipe.move(7,w*.48,startY-min(startY-70,400)*k/14);p.wait_for_timeout(22)
   swipe.up(7);p.wait_for_timeout(600)
   after=p.locator('#settings').evaluate('(e)=>e.scrollTop');check(f'{w}x{h}: settings scroll with a real swipe',after>before or p.locator('#settings').evaluate('(e)=>e.scrollHeight<=e.clientHeight'),{'scroll':after})
   p.locator('#settingsBack').scroll_into_view_if_needed();p.wait_for_timeout(250);p.locator('#settingsBack').tap();check(f'{w}x{h}: settings Back remains reachable by touch',p.evaluate('__BB.state')=='paused')
   p.locator('#resumeBtn').tap();p.evaluate('__BB.openShop()');p.locator('#shopClose').scroll_into_view_if_needed();p.wait_for_timeout(150);p.locator('#shopClose').tap();check(f'{w}x{h}: long shop can be closed by touch',p.evaluate('__BB.state')=='playing')
   if w==844:
    p.evaluate('document.documentElement.style.setProperty("--safe-left","47px");document.documentElement.style.setProperty("--safe-right","47px");document.documentElement.style.setProperty("--safe-bottom","21px")');rects=p.evaluate('''()=>[...document.querySelectorAll('#stick,.touchbtn')].map(e=>{let r=e.getBoundingClientRect();return[r.left,r.right,r.bottom]})''');check('Simulated landscape notch and home indicator keep controls inside safe area',all(a>=47 and bb<=w-47 and c<=h-21 for a,bb,c in rects));p.evaluate('__BB.render()');p.screenshot(path=str(OUT/'landscape-safe-areas.png'),scale='css')
   p.close()
  check('No external resource requests in mobile tests',not requests,requests)
  check('No uncaught JavaScript exceptions in mobile tests',not errors,errors)
  check('No graphics or JavaScript console warnings in successful mobile tests',not logs,logs)
  b.close()
except Exception as e:
 check('Mobile test suite completed',False,traceback.format_exc())
finally:
 report={'html_sha256':hashlib.sha256(HTML.encode('utf-8')).hexdigest(),'tests':tests,'passed':sum(x['passed'] for x in tests),'failed':[x for x in tests if not x['passed']],'errors':errors,'console':logs,'requests':requests,'method':'Chromium 144 Linux, software WebGL under Xvfb. CDP touch inputs, DPR 3, about:blank injection. Not physical iOS/Android hardware.'}
 (ROOT/'tests'/'mobile-report.json').write_text(json.dumps(report,indent=2))
 print(json.dumps({'passed':report['passed'],'failed':report['failed'],'errors':errors,'console':logs},indent=2))
