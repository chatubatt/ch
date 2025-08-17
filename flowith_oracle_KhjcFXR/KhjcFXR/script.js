import { loadContent } from './content_parser.js';
import { quizzes } from './data/quiz_data.js';
import { initAuth } from './auth.js';
import { flashcardData } from './data/flashcard_data.js';
import { indicatorsData } from './data/advanced_indicators_data.js';
import { trainingGamesData } from './data/training_games_data.js';
import { reportChallengeData } from './data/report_challenge_data.js';
import { simulatorData } from './data/simulator_data.js';
import { Simulator } from './simulator.js';


let currentReportChallengeIndex = 0;

function saveQuizScore(quizId, score, totalQuestions) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;

    const storageKey = `quiz-scores-${user.email}`;
    let userQuizScores = JSON.parse(localStorage.getItem(storageKey)) || {};

    const scaledScore = totalQuestions > 0 ? Math.round((score / totalQuestions) * 500) : 0;

    const existingScore = userQuizScores[quizId] || 0;
    userQuizScores[quizId] = Math.max(existingScore, scaledScore);

    localStorage.setItem(storageKey, JSON.stringify(userQuizScores));
}

class Quiz {
    constructor(container, quizData, quizId) {
        this.container = container;
        this.quizData = quizData;
        this.quizId = quizId;
        this.questions = this.quizData.questions;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.selectedAnswerIndex = null;

        this.renderIntro();
    }

    renderIntro() {
        this.container.innerHTML = `
            <div class="bg-blue-50 border-2 border-dashed border-blue-200 p-6 rounded-lg text-center">
                <h3 class="text-xl font-bold text-gray-800">${this.quizData.title}</h3>
                <p class="text-gray-600 mt-2">Teste seus conhecimentos para solidificar o aprendizado.</p>
                <button class="start-quiz-btn mt-4 bg-brand-blue text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                    Começar Quiz
                </button>
            </div>
        `;
        this.container.querySelector('.start-quiz-btn').addEventListener('click', () => this.startQuiz());
    }
    
    startQuiz() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.renderQuestion();
    }

    renderQuestion() {
        this.selectedAnswerIndex = null;
        const questionData = this.questions[this.currentQuestionIndex];
        
        const optionsHtml = questionData.options.map((option, index) => `
            <button data-index="${index}" class="quiz-option text-left w-full p-4 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-brand-blue transition-all flex items-center">
                <span class="flex-shrink-0 h-6 w-6 flex items-center justify-center font-mono text-brand-blue font-bold mr-4 bg-blue-100 rounded-full">${String.fromCharCode(65 + index)}</span>
                <span class="flex-1">${option}</span>
            </button>
        `).join('');

        this.container.innerHTML = `
            <div class="bg-white p-6 md:p-8 rounded-lg border border-gray-200 shadow-sm">
                <p class="text-sm font-semibold text-gray-500">Pergunta ${this.currentQuestionIndex + 1} de ${this.questions.length}</p>
                <h4 class="quiz-question mt-2 text-lg md:text-xl font-semibold text-gray-800">${questionData.question}</h4>
                <div class="quiz-options mt-6 space-y-3">${optionsHtml}</div>
                <div class="quiz-feedback mt-6 min-h-[24px]"></div>
                <div class="mt-6 flex justify-end">
                    <button class="verify-btn bg-gray-200 text-gray-500 font-semibold py-2 px-6 rounded-lg transition-colors cursor-not-allowed" disabled>Verificar</button>
                </div>
            </div>
        `;

        this.container.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectOption(e));
        });

        this.container.querySelector('.verify-btn').addEventListener('click', () => this.verifyAnswer());
    }

    selectOption(e) {
        const selectedButton = e.currentTarget;
        this.selectedAnswerIndex = parseInt(selectedButton.dataset.index);

        this.container.querySelectorAll('.quiz-option').forEach(btn => {
            btn.classList.remove('bg-blue-100', 'border-brand-blue', 'ring-2', 'ring-blue-300');
        });
        
        selectedButton.classList.add('bg-blue-100', 'border-brand-blue', 'ring-2', 'ring-blue-300');
        
        const verifyBtn = this.container.querySelector('.verify-btn');
        verifyBtn.disabled = false;
        verifyBtn.classList.remove('bg-gray-200', 'text-gray-500', 'cursor-not-allowed');
        verifyBtn.classList.add('bg-brand-blue', 'text-white', 'hover:bg-blue-700');
    }
    
    verifyAnswer() {
        const questionData = this.questions[this.currentQuestionIndex];
        const isCorrect = this.selectedAnswerIndex === questionData.correctAnswer;
        const options = this.container.querySelectorAll('.quiz-option');
        const feedbackContainer = this.container.querySelector('.quiz-feedback');
        
        options.forEach(btn => {
            btn.disabled = true;
            btn.classList.remove('bg-blue-100', 'border-brand-blue', 'ring-2', 'ring-blue-300');
        });
        
        if (isCorrect) {
            this.score++;
            options[this.selectedAnswerIndex].classList.add('bg-green-100', 'border-green-500', 'ring-2', 'ring-green-300');
            feedbackContainer.innerHTML = `<p class="text-green-700 font-semibold">Resposta Correta!</p>`;
        } else {
            options[this.selectedAnswerIndex].classList.add('bg-red-100', 'border-red-500', 'ring-2', 'ring-red-300');
            options[questionData.correctAnswer].classList.add('bg-green-100', 'border-green-500', 'ring-2', 'ring-green-300');
            feedbackContainer.innerHTML = `<p class="text-red-700 font-semibold">Resposta Incorreta.</p>`;
        }

        this.container.querySelector('.verify-btn').remove();
        const buttonContainer = this.container.querySelector('.flex.justify-end');
        if (buttonContainer) {
            buttonContainer.innerHTML = `
                <button class="next-btn bg-brand-blue text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                    ${this.currentQuestionIndex < this.questions.length - 1 ? 'Próxima Pergunta' : 'Ver Resultado'}
                </button>
            `;
            buttonContainer.querySelector('.next-btn').addEventListener('click', () => this.nextStep());
        }
    }

    nextStep() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.questions.length) {
            this.renderQuestion();
        } else {
            this.renderResult();
        }
    }

    renderResult() {
        const percentage = Math.round((this.score / this.questions.length) * 100);
        if (this.quizId) {
            saveQuizScore(this.quizId, this.score, this.questions.length);
        }
        this.container.innerHTML = `
            <div class="bg-white p-8 rounded-lg border border-gray-200 shadow-sm text-center">
                <h3 class="text-2xl font-bold text-gray-800">Quiz Concluído!</h3>
                <p class="text-gray-600 mt-4 text-lg">
                    Você acertou <span class="font-bold text-brand-blue">${this.score}</span> de 
                    <span class="font-bold text-gray-800">${this.questions.length}</span> perguntas. (${percentage}%)
                </p>
                <button class="restart-quiz-btn mt-6 bg-brand-blue text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                    Recomeçar Quiz
                </button>
            </div>
        `;
        this.container.querySelector('.restart-quiz-btn').addEventListener('click', () => this.renderIntro());
    }
}

