/* ══ AsociacIA · interfaz. Estado local S (IndexedDB) con el EXPEDIENTE dentro; el expediente se sincroniza con la carpeta compartida.
   Patrón Forja: la IA propone, el código comprueba; datos en el estado, frases traducidas al pintar. ══ */
const STEPS = ['Inicio', 'Expediente', 'Perfil', 'Módulos', 'Piezas', 'Memoria', 'Gobernanza'];
const NAV = [['Empezar', 'Prueba el ejemplo: no necesita clave ni carpeta.'], ['Siguiente: perfil', 'Conecta la carpeta o abre el expediente.'], ['Siguiente: módulos', 'Los cambios se guardan solos en el expediente.'],
  ['Siguiente: piezas', 'Cada resultado se guarda como pieza en borrador.'], ['Siguiente: memoria', 'Revisa y aprueba las piezas.'], ['Siguiente: gobernanza', 'Registra actividades y genera la memoria.'], ['Volver al inicio', 'Revisa los pendientes y el protocolo.']];
const RENDER = {0: pintaInicio, 1: pintaExpediente, 2: pintaPerfil, 3: pintaModulos, 4: pintaPiezas, 5: pintaMemoria, 6: pintaGobernanza};
const GLOS = [
  ['¿Qué es AsociacIA?', 'Una suite de IA para asociaciones de pacientes: nueve módulos para comunicar, educar, gestionar, conseguir financiación, justificar y gobernar el uso de la IA.'],
  ['El expediente', 'Un único archivo JSON en la carpeta compartida de la asociación (Drive u OneDrive). Contiene el perfil, las piezas, las actividades, las plantillas y el registro de uso. Quien accede a la carpeta accede al expediente.'],
  ['Varias personas a la vez', 'Al guardar, la suite lee la versión de la carpeta y fusiona los cambios elemento a elemento: gana la versión más reciente de cada pieza o actividad. Además guarda una copia diaria en la carpeta copias-asociacia.'],
  ['Privacidad', 'Antes de enviar nada a la IA, el código enmascara correos, DNI, teléfonos, IBAN y números de historia, y te avisa de posibles nombres y edades. No uséis historias clínicas ni listados de socios.'],
  ['Límites clínicos', 'La suite no da dosis ni pautas individuales. Todo contenido de salud se marca para revisión sanitaria y no se puede aprobar sin ella.'],
  ['Qué comprueba el código', 'Citas literales frente al material aportado, cifras que no estaban en los datos, enlaces ajenos a las fuentes aprobadas, expresiones que la asociación evita y datos pendientes de completar.'],
  ['Tu clave de IA', 'Funciona con OpenAI, Google Gemini o Anthropic Claude. Cada persona pone su clave en su navegador; nunca se guarda en el expediente. Fijad un límite de gasto en el proveedor.'],
  ['Idiomas', 'La interfaz está en castellano, català, euskara, galego, English y português. Los resultados de la IA salen en el idioma elegido.']
];
let S = {exp: null, esEjemplo: false, expPrev: null, mod: 'com', tarea: 'com.post', val: {}, ultima: null, pieza: null, f: {mod: '', est: '', txt: ''}, mem: {desde: '', hasta: '', narr: null, avisos: null, ver: false}, sinSubir: false, subida: '', copia: ''};
let ENVIO_OK = false;
const CARP = {estado: 'no'};   // no | ok | permiso | nosoporta | error  (solo en memoria)

/* ── utilidades de pintado ── */
const chip = (cls, tx) => `<span class="fa-chip ${cls}">${esc(tx)}</span>`;
const fmtF = iso => iso ? new Date(iso).toLocaleString(locale(), {dateStyle: 'short', timeStyle: 'short'}) : '—';
const fmtD = d => d ? new Date(d + 'T12:00:00').toLocaleDateString(locale()) : '—';
const modDe = id => MODULOS.find(m => m.id === id) || {n: id, c: '#5D7691', ico: 'doc'};
const estChip = e => chip(e === 'aprobada' ? 'ok' : e === 'revisada' ? 'aviso' : '', t(ESTADOS[e] || e));
const quien = () => { try { return JSON.parse(localStorage.getItem(APP + '_quien') || '{}'); } catch { return {}; } };
const firma = () => { const q = quien(); return q.n ? q.n + (q.r ? ` (${q.r})` : '') : ''; };
function pideFirma() { if (firma()) return true; const n = prompt(t('Escribe tu nombre para firmar el registro de uso:')); if (!n || !n.trim()) return false; localStorage.setItem(APP + '_quien', JSON.stringify({n: n.trim(), r: ''})); return true; }
const traza = (acc, extra = {}) => { S.exp.traza.push({id: uid('tr_'), f: ahora(), mod: ahora(), q: firma() || '—', acc, ...extra}); };
const ACC = {ia: L('Llamada a la IA'), 'ia-memoria': L('Memoria redactada con IA'), revisada: L('Revisada'), revSan: L('Revisión sanitaria'), aprobada: L('Aprobada'), editada: L('Editada'), eliminada: L('Eliminada'), afirmacion: L('Afirmación descartada')};
const repinta = () => (RENDER[step] || (() => {}))();

/* ── expediente: cambios, guardado local y sincronización con la carpeta ── */
let _sub;
function cambio() { if (!S.exp) return; S.exp.mod = ahora(); S.exp.modPor = firma(); S.sinSubir = !S.esEjemplo; guarda(); clearTimeout(_sub); if (!S.esEjemplo && CARP.estado === 'ok') _sub = setTimeout(() => sincroniza(true), 2500); pintaCarpEstado(); }
async function sincroniza(escribir = false) {
  if (S.esEjemplo || !Carpeta.dir) return false;
  try {
    if (!(await Carpeta.permiso(false))) { CARP.estado = 'permiso'; pintaCarpEstado(); return false; }
    const r = await Carpeta.lee(); let exp = S.exp;
    if (r && r.exp) {
      if (exp && exp.id !== r.exp.id) { CARP.estado = 'error'; pintaCarpEstado(); toast(t('La carpeta contiene otro expediente. Ábrelo desde «Expediente» o conecta otra carpeta.'), 8000); return false; }
      exp = exp ? fusiona(exp, r.exp) : r.exp;
    }
    if (!exp) return false;
    const cambiado = !r || !r.exp || canon(exp) !== canon(r.exp);
    if ((escribir || S.sinSubir) && cambiado) {
      exp.rev = (exp.rev || 0) + 1; await Carpeta.escribe(exp);
      if (S.copia !== hoyISO()) { try { await Carpeta.copia(exp); S.copia = hoyISO(); } catch {} }
    }
    S.exp = exp; S.sinSubir = false; S.subida = ahora(); CARP.estado = 'ok'; await guardaYa(); pintaCarpEstado(); return true;
  } catch (e) { CARP.estado = 'error'; pintaCarpEstado(); toast(t('No se pudo leer o escribir en la carpeta: {0}', e.message), 8000); return false; }
}
function pintaCarpEstado() {
  const el = $('carpEstado'); if (!el) return;
  const m = {no: t('No hay carpeta conectada.'), ok: t('Conectada. Última sincronización: {0}.', fmtF(S.subida)), permiso: t('La carpeta está recordada, pero el navegador pide permiso de nuevo: pulsa «Conectar carpeta».'), nosoporta: t('Este navegador no permite conectar carpetas: usa «Abrir expediente» y «Descargar expediente», o abre la suite en Chrome o Edge de escritorio.'), error: t('Hubo un problema con la carpeta. Revisa la conexión o vuelve a conectarla.')}[CARP.estado];
  el.innerHTML = esc(m) + (S.sinSubir && CARP.estado === 'ok' ? ' ' + chip('aviso', t('Cambios pendientes de guardar')) : '');
}
async function conectaCarpeta() {
  if (!Carpeta.soporta()) { CARP.estado = 'nosoporta'; return pintaCarpEstado(); }
  try {
    if (Carpeta.dir && CARP.estado === 'permiso' && await Carpeta.permiso(true)) { await sincroniza(true); return pintaExpediente(); }
    await Carpeta.elegir(); const r = await Carpeta.lee();
    if (S.esEjemplo) saleEjemplo(false);
    if (r && r.exp && S.exp && r.exp.id !== S.exp.id) {
      if ((S.exp.piezas.length || S.exp.actividades.length) && !confirm(t('La carpeta ya tiene un expediente («{0}»). ¿Abrirlo? Se descargará una copia del que tienes abierto ahora.', r.exp.perfil.nombre || '—'))) { Carpeta.dir = null; CARP.estado = 'no'; return pintaCarpEstado(); }
      if (S.exp.piezas.length || S.exp.actividades.length) dl('copia-' + ARCHIVO, JSON.stringify(S.exp, null, 1), 'application/json');
      S.exp = null;
    }
    if (!S.exp && !(r && r.exp)) S.exp = nuevoExpediente($('selPreset').value);
    CARP.estado = 'ok'; await sincroniza(true); pintaBanner(); toast(t('Carpeta conectada')); pintaExpediente();
  } catch (e) { if (e.name !== 'AbortError') { CARP.estado = 'error'; pintaCarpEstado(); toast(e.message, 7000); } }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && CARP.estado === 'ok') sincroniza(false).then(ok => { if (ok) repinta(); }); });

