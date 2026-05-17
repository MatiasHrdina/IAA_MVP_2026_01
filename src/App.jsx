import { AppContextProvider, useAppContext } from './context/AppContext';
import Login from './components/Login/Login';
import Upload from './components/Upload/Upload';
import Workspace from './components/Workspace/Workspace';
import Summary from './components/Summary/Summary';

function ScreenRouter() {
  const { state } = useAppContext();

  switch (state.currentScreen) {
    case 'login':
      return <Login />;
    case 'upload':
      return <Upload />;
    case 'workspace':
      return <Workspace />;
    case 'summary':
      return <Summary />;
    default:
      return <Login />;
  }
}

export default function App() {
  return (
    <AppContextProvider>
      <ScreenRouter />
    </AppContextProvider>
  );
}
