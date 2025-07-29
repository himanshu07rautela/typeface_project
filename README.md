# Typeface Project

A modern, minimal personal finance dashboard to help you track, manage, and analyze your finances.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Backend API](#backend-api)
- [Frontend Features](#frontend-features)
- [Environment & Security](#environment--security)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Typeface Project is a full-stack web application for personal finance management.  
It allows users to register, log in, add and view transactions, upload and process receipts, and visualize their financial data with analytics—all in a clean, responsive interface.

---

## Tech Stack

**Backend:**  
- Node.js, Express.js  
- MongoDB, Mongoose  
- JWT Authentication  
- Multer (file uploads), Tesseract.js (OCR), pdf-parse (PDF extraction)

**Frontend:**  
- React.js  
- React Router  
- Axios  
- Chart.js

---

## Project Structure

```
typeface_project/
│
├── backend/
│   ├── models/         # Mongoose models
│   ├── routes/         # Express routes
│   ├── middleware/     # Auth & error middleware
│   ├── uploads/        # Uploaded receipts
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/ # Navbar, RequireAuth, etc.
│   │   ├── pages/      # Login, Register, Transactions, Receipts, Analytics
│   │   ├── services/   # API helpers
│   │   ├── App.jsx
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- MongoDB (local or Atlas)

### 1. Clone the Repository

```sh
git clone <your-repo-url>
cd typeface_project
```

### 2. Backend Setup

```sh
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

### 3. Frontend Setup

```sh
cd ../frontend
cp .env.example .env
# Edit .env with your backend API URL if needed
npm install
npm start
```

---

## Backend API

### Authentication
- `POST /api/users/register` — Register a new user
- `POST /api/users/login` — User login
- `GET /api/users/profile` — Get user profile
- `PUT /api/users/profile` — Update user profile
- `PUT /api/users/change-password` — Change password

### Transactions
- `GET /api/transactions` — Get all transactions (with filtering & pagination)
- `POST /api/transactions` — Create new transaction
- `GET /api/transactions/:id` — Get specific transaction
- `PUT /api/transactions/:id` — Update transaction
- `DELETE /api/transactions/:id` — Delete transaction
- `GET /api/transactions/stats/summary` — Get transaction statistics

### Receipts
- `POST /api/receipts/upload` — Upload and process receipt
- `GET /api/receipts/:filename` — Get receipt file
- `DELETE /api/receipts/:filename` — Delete receipt file

### Analytics
- `GET /api/analytics/expenses-by-category` — Expenses by category
- (Other analytics endpoints as implemented)

---

## Frontend Features

- **Authentication:** Register and login securely
- **Dashboard:** Overview of your finances
- **Transactions:** Add, view, and manage your income and expenses
- **Receipts:** Upload receipts and extract data automatically
- **Analytics:** Visualize your spending and income with charts
- **Responsive UI:** Works on desktop and mobile
- **Logout:** Securely end your session

---

## Environment & Security

- **.env files** are used for sensitive configuration (API URLs, secrets) and are excluded from git via `.gitignore`.
- **Never commit your `.env` or `node_modules/` to GitHub.**
- See `.env.example` in both `backend/` and `frontend/` for required variables.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## License

MIT License

---

## Support

For questions or support, open an issue on