export const reportChallengeData = [
    {
        id: 'report-1',
        title: 'Relatório de Performance Diária',
        scenario_html: `
            <h4>Relatório de Performance Diária - Equipe Vendas Alpha</h4>
            <p><strong>Data:</strong> 27/06/2025</p>
            <table>
                <thead>
                    <tr><th>Indicador</th><th>Meta</th><th>Realizado</th></tr>
                </thead>
                <tbody>
                    <tr><td>Nível de Serviço</td><td>80/20</td><td>85/20</td></tr>
                    <tr><td>TMA (Tempo Médio de Atendimento)</td><td>240s</td><td>235s</td></tr>
                    <tr><td>Absenteísmo (ABS)</td><td>&lt; 5%</td><td>10%</td></tr>
                    <tr><td>Chamadas Atendidas</td><td>-</td><td>950</td></tr>
                    <tr><td>Satisfação do Cliente (CSAT)</td><td>&gt; 90%</td><td>92%</td></tr>
                </tbody>
            </table>
            <h4 class="mt-4">Detalhamento por Agente:</h4>
            <table>
                <thead>
                    <tr><th>Agente</th><th>Chamadas Atendidas</th><th>Status</th></tr>
                </thead>
                <tbody>
                    <tr><td>Ana Silva</td><td>105</td><td>Presente</td></tr>
                    <tr><td>Bruno Costa</td><td>98</td><td>Presente</td></tr>
                    <tr><td>Carlos Dias</td><td>110</td><td>Presente</td></tr>
                    <tr><td>Daniela Lima</td><td>102</td><td>Presente</td></tr>
                    <tr><td>Eduardo Reis</td><td>95</td><td>Presente</td></tr>
                    <tr><td>Fernanda Mota</td><td>115</td><td>Presente</td></tr>
                    <tr><td>Gustavo Borges</td><td>105</td><td>Presente</td></tr>
                    <tr><td>Helena Ramos</td><td>-</td><td>Falta</td></tr>
                    <tr><td>Ígor Matos</td><td>120</td><td>Presente</td></tr>
                    <tr><td>Júlia Andrade</td><td>-</td><td>Falta</td></tr>
                </tbody>
            </table>
            <blockquote class="mt-4">
                <strong>Conclusão do Relator:</strong><br>
                A equipe Vendas Alpha superou as metas de Nível de Serviço e CSAT, além de manter um TMA abaixo do esperado, demonstrando alta eficiência. O único ponto de atenção é o alto índice de absenteísmo (10%), impactado pelas duas faltas no dia. Recomenda-se ação da supervisão para controle das ausências.
            </blockquote>
        `,
        solution_html: `
            <p>A análise inicial parece positiva, mas uma validação mais profunda revela erros críticos que alteram a percepção do resultado.</p>
            
            <h4>Erro 1: Cálculo Incorreto de Absenteísmo (ABS)</h4>
            <p><strong>Onde está o erro?</strong> O valor de 10% de ABS está incorreto.</p>
            <p><strong>Análise:</strong> O relatório indica 10 agentes na equipe e 2 faltas. O cálculo feito foi (2 Agentes Ausentes / 10 Agentes Totais) * 100 = 20%. O valor de 10% no relatório é, portanto, arbitrário e errado. Um analista atento deve sempre recalcular os KPIs-chave.</p>
            <p><strong>Correção:</strong> Supondo que todos os 10 agentes estavam escalados para o dia, o ABS correto seria <strong>20%</strong>.</p>
            
            <h4 class="mt-4">Erro 2: Inconsistência nos Dados de Volume</h4>
            <p><strong>Onde está o erro?</strong> O total de "Chamadas Atendidas" (950) não corresponde à soma das chamadas no detalhamento por agente.</p>
            <p><strong>Análise:</strong> Somando as chamadas atendidas pelos 8 agentes presentes: 105 + 98 + 110 + 102 + 95 + 115 + 105 + 120 = <strong>850</strong>. Há uma discrepância de 100 chamadas.</p>
            <p><strong>Correção:</strong> Este tipo de erro é grave, pois invalida todos os KPIs que dependem do volume. A fonte de dados (DAC, plataforma de telefonia) precisa ser consultada para confirmar o volume real. Sem essa validação, o relatório não é confiável.</p>
        `
    },
    {
        id: 'report-2',
        title: 'Relatório de Aderência à Escala',
        scenario_html: `
            <h4>Relatório de Aderência - Agente: Bruno Costa</h4>
            <p><strong>Data:</strong> 27/06/2025</p>
            <table>
                <thead>
                    <tr><th>Intervalo</th><th>Status Planejado</th><th>Status Real</th><th>Tempo (min)</th><th>Aderente?</th></tr>
                </thead>
                <tbody>
                    <tr><td>09:00 - 09:30</td><td>Logado</td><td>Logado</td><td>30</td><td>Sim</td></tr>
                    <tr><td>09:30 - 10:00</td><td>Logado</td><td>Logado</td><td>30</td><td>Sim</td></tr>
                    <tr><td>10:00 - 10:15</td><td>Pausa</td><td>Pausa</td><td>15</td><td>Sim</td></tr>
                    <tr><td>10:15 - 10:30</td><td>Logado</td><td>Pausa</td><td>15</td><td>Não</td></tr>
                    <tr><td>10:30 - 11:00</td><td>Logado</td><td>Logado</td><td>30</td><td>Sim</td></tr>
                </tbody>
            </table>
            <blockquote class="mt-4">
                <strong>Cálculo de Aderência:</strong>
                <ul>
                    <li><strong>Tempo Total Planejado:</strong> 120 minutos (2 horas)</li>
                    <li><strong>Tempo Total Aderente:</strong> 105 minutos</li>
                    <li><strong>Percentual de Aderência:</strong> (105 / 120) * 100 = 87.5%</li>
                </ul>
            </blockquote>
        `,
        solution_html: `
            <p>O cálculo de aderência apresentado no relatório simplifica a realidade e ignora detalhes cruciais.</p>
            
            <h4>Erro: Lógica de Cálculo de Aderência Falha</h4>
            <p><strong>Onde está o erro?</strong> A classificação de "Aderente" por bloco de tempo mascara a realidade. O agente não esteve aderente durante todo o tempo classificado como "Sim".</p>
            <p><strong>Análise:</strong> O agente estendeu sua pausa programada de 10:15 para 10:30. O tempo em que o agente deveria estar trabalhando, mas não estava, deve ser contabilizado como perda.</p>
            <p><strong>Correção:</strong></p>
            <ol>
                <li><strong>Tempo total em que o agente deveria estar trabalhando (Logado):</strong>
                    <ul>
                        <li>09:00 - 10:00 (60 min)</li>
                        <li>10:15 - 11:00 (45 min)</li>
                        <li><strong>Total Logado Planejado:</strong> 105 minutos</li>
                    </ul>
                </li>
                <li><strong>Tempo em que o agente efetivamente trabalhou (esteve logado):</strong>
                    <ul>
                        <li>09:00 - 10:00 (60 min)</li>
                        <li>10:30 - 11:00 (30 min)</li>
                        <li><strong>Total Logado Real:</strong> 90 minutos</li>
                    </ul>
                </li>
            </ol>
            <p class="mt-2"><strong>Cálculo de Aderência Correto:</strong></p>
            <blockquote>% Aderência = (Tempo Real em Atividade / Tempo Total Planejado em Atividade) * 100<br>
            (90 minutos / 105 minutos) * 100 = <strong>85.7%</strong>
            </blockquote>
            <p>O percentual real é 85.7%, não 87.5%.</p>
        `
    },
    {
        id: 'report-3',
        title: 'Análise de Queda no Nível de Serviço',
        scenario_html: `
            <h4>Análise de Desempenho - Suporte Técnico</h4>
            <p><strong>Intervalo:</strong> 14:00 - 15:00</p>
            <table>
                <thead>
                    <tr><th>Indicador</th><th>Meta</th><th>Realizado</th></tr>
                </thead>
                <tbody>
                    <tr><td>Nível de Serviço (NS)</td><td>90/30</td><td><strong>75%/30</strong></td></tr>
                    <tr><td>Volume Previsto</td><td>300 chamadas</td><td>380 chamadas</td></tr>
                    <tr><td>TMA</td><td>&lt; 300s</td><td>325s</td></tr>
                    <tr><td>Agentes Logados</td><td>25</td><td>25</td></tr>
                </tbody>
            </table>
            <blockquote class="mt-4">
                <strong>Conclusão do Relator:</strong><br>
                A queda acentuada no Nível de Serviço das 14:00 às 15:00 foi causada diretamente pelo aumento do TMA. Os agentes levaram, em média, 25 segundos a mais para concluir cada chamada, o que gerou maior tempo de espera e impediu o alcance da meta de NS. É crucial realizar uma sessão de feedback com a equipe para reforçar as técnicas de agilidade e controle do tempo de chamada.
            </blockquote>
        `,
        solution_html: `
            <p>A conclusão aponta para uma causa, mas ignora o fator mais impactante revelado pelos próprios dados.</p>
            <h4>Erro: Conclusão Equivocada e Falta de Análise de Contexto</h4>
            <p><strong>Onde está o erro?</strong> A conclusão culpa o TMA (fator interno/agente) e ignora completamente o desvio de volume (fator externo/demanda).</p>
            <p><strong>Análise:</strong> Um analista de Control Desk deve primeiro olhar para as variáveis que afetam o dimensionamento. O desvio de volume foi de <strong>+26.7%</strong> ((380 - 300) / 300). Um desvio tão alto é um evento de altíssimo impacto. A equipe foi dimensionada para 300 chamadas, não 380.</p>
            <p><strong>Correção e Análise Adequada:</strong></p>
            <blockquote>
                A queda no Nível de Serviço foi primariamente causada por um pico de chamadas não previsto (+26.7%). A equipe foi sobrecarregada, tornando impossível manter a meta. O aumento do TMA pode ser uma <em>consequência</em> do pico (chamadas mais complexas), não a <em>causa</em> raiz. A recomendação correta é investigar a origem do pico de volume para aprimorar a previsão futura, em vez de focar no tempo dos agentes.
            </blockquote>
        `
    }
];
