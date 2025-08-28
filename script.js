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

    // --- Lógica de Negócio ---

    const FERIADOS = [
        '2025-01-01', '2025-03-03', '2025-03-04', '2025-04-18', '2025-04-21',
        '2025-05-01', '2025-06-19', '2025-09-07', '2025-10-12',
        '2025-11-02', '2025-11-15', '2025-11-20', '2025-12-25'
    ].map(d => new Date(d + 'T12:00:00Z').setUTCHours(0, 0, 0, 0));

    function ehDiaUtil(d) {
        const day = d.getUTCDay();
        const isWeekend = (day === 0 || day === 6);
        const isHoliday = FERIADOS.includes(new Date(d).setUTCHours(0, 0, 0, 0));
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
                    Cargo: cargo,
                    Motivo: null
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

    // --- ALGORITMO PRINCIPAL OTIMIZADO (V4) ---

    function processarFeriasFinal() {
        if (!originalData) return;

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

        let dataDisponivelGlobal = new Date(dataDeInicioGlobal);
        let loteGlobal = 1;
        const unidades = [...new Set(df.map(r => r.Unidade))].sort();

        for (const unidade of unidades) {
            const dfUnidade = df.filter(f => f.Unidade === unidade);
            if (dfUnidade.length === 0) continue;

            const resultadoUnidade = agendarUnidade(dfUnidade, dias, percentual, dataDisponivelGlobal, loteGlobal);
            
            dataDisponivelGlobal = resultadoUnidade.ultimaDataUsada;
            loteGlobal = resultadoUnidade.ultimoLote;
        }
        
        processedData = df;
        updateUIWithResults(df, percentual);
    }

    function agendarUnidade(dfUnidade, dias, percentual, dataInicioUnidade, loteInicio) {
        const datasLimiteUnidade = dfUnidade.map(r => r.DataLimite);
        const dataLimiteMaximaUnidade = new Date(Math.max.apply(null, datasLimiteUnidade));
        
        const mesesTotaisUnidade = (dataLimiteMaximaUnidade.getUTCFullYear() - dataInicioUnidade.getUTCFullYear()) * 12 +
                                   (dataLimiteMaximaUnidade.getUTCMonth() - dataInicioUnidade.getUTCMonth()) + 1;

        const metaMensalUnidade = Math.ceil(dfUnidade.length / Math.max(1, mesesTotaisUnidade));
        
        dfUnidade.sort((a, b) => a.DataLimite - b.DataLimite);

        let dataDisp = new Date(dataInicioUnidade);
        let lote = loteInicio;
        let agendamentosNestaUnidade = [];

        for (const funcionario of dfUnidade) {
            let mesCorrente = dataDisp.getUTCMonth();
            let agendadosNoMes = agendamentosNestaUnidade.filter(ag => ag.DataInicioFerias.getUTCMonth() === mesCorrente).length;
            
            const prazoEstaCurto = (funcionario.DataLimite.getUTCFullYear() === dataDisp.getUTCFullYear() && 
                                  funcionario.DataLimite.getUTCMonth() <= dataDisp.getUTCMonth() + 1);

            if (agendadosNoMes >= metaMensalUnidade && !prazoEstaCurto) {
                dataDisp.setUTCMonth(dataDisp.getUTCMonth() + 1, 1);
            }

            let slotEncontrado = false;
            let tentativasBusca = 0;
            while (!slotEncontrado && tentativasBusca < 365) { // Limite de busca de 1 ano
                let dataInicioProposta = proximoDiaUtil(new Date(dataDisp));

                if (dataInicioProposta > funcionario.DataLimite) {
                    funcionario.Motivo = "Prazo Expirado durante a busca";
                    break; 
                }
                
                const dataFimProposta = gerarDataFim(dataInicioProposta, dias);
                const limiteSimultaneo = Math.max(1, Math.floor(dfUnidade.length * percentual));
                
                const conflitos = agendamentosNestaUnidade.filter(ag => 
                    Math.max(ag.DataInicioFerias, dataInicioProposta) <= Math.min(ag.DataFimFerias, dataFimProposta)
                );

                if (conflitos.length < limiteSimultaneo) {
                    funcionario.DataInicioFerias = dataInicioProposta;
                    funcionario.DataFimFerias = dataFimProposta;
                    funcionario.Lote = lote;
                    agendamentosNestaUnidade.push(funcionario);
                    
                    dataDisp = new Date(dataInicioProposta);
                    dataDisp.setUTCDate(dataDisp.getUTCDate() + 1);
                    
                    lote++;
                    slotEncontrado = true;
                } else {
                    // Resolução de Conflito Inteligente: Pula para o fim do bloqueio
                    const maxFimConflito = new Date(Math.max.apply(null, conflitos.map(c => c.DataFimFerias)));
                    dataDisp = new Date(maxFimConflito);
                    dataDisp.setUTCDate(dataDisp.getUTCDate() + 1);
                }
                tentativasBusca++;
            }
            if(!slotEncontrado && !funcionario.Motivo) {
                 funcionario.Motivo = "Não foi encontrado slot válido em 1 ano de busca";
            }
        }
        return { ultimaDataUsada: dataDisp, ultimoLote: lote };
    }
    
    // --- Funções de UI e Visualização ---

    function updateUIWithResults(data, percentual) {
        initialMessage.style.display = 'none';
        resultsSection.style.display = 'block';

        const agendados = data.filter(r => r.DataInicioFerias);
        const ignorados = data.filter(r => !r.DataInicioFerias);

        statsMetrics.innerHTML = `
            <div><p>Total Processado</p><h3>${data.length}</h3></div>
            <div><p>✅ Com Férias</p><h3>${agendados.length}</h3></div>
            <div><p>⚠️ Pendentes</p><h3>${ignorados.length}</h3></div>
            <div><p>📊 Racional</p><h3>Meta Flexível</h3></div>
        `;
        const taxaSucesso = data.length > 0 ? (agendados.length / data.length) * 100 : 0;
        successRate.innerHTML = `<progress value="${taxaSucesso}" max="100" style="width: 100%;"></progress> <p style="text-align:center;">Taxa de Sucesso: ${taxaSucesso.toFixed(1)}%</p>`;
        
        updateVisualizations(data, percentual);
        updateCronograma(data);
        updateExceptions(ignorados);
    }
    
    function updateVisualizations(data, percentual) {
        const agendados = data.filter(r => r.DataInicioFerias);
        if (agendados.length === 0) {
            document.getElementById('tab1').innerHTML = "<p>Nenhum dado para exibir.</p>";
            document.getElementById('tab2').innerHTML = "<p>Nenhum dado para exibir.</p>";
            document.getElementById('tab3').innerHTML = "<p>Nenhum dado para exibir.</p>";
            return;
        }
        
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
        const colunas = ["Nome", "CentroCustoCompleto", "Unidade", "Cargo", "DataLimite", "DataInicioFerias", "DataFimFerias", "Lote"];
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
                <td>${row.Lote || '---'}</td>
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
        const colunas = ["Nome", "Unidade", "Cargo", "DataLimite", "Motivo"]; // Adicionada coluna Motivo
        let tableHtml = `<table><thead><tr>${colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
        ignorados.forEach(row => {
             tableHtml += `<tr>
                <td>${row.Nome || ''}</td>
                <td>${row.Unidade || ''}</td>
                <td>${row.Cargo || 'N/A'}</td>
                <td>${row.DataLimite ? new Date(row.DataLimite).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : 'N/A'}</td>
                <td>${row.Motivo || 'Não especificado'}</td>
            </tr>`;
        });
        exceptionsTable.innerHTML = tableHtml + "</tbody></table>";
        const motivosContagem = countBy(ignorados.filter(i => i.Motivo), 'Motivo');
        exceptionsMotives.innerHTML = "<p><strong>Principais Motivos da Falha:</strong></p>" + Object.entries(motivosContagem).map(([motivo, count]) => `<li>${motivo}: ${count}</li>`).join('');
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
    processButton.addEventListener("click", processarFeriasFinal);
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
