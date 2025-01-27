"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(1, "Team name is required"),
});

interface TeamCreationFormProps {
  isPersonal?: boolean;
}

export function TeamCreationForm({
  isPersonal = false,
}: TeamCreationFormProps) {
  const router = useRouter()
  const { toast } = useToast();
  const utils = api.useUtils();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const createTeamMutation = api.team.create.useMutation({
    onSuccess: async() => {
      toast({
        title: "Team created",
        description: "Your team has been created successfully.",
      });
      form.reset();
      if (isPersonal) {
        await utils.team.getPersonalTeam.invalidate();
      } else {
        await utils.team.getOwnedTeams.invalidate();
      }
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createTeamMutation.mutate({
      name: values.name,
      isPersonal,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input
                  placeholder={
                    isPersonal ? "Your Personal Team Name" : "Team Name"
                  }
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
          disabled={createTeamMutation.isPending}
        >
          {createTeamMutation.isPending
            ? "Creating..."
            : `Create ${isPersonal ? "Personal" : ""} Team`}
        </Button>
      </form>
    </Form>
  );
}
