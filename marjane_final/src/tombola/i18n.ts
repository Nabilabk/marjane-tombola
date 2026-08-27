export type Lang = 'fr' | 'ar'

type Dict = Record<string, { fr: string; ar: string }>

export const STEP_LABELS = ['01', '02', '03', '04', '05']

export const t: Dict = {
  back: { fr: 'Retour', ar: 'رجوع' },
  tombolaOf: { fr: 'Tombola', ar: 'اليانصيب' },

  stepBuy: { fr: 'Achetez', ar: 'اشترِ' },
  stepScan: { fr: 'Scannez', ar: 'امسح' },
  stepWin: { fr: 'Gagnez', ar: 'اربح' },

  // Home
  consentPrefix: {
    fr: "J'accepte le ",
    ar: "أوافق على ",
  },

  consentLink: {
    fr: "règlement de la tombola",
    ar: "شروط وأحكام المسابقة",
  },

  consentSuffix: {
    fr: " ainsi que le traitement de mes données personnelles.",
    ar: " وعلى معالجة بياناتي الشخصية.",
  },

  homeTagline: {
    fr: 'Une expérience qui fait gagner',
    ar: 'تجربة مليئة بالجوائز',
  },

  homeStepLabel: {
    fr: 'Bienvenue',
    ar: 'مرحبًا',
  },

  homeTitle: {
    fr: 'Achetez, scannez puis découvrez votre gain.',
    ar: 'اشترِ، امسح إيصال الشراء، ثم اكتشف جائزتك.',
  },

  homeSub: {
    fr: "Un achat qualifiant vous ouvre la roue de la fortune. Achetez, scannez puis découvrez votre gain sur votre carte Marjane.",
    ar: 'كل عملية شراء مؤهلة تمنحك فرصة للمشاركة. اشترِ، امسح إيصال الشراء، ثم اكتشف جائزتك التي ستُضاف إلى بطاقة وفاء مرجان.',
  },

  loyaltyReminder: {
    fr: 'Vos gains seront associés à votre carte de fidélité Marjane.',
    ar: 'ستُضاف جائزتك مباشرةً إلى بطاقة وفاء مرجان.',
  },

  homeCta: {
    fr: 'Je participe',
    ar: 'ابدأ المشاركة',
  },

  mechanicTitle: {
    fr: 'Comment ça marche',
    ar: 'كيفية المشاركة',
  },

  m1t: {
    fr: 'Achetez',
    ar: 'اشترِ',
  },

  m1d: {
    fr: 'Un minimum de produits de la gamme en une seule fois.',
    ar: 'اشترِ الحد الأدنى المطلوب من منتجات العلامة في عملية شراء واحدة.',
  },

  m2t: {
    fr: 'Scannez',
    ar: 'امسح',
  },

  m2d: {
    fr: 'Photographiez votre ticket de caisse, nous lisons le montant.',
    ar: 'صوّر إيصال الشراء، وسيتم التحقق من قيمة مشترياتك تلقائيًا.',
  },

  m3t: {
    fr: 'Gagnez',
    ar: 'اربح',
  },

  m3d: {
    fr: 'Tournez la roue et créditez votre carte instantanément.',
    ar: 'اكتشف جائزتك، وستُضاف مباشرةً إلى بطاقة وفاء مرجان.',
  },

  prizesTitle: {
    fr: 'Ce que vous pouvez gagner',
    ar: 'الجوائز التي يمكنك الفوز بها',
  },

  // Form
  formStepLabel: {
    fr: 'Étape 1 · Votre profil',
    ar: 'الخطوة 1 · معلوماتك',
  },

  formTitle: {
    fr: 'Créez votre participation',
    ar: 'أدخل معلوماتك',
  },

  firstName: {
    fr: 'Prénom',
    ar: 'الاسم الشخصي',
  },

  lastName: {
    fr: 'Nom',
    ar: 'الاسم العائلي',
  },

  phone: {
    fr: 'Numéro de téléphone',
    ar: 'رقم الهاتف',
  },

  consent: {
    fr: "J'accepte le règlement du jeu et le traitement de mes données.",
    ar: 'أوافق على شروط وأحكام المسابقة وعلى معالجة بياناتي الشخصية.',
  },

  formCta: {
    fr: 'Continuer vers le scan',
    ar: 'متابعة',
  },

  errPhone: {
    fr: 'Numéro marocain invalide.',
    ar: 'رقم الهاتف المغربي غير صالح.',
  },

  errUsed: {
    fr: 'Ce numéro a déjà participé à cette tombola.',
    ar: 'سبق استخدام هذا الرقم للمشاركة في هذه المسابقة.',
  },

  errRequired: {
    fr: 'Ce champ est requis.',
    ar: 'هذا الحقل إجباري.',
  },

  errConsent: {
    fr: 'Vous devez accepter le règlement.',
    ar: 'يجب الموافقة على الشروط والأحكام.',
  },

  // Scan
  scanStepLabel: {
    fr: 'Étape 2 · Votre ticket',
    ar: 'الخطوة 2 · إيصال الشراء',
  },

  scanTitle: {
    fr: 'Scannez votre ticket de caisse',
    ar: 'امسح إيصال الشراء',
  },

  scanDrop: {
    fr: 'Prendre une photo ou importer',
    ar: 'التقط صورة أو اختر صورة',
  },

  scanDropHint: {
    fr: 'JPG ou PNG · lisible et à plat',
    ar: 'بصيغة JPG أو PNG وبجودة واضحة',
  },

  analyzing: {
    fr: 'Analyse du ticket…',
    ar: 'جارٍ تحليل إيصال الشراء...',
  },

  detected: {
    fr: 'Montant détecté',
    ar: 'المبلغ المُكتشف',
  },

  thresholdInfo: {
    fr: 'Achat minimum requis',
    ar: 'الحد الأدنى للمشاركة',
  },

  scanCta: {
    fr: 'Valider et jouer',
    ar: 'تأكيد والمتابعة',
  },

  errAmount: {
    fr: 'Montant insuffisant pour participer.',
    ar: 'قيمة المشتريات غير كافية للمشاركة.',
  },

  retry: {
    fr: 'Reprendre une photo',
    ar: 'التقاط صورة جديدة',
  },

  // Dice
  diceStepLabel: {
    fr: 'Étape 3 · Le dé',
    ar: 'الخطوة 3 · النرد',
  },

  diceTitle: {
    fr: 'Lancez le dé de la chance',
    ar: 'ارمِ نرد الحظ',
  },

  diceRoll: {
    fr: 'Lancer le dé',
    ar: 'ارمِ النرد',
  },

  diceRolling: {
    fr: 'Le dé tourne…',
    ar: 'جارٍ رمي النرد...',
  },

  diceResult: {
    fr: 'Vous avez obtenu {n}',
    ar: 'لقد حصلت على الرقم {n}',
  },

  diceHint: {
    fr: 'Le dé décide combien de cartes vous pourrez retourner.',
    ar: 'سيحدد النرد عدد البطاقات التي يمكنك اختيارها.',
  },

  diceContinue: {
    fr: 'Continuer vers les cartes',
    ar: 'متابعة',
  },

  // Cards
  cardsStepLabel: {
    fr: 'Étape 4 · Les cartes',
    ar: 'الخطوة 4 · البطاقات',
  },

  cardsTitle: {
    fr: 'Retournez vos cartes',
    ar: 'اختر بطاقاتك',
  },

  cardsPick: {
    fr: 'Choisissez {n} carte{s}',
    ar: 'اختر {n} بطاقات',
  },

  cardsPicking: {
    fr: 'Encore {n} carte{s}',
    ar: 'تبقى {n} بطاقات',
  },

  cardsDone: {
    fr: 'Révélation…',
    ar: 'جارٍ الكشف...',
  },

  cardsHintReady: {
    fr: 'Touchez une carte pour les mélanger, puis choisissez-en {n}.',
    ar: 'المس بطاقة لخلطها، ثم اختر {n} بطاقات.',
  },

  cardsHintPicking: {
    fr: 'Touchez {n} cartes pour révéler vos gains.',
    ar: 'المس {n} بطاقات لاكتشاف جوائزك.',
  },

  cardsHintDone: {
    fr: 'Voici vos gains !',
    ar: 'هذه هي جوائزك!',
  },

  cardsShuffle: {
    fr: 'Mélanger les cartes',
    ar: 'اخلط البطاقات',
  },

  cardsShuffling: {
    fr: 'Mélange des cartes…',
    ar: 'جارٍ خلط البطاقات...',
  },

  cardsHintShuffling: {
    fr: 'Les cartes sont en cours de mélange…',
    ar: 'جارٍ خلط البطاقات...',
  },

  // Scratch Card (alternative to Dice+Cards — a single 3D card, scratched
  // by hand, replaces the old Cups mechanic)
  scratchStepLabel: {
    fr: 'Étape 3 · La carte à gratter',
    ar: 'الخطوة 3 · بطاقة الحظ',
  },

  scratchTitle: {
    fr: 'Grattez votre carte',
    ar: 'اكشف بطاقتك',
  },

  scratchSubtitle: {
    fr: 'Faites glisser votre doigt sur la surface pour révéler votre gain.',
    ar: 'مرر إصبعك على السطح لكشف جائزتك.',
  },

  scratchHintReady: {
    fr: 'Votre carte est prête.',
    ar: 'بطاقتك جاهزة.',
  },

  scratchHintScratching: {
    fr: 'Grattez la surface avec votre doigt ou la souris.',
    ar: 'اكشط السطح بإصبعك أو بالماوس.',
  },

  scratchFoilLabel: {
    fr: 'GRATTEZ ICI',
    ar: 'اكشط هنا',
  },

  scratchRevealing: {
    fr: 'Révélation…',
    ar: 'جارٍ الكشف...',
  },

  scratchWinTitle: {
    fr: 'Vous avez gagné',
    ar: 'لقد ربحت',
  },

  scratchLoseTitle: {
    fr: 'Pas de chance cette fois',
    ar: 'لا حظ هذه المرة',
  },

  scratchErrorRetry: {
    fr: 'Réessayer',
    ar: 'إعادة المحاولة',
  },

  // Wheel (alternative to Dice+Cards — one spin decides the prize directly)
  wheelStepLabel: {
    fr: 'Étape 3 · La roue',
    ar: 'الخطوة 3 · العجلة',
  },

  wheelTitle: {
    fr: 'Tournez la roue de la chance',
    ar: 'أدر عجلة الحظ',
  },

  wheelHint: {
    fr: 'Un seul tour décide de votre gain.',
    ar: 'دورة واحدة تحدد جائزتك.',
  },

  wheelSpin: {
    fr: 'Tourner la roue',
    ar: 'أدر العجلة',
  },

  wheelResult: {
    fr: 'La roue s’est arrêtée sur {n}',
    ar: 'توقفت العجلة عند {n}',
  },

  wheelContinue: {
    fr: 'Voir mon gain',
    ar: 'مشاهدة جائزتي',
  },

  // Result
  resultStepLabel: {
    fr: 'Résultat',
    ar: 'النتيجة',
  },

  winTitle: {
    fr: 'Félicitations, vous gagnez',
    ar: 'تهانينا! لقد ربحت',
  },

  winCredited: {
    fr: 'Vos gains seront associés à votre carte de fidélité Marjane.',
    ar: 'ستُضاف جائزتك مباشرةً إلى بطاقة وفاء مرجان.',
  },

  share: {
    fr: 'Partager',
    ar: 'مشاركة',
  },

  loseTitle: {
    fr: 'Pas de chance cette fois',
    ar: 'نتمنى لك حظًا أوفر في المرة القادمة',
  },

  loseSub: {
    fr: "Merci d'avoir participé. Un nouvel achat, une nouvelle chance de gagner.",
    ar: 'شكرًا لمشاركتك. مع كل عملية شراء جديدة، تزداد فرصتك في الفوز.',
  },

  backHome: {
    fr: "Retour à l'accueil",
    ar: 'العودة إلى الصفحة الرئيسية',
  },

  dhm: {
    fr: 'DH',
    ar: 'د.م',
  },

  // Raffle (game type with no mini-game — scan directly enters the draw)
  raffleTitle: {
    fr: 'Participation validée !',
    ar: 'تم تأكيد المشاركة!',
  },

  raffleThanks: {
    fr: "Merci d'avoir participé au jeu",
    ar: 'شكرًا لمشاركتك في المسابقة',
  },

  raffleConfirmed: {
    fr: 'Votre inscription a bien été prise en compte.',
    ar: 'تم تسجيل مشاركتك بنجاح.',
  },

  raffleCrossFingers: {
    fr: 'Croisez les doigts : vous êtes maintenant en course pour tenter de gagner...',
    ar: 'اعقدوا أصابعكم: أنتم الآن في السباق لتجربة حظكم في الفوز...',
  },

  // Campaign lifecycle gate (see engine/CampaignEngine.tsx's UnavailableScreen)
  // — fallback copy so a campaign works before an admin customizes it via
  // the Languages tab (these keys are seeded into every campaign's own
  // `translations`, see platform/seed.ts and platform/store.ts).
  campaignEndedTitle: {
    fr: 'Cette tombola est terminée',
    ar: 'انتهت هذه المسابقة',
  },

  campaignEndedMessage: {
    fr: "Merci d'avoir participé ! Cette offre n'est plus disponible.",
    ar: 'شكرًا على مشاركتك! هذا العرض لم يعد متاحًا.',
  },

  campaignMaintenanceTitle: {
    fr: 'Tombola en pause',
    ar: 'اليانصيب متوقف مؤقتًا',
  },

  campaignMaintenanceMessage: {
    fr: 'Cette tombola est momentanément indisponible. Revenez bientôt !',
    ar: 'هذا اليانصيب غير متاح حاليًا. عودوا قريبًا!',
  },
}