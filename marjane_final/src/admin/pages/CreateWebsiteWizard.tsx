import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlatformLayout } from '../layouts/PlatformLayout'
import { usePlatformStore } from '../lib/store'
import { Button } from '../components/ui/Button'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Card } from '../components/ui/Basics'
import { ArrowLeft } from 'lucide-react'
import type { WebsiteTheme } from '../lib/types'
import { useAdminLang } from '../lib/adminI18n'

// Sensible starting point for every new site — every one of these is a
// single click away from being changed in the Theme Editor, which is where
// the admin actually builds the website (colors, typography, buttons,
// layout, images, animations, live phone preview). This wizard's only job
// is to collect the handful of things the Theme Editor doesn't own: name,
// slug, description, language.
const DEFAULT_THEME: Partial<WebsiteTheme> = {
  primary: '#17181C',
  secondary: '#9B9EA7',
  accent: '#4F46E5',
  font: 'display',
  radius: 14,
  buttonStyle: 'solid',
  shadowIntensity: 'medium',
  animationLevel: 'subtle',
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function CreateWebsiteWizard() {
  const navigate = useNavigate()
  const createWebsite = usePlatformStore((s) => s.createWebsite)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState<'fr' | 'en' | 'ar'>('fr')
  const { t } = useAdminLang()

  const canCreate = name.trim().length > 1 && slug.trim().length > 1

  function finish() {
    const id = createWebsite({
      name,
      slug,
      description,
      template: 'modern',
      language,
      theme: DEFAULT_THEME,
    })
    // Straight into the real Theme Editor — that's where the site actually
    // gets built (colors, fonts, images, layout, all with a live preview).
    navigate(`/admin/site/${id}/theme`)
  }

  return (
    <PlatformLayout>
      <div className="mx-auto max-w-[560px] px-6 py-8 pf-fade-in">
        <button
          onClick={() => navigate('/admin')}
          className="mb-5 flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--pf-ink-muted)] transition-colors hover:text-[var(--pf-ink)]"
        >
          <ArrowLeft className="h-4 w-4" /> {t('wizard.backToDashboard')}
        </button>

        <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[var(--pf-ink)]">{t('wizard.title')}</h1>
        <p className="mt-1 text-[13.5px] text-[var(--pf-ink-muted)]">
          {t('wizard.subtitle')}
        </p>

        <Card className="mt-7 p-6">
          <div className="space-y-4">
            <Field label={t('wizard.websiteName')} required>
              <Input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!slugTouched) setSlug(slugify(e.target.value))
                }}
                placeholder={t('wizard.websiteNamePlaceholder')}
              />
            </Field>
            <Field label={t('wizard.slug')} hint={t('wizard.slugHint')} required>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value))
                  setSlugTouched(true)
                }}
                placeholder="marjane-summer"
              />
            </Field>
            <Field label={t('wizard.description')} hint={t('wizard.descriptionHint')}>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('wizard.descriptionPlaceholder')} />
            </Field>
            <Field label={t('topbar.language')} hint={t('wizard.languageHint')}>
              <Select value={language} onChange={(e) => setLanguage(e.target.value as any)}>
                <option value="fr">{t('settings.french')}</option>
                <option value="en">{t('settings.english')}</option>
                <option value="ar">{t('settings.arabic')}</option>
              </Select>
            </Field>
          </div>
        </Card>

        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" disabled={!canCreate} onClick={finish}>
            {t('wizard.createWebsite')}
          </Button>
        </div>
      </div>
    </PlatformLayout>
  )
}
