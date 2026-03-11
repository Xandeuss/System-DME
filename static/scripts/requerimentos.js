const usuarioLogado = localStorage.getItem('dme_username');
if (!usuarioLogado) {
    window.location.href = '/login';
}

function logout() {
    localStorage.removeItem('dme_username');
    window.location.href = '/login';
}

const inputAplicador = document.getElementById('input-aplicador');
if (inputAplicador) inputAplicador.value = usuarioLogado;
const navUserName = document.getElementById('navUserName');
if (navUserName) navUserName.textContent = usuarioLogado;

const CORPO_MILITAR = [
    "Comandante-Geral", "Comandante", "Subcomandante", "Marechal", "General",
    "Coronel", "Tenente-Coronel", "Major", "Capitão", "Tenente",
    "Aspirante a Oficial", "Subtenente", "Sargento", "Cabo", "Soldado"
];

const CORPO_EMPRESARIAL = [
    "Chanceler", "Presidente", "Vice-Presidente", "Ministro", "Comissário",
    "Delegado", "Executivo", "Diretor", "Coordenador", "Supervisor",
    "Escrivão", "Analista", "Inspetor", "Sócio", "Agente"
];

const CENTROS_AULAS = {
    ci: [
        "Instrução Inicial [INS]",
        "Aula de Infraestrutura [AFT]",
        "Curso de Formação de Subtenentes [CFS]"
    ],
    ct: [
        "[AFS] Aula de Formação de Soldados",
        "[AES] Aula de Especialização para Sargentos",
        "[AFC] Aula de Formação Complementar"
    ],
    cs: [
        "[CSP] Curso de Segurança Pessoal",
        "[CSO] Curso de Segurança Operacional",
        "[PRO] Aula para Promotor"
    ]
};

// ── Configuração de campos visíveis por tipo ──
// novaPatente: mostra input readonly auto-preenchido
// selectOpcoes: mostra dropdown genérico
// anexoProvas: mostra campo de link de provas
// banidoAte: mostra campo de data de banimento
// permissor: mostra campo de permissor
// datahora: mostra campo de data/hora
const fieldConfig = {
    promocao: { novaPatente: true, selectOpcoes: false, anexoProvas: false, banidoAte: false, permissor: true, datahora: true },
    advertencia: { novaPatente: false, selectOpcoes: false, anexoProvas: true, banidoAte: false, permissor: true, datahora: false },
    rebaixamento: { novaPatente: true, selectOpcoes: false, anexoProvas: true, banidoAte: false, permissor: true, datahora: true },
    demissao: { novaPatente: true, selectOpcoes: false, anexoProvas: true, banidoAte: false, permissor: false, datahora: false },
    exoneracao: { novaPatente: false, selectOpcoes: false, anexoProvas: true, banidoAte: true, permissor: false, datahora: false },
    contrato: { novaPatente: false, selectOpcoes: true, anexoProvas: false, banidoAte: false, permissor: false, datahora: false, labelOpcao: "Nova patente" },
    venda: { novaPatente: false, selectOpcoes: true, anexoProvas: false, banidoAte: false, permissor: false, datahora: false, valor: true, labelOpcao: "Nova patente" },
    permissao: { novaPatente: false, selectOpcoes: false, anexoProvas: false, banidoAte: false, permissor: false, datahora: false, nickPromovido: true },
};
// Padrão para tipos que não possuem config específica (contrato, venda, licença, etc.)
const defaultFieldConfig = { novaPatente: false, selectOpcoes: true, anexoProvas: false, banidoAte: false, permissor: true, datahora: true };

function getFieldConfig(tipo) {
    return fieldConfig[tipo] || defaultFieldConfig;
}

const configForm = {
    promocao: {
        titulo: "Aplicar Promoções",
        label: "Nova Patente",
        tipoForm: "rh",
        getOpcoes: (corpo) => corpo === 'militar' ? CORPO_MILITAR : CORPO_EMPRESARIAL
    },
    advertencia: {
        titulo: "Aplicar Advertências",
        label: "Motivo da Advertência",
        tipoForm: "rh",
        getOpcoes: () => ["Mau comportamento", "Desrespeito", "Insubordinação", "Ausência injustificada", "Outro"]
    },
    rebaixamento: {
        titulo: "Aplicar Rebaixamentos",
        label: "Patente de Destino",
        tipoForm: "rh",
        getOpcoes: (corpo) => corpo === 'militar' ? CORPO_MILITAR : CORPO_EMPRESARIAL
    },
    demissao: {
        titulo: "Aplicar Demissões",
        label: "Motivo da Demissão",
        tipoForm: "rh",
        getOpcoes: () => ["Mau comportamento", "Inatividade", "Pedido próprio", "Traição", "Insubordinação"]
    },
    exoneracao: {
        titulo: "Aplicar Exonerações",
        label: "Motivo da Exoneração",
        tipoForm: "rh",
        getOpcoes: () => ["Afastamento voluntário", "Decisão administrativa", "Fim de mandato", "Outro"]
    },
    contrato: {
        titulo: "Contrato e Reintegração",
        label: "Tipo",
        tipoForm: "rh",
        getOpcoes: () => ["Contrato Novo", "Renovação de Contrato", "Reintegração", "Suspensão Temporária"]
    },
    venda: {
        titulo: "Aplicar Vendas",
        label: "Nova patente",
        tipoForm: "rh",
        getOpcoes: () => CORPO_EMPRESARIAL
    },
    licenca: {
        titulo: "Licenças",
        tipoForm: "licenca"
    },
    gratificacao: {
        titulo: "Aplicar Pontuação",
        tipoForm: "gratificacao"
    },
    permissao: {
        titulo: "Aplicar Permissões",
        tipoForm: "rh"
    },
    transferencia: {
        titulo: "Registrar Transferência",
        label: "Destino",
        tipoForm: "rh",
        getOpcoes: () => ["Centro de Instrução", "Centro de Treinamento", "Centro de Supervisão", "GOE", "Academia das Agulhas Negras", "Outro"]
    },
    cadetes: {
        titulo: "Registrar Cadete",
        label: "Tipo",
        tipoForm: "rh",
        getOpcoes: () => ["Ingresso de Cadete", "Formatura de Cadete", "Expulsão de Cadete", "Promoção Interna", "Outro"]
    },
};

