import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// ========== CONFIGURAÇÃO – SUBSTITUI PELAS TUAS CHAVES ==========
const SUPABASE_URL = 'https://dxhqckbpvkkyc0ehcqhg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4aHFja2JwdmtreWNvZWhjcWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjA2MTYsImV4cCI6MjA5NTYzNjYxNn0.kQL5HbCjoEuIZSXOkKHtdXA96acZZQZeIttHe_HzQYQ'
// =================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [stock, setStock] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [kpis, setKpis] = useState({})

  // Verificar sessão ao carregar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Buscar dados se estiver logado
  useEffect(() => {
    if (session) {
      loadDashboardData()
    }
  }, [session])

  async function loadDashboardData() {
    // Stock
    const { data: items } = await supabase.from('items').select('*').limit(5)
    setStock(items || [])

    // Purchase Orders
    const { data: pos } = await supabase.from('purchase_orders').select('*, suppliers(name)').order('created_at', { ascending: false }).limit(3)
    setPurchaseOrders(pos || [])

    // Work Orders
    const { data: wos } = await supabase.from('work_orders').select('*, product:items(name)').order('created_at', { ascending: false }).limit(3)
    setWorkOrders(wos || [])

    // KPIs básicos
    const { data: allItems } = await supabase.from('items').select('current_qty, min_stock')
    const lowStock = allItems?.filter(i => i.current_qty < i.min_stock).length || 0

    const { data: receitas } = await supabase.from('financial_records').select('amount').eq('type', 'Receita')
    const totalReceita = receitas?.reduce((s, r) => s + r.amount, 0) || 0

    setKpis({ lowStock, totalReceita })
  }

  async function handleLogin(e) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert('Erro: ' + error.message)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) return <div className="p-8 text-center">A carregar...</div>

  // ECRÃ DE LOGIN
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-md w-96">
          <h1 className="text-3xl font-bold mb-2">Find_3D ERP</h1>
          <p className="text-slate-500 mb-6">Gestão de Stock, Compras e Produção</p>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email" className="w-full border p-2 rounded mb-3" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" className="w-full border p-2 rounded mb-4" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" className="w-full bg-black text-white py-2 rounded-xl">Entrar</button>
          </form>
          <p className="text-xs text-center text-slate-400 mt-4">Ainda não tens conta? Contacta o administrador.</p>
        </div>
      </div>
    )
  }

  // DASHBOARD (versão simplificada mas funcional)
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Find_3D ERP</h1>
            <p className="text-slate-600">Olá, {session.user.email}</p>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-xl">Sair</button>
        </div>

        {/* Cards KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow border">
            <p className="text-slate-500">Stock Baixo</p>
            <h2 className="text-3xl font-bold">{kpis.lowStock}</h2>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow border">
            <p className="text-slate-500">Receita Total</p>
            <h2 className="text-3xl font-bold">€{kpis.totalReceita}</h2>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow border">
            <p className="text-slate-500">Produções Ativas</p>
            <h2 className="text-3xl font-bold">{workOrders.filter(w => w.status === 'Em Producao').length}</h2>
          </div>
        </div>

        {/* Stock */}
        <div className="bg-white p-5 rounded-2xl shadow border">
          <h2 className="text-2xl font-semibold mb-4">Stock (últimos 5 itens)</h2>
          <table className="w-full text-left">
            <thead><tr className="border-b"><th>Part Number</th><th>Nome</th><th>Qtd</th><th>Min</th></tr></thead>
            <tbody>
              {stock.map(item => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.part_number}</td>
                  <td>{item.name}</td>
                  <td>{item.current_qty}</td>
                  <td>{item.min_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Purchase Orders */}
        <div className="bg-white p-5 rounded-2xl shadow border">
          <h2 className="text-2xl font-semibold mb-4">Últimas Compras</h2>
          {purchaseOrders.map(po => (
            <div key={po.id} className="border-b py-2 flex justify-between">
              <span>{po.po_number} – {po.suppliers?.name}</span>
              <span className="font-semibold">€{po.total_amount}</span>
            </div>
          ))}
        </div>

        {/* Work Orders */}
        <div className="bg-white p-5 rounded-2xl shadow border">
          <h2 className="text-2xl font-semibold mb-4">Produção</h2>
          {workOrders.map(wo => (
            <div key={wo.id} className="border-b py-2 flex justify-between">
              <span>{wo.wo_number} – {wo.product?.name}</span>
              <span className="text-sm text-slate-500">{wo.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
