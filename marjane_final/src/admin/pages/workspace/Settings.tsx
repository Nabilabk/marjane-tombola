import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlatformStore } from '../../lib/store'
import { SectionHeading, Card, Divider } from '../../components/ui/Basics'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Tabs } from '../../components/ui/Tabs'
import { Toggle } from '../../components/ui/Toggle'
import { Dialog } from '../../components/ui/Dialog'
import { Download, Upload, Trash2, KeyRound, Copy, Check, ShieldCheck, RefreshCw } from 'lucide-react'
import { useAdminLang } from '../../lib/adminI18n'

export default function Settings() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const { t } = useAdminLang()
  const website = usePlatformStore((s) => s.websites.find((w) => w.id === siteId))!
  const updateWebsite = usePlatformStore((s) => s.updateWebsite)
  const updateTheme = usePlatformStore((s) => s.updateTheme)
  const deleteWebsite = usePlatformStore((s) => s.deleteWebsite)
  const updateMaintenanceMode = usePlatformStore((s) => s.updateMaintenanceMode)
  const updateSchedule = usePlatformStore((s) => s.updateSchedule)

  const SETTINGS_TABS = [
    { id: 'general', label: t('settings.tabGeneral') },
    { id: 'security', label: t('settings.tabSecurity') },
    { id: 'brand', label: t('settings.tabBrand') },
    { id: 'api', label: t('settings.tabApi') },
    { id: 'notifications', label: t('settings.tabNotifications') },
    { id: 'backup', label: t('settings.tabBackup') },
  ]

  const NOTIF_ITEMS = [
    { key: 'newParticipant', label: t('settings.notifNewParticipant'), desc: t('settings.notifNewParticipantDesc') },
    { key: 'newWinner', label: t('settings.notifNewWinner'), desc: t('settings.notifNewWinnerDesc') },
    { key: 'invalidTicket', label: t('settings.notifInvalidTicket'), desc: t('settings.notifInvalidTicketDesc') },
    { key: 'lowStock', label: t('settings.notifLowStock'), desc: t('settings.notifLowStockDesc') },
    { key: 'campaignFinished', label: t('settings.notifCampaignFinished'), desc: t('settings.notifCampaignFinishedDesc') },
  ]

  const [tab, setTab] = useState('general')
  const [name, setName] = useState(website.name)
  const [domain, setDomain] = useState(website.domain)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [startDate, setStartDate] = useState(website.schedule.startDate)
  const [startTime, setStartTime] = useState(website.schedule.startTime)
  const [endDate, setEndDate] = useState(website.schedule.endDate)
  const [endTime, setEndTime] = useState(website.schedule.endTime)

  const theme = website.theme

  return (
    <div className="mx-auto max-w-[900px] pf-fade-in">
      <SectionHeading
        eyebrow={t('sidebar.workspace')}
        title={t('settings.title')}
        description={t('settings.desc')}
      />

      <Tabs items={SETTINGS_TABS} active={tab} onChange={setTab} />

      <div className="mt-6">
        {tab === 'general' && (
          <Card className="p-6">
            <div className="mb-5 text-[14px] font-semibold text-[var(--pf-ink)]">{t('settings.tabGeneral')}</div>
            <div className="space-y-4">
              <Field label={t('settings.websiteName')}>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label={t('settings.domain')}>
                <Input value={domain} onChange={(e) => setDomain(e.target.value)} className="font-mono" />
              </Field>
              <Field label={t('settings.defaultLanguage')}>
                <Select
                  value={website.language}
                  onChange={(e) => updateWebsite(website.id, { language: e.target.value as any })}
                >
                  <option value="fr">{t('settings.french')}</option>
                  <option value="en">{t('settings.english')}</option>
                  <option value="ar">{t('settings.arabic')}</option>
                </Select>
              </Field>
            </div>
            <div className="mt-6 flex items-center justify-between rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-4">
              <div>
                <div className="text-[13px] font-semibold text-[var(--pf-ink)]">{t('settings.maintenanceMode')}</div>
                <p className="mt-1 text-[12.5px] text-[var(--pf-ink-muted)]">
                  {t('settings.maintenanceDesc')}
                </p>
              </div>
              <Toggle
                checked={website.maintenanceMode}
                onChange={(v) => updateMaintenanceMode(website.id, v)}
              />
            </div>

            <div className="mt-6 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-4">
              <div className="text-[13px] font-semibold text-[var(--pf-ink)]">{t('settings.schedule')}</div>
              <p className="mt-1 text-[12.5px] text-[var(--pf-ink-muted)]">
                {t('settings.scheduleDesc')}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Field label={t('settings.startDate')}>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </Field>
                <Field label={t('settings.startTime')}>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </Field>
                <Field label={t('settings.endDate')}>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </Field>
                <Field label={t('settings.endTime')}>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </Field>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => updateSchedule(website.id, { startDate, startTime, endDate, endTime })}
                >
                  {t('settings.saveSchedule')}
                </Button>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="primary" onClick={() => updateWebsite(website.id, { name, domain })}>
                {t('settings.saveChanges')}
              </Button>
            </div>
          </Card>
        )}

        {tab === 'security' && (
          <Card className="p-6">
            <div className="mb-5 text-[14px] font-semibold text-[var(--pf-ink)]">{t('settings.tabSecurity')}</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[var(--pf-radius-sm)] bg-[var(--pf-accent-soft)] text-[var(--pf-accent)]">
<ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--pf-ink)]">{t('settings.twoFactor')}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--pf-ink-muted)]">{t('settings.twoFactorDesc')}</div>
                  </div>
                </div>
                <Toggle checked onChange={() => {}} />
              </div>
              <div className="flex items-center justify-between rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[var(--pf-radius-sm)] bg-[var(--pf-warning-soft)] text-[var(--pf-warning)]">
