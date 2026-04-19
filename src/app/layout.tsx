import '@/app.css';
import type { Metadata } from 'next';
import AppHeader from '@/components/AppHeader';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'MyLife App',
  description: 'Process Visualization App',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        <AppHeader />
        <main id="view-container">
          {children}
        </main>

        {/* Toast Notifications */}
        <div id="toastContainer" className="toast-container"></div>
      </body>
    </html>
  );
}
