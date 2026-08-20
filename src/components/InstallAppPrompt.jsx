"use client";

import { useEffect, useState } from "react";

const DISMISS_FOR_DAYS = 30;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function detectMobilePlatform() {
  const userAgent = window.navigator.userAgent;
  const isiPadOS = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  const isiOS = /iPhone|iPad|iPod/i.test(userAgent) || isiPadOS;
  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);

  if (isiOS) return isSafari ? "ios-safari" : "ios-other";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}

function InstallStep({ number, children }) {
  return (
    <li className="flex gap-3 text-sm leading-5 text-slate-600">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-xs font-black text-amber-800">{number}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

export default function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState("other");
  const [installPrompt, setInstallPrompt] = useState(null);
  const storageKey = "contextra-monitor-install-dismissed-until";

  useEffect(() => {
    const configureServiceWorker = () => {
      if (!("serviceWorker" in navigator)) return;

      if (process.env.NODE_ENV !== "production") {
        navigator.serviceWorker.getRegistrations()
          .then((registrations) => registrations.forEach((registration) => registration.unregister()))
          .catch(() => undefined);
        return;
      }

      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };

    if (document.readyState === "complete") configureServiceWorker();
    else window.addEventListener("load", configureServiceWorker, { once: true });

    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleInstalled = () => {
      setVisible(false);
      localStorage.removeItem(storageKey);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    const timer = window.setTimeout(() => {
      if (isStandalone()) return;

      const detectedPlatform = detectMobilePlatform();
      if (detectedPlatform === "other") return;

      const dismissedUntil = Number(localStorage.getItem(storageKey) || 0);
      if (dismissedUntil > Date.now()) return;

      setPlatform(detectedPlatform);
      setVisible(true);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", configureServiceWorker);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismiss = () => {
    const dismissedUntil = Date.now() + DISMISS_FOR_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(storageKey, String(dismissedUntil));
    setVisible(false);
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setInstallPrompt(null);
  };

  if (!visible) return null;

  const isiOS = platform.startsWith("ios");

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="install-monitor-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:max-w-md sm:rounded-[2rem] sm:p-6">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><span className="block h-full w-2/3 rounded-full bg-amber-400" /></div>

        <div className="mt-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-lg font-black text-slate-950 shadow-lg shadow-amber-200">CM</div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-amber-700">Optional app experience</p>
          <h2 id="install-monitor-title" className="mt-2 text-2xl font-black leading-tight text-slate-950">
            {isiOS ? "Use Contextra Monitor like an iPhone app" : "Install Contextra Monitor"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Get a full-screen workspace and open the monitor directly from your Home Screen. You can also continue using the mobile website.</p>
        </div>

        <ol className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4">
          {isiOS ? (
            <>
              {platform === "ios-other" && <InstallStep number="1">Open this same address in <strong>Safari</strong>.</InstallStep>}
              <InstallStep number={platform === "ios-other" ? "2" : "1"}>Tap Safari&apos;s <strong>Share</strong> button.</InstallStep>
              <InstallStep number={platform === "ios-other" ? "3" : "2"}>Choose <strong>Add to Home Screen</strong>.</InstallStep>
              <InstallStep number={platform === "ios-other" ? "4" : "3"}>Turn on <strong>Open as Web App</strong>, then tap <strong>Add</strong>.</InstallStep>
            </>
          ) : installPrompt ? (
            <>
              <InstallStep number="1">Tap <strong>Install app</strong> below.</InstallStep>
              <InstallStep number="2">Confirm the browser&apos;s installation message.</InstallStep>
              <InstallStep number="3">Open Contextra Monitor from your Home Screen.</InstallStep>
            </>
          ) : (
            <>
              <InstallStep number="1">Open your browser&apos;s menu.</InstallStep>
              <InstallStep number="2">Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</InstallStep>
              <InstallStep number="3">Confirm, then launch it from your Home Screen.</InstallStep>
            </>
          )}
        </ol>

        {installPrompt && !isiOS && <button type="button" onClick={install} className="mt-5 min-h-12 w-full rounded-2xl bg-amber-400 px-5 text-sm font-black text-slate-950 transition active:scale-[0.98]">Install app</button>}
        <button type="button" onClick={dismiss} className={`${installPrompt && !isiOS ? "mt-3" : "mt-5"} min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition active:scale-[0.98]`}>Not now — continue on web</button>
      </section>
    </div>
  );
}
