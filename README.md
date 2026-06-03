# ₿ Satoshi Stack

[🇺🇸 English](#english) | [🇹🇭 ภาษาไทย](#ภาษาไทย)

---

<a name="english"></a>
## 🇺🇸 English

A private, client-side only Bitcoin accumulation tracker, forecasting tool, and retirement planner built for Bitcoiners. 

**Satoshi Stack** lets you visualize your Bitcoin journey without relying on invasive third-party portfolio trackers. Import your purchases via a local CSV or a published Google Sheet and analyze your progress towards your target stack and retirement goals securely.

### 🌟 Key Features
* **100% Client-Side Privacy**: Your transaction data never leaves your browser. It is processed locally and stored in your browser's `localStorage`.
* **Privacy Mode (Screenshot-Safe)**: One-click toggle (the eye icon) to completely hide sensitive balances when taking screenshots or sharing your dashboard with others.
* **Dual Currency Support**: Switch seamlessly between THB and USD. The app pulls from multiple robust APIs to calculate live exchange rates dynamically.
* **Goal Forecasting Module**: Input a target Bitcoin amount and your monthly budget. The app projects exactly when you will reach your goal based on your historical accumulation rate vs. your planned strategy.
* **Bitcoin Retirement Planner**: Map out your future. Enter your life expectancy, desired passive income, pension inputs, and inflation rates to see exactly what age you can confidently retire on a Bitcoin standard.
* **Modern Aesthetic**: Fully responsive Dark / Light mode UI built with Tailwind CSS.

### 🔒 Security & Privacy Model
As Bitcoiners, privacy and security are paramount. Here is exactly how Satoshi Stack protects your opsec:
1. **No Backend Database**: This application does not have a centralized database. There is no user registration, no server-side analytics, and no cloud data harvesting. 
2. **Local Processing**: When you upload a CSV or link a Google Sheet, the parsing and calculations happen entirely in your local browser memory.
3. **No API Keys or Wallet Connections Required**: We do not ask for API keys, `xpub` keys, or wallet signatures. This prevents any risk of accidentally exposing your on-chain UTXO footprint or API secrets. You manually maintain your records in a simple spreadsheet.
4. **Public APIs Only**: The only outbound network requests made by this app are to fetch the live Bitcoin price from public, unauthenticated APIs (Binance, CoinGecko, CoinDesk). *Note: While your IP address makes requests to these price providers, your portfolio data is NEVER transmitted. This also protects the app from being rate-limited globally.*
5. **Open Source**: The code is fully transparent. You can audit it, build it, and run it locally on an air-gapped or restricted machine.

#### ⚠️ Important Notice for Google Sheets Users
If you use the **Google Sheets Sync** feature, you must set your sheet to *"Anyone with the link can view"*. 
- **DO NOT** put personally identifiable information (PII) such as your real name, bank account numbers, or home address in this spreadsheet.
- While the 44-character Google Sheet ID is secure and virtually impossible to guess, if you accidentally share or leak the URL, anyone could read your purchase history.

### 🚀 Getting Started
**Prerequisites**
* Node.js (v18+)
* npm or yarn

**Installation**
1. Clone the repository:
   ```bash
   git clone https://github.com/loncsiri/satoshi-stack.git
   cd satoshistack
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

### ⚡ How to Enable "Add Transaction" (Google Sheets Webhook)
You can add transactions directly from the app to your Google Sheet without setting up OAuth.
1. Open your Google Sheet.
2. Click **Extensions > Apps Script**.
3. Paste the following code:
```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  // Matches CSV format: Date, BTC, Fiat, Price(Empty), Location
  sheet.appendRow([data.date, data.btc, data.fiat, "", data.location]);
  return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}