// Carregar tipos customizados do localStorage (admin)
function getCustomTipos() {
    try { return JSON.parse(localStorage.getItem('dme_req_custom') || '[]'); } catch { return []; }
}
function saveCustomTipos(arr) { localStorage.setItem('dme_req_custom', JSON.stringify(arr)); }

// Registrar tipos customizados no configForm
getCustomTipos().forEach(ct => {
    configForm[ct.id] = {
        titulo: ct.titulo,
        label: ct.label,
        tipoForm: "rh",
        getOpcoes: () => ct.opcoes || ["Sem opções definidas"]
    };
});

const tipoNome = {
    'promocao': 'Promoção',
    'advertencia': 'Advertência',
    'rebaixamento': 'Rebaixamento',
    'demissao': 'Demissão',
    'exoneracao': 'Exoneração',
    'contrato': 'Contrato e Reintegração',
    'venda': 'Venda',
    'licenca': 'Licença',
    'gratificacao': 'Gratificação',
    'permissao': 'Permissão',
    'transferencia': 'Transferência',
    'cadetes': 'Cadetes',
};
// Adicionar tipos customizados ao tipoNome
getCustomTipos().forEach(ct => { tipoNome[ct.id] = ct.titulo; });



let tipoAtual = 'promocao';
let corpoAtual = null;
let abaAtual = 'aplicar';

