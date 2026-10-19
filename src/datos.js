/* ══ Datos de AsociacIA: módulos, tareas, campos, tipos de actividad, perfiles de partida y ejemplo ══
   L('…') solo marca textos de interfaz para el diccionario: se traducen al pintar con t(). Los prompts (instr) van en español. */
const L = s => s;
const VERSION = '0.1.0';

/* campos reutilizables de los formularios de tarea. fuente:true → el resultado se contrasta por código con este texto */
const CAMPOS = {
  tema: {tipo: 'area', label: L('Tema o mensaje principal')},
  red: {tipo: 'select', label: L('Red social'), op: ['Instagram', 'Facebook', 'X', 'LinkedIn', 'WhatsApp', 'TikTok'], tr: false},
  publico: {tipo: 'text', label: L('Público destinatario'), sug: 'publicos', opc: true},
  contenido: {tipo: 'area', label: L('Noticias y actividades que incluir')},
  periodo: {tipo: 'text', label: L('Periodo'), opc: true},
  hecho: {tipo: 'area', label: L('Qué ha pasado o qué se anuncia')},
  fecha: {tipo: 'date', label: L('Fecha'), opc: true},
  portavoz: {tipo: 'text', label: L('Portavoz (cargo, no el nombre)'), opc: true},
  proposito: {tipo: 'area', label: L('Propósito del mensaje')},
  formato: {tipo: 'select', label: L('Formato'), op: [L('Cartel'), L('Publicación cuadrada'), L('Historia vertical'), L('Folleto')]},
  fuente: {tipo: 'area', label: L('Texto de una fuente fiable'), fuente: true, archivo: true, help: L('Pega el fragmento de la fuente (o carga un archivo). Cada afirmación del resultado se comprobará contra este texto.')},
  fuenteOpc: {tipo: 'area', label: L('Texto de apoyo (opcional)'), fuente: true, archivo: true, opc: true},
  nivel: {tipo: 'select', label: L('Público'), op: [L('Familias'), L('Niños y adolescentes'), L('Personas mayores'), L('Profesorado'), L('Profesionales sanitarios'), L('Población general')]},
  texto: {tipo: 'area', label: L('Texto que traducir'), archivo: true},
  idioma: {tipo: 'select', label: L('Idioma de destino'), op: ['català', 'euskara', 'galego', 'English', 'português', 'français', 'العربية', 'română', '中文', 'українська'], tr: false},
  notas: {tipo: 'area', label: L('Notas de la reunión'), fuente: true, archivo: true, help: L('Pega tus notas. Cada acuerdo y tarea del acta se comprobará contra ellas.')},
  tipoReu: {tipo: 'select', label: L('Tipo de reunión'), op: [L('Junta directiva'), L('Asamblea'), L('Comisión de trabajo'), L('Reunión externa')]},
  temas: {tipo: 'area', label: L('Temas que tratar')},
  duracion: {tipo: 'text', label: L('Duración'), opc: true},
  bases: {tipo: 'area', label: L('Texto de las bases de la convocatoria'), fuente: true, archivo: true, help: L('Pega las bases o carga el PDF. Cada requisito se comprobará contra este texto.')},
  idea: {tipo: 'area', label: L('Idea del proyecto')},
  presupuesto: {tipo: 'text', label: L('Presupuesto aproximado'), opc: true},
  financiador: {tipo: 'text', label: L('Entidad financiadora')},
  proyecto: {tipo: 'area', label: L('Proyecto o necesidad')},
  destinatario: {tipo: 'text', label: L('Destinatario (cargo e institución)')},
  problema: {tipo: 'area', label: L('Problema que se plantea')},
  peticion: {tipo: 'area', label: L('Qué se pide')},
  actividad: {tipo: 'area', label: L('Actividad que se evaluará')},
  objetivo: {tipo: 'text', label: L('Qué se quiere medir'), opc: true},
  respuestas: {tipo: 'area', label: L('Respuestas abiertas (una por línea, sin nombres)'), fuente: true, archivo: true},
  extra: {tipo: 'area', label: L('Indicaciones adicionales (opcional)'), opc: true, filas: 2}
};

