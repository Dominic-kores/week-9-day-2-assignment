
import "dotenv/config";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";

import { initiateSTKPush } from "./mpesa.js";

import {
  formatPhoneNumber,
  validateAmount,
  maskPhoneNumber
} from "./phone.js";

// Initialise Express.
const app = express();

const port = Number(process.env.PORT) || 3000;

// Development middleware.
app.use(cors());
app.use(express.json({ limit: "20kb" }));

// Temporary in-memory storage.
const transactions = [];
const transactionLogs = [];

/**
 * Log payment initiation attempts securely.
 * Never print complete customer phone numbers.
 */
function logAttempt({
  phoneNumber,
  amount,
  status,
  checkoutRequestId = null,
  error = null
}) {
  const entry = {
    timestamp: new Date().toISOString(),
    maskedPhone: maskPhoneNumber(phoneNumber),
    amount,
    status,
    checkoutRequestId,
    ...(error ? { error } : {})
  };

  transactionLogs.push(entry);

  // Prevent unlimited growth of the in-memory log.
  if (transactionLogs.length > 100) {
    transactionLogs.shift();
  }

  console.log(
    `[${entry.timestamp}] STK Push | ` +
    `${entry.maskedPhone} | ` +
    `KES ${entry.amount ?? "-"} | ${status}`
  );

  return entry;
}

/**
 * Print a complete Daraja payload for debugging.
 * Disabled in production because callbacks contain full phone numbers.
 */
function logDarajaPayload(label, payload) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.log(`${label}:\n${JSON.stringify(payload, null, 2)}`);
}

// Health check.
app.get("/", (_req, res) => {
  res.json({
    message: "Week 9 Day 2 M-Pesa STK Push API is running."
  });
});

/**
 * POST /api/mpesa/stkpush
 *
 * Validate the request, call Daraja,
 * and store the pending transaction.
 */
app.post("/api/mpesa/stkpush", async (req, res) => {
  const {
    phoneNumber,
    amount,
    accountReference = "PayLink",
    transactionDesc = "Test payment"
  } = req.body ?? {};

  const formattedPhone = formatPhoneNumber(phoneNumber);

  const safePhone = formattedPhone.success
    ? formattedPhone.formatted
    : "";

  try {
    // STEP 1: Validate the phone number.
    if (!formattedPhone.success) {
      throw new TypeError(formattedPhone.error);
    }

    // STEP 2: Validate the amount.
    validateAmount(amount);

    // STEP 3: Initiate the M-Pesa prompt.
    const darajaResponse = await initiateSTKPush(
      safePhone,
      amount,
      accountReference,
      transactionDesc
    );

    logDarajaPayload("Daraja STK Push response", darajaResponse);

    // STEP 4: Confirm Daraja accepted the request.
    if (
      String(darajaResponse?.ResponseCode) !== "0" ||
      !darajaResponse?.CheckoutRequestID
    ) {
      throw new Error(
        darajaResponse?.ResponseDescription ||
        "Daraja did not accept the STK Push."
      );
    }

    // STEP 5: Generate a unique payment reference.
    const paymentId = `txn_${randomUUID()}`;

    // STEP 6: Save the pending transaction.
    const transaction = {
      paymentId,
      checkoutRequestId: darajaResponse.CheckoutRequestID,
      merchantRequestId: darajaResponse.MerchantRequestID,
      phoneNumber: safePhone,
      amount,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    transactions.push(transaction);

    // STEP 7: Log the successful initiation.
    logAttempt({
      phoneNumber: safePhone,
      amount,
      status: "success",
      checkoutRequestId: darajaResponse.CheckoutRequestID
    });

    // STEP 8: Respond to the API client.
    return res.status(200).json({
      success: true,
      message:
        "STK Push sent. Check your phone for the M-Pesa prompt.",
      data: {
        paymentId,
        checkoutRequestId:
          darajaResponse.CheckoutRequestID,
        merchantRequestId:
          darajaResponse.MerchantRequestID,
        responseCode: darajaResponse.ResponseCode,
        responseDescription:
          darajaResponse.ResponseDescription,
        customerMessage: darajaResponse.CustomerMessage
      }
    });

  } catch (error) {
    if (error.response) {
      logDarajaPayload(
        `Daraja error response (HTTP ${error.response.status})`,
        error.response.data
      );
    }

    // Distinguish validation errors from Daraja failures.
    const isValidation =
      error instanceof TypeError ||
      error instanceof RangeError;

    const isTimeout = error.code === "ECONNABORTED";

    const statusCode = isValidation
      ? 400
      : isTimeout
        ? 504
        : 502;

    const providerMessage =
      error.response?.data?.errorMessage;

    const message = isValidation
      ? error.message
      : isTimeout
        ? "Daraja request timed out. Check its status before trying again."
        : typeof providerMessage === "string"
          ? providerMessage
          : error.message || "Unable to initiate STK Push.";

    // Log failed requests without exposing phone numbers.
    logAttempt({
      phoneNumber: safePhone,
      amount,
      status: "failed",
      error: message
    });

    return res.status(statusCode).json({
      success: false,
      error: message
    });
  }
});

/**
 * Callback acknowledgement placeholder.
 *
 * Day 3 will implement payment confirmation
 * and status updates.
 */
app.post("/api/mpesa/callback", (req, res) => {
  const checkoutRequestId =
    req.body?.Body?.stkCallback?.CheckoutRequestID;

  console.log(
    "STK callback received for:",
    checkoutRequestId || "(no checkout request ID)"
  );

  logDarajaPayload("Daraja callback body", req.body);

  return res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

/**
 * BONUS:
 * Return the most recent 20 transaction logs.
 */
app.get("/api/mpesa/logs", (_req, res) => {
  // Demo endpoint is disabled in production.
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      success: false,
      error: "Log endpoint disabled in production."
    });
  }

  const latestLogs = transactionLogs
    .slice(-20)
    .reverse();

  return res.status(200).json({
    success: true,
    count: latestLogs.length,
    data: latestLogs
  });
});

// Handle invalid JSON requests.
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON request body."
    });
  }

  return res.status(500).json({
    success: false,
    error: "Internal server error."
  });
});

// Start the application.
app.listen(port, () => {
  console.log(
    `STK Push API listening on http://localhost:${port}`
  );
});
