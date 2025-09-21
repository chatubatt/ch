
            const loginOverlay = document.getElementById("login-overlay");
            const usernameInput = document.getElementById("username-input");
            const passwordInput = document.getElementById("password-input");
            const loginBtn = document.getElementById("login-btn");
            const signupBtn = document.getElementById("signup-btn");
            const usersList = document.getElementById("users-list");
            const appContainer = document.getElementById("app-container");
            const currentUserDisplay = document.getElementById("current-user-display");
            const logoutBtn = document.getElementById("logout-btn");
            const tabLancamentos = document.getElementById("tab-lancamentos");
            const tabRelatorio = document.getElementById("tab-relatorio");
            const tabAnalise = document.getElementById("tab-analise");
            const contentLancamentos = document.getElementById("content-lancamentos");
            const contentRelatorio = document.getElementById("content-relatorio");
            const contentAnalise = document.getElementById("content-analise");
            const prevMonthBtn = document.getElementById("prev-month-btn");
            const nextMonthBtn = document.getElementById("next-month-btn");
            const monthSelect = document.getElementById("month-select");
            const yearSelect = document.getElementById("year-select");
            const totalIncomeMonthEl = document.getElementById("total-income-month");
            const totalExpenseMonthEl = document.getElementById("total-expense-month");
            const balanceMonthEl = document.getElementById("balance-month");
            const expenseList = document.getElementById("expense-list");
            const incomeList = document.getElementById("income-list");
            const emptyState = document.getElementById("empty-state");
            const emptyStateIncome = document.getElementById("empty-state-income");
            const expenseForm = document.getElementById("expense-form");
            const incomeForm = document.getElementById("income-form");
            const salaryInput = document.getElementById("salary");
            const typeFixedRadio = document.getElementById("type-fixed");
            const typeMonthlyRadio = document.getElementById("type-monthly");
            const amountLabel = document.getElementById("amount-label");
            const installmentsLabel = document.getElementById("installments-label");
            const resetBtn = document.getElementById("reset-btn");
            const resetModal = document.getElementById("reset-modal");
            const confirmResetBtn = document.getElementById("confirm-reset-btn");
            const cancelResetBtn = document.getElementById("cancel-reset-btn");
            const geminiAnalysisBtn = document.getElementById("gemini-analysis-btn");
            const geminiLoading = document.getElementById("gemini-loading");
            const geminiResponseContainer = document.getElementById("gemini-response-container");
            const editModal = document.getElementById("edit-modal");
            const editForm = document.getElementById("edit-form");
            const cancelEditBtn = document.getElementById("cancel-edit-btn");
            const editModalTitle = document.getElementById("edit-modal-title");
            const editCategoryContainer = document.getElementById("edit-category-container");
            const deleteMonthBtn = document.getElementById("delete-month-btn");
            const deleteMonthModal = document.getElementById("delete-month-modal");
            const confirmDeleteMonthBtn = document.getElementById("confirm-delete-month-btn");
            const cancelDeleteMonthBtn = document.getElementById("cancel-delete-month-btn");
            const deleteMonthNameSpan = document.getElementById("delete-month-name");
            const deleteRecurringModal = document.getElementById("delete-recurring-modal");
            const deleteOneBtn = document.getElementById("deleteOne-btn");
            const deleteAllFutureBtn = document.getElementById("deleteAllFuture-btn");
            const cancelDeleteRecurringBtn = document.getElementById("cancel-delete-recurring-btn");
            const addExpenseBtn = document.getElementById("add-expense-btn");
            const addIncomeBtn = document.getElementById("add-income-btn");
            const addExpenseSection = document.getElementById("add-expense-section");
            const addIncomeSection = document.getElementById("add-income-section");
            const successMessage = document.getElementById("success-message");


            // --- ESTADO DA APLICAÇÃO ---
            let currentUser = null;
            let users = [];
            let annualChart = null;
            let categoryChart = null;
            let selectedMonths = null;
            let editingItem = { id: null, type: null };
            let itemToDelete = { id: null, type: null };
            let expenses = [];
            let incomes = [];
            let salary = 0;
            let currentDate = new Date("2025-10-01T12:00:00");
            currentDate.setDate(1);

             // --- LÓGICA DE LOGIN ---

            async function hashPassword(password) {
                const encoder = new TextEncoder();
                const data = encoder.encode(password);
                const hashBuffer = await crypto.subtle.digest("SHA-256", data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
            }

            const loadUsers = () => {
                users = JSON.parse(localStorage.getItem("app_users_secure")) || [];
                usersList.innerHTML = "";
                users.forEach(user => {
                    const userButton = document.createElement("button");
                    userButton.className = "bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-300";
                    userButton.textContent = user.username;
                    userButton.onclick = () => {
                        usernameInput.value = user.username;
                        passwordInput.focus();
                    };
                    usersList.appendChild(userButton);
                });
            };

            const saveUsers = () => {
                localStorage.setItem("app_users_secure", JSON.stringify(users));
            };

            const performLogin = (username) => {
                currentUser = username;
                sessionStorage.setItem("currentUser", currentUser);
                initializeApp();
            };

            const logout = () => {
                sessionStorage.removeItem("currentUser");
                location.reload();
            };

            const initializeApp = () => {
                loginOverlay.classList.add("hidden");
                appContainer.classList.remove("hidden");
                currentUserDisplay.textContent = currentUser;
                loadUserData();
                renderAll();
            };

            // --- LÓGICA DE DADOS POR UTILIZADOR ---

            const loadUserData = () => {
                const userData = JSON.parse(localStorage.getItem(`data_${currentUser}`));
                if (userData) {
                    expenses = userData.expenses || [];
                    incomes = userData.incomes || [];
                    salary = userData.salary || 0;
                } else {
                    expenses = generateDefaultExpenses();
                    incomes = [];
                    salary = 0;
                }
                salaryInput.value = salary > 0 ? salary : "";
            };
            
            const saveData = () => {
                if (!currentUser) return;
                const userData = { expenses, incomes, salary };
                localStorage.setItem(`data_${currentUser}`, JSON.stringify(userData));
            };

            const motivationalMessages = [
                "Cada gasto consciente é um passo para seus objetivos!",
                "Você está no controle das suas finanças. Continue assim!",
                "Pequenas economias geram grandes resultados. Bom trabalho!",
                "Seu futuro financeiro agradece suas decisões de hoje.",
                "Gerenciar seus gastos é libertador. Parabéns!",
                "A disciplina financeira é a chave para a tranquilidade."
            ];

            const showSuccessMessage = (message) => {
                const messageElement = successMessage.querySelector("p");
                messageElement.textContent = message;
                successMessage.classList.remove("hidden", "opacity-0");
                successMessage.classList.add("opacity-100");

                setTimeout(() => {
                    successMessage.classList.remove("opacity-100");
                    successMessage.classList.add("opacity-0");
                    successMessage.addEventListener("transitionend", () => {
                        successMessage.classList.add("hidden");
                    }, { once: true });
                }, 3000);
            };
            
            // --- FUNÇÕES AUXILIARES E DE GERAÇÃO DE DADOS ---

            const formatCurrency = (value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            const formatMonthYear = (date) => date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            const getISODate = (date) => date.toISOString().split("T")[0];

            const generateDefaultExpenses = () => {
                const defaultData = [];
                const addRecurring = (description, amount, category, start, months) => {
                    const startDate = new Date(start);
                    for (let i = 0; i < months; i++) {
                        const date = new Date(startDate);
                        date.setUTCMonth(startDate.getUTCMonth() + i);
                        defaultData.push({ id: `pre_${description.replace(/\s/g, "")}_${i}`, description: `${description}`, amount, category, date: getISODate(date) });
                    }
                };
                const baseDate = "2025-10-01T12:00:00Z";
                defaultData.push({ id: "pre_rener_1", description: "Rener", amount: 200.00, category: "Compras", date: "2025-10-01"});
                defaultData.push({ id: "pre_rener_2", description: "Rener", amount: 200.00, category: "Compras", date: "2025-11-01"});
                defaultData.push({ id: "pre_maodeobrawelton_1", description: "Mão de Obra Welton", amount: 316.66, category: "Outros", date: "2025-10-01"});
                defaultData.push({ id: "pre_maodeobrawelton_2", description: "Mão de Obra Welton", amount: 316.66, category: "Outros", date: "2025-11-01"});
                defaultData.push({ id: "pre_maerecarga_1", description: "Mae Recarga", amount: 31.21, category: "Moradia", date: "2025-10-01"});
                addRecurring("Acordo Tia Miciada", 48.47, "Moradia", baseDate, 36);
                addRecurring("Acordo Condominio", 417.00, "Moradia", baseDate, 36);
                addRecurring("Condominio", 500.00, "Moradia", baseDate, 36);
                addRecurring("Apartamento", 1296.35, "Moradia", baseDate, 36);
                addRecurring("Netflix", 25.00, "Lazer", baseDate, 36);
                addRecurring("Mistura", 300.00, "Alimentação", baseDate, 36);
                addRecurring("Luz", 185.00, "Moradia", baseDate, 36);
                addRecurring("Condução Mensal", 124.80, "Transporte", baseDate, 36);
                addRecurring("Plano Vivo", 47.00, "Moradia", baseDate, 36);
                addRecurring("Internet", 100.00, "Moradia", baseDate, 36);
                addRecurring("Medicamento", 120.00, "Saúde", "2025-11-01T12:00:00Z", 35); // 36 meses a partir de nov/2025
                return defaultData;
            };
            

            // --- FUNÇÕES DE RENDERIZAÇÃO ---
            const renderAll = () => {
                renderMonthDisplay();
                renderMonthlyBreakdown();
                renderCategoryChart();
                renderProjection();
                renderAnnualReport();
            };

            const populateMonthYearSelectors = () => {
                monthSelect.innerHTML = '';
                const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                months.forEach((month, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = month;
                    monthSelect.appendChild(option);
                });

                yearSelect.innerHTML = '';
                const currentYear = new Date().getFullYear();
                for (let i = currentYear - 5; i <= currentYear + 5; i++) { // 5 anos para trás e 5 para frente
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = i;
                    yearSelect.appendChild(option);
                }
            };

            const renderMonthDisplay = () => {
                monthSelect.value = currentDate.getMonth();
                yearSelect.value = currentDate.getFullYear();
            };

            const renderMonthlyBreakdown = () => {
                expenseList.innerHTML = "";
                const filteredExpenses = expenses.filter(exp => {
                    const expDate = new Date(exp.date + "T00:00:00");
                    return expDate.getFullYear() === currentDate.getFullYear() && expDate.getMonth() === currentDate.getMonth();
                });
                
                if (filteredExpenses.length === 0) {
                    emptyState.style.display = "block";
                } else {
                    emptyState.style.display = "none";
                    filteredExpenses.sort((a,b) => a.description.localeCompare(b.description)).forEach(expense => {
                        const expenseItem = document.createElement("div");
                        expenseItem.className = "expense-item flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200";
                        expenseItem.innerHTML = `<div class="flex items-center gap-4"><div class="text-sm"><p class="font-semibold text-gray-800">${expense.description}</p><p class="text-gray-500">${expense.category}</p></div></div>\n                        <div class="flex items-center gap-4">\n                            <p class="font-semibold text-gray-900 text-right">${formatCurrency(expense.amount)}</p>\n                            <div class="action-buttons flex items-center">\n                                <button onclick="openEditModal(\'expense\', \'${expense.id}\')" title="Editar" class="p-1 rounded-full hover:bg-gray-200 transition text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button>\n                                <button onclick="deleteItem(\'expense\', \'${expense.id}\')" title="Apagar" class="p-1 rounded-full hover:bg-gray-200 transition text-red-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>\n                            </div>\n                        </div>`;
                        expenseList.appendChild(expenseItem);
                    });
                }

                incomeList.innerHTML = "";
                const filteredIncomes = incomes.filter(inc => {
                    const incDate = new Date(inc.date + "T00:00:00");
                    return incDate.getFullYear() === currentDate.getFullYear() && incDate.getMonth() === currentDate.getMonth();
                });

                if (filteredIncomes.length === 0) {
                    emptyStateIncome.style.display = "block";
                } else {
                    emptyStateIncome.style.display = "none";
                    filteredIncomes.sort((a,b) => a.description.localeCompare(b.description)).forEach(income => {
                        const incomeItem = document.createElement("div");
                        incomeItem.className = "expense-item flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-200";
                        incomeItem.innerHTML = `<div class="flex items-center gap-4"><div class="text-sm"><p class="font-semibold text-gray-800">${income.description}</p></div></div>\n                        <div class="flex items-center gap-4">\n                            <p class="font-semibold text-green-700 text-right">${formatCurrency(income.amount)}</p>\n                            <div class="action-buttons flex items-center">\n                                <button onclick="openEditModal(\'income\', \'${income.id}\')" title="Editar" class="p-1 rounded-full hover:bg-gray-200 transition text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button>\n                                <button onclick="deleteItem(\'income\', \'${income.id}\')" title="Apagar" class="p-1 rounded-full hover:bg-gray-200 transition text-red-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>\n                            </div>\n                        </div>`;
                        incomeList.appendChild(incomeItem);
                    });
                }
                
                const totalExpenses = filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);
                const totalOtherIncomes = filteredIncomes.reduce((acc, income) => acc + income.amount, 0);
                const totalIncomes = (salary || 0) + totalOtherIncomes;
                const balance = totalIncomes - totalExpenses;

                totalIncomeMonthEl.textContent = formatCurrency(totalIncomes);
                totalExpenseMonthEl.textContent = formatCurrency(totalExpenses);
                balanceMonthEl.textContent = formatCurrency(balance);
            };

            const renderCategoryChart = () => {
                const chartCanvas = document.getElementById("category-chart");
                if (!chartCanvas) return;
                const ctx = chartCanvas.getContext("2d");

                const filteredExpenses = expenses.filter(exp => {
                    const expDate = new Date(exp.date + "T00:00:00");
                    return expDate.getFullYear() === currentDate.getFullYear() && expDate.getMonth() === currentDate.getMonth();
                });

                if (categoryChart) {
                    categoryChart.destroy();
                }

                if (filteredExpenses.length === 0) {
                    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
                    ctx.save();
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#6b7280"; // gray-500
                    ctx.font = "16px \'Inter\'";
                    ctx.fillText("Nenhum dado de gasto para este mês.", chartCanvas.width / 2, chartCanvas.height / 2);
                    ctx.restore();
                    return;
                }

                const expensesByCategory = filteredExpenses.reduce((acc, exp) => {
                    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
                    return acc;
                }, {});

                // Filtrar categorias com valor zero antes de criar os labels e data
                const filteredCategories = Object.keys(expensesByCategory).filter(category => expensesByCategory[category] > 0);
                const labels = filteredCategories;
                const data = filteredCategories.map(category => expensesByCategory[category]);

                const backgroundColors = [
                    "rgba(59, 130, 246, 0.7)", "rgba(239, 68, 68, 0.7)", "rgba(245, 158, 11, 0.7)",
                    "rgba(16, 185, 129, 0.7)", "rgba(139, 92, 246, 0.7)", "rgba(96, 165, 250, 0.7)",
                    "rgba(251, 191, 36, 0.7)", "rgba(52, 211, 153, 0.7)", "rgba(248, 113, 113, 0.7)"
                ];
                const borderColors = [
                    "rgba(59, 130, 246, 1)", "rgba(239, 68, 68, 1)", "rgba(245, 158, 11, 1)",
                    "rgba(16, 185, 129, 1)", "rgba(139, 92, 246, 1)", "rgba(96, 165, 250, 1)",
                    "rgba(251, 191, 36, 1)", "rgba(52, 211, 153, 1)", "rgba(248, 113, 113, 1)"
                ];

                categoryChart = new Chart(ctx, {
                    type: "doughnut",
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: backgroundColors,
                            borderColor: borderColors,
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: "right",
                                labels: {
                                    font: {
                                        family: "Inter"
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.label || "";
                                        if (label) {
                                            label += ": ";
                                        }
                                        if (context.parsed !== null) {
                                            label += formatCurrency(context.parsed);
                                        }
                                        return label;
                                    }
                                },
                                bodyFont: {
                                    family: "Inter"
                                },
                                titleFont: {
                                    family: "Inter"
                                }
                            }
                        }
                    }
                });
            };

            const renderProjection = () => {
                const futureProjectionEl = document.getElementById("future-projection");
                futureProjectionEl.innerHTML = "";

                if (salary <= 0) {
                    futureProjectionEl.innerHTML = 
                        `<p class="text-gray-500">Por favor, insira seu salário mensal para ver a projeção futura.</p>`;
                    return;
                }

                const today = new Date();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();

                const projectionMonths = 6; // Projetar para os próximos 6 meses
                let cumulativeBalance = 0;

                // Calcular o saldo atual até o mês atual
                const allMonths = Array.from(new Set(expenses.map(exp => getISODate(new Date(exp.date)).substring(0, 7))
                    .concat(incomes.map(inc => getISODate(new Date(inc.date)).substring(0, 7)))))
                    .sort();

                allMonths.forEach(monthStr => {
                    const [year, month] = monthStr.split("-").map(Number);
                    const monthDate = new Date(year, month - 1, 1);

                    if (monthDate.getFullYear() < currentYear || (monthDate.getFullYear() === currentYear && monthDate.getMonth() <= currentMonth)) {
                        const monthlyExpenses = expenses.filter(exp => {
                            const expDate = new Date(exp.date + "T00:00:00");
                            return expDate.getFullYear() === year && expDate.getMonth() === month - 1;
                        }).reduce((sum, exp) => sum + exp.amount, 0);

                        const monthlyIncomes = incomes.filter(inc => {
                            const incDate = new Date(inc.date + "T00:00:00");
                            return incDate.getFullYear() === year && incDate.getMonth() === month - 1;
                        }).reduce((sum, inc) => sum + inc.amount, 0);

                        cumulativeBalance += (salary + monthlyIncomes - monthlyExpenses);
                    }
                });

                for (let i = 0; i < projectionMonths; i++) {
                    const projectionDate = new Date(currentYear, currentMonth + i + 1, 1); // Começa do próximo mês
                    const monthName = formatMonthYear(projectionDate);

                    const monthlyExpenses = expenses.filter(exp => {
                        const expDate = new Date(exp.date + "T00:00:00");
                        return expDate.getFullYear() === projectionDate.getFullYear() && expDate.getMonth() === projectionDate.getMonth();
                    }).reduce((sum, exp) => sum + exp.amount, 0);

                    const monthlyIncomes = incomes.filter(inc => {
                        const incDate = new Date(inc.date + "T00:00:00");
                        return incDate.getFullYear() === projectionDate.getFullYear() && incDate.getMonth() === projectionDate.getMonth();
                    }).reduce((sum, inc) => sum + inc.amount, 0);

                    const monthlyBalance = salary + monthlyIncomes - monthlyExpenses;
                    cumulativeBalance += monthlyBalance;

                    const balanceClass = cumulativeBalance >= 0 ? "text-green-600" : "text-red-600";

                    futureProjectionEl.innerHTML += `
                        <div class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                            <span class="text-gray-700">${monthName.charAt(0).toUpperCase() + monthName.slice(1)}:</span>
                            <span class="font-semibold ${balanceClass}">${formatCurrency(cumulativeBalance)}</span>
                        </div>
                    `;
                }
            };

            const renderAnnualReport = () => {
                const annualChartCanvas = document.getElementById("annual-chart");
                if (!annualChartCanvas) return;
                const ctx = annualChartCanvas.getContext("2d");

                if (annualChart) {
                    annualChart.destroy();
                }

                const currentYear = currentDate.getFullYear();
                const monthlyData = Array(12).fill(0).map(() => ({ income: 0, expense: 0, balance: 0 }));

                expenses.forEach(exp => {
                    const expDate = new Date(exp.date + "T00:00:00");
                    if (expDate.getFullYear() === currentYear) {
                        monthlyData[expDate.getMonth()].expense += exp.amount;
                    }
                });

                incomes.forEach(inc => {
                    const incDate = new Date(inc.date + "T00:00:00");
                    if (incDate.getFullYear() === currentYear) {
                        monthlyData[incDate.getMonth()].income += inc.amount;
                    }
                });

                monthlyData.forEach((data, index) => {
                    data.income += salary; // Adiciona o salário a cada mês
                    data.balance = data.income - data.expense;
                });

                const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                const incomesData = monthlyData.map(data => data.income);
                const expensesData = monthlyData.map(data => data.expense);
                const balanceData = monthlyData.map(data => data.balance);

                annualChart = new Chart(ctx, {
                    type: "bar",
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: "Receitas",
                                data: incomesData,
                                backgroundColor: "rgba(16, 185, 129, 0.7)", // green-500
                                borderColor: "rgba(16, 185, 129, 1)",
                                borderWidth: 1
                            },
                            {
                                label: "Despesas",
                                data: expensesData,
                                backgroundColor: "rgba(239, 68, 68, 0.7)", // red-500
                                borderColor: "rgba(239, 68, 68, 1)",
                                borderWidth: 1
                            },
                            {
                                label: "Saldo",
                                data: balanceData,
                                type: "line",
                                borderColor: "rgba(59, 130, 246, 1)", // blue-500
                                backgroundColor: "rgba(59, 130, 246, 0.2)",
                                fill: true,
                                tension: 0.3,
                                borderWidth: 2
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: "top",
                                labels: {
                                    font: {
                                        family: "Inter"
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.dataset.label || "";
                                        if (label) {
                                            label += ": ";
                                        }
                                        if (context.parsed.y !== null) {
                                            label += formatCurrency(context.parsed.y);
                                        }
                                        return label;
                                    }
                                },
                                bodyFont: {
                                    family: "Inter"
                                },
                                titleFont: {
                                    family: "Inter"
                                }
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                ticks: {
                                    font: {
                                        family: "Inter"
                                    }
                                }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return formatCurrency(value);
                                    },
                                    font: {
                                        family: "Inter"
                                    }
                                }
                            }
                        }
                    }
                });
            };

            // --- LÓGICA DE ADIÇÃO/EDIÇÃO DE ITENS ---

            const generateUniqueId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            expenseForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const description = document.getElementById("description").value;
                const amount = parseFloat(document.getElementById("amount").value);
                const installments = parseInt(document.getElementById("installments").value) || 1; // Default to 1 if empty
                const date = document.getElementById("date").value;
                const category = document.getElementById("category").value;
                const type = document.querySelector("input[name=\"expense-type\"]:checked").value;

                if (type === "fixed" && installments > 1) {
                    const installmentAmount = amount / installments;
                    for (let i = 0; i < installments; i++) {
                        const expenseDate = new Date(date + "T00:00:00");
                        expenseDate.setUTCMonth(expenseDate.getUTCMonth() + i);
                        expenses.push({ id: generateUniqueId(), description, amount: installmentAmount, category, date: getISODate(expenseDate) });
                    }
                } else if (type === "monthly") {
                    // Para despesas mensais contínuas, adicionamos apenas para o mês atual
                    // e o usuário pode adicionar para meses futuros manualmente ou através de uma funcionalidade de recorrência
                    expenses.push({ id: generateUniqueId(), description, amount, category, date: getISODate(new Date(date + "T00:00:00")) });
                } else {
                    // Despesa única ou fixa de 1 parcela
                    expenses.push({ id: generateUniqueId(), description, amount, category, date: getISODate(new Date(date + "T00:00:00")) });
                }

                saveData();
                expenseForm.reset();
                renderAll();
                showSuccessMessage(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);
            });

            incomeForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const description = document.getElementById("income-description").value;
                const amount = parseFloat(document.getElementById("income-amount").value);
                const date = document.getElementById("income-date").value;

                incomes.push({ id: generateUniqueId(), description, amount, date: getISODate(new Date(date + "T00:00:00")) });

                saveData();
                incomeForm.reset();
                renderAll();
            });

            const openEditModal = (type, id) => {
                editingItem = { type, id };
                let item;
                if (type === "expense") {
                    item = expenses.find(exp => exp.id === id);
                    editModalTitle.textContent = "Editar Gasto";
                    document.getElementById("edit-category-group").classList.remove("hidden");
                } else {
                    item = incomes.find(inc => inc.id === id);
                    editModalTitle.textContent = "Editar Receita";
                    document.getElementById("edit-category-group").classList.add("hidden");
                }

                if (item) {
                    document.getElementById("edit-description").value = item.description;
                    document.getElementById("edit-amount").value = item.amount;
                    document.getElementById("edit-date").value = item.date;
                    if (type === "expense") {
                        document.getElementById("edit-category").value = item.category;
                    }
                    editModal.classList.remove("hidden");
                }
            };

            editForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const description = document.getElementById("edit-description").value;
                const amount = parseFloat(document.getElementById("edit-amount").value);
                const date = document.getElementById("edit-date").value;
                const category = document.getElementById("edit-category").value;

                if (editingItem.type === "expense") {
                    expenses = expenses.map(exp => exp.id === editingItem.id ? { ...exp, description, amount, date, category } : exp);
                } else {
                    incomes = incomes.map(inc => inc.id === editingItem.id ? { ...inc, description, amount, date } : inc);
                }

                saveData();
                editModal.classList.add("hidden");
                renderAll();
            });

            cancelEditBtn.addEventListener("click", () => {
                editModal.classList.add("hidden");
            });

            // --- LÓGICA DE EXCLUSÃO ---

            const deleteItem = (type, id) => {
                itemToDelete = { type, id };
                const item = (type === "expense" ? expenses : incomes).find(i => i.id === id);

                if (item && item.id.startsWith("pre_")) {
                    // Se for um item pré-gerado, tratar como recorrente
                    deleteRecurringModal.classList.remove("hidden");
                } else {
                    // Item normal, excluir diretamente
                    if (confirm("Tem certeza que deseja apagar este item?")) {
                        if (type === "expense") {
                            expenses = expenses.filter(exp => exp.id !== id);
                        } else {
                            incomes = incomes.filter(inc => inc.id !== id);
                        }
                        saveData();
                        renderAll();
                    }
                }
            };

            deleteOneBtn.addEventListener("click", () => {
                const { type, id } = itemToDelete;
                if (type === "expense") {
                    expenses = expenses.filter(exp => exp.id !== id);
                } else {
                    incomes = incomes.filter(inc => inc.id !== id);
                }
                saveData();
                deleteRecurringModal.classList.add("hidden");
                renderAll();
            });

            deleteAllFutureBtn.addEventListener("click", () => {
                const { type, id } = itemToDelete;
                const item = (type === "expense" ? expenses : incomes).find(i => i.id === id);

                if (item) {
                    const itemDate = new Date(item.date + "T00:00:00");
                    const baseId = item.id.substring(0, item.id.lastIndexOf("_"));

                    if (type === "expense") {
                        expenses = expenses.filter(exp => {
                            const expDate = new Date(exp.date + "T00:00:00");
                            return !(exp.id.startsWith(baseId) && expDate >= itemDate);
                        });
                    } else {
                        incomes = incomes.filter(inc => {
                            const incDate = new Date(inc.date + "T00:00:00");
                            return !(inc.id.startsWith(baseId) && incDate >= itemDate);
                        });
                    }
                    saveData();
                    deleteRecurringModal.classList.add("hidden");
                    renderAll();
                }
            });

            cancelDeleteRecurringBtn.addEventListener("click", () => {
                deleteRecurringModal.classList.add("hidden");
            });

            // --- EVENT LISTENERS GERAIS ---

            prevMonthBtn.addEventListener("click", () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderAll();
            });

            nextMonthBtn.addEventListener("click", () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderAll();
            });

            tabLancamentos.addEventListener("click", () => {
                activateTab("lancamentos");
            });

            tabRelatorio.addEventListener("click", () => {
                activateTab("relatorio");
            });

            tabAnalise.addEventListener("click", () => {
                activateTab("analise");
            });

            const activateTab = (tabName) => {
                document.querySelectorAll(".tab-button").forEach(button => {
                    button.classList.remove("active", "text-blue-600", "border-blue-500");
                    button.classList.add("text-gray-500", "hover:text-gray-700", "hover:border-gray-300");
                });

                document.querySelectorAll("[id^=\"content-\"]").forEach(content => {
                    content.classList.add("hidden");
                });

                document.getElementById(`tab-${tabName}`).classList.add("active", "text-blue-600", "border-blue-500");
                document.getElementById(`tab-${tabName}`).classList.remove("text-gray-500", "hover:text-gray-700", "hover:border-gray-300");
                document.getElementById(`content-${tabName}`).classList.remove("hidden");

                if (tabName === "relatorio") {
                    renderAnnualReport();
                } else if (tabName === "lancamentos") {
                    renderMonthlyBreakdown();
                    renderCategoryChart();
                    renderProjection();
                }
            };

            salaryInput.addEventListener("change", (e) => {
                salary = parseFloat(e.target.value) || 0;
                saveData();
                renderProjection();
                renderAnnualReport(); // Atualiza o relatório anual com o novo salário
            });

            // Alternar entre despesa fixa e mensal
            typeFixedRadio.addEventListener("change", () => {
                if (typeFixedRadio.checked) {
                    amountLabel.textContent = "Valor Total (R$)";
                    installmentsLabel.closest("div").classList.remove("hidden");
                }
            });

            typeMonthlyRadio.addEventListener("change", () => {
                if (typeMonthlyRadio.checked) {
                    amountLabel.textContent = "Valor Mensal (R$)";
                    installmentsLabel.closest("div").classList.add("hidden");
                    document.getElementById("installments").value = ""; // Limpa o campo de parcelas
                }
            });

            // --- LÓGICA DE RESET ---
            resetBtn.addEventListener("click", () => {
                resetModal.classList.remove("hidden");
            });

            confirmResetBtn.addEventListener("click", () => {
                localStorage.removeItem(`data_${currentUser}`);
                expenses = generateDefaultExpenses();
                incomes = [];
                salary = 0;
                salaryInput.value = "";
                saveData();
                resetModal.classList.add("hidden");
                renderAll();
            });

            cancelResetBtn.addEventListener("click", () => {
                resetModal.classList.add("hidden");
            });

            // --- LÓGICA DE ANÁLISE GEMINI ---
            geminiAnalysisBtn.addEventListener("click", async () => {
                geminiAnalysisBtn.disabled = true;
                geminiLoading.classList.remove("hidden");
                geminiResponseContainer.innerHTML = "";

                const allExpenses = expenses.map(exp => ({ ...exp, type: "expense" }));
                const allIncomes = incomes.map(inc => ({ ...inc, type: "income" }));
                const allTransactions = [...allExpenses, ...allIncomes];

                const prompt = `Analise os seguintes dados financeiros de um usuário para o ano de ${currentDate.getFullYear()}:

Salário Mensal: ${formatCurrency(salary)}

Transações:
${allTransactions.map(t => `- ${t.type === "expense" ? "Gasto" : "Receita"}: ${t.description} (${t.category || "N/A"}) - ${formatCurrency(t.amount)} em ${t.date}`).join("\n")}

Com base nesses dados, forneça uma análise detalhada, incluindo:
1. Resumo geral da situação financeira.
2. Principais categorias de gastos e receitas.
3. Sugestões personalizadas para economizar ou otimizar gastos.
4. Pontos fortes e fracos na gestão financeira.
5. Projeções ou tendências futuras com base nos dados fornecidos.

Formate a resposta em Markdown, usando títulos, listas e negrito para facilitar a leitura.`;

                try {
                                    // ATENÇÃO: Substitua 'YOUR_GEMINI_API_KEY' pela sua chave de API real do Google Gemini.
                // Você pode obter uma chave em https://ai.google.dev/
                const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; 
                if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY' || !GEMINI_API_KEY) {
                    geminiResponseContainer.innerHTML = `<p class="text-red-500">Por favor, configure sua chave de API Gemini no arquivo script.js para usar esta funcionalidade.</p>`;
                    geminiLoading.classList.add("hidden");
                    geminiAnalysisBtn.disabled = false;
                    return;
                }

                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
                    const systemPrompt = `Você é um assistente financeiro inteligente. Analise os dados fornecidos e ofereça insights detalhados sobre a situação financeira do usuário, identificando pontos fortes, fracos, tendências e sugestões personalizadas para otimização de gastos e receitas. Formate sua resposta em Markdown, usando títulos, listas e negrito para facilitar a leitura.`;
                    const payload = {
                        contents: [{ parts: [{ text: prompt }] }],
                        systemInstruction: {
                            parts: [{ text: systemPrompt }]
                        },
                    };

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();
                    const geminiText = data.candidates[0].content.parts[0].text;
                    geminiResponseContainer.innerHTML = marked.parse(geminiText); // Usar marked.js para renderizar Markdown

                } catch (error) {
                    console.error("Erro ao chamar a API Gemini:", error);
                    geminiResponseContainer.innerHTML = `<p class="text-red-500">Erro ao gerar análise. Por favor, tente novamente.</p>`;
                } finally {
                    geminiLoading.classList.add("hidden");
                    geminiAnalysisBtn.disabled = false;
                }
            });

            // --- LÓGICA DE EXCLUSÃO DE MÊS ---
            deleteMonthBtn.addEventListener("click", () => {
                deleteMonthNameSpan.textContent = formatMonthYear(currentDate);
                deleteMonthModal.classList.remove("hidden");
            });

            confirmDeleteMonthBtn.addEventListener("click", () => {
                const currentMonth = currentDate.getMonth();
                const currentYear = currentDate.getFullYear();

                expenses = expenses.filter(exp => {
                    const expDate = new Date(exp.date + "T00:00:00");
                    return !(expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear);
                });

                incomes = incomes.filter(inc => {
                    const incDate = new Date(inc.date + "T00:00:00");
                    return !(incDate.getMonth() === currentMonth && incDate.getFullYear() === currentYear);
                });

                saveData();
                deleteMonthModal.classList.add("hidden");
                renderAll();
            });

            cancelDeleteMonthBtn.addEventListener("click", () => {
                deleteMonthModal.classList.add("hidden");
            });

            // --- LÓGICA DE ADICIONAR GASTO/RECEITA ---
            addExpenseBtn.addEventListener("click", () => {
                addExpenseSection.classList.remove("hidden");
                addIncomeSection.classList.add("hidden");
            });

            addIncomeBtn.addEventListener("click", () => {
                addIncomeSection.classList.remove("hidden");
                addExpenseSection.classList.add("hidden");
            });

            // --- INICIALIZAÇÃO ---
            document.addEventListener("DOMContentLoaded", () => {
                loadUsers();
                const storedUser = sessionStorage.getItem("currentUser");
                if (storedUser) {
                    performLogin(storedUser);
                } else {
                    loginOverlay.classList.remove("hidden");
                }

                loginBtn.addEventListener("click", async () => {
                    const username = usernameInput.value.trim();
                    const password = passwordInput.value.trim();

                    if (!username || !password) {
                        alert("Por favor, preencha todos os campos.");
                        return;
                    }

                    const hashedPassword = await hashPassword(password);
                    const user = users.find(u => u.username === username && u.passwordHash === hashedPassword);

                    if (user) {
                        performLogin(username);
                    } else {
                        alert("Nome de utilizador ou senha incorretos.");
                    }
                });

                signupBtn.addEventListener("click", async () => {
                    const username = usernameInput.value.trim();
                    const password = passwordInput.value.trim();

                    if (!username || !password) {
                        alert("Por favor, preencha todos os campos.");
                        return;
                    }

                    if (users.some(u => u.username === username)) {
                        alert("Nome de utilizador já existe. Por favor, escolha outro.");
                        return;
                    }

                    const hashedPassword = await hashPassword(password);
                    users.push({ username, passwordHash: hashedPassword });
                    saveUsers();
                    loadUsers(); // Atualiza a lista de usuários na tela de login
                    alert("Conta criada com sucesso! Pode agora iniciar sessão.");
                    usernameInput.value = username;
                    passwordInput.value = "";
                    passwordInput.focus();
                });

                logoutBtn.addEventListener("click", logout);

                // Preencher seletores de mês e ano
                populateMonthYearSelectors();

                // Definir a data inicial para o primeiro dia do mês atual
                const today = new Date();
                currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
                renderMonthDisplay(); // Atualizar seletores com a data atual

                monthSelect.addEventListener("change", (e) => {
                    currentDate.setMonth(parseInt(e.target.value));
                    renderAll();
                });

                yearSelect.addEventListener("change", (e) => {
                    currentDate.setFullYear(parseInt(e.target.value));
                    renderAll();
                });

                // Inicializar a exibição do formulário de gasto
                addExpenseSection.classList.remove("hidden");
                addIncomeSection.classList.add("hidden");

                // Definir a data padrão para o input de data
                const dateInput = document.getElementById("date");
                const incomeDateInput = document.getElementById("income-date");
                const todayFormatted = getISODate(today);
                dateInput.value = todayFormatted;
                incomeDateInput.value = todayFormatted;
            });

            // Expor funções globais para o HTML (onclick)
            window.openEditModal = openEditModal;
            window.deleteItem = deleteItem;

            // Adicionar marked.js para renderizar Markdown
            // Certifique-se de que a biblioteca marked.js esteja carregada antes deste script
            // <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
            // Adicione esta linha no HTML, antes de script.js
            const marked = window.marked;
        
