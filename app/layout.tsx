import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { SettingsProvider } from "@/lib/settings";
import { ProfileProvider } from "@/lib/profile";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://vital-fitness.vercel.app"
  ),
  title: {
    default: "Vital — Hypertrophy & Fitness Tools",
    template: "%s",
  },
  description:
    "Science-based hypertrophy tools — a routine planner with ratings, weekly net stimulus and stimulating reps — plus strength, nutrition, cardio and recovery calculators, all in your browser.",
  applicationName: "Vital",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e4e7ec" },
    { media: "(prefers-color-scheme: dark)", color: "#23262b" },
  ],
};

// Applied before paint so dark mode (the default) never flashes light.
const noFlashScript = `
(function () {
  try {
    var t = localStorage.getItem('vital.theme');
    if (t === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <SettingsProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </SettingsProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
