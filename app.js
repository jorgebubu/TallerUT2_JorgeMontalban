const CLAVE_STORAGE = 'motorshield_tickets_jm';

// ---------- Utilidades PII (Escudo RGPD) ----------
function sanitizarTextoPII(texto) {
  // DNI/NIE español (8 números y 1 letra)
  texto = texto.replace(/\b\d{8}[A-Za-z]\b/g, '[DNI_OCULTO]');
  // Tarjeta 16 dígitos
  texto = texto.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[TARJETA_OCULTA]');
  // IPv4
  texto = texto.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_OCULTA]');
  // Teléfonos 9 dígitos
  texto = texto.replace(/\b[6789]\d{8}\b/g, '[TELEFONO_OCULTO]');
  // IBAN
  texto = texto.replace(/\bES\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/gi, '[IBAN_OCULTO]');
  // Matrícula española (4 dígitos + 3 letras o 1234-ABC)
  texto = texto.replace(/\b\d{4}[-\s]?[A-Za-z]{3}\b/g, '[MATRICULA_OCULTA]');
  return texto;
}

const FRASES_INJECTION = ['ignora las instrucciones', 'ignora todas las instrucciones', 'olvida tus reglas', 'ignora tus reglas', 'eres ahora un asistente'];

function detectarInjection(texto) {
  const t = texto.toLowerCase();
  return FRASES_INJECTION.some(f => t.includes(f));
}

// ---------- Datos ----------
function cargarTicketsIniciales() {
  const guardados = localStorage.getItem(CLAVE_STORAGE);
  if (guardados) {
    try { return JSON.parse(guardados); } catch (e) {}
  }
  return null;
}

async function obtenerTickets() {
  // Reto B: intentar Supabase si configurado
  const sbUrl = sessionStorage.getItem('sb_url');
  const sbKey = sessionStorage.getItem('sb_key');
  if (sbUrl && sbKey) {
    try {
      const res = await fetch(sbUrl + '/rest/v1/tickets?select=*', {
        headers: { 'apikey': sbKey, 'Authorization': 'Bearer ' + sbKey }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          localStorage.setItem(CLAVE_STORAGE, JSON.stringify(data));
          return data;
        }
      }
    } catch (e) { console.warn('Supabase no disponible, uso local'); }
  }
  let tickets = cargarTicketsIniciales();
  if (!tickets) {
    // cargar desde datos_tickets.json
    try {
      const res = await fetch('datos_tickets.json');
      const data = await res.json();
      tickets = data;
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(tickets));
    } catch (e) {
      tickets = [];
    }
  }
  return tickets;
}

let tickets = [];
let filtroCategoria = 'TODAS';
let textoBusqueda = '';

function guardarTickets() {
  localStorage.setItem(CLAVE_STORAGE, JSON.stringify(tickets));
  // Reto B: sincronizar con Supabase si configurado
  const sbUrl = sessionStorage.getItem('sb_url');
  const sbKey = sessionStorage.getItem('sb_key');
  if (sbUrl && sbKey) {
    // best-effort upsert del último ticket no sincronizado se omite por simplicidad
  }
}

// ---------- Render ----------
function prioridadClase(p) {
  if (p === 'ALTA') return 'badge-alta';
  if (p === 'MEDIA') return 'badge-media';
  return 'badge-baja';
}

