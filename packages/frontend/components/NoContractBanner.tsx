export default function NoContractBanner() {
  const anyMissing = !process.env.NEXT_PUBLIC_GENOME_REGISTRY;
  if (!anyMissing) return null;
  return (
    <div className="px-4 py-2 bg-yellow-900/30 border-b border-yellow-700/40 text-yellow-400 text-xs text-center">
      Contracts not yet deployed. Connect to WorldChain Sepolia after deployment to use on-chain features.
    </div>
  );
}
