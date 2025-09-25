<script setup lang="ts">
import BitcoinIcon from '@/assets/cryptologos/bitcoin-btc-logo.svg'
import EthereumIcon from '@/assets/cryptologos/ethereum-eth-logo.svg'
import RippleIcon from '@/assets/cryptologos/ripple-xrp-logo.svg'
import SolanaIcon from '@/assets/cryptologos/solana-sol-logo.svg'
import StellarIcon from '@/assets/cryptologos/stellar-xlm-logo.svg'
import UsdcIcon from '@/assets/cryptologos/usd-coin-usdc-logo.svg'
import UsdtIcon from '@/assets/cryptologos/tether-usdt-logo.svg'

const props = defineProps<{ currentBlockchain: string | null }>()

function blockchainLogo() {
  switch (props.currentBlockchain) {
    case 'bitcoin':
      return BitcoinIcon
    case 'ethereum':
      return EthereumIcon
    case 'ripple':
      return RippleIcon
    case 'solana':
      return SolanaIcon
    case 'stellar':
      return StellarIcon
    case 'usdc':
      return UsdcIcon
    case 'usdt':
      return UsdtIcon
    default:
      return null
  }
}
</script>

<template>
  <img :src="blockchainLogo()" :alt="currentBlockchain" />
</template>

<style scoped>
img {
  width: auto;
  height: 100%;
  max-width: none;
  flex: 0 0 auto;
}
</style>
