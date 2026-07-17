export type Message = {
  id?: string;
  message: string;
  answer: string;
  streaming: boolean;
  chatAt: string;
  started: boolean;
};

export type ActiveChatRequest = {
  requestKey: number;
  sessionId: string;
  question: string;
  baselineIds: Set<string>;
};

export type ChatSocketPayload = {
  model: string;
  question: string;
  sessionId: string;
};