```
4. Click **Deploy > New Deployment**.
5. Set type to **Web App**, execute as **Me**, and Who has access to **Anyone**.
6. Click Deploy, copy the **Web App URL**, and paste it into Satoshi Stack's Data Settings.

### 📊 Data Formatting (CSV / Google Sheets)
To track your portfolio, you will need a CSV file with the following column mappings. You can easily manage this in Google Sheets or Excel and export as CSV.
* **Column A (1st column):** DATE (Format: YYYY-MM-DD)
* **Column B (2nd column):** BTC Amount (e.g., `0.015`)
* **Column C (3rd column):** Fiat Amount Cost (Total spent for that transaction)
* **Column D (4th column):** BTC Price at Purchase (Optional, derived if missing)
* **Column E (5th column):** Location/Vault (e.g., `ColdCard`, `Trezor`, `Exchange`)

### 🛠 Tech Stack
* **Framework:** React + TypeScript + Vite
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Charts:** Recharts

### ⚖️ Disclaimer
**Satoshi Stack is a calculator provided for educational and entertainment purposes only.** It does not constitute financial advice. All future projections are hypothetical and Bitcoin is a highly volatile asset. Please do your own research (DYOR) before making any financial decisions.

### 📄 License
MIT License

---

<a name="ภาษาไทย"></a>
## 🇹🇭 ภาษาไทย

**Satoshi Stack** คือแอปพลิเคชันสำหรับติดตามการสะสมบิตคอยน์ (Bitcoin Accumulation Tracker) เครื่องมือพยากรณ์ และเครื่องมือวางแผนการเกษียณที่สร้างขึ้นมาเพื่อชาว Bitcoiner โดยเฉพาะ

แอปพลิเคชันนี้ช่วยให้คุณสามารถเห็นภาพรวมการออมบิตคอยน์ของคุณได้โดยไม่ต้องพึ่งพาแพลตฟอร์มของบุคคลที่สามที่อาจรุกล้ำความเป็นส่วนตัว คุณสามารถนำเข้าข้อมูลการซื้อของคุณผ่านไฟล์ CSV ในเครื่องหรือ Google Sheet ได้อย่างง่ายดายและปลอดภัย

### 🌟 คุณสมบัติเด่น
* **ความเป็นส่วนตัว 100% (Client-Side)**: ข้อมูลธุรกรรมทั้งหมดของคุณจะไม่มีการถูกส่งออกจากเบราว์เซอร์ การประมวลผลทุกอย่างเกิดขึ้นภายในเครื่องและถูกเก็บไว้ใน `localStorage` ของเบราว์เซอร์เท่านั้น
* **โหมดความเป็นส่วนตัว (Privacy Mode)**: ปุ่มเปิด/ปิด (ไอคอนรูปตา) เพื่อซ่อนยอดเงินของคุณ ปลอดภัยต่อการแคปหน้าจอเพื่อแชร์ให้ผู้อื่นดู
* **รองรับ 2 สกุลเงิน (THB / USD)**: สลับดูพอร์ตการลงทุนระหว่างเงินบาทและดอลลาร์สหรัฐได้อย่างไร้รอยต่อ โดยแอปจะดึงราคาบิตคอยน์ล่าสุดจาก API สาธารณะเพื่อคำนวณอัตราแลกเปลี่ยนแบบเรียลไทม์
* **ระบบพยากรณ์เป้าหมาย (Goal Forecasting)**: ระบบจะช่วยคำนวณและพยากรณ์ว่าคุณจะไปถึงเป้าหมายบิตคอยน์ที่ตั้งไว้เมื่อใด โดยประเมินจากประวัติการลงทุนและแผนการออมรายเดือนของคุณ
* **เครื่องมือวางแผนการเกษียณ (Retirement Planner)**: วางแผนอนาคตของคุณด้วยการป้อนข้อมูลส่วนตัว เช่น รายได้ที่ต้องการหลังเกษียณ และอัตราเงินเฟ้อ เพื่อจำลองอายุที่คุณสามารถเกษียณได้อย่างมั่นคงบนมาตรฐานบิตคอยน์ (Bitcoin Standard)
* **ความสวยงามทันสมัย**: หน้าจอรองรับการแสดงผลทั้งแบบ Dark Mode และ Light Mode อย่างสมบูรณ์ พัฒนาด้วย Tailwind CSS

### 🔒 ความปลอดภัยและความเป็นส่วนตัว
สำหรับชาว Bitcoiner ความเป็นส่วนตัวคือสิ่งสำคัญที่สุด นี่คือวิธีที่ Satoshi Stack ปกป้องคุณ:
1. **ไม่มีฐานข้อมูลส่วนกลาง**: แอปพลิเคชันนี้ไม่มีระบบสมัครสมาชิก ไม่มีการเก็บข้อมูลผู้ใช้งาน และไม่มีการดึงข้อมูลใดๆ ไปยังเซิร์ฟเวอร์
2. **ประมวลผลภายในเครื่อง**: เมื่อคุณอัปโหลด CSV หรือลิงก์ Google Sheet การคำนวณทั้งหมดจะเกิดขึ้นบนหน่วยความจำของเบราว์เซอร์ของคุณเท่านั้น
3. **ไม่ต้องใช้ API Key หรือเชื่อมต่อกระเป๋า**: เราไม่ขอรหัส API, `xpub`, หรือลายเซ็นกระเป๋าเงินใดๆ เพื่อป้องกันความเสี่ยงที่ข้อมูล UTXO ของคุณจะหลุดออกไป คุณเพียงแค่ทำบันทึกประวัติด้วยตัวเองใน Spreadsheet
4. **เรียกใช้เฉพาะ API สาธารณะ**: การเชื่อมต่ออินเทอร์เน็ตเดียวที่แอปทำคือการดึงราคาบิตคอยน์ล่าสุดจาก API สาธารณะ (Binance, CoinGecko, CoinDesk) *หมายเหตุ: แม้ IP Address ของคุณจะถูกใช้ดึงราคา แต่ข้อมูลพอร์ตของคุณจะไม่มีวันถูกส่งออกไป*
5. **Open Source**: โค้ดทั้งหมดเปิดเผยโปร่งใส คุณสามารถตรวจสอบ นำไปสร้าง และรันบนเครื่องคอมพิวเตอร์ที่ไม่ได้ต่ออินเทอร์เน็ต (Air-gapped) ได้

#### ⚠️ ข้อควรระวังสำหรับการใช้ Google Sheets
หากคุณใช้ฟีเจอร์เชื่อมต่อกับ **Google Sheets** คุณจำเป็นต้องตั้งค่าไฟล์ให้เป็น *"Anyone with the link can view" (ทุกคนที่มีลิงก์สามารถดูได้)*
- **ห้าม** ใส่ข้อมูลส่วนบุคคล (PII) เช่น ชื่อจริง, เลขที่บัญชีธนาคาร, หรือที่อยู่ลงในไฟล์ Spreadsheet นี้เด็ดขาด
- แม้ว่าลิงก์ของ Google Sheet (ID ความยาว 44 ตัวอักษร) จะปลอดภัยและเดาสุ่มได้ยากมาก แต่หากลิงก์หลุดหรือคุณเผลอแชร์ลิงก์นี้ออกไปสู่สาธารณะ บุคคลอื่นจะสามารถเห็นประวัติการซื้อของคุณได้

### 🚀 การเริ่มต้นใช้งาน
**สิ่งที่ต้องมี**
* Node.js (v18+)
* npm หรือ yarn

**การติดตั้ง**
1. โคลน (Clone) โปรเจกต์:
   ```bash
   git clone https://github.com/loncsiri/satoshi-stack.git
   cd satoshistack
   ```
2. ติดตั้งแพ็กเกจ:
   ```bash
   npm install
   ```
3. รันเซิร์ฟเวอร์จำลอง:
   ```bash
   npm run dev
   ```

### ⚡ วิธีเปิดใช้งานการเพิ่มรายการ (Google Sheets Webhook)
คุณสามารถเพิ่มรายการธุรกรรมจากแอปไปยัง Google Sheet ได้โดยตรง
1. เปิด Google Sheet ของคุณ
2. คลิก **ส่วนขยาย (Extensions) > Apps Script**
3. วางโค้ดนี้ลงไป:
```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([data.date, data.btc, data.fiat, "", data.location]);
  return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}
