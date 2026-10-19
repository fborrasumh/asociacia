/* ══ Núcleo de AsociacIA. Lógica pura (se prueba en Node) salvo la sección «carpeta compartida», al final.
   El EXPEDIENTE es un único JSON que vive en la carpeta compartida de la asociación (Drive u OneDrive sincronizados).
   Nunca contiene claves de IA. Fusión por elemento (id + fecha de modificación) para que varias personas trabajen sin servidor. ══ */
const FORMATO = 'asociacia/1';
const ARCHIVO = 'asociacia-expediente.json';
const ahora = () => new Date().toISOString();
const hoyISO = () => ahora().slice(0, 10);
const lineas = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
const clon = o => JSON.parse(JSON.stringify(o));

function nuevoExpediente(preset = 'diabetes') {
  const p = clon(PRESETS[preset] || PRESETS.otra);
  return {formato: FORMATO, version: VERSION, id: uid('exp_'), creado: ahora(), mod: ahora(), modPor: '', rev: 0,
    perfil: {...p, mod: ahora()}, piezas: [], actividades: [], plantillas: [], traza: [], borrados: [], protocolo: {texto: '', mod: ''}};
}
/* comprueba y completa un JSON leído de la carpeta o importado; devuelve null si no es un expediente */
function validaExpediente(o) {
  if (!o || typeof o !== 'object' || o.formato !== FORMATO || !o.perfil) return null;
  for (const k of ['piezas', 'actividades', 'plantillas', 'traza', 'borrados']) if (!Array.isArray(o[k])) o[k] = [];
  if (!o.protocolo) o.protocolo = {texto: '', mod: ''};
  o.rev = +o.rev || 0; return o;
}

/* ── fusión: gana la versión más reciente de cada elemento; los borrados se recuerdan para que no «resuciten» ── */
function fusionaLista(a = [], b = []) { const m = new Map(); [...a, ...b].forEach(x => { if (!x || !x.id) return; const y = m.get(x.id); if (!y || (x.mod || '') > (y.mod || '')) m.set(x.id, x); }); return [...m.values()]; }
function fusiona(loc, rem) {
  if (!loc) return rem; if (!rem) return loc;
  const o = clon(rem);
  o.perfil = (loc.perfil.mod || '') > (rem.perfil.mod || '') ? clon(loc.perfil) : o.perfil;
  o.protocolo = (loc.protocolo?.mod || '') > (rem.protocolo?.mod || '') ? clon(loc.protocolo) : o.protocolo;
  o.borrados = [...new Set([...(loc.borrados || []), ...(rem.borrados || [])])];
  for (const k of ['piezas', 'actividades', 'plantillas']) o[k] = fusionaLista(loc[k], rem[k]).filter(x => !o.borrados.includes(x.id));
  o.traza = fusionaLista(loc.traza, rem.traza).sort((x, y) => (x.f < y.f ? -1 : 1));
  o.rev = Math.max(loc.rev || 0, rem.rev || 0); o.mod = (loc.mod || '') > (rem.mod || '') ? loc.mod : rem.mod;
  return o;
}

