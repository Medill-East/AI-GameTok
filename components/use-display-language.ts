"use client";

import { useSyncExternalStore } from "react";
import { LANGUAGE_PREFERENCE_KEY } from "@/lib/constants";
import type { DisplayLanguage } from "@/lib/types";

const DEFAULT_LANGUAGE: DisplayLanguage = "zh";

function subscribeToLanguagePreference(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = () => onStoreChange();

  window.addEventListener("storage", listener);
  window.addEventListener("gametok:language-change", listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("gametok:language-change", listener);
  };
}

function getLanguagePreferenceSnapshot(): DisplayLanguage {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  try {
    return window.localStorage.getItem(LANGUAGE_PREFERENCE_KEY) === "en" ? "en" : "zh";
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function setDisplayLanguage(next: DisplayLanguage) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LANGUAGE_PREFERENCE_KEY, next);
    window.dispatchEvent(new Event("gametok:language-change"));
  } catch {}
}

export function useDisplayLanguage() {
  const language = useSyncExternalStore(
    subscribeToLanguagePreference,
    getLanguagePreferenceSnapshot,
    () => DEFAULT_LANGUAGE,
  );

  return {
    language,
    setLanguage: setDisplayLanguage,
    toggleLanguage: () => setDisplayLanguage(language === "zh" ? "en" : "zh"),
  };
}
