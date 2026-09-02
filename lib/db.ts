import fs from 'fs';
import path from 'path';
import { 
  UserProfile, Space, Article, AuditLog, 
  OnboardingStep, UserOnboardingProgress, EmployeeReport, ReportStatus, ReportType,
  QuizQuestion, StepQuizState, TrainingTrack
} from './types';

interface DatabaseSchema {
  users: Array<UserProfile & { password_hash: string }>;
  spaces: Space[];
  articles: Article[];
  audit_logs: AuditLog[];
  onboarding_steps: OnboardingStep[];
  user_progress: Record<string, UserOnboardingProgress>;
  reports: EmployeeReport[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'electrodrivers_db.json');

const INITIAL_SEED: DatabaseSchema = {
  users: [
    {
      id: 'usr-root-001',
      email: 'admin@electrodrivers.ru',
      telegram_nickname: '@electrodrivers_admin',
      role: 'superadmin',
      status: 'active',
      full_name: 'Администратор системы',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      password_hash: 'AdminPassword2026',
    }
  ],
  spaces: [
    {
      id: 'space-regulations',
      name: 'Регламенты и стандарты',
      slug: 'regulations',
      description: 'Основные корпоративные правила, инструкции и регламенты работы участников.',
      order: 1
    },
    {
      id: 'space-charging',
      name: 'Зарядная инфраструктура',
      slug: 'charging-infrastructure',
      description: 'Стандарты зарядных станций (CCS2, GB/T, Type 2), правила подключения и эксплуатация.',
      order: 2
    },
    {
      id: 'space-safety',
      name: 'Безопасность и регламенты ЧС',
      slug: 'safety-protocols',
      description: 'Инструкции по технической безопасности при работе с высоковольтными системами.',
      order: 3
    },
    {
      id: 'space-it-api',
      name: 'IT-инфраструктура и API',
      slug: 'it-infrastructure-api',
      description: 'Техническая документация, протоколы телеметрии, интеграции и спецификации API.',
      order: 4
    }
  ],
  articles: [
    {
      id: 'art-001',
      space_id: 'space-regulations',
      title: 'Регламент допуска и подготовки к выходу на смену',
      slug: 'operational-checklist',
      excerpt: 'Обязательный порядок проверки состояния оборудования, батареи и документов перед началом работы.',
      author_id: 'usr-root-001',
      author_name: 'Администратор системы',
      author_role: 'superadmin',
      parent_id: null,
      order: 1,
      tags: ['регламент', 'инструкция', 'онбординг'],
      is_pinned: true,
      views_count: 1,
      read_time_minutes: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content: `## 1. Общие положения

Настоящий регламент определяет порядок подготовки и проверки оборудования участниками системы **Electrodrivers**.

---

### 2. Обязательный чек-лист перед началом работы:

- [x] Проверка авторизации в корпоративном портале
- [x] Контроль уровня заряда батареи (не менее 80% перед выходом на линию)
- [x] Визуальный осмотр кабелей и коннекторов
- [ ] Фиксация показаний одометра

> ⚠️ **Важно:** При обнаружении любых повреждений кабелей или изоляции немедленно сообщите в диспетчерскую службу через [Telegram-бота](https://t.me/ElectrodriversBot).

---

### 3. Фото и видео фиксация

При передаче смены обязательно прикрепите фотоотчет показаний приборов:

![Приборная панель и заряд](https://images.unsplash.com/photo-1558441719-8b489c63f79b?w=800&auto=format&fit=crop&q=80)`
    },
    {
      id: 'art-002',
      space_id: 'space-charging',
      title: 'Стандарты зарядных станций и протоколы подключения',
      slug: 'charging-standards-overview',
      excerpt: 'Спецификация стандартов быстрой и медленной зарядки, требования безопасности и регламенты хабов.',
      author_id: 'usr-root-001',
      author_name: 'Администратор системы',
      author_role: 'superadmin',
      parent_id: null,
      order: 1,
      tags: ['зарядка', 'стандарты', 'GB/T', 'CCS2'],
      is_pinned: true,
      views_count: 1,
      read_time_minutes: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content: `## Зарядные протоколы и стандарты

В инфраструктуре Electrodrivers применяются стандарты быстрой (DC) и переменной (AC) зарядки.

---

### Спецификация разъемов:

| Стандарт | Тип тока | Максимальная мощность | Применение |
| :--- | :--- | :--- | :--- |
| **CCS Combo 2** | Постоянный (DC) | до 360 кВт | Скоростные магистральные хабы |
| **GB/T DC** | Постоянный (DC) | до 250 кВт | Городские ультрабыстрые станции |
| **Type 2 (Mennekes)** | Переменный (AC) | до 22 кВт | Ночная парковочная зарядка |

---

### Видеоинструкция по подключению:

[Смотреть обучающее видео по высоковольтным коннекторам](https://electrodrivers.ru/video/charging-guide.mp4)`
    },
    {
      id: 'art-003',
      space_id: 'space-safety',
      title: 'Инструкция по безопасности при работе с высоковольтными системами',
      slug: 'high-voltage-safety',
      excerpt: 'Правила техники безопасности, действия в нештатных ситуациях и регламент оповещения.',
      author_id: 'usr-root-001',
      author_name: 'Администратор системы',
      author_role: 'superadmin',
      parent_id: null,
      order: 1,
      tags: ['безопасность', 'высокое напряжение', 'регламент'],
      is_pinned: true,
      views_count: 1,
      read_time_minutes: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content: `## Техническая безопасность

Тяговые батареи и силовая проводка находятся под постоянным напряжением от 400V до 800V DC.

---

### Действия при возникновении неисправности:

1. **Немедленно обесточить систему:** Выключить зажигание и активировать сервисный размыкатель.
2. **Оценить обстановку:** Отойти на безопасное расстояние (не менее 20 метров).
3. **Оповещение:** Отправить экстренный отчет через CRM / Telegram-бота.`
    },
    {
      id: 'art-004',
      space_id: 'space-it-api',
      title: 'Спецификация интеграции телеметрии и вебхуков CRM',
      slug: 'telemetry-integration-spec',
      excerpt: 'Архитектура сбора отчетов через вебхук Telegram-бота и протокол OCPP 2.0.1.',
      author_id: 'usr-root-001',
      author_name: 'Администратор системы',
      author_role: 'superadmin',
      parent_id: null,
      order: 1,
      tags: ['api', 'телеметрия', 'вебхук', 'crm'],
      is_pinned: false,
      views_count: 1,
      read_time_minutes: 6,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content: `## Архитектура вебхука CRM отчетов

Telegram-бот отправляет JSON-пакеты методом \`POST\` на адрес:
\`\`\`
POST /api/crm/webhook
\`\`\`

---

### Пример структуры входящего JSON отчета:

\`\`\`json
{
  "telegram_user_id": "98124571",
  "telegram_username": "@driver_ivan",
  "employee_name": "Иван Смирнов",
  "report_type": "shift_report",
  "shift_date": "2026-08-30",
  "title": "Смена закрыта без замечаний",
  "metrics": {
    "hours_worked": 8.5,
    "mileage_km": 194.2,
    "kwh_charged": 38.4,
    "vehicle_plate": "Е777КХ 799"
  },
  "notes": "Все запланированные маршруты выполнены, замечаний по батарее нет.",
  "attachments": [
    {
      "type": "photo",
      "url": "https://images.unsplash.com/photo-1558441719-8b489c63f79b?w=800",
      "caption": "Одометр и приборная панель"
    }
  ]
}
\`\`\`
`
    }
  ],
  audit_logs: [
    {
      id: 'log-init-001',
      actor_id: 'usr-root-001',
      actor_email: 'admin@electrodrivers.ru',
      actor_telegram: '@electrodrivers_admin',
      action: 'SYSTEM_INITIALIZATION',
      target_id: 'system',
      target_type: 'system',
      details: 'Инициализация портала Electrodrivers и модулей CRM',
      created_at: new Date().toISOString()
    }
  ],
  onboarding_steps: [
    {
      id: 'step-1',
      title: 'Изучение регламента допуска к смене',
      description: 'Ознакомьтесь с правилами проверки оборудования перед выходом на линию, затем сдайте тест.',
      category: 'Регламенты',
      article_id: 'art-001',
      order: 1,
      duration_minutes: 10,
      track: 'onboarding',
      pass_score: 2,
      questions: [
        {
          id: 'q-1-1',
          text: 'Какой минимальный уровень заряда батареи требуется перед выходом на линию?',
          options: ['50%', '65%', '80%', '100%'],
          correct_index: 2
        },
        {
          id: 'q-1-2',
          text: 'Что необходимо сделать при обнаружении повреждения кабеля или изоляции?',
          options: [
            'Продолжить работу, отметив в отчете',
            'Немедленно сообщить в диспетчерскую через Telegram-бота',
            'Отремонтировать самостоятельно',
            'Дождаться конца смены'
          ],
          correct_index: 1
        },
        {
          id: 'q-1-3',
          text: 'Что обязательно прикрепляется при передаче смены?',
          options: [
            'Фотоотчет показаний приборов',
            'Скан паспорта',
            'Копия трудового договора',
            'Ничего'
          ],
          correct_index: 0
        }
      ]
    },
    {
      id: 'step-2',
      title: 'Стандарты зарядных станций и протоколы',
      description: 'Изучите типы разъемов (CCS2, GB/T, Type 2) и правила проведения сессий зарядки, затем сдайте тест.',
      category: 'Инфраструктура',
      article_id: 'art-002',
      order: 2,
      duration_minutes: 15,
      track: 'onboarding',
      pass_score: 2,
      questions: [
        {
          id: 'q-2-1',
          text: 'Какой стандарт применяется на скоростных магистральных хабах?',
          options: ['Type 2 (Mennekes)', 'CCS Combo 2', 'CHAdeMO', 'Schuko'],
          correct_index: 1
        },
        {
          id: 'q-2-2',
          text: 'Какая максимальная мощность у Type 2 (Mennekes)?',
          options: ['до 22 кВт', 'до 100 кВт', 'до 250 кВт', 'до 360 кВт'],
          correct_index: 0
        }
      ]
    },
    {
      id: 'step-3',
      title: 'Инструктаж по технике безопасности',
      description: 'Ознакомьтесь с правилами безопасности при работе с высоковольтными системами, затем сдайте тест.',
      category: 'Безопасность',
      article_id: 'art-003',
      order: 3,
      duration_minutes: 15,
      track: 'onboarding',
      pass_score: 2,
      questions: [
        {
          id: 'q-3-1',
          text: 'Под каким напряжением находятся тяговые батареи и силовая проводка?',
          options: ['12V–24V DC', '110V–220V AC', '400V–800V DC', '1000V+ AC'],
          correct_index: 2
        },
        {
          id: 'q-3-2',
          text: 'Какое безопасное расстояние при возникновении неисправности?',
          options: ['Не менее 5 метров', 'Не менее 10 метров', 'Не менее 20 метров', 'Расстояние не важно'],
          correct_index: 2
        }
      ]
    },
    {
      id: 'step-4',
      title: 'Отправка первого тестового отчета в Telegram-бот',
      description: 'Отправьте статус смены в бота для проверки интеграции с CRM.',
      category: 'Отчетность',
      order: 4,
      duration_minutes: 5,
      track: 'onboarding'
    },
    {
      id: 'att-1',
      title: 'Аттестация: регламенты и техника безопасности',
      description: 'Итоговая проверка знаний по регламентам допуска и работе с высоковольтными системами.',
      category: 'Аттестация',
      article_id: 'art-003',
      order: 1,
      duration_minutes: 20,
      track: 'attestation',
      pass_score: 2,
      questions: [
        {
          id: 'aq-1-1',
          text: 'Первое действие при возникновении неисправности высоковольтной системы?',
          options: [
            'Сфотографировать повреждение',
            'Немедленно обесточить систему',
            'Позвонить коллеге',
            'Продолжить движение до базы'
          ],
          correct_index: 1
        },
        {
          id: 'aq-1-2',
          text: 'Куда отправляется экстренный отчет о происшествии?',
          options: [
            'На личную почту руководителя',
            'В общий чат',
            'Через CRM / Telegram-бота',
            'Никуда, достаточно устного сообщения'
          ],
          correct_index: 2
        }
      ]
    }
  ],
  user_progress: {},
  reports: [
    {
      id: 'rep-001',
      telegram_user_id: '12498211',
      telegram_username: '@driver_alex',
      employee_name: 'Алексей Воронов',
      report_type: 'shift_report',
      title: 'Закрытие дневной смены (Маршрут Центр)',
      shift_date: '2026-08-30',
      status: 'pending_review',
      metrics: {
        hours_worked: 8.0,
        mileage_km: 182.5,
        kwh_charged: 34.2,
        vehicle_plate: 'Е777КХ 799'
      },
      notes: 'Смена прошла штатно. Быстрая зарядка на хабе CCS2 выполнена за 22 минуты. Батарея на конец смены: 86%.',
      attachments: [
        {
          type: 'photo',
          url: 'https://images.unsplash.com/photo-1558441719-8b489c63f79b?w=800&auto=format&fit=crop&q=80',
          caption: 'Показания одометра и зарядного терминала'
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

let memoryDb: DatabaseSchema | null = null;

function ensureDbDirectory() {
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb(): DatabaseSchema {
  if (memoryDb) {
    return memoryDb;
  }
  try {
    ensureDbDirectory();
    if (fs.existsSync(DB_FILE_PATH)) {
      const fileData = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      try {
        const parsed = JSON.parse(fileData);
        if (!parsed.reports) parsed.reports = [];
        migrateDb(parsed);
        memoryDb = parsed;
      } catch (parseErr) {
        // КРИТИЧНО: файл существует, но битый. НИКОГДА не перезаписываем его сидом —
        // сохраняем копию для ручного восстановления и только потом стартуем со свежей базой.
        const corruptCopy = `${DB_FILE_PATH}.corrupt-${Date.now()}`;
        try { fs.copyFileSync(DB_FILE_PATH, corruptCopy); } catch {}
        console.error(`DB FILE CORRUPT! Копия сохранена: ${corruptCopy}`, parseErr);
        memoryDb = JSON.parse(JSON.stringify(INITIAL_SEED));
      }
    } else {
      memoryDb = JSON.parse(JSON.stringify(INITIAL_SEED));
      atomicWrite(DB_FILE_PATH, JSON.stringify(memoryDb, null, 2));
    }
  } catch (err) {
    console.warn('DB Load warning:', err);
    memoryDb = JSON.parse(JSON.stringify(INITIAL_SEED));
  }
  return memoryDb!;
}

/** Атомарная запись: сначала во временный файл, потом rename — обрыв записи не портит базу. */
function atomicWrite(filePath: string, data: string): void {
  const tmp = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, data, 'utf-8');
  fs.renameSync(tmp, filePath);
}

/** Ежедневный ротируемый бэкап: data/backups/db-YYYY-MM-DD.json, храним последние 14. */
const BACKUPS_DIR = path.join(path.dirname(DB_FILE_PATH), 'backups');
let lastBackupDay = '';

function dailyBackup(): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (lastBackupDay === today) return;
    const backupPath = path.join(BACKUPS_DIR, `db-${today}.json`);
    if (!fs.existsSync(backupPath) && fs.existsSync(DB_FILE_PATH)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      fs.copyFileSync(DB_FILE_PATH, backupPath);
      // Ротация: оставляем 14 последних
      const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.startsWith('db-')).sort();
      while (files.length > 14) {
        const oldest = files.shift()!;
        try { fs.unlinkSync(path.join(BACKUPS_DIR, oldest)); } catch {}
      }
    }
    lastBackupDay = today;
  } catch (err) {
    console.warn('DB backup warning:', err);
  }
}

/** Мягкая миграция старых данных: заполняем новые поля значениями по умолчанию. */
function migrateDb(db: DatabaseSchema): void {
  (db.users || []).forEach(u => {
    if (!u.stage) u.stage = 'onboarding';
    if (u.attestation_retake_enabled === undefined) u.attestation_retake_enabled = false;
  });
  (db.onboarding_steps || []).forEach(s => {
    if (!s.track) s.track = 'onboarding';
    if (!Array.isArray(s.questions)) s.questions = [];
  });
  Object.values(db.user_progress || {}).forEach(p => {
    if (!p.quiz_states) p.quiz_states = {};
  });
}

export function saveDb(data: DatabaseSchema): void {
  memoryDb = data;
  try {
    ensureDbDirectory();
    dailyBackup();
    atomicWrite(DB_FILE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

// ================= USER OPERATIONS =================
export function findUserByEmail(email: string) {
  const db = getDb();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string) {
  const db = getDb();
  return db.users.find(u => u.id === id);
}

export function getAllUsers() {
  const db = getDb();
  return db.users.map(({ password_hash, ...rest }) => rest);
}

export function createUser(userData: {
  email: string;
  password_hash: string;
  telegram_nickname: string;
  full_name?: string;
  role?: 'user' | 'admin' | 'superadmin';
  status?: 'pending' | 'active' | 'blocked';
}) {
  const db = getDb();
  const newUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    email: userData.email,
    password_hash: userData.password_hash,
    telegram_nickname: userData.telegram_nickname.startsWith('@') ? userData.telegram_nickname : `@${userData.telegram_nickname}`,
    role: userData.role || 'user',
    status: userData.status || 'pending',
    stage: 'onboarding' as const,
    attestation_retake_enabled: false,
    full_name: userData.full_name || userData.telegram_nickname,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  
  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: 'system',
    actor_email: 'system',
    actor_telegram: '@system',
    action: 'USER_REGISTERED',
    target_id: newUser.id,
    target_type: 'user',
    details: `Регистрация: ${newUser.email} (${newUser.telegram_nickname}), статус: pending`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  const { password_hash, ...profile } = newUser;
  return profile;
}

export function updateUserStatus(userId: string, status: 'pending' | 'active' | 'blocked', actor: UserProfile) {
  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new Error('Пользователь не найден');

  const oldStatus = user.status;
  user.status = status;
  user.updated_at = new Date().toISOString();

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'USER_STATUS_CHANGE',
    target_id: user.id,
    target_type: 'user',
    details: `Статус пользователя ${user.email} изменен с ${oldStatus} на ${status}`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  const { password_hash, ...profile } = user;
  return profile;
}

export function updateUserRole(userId: string, role: 'user' | 'admin' | 'superadmin', actor: UserProfile) {
  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new Error('Пользователь не найден');

  const oldRole = user.role;
  user.role = role;
  user.updated_at = new Date().toISOString();

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'USER_ROLE_CHANGE',
    target_id: user.id,
    target_type: 'user',
    details: `Роль пользователя ${user.email} изменена с ${oldRole} на ${role}`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  const { password_hash, ...profile } = user;
  return profile;
}

/** «Повышение» пользователя (онбординг -> аттестация) и режим пересдачи аттестации */
export function updateUserTraining(
  userId: string,
  updates: { stage?: TrainingTrack; attestation_retake_enabled?: boolean },
  actor: UserProfile
) {
  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new Error('Пользователь не найден');

  const changes: string[] = [];
  if (updates.stage !== undefined && updates.stage !== user.stage) {
    changes.push(`этап: ${user.stage || 'onboarding'} -> ${updates.stage}`);
    user.stage = updates.stage;
  }
  if (updates.attestation_retake_enabled !== undefined && updates.attestation_retake_enabled !== user.attestation_retake_enabled) {
    changes.push(`пересдача аттестации: ${updates.attestation_retake_enabled ? 'разрешена' : 'запрещена'}`);
    user.attestation_retake_enabled = updates.attestation_retake_enabled;
  }
  user.updated_at = new Date().toISOString();

  if (changes.length > 0) {
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      actor_id: actor.id,
      actor_email: actor.email,
      actor_telegram: actor.telegram_nickname,
      action: 'USER_TRAINING_CHANGE',
      target_id: user.id,
      target_type: 'user',
      details: `Обучение пользователя ${user.email}: ${changes.join('; ')}`,
      created_at: new Date().toISOString()
    });
  }

  saveDb(db);
  const { password_hash, ...profile } = user;
  return profile;
}

export function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new Error('Пользователь не найден');

  if (updates.full_name !== undefined) user.full_name = updates.full_name;
  if (updates.telegram_nickname !== undefined) {
    user.telegram_nickname = updates.telegram_nickname.startsWith('@') ? updates.telegram_nickname : `@${updates.telegram_nickname}`;
  }
  user.updated_at = new Date().toISOString();

  saveDb(db);
  const { password_hash, ...profile } = user;
  return profile;
}

export function deleteUser(userId: string, actor: UserProfile) {
  const db = getDb();
  const idx = db.users.findIndex(u => u.id === userId);
  if (idx === -1) throw new Error('Пользователь не найден');
  const target = db.users[idx];

  db.users.splice(idx, 1);
  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'USER_DELETE',
    target_id: userId,
    target_type: 'user',
    details: `Удален пользователь ${target.email} (${target.telegram_nickname})`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  return { success: true };
}

// ================= SPACES & ARTICLES =================
export function getAllSpaces(): Space[] {
  const db = getDb();
  return db.spaces.sort((a, b) => a.order - b.order);
}

export function getSpaceById(id: string): Space | undefined {
  const db = getDb();
  return db.spaces.find(s => s.id === id || s.slug === id);
}

export function createSpace(spaceData: Omit<Space, 'id'>, actor: UserProfile): Space {
  const db = getDb();
  const newSpace: Space = {
    ...spaceData,
    id: `space-${Date.now()}`,
    order: db.spaces.length + 1
  };
  db.spaces.push(newSpace);

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'SPACE_CREATE',
    target_id: newSpace.id,
    target_type: 'space',
    details: `Создано пространство: "${newSpace.name}"`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  return newSpace;
}

export function deleteSpace(id: string, force: boolean, actor: UserProfile): { success: boolean; deleted_articles: number } {
  const db = getDb();
  const idx = db.spaces.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('Пространство не найдено');
  const target = db.spaces[idx];

  const articlesInSpace = db.articles.filter(a => a.space_id === id);
  if (articlesInSpace.length > 0 && !force) {
    const err: any = new Error(`В пространстве ${articlesInSpace.length} статей. Подтвердите удаление вместе со статьями.`);
    err.code = 'SPACE_NOT_EMPTY';
    err.articles_count = articlesInSpace.length;
    throw err;
  }

  db.articles = db.articles.filter(a => a.space_id !== id);
  db.spaces.splice(idx, 1);

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'SPACE_DELETE',
    target_id: id,
    target_type: 'space',
    details: `Удалено пространство: "${target.name}"${articlesInSpace.length ? ` вместе с ${articlesInSpace.length} статьями` : ''}`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  return { success: true, deleted_articles: articlesInSpace.length };
}

export function getAllArticles(): Article[] {
  const db = getDb();
  return db.articles;
}

export function getArticlesBySpace(spaceId: string): Article[] {
  const db = getDb();
  return db.articles.filter(a => a.space_id === spaceId || a.space_id === getSpaceById(spaceId)?.id);
}

export function getArticleById(id: string): Article | undefined {
  const db = getDb();
  return db.articles.find(a => a.id === id || a.slug === id);
}

export function createArticle(articleData: {
  space_id: string;
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  is_pinned?: boolean;
  parent_id?: string | null;
}, actor: UserProfile): Article {
  const db = getDb();
  const slug = articleData.slug || articleData.title.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const wordCount = articleData.content.split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 180));

  const newArticle: Article = {
    id: `art-${Date.now()}`,
    space_id: articleData.space_id,
    title: articleData.title,
    slug: `${slug}-${Math.random().toString(36).substring(2, 6)}`,
    content: articleData.content,
    excerpt: articleData.excerpt || articleData.content.substring(0, 150).replace(/[#*`_]/g, '') + '...',
    author_id: actor.id,
    author_name: actor.full_name || actor.telegram_nickname,
    author_role: actor.role,
    parent_id: articleData.parent_id || null,
    order: db.articles.length + 1,
    tags: articleData.tags || [],
    is_pinned: Boolean(articleData.is_pinned),
    views_count: 0,
    read_time_minutes: readTime,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.articles.push(newArticle);

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'ARTICLE_CREATE',
    target_id: newArticle.id,
    target_type: 'article',
    details: `Создана статья: "${newArticle.title}"`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  return newArticle;
}

export function updateArticle(id: string, updates: Partial<Article>, actor: UserProfile): Article {
  const db = getDb();
  const article = db.articles.find(a => a.id === id);
  if (!article) throw new Error('Статья не найдена');

  if (updates.title !== undefined) article.title = updates.title;
  if (updates.content !== undefined) {
    article.content = updates.content;
    const wordCount = updates.content.split(/\s+/).length;
    article.read_time_minutes = Math.max(1, Math.ceil(wordCount / 180));
  }
  if (updates.excerpt !== undefined) article.excerpt = updates.excerpt;
  if (updates.space_id !== undefined) article.space_id = updates.space_id;
  if (updates.parent_id !== undefined) article.parent_id = updates.parent_id;
  if (updates.tags !== undefined) article.tags = updates.tags;
  if (updates.is_pinned !== undefined) article.is_pinned = updates.is_pinned;
  article.updated_at = new Date().toISOString();

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'ARTICLE_UPDATE',
    target_id: article.id,
    target_type: 'article',
    details: `Обновлена статья: "${article.title}"`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  return article;
}

export function deleteArticle(id: string, actor: UserProfile): { success: boolean } {
  const db = getDb();
  const idx = db.articles.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Статья не найдена');
  const target = db.articles[idx];

  db.articles.splice(idx, 1);

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'ARTICLE_DELETE',
    target_id: id,
    target_type: 'article',
    details: `Удалена статья: "${target.title}"`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  return { success: true };
}

export function incrementArticleViews(id: string): void {
  const db = getDb();
  const article = db.articles.find(a => a.id === id || a.slug === id);
  if (article) {
    article.views_count += 1;
    saveDb(db);
  }
}

// ================= CRM REPORTS =================
export function getAllReports(): EmployeeReport[] {
  const db = getDb();
  return (db.reports || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getReportById(id: string): EmployeeReport | undefined {
  const db = getDb();
  return (db.reports || []).find(r => r.id === id);
}

export function createReport(data: {
  telegram_user_id?: string;
  telegram_username: string;
  employee_name?: string;
  report_type?: ReportType;
  title?: string;
  shift_date?: string;
  metrics?: Record<string, any>;
  notes?: string;
  attachments?: Array<{ type: 'photo' | 'document' | 'video'; url: string; caption?: string }>;
  raw_payload?: Record<string, any>;
}): EmployeeReport {
  const db = getDb();
  if (!db.reports) db.reports = [];

  const cleanTelegram = data.telegram_username.startsWith('@') ? data.telegram_username : `@${data.telegram_username}`;
  const today = new Date().toISOString().split('T')[0];

  const newReport: EmployeeReport = {
    id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    telegram_user_id: data.telegram_user_id || undefined,
    telegram_username: cleanTelegram,
    employee_name: data.employee_name || cleanTelegram,
    report_type: data.report_type || 'shift_report',
    title: data.title || `Отчет сотрудника ${cleanTelegram} (${today})`,
    shift_date: data.shift_date || today,
    status: 'pending_review',
    metrics: data.metrics || {},
    notes: data.notes || '',
    attachments: data.attachments || [],
    raw_payload: data.raw_payload || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.reports.unshift(newReport);

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: 'telegram_bot',
    actor_email: 'webhook',
    actor_telegram: cleanTelegram,
    action: 'REPORT_SUBMITTED',
    target_id: newReport.id,
    target_type: 'report',
    details: `Поступил отчет от ${cleanTelegram} (${newReport.title})`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  return newReport;
}

export function updateReportStatus(
  reportId: string, 
  status: ReportStatus, 
  reviewComment: string | undefined, 
  actor: UserProfile
): EmployeeReport {
  const db = getDb();
  const report = (db.reports || []).find(r => r.id === reportId);
  if (!report) throw new Error('Отчет не найден');

  const oldStatus = report.status;
  report.status = status;
  if (reviewComment !== undefined) report.review_comment = reviewComment;
  report.reviewer_id = actor.id;
  report.reviewer_name = actor.full_name || actor.telegram_nickname;
  report.updated_at = new Date().toISOString();

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'REPORT_STATUS_CHANGE',
    target_id: report.id,
    target_type: 'report',
    details: `Статус отчета ${report.id} изменен с ${oldStatus} на ${status} модератором ${actor.telegram_nickname}`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  return report;
}

export function deleteReport(reportId: string, actor: UserProfile): { success: boolean } {
  const db = getDb();
  const idx = (db.reports || []).findIndex(r => r.id === reportId);
  if (idx === -1) throw new Error('Отчет не найден');

  const target = db.reports[idx];
  db.reports.splice(idx, 1);

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'REPORT_DELETE',
    target_id: reportId,
    target_type: 'report',
    details: `Удален отчет ${reportId} (${target.title})`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  return { success: true };
}

// ================= AUDIT LOGS =================
export function getAuditLogs(): AuditLog[] {
  const db = getDb();
  return db.audit_logs;
}

// ================= ONBOARDING & ATTESTATION =================
export function getOnboardingSteps(track?: TrainingTrack): OnboardingStep[] {
  const db = getDb();
  const steps = db.onboarding_steps.filter(s => !track || (s.track || 'onboarding') === track);
  return steps.sort((a, b) => a.order - b.order);
}

export function getOnboardingStepById(id: string): OnboardingStep | undefined {
  const db = getDb();
  return db.onboarding_steps.find(s => s.id === id);
}

export function createOnboardingStep(data: {
  title: string;
  description?: string;
  category?: string;
  article_id?: string;
  duration_minutes?: number;
  track?: TrainingTrack;
  questions?: QuizQuestion[];
  pass_score?: number;
}, actor: UserProfile): OnboardingStep {
  const db = getDb();
  const track: TrainingTrack = data.track === 'attestation' ? 'attestation' : 'onboarding';
  const sameTrack = db.onboarding_steps.filter(s => (s.track || 'onboarding') === track);
  const questions = sanitizeQuestions(data.questions);

  const step: OnboardingStep = {
    id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: data.title,
    description: data.description || '',
    category: data.category || (track === 'attestation' ? 'Аттестация' : 'Общее'),
    article_id: data.article_id || undefined,
    order: sameTrack.length + 1,
    duration_minutes: Math.max(1, Number(data.duration_minutes) || 10),
    track,
    questions,
    pass_score: normalizePassScore(data.pass_score, questions.length)
  };
  db.onboarding_steps.push(step);

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'TRAINING_STEP_CREATE',
    target_id: step.id,
    target_type: 'system',
    details: `Создан шаг (${track}): "${step.title}", вопросов: ${questions.length}`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  return step;
}

export function updateOnboardingStep(id: string, updates: {
  title?: string;
  description?: string;
  category?: string;
  article_id?: string | null;
  duration_minutes?: number;
  order?: number;
  track?: TrainingTrack;
  questions?: QuizQuestion[];
  pass_score?: number;
}, actor: UserProfile): OnboardingStep {
  const db = getDb();
  const step = db.onboarding_steps.find(s => s.id === id);
  if (!step) throw new Error('Шаг не найден');

  if (updates.title !== undefined) step.title = updates.title;
  if (updates.description !== undefined) step.description = updates.description;
  if (updates.category !== undefined) step.category = updates.category;
  if (updates.article_id !== undefined) step.article_id = updates.article_id || undefined;
  if (updates.duration_minutes !== undefined) step.duration_minutes = Math.max(1, Number(updates.duration_minutes) || 10);
  if (updates.order !== undefined) step.order = Number(updates.order) || step.order;
  if (updates.track !== undefined) step.track = updates.track === 'attestation' ? 'attestation' : 'onboarding';
  if (updates.questions !== undefined) step.questions = sanitizeQuestions(updates.questions);
  const qCount = (step.questions || []).length;
  if (updates.pass_score !== undefined || updates.questions !== undefined) {
    step.pass_score = normalizePassScore(updates.pass_score !== undefined ? updates.pass_score : step.pass_score, qCount);
  }

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'TRAINING_STEP_UPDATE',
    target_id: step.id,
    target_type: 'system',
    details: `Обновлен шаг (${step.track}): "${step.title}"`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  return step;
}

export function deleteOnboardingStep(id: string, actor: UserProfile): { success: boolean } {
  const db = getDb();
  const idx = db.onboarding_steps.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('Шаг не найден');
  const target = db.onboarding_steps[idx];
  db.onboarding_steps.splice(idx, 1);

  // Подчищаем прогресс всех пользователей по удаленному шагу
  Object.values(db.user_progress || {}).forEach(p => {
    p.completed_step_ids = p.completed_step_ids.filter(sid => sid !== id);
    if (p.quiz_states && p.quiz_states[id]) delete p.quiz_states[id];
  });

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: actor.id,
    actor_email: actor.email,
    actor_telegram: actor.telegram_nickname,
    action: 'TRAINING_STEP_DELETE',
    target_id: id,
    target_type: 'system',
    details: `Удален шаг (${target.track || 'onboarding'}): "${target.title}"`,
    created_at: new Date().toISOString()
  });

  saveDb(db);
  return { success: true };
}

function sanitizeQuestions(raw?: QuizQuestion[]): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(q => q && typeof q.text === 'string' && q.text.trim() && Array.isArray(q.options))
    .map((q, i) => {
      const options = q.options.map(o => String(o || '').trim()).filter(Boolean);
      let correct = Number(q.correct_index);
      if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) correct = 0;
      return {
        id: q.id && String(q.id).trim() ? String(q.id) : `q-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        text: q.text.trim(),
        options,
        correct_index: correct
      };
    })
    .filter(q => q.options.length >= 2);
}

function normalizePassScore(passScore: number | undefined, questionCount: number): number | undefined {
  if (questionCount === 0) return undefined;
  const n = Number(passScore);
  if (!Number.isInteger(n) || n < 1) return questionCount;
  return Math.min(n, questionCount);
}

export function getUserOnboardingProgress(userId: string): UserOnboardingProgress {
  const db = getDb();
  if (!db.user_progress[userId]) {
    db.user_progress[userId] = {
      user_id: userId,
      completed_step_ids: [],
      quiz_states: {},
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    saveDb(db);
  }
  const prog = db.user_progress[userId];
  if (!prog.quiz_states) prog.quiz_states = {};
  return prog;
}

/**
 * Ручное завершение шага. Разрешено ТОЛЬКО для шагов без теста.
 * Шаги с тестом завершаются исключительно через успешную сдачу (submitQuizAttempt).
 */
export function toggleOnboardingStep(userId: string, stepId: string): UserOnboardingProgress {
  const db = getDb();
  const step = db.onboarding_steps.find(s => s.id === stepId);
  if (!step) throw new Error('Шаг не найден');
  if ((step.questions || []).length > 0) {
    throw new Error('Этот шаг завершается только успешной сдачей теста');
  }

  const prog = getUserOnboardingProgress(userId);
  const index = prog.completed_step_ids.indexOf(stepId);
  if (index >= 0) {
    prog.completed_step_ids.splice(index, 1);
  } else {
    prog.completed_step_ids.push(stepId);
  }
  prog.updated_at = new Date().toISOString();

  saveDb(db);
  return prog;
}

/**
 * Сдача теста по шагу.
 * - Первая попытка: отвечаются все вопросы.
 * - Пересдача: только вопросы, отвеченные неверно в прошлой попытке.
 * - Успех: суммарное число правильно отвеченных вопросов >= pass_score.
 * - Онбординг: пересдачи не ограничены.
 * - Аттестация: пересдача только при включенном admin-флаге attestation_retake_enabled.
 */
export function submitQuizAttempt(
  user: UserProfile,
  stepId: string,
  answers: Record<string, number>
): {
  passed: boolean;
  score_total: number;
  pass_score: number;
  questions_total: number;
  wrong_question_ids: string[];
  retake_available: boolean;
  progress: UserOnboardingProgress;
} {
  const db = getDb();
  const step = db.onboarding_steps.find(s => s.id === stepId);
  if (!step) throw new Error('Шаг не найден');

  const questions = step.questions || [];
  if (questions.length === 0) throw new Error('У этого шага нет теста');

  const track: TrainingTrack = step.track || 'onboarding';
  if ((user.stage || 'onboarding') !== track) {
    throw new Error(track === 'attestation'
      ? 'Аттестация доступна только повышенным пользователям'
      : 'Этот шаг относится к онбордингу');
  }

  const prog = getUserOnboardingProgress(user.id);
  const states = prog.quiz_states!;
  const state: StepQuizState | undefined = states[stepId];

  if (state?.passed) throw new Error('Тест уже успешно сдан');

  const isRetake = !!state && state.attempts > 0;
  if (isRetake && track === 'attestation' && !user.attestation_retake_enabled) {
    throw new Error('Пересдача аттестации возможна только по решению администратора');
  }

  // Какие вопросы отвечаются в этой попытке
  let askedIds: string[] = isRetake
    ? state!.pending_question_ids.filter(qid => questions.some(q => q.id === qid))
    : questions.map(q => q.id);

  // Если вопросы изменились после прошлой попытки и «ожидающих» не осталось —
  // спрашиваем всё, что еще не отвечено правильно
  if (isRetake && askedIds.length === 0) {
    askedIds = questions
      .filter(q => !state!.correct_question_ids.includes(q.id))
      .map(q => q.id);
  }

  // Проверяем, что даны ответы на все вопросы попытки
  for (const qid of askedIds) {
    if (!(qid in answers) || !Number.isInteger(Number(answers[qid]))) {
      throw new Error('Нужно ответить на все вопросы теста');
    }
  }

  const prevCorrect = new Set(isRetake ? state!.correct_question_ids : []);
  const wrongNow: string[] = [];

  for (const qid of askedIds) {
    const q = questions.find(x => x.id === qid)!;
    if (Number(answers[qid]) === q.correct_index) {
      prevCorrect.add(qid);
    } else {
      prevCorrect.delete(qid);
      wrongNow.push(qid);
    }
  }

  const passScore = normalizePassScore(step.pass_score, questions.length) || questions.length;
  const scoreTotal = questions.filter(q => prevCorrect.has(q.id)).length;
  const passed = scoreTotal >= passScore;

  const newState: StepQuizState = {
    attempts: (state?.attempts || 0) + 1,
    correct_question_ids: questions.filter(q => prevCorrect.has(q.id)).map(q => q.id),
    pending_question_ids: passed ? [] : wrongNow,
    passed,
    last_score: scoreTotal,
    passed_at: passed ? new Date().toISOString() : state?.passed_at,
    updated_at: new Date().toISOString()
  };
  states[stepId] = newState;

  if (passed && !prog.completed_step_ids.includes(stepId)) {
    prog.completed_step_ids.push(stepId);
  }
  prog.updated_at = new Date().toISOString();

  db.audit_logs.unshift({
    id: `log-${Date.now()}`,
    actor_id: user.id,
    actor_email: user.email,
    actor_telegram: user.telegram_nickname,
    action: passed ? 'QUIZ_PASSED' : 'QUIZ_FAILED',
    target_id: stepId,
    target_type: 'system',
    details: `${track === 'attestation' ? 'Аттестация' : 'Онбординг'} "${step.title}": попытка ${newState.attempts}, результат ${scoreTotal}/${questions.length} (порог ${passScore}) — ${passed ? 'СДАН' : 'не сдан'}`,
    created_at: new Date().toISOString()
  });

  saveDb(db);

  const retakeAvailable = !passed && (track === 'onboarding' || !!user.attestation_retake_enabled);

  return {
    passed,
    score_total: scoreTotal,
    pass_score: passScore,
    questions_total: questions.length,
    wrong_question_ids: wrongNow,
    retake_available: retakeAvailable,
    progress: prog
  };
}
