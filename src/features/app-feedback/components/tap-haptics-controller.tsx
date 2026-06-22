/**
 * Global tap feedback for the installed app and mobile web view.
 * Adjust HAPTIC_SELECTOR to decide which controls should feel tactile when tapped.
 */

"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    DropzoneAndroid?: {
      saveTrackedRoster?: (profileJson: string, friendsJson: string) => void;
      tapHaptic?: () => void;
    };
  }
}

const HAPTIC_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  "label.platform-choice",
  "[role='button']",
  "[role='menuitem']",
].join(",");

const PRESSED_CLASS = "tap-feedback-active";
const TAP_VIBRATION_MS = 8;

function findTappableElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;

  const element = target.closest<HTMLElement>(HAPTIC_SELECTOR);
  if (!element) return null;

  if (element.getAttribute("aria-disabled") === "true") return null;
  if (element instanceof HTMLButtonElement && element.disabled) return null;

  return element;
}

function vibrateForTap() {
  try {
    if (window.DropzoneAndroid?.tapHaptic) {
      window.DropzoneAndroid.tapHaptic();
      return;
    }

    if (navigator.vibrate) {
      navigator.vibrate(TAP_VIBRATION_MS);
    }
  } catch {
    // Some browsers block vibration; the pressed animation still provides visible feedback.
  }
}

export function TapHapticsController() {
  useEffect(() => {
    const activeElements = new Set<HTMLElement>();
    let lastHapticAt = 0;

    function releaseElement(element: HTMLElement) {
      element.classList.remove(PRESSED_CLASS);
      activeElements.delete(element);
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const element = findTappableElement(event.target);
      if (!element) return;

      const now = Date.now();
      if (now - lastHapticAt > 70) {
        vibrateForTap();
        lastHapticAt = now;
      }

      element.classList.add(PRESSED_CLASS);
      activeElements.add(element);
      window.setTimeout(() => releaseElement(element), 160);
    }

    document.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      activeElements.forEach((element) => element.classList.remove(PRESSED_CLASS));
    };
  }, []);

  return null;
}
