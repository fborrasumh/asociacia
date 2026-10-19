"""Prueba de AsociacIA con Playwright e IA simulada:  NODE_MODULES=/tmp/nm/node_modules python3 tests/suite_test.py
   Cubre: CSP, 6 idiomas, ejemplo sin clave, carpeta compartida simulada (escritura, fusión con cambios de otra persona y copias),
   flujo de generación con aviso previo (nombres, semáforo rojo), verificación de citas/cifras, revisión y aprobación,
   memoria (sin IA y con IA), gobernanza, persistencia, errores traducidos y móvil."""
import asyncio, sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from forja_test import Harness
ROOT = pathlib.Path(__file__).resolve().parent.parent
LANGS = ['es', 'ca', 'eu', 'gl', 'en', 'pt']
AYUDA = {'es': 'ayuda', 'ca': 'ajuda', 'eu': 'laguntza', 'gl': 'axuda', 'en': 'help', 'pt': 'ajuda'}

async def reply(prov, system, user, info):
    if 'memoria anual' in user:
        return ('j', {'presentacion': 'Un año de trabajo con 2 actividades.', 'valoracion': 'Se alcanzó a 777 personas. [COMPLETAR: próximos pasos]'})
    if 'Notas X' in user or 'charla' in user:   # acta: una cita real, una inventada y una cifra nueva
        return ('j', {'titulo': 'Acta de prueba', 'texto': '## Acuerdos\n1. Organizar una charla.\n2. Comprar una furgoneta.\nAsistieron 45 personas.',
                      'afirmaciones': [{'afirmacion': 'Charla', 'cita': 'Se acuerda organizar una charla para profesorado en noviembre'},
                                       {'afirmacion': 'Furgoneta', 'cita': 'Se acuerda comprar una furgoneta nueva para la sede social'}]})
    return ('j', {'titulo': 'Ficha', 'texto': 'La glucosa baja puede dar temblor. [REVISAR]', 'afirmaciones': []})

FAKE_DIR = """(() => {
  const files = {}; window.__files = files;
  const mkFile = (store, name) => ({ getFile: async () => ({ text: async () => store[name], lastModified: Date.now() }),
    createWritable: async () => { let buf = ''; return { write: async d => { buf += d; }, close: async () => { store[name] = buf; } }; } });
  const mkDir = store => ({ kind: 'directory',
    getFileHandle: async (n, o) => { if (!(n in store)) { if (!o || !o.create) { const e = new Error('nf'); e.name = 'NotFoundError'; throw e; } store[n] = ''; } return mkFile(store, n); },
    getDirectoryHandle: async (n, o) => { store['dir:' + n] = store['dir:' + n] || {}; return mkDir(store['dir:' + n]); },
    entries: async function* () { for (const k of Object.keys(store)) yield [k, null]; },
    removeEntry: async n => { delete store[n]; },
    queryPermission: async () => 'granted', requestPermission: async () => 'granted' });
  return mkDir(files);
})()"""

