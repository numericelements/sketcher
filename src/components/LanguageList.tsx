import React, { useContext} from "react";
import { LanguageContext, languages, useSetLanguageFromCode, useTranslation } from "../hooks/useTranslation";



export const LanguageList = ({ style, className }: { style?: React.CSSProperties, className?: string }) => {


  const setLanguageFromCode = useSetLanguageFromCode()
  const currentLanguageContext = useContext(LanguageContext)

  if (!currentLanguageContext){
      throw new Error("LanguageList has to be used within <LanguageContext.Provider>")
  }

  const [language, setLanguage] = currentLanguageContext

  const t = useTranslation()

  return (
    <select
      className={className}
      onChange={({ target }) => setLanguageFromCode(target.value)}
      value={language.label}
      aria-label={t("buttons.selectLanguage")}
      style={style}
    >
      <option key={language.code} value={language.code}>
        {language.label}
      </option>
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
};