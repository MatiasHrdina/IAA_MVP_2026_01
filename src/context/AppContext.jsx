import { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const STORAGE_KEY = 'academic-correction-session';

const initialSessionState = {
  isAuthenticated: false,
  currentUser: null,
  currentScreen: 'login',

  documentFile: null,
  documentUrl: null,
  totalPages: 0,
  currentPage: 1,

  errorCorpus: {},
  acceptedErrorRegistry: [],
  rejectedErrorRegistry: [],

  performanceAnalysis: null,
  analysisGeneratedAt: null,

  annotationStrokes: [],
};

function deserializeState(persisted) {
  if (!persisted) return initialSessionState;
  return {
    ...initialSessionState,
    ...persisted,
  };
}

function sessionReducer(state, action) {
  switch (action.type) {
    case 'AUTHENTICATE': {
      return {
        ...state,
        isAuthenticated: true,
        currentUser: action.payload,
        currentScreen: 'upload',
      };
    }

    case 'REGISTER_DOCUMENT': {
      return {
        ...state,
        documentFile: action.payload.file,
        documentUrl: action.payload.url,
        totalPages: action.payload.totalPages,
        currentPage: 1,
        errorCorpus: action.payload.errorCorpus || {},
        acceptedErrorRegistry: [],
        rejectedErrorRegistry: [],
        performanceAnalysis: null,
        currentScreen: 'workspace',
      };
    }

    case 'SET_PAGE': {
      return {
        ...state,
        currentPage: action.payload,
      };
    }

    case 'REGISTER_ERRORS': {
      const page = action.payload.page;
      const errors = action.payload.errors;
      return {
        ...state,
        errorCorpus: {
          ...state.errorCorpus,
          [page]: [...(state.errorCorpus[page] || []), ...errors],
        },
      };
    }

    case 'ACCEPT_ERROR': {
      const { page, error } = action.payload;
      const updatedPageErrors = (state.errorCorpus[page] || []).map((e) =>
        e.id === error.id ? { ...e, status: 'accepted' } : e
      );
      return {
        ...state,
        errorCorpus: { ...state.errorCorpus, [page]: updatedPageErrors },
        acceptedErrorRegistry: [...state.acceptedErrorRegistry, error],
      };
    }

    case 'REJECT_ERROR': {
      const { page: rejPage, error: rejError } = action.payload;
      const updatedRejPageErrors = (state.errorCorpus[rejPage] || []).map((e) =>
        e.id === rejError.id ? { ...e, status: 'rejected' } : e
      );
      return {
        ...state,
        errorCorpus: { ...state.errorCorpus, [rejPage]: updatedRejPageErrors },
        rejectedErrorRegistry: [...state.rejectedErrorRegistry, rejError],
      };
    }

    case 'RECORD_STROKE': {
      return {
        ...state,
        annotationStrokes: [...state.annotationStrokes, action.payload],
      };
    }

    case 'CLEAR_STROKES': {
      return {
        ...state,
        annotationStrokes: [],
      };
    }

    case 'GENERATE_ANALYSIS': {
      return {
        ...state,
        performanceAnalysis: action.payload.analysis,
        analysisGeneratedAt: action.payload.generatedAt,
        currentScreen: 'summary',
      };
    }

    case 'NAVIGATE': {
      return {
        ...state,
        currentScreen: action.payload,
      };
    }

    case 'LOGOUT': {
      return { ...initialSessionState };
    }

    default:
      return state;
  }
}

function sessionPersistenceMiddleware(reducer) {
  return function (state, action) {
    const nextState = reducer(state, action);
    try {
      const serialized = JSON.stringify({
        isAuthenticated: nextState.isAuthenticated,
        currentUser: nextState.currentUser,
        currentScreen: nextState.currentScreen,
        documentFile: nextState.documentFile,
        documentUrl: nextState.documentUrl,
        totalPages: nextState.totalPages,
        currentPage: nextState.currentPage,
        errorCorpus: nextState.errorCorpus,
        acceptedErrorRegistry: nextState.acceptedErrorRegistry,
        rejectedErrorRegistry: nextState.rejectedErrorRegistry,
        performanceAnalysis: nextState.performanceAnalysis,
        analysisGeneratedAt: nextState.analysisGeneratedAt,
        annotationStrokes: nextState.annotationStrokes,
      });
      sessionStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      /* storage unavailable — non-critical */
    }
    return nextState;
  };
}

export function AppContextProvider({ children }) {
  let initialState;
  try {
    const persisted = sessionStorage.getItem(STORAGE_KEY);
    initialState = deserializeState(persisted ? JSON.parse(persisted) : null);
  } catch {
    initialState = { ...initialSessionState };
  }

  const [state, dispatch] = useReducer(
    sessionPersistenceMiddleware(sessionReducer),
    initialState
  );

  const authenticate = useCallback(
    (user) => dispatch({ type: 'AUTHENTICATE', payload: user }),
    []
  );

  const registerDocument = useCallback(
    (payload) => dispatch({ type: 'REGISTER_DOCUMENT', payload }),
    []
  );

  const setCurrentPage = useCallback(
    (page) => dispatch({ type: 'SET_PAGE', payload: page }),
    []
  );

  const registerErrors = useCallback(
    (payload) => dispatch({ type: 'REGISTER_ERRORS', payload }),
    []
  );

  const acceptError = useCallback(
    (page, error) => dispatch({ type: 'ACCEPT_ERROR', payload: { page, error } }),
    []
  );

  const rejectError = useCallback(
    (page, error) => dispatch({ type: 'REJECT_ERROR', payload: { page, error } }),
    []
  );

  const recordStroke = useCallback(
    (stroke) => dispatch({ type: 'RECORD_STROKE', payload: stroke }),
    []
  );

  const clearStrokes = useCallback(
    () => dispatch({ type: 'CLEAR_STROKES' }),
    []
  );

  const generateAnalysis = useCallback(
    (payload) => dispatch({ type: 'GENERATE_ANALYSIS', payload }),
    []
  );

  const navigate = useCallback(
    (screen) => dispatch({ type: 'NAVIGATE', payload: screen }),
    []
  );

  const logoutAction = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const value = {
    state,
    authenticate,
    registerDocument,
    setCurrentPage,
    registerErrors,
    acceptError,
    rejectError,
    recordStroke,
    clearStrokes,
    generateAnalysis,
    navigate,
    logoutAction,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return ctx;
}

export default AppContext;
