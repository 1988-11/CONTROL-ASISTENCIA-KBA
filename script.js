// ==================== CONFIGURACIÓN ====================
// *** IMPORTANTE: VERIFICA QUE ESTA URL SEA EXACTAMENTE LA DE TU WEB APP ***
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRMkKNkV0oOc5pJ6kgxljOM4dNr6hJ1fG_biE2ZpFgY879ornjLx4HkUT4xhfFRra1/exec";

// ==================== SISTEMA DE LOGIN MULTI-USUARIO ====================
const USUARIOS = {
    admin: { password: "admin123", rol: "ADMIN", nombre: "ADMINISTRADOR" },
    puerta: { password: "puerta2026", rol: "PUERTA", nombre: "ENCARGADO DE PUERTA" }
};

let usuarioActual = null;

// ==================== VARIABLES GLOBALES ====================
let empleadoActual = null;

// ==================== DOM ELEMENTS ====================
let dniInput, infoDiv, fotoImg, nombreSpan, deptoP, cargoP, tipoSpan, horarioInfoDiv, mensajeDiv;
let btnEntrada, btnSalida, btnObs;
let modalTarde, modalSalida, justificacionTarde, justificacionSalida;
let btnCancelarTarde, btnConfirmarTarde, btnCancelarSalida, btnConfirmarSalida;

// ==================== LISTA BLANCA - EMPLEADOS SIN RESTRICCIÓN DE HORARIO ====================
const SIN_RESTRICCION = [
    "OSORIO DE LA CRUZ, EDWARD ERICK",
    "JARA BALAREZO, ALEJANDRO",
    "JARA RODRIGUEZ, ALEJANDRO ANDRES",
    "JARA VEGA, JOSE CARLOS",
    "JARA VEGA, MARIA JANET",
    "VALLEJOS VILLANUEVA, HAROLD IVAN",
    "JARA BALAREZO, KARINA"
];

function tieneRestriccionHoraria(nombreCompleto) {
    return !SIN_RESTRICCION.some(nombre => 
        nombreCompleto.toUpperCase().includes(nombre.toUpperCase())
    );
}

// ==================== SISTEMA DE SONIDOS Y VOZ ====================
let audioContext = null;

function reproducirSonido(tipo) {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (tipo === "entrada") {
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.3;
            oscillator.type = "sine";
        } else if (tipo === "salida") {
            oscillator.frequency.value = 440;
            gainNode.gain.value = 0.3;
            oscillator.type = "sine";
        } else {
            oscillator.frequency.value = 660;
            gainNode.gain.value = 0.3;
            oscillator.type = "sine";
        }
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    } catch(e) {
        console.log("Error al reproducir sonido:", e);
    }
}

