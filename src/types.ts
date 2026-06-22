export interface ChatMessage {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  timestamp: Date;
  explanation?: string;
  changedCode?: string;
}

export interface Version {
  id: string;
  timestamp: Date;
  title: string;
  code: string;
  note: string;
  language: string;
}

export interface PresetFile {
  name: string;
  description: string;
  language: string;
  code: string;
}