/* ── seguridad de lo que sale: enmascarado, posibles nombres, cuasi-identificadores y semáforo clínico ── */
const RX_EXTRA = [['IBAN', /\b[A-Z]{2}\d{2}(?:[\s-]?\d{4}){4,7}\b/g], ['HISTORIA', /\b(?:NHC|NUHSA|SIP|CIP|historia cl[ií]nica|tarjeta sanitaria)\s*(?:n[ºo°.]*)?\s*[:#]?\s*[A-Z0-9-]{5,}\b/gi]];
const RX_DOSIS = /\b\d+(?:[.,]\d+)?\s?(?:UI|U|unidades|unitats|unitate|units|unidades de insulina|mg|ml)\b|\b(?:dosis|dosi|dose|doses|dosia|bolo|bolus|pauta de insulina|ajust\w*\s+(?:la\s+|de\s+)?insulin\w*|ratios?\s+de\s+insulin\w*|cu[aá]nta insulin\w*)\b/i;
const RX_CLIN = /\b(?:glucosa|glucemia|glucèmia|glicosa|glicemia|glukosa|gluzemia|glucose|insulin\w*|intsulin\w*|hipogluc\w*|hipoglic\w*|hipogluz\w*|hiperglu\w*|hypoglyc\w*|hba1c|hemoglobina glicosilada|medicaci\w*|medicament\w*|medikament\w*|f[aà]rmac\w*|tratament\w*|tratamient\w*|treatment|s[ií]ntom\w*|symptom\w*|sintom\w*|carbohidrat\w*|hidratos de carbono|glucag\w*|cetoacidosi\w*|diagn[oòó]stic\w*|diagnos\w*)\b/i;
const RX_EDAD = /\b\d{1,2}\s?(?:años|anys|urte|anos|years)\b/gi;
const NOMBRES_COMUNES = new Set('maría carmen ana laura marta lucía isabel pilar elena cristina paula sara raquel rosa teresa julia sofía alba irene andrea nerea antonio manuel josé francisco david juan javier daniel carlos jesús alejandro miguel rafael pablo sergio pedro jorge luis alberto álvaro adrián diego hugo mario jordi josep montse núria iker ane xabier uxue xoán xosé uxía brais mateo leo martín lucas joan pere marc pau laia mireia aitor unai ainhoa iratxe'.split(' ').map(norm));
const NO_NOMBRE = new Set('día dia mundial diabetes ministerio sanidad consejería conselleria consellería kontseilaritza junta xunta asamblea federación sociedad española hospital centro asociación associació elkartea asociación colegio escola universidad universitat instituto fundación cátedra paciente pacientes gobierno generalitat gobierno comunidad lunes martes miércoles jueves viernes sábado domingo enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre instagram facebook linkedin whatsapp tiktok canva google drive onedrive madrid barcelona valencia alicante elche sevilla bilbao vigo coruña'.split(' ').map(norm));
function posiblesNombres(texto, perfil) {
  const evita = new Set(norm([perfil?.nombre, perfil?.siglas, perfil?.territorio].join(' ')).split(' ').filter(Boolean));
  const out = [], s = String(texto || ''), C = 'A-ZÁÉÍÓÚÑÇÀÈÒÏÜ', m_ = 'a-záéíóúñçàèòïü';
  const multi = new RegExp(`(?<![\\p{L}])[${C}][${m_}]+(?:\\s+(?:de\\s+|del\\s+|da\\s+)?[${C}][${m_}]+){1,3}`, 'gu');
  for (const m of s.matchAll(multi)) { const ws = norm(m[0]).split(' '); if (ws.some(w => NOMBRES_COMUNES.has(w)) && !ws.every(w => evita.has(w) || NO_NOMBRE.has(w) || ['de', 'del', 'da'].includes(w))) out.push(m[0]); }
  for (const m of s.matchAll(new RegExp(`(?<![\\p{L}])[${C}][${m_}]+(?![\\p{L}])`, 'gu'))) if (NOMBRES_COMUNES.has(norm(m[0])) && !out.some(x => x.split(/\s+/).includes(m[0]))) out.push(m[0]);
  return [...new Set(out)];
}
/* enmascara cada campo por separado (mantiene la estructura del encargo) y detecta lo que pide atención */
function analizaEntrada(valores, perfil) {
  const out = {}; let n = 0; const todo = Object.values(valores).join('\n');
  for (const [k, v] of Object.entries(valores)) { let {t: tx, n: c} = scrub(v); RX_EXTRA.forEach(([tag, rx]) => { tx = tx.replace(rx, () => { c++; return `[${tag}]`; }); }); out[k] = tx; n += c; }
  return {valores: out, n, nombres: posiblesNombres(Object.values(out).join('\n'), perfil), edades: [...new Set(todo.match(RX_EDAD) || [])], rojo: RX_DOSIS.test(todo)};
}
function enmascaraNombres(valores, nombres) {
  const o = {...valores}; nombres.forEach((nm, i) => { const rx = new RegExp(`(?<![\\p{L}])${nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'gu'); for (const k in o) o[k] = o[k].replace(rx, `[PERSONA${i + 1}]`); });
  return o;
}

/* ── el encargo a la IA: perfil de la asociación + reglas que no se pueden saltar + JSON con citas ── */
function fuenteDe(tarea, valores) { return tarea.campos.filter(c => CAMPOS[c].fuente).map(c => valores[c] || '').join('\n').trim(); }
function perfilTexto(p) { return [p.nombre, p.siglas, p.patologia, p.territorio, p.mision, p.publicos, p.tono, p.preferir, p.fuentes, p.calendario].join('\n'); }
function promptSistema(p) {
  const fu = lineas(p.fuentes).map(l => '- ' + l).join('\n') || '- (sin fuentes aprobadas)';
  return `Eres el asistente de comunicación y gestión de «${p.nombre || 'la asociación'}»${p.siglas ? ` (${p.siglas})` : ''}, una asociación de pacientes${p.patologia ? ` del ámbito de: ${p.patologia}` : ''}${p.territorio ? `, en ${p.territorio}` : ''}.
Misión: ${p.mision || '(sin definir)'}
Públicos: ${lineas(p.publicos).join('; ') || '(sin definir)'}
Tono: ${p.tono || 'claro y cercano'}
Expresiones preferidas: ${lineas(p.preferir).join('; ') || '—'}
Expresiones que la asociación evita: ${lineas(p.evitar).join('; ') || '—'}
Fuentes aprobadas:
${fu}

Reglas que no se pueden saltar:
1. Nunca des dosis, pautas de tratamiento, ajustes de medicación ni recomendaciones clínicas individuales. Si el encargo lo pide, explica que eso corresponde al equipo sanitario.
2. No inventes datos, cifras, fechas, nombres, citas, referencias ni enlaces. Si falta un dato, escribe [COMPLETAR: qué falta].
3. Marca con [REVISAR] cada afirmación sanitaria que deba validar un profesional.
4. Usa solo enlaces de las fuentes aprobadas o del material aportado.
5. Lo que va entre corchetes ([PERSONA1], [CORREO], [TELÉFONO]…) son datos enmascarados: mantenlos tal cual.
6. Lenguaje claro, inclusivo y no estigmatizante.
Respondes SOLO con JSON válido.`;
}
function promptUsuario(tarea, valores) {
  const datos = tarea.campos.filter(c => !CAMPOS[c].fuente && valores[c]).map(c => `- ${CAMPOS[c].label}: ${valores[c]}`).join('\n');
  const fuente = fuenteDe(tarea, valores);
  const esquema = fuente
    ? '{"titulo":"título breve","texto":"el resultado completo en Markdown","afirmaciones":[{"afirmacion":"cada hecho, acuerdo, requisito o tema que tomas del MATERIAL","cita":"fragmento LITERAL del MATERIAL (de 6 a 30 palabras) que lo respalda, copiado sin cambiar nada"}]}'
    : '{"titulo":"título breve","texto":"el resultado completo en Markdown","afirmaciones":[]}';
  const idioma = tarea.traduce ? `Escribe el título en ${langIA()} y el texto en el idioma de destino indicado. No traduzcas las claves JSON.` : INSTR_IDIOMA();
  return `ENCARGO: ${tarea.instr}\n\nDATOS DEL ENCARGO:\n${datos || '- (ninguno)'}\n${fuente ? `\nMATERIAL (la única fuente de hechos):\n"""\n${fuente}\n"""\n` : ''}\nDevuelve SOLO este JSON:\n${esquema}\n${idioma}`;
}

/* ── la IA propone, el código comprueba ── */
function revisaTexto(texto, ctx) {
  const material = Object.values(ctx.valores || {}).join('\n') + '\n' + perfilTexto(ctx.perfil || {});
  const hosts = new Set((material.match(/https?:\/\/[^\s|)\]]+/g) || []).map(u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } }));
  const urls = [...new Set(texto.match(/https?:\/\/[^\s)\]>"]+/g) || [])].filter(u => { try { return !hosts.has(new URL(u).hostname.replace(/^www\./, '')); } catch { return true; } });
  const nt = ' ' + norm(texto) + ' ';
  const evitar = lineas(ctx.perfil?.evitar).filter(w => norm(w) && nt.includes(' ' + norm(w) + ' '));
  const av = {nuevos: numerosNuevos(texto, material), urls, evitar, completar: (texto.match(/\[COMPLETAR[^\]]*\]/g) || []).length, revisar: (texto.match(/\[REVISAR\]/g) || []).length, dosis: RX_DOSIS.test(texto)};
  return {av, requiereSan: !!(ctx.tarea?.clinico || RX_CLIN.test(texto) || av.dosis)};
}
function verificaSalida(raw, ctx) {
  const titulo = String(raw?.titulo || '').trim().slice(0, 160), texto = String(raw?.texto || '').trim();
  const fuente = fuenteDe(ctx.tarea, ctx.valores);
  const afirm = (Array.isArray(raw?.afirmaciones) ? raw.afirmaciones : []).map(a => ({a: String(a?.afirmacion || a?.texto || '').trim(), cita: String(a?.cita || '').trim()}))
    .filter(x => x.a).map(x => ({...x, ok: !!fuente && esFiel(fuente, x.cita)}));
  return {titulo, texto, afirm, ...revisaTexto(texto, ctx)};
}
/* ¿se puede aprobar? devuelve true o un código (se traduce al pintar) */
function bloqueoAprobar(p) {
  const av = p.chk?.av || {};
  if ((p.afirm || []).some(a => !a.ok)) return 'citas';
  if (av.completar) return 'completar';
  if (av.revisar) return 'revisar';
  if (p.chk?.requiereSan && !p.revSan) return 'sanitaria';
  if (!p.rev) return 'revision';
  return true;
}

/* ── memoria: las cifras las calcula el código; la IA solo redacta a partir de ese resumen ── */
function compilaMemoria(exp, desde, hasta) {
  const dentro = f => (!desde || f >= desde) && (!hasta || f <= hasta);
  const acts = exp.actividades.filter(a => dentro(a.fecha || '')).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const porTipo = {}; acts.forEach(a => { const k = a.tipo; porTipo[k] = porTipo[k] || {n: 0, personas: 0}; porTipo[k].n++; porTipo[k].personas += +a.personas || 0; });
  const piezas = {}; exp.piezas.filter(p => p.estado === 'aprobada' && dentro((p.aprob?.f || p.mod || '').slice(0, 10))).forEach(p => { piezas[p.modulo] = (piezas[p.modulo] || 0) + 1; });
  return {periodo: {desde, hasta}, total: acts.length, personas: acts.reduce((s, a) => s + (+a.personas || 0), 0), porTipo, piezas,
    actividades: acts.map(a => ({fecha: a.fecha, tipo: a.tipo, titulo: a.titulo, personas: +a.personas || 0, descripcion: a.descripcion || ''}))};
}

/* ── carpeta compartida (Drive u OneDrive sincronizados en el ordenador): File System Access API, con reserva de abrir/descargar ── */
const Carpeta = {
  dir: null, soporta: () => typeof window !== 'undefined' && 'showDirectoryPicker' in window,
  async elegir() { this.dir = await window.showDirectoryPicker({id: 'asociacia', mode: 'readwrite'}); await kv('readwrite', s => s.put(this.dir, 'carpeta')); return this.dir; },
  async recuerda() { try { this.dir = await kv('readonly', s => s.get('carpeta')) || null; } catch { this.dir = null; } return this.dir; },
  async permiso(pedir = false) { if (!this.dir) return false; const o = {mode: 'readwrite'}; if ((await this.dir.queryPermission(o)) === 'granted') return true; return pedir ? (await this.dir.requestPermission(o)) === 'granted' : false; },
  async lee() { try { const fh = await this.dir.getFileHandle(ARCHIVO); const f = await fh.getFile(); return {exp: validaExpediente(JSON.parse(await f.text())), fecha: f.lastModified}; } catch (e) { if (e.name === 'NotFoundError') return null; throw e; } },
  async escribe(exp) { const fh = await this.dir.getFileHandle(ARCHIVO, {create: true}); const w = await fh.createWritable(); await w.write(JSON.stringify(exp, null, 1)); await w.close(); },
  async copia(exp) { const d = await this.dir.getDirectoryHandle('copias-asociacia', {create: true}); const n = `expediente-${hoyISO()}.json`; const fh = await d.getFileHandle(n, {create: true}); const w = await fh.createWritable(); await w.write(JSON.stringify(exp)); await w.close();
    const ns = []; for await (const [k] of d.entries()) if (/^expediente-\d{4}-\d{2}-\d{2}\.json$/.test(k)) ns.push(k); ns.sort(); for (const k of ns.slice(0, Math.max(0, ns.length - 14))) await d.removeEntry(k); }
};
