// app/api/process/route.js
import { NextResponse } from 'next/server';
import { 
  processarDadosExcel, 
  validarEstruturaArquivo, 
  processarDistribuicaoCompleta 
} from '../../../lib/business.js';

export async function POST(request) {
  try {
    const { 
      dados, 
      celulasSelecionadas, 
      unidadesSelecionadas, 
      diasFerias, 
      percentual, 
      dataInicial 
    } = await request.json();

    // Validar estrutura
    const erros = validarEstruturaArquivo(dados);
    if (erros.length > 0) {
      return NextResponse.json({ 
        success: false, 
        erros 
      }, { status: 400 });
    }

    // Processar dados do Excel
    const colaboradores = processarDadosExcel(dados);
    
    if (colaboradores.length === 0) {
      return NextResponse.json({ 
        success: false, 
        erros: ['Nenhum colaborador válido encontrado no arquivo'] 
      }, { status: 400 });
    }

    // Processar distribuição de férias
    const [resultado, ignorados, estatisticas] = processarDistribuicaoCompleta(
      colaboradores,
      celulasSelecionadas,
      unidadesSelecionadas,
      diasFerias,
      percentual / 100, // Converter de percentual para decimal
      new Date(dataInicial)
    );

    return NextResponse.json({
      success: true,
      resultado,
      ignorados,
      estatisticas
    });

  } catch (error) {
    console.error('Erro ao processar:', error);
    return NextResponse.json({ 
      success: false, 
      erros: ['Erro interno do servidor: ' + error.message] 
    }, { status: 500 });
  }
}