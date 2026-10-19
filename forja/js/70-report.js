/* ── salidas: Word desde Markdown y ZIP. Se cargan docx y JSZip desde cdnjs solo cuando hacen falta ────────── */
/* wordDeMarkdown(md, {titulo, subtitulo, pie, kicker}) → Blob .docx
   Convierte ## encabezados, listas y **negritas**; lo demás va como párrafos. */
async function wordDeMarkdown(md, {titulo = '', subtitulo = '', pie = '', kicker = ''} = {}) {
  await cargaLib([LIB.docx]); const X = window.docx;
  const runs = (tx, base = {}) => String(tx).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(p => p.startsWith('**') ? new X.TextRun({text: p.slice(2, -2), font: 'Arial', size: 22, bold: true, ...base}) : new X.TextRun({text: p, font: 'Arial', size: 22, ...base}));
  const P = (tx, o = {}) => new X.Paragraph({heading: o.h, alignment: o.c ? X.AlignmentType.CENTER : undefined, spacing: {after: o.after ?? 110}, indent: o.ind ? {left: o.ind} : undefined, children: o.plain ? [new X.TextRun({text: String(tx), font: 'Arial', size: o.s || 22, bold: o.b, italics: o.i, color: o.col})] : runs(tx, {italics: o.i, color: o.col})});
  const k = [];
  if (kicker) k.push(P(kicker.toUpperCase(), {c: true, b: true, col: 'E4572E', s: 20, plain: true}));
  if (titulo) k.push(P(titulo, {c: true, b: true, s: 32, plain: true}));
  if (subtitulo) k.push(P(subtitulo, {c: true, col: '5D7691', s: 20, after: 260, plain: true}));
  for (const l of String(md).split('\n')) {
    const t = l.trimEnd(); if (!t.trim()) continue; let m;
    if (m = t.match(/^#{1,4}\s+(.*)/)) k.push(P(m[1].replace(/\*\*/g, ''), {h: X.HeadingLevel.HEADING_1, plain: true}));
    else if (m = t.match(/^\s*[-*•]\s+(.*)/)) k.push(P('•  ' + m[1], {ind: 360, after: 60}));
    else if (m = t.match(/^\s*(\d+[.)])\s+(.*)/)) k.push(P(m[1] + '  ' + m[2], {ind: 360, after: 60}));
    else k.push(P(t));
  }
  if (pie) k.push(P(pie, {i: true, s: 16, col: '8899AA', plain: true}));
  return X.Packer.toBlob(new X.Document({creator: typeof APP_NAME === 'string' ? APP_NAME : APP, sections: [{children: k}]}));
}
/* zipDe({'nombre.ext': Blob|string, …}) → Blob .zip */
async function zipDe(ficheros) { await cargaLib([LIB.jszip]); const z = new JSZip(); for (const [n, c] of Object.entries(ficheros)) z.file(n, c); return z.generateAsync({type: 'blob', compression: 'DEFLATE'}); }
/* csv con BOM, separador «;» (Excel en español) y comillas escapadas */
const csvq = v => { const s = String(v ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csvDe = (cab, filas) => '\ufeff' + [cab, ...filas].map(f => f.map(csvq).join(';')).join('\r\n');
