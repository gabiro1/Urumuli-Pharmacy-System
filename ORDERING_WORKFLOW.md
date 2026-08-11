# Medicine ordering workflow

Run `npm run migrate` and `npm run seed` from `backend`, then start the backend and frontend normally.

## Development providers

`OTP_PROVIDER=development` returns a clearly labelled development code in the API response; it does not claim an SMS was sent. Replace this with an approved SMS adapter before production. `PAYMENT_PROVIDER=development` never records a successful payment and explains that a provider must be configured. Raw payment credentials are never accepted by this API.

Prescription files live below `UPLOAD_DIR/prescriptions` with random server-generated names. That directory must be private and must not be served by a web server. Files are streamed only through the authorized API endpoint, which performs order ownership or staff-role checks and sends `private, no-store` cache headers.

## Manual test paths

1. Visit `/medicines`, open an OTC item, add it to the cart, and continue to `/checkout`.
2. Request a development OTP, enter the labelled code, complete identity and fulfilment details, and submit. The resulting `/orders/:id` page is protected by the guest token.
3. Open a prescription-required medicine and submit a JPG, PNG, or PDF. The request moves to `SUBMITTED_FOR_REVIEW`; payment remains unavailable.
4. Sign in as a pharmacist and open **Medicine Requests**. Start review, open the protected original file, select the medicine, enter directions copied and verified from the prescription, review the live preview, check every confirmation, and save.
5. Approval is rejected by the server until the original file and verified directions exist. After approval, the patient accepts the final order before payment becomes eligible.
6. Continue the staff fulfilment states and print the verified label from the patient order page.

## Production setup checklist

- Configure approved OTP/SMS and payment provider adapters.
- Put private uploads on encrypted private object storage or an access-controlled encrypted volume, with malware scanning and retention jobs.
- Add a scheduled reservation-expiry worker and provider webhook verification.
- Configure pharmacy name/contact and label dimensions for the actual printer.
- Complete independent penetration, privacy, accessibility, backup/restore, and operational testing.

Implementation does not itself establish regulatory compliance. Medicine classifications, workflow rules, patient instructions, label wording and dimensions, retention rules, notifications, and the dispensing process require review by a licensed pharmacist and applicable Rwanda regulatory authorities before production launch.
