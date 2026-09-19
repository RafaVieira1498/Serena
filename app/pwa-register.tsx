"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  if (!installPrompt) return null;
  return <button className="install-app" onClick={async () => { await installPrompt.prompt(); const result = await installPrompt.userChoice; if (result.outcome === "accepted") setInstallPrompt(null); }}>Instalar aplicativo</button>;
}
