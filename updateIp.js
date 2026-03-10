const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'templates', 'painel.html');
let content = fs.readFileSync(htmlPath, 'utf8');

const oldTd = "<td>${e.users.join(', ')}</td>";
const newTd = `<td>
                        <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center">
                        \${e.users.map(u => \`
                            <button class="btn-ver-ip" onclick="verIpMilitar('\${u}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                \${u}
                            </button>
                        \`).join('')}
                        </div>
                    </td>`;

content = content.replace(oldTd, newTd);

const jsFunction = `
        // ── DETALHES DE IP POR MILITAR ──────────────────────────────────────────
        async function verIpMilitar(user) {
            const log = JSON.parse(localStorage.getItem('dme_login_log')) || [];
            const entradas = log.filter(e => (e.username || '').toLowerCase() === user.toLowerCase());

            // Agrupar por IP (mais recente primeiro)
            const porIp = {};
            entradas.forEach(e => {
                if (!porIp[e.ip]) porIp[e.ip] = { ip: e.ip, dates: [], isVpn: e.isVpn || false };
                if (e.date) porIp[e.ip].dates.push(e.date);
                if (e.isVpn) porIp[e.ip].isVpn = true;
            });
            const ips = Object.values(porIp)
                .map(g => ({ ...g, last: g.dates.sort().reverse()[0] || '-' }))
                .sort((a, b) => b.last.localeCompare(a.last));

            const modal = document.getElementById('modalIpDetalhes');
            const modalBody = document.getElementById('modalIpBody');
            document.getElementById('modalIpUser').textContent = user;
            modal.classList.add('active');

            if (ips.length === 0) {
                modalBody.innerHTML = \`<div class="ip-det-empty">Nenhum registro de login encontrado para este usuário.</div>\`;
                return;
            }

            modalBody.innerHTML = ips.map((entry, i) => \`
                <div class="ip-det-card \${i === 0 ? 'current' : ''}" id="ip-card-\${i}">
                    <div class="ip-det-card-head">
                        <div>
                            <span class="ip-det-addr">\${entry.ip}</span>
                            \${entry.isVpn ? '<span class="badge-status banido" style="font-size:.6rem;padding:2px 7px;margin-left:6px">VPN/PROXY</span>' : ''}
                            \${i === 0 ? '<span class="badge-status ativo" style="font-size:.6rem;padding:2px 7px;margin-left:6px">Mais recente</span>' : ''}
                        </div>
                        <span class="ip-det-date">\${entry.last}</span>
                    </div>
                    <div class="ip-det-geo" id="ip-geo-\${i}">
                        <div class="ip-det-loading">Consultando localização...</div>
                    </div>
                </div>
            \`).join('');

            for (let i = 0; i < ips.length; i++) {
                const geo = document.getElementById(\`ip-geo-\${i}\`);
                if (!geo) continue;
                try {
                    const r = await fetch(\`https://ip-api.com/json/\${ips[i].ip}?fields=status,country,regionName,city,zip,timezone,isp,org,as,hosting,proxy\`);
                    const d = await r.json();
                    if (d.status === 'success') {
                        geo.innerHTML = \`
                            <div class="ip-det-cols">
                                <div class="ip-det-section">
                                    <div class="ip-det-section-title">Localização</div>
                                    <div class="ip-det-row"><span>País</span><span>\${d.country || 'N/A'}</span></div>
                                    <div class="ip-det-row"><span>Cidade</span><span>\${d.city || 'N/A'}</span></div>
                                    <div class="ip-det-row"><span>Região</span><span>\${d.regionName || 'N/A'}</span></div>
                                    <div class="ip-det-row"><span>Código Postal</span><span>\${d.zip || 'N/A'}</span></div>
                                    <div class="ip-det-row"><span>Timezone</span><span>\${d.timezone || 'N/A'}</span></div>
                                </div>
                                <div class="ip-det-section">
                                    <div class="ip-det-section-title">Informações Técnicas</div>
                                    <div class="ip-det-row"><span>Provedor (ISP)</span><span>\${d.isp || 'N/A'}</span></div>
                                    <div class="ip-det-row"><span>Organização</span><span>\${d.org || 'N/A'}</span></div>
                                    <div class="ip-det-row"><span>ASN</span><span>\${d.as || 'N/A'}</span></div>
                                    <div class="ip-det-row"><span>Hospedagem</span><span>\${d.hosting ? '<span style="color:#ef4444">Sim (VPS/DC)</span>' : 'Não'}</span></div>
                                    <div class="ip-det-row"><span>Proxy/VPN</span><span>\${d.proxy ? '<span style="color:#ef4444">Detectado</span>' : 'Não detectado'}</span></div>
                                </div>
                            </div>
                        \`;
                    } else {
                        geo.innerHTML = \`<div class="ip-det-empty">Não foi possível obter informações para este IP.</div>\`;
                    }
                } catch {
                    geo.innerHTML = \`<div class="ip-det-empty">Erro ao consultar API de geolocalização.</div>\`;
                }
            }
        }
        document.getElementById('modalIpClose')?.addEventListener('click', () => document.getElementById('modalIpDetalhes').classList.remove('active'));
        document.getElementById('modalIpDetalhes')?.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('active'); });

        `;

content = content.replace("document.getElementById('ipsSearch').oninput = carregarAbaIps;", jsFunction + "document.getElementById('ipsSearch').oninput = carregarAbaIps;");

const modalHtml = `
    <!-- Modal Detalhes IP -->
    <div class="modal-admin-wrap" id="modalIpDetalhes">
        <div class="modal-admin-content" style="max-width: 650px; width: 95%;">
            <div class="modal-admin-header">
                <h3>Detalhes de IP: <span id="modalIpUser" style="color:var(--green)"></span></h3>
                <button class="sidebar-close" id="modalIpClose">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20">
                        <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="modal-admin-body" id="modalIpBody" style="max-height: 70vh; overflow-y: auto; padding-right: 15px;">
                <!-- Conteúdo renderizado aqui -->
            </div>
        </div>
    </div>
`;

content = content.replace('<!-- ══ SCRIPTS ════════════════════════════════════════ -->', modalHtml + '\n    <!-- ══ SCRIPTS ════════════════════════════════════════ -->');

fs.writeFileSync(htmlPath, content, 'utf8');
console.log('HTML atualizado com sucesso!');
