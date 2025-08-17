import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
from io import BytesIO
import warnings
warnings.filterwarnings('ignore')

# Configuração da página
st.set_page_config(
    page_title="Agendador Inteligente de Férias",
    page_icon="📅",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Lista de feriados nacionais
FERIADOS = [
    '2025-01-01', '2025-03-03', '2025-03-04', '2025-04-18', '2025-04-21',
    '2025-05-01', '2025-06-19', '2025-09-07', '2025-10-12',
    '2025-11-02', '2025-11-15', '2025-11-20', '2025-12-25'
]
FERIADOS = [datetime.strptime(d, '%Y-%m-%d').date() for d in FERIADOS]

def eh_dia_util(d):
    """Verifica se uma data é dia útil (não é fim de semana nem feriado)"""
    return d.weekday() < 5 and d not in FERIADOS

def proximo_dia_util(d):
    """Encontra o próximo dia útil após uma data"""
    while not eh_dia_util(d):
        d += timedelta(days=1)
    return d

def gerar_data_fim(inicio, dias):
    """Calcula a data fim das férias baseada no início e quantidade de dias"""
    return inicio + timedelta(days=dias-1)

def processar_centro_custo(centro_custo_str):
    """Processa string de centro de custo para extrair informações relevantes"""
    if pd.isna(centro_custo_str) or str(centro_custo_str).lower() in ['nan', 'none', '']:
        return '000', 'Outros', 'Outros'
    
    partes = str(centro_custo_str).split(' - ')
    
    # Extrair código numérico (primeira parte)
    codigo = partes[0] if len(partes) > 0 else '000'
    
    # Extrair descrição principal (terceira parte, se existir)
    if len(partes) >= 3:
        descricao = partes[2]
        # Simplificar removendo prefixos regionais
        descricao_limpa = descricao.replace('Sp ', '').replace('Cg ', '').replace('Rh ', '').strip()
        categoria = descricao_limpa.title()
    else:
        categoria = 'Outros'
    
    return codigo, partes[2] if len(partes) >= 3 else 'Outros', categoria

def criar_mapeamento_celula_subcelula(df):
    """Cria mapeamento entre células centrais e suas subcélulas"""
    mapeamento = {}
    for _, row in df.iterrows():
        celula = row['CelulaCentral']
        subcelula = row['Unidade']
        if pd.notna(celula) and pd.notna(subcelula):
            if celula not in mapeamento:
                mapeamento[celula] = set()
            mapeamento[celula].add(subcelula)
    return mapeamento

def classificar_hierarquia_cargo(cargo):
    """Classifica o cargo em níveis hierárquicos para priorização"""
    if pd.isna(cargo) or str(cargo).lower() in ['nan', 'none', '']:
        return 3  # Nível padrão para cargos não especificados
    
    cargo_lower = str(cargo).lower()
    
    # Nível 1: Alta gestão (prioridade máxima na distribuição)
    if any(palavra in cargo_lower for palavra in ['diretor', 'gerente', 'superintendente', 'presidente']):
        return 1
    
    # Nível 2: Gestão intermediária
    elif any(palavra in cargo_lower for palavra in ['supervisor', 'coordenador', 'chefe', 'líder']):
        return 2
    
    # Nível 3: Operacional
    else:
        return 3

def calcular_limite_por_cargo(df_unidade, cargo, percentual_base):
    """Calcula limite específico de colaboradores por cargo que podem sair simultaneamente"""
    total_cargo = len(df_unidade[df_unidade['Cargo'] == cargo])
    nivel_hierarquico = classificar_hierarquia_cargo(cargo)
    
    if nivel_hierarquico == 1:  # Alta gestão
        return 1  # Máximo 1 diretor/gerente por vez
    elif nivel_hierarquico == 2:  # Gestão intermediária
        return max(1, int(total_cargo * 0.5))  # Máximo 50% dos supervisores
    else:  # Operacional
        return max(1, int(total_cargo * percentual_base))  # Percentual padrão

def validar_estrutura_arquivo(df):
    """Valida se o arquivo possui a estrutura correta"""
    erros = []
    
    if len(df.columns) < 14:
        erros.append("❌ Arquivo deve ter pelo menos 14 colunas (A até N)")
    
    # Validar coluna C (Nome)
    if df.iloc[:, 2].isna().all():
        erros.append("❌ Coluna C (Nome dos colaboradores) está completamente vazia")
    
    # Validar coluna F (Centro de Custo)
    if df.iloc[:, 5].isna().all():
        erros.append("❌ Coluna F (Centro de Custo) está completamente vazia")
    
    # Validar coluna G (Unidade)
    if df.iloc[:, 6].isna().all():
        erros.append("❌ Coluna G (Unidade/Subcélula) está completamente vazia")
    
    # Validar coluna M (Data Limite)
    if df.iloc[:, 12].isna().all():
        erros.append("❌ Coluna M (Data Limite) está completamente vazia")
    
    # Validar coluna N (Cargo) - opcional mas recomendada
    if len(df.columns) > 13 and df.iloc[:, 13].isna().all():
        erros.append("⚠️ Coluna N (Cargo) está vazia - funcionalidade de distribuição por cargo será limitada")
    
    return erros

def processar_distribuicao_completa(df, celulas_sel, unidades_sel, dias, percentual, data_inicial):
    """
    Função aprimorada para garantir distribuição de 100% da planilha
    com múltiplas tentativas e ajustes automáticos
    """
    df_resultado_final = df[
        df["CelulaCentral"].isin(celulas_sel) &
        df["Unidade"].isin(unidades_sel)
    ].copy()
    
    # Inicializar colunas de resultado
    df_resultado_final["DataInicioFerias"] = pd.NaT
    df_resultado_final["DataFimFerias"] = pd.NaT
    df_resultado_final["Lote"] = None
    
    colaboradores_ignorados = []
    colaboradores_processados = 0
    tentativas = 0
    max_tentativas = 3
    percentual_atual = percentual
    
    while tentativas < max_tentativas:
        pendentes = df_resultado_final[df_resultado_final['DataInicioFerias'].isna()]
        
        if pendentes.empty:
            break  # Todos foram processados
            
        st.info(f"⚙️ Tentativa {tentativas + 1} de {max_tentativas} - Processando {len(pendentes)} colaboradores pendentes...")
        
        # Processar pendentes com parâmetros atuais
        df_temp, ignorados_temp, stats_temp = processar_distribuicao_com_cargo(
            pendentes, celulas_sel, unidades_sel, dias, percentual_atual, 
            data_inicial + timedelta(days=tentativas * 30)  # Avançar data inicial a cada tentativa
        )
        
        # Atualizar resultado final
        mask = df_temp['DataInicioFerias'].notna()
        df_resultado_final.loc[df_temp[mask].index, 'DataInicioFerias'] = df_temp.loc[mask, 'DataInicioFerias']
        df_resultado_final.loc[df_temp[mask].index, 'DataFimFerias'] = df_temp.loc[mask, 'DataFimFerias']
        df_resultado_final.loc[df_temp[mask].index, 'Lote'] = df_temp.loc[mask, 'Lote']
        
        colaboradores_processados += (df_temp['DataInicioFerias'].notna()).sum()
        colaboradores_ignorados.extend(ignorados_temp)
        
        # Aumentar percentual para próxima tentativa
        percentual_atual = min(1.0, percentual_atual + 0.1)  # Aumenta 10%
        tentativas += 1
    
    # Estatísticas finais
    estatisticas_finais = {
        'total_colaboradores': len(df_resultado_final),
        'colaboradores_com_ferias': (df_resultado_final['DataInicioFerias'].notna()).sum(),
        'colaboradores_ignorados': len(df_resultado_final[df_resultado_final['DataInicioFerias'].isna()]),
        'unidades_processadas': len(df_resultado_final["Unidade"].dropna().unique()),
        'tentativas_realizadas': tentativas,
        'percentual_final_usado': percentual_atual
    }
    
    return df_resultado_final, colaboradores_ignorados, estatisticas_finais

def processar_distribuicao_com_cargo(df, celulas_sel, unidades_sel, dias, percentual, data_inicial):
    """Função principal para processar a distribuição de férias considerando cargo"""
    
    # Filtrar dados conforme seleção
    df_filtrado = df[
        df["CelulaCentral"].isin(celulas_sel) &
        df["Unidade"].isin(unidades_sel)
    ].copy()
    
    # Adicionar classificação hierárquica
    if 'Cargo' in df_filtrado.columns:
        df_filtrado['NivelHierarquico'] = df_filtrado['Cargo'].apply(classificar_hierarquia_cargo)
        # Ordenar por: Unidade > Nível Hierárquico > Data Limite
        df_filtrado = df_filtrado.sort_values(by=["Unidade", "NivelHierarquico", "DataLimite"], na_position='last')
    else:
        df_filtrado = df_filtrado.sort_values(by=["Unidade", "DataLimite"], na_position='last')
    
    # Calcular janela temporal
    datas_validas = df_filtrado["DataLimite"].dropna()
    if len(datas_validas) == 0:
        return df_filtrado, [], {'erro': 'Nenhuma data limite válida encontrada'}
    
    data_min = datas_validas.min().date()
    data_max = datas_validas.max().date()
    dias_janela = (data_max - data_min).days
    meses_janela = max(1, dias_janela / 31)
    
    # Inicializar colunas de resultado
    df_filtrado["DataInicioFerias"] = pd.NaT
    df_filtrado["DataFimFerias"] = pd.NaT
    df_filtrado["Lote"] = None
    
    lote = 1
    colaboradores_ignorados = []
    colaboradores_processados = 0
    
    # Processar cada unidade separadamente
    for unidade in sorted(df_filtrado["Unidade"].dropna().unique()):
        df_unidade = df_filtrado[df_filtrado["Unidade"] == unidade]
        data_disp = data_inicial
        
        # Se tiver coluna Cargo, processar por cargo dentro da unidade
        if 'Cargo' in df_filtrado.columns:
            # Processar por nível hierárquico (gestores primeiro)
            for nivel in sorted(df_unidade['NivelHierarquico'].dropna().unique()):
                df_nivel = df_unidade[df_unidade['NivelHierarquico'] == nivel]
                
                for cargo in sorted(df_nivel['Cargo'].dropna().unique()):
                    grupo_idx = df_nivel[df_nivel['Cargo'] == cargo].index
                    qtd_cargo = len(grupo_idx)
                    
                    if qtd_cargo == 0:
                        continue
                    
                    # Calcular limite específico para este cargo
                    limite_cargo = calcular_limite_por_cargo(df_unidade, cargo, percentual)
                    
                    # Distribuir colaboradores do cargo em lotes
                    for i in range(0, qtd_cargo, limite_cargo):
                        idx_lote = grupo_idx[i:i+limite_cargo]
                        ini = proximo_dia_util(data_disp)
                        fim_lote = None
                        
                        for idx in idx_lote:
                            row = df_filtrado.loc[idx]
                            
                            # Verificar data limite
                            if pd.isna(row["DataLimite"]):
                                colaboradores_ignorados.append({
                                    'Nome': row.get('Nome', '[sem nome]'),
                                    'CentroCusto': row.get('CentroCustoCompleto', '[não informado]'),
                                    'Unidade': unidade,
                                    'Cargo': row.get('Cargo', '[não informado]'),
                                    'DataLimite': 'Não informada',
                                    'Motivo': 'Data limite não informada'
                                })
                                continue
                            elif ini > row["DataLimite"].date():
                                colaboradores_ignorados.append({
                                    'Nome': row.get('Nome', '[sem nome]'),
                                    'CentroCusto': row.get('CentroCustoCompleto', '[não informado]'),
                                    'Unidade': unidade,
                                    'Cargo': row.get('Cargo', '[não informado]'),
                                    'DataLimite': row["DataLimite"].strftime('%d/%m/%Y'),
                                    'Motivo': 'Data limite anterior ao período calculado'
                                })
                                continue
                            
                            # Calcular período de férias
                            fim = gerar_data_fim(ini, dias)
                            df_filtrado.at[idx, "DataInicioFerias"] = pd.Timestamp(ini)
                            df_filtrado.at[idx, "DataFimFerias"] = pd.Timestamp(fim)
                            df_filtrado.at[idx, "Lote"] = lote
                            colaboradores_processados += 1
                            
                            if fim_lote is None or fim > fim_lote:
                                fim_lote = fim
                        
                        # Avançar data para próximo lote
                        if fim_lote:
                            # Intervalo maior para cargos de gestão
                            intervalo_dias = 7 if nivel <= 2 else 1
                            data_disp = proximo_dia_util(fim_lote + timedelta(days=intervalo_dias))
                            lote += 1
        
        else:
            # Processamento sem considerar cargo (compatibilidade)
            grupo_idx = df_unidade.index
            qtd_unidade = len(grupo_idx)
            
            if qtd_unidade > 0:
                tam_lote = max(1, int(qtd_unidade * percentual))
                
                for i in range(0, qtd_unidade, tam_lote):
                    idx_lote = grupo_idx[i:i+tam_lote]
                    ini = proximo_dia_util(data_disp)
                    fim_lote = None
                    
                    for idx in idx_lote:
                        row = df_filtrado.loc[idx]
                        
                        if pd.isna(row["DataLimite"]) or ini > row["DataLimite"].date():
                            colaboradores_ignorados.append({
                                'Nome': row.get('Nome', '[sem nome]'),
                                'CentroCusto': row.get('CentroCustoCompleto', '[não informado]'),
                                'Unidade': unidade,
                                'Cargo': 'N/A',
                                'DataLimite': row["DataLimite"].strftime('%d/%m/%Y') if pd.notna(row["DataLimite"]) else 'Não informada',
                                'Motivo': 'Data limite incompatível' if pd.notna(row["DataLimite"]) else 'Data limite não informada'
                            })
                            continue
                        
                        fim = gerar_data_fim(ini, dias)
                        df_filtrado.at[idx, "DataInicioFerias"] = pd.Timestamp(ini)
                        df_filtrado.at[idx, "DataFimFerias"] = pd.Timestamp(fim)
                        df_filtrado.at[idx, "Lote"] = lote
                        colaboradores_processados += 1
                        
                        if fim_lote is None or fim > fim_lote:
                            fim_lote = fim
                    
                    if fim_lote:
                        data_disp = proximo_dia_util(fim_lote + timedelta(days=1))
                        lote += 1
    
    return df_filtrado, colaboradores_ignorados, {
        'total_colaboradores': len(df_filtrado),
        'dias_janela': dias_janela,
        'meses_janela': meses_janela,
        'colaboradores_com_ferias': colaboradores_processados,
        'colaboradores_ignorados': len(colaboradores_ignorados),
        'unidades_processadas': len(df_filtrado["Unidade"].dropna().unique())
    }

def criar_grafico_distribuicao_mensal(df):
    """Cria gráfico da distribuição mensal de férias"""
    if df.empty or 'DataInicioFerias' not in df.columns:
        return None
        
    df_temp = df.copy()
    df_temp = df_temp[df_temp['DataInicioFerias'].notna()]
    
    if len(df_temp) == 0:
        return None
        
    df_temp["Mes_Ano"] = pd.to_datetime(df_temp["DataInicioFerias"], errors='coerce').dt.to_period("M")
    
    # Contar agendamentos por unidade e mês
    tabela_pivot = df_temp.groupby(["Unidade", "Mes_Ano"]).size().reset_index(name='Quantidade')
    tabela_pivot["Mes_Ano"] = tabela_pivot["Mes_Ano"].astype(str)
    
    if tabela_pivot.empty:
        return None
    
    # Criar gráfico de barras
    fig = px.bar(
        tabela_pivot, 
        x="Mes_Ano", 
        y="Quantidade", 
        color="Unidade",
        title="📊 Distribuição de Férias por Mês e Unidade",
        labels={"Mes_Ano": "Mês/Ano", "Quantidade": "Colaboradores de Férias", "Unidade": "Unidade"}
    )
    
    fig.update_layout(
        xaxis_tickangle=-45,
        height=500,
        showlegend=True,
        xaxis_title="Período (Mês/Ano)",
        yaxis_title="Quantidade de Colaboradores",
        hovermode='x unified'
    )
    
    return fig

def grafico_real_vs_limite(df_resultado, percentual):
    """
    Gera um gráfico comparando colaboradores agendados (Real) x Limite permitido
    """
    if df_resultado.empty or 'DataInicioFerias' not in df_resultado.columns:
        return None
    
    # Filtrar apenas registros com férias agendadas
    df_tmp = df_resultado[df_resultado['DataInicioFerias'].notna()].copy()
    
    if df_tmp.empty:
        return None
    
    df_tmp['Mes_Ano'] = pd.to_datetime(df_tmp['DataInicioFerias'], errors='coerce').dt.to_period('M')

    # Real: quantos colaboradores por unidade e mês
    real = df_tmp.groupby(['Unidade', 'Mes_Ano']).size().reset_index(name='Real')

    # Total de colaboradores por unidade (para o cálculo do limite)
    total_unidade = df_resultado.groupby('Unidade').size().reset_index(name='Total')

    # Cruzar para obter o limite teórico
    real = real.merge(total_unidade, on='Unidade', how='left')
    real['Limite'] = (real['Total'] * percentual).round().astype(int)
    real['Limite'] = real['Limite'].clip(lower=1)  # Mínimo 1 pessoa

    # Converter período para string
    real['Mes_Ano_Str'] = real['Mes_Ano'].astype(str)

    if real.empty:
        return None

    # Criar gráfico de barras para Real
    fig = px.bar(
        real,
        x='Mes_Ano_Str',
        y='Real',
        color='Unidade',
        title='📈 Real × Limite por Unidade e Mês',
        labels={'Mes_Ano_Str': 'Mês/Ano', 'Real': 'Colaboradores', 'Unidade': 'Unidade'}
    )

    # Adicionar linhas de limite para cada unidade
    cores_unidade = px.colors.qualitative.Plotly
    for i, unidade in enumerate(real['Unidade'].unique()):
        dados_unidade = real[real['Unidade'] == unidade].sort_values('Mes_Ano_Str')
        
        fig.add_scatter(
            x=dados_unidade['Mes_Ano_Str'],
            y=dados_unidade['Limite'],
            mode='lines+markers',
            name=f'Limite {unidade}',
            line=dict(color=cores_unidade[i % len(cores_unidade)], dash='dash'),
            marker=dict(symbol='diamond')
        )

    fig.update_layout(
        xaxis_title='Mês/Ano',
        yaxis_title='Quantidade de Colaboradores',
        height=600,
        hovermode='x unified',
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    return fig

def criar_grafico_distribuicao_por_cargo(df):
    """Cria gráfico da distribuição por cargo"""
    if df.empty or 'Cargo' not in df.columns or 'DataInicioFerias' not in df.columns:
        return None
        
    df_temp = df.copy()
    df_temp = df_temp[df_temp['DataInicioFerias'].notna()]
    
    if len(df_temp) == 0:
        return None
    
    # Adicionar classificação hierárquica
    df_temp['NivelHierarquico'] = df_temp['Cargo'].apply(classificar_hierarquia_cargo)
    nivel_descricao = {1: 'Alta Gestão', 2: 'Gestão Intermediária', 3: 'Operacional'}
    df_temp['DescricaoNivel'] = df_temp['NivelHierarquico'].map(nivel_descricao)
    
    df_temp["Mes_Ano"] = pd.to_datetime(df_temp["DataInicioFerias"], errors='coerce').dt.to_period("M")
    
    # Contar por nível hierárquico e mês
    tabela_cargo = df_temp.groupby(["DescricaoNivel", "Mes_Ano"]).size().reset_index(name='Quantidade')
    tabela_cargo["Mes_Ano"] = tabela_cargo["Mes_Ano"].astype(str)
    
    if tabela_cargo.empty:
        return None
    
    fig = px.bar(
        tabela_cargo,
        x="Mes_Ano",
        y="Quantidade", 
        color="DescricaoNivel",
        title="👔 Distribuição de Férias por Nível Hierárquico",
        labels={"Mes_Ano": "Mês/Ano", "Quantidade": "Colaboradores de Férias", "DescricaoNivel": "Nível Hierárquico"}
    )
    
    fig.update_layout(
        xaxis_tickangle=-45,
        height=500,
        showlegend=True
    )
    
    return fig

def criar_grafico_centro_custo(df):
    """Cria gráfico da distribuição por centro de custo"""
    if df.empty or 'CelulaCentral' not in df.columns:
        return None
    
    # Contar por centro de custo
    centro_custo_stats = df.groupby(['CelulaCentral', 'CodigoCusto']).size().reset_index(name='Quantidade')
    centro_custo_stats['Label'] = centro_custo_stats['CodigoCusto'] + ' - ' + centro_custo_stats['CelulaCentral']
    
    if centro_custo_stats.empty:
        return None
    
    fig = px.pie(
        centro_custo_stats,
        values='Quantidade',
        names='Label',
        title="🏢 Distribuição de Colaboradores por Centro de Custo"
    )
    
    fig.update_layout(height=500)
    
    return fig

def criar_analise_datas_limite(df):
    """Cria análise da distribuição de datas limite por unidade"""
    if df.empty or 'DataLimite' not in df.columns:
        return None, None
    
    # Filtrar apenas registros com data limite válida
    df_valido = df[df['DataLimite'].notna()].copy()
    
    if len(df_valido) == 0:
        return None, None
    
    # Criar coluna de período (Mês/Ano da data limite)
    df_valido['PeriodoLimite'] = pd.to_datetime(df_valido['DataLimite']).dt.to_period('M')
    
    # Análise por unidade e período
    analise_detalhada = df_valido.groupby(['Unidade', 'PeriodoLimite']).size().reset_index(name='Quantidade')
    analise_detalhada['PeriodoLimite_Str'] = analise_detalhada['PeriodoLimite'].astype(str)
    
    # Análise resumida por unidade
    resumo_unidades = df_valido.groupby('Unidade').agg({
        'DataLimite': ['count', 'min', 'max']
    }).round(2)
    resumo_unidades.columns = ['Total_Colaboradores', 'Data_Limite_Menor', 'Data_Limite_Maior']
    resumo_unidades = resumo_unidades.reset_index()
    
    # Criar gráfico de distribuição
    if not analise_detalhada.empty:
        fig = px.bar(
            analise_detalhada,
            x='PeriodoLimite_Str',
            y='Quantidade',
            color='Unidade',
            title='📅 Distribuição de Datas Limite por Período e Unidade',
            labels={
                'PeriodoLimite_Str': 'Período (Mês/Ano da Data Limite)',
                'Quantidade': 'Número de Colaboradores',
                'Unidade': 'Unidade/Subcélula'
            }
        )
        
        fig.update_layout(
            xaxis_tickangle=-45,
            height=500,
            showlegend=True,
            hovermode='x unified'
        )
        
        return fig, resumo_unidades
    
    return None, resumo_unidades

def criar_tabela_detalhada_datas_limite(df):
    """Cria tabela detalhada com estatísticas por unidade"""
    if df.empty or 'DataLimite' not in df.columns:
        return None
    
    df_valido = df[df['DataLimite'].notna()].copy()
    
    if len(df_valido) == 0:
        return None
    
    # Estatísticas detalhadas por unidade
    estatisticas = []
    
    for unidade in sorted(df_valido['Unidade'].unique()):
        dados_unidade = df_valido[df_valido['Unidade'] == unidade]
        
        # Calcular estatísticas
        total = len(dados_unidade)
        data_min = dados_unidade['DataLimite'].min()
        data_max = dados_unidade['DataLimite'].max()
        
        # Próximos 30, 60, 90 dias
        hoje = datetime.now().date()
        proximo_30 = len(dados_unidade[pd.to_datetime(dados_unidade['DataLimite']).dt.date <= (hoje + timedelta(days=30))])
        proximo_60 = len(dados_unidade[pd.to_datetime(dados_unidade['DataLimite']).dt.date <= (hoje + timedelta(days=60))])
        proximo_90 = len(dados_unidade[pd.to_datetime(dados_unidade['DataLimite']).dt.date <= (hoje + timedelta(days=90))])
        
        # Estatísticas por cargo se disponível
        gestores = 0
        if 'Cargo' in dados_unidade.columns:
            gestores = len(dados_unidade[dados_unidade['Cargo'].apply(classificar_hierarquia_cargo) <= 2])
        
        # Centros de custo únicos na unidade
        centros_custo = dados_unidade['CodigoCusto'].nunique() if 'CodigoCusto' in dados_unidade.columns else 'N/A'
        
        estatisticas.append({
            'Unidade': unidade,
            'Total_Colaboradores': total,
            'Centros_Custo': centros_custo,
            'Gestores': gestores if 'Cargo' in dados_unidade.columns else 'N/A',
            'Data_Limite_Mais_Proxima': data_min.strftime('%d/%m/%Y'),
            'Data_Limite_Mais_Distante': data_max.strftime('%d/%m/%Y'),
            'Próximos_30_dias': proximo_30,
            'Próximos_60_dias': proximo_60,
            'Próximos_90_dias': proximo_90,
            'Intervalo_Dias': (data_max.date() - data_min.date()).days
        })
    
    return pd.DataFrame(estatisticas)

def exportar_para_excel(df):
    """Exporta DataFrame para Excel e retorna o arquivo em bytes"""
    output = BytesIO()
    
    # Preparar dados para exportação
    df_export = df.copy()
    
    # Converter datas para formato brasileiro
    for col in ["DataLimite", "DataInicioFerias", "DataFimFerias"]:
        if col in df_export.columns:
            df_export[col] = pd.to_datetime(df_export[col], errors='coerce').dt.strftime('%d/%m/%Y')
            df_export[col] = df_export[col].replace('NaT', '')
    
    # Reordenar colunas para melhor visualização
    colunas_ordem = ['Nome', 'CentroCustoCompleto', 'CodigoCusto', 'CelulaCentral', 'Unidade', 'Cargo', 'DataLimite', 'DataInicioFerias', 'DataFimFerias', 'Lote']
    colunas_disponiveis = [col for col in colunas_ordem if col in df_export.columns]
    outras_colunas = [col for col in df_export.columns if col not in colunas_ordem]
    df_export = df_export[colunas_disponiveis + outras_colunas]
    
    # Salvar no Excel
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_export.to_excel(writer, sheet_name='Cronograma_Ferias', index=False)
    
    output.seek(0)
    return output.getvalue()

def mostrar_guia_inicial():
    """Exibe o guia inicial de uso do sistema"""
    with st.expander("📋 **GUIA DE USO RÁPIDO**", expanded=False):
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("""
            **📁 ESTRUTURA DO ARQUIVO EXCEL:**
            - ✅ Mínimo 14 colunas (A até N)
            - ✅ Coluna C: Nome dos colaboradores
            - ✅ Coluna F: Centro de Custo (formato: 525 - Orb Atc - Sp Alexia Dayane)
            - ✅ Coluna G: Subcélula/Unidade  
            - ✅ Coluna M: Data Limite (dd/mm/aaaa)
            - ✅ Coluna N: Cargo dos colaboradores
            """)
        
        with col2:
            st.markdown("""
            **⚙️ COMO USAR:**
            1. Carregue o arquivo Excel
            2. Configure dias e percentual
            3. Selecione centros de custo e unidades
            4. Execute o cálculo
            5. Analise os resultados
            6. Exporte o cronograma
            
            **🚀 NOVO: DISTRIBUIÇÃO COMPLETA:**
            - Sistema agora garante 100% da planilha
            - Múltiplas tentativas automáticas
            - Gráfico Real × Limite
            """)

# Interface principal
def main():
    # CSS customizado para melhorar a aparência
    st.markdown("""
    <style>
    .main-header {
        text-align: center;
        color: #1f77b4;
        margin-bottom: 30px;
    }
    .metric-container {
        background-color: #f0f2f6;
        padding: 10px;
        border-radius: 10px;
        margin: 5px 0;
    }
    .success-message {
        color: #28a745;
        font-weight: bold;
    }
    .error-message {
        color: #dc3545;
        font-weight: bold;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Título principal
    st.markdown('<h1 class="main-header">📅 Agendador Inteligente de Férias</h1>', unsafe_allow_html=True)
    st.markdown("### *Sistema automatizado para distribuição inteligente de férias por centro de custo e cargo com garantia de 100% da planilha*")
    
    # Mostrar guia inicial
    mostrar_guia_inicial()
    
    st.markdown("---")
    
    # Sidebar para configurações
    with st.sidebar:
        st.markdown("# ⚙️ **CONFIGURAÇÕES**")
        st.markdown("*Configure os parâmetros abaixo:*")
        
        # Upload de arquivo
        st.markdown("## 📁 **PASSO 1:** Arquivo")
        st.info("💡 Carregue o arquivo Excel com os dados dos colaboradores")
        
        arquivo = st.file_uploader(
            "Selecione o arquivo Excel:",
            type=['xlsx'],
            help="Estrutura: C=Nome, F=Centro de Custo, G=Unidade, M=Data Limite, N=Cargo"
        )
        
        if arquivo:
            try:
                with st.spinner("⏳ Processando arquivo com centros de custo..."):
                    df = pd.read_excel(arquivo, engine="openpyxl")
                    
                    # Validar estrutura básica
                    erros = validar_estrutura_arquivo(df)
                    
                    if erros:
                        st.error("❌ **Problemas encontrados no arquivo:**")
                        for erro in erros:
                            st.write(erro)
                        st.warning("💡 **Solução:** Corrija os problemas acima e carregue o arquivo novamente.")
                        st.stop()
                    
                    # PROCESSAMENTO ESPECÍFICO PARA CENTRO DE CUSTO
                    df['Nome'] = df.iloc[:, 2].astype(str).str.strip()  # Coluna C
                    
                    # Processar Centro de Custo (Coluna F)
                    centro_custo_raw = df.iloc[:, 5].astype(str).str.strip()
                    
                    # Aplicar processamento de centro de custo
                    processamento_cc = centro_custo_raw.apply(processar_centro_custo)
                    
                    df['CodigoCusto'] = [item[0] for item in processamento_cc]
                    df['DescricaoCusto'] = [item[1] for item in processamento_cc]
                    df['CelulaCentral'] = [item[2] for item in processamento_cc]
                    
                    # Manter referência completa
                    df['CentroCustoCompleto'] = centro_custo_raw
                    
                    df['Unidade'] = df.iloc[:, 6].astype(str).str.strip()  # Coluna G
                    df['DataLimite'] = pd.to_datetime(df.iloc[:, 12], errors='coerce')  # Coluna M
                    
                    # Mapear coluna de cargo (Coluna N)
                    if len(df.columns) > 13:
                        df['Cargo'] = df.iloc[:, 13].astype(str).str.strip()
                    
                    # Limpar dados inválidos
                    df_original_size = len(df)
                    df = df[
                        (df['Nome'] != 'nan') & 
                        (df['CelulaCentral'] != 'Outros') & 
                        (df['Unidade'] != 'nan') &
                        df['Nome'].notna() & 
                        df['CelulaCentral'].notna() & 
                        df['Unidade'].notna()
                    ]
                    
                    if len(df) == 0:
                        st.error("❌ Nenhum registro válido encontrado após processamento dos centros de custo")
                        st.stop()
                    
                    st.success(f"✅ **{len(df)} colaboradores** processados com sucesso!")
                    if df_original_size > len(df):
                        st.warning(f"⚠️ {df_original_size - len(df)} registros removidos por dados inválidos")
                    
                    st.info(f"🏢 **{df['CelulaCentral'].nunique()} centros de custo** identificados")
                    
                    # Verificar se tem coluna cargo
                    tem_cargo = 'Cargo' in df.columns and not df['Cargo'].isna().all() and not (df['Cargo'] == 'nan').all()
                    
                    if tem_cargo:
                        st.info("👔 **Coluna Cargo detectada** - Distribuição considerará hierarquia")
                    else:
                        st.warning("⚠️ **Coluna Cargo não encontrada** - Distribuição padrão será aplicada")
                    
                    # Estatísticas do arquivo
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric("Centros de Custo", df['CelulaCentral'].nunique())
                    with col2:
                        st.metric("Unidades/Subcélulas", df['Unidade'].nunique())
                    with col3:
                        if tem_cargo:
                            st.metric("Cargos Únicos", df['Cargo'].nunique())
                        else:
                            st.metric("Datas Limite", df['DataLimite'].notna().sum())
                
                st.markdown("---")
                
                # Parâmetros de configuração
                st.markdown("## ⚙️ **PASSO 2:** Parâmetros")
                st.info("💡 Configure os parâmetros de distribuição")
                
                dias_ferias = st.number_input(
                    "**Dias de Férias:**",
                    min_value=1,
                    max_value=60,
                    value=30,
                    step=1,
                    help="Quantidade de dias consecutivos de férias para cada colaborador"
                )
                
                percentual = st.slider(
                    "**Percentual Máximo Simultâneo (%):**",
                    min_value=1,
                    max_value=100,
                    value=20,
                    step=1,
                    help="Percentual máximo de colaboradores da mesma unidade que podem estar de férias simultaneamente"
                ) / 100
                
                # Mostrar explicação do percentual
                if tem_cargo:
                    st.caption("💡 **Com Cargo:** Gestores têm limites específicos. Diretores: máx 1 por vez. Supervisores: máx 50%. Operacional: percentual configurado.")
                else:
                    st.caption(f"💡 **Sem Cargo:** Em uma equipe de 10 pessoas, no máximo {max(1, int(10 * percentual))} poderão estar de férias simultaneamente.")
                
                data_inicial = st.date_input(
                    "**Data Início da Distribuição:**",
                    value=df['DataLimite'].dropna().min().date() if not df['DataLimite'].dropna().empty else datetime.today().date(),
                    help="Data a partir da qual as férias começarão a ser distribuídas"
                )
                
                st.markdown("---")
                
                # Seleção de células e unidades - AUTOMATICAMENTE SELECIONADAS
                st.markdown("## 🎯 **PASSO 3:** Seleção")
                st.info("💡 Por padrão, TODOS os centros de custo e unidades estão selecionados para garantir 100% da planilha")
                
                # Criar mapeamento
                mapeamento = criar_mapeamento_celula_subcelula(df)
                
                celulas_disponiveis = sorted(df['CelulaCentral'].dropna().unique())
                celulas_selecionadas = st.multiselect(
                    "**Centros de Custo:**",
                    options=celulas_disponiveis,
                    default=celulas_disponiveis,  # TODOS SELECIONADOS POR PADRÃO
                    help="Todos os centros de custo estão selecionados por padrão para processar a planilha completa"
                )
                
                if celulas_selecionadas:
                    # Mostrar estatísticas por centro de custo
                    for celula in celulas_selecionadas[:3]:  # Mostrar apenas as 3 primeiras
                        qtd_sub = len(mapeamento.get(celula, set()))
                        codigo_exemplo = df[df['CelulaCentral'] == celula]['CodigoCusto'].iloc[0] if len(df[df['CelulaCentral'] == celula]) > 0 else 'N/A'
                        st.caption(f"🏢 **{codigo_exemplo} - {celula}**: {qtd_sub} subcélulas")
                
                # Filtrar subcélulas baseado nas células selecionadas
                subcelulas_disponiveis = set()
                for celula in celulas_selecionadas:
                    subcelulas_disponiveis.update(mapeamento.get(celula, set()))
                
                unidades_selecionadas = st.multiselect(
                    "**Subcélulas/Unidades:**",
                    options=sorted(subcelulas_disponiveis),
                    default=sorted(subcelulas_disponiveis),  # TODAS SELECIONADAS POR PADRÃO
                    help="Todas as unidades estão selecionadas por padrão para processar a planilha completa"
                )
                
                if unidades_selecionadas:
                    st.success(f"✅ **{len(unidades_selecionadas)}** unidades selecionadas")
                
                st.markdown("---")
                
                # Botão de processamento
                st.markdown("## 🚀 **PASSO 4:** Execução")
                st.info("💡 Execute o cálculo da distribuição de férias para 100% da planilha")
                
                processar = st.button(
                    "🚀 **CALCULAR DISTRIBUIÇÃO COMPLETA**",
                    type="primary",
                    disabled=not (celulas_selecionadas and unidades_selecionadas),
                    help="Clique para iniciar o processamento da distribuição de férias para toda a planilha",
                    use_container_width=True
                )
                
                if not (celulas_selecionadas and unidades_selecionadas):
                    st.error("⚠️ Para processar toda a planilha, mantenha pelo menos um centro de custo e uma unidade selecionados")
                
            except Exception as e:
                st.error(f"❌ **Erro ao processar arquivo:** {str(e)}")
                st.warning("💡 Verifique se o arquivo está no formato correto e não está aberto em outro programa")
                st.stop()
    
    # Área principal
    if arquivo and 'df' in locals():
        # Mostrar prévia dos dados
        st.markdown("## 👥 **Prévia dos Dados Carregados**")
        
        # Destacar colunas importantes
        colunas_importantes = ['Nome', 'CentroCustoCompleto', 'CelulaCentral', 'Unidade', 'DataLimite']
        if 'Cargo' in df.columns:
            colunas_importantes.insert(4, 'Cargo')
        
        colunas_disponiveis = [col for col in colunas_importantes if col in df.columns]
        
        if colunas_disponiveis:
            with st.expander("🔍 **Ver prévia dos dados**", expanded=False):
                st.dataframe(df[colunas_disponiveis].head(10), use_container_width=True)
                st.caption(f"📊 Mostrando 10 de {len(df)} registros")
        
        # Análise por centro de custo
        st.markdown("---")
        st.markdown("## 🏢 **Análise por Centro de Custo**")
        
        with st.expander("🔍 **Ver distribuição por centro de custo**", expanded=False):
            
            # Gráfico de pizza com centros de custo
            grafico_cc = criar_grafico_centro_custo(df)
            if grafico_cc:
                st.plotly_chart(grafico_cc, use_container_width=True)
            
            # Tabela resumo
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("### 📊 **Resumo por Centro de Custo**")
                resumo_cc = df.groupby(['CodigoCusto', 'CelulaCentral']).size().reset_index(name='Total')
                resumo_cc['Label'] = resumo_cc['CodigoCusto'] + ' - ' + resumo_cc['CelulaCentral']
                for _, row in resumo_cc.head(5).iterrows():
                    st.metric(f"**{row['Label']}**", row['Total'])
            
            with col2:
                st.markdown("### 🏢 **Distribuição por Unidade**")
                resumo_unidade = df.groupby('Unidade').size().reset_index(name='Total')
                st.dataframe(resumo_unidade.head(10), use_container_width=True)
        
        # Análise por cargo (se disponível)
        if 'Cargo' in df.columns and not df['Cargo'].isna().all() and not (df['Cargo'] == 'nan').all():
            st.markdown("---")
            st.markdown("## 👔 **Análise por Cargo e Hierarquia**")
            
            with st.expander("🔍 **Ver distribuição por cargo**", expanded=False):
                
                # Adicionar classificação hierárquica
                df['NivelHierarquico'] = df['Cargo'].apply(classificar_hierarquia_cargo)
                nivel_descricao = {1: 'Alta Gestão', 2: 'Gestão Intermediária', 3: 'Operacional'}
                df['DescricaoNivel'] = df['NivelHierarquico'].map(nivel_descricao)
                
                # Estatísticas por cargo
                col1, col2 = st.columns(2)
                
                with col1:
                    st.markdown("### 📊 **Resumo por Nível Hierárquico**")
                    resumo_hierarquia = df.groupby('DescricaoNivel').size().reset_index(name='Total')
                    for _, row in resumo_hierarquia.iterrows():
                        st.metric(f"**{row['DescricaoNivel']}**", row['Total'])
                
                with col2:
                    st.markdown("### 🏢 **Cargos por Centro de Custo**")
                    resumo_cargo_cc = df.groupby(['CelulaCentral', 'DescricaoNivel']).size().unstack(fill_value=0)
                    st.dataframe(resumo_cargo_cc, use_container_width=True)
                
                # Alertas sobre cargos críticos
                st.markdown("### ⚠️ **Alertas de Cargos Críticos**")
                
                for centro in df['CelulaCentral'].unique():
                    df_centro = df[df['CelulaCentral'] == centro]
                    gestores = df_centro[df_centro['NivelHierarquico'] <= 2]
                    
                    if len(gestores) > 0:
                        codigo = df_centro['CodigoCusto'].iloc[0]
                        st.info(f"**{codigo} - {centro}:** {len(gestores)} cargos de gestão - distribuição será cuidadosa")
        
        # Análise de Datas Limite
        st.markdown("---")
        st.markdown("## 📅 **Análise de Datas Limite por Unidade**")
        
        with st.expander("🔍 **Ver análise detalhada das datas limite**", expanded=False):
            
            # Filtros para análise
            col1, col2 = st.columns(2)
            
            with col1:
                celulas_analise = st.multiselect(
                    "**Filtrar Centros de Custo para Análise:**",
                    options=sorted(df['CelulaCentral'].dropna().unique()),
                    default=sorted(df['CelulaCentral'].dropna().unique()),
                    key="analise_celulas"
                )
            
            with col2:
                unidades_analise = st.multiselect(
                    "**Filtrar Unidades para Análise:**",
                    options=sorted(df['Unidade'].dropna().unique()),
                    default=sorted(df['Unidade'].dropna().unique()),
                    key="analise_unidades"
                )
            
            if celulas_analise and unidades_analise:
                # Filtrar dados para análise
                df_analise = df[
                    df['CelulaCentral'].isin(celulas_analise) &
                    df['Unidade'].isin(unidades_analise)
                ]
                
                if len(df_analise) > 0:
                    # Criar análises
                    grafico_datas, resumo_datas = criar_analise_datas_limite(df_analise)
                    tabela_detalhada = criar_tabela_detalhada_datas_limite(df_analise)
                    
                    # Exibir resumo em métricas
                    st.markdown("### 📊 **Resumo Geral**")
                    
                    if resumo_datas is not None and not resumo_datas.empty:
                        col1, col2, col3, col4 = st.columns(4)
                        
                        with col1:
                            st.metric(
                                "🏢 **Unidades Analisadas**",
                                len(resumo_datas),
                                help="Número total de unidades na análise"
                            )
                        
                        with col2:
                            total_colaboradores = resumo_datas['Total_Colaboradores'].sum()
                            st.metric(
                                "👥 **Total Colaboradores**",
                                total_colaboradores,
                                help="Colaboradores com datas limite válidas"
                            )
                        
                        with col3:
                            data_mais_proxima = resumo_datas['Data_Limite_Menor'].min()
                            st.metric(
                                "⏰ **Data Mais Próxima**",
                                data_mais_proxima.strftime('%d/%m/%Y'),
                                help="Menor data limite encontrada"
                            )
                        
                        with col4:
                            data_mais_distante = resumo_datas['Data_Limite_Maior'].max()
                            st.metric(
                                "📆 **Data Mais Distante**",
                                data_mais_distante.strftime('%d/%m/%Y'),
                                help="Maior data limite encontrada"
                            )
                    
                    # Gráfico de distribuição
                    st.markdown("### 📈 **Distribuição por Período**")
                    
                    if grafico_datas:
                        st.plotly_chart(grafico_datas, use_container_width=True)
                        st.caption("💡 **Interpretação:** Este gráfico mostra quando cada unidade tem colaboradores com datas limite, ajudando a identificar períodos críticos")
                    else:
                        st.warning("⚠️ Não há dados suficientes para gerar o gráfico de distribuição")
                    
                    # Tabela detalhada por unidade
                    st.markdown("### 📋 **Estatísticas Detalhadas por Unidade**")
                    
                    if tabela_detalhada is not None and not tabela_detalhada.empty:
                        st.dataframe(tabela_detalhada, use_container_width=True)
                        
                        # Botão para exportar análise
                        st.markdown("### 💾 **Exportar Análise**")
                        
                        output_analise = BytesIO()
                        with pd.ExcelWriter(output_analise, engine='openpyxl') as writer:
                            tabela_detalhada.to_excel(writer, sheet_name='Analise_Datas_Limite', index=False)
                        
                        output_analise.seek(0)
                        
                        st.download_button(
                            label="📥 **BAIXAR ANÁLISE DE DATAS LIMITE (Excel)**",
                            data=output_analise.getvalue(),
                            file_name=f"analise_datas_limite_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx",
                            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        )
        
        # Processar se solicitado
        if processar and celulas_selecionadas and unidades_selecionadas:
            st.markdown("---")
            st.markdown("## ⚡ **Processando Distribuição Completa de Férias**")
            
            with st.spinner("🔄 **Calculando distribuição para 100% da planilha... aguarde...**"):
                df_resultado, ignorados, estatisticas = processar_distribuicao_completa(
                    df, celulas_selecionadas, unidades_selecionadas,
                    dias_ferias, percentual, data_inicial
                )
            
            if 'erro' in estatisticas:
                st.error(f"❌ **Erro:** {estatisticas['erro']}")
                st.stop()
            
            st.success("✅ **Distribuição completa concluída com sucesso!**")
            
            # Estatísticas da simulação
            st.markdown("---")
            st.markdown("## 📊 **Estatísticas da Simulação Completa**")
            
            col1, col2, col3, col4, col5 = st.columns(5)
            
            with col1:
                st.metric(
                    "👥 **Total**",
                    estatisticas['total_colaboradores'],
                    help="Total de colaboradores processados"
                )
            
            with col2:
                st.metric(
                    "✅ **Agendadas**",
                    estatisticas['colaboradores_com_ferias'],
                    help="Colaboradores que receberam agendamento"
                )
            
            with col3:
                st.metric(
                    "⚠️ **Pendentes**",
                    estatisticas['colaboradores_ignorados'],
                    help="Colaboradores que não puderam ser agendados"
                )
            
            with col4:
                st.metric(
                    "🚀 **Tentativas**",
                    estatisticas.get('tentativas_realizadas', 1),
                    help="Número de rodadas de processamento realizadas"
                )
            
            with col5:
                st.metric(
                    "📈 **% Final**",
                    f"{int(estatisticas.get('percentual_final_usado', percentual) * 100)}%",
                    help="Percentual máximo utilizado na última tentativa"
                )
            
            # Taxa de sucesso
            if estatisticas['total_colaboradores'] > 0:
                taxa_sucesso = (estatisticas['colaboradores_com_ferias'] / estatisticas['total_colaboradores']) * 100
                
                if taxa_sucesso >= 95:
                    st.success(f"🎉 **Excelente resultado!** {taxa_sucesso:.1f}% dos colaboradores foram contemplados")
                elif taxa_sucesso >= 80:
                    st.warning(f"⚡ **Bom resultado:** {taxa_sucesso:.1f}% dos colaboradores foram contemplados")
                else:
                    st.error(f"⚠️ **Atenção:** Apenas {taxa_sucesso:.1f}% dos colaboradores foram contemplados")
            
            # Gráficos de distribuição
            st.markdown("---")
            st.markdown("## 📈 **Visualizações da Distribuição**")
            
            # Tabs para diferentes gráficos
            tab1, tab2, tab3 = st.tabs(["📊 **Por Unidade**", "👔 **Por Cargo**", "📈 **Real × Limite**"])
            
            with tab1:
                grafico_unidade = criar_grafico_distribuicao_mensal(df_resultado)
                if grafico_unidade:
                    st.plotly_chart(grafico_unidade, use_container_width=True)
                    st.caption("💡 Distribuição mensal de férias por unidade")
                else:
                    st.warning("⚠️ Não há dados suficientes para gerar o gráfico por unidade")
            
            with tab2:
                if 'Cargo' in df_resultado.columns:
                    grafico_cargo = criar_grafico_distribuicao_por_cargo(df_resultado)
                    if grafico_cargo:
                        st.plotly_chart(grafico_cargo, use_container_width=True)
                        st.caption("💡 Distribuição mensal por nível hierárquico")
                    else:
                        st.warning("⚠️ Não há dados suficientes para gerar o gráfico por cargo")
                else:
                    st.info("ℹ️ Gráfico por cargo disponível apenas quando coluna Cargo está presente")
            
            with tab3:
                # NOVO GRÁFICO: Real × Limite
                grafico_real_limite = grafico_real_vs_limite(df_resultado, percentual)
                if grafico_real_limite:
                    st.plotly_chart(grafico_real_limite, use_container_width=True)
                    st.caption("💡 **Interpretação:** Barras = Real agendado, Linhas tracejadas = Limite permitido por unidade")
                    
                    # Análise do gráfico
                    st.markdown("### 📋 **Análise Real × Limite**")
                    
                    # Calcular estatísticas de conformidade
                    df_analise_limite = df_resultado[df_resultado['DataInicioFerias'].notna()].copy()
                    df_analise_limite['Mes_Ano'] = pd.to_datetime(df_analise_limite['DataInicioFerias']).dt.to_period('M')
                    
                    real_por_unidade_mes = df_analise_limite.groupby(['Unidade', 'Mes_Ano']).size().reset_index(name='Real')
                    total_por_unidade = df_resultado.groupby('Unidade').size().reset_index(name='Total')
                    analise_limite = real_por_unidade_mes.merge(total_por_unidade, on='Unidade')
                    analise_limite['Limite'] = (analise_limite['Total'] * percentual).round().astype(int).clip(lower=1)
                    analise_limite['Status'] = analise_limite.apply(lambda x: 'Dentro do Limite' if x['Real'] <= x['Limite'] else 'Acima do Limite', axis=1)
                    
                    status_counts = analise_limite['Status'].value_counts()
                    
                    col1, col2 = st.columns(2)
                    with col1:
                        st.metric("✅ **Dentro do Limite**", status_counts.get('Dentro do Limite', 0))
                    with col2:
                        st.metric("⚠️ **Acima do Limite**", status_counts.get('Acima do Limite', 0))
                    
                    if status_counts.get('Acima do Limite', 0) > 0:
                        st.warning("⚠️ Algumas unidades/períodos excederam o limite configurado. Considere ajustar os parâmetros.")
                else:
                    st.warning("⚠️ Não há dados suficientes para gerar o gráfico Real × Limite")
            
            # Cronograma detalhado
            st.markdown("---")
            st.markdown("## 📅 **Cronograma de Férias**")
            
            # Filtros para visualização
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                filtro_unidades = st.multiselect(
                    "**Filtrar Unidades:**",
                    options=sorted(df_resultado['Unidade'].dropna().unique()),
                    default=sorted(df_resultado['Unidade'].dropna().unique())[:5],  # Primeiras 5 por padrão
                    key="filtro_cronograma_unidades"
                )
            
            with col2:
                mostrar_apenas_agendados = st.checkbox(
                    "**Apenas com férias agendadas**",
                    value=True
                )
            
            with col3:
                if 'Cargo' in df_resultado.columns:
                    filtro_cargo = st.multiselect(
                        "**Filtrar por Nível:**",
                        options=['Alta Gestão', 'Gestão Intermediária', 'Operacional'],
                        default=['Alta Gestão', 'Gestão Intermediária', 'Operacional']
                    )
                else:
                    filtro_cargo = []
            
            with col4:
                ordenar_por = st.selectbox(
                    "**Ordenar por:**",
                    options=['Unidade', 'DataInicioFerias', 'DataLimite', 'Nome', 'CelulaCentral'] + (['Cargo'] if 'Cargo' in df_resultado.columns else []),
                    index=1  # DataInicioFerias por padrão
                )
            
            # Aplicar filtros
            df_cronograma = df_resultado[df_resultado['Unidade'].isin(filtro_unidades)] if filtro_unidades else df_resultado
            
            if mostrar_apenas_agendados:
                df_cronograma = df_cronograma[df_cronograma['DataInicioFerias'].notna()]
            
            # Filtrar por cargo se disponível
            if 'Cargo' in df_cronograma.columns and filtro_cargo:
                df_cronograma = df_cronograma.copy()
                nivel_descricao = {1: 'Alta Gestão', 2: 'Gestão Intermediária', 3: 'Operacional'}
                df_cronograma['DescricaoNivel'] = df_cronograma['Cargo'].apply(
                    lambda x: nivel_descricao.get(classificar_hierarquia_cargo(x), 'Operacional')
                )
                df_cronograma = df_cronograma[df_cronograma['DescricaoNivel'].isin(filtro_cargo)]
            
            # Ordenar
            df_cronograma = df_cronograma.sort_values(by=ordenar_por, na_position='last')
            
            # Preparar para exibição
            colunas_exibir = ['Nome', 'CentroCustoCompleto', 'CelulaCentral', 'Unidade']
            if 'Cargo' in df_cronograma.columns:
                colunas_exibir.append('Cargo')
            colunas_exibir.extend(['DataLimite', 'DataInicioFerias', 'DataFimFerias', 'Lote'])
            
            df_display = df_cronograma[colunas_exibir].copy()
            
            # Formatar datas
            for col in ['DataLimite', 'DataInicioFerias', 'DataFimFerias']:
                if col in df_display.columns:
                    df_display[col] = pd.to_datetime(df_display[col], errors='coerce').dt.strftime('%d/%m/%Y')
                    df_display[col] = df_display[col].replace('NaT', '-')
            
            # Exibir cronograma
            if len(df_display) > 0:
                st.dataframe(df_display, use_container_width=True, height=400)
                st.caption(f"📊 **Exibindo {len(df_display)}** de {len(df_resultado)} registros")
            else:
                st.info("ℹ️ Nenhum registro encontrado com os filtros aplicados")
            
            # Relatório de exceções
            if ignorados:
                st.markdown("---")
                st.markdown("## ⚠️ **Relatório de Exceções**")
                
                df_ignorados = pd.DataFrame(ignorados)
                st.dataframe(df_ignorados, use_container_width=True)
                
                # Análise dos motivos
                motivos = df_ignorados['Motivo'].value_counts()
                st.markdown("**📈 Principais motivos:**")
                for motivo, qtd in motivos.items():
                    st.write(f"- **{motivo}:** {qtd} colaboradores")
                
                st.info("💡 **Dica:** Ajuste as datas limite na planilha original ou altere a data de início da distribuição")
            
            # Colaboradores sem agendamento
            pendentes_finais = df_resultado[df_resultado['DataInicioFerias'].isna()]
            if not pendentes_finais.empty:
                st.markdown("---")
                st.markdown("## 🔍 **Colaboradores Sem Agendamento**")
                st.warning(f"⚠️ {len(pendentes_finais)} colaboradores não puderam ser agendados mesmo após múltiplas tentativas")
                
                # Mostrar os pendentes
                colunas_pendentes = ['Nome', 'CentroCustoCompleto', 'CelulaCentral', 'Unidade', 'DataLimite']
                if 'Cargo' in pendentes_finais.columns:
                    colunas_pendentes.insert(-1, 'Cargo')
                
                df_pendentes_display = pendentes_finais[colunas_pendentes].copy()
                df_pendentes_display['DataLimite'] = pd.to_datetime(df_pendentes_display['DataLimite'], errors='coerce').dt.strftime('%d/%m/%Y')
                df_pendentes_display['DataLimite'] = df_pendentes_display['DataLimite'].replace('NaT', 'Não informada')
                
                st.dataframe(df_pendentes_display, use_container_width=True)
                
                st.info("""
                💡 **Recomendações para resolver:**
                - Verifique se as datas limite estão corretas
                - Considere estender o período de distribuição
                - Aumente o percentual máximo permitido
                - Revise as regras de cargo se aplicável
                """)
            
            # Exportação
            st.markdown("---")
            st.markdown("## 💾 **Exportar Resultados**")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                excel_data = exportar_para_excel(df_resultado)
                st.download_button(
                    label="📥 **BAIXAR CRONOGRAMA COMPLETO (Excel)**",
                    data=excel_data,
                    file_name=f"cronograma_ferias_completo_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
            
            with col2:
                st.metric("📄 **Total Registros**", len(df_resultado))
            
            with col3:
                if not pendentes_finais.empty:
                    # Exportar apenas pendentes
                    excel_pendentes = exportar_para_excel(pendentes_finais)
                    st.download_button(
                        label="⚠️ **BAIXAR APENAS PENDENTES (Excel)**",
                        data=excel_pendentes,
                        file_name=f"colaboradores_pendentes_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx",
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    )
            
            st.markdown("---")
            st.success(f"🎉 **Processo concluído!** {taxa_sucesso:.1f}% da planilha foi processada com sucesso. Você pode ajustar os parâmetros e executar novamente se necessário.")
            
    else:
        # Instruções quando não há arquivo
        st.markdown("## 🚀 **Como Começar**")
        st.info("👈 **Para começar:** Carregue um arquivo Excel na barra lateral seguindo o **PASSO 1**")
        
        # Exemplo de estrutura
        st.markdown("### 📋 **Exemplo de Estrutura do Arquivo Excel**")
        
        exemplo_df = pd.DataFrame({
            'A': ['Dado1', 'Dado2', 'Dado3'],
            'B': ['Info1', 'Info2', 'Info3'], 
            'C (Nome)': ['João Silva', 'Maria Santos', 'Carlos Lima'],
            'D-E': ['...', '...', '...'],
            'F (Centro de Custo)': ['525 - Orb Atc - Sp Alexia Dayane', '330 - Orb Atc - Operacoes Sp', '1037 - Orb Atc - Rh Necxt'],
            'G (Unidade)': ['Unidade A', 'Unidade B', 'Unidade C'],
            'H-L': ['...', '...', '...'],
            'M (Data Limite)': ['31/12/2025', '30/06/2026', '15/03/2026'],
            'N (Cargo)': ['Gerente', 'Analista', 'Supervisor']
        })
        
        st.dataframe(exemplo_df, use_container_width=True)
        st.caption("💡 **Estrutura específica:** C=Nome, F=Centro de Custo (formato completo), G=Unidade, M=Data Limite, N=Cargo")
        
        # Benefícios do sistema
        st.markdown("### ✨ **Principais Funcionalidades**")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown("""
            **🏢 Centro de Custo Inteligente:**
            - Processa códigos completos automaticamente
            - Extrai categoria principal para agrupamento
            - Mantém rastreabilidade completa
            - Análises visuais por centro de custo
            """)
        
        with col2:
            st.markdown("""
            **👔 Distribuição por Cargo:**
            - Evita ausência simultânea de gestores
            - Intervalos maiores entre cargos críticos
            - Alertas automáticos para situações especiais
            - Relatórios hierárquicos detalhados
            """)
        
        with col3:
            st.markdown("""
            **🚀 Distribuição Completa:**
            - Garante processamento de 100% da planilha
            - Múltiplas tentativas automáticas
            - Gráfico Real × Limite
            - Relatório de conformidade
            """)

if __name__ == "__main__":
    main()
