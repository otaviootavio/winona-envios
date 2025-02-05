"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Trash2, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "~/hooks/use-toast";

// Define the credential schema
const credentialsSchema = z.object({
  identifier: z
    .string()
    .min(11, "CPF/CNPJ must have at least 11 characters")
    .max(14, "CPF/CNPJ must have at most 14 characters"),
  accessCode: z.string().min(1, "Access code is required"),
  contract: z.string().min(1, "Contract is required"),
});

// Infer the type from the schema
type CredentialsFormData = z.infer<typeof credentialsSchema>;

// Define the component props
interface CredentialsDialogProps {
  /** The ID of the team these credentials belong to */
  teamId: string;
  /** Optional callback for when credentials are changed */
  onCredentialsChange?: () => void;
}

const CredentialsDialog: React.FC<CredentialsDialogProps> = ({
  teamId,
  onCredentialsChange,
}) => {
  const [open, setOpen] = React.useState(false);
  const [showAccessCode, setShowAccessCode] = React.useState(false);
  const utils = api.useContext();

  const { data: teamCredentials } = api.correios.getCredentials.useQuery({
    teamId,
  });

  const form = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      identifier: teamCredentials?.identifier ?? "",
      accessCode: teamCredentials?.accessCode ?? "",
      contract: teamCredentials?.contract ?? "",
    },
  });

  React.useEffect(() => {
    if (teamCredentials) {
      form.reset({
        identifier: teamCredentials.identifier,
        accessCode: teamCredentials.accessCode,
        contract: teamCredentials.contract,
      });
    }
  }, [teamCredentials, form]);

  const saveCredentialsMutation = api.correios.saveTeamCredentials.useMutation({
    onSuccess: async () => {
      await utils.team.getPersonalTeam.invalidate();
      await utils.team.getOwnedTeams.invalidate();
      setOpen(false);
      if (onCredentialsChange) onCredentialsChange();
    },
  });

  const deleteCredentialsMutation = api.correios.deleteCredentials.useMutation({
    onSuccess: async () => {
      await utils.team.getPersonalTeam.invalidate();
      await utils.team.getOwnedTeams.invalidate();
      if (onCredentialsChange) onCredentialsChange();
    },
  });

  const onSubmit = async (data: CredentialsFormData) => {
    try {
      await saveCredentialsMutation.mutateAsync({
        teamId,
        ...data,
      });
      toast({
        title: "Credentials saved",
        description: "Your Correios credentials have been saved.",
      });
    } catch (error) {
      if (error instanceof Error) {
        form.setError("root", {
          type: "custom",
          message: error.message,
        });
      }
    }
  };

  const onDelete = async () => {
    if (!teamCredentials) return;
    await deleteCredentialsMutation.mutateAsync({ teamId });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          <span>{teamCredentials ? "Manage Credentials" : "Configure Credentials"}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {teamCredentials
              ? "Manage Correios Credentials"
              : "Add Correios Credentials"}
          </DialogTitle>
          <DialogDescription>
            Enter your Correios business account details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF/CNPJ</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter your CPF or CNPJ" />
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
                  <FormLabel>Access Code (API Key)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showAccessCode ? "text" : "password"}
                        placeholder="Enter your access code"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowAccessCode(!showAccessCode)}
                      >
                        {showAccessCode ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
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
                  <FormLabel>Contract Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter your contract number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              {teamCredentials && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Remove</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Credentials</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove your Correios
                        credentials? This will prevent order tracking until new
                        credentials are added.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove Credentials
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <div className="ml-auto flex gap-2">
                {form.formState.errors.root && (
                  <div className="text-sm font-medium text-destructive">
                    {form.formState.errors.root.message}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveCredentialsMutation.isPending}
                >
                  {saveCredentialsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <span>Save</span>
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CredentialsDialog;
