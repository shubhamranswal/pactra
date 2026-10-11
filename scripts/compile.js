import fs from "fs"
import solc from "solc"

const source = fs.readFileSync("contracts/src/PactEscrow.sol", "utf8")
const input = {
  language: "Solidity",
  sources: { "PactEscrow.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
  },
}

const output = JSON.parse(solc.compile(JSON.stringify(input)))
if (output.errors) {
  let hasFatal = false
  output.errors.forEach((e) => {
    console.error(e.formattedMessage)
    if (e.severity === "error") hasFatal = true
  })
  if (hasFatal) process.exit(1)
}

const contract = output.contracts["PactEscrow.sol"]["PactEscrow"]
const abi = contract.abi
const bytecode = "0x" + contract.evm.bytecode.object

// Save ABI to src/abi/PactEscrow.json
fs.writeFileSync("src/abi/PactEscrow.json", JSON.stringify(abi, null, 2))

// Save ABI + bytecode to src/contracts/compiledPactEscrow.json
fs.writeFileSync(
  "src/contracts/compiledPactEscrow.json",
  JSON.stringify({ abi, bytecode }, null, 2)
)

console.log("Successfully compiled PactEscrow.sol!")
console.log("Bytecode length:", bytecode.length)
