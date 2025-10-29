"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useSalesData } from "@/hooks/use-firestore-data-v2";
import type { VendaDetalhada } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { getDbClient } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, limit } from "firebase/firestore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

interface PlanilhaData {
  codigo: string;
  item: string;
  descricao: string;
}

interface ItemEncontrado {
  codigo: string;
  item: string;
  descricao: string;
  quantidade?: number;
  valorUnitario?: number;
  digitosRepetidos: string;
  similaridadeNome: number;
  numeracaoIdentificada: string;
}

interface DadosComMatch extends PlanilhaData {
  encontrado: boolean;
  itensEncontrados: ItemEncontrado[];
  pedidoEncontrado: boolean;
}

type FiltroStatus = 'todos' | 'identificados' | 'nao-identificados' | 'pedido-nao-encontrado';

interface ItemParaAtualizar {
  codigoPedido: string;
  itemAtual: string;
  itemNovo: string;
  descricao: string;
  indiceOriginal: number;
}

export default function GeralPage() {
  const [dados, setDados] = React.useState<PlanilhaData[]>([]);
  const [fileName, setFileName] = React.useState<string>("");
  const [paginaAtual, setPaginaAtual] = React.useState(1);
  const [itensPorPagina, setItensPorPagina] = React.useState(10);
  const [filtroAtivo, setFiltroAtivo] = React.useState<FiltroStatus>('todos');
  const [itensSelecionados, setItensSelecionados] = React.useState<Set<number>>(new Set());
  const [atualizando, setAtualizando] = React.useState(false);
  const [mostrarModalConfirmacao, setMostrarModalConfirmacao] = React.useState(false);
  const [progressoAtual, setProgressoAtual] = React.useState(0);
  const [progressoTotal, setProgressoTotal] = React.useState(0);
  const [itemAtualProcessando, setItemAtualProcessando] = React.useState("");
  const { toast } = useToast();

  // Buscar todas as vendas do sistema (sem filtro de data para pegar tudo)
  const { data: vendasData, isLoading: vendasLoading } = useSalesData();

  const processarPlanilha = React.useCallback((file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Validar e mapear os dados
        const dadosProcessados: PlanilhaData[] = json.map((row, index) => {
          // Tentar diferentes variações de nomes de colunas
          const codigo = row["Código"] || row["Codigo"] || row["CÓDIGO"] || row["CODIGO"] || row["código"] || row["codigo"] || "";
          const item = row["Item"] || row["ITEM"] || row["item"] || "";
          const descricao = row["Descrição"] || row["Descricao"] || row["DESCRIÇÃO"] || row["DESCRICAO"] || row["descrição"] || row["descricao"] || "";

          if (!codigo && !item && !descricao) {
            console.warn(`Linha ${index + 1} não possui dados válidos`);
          }

          return {
            codigo: String(codigo || "").trim(),
            item: String(item || "").trim(),
            descricao: String(descricao || "").trim(),
          };
        }).filter(row => row.codigo || row.item || row.descricao);

        if (dadosProcessados.length === 0) {
          toast({
            title: "Erro ao processar planilha",
            description: "Nenhum dado válido encontrado. Verifique se a planilha possui as colunas: Código, Item e Descrição.",
            variant: "destructive",
          });
          return;
        }

        setDados(dadosProcessados);
        setFileName(file.name);
        toast({
          title: "Planilha carregada com sucesso!",
          description: `${dadosProcessados.length} linhas foram importadas.`,
        });
      } catch (error) {
        console.error("Erro ao processar planilha:", error);
        toast({
          title: "Erro ao processar planilha",
          description: "Ocorreu um erro ao ler o arquivo. Verifique se é uma planilha válida.",
          variant: "destructive",
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível ler o arquivo selecionado.",
        variant: "destructive",
      });
    };

    reader.readAsBinaryString(file);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        processarPlanilha(acceptedFiles[0]);
      }
    },
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const limparDados = () => {
    setDados([]);
    setFileName("");
    toast({
      title: "Dados limpos",
      description: "Os dados da planilha foram removidos.",
    });
  };

  // Função para normalizar código (remove espaços, caracteres especiais)
  const normalizarCodigo = (codigo: string): string => {
    return String(codigo || "").replace(/[^\d]/g, "").trim();
  };

  // Função para normalizar texto (para comparação de nomes)
  const normalizarTexto = (texto: string): string => {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  };

  // Função para calcular similaridade entre dois textos
  const calcularSimilaridade = (texto1: string, texto2: string): number => {
    const norm1 = normalizarTexto(texto1);
    const norm2 = normalizarTexto(texto2);

    // Se um contém o outro, alta similaridade
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return 90;
    }

    // Contar palavras em comum
    const palavras1 = norm1.split(" ").filter(p => p.length > 2);
    const palavras2 = norm2.split(" ").filter(p => p.length > 2);

    if (palavras1.length === 0 || palavras2.length === 0) return 0;

    let palavrasComuns = 0;
    palavras1.forEach(p1 => {
      if (palavras2.some(p2 => p2.includes(p1) || p1.includes(p2))) {
        palavrasComuns++;
      }
    });

    return (palavrasComuns / Math.max(palavras1.length, palavras2.length)) * 100;
  };

  // Função para encontrar dígitos em comum entre dois códigos
  const encontrarDigitosComuns = (codigo1: string, codigo2: string): string => {
    const norm1 = normalizarCodigo(codigo1);
    const norm2 = normalizarCodigo(codigo2);

    let digitosComuns = "";
    let pos1 = 0;

    // Percorrer codigo1 e encontrar sequências que aparecem em codigo2
    while (pos1 < norm1.length) {
      // Tentar encontrar a maior sequência comum a partir desta posição
      let melhorSequencia = "";
      for (let tamanho = norm1.length - pos1; tamanho > 0; tamanho--) {
        const sequencia = norm1.substring(pos1, pos1 + tamanho);
        if (norm2.includes(sequencia) && sequencia.length > melhorSequencia.length) {
          melhorSequencia = sequencia;
        }
      }

      if (melhorSequencia) {
        digitosComuns += melhorSequencia;
        pos1 += melhorSequencia.length;
      } else {
        pos1++;
      }
    }

    return digitosComuns;
  };

  // Função para extrair a numeração (parte que não é comum)
  const extrairNumeracao = (codigoItem: string, codigoProduto: string): string => {
    const normItem = normalizarCodigo(codigoItem);
    const normProduto = normalizarCodigo(codigoProduto);

    // Remover o código do produto do código do item para ficar só com a numeração
    let numeracao = normItem;

    // Tentar diferentes posições para encontrar onde começa a numeração
    for (let i = 0; i < normProduto.length; i++) {
      const prefixo = normProduto.substring(0, normProduto.length - i);
      if (normItem.startsWith(prefixo)) {
        numeracao = normItem.substring(prefixo.length);
        break;
      }
    }

    return numeracao || "N/A";
  };

  // Fazer o matching entre os dados da planilha e os itens do sistema
  const dadosComMatch = React.useMemo((): DadosComMatch[] => {
    if (dados.length === 0) {
      return [];
    }

    if (vendasData.length === 0) {
      return dados.map(d => ({
        ...d,
        encontrado: false,
        itensEncontrados: [],
        pedidoEncontrado: false,
      }));
    }

    return dados.map(planilhaRow => {
      const codigoPlanilha = normalizarCodigo(planilhaRow.codigo);
      const descricaoPlanilha = normalizarTexto(planilhaRow.descricao);
      const itemPlanilha = normalizarCodigo(planilhaRow.item);

      // 1. Buscar o pedido pelo código
      const itensDoPedido = vendasData.filter((venda: VendaDetalhada) => {
        const codigoVenda = normalizarCodigo(String(venda.codigo || ""));
        return codigoVenda === codigoPlanilha;
      });

      const pedidoEncontrado = itensDoPedido.length > 0;

      if (!pedidoEncontrado) {
        return {
          ...planilhaRow,
          encontrado: false,
          itensEncontrados: [],
          pedidoEncontrado: false,
        };
      }

      // 2. Dentro dos itens do pedido, buscar pelo nome do produto (descrição)
      const itensEncontrados: ItemEncontrado[] = [];
      const itensVistos = new Set<string>();

      itensDoPedido.forEach((venda: VendaDetalhada) => {
        // Verificar se tem descrição e item
        if (!venda.descricao || !venda.item) return;

        const descricaoSistema = normalizarTexto(venda.descricao);
        const similaridade = calcularSimilaridade(descricaoPlanilha, descricaoSistema);

        // Considerar match se similaridade for maior que 50%
        if (similaridade > 50) {
          const itemSistema = normalizarCodigo(venda.item);
          const chaveUnica = `${venda.item}-${venda.descricao}`;

          if (!itensVistos.has(chaveUnica)) {
            itensVistos.add(chaveUnica);

            // 3. Comparar os códigos e identificar dígitos repetidos
            const digitosRepetidos = encontrarDigitosComuns(itemPlanilha, itemSistema);
            const numeracaoIdentificada = extrairNumeracao(itemPlanilha, itemSistema);

            itensEncontrados.push({
              codigo: String(venda.codigo || ""),
              item: venda.item,
              descricao: venda.descricao || "",
              quantidade: venda.quantidade,
              valorUnitario: venda.valorUnitario,
              digitosRepetidos,
              similaridadeNome: Math.round(similaridade),
              numeracaoIdentificada,
            });
          }
        }
      });

      // Ordenar por similaridade (maior primeiro)
      itensEncontrados.sort((a, b) => b.similaridadeNome - a.similaridadeNome);

      return {
        ...planilhaRow,
        encontrado: itensEncontrados.length > 0,
        itensEncontrados,
        pedidoEncontrado,
      };
    });
  }, [dados, vendasData]);

  // Resetar para página 1 quando os dados mudarem
  React.useEffect(() => {
    setPaginaAtual(1);
  }, [dadosComMatch, filtroAtivo]);

  // Calcular estatísticas (sempre sobre todos os dados)
  const estatisticas = React.useMemo(() => {
    const total = dadosComMatch.length;
    const encontrados = dadosComMatch.filter(d => d.encontrado).length;
    const naoEncontrados = total - encontrados;
    const pedidosEncontrados = dadosComMatch.filter(d => d.pedidoEncontrado).length;
    const pedidosNaoEncontrados = total - pedidosEncontrados;
    const pedidoEncontradoSemItem = dadosComMatch.filter(d => d.pedidoEncontrado && !d.encontrado).length;

    return {
      total,
      encontrados,
      naoEncontrados,
      pedidosEncontrados,
      pedidosNaoEncontrados,
      pedidoEncontradoSemItem,
      percentualEncontrados: total > 0 ? (encontrados / total) * 100 : 0,
      percentualNaoEncontrados: total > 0 ? (naoEncontrados / total) * 100 : 0,
      percentualPedidosEncontrados: total > 0 ? (pedidosEncontrados / total) * 100 : 0,
    };
  }, [dadosComMatch]);

  // Aplicar filtro
  const dadosFiltrados = React.useMemo(() => {
    switch (filtroAtivo) {
      case 'identificados':
        return dadosComMatch.filter(d => d.encontrado);
      case 'nao-identificados':
        return dadosComMatch.filter(d => !d.encontrado);
      case 'pedido-nao-encontrado':
        return dadosComMatch.filter(d => !d.pedidoEncontrado);
      default:
        return dadosComMatch;
    }
  }, [dadosComMatch, filtroAtivo]);

  // Calcular paginação sobre dados filtrados
  const totalPaginas = Math.ceil(dadosFiltrados.length / itensPorPagina);
  const indiceInicio = (paginaAtual - 1) * itensPorPagina;
  const indiceFim = indiceInicio + itensPorPagina;
  const dadosPaginados = dadosFiltrados.slice(indiceInicio, indiceFim);

  const irParaPagina = (pagina: number) => {
    setPaginaAtual(Math.max(1, Math.min(pagina, totalPaginas)));
  };

  // Alternar seleção de item
  const toggleSelecao = (indice: number) => {
    const novoSet = new Set(itensSelecionados);
    if (novoSet.has(indice)) {
      novoSet.delete(indice);
    } else {
      novoSet.add(indice);
    }
    setItensSelecionados(novoSet);
  };

  // Selecionar/Desselecionar todos os itens identificados
  const toggleSelecionarTodos = () => {
    if (itensSelecionados.size === estatisticas.encontrados) {
      setItensSelecionados(new Set());
    } else {
      const todosIdentificados = new Set<number>();
      dadosComMatch.forEach((item, index) => {
        if (item.encontrado) {
          todosIdentificados.add(index);
        }
      });
      setItensSelecionados(todosIdentificados);
    }
  };

  // Preparar itens para atualização
  const itensParaAtualizar = React.useMemo((): ItemParaAtualizar[] => {
    const itens: ItemParaAtualizar[] = [];

    itensSelecionados.forEach(indice => {
      const item = dadosComMatch[indice];
      if (item && item.encontrado && item.itensEncontrados.length > 0) {
        // Pegar o item com maior similaridade (primeiro da lista, já ordenado)
        const melhorMatch = item.itensEncontrados[0];
        itens.push({
          codigoPedido: item.codigo,
          itemAtual: melhorMatch.item,
          itemNovo: item.item,
          descricao: item.descricao,
          indiceOriginal: indice,
        });
      }
    });

    return itens;
  }, [itensSelecionados, dadosComMatch]);

  // Função para atualizar no banco de dados
  const atualizarNoFirestore = async () => {
    setAtualizando(true);
    setMostrarModalConfirmacao(false);
    setProgressoAtual(0);
    setProgressoTotal(itensParaAtualizar.length);

    try {
      const db = await getDbClient();
      if (!db) throw new Error('Database not available');

      let sucessos = 0;
      let erros = 0;

      for (let i = 0; i < itensParaAtualizar.length; i++) {
        const itemAtualizar = itensParaAtualizar[i];

        // Atualizar progresso
        setItemAtualProcessando(`${itemAtualizar.descricao.substring(0, 50)}...`);
        setProgressoAtual(i + 1);

        try {
          console.log('🔍 Buscando documentos para atualizar:', {
            codigo: Number(itemAtualizar.codigoPedido),
            itemAtual: itemAtualizar.itemAtual,
            itemAtualTipo: typeof itemAtualizar.itemAtual,
            itemNovo: itemAtualizar.itemNovo,
          });

          // Buscar todos os documentos que correspondem ao código do pedido e ao item atual
          const vendasRef = collection(db, 'vendas');

          // Tentar buscar com item como string
          const q = query(
            vendasRef,
            where('codigo', '==', Number(itemAtualizar.codigoPedido)),
            where('item', '==', String(itemAtualizar.itemAtual))
          );

          let snapshot = await getDocs(q);

          console.log(`📦 Encontrados ${snapshot.size} documento(s) para atualizar com item como string`);

          // Se não encontrou com string, tentar buscar só pelo código e filtrar manualmente
          if (snapshot.empty) {
            console.log('🔄 Tentando busca alternativa apenas pelo código do pedido...');

            // Tentar como número
            let qAlternativa = query(
              vendasRef,
              where('codigo', '==', Number(itemAtualizar.codigoPedido))
            );

            let snapshotAlternativa = await getDocs(qAlternativa);
            console.log(`📦 Tentativa 1 (número): Encontrados ${snapshotAlternativa.size} documento(s) com o código ${itemAtualizar.codigoPedido}`);

            // Se não encontrou como número, tentar como string
            if (snapshotAlternativa.empty) {
              console.log('🔄 Tentando buscar código como string...');
              qAlternativa = query(
                vendasRef,
                where('codigo', '==', String(itemAtualizar.codigoPedido))
              );
              snapshotAlternativa = await getDocs(qAlternativa);
              console.log(`📦 Tentativa 2 (string): Encontrados ${snapshotAlternativa.size} documento(s) com o código "${itemAtualizar.codigoPedido}"`);
            }

            if (!snapshotAlternativa.empty) {
              // Filtrar manualmente pelo item
              const docsComItem = snapshotAlternativa.docs.filter(doc => {
                const data = doc.data();
                const itemDoc = String(data.item || '').trim();
                const itemBusca = String(itemAtualizar.itemAtual).trim();

                console.log(`🔍 Comparando: item no doc="${itemDoc}" vs item buscado="${itemBusca}"`);

                return itemDoc === itemBusca;
              });

              if (docsComItem.length > 0) {
                console.log(`✅ Encontrados ${docsComItem.length} documento(s) após filtragem manual`);
                // Criar um snapshot fake com os docs filtrados
                snapshot = { docs: docsComItem, empty: false, size: docsComItem.length } as any;
              } else {
                console.warn('⚠️ Nenhum documento encontrado mesmo após busca alternativa');
                console.log('📋 Itens encontrados no pedido:', snapshotAlternativa.docs.map(d => d.data().item));
                erros++;
                continue;
              }
            } else {
              console.warn('⚠️ Pedido não encontrado no banco de dados');
              console.log('🔍 Buscando uma amostra de documentos na coleção para análise...');

              // Buscar alguns documentos para ver a estrutura
              const qAmostra = query(vendasRef, limit(5));
              const snapshotAmostra = await getDocs(qAmostra);
              console.log('📋 Amostra de documentos na coleção vendas:');
              snapshotAmostra.docs.forEach((doc, idx) => {
                const data = doc.data();
                console.log(`Documento ${idx + 1}:`, {
                  id: doc.id,
                  codigo: data.codigo,
                  codigoTipo: typeof data.codigo,
                  item: data.item,
                  itemTipo: typeof data.item,
                  descricao: data.descricao,
                });
              });

              erros++;
              continue;
            }
          }

          // Atualizar cada documento encontrado
          let docsAtualizados = 0;
          for (const docSnap of snapshot.docs) {
            const docRef = doc(db, 'vendas', docSnap.id);
            console.log('📝 Atualizando documento:', docSnap.id, {
              dadosAtuais: docSnap.data(),
              novoItem: itemAtualizar.itemNovo,
            });

            await updateDoc(docRef, {
              item: itemAtualizar.itemNovo,
            });
            docsAtualizados++;
          }

          console.log(`✅ ${docsAtualizados} documento(s) atualizado(s) com sucesso`);
          sucessos++;
        } catch (error) {
          console.error(`❌ Erro ao atualizar item ${itemAtualizar.itemAtual}:`, error);
          erros++;
        }
      }

      // Resetar estados
      setProgressoAtual(0);
      setProgressoTotal(0);
      setItemAtualProcessando("");

      // Limpar seleções
      setItensSelecionados(new Set());

      // Mostrar resultado
      console.log('📊 Resumo da atualização:', { sucessos, erros, total: itensParaAtualizar.length });

      if (erros === 0) {
        toast({
          title: "Atualização concluída com sucesso!",
          description: `${sucessos} item(ns) foram atualizados no sistema. Recarregue a página de vendas para ver as alterações.`,
        });
      } else {
        toast({
          title: "Atualização concluída com erros",
          description: `${sucessos} item(ns) atualizados, ${erros} erro(s) encontrado(s). Verifique o console para mais detalhes.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Erro ao atualizar no Firestore:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Ocorreu um erro ao tentar atualizar os dados. Tente novamente.",
        variant: "destructive",
      });

      // Resetar estados em caso de erro
      setProgressoAtual(0);
      setProgressoTotal(0);
      setItemAtualProcessando("");
    } finally {
      setAtualizando(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório Geral</CardTitle>
          <CardDescription>
            Faça upload de uma planilha com as colunas: Código, Item e Descrição
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dados.length === 0 ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-lg text-primary">Solte o arquivo aqui...</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Arraste e solte uma planilha aqui
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    ou clique para selecionar um arquivo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: XLS, XLSX, CSV
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {dados.length} linha{dados.length !== 1 ? "s" : ""} carregada{dados.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={limparDados}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card de Progresso durante Atualização */}
      {atualizando && (
        <Card className="border-blue-400 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Atualizando dados no sistema...
            </CardTitle>
            <CardDescription>
              Processando item {progressoAtual} de {progressoTotal}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={(progressoAtual / progressoTotal) * 100} className="h-3" />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {itemAtualProcessando}
                </span>
                <span className="font-semibold text-blue-700">
                  {Math.round((progressoAtual / progressoTotal) * 100)}%
                </span>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-yellow-800">
                  Por favor, aguarde. Não feche esta página durante a atualização.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {dados.length > 0 && (
        <>
          {/* Card de Estatísticas */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Sumário de Resultados</CardTitle>
              <CardDescription>
                Estatísticas gerais da análise de correspondência
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Total de Linhas</span>
                    <Badge variant="outline">{estatisticas.total}</Badge>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{estatisticas.total}</p>
                </div>

                {/* Pedidos Encontrados */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Pedidos Encontrados</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {estatisticas.percentualPedidosEncontrados.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{estatisticas.pedidosEncontrados}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    de {estatisticas.total} pedidos
                  </p>
                </div>

                {/* Itens Correspondidos */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Itens Identificados</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {estatisticas.percentualEncontrados.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{estatisticas.encontrados}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    produtos com match
                  </p>
                </div>

                {/* Não Identificados */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Não Identificados</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-700">
                      {estatisticas.percentualNaoEncontrados.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{estatisticas.naoEncontrados}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    sem correspondência
                  </p>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Taxa de Sucesso</span>
                  <span>{estatisticas.percentualEncontrados.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-500"
                    style={{ width: `${estatisticas.percentualEncontrados}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Filtros de Visualização</CardTitle>
                  <CardDescription>
                    Filtre os resultados por status de identificação
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filtroAtivo === 'todos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroAtivo('todos')}
                    className="flex items-center gap-2"
                  >
                    Todos
                    <Badge variant="secondary" className="ml-1">
                      {estatisticas.total}
                    </Badge>
                  </Button>
                  <Button
                    variant={filtroAtivo === 'identificados' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroAtivo('identificados')}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Identificados
                    <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700">
                      {estatisticas.encontrados}
                    </Badge>
                  </Button>
                  <Button
                    variant={filtroAtivo === 'nao-identificados' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroAtivo('nao-identificados')}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Não Identificados
                    <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700">
                      {estatisticas.naoEncontrados}
                    </Badge>
                  </Button>
                  <Button
                    variant={filtroAtivo === 'pedido-nao-encontrado' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroAtivo('pedido-nao-encontrado')}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Pedido Não Encontrado
                    <Badge variant="secondary" className="ml-1 bg-orange-100 text-orange-700">
                      {estatisticas.pedidosNaoEncontrados}
                    </Badge>
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Barra de ações */}
          {estatisticas.encontrados > 0 && (
            <Card className="border-blue-300 bg-blue-50">
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={itensSelecionados.size === estatisticas.encontrados && estatisticas.encontrados > 0}
                      onCheckedChange={toggleSelecionarTodos}
                      id="selecionar-todos"
                    />
                    <label htmlFor="selecionar-todos" className="text-sm font-medium cursor-pointer">
                      Selecionar todos os itens identificados ({estatisticas.encontrados})
                    </label>
                  </div>

                  {itensSelecionados.size > 0 && (
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-blue-600 text-white">
                        {itensSelecionados.size} selecionado{itensSelecionados.size !== 1 ? 's' : ''}
                      </Badge>
                      <Button
                        onClick={() => setMostrarModalConfirmacao(true)}
                        disabled={atualizando}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {atualizando ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Atualizando...
                          </>
                        ) : (
                          <>Atualizar no Sistema ({itensSelecionados.size})</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Dados Carregados e Correspondências</CardTitle>
                  <CardDescription>
                    {filtroAtivo === 'todos' && 'Visualização lado a lado: dados da planilha e itens encontrados no sistema'}
                    {filtroAtivo === 'identificados' && 'Exibindo apenas itens identificados com sucesso'}
                    {filtroAtivo === 'nao-identificados' && 'Exibindo apenas itens não identificados para análise'}
                    {filtroAtivo === 'pedido-nao-encontrado' && 'Exibindo apenas pedidos que não foram encontrados no sistema'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {vendasLoading && (
                    <Badge variant="secondary" className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Carregando dados...
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {dadosFiltrados.length} resultado{dadosFiltrados.length !== 1 ? 's' : ''}
                  </Badge>
                  {totalPaginas > 1 && (
                    <Badge variant="outline">
                      Página {paginaAtual} de {totalPaginas}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {dadosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <XCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-sm text-muted-foreground">
                    Não há itens que correspondam ao filtro selecionado.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dadosPaginados.map((row, index) => {
                  // Calcular o índice real no array completo
                  const indiceReal = indiceInicio + index;
                  const itemSelecionado = itensSelecionados.has(indiceReal);

                  return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 relative ${
                    row.encontrado ? (itemSelecionado ? "bg-blue-50 border-blue-400 ring-2 ring-blue-400" : "bg-green-50 border-green-200") : "bg-red-50 border-red-200"
                  }`}
                >
                  {/* Checkbox para seleção */}
                  {row.encontrado && (
                    <div className="absolute top-4 right-4">
                      <Checkbox
                        checked={itemSelecionado}
                        onCheckedChange={() => toggleSelecao(indiceReal)}
                        id={`item-${indiceReal}`}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Dados da Planilha */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-semibold text-sm text-muted-foreground">
                          DADOS DA PLANILHA
                        </h3>
                        {row.encontrado ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Código do Pedido:
                          </span>
                          <p className="font-mono text-sm">{row.codigo}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Item (código com numeração):
                          </span>
                          <p className="font-mono text-sm">{row.item}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Descrição:
                          </span>
                          <p className="text-sm">{row.descricao}</p>
                        </div>
                      </div>
                    </div>

                    {/* Dados do Sistema */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-semibold text-sm text-muted-foreground">
                          ITENS ENCONTRADOS NO SISTEMA
                        </h3>
                        {row.encontrado && (
                          <Badge variant="secondary" className="text-xs">
                            {row.itensEncontrados.length} item{row.itensEncontrados.length !== 1 ? "ns" : ""}
                          </Badge>
                        )}
                      </div>
                      {row.encontrado ? (
                        <div className="space-y-3">
                          {row.itensEncontrados.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white border border-green-200 rounded-md space-y-2"
                            >
                              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                                <Badge variant="default" className="text-xs">
                                  Match #{idx + 1}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  Similaridade: {item.similaridadeNome}%
                                </Badge>
                              </div>

                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  Código do Pedido:
                                </span>
                                <p className="font-mono text-sm">{item.codigo}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  Item no Sistema:
                                </span>
                                <p className="font-mono text-sm">{item.item}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  Descrição no Sistema:
                                </span>
                                <p className="text-sm">{item.descricao || "N/A"}</p>
                              </div>

                              {/* Análise de Código */}
                              <div className="pt-2 border-t bg-blue-50 -mx-3 -mb-2 px-3 py-2 rounded-b-md">
                                <p className="text-xs font-semibold text-blue-900 mb-2">
                                  📊 Análise de Código
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground block">
                                      Dígitos em Comum:
                                    </span>
                                    <p className="font-mono text-sm font-bold text-blue-700">
                                      {item.digitosRepetidos || "Nenhum"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground block">
                                      Numeração Identificada:
                                    </span>
                                    <p className="font-mono text-sm font-bold text-blue-700">
                                      {item.numeracaoIdentificada}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {item.quantidade !== undefined && (
                                <div className="flex gap-4 pt-2 border-t">
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Quantidade:
                                    </span>
                                    <p className="text-sm font-semibold">{item.quantidade}</p>
                                  </div>
                                  {item.valorUnitario !== undefined && (
                                    <div>
                                      <span className="text-xs font-medium text-muted-foreground">
                                        Valor Unit.:
                                      </span>
                                      <p className="text-sm font-semibold">
                                        {item.valorUnitario.toLocaleString("pt-BR", {
                                          style: "currency",
                                          currency: "BRL",
                                        })}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-white border border-red-200 rounded-md text-center">
                          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                          {row.pedidoEncontrado ? (
                            <>
                              <p className="text-sm font-medium text-orange-700">
                                Pedido encontrado, mas nenhum item correspondente
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                O pedido existe no sistema, mas a descrição do produto não corresponde aos itens do pedido
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-red-700">
                                Pedido não encontrado no sistema
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Verifique se o código do pedido está correto
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
                </div>
              )}

            {/* Controles de Paginação */}
            {dadosFiltrados.length > 0 && totalPaginas > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Itens por página:</span>
                  <select
                    value={itensPorPagina}
                    onChange={(e) => {
                      setItensPorPagina(Number(e.target.value));
                      setPaginaAtual(1);
                    }}
                    className="px-3 py-1 border rounded-md text-sm bg-white"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-muted-foreground ml-4">
                    Mostrando {dadosFiltrados.length > 0 ? indiceInicio + 1 : 0} a {Math.min(indiceFim, dadosFiltrados.length)} de {dadosFiltrados.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => irParaPagina(1)}
                    disabled={paginaAtual === 1}
                  >
                    Primeira
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => irParaPagina(paginaAtual - 1)}
                    disabled={paginaAtual === 1}
                  >
                    Anterior
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                      let pageNum;
                      if (totalPaginas <= 5) {
                        pageNum = i + 1;
                      } else if (paginaAtual <= 3) {
                        pageNum = i + 1;
                      } else if (paginaAtual >= totalPaginas - 2) {
                        pageNum = totalPaginas - 4 + i;
                      } else {
                        pageNum = paginaAtual - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={paginaAtual === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => irParaPagina(pageNum)}
                          className="min-w-[40px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => irParaPagina(paginaAtual + 1)}
                    disabled={paginaAtual === totalPaginas}
                  >
                    Próxima
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => irParaPagina(totalPaginas)}
                    disabled={paginaAtual === totalPaginas}
                  >
                    Última
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}

      {/* Modal de Confirmação */}
      <AlertDialog open={mostrarModalConfirmacao} onOpenChange={setMostrarModalConfirmacao}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Atualização no Sistema</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a atualizar <strong>{itensParaAtualizar.length} item(ns)</strong> no banco de dados.
              Esta ação modificará os códigos dos itens nos pedidos correspondentes.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 space-y-3 max-h-96 overflow-y-auto">
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">
              Itens que serão atualizados:
            </h4>
            {itensParaAtualizar.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-3 bg-muted/50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Pedido:</span>
                    <p className="font-mono font-semibold">{item.codigoPedido}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Produto:</span>
                    <p className="text-xs">{item.descricao}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Código Atual:</span>
                    <p className="font-mono text-red-600 font-semibold">{item.itemAtual}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Novo Código:</span>
                    <p className="font-mono text-green-600 font-semibold">{item.itemNovo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 my-4">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Esta operação atualizará permanentemente os dados no banco de dados.
              Certifique-se de que as informações estão corretas antes de prosseguir.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={atualizando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={atualizarNoFirestore}
              disabled={atualizando}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {atualizando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Confirmar Atualização'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
