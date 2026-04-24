import { create } from 'zustand';
import { Document, Extraction } from '../types';

interface DocumentStore {
  documents: Document[];
  currentDocument: Document | null;
  currentExtraction: Extraction | null;
  loading: boolean;
  uploadProgress: number;
  setDocuments: (docs: Document[]) => void;
  setCurrentDocument: (doc: Document | null) => void;
  setCurrentExtraction: (ext: Extraction | null) => void;
  setLoading: (loading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  currentDocument: null,
  currentExtraction: null,
  loading: false,
  uploadProgress: 0,
  setDocuments: (docs) => set({ documents: docs }),
  setCurrentDocument: (doc) => set({ currentDocument: doc }),
  setCurrentExtraction: (ext) => set({ currentExtraction: ext }),
  setLoading: (loading) => set({ loading }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  addDocument: (doc) => set((state) => ({ documents: [doc, ...state.documents] })),
  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
}));