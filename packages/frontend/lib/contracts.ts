export const GENOME_REGISTRY_ABI = [
  {
    name: "submitGenome",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "signal",           type: "address"    },
      { name: "root",             type: "uint256"    },
      { name: "nullifierHash",    type: "uint256"    },
      { name: "proof",            type: "uint256[8]" },
      { name: "cid",              type: "string"     },
    ],
    outputs: [],
  },
  {
    name: "hasGenome",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "nullifierHash", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "genomeCID",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "nullifierHash", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

export const RECORD_VAULT_ABI = [
  {
    name: "addRecord",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "cid",        type: "string" },
      { name: "recordType", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "recordCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "patient", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const CONSENT_MANAGER_ABI = [
  {
    name: "grantConsent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "institution", type: "address" },
      { name: "expiry",      type: "uint64"  },
      { name: "dataTypes",   type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "revokeConsent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "institution", type: "address" }],
    outputs: [],
  },
  {
    name: "hasConsent",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "patient",     type: "address" },
      { name: "institution", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export const HEALTH_TOKEN_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const STUDY_REGISTRY_ABI = [
  {
    name: "joinStudy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "studyId",         type: "uint256"   },
      { name: "sharedDataTypes", type: "string[]"  },
    ],
    outputs: [],
  },
] as const;

export const CONTRACTS = {
  genomeRegistry: process.env.NEXT_PUBLIC_GENOME_REGISTRY  as `0x${string}`,
  recordVault:    process.env.NEXT_PUBLIC_RECORD_VAULT     as `0x${string}`,
  consentManager: process.env.NEXT_PUBLIC_CONSENT_MANAGER  as `0x${string}`,
  healthToken:    process.env.NEXT_PUBLIC_HEALTH_TOKEN     as `0x${string}`,
  studyRegistry:  process.env.NEXT_PUBLIC_STUDY_REGISTRY   as `0x${string}`,
};