/* ── ejemplo: asociación ficticia con piezas ya generadas (respuestas precalculadas, sin IA) ── */
function construyeEjemplo(l) {
  const x = EJ_TXT[l] || EJ_TXT.es, e = nuevoExpediente('diabetes'); e.id = 'exp_ejemplo';
  Object.assign(e.perfil, {nombre: 'Asociación Diabetes Costa Blanca (' + t('ficticia') + ')', siglas: 'ADCB', territorio: 'Alicante', mision: x.mision, publicos: x.publicos, tono: x.tono, evitar: EJ_EVITAR[l] || EJ_EVITAR.es, revisor: t('Enfermera educadora en diabetes del comité asesor')});
  const mk = (id, tid, valores, raw, extra) => { const ta = tareaDe(tid), v = verificaSalida(raw, {tarea: ta, valores, perfil: e.perfil});
    return {id, modulo: ta.mod, tarea: tid, titulo: v.titulo, texto: v.texto, afirm: v.afirm, chk: {av: v.av, requiereSan: v.requiereSan}, valores, estado: 'borrador', autor: 'Secretaría', creado: '2026-10-06T10:00:00.000Z', mod: '2026-10-06T10:00:00.000Z', prov: 'openai', modelo: '—', rev: null, revSan: null, aprob: null, ...extra}; };
  e.piezas = [
    mk('pz_ej1', 'reu.acta', {notas: x.notas, tipoReu: 'Junta directiva', fecha: '2026-10-03'}, {titulo: x.actaT, texto: x.acta, afirmaciones: x.af.map(([a, c]) => ({afirmacion: a, cita: c}))}),
    mk('pz_ej2', 'edu.ficha', {fuente: x.fuente, nivel: 'Profesorado'}, {titulo: x.fichaT, texto: x.ficha, afirmaciones: x.af2.map(([a, c]) => ({afirmacion: a, cita: c}))}, {estado: 'revisada', rev: {q: 'Comunicación', f: '2026-10-07T09:00:00.000Z'}}),
    mk('pz_ej3', 'com.post', {tema: x.postT, red: 'Instagram'}, {titulo: x.postT, texto: x.post, afirmaciones: []})];
  e.actividades = x.acts.map(([f, ti, tit, n], i) => ({id: 'ac_ej' + i, fecha: f, tipo: TIPOS_ACT[ti], titulo: tit, personas: n, descripcion: '', mod: '2026-10-06T10:00:00.000Z'}));
  e.traza = [{id: 'tr_ej1', f: '2026-10-06T10:00:00.000Z', q: 'Secretaría', acc: 'ia', modulo: 'reu', tarea: 'reu.acta', prov: 'openai', modelo: '—', cin: 1850, cout: 920}, {id: 'tr_ej2', f: '2026-10-07T09:00:00.000Z', q: 'Comunicación', acc: 'revisada', pieza: 'pz_ej2', modulo: 'edu'}];
  return e;
}
function entraEjemplo() { if (!S.esEjemplo) S.expPrev = S.exp; S.exp = construyeEjemplo(LANG); S.esEjemplo = true; S.pieza = 'pz_ej1'; S.mem = {desde: '2025-10-01', hasta: '2026-09-30', narr: null, avisos: null, ver: true}; guarda(); }
function saleEjemplo(pinta = true) { S.exp = S.expPrev || null; S.expPrev = null; S.esEjemplo = false; S.pieza = null; S.mem = {desde: '', hasta: '', narr: null, avisos: null, ver: false}; guarda(); if (pinta) { pintaBanner(); repinta(); } }
window.addEventListener('langchange', () => { if (S.esEjemplo) { S.exp = construyeEjemplo(LANG); guarda(); } pintaBanner(); });
function pintaBanner() {
  let b = $('banEj'); if (!b) { b = document.createElement('div'); b.id = 'banEj'; b.className = 'as-banner'; $('app').prepend(b); }
  b.innerHTML = S.esEjemplo ? `<span>${esc(t('Estás viendo una asociación ficticia de ejemplo. Nada se guarda en ninguna carpeta.'))}</span><button class="btn btn-ghost btn-sm" type="button" id="btnSalirEj">${esc(t('Salir del ejemplo'))}</button>` : '';
  b.hidden = !S.esEjemplo; if ($('btnSalirEj')) $('btnSalirEj').onclick = () => saleEjemplo(true);
}

/* ── 0 · inicio ── */
function tarjetaModulo(m, sel) { return `<button type="button" class="as-mod${sel ? ' sel' : ''}" data-mod="${m.id}" style="--c:${m.c}" aria-pressed="${sel ? 'true' : 'false'}"><span class="as-mod-ico">${ico(m.ico)}</span><b>${esc(t(m.n))}</b><span>${esc(t(m.d))}</span></button>`; }
function pintaInicio() {
  $('modsPortada').innerHTML = MODULOS.map(m => tarjetaModulo(m, false)).join('');
  $$('#modsPortada [data-mod]').forEach(b => b.onclick = () => abreModulo(b.dataset.mod));
  $('inicioProj').innerHTML = S.exp && !S.esEjemplo ? `${esc(t('Expediente abierto: {0}.', S.exp.perfil.nombre || t('sin nombre')))} <button class="btn btn-ghost btn-sm" id="btnCont" type="button">${esc(t('Continuar'))}</button>` : '';
  if ($('btnCont')) $('btnCont').onclick = () => go(3);
}
function abreModulo(id) { const m = modDe(id); if (m.paso) return go(m.paso); S.mod = id; if (tareaDe(S.tarea)?.mod !== id) S.tarea = TAREAS.find(x => x.mod === id).id; guarda(); go(3); }
$('btnStart').onclick = () => go(S.exp ? 3 : 1);
$('btnEjemplo').onclick = () => { entraEjemplo(); pintaBanner(); go(4); toast(t('Ejemplo de demostración, sin usar la IA')); };