function initializeQuizzes() {
    Object.keys(quizzes).forEach(moduleKey => {
        const moduleNum = moduleKey.split('-')[1];
        const quizContainer = document.getElementById(`quiz-module-${moduleNum}`);
        const quizData = quizzes[moduleKey];
        if (quizContainer && quizData) {
            new Quiz(quizContainer, quizData, moduleKey);
        }
    });
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
    });
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.classList.remove('hidden');
        document.querySelectorAll('.nav-link, .nav-link-mobile').forEach(link => {
            const linkHash = new URL(link.href).hash;
            const targetHash = `#${viewId.replace('-view', '')}`;
            if (linkHash === targetHash) {
                link.classList.add('text-brand-blue', 'font-semibold');
                link.classList.remove('text-gray-700');
            } else {
                link.classList.remove('text-brand-blue', 'font-semibold');
                link.classList.add('text-gray-700');
            }
        });
    }
}

function renderDashboard() {
    const dashboardView = document.getElementById('dashboard-view');
    dashboardView.innerHTML = `
        <div class="text-center mb-12">
            <h1 class="text-4xl font-bold text-gray-900">Dashboard de Aprendizagem</h1>
            <p class="mt-4 text-lg text-gray-600">Escolha um módulo para começar seu treinamento.</p>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <a href="#training" class="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                 <div class="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center bg-sky-100 text-sky-600">
                    <i data-lucide="book-open-check" class="w-8 h-8"></i>
                </div>
                <div class="text-center sm:text-left">
                    <h2 class="text-xl font-bold text-gray-800 group-hover:text-brand-blue transition-colors">Trilha de Aprendizagem</h2>
                    <p class="text-gray-600 mt-1">Acesse o conteúdo teórico, vídeos e quizzes sobre os fundamentos do Control Desk.</p>
                </div>
            </a>
            <a href="#flashcards" class="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                <div class="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600">
                    <i data-lucide="layers" class="w-8 h-8"></i>
                </div>
                <div class="text-center sm:text-left">
                    <h2 class="text-xl font-bold text-gray-800 group-hover:text-brand-blue transition-colors">Flashcards Interativos</h2>
                    <p class="text-gray-600 mt-1">Memorize os principais KPIs e conceitos da área de forma rápida e divertida.</p>
                </div>
            </a>
            <a href="#advanced-indicators" class="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                <div class="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center bg-teal-100 text-teal-600">
                    <i data-lucide="bar-chart-3" class="w-8 h-8"></i>
                </div>
                <div class="text-center sm:text-left">
                    <h2 class="text-xl font-bold text-gray-800 group-hover:text-brand-blue transition-colors">Indicadores Avançados</h2>
                    <p class="text-gray-600 mt-1">Aprofunde-se nos KPIs e salve suas próprias análises para estudo.</p>
                </div>
            </a>
            <a href="#report-challenge" class="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                 <div class="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center bg-rose-100 text-rose-600">
                    <i data-lucide="file-search-2" class="w-8 h-8"></i>
                </div>
                <div class="text-center sm:text-left">
                    <h2 class="text-xl font-bold text-gray-800 group-hover:text-brand-blue transition-colors">Desafio de Relatórios</h2>
                    <p class="text-gray-600 mt-1">Valide relatórios, encontre erros e aprimore sua análise crítica.</p>
                </div>
            </a>
            <a href="#training-games" class="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                <div class="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center bg-purple-100 text-purple-600">
                    <i data-lucide="gamepad-2" class="w-8 h-8"></i>
                </div>
                <div class="text-center sm:text-left">
                    <h2 class="text-xl font-bold text-gray-800 group-hover:text-brand-blue transition-colors">Jogos de Treinamento</h2>
                    <p class="text-gray-600 mt-1">Desenvolva suas habilidades analíticas através de jogos interativos e divertidos.</p>
                </div>
            </a>
            <a href="#simulator" class="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                <div class="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center bg-red-100 text-red-600">
                    <i data-lucide="cpu" class="w-8 h-8"></i>
                </div>
                <div class="text-center sm:text-left">
                    <h2 class="text-xl font-bold text-gray-800 group-hover:text-brand-blue transition-colors">Simulador de Control Desk</h2>
                    <p class="text-gray-600 mt-1">Gerencie uma operação em tempo real, tome decisões críticas e veja o impacto nos KPIs.</p>
                </div>
            </a>
            <a href="#ranking" class="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                 <div class="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center bg-amber-100 text-amber-600">
                    <i data-lucide="trophy" class="w-8 h-8"></i>
                </div>
                <div class="text-center sm:text-left">
                    <h2 class="text-xl font-bold text-gray-800 group-hover:text-brand-blue transition-colors">Ranking Geral</h2>
                    <p class="text-gray-600 mt-1">Compare sua pontuação com a de outros membros da equipe.</p>
                </div>
            </a>
        </div>
    `;
    lucide.createIcons();
    showView('dashboard-view');
}

