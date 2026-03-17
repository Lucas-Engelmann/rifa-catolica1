import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('tickets')
      .select('numero, status')
      .neq('status', 'cancelado')

    if (error) return res.status(500).json({ error: error.message })
    const numeros = data.map(t => t.numero)
    return res.status(200).json({ numeros })
  }

  if (req.method === 'POST') {
    const { numeros, nome, telefone, email, cpf, metodo_notificacao } = req.body

    if (!numeros?.length || !nome || !telefone || !email) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando.' })
    }

    // Verificar se algum número já foi reservado
    const { data: existentes } = await supabase
      .from('tickets')
      .select('numero')
      .in('numero', numeros)
      .neq('status', 'cancelado')

    if (existentes?.length > 0) {
      const ocupados = existentes.map(e => e.numero)
      return res.status(409).json({ error: 'Números já reservados', numeros: ocupados })
    }

    const codigo = 'PAR' + Date.now().toString(36).toUpperCase().slice(-6)
    const valorPorNumero = 20
    const valorTotal = numeros.length * valorPorNumero

    const rows = numeros.map(n => ({
      numero: n,
      nome,
      telefone,
      email,
      cpf: cpf || null,
      metodo_notificacao: metodo_notificacao || 'ambos',
      codigo_confirmacao: codigo,
      valor_pago: valorPorNumero,
      status: 'pendente'
    }))

    const { error: insertError } = await supabase.from('tickets').insert(rows)

    if (insertError) return res.status(500).json({ error: insertError.message })

    return res.status(200).json({
      sucesso: true,
      codigo,
      numeros,
      valorTotal,
      nome,
      email,
      telefone
    })
  }

  res.status(405).json({ error: 'Método não permitido' })
}
