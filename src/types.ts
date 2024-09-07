export type Subscriber<T> = (newValue: T, oldValue: T) => Promise<void> | void;
export type Updater<T> = (currentValue: T) => T;
export type ObservableState = 'sealed' | 'unsealed' | 'muted';
export type ObservableOptions = {
  debounce?: number;
  throttle?: number;
};

export interface Observable<T = any> {
  value: T;
  subscribe: (subscriber: Subscriber<T>) => () => void;
  set: (value: T) => void;
  get: () => T;
  update: (updater: Updater<T>) => void;
  bind: <Y extends Observable[]>(
    dependencies: [...Y],
    compute: (args: ObservableArrayType<Y>) => T
  ) => () => void;
  state: ObservableState;
  seal: () => void;
  mute: () => void;
  unmute: () => void;
  fork: () => Observable<T>;
}

export type InferObservableType<T extends Observable> = T extends Observable<
  infer U
>
  ? U
  : never;

export type ObservableArrayType<T extends readonly Observable[]> = {
  [K in keyof T]: InferObservableType<T[K]>;
};

export type ObservableDOMElements = HTMLInputElement | HTMLTextAreaElement;

export type ObservableValueOptions = ObservableDOMElements | unknown;
