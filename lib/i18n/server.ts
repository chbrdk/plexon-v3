import { cookies, headers } from 'next/headers';
import { createTranslator, resolveLocale } from './index';
import { LOCALE_STORAGE_KEY } from '@/lib/constants';

const LOCALE_COOKIE = LOCALE_STORAGE_KEY;

export const getServerLocale = async (): Promise<'de' | 'en'> => {
  const cookieStore = await cookies();
  const headersList = await headers();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const acceptLanguage = headersList.get('accept-language');
  return resolveLocale(cookieLocale, acceptLanguage);
};

export const getServerT = async () => createTranslator(await getServerLocale());
