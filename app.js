// Constants and Configuration
const FERIADOS_2025 = [
    '2025-01-01', '2025-03-03', '2025-03-04', '2025-04-18', '2025-04-21',
    '2025-05-01', '2025-06-19', '2025-09-07', '2025-10-12',
    '2025-11-02', '2025-11-15', '2025-11-20', '2025-12-25'
];

const NIVEIS_HIERARQUICOS = {
    1: { nome: 'Alta Gestão', palavras: ['diretor', 'gerente', 'superintendente', 'presidente'], limite: 1 },
    2: { nome: 'Gestão Intermediária', palavras: ['supervisor', 'coordenador', 'chefe', 'líder'], limite_percentual: 0.5 },
    3: { nome: 'Operacional', limite_percentual: 'configurado' }
};

const COLUNAS_EXCEL = {
    nome: { indice: 2, letra: 'C' },
    centro_custo: { indice: 5, letra: 'F' },
    unidade: { indice: 6, letra: 'G' },
    data_limite: { indice: 12, letra: 'M' },
    cargo: { indice: 13, letra: 'N' }
};

const CONFIG_PADRAO = {
    dias_ferias: 30,
    percentual_maximo: 20,
    max_tentativas: 3,
    incremento_percentual: 0.1,
    intervalo_gestao_dias: 7,
    intervalo_operacional_dias: 1
};

// Global state
let dadosOriginais = [];
let dadosProcessados = [];
let centrosCusto = [];
let unidades = [];
let resultadoDistribuicao = null;
let fileProcessed = false;

// Utility Functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR');
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
        if (typeof dateStr === 'number') {
            // Excel date number
            const utc_days = Math.floor(dateStr - 25569);
            const utc_value = utc_days * 86400;
            const date_info = new Date(utc_value * 1000);
            return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
        }
        return new Date(dateStr);
    } catch (e) {
        return null;
    }
}

function isDiaUtil(date) {
    const dia = new Date(date);
    const diaSemana = dia.getDay();
    const dataStr = dia.toISOString().split('T')[0];
    
    // Verifica se é fim de semana
    if (diaSemana === 0 || diaSemana === 6) return false;
    
    // Verifica se é feriado
    if (FERIADOS_2025.includes(dataStr)) return false;
    
    return true;
}

function proximoDiaUtil(date) {
    let dia = new Date(date);
    while (!isDiaUtil(dia)) {
        dia.setDate(dia.getDate() + 1);
    }
    return dia;
}

function processarCentroCusto(centroCustoStr) {
    if (!centroCustoStr) return { codigo: '', descricao: '', categoria: '' };
    
    const str = centroCustoStr.toString().trim();
    const partes = str.split(' - ');
    
    const codigo = partes[0] || '';
    const descricao = partes.slice(1).join(' - ') || '';
    
    // Determinar categoria baseada em palavras-chave
    const descLower = descricao.toLowerCase();
    let categoria = 'Outros';
    
    if (descLower.includes('vendas') || descLower.includes('comercial')) categoria = 'Vendas';
    else if (descLower.includes('admin') || descLower.includes('rh')) categoria = 'Administrativo';
    else if (descLower.includes('operação') || descLower.includes('produção')) categoria = 'Operacional';
    else if (descLower.includes('ti') || descLower.includes('tecnologia')) categoria = 'TI';
    
    return { codigo, descricao, categoria };
}

function classificarHierarquia(cargo) {
    if (!cargo) return 3;
    
    const cargoLower = cargo.toLowerCase();
    
    // Alta Gestão
    for (const palavra of NIVEIS_HIERARQUICOS[1].palavras) {
        if (cargoLower.includes(palavra)) return 1;
    }
    
    // Gestão Intermediária
    for (const palavra of NIVEIS_HIERARQUICOS[2].palavras) {
        if (cargoLower.includes(palavra)) return 2;
    }
    
    // Operacional
    return 3;
}

// File Upload Handlers
function initializeFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

