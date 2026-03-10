$content = [System.IO.File]::ReadAllText("c:\Users\Xande\Documents\System\templates\painel.html", [System.Text.Encoding]::UTF8)

$old1 = "                    <td>`${e.users.join(', ')}</td>"
$new1 = "                    <td><div style=`"display:flex;flex-wrap:wrap;gap:5px;align-items:center`">`${e.users.map(u => ``<button class=`"btn-ver-ip`" onclick=`"verIpMilitar('`${u}')`"><svg viewBox=`"0 0 24 24`" fill=`"none`" stroke=`"currentColor`" stroke-width=`"2`" width=`"11`" height=`"11`"><path d=`"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z`"/><circle cx=`"12`" cy=`"12`" r=`"3`"/></svg> `${u}</button>``).join('')}</div></td>"
$content = $content.Replace($old1, $new1)

$old2 = "        document.getElementById('ipsSearch').oninput = carregarAbaIps;"
$new2 = $old2 + "`r`n`r`n" + [System.IO.File]::ReadAllText("c:\Users\Xande\Documents\System\ip_script.txt", [System.Text.Encoding]::UTF8)
$content = $content.Replace($old2, $new2)

$old3 = "    <!-- ══ SCRIPTS ════════════════════════════════════════ -->"
$modalHtml = @"
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
            <div class="modal-admin-footer">
                <button class="btn-secondary" onclick="document.getElementById('modalIpDetalhes').classList.remove('active')">Fechar</button>
            </div>
        </div>
    </div>
"@

$new3 = $modalHtml + "`r`n`r`n" + $old3
$content = $content.Replace($old3, $new3)

[System.IO.File]::WriteAllText("c:\Users\Xande\Documents\System\templates\painel.html", $content, [System.Text.Encoding]::UTF8)

Write-Host "Modificacoes feitas com sucesso"
