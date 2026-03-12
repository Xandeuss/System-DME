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

// Ordem ascendente (menor → maior) para uso em selects de contrato/reintegração
const CORPO_MILITAR_ASC = [
    "Soldado", "Cabo", "Sargento", "Subtenente", "Aspirante a Oficial",
    "Tenente", "Capitão", "Major", "Tenente-Coronel", "Coronel",
    "General", "Marechal", "Subcomandante", "Comandante", "Comandante-Geral"
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
    permissao: { novaPatente: false, selectOpcoes: false, anexoProvas: false, banidoAte: false, permissor: false, datahora: false, nickAutorizado: true, nickPromovido: true },
    transferencia: { novaPatente: true, selectOpcoes: false, anexoProvas: false, banidoAte: false, permissor: false, datahora: false },
    cadetes: { novaPatente: true, selectOpcoes: false, anexoProvas: false, banidoAte: false, permissor: false, datahora: false, patenteFixa: "Cadete" },
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
        label: "Nova patente",
        tipoForm: "rh",
        getOpcoes: () => CORPO_MILITAR_ASC
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

    // Novo: campo nick autorizado (permissão)
    const grupoNickAutorizado = document.getElementById('grupo-nick-autorizado');
    if (grupoNickAutorizado) grupoNickAutorizado.style.display = fc.nickAutorizado ? 'block' : 'none';

    // Novo: patente fixa (cadetes)
    if (fc.patenteFixa) {
        document.getElementById('input-nova-patente').value = fc.patenteFixa;
        document.getElementById('input-nova-patente').readOnly = true;
    } else {
        document.getElementById('input-nova-patente').readOnly = false;
    }

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

async function verificarNickAutorizado() {
    const nick = document.getElementById('input-nick-autorizado').value.trim();
    const statusDiv = document.getElementById('status-nick-autorizado');
    if (nick.length < 3) { alert('Nick muito curto!'); return; }

    statusDiv.textContent = 'Consultando...';
    statusDiv.style.display = 'block';
    statusDiv.style.color = 'var(--text-gray)';

    try {
        const response = await fetch(`https://www.habbo.com.br/api/public/users?name=${encodeURIComponent(nick)}`);
        if (!response.ok) throw new Error('Usuário não encontrado');
        statusDiv.textContent = '✓ Usuário encontrado';
        statusDiv.style.color = 'var(--primary-green,#22c55e)';
    } catch (err) {
        statusDiv.textContent = '✗ Usuário não encontrado';
        statusDiv.style.color = '#ef4444';
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
            novaPatente = idx > 0 ? lista[idx - 1] : lista[0];
        } else if (tipoAtual === 'rebaixamento') {
            novaPatente = idx < lista.length - 1 ? lista[idx + 1] : lista[lista.length - 1];
        } else if (tipoAtual === 'demissao') {
            novaPatente = corpoAtual === 'militar' ? 'Recruta' : 'Agente';
        } else if (tipoAtual === 'transferencia') {
            // Transferência: mostra a patente atual do militar (readonly)
            novaPatente = dados.patente || '';
            document.getElementById('input-nova-patente').readOnly = true;
        } else if (tipoAtual === 'cadetes') {
            // Cadetes: sempre "Cadete" (fixo)
            novaPatente = 'Cadete';
            document.getElementById('input-nova-patente').readOnly = true;
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

async function finalizar() {
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
        const nickAutorizado = fc.nickAutorizado ? document.getElementById('input-nick-autorizado').value : '';
        const nickPromovido = document.getElementById('input-nick-promovido').value;
        acao = nickAutorizado
            ? `Autorizado: ${nickAutorizado} | Promovido: ${nickPromovido}`
            : `Permissão para: ${nickPromovido}`;
    } else {
        acao = tipoAtual;
    }

    const registro = {
        tipo: tipoAtual,
        acao: acao,
        aplicador: usuarioLogado,
        permissor: fc.permissor ? document.getElementById('input-permissor').value : null,
        observacao: observacao,
        data_hora: fc.datahora ? document.getElementById('input-datahora').value : new Date().toISOString(),
        anexo_provas: fc.anexoProvas ? document.getElementById('input-anexo-provas').value : null,
        banido_ate: fc.banidoAte ? document.getElementById('input-banido-ate').value || null : null,
        valor: fc.valor ? document.getElementById('input-valor').value : null,
        nick_promovido: fc.nickPromovido ? document.getElementById('input-nick-promovido').value : null,
        nick_autorizado: fc.nickAutorizado ? document.getElementById('input-nick-autorizado').value : null,
        status: 'pendente'
    };

    if (config.tipoForm === 'rh') {
        const nick = document.getElementById('nick-envolvido').value.trim();
        if (!nick) {
            alert('Nick do envolvido é obrigatório!');
            return;
        }
        registro.tags_envolvidos = [nick];
    } else {
        // Para tipos de aula/outros, podemos guardar os aprovados/reprovados em tags ou observação
        const aprovados = document.getElementById('input-aprovados').value;
        const reprovados = document.getElementById('input-reprovados').value;
        registro.observacao += ` | Aprovados: ${aprovados} | Reprovados: ${reprovados}`;
    }

    try {
        const { error } = await supabase
            .from('requerimentos')
            .insert([registro]);

        if (error) throw error;

        alert('Solicitação enviada para APROVAÇÃO do CRH!');
        mudarAba('minhas');

        // Reset fields
        document.getElementById('input-permissor').value = '';
        document.getElementById('input-observacao').value = '';
        if (document.getElementById('input-datahora')) document.getElementById('input-datahora').value = '';
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
        }
    } catch (err) {
        console.error('Erro ao salvar requerimento:', err);
        alert('Erro ao enviar solicitação para o Supabase.');
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

let cacheHistorico = [];

async function carregarHistorico(aba) {
    const container = document.getElementById('lista-historico');
    const tituloDiv = document.getElementById('historico-title');

    container.innerHTML = '<div class="loading-historico">Carregando dados do Supabase...</div>';

    try {
        let query = supabase
            .from('requerimentos')
            .select('*')
            .eq('tipo', tipoAtual)
            .order('data_hora', { ascending: false });

        if (aba === 'minhas') {
            query = query.eq('aplicador', usuarioLogado);
            tituloDiv.textContent = 'Minhas Ações - ' + configForm[tipoAtual].titulo;
        } else {
            tituloDiv.textContent = 'Todas as Ações - ' + configForm[tipoAtual].titulo;
        }

        const { data, error } = await query;

        if (error) throw error;

        cacheHistorico = data || [];

        if (cacheHistorico.length === 0) {
            container.innerHTML = `
                <div class="empty-historico">
                    <div class="empty-historico-icon">Histórico</div>
                    <div>Nenhuma ação encontrada no banco de dados</div>
                </div>
            `;
            return;
        }

        container.innerHTML = cacheHistorico.map((h, index) => criarCardHistorico(h, index)).join('');

        const inputFiltro = document.getElementById('filtro-historico');
        if (inputFiltro) {
            inputFiltro.oninput = (e) => {
                const termo = e.target.value.toLowerCase();
                document.querySelectorAll('.hist-item').forEach((card, idx) => {
                    const texto = JSON.stringify(cacheHistorico[idx]).toLowerCase();
                    card.style.display = texto.includes(termo) ? 'flex' : 'none';
                });
            };
        }
    } catch (err) {
        console.error('Erro ao carregar histórico:', err);
        container.innerHTML = '<div class="error-historico">Erro ao carregar dados do Supabase.</div>';
    }
}

function criarCardHistorico(registro, index) {
    const config = configForm[registro.tipo];

    let iconSvg = '';
    if (registro.tipo === 'promocao') iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>';
    else if (registro.tipo === 'rebaixamento') iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
    else if (registro.tipo === 'demissao') iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
    else iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>';

    let principalInfo = '';
    if (config.tipoForm === 'rh') {
        const militar = (registro.tags_envolvidos && registro.tags_envolvidos[0]) || 'N/A';
        principalInfo = `${militar} (${registro.acao})`;
    } else {
        principalInfo = `${registro.acao}`;
    }

    const statusClass = registro.status === 'pendente' ? 'pendente' : (registro.status === 'aprovado' ? 'aprovado' : 'reprovado');
    const statusText = registro.status.toUpperCase();
    const dataFormatada = new Date(registro.data_hora).toLocaleString('pt-BR');

    return `
        <div class="hist-item" onclick="verDetalhes(${index})">
            <div class="hist-content">
                <div class="hist-icon">${iconSvg}</div>
                <div class="hist-info">
                    <span class="hist-title">${principalInfo}</span>
                    <div class="hist-meta">
                        <span>${dataFormatada}</span>
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
    const req = cacheHistorico[index];
    if (!req) return;

    indexAtualModal = index;

    document.getElementById('modal-titulo').textContent = `Detalhes - ${tipoNome[req.tipo]} (${req.id.substring(0,8)})`;
    document.getElementById('modal-obs').value = req.observacao || '';
    document.getElementById('modal-data').value = new Date(req.data_hora).toLocaleString('pt-BR');
    document.getElementById('modal-motivo').value = req.motivo_reprovacao || '';

    const logsDiv = document.getElementById('modal-logs');
    logsDiv.innerHTML = req.aprovador ?
        `<p class="modal-label">Aprovado por: ${req.aprovador}</p>` :
        (req.reprovador ? `<p class="modal-label">Reprovado por: ${req.reprovador}</p>` : '<p class="modal-label">Aguardando análise</p>');

    const username = localStorage.getItem('dme_username');
    const admins = ["Xandelicado", "rafacv", "Ronaldo"]; // Mock admin check
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

async function acaoModal(acao) {
    if (indexAtualModal === -1) return;
    const req = cacheHistorico[indexAtualModal];
    const username = localStorage.getItem('dme_username');

    try {
        if (acao === 'aceitar') {
            if (!confirm('Confirmar aprovação?')) return;
            
            const { error: updateError } = await supabase
                .from('requerimentos')
                .update({ 
                    status: 'aprovado',
                    aprovador: username
                })
                .eq('id', req.id);

            if (updateError) throw updateError;

            // Se for promoção/rebaixamento/demissão, atualiza a patente do militar no Supabase
            if ((req.tipo === 'promocao' || req.tipo === 'rebaixamento' || req.tipo === 'demissao') && req.tags_envolvidos && req.tags_envolvidos[0]) {
                const militarNick = req.tags_envolvidos[0];
                const novaPatente = req.acao;

                if (req.tipo === 'demissao') {
                    await supabase.from('militares').update({ status: 'desativado' }).eq('nick', militarNick);
                } else {
                    await supabase.from('militares').update({ patente: novaPatente }).eq('nick', militarNick);
                }
            }
        } else if (acao === 'negar') {
            const motivo = document.getElementById('modal-motivo').value;
            if (!motivo) return alert('Preencha o motivo da negação!');

            const { error: updateError } = await supabase
                .from('requerimentos')
                .update({ 
                    status: 'reprovado',
                    reprovador: username,
                    motivo_reprovacao: motivo
                })
                .eq('id', req.id);

            if (updateError) throw updateError;
        } else if (acao === 'cancelar') {
            if (!confirm('Confirmar cancelamento da solicitação?')) return;
            const { error: updateError } = await supabase
                .from('requerimentos')
                .update({ status: 'cancelado' })
                .eq('id', req.id);
            if (updateError) throw updateError;
        } else if (acao === 'apagar') {
            if (!confirm('Confirmar exclusão? Esta ação é irreversível.')) return;
            const { error: delError } = await supabase
                .from('requerimentos')
                .delete()
                .eq('id', req.id);
            if (delError) throw delError;
            
            fecharModal();
            carregarHistorico(abaAtual);
            return;
        } else if (acao === 'editar') {
            const obs = document.getElementById('modal-obs').value;
            const { error: updateError } = await supabase
                .from('requerimentos')
                .update({ observacao: obs })
                .eq('id', req.id);
            if (updateError) throw updateError;
            alert('Observação atualizada!');
        }

        alert('Ação realizada com sucesso!');
        fecharModal();
        carregarHistorico(abaAtual);
    } catch (err) {
        console.error('Erro na ação admin:', err);
        alert('Erro ao processar ação no Supabase.');
    }
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
async function renderizarLicencas() {
    const pendentes = document.getElementById('licenca-pendentes');
    const andamento = document.getElementById('licenca-andamento');
    const todas = document.getElementById('licenca-todas');

    if (pendentes) pendentes.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--t3);padding:16px">Carregando...</td></tr>';
    if (andamento) andamento.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--t3);padding:16px">Carregando...</td></tr>';
    if (todas) todas.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--t3);padding:16px">Carregando...</td></tr>';

    try {
        const { data, error } = await supabase
            .from('requerimentos')
            .select('*')
            .eq('tipo', 'licenca')
            .order('data_hora', { ascending: false });

        if (error) throw error;

        const licencas = data || [];
        const hoje = new Date();

        const listaPendentes = licencas.filter(l => l.status === 'pendente');
        const listaAndamento = licencas.filter(l => {
            if (l.status !== 'aprovado') return false;
            const fim = l.banido_ate ? new Date(l.banido_ate) : null;
            return fim ? fim >= hoje : true;
        });
        const listaTodasFmt = licencas;

        // Renderizar pendentes
        if (pendentes) {
            if (listaPendentes.length === 0) {
                pendentes.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--primary-green);padding:16px">Nenhuma licença pendente</td></tr>';
            } else {
                pendentes.innerHTML = listaPendentes.map((l, i) => {
                    const nick = (l.tags_envolvidos && l.tags_envolvidos[0]) || l.aplicador;
                    const inicio = l.data_hora ? new Date(l.data_hora).toLocaleDateString('pt-BR') : '—';
                    const dias = l.acao || '—';
                    return `<tr>
                        <td>${i + 1}</td>
                        <td>${nick}</td>
                        <td>${inicio}</td>
                        <td>${dias}</td>
                        <td><button class="btn-ver-licenca" onclick="verLicenca('${l.id}')">Ver</button></td>
                    </tr>`;
                }).join('');
            }
        }

        // Renderizar em andamento
        if (andamento) {
            if (listaAndamento.length === 0) {
                andamento.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--t3);padding:16px">Nenhuma licença em andamento</td></tr>';
            } else {
                andamento.innerHTML = listaAndamento.map((l, i) => {
                    const nick = (l.tags_envolvidos && l.tags_envolvidos[0]) || l.aplicador;
                    const inicio = l.data_hora ? new Date(l.data_hora).toLocaleDateString('pt-BR') : '—';
                    const fim = l.banido_ate ? new Date(l.banido_ate).toLocaleDateString('pt-BR') : '—';
                    const dias = l.acao || '—';
                    return `<tr>
                        <td>${i + 1}</td>
                        <td>${nick}</td>
                        <td>${inicio}<br><small style="color:var(--t3)">${dias} dias</small></td>
                        <td>${fim}</td>
                        <td><button class="btn-ver-licenca" onclick="verLicenca('${l.id}')">Ver</button></td>
                    </tr>`;
                }).join('');
            }
        }

        // Renderizar todas
        if (todas) {
            if (listaTodasFmt.length === 0) {
                todas.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--t3);padding:16px">Nenhuma licença registrada</td></tr>';
            } else {
                todas.innerHTML = listaTodasFmt.map((l, i) => {
                    const nick = (l.tags_envolvidos && l.tags_envolvidos[0]) || l.aplicador;
                    const inicio = l.data_hora ? new Date(l.data_hora).toLocaleDateString('pt-BR') : '—';
                    const dias = l.acao || '—';
                    const statusClass = l.status === 'aprovado' ? 'aprovado' : l.status === 'pendente' ? 'pendente' : 'reprovado';
                    return `<tr>
                        <td>${i + 1}</td>
                        <td>${nick}</td>
                        <td>${inicio}</td>
                        <td>${dias}</td>
                        <td><span class="status-pill ${statusClass}">${(l.status || 'pendente').toUpperCase()}</span></td>
                        <td><button class="btn-ver-licenca" onclick="verLicenca('${l.id}')">Ver</button></td>
                    </tr>`;
                }).join('');
            }
        }
    } catch (err) {
        console.error('Erro ao carregar licenças:', err);
        if (pendentes) pendentes.innerHTML = '<tr><td colspan="4" style="color:#e74c3c;text-align:center;padding:16px">Erro ao carregar dados</td></tr>';
    }
}

// Abrir modal para postar nova licença
function abrirPostLicenca() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    wrap.innerHTML = `
        <div style="background:var(--bg-2,#0d1a0d);border:1px solid var(--b2,#1e3a1e);border-radius:16px;padding:28px;max-width:460px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6)">
            <h3 style="font-size:.95rem;font-weight:700;color:var(--t1,#fff);margin-bottom:18px">📋 Registrar Licença</h3>
            <div class="g-form-group" style="margin-bottom:14px">
                <label class="g-label" style="font-size:.78rem;font-weight:600;color:var(--t2,#ccc);display:block;margin-bottom:6px">Nick do Militar <span style="color:#ef4444">*</span></label>
                <input type="text" class="g-input" id="_licNick" placeholder="Digite o nick" style="width:100%;padding:9px 12px;border-radius:8px;background:var(--bg-3,#0a120a);border:1px solid var(--b1,#1a2e1a);color:var(--t1,#fff);font-size:.84rem">
            </div>
            <div class="g-form-group" style="margin-bottom:14px">
                <label class="g-label" style="font-size:.78rem;font-weight:600;color:var(--t2,#ccc);display:block;margin-bottom:6px">Quantidade de Dias <span style="color:#ef4444">*</span></label>
                <input type="number" class="g-input" id="_licDias" min="1" max="365" placeholder="Ex: 15" style="width:100%;padding:9px 12px;border-radius:8px;background:var(--bg-3,#0a120a);border:1px solid var(--b1,#1a2e1a);color:var(--t1,#fff);font-size:.84rem">
            </div>
            <div class="g-form-group" style="margin-bottom:14px">
                <label class="g-label" style="font-size:.78rem;font-weight:600;color:var(--t2,#ccc);display:block;margin-bottom:6px">Data de Início <span style="color:#ef4444">*</span></label>
                <input type="date" class="g-input" id="_licInicio" style="width:100%;padding:9px 12px;border-radius:8px;background:var(--bg-3,#0a120a);border:1px solid var(--b1,#1a2e1a);color:var(--t1,#fff);font-size:.84rem">
            </div>
            <div class="g-form-group" style="margin-bottom:20px">
                <label class="g-label" style="font-size:.78rem;font-weight:600;color:var(--t2,#ccc);display:block;margin-bottom:6px">Motivo / Observação <span style="color:#ef4444">*</span></label>
                <textarea class="g-input" id="_licObs" placeholder="Motivo da licença..." style="width:100%;padding:9px 12px;border-radius:8px;background:var(--bg-3,#0a120a);border:1px solid var(--b1,#1a2e1a);color:var(--t1,#fff);font-size:.84rem;min-height:80px;resize:vertical"></textarea>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button id="_licCancelar" style="padding:8px 20px;border-radius:8px;border:1px solid var(--b2,#1e3a1e);background:var(--bg-3,#0a120a);color:var(--t2,#ccc);font-size:.82rem;font-weight:600;cursor:pointer">Cancelar</button>
                <button id="_licSalvar" style="padding:8px 20px;border-radius:8px;border:none;background:var(--green,#22c55e);color:#fff;font-size:.82rem;font-weight:700;cursor:pointer">Registrar Licença</button>
            </div>
        </div>`;
    document.body.appendChild(wrap);

    // Pré-preencher data de hoje
    wrap.querySelector('#_licInicio').value = new Date().toISOString().split('T')[0];

    wrap.querySelector('#_licCancelar').onclick = () => wrap.remove();
    wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });

    wrap.querySelector('#_licSalvar').onclick = async () => {
        const nick = wrap.querySelector('#_licNick').value.trim();
        const dias = wrap.querySelector('#_licDias').value.trim();
        const inicio = wrap.querySelector('#_licInicio').value;
        const obs = wrap.querySelector('#_licObs').value.trim();

        if (!nick || !dias || !inicio || !obs) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }

        // Calcular data de fim
        const dataInicio = new Date(inicio);
        const dataFim = new Date(dataInicio);
        dataFim.setDate(dataFim.getDate() + parseInt(dias));

        const registro = {
            tipo: 'licenca',
            acao: dias,
            aplicador: usuarioLogado,
            tags_envolvidos: [nick],
            observacao: obs,
            data_hora: dataInicio.toISOString(),
            banido_ate: dataFim.toISOString(),
            status: 'aprovado'
        };

        try {
            const btn = wrap.querySelector('#_licSalvar');
            btn.disabled = true;
            btn.textContent = 'Salvando...';

            const { error } = await supabase.from('requerimentos').insert([registro]);
            if (error) throw error;

            wrap.remove();
            renderizarLicencas();
            alert('Licença registrada com sucesso!');
        } catch (err) {
            console.error('Erro ao salvar licença:', err);
            alert('Erro ao salvar licença.');
            const btn = wrap.querySelector('#_licSalvar');
            if (btn) { btn.disabled = false; btn.textContent = 'Registrar Licença'; }
        }
    };
}

// Ver detalhes de uma licença pelo ID
async function verLicenca(id) {
    try {
        const { data, error } = await supabase
            .from('requerimentos')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error || !data) { alert('Licença não encontrada.'); return; }

        const nick = (data.tags_envolvidos && data.tags_envolvidos[0]) || data.aplicador;
        const inicio = data.data_hora ? new Date(data.data_hora).toLocaleDateString('pt-BR') : '—';
        const fim = data.banido_ate ? new Date(data.banido_ate).toLocaleDateString('pt-BR') : '—';

        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
        wrap.innerHTML = `
            <div style="background:var(--bg-2,#0d1a0d);border:1px solid var(--b2,#1e3a1e);border-radius:16px;padding:28px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6)">
                <h3 style="font-size:.95rem;font-weight:700;color:var(--t1,#fff);margin-bottom:18px">📋 Detalhes da Licença</h3>
                <div style="display:flex;flex-direction:column;gap:10px;font-size:.84rem">
                    <div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Militar</span><strong style="color:var(--t1)">${nick}</strong></div>
                    <div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Dias</span><strong style="color:var(--t1)">${data.acao || '—'}</strong></div>
                    <div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Início</span><strong style="color:var(--t1)">${inicio}</strong></div>
                    <div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Fim</span><strong style="color:var(--t1)">${fim}</strong></div>
                    <div style="display:flex;justify-content:space-between"><span style="color:var(--t3)">Aplicador</span><strong style="color:var(--t1)">${data.aplicador}</strong></div>
                    <div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--t3)">Status</span><span class="status-pill ${data.status}">${(data.status||'').toUpperCase()}</span></div>
                    <div style="border-top:1px solid var(--b1,#1a2e1a);padding-top:10px"><span style="color:var(--t3);font-size:.75rem">Observação</span><p style="color:var(--t2);margin-top:4px">${data.observacao || '—'}</p></div>
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:20px">
                    <button onclick="this.closest('[style]').remove()" style="padding:8px 20px;border-radius:8px;border:1px solid var(--b2);background:var(--bg-3);color:var(--t2);font-size:.82rem;font-weight:600;cursor:pointer">Fechar</button>
                </div>
            </div>`;
        document.body.appendChild(wrap);
        wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
    } catch (err) {
        console.error('Erro ao buscar licença:', err);
    }
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