function mudarTipo(tipo) {
    tipoAtual = tipo;
    const config = configForm[tipo];
    const fc = getFieldConfig(tipo);

    abaAtual = 'aplicar';
    document.getElementById('form-area').style.display = 'block';
    document.getElementById('historico-area').style.display = 'none';

    document.querySelectorAll('.req-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.req-tab[data-aba="aplicar"]').classList.add('active');

    document.getElementById('form-title').textContent = config.titulo;
    document.querySelector('.req-tab[data-aba="aplicar"]').textContent = config.titulo;
    document.getElementById('label-selecao').textContent = config.label;

    const camposCentro = document.getElementById('campo-centro');
    const camposAula = document.getElementById('campos-aula');
    const groupNick = document.getElementById('group-nick');

    // Toggle field visibility based on type config
    document.getElementById('grupo-nova-patente').style.display = fc.novaPatente ? 'block' : 'none';
    document.getElementById('grupo-select-opcoes').style.display = fc.selectOpcoes ? 'block' : 'none';
    document.getElementById('grupo-anexo-provas').style.display = fc.anexoProvas ? 'block' : 'none';
    document.getElementById('grupo-banido-ate').style.display = fc.banidoAte ? 'block' : 'none';
    document.getElementById('grupo-permissor').style.display = fc.permissor ? 'block' : 'none';
    document.getElementById('grupo-datahora').style.display = fc.datahora ? 'block' : 'none';
    document.getElementById('grupo-valor').style.display = fc.valor ? 'block' : 'none';
    document.getElementById('grupo-nick-promovido').style.display = fc.nickPromovido ? 'block' : 'none';

    // Reset new fields
    document.getElementById('input-nova-patente').value = '';
    document.getElementById('input-anexo-provas').value = '';
    document.getElementById('input-banido-ate').value = '';
    document.getElementById('input-valor').value = '';
    document.getElementById('input-nick-promovido').value = '';

    const labelSelect = document.getElementById('label-selecao');
    if (fc.labelOpcao) labelSelect.textContent = fc.labelOpcao;

    if (config.tipoForm === 'aula') {
        groupNick.style.display = 'none';
        camposAula.style.display = 'block';
        document.getElementById('campos-dinamicos').style.display = 'block';
        document.getElementById('campos-gratificacao').style.display = 'none';
        document.getElementById('campos-licenca').style.display = 'none';
        // ... (resto do centro logic omitido mas preservado se fosse replace total)
    } else if (config.tipoForm === 'gratificacao') {
        groupNick.style.display = 'none';
        camposAula.style.display = 'none';
        document.getElementById('campos-dinamicos').style.display = 'none';
        document.getElementById('campos-gratificacao').style.display = 'block';
        document.getElementById('campos-licenca').style.display = 'none';
        resetGratificacao();
    } else if (config.tipoForm === 'licenca') {
        groupNick.style.display = 'none';
        camposAula.style.display = 'none';
        document.getElementById('campos-dinamicos').style.display = 'none';
        document.getElementById('campos-gratificacao').style.display = 'none';
        document.getElementById('campos-licenca').style.display = 'block';
        renderizarLicencas();
    } else {
        groupNick.style.display = 'block';
        camposCentro.style.display = 'none';
        camposAula.style.display = 'none';
        document.getElementById('campos-dinamicos').style.display = 'none';
        document.getElementById('campos-gratificacao').style.display = 'none';
        document.getElementById('campos-licenca').style.display = 'none';
        document.getElementById('status-nick').style.display = 'none';
        document.getElementById('corpo-badge').style.display = 'none';
        document.getElementById('nick-envolvido').value = '';
    }

    document.querySelectorAll('.req-nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.req-nav-item[data-tipo="${tipo}"]`);
    if (navItem) navItem.classList.add('active');
}

function mudarAba(aba) {
    abaAtual = aba;

    document.querySelectorAll('.req-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.req-tab[data-aba="${aba}"]`).classList.add('active');

    document.getElementById('form-area').style.display = aba === 'aplicar' ? 'block' : 'none';
    document.getElementById('historico-area').style.display = aba !== 'aplicar' ? 'block' : 'none';

    if (aba !== 'aplicar') {
        carregarHistorico(aba);
    }
}

async function verificarMilitar() {
    const nick = document.getElementById('nick-envolvido').value.trim();

    if (nick.length < 3) {
        alert("Nick muito curto!");
        return;
    }

    const statusDiv = document.getElementById('status-nick');
    const corpoBadge = document.getElementById('corpo-badge');

    statusDiv.textContent = 'Consultando API Habbo...';
    statusDiv.style.display = 'block';
    statusDiv.style.color = 'var(--text-gray)';

    try {
        const response = await fetch(`https://www.habbo.com.br/api/public/users?name=${encodeURIComponent(nick)}`);

        if (!response.ok) {
            throw new Error('Usuário não encontrado');
        }

        const userData = await response.json();

        const dadosMilitar = JSON.parse(localStorage.getItem('dme_militar')) || [];
        const dadosEmpresarial = JSON.parse(localStorage.getItem('dme_empresarial')) || [];

        const encontradoMilitar = dadosMilitar.find(m => m.nick.toLowerCase() === nick.toLowerCase());
        const encontradoEmpresarial = dadosEmpresarial.find(m => m.nick.toLowerCase() === nick.toLowerCase());

        if (encontradoMilitar) {
            corpoAtual = 'militar';
            mostrarCampos(encontradoMilitar, 'Corpo Militar');
        } else if (encontradoEmpresarial) {
            corpoAtual = 'empresarial';
            mostrarCampos(encontradoEmpresarial, 'Corpo Empresarial');
        } else {
            corpoAtual = 'militar';
            mostrarCampos({ nick: userData.name || nick, patente: 'Não identificado' }, 'Corpo Militar (assumido)');
        }

    } catch (error) {
        statusDiv.textContent = 'Erro: ' + error.message;
        statusDiv.style.color = '#e74c3c';
    }
}

function mostrarCampos(dados, corpoNome) {
    const statusDiv = document.getElementById('status-nick');
    const corpoBadge = document.getElementById('corpo-badge');

    statusDiv.textContent = 'Usuário encontrado';
    statusDiv.style.display = 'block';
    statusDiv.style.color = 'var(--primary-green)';

    corpoBadge.textContent = corpoNome;
    corpoBadge.style.display = 'inline-block';

    const config = configForm[tipoAtual];
    const fc = getFieldConfig(tipoAtual);

    // Auto-fill Nova Patente for rank-based types
    if (fc.novaPatente && dados.patente) {
        const lista = corpoAtual === 'militar' ? CORPO_MILITAR : CORPO_EMPRESARIAL;
        const idx = lista.findIndex(p => p.toLowerCase() === dados.patente.toLowerCase());
        let novaPatente = '';

        if (tipoAtual === 'promocao') {
            // Promoção: next rank (index - 1, lower index = higher rank)
            novaPatente = idx > 0 ? lista[idx - 1] : lista[0];
        } else if (tipoAtual === 'rebaixamento') {
            // Rebaixamento: previous rank (index + 1, higher index = lower rank)
            novaPatente = idx < lista.length - 1 ? lista[idx + 1] : lista[lista.length - 1];
        } else if (tipoAtual === 'demissao') {
            // Demissão: always lowest rank
            novaPatente = corpoAtual === 'militar' ? 'Recruta' : 'Agente';
        }

        document.getElementById('input-nova-patente').value = novaPatente;
    }

    // Populate generic select for types that use it
    if (fc.selectOpcoes) {
        const opcoes = config.getOpcoes(corpoAtual);
        preencherSelect(opcoes);
    }

    document.getElementById('campos-dinamicos').style.display = 'block';
}

function preencherSelect(opcoes) {
    const select = document.getElementById('select-opcoes');
    select.innerHTML = '';
    opcoes.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });
}