function renderTickets() {
  const cont = document.getElementById('listaTickets');
  cont.innerHTML = '';
  const filtrados = tickets.filter(t => {
    const catOk = filtroCategoria === 'TODAS' || t.categoria === filtroCategoria;
    const q = textoBusqueda.toLowerCase();
    const txtOk = !q || (t.autor + ' ' + t.ubicacion + ' ' + (t.mensaje_anonimizado||'')).toLowerCase().includes(q);
    return catOk && txtOk;
  });
  filtrados.forEach(t => {
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-slate-800 rounded-xl shadow p-4 space-y-2';
    const badge = `<span class="px-2 py-1 rounded text-xs font-bold ${prioridadClase(t.prioridad)}">${t.prioridad}</span>`;
    const estado = t.estado === 'RESUELTO' ? '<span class="text-green-500 font-semibold">RESUELTO</span>' : `<span class="text-slate-500">${t.estado}</span>`;
    card.innerHTML = `
      <div class="flex justify-between items-start gap-2">
        <div>
          <h3 class="font-bold">${escapeHtml(t.autor)}</h3>
          <p class="text-xs text-slate-500">${escapeHtml(t.ubicacion)} · ${escapeHtml(t.categoria)}</p>
        </div>
        <div class="flex gap-2 items-center">${badge} ${estado}</div>
      </div>
      <p class="text-sm">${escapeHtml(t.mensaje_anonimizado)}</p>
      <p class="text-xs italic text-slate-500">Razonamiento IA: ${escapeHtml(t.razonamiento_ia)}</p>
      <p class="text-xs text-slate-400">Tiempo estimado: ${t.tiempo_estimado_minutos} min</p>
      <div class="flex gap-2">
        ${t.estado !== 'RESUELTO' ? `<button data-id="${t.id}" class="btnResolver px-3 py-1 rounded bg-green-600 text-white text-xs">Marcar RESUELTO</button>` : ''}
        <button data-id="${t.id}" class="btnRespuesta px-3 py-1 rounded bg-indigo-600 text-white text-xs">Generar Respuesta</button>
      </div>
    `;
    cont.appendChild(card);
  });
  actualizarKPIs();
  // listeners
  document.querySelectorAll('.btnResolver').forEach(b => b.addEventListener('click', () => {
    const id = Number(b.dataset.id);
    const t = tickets.find(x => x.id === id);
    if (t) { t.estado = 'RESUELTO'; guardarTickets(); renderTickets(); }
  }));
  document.querySelectorAll('.btnRespuesta').forEach(b => b.addEventListener('click', () => {
    const id = Number(b.dataset.id);
    const t = tickets.find(x => x.id === id);
    if (t) generarRespuesta(t);
  }));
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function actualizarKPIs() {
  document.getElementById('kpiTotal').textContent = tickets.length;
  document.getElementById('kpiAlta').textContent = tickets.filter(t => t.prioridad === 'ALTA' && t.estado !== 'RESUELTO').length;
  const piiTotal = tickets.reduce((acc, t) => acc + (t.pii_detectada ? t.pii_detectada.length : 0), 0);
  document.getElementById('kpiPii').textContent = piiTotal;
  const bloq = tickets.filter(t => t.estado === 'BLOQUEADO_PROMPT_INJECTION' || t.estado === 'RECHAZADO_FUERA_DE_TEMA').length;
  document.getElementById('kpiBloq').textContent = bloq;
}

// ---------- Modal nuevo ----------
function abrirModalNuevo() {
  document.getElementById('modalNuevo').classList.remove('hidden');
  document.getElementById('modalNuevo').classList.add('flex');
}
function cerrarModalNuevo() {
  document.getElementById('modalNuevo').classList.add('hidden');
  document.getElementById('modalNuevo').classList.remove('flex');
}

function actualizarPreview() {
  const txt = document.getElementById('nMensaje').value;
  const sanit = sanitizarTextoPII(txt);
  document.getElementById('previewRgpd').textContent = sanit;
  const alerta = document.getElementById('alertaInjection');
  if (detectarInjection(txt)) {
    alerta.textContent = '⚠ Alerta: posible Prompt Injection detectado. No se puede enviar.';
    alerta.classList.remove('hidden');
  } else {
    alerta.classList.add('hidden');
  }
}

async function guardarNuevoTicket() {
  const autor = document.getElementById('nAutor').value.trim();
  const ubicacion = document.getElementById('nUbicacion').value.trim();
  const categoria = document.getElementById('nCategoria').value;
  const mensaje = document.getElementById('nMensaje').value.trim();
  if (!autor || !mensaje) { alert('Autor y mensaje son obligatorios'); return; }
  if (detectarInjection(mensaje)) { alert('Bloqueado por Prompt Injection'); return; }

  let categoriaFinal = categoria;
  let prioridadFinal = 'MEDIA';
  let solucionFinal = 'Revisar incidencia reportada.';
  let tiempoFinal = 30;

  // Reto A: si hay GROQ_API_KEY, clasificar con IA
  const groqKey = sessionStorage.getItem('groq_key');
  if (groqKey) {
    try {
      const prompt = `Clasifica esta incidencia de taller mecánico. Devuelve SOLO JSON con campos categoria (REDES,HARDWARE,SOFTWARE,FACTURACION,SEGURIDAD,OTROS), prioridad (ALTA,MEDIA,BAJA), solucion_sugerida (string), tiempo_estimado_minutos (numero). Incidencia: ${mensaje}`;
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{role:'user', content: prompt}], temperature: 0.2 })
      });
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        categoriaFinal = parsed.categoria || categoriaFinal;
        prioridadFinal = parsed.prioridad || prioridadFinal;
        solucionFinal = parsed.solucion_sugerida || solucionFinal;
        tiempoFinal = parsed.tiempo_estimado_minutos || tiempoFinal;
      }
    } catch (e) { console.warn('Groq no disponible, uso valores manuales'); }
  }

  const nuevo = {
    id: Date.now(),
    autor: autor,
    ubicacion: ubicacion || 'Taller',
    categoria: categoriaFinal,
    mensaje_anonimizado: sanitizarTextoPII(mensaje),
    pii_detectada: [],
    razonamiento_ia: 'Ticket creado manualmente desde el dashboard.',
    prioridad: prioridadFinal,
    estado: 'PENDIENTE',
    tiempo_estimado_minutos: tiempoFinal,
    solucion_sugerida: solucionFinal
  };
  tickets.push(nuevo);
  guardarTickets();
  cerrarModalNuevo();
  renderTickets();
}

