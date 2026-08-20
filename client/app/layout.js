import { StoreProvider } from '@/lib/store';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { Toasts } from '@/components/Toasts';
import './globals.css';

export const metadata = {
  title: {
    default: 'saso — Premium Online Store',
    template: '%s | saso',
  },
  description:
    'Shop the latest premium products online. Fast delivery, easy returns, secure payments, and great prices.',
  keywords: ['ecommerce', 'shop', 'online store', 'buy online', 'saso', 'mobile shopping'],
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'saso — Premium Online Store',
    description: 'Premium products curated for everyday life.',
    type: 'website',
    siteName: 'saso',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'saso — Premium Online Store',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'saso — Premium Online Store',
    description: 'Premium products curated for everyday life.',
    images: ['/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  themeColor: '#0071e3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <meta name="theme-color" content="#0071e3" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="saso" />
        <meta name="format-detection" content="telephone=yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var t = localStorage.getItem('shopora_theme') || 'light';
                  if (t === 'dark') document.documentElement.classList.add('dark');
                } catch(e){}
              })();
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(){});
                });
              }
            `,
          }}
        />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}',{page_path:window.location.pathname});`,
              }}
            />
          </>
        )}
      </head>
      <body className="min-h-dvh">
        <StoreProvider>
          <div className="flex min-h-dvh flex-col">
            <Navbar />
            <main className="flex-1 pb-0 lg:pb-0">{children}</main>
            <div className="hidden lg:block"><Footer /></div>
          </div>
          <BottomNav />
          <Toasts />
        </StoreProvider>
      </body>
    </html>
  );
}
