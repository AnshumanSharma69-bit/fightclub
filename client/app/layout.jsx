import { AuthProvider } from '@/context/AuthContext';
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
      </body>
    </html>
  );
}
