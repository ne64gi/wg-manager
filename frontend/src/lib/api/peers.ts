import type {
  Peer,
  PeerCreateInput,
  PeerUpdateInput,
  RevealedPeerArtifacts,
} from "../../types";
import { request } from "./client";

export function listPeers(accessToken: string): Promise<Peer[]> {
  return request<Peer[]>("/peers", { accessToken });
}

export function createPeer(accessToken: string, payload: PeerCreateInput): Promise<Peer> {
  return request<Peer>("/peers", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function updatePeer(
  accessToken: string,
  peerId: number,
  payload: PeerUpdateInput,
): Promise<Peer> {
  return request<Peer>(`/peers/${peerId}`, {
    method: "PATCH",
    accessToken,
    body: payload,
  });
}

export function deletePeer(peerId: number, accessToken: string): Promise<void> {
  return request<void>(`/peers/${peerId}`, { method: "DELETE", accessToken });
}

export function revokePeer(peerId: number, accessToken: string): Promise<Peer> {
  return request<Peer>(`/peers/${peerId}/revoke`, { method: "POST", accessToken });
}

export function reissuePeer(peerId: number, accessToken: string): Promise<Peer> {
  return request<Peer>(`/peers/${peerId}/reissue`, {
    method: "POST",
    accessToken,
  });
}

export function revealPeerArtifacts(
  peerId: number,
  accessToken: string,
): Promise<RevealedPeerArtifacts> {
  return request<RevealedPeerArtifacts>(`/config/peers/${peerId}/reveal`, {
    method: "POST",
    accessToken,
  });
}
