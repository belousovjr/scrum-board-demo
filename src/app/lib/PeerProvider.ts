import { DataConnection, Peer } from "peerjs";
import { TaskData } from "./types";

type PeerProviderEvent = "updatedData";

export interface PeerProviderData {
  connections: Map<string, DataConnection>;
  tasks: TaskData[];
  peerId: string;
}

export default class PeerProvider {
  peer: Peer;
  data: PeerProviderData | null = null;
  callbacks: { [key in PeerProviderEvent]?: (() => void)[] } = {};

  constructor(id: string) {
    this.peer = new Peer(id);
    this.peer.on("open", () => {
      this.setData({ peerId: id, tasks: [], connections: new Map() });
    });
  }
  setData(data: PeerProviderData | null) {
    this.data = data;
    this.emit("updatedData");
  }
  destroy() {
    this.peer.disconnect();
    this.peer.destroy();
    this.setData(null);
  }
  on(event: PeerProviderEvent, callback: () => void) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event]!.push(callback);
  }
  emit(event: PeerProviderEvent) {
    if (this.callbacks[event]?.length) {
      for (const callback of this.callbacks[event]) {
        callback();
      }
    }
  }
}