// ---------- Exportar Markdown (Fase 6 Opción A) ----------
function exportarMarkdown() {
  const total = tickets.length;
  const alta = tickets.filter(t => t.prioridad === 'ALTA' && t.estado !== 'RESUELTO').length;
  const piiTotal = tickets.reduce((acc, t) => acc + (t.pii_detectada ? t.pii_detectada.length : 0), 0);
  const bloq = tickets.filter(t => t.estado === 'BLOQUEADO_PROMPT_INJECTION' || t.estado === 'RECHAZADO_FUERA_DE_TEMA').length;
  const urgentes = tickets.filter(t => t.prioridad === 'ALTA').map(t => `- #${t.id} ${t.autor} (${t.ubicacion}) - ${t.estado}`).join('\n');
  const md = `# Informe de Incidencias - MotorShield Taller - JM

## Estadísticas
| Métrica | Valor |
|---|---|
| Total tickets | ${total} |
| Pendientes ALTA | ${alta} |
| PII interceptados | ${piiTotal} |
| Ataques/Rechazos | ${bloq} |

## Tickets Urgentes (ALTA)
${urgentes || 'Ninguno'}

## Resumen PII protegidos
Total de datos privados interceptados: ${piiTotal}

## Listado completo
${tickets.map(t => `- #${t.id} [${t.prioridad}] ${t.autor} - ${t.categoria} - ${t.estado}`).join('\n')}
`;
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'informe_incidencias.md';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Respuesta automática (Opción B auxiliar) ----------
function generarRespuesta(t) {
  const plantilla = `Estimado/a ${t.autor},\n\nHemos recibido su incidencia en ${t.ubicacion} (categoría ${t.categoria}).\nSolución propuesta: ${t.solucion_sugerida}\nTiempo estimado: ${t.tiempo_estimado_minutos} minutos.\n\nGracias por contactar con MotorShield Taller - JM.`;
  alert(plantilla);
}

// ---------- Config ----------
function abrirConfig() {
  document.getElementById('cfgGroq').value = sessionStorage.getItem('groq_key') || '';
  document.getElementById('cfgSbUrl').value = sessionStorage.getItem('sb_url') || '';
  document.getElementById('cfgSbKey').value = sessionStorage.getItem('sb_key') || '';
  const m = document.getElementById('modalConfig');
  m.classList.remove('hidden'); m.classList.add('flex');
}
function cerrarConfig() {
  const m = document.getElementById('modalConfig');
  m.classList.add('hidden'); m.classList.remove('flex');
}

// ---------- Init ----------
async function init() {
  tickets = await obtenerTickets();
  renderTickets();

  document.getElementById('btnNuevo').addEventListener('click', abrirModalNuevo);
  document.getElementById('btnCancelar').addEventListener('click', cerrarModalNuevo);
  document.getElementById('btnGuardar').addEventListener('click', guardarNuevoTicket);
  document.getElementById('nMensaje').addEventListener('input', actualizarPreview);
  document.getElementById('filtroCategoria').addEventListener('change', (e) => { filtroCategoria = e.target.value; renderTickets(); });
  document.getElementById('buscador').addEventListener('input', (e) => { textoBusqueda = e.target.value; renderTickets(); });
  document.getElementById('btnExportar').addEventListener('click', exportarMarkdown);
  document.getElementById('btnConfig').addEventListener('click', abrirConfig);
  document.getElementById('btnCerrarConfig').addEventListener('click', cerrarConfig);
  document.getElementById('btnGuardarConfig').addEventListener('click', () => {
    sessionStorage.setItem('groq_key', document.getElementById('cfgGroq').value.trim());
    sessionStorage.setItem('sb_url', document.getElementById('cfgSbUrl').value.trim());
    sessionStorage.setItem('sb_key', document.getElementById('cfgSbKey').value.trim());
    cerrarConfig();
  });
  document.getElementById('btnTheme').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
  });
}

document.addEventListener('DOMContentLoaded', init);