/* los nueve módulos: 1 Perfil y biblioteca, 6 de trabajo, 8 Memoria y justificación, 9 Gobernanza */
const MODULOS = [
  {id: 'perfil', n: L('Perfil y biblioteca'), d: L('Identidad, tono, fuentes aprobadas, calendario y plantillas.'), ico: 'user', c: '#0F2237', paso: 2},
  {id: 'com', n: L('Comunicación'), d: L('Redes, boletines, notas de prensa, correos y briefing para Canva.'), ico: 'chat', c: '#E4572E'},
  {id: 'edu', n: L('Educación'), d: L('Fichas en lenguaje claro, preguntas frecuentes y traducción.'), ico: 'book', c: '#0E8C7A'},
  {id: 'reu', n: L('Reuniones'), d: L('Actas con acuerdos verificados y órdenes del día.'), ico: 'users', c: '#1F6FB2'},
  {id: 'pro', n: L('Proyectos y financiación'), d: L('Requisitos de convocatorias, fichas de proyecto y cartas.'), ico: 'target', c: '#C98200'},
  {id: 'inc', n: L('Incidencia'), d: L('Cartas a las administraciones y posicionamientos.'), ico: 'scale', c: '#6B4FD8'},
  {id: 'eva', n: L('Evaluación'), d: L('Encuestas antes y después y análisis de respuestas.'), ico: 'quiz', c: '#0E7C6B'},
  {id: 'mem', n: L('Memoria y justificación'), d: L('Registro de actividades y memoria anual.'), ico: 'archive', c: '#2E4B6B', paso: 5},
  {id: 'gob', n: L('Gobernanza'), d: L('Revisión, aprobación, protocolo y registro de uso.'), ico: 'shield', c: '#8A3617', paso: 6}
];
const MOD_TRABAJO = ['com', 'edu', 'reu', 'pro', 'inc', 'eva'];