async def main():
    ok = True
    def check(n, c, extra=''):
        nonlocal ok; ok &= bool(c); print(('✓' if c else '✕'), n, extra)
    init = ["localStorage.setItem('asociacia_quien', JSON.stringify({n:'Ana Prueba', r:'Secretaría'}))"]
    async with Harness(ROOT / 'index.html', reply, init_scripts=init) as h:
        p = h.page
        check('CSP bloquea otros orígenes', await h.csp_bloquea())
        check('sin errores al cargar', not h.errors, str(h.errors))
        for prov, esperado in (('openai', 'gpt-5-mini'), ('gemini', 'gemini-2.5-pro'), ('anthropic', 'claude-sonnet-4-5')):
            ops = await h.modelos(prov); check(f'desplegable con los modelos de la clave ({prov})', esperado in ops and '__otro' in ops and 'whisper-1' not in ops, str(ops))
        await p.select_option('#selModelo', 'claude-sonnet-4-5'); check('elegir modelo lo guarda', await p.evaluate('getMod()') == 'claude-sonnet-4-5')
        await h.idioma('eu'); check('el desplegable se traduce (euskara)', 'Beste eredu bat' in await p.inner_text('#selModelo'))
        await h.idioma('es'); await p.keyboard.press('Escape'); await p.evaluate("localStorage.setItem(APP+'_prov','openai'); localStorage.removeItem('ia_openai_key')")
        # ── idiomas ──
        check('selector con los seis idiomas en orden', await p.evaluate("[...document.querySelectorAll('#selLang option')].map(o=>o.value).join()") == ','.join(LANGS))
        check('no faltan traducciones', await h.faltan_traducciones() == [], str((await h.faltan_traducciones())[:8]))
        for l in LANGS:
            await h.idioma(l); check(f'interfaz en {l}', (await p.inner_text('#btnHelp')).strip().lower() == AYUDA[l] and await p.evaluate('document.documentElement.lang') == l)
        await h.idioma('gl'); await p.reload(); await p.wait_for_timeout(600)
        check('el idioma persiste al recargar', await p.evaluate('LANG') == 'gl')
        await h.idioma('es')
        # ── ejemplo sin clave ──
        await p.click('#btnEjemplo'); await h.esp('step===4')
        check('ejemplo: 3 piezas y banner', await p.locator('#piezasList tbody tr').count() == 3 and await p.is_visible('#banEj'))
        check('ejemplo: el acta marca la cita inventada y no se puede aprobar', '⚠' in await p.inner_text('#piezaDet') and await p.is_disabled('#piezaDet [data-acc=apr]'))
        for l in ['eu', 'ca']:
            await h.idioma(l); await p.wait_for_timeout(300)
            check(f'ejemplo en {l}: se rehace en ese idioma y las citas siguen verificándose', await p.evaluate("S.exp.piezas[0].afirm.map(a=>a.ok).join()") == 'true,true,false,true' and await p.evaluate("S.exp.perfil.mision") in json.dumps(await p.evaluate('EJ_TXT'), ensure_ascii=False))
        await h.idioma('es')
        await p.evaluate('go(5)'); await p.wait_for_timeout(200)
        check('ejemplo: memoria calculada por código', 'Actividades realizadas: 4' in await p.inner_text('#memRes'))
        await p.evaluate('go(6)'); await p.wait_for_timeout(200)
        check('ejemplo: gobernanza con pendientes y protocolo', 'Protocolo interno' in await p.input_value('#proto') and await p.locator('#gobPend [data-irpz]').count() == 3)
        await p.click('#btnSalirEj'); await p.wait_for_timeout(200)
        check('salir del ejemplo', await p.evaluate('!S.esEjemplo && !S.exp'))
        # ── nuevo expediente y carpeta simulada ──
        await p.evaluate('go(1)'); await p.click('#btnNuevo'); await h.esp('step===2')
        await p.fill('#p_nombre', 'Asociación de Prueba'); await p.wait_for_timeout(100)
        check('perfil editable y guardado en el expediente', await p.evaluate('S.exp.perfil.nombre') == 'Asociación de Prueba')
        await p.evaluate(f'Carpeta.dir = {FAKE_DIR}; CARP.estado="ok"')
        check('sincronizar escribe el expediente en la carpeta', await p.evaluate("sincroniza(true)") and await p.evaluate(f"JSON.parse(__files['{'asociacia-expediente.json'}']).perfil.nombre") == 'Asociación de Prueba')
        check('copia diaria en copias-asociacia', await p.evaluate("Object.keys(__files['dir:copias-asociacia']||{}).length") == 1)
        check('el JSON de la carpeta no contiene claves de IA', 'sk-' not in await p.evaluate("__files['asociacia-expediente.json']"))
        # otra persona añade una actividad en la carpeta mientras aquí se edita el perfil
        await p.evaluate("""(()=>{const o=JSON.parse(__files['asociacia-expediente.json']); o.actividades.push({id:'ac_otra',fecha:'2026-09-01',tipo:'Proyecto',titulo:'Actividad de otra persona',personas:12,mod:new Date().toISOString()}); __files['asociacia-expediente.json']=JSON.stringify(o);})()""")
        await p.fill('#p_mision', 'Misión escrita aquí'); await p.wait_for_timeout(100)
        await p.evaluate('sincroniza(true)')
        res = await p.evaluate("(()=>{const o=JSON.parse(__files['asociacia-expediente.json']); return [o.actividades.length, o.perfil.mision, S.exp.actividades.length];})()")
        check('fusión: se conservan los cambios de las dos personas', res == [1, 'Misión escrita aquí', 1], str(res))
        # ── generación con IA simulada ──
        await p.evaluate("localStorage.setItem('ia_openai_key','sk-test'); S.mod='reu'; S.tarea='reu.acta'; go(3)")
        notas = 'Reunión con Marta García (marta@correo.es). Se acuerda organizar una charla para profesorado en noviembre. Notas X.'
        await p.fill('#tf_notas', notas); await p.click('#btnGenerar'); await p.wait_for_selector('#mEnvio.on', timeout=5000)
        check('aviso previo: detecta el nombre y enmascara el correo', 'Marta García' in await p.inner_text('#envioInfo') and 'marta@correo.es' not in await p.inner_text('#envioTxt'))
        await p.check('#envioOk'); await p.click('#envioSi'); await h.esp("S.ultima && S.exp.piezas.length===1")
        u = h.seen[-1]['user']
        check('lo enviado no lleva nombre ni correo y pide español', 'Marta' not in u and 'marta@' not in u and '[PERSONA1]' in u and 'español' in u)
        check('la IA recibe el perfil y las reglas clínicas', 'Asociación de Prueba' in h.seen[-1]['system'] and 'Nunca des dosis' in h.seen[-1]['system'])
        pz = await p.evaluate('S.exp.piezas[0]')
        check('cita real ✓, cita inventada ⚠ y cifra nueva detectada', [a['ok'] for a in pz['afirm']] == [True, False] and '45' in pz['chk']['av']['nuevos'])
        check('registro de uso con proveedor y modelo, sin contenido', await p.evaluate("S.exp.traza.at(-1).acc==='ia' && !!S.exp.traza.at(-1).modelo && !JSON.stringify(S.exp.traza).includes('furgoneta')"))
        # ── revisión y aprobación ──
        await p.click('#tareaRes [data-acc=ver]'); await h.esp('step===4')
        check('no se aprueba con una cita inventada', await p.is_disabled('#piezaDet [data-acc=apr]'))
        await p.click('#piezaDet [data-descarta="1"]'); await p.wait_for_timeout(150)
        await p.click('#piezaDet [data-acc=rev]'); await p.wait_for_timeout(150)
        check('tras descartar y revisar, se puede aprobar', not await p.is_disabled('#piezaDet [data-acc=apr]'))
        await p.click('#piezaDet [data-acc=apr]'); await p.wait_for_timeout(150)
        check('pieza aprobada y anotada', await p.evaluate("S.exp.piezas[0].estado==='aprobada' && S.exp.traza.some(x=>x.acc==='aprobada')"))
        await h.descarga('#piezaDet [data-acc=word]', '/tmp/pieza.docx'); check('Word de la pieza', pathlib.Path('/tmp/pieza.docx').stat().st_size > 1000)
        await p.fill('#pzTxt', 'Texto editado'); await p.click('#pzGuardar'); await p.wait_for_timeout(150)
        check('editar anula la aprobación', await p.evaluate("S.exp.piezas[0].estado==='borrador' && !S.exp.piezas[0].aprob"))
        # ── semáforo rojo y revisión sanitaria ──
        await p.evaluate("S.mod='edu'; S.tarea='edu.ficha'; go(3)")
        await p.fill('#tf_fuente', 'Ante una bajada, la persona se pone 4 unidades de insulina según su pauta.'); await p.click('#btnGenerar'); await p.wait_for_selector('#mEnvio.on')
        await p.check('#envioOk')
        check('semáforo rojo: no se envía sin la confirmación específica', await p.is_disabled('#envioSi'))
        await p.check('#rojoOk'); await p.click('#envioSi'); await h.esp('S.exp.piezas.length===2')
        f = await p.evaluate('S.exp.piezas[0]')
        check('la ficha exige revisión sanitaria', f['chk']['requiereSan'] and await p.evaluate("bloqueoAprobar(S.exp.piezas[0])") in ('revisar', 'sanitaria'))
        # ── memoria ──
        await p.evaluate('go(5)'); await p.fill('#aFecha', '2026-09-15'); await p.fill('#aTit', 'Taller de prueba'); await p.fill('#aPers', '20'); await p.click('#btnAct'); await p.wait_for_timeout(150)
        await p.click('#btnMemCod'); await p.wait_for_timeout(150)
        check('memoria sin IA: cifras del registro', 'Personas alcanzadas (suma de los registros): 32' in await p.inner_text('#memRes'))
        await p.click('#btnMemIA'); await p.wait_for_timeout(300)
        if await p.is_visible('#mEnvio.on'): await p.check('#envioOk'); await p.click('#envioSi')
        await h.esp('S.mem.narr')
        check('memoria con IA: avisa de la cifra inventada', '777' in await p.inner_text('#memRes'))
        await h.descarga('#btnMemWord', '/tmp/memoria.docx'); check('Word de la memoria', pathlib.Path('/tmp/memoria.docx').stat().st_size > 1000)
        await h.descarga('#btnMemCsv', '/tmp/act.csv'); check('CSV de actividades con BOM y ;', pathlib.Path('/tmp/act.csv').read_bytes()[:3] == b'\xef\xbb\xbf' and b';' in pathlib.Path('/tmp/act.csv').read_bytes())
        # ── gobernanza ──
        await p.evaluate('go(6)'); await p.wait_for_timeout(150)
        check('protocolo con el nombre de la asociación', 'Asociación de Prueba' in await p.input_value('#proto'))
        await h.descarga('#btnProtoWord', '/tmp/proto.docx'); await h.descarga('#btnTrazaCsv', '/tmp/traza.csv')
        check('Word del protocolo y CSV del registro', pathlib.Path('/tmp/proto.docx').stat().st_size > 1000 and pathlib.Path('/tmp/traza.csv').stat().st_size > 50)
        # ── idioma de la IA y errores traducidos ──
        await h.idioma('eu'); await p.evaluate("S.mod='reu'; S.tarea='reu.acta'; go(3)"); await p.fill('#tf_notas', 'Se acuerda organizar una charla para profesorado en noviembre.')
        await p.click('#btnGenerar'); await h.esp('S.exp.piezas.length===3')
        check('en euskara, la IA recibe el idioma', 'euskara' in h.seen[-1]['user'])
        await h.idioma('ca'); h.reply = lambda *a: asyncio.sleep(0, ('err', 429, '{"error":{"message":"You exceeded your current quota, billing"}}'))
        await p.click('#btnGenerar'); await p.wait_for_timeout(2500)
        check('error de saldo traducido al català', 'no té saldo' in await p.inner_text('#tareaEstado'), await p.inner_text('#tareaEstado'))
        await h.idioma('es')
        # ── persistencia ──
        n = await p.evaluate('S.exp.piezas.length'); await p.reload(); await p.wait_for_timeout(800)
        check('persistencia tras recargar', await p.evaluate('S.exp && S.exp.piezas.length') == n)
        check('sin errores de página', not h.errors, str(h.errors))
        await p.evaluate('go(0)'); await h.shot('/tmp/as_portada.png')
        await p.evaluate('go(3)'); await h.shot('/tmp/as_modulos.png')
        await p.evaluate("S.pieza=S.exp.piezas[0].id; go(4)"); await h.shot('/tmp/as_piezas.png')
        for l in LANGS:
            check(f'sin desborde en móvil ({l})', not await h.desborde_movil(f"localStorage.setItem(APP+'_lang','{l}');initI18n();entraEjemplo();pintaBanner();go(4)"))
    sys.exit(0 if ok else 1)
asyncio.run(main())
