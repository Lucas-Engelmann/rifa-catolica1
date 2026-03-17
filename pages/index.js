import { useState, useEffect, useMemo, useCallback } from 'react'

const CONFIG = {
  title: 'Rifa Beneficente para Compra de Terreno',
  subtitle: 'FSSPX Missão de Penha SC',
  prizes: [
    { place: '1º Prêmio', name: 'Kit Eletrodomésticos', desc: 'Aspirador de pó + Liquidificador', icon: '🏆', color: '#f0c040' },
    { place: '2º Prêmio', name: 'Bíblia + Coleção Católica', desc: '10 livros selecionados + Bíblia Sagrada capa dura', icon: '📖', color: '#a0c8f0' },
    { place: '3º Prêmio', name: 'Kit Devocionais', desc: '5 livros de espiritualidade e oração', icon: '✝️', color: '#c0d8b0' },
  ],
  totalNumbers: 1000,
  ticketPrice: 10,
  drawDate: '15/08/2026',
  drawTime: '19h30',
  pixKey: '47997514649',
  whatsappNumber: '5547997514649',
  adminPassword: process?.env?.NEXT_PUBLIC_ADMIN_PASSWORD || 'missaopenha2025',
}

const PER_PAGE = 200

export default function Home() {
  const [reservedSet, setReservedSet] = useState(new Set())
  const [selected, setSelected] = useState(new Set())
  const [step, setStep] = useState('home')
  const [form, setForm] = useState({ name: '', cpf: '', phone: '', email: '', notify: 'ambos' })
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingNumbers, setLoadingNumbers] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [error, setError] = useState('')
  const [sorteioResult, setSorteioResult] = useState(null)
  const [adminStep, setAdminStep] = useState('login')
  const [adminSenha, setAdminSenha] = useState('')
  const [sorteioLoading, setSorteioLoading] = useState(false)

  // Buscar números reservados do banco
  const fetchReserved = useCallback(async () => {
    setLoadingNumbers(true)
    try {
      const res = await fetch('/api/tickets')
      const data = await res.json()
      if (data.numeros) setReservedSet(new Set(data.numeros))
    } catch (e) { console.error(e) }
    setLoadingNumbers(false)
  }, [])

  useEffect(() => { fetchReserved() }, [fetchReserved])

  // Buscar resultado do sorteio
  useEffect(() => {
    if (step === 'sorteio') {
      fetch('/api/sorteio').then(r => r.json()).then(d => {
        if (d.sorteio) setSorteioResult(d.sorteio)
      })
    }
  }, [step])

  const allNumbers = useMemo(() => Array.from({ length: CONFIG.totalNumbers }, (_, i) => i + 1), [])

  const filtered = useMemo(() => {
    let nums = allNumbers
    if (search.trim()) {
      const q = search.trim()
      nums = nums.filter(n => String(n).padStart(4, '0').includes(q))
    }
    if (filterStatus === 'available') nums = nums.filter(n => !reservedSet.has(n) && !selected.has(n))
    if (filterStatus === 'selected') nums = nums.filter(n => selected.has(n))
    if (filterStatus === 'reserved') nums = nums.filter(n => reservedSet.has(n))
    return nums
  }, [allNumbers, search, filterStatus, reservedSet, selected])

  const paginated = useMemo(() => filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE), [filtered, page])
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const totalValue = selected.size * CONFIG.ticketPrice
  const soldPercent = Math.round((reservedSet.size / CONFIG.totalNumbers) * 100)

  const toggleNumber = useCallback((n) => {
    if (reservedSet.has(n)) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(n) ? next.delete(n) : next.add(n)
      return next
    })
  }, [reservedSet])

  const handleReservar = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeros: [...selected],
          nome: form.name,
          telefone: form.phone,
          email: form.email,
          cpf: form.cpf,
          metodo_notificacao: form.notify,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.numeros) {
          setError(`Os números ${data.numeros.join(', ')} já foram reservados. Por favor, escolha outros.`)
          await fetchReserved()
        } else {
          setError(data.error || 'Erro ao reservar. Tente novamente.')
        }
      } else {
        setConfirmation(data)
        setStep('confirmation')
        await fetchReserved()
      }
    } catch (e) {
      setError('Erro de conexão. Tente novamente.')
    }
    setLoading(false)
  }

  const handleSorteio = async () => {
    setSorteioLoading(true)
    try {
      const res = await fetch('/api/sorteio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: adminSenha }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Erro ao realizar sorteio.')
      } else {
        setSorteioResult(data)
        setAdminStep('resultado')
      }
    } catch (e) { alert('Erro de conexão.') }
    setSorteioLoading(false)
  }

  const waMsgRaw = confirmation
    ? `✝️ *Confirmação de Rifa — ${CONFIG.subtitle}*\n\nOlá ${confirmation.nome}! Sua reserva foi confirmada. 🙏\n\n📋 *Números:* ${[...selected].sort((a, b) => a - b).slice(0, 15).map(n => String(n).padStart(4, '0')).join(', ')}${selected.size > 15 ? ` +${selected.size - 15} mais` : ''}\n💰 *Total:* R$ ${confirmation.valorTotal},00\n🔖 *Código:* ${confirmation.codigo}\n\n📅 Sorteio: ${CONFIG.drawDate} às ${CONFIG.drawTime}\n🙌 Boa sorte e que Deus abençoe!`
    : ''

  // ── HOME ──────────────────────────────────────────────────────────
  if (step === 'home') return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg,#0a1525 0%,var(--navy) 80%)', borderBottom: '1px solid rgba(201,153,58,0.2)', padding: '44px 20px 36px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(201,153,58,1) 40px,rgba(201,153,58,1) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(201,153,58,1) 40px,rgba(201,153,58,1) 41px)' }} />
          <div className="anim" style={{ fontSize: 52, marginBottom: 12 }}><img src="/logo-fsspx1.png" style={{width:80,height:80,objectFit:'contain'}} /></div>        <p className="anim stagger-3" style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
          Participe e concorra a prêmios incríveis enquanto apoia a FSSPX com a missão de Penha - SC. 🙏
        </p>
        <div className="anim stagger-4" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
          <span className="pill" style={{ background: 'rgba(201,153,58,0.15)', color: 'var(--gold2)', border: '1px solid rgba(201,153,58,0.3)' }}>📅 Sorteio {CONFIG.drawDate}</span>
          <span className="pill" style={{ background: 'rgba(74,175,120,0.1)', color: '#6dd4a0', border: '1px solid rgba(74,175,120,0.3)' }}>🎟️ R$ {CONFIG.ticketPrice},00 / número</span>
          <span className="pill" style={{ background: 'rgba(100,140,200,0.1)', color: '#90b8e8', border: '1px solid rgba(100,140,200,0.3)' }}>🔢 {CONFIG.totalNumbers} números</span>
        </div>

        {/* Progress */}
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            <span>{reservedSet.size} vendidos</span>
            <span>{CONFIG.totalNumbers - reservedSet.size} disponíveis</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${soldPercent}%`, borderRadius: 4, background: 'linear-gradient(90deg,var(--gold),var(--gold2))', transition: 'width 1s ease' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 6 }}>{soldPercent}% vendido</div>
        </div>
        <button className="btn-gold anim" onClick={() => setStep('selection')} style={{ marginTop: 28, padding: '16px 44px', fontSize: 16, letterSpacing: 1 }}>
          🎟️ Escolher Meus Números
        </button>
      </div>

      {/* Prizes + How it works */}
      <div style={{ maxWidth: 860, margin: '36px auto 0', padding: '0 16px 40px' }}>
        <h2 className="display anim" style={{ textAlign: 'center', fontSize: 22, marginBottom: 20, color: 'var(--cream2)' }}>Prêmios em Disputa</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginBottom: 32 }}>
          {CONFIG.prizes.map((p, i) => (
            <div key={i} className={`card anim stagger-${i + 1}`} style={{ padding: 22, borderTop: `3px solid ${p.color}` }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{p.icon}</div>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>{p.place}</div>
              <div className="display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--cream)', marginBottom: 6 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{p.desc}</div>
            </div>
          ))}
        </div>

        <div className="card anim" style={{ padding: 24, marginBottom: 20 }}>
          <h3 className="display" style={{ fontSize: 18, color: 'var(--cream2)', marginBottom: 18, textAlign: 'center' }}>Como Participar</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 16 }}>
            {[
              { icon: '🔢', title: 'Escolha os números', desc: 'Selecione quantos quiser' },
              { icon: '📝', title: 'Preencha seus dados', desc: 'Nome, e-mail e WhatsApp' },
              { icon: '💳', title: 'Pague via PIX', desc: 'Rápido e seguro' },
              { icon: '✅', title: 'Receba confirmação', desc: 'WhatsApp e e-mail' },
            ].map(s => (
              <div key={s.title} style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(201,153,58,0.12)', border: '1px solid rgba(201,153,58,0.3)', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-ghost" onClick={() => setStep('sorteio')} style={{ padding: '10px 22px', fontSize: 13 }}>
            🎲 Ver Resultado do Sorteio
          </button>
          <button className="btn-ghost" onClick={() => setStep('admin')} style={{ padding: '10px 22px', fontSize: 13 }}>
            🔐 Área Admin
          </button>
        </div>
      </div>
    </div>
  )

  // ── SELECTION ─────────────────────────────────────────────────────
  if (step === 'selection') return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', paddingBottom: 120 }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(13,27,46,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(201,153,58,0.2)', padding: '14px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-ghost" onClick={() => setStep('home')} style={{ padding: '8px 14px', fontSize: 13 }}>← Voltar</button>
          <span className="display gold-text" style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>Escolha seus Números</span>
          <button className="btn-ghost" onClick={fetchReserved} style={{ padding: '8px 12px', fontSize: 12 }}>🔄 Atualizar</button>
          {selected.size > 0 && (
            <button className="btn-gold" onClick={() => setStep('form')} style={{ padding: '10px 20px', fontSize: 14 }}>
              🛒 {selected.size} nº — R$ {totalValue},00 →
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
        {loadingNumbers && <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /><p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 }}>Carregando números...</p></div>}

        {!loadingNumbers && <>
          {/* Search + Filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input className="input" placeholder="🔍 Buscar número (ex: 0042)" value={search}
              onChange={e => { setSearch(e.target.value.replace(/\D/, '').slice(0, 4)); setPage(0) }}
              style={{ flex: '1 1 180px', maxWidth: 240 }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { val: 'all', label: 'Todos' },
                { val: 'available', label: 'Livres' },
                { val: 'selected', label: `Meus (${selected.size})` },
                { val: 'reserved', label: 'Vendidos' },
              ].map(f => (
                <button key={f.val} onClick={() => { setFilterStatus(f.val); setPage(0) }} style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: filterStatus === f.val ? 'rgba(201,153,58,0.2)' : 'rgba(255,255,255,0.04)',
                  border: filterStatus === f.val ? '1px solid var(--gold)' : '1px solid rgba(201,153,58,0.15)',
                  color: filterStatus === f.val ? 'var(--gold2)' : 'var(--muted)', fontFamily: 'Lato, sans-serif'
                }}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              { bg: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,153,58,0.12)', label: 'Disponível' },
              { bg: 'linear-gradient(135deg,rgba(201,153,58,0.35),rgba(232,192,96,0.2))', border: '1.5px solid var(--gold2)', label: 'Selecionado' },
              { bg: 'rgba(192,80,80,0.1)', border: '1px solid rgba(192,80,80,0.2)', label: 'Vendido' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: l.bg, border: l.border }} />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="anim" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(58px,1fr))', gap: 6, marginBottom: 16 }}>
            {paginated.map(num => {
              const st = reservedSet.has(num) ? 'reserved' : selected.has(num) ? 'selected' : 'available'
              return (
                <button key={num} onClick={() => toggleNumber(num)} className={`num-btn num-${st}`}>
                  {String(num).padStart(4, '0')}
                  {st === 'selected' && <div style={{ fontSize: 9, color: 'var(--gold2)' }}>✓</div>}
                  {st === 'reserved' && <div style={{ fontSize: 9 }}>✗</div>}
                </button>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
              <button className="btn-ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '8px 16px', fontSize: 13 }}>‹ Anterior</button>
              {Array.from({ length: totalPages }, (_, i) => i).map(pg => (
                <button key={pg} onClick={() => setPage(pg)} style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  background: page === pg ? 'rgba(201,153,58,0.2)' : 'rgba(255,255,255,0.04)',
                  border: page === pg ? '1px solid var(--gold)' : '1px solid rgba(201,153,58,0.15)',
                  color: page === pg ? 'var(--gold2)' : 'var(--muted)', fontFamily: 'Lato, sans-serif'
                }}>{pg + 1}</button>
              ))}
              <button className="btn-ghost" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{ padding: '8px 16px', fontSize: 13 }}>Próxima ›</button>
            </div>
          )}
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
            Mostrando {Math.min(page * PER_PAGE + 1, filtered.length)}–{Math.min((page + 1) * PER_PAGE, filtered.length)} de {filtered.length} números
          </div>
        </>}
      </div>

      {/* Floating cart */}
      {selected.size > 0 && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#1a3a5c,#0d1b2e)', border: '1px solid rgba(201,153,58,0.4)', borderRadius: 16, padding: '16px 24px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', gap: 20, minWidth: 320, maxWidth: 'calc(100vw - 32px)', animation: 'fadeUp 0.3s ease' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{selected.size} número(s)</div>
            <div className="display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold2)' }}>R$ {totalValue},00</div>
          </div>
          <button className="btn-gold" onClick={() => setStep('form')} style={{ padding: '12px 24px', fontSize: 15, flex: 1 }}>Continuar →</button>
        </div>
      )}
    </div>
  )

  // ── FORM ──────────────────────────────────────────────────────────
  if (step === 'form') return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
        <button className="btn-ghost" onClick={() => setStep('selection')} style={{ padding: '8px 14px', fontSize: 13, marginBottom: 20 }}>← Voltar à seleção</button>
        <h2 className="display anim gold-text" style={{ fontSize: 26, marginBottom: 4 }}>Seus Dados</h2>
        <p className="anim stagger-1" style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>Preencha para receber sua confirmação de reserva</p>

        <div className="card anim stagger-2" style={{ padding: 24, marginBottom: 16 }}>
          {[
            { key: 'name', label: 'Nome completo *', placeholder: 'Maria das Graças', type: 'text' },
            { key: 'cpf', label: 'CPF (opcional)', placeholder: '000.000.000-00', type: 'text' },
            { key: 'phone', label: 'WhatsApp *', placeholder: '(11) 99999-9999', type: 'tel' },
            { key: 'email', label: 'E-mail *', placeholder: 'maria@email.com', type: 'email' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <label className="label">{f.label}</label>
              <input className="input" type={f.type} placeholder={f.placeholder}
                value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}

          <hr className="divider" style={{ margin: '20px 0' }} />
          <label className="label">Receber confirmação por:</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {[
              { val: 'whatsapp', icon: '💬', label: 'WhatsApp' },
              { val: 'email', icon: '📧', label: 'E-mail' },
              { val: 'ambos', icon: '✨', label: 'Ambos' },
            ].map(opt => (
              <button key={opt.val} onClick={() => setForm(p => ({ ...p, notify: opt.val }))} style={{
                flex: 1, padding: 12, borderRadius: 10, cursor: 'pointer',
                background: form.notify === opt.val ? 'rgba(201,153,58,0.18)' : 'rgba(255,255,255,0.04)',
                border: form.notify === opt.val ? '1.5px solid var(--gold)' : '1px solid rgba(201,153,58,0.15)',
                color: form.notify === opt.val ? 'var(--cream)' : 'var(--muted)',
                fontFamily: 'Lato, sans-serif', fontSize: 13, fontWeight: 700
              }}>
                {opt.icon}<br />{opt.label}
                {form.notify === opt.val && <span style={{ marginLeft: 4, color: 'var(--gold2)' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="card anim stagger-3" style={{ padding: 18, marginBottom: 16, borderColor: 'rgba(201,153,58,0.35)' }}>
          <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Resumo</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {[...selected].sort((a, b) => a - b).slice(0, 20).map(n => (
              <span key={n} style={{ background: 'rgba(201,153,58,0.12)', border: '1px solid rgba(201,153,58,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontFamily: 'monospace', color: 'var(--cream2)' }}>
                {String(n).padStart(4, '0')}
              </span>
            ))}
            {selected.size > 20 && <span style={{ fontSize: 12, color: 'var(--muted)', padding: '3px 8px' }}>+{selected.size - 20} mais</span>}
          </div>
          <hr className="divider" style={{ margin: '10px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>{selected.size} × R$ {CONFIG.ticketPrice},00</span>
            <span className="display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold2)' }}>R$ {totalValue},00</span>
          </div>
        </div>

        {error && <div style={{ background: 'rgba(192,80,80,0.15)', border: '1px solid rgba(192,80,80,0.4)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#f08080' }}>⚠️ {error}</div>}

        <button className="btn-gold anim stagger-4"
          onClick={() => setStep('payment')}
          disabled={!form.name || !form.phone || !form.email}
          style={{ width: '100%', padding: 16, fontSize: 16, letterSpacing: 1 }}>
          Ir para Pagamento →
        </button>
      </div>
    </div>
  )

  // ── PAYMENT ───────────────────────────────────────────────────────
  if (step === 'payment') return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '24px 16px' }}>
        <button className="btn-ghost" onClick={() => setStep('form')} style={{ padding: '8px 14px', fontSize: 13, marginBottom: 20 }}>← Voltar</button>
        <h2 className="display anim gold-text" style={{ fontSize: 26, marginBottom: 4 }}>Pagamento</h2>
        <p className="anim stagger-1" style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>Realize o PIX e clique em confirmar</p>

        <div className="anim stagger-2" style={{ background: 'linear-gradient(135deg,rgba(74,175,120,0.1),rgba(74,175,120,0.05))', border: '2px solid rgba(74,175,120,0.45)', borderRadius: 16, padding: 24, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#6dd4a0', marginBottom: 4 }}>PIX — Aprovação Instantânea</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Chave PIX</div>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '12px 16px', fontFamily: 'monospace', fontSize: 14, color: '#6dd4a0', letterSpacing: '0.5px', marginBottom: 14, wordBreak: 'break-all' }}>
            {CONFIG.pixKey}
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--cream)' }}>R$ {totalValue},00</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            Descrição: Rifa — {form.name}
          </div>
        </div>

        <div className="anim stagger-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14, textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
          🔒 Após realizar o PIX, clique em confirmar. Seus números ficarão reservados imediatamente.
        </div>

        {error && <div style={{ background: 'rgba(192,80,80,0.15)', border: '1px solid rgba(192,80,80,0.4)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#f08080' }}>⚠️ {error}</div>}

        <button className="btn-gold anim stagger-4" onClick={handleReservar} disabled={loading}
          style={{ width: '100%', padding: 16, fontSize: 16, letterSpacing: 1 }}>
          {loading ? '⏳ Reservando...' : '✅ Confirmar Reserva'}
        </button>
      </div>
    </div>
  )

  // ── CONFIRMATION ──────────────────────────────────────────────────
  if (step === 'confirmation' && confirmation) return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', paddingBottom: 60, position: 'relative', overflow: 'hidden' }}>
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{ position: 'fixed', width: i % 3 === 0 ? 10 : 6, height: i % 3 === 0 ? 10 : 6, borderRadius: i % 2 === 0 ? '50%' : 2, background: ['#c9993a', '#e8c060', '#6dd4a0', '#90b8e8', '#f5efe0'][i % 5], left: `${5 + i * 4.7}%`, top: `${8 + (i % 4) * 4}%`, animation: `confettiFall ${1.2 + i * 0.15}s ease ${i * 0.08}s forwards`, pointerEvents: 'none', zIndex: 200 }} />
      ))}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h2 className="display anim gold-text" style={{ fontSize: 30, marginBottom: 6 }}>Reserva Confirmada!</h2>
        <p className="anim stagger-1" style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
          Que Deus abençoe, {confirmation.nome.split(' ')[0]}! Seus números estão garantidos. 🙏
        </p>

        <div className="card anim stagger-2" style={{ padding: 20, marginBottom: 16, borderColor: 'rgba(201,153,58,0.5)', background: 'rgba(201,153,58,0.05)' }}>
          <div className="label" style={{ textAlign: 'center', marginBottom: 8 }}>Código de Confirmação</div>
          <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, color: 'var(--gold2)', letterSpacing: 5 }}>{confirmation.codigo}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Guarde este código — você precisará no dia do sorteio</div>
        </div>

        <div className="card anim stagger-3" style={{ padding: 20, marginBottom: 16 }}>
          <div className="label" style={{ textAlign: 'center', marginBottom: 12 }}>Seus Números ({[...selected].length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginBottom: 12 }}>
            {[...selected].sort((a, b) => a - b).slice(0, 30).map(n => (
              <span key={n} style={{ background: 'rgba(201,153,58,0.15)', border: '1px solid rgba(201,153,58,0.4)', borderRadius: 7, padding: '5px 10px', fontSize: 13, fontFamily: 'monospace', color: 'var(--cream2)', fontWeight: 700 }}>
                {String(n).padStart(4, '0')}
              </span>
            ))}
            {selected.size > 30 && <span style={{ fontSize: 13, color: 'var(--muted)', padding: '5px 10px' }}>+{selected.size - 30} mais</span>}
          </div>
          <hr className="divider" style={{ margin: '10px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>{selected.size} número(s)</span>
            <span className="display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold2)' }}>R$ {confirmation.valorTotal},00</span>
          </div>
        </div>

        <div className="anim stagger-4" style={{ background: 'rgba(100,140,200,0.08)', border: '1px solid rgba(100,140,200,0.25)', borderRadius: 12, padding: 14, marginBottom: 24, fontSize: 13, color: '#8ab0d8' }}>
          📅 Sorteio: <strong>{CONFIG.drawDate}</strong> às <strong>{CONFIG.drawTime}</strong>
        </div>

        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          <a href={`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(waMsgRaw)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg,#25d366,#128c7e)', borderRadius: 12, padding: '15px 24px', color: 'white', fontWeight: 700, fontSize: 15, textDecoration: 'none', fontFamily: 'Lato, sans-serif' }}>
            💬 Enviar confirmação no WhatsApp
          </a>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(100,140,200,0.12)', border: '1px solid rgba(100,140,200,0.35)', borderRadius: 12, padding: '15px 24px', color: '#90b8e8', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'Lato, sans-serif' }}
            onClick={() => alert(`✉️ E-mail de confirmação enviado para ${confirmation.email}!\n\n(Para envio real de e-mail, configure o SendGrid ou Resend no backend.)`)}>
            📧 Receber por E-mail
          </button>
          <button className="btn-ghost" onClick={() => { setStep('home'); setSelected(new Set()); setForm({ name: '', cpf: '', phone: '', email: '', notify: 'ambos' }); setConfirmation(null) }} style={{ padding: 13, fontSize: 14 }}>
            🎟️ Comprar mais números
          </button>
        </div>
      </div>
    </div>
  )

  // ── SORTEIO PÚBLICO ───────────────────────────────────────────────
  if (step === 'sorteio') return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
        <button className="btn-ghost" onClick={() => setStep('home')} style={{ padding: '8px 14px', fontSize: 13, marginBottom: 28 }}>← Voltar</button>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🎲</div>
        <h2 className="display gold-text" style={{ fontSize: 28, marginBottom: 8 }}>Resultado do Sorteio</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>{CONFIG.drawDate} às {CONFIG.drawTime}</p>

        {sorteioResult ? (
          <div className="card" style={{ padding: 32, borderColor: 'rgba(201,153,58,0.5)', background: 'rgba(201,153,58,0.05)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Número Sorteado</div>
            <div style={{ fontFamily: 'monospace', fontSize: 52, fontWeight: 700, color: 'var(--gold2)', letterSpacing: 6, marginBottom: 12 }}>
              {String(sorteioResult.numero_sorteado).padStart(4, '0')}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 6 }}>{sorteioResult.nome_vencedor}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Código: {sorteioResult.codigo_vencedor}</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ color: 'var(--muted)', fontSize: 15 }}>O sorteio ainda não foi realizado.<br />Volte no dia {CONFIG.drawDate}!</div>
          </div>
        )}
      </div>
    </div>
  )

  // ── ADMIN ─────────────────────────────────────────────────────────
  if (step === 'admin') return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 16px' }}>
        <button className="btn-ghost" onClick={() => setStep('home')} style={{ padding: '8px 14px', fontSize: 13, marginBottom: 28 }}>← Voltar</button>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <h2 className="display gold-text" style={{ fontSize: 26, marginBottom: 4 }}>Área Administrativa</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Acesso restrito ao organizador</p>
        </div>

        {adminStep === 'login' && (
          <div className="card" style={{ padding: 24 }}>
            <label className="label">Senha de acesso</label>
            <input className="input" type="password" placeholder="••••••••" value={adminSenha} onChange={e => setAdminSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setAdminStep('dashboard')} style={{ marginBottom: 16 }} />
            <button className="btn-gold" onClick={() => setAdminStep('dashboard')} style={{ width: '100%', padding: 14, fontSize: 15 }}>
              Entrar
            </button>
          </div>
        )}

        {adminStep === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total de Números', value: CONFIG.totalNumbers, color: 'var(--muted)' },
                { label: 'Vendidos', value: reservedSet.size, color: 'var(--gold2)' },
                { label: 'Disponíveis', value: CONFIG.totalNumbers - reservedSet.size, color: '#6dd4a0' },
                { label: 'Arrecadado (est.)', value: `R$ ${reservedSet.size * CONFIG.ticketPrice},00`, color: '#90b8e8' },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 className="display" style={{ fontSize: 18, color: 'var(--cream2)', marginBottom: 8 }}>🎲 Realizar Sorteio</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                O sistema sorteia automaticamente entre todos os números vendidos. O resultado fica público na página de sorteio.
              </p>
              <button className="btn-gold" onClick={handleSorteio} disabled={sorteioLoading} style={{ width: '100%', padding: 14, fontSize: 15 }}>
                {sorteioLoading ? '⏳ Sorteando...' : '🎲 Sortear Agora'}
              </button>
            </div>

            {sorteioResult && (
              <div className="card" style={{ padding: 20, marginTop: 14, borderColor: 'rgba(201,153,58,0.5)', background: 'rgba(201,153,58,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Último Resultado</div>
                <div style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 700, color: 'var(--gold2)' }}>
                  {String(sorteioResult.numero_sorteado ?? sorteioResult.numero).padStart(4, '0')}
                </div>
                <div style={{ color: 'var(--cream)', fontSize: 16, marginTop: 6 }}>
                  {sorteioResult.nome_vencedor ?? sorteioResult.nome}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return null
}
