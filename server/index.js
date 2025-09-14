const express = require('express')
const fs = require('fs')
const csv = require('csv-parser')
const OpenAI = require('openai')
require('dotenv').config()

const app = express()
const PORT = 3000

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Middleware
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Function to read CSV file
const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = []
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

// Endpoint to generate push notification
app.get('/api/generate-push/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId
    const transactionsFile = `client_${clientId}_transactions_3m.csv`
    const transfersFile = `client_${clientId}_transfers_3m.csv`

    // Check if files exist
    if (!fs.existsSync(transactionsFile) || !fs.existsSync(transfersFile)) {
      return res.status(404).json({
        error: 'Client data not found',
        message: `Files for client ${clientId} not found`
      })
    }

    // Read CSV data
    const [transactions, transfers] = await Promise.all([
      readCSV(transactionsFile),
      readCSV(transfersFile),
    ])

    // Get basic client info
    const clientInfo = transactions[0] || transfers[0]

    // Format all transactions data for the AI (anonymized - no city)
    const transactionsData = transactions.map(t =>
      `Дата: ${t.date}, Категория: ${t.category}, Сумма: ${t.amount} ${t.currency}, Статус: ${t.status}`
    ).join('\n')

    // Format all transfers data for the AI (anonymized - no city)
    const transfersData = transfers.map(t =>
      `Дата: ${t.date}, Тип: ${t.type}, Направление: ${t.direction}, Сумма: ${t.amount} ${t.currency}`
    ).join('\n')

    // Generate push notification using OpenAI with complete data
    const prompt = `
t pushКЛИЕНТ: ${clientInfo?.name || 'Client'} (${clientInfo?.product || 'Unknown'})

ВСЕ ТРАНЗАКЦИИ (${transactions.length} записей):
${transactionsData}

ВСЕ ПЕРЕВОДЫ (${transfers.length} записей):
${transfersData}

ЗАДАЧА: 
1. Проанализируй ВСЕ данные транзакций и переводов
2. Определи паттерны поведения клиента (категории трат, частота операций, валютные операции, остатки)
3. Выбери самый выгодный продукт из 10 доступных
4. Рассчитай потенциальную выгоду для клиента
5. Создай персонализированное push-уведомление по структуре: контекст + польза + CTA

ТРЕБОВАНИЯ:
- Длина 180-220 символов
- Обращение на "вы" с маленькой буквы
- Конкретные цифры и факты из данных
- Четкий CTA в конце
- Тон: дружелюбно, на равных, без канцеляризмов

Верни только текст push-уведомления.
    `

    console.log("HERE IS THE PROMPT")
    console.log(prompt)
    console.log(`\n=== PROMPT INFO ===`)
    console.log(`Prompt length: ${prompt.length} characters`)
    console.log(`Transactions count: ${transactions.length}`)
    console.log(`Transfers count: ${transfers.length}`)
    console.log(`==================\n`)

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using more capable model for better analysis
      messages: [
        {
          role: "system",
          content: `Ты - ИИ-финансовый консультант от BCC bank, который анализирует поведение клиентов и рекомендует банковские продукты с персонализированными push-уведомлениями.

ЗАДАЧА: Проанализируй ВСЕ данные транзакций и переводов клиента за 3 месяца, выбери самый выгодный продукт и создай персонализированное push-уведомление.

ДОСТУПНЫЕ ПРОДУКТЫ И СИГНАЛЫ:
1. Карта для путешествий - кешбэк на Путешествия/Отели/Такси, траты в USD/EUR
2. Премиальная карта - кешбэк 2-4% + повышенный на ювелирку/косметику/рестораны, бесплатные снятия
3. Кредитная карта - до 10% в топ-категориях + онлайн-сервисы, рассрочка
4. Обмен валют - экономия на спреде, авто-покупка по курсу
5. Кредит наличными - быстрый доступ к финансам
6. Депозит мультивалютный - проценты + удобство хранения валют
7. Депозит сберегательный - максимальная ставка за "заморозку"
8. Депозит накопительный - повышенная ставка, пополнения без снятий
9. Инвестиции - нулевые комиссии, низкий порог входа
10. Золотые слитки - защитный актив

ТОНАЛЬНОСТЬ (TOV):
- На равных, просто и по-человечески, доброжелательно
- Обращение на "вы" (с маленькой буквы)
- Важное в начало, без воды и канцеляризмов
- Длина 180-220 символов
- Один восклицательный знак максимум
- Четкий CTA (2-4 слова): "Открыть карту", "Настроить обмен", "Оформить сейчас"

СТРУКТУРА УВЕДОМЛЕНИЯ:
1. Персональный контекст (наблюдение по тратам)
2. Польза/объяснение (как продукт решает задачу)
3. Четкий CTA

ОБЯЗАТЕЛЬНО верни ответ ТОЛЬКО в этом формате:
ПРОДУКТ: [точное название продукта из списка]
УВЕДОМЛЕНИЕ: [текст push-уведомления]

Пример:
ПРОДУКТ: Карта для путешествий
УВЕДОМЛЕНИЕ: Айгерим, в августе вы сделали 12 поездок на такси на 27 400 ₸. С картой для путешествий вернули бы ≈1 100 ₸. Откройте карту в приложении.

Вот примеры как надо:
Шаблоны (параметризованные, без брендинга)
●	Карта для путешествий:
 «{name}, в {month} у вас много поездок/такси. С тревел-картой часть расходов вернулась бы кешбэком. Хотите оформить?»

●	Премиальная карта:
 «{name}, у вас стабильно крупный остаток и траты в ресторанах. Премиальная карта даст повышенный кешбэк и бесплатные снятия. Оформить сейчас.»

●	Кредитная карта:
 «{name}, ваши топ-категории — {cat1}, {cat2}, {cat3}. Кредитная карта даёт до 10% в любимых категориях и на онлайн-сервисы. Оформить карту.»

●	FX/мультивалютный продукт:
 «{name}, вы часто платите в {fx_curr}. В приложении выгодный обмен и авто-покупка по целевому курсу. Настроить обмен.»

●	Вклады (сберегательный/накопительный):
 «{name}, у вас остаются свободные средства. Разместите их на вкладе — удобно копить и получать вознаграждение. Открыть вклад.»

●	Инвестиции:
 «{name}, попробуйте инвестиции с низким порогом входа и без комиссий на старт. Открыть счёт.»

●	Кредит наличными (только при явной потребности):
 «{name}, если нужен запас на крупные траты — можно оформить кредит наличными с гибкими выплатами. Узнать доступный лимит.»
`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 250,
      temperature: 0.7
    })

    // Log token usage
    const usage = completion.usage
    console.log(`\n=== TOKEN USAGE ===`)
    console.log(`Input tokens: ${usage.prompt_tokens}`)
    console.log(`Output tokens: ${usage.completion_tokens}`)
    console.log(`Total tokens: ${usage.total_tokens}`)
    console.log(`==================\n`)

    const aiResponse = completion.choices[0].message.content.trim()

    // Parse the AI response to extract product name and push notification
    console.log(`\n=== RAW AI RESPONSE ===`)
    console.log(aiResponse)
    console.log(`======================\n`)

    const productMatch = aiResponse.match(/ПРОДУКТ:\s*(.+?)(?:\n|$)/i)
    const notificationMatch = aiResponse.match(/УВЕДОМЛЕНИЕ:\s*(.+)/s)

    let productName = "Неизвестный продукт"
    let pushNotification = aiResponse

    if (productMatch) {
      productName = productMatch[1].trim()
    } else {
      // Fallback: try to extract product name from the notification text
      const productKeywords = [
        'Карта для путешествий', 'Премиальная карта', 'Кредитная карта',
        'Обмен валют', 'Кредит наличными', 'Депозит мультивалютный',
        'Депозит сберегательный', 'Депозит накопительный', 'Инвестиции', 'Золотые слитки'
      ]

      for (const keyword of productKeywords) {
        if (aiResponse.includes(keyword)) {
          productName = keyword
          break
        }
      }
    }

    if (notificationMatch) {
      pushNotification = notificationMatch[1].trim()
    } else {
      // Fallback: use the entire response as notification
      pushNotification = aiResponse.replace(/ПРОДУКТ:\s*.+?\n?/i, '').trim()
    }

    console.log(`\n=== AI RESPONSE PARSING ===`)
    console.log(`Product: ${productName}`)
    console.log(`Notification: ${pushNotification}`)
    console.log(`==========================\n`)

    // Calculate some basic stats for response
    const totalSpending = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
    const spendingByCategory = {}
    transactions.forEach(transaction => {
      const category = transaction.category
      const amount = parseFloat(transaction.amount)
      spendingByCategory[category] = (spendingByCategory[category] || 0) + amount
    })

    const topCategories = Object.entries(spendingByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount: amount.toFixed(2) }))

    // Create output directory if it doesn't exist
    const outputDir = 'output'
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Escape CSV content properly
    const escapeCSV = (str) => {
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }

    // Generate CSV content with proper escaping
    const csvContent = `client_code,product,push_notification\n${clientId},"${escapeCSV(productName)}","${escapeCSV(pushNotification)}"`

    // Write CSV file locally with UTF-8 BOM for proper encoding
    const csvFileName = `client_${clientId}_recommendation.csv`
    const csvFilePath = `${outputDir}/${csvFileName}`
    const csvWithBOM = '\uFEFF' + csvContent
    fs.writeFileSync(csvFilePath, csvWithBOM, 'utf8')

    console.log(`\n=== CSV FILE CREATED ===`)
    console.log(`File: ${csvFilePath}`)
    console.log(`Content: ${csvContent}`)
    console.log(`========================\n`)

    // Return JSON response with file info
    res.json({
      success: true,
      clientId,
      productName,
      pushNotification,
      csvFile: csvFilePath,
      message: `CSV file created successfully: ${csvFilePath}`
    })

  } catch (error) {
    console.error('Error generating push notification:', error)
    res.status(500).json({
      error: 'Failed to generate push notification',
      message: error.message
    })
  }
})


const start = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.log(e);
  }
};

start();