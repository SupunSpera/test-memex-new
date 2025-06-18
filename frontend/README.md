# Token Creation Platform Frontend

A modern React Next.js frontend for creating and trading tokens with bonding curves.

## Features

- Create new tokens with custom parameters
- Buy and sell tokens through bonding curves
- Web3 wallet integration
- Responsive design
- Real-time transaction status updates

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- A Web3 wallet (MetaMask, Rainbow, etc.)
- Backend API running on port 5004

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory with the following variables:
```
NEXT_PUBLIC_API_URL=http://localhost:5004/api
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here
```

3. Get a WalletConnect Project ID:
   - Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - Sign up and create a new project
   - Copy the Project ID and paste it in your `.env.local` file

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Building for Production

```bash
npm run build
npm start
```

## Project Structure

- `/app` - Next.js app directory
  - `/create` - Token creation page
  - `/tokens` - Token listing and trading page
  - `config.ts` - Configuration settings
  - `utils/` - Utility functions
  - `providers.tsx` - Web3 providers setup

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
