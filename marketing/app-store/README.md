# Jorgo — App Store'го чыгаруу

## 1. Сиз өзүңүз жасай турган кадамдар (бир жолу)

1. **Apple Developer** аккаунтун ачуу: https://developer.apple.com/programs/enroll/ — жылына $99.
   Жеке адам катары (Individual) же ИП/ОсОО катары (Organization, D-U-N-S номери керек) катталсаңыз болот.
   Apple ырастаганга 1–2 күн кетиши мүмкүн.
2. **App Store Connect'те колдонмону түзүү:** https://appstoreconnect.apple.com → Apps → «+» → New App
   - Platform: iOS
   - Name: `Jorgo — Электровелосипед`
   - Primary language: Russian
   - Bundle ID: `kg.jorgo.client` (тизмеде жок болсо — developer.apple.com → Identifiers → «+» менен адегенде ушул ID'ни кошуңуз)
   - SKU: `jorgo-client`
3. **API ачкыч түзүү:** App Store Connect → Users and Access → Integrations → App Store Connect API → «+»
   - Name: `Expo`, Access: **App Manager**
   - `.p8` файлын жүктөп алыңыз (бир гана жолу жүктөлөт!), **Key ID** жана бетинин үстүндөгү **Issuer ID**'ни көчүрүп алыңыз.
4. **GitHub'ка кошуу:** репозиторий → Settings → Secrets and variables → Actions
   - **Secrets** (New repository secret):
     - `ASC_KEY_P8` — .p8 файлын блокнот менен ачып, ичиндеги тексттин баарын (`-----BEGIN PRIVATE KEY-----` дан `-----END PRIVATE KEY-----` чейин)
     - `ASC_KEY_ID` — Key ID
     - `ASC_ISSUER_ID` — Issuer ID
   - **Variables** (Variables өтмөгү → New repository variable):
     - `APPLE_TEAM_ID` — developer.apple.com → Account → Membership details → Team ID
     - `ASC_APP_ID` — App Store Connect → колдонмоңуз → App Information → **Apple ID** (сандар)
     - `APPLE_TEAM_TYPE` — Organization катары катталсаңыз гана: `COMPANY_OR_ORGANIZATION`

   ⚠️ Ачкычтарды чатка жазбаңыз — ушул жерге гана.
5. **Куруу жана жөнөтүү:** GitHub → Actions → **iOS App Store** → Run workflow.
   30–90 мүнөттөн кийин колдонмо App Store Connect → TestFlight'та пайда болот.
6. App Store Connect'те төмөндөгү тексттерди, скриншотторду жана купуялык жоопторун толтуруп, **Submit for Review** басыңыз.
   Apple 1–3 күндө карайт.

## 2. Скриншоттор (iPhone 6.9", 1290×2796)

Ушул папкада: `1-home.png`, `2-catalog.png`, `3-rent.png`, `4-repair.png`, `5-bike.png`, `6-contacts.png`.
App Store Connect → iOS App → 6.9" Display бөлүмүнө сүйрөп салыңыз (3–10 даана).

## 3. App Store барагы

**Category:** Shopping (кошумча: Lifestyle) · **Age rating:** 4+ · **Price:** Free

**Support URL:** https://ilgiz1win-ux.github.io/jorgo-client/contacts
**Privacy Policy URL:** https://ilgiz1win-ux.github.io/jorgo-client/account/info?type=privacy
**Marketing URL:** https://ilgiz1win-ux.github.io/jorgo-client/

App Store'до кыргыз тили жок, ошондуктан барак орусча жана англисче. Колдонмонун өзү 5 тилде (кыргызча, орусча, англисче, өзбекче, казакча).

### Русский

- **Subtitle (30):** Электровелосипеды и ремонт
- **Promotional text (170):** Покупка, аренда и ремонт электровелосипедов в Бишкеке. Вызовите мастера на дом, следите за заказом и арендой прямо в приложении.
- **Keywords (100):** электровелосипед,аренда,ремонт,самокат,мастер,бишкек,аккумулятор,курьер,запчасти,велосипед
- **Description:**

```
Jorgo Eco Service — электровелосипеды в Бишкеке: продажа, аренда, ремонт и запчасти.

• Каталог: электровелосипеды, аккумуляторы, запчасти и аксессуары. Заказ без регистрации — заберите в нашей точке или закажите экспресс-доставку.
• Аренда для курьеров и на каждый день: оформление договора в приложении, оплата с баланса по дням, напоминания до окончания баланса.
• Выезд мастера: опишите проблему, приложите фото и укажите адрес — мастер сообщит, во сколько приедет.
• Ремонт в точке: запишитесь в удобный филиал.
• Мои заказы: статус заказа, ремонта и аренды в одном месте; оценка работы мастера.
• Чат с администратором прямо в приложении.
• Три филиала в Бишкеке, работаем ежедневно.

Языки: кыргызский, русский, английский, узбекский, казахский.
```

### English (U.S.)

- **Subtitle (30):** E-bikes, rentals & repair
- **Promotional text (170):** Buy, rent and repair e-bikes in Bishkek. Call a mechanic to your door and track your orders and rentals right in the app.
- **Keywords (100):** e-bike,electric bike,rental,repair,mechanic,bishkek,battery,courier,spare parts,scooter
- **Description:**

```
Jorgo Eco Service — e-bikes in Bishkek: sales, rentals, repair and spare parts.

• Catalogue: e-bikes, batteries, parts and accessories. Order without an account — pick up at our shop or choose express delivery.
• Rentals for couriers and everyday riders: sign the agreement in the app, pay daily from your balance, get reminders before it runs out.
• Mechanic call-out: describe the problem, add photos and your address — the mechanic tells you when they will arrive.
• In-shop repair: book a visit at a convenient branch.
• My orders: order, repair and rental status in one place; rate the mechanic's work.
• Chat with the shop right in the app.
• Three branches in Bishkek, open every day.

Languages: Kyrgyz, Russian, English, Uzbek, Kazakh.
```

## 4. App Privacy (купуялык суроолору)

«Do you or your third-party partners collect data from this app?» → **Yes**

| Data type | Linked to user | Tracking | Purpose |
|---|---|---|---|
| Contact Info → Name | Yes | No | App Functionality |
| Contact Info → Phone Number | Yes | No | App Functionality |
| Contact Info → Physical Address | Yes | No | App Functionality |
| Location → Precise Location | Yes | No | App Functionality |
| User Content → Photos or Videos (паспорт, селфи, чек, велосипед) | Yes | No | App Functionality |
| User Content → Customer Support (чат) | Yes | No | App Functionality, Customer Support |
| Purchases → Purchase History | Yes | No | App Functionality |
| Identifiers → User ID | Yes | No | App Functionality |

Tracking (жарнама үчүн көзөмөлдөө) — **жок**.

## 5. App Review үчүн маалымат

- **Sign-in required:** аккаунтсуз да колдонсо болот, бирок ижара, выезд жана баланс үчүн кирүү керек.
  Apple'га сыноо аккаунтун бериңиз: колдонмодо жаңы аккаунт түзүп (мисалы, `+996 700 000 001` / сырсөз), ошол телефон номерин жана сырсөздү **Sign-in information** талаасына жазыңыз.
  Аккаунтту өчүрүү: Аккаунт → Жөндөөлөр → Аккаунтту өчүрүү.
- **Notes (англисче):**

```
Jorgo Eco Service is an e-bike shop in Bishkek, Kyrgyzstan. Browsing and ordering products works without an account.
An account is needed for rentals, mechanic call-outs and the balance. Payments for physical goods and services are made
by bank transfer to the shop (the customer uploads a screenshot, the shop confirms), so no in-app purchases are used.
Passport and selfie photos are requested only to sign a bike rental agreement and are visible to shop administrators only.
Account deletion: Account → Settings → Delete account.
```
