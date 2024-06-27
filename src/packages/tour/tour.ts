import { nextStep, TourStep } from "./steps";
import { Package } from "../package";
import {
  introAfterChangeCallback,
  introBeforeChangeCallback,
  introBeforeExitCallback,
  introChangeCallback,
  introCompleteCallback,
  introExitCallback,
  introSkipCallback,
  introStartCallback,
} from "./callback";
import { getDefaultTourOptions, TourOptions } from "./option";
import { setOptions, setOption } from "../../option";
import { render } from "./render";
import exitIntro from "./exitIntro";
import isFunction from "../../util/isFunction";
import { getDontShowAgain, setDontShowAgain } from "./dontShowAgain";
import refresh from "./refresh";
import { getContainerElement } from "../../util/containerElement";
import DOMEvent from "../../util/DOMEvent";
import onKeyDown from "./onKeyDown";
import onResize from "./onResize";

/**
 * Intro.js Tour class
 */
export class Tour implements Package<TourOptions> {
  private _steps: TourStep[] = [];
  private _currentStep: number = -1;
  private _direction: "forward" | "backward";
  private readonly _targetElement: HTMLElement;
  private _options: TourOptions;

  private readonly callbacks: {
    beforeChange?: introBeforeChangeCallback;
    change?: introChangeCallback;
    afterChange?: introAfterChangeCallback;
    complete?: introCompleteCallback;
    start?: introStartCallback;
    exit?: introExitCallback;
    skip?: introSkipCallback;
    beforeExit?: introBeforeExitCallback;
  } = {};

  // Event handlers
  private _keyboardNavigationHandler?: (e: KeyboardEvent) => Promise<void>;
  private _refreshOnResizeHandler?: (e: Event) => void;

  public constructor(elementOrSelector?: string | HTMLElement) {
    this._targetElement = getContainerElement(elementOrSelector);
    this._options = getDefaultTourOptions();
  }

  callback<K extends keyof typeof this.callbacks>(
    callbackName: K
  ): (typeof this.callbacks)[K] | undefined {
    const callback = this.callbacks[callbackName];
    if (isFunction(callback)) {
      return callback;
    }
    return undefined;
  }

  /**
   * Go to a specific step of the tour
   * @param step step number
   * @returns Tour instance
   */
  async goToStep(step: number) {
    // because steps starts from zero index
    this.setCurrentStep(step - 2);
    await nextStep(this);
    return this;
  }

  /**
   * Go to a specific step of the tour with the explicit [data-step] number
   * @param stepNumber
   * @returns
   */
  async goToStepNumber(stepNumber: number) {
    for (let i = 0; i < this._steps.length; i++) {
      const item = this._steps[i];

      if (item.step === stepNumber) {
        this.setCurrentStep(i - 1);
        break;
      }
    }

    await nextStep(this);

    return this;
  }

  /**
   * Add a step to the tour options.
   * This method should be used in conjunction with the `render()` method.
   * @param step Partial<TourStep>
   */
  addStep(step: Partial<TourStep>) {
    if (!this._options.steps) {
      this._options.steps = [];
    }

    this._options.steps.push(step);

    return this;
  }

  /**
   * Add multiple steps to the tour options.
   * This method should be used in conjunction with the `render()` method.
   * @param steps Partial<TourStep>[]
   */
  addSteps(steps: Partial<TourStep>[]) {
    if (!steps.length) return this;

    for (const step of steps) {
      this.addStep(step);
    }

    return this;
  }

  /**
   * Set the steps of the tour
   * @param steps TourStep[]
   */
  setSteps(steps: TourStep[]): this {
    this._steps = steps;
    return this;
  }

  getSteps(): TourStep[] {
    return this._steps;
  }

  getStep(step: number): TourStep {
    return this._steps[step];
  }

  getCurrentStep(): number {
    return this._currentStep;
  }

  setCurrentStep(step: number): this {
    if (step >= this._currentStep) {
      this._direction = "forward";
    } else {
      this._direction = "backward";
    }

    this._currentStep = step;
    return this;
  }

  incrementCurrentStep(): this {
    if (this.getCurrentStep() === -1) {
      this.setCurrentStep(0);
    } else {
      this.setCurrentStep(this.getCurrentStep() + 1);
    }

    return this;
  }

  decrementCurrentStep(): this {
    if (this.getCurrentStep() > 0) {
      this.setCurrentStep(this._currentStep - 1);
    }

    return this;
  }

  getDirection() {
    return this._direction;
  }

  /**
   * Check if the current step is the last step
   * @returns boolean
   */
  isEnd(): boolean {
    return this.getCurrentStep() >= this._steps.length;
  }

  getTargetElement(): HTMLElement {
    return this._targetElement;
  }

  setOptions(partialOptions: Partial<TourOptions>): this {
    this._options = setOptions(this._options, partialOptions);
    return this;
  }

  setOption<K extends keyof TourOptions>(key: K, value: TourOptions[K]): this {
    this._options = setOption(this._options, key, value);
    return this;
  }

  getOption<K extends keyof TourOptions>(key: K): TourOptions[K] {
    return this._options[key];
  }

  clone(): ThisType<this> {
    return new Tour(this._targetElement);
  }

  isActive(): boolean {
    if (
      this.getOption("dontShowAgain") &&
      getDontShowAgain(this.getOption("dontShowAgainCookie"))
    ) {
      return false;
    }

    return this.getOption("isActive");
  }