<KeyRound className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--pf-ink)]">{t('settings.changePassword')}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--pf-ink-muted)]">{t('settings.lastChanged')}</div>
                  </div>
                </div>
                <Button variant="secondary" size="sm">{t('settings.updatePassword')}</Button>
              </div>
            </div>
          </Card>
        )}

        {tab === 'brand' && (
          <Card className="p-6">
            <div className="mb-5 text-[14px] font-semibold text-[var(--pf-ink)]">{t('settings.tabBrand')}</div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label={t('settings.primaryColor')}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={theme.primary} onChange={(e) => updateTheme(website.id, { primary: e.target.value })} className="h-9 w-10 shrink-0 cursor-pointer" />
                    <Input value={theme.primary} onChange={(e) => updateTheme(website.id, { primary: e.target.value })} className="font-mono" />
                  </div>
                </Field>
                <Field label={t('settings.secondaryColor')}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={theme.secondary} onChange={(e) => updateTheme(website.id, { secondary: e.target.value })} className="h-9 w-10 shrink-0 cursor-pointer" />
                    <Input value={theme.secondary} onChange={(e) => updateTheme(website.id, { secondary: e.target.value })} className="font-mono" />
                  </div>
                </Field>
                <Field label={t('settings.accentColor')}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={theme.accent} onChange={(e) => updateTheme(website.id, { accent: e.target.value })} className="h-9 w-10 shrink-0 cursor-pointer" />
                    <Input value={theme.accent} onChange={(e) => updateTheme(website.id, { accent: e.target.value })} className="font-mono" />
                  </div>
                </Field>
              </div>
              <Field label={t('settings.logoUrl')}>
                <Input value={theme.logoUrl} onChange={(e) => updateTheme(website.id, { logoUrl: e.target.value })} placeholder="https://…/logo.png" className="font-mono" />
              </Field>
              <Field label={t('settings.font')}>
                <Select value={theme.font} onChange={(e) => updateTheme(website.id, { font: e.target.value as any })}>
                  <option value="display">{t('settings.fontDisplay')}</option>
                  <option value="classic">{t('settings.fontClassic')}</option>
                  <option value="rounded">{t('settings.fontRounded')}</option>
                </Select>
              </Field>
            </div>
          </Card>
        )}

        {tab === 'api' && (
          <Card className="p-6">
            <div className="mb-5 text-[14px] font-semibold text-[var(--pf-ink)]">{t('settings.apiKeys')}</div>
            <p className="mb-4 text-[12.5px] text-[var(--pf-ink-muted)]">
              {t('settings.apiKeysDesc')}
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-4">
                <div>
                  <div className="font-mono text-[13px] text-[var(--pf-ink)]">sk_live_••••••••••••••••</div>
                  <div className="mt-0.5 text-[11.5px] text-[var(--pf-ink-faint)]">{t('settings.liveKey')}</div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={copied ? <Check className="h-3.5 w-3.5 text-[var(--pf-success)]" /> : <Copy className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1600)
                  }}
                >
                  {copied ? t('settings.copied') : t('settings.copy')}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-4">
                <div>
                  <div className="font-mono text-[13px] text-[var(--pf-ink)]">pk_test_••••••••••••••••</div>
                  <div className="mt-0.5 text-[11.5px] text-[var(--pf-ink-faint)]">{t('settings.testKey')}</div>
                </div>
                <Button variant="secondary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />}>
                  {t('settings.rotate')}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {tab === 'notifications' && (
          <Card className="p-6">
            <div className="mb-5 text-[14px] font-semibold text-[var(--pf-ink)]">{t('settings.notifPrefs')}</div>
            <div className="space-y-3">
              {NOTIF_ITEMS.map((item, i) => (
                <div key={item.key} className="flex items-center justify-between rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-4">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--pf-ink)]">{item.label}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--pf-ink-muted)]">{item.desc}</div>
                  </div>
                  <Toggle checked={i < 3} onChange={() => {}} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === 'backup' && (
          <div className="space-y-4">
            <Card className="p-6">
              <div className="mb-5 text-[14px] font-semibold text-[var(--pf-ink)]">{t('settings.configuration')}</div>
              <p className="mb-4 text-[12.5px] text-[var(--pf-ink-muted)]">
                {t('settings.configDesc')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  icon={<Download className="h-3.5 w-3.5" />}
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(website, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${website.slug}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  {t('settings.exportConfig')}
                </Button>
                <Button variant="secondary" icon={<Upload className="h-3.5 w-3.5" />}>
                  {t('settings.importConfig')}
                </Button>
              </div>
            </Card>

            <Card className="border-[var(--pf-danger)]/30 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[var(--pf-radius-sm)] bg-[var(--pf-danger-soft)] text-[var(--pf-danger)]">
<Trash2 className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[13px] font-semibold text-[var(--pf-danger)]">{t('settings.dangerZone')}</div>
                  <p className="mt-1 text-[12.5px] text-[var(--pf-ink-muted)]">
                    {t('settings.dangerZoneDesc')}
                  </p>
                </div>
              </div>
              <Divider className="my-4" />
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                {t('settings.deleteWebsite')}
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t('settings.deleteWebsiteTitle')}
        description={`${t('settings.deleteWebsitePrefix')} "${website.name}" ${t('settings.deleteWebsiteConfirm')}`}
        width={420}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            {t('team.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteWebsite(website.id)
              navigate('/admin')
            }}
          >
            {t('team.deletePermanently')}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
