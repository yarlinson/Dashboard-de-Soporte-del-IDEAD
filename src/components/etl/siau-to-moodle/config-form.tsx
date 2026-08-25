"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MoodleConfigSchema, type MoodleConfig } from "@/lib/etl/siau-to-moodle/schema";

interface ConfigFormProps {
  defaultValues?: Partial<MoodleConfig>;
  onSubmit: (config: MoodleConfig) => void;
}

export function ConfigForm({ defaultValues, onSubmit }: ConfigFormProps) {
  const form = useForm<MoodleConfig>({
    resolver: zodResolver(MoodleConfigSchema),
    defaultValues: {
      genericPassword: defaultValues?.genericPassword ?? "",
      periodSuffix: defaultValues?.periodSuffix ?? "/2026B",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FormField
          control={form.control}
          name="genericPassword"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Contraseña genérica</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Unillanos2026*" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="periodSuffix"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Sufijo de período</FormLabel>
              <FormControl>
                <Input placeholder="Ej. /2026B" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Transformar</Button>
      </form>
    </Form>
  );
}
