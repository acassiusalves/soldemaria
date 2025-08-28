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
import { UploadCloud, File as FileIcon, PlusCircle, Trash2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";

type UploadPayload = {
  rows: any[];
  fileName: string;
};

type FileWithData = {
    file: File;
    data: any[];
}

interface SupportDataDialogProps {
  children: React.ReactNode;
  onProcessData: (payloads: UploadPayload[]) => void;
  uploadedFileNames: string[];
  stagedFileNames: string[];
  onRemoveUploadedFile: (fileName: string) => Promise<void> | void;
}

export function SupportDataDialog({ children, onProcessData, uploadedFileNames, stagedFileNames, onRemoveUploadedFile }: SupportDataDialogProps) {
  const [filesToProcess, setFilesToProcess] = useState<FileWithData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleFileParse = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error("Não foi possível ler o arquivo.");
          
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: "yyyy-mm-dd" });
          
          resolve(json);
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
            const data = await handleFileParse(file);
            setFilesToProcess(prev => [...prev, { file, data }]);
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar Dados de Apoio</DialogTitle>
          <DialogDescription>
            Arraste ou selecione planilhas. O sistema irá assumir que as colunas da sua planilha seguem o modelo padrão.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
            {/* Dropzone Area */}
             <div {...getRootProps({ className: `flex flex-col gap-4 py-4 border-2 border-dashed rounded-md transition-colors min-h-[150px] justify-center items-center cursor-pointer ${isDragActive ? "border-primary bg-primary/10" : "border-input"}` })} onClick={openFileDialog}>
                <input {...getInputProps()} />
                <UploadCloud className="w-12 h-12 text-muted-foreground" />
                {isDragActive ? (
                    <p className="text-primary">Solte os arquivos aqui...</p>
                ) : (
                    <p className="text-center text-muted-foreground">
                    Arraste e solte ou clique para selecionar arquivos.
                    </p>
                )}
            </div>

            {/* Files Area */}
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                 {(filesToProcess.length > 0 || uploadedFileNames.length > 0 || stagedFileNames.length > 0) && (
                    <div className="space-y-2 pt-4">
                        <h4 className="font-semibold text-sm text-muted-foreground">Histórico e Fila de Upload</h4>
                        
                        {/* Staged Files */}
                        {stagedFileNames.map(name => (
                             <div key={name} className="flex items-center justify-between p-2 rounded-md bg-yellow-100/50 text-sm">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileIcon className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                                    <span className="truncate text-yellow-700" title={name}>{name} (Em Revisão)</span>
                                </div>
                             </div>
                        ))}

                        {/* New files to process */}
                        {filesToProcess.map(f => (
                             <div key={f.file.name} className="flex items-center justify-between p-2 rounded-md bg-blue-100/50 text-sm">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                    <span className="truncate text-blue-700" title={f.file.name}>{f.file.name} (Pronto para adicionar)</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => removeFile(f.file.name)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                        ))}
                        
                        {/* Already uploaded files */}
                        {uploadedFileNames.map(name => (
                             <div key={name} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate text-muted-foreground" title={name}>{name} (Salvo no banco)</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => onRemoveUploadedFile(name)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                        ))}
                    </div>
                )}
              </div>
            </ScrollArea>
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
