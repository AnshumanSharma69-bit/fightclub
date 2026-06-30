import { AuthProvider } from '@/context/AuthContext';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata = {
  title: 'FightClub',
  description: 'Find fighters near you',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
