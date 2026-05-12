import { createI18n } from 'vue-i18n'
import nl from './nl.json'
import en from './en.json'
import es from './es.json'
import ca from './ca.json'

const saved = localStorage.getItem('crm_locale') || 'es'

export const i18n = createI18n({
  legacy: false,
  locale: saved,
  fallbackLocale: 'nl',
  messages: { nl, en, es, ca }
})
