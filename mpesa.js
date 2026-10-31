
import "dotenv/config";
import axios from "axios";
import {
  formatPhoneNumber,
  validateAmount
} from "./phone.js";

// Cache the OAuth token to avoid unnecessary requests.
let cachedToken = null;
let tokenExpiresAt = 0;
let tokenRequest = null;

// Check that required Daraja settings are available.
function getConfig() {
  const names = [
    "DARAJA_CONSUMER_KEY",
    "DARAJA_CONSUMER_SECRET",
    "DARAJA_SHORTCODE",
    "DARAJA_PASSKEY",
    "MPESA_CALLBACK_URL"
  ];

  for (const name of names) {
    if (!process.env[name]) {
      throw new Error(`Missing ${name} in .env`);
    }
  }

  const baseUrl =
    process.env.DARAJA_BASE_URL ||
    "https://sandbox.safaricom.co.ke";

  const allowedUrls = [
    "https://sandbox.safaricom.co.ke",
    "https://api.safaricom.co.ke"
  ];

  if (!allowedUrls.includes(baseUrl)) {
    throw new Error(
      "DARAJA_BASE_URL must be a supported Safaricom HTTPS URL."
    );
  }

  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!/^https:\/\//.test(callbackUrl)) {
    throw new Error(
      "MPESA_CALLBACK_URL must be a publicly accessible HTTPS URL."
    );
  }

  return { baseUrl, callbackUrl };
}

/**
 * Get the current timestamp in Kenyan time.
 * Format: YYYYMMDDHHmmss
 */
export function getTimestamp(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value])
  );

  return (
    parts.year +
    parts.month +
    parts.day +
    parts.hour +
    parts.minute +
    parts.second
  );
}

/**
 * M-Pesa password:
 * Base64(BusinessShortCode + Passkey + Timestamp)
 */
export function generatePassword(timestamp) {
  const shortcode = process.env.DARAJA_SHORTCODE;
  const passkey = process.env.DARAJA_PASSKEY;

  if (!shortcode || !passkey) {
    throw new Error(
      "DARAJA_SHORTCODE and DARAJA_PASSKEY are required."
    );
  }

  return Buffer.from(
    `${shortcode}${passkey}${timestamp}`
  ).toString("base64");
}

/**
 * Obtain an OAuth access token.
 * Return the cached token if it is still valid.
 */
export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  // Share one request if multiple calls arrive together.
  if (tokenRequest) {
    return tokenRequest;
  }

  tokenRequest = (async () => {
    const { baseUrl } = getConfig();

    const key = process.env.DARAJA_CONSUMER_KEY;
    const secret = process.env.DARAJA_CONSUMER_SECRET;

    const credentials = Buffer.from(
      `${key}:${secret}`
    ).toString("base64");

    const response = await axios.get(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${credentials}`
        },
        timeout: 15000
      }
    );

    if (!response.data?.access_token) {
      throw new Error(
        "Daraja did not return an OAuth access token."
      );
    }

    cachedToken = response.data.access_token;

    const expiresIn =
      Number(response.data.expires_in) || 3600;

    // Refresh one minute before the token expires.
    tokenExpiresAt =
      Date.now() + Math.max(expiresIn - 60, 0) * 1000;

    return cachedToken;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}

/**
 * Initiate an M-Pesa STK Push.
 * This sends a prompt, not a payment confirmation.
 */
export async function initiateSTKPush(
  phoneNumber,
  amount,
  accountReference = "PayLink",
  transactionDesc = "Test payment"
) {
  // STEP 1: Validate the customer's phone number.
  const result = formatPhoneNumber(phoneNumber);

  if (!result.success) {
    throw new TypeError(result.error);
  }

  // STEP 2: Validate the amount.
  validateAmount(amount);

  // STEP 3: Validate transaction reference and description.
  if (
    typeof accountReference !== "string" ||
    !accountReference.trim() ||
    accountReference.length > 30
  ) {
    throw new TypeError(
      "Account reference must be a non-empty string of at most 30 characters."
    );
  }

  if (
    typeof transactionDesc !== "string" ||
    !transactionDesc.trim() ||
    transactionDesc.length > 50
  ) {
    throw new TypeError(
      "Transaction description must be a non-empty string of at most 50 characters."
    );
  }

  // STEP 4: Read the Daraja settings.
  const { baseUrl, callbackUrl } = getConfig();

  // STEP 5: Get the cached or newly generated token.
  const accessToken = await getAccessToken();

  // STEP 6: Generate the timestamp and password.
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);

  const shortcode = process.env.DARAJA_SHORTCODE;

  // STEP 7: Construct the STK Push payload.
  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: result.formatted,
    PartyB: shortcode,
    PhoneNumber: result.formatted,
    CallBackURL: callbackUrl,
    AccountReference: accountReference.trim(),
    TransactionDesc: transactionDesc.trim()
  };

  // STEP 8: Send the request to Safaricom.
  const response = await axios.post(
    `${baseUrl}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      timeout: 20000
    }
  );

  // STEP 9: Return the Daraja response.
  return response.data;
}
