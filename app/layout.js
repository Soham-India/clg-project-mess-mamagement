import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'Thali — IIIT Bhubaneswar Mess',
  description: 'Mess management for IIIT Bhubaneswar: menus, weekly coupons, check-in and complaints.',
};

export const viewport = { themeColor: '#1f5c4a', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