/* tareas de los módulos de trabajo. clinico: el resultado siempre requiere revisión sanitaria */
const TAREAS = [
  {id: 'com.post', mod: 'com', n: L('Publicación para redes'), campos: ['tema', 'red', 'publico', 'extra'],
    instr: 'Escribe una publicación para la red social indicada: texto adaptado a esa red (longitud, tono y estructura habituales), una llamada a la acción y de 3 a 5 etiquetas. Ofrece además una versión alternativa más breve.'},
  {id: 'com.boletin', mod: 'com', n: L('Boletín para socios'), campos: ['contenido', 'periodo', 'extra'],
    instr: 'Redacta un boletín para las personas socias con un saludo breve, una sección por noticia o actividad y un cierre con próximas citas. Usa solo los hechos aportados.'},
  {id: 'com.nota', mod: 'com', n: L('Nota de prensa'), campos: ['hecho', 'fecha', 'portavoz', 'extra'],
    instr: 'Redacta una nota de prensa con titular, entradilla, cuerpo en pirámide invertida, una declaración atribuida al cargo de portavoz indicado (marcada como [DECLARACIÓN PENDIENTE DE VALIDAR]) y un párrafo final sobre la asociación.'},
  {id: 'com.correo', mod: 'com', n: L('Correo a socios o familias'), campos: ['proposito', 'publico', 'extra'],
    instr: 'Redacta un correo con asunto, saludo, mensaje claro y breve, y despedida. Propón también un asunto alternativo.'},
  {id: 'com.canva', mod: 'com', n: L('Briefing para Canva'), campos: ['tema', 'formato', 'publico', 'extra'],
    instr: 'Prepara un briefing de diseño para Canva: objetivo, titular (máximo 8 palabras), texto secundario, elementos visuales sugeridos, paleta acorde con el tono, jerarquía de la información y recomendaciones de accesibilidad (contraste, tamaño de letra, texto alternativo).'},
  {id: 'edu.ficha', mod: 'edu', n: L('Ficha en lenguaje claro'), campos: ['fuente', 'nivel', 'extra'], clinico: true,
    instr: 'Convierte el texto de la FUENTE en una ficha educativa en lenguaje claro para el público indicado: título, ideas clave en frases cortas, qué hacer y cuándo consultar al equipo sanitario. No añadas información que no esté en la fuente.'},
  {id: 'edu.faq', mod: 'edu', n: L('Preguntas frecuentes'), campos: ['fuente', 'nivel', 'extra'], clinico: true,
    instr: 'A partir de la FUENTE, redacta de 5 a 8 preguntas frecuentes con respuestas breves en lenguaje claro para el público indicado. Cada respuesta debe apoyarse en la fuente; si la fuente no responde algo, no lo incluyas.'},
  {id: 'edu.trad', mod: 'edu', n: L('Traducción'), campos: ['texto', 'idioma', 'extra'], traduce: true,
    instr: 'Traduce el texto al idioma de destino con lenguaje claro y culturalmente adecuado, conservando el significado exacto, las cifras y los marcadores entre corchetes. Al final, en una línea aparte, indica los términos que conviene revisar con una persona nativa.'},
  {id: 'reu.acta', mod: 'reu', n: L('Acta de reunión'), campos: ['notas', 'tipoReu', 'fecha', 'extra'],
    instr: 'Redacta el acta a partir de las NOTAS: datos de la reunión, asistencia (solo número o cargos, sin nombres), resumen de lo tratado, acuerdos numerados y tareas con responsable (por cargo) y plazo si consta. No añadas acuerdos que no estén en las notas.'},
  {id: 'reu.orden', mod: 'reu', n: L('Orden del día'), campos: ['temas', 'tipoReu', 'duracion', 'extra'],
    instr: 'Prepara un orden del día con puntos numerados, tiempo estimado por punto ajustado a la duración, objetivo de cada punto (informar, debatir o decidir) y documentación previa necesaria.'},
  {id: 'pro.req', mod: 'pro', n: L('Requisitos de una convocatoria'), campos: ['bases', 'extra'],
    instr: 'Extrae de las BASES una matriz de requisitos: quién puede presentarse, plazos, documentación, gastos subvencionables, criterios de valoración y obligaciones de justificación. Señala al final las dudas que conviene consultar con el organismo.'},
  {id: 'pro.ficha', mod: 'pro', n: L('Ficha de proyecto'), campos: ['idea', 'presupuesto', 'duracion', 'extra'],
    instr: 'Estructura una ficha de proyecto: título, necesidad detectada, población destinataria, objetivo general, objetivos específicos, actividades, indicadores medibles con su fuente de verificación, cronograma, riesgos y medidas, y presupuesto por partidas. Donde falten datos, usa [COMPLETAR: …].'},
  {id: 'pro.carta', mod: 'pro', n: L('Carta a un financiador'), campos: ['financiador', 'proyecto', 'extra'],
    instr: 'Redacta una carta o correo de aproximación a la entidad financiadora: presentación breve de la asociación, necesidad, propuesta de colaboración, valor para la entidad y para las personas beneficiarias, y propuesta de reunión. Respeta la independencia de la asociación: nada de contraprestaciones que condicionen contenidos.'},
  {id: 'inc.carta', mod: 'inc', n: L('Carta a la administración'), campos: ['destinatario', 'problema', 'peticion', 'extra'],
    instr: 'Redacta una carta formal a la administración: identificación de la asociación, exposición del problema con los hechos aportados, petición concreta, disposición a colaborar y solicitud de reunión. Tono respetuoso y firme.'},
  {id: 'inc.pos', mod: 'inc', n: L('Posicionamiento público'), campos: ['tema', 'fuenteOpc', 'extra'],
    instr: 'Redacta un posicionamiento público de la asociación sobre el tema: contexto, postura, argumentos y propuestas. Si hay texto de apoyo, basa los datos en él; si no, no aportes cifras.'},
  {id: 'eva.enc', mod: 'eva', n: L('Encuesta antes y después'), campos: ['actividad', 'objetivo', 'extra'],
    instr: 'Diseña una encuesta breve y anónima para aplicar antes y después de la actividad: de 6 a 10 preguntas (escalas de 1 a 5 y 1 o 2 abiertas), mismas preguntas en ambos momentos, instrucciones para quien responde y cómo comparar los resultados. No pidas datos identificativos.'},
  {id: 'eva.ana', mod: 'eva', n: L('Análisis de respuestas abiertas'), campos: ['respuestas', 'extra'],
    instr: 'Agrupa las RESPUESTAS en temas: para cada tema, nombre, descripción breve y una respuesta literal de ejemplo. Termina con propuestas de mejora derivadas de las respuestas. No cuentes respuestas: el recuento lo hace el código.'}
];
const tareaDe = id => TAREAS.find(x => x.id === id);

const TIPOS_ACT = [L('Taller o formación'), L('Sensibilización'), L('Campaña o publicación'), L('Reunión institucional'), L('Acompañamiento o atención'), L('Proyecto'), L('Otra')];
const ESTADOS = {borrador: L('Borrador'), revisada: L('Revisada'), aprobada: L('Aprobada')};

