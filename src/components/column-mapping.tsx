
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { X, Trash2, ArrowRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

export type ColumnMapping = {
  originalHeader: string;
  systemHeader: string;
  isActive: boolean;
};

interface ColumnMappingProps {
  fileName: string;
  mappings: ColumnMapping[];
  associationKey: string;
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onAssociationKeyChange: (key: string) => void;
  onRemoveFile: () => void;
}

export default function ColumnMapping({
  fileName,
  mappings,
  associationKey,
  onMappingsChange,
  onAssociationKeyChange,
  onRemoveFile
}: ColumnMappingProps) {
  
  const handleSystemHeaderChange = (originalHeader: string, newSystemHeader: string) => {
    const newMappings = mappings.map(m =>
      m.originalHeader === originalHeader ? { ...m, systemHeader: newSystemHeader } : m
    );
    onMappingsChange(newMappings);
  };

  const toggleColumnActive = (originalHeader: string) => {
    const newMappings = mappings.map(m =>
      m.originalHeader === originalHeader ? { ...m, isActive: !m.isActive } : m
    );
    onMappingsChange(newMappings);
  };

  return (
    <Card className="bg-muted/30">
        <Accordion type="single" collapsible defaultValue='item-1'>
            <AccordionItem value="item-1" className="border-b-0">
                <AccordionTrigger className="p-4">
                     <div className='flex items-center gap-4'>
                        <h3 className="font-semibold">{fileName}</h3>
                        <span className="text-xs text-muted-foreground">({mappings.length} colunas detectadas)</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                    <div className="grid grid-cols-[1fr,auto,1fr,auto] items-center gap-x-4 gap-y-2 text-sm">
                        {/* Headers */}
                        <div className="font-semibold text-muted-foreground">Coluna do Arquivo</div>
                        <div></div>
                        <div className="font-semibold text-muted-foreground">Nome no Sistema</div>
                        <div className="font-semibold text-muted-foreground">Chave de Associação</div>

                        {/* Mappings */}
                        {mappings.map(({ originalHeader, systemHeader, isActive }) => (
                        <React.Fragment key={originalHeader}>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => toggleColumnActive(originalHeader)}
                                    aria-label={isActive ? 'Desativar coluna' : 'Ativar coluna'}
                                >
                                    <X className={`h-4 w-4 transition-colors ${isActive ? 'text-destructive' : 'text-muted-foreground'}`} />
                                </Button>
                                <Label htmlFor={`input-${originalHeader}`} className={`truncate ${!isActive && 'text-muted-foreground line-through'}`}>
                                    {originalHeader}
                                </Label>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground"/>
                            <Input
                                id={`input-${originalHeader}`}
                                value={systemHeader}
                                onChange={(e) => handleSystemHeaderChange(originalHeader, e.target.value)}
                                disabled={!isActive}
                                className="h-8"
                            />
                            <RadioGroup
                                value={associationKey}
                                onValueChange={onAssociationKeyChange}
                                disabled={!isActive}
                                className="flex justify-center"
                            >
                                <RadioGroupItem value={originalHeader} id={`radio-${originalHeader}`} />
                            </RadioGroup>
                        </React.Fragment>
                        ))}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </Card>
  );
}
