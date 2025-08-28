
from datetime import datetime, timedelta
import pandas as pd
from data.holidays import eh_dia_util, proximo_dia_util

def gerar_data_fim(inicio, dias):
    """Calcula a data fim das férias baseada no início e quantidade de dias"""
    return inicio + timedelta(days=dias-1)

def classificar_hierarquia_cargo(cargo):
    """Classifica o cargo em níveis hierárquicos para priorização"""
    if pd.isna(cargo) or str(cargo).lower() in ["nan", "none", ""]:
        return 3  # Nível padrão para cargos não especificados
    
    cargo_lower = str(cargo).lower()
    
    # Nível 1: Alta gestão (prioridade máxima na distribuição)
    if any(palavra in cargo_lower for palavra in ["diretor", "gerente", "superintendente", "presidente"]):
        return 1
    
    # Nível 2: Gestão intermediária
    elif any(palavra in cargo_lower for palavra in ["supervisor", "coordenador", "chefe", "líder"]):
        return 2
    
    # Nível 3: Operacional
    else:
        return 3

def calcular_limite_por_cargo(df_unidade, cargo, percentual_base):
    """Calcula limite específico de colaboradores por cargo que podem sair simultaneamente"""
    total_cargo = len(df_unidade[df_unidade["Cargo"] == cargo])
    nivel_hierarquico = classificar_hierarquia_cargo(cargo)
    
    if nivel_hierarquico == 1:  # Alta gestão
        return 1  # Máximo 1 diretor/gerente por vez
    elif nivel_hierarquico == 2:  # Gestão intermediária
        return max(1, int(total_cargo * 0.5))  # Máximo 50% dos supervisores
    else:  # Operacional
        return max(1, int(total_cargo * percentual_base))  # Percentual padrão

