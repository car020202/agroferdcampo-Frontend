import { RouterProvider } from 'react-router';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
import { router } from './routes';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BranchProvider>
          <RouterProvider router={router} />
        </BranchProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
