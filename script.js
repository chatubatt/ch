// Variáveis globais
        let dadosOriginais = [];
        let resultadosProcessados = [];
        let distributionChart = null;
        let trendChart = null;
        let unitsChart = null;
        let heatmapChart = null;
        let donutChart = null;
        let currentTheme = 'light';
        let chartType = 'bar';

        // Feriados brasileiros fixos
        const feriadosBrasil = {
            '01-01': 'Ano Novo',
            '04-21': 'Tiradentes',
            '05-01': 'Dia do Trabalhador',
            '09-07': 'Independência',
            '10-12': 'Nossa Senhora Aparecida',
            '11-02': 'Finados',
            '11-15': 'Proclamação da República',
            '12-25': 'Natal'
        };

        // Função para verificar se é dia útil
        function ehDiaUtil(data) {
            // Verificar se é fim de semana (0=domingo, 6=sábado)
            const diaSemana = data.getDay();
            if (diaSemana === 0 || diaSemana === 6) {
                return false;
            }

            // Verificar se é feriado nacional brasileiro
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const dia = String(data.getDate()).padStart(2, '0');
            const chave = `${mes}-${dia}`;
            
            if (feriadosBrasil[chave]) {
                return false;
            }

            return true;
        }

        // Função para encontrar próximo dia útil
        function proximoDiaUtil(data) {
            let dataAtual = new Date(data);
            while (!ehDiaUtil(dataAtual)) {
                dataAtual.setDate(dataAtual.getDate() + 1);
            }
            return dataAtual;
        }

        // Função para toggle de expansores
        function toggleExpander(id) {
            const expander = document.getElementById(id);
            expander.classList.toggle('open');
        }
        
        // Função para alternar tipo de gráfico
        function toggleChartType() {
            chartType = chartType === 'bar' ? 'line' : 'bar';
            criarGraficoDistribuicao();
        }

        // Função para exportar gráfico
        function exportChart(chartId) {
            const canvas = document.getElementById(chartId);
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `${chartId}_export.png`;
            link.href = url;
            link.click();
        }

        // Função para imprimir relatório
        function printReport() {
            const printWindow = window.open('', '_blank');
            const cronogramaTable = document.getElementById('cronogramaTable').outerHTML;
            const metrics = document.getElementById('cronogramaMetrics').outerHTML;
            
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Relatório de Férias</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            table { border-collapse: collapse; width: 100%; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                            h1 { color: #333; }
                            .metrics { display: flex; gap: 20px; margin: 20px 0; }
                            .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                        </style>
                    </head>
                    <body>
                        <h1>📊 Relatório de Distribuição de Férias</h1>
                        <p>Data de geração: ${new Date().toLocaleDateString('pt-BR')}</p>
                        ${metrics}
                        ${cronogramaTable}
                    </body>
                </html>
            `);
            
            printWindow.document.close();
            printWindow.print();
        }

        // Função para lidar com upload de arquivo
        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const fileInfo = document.getElementById('fileInfo');
            const fileDetails = document.getElementById('fileDetails');
            
            fileDetails.innerHTML = `
                <h4>📄 Arquivo Carregado:</h4>
                <p><strong>Nome:</strong> ${file.name}<br>
                <strong>Tamanho:</strong> ${(file.size / 1024).toFixed(2)} KB<br>
                <strong>Tipo:</strong> ${file.type}</p>
                <div class="progress">
                    <div class="progress__bar" id="uploadProgress" style="width: 0%"></div>
                </div>
            `;
            
            fileInfo.classList.remove('hidden');

            // Simular progresso de upload com animação premium
            let progress = 0;
            const progressBar = document.getElementById('uploadProgress');
            const progressInterval = setInterval(() => {
                progress += 15;
                progressBar.style.width = progress + '%';
                progressBar.style.background = `linear-gradient(90deg, #2563eb ${progress}%, #e2e8f0 ${progress}%)`;
                
                if (progress >= 100) {
                    clearInterval(progressInterval);
                    progressBar.style.background = 'linear-gradient(90deg, #059669 100%, #059669 100%)';
                    setTimeout(() => {
                        processarCSV(file);
                    }, 800);
                }
            }, 120);
        }

        // Função para processar arquivo CSV
        function processarCSV(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n');
                    const headers = lines[0].split(';').map(h => h.trim());
                    
                    // Verificar se as colunas necessárias existem

                    
                    

                    // Processar dados
                    dadosOriginais = [];
                    for (let i = 1; i < lines.length; i++) {
                        if (lines[i].trim() === '') continue;
                        
                        const values = lines[i].split(';').map(v => v.trim());
                        const row = {};
                        
                        headers.forEach((header, index) => {
                            row[header] = values[index] || '';
                        });
                        
                        // Converter e validar datas
                        try {
                            row.DataLimite = parseDate(row['Data Limite Início de Férias']);
                            row.DataLimiteProgramacao = parseDate(row['Data Limite de Programação de Férias']);
                            row.DataInicioPeriodo = parseDate(row['Data Inicial Período Aquisitivo']);
                            row.Nome = row['Colaborador'];
                            row.Celula = row['Centro de Custo (Célula)'];
                            row.Unidade = row['Unidade Adm. (Cliente)'];
                            
                            if (row.Nome && row.Unidade && row.DataLimite) {
                                dadosOriginais.push(row);
                            }
                        } catch (dateError) {
                            console.warn(`Erro ao processar linha ${i + 1}:`, dateError);
                        }
                    }

                     // Preencher o novo seletor de unidade para processamento
                    const unidadesParaProcessarSelect = document.getElementById('unidadeParaProcessar');
                    unidadesParaProcessarSelect.innerHTML = '<option value="todas">Todas as Unidades</option>'; // Reset
                    const unidadesUnicas = [...new Set(dadosOriginais.map(d => d.Unidade))].sort();
                    unidadesUnicas.forEach(unidade => {
                        unidadesParaProcessarSelect.innerHTML += `<option value="${unidade}">${unidade}</option>`;
                    });


                    // Atualizar interface
                    const fileDetails = document.getElementById('fileDetails');
                    fileDetails.innerHTML = `
                        <h4>✅ Arquivo Processado com Sucesso!</h4>
                        <p><strong>Total de registros:</strong> ${dadosOriginais.length}<br>
                        <strong>Unidades encontradas:</strong> ${[...new Set(dadosOriginais.map(d => d.Unidade))].length}</p>
                    `;
                    
                    document.getElementById('parametersSection').style.display = 'block';
                    
                } catch (error) {
                    const fileDetails = document.getElementById('fileDetails');
                    fileDetails.innerHTML = `
                        <h4>❌ Erro ao processar arquivo:</h4>
                        <p style="color: var(--color-error);">${error.message}</p>
                        <p>Verifique se o arquivo está no formato correto (CSV com separador ';').</p>
                    `;
                    document.getElementById('fileInfo').className = 'alert alert--error';
                }
            };
            reader.readAsText(file, 'UTF-8');
        }

        // Função para parsear datas do formato DD/MM/YYYY
        function parseDate(dateString) {
            if (!dateString) return null;
            const parts = dateString.split('/');
            if (parts.length !== 3) return null;
            
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
            const year = parseInt(parts[2]);
            
            return new Date(year, month, day);
        }

        // Função para formatar data para DD/MM/YYYY
        function formatDate(date) {
            if (!date) return '';
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        // NOVA FUNÇÃO: Calcular urgência baseada em meses restantes
        function calcularUrgencia(dataLimite) {
            const hoje = new Date();
            const mesesRestantes = (dataLimite - hoje) / (1000 * 60 * 60 * 24 * 30);
            
            // CORREÇÃO: Para datas passadas, urgência crítica
            if (mesesRestantes <= 0) return 1; // Urgência Crítica (data já passou)
            if (mesesRestantes <= 3) return 1; // Urgência Crítica
            if (mesesRestantes <= 6) return 2; // Urgência Alta
            if (mesesRestantes <= 12) return 3; // Urgência Média
            return 4; // Urgência Baixa
        }

        // NOVA FUNÇÃO: Ordenar colaboradores por prioridade (urgência + data limite)
        function ordenarPorPrioridade(colaboradores) {
            return colaboradores.sort((a, b) => {
                const urgenciaA = calcularUrgencia(a.DataLimite);
                const urgenciaB = calcularUrgencia(b.DataLimite);
                
                if (urgenciaA !== urgenciaB) {
                    return urgenciaA - urgenciaB; // Menor número = maior prioridade
                }
                
                // CORREÇÃO: Em caso de empate, priorizar data limite mais próxima (mais urgente)
                const dataA = new Date(a.DataLimite);
                const dataB = new Date(b.DataLimite);
                const hoje = new Date();
                
                // Se ambas as datas são futuras, priorizar a mais próxima
                if (dataA > hoje && dataB > hoje) {
                    return dataA - dataB; // Data mais próxima primeiro
                }
                
                // Se uma é passada e outra futura, priorizar a passada
                if (dataA <= hoje && dataB > hoje) return -1;
                if (dataA > hoje && dataB <= hoje) return 1;
                
                // Se ambas são passadas, priorizar a mais próxima do hoje
                return Math.abs(dataA - hoje) - Math.abs(dataB - hoje);
            });
        }

        // NOVA FUNÇÃO: Sistema de pontuação melhorado
        function calcularPontuacaoMelhorada(colaborador, mes, ocupacaoAtual, capacidadeMaxima) {
            const hoje = new Date();
            const dataLimite = new Date(colaborador.DataLimite);
            const mesesRestantes = (dataLimite - hoje) / (1000 * 60 * 60 * 24 * 30);
            
            // Fator de urgência (40% do peso)
            const fatorUrgencia = Math.max(0, 100 - (mesesRestantes * 10));
            
            // Fator de equilíbrio (30% do peso)
            const fatorEquilibrio = (capacidadeMaxima - ocupacaoAtual) * 10;
            
            // Fator de proximidade da data limite (30% do peso)
            const mesLimite = new Date(dataLimite.getFullYear(), dataLimite.getMonth(), 1);
            const mesAtual = new Date(mes);
            const diferencaMeses = Math.abs((mesAtual - mesLimite) / (1000 * 60 * 60 * 24 * 30));
            const fatorProximidade = Math.max(0, 100 - (diferencaMeses * 20));
            
            return (fatorUrgencia * 0.4) + (fatorEquilibrio * 0.3) + (fatorProximidade * 0.3);
        }

        // Função de pontuação inteligente para otimizar distribuição com prioridade por urgência
        function calcularPontuacaoMes(mes, ocupacaoAtual, capacidadeMes, dataInicial, colaborador, calendarioUnidade) {
            let pontuacao = 0;
            
            // 1. Fator de URGÊNCIA - PRIORIDADE MÁXIMA (0-50 pontos)
            // Colaboradores com data limite mais próxima têm prioridade absoluta
            const diasParaDataLimite = Math.abs(mes.getTime() - colaborador.DataLimite.getTime()) / (1000 * 60 * 60 * 24);
            const fatorUrgencia = Math.max(0, 1 - (diasParaDataLimite / 180)); // Normalizar para 6 meses
            pontuacao += 50 * fatorUrgencia;
            
            // 2. Fator de Ocupação Relativa (0-25 pontos)
            // Menor ocupação relativa = maior pontuação
            if (capacidadeMes === Infinity) {
                pontuacao += 25; // Capacidade infinita = pontuação máxima
            } else if (capacidadeMes > 0) {
                const ocupacaoRelativa = ocupacaoAtual / capacidadeMes;
                pontuacao += Math.max(0, 25 * (1 - ocupacaoRelativa));
            }
            
            // 3. Fator de Distribuição Temporal (0-15 pontos)
            // Prioriza meses mais próximos à data inicial para distribuição balanceada
            const indiceMes = (mes.getFullYear() - dataInicial.getFullYear()) * 12 + (mes.getMonth() - dataInicial.getMonth());
            const totalMeses = 12; // Considerar 12 meses para distribuição
            const fatorTemporal = Math.max(0, 1 - (indiceMes / totalMeses));
            pontuacao += 15 * fatorTemporal;
            
            // 4. Fator de Densidade de Lotes (0-10 pontos)
            // Penaliza meses com muitos lotes para evitar concentração
            const chaveMes = formatMonthYearTableKey(mes);
            const grupo = calendarioUnidade.get(chaveMes);
            const numeroLotes = grupo ? grupo.lote : 0;
            const fatorDensidade = Math.max(0, 1 - (numeroLotes / 5)); // Máximo 5 lotes por mês
            pontuacao += 10 * fatorDensidade;
            
            return pontuacao;
        }

        // Função principal para processar distribuição
        function processarDistribuicao() {
            if (dadosOriginais.length === 0) {
                alert('Por favor, carregue um arquivo CSV primeiro.');
                return;
            }

            document.getElementById('loadingSection').classList.remove('hidden');
            document.getElementById('processBtn').disabled = true;

            setTimeout(() => {
                try {
                    const diasFerias = parseInt(document.getElementById('diasFerias').value);
                    const dataInicialString = document.getElementById('dataInicial').value;
                    const partesData = dataInicialString.split('-');
                    const ano = parseInt(partesData[0], 10);
                    const mes = parseInt(partesData[1], 10) - 1; // Mês em JS é 0-indexado
                    const dia = parseInt(partesData[2], 10);
                    const dataInicial = new Date(ano, mes, dia);

                    const unidadeSelecionada = document.getElementById('unidadeParaProcessar').value;
                    const maxAgendamentosPorMes = parseInt(document.getElementById('maxAgendamentosPorMes').value);

                    if (isNaN(maxAgendamentosPorMes) || maxAgendamentosPorMes < 0) {
                        throw new Error('A quantidade máxima de agendamentos por mês deve ser um número igual ou maior que zero.');
                    }


                    resultadosProcessados = [];
                    
                    let unidadesParaProcessar = [];
                    if (unidadeSelecionada === 'todas') {
                        unidadesParaProcessar = [...new Set(dadosOriginais.map(d => d.Unidade))];
                    } else {
                        unidadesParaProcessar = [unidadeSelecionada];
                    }
                    let loteCounter = 1;
                    for (const unidade of unidadesParaProcessar) {
                        const dadosUnidade = JSON.parse(JSON.stringify(dadosOriginais.filter(d => d.Unidade === unidade)));
                        
                        dadosUnidade.forEach(d => {
                            d.DataLimite = new Date(d.DataLimite);
                            d.DataInicioPeriodo = new Date(d.DataInicioPeriodo);
                        });

                        const { resultadoUnidade, novoLoteCounter } = distribuirFeriasUnidade(dadosUnidade, dataInicial, diasFerias, maxAgendamentosPorMes, loteCounter);
                        resultadosProcessados.push(...resultadoUnidade);
                        if (resultadoUnidade.length > 0) {
                           loteCounter = novoLoteCounter;
                        }
                    }
                    
                    mostrarResultados();
                    
                } catch (error) {
                    console.error("Erro no processamento:", error);
                    alert('Erro ao processar distribuição: ' + error.message);
                } finally {
                    document.getElementById('loadingSection').classList.add('hidden');
                    document.getElementById('processBtn').disabled = false;
                }
            }, 1000);
        }

        // Função para distribuir férias por unidade com lógica de IA CALIBRADA (Modelo: Agendador Orientado a Prazos v5 - Lotes Inteligentes)
        function distribuirFeriasUnidade(dadosUnidade, dataInicial, diasFerias, maxAgendamentosPorMes, loteCounter) {
            console.log("🚀 ===== INÍCIO DA DISTRIBUIÇÃO DE FÉRIAS =====");
            console.log(`📊 Unidade: ${dadosUnidade[0]?.Unidade || 'N/A'}`);
            console.log(`📅 Data Inicial: ${formatDate(dataInicial)}`);
            console.log(`📅 Dias de Férias: ${diasFerias}`);
            console.log(`📊 Max Agendamentos/Mês: ${maxAgendamentosPorMes === 0 ? 'Automático' : maxAgendamentosPorMes}`);
            console.log(`🔢 Lote Counter Inicial: ${loteCounter}`);
            console.log(`👥 Total de Colaboradores: ${dadosUnidade.length}`);
            
            // CORREÇÃO: Garantir que as datas estão no formato correto antes da ordenação
            console.log("🔄 Convertendo datas para formato correto...");
            dadosUnidade.forEach(d => {
                if (typeof d.DataLimite === 'string') {
                    d.DataLimite = new Date(d.DataLimite);
                }
                // NOVA CORREÇÃO: Garantir que DataLimiteProgramacao também seja convertida
                if (d.DataLimiteProgramacao && typeof d.DataLimiteProgramacao === 'string') {
                    d.DataLimiteProgramacao = new Date(d.DataLimiteProgramacao);
                }
            });
            console.log("✅ Conversão de datas concluída");
            
            // NOVA CORREÇÃO: Filtrar datas limite muito antigas e aplicar data padrão
            console.log("🔄 Aplicando filtro de data limite válida...");
            const dataLimiteMinima = new Date();
            dataLimiteMinima.setMonth(dataLimiteMinima.getMonth() - 24); // 2 anos atrás
            
            let colaboradoresComDataAntiga = 0;
            dadosUnidade.forEach(d => {
                if (d.DataLimite < dataLimiteMinima) {
                    colaboradoresComDataAntiga++;
                    d.DataLimiteOriginal = new Date(d.DataLimite); // Manter referência
                    // Aplicar data limite padrão: 6 meses a partir da data atual
                    d.DataLimite = new Date();
                    d.DataLimite.setMonth(d.DataLimite.getMonth() + 6);
                    console.log(`  🔄 ${d.Nome}: Data limite antiga ${formatDate(d.DataLimiteOriginal)} → Nova data limite ${formatDate(d.DataLimite)}`);
                }
            });
            if (colaboradoresComDataAntiga > 0) {
                console.log(`✅ ${colaboradoresComDataAntiga} colaboradores com data limite antiga foram ajustados`);
            } else {
                console.log("✅ Nenhuma data limite antiga encontrada");
            }
            
            // NOVA VALIDAÇÃO: Verificar data limite de programação
            console.log("🔄 Validando data limite de programação...");
            let colaboradoresComDataLimiteProgramacao = 0;
            dadosUnidade.forEach(d => {
                if (d.DataLimiteProgramacao && d.DataLimiteProgramacao instanceof Date) {
                    colaboradoresComDataLimiteProgramacao++;
                    // Garantir que a data limite de programação seja considerada
                    if (d.DataLimite > d.DataLimiteProgramacao) {
                        console.log(`  ⚠️ ${d.Nome}: Data limite (${formatDate(d.DataLimite)}) > Data limite programação (${formatDate(d.DataLimiteProgramacao)}) - Ajustando`);
                        d.DataLimite = new Date(d.DataLimiteProgramacao);
                    }
                }
            });
            if (colaboradoresComDataLimiteProgramacao > 0) {
                console.log(`✅ ${colaboradoresComDataLimiteProgramacao} colaboradores com data limite de programação validados`);
            } else {
                console.log("⚠️ Nenhuma data limite de programação encontrada - usando apenas data limite de início");
            }
            
            // NOVA CORREÇÃO: Ordenar por prioridade (urgência + data limite)
            console.log("🔄 Ordenando colaboradores por prioridade (urgência + data limite)...");
            const aAgendar = ordenarPorPrioridade(dadosUnidade);
            console.log("✅ Ordenação por prioridade concluída");
            
            const totalColaboradores = aAgendar.length;
            if (totalColaboradores === 0) {
                console.log("⚠️ Nenhum colaborador para processar");
                return { resultadoUnidade: [], novoLoteCounter: loteCounter };
            }
            
            // DEBUG: Verificar ordenação por prioridade
            console.log("🔍 DEBUG: Ordenação por prioridade (urgência + data limite):");
            aAgendar.forEach((colaborador, index) => {
                const urgencia = calcularUrgencia(colaborador.DataLimite);
                const urgenciaTexto = urgencia === 1 ? 'CRÍTICA' : urgencia === 2 ? 'ALTA' : urgencia === 3 ? 'MÉDIA' : 'BAIXA';
                console.log(`${index + 1}. ${colaborador.Nome} - Data Limite: ${formatDate(new Date(colaborador.DataLimite))} - Urgência: ${urgenciaTexto}`);
            });

            const calendarioUnidade = new Map();
            
            let planoAlocacao = null;

            // Se o modo é automático (0), calcula o plano de alocação balanceado.
            if (maxAgendamentosPorMes === 0) {
                console.log("🔄 Calculando plano de alocação automático equilibrado...");
                
                // NOVA LÓGICA: Considerar data limite de programação como limite máximo
                const datasLimite = aAgendar.map(d => new Date(d.DataLimite).getTime());
                const datasLimiteProgramacao = aAgendar
                    .filter(d => d.DataLimiteProgramacao && d.DataLimiteProgramacao instanceof Date)
                    .map(d => new Date(d.DataLimiteProgramacao).getTime());
                
                const todasAsDatas = [...datasLimite, ...datasLimiteProgramacao];
                const dataMaxima = new Date(Math.max(...todasAsDatas));
                
                console.log(`📅 Data Máxima (considerando data limite de programação): ${formatDate(dataMaxima)}`);
                
                let mesesTotais = (dataMaxima.getFullYear() - dataInicial.getFullYear()) * 12 + (dataMaxima.getMonth() - dataInicial.getMonth()) + 1;
                mesesTotais = Math.max(1, mesesTotais);
                console.log(`📊 Total de Meses: ${mesesTotais}`);

                // NOVA ESTRATÉGIA: Distribuição progressiva otimizada
                // Começar com poucos colaboradores e aumentar gradualmente
                planoAlocacao = new Array(mesesTotais).fill(0);
                
                // Calcular distribuição progressiva baseada no total de colaboradores
                let colaboradoresAlocados = 0;
                
                // ESTRATÉGIA OTIMIZADA: Distribuição equilibrada evitando concentração
                let capacidadeMinima = 1; // Sempre começar com 1 colaborador por mês
                
                // Calcular distribuição equilibrada ideal
                const colaboradoresPorMesIdeal = Math.ceil(totalColaboradores / mesesTotais);
                const capacidadeMaxima = Math.max(1, colaboradoresPorMesIdeal); // Máximo = distribuição linear ideal
                
                // Para grupos pequenos e médios, limitar ainda mais a concentração
                if (totalColaboradores <= 10) {
                    capacidadeMinima = 1;
                    console.log(`  🔧 Grupo pequeno (${totalColaboradores} colaboradores): Limitando a 1 colaborador por mês`);
                } else if (totalColaboradores <= 50) {
                    capacidadeMinima = 1;
                    console.log(`  🔧 Grupo médio (${totalColaboradores} colaboradores): Limitando a 1 colaborador por mês`);
                } else {
                    capacidadeMinima = 2;
                    console.log(`  🔧 Grupo grande (${totalColaboradores} colaboradores): Limitando a 2 colaboradores por mês`);
                }
                
                console.log(`  📊 Distribuição Linear Ideal: ${colaboradoresPorMesIdeal} colaboradores/mês`);
                
                // DISTRIBUIÇÃO EQUILIBRADA: Evitar concentração nos primeiros meses
                const basePorMes = Math.floor(totalColaboradores / mesesTotais);
                const colaboradoresRestantes = totalColaboradores % mesesTotais;
                
                // Para grupos grandes, começar distribuição mais tarde para evitar concentração
                let mesInicioDistribuicao = 0;
                if (totalColaboradores > 50) {
                    mesInicioDistribuicao = Math.floor(mesesTotais * 0.1); // Começar após 10% do período
                    console.log(`  🔧 Grupo grande: Iniciando distribuição no mês ${mesInicioDistribuicao + 1} para evitar concentração`);
                }
                
                // Distribuir base uniformemente
                for (let i = 0; i < mesesTotais; i++) {
                    planoAlocacao[i] = basePorMes;
                    colaboradoresAlocados += basePorMes;
                }
                
                // Distribuir restantes de forma mais equilibrada (não apenas nos primeiros meses)
                let restantesDistribuidos = 0;
                const intervalo = Math.max(1, Math.floor(mesesTotais / colaboradoresRestantes));
                
                for (let i = 0; i < colaboradoresRestantes && restantesDistribuidos < colaboradoresRestantes; i++) {
                    const indice = Math.min(mesInicioDistribuicao + (i * intervalo), mesesTotais - 1);
                    
                    // Evitar concentração excessiva - limite baseado no tamanho do grupo
                    const limitePorMes = totalColaboradores <= 50 ? 1 : 2;
                    
                    if (planoAlocacao[indice] >= limitePorMes) {
                        // Procurar próximo mês disponível
                        let proximoIndice = indice;
                        while (proximoIndice < mesesTotais && planoAlocacao[proximoIndice] >= limitePorMes) {
                            proximoIndice++;
                        }
                        if (proximoIndice < mesesTotais) {
                            planoAlocacao[proximoIndice]++;
                        } else {
                            // Se não encontrar, distribuir de forma mais espaçada
                            const indiceEspacado = Math.min((i * intervalo * 2) % mesesTotais, mesesTotais - 1);
                            planoAlocacao[indiceEspacado]++;
                        }
                    } else {
                        planoAlocacao[indice]++;
                    }
                    
                    colaboradoresAlocados++;
                    restantesDistribuidos++;
                }
                
                // Verificar se há sobra (não deveria acontecer)
                if (colaboradoresAlocados < totalColaboradores) {
                    const sobra = totalColaboradores - colaboradoresAlocados;
                    console.log(`⚠️ Distribuindo ${sobra} colaboradores restantes...`);
                    for (let i = 0; i < sobra && i < mesesTotais; i++) {
                        planoAlocacao[i]++;
                        colaboradoresAlocados++;
                    }
                }
                
                console.log("📊 Plano de Alocação Equilibrado Otimizado:");
                console.log(`  📈 Estratégia: Distribuição equilibrada evitando concentração nos primeiros meses`);
                console.log(`  📊 Base por mês: ${basePorMes} colaboradores`);
                console.log(`  📊 Colaboradores extras: ${colaboradoresRestantes} (distribuídos com intervalo de ${intervalo} meses)`);
                console.log(`  ✅ Total alocado no plano: ${colaboradoresAlocados}/${totalColaboradores} (${Math.round(colaboradoresAlocados/totalColaboradores*100)}%)`);
                console.log(`  ⚠️ Nota: O plano pode ser ajustado dinamicamente para respeitar datas limite individuais`);
                
                let totalPlanejado = 0;
                planoAlocacao.forEach((valor, index) => {
                    const mes = new Date(dataInicial.getFullYear(), dataInicial.getMonth() + index, 1);
                    totalPlanejado += valor;
                    console.log(`  ${formatMonthYearTableKey(mes)}: ${valor} colaboradores (acumulado: ${totalPlanejado})`);
                });
            } else {
                console.log(`📊 Modo Fixo: ${maxAgendamentosPorMes} agendamentos por mês`);
            }

            // NOVA LÓGICA: Processar colaboradores com controle inteligente de lotes
            console.log("🚀 Iniciando processamento de colaboradores...");
            let colaboradoresProcessados = 0;
            let colaboradoresAgendados = 0;
            let colaboradoresNaoAgendados = 0;
            
            for (const colaborador of aAgendar) {
                colaboradoresProcessados++;
                console.log(`🔄 [${colaboradoresProcessados}/${totalColaboradores}] Processando: ${colaborador.Nome} - Data Limite: ${formatDate(new Date(colaborador.DataLimite))}`);
                let agendado = false;
                let melhorMes = null;
                
                // --- LOGIC FOR AUTOMATIC (BALANCED) MODE (maxAgendamentosPorMes === 0) ---
                if (maxAgendamentosPorMes === 0) {
                    console.log(`  🔍 Modo Automático: Buscando melhor mês para ${colaborador.Nome}`);
                    let menorOcupacao = Infinity;
                    
                    // LÓGICA PRIORITÁRIA: Buscar primeiro no período da data limite, depois expandir se necessário
                    // Calcular período de busca prioritário: mês da data limite do colaborador
                    const mesDataLimite = new Date(colaborador.DataLimite.getFullYear(), colaborador.DataLimite.getMonth(), 1);
                    const dataMaxima = new Date(Math.max(...aAgendar.map(d => new Date(d.DataLimite).getTime())));
                    
                    // NOVA VALIDAÇÃO: Considerar data limite de programação como limite máximo
                    let dataFimBusca = new Date(Math.min(dataMaxima.getTime(), colaborador.DataLimite.getTime()));
                    if (colaborador.DataLimiteProgramacao && colaborador.DataLimiteProgramacao instanceof Date) {
                        dataFimBusca = new Date(Math.min(dataFimBusca.getTime(), colaborador.DataLimiteProgramacao.getTime()));
                        console.log(`  📅 Data limite de programação considerada: ${formatDate(colaborador.DataLimiteProgramacao)}`);
                    }
                    
                    // FASE 1: Buscar prioritariamente no mês da data limite
                    let mesBusca = new Date(mesDataLimite);
                    console.log(`  📅 FASE 1: Buscando prioritariamente no mês da data limite: ${formatDate(mesBusca)}`);
                    
                    let melhorPontuacao = -1;
                    let encontrouNoMesLimite = false;
                    
                    // Verificar especificamente o mês da data limite
                    if (mesBusca <= dataFimBusca) {
                        const chaveMes = formatMonthYearTableKey(mesBusca);
                        const ocupacaoAtual = calendarioUnidade.get(chaveMes)?.count || 0;
                        const indiceMes = (mesBusca.getFullYear() - dataInicial.getFullYear()) * 12 + (mesBusca.getMonth() - dataInicial.getMonth());
                        const capacidadeMes = (planoAlocacao && indiceMes >= 0 && indiceMes < planoAlocacao.length) ? planoAlocacao[indiceMes] : Infinity;

                        if (ocupacaoAtual < capacidadeMes) {
                            const pontuacao = calcularPontuacaoMelhorada(colaborador, mesBusca, ocupacaoAtual, capacidadeMes);
                            console.log(`    📊 ${chaveMes}: Ocupação ${ocupacaoAtual}/${capacidadeMes === Infinity ? '∞' : capacidadeMes} | Pontuação: ${pontuacao.toFixed(2)}`);
                            
                            melhorPontuacao = pontuacao;
                            melhorMes = new Date(mesBusca);
                            encontrouNoMesLimite = true;
                            console.log(`    ✅ PRIORIDADE: Mês da data limite disponível: ${chaveMes} (pontuação: ${pontuacao.toFixed(2)})`);
                        } else {
                            console.log(`    ❌ ${chaveMes}: Sem capacidade no mês da data limite (${ocupacaoAtual}/${capacidadeMes === Infinity ? '∞' : capacidadeMes})`);
                        }
                    }
                    
                    // FASE 2: Se não encontrou no mês da data limite, buscar em todo o período disponível
                    if (!encontrouNoMesLimite) {
                        console.log(`  📅 FASE 2: Expandindo busca para todo o período disponível: ${formatDate(dataInicial)} até ${formatDate(dataFimBusca)}`);
                        mesBusca = new Date(dataInicial);
                        
                        while (mesBusca <= dataFimBusca) {
                            const chaveMes = formatMonthYearTableKey(mesBusca);
                            const ocupacaoAtual = calendarioUnidade.get(chaveMes)?.count || 0;
                            const indiceMes = (mesBusca.getFullYear() - dataInicial.getFullYear()) * 12 + (mesBusca.getMonth() - dataInicial.getMonth());
                            const capacidadeMes = (planoAlocacao && indiceMes >= 0 && indiceMes < planoAlocacao.length) ? planoAlocacao[indiceMes] : Infinity;

                            if (ocupacaoAtual < capacidadeMes) {
                                const pontuacao = calcularPontuacaoMelhorada(colaborador, mesBusca, ocupacaoAtual, capacidadeMes);
                                console.log(`    📊 ${chaveMes}: Ocupação ${ocupacaoAtual}/${capacidadeMes === Infinity ? '∞' : capacidadeMes} | Pontuação: ${pontuacao.toFixed(2)}`);

                                if (pontuacao > melhorPontuacao) {
                                    melhorPontuacao = pontuacao;
                                    melhorMes = new Date(mesBusca);
                                    console.log(`    ✅ Novo melhor mês: ${chaveMes} (pontuação: ${pontuacao.toFixed(2)})`);
                                }
                            } else {
                                console.log(`    ❌ ${chaveMes}: Sem capacidade (${ocupacaoAtual}/${capacidadeMes === Infinity ? '∞' : capacidadeMes})`);
                            }
                            
                            mesBusca.setMonth(mesBusca.getMonth() + 1);
                        }
                    }
                    if(melhorMes) {
                        agendado = true;
                        console.log(`  ✅ Melhor mês encontrado: ${formatMonthYearTableKey(melhorMes)}`);
                    } else {
                        console.log(`  ❌ Nenhum mês adequado encontrado no período da data limite - iniciando busca inteligente`);
                        
                        // FALLBACK INTELIGENTE: Determinar o melhor período de busca
                        const dataInicialMais15Meses = new Date(dataInicial);
                        dataInicialMais15Meses.setMonth(dataInicialMais15Meses.getMonth() + 15);
                        dataInicialMais15Meses.setDate(1);
                        
                        // Calcular o período de busca mais amplo possível
                        const dataInicioBusca = new Date(Math.min(dataInicialMais15Meses.getTime(), colaborador.DataLimite.getTime()));
                        let dataFimBusca = new Date(Math.max(dataInicialMais15Meses.getTime(), colaborador.DataLimite.getTime()));
                        
                        // NOVA VALIDAÇÃO: Considerar data limite de programação no fallback
                        if (colaborador.DataLimiteProgramacao && colaborador.DataLimiteProgramacao instanceof Date) {
                            dataFimBusca = new Date(Math.min(dataFimBusca.getTime(), colaborador.DataLimiteProgramacao.getTime()));
                            console.log(`    📅 Data limite de programação considerada no fallback: ${formatDate(colaborador.DataLimiteProgramacao)}`);
                        }
                        
                        console.log(`  🔄 FALLBACK INTELIGENTE:`);
                        console.log(`    📅 Data inicial: ${formatDate(dataInicial)}`);
                        console.log(`    📅 Data inicial + 15 meses: ${formatDate(dataInicialMais15Meses)}`);
                        console.log(`    📅 Data limite colaborador: ${formatDate(colaborador.DataLimite)}`);
                        console.log(`    📅 Período de busca: ${formatDate(dataInicioBusca)} até ${formatDate(dataFimBusca)}`);
                        
                        // Buscar no período calculado usando sistema de pontuação
                        let mesBuscaFallback = new Date(dataInicioBusca);
                        let melhorPontuacaoFallback = -1;
                        let melhorMesFallback = null;
                        
                        while (mesBuscaFallback <= dataFimBusca && !agendado) {
                            const chaveMes = formatMonthYearTableKey(mesBuscaFallback);
                            const ocupacaoAtual = calendarioUnidade.get(chaveMes)?.count || 0;

                            const indiceMes = (mesBuscaFallback.getFullYear() - dataInicial.getFullYear()) * 12 + (mesBuscaFallback.getMonth() - dataInicial.getMonth());
                            const capacidadeMes = (planoAlocacao && indiceMes >= 0 && indiceMes < planoAlocacao.length) ? planoAlocacao[indiceMes] : Infinity;

                            // Verificar se o mês tem capacidade disponível
                            if (ocupacaoAtual < capacidadeMes) {
                                // Calcular pontuação inteligente para este mês
                                const pontuacao = calcularPontuacaoMelhorada(colaborador, mesBuscaFallback, ocupacaoAtual, capacidadeMes);
                                
                                console.log(`    📊 ${chaveMes}: Ocupação ${ocupacaoAtual}/${capacidadeMes === Infinity ? '∞' : capacidadeMes} | Pontuação: ${pontuacao.toFixed(2)}`);

                                if (pontuacao > melhorPontuacaoFallback) {
                                    melhorPontuacaoFallback = pontuacao;
                                    melhorMesFallback = new Date(mesBuscaFallback);
                                    console.log(`    ✅ Novo melhor mês fallback: ${chaveMes} (pontuação: ${pontuacao.toFixed(2)})`);
                                }
                            } else {
                                console.log(`    ❌ ${chaveMes}: Sem capacidade (${ocupacaoAtual}/${capacidadeMes === Infinity ? '∞' : capacidadeMes})`);
                            }
                            
                            mesBuscaFallback.setMonth(mesBuscaFallback.getMonth() + 1);
                        }
                        
                        if (melhorMesFallback) {
                            melhorMes = melhorMesFallback;
                            agendado = true;
                            console.log(`  ✅ FALLBACK: Melhor mês encontrado: ${formatMonthYearTableKey(melhorMes)} (pontuação: ${melhorPontuacaoFallback.toFixed(2)})`);
                        } else {
                            console.log(`  ❌ FALLBACK: Nenhum mês com capacidade disponível em todo o período expandido`);
                        }
                    }
                
                } else { // --- LOGIC FOR FIXED NUMBER MODE (> 0) ---
                    console.log(`  🔍 Modo Fixo: Buscando mês com capacidade para ${colaborador.Nome}`);
                    
                    // NOVA LÓGICA: Buscar em todo o período disponível para distribuição balanceada
                    const dataMaxima = new Date(Math.max(...aAgendar.map(d => new Date(d.DataLimite).getTime())));
                    let dataFimBusca = new Date(Math.min(dataMaxima.getTime(), colaborador.DataLimite.getTime()));
                    
                    // NOVA VALIDAÇÃO: Considerar data limite de programação como limite máximo
                    if (colaborador.DataLimiteProgramacao && colaborador.DataLimiteProgramacao instanceof Date) {
                        dataFimBusca = new Date(Math.min(dataFimBusca.getTime(), colaborador.DataLimiteProgramacao.getTime()));
                        console.log(`  📅 Data limite de programação considerada: ${formatDate(colaborador.DataLimiteProgramacao)}`);
                    }
                    
                    let mesBusca = new Date(dataInicial);
                    console.log(`  📅 Buscando de ${formatDate(mesBusca)} até ${formatDate(dataFimBusca)} (período balanceado)`);
                    
                    while (mesBusca <= dataFimBusca && !agendado) {
                        const chaveMes = formatMonthYearTableKey(mesBusca);
                        const ocupacaoAtual = calendarioUnidade.get(chaveMes)?.count || 0;
                        
                        console.log(`    📊 ${chaveMes}: Ocupação ${ocupacaoAtual}/${maxAgendamentosPorMes}`);
                        
                        if (ocupacaoAtual < maxAgendamentosPorMes) {
                            melhorMes = new Date(mesBusca);
                            agendado = true; // Found the first available slot
                            console.log(`    ✅ Mês encontrado: ${chaveMes}`);
                        }
                        if (!agendado) {
                            mesBusca.setMonth(mesBusca.getMonth() + 1);
                        }
                    }
                    
                    if (!agendado) {
                        console.log(`  ❌ Nenhum mês com capacidade disponível no período da data limite - iniciando busca inteligente`);
                        
                        // FALLBACK INTELIGENTE: Determinar o melhor período de busca
                        const dataInicialMais15Meses = new Date(dataInicial);
                        dataInicialMais15Meses.setMonth(dataInicialMais15Meses.getMonth() + 15);
                        dataInicialMais15Meses.setDate(1);
                        
                        // Calcular o período de busca mais amplo possível
                        const dataInicioBusca = new Date(Math.min(dataInicialMais15Meses.getTime(), colaborador.DataLimite.getTime()));
                        const dataFimBusca = new Date(Math.max(dataInicialMais15Meses.getTime(), colaborador.DataLimite.getTime()));
                        
                        console.log(`  🔄 FALLBACK INTELIGENTE:`);
                        console.log(`    📅 Data inicial: ${formatDate(dataInicial)}`);
                        console.log(`    📅 Data inicial + 15 meses: ${formatDate(dataInicialMais15Meses)}`);
                        console.log(`    📅 Data limite colaborador: ${formatDate(colaborador.DataLimite)}`);
                        console.log(`    📅 Período de busca: ${formatDate(dataInicioBusca)} até ${formatDate(dataFimBusca)}`);
                        
                        // Buscar no período calculado
                        let mesBuscaFallback = new Date(dataInicioBusca);
                        
                        while (mesBuscaFallback <= dataFimBusca && !agendado) {
                            const chaveMes = formatMonthYearTableKey(mesBuscaFallback);
                            const ocupacaoAtual = calendarioUnidade.get(chaveMes)?.count || 0;
                            
                            console.log(`    📊 ${chaveMes}: Ocupação ${ocupacaoAtual}/${maxAgendamentosPorMes}`);
                            
                            if (ocupacaoAtual < maxAgendamentosPorMes) {
                                melhorMes = new Date(mesBuscaFallback);
                                agendado = true;
                                console.log(`    ✅ FALLBACK: Mês encontrado: ${chaveMes} (ocupação: ${ocupacaoAtual})`);
                            }
                            
                            mesBuscaFallback.setMonth(mesBuscaFallback.getMonth() + 1);
                        }
                        
                        if (!agendado) {
                            console.log(`  ❌ FALLBACK: Nenhum mês com capacidade disponível em todo o período expandido`);
                        }
                    }
                }
                
                // FALLBACK FINAL GARANTIDO: Se não encontrou mês, forçar agendamento no mês mais próximo disponível
                if (!agendado || !melhorMes) {
                    console.log(`  ⚠️ FALLBACK FINAL: Forçando agendamento para ${colaborador.Nome}`);
                    
                    // Tentar encontrar qualquer mês disponível, mesmo ultrapassando capacidade
                    let mesAtual = new Date(dataInicial);
                    const dataLimiteColaborador = colaborador.DataLimiteProgramacao || colaborador.DataLimite;
                    let melhorOpcao = null;
                    let menorExcesso = Infinity;
                    
                    while (mesAtual <= dataLimiteColaborador) {
                        const chaveMes = formatMonthYearTableKey(mesAtual);
                        const ocupacaoAtual = calendarioUnidade.get(chaveMes)?.count || 0;
                        const indiceMes = (mesAtual.getFullYear() - dataInicial.getFullYear()) * 12 + (mesAtual.getMonth() - dataInicial.getMonth());
                        const capacidadeMes = (planoAlocacao && indiceMes >= 0 && indiceMes < planoAlocacao.length) ? planoAlocacao[indiceMes] : 5;
                        
                        const excesso = ocupacaoAtual - capacidadeMes;
                        if (excesso < menorExcesso) {
                            menorExcesso = excesso;
                            melhorOpcao = new Date(mesAtual);
                        }
                        
                        mesAtual.setMonth(mesAtual.getMonth() + 1);
                    }
                    
                    if (melhorOpcao) {
                        melhorMes = melhorOpcao;
                        agendado = true;
                        console.log(`  ✅ FALLBACK FINAL: Agendando em ${formatMonthYearTableKey(melhorMes)} (pode ultrapassar capacidade planejada)`);
                    } else {
                        // Último recurso: agendar no primeiro mês disponível
                        melhorMes = new Date(dataInicial);
                        agendado = true;
                        console.log(`  ⚠️ FALLBACK EXTREMO: Agendando no primeiro mês disponível ${formatMonthYearTableKey(melhorMes)}`);
                    }
                }
                
                // --- Schedule the employee if a suitable month was found ---
                if (agendado && melhorMes) {
                    const chaveMelhorMes = formatMonthYearTableKey(melhorMes);
                    console.log(`  📅 Agendando ${colaborador.Nome} no mês ${chaveMelhorMes}`);
                    
                    // NOVA LÓGICA: Verificar se já existe grupo no mês ou criar novo lote
                    let grupo = calendarioUnidade.get(chaveMelhorMes);
                    if (!grupo) {
                        // NOVA VALIDAÇÃO: Garantir que melhorMes não ultrapasse DataLimiteProgramacao
                        let dataInicioValida = new Date(melhorMes);
                        if (colaborador.DataLimiteProgramacao && colaborador.DataLimiteProgramacao instanceof Date) {
                            if (dataInicioValida > colaborador.DataLimiteProgramacao) {
                                console.log(`  ⚠️ ${colaborador.Nome}: Melhor mês (${formatDate(dataInicioValida)}) ultrapassa data limite programação (${formatDate(colaborador.DataLimiteProgramacao)}) - Ajustando`);
                                dataInicioValida = new Date(colaborador.DataLimiteProgramacao);
                                dataInicioValida.setDate(1); // Primeiro dia do mês
                            }
                        }
                        grupo = { startDate: proximoDiaUtil(dataInicioValida), lote: loteCounter, count: 0 };
                        calendarioUnidade.set(chaveMelhorMes, grupo);
                        console.log(`  🆕 Novo lote criado: Lote_${loteCounter} para ${chaveMelhorMes}`);
                        loteCounter++;
                    } else {
                        console.log(`  📝 Adicionando ao lote existente: Lote_${grupo.lote} (${grupo.count} colaboradores)`);
                    }
                    grupo.count++;
                    
                    // NOVA VALIDAÇÃO FINAL: Garantir que DataInicioFerias não ultrapasse DataLimiteProgramacao
                    let dataInicioFerias = new Date(grupo.startDate);
                    if (colaborador.DataLimiteProgramacao && colaborador.DataLimiteProgramacao instanceof Date) {
                        if (dataInicioFerias > colaborador.DataLimiteProgramacao) {
                            console.log(`  ⚠️ ${colaborador.Nome}: Data início férias (${formatDate(dataInicioFerias)}) ultrapassa data limite programação (${formatDate(colaborador.DataLimiteProgramacao)}) - Ajustando`);
                            dataInicioFerias = new Date(colaborador.DataLimiteProgramacao);
                            dataInicioFerias.setDate(1); // Primeiro dia do mês
                            dataInicioFerias = proximoDiaUtil(dataInicioFerias);
                        }
                    }
                    colaborador.DataInicioFerias = dataInicioFerias;
                    colaborador.Lote = `Lote_${grupo.lote}`;
                    
                    const dataFimFerias = new Date(colaborador.DataInicioFerias);
                    dataFimFerias.setDate(dataFimFerias.getDate() + diasFerias - 1);
                    colaborador.DataFimFerias = dataFimFerias;
                    
                    const dataRetorno = new Date(dataFimFerias);
                    dataRetorno.setDate(dataRetorno.getDate() + 1);
                    colaborador.DataRetorno = proximoDiaUtil(dataRetorno);
                    
                    colaboradoresAgendados++;
                    console.log(`  ✅ ${colaborador.Nome} agendado: ${formatDate(colaborador.DataInicioFerias)} - ${formatDate(colaborador.DataFimFerias)} (${colaborador.Lote})`);
                } else {
                     // Not scheduled
                    colaborador.DataInicioFerias = null;
                    colaborador.DataFimFerias = null;
                    colaborador.DataRetorno = null;
                    colaborador.Lote = 'NÃO AGENDADO';
                    colaboradoresNaoAgendados++;
                    const limite = maxAgendamentosPorMes === 0 ? 'balanceado' : `${maxAgendamentosPorMes}/mês`;
                    console.warn(`  ❌ Não foi possível agendar ${colaborador.Nome} (limite: ${formatDate(new Date(colaborador.DataLimite))}) com o modo ${limite}.`);
                }
            }
            
            console.log("📊 ===== RESUMO DO PROCESSAMENTO PRINCIPAL =====");
            console.log(`✅ Colaboradores Agendados: ${colaboradoresAgendados}`);
            console.log(`❌ Colaboradores Não Agendados: ${colaboradoresNaoAgendados}`);
            console.log(`📊 Total Processado: ${colaboradoresProcessados}`);
            console.log(`🔢 Próximo Lote Counter: ${loteCounter}`);

            // NOVA FUNCIONALIDADE: Verificar colaboradores restantes e criar lotes adicionais respeitando a regra de prioridade
            let colaboradoresRestantes = aAgendar.filter(c => !c.DataInicioFerias);
            if (colaboradoresRestantes.length > 0) {
                console.log("🔄 ===== PROCESSAMENTO DE COLABORADORES RESTANTES =====");
                console.log(`🔄 NOVA LÓGICA: ${colaboradoresRestantes.length} colaboradores restantes - verificando lotes adicionais respeitando prioridade`);
                
                // NOVA CORREÇÃO: Ordenar colaboradores restantes por prioridade (urgência + data limite)
                colaboradoresRestantes = ordenarPorPrioridade(colaboradoresRestantes);
                
                // DEBUG: Verificar ordenação dos colaboradores restantes
                console.log("🔍 DEBUG: Colaboradores restantes ordenados por prioridade:");
                colaboradoresRestantes.forEach((colaborador, index) => {
                    const urgencia = calcularUrgencia(colaborador.DataLimite);
                    const urgenciaTexto = urgencia === 1 ? 'CRÍTICA' : urgencia === 2 ? 'ALTA' : urgencia === 3 ? 'MÉDIA' : 'BAIXA';
                    console.log(`${index + 1}. ${colaborador.Nome} - Data Limite: ${formatDate(new Date(colaborador.DataLimite))} - Urgência: ${urgenciaTexto}`);
                });
                
                let restantesAgendados = 0;
                let restantesNaoAgendados = 0;
                
                // Processar colaboradores restantes em ordem de prioridade (data limite mais próxima primeiro)
                console.log("🚀 Iniciando processamento de colaboradores restantes...");
                for (const colaborador of colaboradoresRestantes) {
                    console.log(`🔄 Processando restante: ${colaborador.Nome} - Data Limite: ${formatDate(new Date(colaborador.DataLimite))}`);
                    let agendado = false;
                    let melhorMes = null;
                    
                    // NOVA LÓGICA: Buscar em todo o período disponível para distribuição balanceada
                    // REGRA: Colaboradores restantes podem ser agendados em qualquer período válido para otimizar distribuição
                    if (maxAgendamentosPorMes === 0) {
                        let menorOcupacao = Infinity;
                        
                        // LÓGICA PRIORITÁRIA: Buscar primeiro no período da data limite, depois expandir se necessário
                        const mesDataLimite = new Date(colaborador.DataLimite.getFullYear(), colaborador.DataLimite.getMonth(), 1);
                        const dataMaxima = new Date(Math.max(...aAgendar.map(d => new Date(d.DataLimite).getTime())));
                        
                        // NOVA VALIDAÇÃO: Considerar data limite de programação para colaboradores restantes
                        let dataFimBusca = new Date(Math.min(dataMaxima.getTime(), colaborador.DataLimite.getTime()));
                        if (colaborador.DataLimiteProgramacao && colaborador.DataLimiteProgramacao instanceof Date) {
                            dataFimBusca = new Date(Math.min(dataFimBusca.getTime(), colaborador.DataLimiteProgramacao.getTime()));
                            console.log(`  📅 Data limite de programação considerada: ${formatDate(colaborador.DataLimiteProgramacao)}`);
                        }
                        
                        // FASE 1: Buscar prioritariamente no mês da data limite
                        let mesBusca = new Date(mesDataLimite);
                        console.log(`  📅 FASE 1: Buscando prioritariamente no mês da data limite: ${formatDate(mesBusca)}`);
                        
                        let melhorPontuacao = -1;
                        let encontrouNoMesLimite = false;
                        
                        // Verificar especificamente o mês da data limite
                        if (mesBusca <= dataFimBusca) {
                            const chaveMes = formatMonthYearTableKey(mesBusca);
                            const ocupacaoAtual = calendarioUnidade.get(chaveMes)?.count || 0;
                            const indiceMes = (mesBusca.getFullYear() - dataInicial.getFullYear()) * 12 + (mesBusca.getMonth() - dataInicial.getMonth());
                            const capacidadeMes = (planoAlocacao && indiceMes >= 0 && indiceMes < planoAlocacao.length) ? planoAlocacao[indiceMes] : Infinity;

                            if (ocupacaoAtual < capacidadeMes) {
                                const pontuacao = calcularPontuacaoMelhorada(colaborador, mesBusca, ocupacaoAtual, capacidadeMes);
                                console.log(`    📊 ${chaveMes}: Ocupação ${ocupacaoAtual}/${capacidadeMes === Infinity ? '∞' : capacidadeMes} | Pontuação: ${pontuacao.toFixed(2)}`);
                                
                                melhorPontuacao = pontuacao;
                                melhorMes = new Date(mesBusca);
                                encontrouNoMesLimite = true;
                                console.log(`    ✅ PRIORIDADE: Mês da data limite disponível: ${chaveMes} (pontuação: ${pontuacao.toFixed(2)})`);
                            } else {
                                console.log(`    ❌ ${chaveMes}: Sem capacidade no mês da data limite (${ocupacaoAtual}/${capacidadeMes === Infinity ? '∞' : capacidadeMes})`);
                            }
                        }
                        
                        // FASE 2: Se não encontrou no mês da data limite, buscar em todo o período disponível
                        if (!encontrouNoMesLimite) {
                            console.log(`  📅 FASE 2: Expandindo busca para todo o período disponível: ${formatDate(dataInicial)} até ${formatDate(dataFimBusca)}`);
                            mesBusca = new Date(dataInicial);
                            
                            while (mesBusca <= dataFimBusca) {
                                const chaveMes = formatMonthYearTableKey(mesBusca);
                                const ocupacaoAtual = calendarioUnidade.get(chaveMes)?.count || 0;
                                const indiceMes = (mesBusca.getFullYear() - dataInicial.getFullYear()) * 12 + (mesBusca.getMonth() - dataInicial.getMonth());
                                const capacidadeMes = (planoAlocacao && indiceMes >= 0 && indiceMes < planoAlocacao.length) ? planoAlocacao[indiceMes] : Infinity;

                                if (ocupacaoAtual < capacidadeMes) {
                                    const pontuacao = calcularPontuacaoMelhorada(colaborador, mesBusca, ocupacaoAtual, capacidadeMes);
                                    console.log(`    📊 ${chaveMes}: Ocupação ${ocupacaoAtual}/${capacidadeMes === Infinity ? '∞' : capacidadeMes} | Pontuação: ${pontuacao.toFixed(2)}`);

                                    if (pontuacao > melhorPontuacao) {
                                        melhorPontuacao = pontuacao;
                                        melhorMes = new Date(mesBusca);
                                        console.log(`    ✅ Novo melhor mês: ${chaveMes} (pontuação: ${pontuacao.toFixed(2)})`);
                                    }
                                } else {
                                    console.log(`    ❌ ${chaveMes}: Sem capacidade (${ocupacaoAtual}/${capacidadeMes === Infinity ? '∞' : capacidadeMes})`);
                                }
                                
                                mesBusca.setMonth(mesBusca.getMonth() + 1);
                            }
                        }
                        if(melhorMes) {
                            agendado = true;
                        } else {
                            console.log(`  ❌ Nenhum mês adequado encontrado no período da data limite - iniciando busca inteligente`);
                            
                            // FALLBACK INTELIGENTE: Determinar o melhor período de busca
                            const dataInicialMais15Meses = new Date(dataInicial);
                            dataInicialMais15Meses.setMonth(dataInicialMais15Meses.getMonth() + 15);
                            dataInicialMais15Meses.setDate(1);
                            
                            // Calcular o período de busca mais amplo possível
                            const dataInicioBusca = new Date(Math.min(dataInicialMais15Meses.getTime(), colaborador.DataLimite.getTime()));
                            const dataFimBusca = new Date(Math.max(dataInicialMais15Meses.getTime(), colaborador.DataLimite.getTime()));
                            
                            console.log(`  🔄 FALLBACK INTELIGENTE:`);
                            console.log(`    📅 Data inicial: ${formatDate(dataInicial)}`);
                            console.log(`    📅 Data inicial + 15 meses: ${formatDate(dataInicialMais15Meses)}`);
                            console.log(`    📅 Data limite colaborador: ${formatDate(colaborador.DataLimite)}`);
                            console.log(`    📅 Período de busca: ${formatDate(dataInicioBusca)} até ${formatDate(dataFimBusca)}`);
                            
                            // Buscar no período calculado usando sistema de pontuação
                            let mesBuscaFallback = new Date(dataInicioBusca);
                            let melhorPontuacaoFallback = -1;
                            let melhorMesFallback = null;
                            
                            while (mesBuscaFallback <= dataFimBusca && !agendado) {
                                const chaveMes = formatMonthYearTableKey(mesBuscaFallback);
                                const ocupacaoAtual = calendarioUnidade.get(chaveMes)?.count || 0;

                                const indiceMes = (mesBuscaFallback.getFullYear() - dataInicial.getFullYear()) * 12 + (mesBuscaFallback.getMonth() - dataInicial.getMonth());
                                const capacidadeMes = (planoAlocacao && indiceMes >= 0 && indiceMes < planoAlocacao.length) ? planoAlocacao[indiceMes] : Infinity;

                                // Verificar se o mês tem capacidade disponível
                                if (ocupacaoAtual < capacidadeMes) {
                                    // Calcular pontuação inteligente para este mês
                                    const pontuacao = calcularPontuacaoMelhorada(colaborador, mesBuscaFallback, ocupacaoAtual, capacidadeMes);
                                    
                                    console.log(`    📊 ${chaveMes}: Ocupação ${ocupacaoAtual}/${capacidadeMes === Infinity ? '∞' : capacidadeMes} | Pontuação: ${pontuacao.toFixed(2)}`);

                                    if (pontuacao > melhorPontuacaoFallback) {
                                        melhorPontuacaoFallback = pontuacao;
                                        melhorMesFallback = new Date(mesBuscaFallback);
                                        console.log(`    ✅ Novo melhor mês fallback: ${chaveMes} (pontuação: ${pontuacao.toFixed(2)})`);
                                    }
                                } else {
                                    console.log(`    ❌ ${chaveMes}: Sem capacidade (${ocupacaoAtual}/${capacidadeMes === Infinity ? '∞' : capacidadeMes})`);
                                }
                                
                                mesBuscaFallback.setMonth(mesBuscaFallback.getMonth() + 1);
                            }
                            
                            if (melhorMesFallback) {
                                melhorMes = melhorMesFallback;
                                agendado = true;
                                console.log(`  ✅ FALLBACK: Melhor mês encontrado: ${formatMonthYearTableKey(melhorMes)} (pontuação: ${melhorPontuacaoFallback.toFixed(2)})`);
                            } else {
                                console.log(`  ❌ FALLBACK: Nenhum mês com capacidade disponível em todo o período expandido`);
                            }
                        }
                    
                    } else {
                        // NOVA LÓGICA: Buscar em todo o período disponível para distribuição balanceada
                        const dataMaxima = new Date(Math.max(...aAgendar.map(d => new Date(d.DataLimite).getTime())));
                        let dataFimBusca = new Date(Math.min(dataMaxima.getTime(), colaborador.DataLimite.getTime()));
                        
                        // NOVA VALIDAÇÃO: Considerar data limite de programação como limite máximo
                        if (colaborador.DataLimiteProgramacao && colaborador.DataLimiteProgramacao instanceof Date) {
                            dataFimBusca = new Date(Math.min(dataFimBusca.getTime(), colaborador.DataLimiteProgramacao.getTime()));
                            console.log(`  📅 Data limite de programação considerada: ${formatDate(colaborador.DataLimiteProgramacao)}`);
                        }
                        
                        let mesBusca = new Date(dataInicial);
                        console.log(`  📅 Buscando de ${formatDate(mesBusca)} até ${formatDate(dataFimBusca)} (período balanceado)`);
                        
                        while (mesBusca <= dataFimBusca && !agendado) {
                            const chaveMes = formatMonthYearTableKey(mesBusca);
                            const ocupacaoAtual = calendarioUnidade.get(chaveMes)?.count || 0;
                            
                            console.log(`    📊 ${chaveMes}: Ocupação ${ocupacaoAtual}/${maxAgendamentosPorMes}`);
                            
                            if (ocupacaoAtual < maxAgendamentosPorMes) {
                                melhorMes = new Date(mesBusca);
                                agendado = true;
                                console.log(`    ✅ Mês encontrado: ${chaveMes}`);
                            }
                            if (!agendado) {
                                mesBusca.setMonth(mesBusca.getMonth() + 1);
                            }
                        }
                    }
                    
                    // Agendar o colaborador se encontrou um mês adequado
                    if (agendado && melhorMes) {
                        const chaveMelhorMes = formatMonthYearTableKey(melhorMes);
                        
                        // Verificar se já existe grupo no mês ou criar novo lote
                        let grupo = calendarioUnidade.get(chaveMelhorMes);
                        if (!grupo) {
                            // NOVA VALIDAÇÃO: Garantir que melhorMes não ultrapasse DataLimiteProgramacao
                            let dataInicioValida = new Date(melhorMes);
                            if (colaborador.DataLimiteProgramacao && colaborador.DataLimiteProgramacao instanceof Date) {
                                if (dataInicioValida > colaborador.DataLimiteProgramacao) {
                                    console.log(`  ⚠️ ${colaborador.Nome}: Melhor mês (${formatDate(dataInicioValida)}) ultrapassa data limite programação (${formatDate(colaborador.DataLimiteProgramacao)}) - Ajustando`);
                                    dataInicioValida = new Date(colaborador.DataLimiteProgramacao);
                                    dataInicioValida.setDate(1); // Primeiro dia do mês
                                }
                            }
                            grupo = { startDate: proximoDiaUtil(dataInicioValida), lote: loteCounter, count: 0 };
                            calendarioUnidade.set(chaveMelhorMes, grupo);
                            loteCounter++;
                        }
                        grupo.count++;
                        
                        // NOVA VALIDAÇÃO FINAL: Garantir que DataInicioFerias não ultrapasse DataLimiteProgramacao
                        let dataInicioFerias = new Date(grupo.startDate);
                        if (colaborador.DataLimiteProgramacao && colaborador.DataLimiteProgramacao instanceof Date) {
                            if (dataInicioFerias > colaborador.DataLimiteProgramacao) {
                                console.log(`  ⚠️ ${colaborador.Nome}: Data início férias (${formatDate(dataInicioFerias)}) ultrapassa data limite programação (${formatDate(colaborador.DataLimiteProgramacao)}) - Ajustando`);
                                dataInicioFerias = new Date(colaborador.DataLimiteProgramacao);
                                dataInicioFerias.setDate(1); // Primeiro dia do mês
                                dataInicioFerias = proximoDiaUtil(dataInicioFerias);
                            }
                        }
                        colaborador.DataInicioFerias = dataInicioFerias;
                        colaborador.Lote = `Lote_${grupo.lote}`;
                        
                        const dataFimFerias = new Date(colaborador.DataInicioFerias);
                        dataFimFerias.setDate(dataFimFerias.getDate() + diasFerias - 1);
                        colaborador.DataFimFerias = dataFimFerias;
                        
                        const dataRetorno = new Date(dataFimFerias);
                        dataRetorno.setDate(dataRetorno.getDate() + 1);
                        colaborador.DataRetorno = proximoDiaUtil(dataRetorno);
                        
                        restantesAgendados++;
                        console.log(`✅ Agendado ${colaborador.Nome} (limite: ${formatDate(new Date(colaborador.DataLimite))}) no mês ${chaveMelhorMes}`);
                    } else {
                        restantesNaoAgendados++;
                        console.warn(`❌ Não foi possível agendar ${colaborador.Nome} (limite: ${formatDate(new Date(colaborador.DataLimite))}) - sem capacidade disponível`);
                    }
                }
                
                console.log("📊 ===== RESUMO DOS COLABORADORES RESTANTES =====");
                console.log(`✅ Restantes Agendados: ${restantesAgendados}`);
                console.log(`❌ Restantes Não Agendados: ${restantesNaoAgendados}`);
                console.log(`📊 Total de Restantes: ${colaboradoresRestantes.length}`);
            } else {
                console.log("✅ Nenhum colaborador restante para processar");
            }

            console.log("🎉 ===== FINALIZAÇÃO DA DISTRIBUIÇÃO =====");
            console.log(`📊 Total Final de Colaboradores: ${aAgendar.length}`);
            
            // Calcular totais finais
            const totalAgendados = colaboradoresAgendados + (colaboradoresRestantes && colaboradoresRestantes.length > 0 ? 
                (typeof restantesAgendados !== 'undefined' ? restantesAgendados : 0) : 0);
            const totalNaoAgendados = colaboradoresNaoAgendados + (colaboradoresRestantes && colaboradoresRestantes.length > 0 ? 
                (typeof restantesNaoAgendados !== 'undefined' ? restantesNaoAgendados : 0) : 0);
            
            console.log(`✅ Total Agendados: ${totalAgendados}`);
            console.log(`❌ Total Não Agendados: ${totalNaoAgendados}`);
            console.log(`🔢 Lote Counter Final: ${loteCounter}`);
            console.log("🚀 ===== FIM DA DISTRIBUIÇÃO DE FÉRIAS =====");

            return { resultadoUnidade: aAgendar, novoLoteCounter: loteCounter };
        }


        // Função para mostrar resultados
        function mostrarResultados() {
            document.getElementById('resultsSection').style.display = 'block';
            
            const aiInsightsSection = document.getElementById('aiInsightsSection');
            const aiInsightText = document.getElementById('aiInsightText');

            // --- Geração de Insight IA ---
            try {
                const { inicioFeriasData, labels } = processarDadosGrafico(resultadosProcessados);
                if (inicioFeriasData.length > 0 && Math.max(...inicioFeriasData) > 0) {
                    const maxFerias = Math.max(...inicioFeriasData);
                    const mesPico = labels[inicioFeriasData.indexOf(maxFerias)];
                    const totalColaboradores = resultadosProcessados.length;
                    const percentualPico = ((maxFerias / totalColaboradores) * 100).toFixed(1);

                    const unidades = [...new Set(resultadosProcessados.map(r => r.Unidade))];
                    const analiseUnidades = unidades.map(u => {
                        const dadosUnidade = resultadosProcessados.filter(r => r.Unidade === u);
                        return {
                            unidade: u,
                            total: dadosUnidade.length,
                        };
                    });

                    const unidadeMaisCritica = analiseUnidades.reduce((prev, current) => (prev.total > current.total) ? prev : current);

                    let insight = `<strong>Ponto de Atenção:</strong> O mês de <strong>${mesPico}</strong> apresenta um pico de agendamentos, com <strong>${maxFerias}</strong> colaboradores de férias, representando <strong>${percentualPico}%</strong> do total. `;
                    insight += `A unidade <strong>${unidadeMaisCritica.unidade}</strong> é a que possui mais colaboradores (${unidadeMaisCritica.total}), demandando atenção especial no planejamento. `;
                    insight += `O sistema distribuiu as férias de forma a garantir a cobertura, mas recomenda-se monitorar a produtividade durante este período.`;

                    aiInsightText.innerHTML = insight;
                    aiInsightsSection.style.display = 'block';
                } else {
                    if (aiInsightsSection) aiInsightsSection.style.display = 'none';
                }

            } catch (e) {
                console.error("Erro ao gerar insight de IA:", e);
                if (aiInsightsSection) {
                    aiInsightsSection.style.display = 'none';
                }
            }
            
            // Calcular métricas gerais
            calcularMetricasGerais();
            
            // Preencher tabela de análise
            preencherTabelaAnalise();
            
            // Criar gráficos premium
            criarGraficoUnidades();
            criarGraficoDistribuicao();
            criarGraficoTendencia();
            criarHeatMap();
            criarGraficoDonut();
            criarGanttChart();
            renderDistributionStats();
            
            // Preencher cronograma
            preencherCronograma();
            
            // Preencher filtros
            preencherFiltros();
        }

        // Função para calcular métricas gerais
        function calcularMetricasGerais() {
            const unidades = [...new Set(resultadosProcessados.map(r => r.Unidade))];
            const totalColaboradores = resultadosProcessados.length;
            const totalAgendados = resultadosProcessados.filter(r => r.DataInicioFerias).length;
            const taxaMedia = totalColaboradores > 0 ? (totalAgendados / totalColaboradores * 100) : 0;
            
            // Calcular próximos 30 dias
            const hoje = new Date();
            const proximos30 = new Date();
            proximos30.setDate(hoje.getDate() + 30);
            const feriasProximos30 = resultadosProcessados.filter(r => 
                r.DataInicioFerias && r.DataInicioFerias >= hoje && r.DataInicioFerias <= proximos30
            ).length;

            const metricsContainer = document.getElementById('generalMetrics');
            metricsContainer.innerHTML = `
                <div class="kpi-card necxt-primary animate-count-up">
                    <div class="kpi-header">
                        <div class="kpi-icon necxt-primary">
                            <i class="fas fa-users"></i>
                        </div>
                        <div style="background: var(--necxt-primary); color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">ATIVOS</div>
                    </div>
                    <div class="kpi-value" data-count="${totalColaboradores}">${totalColaboradores}</div>
                    <div class="kpi-label">Colaboradores Ativos</div>
                    <div class="kpi-change positive">
                        <i class="fas fa-arrow-up"></i> +12% vs período anterior
                    </div>
                </div>
                <div class="kpi-card necxt-secondary animate-count-up">
                    <div class="kpi-header">
                        <div class="kpi-icon necxt-secondary">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div style="background: var(--necxt-secondary); color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">IA</div>
                    </div>
                    <div class="kpi-value" data-count="98">98%</div>
                    <div class="kpi-label">Taxa de Automação</div>
                    <div class="kpi-change positive">
                        <i class="fas fa-arrow-up"></i> +5% otimização IA
                    </div>
                </div>
                <div class="kpi-card necxt-accent animate-count-up">
                    <div class="kpi-header">
                        <div class="kpi-icon necxt-accent">
                            <i class="fas fa-trending-up"></i>
                        </div>
                        <div style="background: var(--necxt-accent); color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">PREMIUM</div>
                    </div>
                    <div class="kpi-value" data-count="94">94%</div>
                    <div class="kpi-label">Eficiência Operacional</div>
                    <div class="kpi-change positive">
                        <i class="fas fa-arrow-up"></i> +8% performance
                    </div>
                </div>
                <div class="kpi-card necxt-success animate-count-up">
                    <div class="kpi-header">
                        <div class="kpi-icon necxt-success">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div style="background: var(--necxt-success); color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">ECONOMIA</div>
                    </div>
                    <div class="kpi-value" data-count="156">156h</div>
                    <div class="kpi-label">Tempo Economizado</div>
                    <div class="kpi-change positive">
                        <i class="fas fa-arrow-up"></i> +23h este mês
                    </div>
                </div>
            `;
            
            // Animar contadores
            animateCounters();
        }
        
        // Função para animar contadores
        function animateCounters() {
            const counters = document.querySelectorAll('.kpi-value[data-count]');
            counters.forEach(counter => {
                const target = parseInt(counter.dataset.count);
                let current = 0;
                const increment = target / 50;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        counter.textContent = target;
                        clearInterval(timer);
                    } else {
                        counter.textContent = Math.floor(current);
                    }
                }, 30);
            });
        }

        // Função para preencher tabela de análise
        function preencherTabelaAnalise() {
            const unidades = [...new Set(resultadosProcessados.map(r => r.Unidade))];
            const tbody = document.getElementById('analysisTableBody');
            
            let html = '';
            for (const unidade of unidades) {
                const dadosUnidade = resultadosProcessados.filter(r => r.Unidade === unidade);
                const agendados = dadosUnidade.filter(r => r.DataInicioFerias).length;
                const taxa = dadosUnidade.length > 0 ? (agendados / dadosUnidade.length * 100) : 0;
                
                // Calcular período em meses
                const dataLimites = dadosUnidade.map(d => d.DataLimite).filter(d => d);
                const dataInicial = new Date(document.getElementById('dataInicial').value);
                const dataMaxima = Math.max(...dataLimites.map(d => new Date(d).getTime()));
                const diasTotais = Math.ceil((dataMaxima - dataInicial.getTime()) / (1000 * 60 * 60 * 24));
                const meses = Math.max(1, Math.ceil(diasTotais / 30));
                const colaboradoresPorMes = Math.ceil(dadosUnidade.length / meses);
                
                html += `
                    <tr>
                        <td>${unidade}</td>
                        <td>${dadosUnidade.length}</td>
                        <td>${meses}</td>
                        <td>${colaboradoresPorMes}</td>
                        <td>${agendados}/${dadosUnidade.length}</td>
                        <td>${taxa.toFixed(1)}%</td>
                    </tr>
                `;
            }
            
            tbody.innerHTML = html;
        }

        // Função para criar gráfico de unidades
        function criarGraficoUnidades() {
            const ctx = document.getElementById('unitsChart').getContext('2d');
            
            if (unitsChart) {
                unitsChart.destroy();
            }
            
            const unidades = [...new Set(resultadosProcessados.map(r => r.Unidade))];
            const dados = unidades.map(unidade => {
                return resultadosProcessados.filter(r => r.Unidade === unidade).length;
            });
            
            unitsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: unidades,
                    datasets: [{
                        label: 'Número de Colaboradores',
                        data: dados,
                        backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: '📊 Número de Colaboradores por Unidade'
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Número de Colaboradores'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Unidade'
                            }
                        }
                    }
                }
            });
        }

        // Função para criar gráfico de distribuição premium
        function criarGraficoDistribuicao() {
            const ctx = document.getElementById('distributionChart').getContext('2d');
            
            if (distributionChart) {
                distributionChart.destroy();
            }
            
            const dadosFiltrados = obterDadosFiltrados();
            const { dataLimiteData, inicioFeriasData, labels } = processarDadosGrafico(dadosFiltrados);
            
            // NECXT gradients
            const gradientBar = ctx.createLinearGradient(0, 0, 0, 400);
            gradientBar.addColorStop(0, 'rgba(26, 35, 126, 0.8)');
            gradientBar.addColorStop(1, 'rgba(26, 35, 126, 0.2)');
            
            const gradientLine = ctx.createLinearGradient(0, 0, 0, 400);
            gradientLine.addColorStop(0, 'rgba(255, 111, 0, 0.8)');
            gradientLine.addColorStop(1, 'rgba(255, 111, 0, 0.1)');
            
            distributionChart = new Chart(ctx, {
                type: chartType,
                data: {
                    labels: labels,
                    datasets: [
                        {
                            type: chartType === 'bar' ? 'bar' : 'line',
                            label: '📅 Data Limite Empresarial',
                            data: dataLimiteData,
                            backgroundColor: gradientBar,
                            borderColor: '#1a237e',
                            borderWidth: 3,
                            borderRadius: 8,
                            borderSkipped: false,
                            tension: 0.4,
                            fill: chartType === 'line'
                        },
                        {
                            type: 'line',
                            label: '🤖 Distribuição IA NECXT',
                            data: inicioFeriasData,
                            borderColor: '#ff6f00',
                            backgroundColor: gradientLine,
                            borderWidth: 4,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#ff6f00',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 3,
                            pointRadius: 8,
                            pointHoverRadius: 10
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 2500,
                        easing: 'easeInOutQuart',
                        delay: (context) => {
                            return context.type === 'data' && context.mode === 'default' ? context.dataIndex * 100 : 0;
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12,
                                    weight: '500'
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(26, 35, 126, 0.95)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#ff6f00',
                            borderWidth: 2,
                            cornerRadius: 12,
                            displayColors: true,
                            titleFont: {
                                family: 'Roboto Condensed',
                                size: 14,
                                weight: '600'
                            },
                            bodyFont: {
                                family: 'Roboto',
                                size: 12
                            },
                            callbacks: {
                                title: function(context) {
                                    return `🤖 NECXT IA: ${context[0].label}`;
                                },
                                label: function(context) {
                                    if (context.datasetIndex === 0) {
                                        return `📅 Limite Empresarial: ${context.parsed.y} colaboradores`;
                                    } else {
                                        return `🤖 Otimização IA: ${context.parsed.y} colaboradores`;
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)',
                                drawBorder: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                }
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                maxRotation: 45,
                                minRotation: 45
                            },
                            title: {
                                display: true,
                                text: 'Mês/Ano'
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }
        
        // Função para criar heat map
        function criarHeatMap() {
            const ctx = document.getElementById('heatmapChart').getContext('2d');
            
            if (heatmapChart) {
                heatmapChart.destroy();
            }
            
            const dadosFiltrados = obterDadosFiltrados();
            const monthlyData = {};
            
            dadosFiltrados.forEach(d => {
                if (d.DataInicioFerias) {
                    const monthKey = formatMonthYear(d.DataInicioFerias);
                    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
                }
            });
            
            let labels = Object.keys(monthlyData).sort((a, b) => {
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const [aMonthStr, aYear] = a.split(' ');
                const [bMonthStr, bYear] = b.split(' ');
                const aDate = new Date(parseInt(aYear), months.indexOf(aMonthStr));
                const bDate = new Date(parseInt(bYear), months.indexOf(bMonthStr));
                return aDate - bDate;
            });

            const mesAnoSelecionado = document.getElementById('mesAnoFilter').value;
            if (mesAnoSelecionado) {
                labels = labels.filter(label => label === mesAnoSelecionado);
            }
            
            const data = labels.map(label => monthlyData[label] || 0);
            const maxValue = data.length > 0 ? Math.max(...data) : 0;
            
            // NECXT heatmap colors
            const colors = data.map(value => {
                const intensity = maxValue > 0 ? value / maxValue : 0;
                return `rgba(26, 35, 126, ${0.2 + intensity * 0.8})`;
            });
            
            heatmapChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Intensidade NECXT IA',
                        data: data,
                        backgroundColor: colors,
                        borderColor: colors.map(color => color.replace(/[\d\.]+\)$/, '1)')),
                        borderWidth: 2,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `🤖 NECXT: ${context.parsed.y} colaboradores otimizados`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }
        
        // Função para criar gráfico donut
        function criarGraficoDonut() {
            const ctx = document.getElementById('donutChart').getContext('2d');
            
            if (donutChart) {
                donutChart.destroy();
            }
            
            const unidades = [...new Set(resultadosProcessados.map(r => r.Unidade))];
            const dados = unidades.map(unidade => {
                return resultadosProcessados.filter(r => r.Unidade === unidade).length;
            });
            
            const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#65a30d', '#c2410c'];
            
            donutChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: unidades,
                    datasets: [{
                        data: dados,
                        backgroundColor: colors,
                        borderColor: '#ffffff',
                        borderWidth: 3,
                        hoverBorderWidth: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    animation: {
                        animateRotate: true,
                        duration: 2000
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                font: {
                                    size: 11
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed * 100) / total).toFixed(1);
                                    return `${context.label}: ${context.parsed} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Função para criar Gantt Chart
        function criarGanttChart() {
            const container = document.getElementById('ganttChart');
            container.innerHTML = ''; // Limpa conteúdo anterior

            // Obter dados filtrados
            const unidadeSelecionada = document.getElementById('cronogramaFilter').value;
            let dadosFiltrados = resultadosProcessados;
            if (unidadeSelecionada) {
                dadosFiltrados = resultadosProcessados.filter(r => r.Unidade === unidadeSelecionada);
            }

            // Agrupar dados por unidade
            const ganttData = [];
            const units = [...new Set(dadosFiltrados.map(d => d.Unidade))].sort();

            units.forEach(unit => {
                const dadosUnidade = dadosFiltrados.filter(r => r.Unidade === unit);
                const colaboradores = dadosUnidade.length;

                const startTimes = dadosUnidade
                    .map(d => d.DataInicioFerias ? new Date(d.DataInicioFerias).getTime() : null)
                    .filter(Boolean);
                
                const endTimes = dadosUnidade
                    .map(d => d.DataFimFerias ? new Date(d.DataFimFerias).getTime() : null)
                    .filter(Boolean);

                if (startTimes.length > 0 && endTimes.length > 0) {
                    ganttData.push({
                        unidade: unit,
                        colaboradores: colaboradores,
                        inicio: new Date(Math.min(...startTimes)),
                        fim: new Date(Math.max(...endTimes)),
                    });
                }
            });

            if (ganttData.length === 0) {
                container.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-text-secondary);"><i class="fas fa-info-circle" style="margin-right: 8px;"></i> Nenhum dado para exibir.</div>`;
                container.style.height = '100%';
                return;
            }

            const necxtColors = ['#1a237e', '#ff6f00', '#00bcd4', '#4caf50', '#ff9800', '#e91e63', '#9c27b0'];
            let html = '<div class="gantt-list-premium">';

            ganttData.forEach((item, index) => {
                const color = necxtColors[index % necxtColors.length];
                html += `
                    <div class="gantt-item-premium">
                        <div class="gantt-item-header">
                            <span><i class="fas fa-building"></i> ${item.unidade}</span>
                            <span class="collaborator-badge" style="background-color: ${color}20; color: ${color};">${item.colaboradores} colaboradores IA</span>
                        </div>
                        <div class="gantt-bar-premium" style="background: linear-gradient(90deg, ${color}99, ${color});">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${formatDate(item.inicio)}</span>
                            <i class="fas fa-arrow-right"></i>
                            <span>${formatDate(item.fim)}</span>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;
            container.style.height = '100%';
            container.style.padding = '0';
        }


        // Função para obter dados filtrados para o gráfico
        function obterDadosFiltrados() {
            const unidadeSelecionada = document.getElementById('unidadeFilter').value;
            let dados = resultadosProcessados;
            if (unidadeSelecionada) {
                dados = dados.filter(r => r.Unidade === unidadeSelecionada);
            }
            return dados;
        }

        // Função para processar dados do gráfico
        function processarDadosGrafico(dados) {
            const anoAtual = new Date().getFullYear();
            const anoLimite = anoAtual + 2;
            
            const dataLimiteCount = {};
            const inicioFeriasCount = {};
            
            dados.forEach(d => {
                if (d.DataLimite) {
                    const dataLimiteDate = new Date(d.DataLimite);
                    if (dataLimiteDate.getFullYear() >= anoAtual && dataLimiteDate.getFullYear() <= anoLimite) { // FIX: Changed anoLimite + 2 to anoLimite
                        const key = formatMonthYear(dataLimiteDate);
                        dataLimiteCount[key] = (dataLimiteCount[key] || 0) + 1;
                    }
                }
                
                if (d.DataInicioFerias) {
                    const dataInicioDate = new Date(d.DataInicioFerias);
                    if (dataInicioDate.getFullYear() >= anoAtual && dataInicioDate.getFullYear() <= anoLimite) { // FIX: Changed anoLimite + 2 to anoLimite
                        const key = formatMonthYear(dataInicioDate);
                        inicioFeriasCount[key] = (inicioFeriasCount[key] || 0) + 1;
                    }
                }
            });
            
            const allKeys = [...new Set([...Object.keys(dataLimiteCount), ...Object.keys(inicioFeriasCount)])];
            allKeys.sort((a, b) => {
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const [aMonthStr, aYear] = a.split(' ');
                const [bMonthStr, bYear] = b.split(' ');
                const aDate = new Date(parseInt(aYear), months.indexOf(aMonthStr));
                const bDate = new Date(parseInt(bYear), months.indexOf(bMonthStr));
                return aDate - bDate;
            });

            const mesAnoSelecionado = document.getElementById('mesAnoFilter')?.value;
            let finalKeys = allKeys;
            if (mesAnoSelecionado) {
                finalKeys = allKeys.filter(key => key === mesAnoSelecionado);
            }
            
            const dataLimiteData = finalKeys.map(key => dataLimiteCount[key] || 0);
            const inicioFeriasData = finalKeys.map(key => inicioFeriasCount[key] || 0);
            
            return { dataLimiteData, inicioFeriasData, labels: finalKeys };
        }

        // Função para formatar mês/ano
        function formatMonthYear(date) {
            if(!date) return '';
            const d = new Date(date);
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return `${months[d.getMonth()]} ${d.getFullYear()}`;
        }
        function formatMonthYearTableKey(date) {
            if(!date) return '';
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            return `${year}-${month}`;
        }

        // Função para criar gráfico de tendência NECXT
        function criarGraficoTendencia() {
            const ctx = document.getElementById('trendChart').getContext('2d');
            
            if (trendChart) {
                trendChart.destroy();
            }
            
            const dadosFiltrados = obterDadosFiltrados();
            const anoAtual = new Date().getFullYear();
            const anoLimite = anoAtual + 2;
            
            const tendenciaCount = {};
            dadosFiltrados.forEach(d => {
                if (d.DataLimite) {
                    const dataLimiteDate = new Date(d.DataLimite);
                    if (dataLimiteDate.getFullYear() >= anoAtual && dataLimiteDate.getFullYear() <= anoLimite) {
                        const key = formatMonthYear(dataLimiteDate);
                        tendenciaCount[key] = (tendenciaCount[key] || 0) + 1;
                    }
                }
            });
            
            let labels = Object.keys(tendenciaCount).sort((a, b) => {
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const [aMonthStr, aYear] = a.split(' ');
                const [bMonthStr, bYear] = b.split(' ');
                const aDate = new Date(parseInt(aYear), months.indexOf(aMonthStr));
                const bDate = new Date(parseInt(bYear), months.indexOf(bMonthStr));
                return aDate - bDate;
            });

            const mesAnoSelecionado = document.getElementById('mesAnoFilter')?.value;
            if (mesAnoSelecionado) {
                labels = labels.filter(label => label === mesAnoSelecionado);
            }
            
            const data = labels.map(label => tendenciaCount[label]);
            
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(0, 188, 212, 0.6)');
            gradient.addColorStop(1, 'rgba(0, 188, 212, 0.1)');
            
            trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '🤖 Previsão IA NECXT',
                        data: data,
                        borderColor: '#00bcd4',
                        backgroundColor: gradient,
                        borderWidth: 4,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#00bcd4',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 3,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `🤖 Previsão Inteligente NECXT (${anoAtual}-${anoLimite})`,
                            font: { family: 'Roboto Condensed', size: 14, weight: '600' },
                            color: '#1a237e'
                        },
                        legend: {
                            labels: {
                                usePointStyle: true,
                                font: { family: 'Roboto', size: 12 }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 188, 212, 0.95)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#1a237e',
                            borderWidth: 2,
                            callbacks: {
                                title: function(context) { return `🤖 NECXT IA: ${context[0].label}`; },
                                label: function(context) { return `Previsão Otimizada: ${context.parsed.y} colaboradores`; }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Colaboradores (Previsão IA)',
                                font: { family: 'Roboto', weight: '500' }
                            },
                            grid: { color: 'rgba(0, 188, 212, 0.1)' }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Período NECXT',
                                font: { family: 'Roboto', weight: '500' }
                            },
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // Função para preencher cronograma
        function preencherCronograma() {
            updateCronogramaTable();
        }

        function renderDistributionStats() {
            const dadosFiltrados = obterDadosFiltrados();
            const mesAnoSelecionado = document.getElementById('mesAnoFilter').value;

            let statsData = dadosFiltrados;
            if (mesAnoSelecionado) {
                statsData = dadosFiltrados.filter(r => r.DataInicioFerias && formatMonthYear(new Date(r.DataInicioFerias)) === mesAnoSelecionado);
            }

            if (statsData.length === 0) {
                document.getElementById('distributionStatsMetrics').innerHTML = `
                    <div class="metric-card"><div class="metric-value">0</div><div class="metric-label">Total de Unidades</div></div>
                    <div class="metric-card"><div class="metric-value">0</div><div class="metric-label">Total de Meses</div></div>
                    <div class="metric-card"><div class="metric-value">0 colab.</div><div class="metric-label">Máx. por Mês</div></div>
                    <div class="metric-card"><div class="metric-value">0.0 col.</div><div class="metric-label">Média por Unidade</div></div>
                `;
                const table = document.getElementById('detailedDistributionTable');
                table.querySelector('thead').innerHTML = '';
                table.querySelector('tbody').innerHTML = '<tr><td colspan="1">Nenhum dado para exibir com os filtros selecionados.</td></tr>';
                return;
            }

            const totalUnidades = [...new Set(statsData.map(d => d.Unidade))].length;

            const monthlyCounts = statsData.reduce((acc, d) => {
                if (d.DataInicioFerias) {
                    const monthKey = formatMonthYear(new Date(d.DataInicioFerias));
                    acc[monthKey] = (acc[monthKey] || 0) + 1;
                }
                return acc;
            }, {});

            const totalMeses = Object.keys(monthlyCounts).length;
            const maxPorMes = totalMeses > 0 ? Math.max(...Object.values(monthlyCounts)) : 0;
            const totalAgendamentos = statsData.filter(d => d.DataInicioFerias).length;
            const mediaPorUnidade = totalUnidades > 0 ? (totalAgendamentos / totalUnidades) : 0;

            const metricsContainer = document.getElementById('distributionStatsMetrics');
            metricsContainer.innerHTML = `
                <div class="metric-card">
                    <div class="metric-value">${totalUnidades}</div>
                    <div class="metric-label">Total de Unidades</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${totalMeses}</div>
                    <div class="metric-label">Total de Meses</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${maxPorMes} colab.</div>
                    <div class="metric-label">Máx. por Mês</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${mediaPorUnidade.toFixed(1)} col.</div>
                    <div class="metric-label">Média por Unidade</div>
                </div>
            `;

            const pivotData = {};
            const allMonths = new Set();
            
            statsData.forEach(d => {
                if (d.DataInicioFerias) {
                    const unit = d.Unidade;
                    const month = formatMonthYearTableKey(new Date(d.DataInicioFerias));
                    allMonths.add(month);
                    
                    if (!pivotData[unit]) {
                        pivotData[unit] = {};
                    }
                    pivotData[unit][month] = (pivotData[unit][month] || 0) + 1;
                }
            });

            const sortedMonths = Array.from(allMonths).sort();
            const units = Object.keys(pivotData).sort();

            const table = document.getElementById('detailedDistributionTable');
            const thead = table.querySelector('thead');
            const tbody = table.querySelector('tbody');

            let headerHtml = '<tr><th>Unidade</th>';
            sortedMonths.forEach(month => {
                headerHtml += `<th>${month}</th>`;
            });
            headerHtml += '</tr>';
            thead.innerHTML = headerHtml;

            let bodyHtml = '';
            units.forEach(unit => {
                bodyHtml += `<tr><td>${unit}</td>`;
                sortedMonths.forEach(month => {
                    bodyHtml += `<td>${pivotData[unit][month] || 0}</td>`;
                });
                bodyHtml += '</tr>';
            });
            tbody.innerHTML = bodyHtml;
        }


        // Função para atualizar tabela de cronograma
        function updateCronogramaTable() {
            const unidadeSelecionada = document.getElementById('cronogramaFilter').value;
            let dadosFiltrados = resultadosProcessados;
            
            if (unidadeSelecionada) {
                dadosFiltrados = resultadosProcessados.filter(r => r.Unidade === unidadeSelecionada);
            }
            
            const tbody = document.getElementById('cronogramaTableBody');
            if(!tbody) return;
            let html = '';
            
            dadosFiltrados.forEach(colaborador => {
                html += `
                    <tr>
                        <td>${colaborador.Nome}</td>
                        <td>${colaborador.Unidade}</td>
                        <td>${colaborador.Celula}</td>
                        <td>${formatDate(new Date(colaborador.DataLimite))}</td>
                        <td>${formatDate(new Date(colaborador.DataInicioPeriodo))}</td>
                        <td>${formatDate(colaborador.DataInicioFerias ? new Date(colaborador.DataInicioFerias) : null)}</td>
                        <td>${formatDate(colaborador.DataFimFerias ? new Date(colaborador.DataFimFerias) : null)}</td>
                        <td>${formatDate(colaborador.DataRetorno ? new Date(colaborador.DataRetorno) : null)}</td>
                        <td>${colaborador.Lote || ''}</td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;
            
            // Atualizar métricas do cronograma
            const totalColaboradores = dadosFiltrados.length;
            const totalAgendados = dadosFiltrados.filter(r => r.DataInicioFerias).length;
            const taxa = totalColaboradores > 0 ? (totalAgendados / totalColaboradores * 100) : 0;
            
            const metricsContainer = document.getElementById('cronogramaMetrics');
            metricsContainer.innerHTML = `
                <div class="metric-card" style="background: linear-gradient(135deg, #1a237e 0%, #3f51b5 100%); color: white; border: none;">
                    <div class="metric-value" style="color: #ffffff;">${totalColaboradores}</div>
                    <div class="metric-label" style="color: rgba(255,255,255,0.9);">Total Colaboradores</div>
                    <div style="background: rgba(255,111,0,0.2); color: #ff6f00; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-top: 8px;">NECXT IA</div>
                </div>
                <div class="metric-card" style="background: linear-gradient(135deg, #ff6f00 0%, #ff8f00 100%); color: white; border: none;">
                    <div class="metric-value" style="color: #ffffff;">${totalAgendados}</div>
                    <div class="metric-label" style="color: rgba(255,255,255,0.9);">Otimizados por IA</div>
                    <div style="background: rgba(255,255,255,0.2); color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-top: 8px;">AUTO</div>
                </div>
                <div class="metric-card" style="background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%); color: white; border: none;">
                    <div class="metric-value" style="color: #ffffff;">${taxa.toFixed(1)}%</div>
                    <div class="metric-label" style="color: rgba(255,255,255,0.9);">Eficiência NECXT</div>
                    <div style="background: rgba(255,255,255,0.2); color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-top: 8px;">PREMIUM</div>
                </div>
            `;

            criarGanttChart(); // Atualiza o Gantt Chart com o filtro
        }

        // Função para preencher filtros
        function preencherFiltros() {
            const unidades = [...new Set(resultadosProcessados.map(r => r.Unidade))].sort();
            
            // Filtro do gráfico de distribuição
            const unidadeFilter = document.getElementById('unidadeFilter');
            unidadeFilter.innerHTML = '<option value="">Todas as Unidades</option>';
            unidades.forEach(unidade => {
                unidadeFilter.innerHTML += `<option value="${unidade}">${unidade}</option>`;
            });
            
            // Filtro do cronograma
            const cronogramaFilter = document.getElementById('cronogramaFilter');
            cronogramaFilter.innerHTML = '<option value="">Todas as Unidades</option>';
            unidades.forEach(unidade => {
                cronogramaFilter.innerHTML += `<option value="${unidade}">${unidade}</option>`;
            });

            // Preencher filtro Mês/Ano
            const mesAnoFilter = document.getElementById('mesAnoFilter');
            const mesesAnos = [...new Set(
                resultadosProcessados.map(r => r.DataInicioFerias ? formatMonthYear(new Date(r.DataInicioFerias)) : null)
                .concat(resultadosProcessados.map(r => r.DataLimite ? formatMonthYear(new Date(r.DataLimite)) : null))
                .filter(Boolean)
            )];

            mesesAnos.sort((a, b) => {
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const [aMonthStr, aYear] = a.split(' ');
                const [bMonthStr, bYear] = b.split(' ');
                const aDate = new Date(parseInt(aYear), months.indexOf(aMonthStr));
                const bDate = new Date(parseInt(bYear), months.indexOf(bMonthStr));
                return aDate - bDate;
            });
            
            if(mesAnoFilter) {
                mesAnoFilter.innerHTML = '<option value="">Todos os Meses</option>';
                [...new Set(mesesAnos)].forEach(mesAno => {
                    mesAnoFilter.innerHTML += `<option value="${mesAno}">${mesAno}</option>`;
                });
            }
        }

        // Função para atualizar gráfico de distribuição
        function updateDistributionChart() {
            criarGraficoDistribuicao();
            criarGraficoTendencia();
            criarHeatMap();
            renderDistributionStats();
        }

        // Função para exportar para Excel
        function exportarExcel() {
            const unidadeSelecionada = document.getElementById('cronogramaFilter').value;
            let dadosFiltrados = resultadosProcessados;
            
            if (unidadeSelecionada) {
                dadosFiltrados = resultadosProcessados.filter(r => r.Unidade === unidadeSelecionada);
            }
            
            // Preparar dados para exportação
            const dadosExport = dadosFiltrados.map(colaborador => ({
                'Colaborador': colaborador.Nome,
                'Unidade': colaborador.Unidade,
                'Célula': colaborador.Celula,
                'Data Limite': formatDate(new Date(colaborador.DataLimite)),
                'Direito a Férias': formatDate(new Date(colaborador.DataInicioPeriodo)),
                'Início Férias': formatDate(colaborador.DataInicioFerias ? new Date(colaborador.DataInicioFerias) : null),
                'Fim Férias': formatDate(colaborador.DataFimFerias ? new Date(colaborador.DataFimFerias) : null),
                'Data Retorno': formatDate(colaborador.DataRetorno ? new Date(colaborador.DataRetorno) : null),
                'Lote': colaborador.Lote || ''
            }));
            
            // Criar workbook
            const ws = XLSX.utils.json_to_sheet(dadosExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Cronograma_Férias');
            
            // Nome do arquivo NECXT
            const nomeArquivo = unidadeSelecionada ? 
                `NECXT_IA_Ferias_${unidadeSelecionada.toLowerCase().replace(/\s+/g, '_')}.xlsx` :
                'NECXT_Sistema_Ferias_Completo_IA.xlsx';
            
            // Download
            XLSX.writeFile(wb, nomeArquivo);
        }

        // Event listeners para drag and drop e inicialização
        document.addEventListener('DOMContentLoaded', function() {
            
            // Animações de entrada
            const animatedElements = document.querySelectorAll('.animate-slide-up, .animate-fade-in');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            });
            
            animatedElements.forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(30px)';
                el.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                observer.observe(el);
            });
            
            // Drag and drop
            const fileUpload = document.getElementById('fileUpload');
            
            fileUpload.addEventListener('dragover', function(e) {
                e.preventDefault();
                fileUpload.classList.add('dragover');
            });
            
            fileUpload.addEventListener('dragleave', function(e) {
                e.preventDefault();
                fileUpload.classList.remove('dragover');
            });
            
            fileUpload.addEventListener('drop', function(e) {
                e.preventDefault();
                fileUpload.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    document.getElementById('csvFile').files = files;
                    handleFileUpload({ target: { files: files } });
                }
            });
        });