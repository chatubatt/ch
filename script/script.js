// script/script.js

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
    const statsMetrics = document.getElementById("statsMetrics");
    const successRate = document.getElementById("successRate");
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");
    const exportButton = document.getElementById("exportButton");
    const cronogramaTable = document.getElementById("cronogramaTable");
    const cronogramaInfo = document.getElementById("cronogramaInfo");
    const exceptionsTable = document.getElementById("exceptionsTable");
    const exceptionsMotives = document.getElementById("exceptionsMotives");
    const analysisResults = document.getElementById("analysisResults");


    let originalData = null; // Armazena os dados originais do Excel, limpos
    let processedData = null; // Armazena os dados após o agendamento

    // --- Funções Auxiliares (Lógica de Negócio) ---

    // Feriados Nacionais Fixos para 2025
    const FERIADOS = [
        "2025-01-01", "2025-03-04", "2025-04-18", "2025-04-21",
        "2025-05-01", "2025-06-19", "2025-09-07", "2025-10-12",
        "2025-11-02", "2025-11-15", "2025-11-20", "2025-12-25"
    ].map(d => {
        const [year, month, day] = d.split('-').map(Number);
        return new Date(year, month - 1, day).setHours(0, 0, 0, 0);
    });

    function ehDiaUtil(d) {
        const day = d.getDay();
        const isWeekend = (day === 0 || day === 6); // Domingo = 0, Sábado = 6
        const isHoliday = FERIADOS.includes(d.setHours(0, 0, 0, 0));
        return !isWeekend && !isHoliday;
    }

    function proximoDiaUtil(d) {
        let nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1); // Começa a verificar a partir do dia seguinte
        while (!ehDiaUtil(nextDay)) {
            nextDay.setDate(nextDay.getDate() + 1);
        }
        return nextDay;
    }

    function gerarDataFim(inicio, dias) {
        let fim = new Date(inicio);
        fim.setDate(fim.getDate() + dias - 1);
        return fim;
    }

    function processarCentroCusto(centroCustoStr) {
        if (!centroCustoStr || typeof centroCustoStr !== 'string' || ["nan", "none", ""].includes(centroCustoStr.trim().toLowerCase())) {
            return ["000", "Outros", "Outros"];
        }
        const partes = centroCustoStr.split(" - ");
        const codigo = partes.length > 0 ? partes[0].trim() : "000";
        const descricao = partes.length >= 2 ? partes[1].trim() : "Outros";
        let categoria = partes.length >= 3 ? partes[2].trim() : "Outros";

        categoria = categoria.replace(/Sp |Cg |Rh /gi, "").trim();
        categoria = categoria.charAt(0).toUpperCase() + categoria.slice(1).toLowerCase();

        return [codigo, descricao, categoria];
    }
    
    function classificarHierarquiaCargo(cargo) {
        if (!cargo || typeof cargo !== 'string' || ["nan", "none", ""].includes(cargo.trim().toLowerCase())) {
            return 3;
        }
        const cargoLower = cargo.toLowerCase();
        if (["diretor", "gerente", "superintendente", "presidente"].some(palavra => cargoLower.includes(palavra))) {
            return 1;
        } else if (["supervisor", "coordenador", "chefe", "líder"].some(palavra => cargoLower.includes(palavra))) {
            return 2;
        } else {
            return 3;
        }
    }

    function calcularLimitePorCargo(dfUnidade, cargo, percentualBase) {
        const totalCargo = dfUnidade.filter(row => row.Cargo === cargo).length;
        const nivelHierarquico = classificarHierarquiaCargo(cargo);
        if (nivelHierarquico === 1) {
            return 1;
        } else if (nivelHierarquico === 2) {
            return Math.max(1, Math.floor(totalCargo * 0.5));
        } else {
            return Math.max(1, Math.floor(totalCargo * percentualBase));
        }
    }

    function criarMapeamentoCelulaSubcelula(data) {
        const mapeamento = {};
        data.forEach(row => {
            const celula = row.CelulaCentral;
            const subcelula = row.Unidade;
            if (celula && subcelula) {
                if (!mapeamento[celula]) {
                    mapeamento[celula] = new Set();
                }
                mapeamento[celula].add(subcelula);
            }
        });
        return mapeamento;
    }

    // --- Funções de Interface e Eventos ---

    function updatePercentualCaption() {
        const percentual = percentualSimultaneo.value;
        percentualValue.textContent = `${percentual}%`;
        const exemplo = Math.max(1, Math.floor(10 * (percentual / 100)));
        percentualCaption.textContent = `💡 Em uma equipe de 10 pessoas, no máximo ${exemplo} poderão estar de férias ao mesmo tempo.`;
    }

    percentualSimultaneo.addEventListener("input", updatePercentualCaption);
    excelFile.addEventListener("change", handleFileUpload);
    processButton.addEventListener("click", processVacationData);
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

    updatePercentualCaption();
    dataInicial.valueAsDate = new Date();

    // --- Funções de Processamento de Dados ---

    function parseExcelDate(dateValue) {
        if (typeof dateValue === 'number') {
            // Converte data serial do Excel para data JS
            return new Date((dateValue - 25569) * 86400000);
        } else if (typeof dateValue === 'string') {
            const parts = dateValue.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
            if (parts) {
                // Formato dd/mm/yyyy
                return new Date(parts[3], parts[2] - 1, parts[1]);
            }
            // Tenta formato padrão
            const parsed = new Date(dateValue);
            if (!isNaN(parsed)) return parsed;
        }
        return null;
    }

    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        fileStatus.textContent = "⏳ Processando arquivo...";
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

            const headers = json[0].map(h => String(h).trim());
            let df = json.slice(1).map(row => {
                let obj = {};
                headers.forEach((header, i) => {
                    obj[header] = row[i];
                });
                return obj;
            });
            
            // Mapeamento esperado das colunas
            const colMap = {
                nome: headers[2],       // Coluna C
                centroCusto: headers[5], // Coluna F
                unidade: headers[6],     // Coluna G
                dataLimite: headers[12], // Coluna M
                cargo: headers[13]       // Coluna N
            };

            const errors = [];
            if (headers.length < 14) errors.push("Arquivo deve ter pelo menos 14 colunas (A até N)");
            if (!colMap.nome || !df.some(row => row[colMap.nome])) errors.push("Coluna C (Nome) não encontrada ou vazia.");
            if (!colMap.centroCusto || !df.some(row => row[colMap.centroCusto])) errors.push("Coluna F (Centro de Custo) não encontrada ou vazia.");
            if (!colMap.unidade || !df.some(row => row[colMap.unidade])) errors.push("Coluna G (Unidade) não encontrada ou vazia.");
            if (!colMap.dataLimite || !df.some(row => row[colMap.dataLimite])) errors.push("Coluna M (Data Limite) não encontrada ou vazia.");
            if (!colMap.cargo) errors.push("Coluna N (Cargo) não encontrada. A análise por cargo será desabilitada.");

            if (errors.length > 0 && errors.some(e => !e.includes("Cargo"))) {
                 fileStatus.innerHTML = `❌ <strong>Problemas encontrados:</strong><br>${errors.join("<br>")}`;
                 return;
            }

            df = df.map(row => {
                const [codigo, descricao, celulaCentral] = processarCentroCusto(row[colMap.centroCusto]);
                return {
                    Nome: String(row[colMap.nome] || "").trim(),
                    CentroCustoCompleto: String(row[colMap.centroCusto] || "").trim(),
                    CodigoCusto: codigo,
                    DescricaoCusto: descricao,
                    CelulaCentral: celulaCentral,
                    Unidade: String(row[colMap.unidade] || "").trim(),
                    DataLimite: parseExcelDate(row[colMap.dataLimite]),
                    Cargo: colMap.cargo ? String(row[colMap.cargo] || "").trim() : null,
                };
            });
            
            const originalSize = df.length;
            df = df.filter(row => row.Nome && row.CelulaCentral && row.Unidade && row.CelulaCentral !== "Outros");

            if (df.length === 0) {
                fileStatus.textContent = "❌ Nenhum colaborador válido encontrado após a limpeza dos dados.";
                return;
            }
            
            originalData = df;
            processedData = null; // Reseta dados processados
            const removidos = originalSize - df.length;
            fileStatus.textContent = `✅ ${df.length} colaboradores válidos carregados.`;
            if (removidos > 0) {
                 fileStatus.innerHTML += ` <br>⚠️ ${removidos} registros removidos por dados inválidos (ex: nome, unidade ou centro de custo em branco).`;
            }
            
            populateSelectionFilters(originalData);

        } catch (error) {
            fileStatus.textContent = `❌ Erro ao ler o arquivo: ${error.message}`;
            console.error(error);
        }
    }

    function populateSelectionFilters(data) {
        const mapeamento = criarMapeamentoCelulaSubcelula(data);
        const celulasDisponiveis = Object.keys(mapeamento).sort();
        const unidadesDisponiveis = [...new Set(data.map(r => r.Unidade))].sort();

        celulasCusto.innerHTML = "";
        celulasDisponiveis.forEach(celula => {
            const option = new Option(celula, celula, true, true);
            celulasCusto.appendChild(option);
        });

        subcelulasUnidades.innerHTML = "";
        unidadesDisponiveis.forEach(unidade => {
            const option = new Option(unidade, unidade, true, true);
            subcelulasUnidades.appendChild(option);
        });
    }

    // --- ALGORITMO PRINCIPAL DE DISTRIBUIÇÃO ---

    function processarDistribuicaoComCargo(df, dias, percentual, data_inicial, loteInicial = 1) {
        let colaboradores_ignorados = [];
        let lote = loteInicial;
        const temCargo = df.some(row => row.Cargo);

        const unidades = [...new Set(df.map(row => row.Unidade))].sort();

        for (const unidade of unidades) {
            const df_unidade = df.filter(row => row.Unidade === unidade);
            if (df_unidade.length === 0) continue;
            
            let data_disp_unidade = new Date(data_inicial);

            if (temCargo) {
                const niveis = [...new Set(df_unidade.map(r => r.NivelHierarquico))].sort();
                for (const nivel of niveis) {
                    const df_nivel = df_unidade.filter(r => r.NivelHierarquico === nivel);
                    const cargos = [...new Set(df_nivel.map(r => r.Cargo))].sort();
                    for (const cargo of cargos) {
                        const grupo = df_nivel.filter(r => r.Cargo === cargo);
                        if (grupo.length === 0) continue;

                        const limite_cargo = calcularLimitePorCargo(df_unidade, cargo, percentual);
                        for (let i = 0; i < grupo.length; i += limite_cargo) {
                            const lote_atual = grupo.slice(i, i + limite_cargo);
                            const ini = proximoDiaUtil(new Date(data_disp_unidade.getTime() - (24*60*60*1000)));
                            let fim_lote = null;

                            for (const row of lote_atual) {
                                if (!row.DataLimite) {
                                    colaboradores_ignorados.push({ ...row, Motivo: "Data limite não informada" });
                                    continue;
                                }
                                if (ini > row.DataLimite) {
                                    colaboradores_ignorados.push({ ...row, Motivo: "Data limite anterior ao período calculado" });
                                    continue;
                                }
                                const fim = gerarDataFim(ini, dias);
                                row.DataInicioFerias = ini;
                                row.DataFimFerias = fim;
                                row.Lote = lote;
                                if (!fim_lote || fim > fim_lote) {
                                    fim_lote = fim;
                                }
                            }
                            if (fim_lote) {
                                const intervalo_dias = nivel <= 2 ? 7 : 1;
                                data_disp_unidade = new Date(fim_lote);
                                data_disp_unidade.setDate(data_disp_unidade.getDate() + intervalo_dias);
                                lote++;
                            }
                        }
                    }
                }
            } else { // Lógica sem cargo
                const tam_lote = Math.max(1, Math.floor(df_unidade.length * percentual));
                for (let i = 0; i < df_unidade.length; i += tam_lote) {
                    const lote_atual = df_unidade.slice(i, i + tam_lote);
                    const ini = proximoDiaUtil(new Date(data_disp_unidade.getTime() - (24*60*60*1000)));
                    let fim_lote = null;

                    for (const row of lote_atual) {
                       if (!row.DataLimite || ini > row.DataLimite) {
                           colaboradores_ignorados.push({ ...row, Motivo: "Data limite incompatível" });
                           continue;
                       }
                        const fim = gerarDataFim(ini, dias);
                        row.DataInicioFerias = ini;
                        row.DataFimFerias = fim;
                        row.Lote = lote;
                        if (!fim_lote || fim > fim_lote) {
                            fim_lote = fim;
                        }
                    }
                     if (fim_lote) {
                        data_disp_unidade = new Date(fim_lote);
                        data_disp_unidade.setDate(data_disp_unidade.getDate() + 1);
                        lote++;
                    }
                }
            }
        }
        return { colaboradores_ignorados, loteFinal: lote };
    }

    function processVacationData() {
        if (!originalData) {
            alert("Por favor, carregue um arquivo Excel primeiro.");
            return;
        }

        const dias = parseInt(diasFerias.value);
        const percentual = parseFloat(percentualSimultaneo.value) / 100;
        const inicio = new Date(dataInicial.value);
        const selectedCelulas = Array.from(celulasCusto.selectedOptions).map(opt => opt.value);
        const selectedUnidades = Array.from(subcelulasUnidades.selectedOptions).map(opt => opt.value);

        let dfResultadoFinal = JSON.parse(JSON.stringify(originalData.filter(row =>
            selectedCelulas.includes(row.CelulaCentral) && selectedUnidades.includes(row.Unidade)
        )));

        dfResultadoFinal.forEach(row => {
            row.DataInicioFerias = null;
            row.DataFimFerias = null;
            row.Lote = null;
            row.DataLimite = row.DataLimite ? new Date(row.DataLimite) : null;
            row.NivelHierarquico = classificarHierarquiaCargo(row.Cargo);
        });

        let tentativas = 0;
        const maxTentativas = 3;
        let percentualAtual = percentual;
        let loteAtual = 1;

        while (tentativas < maxTentativas) {
            let pendentes = dfResultadoFinal.filter(row => !row.DataInicioFerias);
            if (pendentes.length === 0) break;
            
            console.log(`Tentativa ${tentativas + 1}: Processando ${pendentes.length} pendentes com ${Math.round(percentualAtual*100)}%...`);

            pendentes.sort((a, b) => {
                const compare = (a.Unidade || "").localeCompare(b.Unidade || "") ||
                                a.NivelHierarquico - b.NivelHierarquico ||
                                (a.DataLimite || 0) - (b.DataLimite || 0);
                return compare;
            });
            
            let dataInicialTentativa = new Date(inicio);
            dataInicialTentativa.setDate(dataInicialTentativa.getDate() + (tentativas * 30));

            const { loteFinal } = processarDistribuicaoComCargo(
                pendentes, dias, percentualAtual, dataInicialTentativa, loteAtual
            );
            
            loteAtual = loteFinal;
            percentualAtual = Math.min(1.0, percentualAtual + 0.1); // Aumenta 10%
            tentativas++;
        }

        // --- Pós-processamento e Atualização da UI ---
        processedData = dfResultadoFinal;
        
        const estatisticasFinais = {
            total_colaboradores: dfResultadoFinal.length,
            colaboradores_com_ferias: dfResultadoFinal.filter(r => r.DataInicioFerias).length,
            colaboradores_ignorados: dfResultadoFinal.filter(r => !r.DataInicioFerias).length,
            tentativas_realizadas: tentativas,
            percentual_final_usado: percentualAtual
        };

        const ignoradosFinal = dfResultadoFinal
            .filter(r => !r.DataInicioFerias)
            .map(r => ({ ...r, Motivo: "Não foi possível alocar em 3 tentativas" }));

        updateStats(estatisticasFinais);
        updateVisualizations(processedData, percentual);
        updateCronograma(processedData);
        updateExceptions(ignoradosFinal);

        alert("Distribuição de férias concluída! Verifique os resultados nas seções abaixo.");
    }

    // --- Funções de Atualização da UI e Visualização ---

    function updateStats(stats) {
        statsMetrics.innerHTML = `
            <p><strong>Colaboradores Processados:</strong> ${stats.total_colaboradores}</p>
            <p><strong>✅ Com Férias Agendadas:</strong> ${stats.colaboradores_com_ferias}</p>
            <p><strong>⚠️ Sem Agendamento:</strong> ${stats.colaboradores_ignorados}</p>
            <p><strong>⚙️ Tentativas Realizadas:</strong> ${stats.tentativas_realizadas}</p>
        `;
        const taxaSucesso = stats.total_colaboradores > 0 ? (stats.colaboradores_com_ferias / stats.total_colaboradores) * 100 : 0;
        successRate.innerHTML = `
            <h3>Taxa de Sucesso do Agendamento</h3>
            <div style="background: #e0e0e0; border-radius: 5px; overflow: hidden;">
                <div style="width: ${taxaSucesso.toFixed(1)}%; background: #4CAF50; color: white; text-align: center; padding: 5px;">
                    ${taxaSucesso.toFixed(1)}%
                </div>
            </div>
        `;
    }

    function criarGrafico(divId, data, layout) {
        const div = document.getElementById(divId);
        if (!div) return;
        Plotly.newPlot(div, data, layout, { responsive: true });
    }
    
    function updateVisualizations(data, percentual) {
        const agendados = data.filter(r => r.DataInicioFerias);
        if (agendados.length === 0) {
            document.getElementById('tab1').innerHTML = "<p>Nenhum dado para exibir.</p>";
            document.getElementById('tab2').innerHTML = "<p>Nenhum dado para exibir.</p>";
            document.getElementById('tab3').innerHTML = "<p>Nenhum dado para exibir.</p>";
            return;
        }

        // Lógica de agrupamento para gráficos
        const agruparPorChave = (dados, chave, chaveData) => {
            return dados.reduce((acc, row) => {
                const data = new Date(row[chaveData]);
                const periodo = `${data.getMonth() + 1}/${data.getFullYear()}`;
                const grupo = row[chave] || "N/A";
                if (!acc[grupo]) acc[grupo] = {};
                acc[grupo][periodo] = (acc[grupo][periodo] || 0) + 1;
                return acc;
            }, {});
        };

        const todosPeriodos = [...new Set(agendados.map(r => {
            const d = new Date(r.DataInicioFerias);
            return `${d.getMonth() + 1}/${d.getFullYear()}`;
        }))].sort((a, b) => {
            const [mA, yA] = a.split('/').map(Number);
            const [mB, yB] = b.split('/').map(Number);
            return yA - yB || mA - mB;
        });

        // Gráfico por Unidade
        const dadosPorUnidade = agruparPorChave(agendados, 'Unidade', 'DataInicioFerias');
        const tracesUnidade = Object.keys(dadosPorUnidade).map(unidade => ({
            x: todosPeriodos,
            y: todosPeriodos.map(p => dadosPorUnidade[unidade][p] || 0),
            name: unidade,
            type: 'bar'
        }));
        criarGrafico('tab1', tracesUnidade, { title: 'Distribuição de Férias por Unidade', barmode: 'stack', xaxis: {title: 'Mês/Ano'}, yaxis: {title: 'Nº Colaboradores'} });

        // Gráfico por Cargo
        const dadosPorCargo = agruparPorChave(agendados.map(r => ({...r, NivelHierarquico: {1: "Alta Gestão", 2: "Média Gestão", 3: "Operacional"}[r.NivelHierarquico]})), 'NivelHierarquico', 'DataInicioFerias');
        const tracesCargo = Object.keys(dadosPorCargo).map(nivel => ({
            x: todosPeriodos,
            y: todosPeriodos.map(p => dadosPorCargo[nivel][p] || 0),
            name: nivel,
            type: 'bar'
        }));
        criarGrafico('tab2', tracesCargo, { title: 'Distribuição por Nível Hierárquico', barmode: 'stack', xaxis: {title: 'Mês/Ano'}, yaxis: {title: 'Nº Colaboradores'} });

        // Gráfico Real vs Limite
        const totalPorUnidade = data.reduce((acc, row) => ({...acc, [row.Unidade]: (acc[row.Unidade] || 0) + 1 }), {});
        const tracesRealLimite = [];
        Object.keys(dadosPorUnidade).forEach(unidade => {
            const limite = Math.max(1, Math.floor(totalPorUnidade[unidade] * percentual));
            tracesRealLimite.push({
                x: todosPeriodos,
                y: todosPeriodos.map(p => dadosPorUnidade[unidade][p] || 0),
                name: `Real (${unidade})`,
                type: 'bar'
            });
            tracesRealLimite.push({
                x: todosPeriodos,
                y: Array(todosPeriodos.length).fill(limite),
                name: `Limite (${unidade})`,
                type: 'scatter',
                mode: 'lines',
                line: {dash: 'dot'}
            });
        });
        criarGrafico('tab3', tracesRealLimite, { title: 'Real vs. Limite por Unidade', barmode: 'group', xaxis: {title: 'Mês/Ano'}, yaxis: {title: 'Nº Colaboradores'} });

        // Análise de Datas Limite
        const { grafico } = criarAnaliseDatasLimite(data);
        analysisResults.innerHTML = ''; // Limpa
        if(grafico){
            const divGrafico = document.createElement('div');
            analysisResults.appendChild(divGrafico);
            Plotly.newPlot(divGrafico, grafico.data, grafico.layout, { responsive: true });
        }
    }
    
    function criarAnaliseDatasLimite(df) {
        if (!df || df.length === 0) return {grafico: null};

        const dfValido = df.filter(row => row.DataLimite);
        if (dfValido.length === 0) return {grafico: null};
        
        const analise = agruparPorChave(dfValido, 'Unidade', 'DataLimite');
        const todosPeriodos = [...new Set(dfValido.map(r => {
            const d = new Date(r.DataLimite);
            return `${d.getMonth() + 1}/${d.getFullYear()}`;
        }))].sort((a, b) => {
            const [mA, yA] = a.split('/').map(Number);
            const [mB, yB] = b.split('/').map(Number);
            return yA - yB || mA - mB;
        });

        const traces = Object.keys(analise).map(unidade => ({
            x: todosPeriodos,
            y: todosPeriodos.map(p => analise[unidade][p] || 0),
            name: unidade,
            type: 'bar'
        }));

        const layout = {
            title: "Distribuição de Datas Limite por Período e Unidade",
            xaxis: { title: "Mês/Ano da Data Limite" },
            yaxis: { title: "Número de Colaboradores" },
            barmode: 'stack',
        };

        return { grafico: { data: traces, layout: layout } };
    }

    function updateCronograma(data) {
        if (!data || data.length === 0) {
            cronogramaTable.innerHTML = "<p>Nenhum dado para exibir.</p>";
            cronogramaInfo.innerHTML = "";
            return;
        }
        
        const colunas = ["Nome", "CentroCustoCompleto", "Unidade", "Cargo", "DataLimite", "DataInicioFerias", "DataFimFerias", "Lote"];
        const formatarData = (d) => d ? new Date(d).toLocaleDateString("pt-BR") : "---";

        let tableHtml = `<table><thead><tr>${colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
        data.forEach(row => {
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
        tableHtml += "</tbody></table>";
        cronogramaTable.innerHTML = tableHtml;
        cronogramaInfo.innerHTML = `<p>Exibindo ${data.length} registros.</p>`;
    }

    function updateExceptions(ignored) {
        if (!ignored || ignored.length === 0) {
            exceptionsTable.innerHTML = "<p>✅ Nenhuma exceção. Todos os colaboradores selecionados foram alocados.</p>";
            exceptionsMotives.innerHTML = "";
            return;
        }

        const colunas = ["Nome", "CentroCustoCompleto", "Unidade", "Cargo", "DataLimite", "Motivo"];
        let tableHtml = `<table><thead><tr>${colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
        ignored.forEach(row => {
             tableHtml += `<tr>
                <td>${row.Nome || ''}</td>
                <td>${row.CentroCustoCompleto || ''}</td>
                <td>${row.Unidade || ''}</td>
                <td>${row.Cargo || 'N/A'}</td>
                <td>${row.DataLimite ? new Date(row.DataLimite).toLocaleDateString("pt-BR") : 'N/A'}</td>
                <td>${row.Motivo || '-'}</td>
            </tr>`;
        });
        tableHtml += "</tbody></table>";
        exceptionsTable.innerHTML = tableHtml;

        const motivos = ignored.reduce((acc, row) => ({...acc, [row.Motivo]: (acc[row.Motivo] || 0) + 1}), {});
        exceptionsMotives.innerHTML = "<p><strong>Principais motivos:</strong></p><ul>" +
            Object.entries(motivos).map(([motivo, count]) => `<li><strong>${motivo}:</strong> ${count}</li>`).join('') +
            "</ul>";
    }

    function exportData() {
        if (!processedData) {
            alert("Nenhum dado processado para exportar.");
            return;
        }
        const dataExport = processedData.map(row => ({
            Nome: row.Nome,
            Centro_Custo_Completo: row.CentroCustoCompleto,
            Codigo_Custo: row.CodigoCusto,
            Celula_Central: row.CelulaCentral,
            Unidade: row.Unidade,
            Cargo: row.Cargo,
            Data_Limite: row.DataLimite ? new Date(row.DataLimite).toLocaleDateString("pt-BR") : "",
            Data_Inicio_Ferias: row.DataInicioFerias ? new Date(row.DataInicioFerias).toLocaleDateString("pt-BR") : "",
            Data_Fim_Ferias: row.DataFimFerias ? new Date(row.DataFimFerias).toLocaleDateString("pt-BR") : "",
            Lote: row.Lote,
        }));

        const ws = XLSX.utils.json_to_sheet(dataExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cronograma_Ferias");
        XLSX.writeFile(wb, `cronograma_ferias_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
});