function finalizar() {
    const config = configForm[tipoAtual];
    const fc = getFieldConfig(tipoAtual);
    const observacao = document.getElementById('input-observacao').value.trim();

    if (!observacao) {
        alert('Preencha o campo de observação!');
        return;
    }

    // Determine ação based on type
    let acao = '';
    if (fc.novaPatente) {
        acao = document.getElementById('input-nova-patente').value;
        if (!acao) { alert('Nova patente não foi preenchida. Verifique o militar primeiro.'); return; }
    } else if (fc.selectOpcoes) {
        acao = document.getElementById('select-opcoes').value;
        if (!acao) { alert('Selecione uma opção!'); return; }
    } else if (fc.nickPromovido) {
        acao = "Permissão para: " + document.getElementById('input-nick-promovido').value;
    } else {
        acao = tipoAtual;
    }

    let historico = JSON.parse(localStorage.getItem('dme_historico_req')) || [];

    const registro = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        timestamp: Date.now(),
        data: new Date().toLocaleString('pt-BR'),
        tipo: tipoAtual,
        acao: acao,
        aplicador: usuarioLogado,
        permissor: fc.permissor ? document.getElementById('input-permissor').value : '',
        observacao: observacao,
        dataHora: fc.datahora ? document.getElementById('input-datahora').value : '',
        anexoProvas: fc.anexoProvas ? document.getElementById('input-anexo-provas').value : '',
        banidoAte: fc.banidoAte ? document.getElementById('input-banido-ate').value : '',
        valor: fc.valor ? document.getElementById('input-valor').value : '',
        nickPromovido: fc.nickPromovido ? document.getElementById('input-nick-promovido').value : '',
        status: 'pendente'
    };

    if (config.tipoForm === 'rh') {
        const nick = document.getElementById('nick-envolvido').value.trim();
        if (!nick) {
            alert('Nick do envolvido é obrigatório!');
            return;
        }
        registro.militar = nick;
        registro.corpo = corpoAtual;
    } else {
        const aprovados = document.getElementById('input-aprovados').value;
        const reprovados = document.getElementById('input-reprovados').value;
        const semAlunos = document.getElementById('check-sem-alunos').checked;

        registro.aprovados = aprovados;
        registro.reprovados = reprovados;
        registro.semAlunos = semAlunos;

        if (config.mostrarCentro) {
            const centro = document.getElementById('select-centro').value;
            if (!centro) {
                alert('Selecione o Centro de Tarefas!');
                return;
            }
            registro.centro = centro;
        }
    }

    historico.push(registro);
    localStorage.setItem('dme_historico_req', JSON.stringify(historico));

    alert('Solicitação enviada para APROVAÇÃO do CRH!');

    mudarAba('minhas');

    // Reset fields
    document.getElementById('input-permissor').value = '';
    document.getElementById('input-observacao').value = '';
    document.getElementById('input-datahora').value = '';
    document.getElementById('input-nova-patente').value = '';
    document.getElementById('input-anexo-provas').value = '';
    document.getElementById('input-banido-ate').value = '';

    if (config.tipoForm === 'rh') {
        document.getElementById('nick-envolvido').value = '';
        document.getElementById('campos-dinamicos').style.display = 'none';
        document.getElementById('status-nick').style.display = 'none';
        document.getElementById('corpo-badge').style.display = 'none';
    } else {
        document.getElementById('input-aprovados').value = '';
        document.getElementById('input-reprovados').value = '';
        document.getElementById('check-sem-alunos').checked = false;
        if (config.mostrarCentro) {
            document.getElementById('select-centro').value = '';
            document.getElementById('select-opcoes').innerHTML = '<option value="">Primeiro selecione o Centro</option>';
        }
    }
}

function atualizarListagem(nick, novaPatente, corpo) {
    const chave = corpo === 'militar' ? 'dme_militar' : 'dme_empresarial';
    let dados = JSON.parse(localStorage.getItem(chave)) || [];

    const index = dados.findIndex(m => m.nick.toLowerCase() === nick.toLowerCase());

    if (index !== -1) {
        dados[index].patente = novaPatente;
        localStorage.setItem(chave, JSON.stringify(dados));
    }
}

function carregarHistorico(tipo) {
    let historico = [];
    try {
        historico = JSON.parse(localStorage.getItem('dme_historico_req')) || [];
    } catch (e) {
        historico = [];
    }

    const container = document.getElementById('lista-historico');
    const tituloDiv = document.getElementById('historico-title');

    let historicoFiltrado = historico.filter(h => h.tipo === tipoAtual);

    if (tipo === 'minhas') {
        const userNorm = usuarioLogado.trim().toLowerCase();
        historicoFiltrado = historicoFiltrado.filter(h => h.aplicador && h.aplicador.trim().toLowerCase() === userNorm);
        tituloDiv.textContent = 'Minhas Ações - ' + configForm[tipoAtual].titulo;
    } else {
        tituloDiv.textContent = 'Todas as Ações - ' + configForm[tipoAtual].titulo;
    }

    if (historicoFiltrado.length === 0) {
        container.innerHTML = `
            <div class="empty-historico">
                <div class="empty-historico-icon">Histórico</div>
                <div>Nenhuma ação encontrada</div>
            </div>
        `;
        return;
    }

    historicoFiltrado.sort((a, b) => {
        if (a.timestamp && b.timestamp) return b.timestamp - a.timestamp;
        return parseDataBR(b.data) - parseDataBR(a.data);
    });

    container.innerHTML = historicoFiltrado.map(h => {
        const realIndex = historico.indexOf(h);
        return criarCardHistorico(h, realIndex);
    }).join('');

    const inputFiltro = document.getElementById('filtro-historico');
    if (inputFiltro) {
        inputFiltro.oninput = (e) => {
            const termo = e.target.value.toLowerCase();
            document.querySelectorAll('.historico-card').forEach(card => {
                const texto = card.textContent.toLowerCase();
                card.style.display = texto.includes(termo) ? 'block' : 'none';
            });
        };
    }
}

function parseDataBR(dataString) {
    if (!dataString) return new Date(0);
    const [data, hora] = dataString.split(',');
    if (!data) return new Date(0);

    const [dia, mes, ano] = data.trim().split('/');
    const [h, m, s] = (hora || '00:00:00').trim().split(':');

    return new Date(ano, mes - 1, dia, h || 0, m || 0, s || 0);
}

