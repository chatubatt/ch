export class Simulator {
    constructor(scenario, container, data) {
        this.scenario = scenario;
        this.container = container;
        this.data = data;
        this.gameInterval = null;
        this.isPaused = false;
        this.isFinished = false;

        this.resetState();
    }

    resetState() {
        this.simTime = 0; // minutes into the day
        this.gameSpeed = 250; // ms per simulated minute
        this.score = 10000;
        
        const initialState = this.scenario.initialState;
        this.state = {
            agents: [],
            callQueue: [],
            callsAnswered: 0,
            callsAbandoned: 0,
            callsAnsweredInSLA: 0,
            totalWaitTime: 0,
            activeEffects: [],
            log: [],
            goals: { ...initialState.goals },
            kpis: {
                sla: 100,
                abandonment: 0,
                tma: initialState.baseTMA || 300,
                maxWait: 0,
                occupancy: 0,
            },
            agentStatus: {
                available: 0,
                on_call: 0,
                on_break: 0, // Not implemented in this version
                back_office: initialState.agents.back_office,
                total: initialState.agents.total
            }
        };

        for (let i = 0; i < initialState.agents.total; i++) {
            this.state.agents.push({
                id: i,
                status: i < initialState.agents.back_office ? 'back_office' : 'available',
                endTaskTime: 0
            });
        }
        this.state.agentStatus.available = initialState.agents.total - initialState.agents.back_office;
    }

    init() {
        this.renderLayout();
        this.bindActions();
        this.updateUI();
        lucide.createIcons();
        this.logEvent(`Simulação iniciada: ${this.scenario.name}`);
        this.gameInterval = setInterval(() => this.tick(), this.gameSpeed);
    }
    
    tick() {
        if (this.isPaused || this.isFinished) return;

        this.simTime++;
        this.updateEffects();
        this.handleCallGeneration();
        this.handleAgentWork();
        this.handleCallAssignment();
        this.handleQueueAbandons();
        this.updateKPIs();
        this.triggerRandomEvent();
        this.updateScore();
        this.updateUI();
        this.checkGameOver();

        if (this.simTime >= this.scenario.dayLength) {
            this.endGame(true);
        }
    }

    handleCallGeneration() {
        const intervalIndex = Math.floor(this.simTime / 30);
        const baseCalls = this.scenario.initialState.callVolumeProfile[intervalIndex] || 0;
        let callMultiplier = 1.0;
        this.state.activeEffects.forEach(eff => {
            if (eff.effect.callVolumeMultiplier) callMultiplier *= eff.effect.callVolumeMultiplier;
        });
        const callsThisMinute = (baseCalls / 30) * callMultiplier;

        if (Math.random() < (callsThisMinute - Math.floor(callsThisMinute))) {
             this.state.callQueue.push({ arrivalTime: this.simTime });
        }
        for(let i=0; i<Math.floor(callsThisMinute); i++){
             this.state.callQueue.push({ arrivalTime: this.simTime });
        }
    }
    
    handleAgentWork() {
        this.state.agents.forEach(agent => {
            if (agent.status === 'on_call' && this.simTime >= agent.endTaskTime) {
                agent.status = 'available';
                this.state.agentStatus.on_call--;
                this.state.agentStatus.available++;
            }
        });
    }

    handleCallAssignment() {
        const availableAgents = this.state.agents.filter(a => a.status === 'available');
        for (const agent of availableAgents) {
            if (this.state.callQueue.length > 0) {
                const call = this.state.callQueue.shift();
                const waitTime = this.simTime - call.arrivalTime;
                
                this.state.callsAnswered++;
                this.state.totalWaitTime += waitTime;
                if (waitTime <= 20) { // SLA threshold: 20 seconds (simulated as minutes here for simplicity)
                    this.state.callsAnsweredInSLA++;
                }

                let tmaModifier = 1.0;
                this.state.activeEffects.forEach(eff => {
                    if (eff.effect.tmaModifier) tmaModifier += eff.effect.tmaModifier;
                });
                
                agent.status = 'on_call';
                agent.endTaskTime = this.simTime + (this.state.kpis.tma / 60) * tmaModifier; // TMA in seconds
                this.state.agentStatus.available--;
                this.state.agentStatus.on_call++;
            } else {
                break;
            }
        }
    }

    handleQueueAbandons() {
        const initialQueueLength = this.state.callQueue.length;
        this.state.callQueue = this.state.callQueue.filter(call => {
            const waitTime = this.simTime - call.arrivalTime;

            if (waitTime > 3) {
                this.state.callsAbandoned++;
                return false;
            }
            return true;
        });
        if (this.state.callQueue.length < initialQueueLength) {
             this.score -= (initialQueueLength - this.state.callQueue.length) * 50; // Penalty for abandoned calls
        }
    }

    updateKPIs() {
        const k = this.state.kpis;
        const totalCallsHandled = this.state.callsAnswered + this.state.callsAbandoned;
        
        k.sla = this.state.callsAnswered > 0 ? (this.state.callsAnsweredInSLA / this.state.callsAnswered) * 100 : 100;
        k.abandonment = totalCallsHandled > 0 ? (this.state.callsAbandoned / totalCallsHandled) * 100 : 0;
        k.maxWait = this.state.callQueue.length > 0 ? this.simTime - this.state.callQueue[0].arrivalTime : 0;
        
        const totalLoggedIn = this.state.agentStatus.available + this.state.agentStatus.on_call;
        k.occupancy = totalLoggedIn > 0 ? (this.state.agentStatus.on_call / totalLoggedIn) * 100 : 0;
    }

    triggerRandomEvent() {
        if (Math.random() < this.scenario.eventProbability) {
            const possibleEvents = this.data.events.filter(e => this.scenario.possibleEvents.includes(e.id));
            if (possibleEvents.length > 0) {
                const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
                this.applyEffect(event);
                this.logEvent(event.description, 'alert');
            }
        }
    }

    applyEffect(source) {
        const effect = { ...source, startTime: this.simTime };
        this.state.activeEffects.push(effect);
    }
    
    updateEffects() {
        this.state.activeEffects = this.state.activeEffects.filter(eff => {
            const elapsed = this.simTime - eff.startTime;
            if (elapsed > eff.duration) {
                this.logEvent(`${eff.name} terminou.`, 'info');
                return false;
            }
            return true;
        });
    }

    updateScore() {
        if (this.state.kpis.sla < this.state.goals.sla) this.score -= 2;
        if (this.state.kpis.abandonment > this.state.goals.abandonment) this.score -= 5;
        if (this.score < 0) this.score = 0;
    }

    checkGameOver() {
        if (this.state.kpis.sla < 50) this.endGame(false, "Nível de Serviço crítico! A operação entrou em colapso.");
        if (this.state.kpis.abandonment > 25) this.endGame(false, "Taxa de Abandono massiva! Os clientes estão desistindo.");
    }
    
    endGame(isWin, message = "") {
        if (this.isFinished) return;
        this.isFinished = true;
        clearInterval(this.gameInterval);

        const resultTitle = isWin ? "Dia Concluído com Sucesso!" : "Falha na Missão!";
        const resultColor = isWin ? "text-green-600" : "text-red-600";
        const finalMessage = isWin ? "Você gerenciou a operação e cumpriu os objetivos do dia." : message;

        this.container.innerHTML = `
            <div class="bg-white p-8 rounded-lg shadow-xl border border-gray-200 text-center animate-fade-in">
                <h2 class="text-3xl font-bold ${resultColor}">${resultTitle}</h2>
                <p class="text-gray-600 mt-4">${finalMessage}</p>
                <div class="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                        <div class="text-sm font-semibold text-gray-500">Pontuação Final</div>
                        <div class="text-3xl font-bold text-brand-blue">${Math.round(this.score)}</div>
                    </div>
                    <div>
                        <div class="text-sm font-semibold text-gray-500">Nível de Serviço</div>
                        <div class="text-3xl font-bold ${this.state.kpis.sla >= this.state.goals.sla ? 'text-green-600' : 'text-red-600'}">${this.state.kpis.sla.toFixed(1)}%</div>
                        <div class="text-xs text-gray-500">Meta: ${this.state.goals.sla}%</div>
                    </div>
                    <div>
                        <div class="text-sm font-semibold text-gray-500">Taxa de Abandono</div>
                        <div class="text-3xl font-bold ${this.state.kpis.abandonment <= this.state.goals.abandonment ? 'text-green-600' : 'text-red-600'}">${this.state.kpis.abandonment.toFixed(1)}%</div>
                         <div class="text-xs text-gray-500">Meta: ${this.state.goals.abandonment}%</div>
                    </div>
                    <div>
                        <div class="text-sm font-semibold text-gray-500">Chamadas Atendidas</div>
                        <div class="text-3xl font-bold text-gray-700">${this.state.callsAnswered}</div>
                    </div>
                </div>
                <div class="mt-8">
                     <a href="#simulator" class="bg-brand-blue text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">Jogar Novamente</a>
                </div>
            </div>
        `;
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6 space-y-4">
                <!-- Timeline and Header -->
                <div class="flex flex-col sm:flex-row justify-between items-center gap-4 pb-4 border-b">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800">${this.scenario.name}</h2>
                        <p class="text-sm text-gray-500">${this.scenario.description}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-3xl font-bold text-gray-800" id="sim-clock">08:00</div>
                        <div class="text-sm font-semibold text-brand-blue" id="sim-score">Pontos: ${this.score}</div>
                    </div>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 sim-timeline-bg">
                    <div id="sim-timeline" class="bg-blue-600 h-2.5 rounded-full sim-timeline-fg" style="width: 0%"></div>
                </div>

                <!-- Main Content -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Left: Agent Status -->
                    <div class="lg:col-span-1 space-y-4 bg-gray-50 p-4 rounded-lg border">
                        <h3 class="text-xl font-bold text-gray-800">Status dos Agentes</h3>
                        <div id="agent-status-panel" class="space-y-3"></div>
                    </div>

                    <!-- Middle: KPIs -->
                    <div class="lg:col-span-2 space-y-4">
                        <div id="kpi-dashboard" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
                    </div>
                </div>

                <!-- Bottom: Actions & Log -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t">
                    <div class="lg:col-span-2 space-y-4">
                         <h3 class="text-xl font-bold text-gray-800">Painel de Ações</h3>
                         <div id="actions-panel" class="grid grid-cols-1 sm:grid-cols-2 gap-3"></div>
                    </div>
                    <div class="lg:col-span-1">
                        <h3 class="text-xl font-bold text-gray-800">Log de Eventos</h3>
                        <div id="log-panel" class="mt-2 text-sm bg-gray-50 p-3 rounded-lg border h-32 overflow-y-auto flex flex-col-reverse"></div>
                    </div>
                </div>
            </div>
            <div id="notification-area" class="fixed bottom-4 right-4 z-50 space-y-2"></div>
        `;
    }
    
    bindActions() {
        const actionsPanel = this.container.querySelector('#actions-panel');
        actionsPanel.innerHTML = this.data.actions.map(action => `
            <button id="action-${action.id}" data-action-id="${action.id}" class="sim-action-btn w-full text-left bg-white p-3 border rounded-lg shadow-sm hover:bg-gray-100 transition-colors">
                <div class="font-bold text-gray-800">${action.name}</div>
                <p class="text-xs text-gray-600">${action.description}</p>
            </button>
        `).join('');

        actionsPanel.querySelectorAll('.sim-action-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const actionId = e.currentTarget.dataset.actionId;
                const action = this.data.actions.find(a => a.id === actionId);
                if (action) {
                    this.executeAction(action, btn);
                }
            });
        });
    }

    executeAction(action, btn) {
        this.score -= action.cost;
        this.logEvent(`Ação: ${action.name} executada.`, 'action');
        
        switch(action.id) {
            case 'alloc_bo':
                let agentsMoved = 0;
                for(let i=0; i < 5 && this.state.agentStatus.back_office > 0; i++) {
                    const agentToMove = this.state.agents.find(a => a.status === 'back_office');
                    if(agentToMove) {
                        agentToMove.status = 'available';
                        this.state.agentStatus.back_office--;
                        this.state.agentStatus.available++;
                        agentsMoved++;
                    }
                }
                 this.logEvent(`${agentsMoved} agentes movidos do Back Office.`, 'info');
                break;
        }

        if (action.effect) {
             this.applyEffect(action);
        }

        btn.disabled = true;
        setTimeout(() => { btn.disabled = false; }, action.cooldown * (this.gameSpeed / 2));
    }
    
    logEvent(message, type = 'info') {
        const logPanel = this.container.querySelector('#log-panel');
        const timeStr = `[${String(Math.floor(8 + this.simTime / 60)).padStart(2, '0')}:${String(this.simTime % 60).padStart(2, '0')}]`;
        const newLog = document.createElement('div');
        newLog.innerHTML = `<span class="font-semibold">${timeStr}</span> ${message}`;
        logPanel.prepend(newLog);

        if(type === 'alert' || type === 'action') {
            const notifArea = document.getElementById('notification-area');
            const notif = document.createElement('div');
            const color = type === 'alert' ? 'bg-red-500' : 'bg-blue-500';
            notif.className = `sim-notification ${color} text-white font-bold p-4 rounded-lg shadow-lg`;
            notif.textContent = message;
            notifArea.appendChild(notif);
            setTimeout(() => notif.remove(), 5000);
        }
    }
    
    updateUI() {
        if (this.isFinished) return;

        const hours = String(Math.floor(8 + this.simTime / 60)).padStart(2, '0');
        const minutes = String(this.simTime % 60).padStart(2, '0');
        this.container.querySelector('#sim-clock').textContent = `${hours}:${minutes}`;
        this.container.querySelector('#sim-timeline').style.width = `${(this.simTime / this.scenario.dayLength) * 100}%`;
        this.container.querySelector('#sim-score').textContent = `Pontos: ${Math.round(this.score)}`;


        const kpiDashboard = this.container.querySelector('#kpi-dashboard');
        const kpis = [
            { id: 'sla', name: 'Nível de Serviço', value: `${this.state.kpis.sla.toFixed(1)}%`, target: this.state.goals.sla, dir: 'up' },
            { id: 'abandonment', nam
(Content truncated due to size limit. Use page ranges or line ranges to read remaining content)