import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { PlusCircle, Trash2, Edit3, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'

function App() {
  const [expenses, setExpenses] = useState([])
  const [incomes, setIncomes] = useState([])
  const [salary, setSalary] = useState(0)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const motivationalMessages = [
    "Cada gasto consciente é um passo para seus objetivos!",
    "Você está no controle das suas finanças. Continue assim!",
    "Pequenas economias geram grandes resultados. Bom trabalho!",
    "Seu futuro financeiro agradece suas decisões de hoje.",
    "Gerenciar seus gastos é libertador. Parabéns!",
    "A disciplina financeira é a chave para a tranquilidade."
  ]

  const categories = ["Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Compras", "Outros"]

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const showSuccess = (message) => {
    setSuccessMessage(message)
    setShowSuccessMessage(true)
    setTimeout(() => setShowSuccessMessage(false), 3000)
  }

  const addExpense = (expense) => {
    setExpenses(prev => [...prev, { ...expense, id: Date.now() }])
    showSuccess(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)])
  }

  const addIncome = (income) => {
    setIncomes(prev => [...prev, { ...income, id: Date.now() }])
    showSuccess("Receita adicionada com sucesso!")
  }

  const getCurrentMonthData = () => {
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    const monthExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date)
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear
    })
    
    const monthIncomes = incomes.filter(inc => {
      const incDate = new Date(inc.date)
      return incDate.getMonth() === currentMonth && incDate.getFullYear() === currentYear
    })
    
    const totalExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    const totalOtherIncomes = monthIncomes.reduce((sum, inc) => sum + inc.amount, 0)
    const totalIncomes = salary + totalOtherIncomes
    const balance = totalIncomes - totalExpenses
    
    return { monthExpenses, monthIncomes, totalExpenses, totalIncomes, balance }
  }

  const { monthExpenses, monthIncomes, totalExpenses, totalIncomes, balance } = getCurrentMonthData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Success Message */}
        <AnimatePresence>
          {showSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Controle de Gastos</h1>
          <p className="text-gray-600">Gerencie suas finanças de forma inteligente</p>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas do Mês</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalIncomes)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
              <TrendingDown className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-r ${balance >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} text-white`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo do Mês</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expenses">Despesas</TabsTrigger>
            <TabsTrigger value="incomes">Receitas</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-6">
            <ExpenseForm onAddExpense={addExpense} categories={categories} />
            <ExpenseList expenses={monthExpenses} />
          </TabsContent>

          <TabsContent value="incomes" className="space-y-6">
            <IncomeForm onAddIncome={addIncome} />
            <IncomeList incomes={monthIncomes} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Expense Form Component
function ExpenseForm({ onAddExpense, categories }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (description && amount && category) {
      onAddExpense({
        description,
        amount: parseFloat(amount),
        category,
        date
      })
      setDescription('')
      setAmount('')
      setCategory('')
      setDate(new Date().toISOString().split('T')[0])
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Adicionar Despesa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Compra de notebook"
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full">
                Adicionar Despesa
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Income Form Component
function IncomeForm({ onAddIncome }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (description && amount) {
      onAddIncome({
        description,
        amount: parseFloat(amount),
        date
      })
      setDescription('')
      setAmount('')
      setDate(new Date().toISOString().split('T')[0])
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Adicionar Receita
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="income-description">Descrição</Label>
              <Input
                id="income-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Freelance"
                required
              />
            </div>
            <div>
              <Label htmlFor="income-amount">Valor (R$)</Label>
              <Input
                id="income-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <Label htmlFor="income-date">Data</Label>
              <Input
                id="income-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full">
                Adicionar Receita
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Expense List Component
function ExpenseList({ expenses }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Despesas do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma despesa registrada para este mês.</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense, index) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{expense.description}</p>
                    <p className="text-sm text-gray-500">{expense.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{formatCurrency(expense.amount)}</span>
                    <Button variant="ghost" size="sm">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Income List Component
function IncomeList({ incomes }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Receitas do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {incomes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma receita registrada para este mês.</p>
          ) : (
            <div className="space-y-3">
              {incomes.map((income, index) => (
                <motion.div
                  key={income.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{income.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-700">{formatCurrency(income.amount)}</span>
                    <Button variant="ghost" size="sm">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default App