function criarCardHistorico(registro, realIndex) {
    const config = configForm[registro.tipo];

    let iconSvg = '';
    if (registro.tipo === 'promocao') iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>';
    else if (registro.tipo === 'rebaixamento') iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
    else if (registro.tipo === 'demissao') iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
    else iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>';

    let principalInfo = '';
    if (config.tipoForm === 'rh') {
        principalInfo = `${registro.militar} (${registro.acao})`;
    } else {
        principalInfo = `${registro.acao} (${registro.centro ? registro.centro.toUpperCase() : 'N/A'})`;
    }

    const statusClass = registro.status === 'pendente' ? 'pendente' : (registro.status === 'aprovado' ? 'aprovado' : 'reprovado');
    const statusText = registro.status.toUpperCase();

    return `
        <div class="hist-item" onclick="verDetalhes(${realIndex})">
            <div class="hist-content">
                <div class="hist-icon">${iconSvg}</div>
                <div class="hist-info">
                    <span class="hist-title">${principalInfo}</span>
                    <div class="hist-meta">
                        <span>${registro.data}</span>
                        <span>&bull;</span>
                        <span>por ${registro.aplicador}</span>
                    </div>
                </div>
            </div>
            <div class="hist-actions">
                <span class="status-pill ${statusClass}">${statusText}</span>
                <button class="btn-details">Ver Detalhes</button>
            </div>
        </div>
    `;
}

let indexAtualModal = -1;

function verDetalhes(index) {
    const historico = JSON.parse(localStorage.getItem('dme_historico_req')) || [];
    const req = historico[index];
    if (!req) return;

    indexAtualModal = index;

    document.getElementById('modal-titulo').textContent = `Detalhes - ${tipoNome[req.tipo]} (${req.id || 'N/A'})`;
    document.getElementById('modal-obs').value = req.observacao || '';
    document.getElementById('modal-data').value = req.data || '';
    document.getElementById('modal-motivo').value = req.motivoReprovacao || '';

    const logsDiv = document.getElementById('modal-logs');
    logsDiv.innerHTML = req.aprovador ?
        `<p class="modal-label">Aprovado por: ${req.aprovador} em ${req.dataAprovacao}</p>` :
        (req.reprovador ? `<p class="modal-label">Reprovado por: ${req.reprovador} em ${req.dataReprovacao}</p>` : '<p class="modal-label">Nenhum LOG encontrado</p>');

    const username = localStorage.getItem('dme_username');
    const admins = JSON.parse(localStorage.getItem('dme_admins')) || [];
    const isAdmin = admins.includes(username);

    const actionsDiv = document.getElementById('modal-actions');
    if (isAdmin) {
        actionsDiv.style.display = 'flex';
    } else {
        actionsDiv.style.display = 'none';
    }

    document.getElementById('modal-detalhes').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-detalhes').style.display = 'none';
}

function confirmarAcaoAdmin() {
    const select = document.getElementById('select-acao-admin');
    const acao = select.value;
    if (!acao) return;
    acaoModal(acao);
}

function acaoModal(acao) {
    if (indexAtualModal === -1) return;
    const historico = JSON.parse(localStorage.getItem('dme_historico_req')) || [];
    const req = historico[indexAtualModal];
    const username = localStorage.getItem('dme_username');

    if (acao === 'aceitar') {
        if (!confirm('Confirmar aprovação?')) return;
        req.status = 'aprovado';
        req.aprovador = username;
        req.dataAprovacao = new Date().toLocaleString('pt-BR');

        if ((req.tipo === 'promocao' || req.tipo === 'rebaixamento' || req.tipo === 'demissao') && req.militar) {
            if (req.tipo === 'demissao') {
                atualizarListagemRemocao(req.militar, req.corpo);
            } else {
                atualizarListagem(req.militar, req.acao, req.corpo);
            }
        }
    } else if (acao === 'negar') {
        const motivo = document.getElementById('modal-motivo').value;
        if (!motivo) return alert('Preencha o motivo da negação!');

        req.status = 'reprovado';
        req.reprovador = username;
        req.motivoReprovacao = motivo;
        req.dataReprovacao = new Date().toLocaleString('pt-BR');
    } else if (acao === 'cancelar') {
        if (!confirm('Confirmar cancelamento da solicitação?')) return;
        req.status = 'cancelado';
        req.cancelador = username;
        req.dataCancelamento = new Date().toLocaleString('pt-BR');
    } else if (acao === 'apagar') {
        if (!confirm('Confirmar exclusão? Esta ação é irreversível.')) return;
        historico.splice(indexAtualModal, 1);
        localStorage.setItem('dme_historico_req', JSON.stringify(historico));
        fecharModal();
        const abaAtiva = document.querySelector('.nav-btn.active').getAttribute('data-aba');
        if (abaAtiva !== 'aplicar') carregarHistorico(abaAtiva);
        return;
    } else if (acao === 'editar') {
        req.observacao = document.getElementById('modal-obs').value;
        alert('Observação atualizada!');
    }

    historico[indexAtualModal] = req;
    localStorage.setItem('dme_historico_req', JSON.stringify(historico));
    alert('Ação realizada com sucesso!');
    fecharModal();
    const abaAtiva = document.querySelector('.nav-btn.active').getAttribute('data-aba');
    if (abaAtiva !== 'aplicar') carregarHistorico(abaAtiva);
}

function atualizarListagemRemocao(nick, corpo) {
    const chave = corpo === 'militar' ? 'dme_militar' : 'dme_empresarial';
    let dados = JSON.parse(localStorage.getItem(chave)) || [];
    dados = dados.filter(m => m.nick.toLowerCase() !== nick.toLowerCase());
    localStorage.setItem(chave, JSON.stringify(dados));
}


