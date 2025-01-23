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

// Define the type for existing credentials
type CorreiosCredential = {
  id: string;
  identifier: string;
  accessCode: string;
  contract: string;
  teamId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

// Define the component props
interface CredentialsDialogProps {
  /** The ID of the team these credentials belong to */
  teamId: string;
  /** Existing credentials if any */
  existingCredentials: CorreiosCredential | null;
  /** Optional callback for when credentials are changed */
  onCredentialsChange?: () => void;
}

const CredentialsDialog: React.FC<CredentialsDialogProps> = ({
  teamId,
  existingCredentials,
  onCredentialsChange,
}) => {
  const [open, setOpen] = React.useState(false);
  const utils = api.useContext();

  const form = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      identifier: existingCredentials?.identifier ?? "",
      accessCode: existingCredentials?.accessCode ?? "",
      contract: existingCredentials?.contract ?? "",
    },
  });

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
    await saveCredentialsMutation.mutateAsync({
      teamId,
      ...data,
    });
  };

  const onDelete = async () => {
    if (!existingCredentials) return;
    await deleteCredentialsMutation.mutateAsync({ teamId });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={existingCredentials ? "outline" : "default"}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          {existingCredentials ? "Manage Credentials" : "Configure Credentials"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {existingCredentials
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
                  <FormLabel>Access Code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Enter your access code"
                    />
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
              {existingCredentials && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
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
                  Save
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
