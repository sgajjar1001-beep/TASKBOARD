import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const portArgIndex = process.argv.indexOf('--port');
  const portArg = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : undefined;
  // Dev server must always run on port 3000 as per platform constraints
  const PORT = portArg || (isProd ? (Number(process.env.PORT) || 8080) : 3000);

  app.use(express.json({ limit: '15mb' }));

  // File-based persistence directory for cross-device sync
  const DATA_DIR = path.join(__dirname, 'data');
  const SYNC_FILE = path.join(DATA_DIR, 'sync_store.json');

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create data dir, using in-memory store fallback');
    }
  }

  // In-memory cache + file sync store
  let memoryStore: Record<string, any> = {};

  const loadStore = (): Record<string, any> => {
    try {
      if (fs.existsSync(SYNC_FILE)) {
        const fileContent = fs.readFileSync(SYNC_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        memoryStore = { ...memoryStore, ...parsed };
      }
    } catch (e) {
      console.error('Error reading sync store from disk:', e);
    }
    return memoryStore;
  };

  const saveStore = (store: Record<string, any>) => {
    memoryStore = store;
    try {
      if (fs.existsSync(DATA_DIR)) {
        fs.writeFileSync(SYNC_FILE, JSON.stringify(store, null, 2), 'utf-8');
      }
    } catch (e) {
      console.error('Error writing sync store to disk:', e);
    }
  };

  // Initial load
  loadStore();

  // API Routes for Multi-Device Sync
  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 2. Push data to cloud sync under a specific room / sync key
  app.post('/api/sync/push', (req, res) => {
    try {
      const { key, payload } = req.body;
      if (!key || !payload) {
        return res.status(400).json({ error: 'Missing key or payload parameter' });
      }

      const cleanKey = String(key).trim().toLowerCase();
      if (!cleanKey) {
        return res.status(400).json({ error: 'Invalid key' });
      }

      const store = loadStore();
      const now = Date.now();
      const existing = store[cleanKey];

      // If client timestamp is provided, store it
      store[cleanKey] = {
        ...payload,
        updatedAt: now,
        serverTimestamp: new Date().toISOString(),
      };

      saveStore(store);

      return res.json({
        success: true,
        key: cleanKey,
        updatedAt: now,
        itemCount: Array.isArray(payload.notes) ? payload.notes.length : 0,
      });
    } catch (err: any) {
      console.error('Error in /api/sync/push:', err);
      return res.status(500).json({ error: 'Internal server error saving sync data' });
    }
  });

  // 3. Pull data from cloud sync for a specific sync key
  app.get('/api/sync/pull', (req, res) => {
    try {
      const key = req.query.key as string;
      if (!key) {
        return res.status(400).json({ error: 'Missing key parameter' });
      }

      const cleanKey = String(key).trim().toLowerCase();
      const store = loadStore();
      const record = store[cleanKey];

      if (!record) {
        return res.status(404).json({
          error: 'No data found for this sync key',
          notFound: true,
          key: cleanKey,
        });
      }

      return res.json({
        success: true,
        key: cleanKey,
        data: record,
        updatedAt: record.updatedAt || 0,
      });
    } catch (err: any) {
      console.error('Error in /api/sync/pull:', err);
      return res.status(500).json({ error: 'Internal server error loading sync data' });
    }
  });

  // 4. Status check: check if remote key exists and get last update time
  app.get('/api/sync/status', (req, res) => {
    try {
      const key = req.query.key as string;
      if (!key) {
        return res.status(400).json({ error: 'Missing key parameter' });
      }

      const cleanKey = String(key).trim().toLowerCase();
      const store = loadStore();
      const record = store[cleanKey];

      if (!record) {
        return res.json({ exists: false, key: cleanKey });
      }

      return res.json({
        exists: true,
        key: cleanKey,
        updatedAt: record.updatedAt || 0,
        itemCount: Array.isArray(record.notes) ? record.notes.length : 0,
        userName: record.userName || record.prefs?.userName,
      });
    } catch (err: any) {
      console.error('Error in /api/sync/status:', err);
      return res.status(500).json({ error: 'Internal server error checking sync status' });
    }
  });

  // =========================================================================
  // GENUINE 6-DIGIT EMAIL OTP VERIFICATION SYSTEM (Resend API + In-Memory TTL)
  // =========================================================================
  interface OtpEntry {
    email: string;
    otp: string;
    createdAt: number;
    expiresAt: number; // 10 minutes TTL
    attempts: number; // max 5 attempts
    verified: boolean;
    token?: string;
  }

  const otpStore = new Map<string, OtpEntry>();

  // Cleanup expired OTP records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of otpStore.entries()) {
      if (now > entry.expiresAt) {
        otpStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // 5. Send 6-digit OTP to user's email
  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email address is required' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email format' });
      }

      const now = Date.now();
      const existing = otpStore.get(cleanEmail);

      // 60-second cooldown rate limit between OTP requests
      if (existing && now - existing.createdAt < 60 * 1000) {
        const remainingSeconds = Math.ceil((60 * 1000 - (now - existing.createdAt)) / 1000);
        return res.status(429).json({
          error: `Please wait ${remainingSeconds} seconds before requesting another code.`,
          retryAfter: remainingSeconds,
        });
      }

      // Generate cryptographically secure 6-digit numeric OTP
      const otp = String(crypto.randomInt(100000, 1000000));
      const expiresAt = now + 10 * 60 * 1000; // 10 minutes

      otpStore.set(cleanEmail, {
        email: cleanEmail,
        otp,
        createdAt: now,
        expiresAt,
        attempts: 0,
        verified: false,
      });

      const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
      // Use Resend's free default sending domain onboarding@resend.dev (unverified domains like taskboard.com will be rejected by Resend)
      const rawFrom = process.env.RESEND_FROM_EMAIL?.trim();
      const fromEmail = (rawFrom && !rawFrom.includes('taskboard.com') && rawFrom.includes('@'))
        ? rawFrom
        : 'Work Board <onboarding@resend.dev>';
      let emailDispatched = false;
      let emailError = '';

      // If RESEND_API_KEY is configured, send official HTML email via Resend API
      if (resendApiKey) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [cleanEmail],
              subject: `${otp} is your Work Board verification code`,
              html: `
                <!DOCTYPE html>
                <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f3f4; padding: 24px; margin: 0;">
                  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #dadce0; padding: 32px 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <h2 style="margin: 0; color: #202124; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">WORK <span style="color: #1a73e8;">BOARD</span></h2>
                      <p style="margin: 4px 0 0 0; color: #5f6368; font-size: 13px; font-weight: 500;">Account Verification Code</p>
                    </div>
                    <div style="background-color: #f8f9fa; border: 1px solid #e8eaed; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                      <p style="margin: 0 0 16px 0; color: #3c4043; font-size: 14px; font-weight: 500;">Hello ${name ? String(name).trim() : 'there'}, use the following 6-digit verification code to complete your signup:</p>
                      <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #1a73e8; padding: 14px 24px; background-color: #ffffff; border: 2px dashed #1a73e8; border-radius: 12px; display: inline-block; font-family: monospace;">
                        ${otp}
                      </div>
                      <p style="margin: 14px 0 0 0; color: #5f6368; font-size: 12px;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
                    </div>
                    <p style="color: #80868b; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                      If you did not request this verification code, please ignore this email.
                    </p>
                  </div>
                </body>
                </html>
              `,
            }),
          });

          if (emailResponse.ok) {
            emailDispatched = true;
          } else {
            const errData = await emailResponse.json().catch(() => ({}));
            emailError = errData?.message || 'Resend API returned error';
            console.warn('[OTP Service] Resend dispatch note:', emailError);
          }
        } catch (dispatchErr: any) {
          emailError = dispatchErr?.message || 'Network error reaching email provider';
          console.warn('[OTP Service] Email dispatch failed:', dispatchErr);
        }
      }

      console.log(`[OTP Service] Generated 6-digit OTP for ${cleanEmail}: [ ${otp} ] (Expires in 10 mins). Resend Dispatched: ${emailDispatched}`);

      return res.json({
        success: true,
        message: emailDispatched
          ? `Verification OTP sent to ${cleanEmail}. Please check your inbox.`
          : resendApiKey
          ? `Code generated! (Email provider notice: ${emailError})`
          : `Verification OTP generated! (RESEND_API_KEY not set yet in .env)`,
        emailDispatched,
        // Only provide devOtp when real email could not be dispatched
        devOtp: !emailDispatched && !isProd ? otp : undefined,
      });
    } catch (err: any) {
      console.error('Error in /api/auth/send-otp:', err);
      return res.status(500).json({ error: 'Internal server error generating OTP' });
    }
  });

  // 6. Verify 6-digit OTP endpoint
  app.post('/api/auth/verify-otp', (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ error: 'Email and 6-digit OTP are required' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const cleanOtp = String(otp).trim().replace(/\D/g, '');

      const record = otpStore.get(cleanEmail);
      if (!record) {
        return res.status(400).json({
          error: 'No active OTP found for this email. Please click "Resend Code" to request a new code.',
        });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(cleanEmail);
        return res.status(400).json({
          error: 'Verification code has expired (10 minutes limit). Please request a new code.',
        });
      }

      if (record.attempts >= 5) {
        otpStore.delete(cleanEmail);
        return res.status(429).json({
          error: 'Too many incorrect attempts. Code locked for security. Please request a new code.',
        });
      }

      record.attempts += 1;

      if (record.otp !== cleanOtp) {
        const remaining = 5 - record.attempts;
        return res.status(400).json({
          error: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code locked.'}`,
          attemptsRemaining: remaining,
        });
      }

      // Successful verification!
      record.verified = true;
      const verificationToken = crypto.randomBytes(24).toString('hex');
      record.token = verificationToken;

      return res.json({
        success: true,
        verified: true,
        token: verificationToken,
        message: 'Email successfully verified with 6-digit OTP!',
      });
    } catch (err: any) {
      console.error('Error in /api/auth/verify-otp:', err);
      return res.status(500).json({ error: 'Internal server error verifying OTP' });
    }
  });

  // Mount Vite or serve static
  if (!isProd) {
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
