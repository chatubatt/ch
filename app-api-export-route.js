// app/api/export/route.js
import { NextResponse } from 'next/server';
import * as ExcelJS from 'exceljs';

export async function POST(request) {
  try {
    const { colaboradores, nomeArquivo } = await request.json();

    // Criar workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cronograma_Ferias');

    // Cabeçalhos
    const headers = [
      'Nome', 'Centro de Custo Completo', 'Código Custo', 
      'Célula Central', 'Unidade', 'Cargo', 'Data Limite', 
      'Data Início Férias', 'Data Fim Férias', 'Lote'
    ];

    worksheet.addRow(headers);

    // Adicionar dados
    colaboradores.forEach((colaborador) => {
      const row = [
        colaborador.Nome,
        colaborador.CentroCustoCompleto,
        colaborador.CodigoCusto,
        colaborador.CelulaCentral,
        colaborador.Unidade,
        colaborador.Cargo || '',
        colaborador.DataLimite 
          ? new Date(colaborador.DataLimite).toLocaleDateString('pt-BR') 
          : '',
        colaborador.DataInicioFerias 
          ? new Date(colaborador.DataInicioFerias).toLocaleDateString('pt-BR') 
          : '',
        colaborador.DataFimFerias 
          ? new Date(colaborador.DataFimFerias).toLocaleDateString('pt-BR') 
          : '',
        colaborador.Lote || ''
      ];
      worksheet.addRow(row);
    });

    // Ajustar largura das colunas
    worksheet.columns.forEach(column => {
      if (column.header && typeof column.header === 'string') {
        column.width = Math.max(column.header.length + 2, 15);
      }
    });

    // Gerar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Retornar arquivo
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nomeArquivo || 'cronograma_ferias.xlsx'}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Erro ao exportar:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro ao exportar Excel: ' + error.message 
    }, { status: 500 });
  }
}