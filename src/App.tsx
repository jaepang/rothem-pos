import { MainLayout } from './renderer/components/layout/MainLayout';
import { MenuManagement } from './renderer/components/menu/MenuManagement';

function App() {
  return (
    <MainLayout>
      <MenuManagement />
    </MainLayout>
  );
}

export default App;
