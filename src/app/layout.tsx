import "./globals.css";

export const metadata = {
  title: "Learn League",
  description: "Study together. Learn smarter.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