/* perfiles de partida (contenido de la asociación: se escribe en su idioma de trabajo y se edita en «Perfil») */
const PRESETS = {
  diabetes: {nombre: '', siglas: '', patologia: 'Diabetes', territorio: '', mision: '',
    publicos: 'Personas con diabetes tipo 1 y sus familias\nPersonas con diabetes tipo 2\nProfesorado y centros educativos\nProfesionales sanitarios',
    tono: 'Cercano, claro y positivo. Sin alarmismo ni culpabilización.',
    preferir: 'persona con diabetes\nniño o niña con diabetes', evitar: 'diabético\nsufrir diabetes\nenfermo de diabetes',
    fuentes: 'Federación Española de Diabetes (FEDE) | https://fedesp.es\nSociedad Española de Diabetes (SED) | https://www.sediabetes.org\nMinisterio de Sanidad | https://www.sanidad.gob.es\nMedlinePlus en español | https://medlineplus.gov/spanish/',
    calendario: '11-14 | Día Mundial de la Diabetes', revisor: ''},
  otra: {nombre: '', siglas: '', patologia: '', territorio: '', mision: '', publicos: 'Pacientes y familias\nProfesionales sanitarios\nAdministraciones públicas',
    tono: 'Cercano, claro y respetuoso. Sin alarmismo.', preferir: 'persona con …', evitar: '',
    fuentes: 'Ministerio de Sanidad | https://www.sanidad.gob.es\nMedlinePlus en español | https://medlineplus.gov/spanish/\nOrganización Mundial de la Salud | https://www.who.int', calendario: '', revisor: ''}
};

