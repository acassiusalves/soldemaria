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
import { UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { VendaDetalhada } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

interface SupportDataDialogProps {
  children: React.ReactNode;
  onDataUpload: (data: any[]) => void;
}

export function SupportDataDialog({ children, onDataUpload }: SupportDataDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleFileParse = (file: File) => {
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
        
        onDataUpload(json);
        setIsOpen(false);
        setFile(null);
        toast({
          title: "Sucesso!",
          description: "Os dados da planilha foram carregados na tabela.",
        });
      } catch (error) {
        console.error("Erro ao processar o arquivo:", error);
        toast({
          title: "Erro ao processar",
          description: "Não foi possível ler os dados da planilha. Verifique o formato do arquivo.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const handleSubmit = () => {
    if (file) {
      handleFileParse(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Importar Dados de Apoio</DialogTitle>
          <DialogDescription>
            Selecione uma planilha (XLSX, XLS ou CSV) para preencher a tabela de vendas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/10" : "border-input hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-12 h-12 text-muted-foreground" />
            {isDragActive ? (
              <p className="mt-2 text-primary">Solte o arquivo aqui...</p>
            ) : file ? (
              <p className="mt-2 text-foreground font-medium">{file.name}</p>
            ) : (
              <p className="mt-2 text-center text-muted-foreground">
                Arraste e solte o arquivo aqui, ou clique para selecionar.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!file}>
            Carregar Dados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    