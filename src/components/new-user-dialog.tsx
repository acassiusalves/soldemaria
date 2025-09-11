
"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Role } from "@/lib/types";

interface NewUserDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (email: string, role: string) => Promise<void>;
    availableRoles: { key: Role, name: string }[];
}

export function NewUserDialog({ isOpen, onClose, onSave, availableRoles }: NewUserDialogProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<string>("vendedor");
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        if (!email) {
            toast({ variant: "destructive", title: "Email é obrigatório" });
            return;
        }
        setIsSaving(true);
        await onSave(email, role);
        setIsSaving(false);
    };
    
    const handleClose = () => {
        setEmail("");
        setRole("vendedor");
        onClose();
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                    <DialogDescription>
                        Envie um convite para um novo usuário se juntar ao sistema.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="col-span-3"
                            placeholder="email@example.com"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">
                            Função
                        </Label>
                        <div className="col-span-3">
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a função" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableRoles.map((r) => (
                                        <SelectItem key={r.key} value={r.key}>
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 animate-spin" />}
                        Enviar Convite
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

