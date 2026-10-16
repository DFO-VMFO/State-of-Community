import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

// Member-facing text in English, Swahili and Luganda. Keys are the English text; anything not listed stays English.
// DRAFT: Luganda and Swahili were not reviewed by native speakers. Have two community members check them before launch.
export type Lang = 'en' | 'sw' | 'lg'
export const langs: [Lang, string][] = [['en', 'English'], ['sw', 'Kiswahili'], ['lg', 'Luganda']]

const sw: Record<string, string> = {
  Home: 'Nyumbani', Services: 'Huduma', Goals: 'Malengo', Events: 'Matukio', Clubs: 'Vilabu', Toolkit: 'Zana', Account: 'Akaunti',
  'Good morning': 'Habari za asubuhi', 'Good afternoon': 'Habari za mchana', 'Good evening': 'Habari za jioni',
  'Coming up': 'Yanayokuja', 'Your goals': 'Malengo yako', 'Your clubs': 'Vilabu vyako', 'What’s available and what’s coming': 'Kinachopatikana na kinachokuja',
  'Services and benefits': 'Huduma na manufaa',
  'Before you continue': 'Kabla ya kuendelea', 'Accept and continue': 'Kubali na uendelee', 'I have read and agree to the documents above.': 'Nimesoma na nakubali nyaraka zilizo hapo juu.',
  'Account and help': 'Akaunti na msaada', 'Your card': 'Kadi yako', 'Your dues': 'Michango yako', 'Ask for help': 'Omba msaada', 'How we reach you': 'Jinsi tunavyokufikia',
  'Save preferences': 'Hifadhi mapendeleo', 'People in your household': 'Watu katika kaya yako', 'Add adult': 'Ongeza mtu mzima', Remove: 'Ondoa',
  'Put it on your home screen': 'Iweke kwenye skrini yako ya mwanzo', 'Install app': 'Sakinisha programu', 'Help us improve the portal': 'Tusaidie kuboresha tovuti',
  'Help us count our community': 'Tusaidie kuhesabu jamii yetu', Continue: 'Endelea', Back: 'Rudi', 'Send my answers': 'Tuma majibu yangu', 'Send my answers now': 'Tuma majibu yangu sasa',
  'Prefer not to say': 'Napendelea kutosema', 'Sign in': 'Ingia', 'Sign out': 'Toka', Language: 'Lugha',
}
const lg: Record<string, string> = {
  Home: 'Awaka', Services: 'Obuweereza', Goals: 'Ebiruubirwa', Events: 'Emikolo', Clubs: 'Ebibiina', Toolkit: 'Ebikozesa', Account: 'Akawunti',
  'Good morning': 'Wasuze otya', 'Good afternoon': 'Osiibye otya', 'Good evening': 'Wanyuse otya',
  'Coming up': 'Ebigenda okujja', 'Your goals': 'Ebiruubirirwa byo', 'Your clubs': 'Ebibiina byo', 'What’s available and what’s coming': 'Ebiriwo n’ebigenda okujja',
  'Services and benefits': 'Obuweereza n’emiganyulo',
  'Before you continue': 'Nga tonnaba kweyongerayo', 'Accept and continue': 'Okkirizza weyongere', 'I have read and agree to the documents above.': 'Nsomye era nkkirizza ebiwandiiko ebiri waggulu.',
  'Account and help': 'Akawunti n’obuyambi', 'Your card': 'Kaadi yo', 'Your dues': 'Ensako zo', 'Ask for help': 'Saba obuyambi', 'How we reach you': 'Engeri gye tukutuukamu',
  'Save preferences': 'Tereka by’oyagala', 'People in your household': 'Abantu mu maka go', 'Add adult': 'Ongerako omuntu omukulu', Remove: 'Gyawo',
  'Put it on your home screen': 'Giteeke ku ssirini yo esooka', 'Install app': 'Teeka app', 'Help us improve the portal': 'Tuyambe okutereeza omukutu',
  'Help us count our community': 'Tuyambe okubala bannaffe', Continue: 'Weyongere', Back: 'Ddayo', 'Send my answers': 'Weereza eby’okuddamu byange', 'Send my answers now': 'Weereza eby’okuddamu byange kati',
  'Prefer not to say': 'Njagala obutabyogerako', 'Sign in': 'Yingira', 'Sign out': 'Fuluma', Language: 'Olulimi',
}
const dict: Record<Lang, Record<string, string>> = { en: {}, sw, lg }
const KEY = 'soc.lang.v1'
const load = (): Lang => { try { const v = localStorage.getItem(KEY); return v === 'sw' || v === 'lg' ? v : 'en' } catch { return 'en' } }

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string }
const C = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: s => s })
export const useT = () => useContext(C)
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>(load)
  const setLang = useCallback((l: Lang) => { set(l); try { localStorage.setItem(KEY, l); document.documentElement.lang = l } catch { /* blocked */ } }, [])
  const t = useCallback((s: string) => dict[lang][s] ?? s, [lang])
  return <C.Provider value={{ lang, setLang, t }}>{children}</C.Provider>
}
export function LanguagePicker({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useT()
  return <><label className="sr-only" htmlFor="lang">{t('Language')}</label><select id="lang" className={`rounded border border-line bg-white px-1 py-0.5 text-sm text-ink ${className}`} value={lang} onChange={e => setLang(e.target.value as Lang)}>{langs.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></>
}
