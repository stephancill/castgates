import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { SessionProvider } from "./providers/next-auth";
import { Session } from "next-auth";
import { headers } from "next/headers";

async function getSession(cookie: string): Promise<Session> {
  const response = await fetch("http://localhost:3000/api/auth/session", {
    headers: {
      cookie,
    },
  });

  const session = await response.json();

  return Object.keys(session).length > 0 ? session : null;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession(headers().get("cookie") ?? "");
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