def processar_distribuicao_com_cargo(df, celulas_sel, unidades_sel, dias, percentual, data_inicial):
    """Função principal para processar a distribuição de férias considerando cargo"""
    
    # Filtrar dados conforme seleção
    df_filtrado = df[
        df["CelulaCentral"].isin(celulas_sel) &
        df["Unidade"].isin(unidades_sel)
    ].copy()
    
    # Adicionar classificação hierárquica
    if "Cargo" in df_filtrado.columns:
        df_filtrado["NivelHierarquico"] = df_filtrado["Cargo"].apply(classificar_hierarquia_cargo)
        # Ordenar por: Unidade > Nível Hierárquico > Data Limite
        df_filtrado = df_filtrado.sort_values(by=["Unidade", "NivelHierarquico", "DataLimite"], na_position="last")
    else:
        df_filtrado = df_filtrado.sort_values(by=["Unidade", "DataLimite"], na_position="last")
    
    # Calcular janela temporal
    datas_validas = df_filtrado["DataLimite"].dropna()
    if len(datas_validas) == 0:
        return df_filtrado, [], {"erro": "Nenhuma data limite válida encontrada"}
    
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
        if "Cargo" in df_filtrado.columns:
            # Processar por nível hierárquico (gestores primeiro)
            for nivel in sorted(df_unidade["NivelHierarquico"].dropna().unique()):
                df_nivel = df_unidade[df_unidade["NivelHierarquico"] == nivel]
                
                for cargo in sorted(df_nivel["Cargo"].dropna().unique()):
                    grupo_idx = df_nivel[df_nivel["Cargo"] == cargo].index
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
                                    "Nome": row.get("Nome", "[sem nome]"),
                                    "CentroCusto": row.get("CentroCustoCompleto", "[não informado]"),
                                    "Unidade": unidade,
                                    "Cargo": row.get("Cargo", "[não informado]"),
                                    "DataLimite": "Não informada",
                                    "Motivo": "Data limite não informada"
                                })
                                continue
                            elif ini > row["DataLimite"].date():
                                colaboradores_ignorados.append({
                                    "Nome": row.get("Nome", "[sem nome]"),
                                    "CentroCusto": row.get("CentroCustoCompleto", "[não informado]"),
                                    "Unidade": unidade,
                                    "Cargo": row.get("Cargo", "[não informado]"),
                                    "DataLimite": row["DataLimite"].strftime("%d/%m/%Y"),
                                    "Motivo": "Data limite anterior ao período calculado"
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
                                "Nome": row.get("Nome", "[sem nome]"),
                                "CentroCusto": row.get("CentroCustoCompleto", "[não informado]"),
                                "Unidade": unidade,
                                "Cargo": "N/A",
                                "DataLimite": row["DataLimite"].strftime("%d/%m/%Y") if pd.notna(row["DataLimite"]) else "Não informada",
                                "Motivo": "Data limite incompatível" if pd.notna(row["DataLimite"]) else "Data limite não informada"
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
        "total_colaboradores": len(df_filtrado),
        "dias_janela": dias_janela,
        "meses_janela": meses_janela,
        "colaboradores_com_ferias": colaboradores_processados,
        "colaboradores_ignorados": len(colaboradores_ignorados),
        "unidades_processadas": len(df_filtrado["Unidade"].dropna().unique())
    }

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
        pendentes = df_resultado_final[df_resultado_final["DataInicioFerias"].isna()]
        
        if pendentes.empty:
            break  # Todos foram processados
            
        # st.info(f"⚙️ Tentativa {tentativas + 1} de {max_tentativas} - Processando {len(pendentes)} colaboradores pendentes...")
        
        # Processar pendentes com parâmetros atuais
        df_temp, ignorados_temp, stats_temp = processar_distribuicao_com_cargo(
            pendentes, celulas_sel, unidades_sel, dias, percentual_atual, 
            data_inicial + timedelta(days=tentativas * 30)  # Avançar data inicial a cada tentativa
        )
        
        # Atualizar resultado final
        mask = df_temp["DataInicioFerias"].notna()
        df_resultado_final.loc[df_temp[mask].index, "DataInicioFerias"] = df_temp.loc[mask, "DataInicioFerias"]
        df_resultado_final.loc[df_temp[mask].index, "DataFimFerias"] = df_temp.loc[mask, "DataFimFerias"]
        df_resultado_final.loc[df_temp[mask].index, "Lote"] = df_temp.loc[mask, "Lote"]
        
        colaboradores_processados += (df_temp["DataInicioFerias"].notna()).sum()
        colaboradores_ignorados.extend(ignorados_temp)
        
        # Aumentar percentual para próxima tentativa
        percentual_atual = min(1.0, percentual_atual + 0.1)  # Aumenta 10%
        tentativas += 1
    
    # Estatísticas finais
    estatisticas_finais = {
        "total_colaboradores": len(df_resultado_final),
        "colaboradores_com_ferias": (df_resultado_final["DataInicioFerias"].notna()).sum(),
        "colaboradores_ignorados": len(df_resultado_final[df_resultado_final["DataInicioFerias"].isna()]),
        "unidades_processadas": len(df_resultado_final["Unidade"].dropna().unique()),
        "tentativas_realizadas": tentativas,
        "percentual_final_usado": percentual_atual
    }
    
    return df_resultado_final, colaboradores_ignorados, estatisticas_finais

def criar_mapeamento_celula_subcelula(df):
    """Cria mapeamento entre células centrais e suas subcélulas"""
    mapeamento = {}
    for _, row in df.iterrows():
        celula = row["CelulaCentral"]
        subcelula = row["Unidade"]
        if pd.notna(celula) and pd.notna(subcelula):
            if celula not in mapeamento:
                mapeamento[celula] = set()
            mapeamento[celula].add(subcelula)
    return mapeamento

def exportar_para_excel(df):
    """Exporta DataFrame para Excel e retorna o arquivo em bytes"""
    output = BytesIO()
    
    # Preparar dados para exportação
    df_export = df.copy()
    
    # Converter datas para formato brasileiro
    for col in ["DataLimite", "DataInicioFerias", "DataFimFerias"]:
        if col in df_export.columns:
            df_export[col] = pd.to_datetime(df_export[col], errors="coerce").dt.strftime("%d/%m/%Y")
            df_export[col] = df_export[col].replace("NaT", "")
    
    # Reordenar colunas para melhor visualização
    colunas_ordem = ["Nome", "CentroCustoCompleto", "CodigoCusto", "CelulaCentral", "Unidade", "Cargo", "DataLimite", "DataInicioFerias", "DataFimFerias", "Lote"]
    colunas_disponiveis = [col for col in colunas_ordem if col in df_export.columns]
    outras_colunas = [col for col in df_export.columns if col not in colunas_ordem]
    df_export = df_export[colunas_disponiveis + outras_colunas]
    
    # Salvar no Excel
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df_export.to_excel(writer, sheet_name="Cronograma_Ferias", index=False)
    
    output.seek(0)
    return output.getvalue()


