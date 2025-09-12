import type { Metadata } from "next";
import { Inter, Red_Hat_Mono } from "next/font/google";
import "./globals.css";
import BoardContextProvider from "./providers/BoardContextProvider";
import ReduxProvider from "./providers/ReduxProvider";
import ServiceContextProvider from "./providers/ServiceContextProvider";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const redhatMono = Red_Hat_Mono({
  variable: "--font-redhat-mono",
  subsets: ["latin"],
});
const APP_NAME = "Scrum Board Demo";
const APP_DEFAULT_TITLE = "Scrum Board RTC Manager";
const APP_TITLE_TEMPLATE = "%s - Scrum Board";
const APP_DESCRIPTION = "Scrum Board RTC Manager";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${interSans.variable} ${redhatMono.variable} antialiased`}
      >
        <ReduxProvider>
          <ServiceContextProvider>
            <BoardContextProvider>{children}</BoardContextProvider>
          </ServiceContextProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