document.addEventListener('DOMContentLoaded', () => {
    // Theme is handled by theme.js loaded in the <head>

    document.getElementById('navUserName').textContent = usuarioLogado;
    document.getElementById('dropdownName').textContent = usuarioLogado;

    const avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${usuarioLogado}&headonly=1&size=m&gesture=std&head_direction=2`;
    const dropdownAvatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${usuarioLogado}&size=m&direction=2&head_direction=2&gesture=std`;
    document.getElementById('navUserImage').src = avatarUrl;
    document.getElementById('dropdownUserImage').src = dropdownAvatarUrl;

    const admins = JSON.parse(localStorage.getItem('dme_admins')) || ["Xandelicado", "rafacv", "Ronaldo"];
    if (admins.includes(usuarioLogado)) {
        if (document.getElementById('dropdownPainel')) document.getElementById('dropdownPainel').style.display = 'flex';
        if (document.getElementById('dropdownDivider')) document.getElementById('dropdownDivider').style.display = 'block';
    }

    document.querySelectorAll('.req-nav-item[data-tipo]').forEach(btn => {
        btn.addEventListener('click', function () {
            mudarTipo(this.getAttribute('data-tipo'));
        });
    });

    document.querySelectorAll('.req-tab[data-aba]').forEach(btn => {
        btn.addEventListener('click', function () {
            mudarAba(this.getAttribute('data-aba'));
        });
    });

    document.getElementById('btn-verificar')?.addEventListener('click', verificarMilitar);

    document.getElementById('nick-envolvido')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') verificarMilitar();
    });

    document.getElementById('select-centro')?.addEventListener('change', function () {
        const centro = this.value;
        if (centro) {
            preencherSelect(CENTROS_AULAS[centro]);
        } else {
            const opts = document.getElementById('select-opcoes');
            if (opts) opts.innerHTML = '<option value="">Primeiro selecione o Centro</option>';
        }
    });

    document.getElementById('btn-salvar')?.addEventListener('click', finalizar);

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

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            mobileSidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    });

    const userProfileBtn = document.getElementById('userProfileBtn');
    const userDropdown = document.getElementById('userDropdown');

    if (userProfileBtn && userDropdown) {
        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (userDropdown && !userProfileBtn.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
    });

    // ── Confirmação estilizada ───────────────────────────
    function reqConfirmar(mensagem, onConfirm) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
        wrap.innerHTML = `
            <div style="background:var(--bg-2);border:1px solid var(--b2);border-radius:14px;padding:24px 28px;max-width:360px;width:100%;box-shadow:var(--shadow-lg);animation:reqPop .18s ease">
                <div style="font-size:1.5rem;text-align:center;margin-bottom:10px">⚠️</div>
                <p style="font-size:.88rem;font-weight:600;color:var(--t1);text-align:center;margin-bottom:6px">${mensagem}</p>
                <p style="font-size:.75rem;color:var(--t3);text-align:center;margin-bottom:20px">Esta ação não pode ser desfeita sem recarregar a página.</p>
                <div style="display:flex;gap:10px;justify-content:center">
                    <button id="_rcCancelar" style="padding:8px 22px;border-radius:8px;border:1px solid var(--b2);background:var(--bg-3);color:var(--t2);font-size:.82rem;font-weight:600;cursor:pointer">Cancelar</button>
                    <button id="_rcConfirmar" style="padding:8px 22px;border-radius:8px;border:none;background:var(--red,#ef4444);color:#fff;font-size:.82rem;font-weight:600;cursor:pointer">Remover</button>
                </div>
            </div>`;
        document.body.appendChild(wrap);
        wrap.querySelector('#_rcCancelar').onclick = () => wrap.remove();
        wrap.querySelector('#_rcConfirmar').onclick = () => { wrap.remove(); onConfirm(); };
        wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
    }

    // ── Admin: botão de criação e exclusão por tipo ──────
    const ehAdmin = admins.includes(usuarioLogado);
    const getHiddenTipos = () => { try { return JSON.parse(localStorage.getItem('dme_req_hidden') || '[]'); } catch { return []; } };
    const saveHiddenTipos = arr => localStorage.setItem('dme_req_hidden', JSON.stringify(arr));

    // Ocultar itens que o admin removeu
    getHiddenTipos().forEach(id => {
        const el = document.querySelector(`.req-nav-item[data-tipo="${id}"]`);
        if (el) el.style.display = 'none';
    });

    // Se admin: adicionar botão × em cada item nato + mostrar itens customizados no grupo RH
    const rhGroup = document.querySelector('.req-nav-group');
    if (ehAdmin && rhGroup) {
        // Adicionar × em cada item nativo
        rhGroup.querySelectorAll('.req-nav-item').forEach(item => {
            if (item.querySelector('.req-del-btn')) return; // já tem
            const delBtn = document.createElement('button');
            delBtn.className = 'req-del-btn';
            delBtn.title = 'Ocultar item';
            delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            item.appendChild(delBtn);
            delBtn.addEventListener('click', e => {
                e.stopPropagation();
                const id = item.dataset.tipo;
                const nome = item.textContent.trim().split('\n')[0].trim();
                reqConfirmar(`Remover "${nome}" dos requerimentos?`, () => {
                    const hidden = getHiddenTipos();
                    if (!hidden.includes(id)) hidden.push(id);
                    saveHiddenTipos(hidden);
                    item.style.transition = 'opacity .2s';
                    item.style.opacity = '0';
                    setTimeout(() => { item.style.display = 'none'; }, 200);
                    if (tipoAtual === id) mudarTipo('promocao');
                });
            });
        });

        // Mostrar o botão Criar (último item do grupo)
        const grupoAdd = document.getElementById('grupoAdminAdd');
        if (grupoAdd) grupoAdd.style.display = 'block';
    }

    // Renderizar customizados dentro do grupo RH
    renderCustomNav();

    function renderCustomNav() {
        // Remove itens customizados anteriores
        rhGroup && rhGroup.querySelectorAll('.req-nav-item[data-custom]').forEach(el => el.remove());
        const customTipos = getCustomTipos();

        // Esconder grupoCustom separado (não mais usado)
        const grupoCustom = document.getElementById('grupoCustom');
        if (grupoCustom) grupoCustom.style.display = 'none';

        if (!rhGroup) return;

        customTipos.forEach(ct => {
            const el = document.createElement('div');
            el.className = 'req-nav-item';
            el.dataset.tipo = ct.id;
            el.dataset.custom = '1';
            el.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                ${ct.titulo}
                ${ehAdmin ? `<button class="req-del-btn" title="Remover tipo" style="opacity:.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>` : ''}`;
            el.addEventListener('click', e => {
                if (e.target.closest('.req-del-btn')) return;
                mudarTipo(ct.id);
                document.querySelectorAll('.req-nav-item').forEach(i => i.classList.remove('active'));
                el.classList.add('active');
            });
            if (ehAdmin) {
                el.querySelector('.req-del-btn')?.addEventListener('click', e => {
                    e.stopPropagation();
                    reqConfirmar(`Remover "${ct.titulo}" dos requerimentos?`, () => {
                        const arr = getCustomTipos().filter(c => c.id !== ct.id);
                        saveCustomTipos(arr);
                        delete configForm[ct.id];
                        delete tipoNome[ct.id];
                        renderCustomNav();
                        if (tipoAtual === ct.id) mudarTipo('promocao');
                    });
                });
            }
            // Inserir antes do grupoAdminAdd se existir, senão ao final do rhGroup
            const addGroup = document.getElementById('grupoAdminAdd');
            if (addGroup && addGroup.parentNode === rhGroup.parentNode) {
                rhGroup.appendChild(el);
            } else {
                rhGroup.appendChild(el);
            }
        });
    }

    // Modal para criar tipo customizado
    const btnAdd = document.getElementById('btnAdicionarTipo');
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
            wrap.innerHTML = `
                <div style="background:var(--bg-2);border:1px solid var(--b2);border-radius:16px;padding:28px;max-width:420px;width:100%;box-shadow:var(--shadow-lg)">
                    <h3 style="font-size:.95rem;font-weight:700;color:var(--t1);margin-bottom:18px">Criar Novo Tipo de Requerimento</h3>
                    <div class="g-form-group">
                        <label class="g-label">Nome do Requerimento <span style="color:var(--red)">*</span></label>
                        <input type="text" class="g-input" id="_cNome" placeholder="Ex: Suspensão">
                    </div>
                    <div class="g-form-group">
                        <label class="g-label">Label do Campo Principal <span style="color:var(--red)">*</span></label>
                        <input type="text" class="g-input" id="_cLabel" placeholder="Ex: Motivo da Suspensão">
                    </div>
                    <div class="g-form-group">
                        <label class="g-label">Opções (uma por linha) <span style="color:var(--red)">*</span></label>
                        <textarea class="g-input" id="_cOpcoes" style="min-height:100px;resize:vertical" placeholder="Opção 1&#10;Opção 2&#10;Opção 3"></textarea>
                    </div>
                    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px">
                        <button class="btn-secondary" id="_cCancelar">Cancelar</button>
                        <button class="btn-primary" id="_cSalvar">Criar</button>
                    </div>
                </div>`;
            document.body.appendChild(wrap);
            wrap.querySelector('#_cCancelar').onclick = () => wrap.remove();
            wrap.querySelector('#_cSalvar').onclick = () => {
                const nome = wrap.querySelector('#_cNome').value.trim();
                const label = wrap.querySelector('#_cLabel').value.trim();
                const opcoes = wrap.querySelector('#_cOpcoes').value.split('\n').map(s => s.trim()).filter(Boolean);
                if (!nome || !label || opcoes.length === 0) { wrap.querySelector('#_cNome').focus(); return; }
                const id = 'custom-' + nome.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
                const arr = getCustomTipos();
                arr.push({ id, titulo: nome, label, opcoes });
                saveCustomTipos(arr);
                configForm[id] = { titulo: nome, label, tipoForm: 'rh', getOpcoes: () => opcoes };
                tipoNome[id] = nome;
                renderCustomNav();
                wrap.remove();
            };
        });
    }

    // Botão Restaurar Ocultos
    const btnRestaurar = document.getElementById('btnRestaurarOcultos');
    if (btnRestaurar) {
        btnRestaurar.addEventListener('click', () => {
            const hidden = getHiddenTipos();
            if (hidden.length === 0) {
                reqConfirmar('Nenhum item oculto para restaurar.', () => { });
                return;
            }

            // Mapa nome→id dos itens natos
            const nomes = {
                'promocao': 'Promoção', 'advertencia': 'Advertência',
                'rebaixamento': 'Rebaixamento', 'demissao': 'Demissão',
                'exoneracao': 'Exoneração', 'contrato': 'Contrato e Reintegração',
                'venda': 'Venda', 'licenca': 'Licença', 'gratificacao': 'Gratificação',
                'permissao': 'Permissão', 'transferencia': 'Transferência', 'cadetes': 'Cadetes'
            };

            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
            wrap.innerHTML = `
                <div style="background:var(--bg-2);border:1px solid var(--b2);border-radius:16px;padding:24px 28px;max-width:380px;width:100%;box-shadow:var(--shadow-lg)">
                    <h3 style="font-size:.9rem;font-weight:700;color:var(--t1);margin-bottom:4px">Itens Ocultos</h3>
                    <p style="font-size:.74rem;color:var(--t3);margin-bottom:16px">Clique em um item para restaurá-lo na lista.</p>
                    <div id="_restList" style="display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto;margin-bottom:16px"></div>
                    <div style="display:flex;gap:8px;justify-content:flex-end">
                        <button id="_restTodos" style="padding:7px 16px;border-radius:8px;border:1px solid var(--green);color:var(--green);background:var(--green-muted);font-size:.78rem;font-weight:600;cursor:pointer">Restaurar Todos</button>
                        <button id="_restFechar" style="padding:7px 16px;border-radius:8px;border:1px solid var(--b2);background:var(--bg-3);color:var(--t2);font-size:.78rem;font-weight:600;cursor:pointer">Fechar</button>
                    </div>
                </div>`;
            document.body.appendChild(wrap);

            function renderRestList() {
                const cur = getHiddenTipos();
                const list = wrap.querySelector('#_restList');
                if (cur.length === 0) { list.innerHTML = '<p style="font-size:.78rem;color:var(--t3);text-align:center;padding:12px">Nenhum item oculto.</p>'; return; }
                list.innerHTML = cur.map(id => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-3);border:1px solid var(--b1);border-radius:8px;gap:10px">
                        <span style="font-size:.82rem;font-weight:600;color:var(--t2)">${nomes[id] || id}</span>
                        <button data-rid="${id}" style="padding:4px 12px;border-radius:6px;border:none;background:var(--green-muted);color:var(--green);font-size:.75rem;font-weight:700;cursor:pointer">Restaurar</button>
                    </div>`).join('');
                list.querySelectorAll('button[data-rid]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const rid = btn.dataset.rid;
                        const newHidden = getHiddenTipos().filter(i => i !== rid);
                        saveHiddenTipos(newHidden);
                        const el = document.querySelector(`.req-nav-item[data-tipo="${rid}"]`);
                        if (el) { el.style.display = ''; el.style.opacity = '1'; }
                        renderRestList();
                    });
                });
            }
            renderRestList();
            wrap.querySelector('#_restFechar').onclick = () => wrap.remove();
            wrap.querySelector('#_restTodos').onclick = () => {
                saveHiddenTipos([]);
                document.querySelectorAll('.req-nav-item[data-tipo]').forEach(el => { el.style.display = ''; el.style.opacity = '1'; });
                wrap.remove();
            };
            wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
        });
    }

    mudarTipo('promocao');
});

