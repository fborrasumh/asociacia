"""Arnés de pruebas para apps Forja con Playwright (Chromium).  Sin claves reales: simula OpenAI, Gemini y Claude.

    from forja_test import Harness
    async def reply(prov, system, user, info):      # → ('j', dict) | ('t', str) | ('err', status, texto)
        return ('j', {...})
    async with Harness('index.html', reply) as h:
        await h.page.click('#btnEjemplo') ...
        print(h.seen[-1])      # {'prov','model','system','user','imgs','json'} de la última petición a un proveedor

Las librerías de cdnjs (docx, JSZip, mammoth, pdf.js) se sirven desde node_modules si existe:
    mkdir /tmp/nm && cd /tmp/nm && npm i docx jszip mammoth pdfjs-dist@3.11.174      (y  export NODE_MODULES=/tmp/nm/node_modules)
"""
import asyncio, json, os, pathlib, re
from playwright.async_api import async_playwright

def _nm():
    for c in [os.environ.get('NODE_MODULES'), './node_modules', '/home/claude/dx/node_modules']:
        if c and pathlib.Path(c).is_dir(): return pathlib.Path(c)
    return None

class Harness:
    def __init__(self, index, reply=None, viewport=(1360, 900), headless_args=None, init_scripts=None):
        self.index = pathlib.Path(index).resolve(); self.reply = reply; self.viewport = viewport
        self.seen = []; self.errors = []; self.args = headless_args or []; self.init_scripts = init_scripts or []
        self.nm = _nm(); self.crossref = {}   # doi → título (200) | None (404)
        # modelos que «devuelve» cada proveedor al listar con la clave (incluye no-texto para comprobar el filtro de OpenAI)
        self.models = {'openai': ['gpt-5-mini', 'gpt-4o-mini', 'whisper-1', 'text-embedding-3-small', 'tts-1'], 'gemini': ['gemini-2.5-flash', 'gemini-2.5-pro'], 'anthropic': ['claude-haiku-4-5-20251001', 'claude-sonnet-4-5']}
        self.listados = []   # proveedores cuyo listado de modelos se pidió

    async def __aenter__(self):
        self._p = await async_playwright().start()
        self.browser = await self._p.chromium.launch(args=self.args)
        self.ctx = await self.browser.new_context(viewport={'width': self.viewport[0], 'height': self.viewport[1]}, accept_downloads=True)
        await self.ctx.route('**/*', self._route)
        for s in self.init_scripts: await self.ctx.add_init_script(s)
        self.page = await self.ctx.new_page()
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))
        self.page.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await self.page.goto(self.index.as_uri()); await self.page.wait_for_timeout(500)
        return self

    async def __aexit__(self, *a):
        await self.browser.close(); await self._p.stop()

    async def _route(self, r):
        u = r.request.url
        if u.startswith(('file://', 'data:', 'blob:')): return await r.continue_()
        if 'fonts.g' in u: return await r.fulfill(status=404, body='')
        nm = self.nm
        libs = [('pdf.worker', 'pdfjs-dist/build/pdf.worker.min.js'), ('pdf.min.js', 'pdfjs-dist/build/pdf.min.js'), ('jszip', 'jszip/dist/jszip.min.js'), ('mammoth', 'mammoth/mammoth.browser.min.js'), ('docx', 'docx/build/index.umd.js')]
        for k, f in libs:
            if k in u and nm and (nm/f).exists(): return await r.fulfill(path=str(nm/f), headers={'content-type': 'application/javascript'})
        body = (r.request.post_data_buffer or b'').decode('utf-8', 'ignore'); hd = r.request.headers
        lista = lambda d: r.fulfill(status=200, content_type='application/json', body=json.dumps(d))
        if 'api.openai.com/v1/models' in u: self.listados.append('openai'); return await lista({'data': [{'id': m} for m in self.models['openai']]})
        if 'generativelanguage.googleapis.com' in u and '/models' in u and 'generateContent' not in u: self.listados.append('gemini'); return await lista({'models': [{'name': 'models/' + m, 'supportedGenerationMethods': ['generateContent']} for m in self.models['gemini']]})
        if 'api.anthropic.com/v1/models' in u: self.listados.append('anthropic'); return await lista({'data': [{'id': m} for m in self.models['anthropic']]})
        async def out(res):
            if res[0] == 'err': return await r.fulfill(status=res[1], content_type='application/json', body=res[2] if len(res) > 2 else '{}')
            return res
        if 'api.openai.com/v1/chat/completions' in u:
            bd = json.loads(body); msgs = bd['messages']; um = msgs[-1]['content']
            user = um if isinstance(um, str) else ''.join(p.get('text', '') for p in um if p['type'] == 'text'); imgs = 0 if isinstance(um, str) else sum(1 for p in um if p['type'] == 'image_url')
            info = {'prov': 'openai', 'model': bd.get('model'), 'system': msgs[0]['content'] if msgs[0]['role'] == 'system' else '', 'user': user, 'imgs': imgs, 'json': 'response_format' in bd, 'auth': hd.get('authorization', '')[:9]}
            return await self._resp(r, info, lambda txt: {'choices': [{'message': {'content': txt}}]})
        if 'generateContent' in u:
            bd = json.loads(body); parts = bd['contents'][-1]['parts']; user = ''.join(p.get('text', '') for p in parts)
            info = {'prov': 'gemini', 'model': u.split('/models/')[1].split(':')[0], 'system': bd.get('systemInstruction', {}).get('parts', [{}])[0].get('text', ''), 'user': user, 'imgs': sum(1 for p in parts if 'inline_data' in p), 'json': bd['generationConfig'].get('responseMimeType') == 'application/json', 'auth': hd.get('x-goog-api-key', '')[:6]}
            return await self._resp(r, info, lambda txt: {'candidates': [{'content': {'parts': [{'text': txt}]}}]})
        if 'api.anthropic.com/v1/messages' in u:
            bd = json.loads(body); c = bd['messages'][-1]['content']; user = ''.join(p.get('text', '') for p in c if p['type'] == 'text')
            info = {'prov': 'anthropic', 'model': bd['model'], 'system': bd.get('system', ''), 'user': user, 'imgs': sum(1 for p in c if p['type'] == 'image'), 'json': False, 'auth': hd.get('x-api-key', '')[:6], 'browser_header': hd.get('anthropic-dangerous-direct-browser-access')}
            return await self._resp(r, info, lambda txt: {'content': [{'type': 'text', 'text': txt}]})
        if 'api.crossref.org/works/' in u:
            doi = u.split('/works/')[1]; t = self.crossref.get(doi.replace('%2F', '/'))
            return await (r.fulfill(status=200, content_type='application/json', body=json.dumps({'message': {'title': [t]}})) if t else r.fulfill(status=404, body='Resource not found'))
        await r.abort()

    async def _resp(self, r, info, wrap):
        self.seen.append(info)
        res = await self.reply(info['prov'], info['system'], info['user'], info) if self.reply else ('t', 'ok')
        if res[0] == 'err': return await r.fulfill(status=res[1], content_type='application/json', body=res[2] if len(res) > 2 else '{}')
        txt = json.dumps(res[1], ensure_ascii=False) if res[0] == 'j' else res[1]
        return await r.fulfill(status=200, content_type='application/json', body=json.dumps(wrap(txt), ensure_ascii=False))

    # ── ayudas ──
    async def esp(self, expr, n=120, ms=250):
        for _ in range(n):
            if await self.page.evaluate(expr): return True
            await self.page.wait_for_timeout(ms)
        raise TimeoutError('timeout: ' + expr)
    async def idioma(self, l):
        """Cambia el idioma con el selector de la barra superior (es|en|pt) y espera a que se repinte."""
        await self.page.select_option('#selLang', l); await self.page.wait_for_timeout(350)
    async def modelos(self, prov='openai', clave='sk-test-clave-larga-de-prueba-123'):
        """Abre los ajustes de IA, elige proveedor, pega una clave, pulsa «Ver los modelos de mi clave» y devuelve las opciones del desplegable."""
        p = self.page
        if not await p.evaluate("$('mIA').classList.contains('on')"): await p.click('#btnIA'); await p.wait_for_selector('#mIA.on')
        await p.select_option('#selProv', prov); await p.fill('#apiKey', clave); await p.click('#btnModelos')
        await self.esp(f"JSON.parse(localStorage.getItem(APP+'_models_{prov}')||'[]').length>0")
        return await p.evaluate("[...document.querySelectorAll('#selModelo option')].map(o=>o.value)")
    async def faltan_traducciones(self):
        """Claves del HTML, pasos, botones y glosario sin traducción en algún idioma activo ([] = completo)."""
        return await self.page.evaluate('i18nFaltan()')
    async def csp_bloquea(self, url='https://example.org/x'):
        return await self.page.evaluate("u=>fetch(u).then(()=>'ENVIADO').catch(()=>'bloqueado')", url) == 'bloqueado'
    async def shot(self, nombre, full=True): await self.page.screenshot(path=nombre, full_page=full)
    async def descarga(self, selector, destino):
        async with self.page.expect_download() as d: await self.page.click(selector)
        dw = await d.value; await dw.save_as(destino); return dw.suggested_filename
    async def desborde_movil(self, accion_js=None, ancho=390):
        """True si en móvil hay scroll horizontal (tras ejecutar accion_js en la página)."""
        ctx = await self.browser.new_context(viewport={'width': ancho, 'height': 800}); await ctx.route('**/*', self._route)
        pg = await ctx.new_page(); await pg.goto(self.index.as_uri()); await pg.wait_for_timeout(500)
        if accion_js: await pg.evaluate(accion_js); await pg.wait_for_timeout(1200)
        r = await pg.evaluate("document.documentElement.scrollWidth>innerWidth+2"); await ctx.close(); return r
