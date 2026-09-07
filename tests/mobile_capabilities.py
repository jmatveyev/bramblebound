"""Feature-gated browser capabilities. The native share UI is mocked, not opened."""
from pathlib import Path
import json, traceback
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
HTML = (ROOT / 'bramblebound.html').read_text()
tests, errors, logs = [], [], []
def check(name, ok, detail=None):
    tests.append({'name':name, 'passed':bool(ok), 'detail':detail})
    print('PASS' if ok else 'FAIL', name, flush=True)
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        p = b.new_page(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True)
        p.on('pageerror', lambda e:errors.append(str(e)))
        p.on('console', lambda m:logs.append(m.text) if m.type in ['warning','error'] else None)
        p.evaluate("location.hash='qa'")
        p.set_content(HTML); p.wait_for_function('!!window.__BB'); p.wait_for_function('document.getElementById("boot").style.display==="none"')
        p.evaluate('__BB.stop()'); p.locator('#newBtn').tap(); p.locator('#pauseBtn').tap(); p.locator('#pauseSettings').tap()
        p.evaluate('Object.defineProperty(document,"fullscreenEnabled",{configurable:true,get:()=>false})')
        p.locator('#fullscreenBtn').scroll_into_view_if_needed(); p.locator('#fullscreenBtn').tap()
        check('Missing fullscreen leaves a readable normal-tab fallback', 'not offered' in p.inner_text('#fullscreenNote'))
        p.evaluate('Object.defineProperty(document,"fullscreenEnabled",{configurable:true,get:()=>true});document.documentElement.requestFullscreen=()=>Promise.reject(new DOMException("Denied","NotAllowedError"));void 0')
        p.locator('#fullscreenBtn').tap(); p.wait_for_timeout(30)
        check('Fullscreen rejection does not crash or hide controls', 'not allowed' in p.inner_text('#fullscreenNote') and not p.locator('#failure').is_visible())
        p.locator('#settingsBack').tap(); p.locator('#saveBtn').tap()
        p.evaluate('Object.defineProperty(navigator,"canShare",{configurable:true,value:()=>true});window.sharePayload=null;Object.defineProperty(navigator,"share",{configurable:true,writable:true,value:async d=>{window.sharePayload=d;}});__BB.closeSaveTools();__BB.openSaveTools("export")')
        check('File sharing appears only when reported supported',p.locator('#saveShare').is_visible())
        p.locator('#saveShare').tap(); p.wait_for_timeout(20)
        check('Share action hands off a JSON File and reports success',p.evaluate('sharePayload.files[0].name==="bramblebound-save.json"&&sharePayload.files[0].type==="application/json"') and 'handed' in p.inner_text('#saveToolsStatus'))
        check('Shared payload contains a validated game save',p.evaluate('async()=>{let text=await sharePayload.files[0].text();return !!__BB.validate(JSON.parse(text));}'))
        p.evaluate('navigator.share=()=>Promise.reject(new DOMException("Cancelled","AbortError"));void 0'); p.locator('#saveShare').tap(); p.wait_for_timeout(30)
        check('Cancelling native share preserves story and explains cancellation','cancelled' in p.inner_text('#saveToolsStatus') and p.evaluate('__BB.state')=='saveTools')
        p.evaluate('navigator.share=()=>Promise.reject(new DOMException("Denied","NotAllowedError"));void 0'); p.locator('#saveShare').tap(); p.wait_for_timeout(30)
        check('Rejected sharing directs user to download or copy','Download JSON or Copy code' in p.inner_text('#saveToolsStatus'))
        p.evaluate('window.copiedText="";Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async t=>{window.copiedText=t;}}})'); p.locator('#saveCopy').tap(); p.wait_for_timeout(30)
        check('Clipboard success copies full portable code',p.evaluate('copiedText===document.getElementById("saveCode").value') and 'copied' in p.inner_text('#saveToolsStatus'))
        p.evaluate('navigator.clipboard.writeText=()=>Promise.reject(Error("blocked"));document.execCommand=()=>false;void 0'); p.locator('#saveCopy').tap(); p.wait_for_timeout(30)
        check('Both unavailable clipboard routes provide manual selection','Automatic copy is unavailable' in p.inner_text('#saveToolsStatus'))
        check('Manual copy fallback selects the complete code',p.evaluate('saveCode.selectionStart===0&&saveCode.selectionEnd===saveCode.value.length'))
        p.locator('#saveToolsBack').tap(); p.locator('#pauseImportCode').tap(); p.locator('#saveCode').fill('w a s d j q e')
        p.locator('#saveCode').press('j'); p.locator('#saveCode').press('Space'); p.locator('#saveCode').press('e')
        check('Typing game letters into import field does not trigger gameplay',p.evaluate('__BB.state==="saveTools"&&__BB.input.held.length===0&&__BB.input.pressed.length===0'))
        check('Save input uses readable text and disables automatic capitalization',p.locator('#saveCode').get_attribute('autocapitalize')=='off' and p.evaluate('parseFloat(getComputedStyle(saveCode).fontSize)>=16'))
        check('Capability fallbacks produce no uncaught JavaScript exceptions',not errors,errors)
        check('Capability fallbacks produce no graphics or JavaScript warnings',not logs,logs)
        b.close()
except Exception:
    check('Capability suite completed',False,traceback.format_exc())
finally:
    report={'passed':sum(t['passed'] for t in tests),'failed':[t for t in tests if not t['passed']],'tests':tests,'errors':errors,'console':logs,'method':'Chromium 144 software graphics, about:blank, injected fullscreen/share/clipboard responses. Does not validate native mobile UI.'}
    (ROOT/'tests'/'mobile-capabilities-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'passed':report['passed'],'failed':report['failed']},indent=2))