function formatearNombreParaVoz(nombre) {
    return nombre.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

function hablar(texto) {
    try {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(voice => voice.lang === 'es-ES' && voice.name.includes('Google'));
        if (spanishVoice) {
            utterance.voice = spanishVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    } catch(e) {
        console.log("Error al reproducir voz:", e);
    }
}

function notificarRegistro(tipo, mensajePersonalizado = "") {
    reproducirSonido(tipo);
    setTimeout(() => {
        let mensaje = "";
        if (tipo === "entrada") {
            mensaje = mensajePersonalizado || "Ingreso registrado correctamente";
        } else if (tipo === "salida") {
            mensaje = mensajePersonalizado || "Salida registrada correctamente";
        } else {
            mensaje = mensajePersonalizado || "Observación agregada";
        }
        hablar(mensaje);
    }, 200);
}

function activarAudio() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// ==================== FUNCIONES DE HORARIO (SÁBADO) ====================
function esSabado() {
    const hoy = new Date();
    return hoy.getDay() === 6; // 6 = sábado
}

function getHorarioLimite(tipoEmpleado, esEntrada = true) {
    const esSab = esSabado();
    
    // Horario sábado para oficina
    if (tipoEmpleado !== "OPERATIVO" && esSab) {
        return esEntrada ? "08:00:00" : "12:45:00";
    }
    
    // Horario normal
    if (tipoEmpleado === "OPERATIVO") {
        return esEntrada ? "08:00:00" : "19:30:00";
    } else {
        return esEntrada ? "08:00:00" : "17:30:00";
    }
}

// ==================== FUNCIONES DE LOGIN ====================
function mostrarLogin() {
    const rol = prompt("🔐 SELECCIONA TU ROL:\n\n1 - ADMINISTRADOR\n2 - ENCARGADO DE PUERTA\n\n(1 o 2)");
    if (rol === "1") {
        const pass = prompt("👑 Ingresa contraseña de ADMINISTRADOR:");
        if (pass === USUARIOS.admin.password) {
            usuarioActual = USUARIOS.admin;
            iniciarApp();
        } else {
            alert("❌ Contraseña incorrecta");
            mostrarLogin();
        }
    } else if (rol === "2") {
        const pass = prompt("🚪 Ingresa contraseña de PUERTA:");
        if (pass === USUARIOS.puerta.password) {
            usuarioActual = USUARIOS.puerta;
            iniciarApp();
        } else {
            alert("❌ Contraseña incorrecta");
            mostrarLogin();
        }
    } else {
        alert("❌ Opción no válida");
        mostrarLogin();
    }
}

function iniciarApp() {
    const loginScreen = document.getElementById("loginScreen");
    const appContent = document.getElementById("appContent");
    const adminPanel = document.getElementById("adminPanel");
    const userInfo = document.getElementById("userInfo");
    
    if (loginScreen) loginScreen.style.display = "none";
    if (appContent) appContent.style.display = "block";
    
    if (userInfo) userInfo.innerHTML = `👤 ${usuarioActual.nombre} | ${usuarioActual.rol}`;
    
    if (adminPanel) {
        adminPanel.style.display = usuarioActual.rol === "ADMIN" ? "block" : "none";
    }
    
    if (usuarioActual.rol === "ADMIN") {
        cargarListaEmpleados();
    }
    
    console.log(`✅ Sesión iniciada como: ${usuarioActual.nombre}`);
}

function cerrarSesion() {
    usuarioActual = null;
    empleadoActual = null;
    
    const loginScreen = document.getElementById("loginScreen");
    const appContent = document.getElementById("appContent");
    const adminPanel = document.getElementById("adminPanel");
    
    if (loginScreen) loginScreen.style.display = "flex";
    if (appContent) appContent.style.display = "none";
    if (adminPanel) adminPanel.style.display = "none";
    
    if (dniInput) dniInput.value = "";
    if (infoDiv) infoDiv.style.display = 'none';
    
    console.log("👋 Sesión cerrada");
}

// ==================== REPORTES DESCARGABLES ====================
function establecerFechaActual() {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1));
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    
    const fechaInicioElem = document.getElementById('fechaInicio');
    const fechaFinElem = document.getElementById('fechaFin');
    if (fechaInicioElem) fechaInicioElem.value = inicioSemana.toISOString().split('T')[0];
    if (fechaFinElem) fechaFinElem.value = finSemana.toISOString().split('T')[0];
}

function establecerMesActual() {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    const fechaInicioElem = document.getElementById('fechaInicio');
    const fechaFinElem = document.getElementById('fechaFin');
    if (fechaInicioElem) fechaInicioElem.value = inicioMes.toISOString().split('T')[0];
    if (fechaFinElem) fechaFinElem.value = finMes.toISOString().split('T')[0];
}

async function cargarListaEmpleados() {
    try {
        mostrarMensaje("📋 Cargando lista de empleados...", 'warning');
        const response = await fetch(`${SCRIPT_URL}?accion=listaEmpleados`);
        const resultado = await response.json();
        
        if (resultado.success && resultado.empleados) {
            const select = document.getElementById('empleadoFiltro');
            if (select) {
                select.innerHTML = '<option value="todos">📋 Todos los empleados</option>';
                resultado.empleados.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.dni;
                    option.textContent = `${emp.dni} - ${emp.nombre}`;
                    select.appendChild(option);
                });
                mostrarMensaje(`✅ ${resultado.empleados.length} empleados cargados`, 'success');
            }
        } else {
            mostrarMensaje(`⚠️ No se pudieron cargar los empleados`, 'error');
        }
    } catch (error) {
        console.error("Error al cargar empleados:", error);
        mostrarMensaje("⚠️ Error al cargar empleados", 'error');
    }
}

