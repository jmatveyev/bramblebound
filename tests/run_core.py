import os,time,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
x=subprocess.Popen(['Xvfb',':95','-screen','0','1600x1000x24'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(.7);os.environ['DISPLAY']=':95'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
  page=b.new_page(viewport={'width':800,'height':600}); errors=[];logs=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:logs.append(m.text) if m.type in ['warning','error'] else None)
  page.evaluate("location.hash='qa'");page.set_content((Path(__file__).resolve().parent.parent / 'bramblebound.html').read_text());page.wait_for_function('!!window.__BB');page.evaluate('__BB.stop()')
  try:
   result=page.evaluate((Path(__file__).resolve().parent / 'core.js').read_text());result['errors']=errors;result['console']=logs;(Path(__file__).resolve().parent / 'core-report.json').write_text(json.dumps(result,indent=2));print(json.dumps({'passed':result['passed'],'failed':result['failed'],'errors':errors,'console':logs},indent=2))
  except Exception as e:
   print('CORE ERROR',e);print(page.evaluate('({state:__BB.state,room:__BB.room,player:__BB.player,data:__BB.data,world:__BB.world.boss})'))
  b.close()
finally:x.terminate()
