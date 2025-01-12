"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  identifier: z
    .string()
    .min(11, "CPF/CNPJ deve ter no mínimo 11 caracteres")
    .max(14, "CPF/CNPJ deve ter no máximo 14 caracteres")
    .refine(
      (value) => {
        // Remove non-digit characters
        const digits = value.replace(/\D/g, "");
        // Check if it's a CPF (11 digits) or CNPJ (14 digits)
        return digits.length === 11 || digits.length === 14;
      },
      { message: "Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido" },
    ),
  accessCode: z
    .string()
    .min(8, "Código de acesso deve ter no mínimo 8 caracteres")
    .max(50, "Código de acesso deve ter no máximo 50 caracteres")
    .regex(
      /^[A-Za-z0-9@#$%^&+=!]*$/,
      "Código de acesso deve conter apenas letras, números e caracteres especiais (@#$%^&+=!)",
    ),
  contract: z
    .string()
    .min(1, "Contrato é obrigatório")
    .regex(/^\d+$/, "Contrato deve conter apenas números"),
});

export function CorreiosSecretForm() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      accessCode: "",
      contract: "",
    },
  });

  const { data: existingCredentials, isLoading } =
    api.correios.getCredentials.useQuery();

  const saveCredentials = api.correios.saveCredentials.useMutation({
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Credenciais salvas com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar credenciais",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (existingCredentials) {
      form.reset({
        identifier: existingCredentials.identifier,
        accessCode: existingCredentials.accessCode,
        contract: existingCredentials.contract,
      });
    }
  }, [existingCredentials, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    saveCredentials.mutate(values);
  }

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">
          Gerenciar Credenciais Correios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário (CNPJ/CPF)</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite seu CNPJ ou CPF" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accessCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de acesso a(s) API(s)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite seu código de acesso (mínimo 8 caracteres)"
                        {...field}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showPassword ? "Ocultar senha" : "Mostrar senha"}
                        </span>
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contract"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contrato</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o número do contrato"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={saveCredentials.isPending}
            >
              {saveCredentials.isPending ? "Salvando..." : "Salvar Credenciais"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
