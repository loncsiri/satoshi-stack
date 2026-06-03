# ₿ Satoshi Stack

A private, client-side only Bitcoin accumulation tracker, forecasting tool, and retirement planner built for Bitcoiners. 

**Satoshi Stack** lets you visualize your Bitcoin journey without relying on invasive third-party portfolio trackers. Import your purchases via a local CSV or a published Google Sheet and analyze your progress towards your target stack and retirement goals securely.

## 🌟 Key Features

* **100% Client-Side Privacy**: Your transaction data never leaves your browser. It is processed locally and stored in your browser's `localStorage`.
* **Privacy Mode (Screenshot-Safe)**: One-click toggle (the eye icon) to completely hide sensitive balances when taking screenshots or sharing your dashboard with others.
* **Dual Currency Support**: Switch seamlessly between THB and USD. The app pulls from multiple robust APIs to calculate live exchange rates dynamically.
* **Goal Forecasting Module**: Input a target Bitcoin amount and your monthly budget. The app projects exactly when you will reach your goal based on your historical accumulation rate vs. your planned strategy.
* **Bitcoin Retirement Planner**: Map out your future. Enter your life expectancy, desired passive income, pension inputs, and inflation rates to see exactly what age you can confidently retire on a Bitcoin standard.
* **Modern Aesthetic**: Fully responsive Dark / Light mode UI built with Tailwind CSS.

---

## 🇹🇭 คำอธิบายภาษาไทย (Thai Description)

**Satoshi Stack** คือแอปพลิเคชันสำหรับติดตามการสะสมบิตคอยน์ (Bitcoin Accumulation Tracker) เครื่องมือพยากรณ์ และเครื่องมือวางแผนการเกษียณที่สร้างขึ้นมาเพื่อชาว Bitcoiner โดยเฉพาะ

แอปพลิเคชันนี้ช่วยให้คุณสามารถเห็นภาพรวมการออมบิตคอยน์ของคุณได้โดยไม่ต้องพึ่งพาแพลตฟอร์มของบุคคลที่สามที่อาจรุกล้ำความเป็นส่วนตัว คุณสามารถนำเข้าข้อมูลการซื้อของคุณผ่านไฟล์ CSV ในเครื่องหรือ Google Sheet ได้อย่างง่ายดายและปลอดภัย

### 🌟 คุณสมบัติเด่น:
* **ความเป็นส่วนตัว 100% (Client-Side)**: ข้อมูลธุรกรรมทั้งหมดของคุณจะไม่มีการถูกส่งออกจากเบราว์เซอร์ การประมวลผลทุกอย่างเกิดขึ้นภายในเครื่องและถูกเก็บไว้ใน `localStorage` ของเบราว์เซอร์เท่านั้น
* **โหมดความเป็นส่วนตัว (Privacy Mode)**: ปุ่มเปิด/ปิด (ไอคอนรูปตา) เพื่อซ่อนยอดเงินของคุณ ปลอดภัยต่อการแคปหน้าจอเพื่อแชร์ให้ผู้อื่นดู
* **รองรับ 2 สกุลเงิน (THB / USD)**: สลับดูพอร์ตการลงทุนระหว่างเงินบาทและดอลลาร์สหรัฐได้อย่างไร้รอยต่อ โดยแอปจะดึงราคาบิตคอยน์ล่าสุดจาก API สาธารณะเพื่อคำนวณอัตราแลกเปลี่ยนแบบเรียลไทม์
* **ระบบพยากรณ์เป้าหมาย (Goal Forecasting)**: ระบบจะช่วยคำนวณและพยากรณ์ว่าคุณจะไปถึงเป้าหมายบิตคอยน์ที่ตั้งไว้เมื่อใด โดยประเมินจากประวัติการลงทุนและแผนการออมรายเดือนของคุณ
* **เครื่องมือวางแผนการเกษียณ (Retirement Planner)**: วางแผนอนาคตของคุณด้วยการป้อนข้อมูลส่วนตัว เช่น รายได้ที่ต้องการหลังเกษียณ และอัตราเงินเฟ้อ เพื่อจำลองอายุที่คุณสามารถเกษียณได้อย่างมั่นคงบนมาตรฐานบิตคอยน์ (Bitcoin Standard)
* **ความปลอดภัยระดับสูงสุด**: ไม่มีการเก็บข้อมูลลงฐานข้อมูล, ไม่มีการเชื่อมต่อกับกระเป๋า (Wallet), ไม่มีการขอ `xpub` หรือ API Key ใดๆ ทั้งสิ้น ป้องกันปัญหาการรั่วไหลของข้อมูล UTXO โดยสิ้นเชิง

## 🔒 Security & Privacy Model

As Bitcoiners, privacy and security are paramount. Here is exactly how Satoshi Stack protects your opsec:

1. **No Backend Database**: This application does not have a centralized database. There is no user registration, no server-side analytics, and no cloud data harvesting. 
2. **Local Processing**: When you upload a CSV or link a Google Sheet, the parsing and calculations happen entirely in your local browser memory.
3. **No API Keys or Wallet Connections Required**: We do not ask for API keys, `xpub` keys, or wallet signatures. This prevents any risk of accidentally exposing your on-chain UTXO footprint or API secrets. You manually maintain your records in a simple spreadsheet.
4. **Public APIs Only**: The only outbound network requests made by this app are to fetch the live Bitcoin price from public, unauthenticated APIs (Binance, CoinGecko, CoinDesk). *Note: While your IP address makes requests to these price providers, your portfolio data is NEVER transmitted.*
5. **Open Source**: The code is fully transparent. You can audit it, build it, and run it locally on an air-gapped or restricted machine.

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/satoshistack.git
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

## 📊 Data Formatting (CSV / Google Sheets)

To track your portfolio, you will need a CSV file with the following column mappings. You can easily manage this in Google Sheets or Excel and export as CSV.

* **Column A (1st column):** DATE (Format: YYYY-MM-DD)
* **Column B (2nd column):** BTC Amount (e.g., `0.015`)
* **Column C (3rd column):** Fiat Amount Cost (Total spent for that transaction)
* **Column D (4th column):** BTC Price at Purchase (Optional, derived if missing)
* **Column E (5th column):** Location/Vault (e.g., `ColdCard`, `Trezor`, `Exchange`)

## 🛠 Tech Stack
* **Framework:** React + TypeScript + Vite
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Charts:** Recharts

## 📄 License
MIT License
