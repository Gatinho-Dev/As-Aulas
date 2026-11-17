import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Layout from './pages/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assignments from './pages/Assignments';
import AssignmentDetail from './pages/AssignmentDetail';
import Trabalhos from './pages/Trabalhos';
import Provas from './pages/Provas';
import Avisos from './pages/Avisos';
import Turmas from './pages/Turmas';
import TurmaDetalhe from './pages/TurmaDetalhe';
import Disciplinas from './pages/Disciplinas';
import Calendario from './pages/Calendario';
import Horario from './pages/Horario';
import Desempenho from './pages/Desempenho';
import Conquistas from './pages/Conquistas';
import Busca from './pages/Busca';
import Admin from './pages/Admin';
import Notificacoes from './pages/Notificacoes';
import Perfil from './pages/Perfil';
import PerfilColega from './pages/PerfilColega';
import Representante from './pages/Representante';
import TutorIA from './pages/TutorIA';
import Onboarding from './pages/Onboarding';
import Configuracoes from './pages/Configuracoes';
import { aplicarTemaSalvo } from './theme';
import './index.css';

aplicarTemaSalvo();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/entrar" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/bem-vindo" element={<Onboarding />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/licoes" element={<Assignments />} />
            <Route path="/licoes/:id" element={<AssignmentDetail />} />
            <Route path="/trabalhos" element={<Trabalhos />} />
            <Route path="/trabalhos/:id" element={<AssignmentDetail />} />
            <Route path="/provas" element={<Provas />} />
            <Route path="/provas/:id" element={<AssignmentDetail />} />
            <Route path="/avisos" element={<Avisos />} />
            <Route path="/turmas" element={<Turmas />} />
            <Route path="/turmas/:id" element={<TurmaDetalhe />} />
            <Route path="/disciplinas" element={<Disciplinas />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/horario" element={<Horario />} />
            <Route path="/desempenho" element={<Desempenho />} />
            <Route path="/conquistas" element={<Conquistas />} />
            <Route path="/busca" element={<Busca />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/notificacoes" element={<Notificacoes />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/perfil/:id" element={<PerfilColega />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/representante" element={<Representante />} />
            <Route path="/tutor" element={<TutorIA />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
