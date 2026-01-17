// Token base info (without chain-specific addresses)
interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  logo: string;
}

// Token with address for a specific chain
export interface Token extends TokenInfo {
  address: string;
}

// Base token information
const TOKEN_INFO: Record<string, TokenInfo> = {
  // Native tokens
  ETH: { symbol: 'ETH', name: 'Ethereum', decimals: 18, logo: '/tokens/ETH.svg' },
  BNB: { symbol: 'BNB', name: 'BNB', decimals: 18, logo: '/tokens/BNB.svg' },
  MATIC: { symbol: 'MATIC', name: 'Polygon', decimals: 18, logo: '/tokens/MATIC.svg' },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', decimals: 18, logo: '/tokens/AVAX.svg' },
  FTM: { symbol: 'FTM', name: 'Fantom', decimals: 18, logo: '/tokens/FTM.svg' },

  // Wrapped native
  WETH: { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, logo: '/tokens/ETH.svg' },
  WBNB: { symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18, logo: '/tokens/BNB.svg' },
  WMATIC: { symbol: 'WMATIC', name: 'Wrapped MATIC', decimals: 18, logo: '/tokens/MATIC.svg' },
  WAVAX: { symbol: 'WAVAX', name: 'Wrapped AVAX', decimals: 18, logo: '/tokens/AVAX.svg' },
  WFTM: { symbol: 'WFTM', name: 'Wrapped FTM', decimals: 18, logo: '/tokens/FTM.svg' },

  // Stablecoins
  USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6, logo: '/tokens/USDC.svg' },
  USDT: { symbol: 'USDT', name: 'Tether USD', decimals: 6, logo: '/tokens/USDT.svg' },
  DAI: { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, logo: '/tokens/DAI.svg' },
  FRAX: { symbol: 'FRAX', name: 'Frax', decimals: 18, logo: '/tokens/FRAX.svg' },
  BUSD: { symbol: 'BUSD', name: 'Binance USD', decimals: 18, logo: '/tokens/USDC.svg' },

  // Major tokens
  WBTC: { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, logo: '/tokens/WBTC.svg' },
  LINK: { symbol: 'LINK', name: 'Chainlink', decimals: 18, logo: '/tokens/LINK.svg' },
  UNI: { symbol: 'UNI', name: 'Uniswap', decimals: 18, logo: '/tokens/UNI.svg' },
  AAVE: { symbol: 'AAVE', name: 'Aave', decimals: 18, logo: '/tokens/AAVE.svg' },
  MKR: { symbol: 'MKR', name: 'Maker', decimals: 18, logo: '/tokens/MKR.svg' },
  CRV: { symbol: 'CRV', name: 'Curve DAO', decimals: 18, logo: '/tokens/CRV.svg' },
  LDO: { symbol: 'LDO', name: 'Lido DAO', decimals: 18, logo: '/tokens/LDO.svg' },
  SNX: { symbol: 'SNX', name: 'Synthetix', decimals: 18, logo: '/tokens/SNX.svg' },
  COMP: { symbol: 'COMP', name: 'Compound', decimals: 18, logo: '/tokens/COMP.svg' },

  // L2 tokens
  ARB: { symbol: 'ARB', name: 'Arbitrum', decimals: 18, logo: '/tokens/ARB.svg' },
  OP: { symbol: 'OP', name: 'Optimism', decimals: 18, logo: '/tokens/OP.svg' },

  // Staked ETH
  stETH: { symbol: 'stETH', name: 'Lido Staked ETH', decimals: 18, logo: '/tokens/LDO.svg' },
  wstETH: { symbol: 'wstETH', name: 'Wrapped stETH', decimals: 18, logo: '/tokens/LDO.svg' },
  rETH: { symbol: 'rETH', name: 'Rocket Pool ETH', decimals: 18, logo: '/tokens/RETH.svg' },
  cbETH: { symbol: 'cbETH', name: 'Coinbase ETH', decimals: 18, logo: '/tokens/CBETH.svg' },

  // Meme tokens
  PEPE: { symbol: 'PEPE', name: 'Pepe', decimals: 18, logo: '/tokens/PEPE.svg' },
  SHIB: { symbol: 'SHIB', name: 'Shiba Inu', decimals: 18, logo: '/tokens/SHIB.svg' },
  APE: { symbol: 'APE', name: 'ApeCoin', decimals: 18, logo: '/tokens/APE.svg' },

  // DeFi tokens
  SUSHI: { symbol: 'SUSHI', name: 'SushiSwap', decimals: 18, logo: '/tokens/SUSHI.svg' },
  CAKE: { symbol: 'CAKE', name: 'PancakeSwap', decimals: 18, logo: '/tokens/CAKE.svg' },
  GMX: { symbol: 'GMX', name: 'GMX', decimals: 18, logo: '/tokens/GMX.svg' },

  // Chain native tokens
  MNT: { symbol: 'MNT', name: 'Mantle', decimals: 18, logo: '/tokens/MNT.svg' },
  WMNT: { symbol: 'WMNT', name: 'Wrapped Mantle', decimals: 18, logo: '/tokens/MNT.svg' },
  XDAI: { symbol: 'XDAI', name: 'xDAI', decimals: 18, logo: '/tokens/DAI.svg' },
  WXDAI: { symbol: 'WXDAI', name: 'Wrapped xDAI', decimals: 18, logo: '/tokens/DAI.svg' },
  GNO: { symbol: 'GNO', name: 'Gnosis', decimals: 18, logo: '/tokens/GNO.svg' },
  GLMR: { symbol: 'GLMR', name: 'Moonbeam', decimals: 18, logo: '/tokens/GLMR.svg' },
  WGLMR: { symbol: 'WGLMR', name: 'Wrapped GLMR', decimals: 18, logo: '/tokens/GLMR.svg' },
  CRO: { symbol: 'CRO', name: 'Cronos', decimals: 18, logo: '/tokens/CRO.svg' },
  WCRO: { symbol: 'WCRO', name: 'Wrapped CRO', decimals: 18, logo: '/tokens/CRO.svg' },
  CELO: { symbol: 'CELO', name: 'Celo', decimals: 18, logo: '/tokens/CELO.svg' },
  cUSD: { symbol: 'cUSD', name: 'Celo Dollar', decimals: 18, logo: '/tokens/USDC.svg' },
  cEUR: { symbol: 'cEUR', name: 'Celo Euro', decimals: 18, logo: '/tokens/USDC.svg' },
  USDB: { symbol: 'USDB', name: 'USDB', decimals: 18, logo: '/tokens/USDC.svg' },
  USDbC: { symbol: 'USDbC', name: 'USD Base Coin', decimals: 6, logo: '/tokens/USDC.svg' },
};

