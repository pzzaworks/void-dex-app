<p align="center">
  <img src="./assets/void-dex-logo.svg" alt="VoidDex" width="200" />
</p>

Privacy-first DEX aggregator frontend. Combines best swap rates with Railgun's zero-knowledge privacy technology. All privacy operations happen client-side - your keys never leave your browser.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install
cp .env.example .env
npm run dev
```

## Core Features

- **Client-Side Privacy**: All ZK proof generation happens in your browser
- **Railgun Integration**: Shield, transfer, and swap tokens privately
- **DEX Aggregation**: Best rates across Uniswap, SushiSwap, and more
- **Multi-Chain Support**: Ethereum, Polygon, Arbitrum, and other networks
- **Wallet Connection**: RainbowKit + Wagmi for seamless wallet integration

## Security Model

Your keys stay with you:
- Private keys never leave your browser
- Railgun viewing/spending keys are client-side only
- ZK proofs generated locally via WASM
- Server only handles non-sensitive quote aggregation

## Documentation

For detailed documentation, visit [https://pzza.works/products/void-dex](https://pzza.works/products/void-dex)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

VoidDex Team - [https://pzza.works/products/void-dex](https://pzza.works/products/void-dex)

Project Link: [https://github.com/pzzaworks/void-dex-app](https://github.com/pzzaworks/void-dex-app)
