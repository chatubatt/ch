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
                 
(Content truncated due to size limit. Use page ranges or line ranges to read remaining content)