/* ── 1 · expediente ── */
function pintaExpediente() {
  const e = S.exp, q = quien(); $('quienN').value = q.n || ''; $('quienR').value = q.r || '';
  if (!Carpeta.soporta()) { CARP.estado = 'nosoporta'; $('btnCarpeta').disabled = true; }
  $('btnGuardarCarp').disabled = CARP.estado !== 'ok';
  $('expEstado').innerHTML = !e ? `<p class="empty">${esc(t('Aún no hay expediente. Conecta la carpeta de la asociación, abre un expediente existente o crea uno nuevo.'))}</p>`
    : `<h3>${ico('archive')}<span>${esc(e.perfil.nombre || t('Expediente sin nombre'))}</span></h3><div class="as-kpis">
      <div><b>${e.piezas.length}</b><span>${esc(t('piezas'))}</span></div><div><b>${e.actividades.length}</b><span>${esc(t('actividades'))}</span></div><div><b>${e.plantillas.length}</b><span>${esc(t('plantillas'))}</span></div><div><b>${e.traza.filter(x => x.acc === 'ia').length}</b><span>${esc(t('llamadas a la IA'))}</span></div></div>
      <p class="help">${esc(t('Última modificación: {0}{1}.', fmtF(e.mod), e.modPor ? ' · ' + e.modPor : ''))}${S.esEjemplo ? ' ' + chip('aviso', t('Ejemplo')) : ''}</p>`;
  pintaCarpEstado();
}
$('btnCarpeta').onclick = conectaCarpeta;
$('btnGuardarCarp').onclick = async () => { if (await sincroniza(true)) { toast(t('Expediente guardado en la carpeta')); pintaExpediente(); } };
$('btnNuevo').onclick = () => {
  const lleno = S.exp && !S.esEjemplo && (S.exp.piezas.length || S.exp.actividades.length);
  if (lleno && !confirm(t('Ya hay un expediente abierto con contenido. ¿Crear uno nuevo? Se descargará una copia del actual.'))) return;
  if (lleno) dl('copia-' + ARCHIVO, JSON.stringify(S.exp, null, 1), 'application/json');
  if (S.esEjemplo) saleEjemplo(false);
  S.exp = nuevoExpediente($('selPreset').value); Carpeta.dir = null; CARP.estado = Carpeta.soporta() ? 'no' : 'nosoporta'; cambio(); pintaBanner(); toast(t('Expediente creado. Completa el perfil y conecta la carpeta.')); go(2);
};
$('fileExp').onchange = async ev => {
  const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
  let o; try { o = validaExpediente(JSON.parse(await f.text())); } catch { o = null; }
  if (!o) return toast(t('Ese archivo no es un expediente de AsociacIA'), 6000);
  if (S.esEjemplo) saleEjemplo(false);
  if (S.exp && S.exp.id === o.id) { S.exp = fusiona(S.exp, o); toast(t('Expediente abierto y fusionado con tus cambios')); }
  else { if (S.exp && (S.exp.piezas.length || S.exp.actividades.length) && !confirm(t('Vas a sustituir el expediente abierto por «{0}». ¿Continuar?', o.perfil.nombre || '—'))) return; S.exp = o; toast(t('Expediente abierto')); }
  cambio(); pintaBanner(); pintaExpediente();
};
$('btnBajarExp').onclick = () => { if (!S.exp) return toast(t('No hay expediente abierto')); dl(ARCHIVO, JSON.stringify(S.exp, null, 1), 'application/json'); if (!S.esEjemplo) { S.sinSubir = false; guarda(); } };
['quienN', 'quienR'].forEach(id => $(id).addEventListener('input', () => localStorage.setItem(APP + '_quien', JSON.stringify({n: $('quienN').value.trim(), r: $('quienR').value.trim()}))));

/* ── 2 · perfil y biblioteca ── */
function pintaPerfil() {
  const p = S.exp?.perfil; $$('[data-p]').forEach(el => { el.value = p ? (p[el.dataset.p] || '') : ''; el.disabled = !p || S.esEjemplo; });
  const prox = p ? proximasFechas(p.calendario) : [];
  $('proxFechas').innerHTML = prox.length ? esc(t('Próximas fechas clave: {0}', prox.map(x => `${fmtD(x.f)} · ${x.n}`).join(' — '))) : '';
  const pl = S.exp?.plantillas || [];
  $('plantillasList').innerHTML = !S.exp ? `<p class="empty">${esc(t('Abre o crea el expediente para editar el perfil.'))}</p>` : pl.length
    ? `<ul class="as-list">${pl.map(x => `<li><b>${esc(x.nombre)}</b> <span class="muted">${esc(t(tareaDe(x.tarea)?.n || x.tarea))}</span> <button class="btn btn-ghost btn-sm" type="button" data-usapl="${x.id}">${esc(t('Usar'))}</button><button class="btn btn-ghost btn-sm" type="button" data-borrapl="${x.id}" aria-label="${esc(t('Eliminar'))}">${ico('trash')}</button></li>`).join('')}</ul>`
    : `<p class="empty">${esc(t('Aún no hay plantillas.'))}</p>`;
  $$('[data-usapl]').forEach(b => b.onclick = () => usaPlantilla(b.dataset.usapl));
  $$('[data-borrapl]').forEach(b => b.onclick = () => { if (!confirm(t('¿Eliminar esta plantilla?'))) return; S.exp.borrados.push(b.dataset.borrapl); S.exp.plantillas = S.exp.plantillas.filter(x => x.id !== b.dataset.borrapl); cambio(); pintaPerfil(); });
}
function proximasFechas(cal) {
  const y = new Date().getFullYear(), h = hoyISO();
  return lineas(cal).map(l => { const [d, ...n] = l.split('|'); const m = d.trim().match(/^(?:(\d{4})-)?(\d{2})-(\d{2})$/); if (!m) return null; let f = `${m[1] || y}-${m[2]}-${m[3]}`; if (!m[1] && f < h) f = `${y + 1}-${m[2]}-${m[3]}`; return {f, n: n.join('|').trim()}; })
    .filter(x => x && x.f >= h).sort((a, b) => (a.f < b.f ? -1 : 1)).slice(0, 3);
}
$$('[data-p]').forEach(el => el.addEventListener('input', () => { if (!S.exp || S.esEjemplo) return; S.exp.perfil[el.dataset.p] = el.value; S.exp.perfil.mod = ahora(); cambio(); }));