function handleFileUpload(file) {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        showError('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
        return;
    }
    
    // Reset state
    fileProcessed = false;
    disableCalculation();
    hideAllSections();
    
    showLoading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            processExcelFile(e.target.result, file.name);
        } catch (error) {
            showError('Erro ao ler o arquivo: ' + error.message);
            showLoading(false);
        }
    };
    reader.readAsArrayBuffer(file);
    
    // Update file info immediately
    const fileInfo = document.getElementById('fileInfo');
    fileInfo.innerHTML = `
        <strong>Arquivo:</strong> ${file.name}<br>
        <strong>Tamanho:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB<br>
        <span style="color: var(--color-warning);">Processando...</span>
    `;
}

function processExcelFile(data, fileName) {
    try {
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        // Validar estrutura do arquivo
        if (jsonData.length < 2) {
            throw new Error('Arquivo deve conter pelo menos uma linha de dados');
        }
        
        // Processar dados
        dadosOriginais = [];
        const startRow = 1; // Assumindo que a primeira linha é cabeçalho
        
        for (let i = startRow; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            const nome = row[COLUNAS_EXCEL.nome.indice];
            const centroCusto = row[COLUNAS_EXCEL.centro_custo.indice];
            const unidade = row[COLUNAS_EXCEL.unidade.indice];
            const dataLimite = row[COLUNAS_EXCEL.data_limite.indice];
            const cargo = row[COLUNAS_EXCEL.cargo.indice];
            
            if (nome && centroCusto && unidade && cargo) {
                const centroCustoInfo = processarCentroCusto(centroCusto);
                const hierarquia = classificarHierarquia(cargo);
                const dataLimiteParsed = parseDate(dataLimite);
                
                dadosOriginais.push({
                    nome: nome.toString().trim(),
                    centro_custo: centroCusto.toString().trim(),
                    centro_custo_codigo: centroCustoInfo.codigo,
                    centro_custo_descricao: centroCustoInfo.descricao,
                    centro_custo_categoria: centroCustoInfo.categoria,
                    unidade: unidade.toString().trim(),
                    data_limite: dataLimiteParsed,
                    data_limite_str: dataLimiteParsed ? formatDate(dataLimiteParsed) : 'Não informada',
                    cargo: cargo.toString().trim(),
                    hierarquia: hierarquia,
                    hierarquia_nome: NIVEIS_HIERARQUICOS[hierarquia].nome
                });
            }
        }
        
        if (dadosOriginais.length === 0) {
            throw new Error('Nenhum dado válido encontrado no arquivo');
        }
        
        // Extrair listas únicas
        centrosCusto = [...new Set(dadosOriginais.map(d => d.centro_custo))].sort();
        unidades = [...new Set(dadosOriginais.map(d => d.unidade))].sort();
        
        // Mark as processed
        fileProcessed = true;
        
        // Atualizar interface
        updateFileInfo(fileName, dadosOriginais.length);
        createFilters();
        showDataPreview();
        showCostCenterAnalysis();
        showHierarchyAnalysis();
        showDateAnalysis();
        enableCalculation();
        
        showLoading(false);
        hideWelcomeState();
        
    } catch (error) {
        showError('Erro ao processar arquivo Excel: ' + error.message);
        showLoading(false);
        fileProcessed = false;
    }
}

// UI Management Functions
function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const welcomeState = document.getElementById('welcomeState');
    
    if (show) {
        loadingState.style.display = 'flex';
        welcomeState.style.display = 'none';
    } else {
        loadingState.style.display = 'none';
    }
}

function hideWelcomeState() {
    document.getElementById('welcomeState').style.display = 'none';
}

