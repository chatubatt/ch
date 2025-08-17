export const trainingGamesData = {
    puzzleGame: {
        indicators: [
            {
                id: 'abs',
                name: 'Absenteísmo',
                abbreviation: 'ABS'
            },
            {
                id: 'adherence',
                name: 'Aderência à Escala',
                abbreviation: 'ADH'
            },
            {
                id: 'shrinkage',
                name: 'Perda de Login',
                abbreviation: 'SHRINKAGE'
            },
            {
                id: 'traffic',
                name: 'Tráfego de Chamadas',
                abbreviation: 'TRÁFEGO'
            },
            {
                id: 'volume-deviation',
                name: 'Desvio de Volume',
                abbreviation: 'DESVIO'
            }
        ],
        definitions: [
            {
                id: 'abs',
                text: 'Percentagem de ausência dos colaboradores em relação às horas ou dias de trabalho planejados, incluindo faltas, atrasos e saídas antecipadas.'
            },
            {
                id: 'adherence',
                text: 'Mede o grau de cumprimento da jornada planejada, comparando horários que o agente deveria estar disponível com os horários reais.'
            },
            {
                id: 'shrinkage',
                text: 'Percentagem de tempo em que os agentes são pagos mas não estão disponíveis para atender clientes, incluindo atividades internas e externas.'
            },
            {
                id: 'traffic',
                text: 'Volume total de interações recebidas pela central de atendimento, envolvendo previsão, monitoramento e gestão do fluxo.'
            },
            {
                id: 'volume-deviation',
                text: 'Diferença entre o volume de tráfego previsto e o volume que efetivamente ocorreu em um determinado intervalo de tempo.'
            }
        ]
    },
    simulatorGame: {
        scenarios: [
            {
                id: 'morning-peak',
                name: 'Pico Matinal Inesperado',
                description: 'São 9h da manhã e o volume de chamadas está 25% acima do previsto. Alguns KPIs estão saindo da meta.',
                initialKPIs: {
                    'Nível de Serviço': {
                        current: 75,
                        target: 90,
                        unit: '%'
                    },
                    'TME (seg)': {
                        current: 45,
                        target: 20,
                        unit: 's'
                    },
                    'Ocupação': {
                        current: 95,
                        target: 85,
                        unit: '%'
                    },
                    'Abandono': {
                        current: 8,
                        target: 3,
                        unit: '%'
                    }
                }
            }
        ],
        actions: [
            {
                id: 'add-agents',
                name: 'Alocar +5 Agentes do Back-office',
                description: 'Transferir agentes de atividades internas para atendimento',
                effects: {
                    'Nível de Serviço': 15,
                    'TME (seg)': -8,
                    'Ocupação': -10,
                    'Abandono': -3
                },
                scoreImpact: 100,
                feedback: 'Agentes adicionais melhoraram o atendimento, mas podem impactar atividades internas.'
            },
            {
                id: 'activate-callback',
                name: 'Ativar Sistema de Callback',
                description: 'Permitir que clientes sejam chamados de volta automaticamente',
                effects: {
                    'Nível de Serviço': 10,
                    'TME (seg)': -5,
                    'Abandono': -4
                },
                scoreImpact: 80,
                feedback: 'Callback ativado, reduzindo abandono e melhorando experiência do cliente.'
            },
            {
                id: 'optimize-script',
                name: 'Otimizar Script de Atendimento',
                description: 'Implementar script mais eficiente para reduzir tempo de atendimento',
                effects: {
                    'TME (seg)': -12,
                    'Ocupação': -5,
                    'Nível de Serviço': 8
                },
                scoreImpact: 60,
                feedback: 'Script otimizado reduziu tempo médio, mas pode afetar qualidade se mal executado.'
            },
            {
                id: 'cancel-training',
                name: 'Cancelar Treinamento Programado',
                description: 'Liberar agentes que estavam em treinamento para atendimento',
                effects: {
                    'Nível de Serviço': 12,
                    'TME (seg)': -6,
                    'Ocupação': -8,
                    'Abandono': -2
                },
                scoreImpact: 50,
                feedback: 'Treinamento cancelado liberou agentes, mas pode impactar desenvolvimento da equipe.'
            },
            {
                id: 'overtime-approval',
                name: 'Aprovar Horas Extras',
                description: 'Autorizar extensão de jornada para agentes voluntários',
                effects: {
                    'Nível de Serviço': 8,
                    'TME (seg)': -4,
                    'Ocupação': -6,
                    'Abandono': -1
                },
                scoreImpact: 30,
                feedback: 'Horas extras aprovadas aumentaram capacidade, mas elevaram custos operacionais.'
            },
            {
                id: 'priority-routing',
                name: 'Implementar Roteamento Prioritário',
                description: 'Direcionar chamadas mais simples para agentes específicos',
                effects: {
                    'TME (seg)': -8,
                    'Nível de Serviço': 6,
                    'Ocupação': -3
                },
                scoreImpact: 70,
                feedback: 'Roteamento prioritário otimizou distribuição, mas requer monitoramento contínuo.'
            }
        ]
    }
};
