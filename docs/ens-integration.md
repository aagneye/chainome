# ENS Integration — Dataset Marketplace

## How it works

Each dataset published via `DatasetRegistry.publishDataset()` receives a human-readable identity
as an ENS subname:

```
<slug>.genomechain.eth
```

For example, the "BRCA2 South Asian Cohort" published with slug `brca2-south-asia` resolves as:

```
brca2-south-asia.genomechain.eth  →  DatasetToken address (ERC-20)
```

## Current state

The frontend displays ENS subnames as `slug.genomechain.eth` badges on every dataset card.
The on-chain resolution is mocked — `DatasetRegistry` stores the slug string but does not
currently call the ENS registry contracts.

## Production path

To make subnames resolve on-chain:

1. Register `genomechain.eth` on mainnet ENS.
2. Deploy a custom ENS resolver or use the Public Resolver (`setSubnodeRecord`).
3. After `publishDataset`, call:

```solidity
IENSRegistry(ENS_REGISTRY).setSubnodeRecord(
    namehash("genomechain.eth"),
    keccak256(bytes(slug)),
    owner,
    PUBLIC_RESOLVER,
    0  // TTL
);
IPublicResolver(PUBLIC_RESOLVER).setAddr(
    namehash(slug + ".genomechain.eth"),
    dataset.tokenAddress
);
```

4. For WorldChain Sepolia (chain ID 4801) ENS is not natively deployed; use a custom registry
   or bridge. ENS on mainnet (chain ID 1) is at `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`.

## Why ENS

- **Human-readable identity**: researchers cite `brca2-south-asia.genomechain.eth` in papers,
  not a 42-character address.
- **Composable**: any ENS-aware wallet, dApp, or block explorer resolves the name to the token
  address without custom integrations.
- **Namespace ownership**: `genomechain.eth` as parent lets the platform govern which slugs
  are issued — preventing squatting and ensuring provenance.

## Prize tracks targeted

- **ENS** — unique subname per dataset, each resolving to its ERC-20 DatasetToken address
- **Definitive** — medical dataset marketplace with on-chain access control and GNM payments
