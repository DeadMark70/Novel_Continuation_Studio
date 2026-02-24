import type { Metadata } from "next";
import "./globals.css";
import { NovelPersistenceLifecycleBridge } from "@/components/NovelPersistenceLifecycleBridge";
import { SettingsLifecycleBridge } from "@/components/SettingsLifecycleBridge";
import { SensoryVaultSidebar } from "@/components/sensory/SensoryVaultSidebar";
import { HarvestTaskIndicator } from "@/components/sensory/HarvestTaskIndicator";
import { HarvestErrorRecoveryModal } from "@/components/sensory/HarvestErrorRecoveryModal";

export const metadata: Metadata = {
  title: {
    default: "Novel Continuation Studio",
    template: "%s | NCS",
  },
  description: "Automated novel continuation with NVIDIA NIM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="dark">
      <body className="antialiased bg-background text-foreground">
        <NovelPersistenceLifecycleBridge />
        <SettingsLifecycleBridge />
        <SensoryVaultSidebar />
        <HarvestTaskIndicator />
        <HarvestErrorRecoveryModal />
        {children}
      </body>
    </html>
  );
}
