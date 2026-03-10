// Configurações
const CONFIG = {
    keyTurnos: 'dme_turnos',
    keyTurnoAtual: 'dme_turno_atual',
    apiHabbo: 'https://www.habbo.com.br/api/public/users?name=',
    tempoLimiteOffline: 10 // minutos
};

// Estado
let currentUser = localStorage.getItem('dme_username');
let turnoAtivo = null;
let timerInterval = null;
let habboCheckInterval = null;
let offlineCounter = 0; // Contagem de checagens offline consecutivas (1 checagem/min)

document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    setupMobileSidebar();
    checkTurnoAtivo();
    loadActiveShifts();

    const setorSelect = document.getElementById('setorSelect');
    if (setorSelect) {
        setorSelect.addEventListener('change', onSetorChange);
    }

    // Atualiza lista de ativos a cada 30s
    setInterval(loadActiveShifts, 30000);

    document.getElementById('btnToggleTurno').addEventListener('click', toggleTurno);

    window.addEventListener('storage', function (e) {
        if (e.key === 'dme_turnos_ativos') {
            loadActiveShifts();
        }
        if (e.key === CONFIG.keyTurnoAtual) {
            checkTurnoAtivo();
        }
    });
});

// --- Lógica de Turno ---

function checkTurnoAtivo() {
    const saved = localStorage.getItem(CONFIG.keyTurnoAtual);
    if (saved) {
        turnoAtivo = JSON.parse(saved);
        if (turnoAtivo.user === currentUser) {
            // Retomar turno
            iniciarTimerVisual();
            iniciarVerificacaoHabbo();
            atualizarUI(true);
        }
    }
}

function toggleTurno() {
    if (turnoAtivo) {
        finalizarTurno();
    } else {
        iniciarTurno();
    }
}

function iniciarTurno() {
    const setor = document.getElementById('setorSelect').value;
    const agora = new Date();

    turnoAtivo = {
        id: generateId(),
        user: currentUser,
        inicio: agora.toISOString(),
        setor: setor,
        status: 'ativo'
    };

    localStorage.setItem(CONFIG.keyTurnoAtual, JSON.stringify(turnoAtivo));

    // Adiciona na lista geral de ativos (para outros verem)
    addTurnoToGlobal(turnoAtivo);

    iniciarTimerVisual();
    iniciarVerificacaoHabbo();
    atualizarUI(true);
}

function finalizarTurno() {
    if (!turnoAtivo) return;

    const agora = new Date();
    const inicio = new Date(turnoAtivo.inicio);
    const diff = agora - inicio; // Milissegundos

    // Salvar no histórico
    const historico = {
        ...turnoAtivo,
        fim: agora.toISOString(),
        status: 'encerrado',
        duracaoMs: diff
    };

    saveToHistory(historico);
    removeFromGlobal(turnoAtivo.id);

    // Limpar estado
    localStorage.removeItem(CONFIG.keyTurnoAtual);
    turnoAtivo = null;
    offlineCounter = 0;

    pararTimer();
    pararVerificacaoHabbo();
    atualizarUI(false);
    loadActiveShifts(); // Atualiza lista
}

function atualizarUI(ativo) {
    const btn = document.getElementById('btnToggleTurno');
    const select = document.getElementById('setorSelect');
    const timerDisplay = document.getElementById('shiftTimer');
    const statusDot = document.getElementById('shiftStatusDot');
    const statusText = document.getElementById('shiftStatusText');

    if (ativo) {
        btn.textContent = 'Finalizar Turno';
        btn.classList.add('stop');
        select.value = turnoAtivo.setor;
        timerDisplay.classList.add('active');
        timerDisplay.classList.remove('offline');

        if (statusDot && statusText) {
            statusDot.classList.remove('offline');
            statusDot.classList.add('online');
            statusText.classList.remove('offine');
            statusText.textContent = 'ONLINE';
        }
    } else {
        btn.textContent = 'Iniciar Turno';
        btn.classList.remove('stop');
        select.disabled = false;
        timerDisplay.classList.remove('active');
        timerDisplay.classList.remove('offline');
        timerDisplay.textContent = '00:00:00';

        if (statusDot && statusText) {
            statusDot.classList.remove('online', 'offline');
            statusText.classList.remove('offline');
            statusText.textContent = 'Sem turno';
        }
    }
}

