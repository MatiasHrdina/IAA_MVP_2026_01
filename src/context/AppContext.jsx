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

  annotationStrokes: {},
  annotationHighlights: {},
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
        annotationStrokes: {},
        annotationHighlights: {},
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
      const errorWithPage = { ...error, page };
      return {
        ...state,
        errorCorpus: { ...state.errorCorpus, [page]: updatedPageErrors },
        acceptedErrorRegistry: [...state.acceptedErrorRegistry, errorWithPage],
      };
    }

    case 'REJECT_ERROR': {
      const { page: rejPage, error: rejError } = action.payload;
      const updatedRejPageErrors = (state.errorCorpus[rejPage] || []).map((e) =>
        e.id === rejError.id ? { ...e, status: 'rejected' } : e
      );
      const rejErrorWithPage = { ...rejError, page: rejPage };
      return {
        ...state,
        errorCorpus: { ...state.errorCorpus, [rejPage]: updatedRejPageErrors },
        rejectedErrorRegistry: [...state.rejectedErrorRegistry, rejErrorWithPage],
      };
    }

    case 'RECORD_STROKE': {
      const { page, points, timestamp } = action.payload;
      const pageStrokes = state.annotationStrokes[page] || [];
      return {
        ...state,
        annotationStrokes: {
          ...state.annotationStrokes,
          [page]: [...pageStrokes, { points, timestamp, page }],
        },
      };
    }

    case 'REVERT_LAST_STROKE': {
      const { page } = action.payload;
      const currentStrokes = state.annotationStrokes[page] || [];
      if (currentStrokes.length === 0) return state;
      const updatedStrokes = {
        ...state.annotationStrokes,
        [page]: currentStrokes.slice(0, -1),
      };
      return { ...state, annotationStrokes: updatedStrokes };
    }

    case 'CLEAR_ALL_STROKES': {
      return {
        ...state,
        annotationStrokes: {},
      };
    }

    case 'RECORD_HIGHLIGHT': {
      const { page: hlPage, rects } = action.payload;
      const pageHighlights = state.annotationHighlights[hlPage] || [];
      return {
        ...state,
        annotationHighlights: {
          ...state.annotationHighlights,
          [hlPage]: [...pageHighlights, { rects, page: hlPage }],
        },
      };
    }

    case 'REVERT_LAST_HIGHLIGHT': {
      const { page } = action.payload;
      const currentHighlights = state.annotationHighlights[page] || [];
      if (currentHighlights.length === 0) return state;
      const updatedHighlights = {
        ...state.annotationHighlights,
        [page]: currentHighlights.slice(0, -1),
      };
      return { ...state, annotationHighlights: updatedHighlights };
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
        annotationHighlights: nextState.annotationHighlights,
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

  const revertAnnotation = useCallback(
    (page) => dispatch({ type: 'REVERT_LAST_STROKE', payload: { page } }),
    []
  );

  const clearAllStrokes = useCallback(
    () => dispatch({ type: 'CLEAR_ALL_STROKES' }),
    []
  );

  const recordHighlight = useCallback(
    (highlight) => dispatch({ type: 'RECORD_HIGHLIGHT', payload: highlight }),
    []
  );

  const revertHighlight = useCallback(
    (page) => dispatch({ type: 'REVERT_LAST_HIGHLIGHT', payload: { page } }),
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
    revertAnnotation,
    clearAllStrokes,
    recordHighlight,
    revertHighlight,
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