function hideAllSections() {
    const sections = ['previewSection', 'costCenterSection', 'hierarchySection', 'dateSection', 'resultsSection', 'scheduleSection'];
    sections.forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function updateFileInfo(fileName, recordCount) {
    const fileInfo = document.getElementById('fileInfo');
    fileInfo.innerHTML = `
        <strong>Arquivo:</strong> ${fileName}<br>
        <strong>Registros:</strong> ${recordCount}<br>
        <span style="color: var(--color-success);">✓ Processado com sucesso</span>
    `;
}

function enableCalculation() {
    const calcularBtn = document.getElementById('calcularBtn');
    calcularBtn.disabled = false;
    calcularBtn.textContent = 'Calcular Distribuição';
}

function disableCalculation() {
    const calcularBtn = document.getElementById('calcularBtn');
    calcularBtn.disabled = true;
    calcularBtn.textContent = 'Carregue um arquivo Excel';
}

function createFilters() {
    // Centros de Custo
    const centrosCustoList = document.getElementById('centrosCustoList');
    centrosCustoList.innerHTML = '';
    
    centrosCusto.forEach(cc => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="cc_${cc.replace(/[^a-zA-Z0-9]/g, '_')}" checked>
            <label for="cc_${cc.replace(/[^a-zA-Z0-9]/g, '_')}">${cc}</label>
        `;
        centrosCustoList.appendChild(div);
    });
    
    // Unidades
    const unidadesList = document.getElementById('unidadesList');
    unidadesList.innerHTML = '';
    
    unidades.forEach(unidade => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="un_${unidade.replace(/[^a-zA-Z0-9]/g, '_')}" checked>
            <label for="un_${unidade.replace(/[^a-zA-Z0-9]/g, '_')}">${unidade}</label>
        `;
        unidadesList.appendChild(div);
    });
    
    document.getElementById('filtersSection').style.display = 'block';
}

function getSelectedFilters() {
    const selectedCentrosCusto = [];
    const selectedUnidades = [];
    
    centrosCusto.forEach(cc => {
        const checkbox = document.getElementById(`cc_${cc.replace(/[^a-zA-Z0-9]/g, '_')}`);
        if (checkbox && checkbox.checked) {
            selectedCentrosCusto.push(cc);
        }
    });
    
    unidades.forEach(unidade => {
        const checkbox = document.getElementById(`un_${unidade.replace(/[^a-zA-Z0-9]/g, '_')}`);
        if (checkbox && checkbox.checked) {
            selectedUnidades.push(unidade);
        }
    });
    
    return { centrosCusto: selectedCentrosCusto, unidades: selectedUnidades };
}

// Data Analysis Functions
function showDataPreview() {
    const previewSection = document.getElementById('previewSection');
    const previewStats = document.getElementById('previewStats');
    const previewTable = document.getElementById('previewTable');
    
    // Stats
    const stats = {
        total: dadosOriginais.length,
        unidades: unidades.length,
        centrosCusto: centrosCusto.length,
        comDataLimite: dadosOriginais.filter(d => d.data_limite).length
    };
    
    previewStats.innerHTML = `
        <div class="stat-card">
            <span class="stat-number">${stats.total}</span>
            <span class="stat-label">Total de Colaboradores</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${stats.unidades}</span>
            <span class="stat-label">Unidades</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${stats.centrosCusto}</span>
            <span class="stat-label">Centros de Custo</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${stats.comDataLimite}</span>
            <span class="stat-label">Com Data Limite</span>
        </div>
    `;
    
    // Table
    const headers = ['Nome', 'Centro de Custo', 'Unidade', 'Cargo', 'Hierarquia', 'Data Limite'];
    const rows = dadosOriginais.slice(0, 10); // Mostrar apenas primeiros 10
    
    let tableHTML = '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    rows.forEach(row => {
        tableHTML += `
            <tr>
                <td>${row.nome}</td>
                <td>${row.centro_custo}</td>
                <td>${row.unidade}</td>
                <td>${row.cargo}</td>
                <td>${row.hierarquia_nome}</td>
                <td>${row.data_limite_str}</td>
            </tr>
        `;
    });
    
    if (dadosOriginais.length > 10) {
        tableHTML += `<tr><td colspan="${headers.length}" class="text-center">... e mais ${dadosOriginais.length - 10} registros</td></tr>`;
    }
    
    tableHTML += '</tbody>';
    previewTable.innerHTML = tableHTML;
    
    previewSection.style.display = 'block';
}