// --- Timer Visual ---
function iniciarTimerVisual() {
    if (timerInterval) clearInterval(timerInterval);

    updateTimer(); // Chamada imediata
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (!turnoAtivo) return;

    const timerEl = document.getElementById('shiftTimer');
    if (!timerEl) return;

    const now = new Date();
    const start = new Date(turnoAtivo.inicio);
    const diff = now - start;

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    timerEl.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function pararTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

// --- Integração API Habbo & Alertas ---

function iniciarVerificacaoHabbo() {
    if (habboCheckInterval) clearInterval(habboCheckInterval);

    checkHabboStatus(); // Imediato
    habboCheckInterval = setInterval(checkHabboStatus, 60000); // Checar a cada 1 minuto
}

function pararVerificacaoHabbo() {
    if (habboCheckInterval) clearInterval(habboCheckInterval);
}

async function checkHabboStatus() {
    if (!turnoAtivo) return;

    try {
        // Tenta API pública do Habbo (pode ter CORS, usando proxy ou assumindo funcionamento no ambiente do usuário)
        // Nota: Em ambiente real browser side, CORS pode bloquear api do Habbo. 
        // Se bloquear, o contador offline não vai incrementar (fallback seguro).
        // Aqui assumimos que funciona ou temos um proxy.
        const response = await fetch(CONFIG.apiHabbo + currentUser);
        const data = await response.json();

        if (data.online === false) {
            offlineCounter++;
            console.log(`Usuário offline no Habbo. Contador: ${offlineCounter}/${CONFIG.tempoLimiteOffline}`);
        } else {
            offlineCounter = 0;
            marcarOfflineGlobal(false);
        }

        if (offlineCounter >= CONFIG.tempoLimiteOffline) {
            marcarOfflineGlobal(true);
        }

    } catch (error) {
        console.warn('Erro ao verificar API Habbo:', error);
        // Em caso de erro de rede/CORS, não punimos o usuário incrementando o contador
    }
}

function marcarOfflineGlobal(offline) {
    if (!turnoAtivo) return;
    let activeShifts = JSON.parse(localStorage.getItem('dme_turnos_ativos') || '[]');
    const idx = activeShifts.findIndex(t => t.id === turnoAtivo.id);
    if (idx !== -1) {
        activeShifts[idx].offlineHabbo = offline;
        localStorage.setItem('dme_turnos_ativos', JSON.stringify(activeShifts));
    }
    loadActiveShifts();
}

function onSetorChange(event) {
    const novoSetor = event.target.value;
    if (!novoSetor) return;
    // Atualiza setor mesmo com turno ligado
    if (turnoAtivo) {
        turnoAtivo.setor = novoSetor;
        localStorage.setItem(CONFIG.keyTurnoAtual, JSON.stringify(turnoAtivo));

        // Atualiza também na lista global de turnos ativos
        let activeShifts = JSON.parse(localStorage.getItem('dme_turnos_ativos') || '[]');
        const idx = activeShifts.findIndex(t => t.id === turnoAtivo.id);
        if (idx !== -1) {
            activeShifts[idx].setor = novoSetor;
            localStorage.setItem('dme_turnos_ativos', JSON.stringify(activeShifts));
        }
        loadActiveShifts();
    }
}

// --- Gerenciamento de Dados Globais (Simulação de Backend) ---

function addTurnoToGlobal(turno) {
    let activeShifts = JSON.parse(localStorage.getItem('dme_turnos_ativos') || '[]');
    activeShifts.push(turno);
    localStorage.setItem('dme_turnos_ativos', JSON.stringify(activeShifts));
}

function removeFromGlobal(id) {
    let activeShifts = JSON.parse(localStorage.getItem('dme_turnos_ativos') || '[]');
    activeShifts = activeShifts.filter(t => t.id !== id);
    localStorage.setItem('dme_turnos_ativos', JSON.stringify(activeShifts));
}

function loadActiveShifts() {
    const actives = JSON.parse(localStorage.getItem('dme_turnos_ativos') || '[]');
    const tbody = document.getElementById('activeShiftsList');
    tbody.innerHTML = '';

    if (actives.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum militar em turno no momento.</td></tr>';
        return;
    }

    actives.forEach(shift => {
        // Calcula tempo decorrido
        const start = new Date(shift.inicio);
        const now = new Date();
        const diffMs = now - start;
        const mins = Math.floor(diffMs / 60000);
        let tempoTexto = '';

        if (mins < 60) {
            tempoTexto = `${mins} minutos`;
        } else {
            const horas = Math.floor(mins / 60);
            tempoTexto = `${horas} hora(s)`;
        }

        const tr = document.createElement('tr');

        let badgeClass = 'badge-bat';
        if (shift.setor === 'Corredores') badgeClass = 'badge-corr';
        if (shift.setor.includes('CG')) badgeClass = 'badge-cg';

        // Botão de Forçar Saída (Apenas para CG atual ou Admins)
        let acaoBtn = '';
        if (canForceStop(shift)) {
            acaoBtn = `<button class="btn-action btn-delete" onclick="forceStopTurno('${shift.id}')">Encerrar</button>`;
        }

        let offlineBadge = '';
        if (shift.offlineHabbo) {
            offlineBadge = '<span class="badge-offline-habbo">OFFLINE NO HABBO</span>';
        }

        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${shift.user}&direction=2&head_direction=2&gesture=sml&action=std&size=s" style="width:30px;">
                    <div>
                        <strong>${shift.user}</strong>
                        ${offlineBadge}
                    </div>
                </div>
            </td>
            <td>${tempoTexto}</td>
            <td><span class="badge ${badgeClass}">${shift.setor}</span></td>
            <td>${acaoBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

function canForceStop(shift) {
    // Quem pode fechar turnos? 
    // 1. Admins do sistema
    // 2. Quem está no setor "Comando Geral (CG)"
    // 3. O próprio usuário (mas ele usa o botão principal)

    if (shift.user === currentUser) return false; // Usa o botão principal

    const admins = JSON.parse(localStorage.getItem('dme_admins') || '[]');
    if (admins.includes(currentUser) || ['Xandelicado', 'rafacv', 'Ronaldo'].includes(currentUser)) return true;

    // Se eu estou no CG, posso fechar o de outros
    if (turnoAtivo && turnoAtivo.setor && turnoAtivo.setor.includes('CG')) return true;

    return false;
}

function forceStopTurno(id) {
    if (!confirm('Tem certeza que deseja encerrar o turno deste militar compulsoriamente?')) return;

    let actives = JSON.parse(localStorage.getItem('dme_turnos_ativos') || '[]');
    const shift = actives.find(t => t.id === id);

    if (shift) {
        // Remove da lista de ativos
        removeFromGlobal(id);

        // Salva no histórico como "Encerrado por X"
        const agora = new Date();
        const inicio = new Date(shift.inicio);
        const historico = {
            ...shift,
            fim: agora.toISOString(),
            status: 'encerrado_por_superior',
            encerradoPor: currentUser,
            duracaoMs: agora - inicio
        };
        saveToHistory(historico);

        if (typeof criarNotificacaoTurno === 'function') {
            criarNotificacaoTurno(shift.user, `O seu turno foi cancelado pelo policial ${currentUser}.`);
        }

        loadActiveShifts();
        alert('Turno encerrado com sucesso.');
    }
}

// --- Helpers ---

function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function saveToHistory(turno) {
    let history = JSON.parse(localStorage.getItem(CONFIG.keyTurnos) || '[]');
    history.push(turno);
    localStorage.setItem(CONFIG.keyTurnos, JSON.stringify(history));
}

// Inicialização UI (reuso de documentos.js ou home.js)
function loadUserProfile() {
    const user = localStorage.getItem('dme_username');
    if (!user) { window.location.href = 'login.html'; return; }

    document.getElementById('navUserName').textContent = user;
    document.getElementById('shiftUserName').textContent = user;

    const avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${user}&direction=3&head_direction=3&gesture=sml&action=std`;
    document.getElementById('navUserImage').src = avatarUrl;
    document.getElementById('shiftUserImage').src = avatarUrl;

    // Dropdown
    document.getElementById('dropdownName').textContent = user;
    document.getElementById('dropdownUserImage').src = avatarUrl;

    const admins = JSON.parse(localStorage.getItem('dme_admins') || '[]');
    if (admins.includes(user) || ['Xandelicado', 'rafacv', 'Ronaldo'].includes(user)) {
        document.getElementById('dropdownPainel').style.display = 'block';
    }
}

function setupMobileSidebar() {
    const hamburger = document.getElementById('hamburger');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarClose = document.getElementById('sidebarClose');

    function toggleSidebar() {
        mobileSidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }

    if (hamburger) hamburger.addEventListener('click', toggleSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // Profile Dropdown
    const btn = document.getElementById('userProfileBtn');
    const dropdown = document.getElementById('userDropdown');

    if (btn && dropdown) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });
    }
}

function abrirModalMeusTurnos() {
    const modal = document.getElementById('modalMeusTurnos');
    const tbody = document.getElementById('myShiftsList');
    tbody.innerHTML = '';

    const history = JSON.parse(localStorage.getItem(CONFIG.keyTurnos) || '[]');
    const meus = history.filter(t => t.user === currentUser).reverse(); // Mais recentes primeiro

    if (meus.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Nenhum registro encontrado.</td></tr>';
    } else {
        meus.forEach(t => {
            const inicio = new Date(t.inicio);
            const fim = new Date(t.fim);

            // Duração formatada
            const diffMin = Math.floor(t.duracaoMs / 60000);
            const horas = Math.floor(diffMin / 60);
            const mins = diffMin % 60;
            const duracao = horas > 0 ? `${horas}h ${mins}m` : `${mins} min`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${inicio.toLocaleDateString()}</td>
                <td>${inicio.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${fim.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${duracao}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    modal.classList.add('active');
    modal.style.display = 'flex';
}

function fecharModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

function logout() {
    localStorage.removeItem('dme_username');
    window.location.href = 'login.html';
}
