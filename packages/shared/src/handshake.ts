export interface HelloMessage {
  type: "kcode-hello";
  version: string;
  platform: string;
  arch: string;
  pid: number;
}

export interface HelloAckMessage {
  type: "kcode-hello-ack";
  version: string;
  clientId: string;
}
