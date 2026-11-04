"use client";

import { useEffect, useRef } from "react";
import type { AudienceMessage } from "@/lib/deck/sync";
import { channelName, parseMessage, SYNC_VERSION } from "@/lib/deck/sync";

/**
 * BroadcastChannel plumbing for the two-window presenter setup.
 *
 * Both hooks are effects-only: the channel is created inside `useEffect` and
 * closed in its cleanup. React 19 Strict Mode double-invokes effects in
 * development, so creating a channel at module scope (or in render) would leave
 * a duplicate listener behind and every message would be handled twice.
 */

function supportsBroadcastChannel(): boolean {
  return typeof window !== "undefined" && typeof window.BroadcastChannel === "function";
}

/**
 * Audience side: receive messages for this deck. The handler is held in a ref
 * so changing it never tears down and recreates the channel.
 */
export function useAudienceChannel(deckId: string, onMessage: (message: AudienceMessage) => void): void {
  const lastSeqRef = useRef(0);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    if (!deckId || !supportsBroadcastChannel()) return;
    const channel = new BroadcastChannel(channelName(deckId));

    const listener = (event: MessageEvent) => {
      const message = parseMessage(event.data, deckId);
      if (!message) return;
      // Ignore anything older than what we already show (out-of-order delivery).
      const seq = "seq" in message ? message.seq : undefined;
      if (seq !== undefined) {
        if (seq <= lastSeqRef.current) return;
        lastSeqRef.current = seq;
      }
      handler.current(message);
    };

    channel.addEventListener("message", listener);
    // Announce ourselves with the last update we hold (`since`), so the presenter
    // replies with a full state snapshot only when we are behind or fresh.
    channel.postMessage({
      v: SYNC_VERSION,
      deckId,
      type: "hello",
      since: lastSeqRef.current,
    } satisfies AudienceMessage);

    return () => {
      channel.removeEventListener("message", listener);
      channel.close();
    };
  }, [deckId]);
}

/**
 * Presenter side: a stable `post` function plus an optional message handler
 * (used for handshakes). Returns a ref-backed poster so callers can post from
 * event handlers without depending on effect timing.
 */
export function usePresenterChannel(
  deckId: string,
  onMessage?: (message: AudienceMessage) => void
): { post: (message: AudienceMessage) => void } {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    if (!deckId || !supportsBroadcastChannel()) return;
    const channel = new BroadcastChannel(channelName(deckId));
    channelRef.current = channel;

    const listener = (event: MessageEvent) => {
      const message = parseMessage(event.data, deckId);
      if (message) handler.current?.(message);
    };
    channel.addEventListener("message", listener);

    return () => {
      channel.removeEventListener("message", listener);
      channel.close();
      // Guard: a Strict Mode remount may already have installed a new channel.
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [deckId]);

  const post = useRef((message: AudienceMessage) => {
    channelRef.current?.postMessage(message);
  }).current;

  return { post };
}
