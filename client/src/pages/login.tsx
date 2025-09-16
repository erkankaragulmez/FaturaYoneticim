import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertUserSchema, signInSchema, type InsertUser, type SignInUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Sign Up Form
  const signUpForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      password: ""
    }
  });

  // Sign In Form
  const signInForm = useForm<SignInUser>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const signUpMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Kayıt Başarılı",
        description: `Hoş geldiniz ${data.user.firstName}! Kullanıcı adınız: ${data.user.username}`,
        variant: "default",
      });
      signUpForm.reset();
      setIsSignUp(false);
      
      // Auto sign in after successful registration
      signInForm.setValue("username", data.user.username);
    },
    onError: (error: any) => {
      toast({
        title: "Kayıt Hatası",
        description: error.message || "Kayıt sırasında bir hata oluştu",
        variant: "destructive",
      });
    }
  });

  const signInMutation = useMutation({
    mutationFn: async (data: SignInUser) => {
      const response = await apiRequest("POST", "/api/auth/signin", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Giriş Başarılı",
        description: `Hoş geldiniz ${data.user.firstName}!`,
        variant: "default",
      });
      // Set user data in cache and invalidate to trigger refetch
      queryClient.setQueryData(["/api/auth/user"], data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Redirect to dashboard after successful login
      setLocation("/");
      onLoginSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Giriş Hatası",
        description: error.message || "Kullanıcı adı hatalı",
        variant: "destructive",
      });
    }
  });

  const onSignUp = (data: InsertUser) => {
    signUpMutation.mutate(data);
  };

  const onSignIn = (data: SignInUser) => {
    signInMutation.mutate(data);
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-600">FaturaYoneticim</CardTitle>
          <CardDescription>
            Fatura ve müşteri yönetim sistemi
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={isSignUp ? "signup" : "signin"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="signin" 
                onClick={() => setIsSignUp(false)}
                data-testid="tab-signin"
              >
                Giriş Yap
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                onClick={() => setIsSignUp(true)}
                data-testid="tab-signup"
              >
                Kayıt Ol
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                  <FormField
                    control={signInForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kullanıcı Adı</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="örn: ahmetdem"
                            data-testid="input-username"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signInForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şifre</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Şifrenizi giriniz"
                            data-testid="input-password"
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
                    disabled={signInMutation.isPending}
                    data-testid="button-signin"
                  >
                    {signInMutation.isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={signUpForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>İsim</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ahmet"
                              data-testid="input-firstname"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Soyisim</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Demir"
                              data-testid="input-lastname"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={signUpForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon Numarası</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="05xxxxxxxxx"
                            data-testid="input-phone"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şifre</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Şifrenizi oluşturun"
                            data-testid="input-signup-password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                    <strong>Bilgi:</strong> Kullanıcı adınız otomatik oluşturulacak (İsim + Soyisimin ilk 3 harfi).
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={signUpMutation.isPending}
                    data-testid="button-signup"
                  >
                    {signUpMutation.isPending ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}