export type SenderChannel = "whatsapp_web";

export type SenderState =
  | "idle"
  | "needs_login"
  | "connected"
  | "captcha"
  | "disconnected"
  | "blocked";

export type Sender = {
  id: string;
  createdAt: string;
  updatedAt: string;
  channel: SenderChannel;
  name: string;
  state: SenderState;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  sessionPath?: string | null;
};
