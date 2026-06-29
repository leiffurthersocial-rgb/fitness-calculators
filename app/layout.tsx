import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { SettingsProvider } from "@/lib/settings";
import { ProfileProvider } from "@/lib/profile";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vital — Health & Fitness Hub",
  description:
    "An all-in-one health, fitness, and productivity calculator hub. Strength, cardio, nutrition, recovery, and focus tools in one place.",
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
      <body className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <ThemeProvider>
          <SettingsProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
