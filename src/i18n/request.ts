import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  resolveLocaleFromAcceptLanguage,
  type Locale,
} from "./config";
import { getPreferredLocaleFromSession } from "@/lib/i18n/resolve-locale";

export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale;

  const sessionLocale = await getPreferredLocaleFromSession();
  if (sessionLocale) {
    locale = sessionLocale;
  } else {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    if (cookieLocale && isLocale(cookieLocale)) {
      locale = cookieLocale;
    } else {
      const acceptLanguage = (await headers()).get("accept-language");
      locale = resolveLocaleFromAcceptLanguage(acceptLanguage) ?? defaultLocale;
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