function renderTraining() {
    const trainingView = document.getElementById('training-view');
    if (trainingView.innerHTML.trim() === '') {
        trainingView.innerHTML = `
            <section id="intro" class="py-16 md:py-24 animated-section"><div id="intro-content"><div class="loader"></div></div></section>
            <div class="space-y-16 md:space-y-24">
                <section id="module-1" class="module-section animated-section">
                    <div class="module-icon"><img src="https://r2.flowith.net/files/o/1751089049709-strategic_thinking_icon_for_control_desk_module_index_1@1024x1024.png" alt="Ícone Módulo 1"></div>
                    <div class="flex-grow w-full"><div id="module-1-content"><div class="loader"></div></div><div id="quiz-module-1" class="mt-12"></div></div>
                </section>
                <section id="module-2" class="module-section animated-section">
                    <div class="module-icon"><img src="https://r2.flowith.net/files/o/1751089090008-real_time_monitoring_module_icon_design_index_3@1024x1024.png" alt="Ícone Módulo 2"></div>
                    <div class="flex-grow w-full"><div id="module-2-content"><div class="loader"></div></div><div id="quiz-module-2" class="mt-12"></div></div>
                </section>
                <section id="module-3" class="module-section animated-section">
                    <div class="module-icon"><img src="https://r2.flowith.net/files/o/1751089040232-data_analysis_and_reporting_module_icon_index_4@1024x1024.png" alt="Ícone Módulo 3"></div>
                    <div class="flex-grow w-full"><div id="module-3-content"><div class="loader"></div></div><div id="quiz-module-3" class="mt-12"></div></div>
                </section>
                <section id="module-4" class="module-section animated-section">
                    <div class="module-icon"><img src="https://r2.flowith.net/files/o/1751089039324-people_management_and_team_sizing_icon_design_index_7@1024x1024.png" alt="Ícone Módulo 4"></div>
                    <div class="flex-grow w-full"><div id="module-4-content"><div class="loader"></div></div><div id="quiz-module-4" class="mt-12"></div></div>
                </section>
            </div>
            <section id="conclusion" class="py-16 md:py-24 animated-section"><div id="conclusion-content"><div class="loader"></div></div></section>
        `;
        loadContent().then(initializeQuizzes).catch(error => {
            console.error("Failed to load content:", error);
            trainingView.innerHTML = `<p class="text-red-500">Erro ao carregar o conteúdo do treinamento.</p>`;
        });
        const animatedSections = trainingView.querySelectorAll('.animated-section');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        animatedSections.forEach(section => observer.observe(section));
    }
    showView('training-view');
}

function renderFlashcards() {
    const flashcardsView = document.getElementById('flashcards-view');
    const cardsHtml = flashcardData.map((card, index) => `
        <div class="flashcard h-64" id="flashcard-${index}">
            <div class="flashcard-inner">
                <div class="flashcard-front bg-white">
                    <h3 class="text-2xl font-bold text-gray-800 text-center">${card.term}</h3>
                    <div class="mt-4 text-gray-500 flex items-center gap-2">
                        <i data-lucide="mouse-pointer-click" class="w-4 h-4"></i>
                        <span>Clique para virar</span>
                    </div>
                </div>
                <div class="flashcard-back bg-blue-50">
                    <p class="text-gray-700 text-center">${card.definition}</p>
                </div>
            </div>
        </div>
    `).join('');

    flashcardsView.innerHTML = `
        <div class="text-center mb-12">
            <h1 class="text-4xl font-bold text-gray-900">Flashcards Interativos</h1>
            <p class="mt-4 text-lg text-gray-600">Teste seus conhecimentos sobre os KPIs e conceitos chave.</p>
        </div>
        <div class="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            ${cardsHtml}
        </div>
    `;
    lucide.createIcons();
    flashcardsView.querySelectorAll('.flashcard').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('is-flipped');
        });
    });
    showView('flashcards-view');
}

