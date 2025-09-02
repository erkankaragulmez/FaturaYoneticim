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
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-foreground">
          Müşteri İsmi <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="Müşteri adı girin"
          className="h-12 text-base bg-gray-50 border-gray-200 placeholder:text-gray-400"
          data-testid="input-customer-name"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="ornek@email.com"
          className="h-12 text-base bg-gray-50 border-gray-200 placeholder:text-gray-400"
          data-testid="input-customer-email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium text-foreground">
          Telefon
        </Label>
        <Input
          id="phone"
          {...form.register("phone")}
          placeholder="+90 555 123 45 67"
          className="h-12 text-base bg-gray-50 border-gray-200 placeholder:text-gray-400"
          data-testid="input-customer-phone"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address" className="text-sm font-medium text-foreground">
          Adres
        </Label>
        <Textarea
          id="address"
          {...form.register("address")}
          placeholder="Müşteri adresi"
          rows={3}
          className="text-base bg-gray-50 border-gray-200 placeholder:text-gray-400 resize-none"
          data-testid="input-customer-address"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="company" className="text-sm font-medium text-foreground">
          Şirket
        </Label>
        <Input
          id="company"
          {...form.register("company")}
          placeholder="Şirket adı"
          className="h-12 text-base bg-gray-50 border-gray-200 placeholder:text-gray-400"
          data-testid="input-customer-company"
        />
      </div>

      <div className="pt-4">
        <Button
          type="button"
          variant="ghost"
          className="w-full h-12 text-base text-gray-500 bg-transparent border-0 mb-4"
        >
          İptal
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white rounded-lg font-medium"
          data-testid="button-save-customer"
        >
          <i className="fas fa-user mr-2"></i>
          {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