```
4. คลิก **การทำให้ใช้งานได้ (Deploy) > การทำให้ใช้งานได้รายการใหม่ (New Deployment)**
5. เลือกประเภทเป็น **แอปพลิเคชันเว็บ (Web App)**, สิทธิ์เรียกใช้เป็น **ฉัน (Me)**, และผู้มีสิทธิ์เข้าถึงเป็น **ทุกคน (Anyone)**
6. กดปุ่มนำไปใช้ คัดลอก **Web App URL** แล้วนำไปใส่ในเมนูตั้งค่าของ Satoshi Stack

### 📊 รูปแบบข้อมูล (CSV / Google Sheets)
ในการใช้งาน คุณต้องมีไฟล์ CSV หรือ Google Sheet ที่จัดเรียงคอลัมน์ดังนี้:
* **คอลัมน์ A (คอลัมน์ที่ 1):** วันที่ (รูปแบบ: YYYY-MM-DD)
* **คอลัมน์ B (คอลัมน์ที่ 2):** จำนวนบิตคอยน์ (เช่น `0.015`)
* **คอลัมน์ C (คอลัมน์ที่ 3):** จำนวนเงินที่ใช้ไปทั้งหมด
* **คอลัมน์ D (คอลัมน์ที่ 4):** ราคาบิตคอยน์ ณ วันที่ซื้อ (เว้นว่างได้ ระบบจะคำนวณให้)
* **คอลัมน์ E (คอลัมน์ที่ 5):** สถานที่เก็บ/กระเป๋า (เช่น `ColdCard`, `Trezor`, `Exchange`)

### 🛠 เครื่องมือที่ใช้พัฒนา
* **Framework:** React + TypeScript + Vite
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Charts:** Recharts

### ⚖️ ข้อจำกัดความรับผิดชอบ (Disclaimer)
**Satoshi Stack เป็นเพียงเครื่องมือคำนวณที่สร้างขึ้นเพื่อการศึกษาและความบันเทิงเท่านั้น** ไม่ใช่คำแนะนำทางการลงทุน การพยากรณ์และการคำนวณผลลัพธ์ในอนาคตทั้งหมดเป็นเพียงสมมติฐานเท่านั้น และบิตคอยน์เป็นสินทรัพย์ที่มีความผันผวนสูง โปรดศึกษาข้อมูลด้วยตนเอง (DYOR) ก่อนตัดสินใจทางการเงินใดๆ

### 📄 ลิขสิทธิ์
MIT License
