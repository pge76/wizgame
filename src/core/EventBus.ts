type Listener<T> = (payload: T) => void;

export class EventBus<EventMap extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof EventMap, Set<Listener<never>>>();

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<never>);
    return () => set!.delete(listener as Listener<never>);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload as never));
  }
}
