import { useEffect, useMemo, useState } from 'react'
import { PlatformLayout } from '../layouts/PlatformLayout'
import { usePlatformStore } from '../lib/store'
import { getSession } from '../lib/auth'
import { SectionHeading, Badge } from '../components/ui/Basics'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'
import { Dialog } from '../components/ui/Dialog'
import { DataTable, type Column } from '../components/ui/DataTable'
import { Plus, Pencil, Trash2, ShieldCheck, Shield } from 'lucide-react'
import {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  type AdminUser,
  type AdminRole,
} from '../services/adminUsersApi'
import { useAdminLang } from '../lib/adminI18n'

interface FormState {
  name: string
  email: string
  password: string
  role: AdminRole
  campaignSlug: string
  active: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  role: 'tombola_admin',
  campaignSlug: '',
  active: true,
}

/**
 * Platform admins only (gated by RequireSuperAdmin in AdminApp.tsx) — the
 * one place accounts get created. A super_admin can manage everything; a
 * tombola_admin is scoped, at creation time here, to exactly one tombola
 * (`campaign_slug`), which the backend then enforces on every
 * backend-connected admin call via `require_campaign_access`.
 */
export default function Team() {
  const websites = usePlatformStore((s) => s.websites)
  const currentUserId = getSession()?.id
  const { t } = useAdminLang()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  function refresh() {
    setLoading(true)
    setLoadError('')
    listAdminUsers()
      .then(setUsers)
      .catch((err) => setLoadError(err instanceof Error ? err.message : t('team.errLoadAccounts')))
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [])

  const websiteBySlug = useMemo(() => new Map(websites.map((w) => [w.slug, w])), [websites])

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, campaignSlug: websites[0]?.slug ?? '' })
    setFormError('')
    setDialogOpen(true)
  }

  function openEdit(user: AdminUser) {
    setEditing(user)
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      campaignSlug: user.campaign_slug ?? websites[0]?.slug ?? '',
      active: user.active,
    })
    setFormError('')
    setDialogOpen(true)
  }

  async function handleSubmit() {
    setFormError('')
    if (!form.name.trim() || !form.email.trim()) {
      setFormError(t('team.errNameEmail'))
      return
    }
    if (form.role === 'tombola_admin' && !form.campaignSlug) {
      setFormError(t('team.errPickTombola'))
      return
    }
    if (!editing && form.password.trim().length < 6) {
      setFormError(t('team.errPasswordMin'))
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await updateAdminUser(editing.id, {
          name: form.name.trim(),
          role: form.role,
          campaign_slug: form.role === 'tombola_admin' ? form.campaignSlug : null,
          active: form.active,
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        })
      } else {
        await createAdminUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password.trim(),
          role: form.role,
          campaign_slug: form.role === 'tombola_admin' ? form.campaignSlug : null,
        })
      }
      setDialogOpen(false)
      refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('team.errGeneric'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteAdminUser(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('team.errDelete'))
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      label: t('team.colName'),
      sortable: true,
      sortValue: (u) => u.name,
      render: (u) => (
        <div>
          <div className="font-medium">{u.name}</div>
          <div className="text-[12px] text-[var(--pf-ink-faint)]">{u.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      label: t('team.colRole'),
      render: (u) =>
        u.role === 'super_admin' ? (
          <Badge tone="accent">
            <ShieldCheck className="h-3 w-3" /> {t('team.platformAdmin')}
          </Badge>
        ) : (
          <Badge tone="neutral">
            <Shield className="h-3 w-3" /> {t('team.tombolaAdmin')}
          </Badge>
        ),
    },
    {
      key: 'campaign_slug',
      label: t('team.colTombola'),
      render: (u) =>
        u.role === 'super_admin' ? (
          <span className="text-[var(--pf-ink-faint)]">{t('team.allTombolas')}</span>
        ) : (
          <span>{websiteBySlug.get(u.campaign_slug ?? '')?.name ?? u.campaign_slug ?? '—'}</span>
        ),
    },
    {
      key: 'active',
      label: t('team.colStatus'),
      render: (u) => (u.active ? <Badge tone="success">{t('team.active')}</Badge> : <Badge tone="danger">{t('team.disabled')}</Badge>),
    },
    {
      key: 'actions',
      label: '',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (u) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="xs" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(u)}>
            {t('team.edit')}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            disabled={u.id === currentUserId}
            onClick={() => setDeleteTarget(u)}
          >
            {t('team.delete')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PlatformLayout>
      <div className="mx-auto max-w-[1180px] px-6 py-8 pf-fade-in">
        <SectionHeading
          eyebrow={t('platform.eyebrow')}
          title={t('team.title')}
          description={t('team.desc')}
          action={
            <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={openCreate}>
              {t('team.newAccount')}
            </Button>
          }
        />

        {loadError && (
          <div className="mt-6 rounded-[var(--pf-radius-sm)] border border-[var(--pf-danger)]/30 bg-[var(--pf-danger-soft)] px-4 py-3 text-[13px] text-[var(--pf-danger)]">
            {loadError}
          </div>
        )}

        <div className="mt-6">
          <DataTable
            columns={columns}
            rows={users}
            loading={loading}
            emptyTitle={t('team.noAccounts')}
            emptyDescription={t('team.noAccountsDesc')}
          />
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? t('team.editAccount') : t('team.newAccount')}
        description={editing ? t('team.editDesc') : t('team.createDesc')}
        width={440}
      >
        <div className="space-y-4">
          <Field label={t('team.name')} required>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label={t('team.email')} required>
            <Input
              type="email"
              value={form.email}
              disabled={!!editing}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label={editing ? t('team.newPassword') : t('team.password')} hint={editing ? t('team.passwordHint') : t('team.passwordMin')} required={!editing}>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </Field>
          <Field label={t('team.role')} required>
            <Select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminRole }))}
            >
              <option value="tombola_admin">{t('team.roleTombola')}</option>
              <option value="super_admin">{t('team.rolePlatform')}</option>
            </Select>
          </Field>
          {form.role === 'tombola_admin' && (
            <Field label={t('team.assignedTombola')} required>
              <Select
                value={form.campaignSlug}
                onChange={(e) => setForm((f) => ({ ...f, campaignSlug: e.target.value }))}
              >
                <option value="" disabled>
                  {t('team.selectTombola')}
                </option>
                {websites.map((w) => (
                  <option key={w.id} value={w.slug}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {editing && (
            <Field label={t('team.status')}>
              <Select
                value={form.active ? '1' : '0'}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === '1' }))}
              >
                <option value="1">{t('team.active')}</option>
                <option value="0">{t('team.disabled')}</option>
              </Select>
            </Field>
          )}

          {formError && (
            <div className="rounded-[var(--pf-radius-sm)] border border-[var(--pf-danger)]/30 bg-[var(--pf-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--pf-danger)]">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              {t('team.cancel')}
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSubmit}>
              {editing ? t('team.saveChanges') : t('team.createAccount')}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('team.deleteTitle')}
        description={deleteTarget ? `"${deleteTarget.name}" ${t('team.deleteConfirm')}` : undefined}
        width={420}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            {t('team.cancel')}
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            {t('team.deletePermanently')}
          </Button>
        </div>
      </Dialog>
    </PlatformLayout>
  )
}
