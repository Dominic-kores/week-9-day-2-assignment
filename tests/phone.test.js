
import test from "node:test";
import assert from "node:assert/strict";

import {
  formatPhoneNumber,
  isValidKenyanPhone,
  validateAmount,
  maskPhoneNumber
} from "../phone.js";

// Valid Kenyan phone number formats.
const validCases = [
  ["0712345678", "254712345678"],
  ["+254712345678", "254712345678"],
  ["254712345678", "254712345678"],
  ["0112345678", "254112345678"],
  ["+254112345678", "254112345678"],
  ["0712 345 678", "254712345678"],
  ["+254-712-345-678", "254712345678"]
];

// Test every valid input.
for (const [input, expected] of validCases) {
  test(`formats ${input}`, () => {
    assert.deepEqual(
      formatPhoneNumber(input),
      {
        success: true,
        formatted: expected
      }
    );

    assert.equal(
      isValidKenyanPhone(input),
      true
    );
  });
}

// Invalid phone number formats and expected errors.
const invalidCases = [
  [
    "12345",
    "Phone number too short. Must be 10 digits (07XX) or 12 digits (254XX)."
  ],
  [
    "0612345678",
    "Invalid Kenyan phone number. Must start with 07, 01, or 254."
  ],
  [
    "",
    "Phone number is required."
  ],
  [
    "abc",
    "Phone number must contain only digits, spaces, dashes, or a leading +."
  ],
  [
    "0712345678900",
    "Phone number too long. Must be 10 digits (07XX) or 12 digits (254XX)."
  ]
];

// Test every invalid input.
for (const [input, expectedError] of invalidCases) {
  test(`rejects ${JSON.stringify(input)}`, () => {
    assert.deepEqual(
      formatPhoneNumber(input),
      {
        success: false,
        error: expectedError
      }
    );

    assert.equal(
      isValidKenyanPhone(input),
      false
    );
  });
}

// Validate the supported amount range.
test("amount accepts only integers from 1 to 150000", () => {
  assert.equal(validateAmount(1), 1);
  assert.equal(validateAmount(150000), 150000);

  const invalidAmounts = [
    0,
    -1,
    150001,
    100.5,
    "100",
    null
  ];

  for (const amount of invalidAmounts) {
    assert.throws(
      () => validateAmount(amount),
      /Amount must be an integer/
    );
  }
});

// Ensure sensitive customer numbers are masked.
test("masked phone hides middle digits", () => {
  assert.equal(
    maskPhoneNumber("254712345678"),
    "2547****5678"
  );

  assert.equal(
    maskPhoneNumber("wrong"),
    "INVALID"
  );
});
