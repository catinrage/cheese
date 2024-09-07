import { BasicObservable, InputElementObservable } from './observable';
import type {
  ObservableDOMElements,
  ObservableOptions,
  ObservableValueOptions,
} from './types';

function isDOMInputElement(value: unknown): value is ObservableDOMElements {
  // Check if running in a browser environment
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) {
    return false; // Not in a browser environment, return false
  }
  return (
    value instanceof HTMLInputElement || value instanceof HTMLTextAreaElement
  );
}

export default function cheeze(
  input: ObservableDOMElements,
  options?: ObservableOptions
): InputElementObservable;
export default function cheeze<T>(
  input: T,
  options?: ObservableOptions
): BasicObservable<T>;
export default function cheeze<T extends ObservableValueOptions>(
  input: T,
  options?: ObservableOptions
) {
  if (isDOMInputElement(input)) {
    return new InputElementObservable(input);
  } else {
    return new BasicObservable<T>(input, options);
  }
}
