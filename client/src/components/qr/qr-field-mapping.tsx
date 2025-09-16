import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { QrCode, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

export interface QrFieldMapping {
  customerId: boolean;
  amount: boolean;
  issueDate: boolean;
  dueDate: boolean;
  description: boolean;
}

interface QrFieldMappingConfigProps {
  mapping: QrFieldMapping;
  onMappingChange: (mapping: QrFieldMapping) => void;
  onStartScan: () => void;
  isScanning?: boolean;
}

export default function QrFieldMappingConfig({ 
  mapping, 
  onMappingChange, 
  onStartScan,
  isScanning = false 
}: QrFieldMappingConfigProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFieldToggle = (field: keyof QrFieldMapping, checked: boolean) => {
    onMappingChange({
      ...mapping,
      [field]: checked
    });
  };

  const fieldLabels = {
    customerId: "Müşteri",
    amount: "Tutar",
    issueDate: "Fatura Tarihi", 
    dueDate: "Vade Tarihi",
    description: "Açıklama"
  };

  const selectedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="flex gap-2">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            data-testid="button-qr-field-mapping"
          >
            <Settings className="h-4 w-4 mr-2" />
            Alan Ayarları ({selectedCount})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>QR Kod Alan Eşleştirme</DialogTitle>
            <DialogDescription>
              QR koddan hangi alanların otomatik doldurulacağını seçin
            </DialogDescription>
          </DialogHeader>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Doldurulacak Alanlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(fieldLabels).map(([field, label]) => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox
                    id={`field-${field}`}
                    checked={mapping[field as keyof QrFieldMapping]}
                    onCheckedChange={(checked) => 
                      handleFieldToggle(field as keyof QrFieldMapping, checked as boolean)
                    }
                    data-testid={`checkbox-field-${field}`}
                  />
                  <Label 
                    htmlFor={`field-${field}`} 
                    className="text-sm font-normal"
                  >
                    {label}
                  </Label>
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 Sadece seçilen alanlar QR koddan doldurulacak. 
                  Diğer alanlar el ile girilmeye devam edecek.
                </p>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
      
      <Button
        onClick={onStartScan}
        disabled={isScanning || selectedCount === 0}
        className="bg-blue-600 hover:bg-blue-700"
        data-testid="button-start-qr-scan"
      >
        {isScanning ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Ekran Taranıyor...
          </>
        ) : (
          <>
            <QrCode className="h-4 w-4 mr-2" />
            QR Ekrandan Tara
          </>
        )}
      </Button>
    </div>
  );
}