async function generarReporteConFechas(tipo) {
    let fechaInicioElem = document.getElementById('fechaInicio');
    let fechaFinElem = document.getElementById('fechaFin');
    let empleadoFiltroElem = document.getElementById('empleadoFiltro');
    
    let fechaInicio = fechaInicioElem ? fechaInicioElem.value : "";
    let fechaFin = fechaFinElem ? fechaFinElem.value : "";
    let empleadoFiltro = empleadoFiltroElem ? empleadoFiltroElem.value : "todos";
    
    if (!fechaInicio || !fechaFin) {
        alert("⚠️ Por favor selecciona un rango de fechas");
        return;
    }
    
    mostrarMensaje(`⏳ Generando reporte...`, 'warning');
    
    try {
        const url = `${SCRIPT_URL}?accion=csv&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&empleado=${empleadoFiltro}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_asistencia_${fechaInicio}_al_${fechaFin}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        mostrarMensaje(`✅ Reporte generado - Revisa tu carpeta de descargas`, 'success');
    } catch (error) {
        console.error("Error al generar reporte:", error);
        mostrarMensaje("⚠️ Error al generar reporte", 'error');
    }
}

async function generarReporteCompletoDescargable() {
    let fechaInicioElem = document.getElementById('fechaInicio');
    let fechaFinElem = document.getElementById('fechaFin');
    let empleadoFiltroElem = document.getElementById('empleadoFiltro');
    
    let fechaInicio = fechaInicioElem ? fechaInicioElem.value : "";
    let fechaFin = fechaFinElem ? fechaFinElem.value : "";
    let empleadoFiltro = empleadoFiltroElem ? empleadoFiltroElem.value : "todos";
    
    if (!fechaInicio || !fechaFin) {
        alert("⚠️ Por favor selecciona un rango de fechas");
        return;
    }
    
    mostrarMensaje(`⏳ Generando reporte completo...`, 'warning');
    
    try {
        const url = `${SCRIPT_URL}?accion=reporteCompleto&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&empleado=${empleadoFiltro}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_completo_${fechaInicio}_al_${fechaFin}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        mostrarMensaje(`✅ Reporte completo descargado`, 'success');
    } catch (error) {
        console.error("Error al generar reporte completo:", error);
        mostrarMensaje("⚠️ Error al generar reporte", 'error');
    }
}

async function generarReporteFaltasDescargable() {
    let fechaInicioElem = document.getElementById('fechaInicio');
    let fechaFinElem = document.getElementById('fechaFin');
    let empleadoFiltroElem = document.getElementById('empleadoFiltro');
    
    let fechaInicio = fechaInicioElem ? fechaInicioElem.value : "";
    let fechaFin = fechaFinElem ? fechaFinElem.value : "";
    let empleadoFiltro = empleadoFiltroElem ? empleadoFiltroElem.value : "todos";
    
    if (!fechaInicio || !fechaFin) {
        alert("⚠️ Por favor selecciona un rango de fechas");
        return;
    }
    
    mostrarMensaje(`⏳ Generando reporte de faltas...`, 'warning');
    
    try {
        const url = `${SCRIPT_URL}?accion=reporteFaltas&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&empleado=${empleadoFiltro}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_faltas_${fechaInicio}_al_${fechaFin}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        mostrarMensaje(`✅ Reporte de faltas descargado`, 'success');
    } catch (error) {
        console.error("Error al generar reporte de faltas:", error);
        mostrarMensaje("⚠️ Error al generar reporte", 'error');
    }
}

async function generarReporteTardanzasDescargable() {
    let fechaInicioElem = document.getElementById('fechaInicio');
    let fechaFinElem = document.getElementById('fechaFin');
    let empleadoFiltroElem = document.getElementById('empleadoFiltro');
    
    let fechaInicio = fechaInicioElem ? fechaInicioElem.value : "";
    let fechaFin = fechaFinElem ? fechaFinElem.value : "";
    let empleadoFiltro = empleadoFiltroElem ? empleadoFiltroElem.value : "todos";
    
    if (!fechaInicio || !fechaFin) {
        alert("⚠️ Por favor selecciona un rango de fechas");
        return;
    }
    
    mostrarMensaje(`⏳ Generando reporte de tardanzas...`, 'warning');
    
    try {
        const url = `${SCRIPT_URL}?accion=reporteTardanzas&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&empleado=${empleadoFiltro}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_tardanzas_${fechaInicio}_al_${fechaFin}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        mostrarMensaje(`✅ Reporte de tardanzas descargado`, 'success');
    } catch (error) {
        console.error("Error al generar reporte de tardanzas:", error);
        mostrarMensaje("⚠️ Error al generar reporte", 'error');
    }
}

