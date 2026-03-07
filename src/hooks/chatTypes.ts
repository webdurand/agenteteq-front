export interface Message {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  timestamp: Date;
}
