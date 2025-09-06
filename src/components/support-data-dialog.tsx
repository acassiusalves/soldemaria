
"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, File as FileIcon, PlusCircle, Trash2, Columns, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";

type UploadPayload = {
  rows: any[];
  fileName: string;
};

type FileWithDataAndColumns = {
    file: File;
    data: any[];
    columns: string[];
}

interface SupportDataDialogProps {
  children: React.ReactNode;
  onProcessData: (payloads: UploadPayload[]) => void;
  uploadedFileNames: string[];
  stagedFileNames: string[];
  onRemoveUploadedFile: (fileName: string) => Promise<void> | void;
}

export function SupportDataDialog({ children, onProcessData, uploadedFileNames, stagedFileNames, onRemoveUploadedFile }: SupportDataDialogProps) {
  const [filesToProcess, setFilesToProcess] = useState<FileWithDataAndColumns[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleFileParse = (file: File): Promise<{ data: any[], columns: string[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error("Não foi possível ler o arquivo.");
          
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          // Use header: 1 to get an array of arrays, so we can reliably get headers
          const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
          
          if (sheetData.length === 0) {
            resolve({ data: [], columns: [] });
            return;
          }

          const headers: string[] = sheetData[0].map(h => String(h).trim()).filter(h => h);
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: "yyyy-mm-dd" });

          resolve({ data: jsonData, columns: headers });
        } catch (error) {
          console.error("Erro ao processar o arquivo:", error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for(const file of acceptedFiles) {
        if (filesToProcess.some(f => f.file.name === file.name) || uploadedFileNames.includes(file.name) || stagedFileNames.includes(file.name)) {
            toast({ title: "Arquivo duplicado", description: `O arquivo ${file.name} já foi carregado.`, variant: "default" });
            continue;
        }

        try {
            const { data, columns } = await handleFileParse(file);
            setFilesToProcess(prev => [...prev, { file, data, columns }]);
        } catch(e) {
            toast({ title: "Erro ao ler arquivo", description: `Não foi possível processar ${file.name}.`, variant: "destructive" });
        }
    }
  }, [filesToProcess, uploadedFileNames, stagedFileNames, toast]);

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
    },
    noClick: true,
    noKeyboard: true,
  });
  
  const removeFile = (fileName: string) => {
    setFilesToProcess(prev => prev.filter(f => f.file.name !== fileName));
  }
  
  const handleRemoveColumn = (fileName: string, columnToRemove: string) => {
      setFilesToProcess(prevFiles => prevFiles.map(f => {
          if (f.file.name === fileName) {
              // Remove a coluna da lista de colunas
              const newColumns = f.columns.filter(c => c !== columnToRemove);
              // Remove a coluna dos dados
              const newData = f.data.map(row => {
                  const newRow = { ...row };
                  delete newRow[columnToRemove];
                  return newRow;
              });
              return { ...f, columns: newColumns, data: newData };
          }
          return f;
      }));
  }

  const handleProcessAllFiles = () => {
    if (filesToProcess.length === 0) {
        toast({
            title: "Nenhum arquivo novo",
            description: "Selecione novos arquivos para carregar.",
            variant: "default",
        });
        return;
    }

    const payloads: UploadPayload[] = filesToProcess.map(f => ({
      rows: f.data,
      fileName: f.file.name,
    }));
    
    onProcessData(payloads);
    
    setIsOpen(false);
    setFilesToProcess([]);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) setFilesToProcess([]); 
        setIsOpen(open);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Dados de Apoio</DialogTitle>
          <DialogDescription>
            Arraste ou selecione planilhas. Você poderá visualizar e remover colunas antes de adicioná-las para revisão.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
            {/* Left side */}
            <div className="flex flex-col gap-4">
                 <div {...getRootProps({ className: `flex flex-col gap-4 py-4 border-2 border-dashed rounded-md transition-colors min-h-[150px] justify-center items-center cursor-pointer ${isDragActive ? "border-primary bg-primary/10" : "border-input"}` })} onClick={openFileDialog}>
                    <input {...getInputProps()} />
                    <UploadCloud className="w-12 h-12 text-muted-foreground" />
                    {isDragActive ? (
                        <p className="text-primary">Solte os arquivos aqui...</p>
                    ) : (
                        <p className="text-center text-muted-foreground">
                        Arraste ou selecione arquivos
                        </p>
                    )}
                </div>

                {(uploadedFileNames.length > 0 || stagedFileNames.length > 0) && (
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground">Histórico de Arquivos</h4>
                        <ScrollArea className="h-40 pr-3">
                             <div className="space-y-2">
                                {stagedFileNames.map(name => (
                                    <div key={name} className="flex items-center justify-between p-2 rounded-md bg-yellow-100/50 text-sm">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileIcon className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                                            <span className="truncate text-yellow-700" title={name}>{name} (Em Revisão)</span>
                                        </div>
                                    </div>
                                ))}
                                {uploadedFileNames.map(name => (
                                    <div key={name} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                                        <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                            <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                            <span className="truncate text-muted-foreground" title={name}>{name} (Salvo)</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => onRemoveUploadedFile(name)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>

            {/* Right side */}
            <div className="flex flex-col gap-2">
                 <h4 className="font-semibold text-sm text-muted-foreground">Arquivos e Colunas para Upload</h4>
                 <ScrollArea className="h-[350px] border rounded-lg p-2">
                    {filesToProcess.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <Columns className="w-10 h-10 mb-2"/>
                            <p>As colunas dos arquivos que você carregar aparecerão aqui para sua revisão.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filesToProcess.map(f => (
                                <div key={f.file.name} className="p-3 rounded-md bg-muted/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                            <p className="font-medium text-sm truncate text-blue-700">{f.file.name}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => removeFile(f.file.name)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {f.columns.map(col => (
                                            <Badge key={col} variant="secondary" className="flex items-center gap-1.5 pr-1">
                                                <span>{col}</span>
                                                <button onClick={() => handleRemoveColumn(f.file.name, col)} className="rounded-full hover:bg-destructive/20 p-0.5">
                                                  <X className="h-3 w-3 text-destructive" />
                                                </button>
                                            </Badge>
                                        ))}
                                        {f.columns.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma coluna encontrada neste arquivo.</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleProcessAllFiles} disabled={filesToProcess.length === 0}>
             <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar {filesToProcess.length > 0 ? `${filesToProcess.length} Arquivo(s) à Revisão` : 'à Revisão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
