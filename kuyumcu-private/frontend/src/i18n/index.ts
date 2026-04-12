import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import tr from "./tr.json";
import en from "./en.json";

const savedLang = localStorage.getItem("app-language") ?? "tr";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    lng: savedLang,
    fallbackLng: "tr",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
