import fs from "fs"
import { createWalletClient, createPublicClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import compiled from "../src/contracts/compiledPactEscrow.json" with { type: "json" }

const RPC_URL = process.env.VITE_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"
const PRIVATE_KEY = process.env.PRIVATE_KEY

if (!PRIVATE_KEY) {
  console.error("Error: PRIVATE_KEY environment variable is required.")
  console.error("Usage: PRIVATE_KEY=0x... node scripts/deploy.js")
  process.exit(1)
}

const formattedKey = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`
const account = privateKeyToAccount(formattedKey)

const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
}

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URL),
})

const walletClient = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http(RPC_URL),
})

async function main() {
  console.log(`Deploying PactEscrow from ${account.address} to Monad Testnet (10143)...`)

  const balance = await publicClient.getBalance({ address: account.address })
  console.log(`Account balance: ${Number(balance) / 1e18} MON`)

  if (balance === 0n) {
    console.error("Deployer account has 0 MON! Please fund this account first.")
    process.exit(1)
  }

  const hash = await walletClient.deployContract({
    abi: compiled.abi,
    bytecode: compiled.bytecode,
  })

  console.log(`Deployment transaction sent: ${hash}`)
  console.log("Waiting for receipt...")

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  const contractAddress = receipt.contractAddress

  console.log("🎉 PactEscrow successfully deployed at:", contractAddress)

  // Update .env
  let envContent
  try {
    envContent = fs.readFileSync(".env", "utf8")
  } catch {
    envContent = ""
  }

  if (envContent.includes("VITE_PACT_ESCROW_ADDRESS=")) {
    envContent = envContent.replace(
      /VITE_PACT_ESCROW_ADDRESS=.*/,
      `VITE_PACT_ESCROW_ADDRESS=${contractAddress}`
    )
  } else {
    envContent += `\nVITE_PACT_ESCROW_ADDRESS=${contractAddress}\n`
  }
  fs.writeFileSync(".env", envContent)
  console.log(`Updated .env with VITE_PACT_ESCROW_ADDRESS=${contractAddress}`)
}

main().catch((err) => {
  console.error("Deployment failed:", err)
  process.exit(1)
})