function renderAdvancedIndicators() {
    const view = document.getElementById('advanced-indicators-view');
    if (view.innerHTML.trim() !== '') {
        showView('advanced-indicators-view');
        return;
    }

    const content = `
        <div class="text-center mb-12">
            <h1 class="text-4xl font-bold text-gray-900">Indicadores Avançados</h1>
            <p class="mt-4 text-lg text-gray-600">Aprofunde seu conhecimento nos KPIs essenciais. Salve sua própria análise para referência futura.</p>
        </div>
        <div class="space-y-6 max-w-4xl mx-auto">
            ${indicatorsData.map(indicator => `
                <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden indicator-accordion">
                    <div class="p-4 md:p-6 cursor-pointer flex justify-between items-center hover:bg-gray-50 indicator-toggle">
                        <h2 class="text-xl font-bold text-gray-800">${indicator.title}</h2>
                        <i data-lucide="chevron-down" class="transition-transform duration-300"></i>
                    </div>
                    <div class="indicator-content hidden p-4 md:p-6 border-t border-gray-200">
                        <div class="prose prose-sm sm:prose-base max-w-none">
                            <h4>Definição</h4>
                            <p>${indicator.definition}</p>
                            <h4>Análise Aprofundada</h4>
                            ${indicator.analysis}
                        </div>
                        <div class="mt-8">
                             <h4 class="font-semibold text-gray-800 mb-2">Minha Explicação Dissertativa</h4>
                             <p class="text-sm text-gray-500 mb-4">Escreva sua análise sobre este indicador. Seu texto será salvo localmente no seu navegador.</p>
                             <textarea id="explanation-${indicator.id}" rows="6" class="w-full p-3 border border-gray-300 rounded-md focus:ring-brand-blue focus:border-brand-blue transition"></textarea>
                             <div class="flex justify-end items-center mt-4">
                                <span id="feedback-${indicator.id}" class="text-sm text-green-600 font-semibold mr-4 hidden">Salvo com sucesso!</span>
                                <button class="save-explanation-btn bg-brand-blue text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors" data-indicator-id="${indicator.id}">
                                    Salvar Explicação
                                </button>
                             </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    view.innerHTML = content;
    lucide.createIcons();
    
    view.querySelectorAll('.indicator-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const content = toggle.nextElementSibling;
            const icon = toggle.querySelector('i');
            content.classList.toggle('hidden');
            icon.classList.toggle('rotate-180');
        });
    });

    indicatorsData.forEach(indicator => {
        const textarea = view.querySelector(`#explanation-${indicator.id}`);
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const storageKey = `explanation-${indicator.id}-${user ? user.email : 'guest'}`;
        
        const savedText = localStorage.getItem(storageKey);
        if (savedText) {
            textarea.value = savedText;
        }

        const saveBtn = view.querySelector(`button[data-indicator-id="${indicator.id}"]`);
        saveBtn.addEventListener('click', () => {
            localStorage.setItem(storageKey, textarea.value);
            const feedback = view.querySelector(`#feedback-${indicator.id}`);
            feedback.classList.remove('hidden');
            setTimeout(() => {
                feedback.classList.add('hidden');
            }, 2500);
        });
    });

    showView('advanced-indicators-view');
}

function renderReportChallenge() {
    const view = document.getElementById('report-challenge-view');
    view.innerHTML = `
        <div class="text-center mb-12">
            <h1 class="text-4xl font-bold text-gray-900">Desafio de Validação de Relatórios</h1>
            <p class="mt-4 text-lg text-gray-600">Analise os relatórios, encontre os erros e proponha a análise correta.</p>
        </div>
        <div id="challenge-content" class="max-w-7xl mx-auto"></div>
    `;

    loadChallenge(0);
    showView('report-challenge-view');
}

function loadChallenge(index) {
    currentReportChallengeIndex = index;
    const container = document.getElementById('challenge-content');
    const reportData = reportChallengeData[index];

    const navButtons = reportChallengeData.map((report, i) => `
        <button
            class="challenge-nav-btn px-4 py-2 text-sm font-semibold rounded-md transition-colors ${i === index ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
            data-index="${i}"
        >
            Desafio ${i + 1}
        </button>
    `).join('');

    container.innerHTML = `
        <div class="bg-white p-6 md:p-8 rounded-lg shadow-lg border border-gray-200">
            <div class="flex flex-wrap gap-2 mb-6 border-b pb-4">${navButtons}</div>

            <div id="challenge-display">
                <h2 class="text-2xl font-bold text-gray-800 mb-2">${reportData.title}</h2>
                <p class="text-gray-600 mb-6">Sua tarefa é analisar os dados e a conclusão apresentada, validando sua precisão.</p>
                
                <div class="prose max-w-none mb-8 bg-gray-50 p-6 rounded-lg border">
                    ${reportData.scenario_html}
                </div>

                <div class="mt-8">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">Sua Análise</h3>
                    <p class="text-sm text-gray-500 mb-4">Descreva os erros que você encontrou e qual seria a análise correta.</p>
                    <textarea id="user-analysis" rows="8" class="w-full p-3 border border-gray-300 rounded-md focus:ring-brand-blue focus:border-brand-blue transition" placeholder="Digite sua análise aqui..."></textarea>
                    <div class="flex justify-end mt-4">
                        <button id="submit-analysis-btn" class="bg-brand-blue text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                            Verificar Análise
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.querySelectorAll('.challenge-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            loadChallenge(parseInt(e.currentTarget.dataset.index));
        });
    });

    container.querySelector('#submit-analysis-btn').addEventListener('click', () => {
        const userAnswer = container.querySelector('#user-analysis').value;
        showComparison(userAnswer);
    });
}

function showComparison(userAnswer) {
    const displayContainer = document.getElementById('challenge-display');
    const reportData = reportChallengeData[currentReportChallengeIndex];

    displayContainer.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Comparação da Análise: ${reportData.title}</h2>
        <div class="grid md:grid-cols-2 gap-8">
            <div>
                <h3 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Sua Resposta</h3>
                <div class="bg-gray-50 p-4 rounded-lg prose prose-sm max-w-none min-h-[300px] border">
                    <p>${userAnswer ? userAnswer.replace(new RegExp('\\n', 'g'), '<br>') : '<i>Nenhuma resposta fornecida.</i>'}</p>
                </div>
            </div>
            <div>
                <h3 class="text-xl font-semibold text-blue-800 border-b border-blue-200 pb-2 mb-4">Gabarito e Análise Corrigida</h3>
                <div class="bg-blue-50 p-4 rounded-lg prose prose-sm max-w-none border border-blue-200">
                    ${reportData.solution_html}
                </div>
            </div>
        </div>
        <div class="mt-8 text-center">
             <button id="try-another-btn" class="bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors">
                Tentar Este Desafio Novamente
            </button>
        </div>
    `;

    document.getElementById('try-another-btn').addEventListener('click', () => {
        loadChallenge(currentReportChallengeIndex);
    });
}

