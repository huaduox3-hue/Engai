import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // NewebPay Checkout Setup (Placeholder for requirements)
  // The user needs this live URL to give to NewebPay for return/notify URLs
  app.post("/api/payment/create-order", (req, res) => {
    const { plan, cycle, amount } = req.body;
    
    // In a real implementation, you would generate a MerchantID and TradeInfo hash here
    // based on your NEWEBPAY_HASH_KEY and NEWEBPAY_HASH_IV
    
    const orderId = `匠心-${Date.now()}`;
    
    // Mocking the data structure needed for a payment form
    res.json({
      status: "success",
      paymentData: {
        MerchantID: process.env.VITE_NEWEBPAY_MERCHANT_ID || 'MOCK_MERCHANT_ID',
        TradeInfo: "ENCRYPTED_DATA_HERE",
        TradeSha: "HASHED_DATA_HERE",
        Version: "2.0",
        orderId,
        amount
      }
    });
  });

  // Handle NewebPay Notify (Server-to-Server)
  app.post("/api/payment/notify", (req, res) => {
    console.log("NewebPay Notify Received:", req.body);
    // Here you would decrypt TradeInfo and update the Firebase user profile
    res.send("1"); // Requirement: Send '1' to confirm receipt to NewebPay
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Payment Notify URL: http://<YOUR_DEPLOYED_URL>/api/payment/notify`);
  });
}

startServer();
