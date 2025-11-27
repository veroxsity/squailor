/**
 * Type definitions for Squailor
 */

// Summary Types
type SummaryType = 'short' | 'normal' | 'longer';
type ResponseTone = 'casual' | 'formal' | 'informative' | 'eli5';
type SummaryStyle = 'teaching' | 'notes' | 'mcqs';

// AI Provider Types
type AIProvider = 
  | 'openrouter' 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'cohere' 
  | 'groq' 
  | 'mistral' 
  | 'xai' 
  | 'azure-openai' 
  | 'custom-openai';

interface AIProviderConfig {
  baseURL?: string;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
}

interface SummarizeOptions {
  apiKey: string;
  provider?: AIProvider;
  model?: string;
  responseTone?: ResponseTone;
  summaryStyle?: SummaryStyle;
  onProgress?: ProgressCallback;
  images?: ImageInput[];
  mcqCount?: number;
  baseURL?: string;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
}

interface ProgressEvent {
  type: 'delta' | 'chunk-start' | 'chunk-done' | 'combine-start' | 'done';
  deltaText?: string;
  totalChars?: number;
  chunkIndex?: number;
  totalChunks?: number;
}

type ProgressCallback = (event: ProgressEvent) => void;

interface ImageInput {
  dataUrl: string;
  altText?: string;
  slideNumber?: number;
}

// MCQ Types
interface MCQOption {
  label: string;
  text: string;
}

interface MCQQuestion {
  question: string;
  options: MCQOption[];
  correctLabel: string;
  answerText?: string;
  explanation: string;
}

interface MCQResponse {
  intro: string;
  questions: MCQQuestion[];
}

// Settings Types
interface AppSettings {
  theme?: 'light' | 'dark' | 'system';
  aiProvider?: AIProvider;
  aiModel?: string;
  processImages?: boolean;
  maxImageCount?: number;
  maxCombinedFiles?: number;
  mcqCount?: number;
  autoApplyUpdates?: boolean;
  aiConfig?: Record<string, AIProviderConfig>;
}

// Summary History Types
interface SummaryHistoryItem {
  folderId: string;
  fileName: string;
  summaryType: SummaryType;
  responseTone: ResponseTone;
  summaryStyle: SummaryStyle;
  model: string;
  provider: AIProvider;
  createdAt: string;
  summary?: string;
}

// API Response Types
interface APIResponse<T = unknown> {
  success: boolean;
  error?: string;
  errorType?: 'rate-limit' | 'quota' | 'api-key' | 'error';
  data?: T;
}

interface StorageStats {
  success: boolean;
  fileCount: number;
  totalSize: number;
  totalSizeMB: string;
}

// Adapter Types
interface AIAdapter {
  id: string;
  createClient: (config: { apiKey: string } & AIProviderConfig) => unknown;
  validate: (config: { apiKey: string } & AIProviderConfig) => Promise<{ valid: boolean; error?: string }>;
  chat: (options: ChatOptions) => Promise<string>;
  supportsVision?: (model: string, provider: string) => boolean;
  normalizeError?: (error: unknown) => NormalizedError;
}

interface ChatOptions {
  client: unknown;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onDelta?: (delta: string) => void;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatContentPart[];
}

interface ChatContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface NormalizedError {
  code: 'RATE_LIMIT' | 'QUOTA_EXCEEDED' | 'INVALID_API_KEY' | 'ERROR';
  message: string;
}

// Electron API Types (exposed via preload)
interface ElectronAPI {
  selectFile: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  processDocuments: (...args: unknown[]) => Promise<APIResponse>;
  processDocumentsCombined: (...args: unknown[]) => Promise<APIResponse>;
  saveSummary: (fileName: string, summary: string) => Promise<APIResponse>;
  validateApiKey: (apiKey: string) => Promise<{ valid: boolean; error?: string }>;
  validateApiKeyForProvider: (args: unknown) => Promise<{ valid: boolean; error?: string }>;
  saveApiKey: (apiKey: string) => Promise<APIResponse>;
  loadApiKey: () => Promise<{ success: boolean; apiKey?: string }>;
  deleteApiKey: () => Promise<APIResponse>;
  saveProviderCredentials: (provider: string, apiKey: string, config?: AIProviderConfig) => Promise<APIResponse>;
  loadProviderCredentials: (provider: string) => Promise<{ success: boolean; apiKey?: string; config?: AIProviderConfig }>;
  deleteProviderCredentials: (provider: string) => Promise<APIResponse>;
  readStoredFile: (folderId: string) => Promise<APIResponse>;
  checkFileExists: (folderId: string) => Promise<{ exists: boolean }>;
  deleteStoredFile: (folderId: string) => Promise<APIResponse>;
  getStoragePaths: () => Promise<{ success: boolean; appdataFull: string; localAppFull: string; settings: AppSettings }>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<APIResponse>;
  changeStorageLocation: (location: string) => Promise<APIResponse>;
  getStorageStats: () => Promise<StorageStats>;
  getSummaryHistory: () => Promise<{ success: boolean; history: SummaryHistoryItem[] }>;
  deleteSummaryFromHistory: (folderId: string) => Promise<APIResponse>;
  clearSummaryHistory: () => Promise<APIResponse>;
  onProcessingProgress: (callback: ProgressCallback) => () => void;
  checkForUpdates: () => Promise<void>;
  installUpdate: (restartImmediately?: boolean) => Promise<void>;
  getAppVersion: () => Promise<string>;
  getLatestReleaseInfo: () => Promise<unknown>;
  askSummaryQuestion: (folderId: string, question: string, apiKey: string, model: string) => Promise<{ success: boolean; answer?: string; error?: string }>;
  onQaProgress: (folderId: string, callback: ProgressCallback) => () => void;
  offQaProgress: (folderId: string) => void;
  getProviderModels: (provider: string) => Promise<{ success: boolean; models: string[] }>;
  getNetworkDiagnostics: () => Promise<unknown>;
  clearNetworkDiagnostics: () => Promise<APIResponse>;
  parseMarkdown: (markdown: string) => string | null;
  sanitizeHtml: (html: string) => string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    summaryHistory?: SummaryHistoryItem[];
    currentSummaryIndex?: number;
    navigationModule?: {
      activatePage: (page: string) => void;
    };
  }
}

export {
  SummaryType,
  ResponseTone,
  SummaryStyle,
  AIProvider,
  AIProviderConfig,
  SummarizeOptions,
  ProgressEvent,
  ProgressCallback,
  ImageInput,
  MCQOption,
  MCQQuestion,
  MCQResponse,
  AppSettings,
  SummaryHistoryItem,
  APIResponse,
  StorageStats,
  AIAdapter,
  ChatOptions,
  ChatMessage,
  ChatContentPart,
  NormalizedError,
  ElectronAPI
};