function saveGameScore(gameId, score, gameData = {}) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const storageKey = `game-scores-${user ? user.email : 'guest'}`;
    
    let gameScores = JSON.parse(localStorage.getItem(storageKey)) || {};
    if (!gameScores[gameId]) {
        gameScores[gameId] = [];
    }
    
    const scoreEntry = {
        score: score,
        timestamp: new Date().toISOString(),
        ...gameData
    };
    
    gameScores[gameId].push(scoreEntry);
    gameScores[gameId] = gameScores[gameId].slice(-10);
    
    localStorage.setItem(storageKey, JSON.stringify(gameScores));
    return scoreEntry;
}

function getGameScores(gameId) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const storageKey = `game-scores-${user ? user.email : 'guest'}`;
    const gameScores = JSON.parse(localStorage.getItem(storageKey)) || {};
    return gameScores[gameId] || [];
}

function renderTrainingGames() {
    const view = document.getElementById('training-games-view');
    
    view.innerHTML = `
        <div class="text-center mb-12">
            <h1 class="text-4xl font-bold text-gray-900">Jogos de Treinamento</h1>
            <p class="mt-4 text-lg text-gray-600">Desenvolva suas habilidades analíticas através de jogos interativos e divertidos.</p>
        </div>
        
        <div class="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div class="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        <i data-lucide="puzzle" class="w-8 h-8 text-blue-600"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800">Quebra-Cabeça de Indicadores</h2>
                    <p class="text-gray-600 mt-2">Arraste e solte as definições corretas para cada indicador KPI.</p>
                </div>
                <div class="text-center">
                    <button id="start-puzzle-game" class="bg-brand-blue text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                        Iniciar Jogo
                    </button>
                </div>
                <div id="puzzle-scores" class="mt-6"></div>
            </div>
            
            <div class="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                        <i data-lucide="settings" class="w-8 h-8 text-green-600"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800">Simulador de Alavancas</h2>
                    <p class="text-gray-600 mt-2">Tome decisões estratégicas e veja o impacto nos KPIs em tempo real.</p>
                </div>
                <div class="text-center">
                    <button id="start-simulator-game" class="bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors">
                        Iniciar Simulação
                    </button>
                </div>
                <div id="simulator-scores" class="mt-6"></div>
            </div>
        </div>
        
        <div id="game-container" class="hidden mt-12"></div>
    `;
    
    lucide.createIcons();
    
    displayGameScores('puzzle-game', 'puzzle-scores');
    displayGameScores('simulator-game', 'simulator-scores');
    
    document.getElementById('start-puzzle-game').addEventListener('click', () => startPuzzleGame());
    document.getElementById('start-simulator-game').addEventListener('click', () => startSimulatorGame());
    
    showView('training-games-view');
}

function displayGameScores(gameId, containerId) {
    const scores = getGameScores(gameId);
    const container = document.getElementById(containerId);
    
    if (scores.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 text-center">Nenhuma pontuação ainda</p>';
        return;
    }
    
    const bestScore = Math.max(...scores.map(s => s.score));
    const lastScore = scores[scores.length - 1];
    
    container.innerHTML = `
        <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-800 mb-2">Suas Pontuações</h4>
            <div class="text-sm text-gray-600 space-y-1">
                <div>Melhor: <span class="font-bold text-green-600">${bestScore} pontos</span></div>
                <div>Última: <span class="font-bold text-blue-600">${lastScore.score} pontos</span></div>
                <div>Total de jogos: ${scores.length}</div>
            </div>
        </div>
    `;
}

