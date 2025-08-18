export const simulatorData = {
    actions: [
        {
            id: 'alloc_bo',
            name: 'Alocar Back-office',
            description: 'Move 5 agentes do back-office para atendimento. Aumenta backlog.',
            cost: 200,
            cooldown: 60,
            effect: { agentsFromBO: 5 }
        },
        {
            id: 'extra_hours',
            name: 'Solicitar Horas Extras',
            description: 'Adiciona 5 agentes temporários por 2 horas. Alto custo.',
            cost: 1000,
            cooldown: 180,
            effect: { tempAgents: 5, duration: 120 }
        },
        {
            id: 'contingency_ura',
            name: 'Ativar URA de Contingência',
            description: 'Desvia 25% das novas chamadas para a URA por 1 hora.',
            cost: 500,
            cooldown: 120,
            effect: { callDeflection: 0.25, duration: 60 }
        },
        {
            id: 'team_briefing',
            name: 'Briefing de Foco (TMA)',
            description: 'Alerta para foco em agilidade. Reduz TMA em 5% por 30 min.',
            cost: 100,
            cooldown: 90,
            effect: { tmaModifier: -0.05, duration: 30 }
        }
    ],
    events: [
        {
            id: 'peak_traffic',
            name: 'Pico Inesperado de Chamadas',
            description: 'ALERTA: O volume de chamadas aumentou 50%!',
            duration: 60,
            effect: { callVolumeMultiplier: 1.5 }
        },
        {
            id: 'system_down',
            name: 'Lentidão no Sistema',
            description: 'ALERTA: CRM lento! O TMA aumentou em 30%.',
            duration: 45,
            effect: { tmaModifier: 0.3 }
        },
        {
            id: 'mass_absenteeism',
            name: 'Absenteísmo Elevado',
            description: 'INFO: 15% da equipe faltou hoje. Força de trabalho reduzida.',
            duration: 480, // all day
            effect: { agentReduction: 0.15 }
        }
    ],
    scenarios: [
        {
            id: 'typical_day',
            name: 'Dia Típico',
            difficulty: 'Fácil',
            description: 'Volume de chamadas previsível, com picos suaves. Ideal para se familiarizar com a interface e o impacto básico das decisões.',
            dayLength: 480,
            eventProbability: 0.01,
            possibleEvents: ['peak_traffic'],
            initialState: {
                agents: { total: 60, back_office: 10 },
                goals: { sla: 85, abandonment: 3, maxWait: 120 },
                callVolumeProfile: [10, 10, 12, 12, 15, 18, 15, 12, 10, 10, 12, 12, 15, 18, 15, 12].map(v => v/2) // 16 intervals of 30min
            }
        },
        {
            id: 'crisis_day',
            name: 'Dia de Crise',
            difficulty: 'Difícil',
            description: 'Volume alto e volátil, combinado com eventos negativos. Teste sua gestão sob pressão extrema.',
            dayLength: 480,
            eventProbability: 0.03,
            possibleEvents: ['peak_traffic', 'system_down', 'mass_absenteeism'],
            initialState: {
                agents: { total: 55, back_office: 8 },
                goals: { sla: 80, abandonment: 5, maxWait: 180 },
                callVolumeProfile: [15, 18, 22, 25, 20, 18, 15, 12, 15, 18, 22, 25, 20, 18, 15, 12].map(v => v/2)
            }
        },
        {
            id: 'product_launch',
            name: 'Lançamento de Produto',
            difficulty: 'Média',
            description: 'Volume de chamadas extremamente alto e concentrado, com TMA elevado. Avalia o planejamento para um evento conhecido.',
            dayLength: 480,
            eventProbability: 0.015,
            possibleEvents: ['system_down'],
            initialState: {
                agents: { total: 70, back_office: 15 },
                goals: { sla: 90, abandonment: 4, maxWait: 90 },
                baseTMA: 360, // Higher base TMA
                callVolumeProfile: [10, 12, 15, 20, 30, 35, 30, 25, 15, 12, 15, 20, 30, 35, 30, 25].map(v => v/2)
            }
        },
        {
            id: 'sandbox',
            name: 'Modo Sandbox',
            difficulty: 'N/A',
            description: 'Explore livremente os impactos de cada variável sem metas ou pontuação. Ideal para aprendizado autodirigido.'
        }
    ]
};
