import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Share, Plus, MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t("install.alreadyInstalled")}</CardTitle>
            <CardDescription>{t("install.alreadyInstalledDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard">
              <Button className="w-full">{t("install.openApp")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t("install.title")}</CardTitle>
          <CardDescription>{t("install.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">{t("install.feature1")}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">{t("install.feature2")}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">{t("install.feature3")}</span>
            </div>
          </div>

          {/* Install Button or Instructions */}
          {deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="h-5 w-5 mr-2" />
              {t("install.installButton")}
            </Button>
          ) : isIOS ? (
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium">{t("install.iosInstructions")}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="bg-background p-1 rounded"><Share className="h-4 w-4" /></span>
                <span>1. {t("install.iosStep1")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="bg-background p-1 rounded"><Plus className="h-4 w-4" /></span>
                <span>2. {t("install.iosStep2")}</span>
              </div>
            </div>
          ) : isAndroid ? (
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium">{t("install.androidInstructions")}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="bg-background p-1 rounded"><MoreVertical className="h-4 w-4" /></span>
                <span>1. {t("install.androidStep1")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="bg-background p-1 rounded"><Download className="h-4 w-4" /></span>
                <span>2. {t("install.androidStep2")}</span>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">{t("install.desktopInstructions")}</p>
            </div>
          )}

          <Link to="/" className="block">
            <Button variant="outline" className="w-full">
              {t("install.continueInBrowser")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
