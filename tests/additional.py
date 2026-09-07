import os,time,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parent;HTML=(Path(__file__).resolve().parent.parent / 'bramblebound.html').read_text()
x=subprocess.Popen(['Xvfb',':93','-screen','0','1800x1200x24'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(.7);os.environ['DISPLAY']=':93'
tests=[];errors=[];logs=[];requests=[]
def check(name,yes,detail=None):
 tests.append({'name':name,'passed':bool(yes),'detail':detail})
def load(browser,setup='',hash='qa',viewport=None,touch=False):
 p=browser.new_page(viewport=viewport or {'width':1100,'height':760},has_touch=touch)
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.on('console',lambda m:logs.append(m.text) if m.type in ['warning','error'] else None)
 p.on('request',lambda r:requests.append(r.url))
 p.evaluate("location.hash="+json.dumps(hash))
 if setup:p.evaluate(setup)
 p.set_content(HTML);p.wait_for_function('!!window.__BB || document.querySelector("#failure.on")')
 if p.evaluate('!!window.__BB'):
  p.wait_for_function('document.getElementById("boot").style.display==="none"',timeout=20000);p.evaluate('__BB.stop()')
 return p
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
  p=load(b, "() => {Element.prototype.requestPointerLock=function(){throw Error('Pointer lock denied by test')};}")
  p.click('#newBtn');check('Actual Begin adventure button starts play without pointer lock',p.evaluate('__BB.state')=='playing')
  p.keyboard.down('w');p.evaluate('__BB.step(45)');p.keyboard.up('w');check('Browser keyboard events drive movement',p.evaluate('__BB.player.z')<12)
  p.keyboard.press('Escape');check('Browser Escape key opens pause',p.evaluate('__BB.state')=='paused');p.click('#resumeBtn');check('Resume button works',p.evaluate('__BB.state')=='playing')
  p.click('#pauseBtn');p.keyboard.press('Space');check('Space resumes even with pause button focused',p.evaluate('__BB.state')=='playing')
  p.keyboard.press('Tab');check('Real Tab key opens atlas',p.evaluate('__BB.state')=='map');p.click('#hintBtn');check('Journal supplies a concrete current-puzzle hint','crate' in p.inner_text('#journalGoal'));p.click('#mapClose')
  p.evaluate('__BB.teleport(0,0,18);__BB.step(2)');p.mouse.click(560,390);p.evaluate('__BB.step(1)');check('A quick mouse click is not lost between frames',p.evaluate('__BB.player.attack')>0)
  p.evaluate('__BB.step(35)');p.mouse.move(550,380);p.mouse.down();p.evaluate('__BB.step(45)');p.mouse.up();p.evaluate('__BB.step(1)');check('Holding mouse attack charges a spinning attack',p.evaluate('__BB.player.spin')>.35)
  p.evaluate('__BB.step(70);__BB.teleport(0,0,18);__BB.step(2)');p.mouse.move(550,380);p.mouse.down(button='right');p.mouse.move(760,380);p.mouse.up(button='right');p.keyboard.down('w');p.evaluate('__BB.step(35)');p.keyboard.up('w');check('Right-drag changes camera-relative movement',abs(p.evaluate('__BB.player.x'))>1.5)
  p.evaluate("window.dispatchEvent(new Event('blur'))");check('Window blur pauses and clears controls',p.evaluate('__BB.state')=='paused')
  p.click('#pauseSettings');p.select_option('#quality','low');p.evaluate('__BB.render()');check('Performance graphics disables expensive shadow and bloom passes',not p.evaluate('__BB.engine.stats.shadows'))
  p.locator('#musicVol').focus();p.keyboard.press('Escape');check('Escape exits settings even when a setting has keyboard focus',p.evaluate('__BB.state')=='paused')
  p.click('#pauseSettings');p.select_option('#quality','high');p.set_viewport_size({'width':5120,'height':1440});p.wait_for_function('__BB.engine.stats.width===5120&&__BB.engine.stats.height===1440');p.evaluate('__BB.render()');st=p.evaluate('__BB.engine.stats');check('High graphics allocates native 5120 by 1440 ultrawide output',st['width']==5120 and st['height']==1440,st)
  p.set_viewport_size({'width':1100,'height':760});p.select_option('#quality','medium');p.click('#settingsBack');p.click('#resumeBtn');p.evaluate('__BB.data.coins=42;__BB.data.totalAcorns=42;__BB.data.ring=true;__BB.save()');p.click('#pauseBtn')
  check('Unavailable browser storage is explained on pause', 'unavailable' in p.inner_text('#saveStatus').lower())
  with p.expect_download() as d:p.click('#saveBtn')
  savefile=BASE/'exported-test-save.json';d.value.save_as(savefile);raw=json.loads(savefile.read_text());check('Export save produces a usable JSON file',raw['coins']==42 and raw['ring'])
  p.click('#quitBtn');p.set_input_files('#saveImport',str(savefile));p.wait_for_function('__BB.state==="playing"');check('Import save restores progression and currency',p.evaluate('__BB.data.coins===42&&__BB.data.ring'))
  p.evaluate('__BB.load("hearth",[99,0,99]);__BB.step(3)');check('A checkpoint outside the map is replaced with a safe entrance',p.evaluate('Math.abs(__BB.player.x)<1&&__BB.player.grounded'))
  p.evaluate('__BB.world.crates[0].x=20;__BB.respawn(false)');check('Return to lantern resets an unsolved stranded crate',p.evaluate('__BB.world.crates[0].x===5.8&&__BB.world.crates[0].z===.6'))
  p.close()
  # Memory-backed storage verifies save loading, not operating-system persistence.
  setup="""() => {let store={};window.testStore=store;Object.defineProperty(window,'localStorage',{value:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]}});} """
  p=load(b,setup);p.click('#newBtn');p.evaluate('__BB.data.coins=31;__BB.data.ring=true;__BB.save()');check('Storage-enabled save writes valid data',p.evaluate("JSON.parse(testStore['bramblebound-story-v1']).coins===31"));p.evaluate('__BB.pause()');p.click('#quitBtn');check('A saved story exposes Continue',p.locator('#continueBtn').is_visible());p.click('#continueBtn');check('Continue reloads serialized progress',p.evaluate('__BB.data.coins===31&&__BB.data.ring'))
  p.evaluate("window.testPad={connected:true,axes:[1,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.testPad];__BB.pollGamepad(1/60);__BB.step(35)");check('Standard gamepad left-stick mapping moves the character',p.evaluate('__BB.player.x')>2)
  p.evaluate('testPad.axes[0]=0;testPad.buttons[0].pressed=true;__BB.pollGamepad(1/60);__BB.step(3)');check('Standard gamepad A mapping jumps',p.evaluate('__BB.player.vy')>8);p.evaluate('testPad.buttons[0].pressed=false;testPad.buttons[9].pressed=true;__BB.pollGamepad(1/60)');check('Standard gamepad Start mapping pauses',p.evaluate('__BB.state')=='paused');p.close()
  # Small-screen interface and DOM pointer events.
  p=load(b,viewport={'width':390,'height':844},touch=True);p.screenshot(path=str(BASE/'mobile-menu.png'));p.click('#newBtn');p.evaluate('__BB.step(5)');check('Touch interface appears on a touch-capable viewport',p.locator('#stick').is_visible())
  box=p.locator('#stick').bounding_box();p.mouse.move(box['x']+box['width']*.8,box['y']+box['height']*.5);p.mouse.down();p.evaluate('__BB.step(35)');p.mouse.up();check('On-screen joystick pointer input moves the player',p.evaluate('__BB.player.x')>1.4);p.locator('.touchbtn.jump').click();p.evaluate('__BB.step(3)');check('On-screen jump button uses the jump mechanic',p.evaluate('__BB.player.y')>.1)
  p.evaluate('__BB.step(90);__BB.render()');p.screenshot(path=str(BASE/'mobile-game.png'));p.click('#pauseBtn');p.click('#pauseSettings');check('Mobile settings has no horizontal document overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth'));p.click('#settingsBack');p.click('#resumeBtn');p.evaluate('__BB.data.coins=100;__BB.openShop()');check('Mobile shop cards are one readable column',p.evaluate('getComputedStyle(document.querySelector("#shopCards")).gridTemplateColumns.split(" ").length===1'));check('Long mobile shop panel keeps its heading reachable',p.locator('#shop .paper').bounding_box()['y']>=0);p.locator('#shopClose').scroll_into_view_if_needed();check('Mobile shop exit remains reachable by scrolling',p.locator('#shopClose').is_visible());p.locator('#shop').evaluate('(e)=>e.scrollTop=0');p.screenshot(path=str(BASE/'mobile-shop.png'));p.close()
  # Capability failures and recoveries.
  p=load(b,hash='qa-safe');st=p.evaluate('__BB.engine.stats');check('Safe graphics starts without HDR or shadow passes',not st['hdr'] and not st['shadows'] and st['safeGraphics']);p.close()
  p=load(b,"() => {let f=WebGL2RenderingContext.prototype.getExtension;WebGL2RenderingContext.prototype.getExtension=function(n){return n==='EXT_color_buffer_float'?null:f.call(this,n)}}");check('No floating-point color extension still permits the complete game to boot',p.evaluate('__BB.state==="menu"&&!__BB.engine.stats.hdr'));p.close()
  p=load(b,"() => {let f=WebGL2RenderingContext.prototype.checkFramebufferStatus,n=0;WebGL2RenderingContext.prototype.checkFramebufferStatus=function(t){if(++n===2)return this.FRAMEBUFFER_UNSUPPORTED;return f.call(this,t)}}");check('Rejected HDR framebuffer retries with standard color successfully',p.evaluate('__BB.state==="menu"&&!__BB.engine.stats.hdr'));p.close()
  p=load(b,"() => {let f=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t==='webgl2'?null:f.call(this,t,...a)}}");check('Missing WebGL 2 gives an actionable visible error',p.locator('#failure').is_visible() and 'WebGL 2' in p.inner_text('#errorText'));p.close()
  p=load(b,"() => {WebGL2RenderingContext.prototype.checkFramebufferStatus=function(){return this.FRAMEBUFFER_UNSUPPORTED}} ");check('Exhausted graphics recovery shows an error rather than an endless loader',p.locator('#failure').is_visible() and not p.locator('#boot').is_visible());p.close()
  check('No external network resource requests',not requests,requests)
  check('No uncaught JavaScript exceptions across UI and capability tests',not errors,errors)
  b.close()
except Exception as e:
 tests.append({'name':'Additional suite completed','passed':False,'detail':str(e)})
finally:
 x.terminate();r={'tests':tests,'passed':sum(t['passed'] for t in tests),'failed':[t for t in tests if not t['passed']],'pageErrors':errors,'console':logs,'requests':requests};(BASE/'additional-report.json').write_text(json.dumps(r,indent=2));print(json.dumps({'passed':r['passed'],'failed':r['failed'],'errors':errors,'console':logs},indent=2))
