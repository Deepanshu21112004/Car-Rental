# I-CAR — MERN Car Rental

## Run the project

### Server

1. Copy `server/.env.example` values into a new `server/.env` and add your real MongoDB credentials.
2. From `server/` run `npm install` and then `npm run dev`.
3. The API runs on `http://localhost:5000`.

### Client

1. Copy `client/.env.example` to `client/.env`.
2. From `client/` run `npm install` and then `npm run dev`.
3. The Vite app runs on `http://localhost:5173`.

## Admin

Run the admin seed after configuring the server `.env`:

`node seed/adminSeeder.js`

The admin credentials are taken from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, and `ADMIN_PHONE`.

## Car image upload

The Admin Add Car form now accepts JPG, JPEG, PNG, and WEBP images up to 5 MB. The server stores uploaded files in `server/uploads/cars/`, saves the relative image path in MongoDB, and serves the folder at `/uploads/cars/...`. The public Cars and Car Details pages automatically resolve and display the uploaded image.

## Corrected application flow

- Public users can browse cars, view details and add/remove favorites after login.
- Booking uses the car's hourly rate and charges the exact selected rental duration down to the minute (no one-hour minimum).
- The server recalculates the booking amount and rechecks car availability, so the client cannot override the final price.
- Pickup/return times are sent as ISO timestamps to avoid browser/server timezone mismatches.
- Pending bookings can be paid from **My Bookings → Pay Now**.
- Stripe verification is idempotent, so refreshing the payment-success page does not incorrectly mark an already-paid booking as failed.
- Paid bookings cancelled before pickup are refunded through Stripe.
- Expired/cancelled bookings cannot be paid again.
- User and admin logout both clear the authentication cookie and client session.
- Admin car management, users, bookings, payments and reviews use their corresponding backend APIs.

## Validation performed

- All backend JavaScript files pass `node --check`.
- All frontend JSX/JavaScript source files were parsed successfully with the project's Babel parser.
- Service imports were checked against their exported functions.
- The corrected source ZIP intentionally excludes `node_modules`; run `npm install` in both `client/` and `server/` so npm installs the correct native dependencies for your operating system.

## Environment and MongoDB Atlas

The corrected ZIP does not include real `.env` files or `node_modules`. Create them from the supplied examples before running the project.

For MongoDB Atlas, the `MONGO_URI` is a DNS-based `mongodb+srv://` connection string. It is separate from Atlas Network Access. If your home/public IP changes frequently during development, configure Atlas Network Access accordingly (for example, a temporary `0.0.0.0/0` rule with a strong database password, or an automatic IP updater).

If real database or Stripe credentials were previously placed in a shared/uploaded ZIP, rotate those credentials before using the project again.

## Booked-slot visibility and booking validation

- The booking form displays upcoming reserved pickup/return intervals for the selected car, including pending, confirmed and active bookings.
- The selected rental period is checked for overlap against the displayed schedule; overlapping times are flagged and the booking button is disabled.
- The schedule is refreshed immediately before submission. The API independently checks conflicts again when creating a booking, so client-side checks are not the only protection.
- Cancelled and completed bookings are not shown as reserved slots. If another customer books the car at the same time, the server returns a conflict response and the booking is not created.

# I-CAR — Updated Car Rental Portal

This build adds self-driver details and verification, traffic challan tracking, early-return recording/refunds, and a tiered cancellation policy.

## Added features

### Self-driver details

- Self Drive bookings require driver name, phone, date of birth, driving licence number, licence expiry and address.
- Backend validates required fields, phone format, minimum age, licence number and licence validity through pickup.
- Admin opens **Admin → Bookings → Booking Details** to verify/reject the driver details and add a note.
- A self-drive booking cannot become Active until the driver is verified and the booking is paid. Verification is not a government licence API check; an admin must validate the licence through the appropriate process.

### Cancellation policy

The backend applies this sample policy based on server time before pickup:

- More than 48 hours: 0% deduction
- 24–48 hours: 5% deduction
- 6–24 hours: 10% deduction
- 2–6 hours: 15% deduction
- Less than 2 hours: 25% deduction

The customer sees an estimated deduction/refund before confirming. The backend recalculates it at cancellation. Unpaid bookings are cancelled without a refund. Paid bookings use Stripe partial/full refunds; a refund is not shown as processed unless Stripe returns the refund result. Admin cancellation is not a substitute for the customer cancellation workflow.

### Early return

- Active paid bookings have a **Return Car Early** action in Booking Details.
- The return workflow captures actual return time, optional odometer, fuel level and condition notes.
- The server estimates the used portion of the booked rental and submits the eligible unused portion as a Stripe refund.
- Vehicle return/inspection should be verified by staff before the car is made available again.

### Challan management

- Admin can record a challan with a unique challan number, vehicle, optional booking, violation date/type, amount, description and evidence URL.
- The backend validates the fine amount and checks that a linked booking matches the vehicle and violation period.
- Admin reviews responsibility and payment status in **Admin → Challans**.
- Customers see linked challans in **My Account → My Challans** and can submit a dispute. The portal does not directly pay government challans; staff should confirm the official payment channel and retain payment proof.