  setDontShowAgain(dontShowAgain: boolean) {
    setDontShowAgain(
      dontShowAgain,
      this.getOption("dontShowAgainCookie"),
      this.getOption("dontShowAgainCookieDays")
    );
    return this;
  }

  /**
   * Enable keyboard navigation for the tour
   */
  enableKeyboardNavigation() {
    if (this.getOption("keyboardNavigation")) {
      this._keyboardNavigationHandler = (e: KeyboardEvent) =>
        onKeyDown(this, e);
      DOMEvent.on(window, "keydown", this._keyboardNavigationHandler, true);
    }

    return this;
  }

  /**
   * Disable keyboard navigation for the tour
   */
  disableKeyboardNavigation() {
    if (this._keyboardNavigationHandler) {
      DOMEvent.off(window, "keydown", this._keyboardNavigationHandler, true);
      this._keyboardNavigationHandler = undefined;
    }

    return this;
  }

  /**
   * Enable refresh on window resize for the tour
   */
  enableRefreshOnResize() {
    this._refreshOnResizeHandler = (_: Event) => onResize(this);
    DOMEvent.on(window, "resize", this._refreshOnResizeHandler, true);
  }

  /**
   * Disable refresh on window resize for the tour
   */
  disableRefreshOnResize() {
    if (this._refreshOnResizeHandler) {
      DOMEvent.off(window, "resize", this._refreshOnResizeHandler, true);
      this._refreshOnResizeHandler = undefined;
    }
  }

  /**
   * Render the tour on the page
   */
  async render(): Promise<this> {
    if (await render(this)) {
      this.enableKeyboardNavigation();
      this.enableRefreshOnResize();
    }

    return this;
  }

  /**
   * @deprecated `start()` is deprecated, please use `render()` instead.
   */
  async start() {
    await this.render();
    return this;
  }

  /**
   * Exit the tour
   * @param {boolean} force whether to force exit the tour
   */
  async exit(force?: boolean) {
    if (await exitIntro(this, force ?? false)) {
      this.disableKeyboardNavigation();
      this.disableRefreshOnResize();
    }

    return this;
  }

  /**
   * Refresh the tour
   * @param {boolean} refreshSteps whether to refresh the tour steps
   */
  refresh(refreshSteps?: boolean) {
    refresh(this, refreshSteps);
    return this;
  }

  /**
   * @deprecated onbeforechange is deprecated, please use onBeforeChange instead.
   */
  onbeforechange(callback: introBeforeChangeCallback) {
    return this.onBeforeChange(callback);
  }

  onBeforeChange(callback: introBeforeChangeCallback) {
    if (isFunction(callback)) {
      this.callbacks.beforeChange = callback;
    } else {
      throw new Error(
        "Provided callback for onbeforechange was not a function"
      );
    }
    return this;
  }

  /**
   * @deprecated onchange is deprecated, please use onChange instead.
   */
  onchange(callback: introChangeCallback) {
    this.onChange(callback);
  }

  onChange(callback: introChangeCallback) {
    if (isFunction(callback)) {
      this.callbacks.change = callback;
    } else {
      throw new Error("Provided callback for onchange was not a function.");
    }
    return this;
  }

  /**
   * @deprecated onafterchange is deprecated, please use onAfterChange instead.
   */
  onafterchange(callback: introAfterChangeCallback) {
    this.onAfterChange(callback);
  }

  onAfterChange(callback: introAfterChangeCallback) {
    if (isFunction(callback)) {
      this.callbacks.afterChange = callback;
    } else {
      throw new Error("Provided callback for onafterchange was not a function");
    }
    return this;
  }

  /**
   * @deprecated oncomplete is deprecated, please use onComplete instead.
   */
  oncomplete(callback: introCompleteCallback) {
    return this.onComplete(callback);
  }

  onComplete(callback: introCompleteCallback) {
    if (isFunction(callback)) {
      this.callbacks.complete = callback;
    } else {
      throw new Error("Provided callback for oncomplete was not a function.");
    }
    return this;
  }

  /**
   * @deprecated onstart is deprecated, please use onStart instead.
   */
  onstart(callback: introStartCallback) {
    return this.onStart(callback);
  }

  onStart(callback: introStartCallback) {
    if (isFunction(callback)) {
      this.callbacks.start = callback;
    } else {
      throw new Error("Provided callback for onstart was not a function.");
    }

    return this;
  }

  /**
   * @deprecated onexit is deprecated, please use onExit instead.
   */
  onexit(callback: introExitCallback) {
    return this.onExit(callback);
  }

  onExit(callback: introExitCallback) {
    if (isFunction(callback)) {
      this.callbacks.exit = callback;
    } else {
      throw new Error("Provided callback for onexit was not a function.");
    }

    return this;
  }

  /**
   * @deprecated onskip is deprecated, please use onSkip instead.
   */
  onskip(callback: introSkipCallback) {
    return this.onSkip(callback);
  }

  onSkip(callback: introSkipCallback) {
    if (isFunction(callback)) {
      this.callbacks.skip = callback;
    } else {
      throw new Error("Provided callback for onskip was not a function.");
    }

    return this;
  }

  /**
   * @deprecated onbeforeexit is deprecated, please use onBeforeExit instead.
   */
  onbeforeexit(callback: introBeforeExitCallback) {
    return this.onBeforeExit(callback);
  }

  onBeforeExit(callback: introBeforeExitCallback) {
    if (isFunction(callback)) {
      this.callbacks.beforeExit = callback;
    } else {
      throw new Error("Provided callback for onbeforeexit was not a function.");
    }
    return this;
  }
}
