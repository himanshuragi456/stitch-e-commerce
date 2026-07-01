import './styles/index.css';
import { createRoot } from 'react-dom/client';
import { Providers } from './app/providers';

createRoot(document.getElementById('root')!).render(<Providers />);
