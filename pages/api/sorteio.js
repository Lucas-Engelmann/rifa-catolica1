import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Buscar último sorteio realizado
    const { data } = await supabase
      .from('sorteio')
      .select('*')
      .order('realizado_em', { ascending: false })
      .limit(1)
    return res.status(200).json({ sorteio: data?.[0] || null })
  }

  if (req.method === 'POST') {
    const { senha } = req.body
    const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'paroquia2025'

    if (senha !== ADMIN_PASS) {
      return res.status(401).json({ error: 'Senha incorreta.' })
    }

    // Buscar todos os tickets pagos ou pendentes para sortear
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('numero, nome, codigo_confirmacao, status')
      .in('status', ['pago', 'pendente'])

    if (error) return res.status(500).json({ error: error.message })
    if (!tickets?.length) return res.status(400).json({ error: 'Nenhum número vendido ainda.' })

    // Sortear aleatoriamente
    const vencedor = tickets[Math.floor(Math.random() * tickets.length)]

    const { error: insertError } = await supabase.from('sorteio').insert([{
      numero_sorteado: vencedor.numero,
      nome_vencedor: vencedor.nome,
      codigo_vencedor: vencedor.codigo_confirmacao
    }])

    if (insertError) return res.status(500).json({ error: insertError.message })

    return res.status(200).json({
      sucesso: true,
      numero: vencedor.numero,
      nome: vencedor.nome,
      codigo: vencedor.codigo_confirmacao,
      totalParticipantes: tickets.length
    })
  }

  res.status(405).json({ error: 'Método não permitido' })
}
