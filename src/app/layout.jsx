import "./globals.css";
import MonitorNavigation from "@/components/MonitorNavigation";
import InstallAppPrompt from "@/components/InstallAppPrompt";
import MonitorAuthGate from "@/components/MonitorAuthGate";
import { MonitorAuthProvider } from "@/context/MonitorAuthContext";

export const metadata = {
  title: "Contextra News Monitor",
  description: "Private news monitoring and AI content generation dashboard.",
  applicationName: "Contextra Monitor",
  manifest: "/site.webmanifest",
  icons: {
    apple: "/monitor-apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Contextra Monitor",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <MonitorAuthProvider>
          <MonitorAuthGate>
            <a href="#monitor-content" className="monitor-skip-link">Skip to workspace</a>
            <MonitorNavigation />
            <div id="monitor-content" tabIndex={-1}>{children}</div>
            <InstallAppPrompt />
          </MonitorAuthGate>
        </MonitorAuthProvider>
      </body>
    </html>
  );
}
