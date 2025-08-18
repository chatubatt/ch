export const indicatorsData = [
    {
        id: 'abs',
        title: 'ABS (Absenteísmo)',
        definition: 'O Absenteísmo (ABS) é o indicador que mede a percentagem de ausência dos colaboradores em relação às horas ou dias de trabalho que foram planejados. Engloba faltas (justificadas ou não), atrasos e saídas antecipadas.',
        analysis: `
            <p>O absenteísmo é uma das métricas mais críticas para a saúde operacional de um call center. Sua importância vai além do simples registro de faltas; ele é um termômetro que reflete o clima organizacional, a satisfação dos colaboradores e, consequentemente, a estabilidade da operação. Um índice de absenteísmo elevado impacta diretamente os custos, pois a empresa paga por horas não trabalhadas e, muitas vezes, precisa arcar com horas extras de outros funcionários para cobrir a lacuna.</p>
            <p>Na gestão do Control Desk, o ABS é fundamental para o dimensionamento da equipe. O planejamento da força de trabalho (<em>Workforce Management - WFM</em>) não pode se basear apenas na escala teórica; ele deve incorporar uma previsão de absenteísmo para garantir que o número de agentes logados seja suficiente para atender à demanda de chamadas projetada. Ignorar este indicador leva a um subdimensionamento crônico, resultando em filas de espera longas, queda no nível de serviço e sobrecarga da equipe presente, o que pode, por sua vez, gerar mais absenteísmo, criando um ciclo vicioso.</p>
            <p>O cálculo pode ser realizado de duas formas principais:</p>
            <ol class="list-decimal list-inside space-y-2 my-4">
                <li><strong>Por Horas (mais preciso):</strong> Ideal para capturar o impacto de atrasos e saídas parciais.
                    <div class="bg-gray-100 p-3 rounded-md font-mono text-sm my-2"><strong>Fórmula:</strong> % ABS = (Total de Horas de Ausência / Total de Horas Planejadas) * 100</div>
                </li>
                <li><strong>Por Dias (mais simples):</strong> Usado para uma visão geral rápida.
                    <div class="bg-gray-100 p-3 rounded-md font-mono text-sm my-2"><strong>Fórmula:</strong> % ABS = (Nº de Agentes Ausentes / Nº Total de Agentes Escalados) * 100</div>
                </li>
            </ol>
            <p>O Control Desk utiliza a análise histórica do ABS para prever seu comportamento futuro e ajustar o dimensionamento de forma proativa, garantindo a estabilidade operacional e a entrega dos resultados contratados.</p>
        `,
    },
    {
        id: 'adherence',
        title: 'Aderência à Escala',
        definition: 'A Aderência à Escala mede o grau de cumprimento da jornada de trabalho planejada por parte do agente, comparando os horários em que ele <em>deveria</em> estar logado e disponível com os horários em que ele <em>realmente</em> esteve.',
        analysis: `
            <p>Se o absenteísmo mede a ausência total, a aderência mede a disciplina durante a presença. Não basta o agente estar na empresa; ele precisa estar disponível para o trabalho nos momentos corretos. Este indicador é a espinha dorsal da otimização da força de trabalho em tempo real. Uma alta aderência significa que o plano de alocação de recursos, cuidadosamente elaborado com base na previsão de tráfego, está sendo executado com precisão.</p>
            <p>A importância da aderência é imensa para o Control Desk. O dimensionamento de um call center é calculado para intervalos curtos (geralmente de 15 ou 30 minutos). Se vários agentes decidem iniciar suas pausas em um intervalo de pico não programado, o nível de serviço pode despencar drasticamente, mesmo que o número total de agentes presentes no dia esteja correto. A aderência garante que a quantidade de pessoal disponível a cada momento corresponde exatamente ao que foi previsto para suportar o volume de chamadas.</p>
            <p>O cálculo da aderência é o percentual do tempo em que o agente cumpriu a escala.</p>
            <div class="bg-gray-100 p-3 rounded-md font-mono text-sm my-4"><strong>Fórmula:</strong> % Aderência = (Tempo Real em Atividade Conforme Escala / Tempo Total Planejado na Escala) * 100</div>
            <p>Para o Control Desk, monitorar a aderência em tempo real permite tomar ações corretivas imediatas, como notificar supervisores sobre desvios ou ajustar pausas para mitigar o impacto no atendimento. Uma baixa aderência crônica pode indicar problemas de gestão, falta de disciplina da equipe ou falhas na comunicação das escalas, sendo um ponto de atenção constante para garantir a eficiência operacional.</p>
        `,
    },
    {
        id: 'shrinkage',
        title: 'Perda de Login (Shrinkage)',
        definition: 'Shrinkage, ou Perda de Login, representa a percentagem de tempo em que os agentes são pagos, mas não estão disponíveis para atender às interações dos clientes. Inclui todas as atividades, planejadas ou não, que retiram um agente da linha de frente.',
        analysis: `
            <p>Shrinkage é talvez o conceito mais crucial e abrangente para um planejamento de capacidade (<em>capacity planning</em>) preciso. Ele responde à pergunta: "De todas as horas que eu contrato, quantas realmente se transformam em tempo produtivo de atendimento?". É a "perda" inevitável que ocorre entre o tempo contratado e o tempo disponível.</p>
            <p>A gestão do shrinkage é vital porque ele impacta diretamente no número de funcionários que precisam ser contratados. Se uma análise indica a necessidade de 100 agentes disponíveis a todo momento para atender à demanda (headcount produtivo), e o shrinkage da operação é de 30%, o gestor sabe que precisará contratar e escalar aproximadamente 143 agentes (headcount total) para garantir que, após as perdas, os 100 necessários estejam de fato disponíveis.</p>
            <p>O shrinkage é tipicamente dividido em duas categorias principais:</p>
            <ul class="list-disc list-inside space-y-1 my-4">
                <li><strong>Shrinkage Externo:</strong> Atividades que tiram o agente do local de trabalho (férias, feriados, faltas, licenças).</li>
                <li><strong>Shrinkage Interno:</strong> Atividades realizadas durante o horário de trabalho que não são atendimento (reuniões, treinamentos, coaching, pausas, tempo ocioso do sistema).</li>
            </ul>
            <div class="bg-gray-100 p-3 rounded-md font-mono text-sm my-4"><strong>Fórmula:</strong> % Shrinkage = (Total de Horas de Shrinkage / Total de Horas Contratadas) * 100</div>
            <p>Para o Control Desk, calcular e prever o shrinkage é essencial. O analista não pode simplesmente escalar o número de agentes que a curva de chamadas exige; ele deve aplicar o fator de shrinkage sobre esse número para chegar ao quadro de pessoal real necessário. Negligenciar o shrinkage é a receita para o fracasso no dimensionamento. O objetivo não é zerar o shrinkage — pois atividades como treinamentos e pausas são essenciais —, mas sim medi-lo com precisão, controlá-lo e incorporá-lo de forma inteligente no planejamento estratégico.</p>
        `,
    },
    {
        id: 'traffic',
        title: 'Tráfego de Chamadas',
        definition: 'Tráfego de Chamadas refere-se ao volume total de interações (chamadas, chats, e-mails) recebidas pela central de atendimento em um determinado período. A gestão de tráfego envolve prever, monitorar e gerenciar esse fluxo para otimizar os recursos e garantir a qualidade do serviço.',
        analysis: `
            <p>A gestão de tráfego é a atividade central do Control Desk. Ela funciona como a torre de controle de um aeroporto, garantindo que o fluxo de "aviões" (chamadas) seja gerenciado de forma eficiente pela "pista e portões" (agentes e PAs). Não se trata apenas de um indicador, mas de um processo estratégico que engloba diversas atividades.</p>
            <p>Sua importância é total: sem uma gestão de tráfego eficaz, a operação funciona às cegas. O processo começa com a <strong>previsão (forecast)</strong>, onde dados históricos e eventos de negócio (como campanhas de marketing) são usados para projetar o volume de chamadas futuras, geralmente em intervalos de 15 a 30 minutos. Com base nessa previsão, é feito o <strong>dimensionamento (staffing)</strong>, que calcula o número de agentes necessários para atender a esse volume dentro das metas de Nível de Serviço.</p>
            <p>O passo seguinte é a <strong>criação de escalas (scheduling)</strong>, que aloca os agentes em horários de trabalho e pausas para cobrir a demanda prevista. Finalmente, entra o <strong>monitoramento em tempo real</strong>, onde o Control Desk compara o tráfego real com o previsto e a escala real com a planejada, tomando ações imediatas para corrigir desvios.</p>
            <p>Um analista de Control Desk vive e respira a gestão de tráfego. Ele utiliza ferramentas de WFM para analisar padrões, identificar sazonalidades e tomar decisões estratégicas, como alocar agentes de <em>back-office</em> para o atendimento em picos inesperados ou aprovar horas extras. Uma gestão de tráfego bem-sucedida é a que equilibra perfeitamente três pilares: <strong>Custo Operacional</strong>, <strong>Qualidade do Serviço</strong> e <strong>Satisfação do Colaborador</strong>.</p>
        `,
    },
    {
        id: 'deviation',
        title: 'Desvio de Volume',
        definition: 'O Desvio de Volume é a métrica que quantifica a diferença entre o volume de tráfego (chamadas) previsto e o volume de tráfego que efetivamente ocorreu em um determinado intervalo de tempo.',
        analysis: `
            <p>Se a previsão de tráfego é o pilar do planejamento, o Desvio de Volume é o principal indicador de sua precisão. É impossível ter uma previsão 100% exata, portanto, monitorar e entender os desvios é fundamental para a gestão em tempo real e para o aprimoramento contínuo do processo de forecast.</p>
            <p>A importância desta análise é dupla. Em <strong>tempo real</strong>, ela serve como um alerta para o Control Desk. Um desvio positivo significativo (mais chamadas que o previsto) exige ações imediatas: acionar agentes de backup, cancelar atividades offline, otimizar o tempo de atendimento, etc. Um desvio negativo (menos chamadas) pode sinalizar a oportunidade de alocar agentes para treinamentos, atividades de back-office ou até mesmo oferecer saídas antecipadas, otimizando os custos.</p>
            <p>A <strong>longo prazo</strong>, a análise histórica dos desvios é usada para refinar os modelos de previsão. O analista investiga as causas dos desvios mais significativos: foi uma falha no site que gerou mais ligações? Uma campanha de marketing não comunicada ao WFM? Um feriado com comportamento atípico? Entender o "porquê" por trás dos desvios permite ajustar os algoritmos de forecast, tornando-os mais inteligentes e precisos no futuro.</p>
            <div class="bg-gray-100 p-3 rounded-md font-mono text-sm my-4"><strong>Fórmula:</strong> % Desvio = ((Volume Real - Volume Previsto) / Volume Previsto) * 100</div>
            <p>Para o Control Desk, um desvio consistentemente dentro de uma margem aceitável (geralmente ±5%) é sinal de um processo de planejamento maduro e eficaz. Gerenciar o desvio não é apenas reagir a ele, mas aprender com ele para construir uma operação mais resiliente e previsível.</p>
        `,
    },
];