## Run locally (Windows)

1. Install Node.js LTS and MongoDB Atlas/local MongoDB.
2. In `server`, copy `.env.example` to `.env` and fill in your own values:
    - `MONGO_URI`: your MongoDB connection string
    - `JWT_SECRET`: a long random secret
    - `STRIPE_SECRET_KEY`: Stripe test secret key while testing
    - `CLIENT_URL=http://localhost:5173`
    - `PORT=5000`
3. In `client`, copy `.env.example` to `.env`.
4. Open two terminals:

    **Terminal 1**

    ```bash
    cd "Car Rental/server"
    npm install
    npm run dev
    ```

    **Terminal 2**

    ```bash
    cd "Car Rental/client"
    npm install
    npm run dev
    ```

5. Open `http://localhost:5173`.
6. Use a Stripe test key and test card details from Stripe's official test-mode documentation. Never put a Stripe secret key in the frontend.

## Important operational notes

- This ZIP intentionally excludes `node_modules` and actual `.env` files. Install dependencies and create local `.env` files from the examples.
- Never commit or share real MongoDB credentials, JWT secrets, admin passwords or Stripe secret keys. If a real key was exposed, rotate it.
- Test cancellations and refunds with Stripe test mode before using live payments.
- Cancellation deductions/refunds are sample business rules, not IRCTC's actual rules. Publish clear rental terms and verify applicable consumer-law requirements before production.
- The challan module is an administrative tracking/dispute workflow, not an official e-challan integration.

## Validation fixes in this revision

- Fixed `datetime-local` maximum/minimum values to use the browser's local timezone rather than UTC. This prevents the challan form from incorrectly rejecting a violation time because of the UTC offset.
- Added client-side validation for missing/invalid/future challan timestamps and positive fine amounts before submission.
- Kept matching server-side validation and changed fine amounts to require a value greater than zero.
- Normalized challan reference numbers to uppercase before saving to reduce case-only duplicate entries.
- Reset the linked booking selection when the admin changes the vehicle, avoiding accidental mismatches.
- Updated the booking pickup/return date-time minimums to use local time as well.

## Verification notes

The ZIP archive was checked for integrity and all backend JavaScript files passed `node --check`. A Vite production build could not be completed in the current environment because package installation did not finish and the Vite executable was unavailable. After extracting the ZIP, run `npm install` in both `server` and `client`, then run the frontend build and test with your MongoDB and Stripe test configuration.

## Latest update: daily driver charges and challan checkout

- With Driver is charged at ₹500 per started 24-hour rental day (minimum one day). The backend independently calculates this from the rental duration and rejects a client total that does not match. Self Drive remains ₹0 in driver charges.
- Challan online checkout is available only when the challan is linked to the logged-in customer, the admin has set responsibility to `Customer Responsible`, and payment status is `Payment Due`.
- Stripe Checkout verifies session ownership, metadata, paid status and amount before marking a challan paid. The verified payment reference and timestamp are retained. Duplicate verification does not charge again.
- Online checkout is not offered for fines below ₹50 because Stripe may enforce a minimum INR amount; the site tells the customer to use a verified official channel and have the receipt recorded by the admin instead of inflating the amount.
- A portal payment records the customer's payment/reimbursement to I-CAR. It is not a claim that the government e-challan has been paid; I-CAR must complete and record the official payment separately where applicable.

## Configuration and testing

Ensure `STRIPE_SECRET_KEY` and `CLIENT_URL` are configured in `server/.env`. Use Stripe test keys before production. Live MongoDB and Stripe checkout require your credentials and cannot be fully validated from source-only checks.

## Challan dispute and payment safeguards (latest update)

- A customer dispute is saved with `disputeReason`, `disputeStatus`, `disputedAt`, and an audit-friendly `resolutionNote` / `resolvedAt`.
- The customer sees the submitted dispute and its current/resolved status on **My Challans**. The admin sees the customer's exact dispute message in **Challan Management**.
- While a dispute is open, customer checkout is paused. If an unpaid Stripe Checkout session is open, the server attempts to expire it before accepting the dispute.
- Admins must resolve a dispute with a recorded explanation and choose one of: `Customer Responsible`, `Company Responsible`, or `Not Customer Responsible`.
- A customer-responsible resolution moves the challan to `Payment Due`; company/not-customer-responsible resolutions close the case without customer payment due.
- Once payment is verified/recorded, the ordinary admin editor locks responsibility and payment status. A paid challan cannot be reopened or made payable again through the status editor.
- Stripe Checkout sessions are reused while open to reduce duplicate sessions. The server verifies the session, account, amount and current payable state before marking a payment verified.
- An admin may record a verified receipt only for a customer-responsible challan in `Payment Due` status. Do not use this for an unverified receipt.

Existing database records remain in place. Mongoose defaults apply to records that do not yet have the newer dispute fields; review old `Disputed` records and resolve them from the admin dashboard.
