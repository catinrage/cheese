import type {
  Observable,
  ObservableArrayType,
  ObservableOptions,
  ObservableState,
  Subscriber,
  Updater,
} from './types';

export class BasicObservable<T> implements Observable<T> {
  protected _state: ObservableState = 'unsealed';
  protected _subscribers: Subscriber<T>[] = [];
  protected _value: T;
  protected _options: ObservableOptions = {};
  protected _history: T[] = [];

  private _debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private _throttleTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Throw an error trying to mutate a sealed observable
   */
  protected _throwSealedMutationError() {
    throw new Error(
      'Cannot set value or change the state of a sealed observable'
    );
  }

  /**
   * Check if the observable is sealed, and throw an error if it is
   */
  protected _checkForSealedMutationError() {
    if (this._state === 'sealed') {
      this._throwSealedMutationError();
    }
  }

  /**
   * Notify subscribers of a new value
   */
  protected async _notify(newValue: T, oldValue: T) {
    if (this.state === 'muted') return;
    if (newValue === oldValue) return;

    if (this._options.throttle) {
      if (this._throttleTimeout) {
        return;
      }
      this._throttleTimeout = setTimeout(() => {
        clearTimeout(this._throttleTimeout as Timer);
        this._throttleTimeout = null;
      }, this._options.throttle);
    }

    if (this._options.debounce) {
      if (this._debounceTimeout) {
        clearTimeout(this._debounceTimeout);
      }
      this._debounceTimeout = setTimeout(async () => {
        for (const subscriber of this._subscribers) {
          await subscriber(newValue, oldValue);
        }
        this._history.push(newValue);
      }, this._options.debounce);
      return;
    }

    for (const subscriber of this._subscribers) {
      await subscriber(newValue, oldValue);
    }
    this._history.push(newValue);
  }

  constructor(value: T, options?: ObservableOptions) {
    this._value = value;
    this._history.push(value);
    if (options) this._options = options;
  }

  /**
   * Subscribe to the observable
   * @param subscriber - The subscriber function
   * @returns A function to unsubscribe
   */
  subscribe(subscriber: Subscriber<T>) {
    this._subscribers.push(subscriber);
    // Upon subscription, notify the subscriber of the current value
    subscriber(this._value, this._history[this._history.length - 2]);
    return () => {
      this._subscribers = this._subscribers.filter((s) => s !== subscriber);
    };
  }

  /**
   * Set the value of the observable, and notify subscribers
   * @param newValue - The new value
   */
  async set(newValue: T) {
    this._checkForSealedMutationError();
    const oldValue = this._value;
    this._value = newValue;
    this._notify(this._value, oldValue);
  }

  /**
   * Get the value of the observable
   */
  get(): T {
    return this._value;
  }
  get value() {
    return this._value;
  }

  /**
   * Update the value of the observable using an updater function
   * @param updater - The updater function
   */
  update(updater: Updater<T>) {
    this.set(updater(this.get()));
  }

  /**
   * Bind the observable to other observables
   * @param dependencies - The dependencies to bind to
   * @param compute - The compute function, which takes the values of the dependencies and returns the new value
   * @returns A function to unbind
   */
  bind<Y extends Observable[]>(
    dependencies: [...Y],
    compute: (args: ObservableArrayType<Y>) => T
  ) {
    const unsubscribers: (() => void)[] = [];
    for (const dependency of dependencies) {
      unsubscribers.push(
        dependency.subscribe(async () => {
          this.set(
            compute(
              dependencies.map(
                (dependency: Observable) => dependency.value
              ) as ObservableArrayType<Y>
            )
          );
        })
      );
    }
    this.set(
      compute(
        dependencies.map(
          (dependency: Observable) => dependency.value
        ) as ObservableArrayType<Y>
      )
    );
    return () => {
      for (const unsubscriber of unsubscribers) {
        unsubscriber();
      }
    };
  }

  get state() {
    return this._state;
  }

  /**
   * Seal the observable, preventing further changes
   */
  seal() {
    this._subscribers = [];
    this._state = 'sealed';
  }

  /**
   * Mute the observable, preventing notifications to subscribers
   */
  mute() {
    this._checkForSealedMutationError();
    this._state = 'muted';
  }

  /**
   * Unmute the observable
   */
  unmute() {
    this._checkForSealedMutationError();
    this._state = 'unsealed';
  }
}

export class InputElementObservable extends BasicObservable<string> {
  constructor(
    private inputElement: HTMLInputElement | HTMLTextAreaElement,
    options?: ObservableOptions
  ) {
    super(inputElement.value, options);
    'change input'.split(' ').forEach((eventName) => {
      inputElement.addEventListener(eventName, () => {
        this.value = inputElement.value;
      });
    });
  }
  set value(value: string) {
    this.inputElement.value = value;
    super.set(value);
  }
}
