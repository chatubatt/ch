document.addEventListener("DOMContentLoaded", () => {
    // --- Seletores de Elementos do DOM ---
    const excelFile = document.getElementById("excelFile");
    const fileStatus = document.getElementById("fileStatus");
    const diasFerias = document.getElementById("diasFerias");
    const percentualSimultaneo = document.getElementById("percentualSimultaneo");
    const percentualValue = document.getElementById("percentualValue");
    const percentualCaption = document.getElementById("percentualCaption");
    const dataInicial = document.getElementById("dataInicial");
    const celulasCusto = document.getElementById("celulasCusto");
    const subcelulasUnidades = document.getElementById("subcelulasUnidades");
    const processButton = document.getElementById("processButton");
    
    const resultsSection = document.getElementById('results-section');
    const initialMessage = document.getElementById('initial-message');
    const statsMetrics = document.getElementById("statsMetrics");
    const successRate = document.getElementById("successRate");
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");
    const exportButton = document.getElementById("exportButton");
    const cronogramaTable = document.getElementById("cronogramaTable");
    const cronogramaInfo = document.getElementById("cronogramaInfo");
    const exceptionsTable = document.getElementById("exceptionsTable");
    const exceptionsMotives = document.getElementById("exceptionsMotives");
    const exceptionsSection = document.getElementById('exceptions-section');

    let originalData = null;
    let processedData = null;

    // --- Lógica de Negócio (Portado de Python) ---

    const FERIADOS = [
        '2025-01-01', '2025-03-03', '2025-03-04', '2025-04-18', '2025-04-21',
        '2025-05-01', '2025-06-19', '2025-09-07', '2025-10-12',
        '2025-11-02', '2025-11-15', '2025-11-20', '2025-12-25'
    ].map(d => new Date(d + 'T12:00:00Z').setUTCHours(0, 0, 0, 0));

    function ehDiaUtil(d) {
        const day = d.getUTCDay();
        const isWeekend = (day === 0 || day === 6);
        const isHoliday = FERIADOS.includes(d.setUTCHours(0, 0, 0, 0));
        return !isWeekend && !isHoliday;
    }

    function proximoDiaUtil(d) {
        let nextDay = new Date(d);
        while (!ehDiaUtil(nextDay)) {
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        }
        return nextDay;
    }
    
    function gerarDataFim(inicio, dias) {
        let fim = new Date(inicio);
        fim.setUTCDate(fim.getUTCDate() + dias - 1);
        return fim;
    }

    function processarCentroCusto(centroCustoStr) {
        if (!centroCustoStr || typeof centroCustoStr !== 'string') return ['000', 'Outros', 'Outros'];
        const partes = centroCustoStr.split(' - ');
        const codigo = partes[0] || '000';
        let categoria = 'Outros';
        if (partes.length >= 3) {
            categoria = partes[2].replace(/Sp |Cg |Rh /gi, "").trim();
            categoria = categoria.charAt(0).toUpperCase() + categoria.slice(1).toLowerCase();
        }
        return [codigo, partes[1] || 'Outros', categoria];
    }

    function classificarHierarquiaCargo(cargo) {
        if (!cargo || typeof cargo !== 'string') return 3;
        const cargoLower = cargo.toLowerCase();
        if (['diretor', 'gerente', 'superintendente', 'presidente'].some(p => cargoLower.includes(p))) return 1;
        if (['supervisor', 'coordenador', 'chefe', 'líder'].some(p => cargoLower.includes(p))) return 2;
        return 3;
    }

    // --- Funções de Interface ---

    function updatePercentualUI() {
        const percentual = percentualSimultaneo.value;
        percentualValue.textContent = `${percentual}%`;
        const exemplo = Math.max(1, Math.floor(10 * (percentual / 100)));
        percentualCaption.textContent = `Ex: Numa equipe de 10, no máximo ${exemplo} sairão de férias.`;
    }

    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        fileStatus.innerHTML = "⏳ Processando...";
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });

            const headers = json[0].map(h => String(h || '').trim());
            let df = json.slice(1).map(row => {
                let obj = {};
                headers.forEach((header, i) => { obj[header] = row[i]; });
                return obj;
            });
            
            df = df.map(row => {
                const nome = headers.length > 2 ? row[headers[2]] : null;
                const centroCustoCompleto = headers.length > 5 ? row[headers[5]] : null;
                const unidade = headers.length > 6 ? row[headers[6]] : null;
                const dataLimiteRaw = headers.length > 12 ? row[headers[12]] : null;
                const cargo = headers.length > 13 ? row[headers[13]] : null;
                const [codigo, , celulaCentral] = processarCentroCusto(centroCustoCompleto);
                
                let dataLimite = null;
                if (dataLimiteRaw) {
                    if (typeof dataLimiteRaw === 'number' && dataLimiteRaw > 1) {
                         dataLimite = new Date(Date.UTC(1899, 11, 30 + dataLimiteRaw));
                    } else if (typeof dataLimiteRaw === 'string') {
                        const parts = dataLimiteRaw.split('/');
                        if (parts.length === 3) {
                             dataLimite = new Date(Date.UTC(parts[2], parts[1] - 1, parts[0]));
                        }
                    }
                }

                return {
                    Nome: nome,
                    CentroCustoCompleto: centroCustoCompleto,
                    CodigoCusto: codigo,
                    CelulaCentral: celulaCentral,
                    Unidade: unidade,
                    DataLimite: dataLimite,
                    Cargo: cargo
                };
            }).filter(row => row.Nome && row.CelulaCentral && row.CelulaCentral !== 'Outros' && row.Unidade && row.DataLimite);
            
            originalData = df;
            fileStatus.innerHTML = `✅ ${df.length} colaboradores válidos carregados.`;
            processButton.disabled = false;
            populateFilters(df);

        } catch (error) {
            fileStatus.innerHTML = `❌ Erro ao ler arquivo: ${error.message}`;
            console.error(error);
        }
    }

    function populateFilters(data) {
        const celulas = [...new Set(data.map(r => r.CelulaCentral))].sort();
        const unidades = [...new Set(data.map(r => r.Unidade))].sort();
        
        celulasCusto.innerHTML = celulas.map(c => `<option value="${c}" selected>${c}</option>`).join('');
        subcelulasUnidades.innerHTML = unidades.map(u => `<option value="${u}" selected>${u}</option>`).join('');
    }

    // --- ALGORITMO PRINCIPAL COM O NOVO RACIONAL ---

    function processarComMetaMensal() {
        if (!originalData) return;

        // 1. Obter parâmetros da interface
        const dias = parseInt(diasFerias.value, 10);
        const percentual = parseFloat(percentualSimultaneo.value) / 100;
        const inicioParts = dataInicial.value.split('-');
        const dataDeInicioGlobal = new Date(Date.UTC(inicioParts[0], inicioParts[1] - 1, inicioParts[2]));
        
        const selectedCelulas = Array.from(celulasCusto.selectedOptions).map(opt => opt.value);
        const selectedUnidades = Array.from(subcelulasUnidades.selectedOptions).map(opt => opt.value);
        
        let df = JSON.parse(JSON.stringify(originalData.filter(row =>
            selectedCelulas.includes(row.CelulaCentral) && selectedUnidades.includes(row.Unidade)
        )));

        df.forEach(row => {
            row.DataInicioFerias = null;
            row.DataFimFerias = null;
            row.Lote = null;
            row.DataLimite = row.DataLimite ? new Date(row.DataLimite) : null;
            row.NivelHierarquico = classificarHierarquiaCargo(row.Cargo);
        });

        // 2. Análise do Período e Cálculo da Meta Mensal
        const datasLimite = df.map(r => r.DataLimite);
        const dataLimiteMaxima = new Date(Math.max.apply(null, datasLimite));

        const mesesTotais = (dataLimiteMaxima.getUTCFullYear() - dataDeInicioGlobal.getUTCFullYear()) * 12 +
                            (dataLimiteMaxima.getUTCMonth() - dataDeInicioGlobal.getUTCMonth()) + 1;
        
        const metaMensal = Math.ceil(df.length / Math.max(1, mesesTotais));

        // 3. Priorização por Urgência (Data Limite)
        df.sort((a, b) => a.DataLimite - b.DataLimite);

        // 4. Distribuição Mês a Mês
        let agendamentos = [];
        let dataAtual = new Date(dataDeInicioGlobal);

        for (const funcionario of df) {
            let agendado = false;
            let tentativasMes = 0;
            
            // Tenta agendar o funcionário no primeiro mês possível
            while (!agendado && tentativasMes < 24) { // Limite para evitar loop infinito
                
                const agendadosNoMes = agendamentos.filter(ag => 
                    ag.DataInicioFerias.getUTCFullYear() === dataAtual.getUTCFullYear() &&
                    ag.DataInicioFerias.getUTCMonth() === dataAtual.getUTCMonth()
                );

                if (agendadosNoMes.length < metaMensal) {
                    // Tenta encontrar um slot neste mês
                    let dataDeBusca = new Date(dataAtual);
                    let slotEncontrado = false;
                    
                    while (!slotEncontrado) {
                        let dataInicioProposta = proximoDiaUtil(new Date(dataDeBusca));
                        
                        // Garante que não estamos pulando para o próximo mês
                        if (dataInicioProposta.getUTCMonth() !== dataAtual.getUTCMonth()) {
                            break; // Não há mais espaço neste mês, sai para tentar o próximo
                        }
                        
                        const dataFimProposta = gerarDataFim(dataInicioProposta, dias);
                        
                        // Verifica se a data é válida (não passa da DataLimite)
                        if (dataInicioProposta > funcionario.DataLimite) {
                             break; // Impossível agendar, desiste para este funcionário
                        }
                        
                        // Verifica conflitos de simultaneidade na unidade/cargo
                        const agendadosNaUnidade = agendamentos.filter(ag => ag.Unidade === funcionario.Unidade);
                        
                        const limiteSimultaneo = Math.max(1, Math.floor(
                            originalData.filter(o => o.Unidade === funcionario.Unidade).length * percentual
                        ));
                        
                        let conflitos = 0;
                        for (const ag of agendadosNaUnidade) {
                            // Verifica se há sobreposição de datas
                            if (Math.max(ag.DataInicioFerias, dataInicioProposta) <= Math.min(ag.DataFimFerias, dataFimProposta)) {
                                conflitos++;
                            }
                        }

                        if (conflitos < limiteSimultaneo) {
                            // Slot encontrado!
                            funcionario.DataInicioFerias = dataInicioProposta;
                            funcionario.DataFimFerias = dataFimProposta;
                            agendamentos.push(funcionario);
                            agendado = true;
                            slotEncontrado = true;
                        } else {
                            // Conflito, avança um dia e tenta de novo
                            dataDeBusca.setUTCDate(dataDeBusca.getUTCDate() + 1);
                        }
                    }
                }
                
                if (!agendado) {
                    // Mês cheio ou sem slot, avança para o próximo mês
                    dataAtual.setUTCMonth(dataAtual.getUTCMonth() + 1, 1);
                    tentativasMes++;
                }
            }
        }
        
        processedData = df;
        updateUIWithResults(df, percentual, 1);
    }
    
    
    // --- Funções de Atualização da UI e Visualização ---

    function updateUIWithResults(data, percentual, tentativas) {
        initialMessage.style.display = 'none';
        resultsSection.style.display = 'block';

        const agendados = data.filter(r => r.DataInicioFerias);
        const ignorados = data.filter(r => !r.DataInicioFerias);

        statsMetrics.innerHTML = `
            <div><p>Total Processado</p><h3>${data.length}</h3></div>
            <div><p>✅ Com Férias</p><h3>${agendados.length}</h3></div>
            <div><p>⚠️ Pendentes</p><h3>${ignorados.length}</h3></div>
            <div><p>📊 Racional</p><h3>Meta Mensal</h3></div>
        `;
        const taxaSucesso = data.length > 0 ? (agendados.length / data.length) * 100 : 0;
        successRate.innerHTML = `<progress value="${taxaSucesso}" max="100" style="width: 100%;"></progress> <p style="text-align:center;">Taxa de Sucesso: ${taxaSucesso.toFixed(1)}%</p>`;
        
        updateVisualizations(data, percentual);
        updateCronograma(data);
        updateExceptions(ignorados);
    }
    
    function updateVisualizations(data, percentual) {
        const agendados = data.filter(r => r.DataInicioFerias);
        if (agendados.length === 0) return;
        
        const getPeriodo = (dStr) => { const date = new Date(dStr); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; };
        
        const periodos = [...new Set(agendados.map(r => getPeriodo(r.DataInicioFerias)))].sort();
        
        const dadosPorUnidade = groupBy(agendados, 'Unidade');
        const tracesUnidade = Object.keys(dadosPorUnidade).map(unidade => {
            const contagemMensal = countBy(dadosPorUnidade[unidade], r => getPeriodo(r.DataInicioFerias));
            return { x: periodos, y: periodos.map(p => contagemMensal[p] || 0), name: unidade, type: 'bar' };
        });
        Plotly.newPlot('tab1', tracesUnidade, { title: 'Distribuição por Unidade', barmode: 'stack' });

        const nivelMap = {1: 'Alta Gestão', 2: 'Média Gestão', 3: 'Operacional'};
        const dadosPorNivel = groupBy(agendados, r => nivelMap[r.NivelHierarquico]);
        const tracesCargo = Object.keys(dadosPorNivel).map(nivel => {
             const contagemMensal = countBy(dadosPorNivel[nivel], r => getPeriodo(r.DataInicioFerias));
            return { x: periodos, y: periodos.map(p => contagemMensal[p] || 0), name: nivel, type: 'bar' };
        });
        Plotly.newPlot('tab2', tracesCargo, { title: 'Distribuição por Nível Hierárquico', barmode: 'stack' });

        const totalPorUnidade = countBy(data, 'Unidade');
        const tracesRealLimite = [];
        Object.keys(dadosPorUnidade).forEach(unidade => {
            const limite = Math.max(1, Math.floor(totalPorUnidade[unidade] * percentual));
            const contagemMensal = countBy(dadosPorUnidade[unidade], r => getPeriodo(r.DataInicioFerias));
            tracesRealLimite.push({ x: periodos, y: periodos.map(p => contagemMensal[p] || 0), name: `Real (${unidade})`, type: 'bar' });
            tracesRealLimite.push({ x: periodos, y: Array(periodos.length).fill(limite), name: `Limite (${unidade})`, type: 'scatter', mode: 'lines', line: {dash: 'dot'} });
        });
        Plotly.newPlot('tab3', tracesRealLimite, { title: 'Real vs. Limite por Unidade', barmode: 'group' });
    }

    function updateCronograma(data) {
        const formatarData = (dStr) => dStr ? new Date(dStr).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "---";
        const colunas = ["Nome", "CentroCustoCompleto", "Unidade", "Cargo", "DataLimite", "DataInicioFerias", "DataFimFerias"];
        let tableHtml = `<table><thead><tr>${colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
        
        const sortedData = [...data].sort((a,b) => (a.DataInicioFerias ? new Date(a.DataInicioFerias) : new Date('2999-12-31')) - (b.DataInicioFerias ? new Date(b.DataInicioFerias) : new Date('2999-12-31')));

        sortedData.forEach(row => {
            tableHtml += `<tr>
                <td>${row.Nome || ''}</td>
                <td>${row.CentroCustoCompleto || ''}</td>
                <td>${row.Unidade || ''}</td>
                <td>${row.Cargo || 'N/A'}</td>
                <td>${formatarData(row.DataLimite)}</td>
                <td>${formatarData(row.DataInicioFerias)}</td>
                <td>${formatarData(row.DataFimFerias)}</td>
            </tr>`;
        });
        cronogramaTable.innerHTML = tableHtml + "</tbody></table>";
        cronogramaInfo.innerHTML = `<p>Exibindo ${data.length} registros ordenados por data de início.</p>`;
    }

    function updateExceptions(ignorados) {
        if (!ignorados || ignorados.length === 0) {
            exceptionsSection.style.display = 'none';
            return;
        }
        exceptionsSection.style.display = 'block';
        const colunas = ["Nome", "Unidade", "Cargo", "DataLimite"];
        let tableHtml = `<table><thead><tr>${colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
        ignorados.forEach(row => {
             tableHtml += `<tr>
                <td>${row.Nome || ''}</td>
                <td>${row.Unidade || ''}</td>
                <td>${row.Cargo || 'N/A'}</td>
                <td>${row.DataLimite ? new Date(row.DataLimite).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : 'N/A'}</td>
            </tr>`;
        });
        exceptionsTable.innerHTML = tableHtml + "</tbody></table>";
        exceptionsMotives.innerHTML = `<p class="info"><strong>Motivo:</strong> Não foi possível alocar estes <strong>${ignorados.length}</strong> colaboradores. Isso ocorre se a data de início calculada for posterior à data limite do colaborador.</p>`;
    }

    function exportData() {
        if (!processedData) return;
        const dataExport = processedData.map(row => ({
            Nome: row.Nome,
            Centro_Custo_Completo: row.CentroCustoCompleto,
            Unidade: row.Unidade,
            Cargo: row.Cargo,
            Data_Limite: row.DataLimite ? new Date(row.DataLimite).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "",
            Data_Inicio_Ferias: row.DataInicioFerias ? new Date(row.DataInicioFerias).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "",
            Data_Fim_Ferias: row.DataFimFerias ? new Date(row.DataFimFerias).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "",
            Lote: row.Lote,
        }));
        const ws = XLSX.utils.json_to_sheet(dataExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cronograma_Ferias");
        XLSX.writeFile(wb, `cronograma_ferias_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    // --- Helpers ---
    const groupBy = (arr, key) => arr.reduce((acc, item) => {
        const group = typeof key === 'function' ? key(item) : item[key];
        (acc[group] = acc[group] || []).push(item);
        return acc;
    }, {});
    
    const countBy = (arr, key) => arr.reduce((acc, item) => {
        const group = typeof key === 'function' ? key(item) : item[key];
        acc[group] = (acc[group] || 0) + 1;
        return acc;
    }, {});

    // --- Event Listeners ---
    percentualSimultaneo.addEventListener("input", updatePercentualUI);
    excelFile.addEventListener("change", handleFileUpload);
    processButton.addEventListener("click", processarComMetaMensal); // <--- MUDANÇA IMPORTANTE
    exportButton.addEventListener("click", exportData);
    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const tabId = button.dataset.tab;
            tabContents.forEach(content => content.classList.remove("active"));
            tabButtons.forEach(btn => btn.classList.remove("active"));
            document.getElementById(tabId).classList.add("active");
            button.classList.add("active");
        });
    });

    // --- Inicialização ---
    dataInicial.valueAsDate = new Date();
    updatePercentualUI();
});