// Native token address placeholder
const NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// Chain-specific token addresses
// chainId -> symbol -> address
const TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
  // Ethereum Mainnet (1)
  1: {
    ETH: NATIVE,
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EescdecB5a86387f',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    AAVE: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    MKR: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
    CRV: '0xD533a949740bb3306d119CC777fa900bA034cd52',
    LDO: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
    SNX: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
    COMP: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
    stETH: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    rETH: '0xae78736Cd615f374D3085123A210448E74Fc6393',
    cbETH: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
    PEPE: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    SHIB: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
    APE: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
    FRAX: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
    SUSHI: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
  },

  // BSC (56)
  56: {
    BNB: NATIVE,
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    DAI: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    WETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    WBTC: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    LINK: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
    UNI: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
    AAVE: '0xfb6115445Bff7b52FeB98650C87f44907E58f802',
    CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    SUSHI: '0x947950BcC74888a40Ffa2593C5798F11Fc9124C4',
  },

  // Arbitrum (42161)
  42161: {
    ETH: NATIVE,
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Native USDC
    'USDC.e': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Bridged USDC
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    UNI: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
    AAVE: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
    CRV: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978',
    ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
    FRAX: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
    wstETH: '0x5979D7b546E38E414F7E9822514be443A4800529',
    rETH: '0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8',
    SUSHI: '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A',
  },

  // Polygon (137)
  137: {
    MATIC: NATIVE,
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Native USDC
    'USDC.e': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Bridged USDC
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    LINK: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
    UNI: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f',
    AAVE: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
    CRV: '0x172370d5Cd63279eFa6d502DAB29171933a610AF',
    SNX: '0x50B728D8D964fd00C2d0AAD81718b71311feF68a',
    SUSHI: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a',
    FRAX: '0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89',
    wstETH: '0x03b54A6e9a984069379fae1a4fC4dBAE93B3bCCD',
  },

  // Optimism (10)
  10: {
    ETH: NATIVE,
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Native USDC
    'USDC.e': '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Bridged USDC
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
    LINK: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6',
    UNI: '0x6fd9d7AD17242c41f7131d257212c54A0e816691',
    AAVE: '0x76FB31fb4af56892A25e32cFC43De717950c9278',
    CRV: '0x0994206dfE8De6Ec6920FF4D779B0d950605Fb53',
    SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4',
    OP: '0x4200000000000000000000000000000000000042',
    FRAX: '0x2E3D870790dC77A83DD1d18184Acc7439A53f475',
    wstETH: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb',
    rETH: '0x9Bcef72be871e61ED4fBbc7630889beE758eb81D',
    SUSHI: '0x3eaEb77b03dBc0F6321AE1b72b2E26B255D07789',
  },

  // Base (8453)
  8453: {
    ETH: NATIVE,
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    wstETH: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
    AAVE: '0x18C8cD9Cc89CAd8E0d2EC0F9ae9DB73A2E4B7A90',
  },

  // Avalanche (43114)
  43114: {
    AVAX: NATIVE,
    WAVAX: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    'USDC.e': '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664',
    USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    'USDT.e': '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
    DAI: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
    WETH: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
    WBTC: '0x50b7545627a5162F82A992c33b87aDc75187B218',
    LINK: '0x5947BB275c521040051D82396192181b413227A3',
    AAVE: '0x63a72806098Bd3D9520cC43356dD78afe5D386D9',
    SUSHI: '0x37B608519F91f70F2EeB0e5Ed9AF4061722e4F76',
    FRAX: '0xD24C2Ad096400B6FBcd2ad8B24E7acBc21A1da64',
  },

  // Fantom (250)
  250: {
    FTM: NATIVE,
    WFTM: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83',
    USDC: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75',
    USDT: '0x049d68029688eAbF473097a2fC38ef61633A3C7A',
    DAI: '0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E',
    WETH: '0x74b23882a30290451A17c44f4F05243b6b58C76d',
    WBTC: '0x321162Cd933E2Be498Cd2267a90534A804051b11',
    LINK: '0xb3654dc3D10Ea7645f8319668E8F54d2574FBdC8',
    AAVE: '0x6a07A792ab2965C72a5B8088d3a069A7aC3a993B',
    CRV: '0x1E4F97b9f9F913c46F1632781732927B9019C68b',
    SUSHI: '0xae75A438b2E0cB8Bb01Ec1E1e376De11D44477CC',
    FRAX: '0xdc301622e621166BD8E82f2cA0A26c13Ad0BE355',
  },

  // zkSync Era (324)
  324: {
    ETH: NATIVE,
    WETH: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91',
    USDC: '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4',
    USDT: '0x493257fD37EDB34451f62EDf8D2a0C418852bA4C',
    WBTC: '0xBBeB516fb02a01611cBBE0453Fe3c580D7281011',
    LINK: '0x082C9438b5C41A3739E5cf0E0C8E0C57b0f0d23d',
  },

  // Linea (59144)
  59144: {
    ETH: NATIVE,
    WETH: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
    USDC: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
    USDT: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
    DAI: '0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5',
    WBTC: '0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4',
    wstETH: '0xB5beDd42000b71FddE22D3eE8a79Bd49A568fC8F',
  },

  // Scroll (534352)
  534352: {
    ETH: NATIVE,
    WETH: '0x5300000000000000000000000000000000000004',
    USDC: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4',
    USDT: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df',
    DAI: '0xcA77eB3fEFe3725Dc33bccB54eDEFc3D9f764f97',
    WBTC: '0x3C1BCa5a656e69edCD0D4E36BEbb3FcDAcA60Cf1',
    wstETH: '0xf610A9dfB7C89644979b4A0f27063E9e7d7Cda32',
  },

  // Mantle (5000)
  5000: {
    MNT: NATIVE,
    WMNT: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8',
    USDC: '0x09Bc4E0D10E52467d9a7CF4b01bAc9F8D5bDAD69',
    USDT: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE',
    WETH: '0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111',
  },

  // Gnosis (100)
  100: {
    XDAI: NATIVE,
    WXDAI: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    USDC: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
    USDT: '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
    WETH: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',
    WBTC: '0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252',
    GNO: '0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb',
    LINK: '0xE2e73A1c69ecF83F464EFCE6A5be353a37cA09b2',
  },

  // Celo (42220)
  42220: {
    CELO: NATIVE,
    cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    cEUR: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
    USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
    WETH: '0x66803FB87aBd4aaC3cbB3fAd7C3aa01f6F3FB207',
  },

  // Moonbeam (1284)
  1284: {
    GLMR: NATIVE,
    WGLMR: '0xAcc15dC74880C9944775448304B263D191c6077F',
    USDC: '0x931715FEE2d06333043d11F658C8CE934aC61D0c',
    USDT: '0xeFAeeE334F0Fd1712f9a8cc375f427D9Cdd40d73',
    WETH: '0xfA9343C3897324496A05fC75abeD6bAC29f8A40f',
    WBTC: '0x922D641a426DcFFaeF11680e5358F34d97d112E1',
    FRAX: '0x322E86852e492a7Ee17f28a78c663da38FB33bfb',
  },

  // Cronos (25)
  25: {
    CRO: NATIVE,
    WCRO: '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23',
    USDC: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
    USDT: '0x66e428c3f67a68878562e79A0234c1F83c208770',
    WETH: '0xe44Fd7fCb2b1581822D0c862B68222998a0c299a',
    WBTC: '0x062E66477Faf219F25D27dCED647BF57C3107d52',
  },

  // Polygon zkEVM (1101)
  1101: {
    ETH: NATIVE,
    WETH: '0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9',
    USDC: '0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035',
    USDT: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d',
    DAI: '0xC5015b9d9161Dca7e18e32f6f25C4aD850731Fd4',
    WBTC: '0xEA034fb02eB1808C2cc3adbC15f447B93CbE08e1',
    MATIC: '0xa2036f0538221a77A3937F1379699f44945018d0',
  },

  // Blast (81457)
  81457: {
    ETH: NATIVE,
    WETH: '0x4300000000000000000000000000000000000004',
    USDB: '0x4300000000000000000000000000000000000003',
    WBTC: '0xF7bc58b8D8f97ADC129cfC4c9f45Ce3C0E1D2692',
  },

  // Mode (34443)
  34443: {
    ETH: NATIVE,
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0xd988097fb8612cc24eeC14542bC03424c656005f',
    USDT: '0xf0F161fDA2712DB8b566946122a5af183995e2eD',
  },

  // Sepolia Testnet (11155111) - Only tokens with verified Uniswap V3 pools
  11155111: {
    ETH: NATIVE,
    WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    // Stablecoins (verified V3 pools)
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    DAI: '0xff34b3d4aee8ddcd6f9afffb6fe49bd371b8a357',
    USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
    // DeFi tokens (verified V3 pools)
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    LINK: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
    AAVE: '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a',
  },
};

// Get tokens for a specific chain
export function getTokensForChain(chainId: number): Token[] {
  const chainTokens = TOKEN_ADDRESSES[chainId];

  if (!chainTokens) {
    // Default to Ethereum if chain not supported
    return getTokensForChain(1);
  }

  const tokens: Token[] = [];

  for (const [symbol, address] of Object.entries(chainTokens)) {
    const info = TOKEN_INFO[symbol];
    if (info) {
      tokens.push({
        ...info,
        address,
      });
    } else {
      // Handle tokens that might have different symbols (like USDC.e, MNT, etc.)
      tokens.push({
        symbol,
        name: symbol,
        decimals: 18,
        logo: `/tokens/${symbol.replace('.', '')}.svg`,
        address,
      });
    }
  }

  return tokens;
}

// Get native token for a chain
export function getNativeToken(chainId: number): Token {
  const tokens = getTokensForChain(chainId);
  return tokens[0]; // Native token is always first
}

// Check if a chain is supported
export function isChainSupported(chainId: number): boolean {
  return chainId in TOKEN_ADDRESSES;
}

// Get all supported chain IDs
export function getSupportedChainIds(): number[] {
  return Object.keys(TOKEN_ADDRESSES).map(Number);
}
