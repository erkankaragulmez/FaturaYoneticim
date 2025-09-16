import { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QrScreenScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onQrDetected: (data: string) => void;
}

export default function QrScreenScanner({ isOpen, onClose, onQrDetected }: QrScreenScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setIsScanning(false);
      setScanStatus("");
    }
  }, [isOpen]);

  const startScreenCapture = async () => {
    let stream: MediaStream | null = null;
    
    try {
      setIsScanning(true);
      setScanStatus("Ekran paylaşımı izni bekleniyor...");

      // Check if browser supports screen capture
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Bu tarayıcı ekran yakalama özelliğini desteklemiyor");
      }

      // Request screen capture permission
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      setScanStatus("Ekran yakalanıyor...");

      // Create video element to capture the screen
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to load
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // Capture frame and scan for QR codes
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error("Canvas element bulunamadı");
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Canvas context oluşturulamadı");
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0);

      setScanStatus("QR kod aranıyor...");

      // Get image data and scan for QR codes
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

      if (qrCode) {
        setScanStatus("QR kod bulundu!");
        onQrDetected(qrCode.data);
        onClose();
        toast({
          title: "Başarılı",
          description: "QR kod başarıyla okundu ve form dolduruldu",
        });
      } else {
        setScanStatus("QR kod bulunamadı");
        toast({
          title: "QR Kod Bulunamadı",
          description: "Ekranda QR kod tespit edilemedi. Lütfen tekrar deneyin.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Screen capture error:", error);
      let errorMessage = "Ekran yakalama sırasında hata oluştu";
      
      if (error.name === "NotAllowedError") {
        errorMessage = "Ekran paylaşımı izni reddedildi";
      } else if (error.name === "NotSupportedError") {
        errorMessage = "Bu tarayıcı ekran yakalama özelliğini desteklemiyor";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setScanStatus(`Hata: ${errorMessage}`);
      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Always stop the screen capture stream in finally block
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsScanning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>QR Kod Ekrandan Tara</DialogTitle>
          <DialogDescription>
            Ekranınızda bulunan QR kodu taramak için "Ekranı Yakala" butonuna tıklayın
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Nasıl Kullanılır:</h4>
            <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>1. QR kodunu ekranınızda görünür hale getirin</li>
              <li>2. "Ekranı Yakala" butonuna tıklayın</li>
              <li>3. Tarayıcı izni verin ve paylaşılacak ekranı seçin</li>
              <li>4. QR kod otomatik olarak tespit edilecek</li>
            </ol>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={startScreenCapture}
              disabled={isScanning}
              className="w-full"
              data-testid="button-capture-screen"
            >
              {isScanning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Taranıyor...
                </>
              ) : (
                <>
                  <Monitor className="h-4 w-4 mr-2" />
                  Ekranı Yakala
                </>
              )}
            </Button>

            {scanStatus && (
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-center">{scanStatus}</p>
              </div>
            )}

            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
              data-testid="button-cancel-scan"
            >
              <X className="h-4 w-4 mr-2" />
              İptal
            </Button>
          </div>

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </DialogContent>
    </Dialog>
  );
}