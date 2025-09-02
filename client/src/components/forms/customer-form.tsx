import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { insertCustomerSchema, type Customer, type InsertCustomer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CustomerFormProps {
  customer?: Customer | null;
  onSuccess: () => void;
}

export default function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  const { toast } = useToast();
  
  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: customer?.name || "",
      company: customer?.company || "",
      phone: customer?.phone || "",
      email: customer?.email || "",
      address: customer?.address || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      if (customer) {
        return apiRequest("PUT", `/api/customers/${customer.id}`, data);
      } else {
        return apiRequest("POST", "/api/customers", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Başarılı",
        description: customer ? "Müşteri güncellendi" : "Müşteri eklendi",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Müşteri kaydedilemedi",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCustomer) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Ad Soyad *</Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="Müşteri adı"
          data-testid="input-customer-name"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Şirket</Label>
        <Input
          id="company"
          {...form.register("company")}
          placeholder="Şirket adı"
          data-testid="input-customer-company"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input
          id="phone"
          {...form.register("phone")}
          placeholder="+90 5XX XXX XX XX"
          data-testid="input-customer-phone"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="ornek@email.com"
          data-testid="input-customer-email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adres</Label>
        <Textarea
          id="address"
          {...form.register("address")}
          placeholder="Müşteri adresi"
          rows={3}
          data-testid="input-customer-address"
        />
      </div>

      <div className="flex space-x-2 pt-4">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="flex-1"
          data-testid="button-save-customer"
        >
          {mutation.isPending ? "Kaydediliyor..." : customer ? "Güncelle" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