/* ── 3 · módulos de trabajo ── */
function pintaModulos() {
  $('modSel').innerHTML = MODULOS.filter(m => MOD_TRABAJO.includes(m.id)).map(m => tarjetaModulo(m, m.id === S.mod)).join('');
  $$('#modSel [data-mod]').forEach(b => b.onclick = () => { S.mod = b.dataset.mod; S.tarea = TAREAS.find(x => x.mod === S.mod).id; guarda(); pintaModulos(); });
  const ts = TAREAS.filter(x => x.mod === S.mod); if (!ts.some(x => x.id === S.tarea)) S.tarea = ts[0].id;
  $('tareaTabs').innerHTML = ts.map(x => `<button type="button" data-tarea="${x.id}" aria-pressed="${x.id === S.tarea}">${esc(t(x.n))}</button>`).join('');
  $$('#tareaTabs [data-tarea]').forEach(b => b.onclick = () => { S.tarea = b.dataset.tarea; guarda(); pintaModulos(); });
  pintaForm();
  const p = S.exp?.piezas.find(x => x.id === S.ultima && x.tarea === S.tarea);
  $('tareaRes').innerHTML = p ? piezaHtml(p, true) : `<p class="empty">${esc(t('El resultado aparecerá aquí, con las comprobaciones del código.'))}</p>`;
  if (p) enlazaPieza(p, true);
  $('tareaEstado').textContent = !S.exp ? t('Abre o crea el expediente para trabajar.') : S.esEjemplo ? t('En el ejemplo se pueden ver las piezas ya generadas. Para generar, sal del ejemplo.') : '';
}
function pintaForm() {
  const ta = tareaDe(S.tarea), v = S.val[S.tarea] || (S.val[S.tarea] = {}), pubs = lineas(S.exp?.perfil.publicos);
  $('tareaForm').innerHTML = ta.campos.map(c => { const C = CAMPOS[c], id = 'tf_' + c, lab = `<label for="${id}">${esc(t(C.label))}${C.opc ? '' : ' *'}</label>`, val = v[c] ?? '';
    let inp;
    if (C.tipo === 'area') inp = `<textarea id="${id}" data-campo="${c}" rows="${C.filas || (C.fuente ? 6 : 3)}">${esc(val)}</textarea>`;
    else if (C.tipo === 'select') inp = `<select id="${id}" data-campo="${c}">${C.op.map(o => `<option value="${esc(o)}"${o === val ? ' selected' : ''}>${esc(C.tr === false ? o : t(o))}</option>`).join('')}</select>`;
    else inp = `<input type="${C.tipo === 'date' ? 'date' : 'text'}" id="${id}" data-campo="${c}" value="${esc(val)}"${C.sug ? ` list="dl_${c}"` : ''}>${C.sug ? `<datalist id="dl_${c}">${pubs.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}`;
    const arch = C.archivo ? `<label class="btn btn-ghost btn-sm as-arch" for="ar_${c}">${ico('upload')}<span>${esc(t('Cargar archivo'))}</span></label><input type="file" id="ar_${c}" data-arch="${c}" accept=".docx,.pdf,.pptx,.txt,.md,.csv" hidden>` : '';
    return `<div class="field">${lab}${inp}${arch}${C.help ? `<p class="help">${esc(t(C.help))}</p>` : ''}</div>`; }).join('');
  ta.campos.forEach(c => { const el = $('tf_' + c); if (CAMPOS[c].tipo === 'select' && !v[c]) v[c] = el.value; el.addEventListener(CAMPOS[c].tipo === 'select' ? 'change' : 'input', () => { v[c] = el.value; guarda(); }); });
  $$('#tareaForm [data-arch]').forEach(inp => inp.onchange = async () => { const f = inp.files[0]; inp.value = ''; if (!f) return;
    try { const r = await extrae(f); if (!r.texto || !r.texto.trim()) return toast(t('El archivo no tiene texto que se pueda leer'), 6000); const c = inp.dataset.arch; v[c] = r.texto.trim(); $('tf_' + c).value = v[c]; guarda(); toast(t('Texto cargado: {0} palabras', nf(wc(v[c])))); } catch (e) { toast(e.message, 7000); } });
  const pls = (S.exp?.plantillas || []).filter(x => x.tarea === S.tarea);
  $('selPlantilla').innerHTML = `<option value="">${esc(t('Usar plantilla…'))}</option>` + pls.map(x => `<option value="${x.id}">${esc(x.nombre)}</option>`).join('');
  $('selPlantilla').hidden = !pls.length;
}
function usaPlantilla(id) { const x = S.exp.plantillas.find(p => p.id === id); if (!x) return; S.tarea = x.tarea; S.mod = tareaDe(x.tarea).mod; S.val[x.tarea] = {...(S.val[x.tarea] || {}), ...x.valores}; guarda(); go(3); toast(t('Plantilla aplicada')); }
$('selPlantilla').onchange = () => { if ($('selPlantilla').value) usaPlantilla($('selPlantilla').value); };
$('btnPlantilla').onclick = () => {
  if (!S.exp || S.esEjemplo) return toast(t('Abre tu expediente para guardar plantillas'));
  const ta = tareaDe(S.tarea), n = prompt(t('Nombre de la plantilla:'), t(ta.n)); if (!n) return;
  const valores = {}; ta.campos.filter(c => !CAMPOS[c].fuente).forEach(c => { if (S.val[S.tarea]?.[c]) valores[c] = S.val[S.tarea][c]; });
  S.exp.plantillas.push({id: uid('pl_'), tarea: S.tarea, nombre: n.trim(), valores, mod: ahora()}); cambio(); pintaForm(); toast(t('Plantilla guardada en la biblioteca'));
};

/* aviso previo al envío: datos enmascarados, posibles nombres, edades y semáforo clínico */
let envioRes = null;
function pideEnvio(an, ta) {
  if (ENVIO_OK && !an.nombres.length && !an.edades.length && !an.rojo) return Promise.resolve({ok: true, nombres: []});
  $('envioInfo').innerHTML = `<p class="sub" style="margin-top:0">${esc(t('Se enviará el encargo a {0}. Se han enmascarado {1} dato(s) personales.', PROV[getProv()].n, an.n))}</p>`
    + (an.rojo ? `<div class="aviso as-rojo"><b>${esc(t('Semáforo rojo: parece una consulta de dosis o tratamiento.'))}</b> ${esc(t('La suite no da pautas clínicas: eso corresponde al equipo sanitario.'))}<label class="fa-chk" style="margin-top:8px"><input type="checkbox" id="rojoOk"> <span>${esc(t('Confirmo que es contenido general y no una consulta sobre una persona concreta.'))}</span></label></div>` : '')
    + (an.nombres.length ? `<div class="aviso"><b>${esc(t('Posibles nombres de personas:'))}</b> ${esc(t('los marcados se sustituirán por [PERSONA1], [PERSONA2]…'))}<div class="as-nombres">${an.nombres.map((n, i) => `<label class="fa-chk"><input type="checkbox" data-nom="${i}" checked> ${esc(n)}</label>`).join('')}</div></div>` : '')
    + (an.edades.length ? `<div class="aviso">${esc(t('Edades exactas ({0}): junto con otros datos pueden identificar a alguien. Valora quitarlas.', an.edades.join(', ')))}</div>` : '')
    + `<p class="help">${esc(t('Muestra del envío:'))}</p>`;
  const muestra = () => { const sel = an.nombres.filter((_, i) => $('envioInfo').querySelector(`[data-nom="${i}"]`)?.checked); $('envioTxt').textContent = (ta.instr ? promptUsuario(ta, enmascaraNombres(an.valores, sel)) : Object.values(enmascaraNombres(an.valores, sel)).join('\n')).slice(0, 3000); return sel; };
  muestra(); $('envioInfo').querySelectorAll('[data-nom]').forEach(c => c.onchange = muestra);
  const habilita = () => { $('envioSi').disabled = !($('envioOk').checked && (!an.rojo || $('rojoOk')?.checked)); };
  $('envioOk').checked = false; $('envioOk').onchange = habilita; if ($('rojoOk')) $('rojoOk').onchange = habilita; habilita();
  $('mEnvio').classList.add('on');
  return new Promise(r => { envioRes = v => r(v ? {ok: true, nombres: muestra()} : {ok: false}); });
}
function cierraEnvio(v) { $('mEnvio').classList.remove('on'); if (envioRes) { const r = envioRes; envioRes = null; if (v) ENVIO_OK = true; r(v); } }
_cierres.mEnvio = () => cierraEnvio(false);
$('envioSi').onclick = () => cierraEnvio(true); $('envioNo').onclick = () => cierraEnvio(false);

let busy = false;
$('btnGenerar').onclick = async () => {
  if (busy) return;
  if (!S.exp) { toast(t('Abre o crea el expediente para trabajar.')); return go(1); }
  if (S.esEjemplo) return toast(t('En el ejemplo se pueden ver las piezas ya generadas. Para generar, sal del ejemplo.'), 6000);
  const ta = tareaDe(S.tarea), v = S.val[S.tarea] || {};
  const falta = ta.campos.filter(c => !CAMPOS[c].opc && !String(v[c] || '').trim()); if (falta.length) return toast(t('Completa: {0}', falta.map(c => t(CAMPOS[c].label)).join(', ')), 6000);
  if (!pideClave() || !pideFirma()) return;
  const valores = {}; ta.campos.forEach(c => { if (String(v[c] || '').trim()) valores[c] = String(v[c]).trim(); });
  const an = analizaEntrada(valores, S.exp.perfil), ok = await pideEnvio(an, ta); if (!ok.ok) return;
  const env = enmascaraNombres(an.valores, ok.nombres), sys = promptSistema(S.exp.perfil), usr = promptUsuario(ta, env);
  busy = true; $('btnGenerar').disabled = true; $('tareaEstado').innerHTML = '<span class="spin"></span> ' + esc(t('Generando…'));
  try {
    const raw = await llmJSON([{role: 'system', content: sys}, {role: 'user', content: usr}], {max: 3500});
    const r = verificaSalida(raw, {tarea: ta, valores: env, perfil: S.exp.perfil});
    if (!r.texto) throw new Error(t('La IA no devolvió una respuesta con el formato esperado. Inténtalo de nuevo.'));
    const p = {id: uid('pz_'), modulo: ta.mod, tarea: ta.id, titulo: r.titulo || t(ta.n), texto: r.texto, afirm: r.afirm, chk: {av: r.av, requiereSan: r.requiereSan}, valores: env, estado: 'borrador', autor: firma(), creado: ahora(), mod: ahora(), prov: getProv(), modelo: getMod(), rev: null, revSan: null, aprob: null};
    S.exp.piezas.unshift(p); traza('ia', {modulo: ta.mod, tarea: ta.id, pieza: p.id, prov: p.prov, modelo: p.modelo, cin: (sys + usr).length, cout: JSON.stringify(raw).length});
    S.ultima = p.id; cambio(); await guardaYa(); pintaModulos(); $('tareaEstado').textContent = t('Guardada como pieza en borrador.');
  } catch (e) { $('tareaEstado').textContent = e.message; toast(e.message, 8000); }
  finally { busy = false; $('btnGenerar').disabled = false; }
};

/* ── pieza: resultado con comprobaciones, revisión y aprobación ── */
function avisosDe(p) {
  const av = p.chk?.av || {}, o = [], nv = (p.afirm || []).filter(a => a.ok).length;
  if ((p.afirm || []).length) o.push([nv === p.afirm.length ? 'ok' : 'error', t('{0} de {1} afirmaciones con cita verificada en el material', nv, p.afirm.length)]);
  if (av.dosis) o.push(['error', t('Menciona dosis o pautas: la revisión sanitaria es obligatoria')]);
  if (p.chk?.requiereSan) o.push(['aviso', t('Contenido de salud: requiere revisión sanitaria')]);
  if ((av.nuevos || []).length) o.push(['aviso', t('Cifras que no están en el material ni en el perfil: {0}', av.nuevos.join(', '))]);
  if ((av.urls || []).length) o.push(['aviso', t('Enlaces que no son de vuestras fuentes aprobadas: {0}', av.urls.join(' '))]);
  if ((av.evitar || []).length) o.push(['aviso', t('Expresiones que la asociación evita: {0}', av.evitar.join(', '))]);
  if (av.completar) o.push(['aviso', t('Datos por completar ([COMPLETAR]): {0}', av.completar)]);
  if (av.revisar) o.push(['aviso', t('Marcas [REVISAR] pendientes: {0}', av.revisar)]);
  return o;
}
const BLOQ = {citas: L('Hay afirmaciones sin cita verificada: corrígelas o descártalas.'), completar: L('Completa los datos marcados con [COMPLETAR].'), revisar: L('Quita las marcas [REVISAR] cuando se haya validado el contenido.'), sanitaria: L('Falta la revisión sanitaria.'), revision: L('Falta la revisión de una persona.')};
function piezaHtml(p, corto) {
  const av = avisosDe(p), bl = bloqueoAprobar(p), m = modDe(p.modulo);
  return `<div class="as-pz-head"><span class="as-dot" style="--c:${m.c}">${ico(m.ico)}</span><div><h3 class="as-h3">${esc(p.titulo)}</h3><p class="help">${esc(t(m.n))} · ${esc(t(tareaDe(p.tarea)?.n || p.tarea))} · ${esc(fmtF(p.creado))}${p.autor ? ' · ' + esc(p.autor) : ''}</p></div>${estChip(p.estado)}</div>
  ${corto ? `<div class="as-doc">${md(p.texto)}</div>` : `<div class="field"><label for="pzTxt">${esc(t('Texto (editable)'))}</label><textarea id="pzTxt" rows="14"${S.esEjemplo ? ' readonly' : ''}>${esc(p.texto)}</textarea></div><div class="actions" style="margin-top:0"><button class="btn btn-ghost btn-sm" id="pzGuardar" type="button" disabled>${ico('save')}<span>${esc(t('Guardar cambios'))}</span></button></div>`}
  <h4 class="as-h4">${esc(t('Comprobaciones del código'))}</h4>
  ${av.length ? `<ul class="as-avisos">${av.map(([c, x]) => `<li class="${c}">${esc(x)}</li>`).join('')}</ul>` : `<p class="okbox">${esc(t('El código no ha encontrado avisos.'))}</p>`}
  ${(p.afirm || []).length ? `<details class="as-det"${(p.afirm || []).some(a => !a.ok) ? ' open' : ''}><summary>${esc(t('Afirmaciones y sus citas'))}</summary><ul class="fa-ul">${p.afirm.map((a, i) => `<li>${a.ok ? '✓' : '⚠'} <b>${esc(a.a)}</b><br><small class="muted">${a.ok ? '«' + esc(a.cita) + '»' : esc(t('La cita no aparece en el material: puede ser inventada.'))}</small>${!a.ok && !corto && !S.esEjemplo ? ` <button class="btn btn-ghost btn-sm" type="button" data-descarta="${i}">${esc(t('Descartar'))}</button>` : ''}</li>`).join('')}</ul></details>` : ''}
  ${corto ? '' : `<h4 class="as-h4">${esc(t('Revisión y aprobación'))}</h4><ul class="as-rev">
    <li>${p.rev ? '✓ ' + esc(t('Revisada por {0} · {1}', p.rev.q, fmtF(p.rev.f))) : '○ ' + esc(t('Sin revisar'))}</li>
    ${p.chk?.requiereSan ? `<li>${p.revSan ? '✓ ' + esc(t('Revisión sanitaria: {0} · {1}', p.revSan.q, fmtF(p.revSan.f))) : '○ ' + esc(t('Sin revisión sanitaria'))}${S.exp?.perfil.revisor ? ' <span class="muted">(' + esc(S.exp.perfil.revisor) + ')</span>' : ''}</li>` : ''}
    <li>${p.aprob ? '✓ ' + esc(t('Aprobada por {0} · {1}', p.aprob.q, fmtF(p.aprob.f))) : '○ ' + esc(bl === true ? t('Lista para aprobar') : t(BLOQ[bl]))}</li></ul>
    ${p.rev && p.rev.q === p.autor ? `<p class="help">${esc(t('La revisión la hizo la misma persona que generó la pieza: se recomienda una segunda persona.'))}</p>` : ''}`}
  <div class="actions">${corto ? '' : `<button class="btn btn-ghost btn-sm" type="button" data-acc="rev"${p.rev || p.estado === 'aprobada' ? ' disabled' : ''}>${esc(t('Marcar como revisada'))}</button>${p.chk?.requiereSan ? `<button class="btn btn-ghost btn-sm" type="button" data-acc="san"${p.revSan ? ' disabled' : ''}>${esc(t('Registrar revisión sanitaria'))}</button>` : ''}<button class="btn btn-primary btn-sm" type="button" data-acc="apr"${bl === true && p.estado !== 'aprobada' ? '' : ' disabled'}>${ico('check')}<span>${esc(t('Aprobar'))}</span></button>`}
    <button class="btn btn-ghost btn-sm" type="button" data-acc="copia">${ico('copy')}<span>${esc(t('Copiar'))}</span></button><button class="btn btn-word btn-sm" type="button" data-acc="word">${ico('doc')}<span>Word</span></button>
    ${corto ? `<button class="btn btn-ghost btn-sm" type="button" data-acc="ver">${esc(t('Revisar en Piezas'))}</button>` : `<button class="btn btn-ghost btn-sm" type="button" data-acc="act">${ico('calendar')}<span>${esc(t('Registrar como actividad'))}</span></button><button class="btn btn-ghost btn-sm" type="button" data-acc="borra" aria-label="${esc(t('Eliminar'))}">${ico('trash')}</button>`}</div>`;
}
function enlazaPieza(p, corto) {
  const root = corto ? $('tareaRes') : $('piezaDet'), re = () => (corto ? pintaModulos() : pintaPiezas());
  const sello = () => ({q: firma(), f: ahora()}), edit = () => { if (S.esEjemplo) { toast(t('El ejemplo no se puede modificar: sal del ejemplo para trabajar con tu expediente.'), 6000); return false; } return pideFirma(); };
  root.querySelectorAll('[data-acc]').forEach(b => b.onclick = async () => {
    const a = b.dataset.acc;
    if (a === 'copia') { try { await navigator.clipboard.writeText(p.texto); toast(t('Copiado')); } catch { toast(t('No se pudo copiar')); } return; }
    if (a === 'word') { try { dl(slug(p.titulo) + '.docx', await wordDeMarkdown(p.texto, {titulo: p.titulo, subtitulo: (S.exp?.perfil.nombre || '') + ' · ' + new Date().toLocaleDateString(locale()), pie: piePieza(p)})); } catch (e) { toast(e.message, 7000); } return; }
    if (a === 'ver') { S.pieza = p.id; guarda(); return go(4); }
    if (a === 'act') { go(5); $('aTit').value = p.titulo; $('aFecha').value = hoyISO(); S._actPieza = p.id; return toast(t('Completa la actividad y pulsa «Añadir actividad»')); }
    if (!edit()) return;
    if (a === 'rev') { p.rev = sello(); if (p.estado === 'borrador') p.estado = 'revisada'; traza('revisada', {pieza: p.id, modulo: p.modulo}); }
    if (a === 'san') { if (!confirm(t('¿Confirmas que una persona cualificada ({0}) ha revisado el contenido sanitario de esta pieza?', S.exp.perfil.revisor || t('profesional sanitaria')))) return; p.revSan = sello(); traza('revSan', {pieza: p.id, modulo: p.modulo}); }
    if (a === 'apr') { if (bloqueoAprobar(p) !== true) return; p.aprob = sello(); p.estado = 'aprobada'; traza('aprobada', {pieza: p.id, modulo: p.modulo}); }
    if (a === 'borra') { if (!confirm(t('¿Eliminar esta pieza del expediente?'))) return; S.exp.borrados.push(p.id); S.exp.piezas = S.exp.piezas.filter(x => x.id !== p.id); traza('eliminada', {pieza: p.id, modulo: p.modulo}); S.pieza = null; }
    p.mod = ahora(); cambio(); re();
  });
  if (corto) return;
  const ta = $('pzTxt'); ta.oninput = () => { $('pzGuardar').disabled = ta.value === p.texto; };
  $('pzGuardar').onclick = () => { if (!edit()) return; p.texto = ta.value; const r = revisaTexto(p.texto, {tarea: tareaDe(p.tarea), valores: p.valores, perfil: S.exp.perfil}); p.chk = {av: r.av, requiereSan: r.requiereSan};
    if (p.rev || p.revSan || p.aprob) toast(t('Al editar, las revisiones y la aprobación anteriores se anulan.'), 6000);
    p.rev = p.revSan = p.aprob = null; p.estado = 'borrador'; p.mod = ahora(); traza('editada', {pieza: p.id, modulo: p.modulo}); cambio(); pintaPiezas(); };
  root.querySelectorAll('[data-descarta]').forEach(b => b.onclick = () => { if (!edit()) return; p.afirm.splice(+b.dataset.descarta, 1); p.mod = ahora(); traza('afirmacion', {pieza: p.id, modulo: p.modulo}); cambio(); pintaPiezas(); });
}
const piePieza = p => t('Elaborado con ayuda de IA ({0}) y revisado por personas de la asociación. Estado: {1}.', APP_NAME, t(ESTADOS[p.estado]));

/* ── 4 · piezas ── */
function pintaPiezas() {
  const e = S.exp;
  $('fMod').innerHTML = `<option value="">${esc(t('Todos'))}</option>` + MODULOS.filter(m => MOD_TRABAJO.includes(m.id)).map(m => `<option value="${m.id}"${S.f.mod === m.id ? ' selected' : ''}>${esc(t(m.n))}</option>`).join('');
  $('fEst').innerHTML = `<option value="">${esc(t('Todos'))}</option>` + Object.keys(ESTADOS).map(k => `<option value="${k}"${S.f.est === k ? ' selected' : ''}>${esc(t(ESTADOS[k]))}</option>`).join('');
  $('fTxt').value = S.f.txt;
  if (!e) { $('piezasList').innerHTML = `<p class="empty">${esc(t('Abre o crea el expediente para trabajar.'))}</p>`; $('piezaDet').innerHTML = ''; return; }
  const q = norm(S.f.txt), ps = e.piezas.filter(p => (!S.f.mod || p.modulo === S.f.mod) && (!S.f.est || p.estado === S.f.est) && (!q || norm(p.titulo + ' ' + p.texto).includes(q)));
  $('piezasList').innerHTML = ps.length ? `<table class="as-tabla"><thead><tr><th>${esc(t('Título'))}</th><th>${esc(t('Módulo'))}</th><th>${esc(t('Estado'))}</th><th>${esc(t('Avisos'))}</th><th>${esc(t('Fecha'))}</th></tr></thead><tbody>${ps.map(p => { const n = avisosDe(p).filter(a => a[0] !== 'ok').length;
    return `<tr class="as-tr${p.id === S.pieza ? ' sel' : ''}" data-pz="${p.id}" tabindex="0"><td><b>${esc(p.titulo)}</b></td><td>${esc(t(modDe(p.modulo).n))}</td><td>${estChip(p.estado)}</td><td>${n ? chip('aviso', String(n)) : chip('ok', '0')}</td><td>${esc(fmtD(p.creado.slice(0, 10)))}</td></tr>`; }).join('')}</tbody></table>`
    : `<p class="empty">${esc(t('No hay piezas con estos filtros.'))}</p>`;
  $$('#piezasList [data-pz]').forEach(r => { r.onclick = () => { S.pieza = r.dataset.pz; guarda(); pintaPiezas(); $('piezaDet').scrollIntoView({behavior: 'smooth', block: 'start'}); }; r.onkeydown = ev => { if (ev.key === 'Enter') r.click(); }; });
  const p = e.piezas.find(x => x.id === S.pieza);
  $('piezaDet').innerHTML = p ? piezaHtml(p, false) : `<p class="empty">${esc(t('Elige una pieza de la lista para revisarla.'))}</p>`;
  if (p) enlazaPieza(p, false);
}
['fMod', 'fEst'].forEach(id => $(id).onchange = () => { S.f[id === 'fMod' ? 'mod' : 'est'] = $(id).value; guarda(); pintaPiezas(); });
$('fTxt').oninput = () => { S.f.txt = $('fTxt').value; clearTimeout(pintaPiezas._t); pintaPiezas._t = setTimeout(() => { pintaPiezas(); $('fTxt').focus(); }, 250); };

/* ── 5 · memoria ── */
function pintaMemoria() {
  $('aTipo').innerHTML = TIPOS_ACT.map(x => `<option value="${esc(x)}">${esc(t(x))}</option>`).join('');
  if (!$('aFecha').value) $('aFecha').value = hoyISO();
  if (!S.mem.hasta) { const h = new Date(); S.mem.hasta = hoyISO(); S.mem.desde = new Date(Date.UTC(h.getFullYear() - 1, h.getMonth(), h.getDate() + 1)).toISOString().slice(0, 10); }
  $('mDesde').value = S.mem.desde; $('mHasta').value = S.mem.hasta;
  const as = (S.exp?.actividades || []).slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  $('actList').innerHTML = !S.exp ? `<p class="empty">${esc(t('Abre o crea el expediente para trabajar.'))}</p>` : as.length
    ? `<table class="as-tabla"><thead><tr><th>${esc(t('Fecha'))}</th><th>${esc(t('Tipo'))}</th><th>${esc(t('Título'))}</th><th>${esc(t('Personas'))}</th><th></th></tr></thead><tbody>${as.map(a => `<tr><td>${esc(fmtD(a.fecha))}</td><td>${esc(t(a.tipo))}</td><td>${esc(a.titulo)}${a.descripcion ? `<br><small class="muted">${esc(a.descripcion)}</small>` : ''}</td><td>${nf(+a.personas || 0)}</td><td><button class="btn btn-ghost btn-sm" type="button" data-borraact="${a.id}" aria-label="${esc(t('Eliminar'))}">${ico('trash')}</button></td></tr>`).join('')}</tbody></table>`
    : `<p class="empty">${esc(t('Aún no hay actividades registradas.'))}</p>`;
  $$('[data-borraact]').forEach(b => b.onclick = () => { if (S.esEjemplo) return toast(t('El ejemplo no se puede modificar: sal del ejemplo para trabajar con tu expediente.'), 6000); if (!confirm(t('¿Eliminar esta actividad?'))) return; S.exp.borrados.push(b.dataset.borraact); S.exp.actividades = S.exp.actividades.filter(x => x.id !== b.dataset.borraact); cambio(); pintaMemoria(); });
  pintaMemRes();
}
$('btnAct').onclick = () => {
  if (!S.exp) return toast(t('Abre o crea el expediente para trabajar.'));
  if (S.esEjemplo) return toast(t('El ejemplo no se puede modificar: sal del ejemplo para trabajar con tu expediente.'), 6000);
  const tit = $('aTit').value.trim(); if (!tit || !$('aFecha').value) return toast(t('Indica al menos la fecha y el título'));
  S.exp.actividades.push({id: uid('ac_'), fecha: $('aFecha').value, tipo: $('aTipo').value, titulo: tit, personas: Math.max(0, Math.round(+$('aPers').value || 0)), descripcion: scrub($('aDesc').value.trim()).t, pieza: S._actPieza || null, mod: ahora(), q: firma()});
  S._actPieza = null; $('aTit').value = ''; $('aDesc').value = ''; $('aPers').value = ''; cambio(); pintaMemoria(); toast(t('Actividad registrada'));
};
['mDesde', 'mHasta'].forEach(id => $(id).onchange = () => { S.mem[id === 'mDesde' ? 'desde' : 'hasta'] = $(id).value; S.mem.narr = null; S.mem.avisos = null; guarda(); pintaMemRes(); });
function memoriaMd(d, narr) {
  const p = S.exp.perfil, o = [];
  o.push(`## ${t('Presentación')}`, narr?.presentacion || p.mision || '[COMPLETAR]', '');
  o.push(`## ${t('Resumen en cifras')}`, `- ${t('Actividades realizadas: {0}', nf(d.total))}`, `- ${t('Personas alcanzadas (suma de los registros): {0}', nf(d.personas))}`);
  Object.entries(d.porTipo).forEach(([k, v]) => o.push(`- ${t(k)}: ${t('{0} actividades · {1} personas', nf(v.n), nf(v.personas))}`));
  o.push('', `## ${t('Actividades')}`); d.actividades.forEach(a => o.push(`- ${fmtD(a.fecha)} · ${t(a.tipo)} · **${a.titulo}**${a.personas ? ` (${t('{0} personas', nf(a.personas))})` : ''}${a.descripcion ? ` — ${a.descripcion}` : ''}`));
  const pz = Object.entries(d.piezas); if (pz.length) { o.push('', `## ${t('Materiales aprobados')}`); pz.forEach(([m, n]) => o.push(`- ${t(modDe(m).n)}: ${nf(n)}`)); }
  if (narr?.valoracion) o.push('', `## ${t('Valoración y próximos pasos')}`, narr.valoracion);
  return o.join('\n');
}
function pintaMemRes() {
  if (!S.exp || !S.mem.ver) { $('memRes').innerHTML = ''; return; }
  const d = compilaMemoria(S.exp, S.mem.desde, S.mem.hasta), av = S.mem.avisos;
  $('memRes').innerHTML = `<div class="as-doc"><h4>${esc(t('Memoria de actividades'))} · ${esc(S.exp.perfil.nombre || '')}</h4><p class="help">${esc(t('Periodo: {0} – {1}', fmtD(d.periodo.desde), fmtD(d.periodo.hasta)))}</p>${md(memoriaMd(d, S.mem.narr))}</div>
    ${av ? (av.nuevos.length ? `<div class="aviso">${esc(t('La redacción de la IA menciona cifras que no están en los datos: {0}. Revísalas.', av.nuevos.join(', ')))}</div>` : `<p class="okbox">${esc(t('Todas las cifras de la redacción coinciden con los datos.'))}</p>`) : ''}
    <div class="actions"><button class="btn btn-word" id="btnMemWord" type="button">${ico('doc')}<span>Word</span></button><button class="btn btn-ghost" id="btnMemCsv" type="button">${ico('download')}<span>${esc(t('Actividades (CSV)'))}</span></button></div>`;
  $('btnMemWord').onclick = async () => { try { dl('memoria.docx', await wordDeMarkdown(memoriaMd(d, S.mem.narr), {kicker: t('Memoria de actividades'), titulo: S.exp.perfil.nombre || '', subtitulo: t('Periodo: {0} – {1}', fmtD(d.periodo.desde), fmtD(d.periodo.hasta)), pie: t('Cifras calculadas a partir del registro de actividades de la asociación con {0}.', APP_NAME)})); } catch (e) { toast(e.message, 7000); } };
  $('btnMemCsv').onclick = () => dl('actividades.csv', csvDe([t('Fecha'), t('Tipo'), t('Título'), t('Personas'), t('Descripción')], d.actividades.map(a => [a.fecha, t(a.tipo), a.titulo, a.personas, a.descripcion])), 'text/csv;charset=utf-8');
}
$('btnMemCod').onclick = () => { if (!S.exp) return toast(t('Abre o crea el expediente para trabajar.')); S.mem.ver = true; S.mem.narr = null; S.mem.avisos = null; guarda(); pintaMemRes(); };
$('btnMemIA').onclick = async () => {
  if (!S.exp) return toast(t('Abre o crea el expediente para trabajar.'));
  if (S.esEjemplo) return toast(t('En el ejemplo se pueden ver las piezas ya generadas. Para generar, sal del ejemplo.'), 6000);
  const d = compilaMemoria(S.exp, S.mem.desde, S.mem.hasta); if (!d.total) return toast(t('No hay actividades en ese periodo'));
  if (!pideClave() || !pideFirma()) return;
  const an = analizaEntrada({datos: JSON.stringify(d)}, S.exp.perfil), ok = await pideEnvio(an, {campos: [], instr: ''}); if (!ok.ok) return;
  const datos = enmascaraNombres(an.valores, ok.nombres).datos;
  const usr = `ENCARGO: Redacta dos apartados de la memoria anual de la asociación a partir SOLO de estos DATOS (calculados por la asociación). No añadas cifras, hechos ni nombres que no estén en los datos.\nDATOS:\n${datos}\nDevuelve SOLO este JSON: {"presentacion":"un párrafo que presente el periodo y su sentido","valoracion":"dos párrafos con la valoración y los próximos pasos (usa [COMPLETAR: …] para lo que no se pueda saber)"}\n${INSTR_IDIOMA()}`;
  $('btnMemIA').disabled = true; $('memEstado').innerHTML = '<span class="spin"></span> ' + esc(t('Redactando…'));
  try {
    const sys = promptSistema(S.exp.perfil), raw = await llmJSON([{role: 'system', content: sys}, {role: 'user', content: usr}], {max: 2000});
    S.mem.narr = {presentacion: String(raw.presentacion || ''), valoracion: String(raw.valoracion || '')};
    S.mem.avisos = {nuevos: numerosNuevos(S.mem.narr.presentacion + ' ' + S.mem.narr.valoracion, datos + perfilTexto(S.exp.perfil))}; S.mem.ver = true;
    traza('ia-memoria', {modulo: 'mem', prov: getProv(), modelo: getMod(), cin: (sys + usr).length, cout: JSON.stringify(raw).length}); cambio(); await guardaYa(); $('memEstado').textContent = ''; pintaMemRes();
  } catch (e) { $('memEstado').textContent = e.message; toast(e.message, 8000); }
  finally { $('btnMemIA').disabled = false; }
};

/* ── 6 · gobernanza ── */
function protocoloMd(p) {
  const fu = lineas(p.fuentes).map(l => '- ' + l.split('|')[0].trim()).join('\n');
  return [`# ${t('Protocolo interno de uso de la IA')} · ${p.nombre || ''}`, '', `## ${t('1. Para qué usamos la IA')}`, `- ${t('Primeros borradores de comunicación, materiales educativos, actas, proyectos, cartas y memorias.')}`, `- ${t('Siempre con la suite de la asociación, que aplica nuestro perfil y nuestras reglas.')}`,
    '', `## ${t('2. Para qué no la usamos')}`, `- ${t('Dosis, pautas de tratamiento o consejos clínicos individuales.')}`, `- ${t('Historias clínicas, listados de socios o cualquier dato que identifique a una persona.')}`, `- ${t('Decisiones de la junta: la IA propone y las personas deciden.')}`,
    '', `## ${t('3. Fuentes aprobadas')}`, fu || '- [COMPLETAR]',
    '', `## ${t('4. Revisión y aprobación')}`, `- ${t('Toda pieza la revisa una persona distinta de quien la generó.')}`, `- ${t('El contenido de salud lo revisa: {0}.', p.revisor || '[COMPLETAR]')}`, `- ${t('Solo se publica lo aprobado en la suite.')}`,
    '', `## ${t('5. Privacidad')}`, `- ${t('Antes de cada envío se enmascaran los datos personales y se revisan los avisos.')}`, `- ${t('Cada persona usa su propia clave de IA, con un límite de gasto fijado en el proveedor.')}`, `- ${t('El expediente vive en la carpeta compartida y solo acceden las personas autorizadas por la junta.')}`,
    '', `## ${t('6. Trazabilidad y transparencia')}`, `- ${t('La suite registra quién usa la IA, cuándo, con qué proveedor y quién revisa y aprueba.')}`, `- ${t('Los materiales publicados indican que se han elaborado con ayuda de IA y han sido revisados.')}`,
    '', `## ${t('7. Vigencia')}`, `- ${t('Aprobado por la junta directiva el [COMPLETAR: fecha]. Se revisará cada año.')}`].join('\n');
}
function pintaGobernanza() {
  const e = S.exp;
  if (!e) { $('gobPend').innerHTML = `<p class="empty">${esc(t('Abre o crea el expediente para trabajar.'))}</p>`; $('proto').value = ''; $('trazaRes').innerHTML = ''; return; }
  const bor = e.piezas.filter(p => p.estado === 'borrador'), rev = e.piezas.filter(p => p.estado === 'revisada'), san = e.piezas.filter(p => p.chk?.requiereSan && !p.revSan && p.estado !== 'aprobada');
  const ia = e.traza.filter(x => /^ia/.test(x.acc)), mes = hoyISO().slice(0, 7), porProv = {};
  ia.forEach(x => { porProv[x.prov] = porProv[x.prov] || {n: 0, c: 0}; porProv[x.prov].n++; porProv[x.prov].c += (x.cin || 0) + (x.cout || 0); });
  $('gobPend').innerHTML = `<h3>${esc(t('Pendientes'))}</h3><div class="as-kpis"><div><b>${bor.length}</b><span>${esc(t('en borrador'))}</span></div><div><b>${rev.length}</b><span>${esc(t('revisadas sin aprobar'))}</span></div><div><b>${san.length}</b><span>${esc(t('sin revisión sanitaria'))}</span></div><div><b>${ia.filter(x => x.f.slice(0, 7) === mes).length}</b><span>${esc(t('llamadas a la IA este mes'))}</span></div></div>
    <div class="as-pends">${[...san, ...rev, ...bor].filter((p, i, a) => a.indexOf(p) === i).slice(0, 8).map(p => `<button class="btn btn-ghost btn-sm" type="button" data-irpz="${p.id}">${esc(p.titulo)}</button>`).join('')}</div>
    ${Object.keys(porProv).length ? `<p class="help">${esc(t('Uso acumulado por proveedor:'))} ${Object.entries(porProv).map(([k, v]) => esc(t('{0}: {1} llamadas, unos {2} caracteres', PROV[k]?.n || k, nf(v.n), nf(v.c)))).join(' · ')}</p>` : ''}`;
  $$('[data-irpz]').forEach(b => b.onclick = () => { S.pieza = b.dataset.irpz; S.f = {mod: '', est: '', txt: ''}; guarda(); go(4); });
  $('proto').value = e.protocolo?.texto || protocoloMd(e.perfil); $('proto').readOnly = S.esEjemplo;
  const tr = e.traza.slice(-60).reverse();
  $('trazaRes').innerHTML = tr.length ? `<div class="table-wrap"><table class="as-tabla"><thead><tr><th>${esc(t('Fecha'))}</th><th>${esc(t('Quién'))}</th><th>${esc(t('Acción'))}</th><th>${esc(t('Módulo'))}</th><th>${esc(t('Proveedor y modelo'))}</th><th>${esc(t('Caracteres'))}</th></tr></thead><tbody>${tr.map(x => `<tr><td>${esc(fmtF(x.f))}</td><td>${esc(x.q)}</td><td>${esc(t(ACC[x.acc] || x.acc))}</td><td>${esc(x.modulo ? t(modDe(x.modulo).n) : '')}</td><td>${esc(x.prov ? (PROV[x.prov]?.n || x.prov) + ' · ' + (x.modelo || '') : '')}</td><td>${x.cin ? nf((x.cin || 0) + (x.cout || 0)) : ''}</td></tr>`).join('')}</tbody></table></div>`
    : `<p class="empty">${esc(t('Aún no hay registros.'))}</p>`;
}
$('proto').oninput = () => { if (!S.exp || S.esEjemplo) return; S.exp.protocolo = {texto: $('proto').value, mod: ahora()}; cambio(); };
$('btnProtoGen').onclick = () => { if (!S.exp || S.esEjemplo) return; if (S.exp.protocolo?.texto && !confirm(t('Se sustituirá el texto actual del protocolo. ¿Continuar?'))) return; S.exp.protocolo = {texto: protocoloMd(S.exp.perfil), mod: ahora()}; cambio(); pintaGobernanza(); };
$('btnProtoWord').onclick = async () => { if (!S.exp) return; try { dl('protocolo-ia.docx', await wordDeMarkdown($('proto').value, {kicker: t('Protocolo interno de uso de la IA'), titulo: S.exp.perfil.nombre || '', subtitulo: new Date().toLocaleDateString(locale())})); } catch (e) { toast(e.message, 7000); } };
$('btnTrazaCsv').onclick = () => { if (!S.exp) return; dl('registro-uso.csv', csvDe([t('Fecha'), t('Quién'), t('Acción'), t('Módulo'), t('Tarea'), t('Proveedor'), t('Modelo'), t('Caracteres')], S.exp.traza.map(x => [x.f, x.q, t(ACC[x.acc] || x.acc), x.modulo ? t(modDe(x.modulo).n) : '', x.tarea ? t(tareaDe(x.tarea)?.n || x.tarea) : '', x.prov || '', x.modelo || '', (x.cin || 0) + (x.cout || 0)])), 'text/csv;charset=utf-8'); };

/* ── arranque ── */
(async () => {
  const p = await cargaEstado(); if (p) S = {...S, ...p, mem: {...S.mem, ...(p.mem || {})}};
  iniciaUI(); pintaBanner();
  if (!Carpeta.soporta()) CARP.estado = 'nosoporta';
  else if (await Carpeta.recuerda()) { CARP.estado = (await Carpeta.permiso(false)) ? 'ok' : 'permiso'; if (CARP.estado === 'ok' && !S.esEjemplo) await sincroniza(false); }
  if (S.esEjemplo) S.exp = construyeEjemplo(LANG);
  go(0);
})();