// ── Lógica de Tags (Gratificação) ──
let tagsGratificacao = [];

function resetGratificacao() {
    tagsGratificacao = [];
    renderTags();
    document.getElementById('input-quantidade').value = '';
    document.getElementById('input-motivo').value = '';
}

function renderTags() {
    const container = document.getElementById('tag-container');
    const input = document.getElementById('input-tag-nick');

    // Remove tags antigas mantendo o input
    const chips = container.querySelectorAll('.tag-chip');
    chips.forEach(c => c.remove());

    tagsGratificacao.forEach((nick, idx) => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `${nick}<button onclick="removeTag(${idx})">&times;</button>`;
        container.insertBefore(chip, input);
    });
}

function removeTag(idx) {
    tagsGratificacao.splice(idx, 1);
    renderTags();
}

document.getElementById('input-tag-nick')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const nick = e.target.value.trim();
        if (nick && !tagsGratificacao.includes(nick)) {
            tagsGratificacao.push(nick);
            e.target.value = '';
            renderTags();
        }
    }
});

// ── Lógica de Licença ──
function renderizarLicencas() {
    // Mock ou busca do localStorage (exemplo simplificado)
    const historico = JSON.parse(localStorage.getItem('dme_historico_req')) || [];
    const licencas = historico.filter(h => h.tipo === 'licenca');

    const pendentes = document.getElementById('licenca-pendentes');
    const andamento = document.getElementById('licenca-andamento');
    const todas = document.getElementById('licenca-todas');

    // Aqui você renderizaria as tabelas baseado no status
    // Por enquanto deixamos o feedback visual do print
}

document.getElementById('btn-salvar-gratificacao')?.addEventListener('click', () => {
    if (tagsGratificacao.length === 0) { alert('Adicione pelo menos um envolvido!'); return; }
    const qtd = document.getElementById('input-quantidade').value;
    const motivo = document.getElementById('input-motivo').value;
    if (!qtd || !motivo) { alert('Preencha todos os campos!'); return; }

    const registro = {
        id: Date.now().toString(36),
        data: new Date().toLocaleString('pt-BR'),
        tipo: 'gratificacao',
        envolvidos: tagsGratificacao,
        acao: `Pontuação: ${qtd}`,
        observacao: motivo,
        aplicador: usuarioLogado,
        status: 'pendente'
    };

    let historico = JSON.parse(localStorage.getItem('dme_historico_req')) || [];
    historico.push(registro);
    localStorage.setItem('dme_historico_req', JSON.stringify(historico));

    alert('Pontuação enviada com sucesso!');
    mudarAba('minhas');
});