function showCostCenterAnalysis() {
    const costCenterSection = document.getElementById('costCenterSection');
    const costCenterTable = document.getElementById('costCenterTable');
    
    // Agrupar por centro de custo
    const grouped = {};
    dadosOriginais.forEach(d => {
        if (!grouped[d.centro_custo]) {
            grouped[d.centro_custo] = {
                centro_custo: d.centro_custo,
                codigo: d.centro_custo_codigo,
                descricao: d.centro_custo_descricao,
                categoria: d.centro_custo_categoria,
                total: 0,
                unidades: new Set()
            };
        }
        grouped[d.centro_custo].total++;
        grouped[d.centro_custo].unidades.add(d.unidade);
    });
    
    const centroCustoData = Object.values(grouped).map(g => ({
        ...g,
        unidades_count: g.unidades.size,
        unidades: Array.from(g.unidades).join(', ')
    }));
    
    // Ordenar por total
    centroCustoData.sort((a, b) => b.total - a.total);
    
    const headers = ['Código', 'Descrição', 'Categoria', 'Total', 'Unidades'];
    let tableHTML = '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    centroCustoData.forEach(cc => {
        tableHTML += `
            <tr>
                <td>${cc.codigo}</td>
                <td>${cc.descricao}</td>
                <td><span class="status-badge status-badge--info">${cc.categoria}</span></td>
                <td><strong>${cc.total}</strong></td>
                <td>${cc.unidades}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody>';
    costCenterTable.innerHTML = tableHTML;
    
    costCenterSection.style.display = 'block';
}

function showHierarchyAnalysis() {
    const hierarchySection = document.getElementById('hierarchySection');
    const hierarchyStats = document.getElementById('hierarchyStats');
    const hierarchyTable = document.getElementById('hierarchyTable');
    
    // Agrupar por hierarquia
    const hierarchyGroups = {};
    dadosOriginais.forEach(d => {
        if (!hierarchyGroups[d.hierarquia]) {
            hierarchyGroups[d.hierarquia] = {
                nivel: d.hierarquia,
                nome: d.hierarquia_nome,
                total: 0,
                cargos: {}
            };
        }
        hierarchyGroups[d.hierarquia].total++;
        
        if (!hierarchyGroups[d.hierarquia].cargos[d.cargo]) {
            hierarchyGroups[d.hierarquia].cargos[d.cargo] = 0;
        }
        hierarchyGroups[d.hierarquia].cargos[d.cargo]++;
    });
    
    // Stats cards
    let statsHTML = '';
    Object.values(hierarchyGroups).forEach(h => {
        const percentual = ((h.total / dadosOriginais.length) * 100).toFixed(1);
        statsHTML += `
            <div class="hierarchy-card">
                <h4>${h.nome}</h4>
                <div class="hierarchy-detail">
                    <span>Total:</span>
                    <span class="hierarchy-count">${h.total}</span>
                </div>
                <div class="hierarchy-detail">
                    <span>Percentual:</span>
                    <span class="hierarchy-count">${percentual}%</span>
                </div>
                <div class="hierarchy-detail">
                    <span>Cargos únicos:</span>
                    <span class="hierarchy-count">${Object.keys(h.cargos).length}</span>
                </div>
            </div>
        `;
    });
    hierarchyStats.innerHTML = statsHTML;
    
    // Table with cargo details
    const headers = ['Cargo', 'Hierarquia', 'Quantidade', 'Percentual'];
    let tableHTML = '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    // Flatten cargo data
    const cargoData = [];
    Object.values(hierarchyGroups).forEach(h => {
        Object.entries(h.cargos).forEach(([cargo, count]) => {
            cargoData.push({
                cargo,
                hierarquia: h.nome,
                nivel: h.nivel,
                count,
                percentual: ((count / dadosOriginais.length) * 100).toFixed(1)
            });
        });
    });
    
    // Sort by hierarchy level and count
    cargoData.sort((a, b) => a.nivel - b.nivel || b.count - a.count);
    
    cargoData.forEach(cargo => {
        const badgeClass = cargo.nivel === 1 ? 'status-badge--error' : 
                          cargo.nivel === 2 ? 'status-badge--warning' : 'status-badge--success';
        
        tableHTML += `
            <tr>
                <td>${cargo.cargo}</td>
                <td><span class="status-badge ${badgeClass}">${cargo.hierarquia}</span></td>
                <td><strong>${cargo.count}</strong></td>
                <td>${cargo.percentual}%</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody>';
    hierarchyTable.innerHTML = tableHTML;
    
    hierarchySection.style.display = 'block';
}

