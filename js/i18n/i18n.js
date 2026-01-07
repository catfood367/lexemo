let translations = {};

export async function setLanguage(lang) {
  try {
    const response = await fetch(`js/i18n/locales/${lang}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load language file: ${lang}`);
    }
    translations = await response.json();
    translatePage();
    localStorage.setItem("language", lang);
    document.documentElement.lang = lang;
  } catch (error) {
    console.error(error);
    if (lang !== "en") {
      await setLanguage("en");
    }
  }
}

export function translatePage() {
  document
    .querySelectorAll(
      "[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]",
    )
    .forEach((element) => {
      const i18nKey = element.getAttribute("data-i18n");
      const placeholderKey = element.getAttribute("data-i18n-placeholder");
      const titleKey = element.getAttribute("data-i18n-title");
      const ariaLabelKey = element.getAttribute("data-i18n-aria-label");

      if (i18nKey && translations[i18nKey]) {
        element.innerHTML = translations[i18nKey];
      }
      if (placeholderKey && translations[placeholderKey]) {
        element.placeholder = translations[placeholderKey];
      }
      if (titleKey && translations[titleKey]) {
        element.title = translations[titleKey];
      }
      if (ariaLabelKey && translations[ariaLabelKey]) {
        element.setAttribute("aria-label", translations[ariaLabelKey]);
      }
    });
}

export function getTranslation(key) {
  return translations[key] || key;
}

export function detectBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage;
  if (lang.startsWith("pt")) return "pt-BR";
  if (lang.startsWith("es")) return "es";
  return "en";
}

export function getLanguage() {
  return localStorage.getItem("language") || detectBrowserLanguage();
}