function startPuzzleGame() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.classList.remove('hidden');
    
    const indicators = trainingGamesData.puzzleGame.indicators;
    const definitions = [...trainingGamesData.puzzleGame.definitions].sort(() => Math.random() - 0.5);
    
    let currentScore = 1000;
    let correctMatches = 0;
    let startTime = Date.now();
    
    gameContainer.innerHTML = `
        <div class="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-800">Quebra-Cabeça de Indicadores</h3>
                <div class="text-right">
                    <div class="text-sm text-gray-600">Pontuação</div>
                    <div id="current-score" class="text-xl font-bold text-brand-blue">${currentScore}</div>
                </div>
            </div>
            
            <div class="grid md:grid-cols-2 gap-8">
                <div>
                    <h4 class="font-semibold text-gray-800 mb-4">Indicadores</h4>
                    <div id="indicators-list" class="space-y-3">
                        ${indicators.map((indicator, index) => `
                            <div class="indicator-drop-zone p-4 border-2 border-dashed border-gray-300 rounded-lg min-h-[80px] flex items-center justify-center" data-indicator="${indicator.id}">
                                <div class="text-center">
                                    <div class="font-semibold text-gray-800">${indicator.name}</div>
                                    <div class="text-sm text-gray-500 mt-1">${indicator.abbreviation}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <h4 class="font-semibold text-gray-800 mb-4">Definições (arraste para o indicador correto)</h4>
                    <div id="definitions-list" class="space-y-3">
                        ${definitions.map((definition, index) => `
                            <div class="definition-item p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-move" draggable="true" data-definition-id="${definition.id}">
                                <div class="text-sm text-gray-700">${definition.text}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="mt-8 text-center">
                <button id="finish-puzzle" class="bg-brand-blue text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors" disabled>
                    Finalizar Jogo
                </button>
                <button id="back-to-games" class="ml-4 bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors">
                    Voltar aos Jogos
                </button>
            </div>
            
            <div id="game-feedback" class="mt-6 text-center"></div>
        </div>
    `;
    
    const definitionItems = gameContainer.querySelectorAll('.definition-item');
    const dropZones = gameContainer.querySelectorAll('.indicator-drop-zone');
    
    definitionItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.dataset.definitionId);
        });
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('border-brand-blue', 'bg-blue-50');
        });
        
        zone.addEventListener('dragleave', (e) => {
            zone.classList.remove('border-brand-blue', 'bg-blue-50');
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            const definitionId = e.dataTransfer.getData('text/plain');
            const definitionElement = gameContainer.querySelector(`[data-definition-id="${definitionId}"]`);
            
            if (zone.children.length === 1) {
                zone.appendChild(definitionElement);
                zone.classList.remove('border-brand-blue', 'bg-blue-50');
                zone.classList.add('border-green-500', 'bg-green-50');
                
                checkPuzzleCompletion();
            }
        });
    });
    
    function checkPuzzleCompletion() {
        const filledDropZones = gameContainer.querySelectorAll('.indicator-drop-zone .definition-item');
        if (filledDropZones.length === indicators.length) {
            document.getElementById('finish-puzzle').disabled = false;
        }
    }
    
    document.getElementById('finish-puzzle').addEventListener('click', () => {
        finishPuzzleGame();
    });
    
    document.getElementById('back-to-games').addEventListener('click', () => {
        gameContainer.classList.add('hidden');
    });
    
    function finishPuzzleGame() {
        correctMatches = 0;
        
        dropZones.forEach(zone => {
            const indicatorId = zone.dataset.indicator;
            const definitionElement = zone.querySelector('.definition-item');
            
            if (definitionElement) {
                const definitionId = definitionElement.dataset.definitionId;
                const isCorrect = indicatorId === definitionId;
                
                if (isCorrect) {
                    correctMatches++;
                    zone.classList.add('border-green-500', 'bg-green-100');
                } else {
                    zone.classList.add('border-red-500', 'bg-red-100');
                    currentScore -= 100;
                }
            }
        });
        
        const timeBonus = Math.max(0, 300 - Math.floor((Date.now() - startTime) / 1000));
        const finalScore = currentScore + (correctMatches * 200) + timeBonus;
        
        const gameData = {
            correctMatches: correctMatches,
            totalIndicators: indicators.length,
            timeSpent: Math.floor((Date.now() - startTime) / 1000)
        };
        
        saveGameScore('puzzle-game', finalScore, gameData);
        
        document.getElementById('game-feedback').innerHTML = `
            <div class="bg-white p-6 rounded-lg border border-gray-200">
                <h4 class="text-xl font-bold text-gray-800 mb-4">Resultado Final</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <div class="text-2xl font-bold text-green-600">${correctMatches}</div>
                        <div class="text-sm text-gray-600">Acertos</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-red-600">${indicators.length - correctMatches}</div>
                        <div class="text-sm text-gray-600">Erros</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-blue-600">+${timeBonus}</div>
                        <div class="text-sm text-gray-600">Bônus Tempo</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-brand-blue">${finalScore}</div>
                        <div class="text-sm text-gray-600">Pontuação Final</div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('finish-puzzle').style.display = 'none';
    }
}

function startSimulatorGame() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.classList.remove('hidden');
    
    const scenario = trainingGamesData.simulatorGame.scenarios[0];
    let currentKPIs = { ...scenario.initialKPIs };
    let availableActions = [...trainingGamesData.simulatorGame.actions];
    let actionsUsed = 0;
    let gameScore = 1000;
    let startTime = Date.now();
    
    gameContainer.innerHTML = `
        <div class="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-800">Simulador de Alavancas de Gestão</h3>
                <div class="text-right">
                    <div class="text-sm text-gray-600">Pontuação</div>
                    <div id="simulator-score" class="text-xl font-bold text-brand-blue">${gameScore}</div>
                </div>
            </div>
            
            <div class="mb-6">
                <h4 class="font-semibold text-gray-800 mb-3">Cenário: ${scenario.name}</h4>
                <p class="text-gray-600">${scenario.description}</p>
            </div>
            
            <div class="grid md:grid-cols-2 gap-8">
                <div>
                    <h4 class="font-semibold text-gray-800 mb-4">Dashboard de KPIs</h4>
                    <div id="kpi-dashboard" class="space-y-3">
                        ${Object.entries(currentKPIs).map(([kpi, data]) => `
                            <div class="kpi-card p-4 rounded-lg border ${getKPIStatusClass(data.current, data.target)}">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <div class="font-semibold">${kpi}</div>
                                        <div class="text-sm text-gray-600">Meta: ${data.target}${data.unit}</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-2xl font-bold">${data.current}${data.unit}</div>
                                        <div class="text-sm ${getKPIStatusTextClass(data.current, data.target)}">
                                            ${getKPIStatus(data.current, data.target)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <h4 class="font-semibold text-gray-800 mb-4">Ações Disponíveis</h4>
                    <div id="actions-list" class="space-y-3">
                        ${availableActions.map(action => `
                            <button class="action-btn w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" data-action-id="${action.id}">
                                <div class="font-semibold">${action.name}</div>
                                <div class="text-sm text-gray-600">${action.description}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="mt-8 text-center">
                <button id="finish-simulation" class="bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors">
                    Finalizar Simulação
                </button>
                <button id="back-to-games-sim" class="ml-4 bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors">
                    Voltar aos Jogos
                </button>
            </div>
            
            <div id="simulation-feedback" class="mt-6"></div>
        </div>
    `;
    
    function getKPIStatusClass(current, target) {
        const percentage = (current / target) * 100;
        if (percentage >= 95 && percentage <= 105) return 'border-green-500 bg-green-50';
        if (percentage >= 85 && percentage < 95) return 'border-yellow-500 bg-yellow-50';
        return 'border-red-500 bg-red-50';
    }
    
    function getKPIStatusTextClass(current, target) {
        const percentage = (current / target) * 100;
        if (percentage >= 95 && percentage <= 105) return 'text-green-600';
        if (percentage >= 85 && percentage < 95) return 'text-yellow-600';
        return 'text-red-600';
    }
    
    function getKPIStatus(current, target) {
        const percentage = (current / target) * 100;
        if (percentage >= 95 && percentage <= 105) return 'Na Meta';
        if (percentage >= 85 && percentage < 95) return 'Atenção';
        return 'Crítico';
    }
    
    function updateKPIDashboard() {
        const dashboard = document.getElementById('kpi-dashboard');
        dashboard.innerHTML = Object.entries(currentKPIs).map(([kpi, data]) => `
            <div class="kpi-card p-4 rounded-lg border ${getKPIStatusClass(data.current, data.target)}">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-semibold">${kpi}</div>
                        <div class="text-sm text-gray-600">Meta: ${data.target}${data.unit}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold">${data.current}${data.unit}</div>
                        <div class="text-sm ${getKPIStatusTextClass(data.current, data.target)}">
                            ${getKPIStatus(data.current, data.target)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const actionId = e.currentTarget.dataset.actionId;
            const action = availableActions.find(a => a.id === actionId);
            
            if (action) {
                Object.entries(action.effects).forEach(([kpi, effect]) => {
                    if (currentKPIs[kpi]) {
                        currentKPIs[kpi].current += effect;
                        if (currentKPIs[kpi].current < 0) currentKPIs[kpi].current = 0;
                    }
                });
                
                actionsUsed++;
                gameScore += action.scoreImpact || 0;
                
                availableActions = availableActions.filter(a => a.id !== actionId);
                
                updateKPIDashboard();
                
                e.currentTarget.remove();
                
                document.getElementById('simulator-score').textContent = gameScore;
                
                showActionFeedback(action);
            }
        });
    });
    
    function showActionFeedback(action) {
        const feedbackDiv = document.getElementById('simulation-feedback');
        feedbackDiv.innerHTML = `
            <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div class="font-semibold text-blue-800">Ação Executada: ${action.name}</div>
                <div class="text-sm text-blue-600 mt-1">${action.feedback || 'Ação aplicada com sucesso!'}</div>
            </div>
        `;
        
        setTimeout(() => {
            feedbackDiv.innerHTML = '';
        }, 3000);
    }
    
    document.getElementById('finish-simulation').addEventListener('click', () => {
        const inTargetKPIs = Object.values(currentKPIs).filter(kpi => {
            const percentage = (kpi.current / kpi.target) * 100;
            return percentage >= 95 && percentage <= 105;
        }).length;
        
        const totalKPIs = Object.keys(currentKPIs).length;
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        const efficiencyBonus = Math.max(0, (availableActions.length * 50));
        const targetBonus = inTargetKPIs * 200;
        
        const finalScore = gameScore + targetBonus + efficiencyBonus;
        
        const gameData = {
            kpisInTarget: inTargetKPIs,
            totalKPIs: totalKPIs,
            actionsUsed: actionsUsed,
            timeSpent: timeSpent
        };
        
        saveGameScore('simulator-game', finalScore, gameData);
        
        document.getElementById('simulation-feedback').innerHTML = `
            <div class="bg-white p-6 rounded-lg border border-gray-200">
                <h4 class="text-xl font-bold text-gray-800 mb-4">Resultado da Simulação</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                    <div>
                        <div class="text-2xl font-bold text-green-600">${inTargetKPIs}</div>
                        <div class="text-sm text-gray-600">KPIs na Meta</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-blue-600">${actionsUsed}</div>
                        <div class="text-sm text-gray-600">Ações Usadas</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-purple-600">+${targetBonus + efficiencyBonus}</div>
                        <div class="text-sm text-gray-600">Bônus</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-brand-blue">${finalScore}</div>
                        <div class="text-sm text-gray-600">Pontuação Final</div>
                    </div>
                </div>
                <div class="text-center">
                    <div class="text-lg font-semibold text-gray-800">
                        ${inTargetKPIs === totalKPIs ? 'Excelente! Todos os KPIs estão na meta!' : 
                          inTargetKPIs >= totalKPIs * 0.7 ? 'Bom trabalho! A maioria dos KPIs estão controlados.' :
                          'Continue praticando para melhorar sua gestão de KPIs.'}
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('finish-simulation').style.display = 'none';
    });
    
    document.getElementById('back-to-games-sim').addEventListener('click', () => {
        gameContainer.classList.add('hidden');
    });
}

function renderRanking() {
    const view = document.getElementById('ranking-view');
    view.innerHTML = `<div class="text-center py-12"><div class="loader"></div></div>`;
    showView('ranking-view');

    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        if (users.length === 0) {
            view.innerHTML = `<div class="text-center py-12"><p class="text-gray-600">Nenhum usuário registrado para exibir no ranking.</p></div>`;
            return;
        }

        const leaderboard = users.map(user => {
            let totalScore = 0;

            const quizScoresKey = `quiz-scores-${user.email}`;
            const userQuizScores = JSON.parse(localStorage.getItem(quizScoresKey)) || {};
            totalScore += Object.values(userQuizScores).reduce((sum, score) => sum + (Number(score) || 0), 0);
            
            const gameScoresKey = `game-scores-${user.email}`;
            const userGameScores = JSON.parse(localStorage.getItem(gameScoresKey)) || {};
            for (const gameId in userGameScores) {
                const scores = userGameScores[gameId];
                if (scores && scores.length > 0) {
                    const maxScore = Math.max(...scores.map(s => s.score));
                    totalScore += maxScore;
                }
            }
            
            return {
                name: user.name,
                totalScore: totalScore
            };
        });

        leaderboard.sort((a, b) => b.totalScore - a.totalScore);
        
        const tableRows = leaderboard.map((user, index) => {
            let rankClass = 'font-semibold text-gray-700';
            if (index === 0) rankClass = 'font-bold text-2xl text-amber-500';
            else if (index === 1) rankClass = 'font-bold text-xl text-gray-500';
            else if (index === 2) rankClass = 'font-bold text-lg text-orange-700';

            return `
            <tr class="border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors">
                <td class="p-4 font-semibold text-center align-middle">
                    <span class="${rankClass}">${index + 1}</span>
                </td>
                <td class="p-4 flex items-center space-x-4 align-middle">
                    <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm flex-shrink-0">${user.name.split(' ').map(n=>n[0]).join('').toUpperCase()}</div>
                    <span class="font-medium text-gray-800">${user.name}</span>
                </td>
                <td class="p-4 font-bold text-brand-blue text-center text-lg align-middle">${user.totalScore.toLocaleString('pt-BR')}</td>
            </tr>
        `}).join('');

        view.innerHTML = `
            <div class="text-center mb-12">
                <h1 class="text-4xl font-bold text-gray-900">Ranking Geral</h1>
                <p class="mt-4 text-lg text-gray-600">Veja quem está no topo da Academia Control Desk!</p>
            </div>
            <div class="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-w-4xl mx-auto">
                <table class="w-full text-left">
                    <thead class="bg-gray-100 border-b border-gray-200">
                        <tr>
                            <th class="p-4 w-24 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Posição</th>
                            <th class="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Usuário</th>
                            <th class="p-4 w-48 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Pontuação Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leaderboard.length > 0 && leaderboard.some(u => u.totalScore > 0) ? tableRows : '<tr><td colspan="3" class="p-8 text-center text-gray-500">Nenhuma pontuação registrada ainda. Comece os quizzes e jogos!</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error("Error rendering ranking:", error);
        view.innerHTML = `<div class="text-center py-12"><p class="text-red-500">Ocorreu um erro ao carregar o ranking.</p></div>`;
    }
}

