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
import { UploadCloud, File as FileIcon, CheckCircle, X, PlusCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { VendaDetalhada } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

interface SupportDataDialogProps {
  children: React.ReactNode;
  onDataUpload: (data: any[], fileNames: string[]) => void;
  uploadedFileNames: string[];
}

export function SupportDataDialog({ children, onDataUpload, uploadedFileNames }: SupportDataDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleFileParse = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            throw new Error("Não foi possível ler o arquivo.");
          }
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => {
      const newFiles = acceptedFiles.filter(
        af => ![...prev, ...files].some(f => f.name === af.name)
      );
      return [...prev, ...newFiles];
    });
  }, [files]);

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
    setFiles(prev => prev.filter(f => f.name !== fileName));
  }

  const handleSubmit = async () => {
    if (files.length === 0) return;

    const newFiles = files.filter(f => !uploadedFileNames.includes(f.name));
    if (newFiles.length === 0) {
      toast({
        title: "Arquivos já processados",
        description: "Todos os arquivos selecionados já foram carregados anteriormente.",
      });
      return;
    }

    try {
      const allData: any[] = [];
      const successfullyParsedFiles: string[] = [];

      await Promise.all(
        newFiles.map(async (file) => {
          const parsedData = await handleFileParse(file);
          allData.push(...parsedData);
          successfullyParsedFiles.push(file.name);
        })
      );
      
      onDataUpload(allData, successfullyParsedFiles);
      setIsOpen(false);
      setFiles([]);
      toast({
        title: "Sucesso!",
        description: `${successfullyParsedFiles.length} arquivo(s) foram carregados e os dados adicionados à tabela.`,
      });

    } catch (error) {
       toast({
          title: "Erro ao processar",
          description: "Não foi possível ler os dados de uma das planilhas. Verifique o formato do arquivo.",
          variant: "destructive",
        });
    }
  };
  
  const allFiles = [...uploadedFileNames.map(name => ({name, isUploaded: true})), ...files.map(f => ({name: f.name, isUploaded: false}))];
  const uniqueFiles = allFiles.filter((file, index, self) => index === self.findIndex(f => f.name === file.name));


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) setFiles([]); // Clear selection on close
        setIsOpen(open);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Dados de Apoio</DialogTitle>
          <DialogDescription>
            Selecione uma ou mais planilhas (XLSX, XLS ou CSV) para preencher a tabela de vendas.
          </DialogDescription>
        </DialogHeader>
        <div {...getRootProps({ className: `flex flex-col gap-4 py-4 border-2 border-dashed rounded-md transition-colors min-h-[200px] justify-center ${isDragActive ? "border-primary bg-primary/10" : "border-input"}` })}>
            <input {...getInputProps()} />
            
            {uniqueFiles.length > 0 ? (
                <div className="flex flex-col gap-2 p-4">
                    {uniqueFiles.map(({name, isUploaded}) => (
                        <div key={name} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                            <div className="flex items-center gap-2">
                                {isUploaded ? <CheckCircle className="w-5 h-5 text-green-500" /> : <FileIcon className="w-5 h-5 text-muted-foreground" />}
                                <span className={isUploaded ? 'text-muted-foreground' : 'text-foreground'}>{name}</span>
                            </div>
                            {!isUploaded && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); removeFile(name);}}>
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                     <button
                        onClick={openFileDialog}
                        className="flex items-center justify-center gap-2 p-2 mt-2 text-sm text-primary border border-dashed border-primary/50 rounded-md hover:bg-primary/10 transition-colors"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Adicionar mais arquivos
                      </button>
                </div>
            ) : (
                 <div className="flex flex-col items-center justify-center text-center cursor-pointer" onClick={openFileDialog}>
                    <UploadCloud className="w-12 h-12 text-muted-foreground" />
                     {isDragActive ? (
                      <p className="mt-2 text-primary">Solte os arquivos aqui...</p>
                    ) : (
                      <p className="mt-2 text-center text-muted-foreground">
                        Arraste e solte os arquivos aqui, ou clique para selecionar.
                      </p>
                    )}
                </div>
            )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={files.length === 0}>
            Carregar {files.length > 0 ? `${files.length} Novo(s)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
