# E2E improvement plan

The current smoke test proves that the login page renders and registration mode
can be opened. To increase acceptance coverage, add tests in this order:

1. Registration: invalid password, valid registration, profile creation.
2. Email/password login: success and invalid-credential error.
3. Password reset: valid email and invalid email behavior.
4. Task workflow: create, edit, status update, filter, search, delete.
5. Authorization: unauthenticated routes/actions and private task isolation.
6. Mobile layout: key login/task workflows at a narrow viewport.

Prefer unique test accounts and emulator-backed setup for destructive test
execution. Do not put real passwords or Firebase Admin credentials in tests.