function abrirGoogleSheets() {
    window.open('https://docs.google.com/spreadsheets', '_blank');
    mostrarMensaje("📂 Abre Google Sheets y busca las hojas de reporte", 'warning');
}

// ==================== FUNCIONES AUXILIARES ====================
function mostrarMensaje(texto, tipo = 'success') {
    if (!mensajeDiv) return;
    mensajeDiv.innerText = texto;
    mensajeDiv.classList.remove('success', 'error', 'warning');
    mensajeDiv.classList.add(tipo);
    setTimeout(() => {
        if (mensajeDiv && mensajeDiv.innerText === texto) {
            mensajeDiv.classList.remove('success', 'error', 'warning');
            mensajeDiv.innerText = '✅ Esperando siguiente marca';
        }
    }, 5000);
}

function getFechaClave() {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${hoy.getMonth()+1}-${hoy.getDate()}`;
}

function yaRegistroEntrada(dni) {
    const clave = `entrada_${dni}_${getFechaClave()}`;
    return localStorage.getItem(clave) !== null;
}

function guardarEntrada(dni, hora) {
    const clave = `entrada_${dni}_${getFechaClave()}`;
    localStorage.setItem(clave, hora);
}

function yaRegistroSalida(dni) {
    const clave = `salida_${dni}_${getFechaClave()}`;
    return localStorage.getItem(clave) !== null;
}

function guardarSalida(dni, hora) {
    const clave = `salida_${dni}_${getFechaClave()}`;
    localStorage.setItem(clave, hora);
}

function verificarHorario(tipoEmpleado, horaActual, esEntrada = true) {
    const horaLimite = getHorarioLimite(tipoEmpleado, esEntrada);
    const [horaLim, minLim, segLim] = horaLimite.split(':').map(Number);
    const [horaAct, minAct, segAct] = horaActual.split(':').map(Number);
    
    const tiempoLimite = horaLim * 3600 + minLim * 60 + segLim;
    const tiempoActual = horaAct * 3600 + minAct * 60 + segAct;
    
    if (esEntrada) {
        return tiempoActual > tiempoLimite;
    } else {
        return tiempoActual < tiempoLimite;
    }
}

function getHoraActual() {
    const ahora = new Date();
    return ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ==================== FUNCIÓN PARA OBTENER TURNO DEL REGISTRO ANTERIOR ====================
async function obtenerTurnoRegistroAnterior(dni) {
    try {
        const response = await fetch(`${SCRIPT_URL}?accion=ultimoTurno&dni=${encodeURIComponent(dni)}`);
        const data = await response.json();
        return data.turno || "";
    } catch (error) {
        console.error("Error al obtener turno anterior:", error);
        return "";
    }
}

// ==================== BUSCAR EMPLEADO ====================
async function buscarEmpleadoPorDNI(dni) {
    if (dni.length < 6) {
        if (infoDiv) infoDiv.style.display = 'none';
        empleadoActual = null;
        if (btnEntrada) btnEntrada.disabled = true;
        if (btnSalida) btnSalida.disabled = true;
        if (btnObs) btnObs.disabled = true;
        return;
    }

    mostrarMensaje(`🔍 Buscando DNI ${dni}...`, 'warning');
    
    try {
        const response = await fetch(`${SCRIPT_URL}?dni=${encodeURIComponent(dni)}`);
        const data = await response.json();
        
        if (data.existe === false || data.error) {
            if (infoDiv) infoDiv.style.display = 'none';
            empleadoActual = null;
            if (btnEntrada) btnEntrada.disabled = true;
            if (btnSalida) btnSalida.disabled = true;
            if (btnObs) btnObs.disabled = true;
            mostrarMensaje(`❌ DNI ${dni} no registrado`, 'error');
            return;
        }
        
        empleadoActual = data;
        if (nombreSpan) nombreSpan.innerText = data.nombre || "Sin nombre";
        if (deptoP) deptoP.innerText = `📁 ${data.departamento || "Sin departamento"}`;
        if (cargoP) cargoP.innerText = `💼 ${data.cargo || "Sin cargo"}`;
        if (tipoSpan) tipoSpan.innerText = data.tipoEmpleado === "OPERATIVO" ? "🔧 OPERATIVO (11h)" : "🏢 OFICINA (8h)";
        
        if (horarioInfoDiv) {
            if (data.tipoEmpleado === "OPERATIVO") {
                horarioInfoDiv.innerHTML = `⏰ Horario: 8:00 AM - 7:30 PM (Tolerancia 8:01 AM)`;
            } else {
                horarioInfoDiv.innerHTML = `⏰ Horario: 8:00 AM - 5:30 PM (Tolerancia 8:01 AM)`;
            }
        }
        
        if (fotoImg) {
            if (data.fotoUrl && data.fotoUrl.trim() !== "" && data.fotoUrl !== "undefined") {
                fotoImg.src = data.fotoUrl;
                fotoImg.onerror = function() {
                    this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 24 24" fill="%23999"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
                };
            } else {
                fotoImg.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 24 24" fill="%23999"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
            }
        }
        
        if (infoDiv) infoDiv.style.display = 'flex';
        if (btnEntrada) btnEntrada.disabled = false;
        if (btnSalida) btnSalida.disabled = false;
        if (btnObs) btnObs.disabled = false;
        
        if (yaRegistroEntrada(dni)) {
            if (yaRegistroSalida(dni)) {
                mostrarMensaje(`⚠️ Ya completaste tu jornada de hoy`, 'warning');
            } else {
                mostrarMensaje(`⚠️ Ya registraste ENTRADA. Puedes marcar SALIDA`, 'warning');
            }
        } else {
            mostrarMensaje(`✅ Bienvenido ${data.nombre}`, 'success');
        }
        
    } catch (error) {
        console.error(error);
        if (infoDiv) infoDiv.style.display = 'none';
        empleadoActual = null;
        if (btnEntrada) btnEntrada.disabled = true;
        if (btnSalida) btnSalida.disabled = true;
        if (btnObs) btnObs.disabled = true;
        mostrarMensaje("⚠️ Error al buscar DNI", 'error');
    }
}

// ==================== REGISTRAR ASISTENCIA (CORREGIDO PARA TURNO NOCHE) ====================
async function procesarRegistro(tipo, observacionInicial = "") {
    if (!empleadoActual) {
        mostrarMensaje("❌ Primero ingresa un DNI válido", 'error');
        return false;
    }
    
    const dni = empleadoActual.dni;
    const horaActual = getHoraActual();
    const cargo = empleadoActual.cargo || "";
    const departamento = empleadoActual.departamento || "";
    const nombreCompleto = empleadoActual.nombre || "";
    let turnoSeleccionado = "";
    let observacion = observacionInicial;
    
    const tieneRestriccion = tieneRestriccionHoraria(nombreCompleto);
    
    if (!tieneRestriccion) {
        console.log(`✅ Empleado SIN restricción horaria: ${nombreCompleto}`);
    }
    
    const esOperarioMaquina = departamento.toUpperCase() === "MAQUINA" || 
    cargo.toUpperCase().includes("MAQUINA") || 
    cargo.toUpperCase().includes("OP.MAQUINA");
    
    if (tipo === "ENTRADA" && esOperarioMaquina && tieneRestriccion) {
        const turno = prompt("🔄 SELECCIONA TU TURNO:\n\n1 - TURNO DÍA (8:00 AM - 8:00 PM)\n2 - TURNO NOCHE (8:00 PM - 8:00 AM)\n\n(1 o 2)");
        if (turno === "1") {
            turnoSeleccionado = "DIA";
            observacion = observacion ? observacion + " | Turno DÍA" : "Turno DÍA";
        } else if (turno === "2") {
            turnoSeleccionado = "NOCHE";
            observacion = observacion ? observacion + " | Turno NOCHE" : "Turno NOCHE";
        } else {
            mostrarMensaje("❌ Opción no válida. Registro cancelado.", 'error');
            return false;
        }
    }
    
    if (tipo === "ENTRADA" && yaRegistroEntrada(dni)) {
        mostrarMensaje(`❌ Ya registraste ENTRADA hoy`, 'error');
        return false;
    }
    
    // ========== IMPORTANTE: PARA SALIDA NO VALIDAMOS QUE TENGA ENTRADA HOY ==========
    // Esto permite que trabajadores de turno noche marquen salida al día siguiente
    if (tipo === "SALIDA") {
        // Solo validamos que no tenga ya una salida registrada hoy
        if (yaRegistroSalida(dni)) {
            mostrarMensaje(`❌ Ya registraste SALIDA hoy`, 'error');
            return false;
        }
        // NO validamos yaRegistroEntrada(dni) - la búsqueda se hace en el servidor
        
        // Para salida, intentamos obtener el turno del registro anterior (del día anterior)
        if (!turnoSeleccionado && esOperarioMaquina) {
            turnoSeleccionado = await obtenerTurnoRegistroAnterior(dni);
            if (turnoSeleccionado) {
                console.log(`Turno obtenido del registro anterior: ${turnoSeleccionado}`);
            }
        }
    }
    
    let esTarde = false;
    let horaLimite = "";
    let tipoEmpleado = empleadoActual.tipoEmpleado || "OFICINA";
    
    if (tipo === "ENTRADA" && tieneRestriccion) {
        if (esOperarioMaquina && turnoSeleccionado === "NOCHE") {
            horaLimite = "20:00:00";
            if (horaActual > horaLimite) {
                esTarde = true;
            } else {
                esTarde = false;
            }
        } else if (esOperarioMaquina && turnoSeleccionado === "DIA") {
            horaLimite = "08:00:00";
            esTarde = horaActual > horaLimite;
        } else {
            horaLimite = getHorarioLimite(tipoEmpleado, true);
            esTarde = verificarHorario(tipoEmpleado, horaActual, true);
        }
        
        if (esTarde) {
            const modalMsg = document.getElementById('modalMensajeTarde');
            if (modalMsg) modalMsg.innerHTML = `⚠️ Estan intentando ingresar a las ${horaActual}. La hora límite es ${horaLimite}.<br><br>Debes justificar el motivo de tu llegada tarde.`;
            if (justificacionTarde) justificacionTarde.value = "";
            if (modalTarde) modalTarde.style.display = 'flex';
            
            const justificacion = await new Promise((resolve) => {
                const confirmarHandler = () => {
                    const justif = justificacionTarde ? justificacionTarde.value.trim() : "";
                    if (!justif) {
                        alert("Escribe una justificación.");
                        return;
                    }
                    limpiarHandlers();
                    resolve(justif);
                };
                const cancelarHandler = () => {
                    limpiarHandlers();
                    resolve(null);
                };
                const limpiarHandlers = () => {
                    if (btnConfirmarTarde) btnConfirmarTarde.removeEventListener('click', confirmarHandler);
                    if (btnCancelarTarde) btnCancelarTarde.removeEventListener('click', cancelarHandler);
                    if (modalTarde) modalTarde.style.display = 'none';
                };
                if (btnConfirmarTarde) btnConfirmarTarde.addEventListener('click', confirmarHandler);
                if (btnCancelarTarde) btnCancelarTarde.addEventListener('click', cancelarHandler);
            });
            
            if (!justificacion) {
                mostrarMensaje("Registro cancelado", 'warning');
                return false;
            }
            observacion = observacion ? observacion + " | JUSTIFICACIÓN TARDE: " + justificacion : "JUSTIFICACIÓN TARDE: " + justificacion;
        }
    }
    
    // ========== VERIFICAR SALIDA ANTICIPADA (CORREGIDO PARA TURNO NOCHE) ==========
    if (tipo === "SALIDA" && tieneRestriccion) {
        let esAnticipada = false;
        let horaMinima = "";
        
        // Mostrar información de depuración
        console.log("=== DEPURACIÓN SALIDA ===");
        console.log("Cargo:", cargo);
        console.log("Departamento:", departamento);
        console.log("esOperarioMaquina:", esOperarioMaquina);
        console.log("turnoSeleccionado:", turnoSeleccionado);
        console.log("Hora actual:", horaActual);
        
        // Para operarios de máquina con turno específico
        if (esOperarioMaquina && turnoSeleccionado === "NOCHE") {
            // Turno noche: horario laboral de 8:00 PM a 8:00 AM del día siguiente
            // Salida anticipada si sale ANTES de las 8:00 AM
            horaMinima = "08:00:00";
            esAnticipada = horaActual < horaMinima;
            console.log("Turno NOCHE detectado - Hora mínima:", horaMinima, "esAnticipada:", esAnticipada);
        } 
        else if (esOperarioMaquina && turnoSeleccionado === "DIA") {
            // Turno día: horario laboral de 8:00 AM a 8:00 PM
            horaMinima = "20:00:00";
            esAnticipada = horaActual < horaMinima;
            console.log("Turno DIA detectado - Hora mínima:", horaMinima, "esAnticipada:", esAnticipada);
        }
        else if (tipoEmpleado === "OPERATIVO") {
            horaMinima = "19:30:00";
            esAnticipada = horaActual < horaMinima;
            console.log("OPERATIVO detectado - Hora mínima:", horaMinima, "esAnticipada:", esAnticipada);
        }
        else {
            horaMinima = "17:30:00";
            esAnticipada = horaActual < horaMinima;
            console.log("OFICINA detectado - Hora mínima:", horaMinima, "esAnticipada:", esAnticipada);
        }
        
        if (esAnticipada) {
            const modalMsg = document.getElementById('modalMensajeSalida');
            if (modalMsg) modalMsg.innerHTML = `⚠️ SALIDA ANTICIPADA\n\nHora actual: ${horaActual}\nHora mínima de salida: ${horaMinima}\n\nTu horario laboral termina a las ${horaMinima}.\n\nDebes justificar el motivo de tu salida anticipada.`;
            if (justificacionSalida) justificacionSalida.value = "";
            if (modalSalida) modalSalida.style.display = 'flex';
            
            const justificacion = await new Promise((resolve) => {
                const confirmarHandler = () => {
                    const justif = justificacionSalida ? justificacionSalida.value.trim() : "";
                    if (!justif) {
                        alert("Escribe una justificación.");
                        return;
                    }
                    limpiarHandlers();
                    resolve(justif);
                };
                const cancelarHandler = () => {
                    limpiarHandlers();
                    resolve(null);
                };
                const limpiarHandlers = () => {
                    if (btnConfirmarSalida) btnConfirmarSalida.removeEventListener('click', confirmarHandler);
                    if (btnCancelarSalida) btnCancelarSalida.removeEventListener('click', cancelarHandler);
                    if (modalSalida) modalSalida.style.display = 'none';
                };
                if (btnConfirmarSalida) btnConfirmarSalida.addEventListener('click', confirmarHandler);
                if (btnCancelarSalida) btnCancelarSalida.addEventListener('click', cancelarHandler);
            });
            
            if (!justificacion) {
                mostrarMensaje("Registro cancelado", 'warning');
                return false;
            }
            observacion = observacion ? observacion + " | JUSTIFICACIÓN SALIDA ANTICIPADA: " + justificacion : "JUSTIFICACIÓN SALIDA ANTICIPADA: " + justificacion;
        }
    }
    
    mostrarMensaje(`⏳ Procesando ${tipo}...`, 'warning');
    
    const url = `${SCRIPT_URL}?dni=${encodeURIComponent(dni)}&nombre=${encodeURIComponent(empleadoActual.nombre)}&tipo=${tipo}&hora=${encodeURIComponent(horaActual)}&observacion=${encodeURIComponent(observacion)}&turno=${encodeURIComponent(turnoSeleccionado)}`;
    
    console.log("Enviando:", url);
    
    try {
        await fetch(url, { method: 'GET', mode: 'no-cors' });
        
        const nombreFormateado = formatearNombreParaVoz(empleadoActual.nombre);
        
        if (tipo === "ENTRADA") {
            guardarEntrada(dni, horaActual);
            mostrarMensaje(`✅ ENTRADA registrada a las ${horaActual}${turnoSeleccionado ? " | Turno " + turnoSeleccionado : ""}`, 'success');
            notificarRegistro("entrada", `Ingreso registrado para ${nombreFormateado} a las ${horaActual}`);
        } else if (tipo === "SALIDA") {
            guardarSalida(dni, horaActual);
            mostrarMensaje(`✅ SALIDA registrada a las ${horaActual}`, 'success');
            notificarRegistro("salida", `Salida registrada para ${nombreFormateado} a las ${horaActual}`);
        } else if (tipo === "OBSERVACION") {
            mostrarMensaje(`✅ Observación agregada`, 'success');
            notificarRegistro("observacion", `Observación agregada para ${nombreFormateado}`);
        }
        
        if (tipo === "ENTRADA" || tipo === "SALIDA") {
            setTimeout(() => {
                if (dniInput) dniInput.value = "";
                if (infoDiv) infoDiv.style.display = 'none';
                empleadoActual = null;
                if (btnEntrada) btnEntrada.disabled = true;
                if (btnSalida) btnSalida.disabled = true;
                if (btnObs) btnObs.disabled = true;
            }, 2000);
        }
        return true;
    } catch (error) {
        console.error("Error en el registro:", error);
        mostrarMensaje("⚠️ Error de conexión", 'error');
        return false;
    }
}

// ==================== HANDLERS ====================
function handleEntrada() {
    console.log("Click en entrada");
    if (!empleadoActual) {
        mostrarMensaje("❌ Primero busca un DNI válido", 'error');
        return;
    }
    activarAudio();
    procesarRegistro("ENTRADA", "");
}

function handleSalida() {
    console.log("Click en salida");
    if (!empleadoActual) {
        mostrarMensaje("❌ Primero busca un DNI válido", 'error');
        return;
    }
    activarAudio();
    procesarRegistro("SALIDA", "");
}

function handleObservacion() {
    console.log("Click en observacion");
    if (!empleadoActual) return;
    activarAudio();
    const observacion = prompt("📝 Escribe tu observación:");
    if (observacion && observacion.trim() !== "") {
        procesarRegistro("OBSERVACION", observacion.trim());
    }
}

document.addEventListener('click', function() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
});

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Inicializando aplicación...");
    
    dniInput = document.getElementById('dni');
    infoDiv = document.getElementById('infoEmpleado');
    fotoImg = document.getElementById('fotoEmpleado');
    nombreSpan = document.getElementById('nombreEmpleado');
    deptoP = document.getElementById('deptoEmpleado');
    cargoP = document.getElementById('cargoEmpleado');
    tipoSpan = document.getElementById('tipoEmpleado');
    horarioInfoDiv = document.getElementById('horarioInfo');
    mensajeDiv = document.getElementById('mensajeStatus');
    btnEntrada = document.getElementById('btnEntrada');
    btnSalida = document.getElementById('btnSalida');
    btnObs = document.getElementById('btnObs');
    modalTarde = document.getElementById('modalTarde');
    modalSalida = document.getElementById('modalSalida');
    justificacionTarde = document.getElementById('justificacionTarde');
    justificacionSalida = document.getElementById('justificacionSalida');
    btnCancelarTarde = document.getElementById('btnCancelarTarde');
    btnConfirmarTarde = document.getElementById('btnConfirmarTarde');
    btnCancelarSalida = document.getElementById('btnCancelarSalida');
    btnConfirmarSalida = document.getElementById('btnConfirmarSalida');
    
    // ========== CONFIGURACIÓN DE TECLADO NUMÉRICO PARA DNI ==========
    if (dniInput) {
        // Configurar teclado numérico en móviles
        dniInput.setAttribute('inputmode', 'numeric');
        dniInput.setAttribute('pattern', '[0-9]*');
        
        // Forzar solo números y buscar automáticamente al completar 8 dígitos
        dniInput.addEventListener('input', function(e) {
            // Limitar a solo números
            this.value = this.value.replace(/[^0-9]/g, '');
            
            // Si tiene 8 dígitos, buscar automáticamente
            if (this.value.length === 8) {
                buscarEmpleadoPorDNI(this.value);
                // Ocultar teclado en móviles después de la búsqueda
                this.blur();
            }
        });
        
        // Bloquear letras en el teclado
        dniInput.addEventListener('keypress', function(e) {
            if (e.key < '0' || e.key > '9') {
                e.preventDefault();
            }
        });
        
        // Prevenir pegado de texto no numérico
        dniInput.addEventListener('paste', function(e) {
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            if (!/^\d+$/.test(pastedText)) {
                e.preventDefault();
            }
        });
        
        // Mantener eventos existentes (blur y enter)
        dniInput.addEventListener('blur', () => buscarEmpleadoPorDNI(dniInput.value.trim()));
        dniInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarEmpleadoPorDNI(dniInput.value.trim());
        });
    }
    
    if (btnEntrada) btnEntrada.addEventListener('click', handleEntrada);
    if (btnSalida) btnSalida.addEventListener('click', handleSalida);
    if (btnObs) btnObs.addEventListener('click', handleObservacion);
    
    window.addEventListener('click', (e) => {
        if (e.target === modalTarde && modalTarde) modalTarde.style.display = 'none';
        if (e.target === modalSalida && modalSalida) modalSalida.style.display = 'none';
    });
    
    mostrarLogin();
});

console.log("✅ Sistema cargado correctamente");