/* ── ejemplo sin clave: una asociación FICTICIA con piezas ya generadas (respuestas precalculadas) en cada idioma ── */
const EJ_TXT = {
  es: {mision: 'Mejorar la calidad de vida de las personas con diabetes y sus familias mediante información, acompañamiento y defensa de sus derechos.', publicos: 'Familias de niños y niñas con diabetes tipo 1\nPersonas adultas con diabetes tipo 2\nProfesorado\nProfesionales sanitarios', tono: 'Cercano, claro y positivo. Sin alarmismo.',
    notas: 'Junta directiva del 3 de octubre. Asisten 6 personas. Se acuerda organizar una charla para profesorado en noviembre. Se acuerda pedir una reunión a la consejería sobre enfermería escolar. La secretaría preparará el cartel de la charla.',
    actaT: 'Acta de la junta directiva del 3 de octubre', acta: '## Datos de la reunión\nJunta directiva, 3 de octubre. Asisten 6 personas.\n\n## Acuerdos\n1. Organizar una charla para profesorado en noviembre.\n2. Pedir una reunión a la consejería sobre enfermería escolar.\n3. Abrir una campaña de captación de socios.\n\n## Tareas\n- Secretaría: preparar el cartel de la charla.',
    af: [['Organizar una charla para profesorado en noviembre', 'Se acuerda organizar una charla para profesorado en noviembre'], ['Pedir una reunión a la consejería sobre enfermería escolar', 'Se acuerda pedir una reunión a la consejería sobre enfermería escolar'], ['Abrir una campaña de captación de socios', 'Se acuerda abrir una campaña de captación de socios'], ['La secretaría prepara el cartel', 'La secretaría preparará el cartel de la charla']],
    fuente: 'La hipoglucemia es una bajada de la glucosa en sangre. Puede causar temblor, sudor, hambre y confusión. Ante una hipoglucemia hay que seguir el plan de acción indicado por el equipo sanitario. En el colegio, el profesorado debe conocer ese plan.',
    fichaT: 'Bajada de azúcar: qué es y qué hacer', ficha: '## ¿Qué es?\nUna bajada de la glucosa en sangre. [REVISAR]\n\n## Cómo se nota\n- Temblor, sudor, hambre o confusión.\n\n## Qué hacer\n- Seguir el plan de acción del equipo sanitario.\n- En el colegio, el profesorado debe conocer ese plan.',
    af2: [['Es una bajada de la glucosa en sangre', 'La hipoglucemia es una bajada de la glucosa en sangre'], ['Puede causar temblor, sudor, hambre y confusión', 'Puede causar temblor, sudor, hambre y confusión'], ['Hay que seguir el plan del equipo sanitario', 'hay que seguir el plan de acción indicado por el equipo sanitario']],
    postT: 'Publicación: charla para profesorado', post: '¿Tienes en clase a un niño o niña con diabetes? Te invitamos a nuestra charla para profesorado: qué es la diabetes tipo 1 y cómo actuar en el aula. Los alumnos diabéticos necesitan un entorno seguro.\n\n📅 Noviembre · 📍 [COMPLETAR: lugar]\n\n#DiabetesEnElCole #Profesorado',
    acts: [['2026-03-12', 0, 'Charla para profesorado sobre diabetes tipo 1', 35], ['2025-11-14', 2, 'Campaña del Día Mundial de la Diabetes', 1200], ['2026-05-20', 3, 'Reunión con la consejería sobre enfermería escolar', 3], ['2026-06-10', 4, 'Grupo de apoyo para familias', 18]]},
  ca: {mision: 'Millorar la qualitat de vida de les persones amb diabetis i les seves famílies mitjançant informació, acompanyament i defensa dels seus drets.', publicos: 'Famílies d’infants amb diabetis tipus 1\nPersones adultes amb diabetis tipus 2\nProfessorat\nProfessionals sanitaris', tono: 'Proper, clar i positiu. Sense alarmisme.',
    notas: 'Junta directiva del 3 d’octubre. Hi assisteixen 6 persones. S’acorda organitzar una xerrada per al professorat al novembre. S’acorda demanar una reunió a la conselleria sobre infermeria escolar. La secretaria prepararà el cartell de la xerrada.',
    actaT: 'Acta de la junta directiva del 3 d’octubre', acta: '## Dades de la reunió\nJunta directiva, 3 d’octubre. Hi assisteixen 6 persones.\n\n## Acords\n1. Organitzar una xerrada per al professorat al novembre.\n2. Demanar una reunió a la conselleria sobre infermeria escolar.\n3. Obrir una campanya de captació de socis.\n\n## Tasques\n- Secretaria: preparar el cartell de la xerrada.',
    af: [['Organitzar una xerrada per al professorat al novembre', 'S’acorda organitzar una xerrada per al professorat al novembre'], ['Demanar una reunió a la conselleria sobre infermeria escolar', 'S’acorda demanar una reunió a la conselleria sobre infermeria escolar'], ['Obrir una campanya de captació de socis', 'S’acorda obrir una campanya de captació de socis'], ['La secretaria prepara el cartell', 'La secretaria prepararà el cartell de la xerrada']],
    fuente: 'La hipoglucèmia és una baixada de la glucosa en sang. Pot causar tremolor, suor, gana i confusió. Davant d’una hipoglucèmia cal seguir el pla d’acció indicat per l’equip sanitari. A l’escola, el professorat ha de conèixer aquest pla.',
    fichaT: 'Baixada de sucre: què és i què cal fer', ficha: '## Què és?\nUna baixada de la glucosa en sang. [REVISAR]\n\n## Com es nota\n- Tremolor, suor, gana o confusió.\n\n## Què cal fer\n- Seguir el pla d’acció de l’equip sanitari.\n- A l’escola, el professorat ha de conèixer aquest pla.',
    af2: [['És una baixada de la glucosa en sang', 'La hipoglucèmia és una baixada de la glucosa en sang'], ['Pot causar tremolor, suor, gana i confusió', 'Pot causar tremolor, suor, gana i confusió'], ['Cal seguir el pla de l’equip sanitari', 'cal seguir el pla d’acció indicat per l’equip sanitari']],
    postT: 'Publicació: xerrada per al professorat', post: 'Tens a classe un infant amb diabetis? Et convidem a la nostra xerrada per al professorat: què és la diabetis tipus 1 i com actuar a l’aula. Els alumnes diabètics necessiten un entorn segur.\n\n📅 Novembre · 📍 [COMPLETAR: lloc]\n\n#DiabetisALEscola #Professorat',
    acts: [['2026-03-12', 0, 'Xerrada per al professorat sobre diabetis tipus 1', 35], ['2025-11-14', 2, 'Campanya del Dia Mundial de la Diabetis', 1200], ['2026-05-20', 3, 'Reunió amb la conselleria sobre infermeria escolar', 3], ['2026-06-10', 4, 'Grup de suport per a famílies', 18]]},
  eu: {mision: 'Diabetesa duten pertsonen eta haien familien bizi-kalitatea hobetzea, informazioaren, laguntzaren eta eskubideen defentsaren bidez.', publicos: '1 motako diabetesa duten haurren familiak\n2 motako diabetesa duten helduak\nIrakasleak\nOsasun-profesionalak', tono: 'Hurbila, argia eta baikorra. Alarmismorik gabe.',
    notas: 'Urriaren 3ko zuzendaritza-batzarra. 6 pertsona bertaratu dira. Azaroan irakasleentzako hitzaldi bat antolatzea erabaki da. Kontseilaritzari eskola-erizaintzari buruzko bilera bat eskatzea erabaki da. Idazkaritzak hitzaldiaren kartela prestatuko du.',
    actaT: 'Urriaren 3ko zuzendaritza-batzarraren akta', acta: '## Bileraren datuak\nZuzendaritza-batzarra, urriaren 3a. 6 pertsona bertaratu dira.\n\n## Erabakiak\n1. Azaroan irakasleentzako hitzaldi bat antolatzea.\n2. Kontseilaritzari eskola-erizaintzari buruzko bilera bat eskatzea.\n3. Bazkideak erakartzeko kanpaina bat abiaraztea.\n\n## Zereginak\n- Idazkaritza: hitzaldiaren kartela prestatzea.',
    af: [['Azaroan irakasleentzako hitzaldi bat antolatzea', 'Azaroan irakasleentzako hitzaldi bat antolatzea erabaki da'], ['Kontseilaritzari eskola-erizaintzari buruzko bilera eskatzea', 'Kontseilaritzari eskola-erizaintzari buruzko bilera bat eskatzea erabaki da'], ['Bazkideak erakartzeko kanpaina abiaraztea', 'Bazkideak erakartzeko kanpaina bat abiaraztea erabaki da'], ['Idazkaritzak kartela prestatzen du', 'Idazkaritzak hitzaldiaren kartela prestatuko du']],
    fuente: 'Hipogluzemia odoleko glukosaren jaitsiera da. Dardara, izerdia, gosea eta nahasmena eragin ditzake. Hipogluzemia baten aurrean, osasun-taldeak adierazitako ekintza-plana jarraitu behar da. Eskolan, irakasleek plan hori ezagutu behar dute.',
    fichaT: 'Azukre-jaitsiera: zer den eta zer egin', ficha: '## Zer da?\nOdoleko glukosaren jaitsiera. [REVISAR]\n\n## Nola nabaritzen da\n- Dardara, izerdia, gosea edo nahasmena.\n\n## Zer egin\n- Osasun-taldearen ekintza-plana jarraitu.\n- Eskolan, irakasleek plan hori ezagutu behar dute.',
    af2: [['Odoleko glukosaren jaitsiera da', 'Hipogluzemia odoleko glukosaren jaitsiera da'], ['Dardara, izerdia, gosea eta nahasmena eragin ditzake', 'Dardara, izerdia, gosea eta nahasmena eragin ditzake'], ['Osasun-taldearen plana jarraitu behar da', 'osasun-taldeak adierazitako ekintza-plana jarraitu behar da']],
    postT: 'Argitalpena: irakasleentzako hitzaldia', post: 'Diabetesa duen haurren bat al duzu ikasgelan? Irakasleentzako gure hitzaldira gonbidatzen zaitugu: zer den 1 motako diabetesa eta nola jardun ikasgelan. Ikasle diabetikoek ingurune segurua behar dute.\n\n📅 Azaroa · 📍 [COMPLETAR: lekua]\n\n#DiabetesaEskolan #Irakasleak',
    acts: [['2026-03-12', 0, 'Irakasleentzako hitzaldia 1 motako diabetesari buruz', 35], ['2025-11-14', 2, 'Diabetesaren Mundu Egunaren kanpaina', 1200], ['2026-05-20', 3, 'Bilera kontseilaritzarekin eskola-erizaintzari buruz', 3], ['2026-06-10', 4, 'Familientzako laguntza-taldea', 18]]},
  gl: {mision: 'Mellorar a calidade de vida das persoas con diabetes e das súas familias mediante información, acompañamento e defensa dos seus dereitos.', publicos: 'Familias de nenos e nenas con diabetes tipo 1\nPersoas adultas con diabetes tipo 2\nProfesorado\nProfesionais sanitarios', tono: 'Próximo, claro e positivo. Sen alarmismo.',
    notas: 'Xunta directiva do 3 de outubro. Asisten 6 persoas. Acórdase organizar unha charla para o profesorado en novembro. Acórdase pedir unha reunión á consellería sobre enfermaría escolar. A secretaría preparará o cartel da charla.',
    actaT: 'Acta da xunta directiva do 3 de outubro', acta: '## Datos da reunión\nXunta directiva, 3 de outubro. Asisten 6 persoas.\n\n## Acordos\n1. Organizar unha charla para o profesorado en novembro.\n2. Pedir unha reunión á consellería sobre enfermaría escolar.\n3. Abrir unha campaña de captación de socios.\n\n## Tarefas\n- Secretaría: preparar o cartel da charla.',
    af: [['Organizar unha charla para o profesorado en novembro', 'Acórdase organizar unha charla para o profesorado en novembro'], ['Pedir unha reunión á consellería sobre enfermaría escolar', 'Acórdase pedir unha reunión á consellería sobre enfermaría escolar'], ['Abrir unha campaña de captación de socios', 'Acórdase abrir unha campaña de captación de socios'], ['A secretaría prepara o cartel', 'A secretaría preparará o cartel da charla']],
    fuente: 'A hipoglicemia é unha baixada da glicosa no sangue. Pode causar tremor, suor, fame e confusión. Ante unha hipoglicemia hai que seguir o plan de acción indicado polo equipo sanitario. No colexio, o profesorado debe coñecer ese plan.',
    fichaT: 'Baixada de azucre: que é e que facer', ficha: '## Que é?\nUnha baixada da glicosa no sangue. [REVISAR]\n\n## Como se nota\n- Tremor, suor, fame ou confusión.\n\n## Que facer\n- Seguir o plan de acción do equipo sanitario.\n- No colexio, o profesorado debe coñecer ese plan.',
    af2: [['É unha baixada da glicosa no sangue', 'A hipoglicemia é unha baixada da glicosa no sangue'], ['Pode causar tremor, suor, fame e confusión', 'Pode causar tremor, suor, fame e confusión'], ['Hai que seguir o plan do equipo sanitario', 'hai que seguir o plan de acción indicado polo equipo sanitario']],
    postT: 'Publicación: charla para o profesorado', post: 'Tes na aula un neno ou nena con diabetes? Convidámoste á nosa charla para o profesorado: que é a diabetes tipo 1 e como actuar na aula. Os alumnos diabéticos necesitan un contorno seguro.\n\n📅 Novembro · 📍 [COMPLETAR: lugar]\n\n#DiabetesNoCole #Profesorado',
    acts: [['2026-03-12', 0, 'Charla para o profesorado sobre diabetes tipo 1', 35], ['2025-11-14', 2, 'Campaña do Día Mundial da Diabetes', 1200], ['2026-05-20', 3, 'Reunión coa consellería sobre enfermaría escolar', 3], ['2026-06-10', 4, 'Grupo de apoio para familias', 18]]},
  en: {mision: 'To improve the quality of life of people with diabetes and their families through information, support and advocacy for their rights.', publicos: 'Families of children with type 1 diabetes\nAdults with type 2 diabetes\nTeachers\nHealth professionals', tono: 'Warm, clear and positive. No alarmism.',
    notas: 'Board meeting on 3 October. 6 people attend. It is agreed to organise a talk for teachers in November. It is agreed to request a meeting with the regional health department about school nursing. The secretary will prepare the poster for the talk.',
    actaT: 'Minutes of the board meeting on 3 October', acta: '## Meeting details\nBoard meeting, 3 October. 6 people attend.\n\n## Agreements\n1. Organise a talk for teachers in November.\n2. Request a meeting with the regional health department about school nursing.\n3. Launch a membership campaign.\n\n## Tasks\n- Secretary: prepare the poster for the talk.',
    af: [['Organise a talk for teachers in November', 'It is agreed to organise a talk for teachers in November'], ['Request a meeting about school nursing', 'It is agreed to request a meeting with the regional health department about school nursing'], ['Launch a membership campaign', 'It is agreed to launch a membership campaign'], ['The secretary prepares the poster', 'The secretary will prepare the poster for the talk']],
    fuente: 'Hypoglycaemia is a drop in blood glucose. It can cause shaking, sweating, hunger and confusion. In the event of hypoglycaemia, follow the action plan given by the healthcare team. At school, teachers should know that plan.',
    fichaT: 'Low blood sugar: what it is and what to do', ficha: '## What is it?\nA drop in blood glucose. [REVISAR]\n\n## How you notice it\n- Shaking, sweating, hunger or confusion.\n\n## What to do\n- Follow the healthcare team’s action plan.\n- At school, teachers should know that plan.',
    af2: [['It is a drop in blood glucose', 'Hypoglycaemia is a drop in blood glucose'], ['It can cause shaking, sweating, hunger and confusion', 'It can cause shaking, sweating, hunger and confusion'], ['Follow the healthcare team’s plan', 'follow the action plan given by the healthcare team']],
    postT: 'Post: talk for teachers', post: 'Do you have a child with diabetes in your class? Join our talk for teachers: what type 1 diabetes is and how to act in the classroom. Diabetic pupils need a safe environment.\n\n📅 November · 📍 [COMPLETAR: venue]\n\n#DiabetesAtSchool #Teachers',
    acts: [['2026-03-12', 0, 'Talk for teachers on type 1 diabetes', 35], ['2025-11-14', 2, 'World Diabetes Day campaign', 1200], ['2026-05-20', 3, 'Meeting with the health department about school nursing', 3], ['2026-06-10', 4, 'Support group for families', 18]]},
  pt: {mision: 'Melhorar a qualidade de vida das pessoas com diabetes e das suas famílias através de informação, acompanhamento e defesa dos seus direitos.', publicos: 'Famílias de crianças com diabetes tipo 1\nAdultos com diabetes tipo 2\nProfessores\nProfissionais de saúde', tono: 'Próximo, claro e positivo. Sem alarmismo.',
    notas: 'Reunião da direção de 3 de outubro. Estão presentes 6 pessoas. Acorda-se organizar uma palestra para professores em novembro. Acorda-se pedir uma reunião à secretaria regional de saúde sobre enfermagem escolar. O secretariado preparará o cartaz da palestra.',
    actaT: 'Ata da reunião da direção de 3 de outubro', acta: '## Dados da reunião\nReunião da direção, 3 de outubro. Estão presentes 6 pessoas.\n\n## Acordos\n1. Organizar uma palestra para professores em novembro.\n2. Pedir uma reunião sobre enfermagem escolar.\n3. Lançar uma campanha de angariação de sócios.\n\n## Tarefas\n- Secretariado: preparar o cartaz da palestra.',
    af: [['Organizar uma palestra para professores em novembro', 'Acorda-se organizar uma palestra para professores em novembro'], ['Pedir uma reunião sobre enfermagem escolar', 'Acorda-se pedir uma reunião à secretaria regional de saúde sobre enfermagem escolar'], ['Lançar uma campanha de angariação de sócios', 'Acorda-se lançar uma campanha de angariação de sócios'], ['O secretariado prepara o cartaz', 'O secretariado preparará o cartaz da palestra']],
    fuente: 'A hipoglicemia é uma descida da glicose no sangue. Pode causar tremores, suores, fome e confusão. Perante uma hipoglicemia deve seguir-se o plano de ação indicado pela equipa de saúde. Na escola, os professores devem conhecer esse plano.',
    fichaT: 'Descida de açúcar: o que é e o que fazer', ficha: '## O que é?\nUma descida da glicose no sangue. [REVISAR]\n\n## Como se nota\n- Tremores, suores, fome ou confusão.\n\n## O que fazer\n- Seguir o plano de ação da equipa de saúde.\n- Na escola, os professores devem conhecer esse plano.',
    af2: [['É uma descida da glicose no sangue', 'A hipoglicemia é uma descida da glicose no sangue'], ['Pode causar tremores, suores, fome e confusão', 'Pode causar tremores, suores, fome e confusão'], ['Deve seguir-se o plano da equipa de saúde', 'deve seguir-se o plano de ação indicado pela equipa de saúde']],
    postT: 'Publicação: palestra para professores', post: 'Tem na turma uma criança com diabetes? Convidamo-lo para a nossa palestra para professores: o que é a diabetes tipo 1 e como agir na sala de aula. Os alunos diabéticos precisam de um ambiente seguro.\n\n📅 Novembro · 📍 [COMPLETAR: local]\n\n#DiabetesNaEscola #Professores',
    acts: [['2026-03-12', 0, 'Palestra para professores sobre diabetes tipo 1', 35], ['2025-11-14', 2, 'Campanha do Dia Mundial da Diabetes', 1200], ['2026-05-20', 3, 'Reunião sobre enfermagem escolar', 3], ['2026-06-10', 4, 'Grupo de apoio para famílias', 18]]}
};
/* palabras que el perfil de ejemplo pide evitar, en cada idioma (para que el aviso del glosario se vea en la demostración) */
const EJ_EVITAR = {es: 'diabético\ndiabéticos', ca: 'diabètic\ndiabètics', eu: 'diabetiko\ndiabetikoek', gl: 'diabético\ndiabéticos', en: 'diabetic\ndiabetics', pt: 'diabético\ndiabéticos'};