function renderSimulator() {
    const view = document.getElementById('simulator-view');
    view.innerHTML = `
        <div id="simulator-header" class="text-center mb-12">
            <h1 class="text-4xl font-bold text-gray-900">Simulador de Control Desk</h1>
            <p class="mt-4 text-lg text-gray-600">Escolha um cenário para iniciar a simulação e testar suas habilidades.</p>
        </div>
        <div id="scenario-selection" class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            ${simulatorData.scenarios.map(scen => {
                if(scen.id === 'sandbox') return ''; // Don't show sandbox for now.
                let difficultyColor = '';
                if (scen.difficulty === 'Fácil') difficultyColor = 'text-green-600';
                else if (scen.difficulty === 'Difícil') difficultyColor = 'text-red-600';
                else difficultyColor = 'text-yellow-600';

                return `
                <div class="bg-white p-6 rounded-lg shadow-lg border border-gray-200 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <h3 class="text-2xl font-bold text-gray-800">${scen.name}</h3>
                    <p class="mt-2 text-sm font-semibold uppercase tracking-wide ${difficultyColor}">${scen.difficulty}</p>
                    <p class="flex-grow mt-4 text-gray-600">${scen.description}</p>
                    <button class="start-simulation-btn mt-6 bg-brand-blue text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors" data-scenario-id="${scen.id}">
                        Iniciar Simulação
                    </button>
                </div>
                `;
            }).join('')}
        </div>
        <div id="simulation-container" class="mt-8"></div>
    `;

    view.querySelectorAll('.start-simulation-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const scenarioId = e.currentTarget.dataset.scenarioId;
            const scenario = simulatorData.scenarios.find(s => s.id === scenarioId);
            const simulationContainer = document.getElementById('simulation-container');
            document.getElementById('scenario-selection').classList.add('hidden');
            document.getElementById('simulator-header').classList.add('hidden');
            
            const simulator = new Simulator(scenario, simulationContainer, simulatorData);
            simulator.init();
        });
    });

    showView('simulator-view');
}


