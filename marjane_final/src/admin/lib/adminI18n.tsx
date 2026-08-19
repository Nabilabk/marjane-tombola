/*
  Admin dashboard i18n — separate from the tombola engine's i18n
  (tombola/i18n.ts, which translates the PUBLIC campaign a visitor plays).
  This one translates the ADMIN'S OWN chrome: sidebar, topbar, every
  workspace page. It's a personal admin-session preference, not tied to
  any one campaign — so it lives in localStorage, not on a Campaign.

  Usage:
    const { t, lang, setLang, dir } = useAdminLang()
    <span>{t('sidebar.dashboard')}</span>

  `t(key)` falls back to the key itself if a translation is missing, so an
  untranslated string is visibly obvious (never a blank) while this rolls
  out across the admin.
*/

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type AdminLang = 'fr' | 'en' | 'ar'

const STORAGE_KEY = 'campaignhub_admin_lang'

type Entry = { fr: string; en: string; ar: string }

// Namespaced dot-keys (area.thing) so two hundred+ strings across dozens of
// admin files stay findable. Grouped by the file/area that owns each key.
const DICT: Record<string, Entry> = {
  // ---- Sidebar (components/Sidebar.tsx) ----
  'sidebar.dashboard': { fr: 'Tableau de bord', en: 'Dashboard', ar: 'لوحة التحكم' },
  'sidebar.campaigns': { fr: 'Campagnes', en: 'Campaigns', ar: 'الحملات' },
  'sidebar.themeEditor': { fr: 'Éditeur de thème', en: 'Theme Editor', ar: 'محرر التصميم' },
  'sidebar.websiteBuilder': { fr: 'Constructeur de site', en: 'Website Builder', ar: 'أداة بناء الموقع' },
  'sidebar.products': { fr: 'Produits', en: 'Products', ar: 'المنتجات' },
  'sidebar.mediaLibrary': { fr: 'Médiathèque', en: 'Media Library', ar: 'مكتبة الوسائط' },
  'sidebar.notifications': { fr: 'Notifications', en: 'Notifications', ar: 'الإشعارات' },
  'sidebar.settings': { fr: 'Paramètres', en: 'Settings', ar: 'الإعدادات' },
  'sidebar.team': { fr: 'Équipe', en: 'Team', ar: 'الفريق' },
  'sidebar.create': { fr: 'Créer un site', en: 'Create website', ar: 'إنشاء موقع' },
  'sidebar.logout': { fr: 'Déconnexion', en: 'Logout', ar: 'تسجيل الخروج' },
  'sidebar.collapse': { fr: 'Réduire', en: 'Collapse', ar: 'طي القائمة' },
  'sidebar.workspace': { fr: 'Espace de travail', en: 'Workspace', ar: 'مساحة العمل' },
  'sidebar.platform': { fr: 'Plateforme', en: 'Platform', ar: 'المنصة' },
  'sidebar.overview': { fr: 'Aperçu', en: 'Overview', ar: 'نظرة عامة' },
  'sidebar.tickets': { fr: 'Tickets scannés', en: 'Tickets scanned', ar: 'التذاكر الممسوحة' },
  'sidebar.participants': { fr: 'Participants', en: 'Participants', ar: 'المشاركون' },
  'sidebar.analytics': { fr: 'Analytique', en: 'Analytics', ar: 'التحليلات' },

  // ---- Topbar (components/Topbar.tsx) ----
  'topbar.search': { fr: 'Rechercher…', en: 'Search…', ar: 'بحث...' },
  'topbar.campaigns': { fr: 'Campagnes', en: 'Campaigns', ar: 'الحملات' },
  'topbar.allCampaigns': { fr: 'Toutes les campagnes', en: 'All campaigns', ar: 'كل الحملات' },
  'topbar.noCampaigns': { fr: 'Aucune campagne pour le moment', en: 'No campaigns yet', ar: 'لا توجد حملات بعد' },
  'topbar.language': { fr: 'Langue', en: 'Language', ar: 'اللغة' },
  'topbar.notifications': { fr: 'Notifications', en: 'Notifications', ar: 'الإشعارات' },
  'topbar.markAllRead': { fr: 'Tout marquer comme lu', en: 'Mark all read', ar: 'وضع علامة مقروء على الكل' },
  'topbar.caughtUp': { fr: 'Vous êtes à jour', en: "You're all caught up", ar: 'أنت على اطلاع بكل شيء' },
  'topbar.viewAllNotifications': { fr: 'Voir toutes les notifications', en: 'View all notifications', ar: 'عرض كل الإشعارات' },
  'topbar.accountSettings': { fr: 'Paramètres du compte', en: 'Account settings', ar: 'إعدادات الحساب' },
  'topbar.signOut': { fr: 'Se déconnecter', en: 'Sign out', ar: 'تسجيل الخروج' },
  'topbar.undo': { fr: 'Annuler', en: 'Undo', ar: 'تراجع' },
  'topbar.redo': { fr: 'Rétablir', en: 'Redo', ar: 'إعادة' },
  'topbar.toggleSidebar': { fr: 'Basculer le menu latéral', en: 'Toggle sidebar', ar: 'تبديل الشريط الجانبي' },
  'topbar.administrator': { fr: 'Administrateur', en: 'Administrator', ar: 'مسؤول' },
  'topbar.adminEmailFallback': { fr: 'admin', en: 'admin', ar: 'admin' },

  // ---- Data table (components/ui/DataTable.tsx) ----
  'dataTable.noMatchFilters': { fr: 'Rien ne correspond à vos filtres actuels.', en: 'Nothing matches your current filters.', ar: 'لا شيء يطابق مرشحاتك الحالية.' },
  'dataTable.rows': { fr: 'lignes', en: 'rows', ar: 'صفوف' },

  // ---- Property panel (components/ui/PropertyPanel.tsx) ----
  'propertyPanel.closePanel': { fr: 'Fermer le panneau', en: 'Close panel', ar: 'إغلاق اللوحة' },

  // ---- Media Picker (components/ui/MediaPicker.tsx) ----
  'mediaPicker.loadError': { fr: "Impossible de charger cette image.", en: 'Could not load that image.', ar: 'تعذّر تحميل هذه الصورة.' },
  'mediaPicker.chooseMedia': { fr: 'Choisir un média', en: 'Choose media', ar: 'اختر وسيطًا' },
  'mediaPicker.removeImage': { fr: "Retirer l'image", en: 'Remove image', ar: 'إزالة الصورة' },
  'mediaPicker.title': { fr: 'Médiathèque', en: 'Media library', ar: 'مكتبة الوسائط' },
  'mediaPicker.desc': { fr: 'Téléversez une image depuis votre ordinateur, ou choisissez un espace réservé.', en: 'Upload an image from your computer, or pick a placeholder.', ar: 'ارفع صورة من جهازك، أو اختر صورة بديلة.' },
  'mediaPicker.clickOrDrag': { fr: 'Cliquez ou déposez un fichier ici', en: 'Click or drag a file here', ar: 'انقر أو أفلت ملفًا هنا' },
  'mediaPicker.fileTypesHint': { fr: "PNG, JPG, SVG jusqu'à {max} Mo", en: 'PNG, JPG, SVG up to {max} MB', ar: 'PNG, JPG, SVG حتى {max} ميغابايت' },
  'mediaPicker.orChoosePlaceholder': { fr: 'Ou choisissez un espace réservé', en: 'Or choose a placeholder', ar: 'أو اختر صورة بديلة' },

  // ---- Login (pages/Login.tsx) ----
  'login.eyebrowAnalytics': { fr: 'Analytique en direct', en: 'Live analytics', ar: 'تحليلات مباشرة' },
  'login.analyticsDesc': { fr: 'Suivez la participation en temps réel', en: 'Track participation in real time', ar: 'تتبّع المشاركة في الوقت الفعلي' },
  'login.instantTheming': { fr: 'Thème instantané', en: 'Instant theming', ar: 'تخصيص فوري للتصميم' },
  'login.themingDesc': { fr: 'Personnalisez chaque écran visuellement', en: 'Customize every screen visually', ar: 'خصّص كل شاشة بصريًا' },
  'login.secure': { fr: 'Sécurisé par conception', en: 'Secure by design', ar: 'آمن بالتصميم' },
  'login.secureDesc': { fr: "Accès à l'espace de travail par rôle", en: 'Role-based workspace access', ar: 'وصول إلى مساحة العمل حسب الدور' },
  'login.heroTitle': { fr: 'Gérez chaque campagne Tombola depuis un seul espace de travail.', en: 'Run every Tombola campaign from one workspace.', ar: 'أدر كل حملة يانصيب من مساحة عمل واحدة.' },
  'login.heroSub': { fr: "Créez des sites, gérez les récompenses, validez les tickets et suivez l'analytique — le tout avec une interface propre et moderne conçue pour votre équipe.", en: 'Create websites, manage rewards, validate tickets and watch analytics — all with a clean, modern interface designed for your team.', ar: 'أنشئ مواقع، أدر الجوائز، تحقق من التذاكر وتابع التحليلات — كل ذلك بواجهة نظيفة وحديثة مصممة لفريقك.' },
  'login.signIn': { fr: 'Connectez-vous à votre espace de travail', en: 'Sign in to your workspace', ar: 'سجّل الدخول إلى مساحة عملك' },
  'login.signInSub': { fr: 'Gérez tous les sites Tombola de votre organisation, depuis un seul endroit.', en: 'Manage every Tombola website your organization runs, from one place.', ar: 'أدر كل مواقع اليانصيب الخاصة بمؤسستك من مكان واحد.' },
  'login.email': { fr: 'E-mail', en: 'Email', ar: 'البريد الإلكتروني' },
  'login.password': { fr: 'Mot de passe', en: 'Password', ar: 'كلمة المرور' },
  'login.submit': { fr: 'Se connecter', en: 'Sign in', ar: 'تسجيل الدخول' },
  'login.errUnreachable': { fr: 'Impossible de joindre le serveur. Veuillez réessayer.', en: 'Could not reach the server. Please try again.', ar: 'تعذّر الوصول إلى الخادم. يرجى المحاولة مرة أخرى.' },
  'login.errInvalid': { fr: 'E-mail ou mot de passe invalide.', en: 'Invalid email or password.', ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' },

  // ---- Platform Dashboard (pages/PlatformDashboard.tsx) ----
  'platform.eyebrow': { fr: 'Plateforme', en: 'Platform', ar: 'المنصة' },
  'platform.title': { fr: 'Sites web', en: 'Websites', ar: 'المواقع' },
  'platform.desc': { fr: 'Tous les sites Tombola qui tournent sur cette plateforme, au même endroit.', en: 'Every Tombola site running on this platform, in one place.', ar: 'كل مواقع اليانصيب العاملة على هذه المنصة، في مكان واحد.' },
  'platform.newWebsite': { fr: 'Nouveau site', en: 'New website', ar: 'موقع جديد' },
  'platform.searchPlaceholder': { fr: 'Rechercher un site…', en: 'Search websites…', ar: 'ابحث عن موقع...' },
  'platform.searchWebsitesCampaigns': { fr: 'Rechercher des sites, campagnes…', en: 'Search websites, campaigns…', ar: 'ابحث عن مواقع، حملات...' },
  'platform.account': { fr: 'Compte', en: 'Account', ar: 'الحساب' },
  'platform.noWebsites': { fr: 'Aucun site pour le moment', en: 'No websites yet', ar: 'لا توجد مواقع بعد' },
  'platform.noWebsitesDesc': { fr: 'Créez votre premier site Tombola pour commencer.', en: 'Create your first Tombola website to get started.', ar: 'أنشئ أول موقع يانصيب لبدء الاستخدام.' },
  'platform.noMatchTitle': { fr: 'Aucun site ne correspond à votre recherche', en: 'No websites match your search', ar: 'لا يوجد موقع مطابق لبحثك' },
  'platform.noMatchDesc': { fr: 'Essayez un autre mot-clé, ou créez un nouveau site Tombola à partir de zéro.', en: 'Try a different keyword, or create a new Tombola website from scratch.', ar: 'جرّب كلمة مفتاحية أخرى، أو أنشئ موقع يانصيب جديدًا من الصفر.' },
  'platform.conversion': { fr: 'Conversion', en: 'Conversion', ar: 'معدل التحويل' },
  'platform.totalParticipants': { fr: 'Total participants', en: 'Total participants', ar: 'إجمالي المشاركين' },
  'platform.customize': { fr: 'Personnaliser', en: 'Customize', ar: 'تخصيص' },
  'platform.websiteActions': { fr: 'Actions du site', en: 'Website actions', ar: 'إجراءات الموقع' },
  'platform.duplicate': { fr: 'Dupliquer', en: 'Duplicate', ar: 'نسخ' },
  'platform.viewAnalytics': { fr: "Voir l'analytique", en: 'View analytics', ar: 'عرض التحليلات' },
  'platform.deleteConfirm': { fr: 'sera supprimé. Cette action est irréversible.', en: 'will be deleted. This cannot be undone.', ar: 'سيُحذف. لا يمكن التراجع عن هذا الإجراء.' },
  'platform.statusPublished': { fr: 'Publié', en: 'Published', ar: 'منشور' },
  'platform.statusDraft': { fr: 'Brouillon', en: 'Draft', ar: 'مسودة' },
  'platform.statusMaintenance': { fr: 'Maintenance', en: 'Maintenance', ar: 'صيانة' },

  // ---- Team (pages/Team.tsx) ----
  'team.title': { fr: 'Équipe', en: 'Team', ar: 'الفريق' },
  'team.desc': { fr: 'Les administrateurs de plateforme gèrent tout. Les administrateurs de tombola peuvent se connecter et modifier exactement une tombola assignée.', en: 'Platform admins manage everything. Tombola admins can sign in and edit exactly one assigned tombola.', ar: 'يدير مسؤولو المنصة كل شيء. يمكن لمسؤولي اليانصيب تسجيل الدخول وتعديل يانصيب واحد مخصص لهم فقط.' },
  'team.newAccount': { fr: 'Nouveau compte', en: 'New account', ar: 'حساب جديد' },
  'team.editAccount': { fr: 'Modifier le compte', en: 'Edit account', ar: 'تعديل الحساب' },
  'team.editDesc': { fr: "Modifiez le rôle, la tombola assignée ou le statut de ce compte.", en: "Update this account's role, assigned tombola, or status.", ar: 'حدّث دور هذا الحساب أو اليانصيب المخصص له أو حالته.' },
  'team.createDesc': { fr: 'Créez une connexion pour un administrateur de plateforme ou un administrateur de tombola unique.', en: 'Create a login for a platform admin or a single-tombola admin.', ar: 'أنشئ حساب دخول لمسؤول منصة أو لمسؤول يانصيب واحد.' },
  'team.name': { fr: 'Nom', en: 'Name', ar: 'الاسم' },
  'team.email': { fr: 'E-mail', en: 'Email', ar: 'البريد الإلكتروني' },
  'team.newPassword': { fr: 'Nouveau mot de passe', en: 'New password', ar: 'كلمة مرور جديدة' },
  'team.password': { fr: 'Mot de passe', en: 'Password', ar: 'كلمة المرور' },
  'team.passwordHint': { fr: 'Laissez vide pour conserver le mot de passe actuel.', en: 'Leave blank to keep the current password.', ar: 'اتركه فارغًا للاحتفاظ بكلمة المرور الحالية.' },
  'team.passwordMin': { fr: 'Au moins 6 caractères.', en: 'At least 6 characters.', ar: 'على الأقل 6 أحرف.' },
  'team.role': { fr: 'Rôle', en: 'Role', ar: 'الدور' },
  'team.roleTombola': { fr: 'Administrateur de tombola — une seule tombola', en: 'Tombola admin — one tombola only', ar: 'مسؤول يانصيب — يانصيب واحد فقط' },
  'team.rolePlatform': { fr: 'Administrateur de plateforme — tout', en: 'Platform admin — everything', ar: 'مسؤول منصة — كل شيء' },
  'team.assignedTombola': { fr: 'Tombola assignée', en: 'Assigned tombola', ar: 'اليانصيب المخصص' },
  'team.selectTombola': { fr: 'Sélectionnez une tombola…', en: 'Select a tombola…', ar: 'اختر يانصيبًا...' },
  'team.status': { fr: 'Statut', en: 'Status', ar: 'الحالة' },
  'team.active': { fr: 'Actif', en: 'Active', ar: 'نشط' },
  'team.disabled': { fr: 'Désactivé', en: 'Disabled', ar: 'معطّل' },
  'team.cancel': { fr: 'Annuler', en: 'Cancel', ar: 'إلغاء' },
  'team.saveChanges': { fr: 'Enregistrer les modifications', en: 'Save changes', ar: 'حفظ التغييرات' },
  'team.createAccount': { fr: 'Créer le compte', en: 'Create account', ar: 'إنشاء الحساب' },
  'team.platformAdmin': { fr: 'Administrateur de plateforme', en: 'Platform admin', ar: 'مسؤول منصة' },
  'team.tombolaAdmin': { fr: 'Administrateur de tombola', en: 'Tombola admin', ar: 'مسؤول يانصيب' },
  'team.allTombolas': { fr: 'Toutes les tombolas', en: 'All tombolas', ar: 'كل اليانصيبات' },
  'team.edit': { fr: 'Modifier', en: 'Edit', ar: 'تعديل' },
  'team.delete': { fr: 'Supprimer', en: 'Delete', ar: 'حذف' },
  'team.noAccounts': { fr: 'Aucun compte pour le moment', en: 'No accounts yet', ar: 'لا توجد حسابات بعد' },
  'team.noAccountsDesc': { fr: 'Créez le premier compte administrateur de tombola pour déléguer la gestion quotidienne.', en: "Create the first tombola admin account to hand off day-to-day management of a tombola.", ar: 'أنشئ أول حساب مسؤول يانصيب لتفويض الإدارة اليومية.' },
  'team.deleteTitle': { fr: 'Supprimer le compte ?', en: 'Delete account?', ar: 'حذف الحساب؟' },
  'team.deletePermanently': { fr: 'Supprimer définitivement', en: 'Delete permanently', ar: 'حذف نهائي' },
  'team.colName': { fr: 'Nom', en: 'Name', ar: 'الاسم' },
  'team.colRole': { fr: 'Rôle', en: 'Role', ar: 'الدور' },
  'team.colTombola': { fr: 'Tombola', en: 'Tombola', ar: 'اليانصيب' },
  'team.colStatus': { fr: 'Statut', en: 'Status', ar: 'الحالة' },
  'team.errNameEmail': { fr: 'Le nom et l’e-mail sont requis.', en: 'Name and email are required.', ar: 'الاسم والبريد الإلكتروني مطلوبان.' },
  'team.errPickTombola': { fr: 'Choisissez la tombola que ce compte peut gérer.', en: 'Pick the one tombola this account may manage.', ar: 'اختر اليانصيب الذي يمكن لهذا الحساب إدارته.' },
  'team.errPasswordMin': { fr: 'Le mot de passe doit contenir au moins 6 caractères.', en: 'Password must be at least 6 characters.', ar: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' },
  'team.errLoadAccounts': { fr: 'Échec du chargement des comptes', en: 'Failed to load accounts', ar: 'فشل تحميل الحسابات' },
  'team.errGeneric': { fr: 'Une erreur est survenue.', en: 'Something went wrong.', ar: 'حدث خطأ ما.' },
  'team.errDelete': { fr: 'Échec de la suppression du compte.', en: 'Failed to delete account.', ar: 'فشل حذف الحساب.' },
  'team.deleteConfirm': { fr: 'perdra l’accès immédiatement. Cette action est irréversible.', en: 'will lose access immediately. This cannot be undone.', ar: 'سيفقد الوصول فورًا. لا يمكن التراجع عن هذا الإجراء.' },

  // ---- Settings (pages/workspace/Settings.tsx) ----
  'settings.title': { fr: 'Paramètres', en: 'Settings', ar: 'الإعدادات' },
  'settings.general': { fr: 'Général', en: 'General', ar: 'عام' },
  'settings.websiteName': { fr: 'Nom du site', en: 'Website name', ar: 'اسم الموقع' },
  'settings.domain': { fr: 'Domaine', en: 'Domain', ar: 'النطاق' },
  'settings.defaultLanguage': { fr: 'Langue par défaut', en: 'Default language', ar: 'اللغة الافتراضية' },
  'settings.french': { fr: 'Français', en: 'French', ar: 'الفرنسية' },
  'settings.english': { fr: 'Anglais', en: 'English', ar: 'الإنجليزية' },
  'settings.arabic': { fr: 'Arabe', en: 'Arabic', ar: 'العربية' },
  'settings.save': { fr: 'Enregistrer', en: 'Save', ar: 'حفظ' },
  'settings.dangerZone': { fr: 'Zone de danger', en: 'Danger zone', ar: 'منطقة الخطر' },
  'settings.deleteWebsite': { fr: 'Supprimer le site', en: 'Delete website', ar: 'حذف الموقع' },
  'settings.desc': { fr: 'Configuration de ce site et de cet espace de travail.', en: 'Configuration for this website and workspace.', ar: 'إعدادات هذا الموقع ومساحة العمل.' },
  'settings.tabGeneral': { fr: 'Général', en: 'General', ar: 'عام' },
  'settings.tabSecurity': { fr: 'Sécurité', en: 'Security', ar: 'الأمان' },
  'settings.tabBrand': { fr: 'Marque', en: 'Brand', ar: 'العلامة التجارية' },
  'settings.tabApi': { fr: 'API', en: 'API', ar: 'واجهة برمجة التطبيقات' },
  'settings.tabNotifications': { fr: 'Notifications', en: 'Notifications', ar: 'الإشعارات' },
  'settings.tabBackup': { fr: 'Sauvegarde', en: 'Backup', ar: 'النسخ الاحتياطي' },
  'settings.maintenanceMode': { fr: 'Mode maintenance', en: 'Maintenance mode', ar: 'وضع الصيانة' },
  'settings.maintenanceDesc': { fr: "Suspendez temporairement le jeu pour les participants — indépendamment du statut de la campagne, donc le désactiver reprend exactement là où il s'était arrêté. Appliqué côté serveur, pas seulement un message côté client.", en: "Temporarily pause the game for participants — independent of the campaign's status, so toggling it off resumes exactly where it left off. Backend-enforced, not just a frontend message.", ar: 'أوقف اللعبة مؤقتًا للمشاركين — بشكل مستقل عن حالة الحملة، بحيث يستأنف تعطيلها من حيث توقفت تمامًا. مُطبَّق من جانب الخادم، وليس مجرد رسالة على الواجهة.' },
  'settings.schedule': { fr: 'Calendrier', en: 'Schedule', ar: 'الجدول الزمني' },
  'settings.scheduleDesc': { fr: 'Après la date de fin, la tombola cesse automatiquement d\'accepter les scans/parties et les participants voient le message "campagne terminée" — aucun archivage manuel requis.', en: 'Past the end date, the tombola automatically stops accepting scans/plays and participants see the "campaign ended" message — no manual archiving needed.', ar: 'بعد تاريخ الانتهاء، يتوقف اليانصيب تلقائيًا عن قبول عمليات المسح/اللعب ويرى المشاركون رسالة "انتهت الحملة" — دون الحاجة لأرشفة يدوية.' },
  'settings.startDate': { fr: 'Date de début', en: 'Start date', ar: 'تاريخ البدء' },
  'settings.startTime': { fr: 'Heure de début', en: 'Start time', ar: 'وقت البدء' },
  'settings.endDate': { fr: 'Date de fin', en: 'End date', ar: 'تاريخ الانتهاء' },
  'settings.endTime': { fr: 'Heure de fin', en: 'End time', ar: 'وقت الانتهاء' },
  'settings.saveSchedule': { fr: 'Enregistrer le calendrier', en: 'Save schedule', ar: 'حفظ الجدول الزمني' },
  'settings.saveChanges': { fr: 'Enregistrer les modifications', en: 'Save changes', ar: 'حفظ التغييرات' },
  'settings.twoFactor': { fr: 'Authentification à deux facteurs', en: 'Two-factor authentication', ar: 'المصادقة الثنائية' },
  'settings.twoFactorDesc': { fr: 'Ajoutez une couche de sécurité supplémentaire à votre compte.', en: 'Add an extra layer of security to your account.', ar: 'أضف طبقة أمان إضافية لحسابك.' },
  'settings.changePassword': { fr: 'Changer le mot de passe', en: 'Change password', ar: 'تغيير كلمة المرور' },
  'settings.lastChanged': { fr: 'Modifié il y a 2 mois.', en: 'Last changed 2 months ago.', ar: 'آخر تغيير منذ شهرين.' },
  'settings.updatePassword': { fr: 'Mettre à jour le mot de passe', en: 'Update password', ar: 'تحديث كلمة المرور' },
  'settings.primaryColor': { fr: 'Couleur primaire', en: 'Primary color', ar: 'اللون الأساسي' },
  'settings.secondaryColor': { fr: 'Couleur secondaire', en: 'Secondary color', ar: 'اللون الثانوي' },
  'settings.accentColor': { fr: "Couleur d'accent", en: 'Accent color', ar: 'لون التمييز' },
  'settings.logoUrl': { fr: 'URL du logo', en: 'Logo URL', ar: 'رابط الشعار' },
  'settings.font': { fr: 'Police', en: 'Font', ar: 'الخط' },
  'settings.fontDisplay': { fr: 'Display — caractériel, audacieux', en: 'Display — characterful, bold', ar: 'Display — جريء ومميز' },
  'settings.fontClassic': { fr: 'Classic — accents serif', en: 'Classic — serif accents', ar: 'Classic — بلمسات كلاسيكية' },
  'settings.fontRounded': { fr: 'Rounded — amical, doux', en: 'Rounded — friendly, soft', ar: 'Rounded — ودود وناعم' },
  'settings.apiKeys': { fr: 'Clés API', en: 'API keys', ar: 'مفاتيح API' },
  'settings.apiKeysDesc': { fr: 'Ces clés permettent aux services externes de lire les données de campagne. Gardez-les secrètes.', en: 'These keys allow external services to read campaign data. Keep them secret.', ar: 'تسمح هذه المفاتيح للخدمات الخارجية بقراءة بيانات الحملة. حافظ على سريتها.' },
  'settings.liveKey': { fr: 'Clé live · lecture / écriture', en: 'Live key · read / write', ar: 'مفتاح مباشر · قراءة / كتابة' },
  'settings.testKey': { fr: 'Clé de test · lecture seule', en: 'Test key · read only', ar: 'مفتاح تجريبي · قراءة فقط' },
  'settings.copied': { fr: 'Copié', en: 'Copied', ar: 'تم النسخ' },
  'settings.copy': { fr: 'Copier', en: 'Copy', ar: 'نسخ' },
  'settings.rotate': { fr: 'Régénérer', en: 'Rotate', ar: 'تجديد' },
  'settings.notifPrefs': { fr: 'Préférences de notification', en: 'Notification preferences', ar: 'تفضيلات الإشعارات' },
  'settings.notifNewParticipant': { fr: 'Nouveau participant', en: 'New participant', ar: 'مشارك جديد' },
  'settings.notifNewParticipantDesc': { fr: "Quand un participant termine son inscription.", en: 'When a participant completes registration.', ar: 'عند إتمام مشارك عملية التسجيل.' },
  'settings.notifNewWinner': { fr: 'Nouveau gagnant', en: 'New winner', ar: 'فائز جديد' },
  'settings.notifNewWinnerDesc': { fr: 'Quand quelqu\'un gagne une récompense.', en: 'When someone wins a reward.', ar: 'عندما يفوز أحدهم بجائزة.' },
  'settings.notifInvalidTicket': { fr: 'Ticket invalide', en: 'Invalid ticket', ar: 'تذكرة غير صالحة' },
  'settings.notifInvalidTicketDesc': { fr: 'Quand un ticket est rejeté.', en: 'When a receipt is rejected.', ar: 'عند رفض إيصال.' },
  'settings.notifLowStock': { fr: 'Stock de récompenses faible', en: 'Low reward stock', ar: 'مخزون الجوائز منخفض' },
  'settings.notifLowStockDesc': { fr: "Quand une récompense passe sous 20 unités.", en: 'When a reward drops below 20 units.', ar: 'عندما تنخفض جائزة إلى أقل من 20 وحدة.' },
  'settings.notifCampaignFinished': { fr: 'Campagne terminée', en: 'Campaign finished', ar: 'انتهت الحملة' },
  'settings.notifCampaignFinishedDesc': { fr: 'Quand une campagne atteint sa date de fin.', en: 'When a campaign reaches its end date.', ar: 'عندما تصل الحملة إلى تاريخ انتهائها.' },
  'settings.configuration': { fr: 'Configuration', en: 'Configuration', ar: 'الإعدادات' },
  'settings.configDesc': { fr: "Exportez le thème et la structure de ce site, ou importez une configuration enregistrée.", en: "Export this website's theme and structure, or import a saved configuration.", ar: 'صدّر تصميم هذا الموقع وبنيته، أو استورد إعدادات محفوظة.' },
  'settings.exportConfig': { fr: 'Exporter la configuration', en: 'Export configuration', ar: 'تصدير الإعدادات' },
  'settings.importConfig': { fr: 'Importer la configuration', en: 'Import configuration', ar: 'استيراد الإعدادات' },
  'settings.dangerZoneDesc': { fr: 'La suppression d\'un site supprime toutes les campagnes, participants et fichiers.', en: 'Deleting a website removes all campaigns, participants and assets.', ar: 'حذف الموقع يزيل جميع الحملات والمشاركين والملفات.' },
  'settings.deleteWebsiteTitle': { fr: 'Supprimer le site ?', en: 'Delete website?', ar: 'حذف الموقع؟' },
  'settings.deleteWebsiteConfirm': { fr: 'sera définitivement supprimé, ainsi que toutes ses données. Cette action est irréversible.', en: 'and all of its data. This action cannot be undone.', ar: 'وجميع بياناته بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.' },
  'settings.deleteWebsitePrefix': { fr: 'Cette action supprimera définitivement', en: 'This will permanently delete', ar: 'سيؤدي هذا إلى حذف' },

  // ---- Theme Editor (pages/workspace/ThemeEditor.tsx) ----
  'themeEditor.colors': { fr: 'Couleurs', en: 'Colors', ar: 'الألوان' },
  'themeEditor.typography': { fr: 'Typographie', en: 'Typography', ar: 'الطباعة' },
  'themeEditor.buttons': { fr: 'Boutons', en: 'Buttons', ar: 'الأزرار' },
  'themeEditor.layout': { fr: 'Disposition', en: 'Layout', ar: 'التخطيط' },
  'themeEditor.images': { fr: 'Images', en: 'Images', ar: 'الصور' },
  'themeEditor.animations': { fr: 'Animations', en: 'Animations', ar: 'الرسوم المتحركة' },
  'themeEditor.customize': { fr: 'Personnaliser', en: 'Customize', ar: 'تخصيص' },
  'themeEditor.clickToEditHint': { fr: 'Cliquez sur un texte surligné dans l\'aperçu pour le modifier directement.', en: 'Click any highlighted text in the preview to edit it directly.', ar: 'انقر على أي نص مميز في المعاينة لتعديله مباشرة.' },
  'themeEditor.livePreview': { fr: 'Aperçu en direct', en: 'Live preview', ar: 'معاينة مباشرة' },
  'themeEditor.light': { fr: 'Clair', en: 'Light', ar: 'فاتح' },
  'themeEditor.dark': { fr: 'Sombre', en: 'Dark', ar: 'داكن' },
  'themeEditor.fontFamily': { fr: 'Police', en: 'Font family', ar: 'نوع الخط' },
  'themeEditor.fontFamilyHint': { fr: 'S\'applique aux titres et au corps de texte sur tout le site.', en: 'Applies to headings and body across the website.', ar: 'ينطبق على العناوين والنصوص في كل الموقع.' },
  'themeEditor.preview': { fr: 'Aperçu', en: 'Preview', ar: 'معاينة' },
  'themeEditor.typographyHint': { fr: 'Changez d\'écran ci-dessus et cliquez sur un texte surligné dans l\'aperçu pour modifier son contenu sur place — aucun éditeur séparé n\'est nécessaire.', en: "Switch screens above and click any highlighted text in the preview to edit that screen's copy in place — no separate editor needed.", ar: 'بدّل الشاشات أعلاه وانقر على أي نص مميز في المعاينة لتعديل محتوى تلك الشاشة مباشرة — دون الحاجة إلى محرر منفصل.' },
  'themeEditor.buttonStyle': { fr: 'Style de bouton', en: 'Button style', ar: 'نمط الزر' },
  'themeEditor.styleSolid': { fr: 'Plein', en: 'Solid', ar: 'مصمت' },
  'themeEditor.styleOutline': { fr: 'Contour', en: 'Outline', ar: 'محدد' },
  'themeEditor.styleSoft': { fr: 'Doux', en: 'Soft', ar: 'ناعم' },
  'themeEditor.buttonSize': { fr: 'Taille des boutons', en: 'Button size', ar: 'حجم الزر' },
  'themeEditor.sizeSmall': { fr: 'Petit', en: 'Small', ar: 'صغير' },
  'themeEditor.sizeMedium': { fr: 'Moyen', en: 'Medium', ar: 'متوسط' },
  'themeEditor.sizeLarge': { fr: 'Grand', en: 'Large', ar: 'كبير' },
  'themeEditor.cornerRadius': { fr: 'Arrondi des angles', en: 'Corner radius', ar: 'انحناء الزوايا' },
  'themeEditor.spacing': { fr: 'Espacement', en: 'Spacing', ar: 'التباعد' },
  'themeEditor.spacingHint': { fr: 'Densité des espaces blancs sur les écrans.', en: 'Whitespace density across screens.', ar: 'كثافة المسافات البيضاء عبر الشاشات.' },
  'themeEditor.spacingCompact': { fr: 'Compact', en: 'Compact', ar: 'مضغوط' },
  'themeEditor.spacingComfortable': { fr: 'Confortable', en: 'Comfortable', ar: 'مريح' },
  'themeEditor.spacingSpacious': { fr: 'Spacieux', en: 'Spacious', ar: 'واسع' },
  'themeEditor.shadowIntensity': { fr: 'Intensité de l\'ombre', en: 'Shadow intensity', ar: 'شدة الظل' },
  'themeEditor.shadowNone': { fr: 'Aucune — plat', en: 'None — flat', ar: 'بلا — مسطّح' },
  'themeEditor.shadowStrong': { fr: 'Forte', en: 'Strong', ar: 'قوي' },
  'themeEditor.borderWidth': { fr: 'Épaisseur de bordure', en: 'Border width', ar: 'سمك الحدود' },
  'themeEditor.baseCornerRadius': { fr: 'Arrondi de base', en: 'Base corner radius', ar: 'انحناء الزوايا الأساسي' },
  'themeEditor.backgroundImage': { fr: 'Image de fond', en: 'Background image', ar: 'صورة الخلفية' },
  'themeEditor.heroImage': { fr: 'Image principale', en: 'Hero image', ar: 'الصورة الرئيسية' },
  'themeEditor.favicon': { fr: 'Favicon', en: 'Favicon', ar: 'أيقونة الموقع' },
  'themeEditor.brandImages': { fr: 'Images de marque', en: 'Brand images', ar: 'صور العلامة التجارية' },
  'themeEditor.motionLevel': { fr: 'Niveau de mouvement', en: 'Motion level', ar: 'مستوى الحركة' },
  'themeEditor.motionLevelHint': { fr: 'Contrôle les transitions et micro-interactions.', en: 'Controls transitions and micro-interactions.', ar: 'يتحكم في الانتقالات والتفاعلات الدقيقة.' },
  'themeEditor.motionNone': { fr: 'Aucun — transitions instantanées', en: 'None — instant transitions', ar: 'بلا — انتقالات فورية' },
  'themeEditor.motionSubtle': { fr: 'Subtil — recommandé', en: 'Subtle — recommended', ar: 'خفيف — موصى به' },
  'themeEditor.motionLively': { fr: 'Animé — rebond et confettis', en: 'Lively — bounce & confetti', ar: 'حيوي — ارتداد وقصاصات ورقية' },

  // ---- Website Builder (pages/workspace/builder/*) ----
  'builder.title': { fr: 'Constructeur de site', en: 'Website Builder', ar: 'أداة بناء الموقع' },
  'builder.desc': { fr: "Parcourez le site réel, écran par écran — le contenu et la typographie s'éditent depuis l'Éditeur de thème.", en: 'Step through the real, live site screen by screen — copy and typography are edited from the Theme Editor.', ar: 'تصفّح الموقع الحقيقي شاشة بشاشة — يُحرَّر المحتوى والخط من محرر التصميم.' },
  'builder.tabScreens': { fr: 'Écrans', en: 'Screens', ar: 'الشاشات' },
  'builder.tabPrizes': { fr: 'Prix', en: 'Prizes', ar: 'الجوائز' },
  'builder.tabLanguages': { fr: 'Langues', en: 'Languages', ar: 'اللغات' },
  'builder.editCopy': { fr: 'Modifier le texte et les polices', en: 'Editing copy & fonts', ar: 'تعديل النصوص والخطوط' },
  'builder.editCopyDesc': { fr: "L'édition du texte cliquable et le sélecteur de police se trouvent désormais dans l'onglet Typographie de l'Éditeur de thème.", en: "Click-to-edit text and the font picker both live in the Theme Editor's Typography tab now.", ar: 'يوجد الآن النص القابل للتعديل ومحدد الخط في علامة تبويب الطباعة بمحرر التصميم.' },
  'builder.openThemeEditor': { fr: "Ouvrir l'Éditeur de thème", en: 'Open Theme Editor', ar: 'فتح محرر التصميم' },
  'builder.editTranslations': { fr: 'Modifier toutes les traductions', en: 'Edit every translation', ar: 'تعديل كل الترجمات' },
  'builder.screensAlwaysOrder': { fr: "Les écrans se jouent toujours dans cet ordre — chaque étape dépend du résultat de la précédente.", en: 'Screens always play in this order — each step depends on the result of the one before it.', ar: 'تُعرض الشاشات دائمًا بهذا الترتيب — تعتمد كل خطوة على نتيجة السابقة.' },
  'builder.gameType': { fr: 'Type de jeu', en: 'Game type', ar: 'نوع اللعبة' },
  'builder.gameTypeDesc': { fr: 'Le mécanisme de tombola joué sur le site — change les écrans réels du site en direct.', en: 'Which tombola mechanic the site plays — changes the actual screens on the live website.', ar: 'آلية اليانصيب المشغّلة على الموقع — تغيّر الشاشات الفعلية على الموقع المباشر.' },
  'builder.eligibilityThreshold': { fr: "Seuil d'éligibilité", en: 'Eligibility threshold', ar: 'الحد الأدنى للأهلية' },
  'builder.eligibilityDesc': { fr: 'Montant minimum du ticket requis pour participer.', en: 'Minimum receipt amount required to participate.', ar: 'الحد الأدنى لمبلغ الإيصال المطلوب للمشاركة.' },
  'builder.saveOdds': { fr: 'Enregistrer les probabilités sur le site en direct', en: 'Save odds to live site', ar: 'حفظ الاحتمالات على الموقع المباشر' },

  // ---- Prizes tab (pages/workspace/builder/PrizesTab.tsx) ----
  'prizes.noCampaign': { fr: 'Aucune campagne', en: 'No campaign', ar: 'لا توجد حملة' },
  'prizes.noCampaignDesc': { fr: 'Créez une campagne dans Campagnes, puis revenez ici pour définir les prix et le seuil d\'éligibilité.', en: 'Create a campaign under Campaigns, then come back here to set prizes and the eligibility threshold.', ar: 'أنشئ حملة ضمن الحملات، ثم عد إلى هنا لتحديد الجوائز وحد الأهلية.' },
  'prizes.gameCards': { fr: 'Dés + Cartes', en: 'Dice + Cards', ar: 'النرد + البطاقات' },
  'prizes.gameCardsDesc': { fr: 'Lancez un dé, retournez ce nombre de cartes.', en: 'Roll a die, flip that many cards.', ar: 'ارمِ نردًا، ثم اقلب هذا العدد من البطاقات.' },
  'prizes.gameWheel': { fr: 'Roue', en: 'Wheel', ar: 'العجلة' },
  'prizes.gameWheelDesc': { fr: 'Un tour détermine le prix.', en: 'One spin decides the prize.', ar: 'دورة واحدة تحدد الجائزة.' },
  'prizes.gameScratch': { fr: 'Carte à gratter', en: 'Scratch Card', ar: 'بطاقة الكشط' },
  'prizes.gameScratchDesc': { fr: 'Grattez une carte 3D pour révéler le prix.', en: 'Scratch a 3D card to reveal the prize.', ar: 'اكشط بطاقة ثلاثية الأبعاد للكشف عن الجائزة.' },
  'prizes.scratchDesignTitle': { fr: 'Design de la carte à gratter', en: 'Scratch card design', ar: 'تصميم بطاقة الكشط' },
  'prizes.scratchDesignDesc': { fr: 'Image de marque, texture du film et animation de révélation pour la carte 3D — avec aperçu en direct.', en: 'Branding, foil texture and reveal animation for the 3D scratch card — with a live preview.', ar: 'العلامة التجارية وملمس الطبقة العاكسة ورسوم الكشف للبطاقة ثلاثية الأبعاد — مع معاينة مباشرة.' },
  'prizes.wheelDesignTitle': { fr: 'Design de la roue', en: 'Wheel design', ar: 'تصميم العجلة' },
  'prizes.wheelDesignDesc': { fr: 'Image de marque, style du cadran/pointeur et sensation de rotation pour la roue de prix — avec aperçu en direct.', en: 'Branding, rim/pointer style and spin feel for the prize wheel — with a live preview.', ar: 'العلامة التجارية ونمط الإطار/المؤشر وإحساس الدوران لعجلة الجوائز — مع معاينة مباشرة.' },
  'prizes.cardsDesignTitle': { fr: 'Design Dés + Cartes', en: 'Dice + Cards design', ar: 'تصميم النرد + البطاقات' },
  'prizes.cardsDesignDesc': { fr: 'Image de marque, motif du dos des cartes et style des dés pour le parcours dé + carte — avec aperçu en direct.', en: 'Branding, card-back pattern and dice style for the dice roll + card flip flow — with a live preview.', ar: 'العلامة التجارية ونمط ظهر البطاقة وشكل النرد لمسار رمي النرد وقلب البطاقة — مع معاينة مباشرة.' },
  'prizes.wheelSegments': { fr: 'Segments de la roue', en: 'Wheel segments', ar: 'مقاطع العجلة' },
  'prizes.scratchPrizes': { fr: 'Prix carte à gratter', en: 'Scratch prizes', ar: 'جوائز بطاقة الكشط' },
  'prizes.cardPrizes': { fr: 'Prix des cartes', en: 'Card prizes', ar: 'جوائز البطاقات' },
  'prizes.syncingOdds': { fr: 'Synchronisation des probabilités en direct…', en: 'Syncing live odds…', ar: 'جارٍ مزامنة الاحتمالات المباشرة...' },
  'prizes.prizeListDesc': { fr: "Valeur en MAD, créditée sur la carte de fidélité du participant, et la probabilité de l'obtenir. Utilisez 0 pour un segment « pas de prix » — donnez-lui la majeure partie du poids et gardez les segments à forte valeur rares (ex. 1 %).", en: "Value in MAD, credited to the participant's loyalty card, and the odds of landing on it. Use 0 for a \"no prize\" segment — give it most of the weight and keep high-value segments rare (e.g. 1%).", ar: 'القيمة بالدرهم، تُضاف إلى بطاقة ولاء المشارك، واحتمال الحصول عليها. استخدم 0 لمقطع "لا جائزة" — امنحه معظم الوزن واجعل المقاطع عالية القيمة نادرة (مثلاً 1%).' },
  'prizes.noPrize': { fr: 'pas de prix', en: 'no prize', ar: 'لا جائزة' },
  'prizes.noSegments': { fr: 'Aucun segment pour le moment. Ajoutez-en un ci-dessous.', en: 'No segments yet. Add one below.', ar: 'لا توجد مقاطع بعد. أضف واحدًا أدناه.' },
  'prizes.addSegment': { fr: 'Ajouter un segment', en: 'Add segment', ar: 'إضافة مقطع' },
  'prizes.totalProbability': { fr: 'Probabilité totale :', en: 'Total probability:', ar: 'إجمالي الاحتمال:' },
  'prizes.shouldTotal100': { fr: 'devrait totaliser 100 %', en: 'should total 100%', ar: 'يجب أن يبلغ المجموع 100%' },
  'prizes.saving': { fr: 'Enregistrement…', en: 'Saving…', ar: 'جارٍ الحفظ...' },
  'prizes.saveOddsHint': { fr: 'Envoie ces probabilités au tirage en direct (Cartes/Coupes les récupèrent depuis le serveur ; la Roue les utilise déjà localement).', en: 'Pushes these odds to the live draw (Cards/Cups pull from the backend; Wheel already uses them locally).', ar: 'يرسل هذه الاحتمالات إلى السحب المباشر (البطاقات/الكؤوس تجلبها من الخادم؛ العجلة تستخدمها محليًا بالفعل).' },
  'prizes.saved': { fr: 'Enregistré', en: 'Saved', ar: 'تم الحفظ' },
  'prizes.saveOddsError': { fr: "Échec de l'enregistrement des probabilités.", en: 'Failed to save prize odds.', ar: 'فشل حفظ احتمالات الجوائز.' },

  // ---- Wheel Editor (components/wheel/WheelEditor.tsx) ----
  'wheelEditor.branding': { fr: 'Image de marque de la roue', en: 'Wheel branding', ar: 'هوية العجلة' },
  'wheelEditor.brandingDesc': { fr: "Les mêmes couleurs de marque et le même logo que le reste de la campagne — les modifier ici met à jour tout le site, pas seulement cette roue. Le logo apparaît au centre de la roue.", en: "Same brand colors and logo the rest of the campaign uses — editing them here updates the whole site, not just this wheel. The logo shows in the wheel's center hub.", ar: 'نفس ألوان العلامة التجارية والشعار المستخدمين في بقية الحملة — تعديلهما هنا يُحدّث الموقع بأكمله، وليس هذه العجلة فقط. يظهر الشعار في مركز العجلة.' },
  'wheelEditor.primary': { fr: 'Primaire', en: 'Primary', ar: 'أساسي' },
  'wheelEditor.secondary': { fr: 'Secondaire', en: 'Secondary', ar: 'ثانوي' },
  'wheelEditor.accent': { fr: 'Accent', en: 'Accent', ar: 'لون التمييز' },
  'wheelEditor.logo': { fr: 'Logo', en: 'Logo', ar: 'الشعار' },
  'wheelEditor.logoHint': { fr: 'Affiché dans le moyeu de la roue.', en: "Shown in the wheel's hub.", ar: 'يظهر في مركز العجلة.' },
  'wheelEditor.design': { fr: 'Design de la roue', en: 'Wheel design', ar: 'تصميم العجلة' },
  'wheelEditor.designDesc': { fr: "Profondeur et ombre du disque, et l'arrière-plan derrière tout l'écran.", en: 'Depth and shadow of the disc, and the background behind the whole screen.', ar: 'عمق وظل القرص، والخلفية خلف الشاشة بأكملها.' },
  'wheelEditor.shadow': { fr: 'Ombre', en: 'Shadow', ar: 'الظل' },
  'wheelEditor.backgroundImage': { fr: 'Image de fond', en: 'Background image', ar: 'صورة الخلفية' },
  'wheelEditor.backgroundImageHint': { fr: "Facultatif — derrière tout l'écran, pas seulement la roue.", en: 'Optional — behind the whole screen, not just the wheel.', ar: 'اختياري — خلف الشاشة بأكملها، وليس العجلة فقط.' },
  'wheelEditor.mechanic': { fr: 'Mécanique de la roue', en: 'Wheel mechanic', ar: 'آلية العجلة' },
  'wheelEditor.mechanicDesc': { fr: "L'apparence du cadran/pointeur et la sensation de la rotation lorsqu'elle ralentit jusqu'au résultat.", en: "The rim/pointer's look and how the spin itself feels when it decelerates into a result.", ar: 'مظهر الإطار/المؤشر وإحساس الدوران عند تباطؤه للوصول إلى النتيجة.' },
  'wheelEditor.rimStyle': { fr: 'Style du cadran', en: 'Rim style', ar: 'نمط الإطار' },
  'wheelEditor.pointerStyle': { fr: 'Style du pointeur', en: 'Pointer style', ar: 'نمط المؤشر' },
  'wheelEditor.spinStyle': { fr: 'Style de rotation', en: 'Spin style', ar: 'نمط الدوران' },
  'wheelEditor.rimClassic': { fr: 'Or classique', en: 'Classic gold', ar: 'ذهبي كلاسيكي' },
  'wheelEditor.minimal': { fr: 'Minimal', en: 'Minimal', ar: 'بسيط' },
  'wheelEditor.rimNeon': { fr: 'Lueur néon', en: 'Neon glow', ar: 'وهج نيون' },
  'wheelEditor.pointerClassic': { fr: 'Triangle classique', en: 'Classic triangle', ar: 'مثلث كلاسيكي' },
  'wheelEditor.pointerArrow': { fr: 'Flèche fine', en: 'Slim arrow', ar: 'سهم رفيع' },
  'wheelEditor.pointerRibbon': { fr: 'Fanion ruban', en: 'Ribbon flag', ar: 'علم شريطي' },
  'wheelEditor.spinSmooth': { fr: 'Fluide', en: 'Smooth', ar: 'سلس' },
  'wheelEditor.spinBouncy': { fr: 'Rebondissant', en: 'Bouncy', ar: 'مرن' },
  'wheelEditor.spinMechanical': { fr: 'Mécanique', en: 'Mechanical', ar: 'ميكانيكي' },
  'wheelEditor.spinning': { fr: 'Rotation…', en: 'Spinning…', ar: 'جارٍ الدوران...' },
  'wheelEditor.previewSpin': { fr: 'Aperçu de la rotation', en: 'Preview spin', ar: 'معاينة الدوران' },
  'wheelEditor.previewHint': { fr: 'Aperçu en direct — tourne avec les réglages ci-dessus, se réinitialise à chaque changement.', en: 'Live preview — spins with the settings above, resets when you change one.', ar: 'معاينة مباشرة — تدور وفق الإعدادات أعلاه، وتُعاد عند تغيير أي منها.' },

  // ---- Cards Editor (components/cards/CardsEditor.tsx) — also feeds
  // ScratchCardEditor's shared "branding" strings ----
  'cardsEditor.branding': { fr: 'Image de marque des cartes', en: 'Card branding', ar: 'هوية البطاقات' },
  'cardsEditor.brandingDesc': { fr: "Les mêmes couleurs de marque et le même logo que le reste de la campagne — les modifier ici met à jour tout le site, pas seulement ce jeu. Le logo apparaît au dos des cartes et, pour le motif ornement, en emblème central.", en: 'Same brand colors and logo the rest of the campaign uses — editing them here updates the whole site, not just this game. The logo shows on the card back and, for the ornament pattern, its center emblem.', ar: 'نفس ألوان العلامة التجارية والشعار المستخدمين في بقية الحملة — تعديلهما هنا يُحدّث الموقع بأكمله، وليس هذه اللعبة فقط. يظهر الشعار على ظهر البطاقة، وكشعار مركزي في نمط الزخرفة.' },
  'cardsEditor.design': { fr: 'Design des cartes', en: 'Card design', ar: 'تصميم البطاقات' },
  'cardsEditor.designDesc': { fr: "Profondeur et ombre des dés/cartes, et l'arrière-plan derrière tout l'écran.", en: 'Depth and shadow of the dice/cards, and the background behind the whole screen.', ar: 'عمق وظل النرد/البطاقات، والخلفية خلف الشاشة بأكملها.' },
  'cardsEditor.backgroundImageHint': { fr: "Facultatif — derrière tout l'écran, pas seulement les cartes.", en: 'Optional — behind the whole screen, not just the cards.', ar: 'اختياري — خلف الشاشة بأكملها، وليس البطاقات فقط.' },
  'cardsEditor.mechanic': { fr: 'Mécanique dés & cartes', en: 'Dice & card mechanic', ar: 'آلية النرد والبطاقات' },
  'cardsEditor.mechanicDesc': { fr: "Le motif décoratif du dos de carte, la palette du dé, et la couleur de la lueur de victoire.", en: "The card back's decorative pattern, the dice cube's palette, and the color of a winning glow.", ar: 'النمط الزخرفي لظهر البطاقة، وألوان مكعب النرد، ولون توهج الفوز.' },
  'cardsEditor.backPattern': { fr: 'Motif du dos de carte', en: 'Card back pattern', ar: 'نمط ظهر البطاقة' },
  'cardsEditor.diceStyle': { fr: 'Style des dés', en: 'Dice style', ar: 'نمط النرد' },
  'cardsEditor.glowColor': { fr: 'Couleur de la lueur', en: 'Glow color', ar: 'لون التوهج' },
  'cardsEditor.glowColorHint': { fr: 'Lueur de carte gagnante, éclat des dés et mise en valeur du résultat.', en: 'Winning-card glow, dice burst, and result highlights.', ar: 'توهج البطاقة الرابحة، وانفجار النرد، وإبراز النتيجة.' },
  'cardsEditor.patternOrnament': { fr: 'Ornement (par défaut)', en: 'Ornament (default)', ar: 'زخرفة (افتراضي)' },
  'cardsEditor.patternDiamond': { fr: 'Treillis losange', en: 'Diamond lattice', ar: 'شبكة معينات' },
  'cardsEditor.patternLogoFocus': { fr: 'Logo en avant', en: 'Logo focus', ar: 'التركيز على الشعار' },
  'cardsEditor.diceClassic': { fr: 'Crème classique', en: 'Classic cream', ar: 'كريمي كلاسيكي' },
  'cardsEditor.diceMidnight': { fr: 'Minuit', en: 'Midnight', ar: 'منتصف الليل' },
  'cardsEditor.diceBrandTint': { fr: 'Teinte de marque', en: 'Brand tint', ar: 'لون العلامة التجارية' },
  'cardsEditor.glowGold': { fr: 'Or', en: 'Gold', ar: 'ذهبي' },
  'cardsEditor.glowBrandAccent': { fr: 'Accent de marque', en: 'Brand accent', ar: 'لون تمييز العلامة' },
  'cardsEditor.glowSilver': { fr: 'Argent', en: 'Silver', ar: 'فضي' },
  'cardsEditor.rolling': { fr: 'Lancer…', en: 'Rolling…', ar: 'جارٍ الرمي...' },
  'cardsEditor.previewRoll': { fr: 'Aperçu du lancer', en: 'Preview roll', ar: 'معاينة الرمي' },
  'cardsEditor.previewHint': { fr: 'Aperçu en direct — cliquez sur une carte pour la retourner, se réinitialise à chaque changement de réglage.', en: 'Live preview — click a card to flip it, resets when you change a setting above.', ar: 'معاينة مباشرة — انقر على بطاقة لقلبها، تُعاد عند تغيير أي إعداد أعلاه.' },

  // ---- Scratch Card Editor (components/scratch/ScratchCardEditor.tsx) ----
  'scratchEditor.brandingDesc': { fr: "Les mêmes couleurs de marque et le même logo que le reste de la campagne — les modifier ici met à jour tout le site, pas seulement cette carte.", en: 'Same brand colors and logo the rest of the campaign uses — editing them here updates the whole site, not just this card.', ar: 'نفس ألوان العلامة التجارية والشعار المستخدمين في بقية الحملة — تعديلهما هنا يُحدّث الموقع بأكمله، وليس هذه البطاقة فقط.' },
  'scratchEditor.designDesc': { fr: 'Profondeur, arrondi et ombre de la carte 3D elle-même.', en: 'Depth, corner radius and shadow of the 3D card itself.', ar: 'العمق وانحناء الزوايا وظل البطاقة ثلاثية الأبعاد نفسها.' },
  'scratchEditor.cornerRadiusHint': { fr: "Pixels, même échelle que l'arrondi du thème du site.", en: "Pixels, same scale as the site's theme radius.", ar: 'بالبكسل، بنفس مقياس انحناء زوايا تصميم الموقع.' },
  'scratchEditor.backgroundImageHint': { fr: "Facultatif — derrière tout l'écran, pas seulement la carte.", en: 'Optional — behind the whole screen, not just the card.', ar: 'اختياري — خلف الشاشة بأكملها، وليس البطاقة فقط.' },
  'scratchEditor.productImage': { fr: 'Image produit', en: 'Product image', ar: 'صورة المنتج' },
  'scratchEditor.productImageHint': { fr: "Affichée sous le film lors d'un gain. Revient à la photo produit de la campagne par défaut.", en: 'Shown under the foil on a win. Falls back to the campaign packshot.', ar: 'تُعرض تحت الطبقة العاكسة عند الفوز. تعود افتراضيًا إلى صورة منتج الحملة.' },
  'scratchEditor.mechanic': { fr: 'Mécanique de grattage', en: 'Scratch mechanic', ar: 'آلية الكشط' },
  'scratchEditor.mechanicDesc': { fr: "La texture du film, son animation de révélation, et la part à gratter avant que le reste ne se révèle automatiquement.", en: 'The foil texture, its reveal flourish, and how much of it a player has to clear before the rest auto-reveals.', ar: 'ملمس الطبقة العاكسة، وحركة الكشف، والنسبة التي يجب على اللاعب كشطها قبل أن يُكشف الباقي تلقائيًا.' },
  'scratchEditor.foilStyle': { fr: 'Style du film', en: 'Foil style', ar: 'نمط الطبقة العاكسة' },
  'scratchEditor.revealAnimation': { fr: 'Animation de révélation', en: 'Reveal animation', ar: 'رسوم الكشف' },
  'scratchEditor.autoRevealThreshold': { fr: 'Seuil de révélation automatique', en: 'Auto-reveal threshold', ar: 'حد الكشف التلقائي' },
  'scratchEditor.autoRevealThresholdHint': { fr: '% du film gratté avant que le reste ne se dégage automatiquement.', en: '% of the foil scratched before the rest clears automatically.', ar: 'نسبة الكشط من الطبقة العاكسة قبل أن يُزال الباقي تلقائيًا.' },
  'scratchEditor.foilBrandPrimary': { fr: 'Primaire de marque', en: 'Brand primary', ar: 'اللون الأساسي للعلامة' },
  'scratchEditor.foilBrushedDark': { fr: 'Sombre brossé', en: 'Brushed dark', ar: 'داكن مصقول' },
  'scratchEditor.revealShine': { fr: 'Balayage brillant', en: 'Shine sweep', ar: 'مسح لامع' },
  'scratchEditor.revealConfetti': { fr: 'Explosion de confettis', en: 'Confetti burst', ar: 'انفجار قصاصات' },
  'scratchEditor.revealSimple': { fr: 'Fondu simple', en: 'Simple fade', ar: 'تلاشي بسيط' },
  'scratchEditor.previewHint': { fr: 'Aperçu en direct — grattez pour voir la révélation, se réinitialise à chaque changement de réglage.', en: 'Live preview — scratch it to see the reveal, it resets when you change a setting above.', ar: 'معاينة مباشرة — اكشطها لرؤية الكشف، تُعاد عند تغيير أي إعداد أعلاه.' },

  // ---- Screens tab (pages/workspace/builder/ScreensTab.tsx) ----
  'screens.form': { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' },
  'screens.formDesc': { fr: 'Formulaire de profil participant', en: 'Participant profile form', ar: 'استمارة بيانات المشارك' },
  'screens.scan': { fr: 'Scan', en: 'Scan', ar: 'مسح' },
  'screens.scanDesc': { fr: 'Capture caméra + validation OCR du ticket', en: 'Camera capture + OCR receipt validation', ar: 'التقاط بالكاميرا + التحقق من الإيصال بتقنية OCR' },
  'screens.dice': { fr: 'Dés', en: 'Dice', ar: 'النرد' },
  'screens.diceDesc': { fr: 'Le moment du lancer de dés', en: 'The dice-roll moment', ar: 'لحظة رمي النرد' },
  'screens.cards': { fr: 'Cartes', en: 'Cards', ar: 'البطاقات' },
  'screens.cardsDesc': { fr: 'Révélation du prix par retournement de carte', en: 'Card-flip prize reveal', ar: 'كشف الجائزة بقلب البطاقة' },
  'screens.scratch': { fr: 'Carte à gratter', en: 'Scratch Card', ar: 'بطاقة الكشط' },
  'screens.scratchDesc': { fr: 'Révélation du prix par carte à gratter 3D', en: '3D scratch-card prize reveal', ar: 'كشف الجائزة ببطاقة كشط ثلاثية الأبعاد' },
  'screens.wheel': { fr: 'Roue', en: 'Wheel', ar: 'العجلة' },
  'screens.wheelDesc': { fr: 'Le moment de faire tourner la roue', en: 'The wheel-spin moment', ar: 'لحظة تدوير العجلة' },
  'screens.result': { fr: 'Résultat', en: 'Result', ar: 'النتيجة' },
  'screens.resultDesc': { fr: 'Écran gain / pas de prix', en: 'Win / no-prize screen', ar: 'شاشة الفوز / لا جائزة' },

  // ---- Languages tab (pages/workspace/builder/LanguagesTab.tsx) ----
  'languages.searchPlaceholder': { fr: 'Rechercher des traductions…', en: 'Search translations…', ar: 'ابحث عن ترجمات...' },
  'languages.missing': { fr: 'Manquant', en: 'Missing', ar: 'ناقص' },
  'languages.missingLower': { fr: 'manquant(s)', en: 'missing', ar: 'ناقص' },
  'languages.allComplete': { fr: 'Tout est complet', en: 'All complete', ar: 'الكل مكتمل' },
  'languages.coverage': { fr: 'Couverture des traductions', en: 'Translation coverage', ar: 'تغطية الترجمة' },
  'languages.key': { fr: 'Clé', en: 'Key', ar: 'المفتاح' },
  'languages.noMatch': { fr: 'Aucune traduction ne correspond à votre recherche.', en: 'No translations match your search.', ar: 'لا توجد ترجمة مطابقة لبحثك.' },

  // ---- Products (pages/workspace/Products/*) ----
  'products.title': { fr: 'Produits', en: 'Products', ar: 'المنتجات' },
  'products.newProduct': { fr: 'Nouveau produit', en: 'New product', ar: 'منتج جديد' },
  'products.searchPlaceholder': { fr: 'Rechercher un produit…', en: 'Search products…', ar: 'ابحث عن منتج...' },
  'products.noProducts': { fr: 'Aucun produit pour le moment', en: 'No products yet', ar: 'لا توجد منتجات بعد' },
  'products.name': { fr: 'Nom', en: 'Name', ar: 'الاسم' },
  'products.brand': { fr: 'Marque', en: 'Brand', ar: 'العلامة التجارية' },
  'products.eligible': { fr: 'Éligible', en: 'Eligible', ar: 'مؤهل' },
  'products.status': { fr: 'Statut', en: 'Status', ar: 'الحالة' },
  'products.loadError': { fr: 'Échec du chargement des règles produits.', en: 'Failed to load product rules.', ar: 'فشل تحميل قواعد المنتجات.' },
  'products.saveError': { fr: 'Échec de l\'enregistrement des règles produits.', en: 'Failed to save product rules.', ar: 'فشل حفظ قواعد المنتجات.' },
  'products.errAddOne': { fr: 'Ajoutez au moins un article.', en: 'Add at least one article.', ar: 'أضف مقالًا واحدًا على الأقل.' },
  'products.errRuleAndThreshold': { fr: 'Chaque article a besoin d\'un type de règle et d\'un seuil supérieur à 0.', en: 'Every article needs a rule type and a threshold greater than 0.', ar: 'يحتاج كل مقال إلى نوع قاعدة وحد أدنى أكبر من 0.' },
  'products.errMinMatchesRange': { fr: '« Articles correspondants minimum » doit être compris entre 1 et {max}.', en: '"Minimum matching articles" must be between 1 and {max}.', ar: 'يجب أن يكون "الحد الأدنى للمقالات المطابقة" بين 1 و {max}.' },
  'products.errCombinedRule': { fr: 'Définissez un type de règle combinée et un seuil supérieur à 0.', en: 'Set a combined rule type and threshold greater than 0.', ar: 'حدّد نوع قاعدة مجمّعة وحدًا أدنى أكبر من 0.' },
  'products.eyebrow': { fr: 'Catalogue', en: 'Catalog', ar: 'الكتالوج' },
  'products.eligibleArticles': { fr: 'Articles éligibles', en: 'Eligible articles', ar: 'المقالات المؤهلة' },
  'products.eligibleArticlesDesc': { fr: 'Choisissez quels articles du catalogue qualifient un ticket scanné, et la règle de prix ou de quantité à appliquer.', en: 'Choose which catalog articles qualify a scanned receipt, and the price or quantity rule to apply.', ar: 'اختر مقالات الكتالوج التي تؤهل إيصالًا ممسوحًا، وقاعدة السعر أو الكمية المطبقة.' },
  'products.importCsv': { fr: 'Importer CSV', en: 'Import CSV', ar: 'استيراد CSV' },
  'products.addArticle': { fr: 'Ajouter un article', en: 'Add article', ar: 'إضافة مقال' },
  'products.copyTo': { fr: 'Copier vers…', en: 'Copy to…', ar: 'نسخ إلى...' },
  'products.exportCsv': { fr: 'Exporter CSV', en: 'Export CSV', ar: 'تصدير CSV' },
  'products.saveRules': { fr: 'Enregistrer les règles', en: 'Save rules', ar: 'حفظ القواعد' },
  'products.perArticleThresholds': { fr: 'Seuils par article', en: 'Per-article thresholds', ar: 'حدود لكل مقال' },
  'products.combinedThreshold': { fr: 'Seuil combiné', en: 'Combined threshold', ar: 'حد مجمّع' },
  'products.atLeast': { fr: 'Au moins', en: 'At least', ar: 'على الأقل' },
  'products.totalQuantityGte': { fr: 'Quantité totale ≥', en: 'Total quantity ≥', ar: 'الكمية الإجمالية ≥' },
  'products.totalSpendGte': { fr: 'Dépense totale ≥', en: 'Total spend ≥', ar: 'إجمالي الإنفاق ≥' },
  'products.quantityGte': { fr: 'Quantité ≥', en: 'Quantity ≥', ar: 'الكمية ≥' },
  'products.spendGte': { fr: 'Dépense ≥', en: 'Spend ≥', ar: 'الإنفاق ≥' },
  'products.rule': { fr: 'Règle', en: 'Rule', ar: 'القاعدة' },
  'products.threshold': { fr: 'Seuil', en: 'Threshold', ar: 'الحد' },
  'products.groupByRayon': { fr: 'Grouper par rayon', en: 'Group by rayon', ar: 'تجميع حسب القسم' },
  'products.searchSelectedPlaceholder': { fr: 'Rechercher les articles sélectionnés…', en: 'Search selected articles…', ar: 'ابحث عن المقالات المختارة...' },
  'products.uncategorized': { fr: 'Sans catégorie', en: 'Uncategorized', ar: 'غير مصنّف' },
  'products.selectAllShown': { fr: 'Tout sélectionner ({count} affichés)', en: 'Select all {count} shown', ar: 'تحديد كل {count} المعروضة' },
  'products.selected': { fr: 'sélectionné(s)', en: 'selected', ar: 'محدد' },
  'products.setRule': { fr: 'Définir une règle…', en: 'Set rule…', ar: 'تحديد قاعدة...' },
  'products.clear': { fr: 'Effacer', en: 'Clear', ar: 'مسح' },
  'products.noEligibleYet': { fr: 'Aucun article éligible pour le moment', en: 'No eligible articles yet', ar: 'لا توجد مقالات مؤهلة بعد' },
  'products.noEligibleYetDesc': { fr: 'Ajoutez les articles du catalogue qui doivent qualifier un ticket pour cette campagne.', en: 'Add the catalog articles that should qualify a receipt for this campaign.', ar: 'أضف مقالات الكتالوج التي يجب أن تؤهل إيصالًا لهذه الحملة.' },
  'products.noArticlesMatch': { fr: 'Aucun article ne correspond', en: 'No articles match', ar: 'لا توجد مقالات مطابقة' },
  'products.noArticlesMatchDesc': { fr: 'Essayez une autre recherche ou effacez le filtre de rayon.', en: 'Try a different search or clear the rayon filter.', ar: 'جرّب بحثًا آخر أو امسح مرشح القسم.' },
  'products.article': { fr: 'Article', en: 'Article', ar: 'المقال' },
  'products.rayon': { fr: 'Rayon', en: 'Rayon', ar: 'القسم' },
  'products.fournisseur': { fr: 'Fournisseur', en: 'Fournisseur', ar: 'المورد' },
  'products.catalogPrice': { fr: 'Prix catalogue', en: 'Catalog price', ar: 'سعر الكتالوج' },
  'statsBar.avgPrice': { fr: 'Prix moyen', en: 'Avg. price', ar: 'متوسط السعر' },

  // ---- Bulk Rule Dialog (pages/workspace/Products/BulkRuleDialog.tsx) ----
  'bulkRule.title': { fr: 'Définir une règle pour les articles sélectionnés', en: 'Set rule for selected articles', ar: 'تحديد قاعدة للمقالات المختارة' },
  'bulkRule.desc': { fr: 'Applique le même type de règle et seuil à {count} article(s) sélectionné(s).', en: 'Applies the same rule type and threshold to {count} selected article(s).', ar: 'يطبّق نفس نوع القاعدة والحد على {count} مقال(ات) مختارة.' },
  'bulkRule.applyTo': { fr: 'Appliquer à {count} article(s)', en: 'Apply to {count} article(s)', ar: 'تطبيق على {count} مقال(ات)' },

  // ---- Copy Rules Dialog (pages/workspace/Products/CopyRulesDialog.tsx) ----
  'copyRules.title': { fr: 'Copier les règles vers d\'autres sites', en: 'Copy rules to other sites', ar: 'نسخ القواعد إلى مواقع أخرى' },
  'copyRules.desc': { fr: 'Écrase les règles produits du site cible avec les {count} article(s) et le mode actuels de cette campagne.', en: "Overwrites the target site's product rules with this campaign's current {count} article(s) and mode.", ar: 'يستبدل قواعد منتجات الموقع المستهدف بـ {count} مقال(ات) الحالية ووضع هذه الحملة.' },
  'copyRules.noOtherSites': { fr: 'Aucun autre site', en: 'No other sites', ar: 'لا توجد مواقع أخرى' },
  'copyRules.noOtherSitesDesc': { fr: "Il n'y a pas encore d'autres campagnes vers lesquelles copier ces règles.", en: 'There are no other campaigns to copy these rules to yet.', ar: 'لا توجد حملات أخرى لنسخ هذه القواعد إليها بعد.' },
  'copyRules.copyToSites': { fr: 'Copier vers {count} site(s)', en: 'Copy to {count} site(s)', ar: 'نسخ إلى {count} موقع (مواقع)' },

  // ---- Import CSV Dialog (pages/workspace/Products/ImportCsvDialog.tsx) ----
  'importCsv.errParse': { fr: 'Impossible d\'analyser le CSV.', en: 'Could not parse CSV.', ar: 'تعذّر تحليل ملف CSV.' },
  'importCsv.errMissingCodeColumn': { fr: 'Le CSV doit contenir une colonne « code ».', en: 'CSV needs a "code" column.', ar: 'يجب أن يحتوي ملف CSV على عمود "code".' },
  'importCsv.errNoRows': { fr: 'Aucune ligne trouvée — vérifiez que le CSV a une ligne d\'en-tête et au moins une valeur « code ».', en: 'No rows found — check the CSV has a header row and at least one "code" value.', ar: 'لم يُعثر على صفوف — تأكد أن ملف CSV يحتوي على صف رأس وقيمة "code" واحدة على الأقل.' },
  'importCsv.errLookup': { fr: 'Échec de la recherche des articles.', en: 'Failed to look up articles.', ar: 'فشل البحث عن المقالات.' },
  'importCsv.title': { fr: 'Importer des articles depuis un CSV', en: 'Import articles from CSV', ar: 'استيراد مقالات من CSV' },
  'importCsv.columnsHint': { fr: 'Colonnes : « code » (requis), « ruleType » (quantity/price) et « threshold » (facultatifs).', en: 'Columns: "code" (required), optional "ruleType" (quantity/price) and "threshold".', ar: 'الأعمدة: "code" (مطلوب)، و"ruleType" (quantity/price) و"threshold" (اختياريان).' },
  'importCsv.uploadFile': { fr: 'Téléverser un fichier .csv', en: 'Upload .csv file', ar: 'رفع ملف .csv' },
  'importCsv.willBeAdded': { fr: '{count} article(s) seront ajoutés', en: '{count} article(s) will be added', ar: 'سيُضاف {count} مقال(ات)' },
  'importCsv.notFoundInCatalog': { fr: '{count} code(s) introuvable(s) dans le catalogue :', en: '{count} code(s) not found in catalog:', ar: '{count} رمز (رموز) غير موجودة في الكتالوج:' },
  'importCsv.more': { fr: '+{count} de plus', en: '+{count} more', ar: '+{count} أخرى' },
  'importCsv.importCount': { fr: 'Importer {count} article(s)', en: 'Import {count} article(s)', ar: 'استيراد {count} مقال(ات)' },

  // ---- Add Article Dialog (pages/workspace/Products/AddArticleDialog.tsx) ----
  'addArticle.partialSelectNote': { fr: '{shown} sur {total} articles sélectionnés — affinez le filtre pour tous les inclure.', en: '{shown} of {total} articles selected — refine the filter to include them all.', ar: 'تم اختيار {shown} من {total} مقال — نقّح المرشح لتضمينها جميعًا.' },
  'addArticle.fullSelectNote': { fr: '{count} articles sélectionnés.', en: '{count} articles selected.', ar: 'تم اختيار {count} مقال.' },
  'addArticle.selectAllError': { fr: 'Échec de la sélection globale — réessayez.', en: 'Failed to select all — try again.', ar: 'فشل تحديد الكل — أعد المحاولة.' },
  'addArticle.title': { fr: 'Ajouter des articles', en: 'Add articles', ar: 'إضافة مقالات' },
  'addArticle.desc': { fr: 'Filtrez par rayon, marque ou fournisseur, puis recherchez dans le catalogue.', en: 'Filter by rayon, brand, or fournisseur, then search the catalog.', ar: 'رشّح حسب القسم أو العلامة أو المورد، ثم ابحث في الكتالوج.' },
  'addArticle.searchPlaceholder': { fr: 'Rechercher par nom, ou scanner/saisir un code-barres EAN…', en: 'Search by name, or scan/type an EAN barcode…', ar: 'ابحث بالاسم، أو امسح/اكتب رمز EAN...' },
  'addArticle.allRayons': { fr: 'Tous les rayons', en: 'All rayons', ar: 'كل الأقسام' },
  'addArticle.allBrands': { fr: 'Toutes les marques', en: 'All brands', ar: 'كل العلامات التجارية' },
  'addArticle.allFournisseurs': { fr: 'Tous les fournisseurs', en: 'All fournisseurs', ar: 'كل الموردين' },
  'addArticle.addCount': { fr: 'Ajouter {count} article(s)', en: 'Add {count} article(s)', ar: 'إضافة {count} مقال(ات)' },

  // ---- Media Library / Assets (pages/workspace/Assets.tsx) ----
  'assets.eyebrow': { fr: 'Médias', en: 'Media', ar: 'الوسائط' },
  'assets.title': { fr: 'Médiathèque', en: 'Media Library', ar: 'مكتبة الوسائط' },
  'assets.desc': { fr: 'Logos, arrière-plans, icônes et documents utilisés sur le site.', en: 'Logos, backgrounds, icons and documents used across the website.', ar: 'الشعارات والخلفيات والأيقونات والمستندات المستخدمة عبر الموقع.' },
  'assets.upload': { fr: 'Téléverser', en: 'Upload', ar: 'رفع' },
  'assets.searchPlaceholder': { fr: 'Rechercher un fichier…', en: 'Search files…', ar: 'ابحث عن ملف...' },
  'assets.noAssets': { fr: 'Aucun fichier pour le moment', en: 'No assets yet', ar: 'لا توجد ملفات بعد' },
  'assets.allAssets': { fr: 'Tous les fichiers', en: 'All assets', ar: 'كل الملفات' },
  'assets.folderLogos': { fr: 'Logos', en: 'Logos', ar: 'الشعارات' },
  'assets.folderBackgrounds': { fr: 'Arrière-plans', en: 'Backgrounds', ar: 'الخلفيات' },
  'assets.folderHeroes': { fr: 'Bannières', en: 'Heroes', ar: 'الصور الرئيسية' },
  'assets.folderIcons': { fr: 'Icônes', en: 'Icons', ar: 'الأيقونات' },
  'assets.folderDocuments': { fr: 'Documents', en: 'Documents', ar: 'المستندات' },
  'assets.dropHere': { fr: 'Déposez ici', en: 'Drop it here', ar: 'أفلته هنا' },
  'assets.dropOrBrowse': { fr: 'Déposez un fichier ici ou parcourez', en: 'Drop files here or browse', ar: 'أفلت الملفات هنا أو تصفّح' },
  'assets.fileTypesHint': { fr: 'PNG, JPG, SVG, PDF jusqu\'à 10 Mo', en: 'PNG, JPG, SVG, PDF up to 10 MB', ar: 'PNG, JPG, SVG, PDF حتى 10 ميغابايت' },
  'assets.notFoundTitle': { fr: 'Aucun fichier trouvé', en: 'No assets found', ar: 'لم يُعثر على ملفات' },
  'assets.notFoundDesc': { fr: 'Téléversez une image, une icône ou un document pour commencer.', en: 'Upload an image, icon or document to get started.', ar: 'ارفع صورة أو أيقونة أو مستندًا للبدء.' },
  'assets.deleteConfirmPrefix': { fr: 'Supprimer', en: 'Delete', ar: 'حذف' },
  'assets.info': { fr: 'Informations sur le fichier', en: 'Asset information', ar: 'معلومات الملف' },
  'assets.folder': { fr: 'Dossier', en: 'Folder', ar: 'المجلد' },
  'assets.size': { fr: 'Taille', en: 'Size', ar: 'الحجم' },
  'assets.uploaded': { fr: 'Téléversé le', en: 'Uploaded', ar: 'تاريخ الرفع' },
  'assets.download': { fr: 'Télécharger', en: 'Download', ar: 'تنزيل' },

  // ---- Notifications (pages/workspace/Notifications.tsx) ----
  'notifications.eyebrow': { fr: 'Activité', en: 'Activity', ar: 'النشاط' },
  'notifications.title': { fr: 'Notifications', en: 'Notifications', ar: 'الإشعارات' },
  'notifications.desc': { fr: 'Événements de campagne, alertes de gagnants et messages système.', en: 'Campaign events, winner alerts and system messages.', ar: 'أحداث الحملة وتنبيهات الفائزين ورسائل النظام.' },
  'notifications.markAllRead': { fr: 'Tout marquer comme lu', en: 'Mark all read', ar: 'وضع علامة مقروء على الكل' },
  'notifications.empty': { fr: "Vous êtes à jour", en: "You're all caught up", ar: 'أنت على اطلاع بكل شيء' },
  'notifications.unread': { fr: 'Non lues', en: 'Unread', ar: 'غير مقروءة' },
  'notifications.unreadLower': { fr: 'non lue(s)', en: 'unread', ar: 'غير مقروءة' },
  'notifications.noneUnread': { fr: 'Aucune notification non lue pour le moment.', en: 'No unread notifications right now.', ar: 'لا توجد إشعارات غير مقروءة حاليًا.' },
  'notifications.noneAtAll': { fr: 'Aucune notification pour le moment.', en: 'No notifications right now.', ar: 'لا توجد إشعارات حاليًا.' },
  'notifications.typeInfo': { fr: 'Info', en: 'Info', ar: 'معلومة' },
  'notifications.typeSuccess': { fr: 'Succès', en: 'Success', ar: 'نجاح' },
  'notifications.typeWarning': { fr: 'Avertissement', en: 'Warning', ar: 'تحذير' },
  'notifications.typeDanger': { fr: 'Alerte', en: 'Danger', ar: 'خطر' },

  // ---- Overview tab (pages/workspace/dashboard/OverviewTab.tsx) ----
  'overviewTab.rewardsWon': { fr: 'Récompenses gagnées', en: 'Rewards won', ar: 'الجوائز المكتسبة' },
  'overviewTab.conversionRate': { fr: 'Taux de conversion', en: 'Conversion rate', ar: 'معدل التحويل' },
  'overviewTab.participationChart': { fr: 'Participation, 14 derniers jours', en: 'Participation, last 14 days', ar: 'المشاركة، آخر 14 يومًا' },
  'overviewTab.recentActivity': { fr: 'Activité récente', en: 'Recent activity', ar: 'النشاط الأخير' },
  'overviewTab.events': { fr: 'événements', en: 'events', ar: 'أحداث' },
  'overviewTab.activityEmpty': { fr: "L'activité apparaîtra ici lorsque des participants interagiront avec votre tombola.", en: 'Activity will appear here as participants interact with your tombola.', ar: 'سيظهر النشاط هنا عندما يتفاعل المشاركون مع اليانصيب الخاص بك.' },
  'overviewTab.campaignStatus': { fr: 'Statut des campagnes', en: 'Campaign status', ar: 'حالة الحملات' },
  'overviewTab.viewAll': { fr: 'Tout voir', en: 'View all', ar: 'عرض الكل' },
  'overviewTab.noCampaigns': { fr: 'Aucune campagne', en: 'No campaigns', ar: 'لا توجد حملات' },
  'overviewTab.noCampaignsDesc': { fr: 'Créez votre première campagne pour commencer à collecter des participants.', en: 'Create your first campaign to start collecting participants.', ar: 'أنشئ حملتك الأولى لبدء جمع المشاركين.' },
  'overviewTab.createCampaign': { fr: 'Créer une campagne', en: 'Create campaign', ar: 'إنشاء حملة' },
  'overviewTab.quickActions': { fr: 'Actions rapides', en: 'Quick actions', ar: 'إجراءات سريعة' },
  'overviewTab.editTheme': { fr: 'Modifier le thème', en: 'Edit theme', ar: 'تعديل التصميم' },
  'overviewTab.editThemeDesc': { fr: 'Couleurs, polices et disposition', en: 'Colors, fonts & layout', ar: 'الألوان والخطوط والتخطيط' },
  'overviewTab.websiteBuilder': { fr: 'Constructeur de site', en: 'Website builder', ar: 'أداة بناء الموقع' },
  'overviewTab.websiteBuilderDesc': { fr: 'Écrans, prix et langues', en: 'Screens, prizes & languages', ar: 'الشاشات والجوائز واللغات' },
  'overviewTab.newCampaign': { fr: 'Nouvelle campagne', en: 'New campaign', ar: 'حملة جديدة' },
  'overviewTab.newCampaignDesc': { fr: 'Lancer une tombola', en: 'Launch a tombola', ar: 'إطلاق يانصيب' },
  'overviewTab.settingsDesc': { fr: 'Configuration du site', en: 'Site configuration', ar: 'إعدادات الموقع' },
  'overviewTab.liveCampaign': { fr: 'Campagne en direct', en: 'Live campaign', ar: 'الحملة المباشرة' },
  'overviewTab.noActiveCampaign': { fr: 'Aucune campagne active', en: 'No active campaign', ar: 'لا توجد حملة نشطة' },

  // ---- Campaign statuses (shared: Campaigns.tsx, OverviewTab.tsx) ----
  'campaigns.statusDraft': { fr: 'Brouillon', en: 'Draft', ar: 'مسودة' },
  'campaigns.statusActive': { fr: 'Active', en: 'Active', ar: 'نشطة' },
  'campaigns.statusFinished': { fr: 'Terminée', en: 'Finished', ar: 'منتهية' },
  'campaigns.eyebrow': { fr: 'Espace de travail', en: 'Workspace', ar: 'مساحة العمل' },
  'campaigns.desc': { fr: 'Chaque tombola de ce site, groupée par cycle de vie — glissez une carte entre les colonnes pour changer son statut.', en: 'Every tombola run for this website, grouped by lifecycle — drag a card between columns to change its status.', ar: 'كل يانصيب لهذا الموقع، مجمّع حسب دورة الحياة — اسحب بطاقة بين الأعمدة لتغيير حالتها.' },
  'campaigns.createCampaign': { fr: 'Créer une campagne', en: 'Create Campaign', ar: 'إنشاء حملة' },
  'campaigns.noneYet': { fr: 'Aucune campagne pour le moment', en: 'No campaigns yet', ar: 'لا توجد حملات بعد' },
  'campaigns.actions': { fr: 'Actions de la campagne', en: 'Campaign actions', ar: 'إجراءات الحملة' },
  'campaigns.preview': { fr: 'Aperçu', en: 'Preview', ar: 'معاينة' },
  'campaigns.activate': { fr: 'Activer', en: 'Activate', ar: 'تفعيل' },
  'campaigns.archive': { fr: 'Archiver', en: 'Archive', ar: 'أرشفة' },
  'campaigns.dropToMove': { fr: 'Déposer pour déplacer ici', en: 'Drop to move here', ar: 'أفلت للنقل هنا' },
  'campaigns.nothingHere': { fr: 'Rien ici', en: 'Nothing here', ar: 'لا يوجد شيء هنا' },
  'campaigns.createCampaignTitle': { fr: 'Créer une campagne', en: 'Create campaign', ar: 'إنشاء حملة' },
  'campaigns.createCampaignDesc': { fr: 'Vous pourrez configurer les prix et les règles après sa création.', en: 'You can configure prizes and rules after creating it.', ar: 'يمكنك ضبط الجوائز والقواعد بعد إنشائها.' },
  'campaigns.campaignName': { fr: 'Nom de la campagne', en: 'Campaign name', ar: 'اسم الحملة' },

  // ---- Dashboard overview shell (pages/workspace/Overview.tsx) ----
  'overview.eyebrow': { fr: 'Espace de travail', en: 'Workspace', ar: 'مساحة العمل' },
  'overview.welcomeBack': { fr: 'Bon retour — voici ce qui se passe sur {name}.', en: "Welcome back — here's what's happening at {name}.", ar: 'مرحبًا بعودتك — إليك ما يحدث في {name}.' },
  'overview.update': { fr: 'Mettre à jour', en: 'Update', ar: 'تحديث' },
  'overview.publish': { fr: 'Publier', en: 'Publish', ar: 'نشر' },

  // ---- Website Builder shell (pages/workspace/Pages.tsx) ----
  'pages.eyebrow': { fr: 'Site web', en: 'Website', ar: 'الموقع' },
  'pages.screensDesc': { fr: "Parcourez le site réel, écran par écran — le contenu et la typographie s'éditent depuis l'Éditeur de thème.", en: 'Step through the real, live site screen by screen — copy and typography are edited from the Theme Editor.', ar: 'تصفّح الموقع الحقيقي شاشة بشاشة — يُحرَّر المحتوى والخط من محرر التصميم.' },
  'pages.prizesDesc': { fr: "Le type de jeu et l'échelle des prix dont les participants tirent réellement — c'est celle branchée sur le serveur en direct.", en: "Game type and the prize ladder participants actually draw from — this is the one that's wired to the live backend.", ar: 'نوع اللعبة وسلّم الجوائز الذي يسحب منه المشاركون فعليًا — وهو المرتبط بالخادم المباشر.' },
  'pages.languagesDesc': { fr: 'Modifiez les traductions françaises et arabes côte à côte.', en: 'Edit French and Arabic translations side by side.', ar: 'عدّل الترجمات الفرنسية والعربية جنبًا إلى جنب.' },

  // ---- Device preview (components/DevicePreview.tsx) ----
  'devicePreview.phone': { fr: 'Téléphone', en: 'Phone', ar: 'الهاتف' },
  'devicePreview.tablet': { fr: 'Tablette', en: 'Tablet', ar: 'الجهاز اللوحي' },
  'devicePreview.laptop': { fr: 'Ordinateur portable', en: 'Laptop', ar: 'الحاسوب المحمول' },
  'devicePreview.previewAs': { fr: 'Aperçu en tant que', en: 'Preview as', ar: 'معاينة كـ' },

  // ---- Participants tab (pages/workspace/dashboard/ParticipantsTab.tsx) ----
  'participantsTab.loadError': { fr: 'Échec du chargement des participants.', en: 'Failed to load participants.', ar: 'فشل تحميل المشاركين.' },
  'participantsTab.unknown': { fr: 'Inconnu', en: 'Unknown', ar: 'غير معروف' },
  'participantsTab.phone': { fr: 'Téléphone', en: 'Phone', ar: 'الهاتف' },
  'participantsTab.winner': { fr: 'Gagnant', en: 'Winner', ar: 'فائز' },
  'participantsTab.noPrize': { fr: 'Pas de prix', en: 'No prize', ar: 'لا جائزة' },
  'participantsTab.prize': { fr: 'Prix', en: 'Prize', ar: 'الجائزة' },
  'participantsTab.backendHint': { fr: 'le serveur tourne-t-il sur la base API configurée ?', en: 'is the backend running at the configured API base?', ar: 'هل الخادم يعمل على عنوان الواجهة البرمجية المُهيأ؟' },
  'participantsTab.searchPlaceholder': { fr: 'Rechercher un nom ou un téléphone…', en: 'Search name or phone…', ar: 'ابحث بالاسم أو الهاتف...' },
  'participantsTab.allStatuses': { fr: 'Tous les statuts', en: 'All statuses', ar: 'كل الحالات' },
  'participantsTab.winners': { fr: 'Gagnants', en: 'Winners', ar: 'الفائزون' },
  'participantsTab.winnersLower': { fr: 'gagnants', en: 'winners', ar: 'فائزون' },
  'participantsTab.noneYet': { fr: 'Aucun participant pour le moment', en: 'No participants yet', ar: 'لا يوجد مشاركون بعد' },
  'participantsTab.noneYetDesc': { fr: 'Les participants apparaîtront ici dès qu\'ils commenceront à interagir avec votre tombola.', en: 'Participants will appear here once they start interacting with your tombola.', ar: 'سيظهر المشاركون هنا بمجرد أن يبدؤوا بالتفاعل مع اليانصيب الخاص بك.' },
  'participantsTab.noMatch': { fr: 'Aucun participant ne correspond à vos filtres', en: 'No participants match your filters', ar: 'لا يوجد مشارك مطابق لمرشحاتك' },
  'participantsTab.noMatchDesc': { fr: 'Essayez une autre recherche ou combinaison de filtres.', en: 'Try a different search or filter combination.', ar: 'جرّب بحثًا أو مجموعة مرشحات مختلفة.' },
  'participantsTab.showingRecent': { fr: 'Affichage des {shown} plus récents sur {total}', en: 'Showing the {shown} most recent of {total}', ar: 'عرض أحدث {shown} من أصل {total}' },

  // ---- Tickets tab (pages/workspace/dashboard/TicketsTab.tsx) ----
  'ticketsTab.loadError': { fr: 'Échec du chargement des tickets.', en: 'Failed to load tickets.', ar: 'فشل تحميل التذاكر.' },
  'ticketsTab.receipt': { fr: 'Ticket', en: 'Receipt', ar: 'الإيصال' },
  'ticketsTab.store': { fr: 'Magasin', en: 'Store', ar: 'المتجر' },
  'ticketsTab.amount': { fr: 'Montant', en: 'Amount', ar: 'المبلغ' },
  'ticketsTab.scanned': { fr: 'Scanné', en: 'Scanned', ar: 'تاريخ المسح' },
  'ticketsTab.validatedReceipts': { fr: 'Tickets validés', en: 'Validated receipts', ar: 'إيصالات موثقة' },
  'ticketsTab.totalValue': { fr: 'Valeur totale', en: 'Total value', ar: 'القيمة الإجمالية' },
  'ticketsTab.stores': { fr: 'Magasins', en: 'Stores', ar: 'المتاجر' },
  'ticketsTab.searchPlaceholder': { fr: 'Rechercher un ticket, participant ou magasin…', en: 'Search receipt, participant or store…', ar: 'ابحث عن إيصال أو مشارك أو متجر...' },
  'ticketsTab.of': { fr: 'sur', en: 'of', ar: 'من' },
  'ticketsTab.notFound': { fr: 'Aucun ticket trouvé', en: 'No tickets found', ar: 'لم يُعثر على تذاكر' },
  'ticketsTab.notFoundDesc': { fr: 'Les tickets apparaissent ici quand un participant scanne un ticket de caisse valide.', en: 'Tickets appear here when participants scan a valid receipt.', ar: 'تظهر التذاكر هنا عندما يمسح المشاركون إيصالًا صالحًا.' },

  // ---- Analytics tab (pages/workspace/dashboard/AnalyticsTab.tsx) ----
  'analyticsTab.last7': { fr: '7 derniers jours', en: 'Last 7 days', ar: 'آخر 7 أيام' },
  'analyticsTab.last14': { fr: '14 derniers jours', en: 'Last 14 days', ar: 'آخر 14 يومًا' },
  'analyticsTab.last30': { fr: '30 derniers jours', en: 'Last 30 days', ar: 'آخر 30 يومًا' },
  'analyticsTab.ticketsIssued': { fr: 'Tickets émis', en: 'Tickets issued', ar: 'التذاكر الصادرة' },
  'analyticsTab.participantsVsTickets': { fr: 'Participants vs tickets', en: 'Participants vs tickets', ar: 'المشاركون مقابل التذاكر' },
  'analyticsTab.noParticipationData': { fr: 'Pas encore de données de participation.', en: 'No participation data yet.', ar: 'لا توجد بيانات مشاركة بعد.' },
  'analyticsTab.prizeDistribution': { fr: 'Répartition des prix', en: 'Prize distribution', ar: 'توزيع الجوائز' },
  'analyticsTab.addPrizesHint': { fr: 'Ajoutez des prix pour voir la répartition.', en: 'Add prizes to see distribution.', ar: 'أضف جوائز لرؤية التوزيع.' },
  'analyticsTab.byCity': { fr: 'Participation par ville', en: 'Participation by city', ar: 'المشاركة حسب المدينة' },
  'analyticsTab.noCityData': { fr: 'Pas encore de données par ville.', en: 'No city data yet.', ar: 'لا توجد بيانات مدن بعد.' },
  'analyticsTab.hourlyScans': { fr: 'Scans par heure', en: 'Hourly scans', ar: 'المسح حسب الساعة' },

  // ---- Create Website Wizard (pages/CreateWebsiteWizard.tsx) ----
  'wizard.title': { fr: 'Créer un nouveau site', en: 'Create a new website', ar: 'إنشاء موقع جديد' },
  'wizard.subtitle': { fr: "Juste l'essentiel — vous construirez le style ensuite, dans l'Éditeur de thème.", en: "Just the basics — you'll build the look and feel next, in the Theme Editor.", ar: 'الأساسيات فقط — ستبني الشكل والمظهر لاحقًا في محرر التصميم.' },
  'wizard.backToDashboard': { fr: 'Retour au tableau de bord', en: 'Back to dashboard', ar: 'العودة إلى لوحة التحكم' },
  'wizard.next': { fr: 'Suivant', en: 'Next', ar: 'التالي' },
  'wizard.back': { fr: 'Retour', en: 'Back', ar: 'رجوع' },
  'wizard.finish': { fr: 'Terminer', en: 'Finish', ar: 'إنهاء' },
  'wizard.websiteName': { fr: 'Nom du site', en: 'Website name', ar: 'اسم الموقع' },
  'wizard.websiteNamePlaceholder': { fr: 'ex. Marjane Campagne d\'été', en: 'e.g. Marjane Summer Campaign', ar: 'مثال: حملة صيف مرجان' },
  'wizard.slug': { fr: 'Identifiant (slug)', en: 'Slug', ar: 'المعرّف (slug)' },
  'wizard.slugHint': { fr: 'Utilisé pour générer le domaine par défaut.', en: 'Used to generate the default domain.', ar: 'يُستخدم لإنشاء النطاق الافتراضي.' },
  'wizard.description': { fr: 'Description', en: 'Description', ar: 'الوصف' },
  'wizard.descriptionHint': { fr: 'Affichée à votre équipe sur la carte du tableau de bord.', en: 'Shown to your team on the dashboard card.', ar: 'تُعرض لفريقك على بطاقة لوحة التحكم.' },
  'wizard.descriptionPlaceholder': { fr: 'De quoi parle cette campagne ?', en: 'What is this campaign about?', ar: 'عن ماذا تتحدث هذه الحملة؟' },
  'wizard.languageHint': { fr: 'La langue par défaut vue par les visiteurs — modifiable sur le site.', en: 'The default language visitors see — switchable on-site.', ar: 'اللغة الافتراضية التي يراها الزوار — قابلة للتغيير على الموقع.' },
  'wizard.createWebsite': { fr: 'Créer le site', en: 'Create website', ar: 'إنشاء الموقع' },
  'wizard.template': { fr: 'Modèle', en: 'Template', ar: 'القالب' },

  // ---- Common (shared across many pages/dialogs) ----
  'common.cancel': { fr: 'Annuler', en: 'Cancel', ar: 'إلغاء' },
  'common.save': { fr: 'Enregistrer', en: 'Save', ar: 'حفظ' },
  'common.delete': { fr: 'Supprimer', en: 'Delete', ar: 'حذف' },
  'common.edit': { fr: 'Modifier', en: 'Edit', ar: 'تعديل' },
  'common.close': { fr: 'Fermer', en: 'Close', ar: 'إغلاق' },
  'common.confirm': { fr: 'Confirmer', en: 'Confirm', ar: 'تأكيد' },
  'common.loading': { fr: 'Chargement…', en: 'Loading…', ar: 'جارٍ التحميل...' },
  'common.noResults': { fr: 'Aucun résultat', en: 'No results', ar: 'لا توجد نتائج' },
  'common.search': { fr: 'Rechercher…', en: 'Search…', ar: 'بحث...' },
  'common.all': { fr: 'Tous', en: 'All', ar: 'الكل' },
  'common.live': { fr: 'En direct', en: 'Live', ar: 'مباشر' },
  'common.none': { fr: 'Aucun', en: 'None', ar: 'لا شيء' },
  'common.active': { fr: 'Actif', en: 'Active', ar: 'نشط' },
  'common.idle': { fr: 'Inactif', en: 'Idle', ar: 'غير نشط' },
  'common.name': { fr: 'Nom', en: 'Name', ar: 'الاسم' },
  'common.status': { fr: 'Statut', en: 'Status', ar: 'الحالة' },
  'common.type': { fr: 'Type', en: 'Type', ar: 'النوع' },
  'common.date': { fr: 'Date', en: 'Date', ar: 'التاريخ' },
  'common.remove': { fr: 'Retirer', en: 'Remove', ar: 'إزالة' },
  'common.previousPage': { fr: 'Page précédente', en: 'Previous page', ar: 'الصفحة السابقة' },
  'common.nextPage': { fr: 'Page suivante', en: 'Next page', ar: 'الصفحة التالية' },
  'common.websiteNotFound': { fr: 'Site introuvable.', en: 'Website not found.', ar: 'الموقع غير موجود.' },
}

export type AdminDictKey = keyof typeof DICT

interface AdminLangContextValue {
  lang: AdminLang
  setLang: (l: AdminLang) => void
  /** Translate a key. Falls back to the key itself if missing, so an
   *  untranslated string stays visible (never blank) as coverage grows. */
  t: (key: string) => string
  dir: 'ltr' | 'rtl'
}

const AdminLangContext = createContext<AdminLangContextValue | null>(null)

function readStoredLang(): AdminLang {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'fr' || raw === 'en' || raw === 'ar') return raw
  } catch {
    /* localStorage unavailable (SSR/private mode) — fall through to default */
  }
  // French is the default: this admin is operated in Morocco (Marjane) and
  // French is the team's working language. The switcher still lets anyone
  // opt into English or Arabic, and that choice is remembered per-browser.
  return 'fr'
}

export function AdminLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>(readStoredLang)

  const setLang = useCallback((l: AdminLang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* best-effort persistence only */
    }
  }, [])

  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr'

  // Scoped to the admin shell only (see AdminApp.tsx's .admin-shell) — the
  // public tombola site has its own, independent dir handling in
  // CampaignEngine, and must never be flipped by an admin's own preference.
  useEffect(() => {
    const shell = document.querySelector('.admin-shell')
    if (shell) shell.setAttribute('dir', dir)
    return () => {
      shell?.removeAttribute('dir')
    }
  }, [dir])

  const t = useCallback(
    (key: string): string => {
      const entry = DICT[key]
      if (!entry) return key
      return entry[lang] ?? entry.en ?? key
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t, dir }), [lang, setLang, t, dir])

  return <AdminLangContext.Provider value={value}>{children}</AdminLangContext.Provider>
}

export function useAdminLang(): AdminLangContextValue {
  const ctx = useContext(AdminLangContext)
  if (!ctx) throw new Error('useAdminLang must be used within AdminLangProvider')
  return ctx
}