function showDateAnalysis() {
    const dateSection = document.getElementById('dateSection');
    
    // Prepare data for chart
    const comDataLimite = dadosOriginais.filter(d => d.data_limite);
    const semDataLimite = dadosOriginais.filter(d => !d.data_limite);
    
    // Group by month for those with dates
    const monthlyData = {};
    comDataLimite.forEach(d => {
        const month = d.data_limite.getMonth() + 1;
        const year = d.data_limite.getFullYear();
        const key = `${year}-${month.toString().padStart(2, '0')}`;
        
        if (!monthlyData[key]) {
            monthlyData[key] = 0;
        }
        monthlyData[key]++;
    });
    
    // Create chart
    const ctx = document.getElementById('dateChart');
    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(label => monthlyData[label] || 0);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(label => {
                const [year, month] = label.split('-');
                return `${month}/${year}`;
            }),
            datasets: [{
                label: 'Colaboradores com Data Limite',
                data: data,
                backgroundColor: '#1FB8CD',
                borderColor: '#1FB8CD',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Distribuição por Mês de Data Limite (${comDataLimite.length} colaboradores com data, ${semDataLimite.length} sem data)`
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade de Colaboradores'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mês/Ano'
                    }
                }
            }
        }
    });
    
    dateSection.style.display = 'block';
}

// Vacation Distribution Algorithm
function calcularDistribuicao() {
    if (!fileProcessed) {
        showError('Por favor, carregue um arquivo Excel antes de calcular a distribuição');
        return;
    }
    
    const filters = getSelectedFilters();
    const diasFerias = parseInt(document.getElementById('diasFerias').value);
    const percentualMaximo = parseInt(document.getElementById('percentualMaximo').value) / 100;
    const dataInicial = new Date(document.getElementById('dataInicial').value);
    
    // Filter data
    dadosProcessados = dadosOriginais.filter(d => 
        filters.centrosCusto.includes(d.centro_custo) &&
        filters.unidades.includes(d.unidade)
    );
    
    if (dadosProcessados.length === 0) {
        showError('Nenhum colaborador encontrado com os filtros selecionados');
        return;
    }
    
    showLoading(true);
    
    setTimeout(() => {
        try {
            const resultado = distribuirFerias(dadosProcessados, diasFerias, percentualMaximo, dataInicial);
            resultadoDistribuicao = resultado;
            
            showResults(resultado);
            showSchedule(resultado);
            showLoading(false);
            
        } catch (error) {
            showError('Erro no cálculo da distribuição: ' + error.message);
            showLoading(false);
        }
    }, 100);
}

function distribuirFerias(dados, diasFerias, percentualMaximo, dataInicial) {
    const resultado = {
        colaboradores: [],
        estatisticas: {},
        sucesso: false,
        tentativas: 0
    };
    
    let tentativa = 0;
    let incrementoAtual = 0;
    
    while (tentativa < CONFIG_PADRAO.max_tentativas) {
        tentativa++;
        resultado.tentativas = tentativa;
        
        const percentualTentativa = percentualMaximo + (incrementoAtual * CONFIG_PADRAO.incremento_percentual);
        const colaboradoresProcessados = [];
        
        // Group by unit for distribution control
        const porUnidade = {};
        dados.forEach(d => {
            if (!porUnidade[d.unidade]) {
                porUnidade[d.unidade] = [];
            }
            porUnidade[d.unidade].push(d);
        });
        
        let sucessoTotal = true;
        
        // Process each unit
        Object.entries(porUnidade).forEach(([unidade, colaboradores]) => {
            const totalUnidade = colaboradores.length;
            const maxSimultaneo = Math.max(1, Math.floor(totalUnidade * percentualTentativa));
            
            // Sort by priority: hierarchy level (lower first), then by deadline
            colaboradores.sort((a, b) => {
                if (a.hierarquia !== b.hierarquia) {
                    return a.hierarquia - b.hierarquia;
                }
                if (a.data_limite && b.data_limite) {
                    return a.data_limite - b.data_limite;
                } else if (a.data_limite) {
                    return -1;
                } else if (b.data_limite) {
                    return 1;
                }
                return 0;
            });
            
            const agendamentos = [];
            let dataAtual = new Date(dataInicial);
            
            colaboradores.forEach(colaborador => {
                let dataInicioFerias = null;
                let maxTentativasData = 365; // Prevent infinite loop
                let tentativasData = 0;
                
                while (!dataInicioFerias && tentativasData < maxTentativasData) {
                    tentativasData++;
                    
                    // Check if date is valid (working day)
                    const candidataInicio = proximoDiaUtil(dataAtual);
                    const candidataFim = new Date(candidataInicio);
                    candidataFim.setDate(candidataFim.getDate() + diasFerias - 1);
                    
                    // Check deadline constraint
                    if (colaborador.data_limite && candidataFim > colaborador.data_limite) {
                        // Try to fit before deadline
                        const maxInicio = new Date(colaborador.data_limite);
                        maxInicio.setDate(maxInicio.getDate() - diasFerias + 1);
                        
                        if (maxInicio < dataInicial) {
                            sucessoTotal = false;
                            break;
                        }
                        
                        dataAtual = proximoDiaUtil(maxInicio);
                        continue;
                    }
                    
                    // Check conflicts with other vacations
                    const conflitos = agendamentos.filter(agendamento => {
                        const inicioExistente = agendamento.data_inicio;
                        const fimExistente = agendamento.data_fim;
                        
                        return (candidataInicio <= fimExistente && candidataFim >= inicioExistente);
                    });
                    
                    // Check hierarchy limits
                    const conflitosHierarquia = conflitos.filter(agendamento => {
                        if (colaborador.hierarquia === 1) {
                            // High management: max 1 at time
                            return agendamento.hierarquia === 1;
                        } else if (colaborador.hierarquia === 2) {
                            // Middle management: max 50% at time
                            const totalGestaoIntermediaria = colaboradores.filter(c => c.hierarquia === 2).length;
                            const maxGestaoIntermediaria = Math.max(1, Math.floor(totalGestaoIntermediaria * 0.5));
                            const atualGestaoIntermediaria = conflitos.filter(a => a.hierarquia === 2).length;
                            return atualGestaoIntermediaria >= maxGestaoIntermediaria;
                        }
                        return false;
                    });
                    
                    // Check unit limit
                    if (conflitos.length >= maxSimultaneo || conflitosHierarquia.length > 0) {
                        // Find next available date
                        const proximaDataDisponivel = conflitos.reduce((maxData, agendamento) => {
                            const fimAgendamento = new Date(agendamento.data_fim);
                            fimAgendamento.setDate(fimAgendamento.getDate() + 1);
                            return fimAgendamento > maxData ? fimAgendamento : maxData;
                        }, candidataInicio);
                        
                        dataAtual = proximoDiaUtil(proximaDataDisponivel);
                        continue;
                    }
                    
                    // Date is valid
                    dataInicioFerias = candidataInicio;
                    
                    agendamentos.push({
                        nome: colaborador.nome,
                        data_inicio: candidataInicio,
                        data_fim: candidataFim,
                        hierarquia: colaborador.hierarquia,
                        unidade: colaborador.unidade
                    });
                    
                    colaboradoresProcessados.push({
                        ...colaborador,
                        data_inicio_ferias: candidataInicio,
                        data_fim_ferias: candidataFim,
                        dias_ferias: diasFerias,
                        status: 'Agendado'
                    });
                    
                    // Move to next date with appropriate interval
                    const intervalo = colaborador.hierarquia <= 2 ? 
                        CONFIG_PADRAO.intervalo_gestao_dias : 
                        CONFIG_PADRAO.intervalo_operacional_dias;
                    
                    dataAtual.setDate(dataAtual.getDate() + intervalo);
                }
                
                if (!dataInicioFerias) {
                    colaboradoresProcessados.push({
                        ...colaborador,
                        data_inicio_ferias: null,
                        data_fim_ferias: null,
                        dias_ferias: diasFerias,
                        status: 'Não agendado'
                    });
                    sucessoTotal = false;
                }
            });
        });
        
        if (sucessoTotal) {
            resultado.colaboradores = colaboradoresProcessados;
            resultado.sucesso = true;
            break;
        }
        
        incrementoAtual++;
    }
    
    // Calculate statistics
    const agendados = resultado.colaboradores.filter(c => c.status === 'Agendado');
    const naoAgendados = resultado.colaboradores.filter(c => c.status === 'Não agendado');
    
    resultado.estatisticas = {
        total: resultado.colaboradores.length,
        agendados: agendados.length,
        nao_agendados: naoAgendados.length,
        percentual_sucesso: ((agendados.length / resultado.colaboradores.length) * 100).toFixed(1),
        percentual_usado: percentualMaximo + (incrementoAtual * CONFIG_PADRAO.incremento_percentual)
    };
    
    return resultado;
}

function showResults(resultado) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsMetrics = document.getElementById('resultsMetrics');
    
    const stats = resultado.estatisticas;
    
    // Metrics
    resultsMetrics.innerHTML = `
        <div class="metric-card">
            <div class="metric-value success">${stats.agendados}</div>
            <div class="metric-label">Colaboradores Agendados</div>
        </div>
        <div class="metric-card">
            <div class="metric-value ${stats.nao_agendados > 0 ? 'error' : 'success'}">${stats.nao_agendados}</div>
            <div class="metric-label">Não Agendados</div>
        </div>
        <div class="metric-card">
            <div class="metric-value success">${stats.percentual_sucesso}%</div>
            <div class="metric-label">Taxa de Sucesso</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${resultado.tentativas}</div>
            <div class="metric-label">Tentativas</div>
        </div>
    `;
    
    // Create charts
    createResultCharts(resultado);
    
    resultsSection.style.display = 'block';
}

function createResultCharts(resultado) {
    const agendados = resultado.colaboradores.filter(c => c.status === 'Agendado');
    
    // Monthly distribution chart
    const monthlyData = {};
    agendados.forEach(c => {
        const month = c.data_inicio_ferias.getMonth() + 1;
        const year = c.data_inicio_ferias.getFullYear();
        const key = `${year}-${month.toString().padStart(2, '0')}`;
        
        if (!monthlyData[key]) {
            monthlyData[key] = 0;
        }
        monthlyData[key]++;
    });
    
    const monthlyLabels = Object.keys(monthlyData).sort();
    const monthlyValues = monthlyLabels.map(label => monthlyData[label]);
    
    const monthlyCtx = document.getElementById('monthlyChart');
    new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: monthlyLabels.map(label => {
                const [year, month] = label.split('-');
                return `${month}/${year}`;
            }),
            datasets: [{
                label: 'Férias Agendadas',
                data: monthlyValues,
                backgroundColor: '#1FB8CD',
                borderColor: '#1FB8CD',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Role distribution chart
    const roleData = {};
    agendados.forEach(c => {
        if (!roleData[c.hierarquia_nome]) {
            roleData[c.hierarquia_nome] = 0;
        }
        roleData[c.hierarquia_nome]++;
    });
    
    const roleCtx = document.getElementById('roleChart');
    new Chart(roleCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(roleData),
            datasets: [{
                data: Object.values(roleData),
                backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // Limit comparison chart
    const porUnidade = {};
    resultado.colaboradores.forEach(c => {
        if (!porUnidade[c.unidade]) {
            porUnidade[c.unidade] = { total: 0, agendados: 0 };
        }
        porUnidade[c.unidade].total++;
        if (c.status === 'Agendado') {
            porUnidade[c.unidade].agendados++;
        }
    });
    
    const limitLabels = Object.keys(porUnidade);
    const limitReal = limitLabels.map(unidade => porUnidade[unidade].agendados);
    const limitMax = limitLabels.map(unidade => 
        Math.floor(porUnidade[unidade].total * resultado.estatisticas.percentual_usado / 100)
    );
    
    const limitCtx = document.getElementById('limitChart');
    new Chart(limitCtx, {
        type: 'bar',
        data: {
            labels: limitLabels,
            datasets: [
                {
                    label: 'Real',
                    data: limitReal,
                    backgroundColor: '#1FB8CD'
                },
                {
                    label: 'Limite',
                    data: limitMax,
                    backgroundColor: '#FFC185'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function showSchedule(resultado) {
    const scheduleSection = document.getElementById('scheduleSection');
    const scheduleTable = document.getElementById('scheduleTable');
    
    // Sort by start date
    const sortedColaboradores = [...resultado.colaboradores].sort((a, b) => {
        if (a.data_inicio_ferias && b.data_inicio_ferias) {
            return a.data_inicio_ferias - b.data_inicio_ferias;
        } else if (a.data_inicio_ferias) {
            return -1;
        } else if (b.data_inicio_ferias) {
            return 1;
        }
        return a.nome.localeCompare(b.nome);
    });
    
    const headers = ['Nome', 'Unidade', 'Cargo', 'Data Início', 'Data Fim', 'Status'];
    let tableHTML = '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    sortedColaboradores.forEach(colaborador => {
        const statusClass = colaborador.status === 'Agendado' ? 'status-badge--success' : 'status-badge--error';
        const dataInicio = colaborador.data_inicio_ferias ? formatDate(colaborador.data_inicio_ferias) : '-';
        const dataFim = colaborador.data_fim_ferias ? formatDate(colaborador.data_fim_ferias) : '-';
        
        tableHTML += `
            <tr class="schedule-row" data-nome="${colaborador.nome.toLowerCase()}">
                <td>${colaborador.nome}</td>
                <td>${colaborador.unidade}</td>
                <td>${colaborador.cargo}</td>
                <td>${dataInicio}</td>
                <td>${dataFim}</td>
                <td><span class="status-badge ${statusClass}">${colaborador.status}</span></td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody>';
    scheduleTable.innerHTML = tableHTML;
    
    scheduleSection.style.display = 'block';
}

function filterSchedule() {
    const filterText = document.getElementById('scheduleFilter').value.toLowerCase();
    const rows = document.querySelectorAll('.schedule-row');
    
    rows.forEach(row => {
        const nome = row.dataset.nome;
        if (nome.includes(filterText)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

async function exportToExcel() {
    if (!resultadoDistribuicao) {
        showError('Nenhum resultado para exportar');
        return;
    }
    
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Cronograma de Férias');
        
        // Headers
        worksheet.columns = [
            { header: 'Nome', key: 'nome', width: 30 },
            { header: 'Centro de Custo', key: 'centro_custo', width: 20 },
            { header: 'Unidade', key: 'unidade', width: 20 },
            { header: 'Cargo', key: 'cargo', width: 25 },
            { header: 'Hierarquia', key: 'hierarquia_nome', width: 20 },
            { header: 'Data Início', key: 'data_inicio', width: 15 },
            { header: 'Data Fim', key: 'data_fim', width: 15 },
            { header: 'Dias', key: 'dias_ferias', width: 10 },
            { header: 'Status', key: 'status', width: 15 }
        ];
        
        // Data
        resultadoDistribuicao.colaboradores.forEach(colaborador => {
            worksheet.addRow({
                nome: colaborador.nome,
                centro_custo: colaborador.centro_custo,
                unidade: colaborador.unidade,
                cargo: colaborador.cargo,
                hierarquia_nome: colaborador.hierarquia_nome,
                data_inicio: colaborador.data_inicio_ferias ? formatDate(colaborador.data_inicio_ferias) : '',
                data_fim: colaborador.data_fim_ferias ? formatDate(colaborador.data_fim_ferias) : '',
                dias_ferias: colaborador.dias_ferias,
                status: colaborador.status
            });
        });
        
        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1FB8CD' }
        };
        
        // Generate file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cronograma_ferias_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        showError('Erro ao exportar arquivo: ' + error.message);
    }
}

// Event Listeners
function initializeEventListeners() {
    document.getElementById('calcularBtn').addEventListener('click', calcularDistribuicao);
    document.getElementById('scheduleFilter').addEventListener('input', filterSchedule);
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);
    document.getElementById('dismissError').addEventListener('click', hideError);
    
    // Close error when clicking outside
    document.getElementById('errorMessage').addEventListener('click', (e) => {
        if (e.target.id === 'errorMessage') {
            hideError();
        }
    });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeFileUpload();
    initializeEventListeners();
    disableCalculation(); // Ensure button starts disabled
});