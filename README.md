
# M-Pesa STK Push Implementation

### Week 9 – Day 2 Assignment | Daraja API

A Node.js and Express backend application that integrates Safaricom's Daraja API to initiate M-Pesa STK Push payment requests. The project demonstrates OAuth authentication, Kenyan phone number validation, payment request handling, API development, and secure transaction logging.

## Project Objectives

- Implement M-Pesa STK Push using the Daraja API.
- Generate and cache OAuth access tokens.
- Generate M-Pesa timestamps and Base64 passwords.
- Validate and format Kenyan mobile phone numbers.
- Validate transaction amounts between KES 1 and 150,000.
- Build an Express REST API for payment requests.
- Store pending transactions in memory.
- Handle API errors and log payment requests securely.
- Test application functionality using Thunder Client and automated tests.

## Technologies Used

- **Node.js** – Backend runtime
- **Express.js** – REST API framework
- **Axios** – HTTP requests to Safaricom
- **Dotenv** – Environment variable management
- **CORS** – Cross-origin request handling
- **Daraja API** – M-Pesa payment integration
- **Thunder Client** – API testing
- **ngrok** – Public callback URL for local development
- **Node.js Test Runner** – Automated testing

## Project Structure

```text
week-9-day-2-assignment/
├── server.js
├── mpesa.js
├── phone.js
├── tests/
│   └── phone.test.js
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Dominic-kores/week-9-day-2-assignment
cd week-9-day-2-assignment
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
NODE_ENV=development

DARAJA_CONSUMER_KEY=your_consumer_key
DARAJA_CONSUMER_SECRET=your_consumer_secret
DARAJA_SHORTCODE=174379
DARAJA_PASSKEY=your_passkey

DARAJA_BASE_URL=https://sandbox.safaricom.co.ke

MPESA_CALLBACK_URL=https://apricot-unenvied-take.ngrok-free.dev/api/mpesa/callback
```

Replace placeholders with your Daraja sandbox credentials and public callback URL.

**Security:** Never commit your `.env` file or API credentials to GitHub.

### 4. Start the Server

```bash
npm run dev
```

The API runs at:

```text
http://localhost:3000
```

### 5. Start ngrok

In a separate terminal:

```bash
ngrok http 3000
```

Copy the generated HTTPS URL into `MPESA_CALLBACK_URL` and restart the server.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Check API status |
| POST | `/api/mpesa/stkpush` | Initiate STK Push |
| POST | `/api/mpesa/callback` | Acknowledge callback requests |
| GET | `/api/mpesa/logs` | Retrieve the latest 20 logs (development only) |

## Testing STK Push

Using Thunder Client, create a POST request:

**URL:**

```text
http://localhost:3000/api/mpesa/stkpush
```

**Request Body (JSON):**

```json
{
  "phoneNumber": "0712345678",
  "amount":1,
  "accountReference": "PayLink",
  "transactionDesc": "Test payment"
}
```

Replace the phone number with an appropriate Daraja sandbox test number.

### Example Successful Response

```json
{
  "success": true,
  "message": "STK Push sent. Check your phone for the M-Pesa prompt.",
  "data": {
    "paymentId": "txn_generated-uuid",
    "checkoutRequestId": "ws_CO_example",
    "merchantRequestId": "example-request-id",
    "responseCode": "0",
    "responseDescription": "Success. Request accepted for processing",
    "customerMessage": "Success. Request accepted for processing"
  }
}
```

**Note:** A successful STK Push initiation does not confirm payment completion. Payment confirmation requires processing the Daraja callback.

## Phone Number Validation

The application supports Kenyan mobile number formats:

| Input | Formatted Output |
|-------|------------------|
| 0712345678 | 254712345678 |
| +254712345678 | 254712345678 |
| 254712345678 | 254712345678 |
| 0112345678 | 254112345678 |
| 0712 345 678 | 254712345678 |

Invalid phone numbers return descriptive error messages.

## Automated Testing

Run:

```bash
npm test
```

Tests cover:

- Valid Kenyan mobile number formats
- Invalid phone numbers
- Amount validation
- Phone number masking

## Security Features

- Environment variables protect API credentials.
- OAuth tokens are cached and refreshed before expiry.
- Phone numbers are masked in transaction logs.
- Invalid payment amounts and phone numbers are rejected.
- HTTP requests use timeouts and error handling.
- Transaction logs are disabled through the API in production mode.


## Future Improvements

- Implement full M-Pesa callback handling.
- Store transactions in PostgreSQL using Prisma.
- Build a React payment form.
- Add payment status tracking.
- Deploy the backend to Railway and frontend to Vercel.
- Implement authentication and role-based access control.


## What have I learnt?

This project strengthened my understanding of REST API development, third-party API integration, OAuth authentication, asynchronous JavaScript, input validation, error handling, and backend payment security.

It also provided practical experience in integrating M-Pesa payments into applications designed for the Kenyan market.






## Author

**Dominic Kores**

Full-Stack Software & AI Engineer

