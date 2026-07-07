import { aiService } from '@/modules/ai/ai.service'
import { DrizzleAccountRepository } from '@/modules/accounts/account.repository'
import { AccountService } from '@/modules/accounts/account.service'
import { AuthService } from '@/modules/auth/auth.service'
import { DrizzleAlertRuleRepository } from '@/modules/alerts/alert-rule.repository'
import { AlertRuleService } from '@/modules/alerts/alert-rule.service'
import { AlertSettingsService } from '@/modules/alerts/alert-settings.service'
import { DrizzleNotificationRepository } from '@/modules/alerts/notification.repository'
import { NotificationService } from '@/modules/alerts/notification.service'
import { DrizzleAttachmentRepository } from '@/modules/attachments/attachment.repository'
import { AttachmentService } from '@/modules/attachments/attachment.service'
import { DrizzleCardRepository } from '@/modules/cards/card.repository'
import { CardService } from '@/modules/cards/card.service'
import { DrizzleCategoryRepository } from '@/modules/categories/category.repository'
import { CategoryService } from '@/modules/categories/category.service'
import { DrizzleRecurringRepository } from '@/modules/recurring/recurring.repository'
import { RecurringService } from '@/modules/recurring/recurring.service'
import { DrizzleReportRepository } from '@/modules/reports/report.repository'
import { ReportService } from '@/modules/reports/report.service'
import { DashboardInsightsService } from '@/modules/reports/dashboard-insights'
import { DrizzleSplitRepository } from '@/modules/splits/split.repository'
import { SplitService } from '@/modules/splits/split.service'
import { DrizzleStatementRepository } from '@/modules/statements/statement.repository'
import { StatementService } from '@/modules/statements/statement.service'
import { DrizzleTransactionRepository } from '@/modules/transactions/transaction.repository'
import { TransactionService } from '@/modules/transactions/transaction.service'
import { createStorageProvider } from '@/core/storage/storage.factory'

const storageProvider = createStorageProvider()

const authService = new AuthService()
const cardRepository = new DrizzleCardRepository()
const accountRepository = new DrizzleAccountRepository()
const categoryRepository = new DrizzleCategoryRepository()
const transactionRepository = new DrizzleTransactionRepository()
const recurringRepository = new DrizzleRecurringRepository()
const splitRepository = new DrizzleSplitRepository()
const attachmentRepository = new DrizzleAttachmentRepository()
const reportRepository = new DrizzleReportRepository()
const alertRuleRepository = new DrizzleAlertRuleRepository()
const notificationRepository = new DrizzleNotificationRepository()
const statementRepository = new DrizzleStatementRepository()

const cardService = new CardService(cardRepository, accountRepository)
const accountService = new AccountService(accountRepository, cardService)
const categoryService = new CategoryService(categoryRepository)
const splitService = new SplitService(splitRepository, transactionRepository)
const transactionService = new TransactionService(
  transactionRepository,
  accountRepository,
  categoryRepository,
  splitService
)
const recurringService = new RecurringService(
  recurringRepository,
  transactionRepository,
  accountRepository,
  categoryRepository
)
const attachmentService = new AttachmentService(
  attachmentRepository,
  transactionRepository,
  storageProvider
)
const reportService = new ReportService(reportRepository)
const dashboardInsightsService = new DashboardInsightsService(
  reportRepository,
  recurringRepository
)
const alertSettingsService = new AlertSettingsService()
const alertRuleService = new AlertRuleService(
  alertRuleRepository,
  notificationRepository,
  accountRepository,
  recurringRepository,
  splitRepository,
  alertSettingsService
)
const notificationService = new NotificationService(notificationRepository)
const statementService = new StatementService(
  statementRepository,
  accountRepository,
  categoryRepository,
  transactionRepository
)

export const container = {
  aiService,
  authService,
  accountRepository,
  accountService,
  alertRuleRepository,
  alertRuleService,
  alertSettingsService,
  attachmentRepository,
  attachmentService,
  cardRepository,
  cardService,
  categoryRepository,
  categoryService,
  notificationRepository,
  notificationService,
  recurringRepository,
  recurringService,
  reportRepository,
  reportService,
  dashboardInsightsService,
  splitRepository,
  splitService,
  statementRepository,
  statementService,
  storageProvider,
  transactionRepository,
  transactionService,
} as const