const routes = {
    '': renderDashboard,
    '#dashboard': renderDashboard,
    '#training': renderTraining,
    '#flashcards': renderFlashcards,
    '#advanced-indicators': renderAdvancedIndicators,
    '#report-challenge': renderReportChallenge,
    '#training-games': renderTrainingGames,
    '#simulator': renderSimulator,
    '#ranking': renderRanking,
};

function router() {
    const path = window.location.hash || '';
    const handler = routes[path] || routes[''];
    handler();
}

function initMainApp() {
    lucide.createIcons();
    window.addEventListener('hashchange', router);
    
    document.querySelectorAll('.nav-link, .nav-link-mobile, a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const isNavLink = link.classList.contains('nav-link') || link.classList.contains('nav-link-mobile');
            const isDashboardLink = new URL(link.href).hash === '#dashboard' || new URL(link.href).hash === '';
            
            if (isNavLink || isDashboardLink) {
                 const targetHash = new URL(e.currentTarget.href).hash || '#dashboard';
                 if(window.location.hash.startsWith('#simulator') && (targetHash === '#dashboard' || targetHash === '')) {

                      window.location.hash = targetHash;
                      renderSimulator(); // Re-render the simulator page to show scenario selection
                 } else if (window.location.hash !== targetHash) {
                    window.location.hash = targetHash;
                } else {
                     router();
                }
            }
            const mobileMenu = document.getElementById('mobile-menu');
            if (!mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
            }
        });
    });

    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            header.classList.add('shadow-md');
        } else {
            header.classList.remove('shadow-md');
        }
    });

    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    router(); 
}

document.addEventListener('DOMContentLoaded', () => {
    initAuth(initMainApp);
});
