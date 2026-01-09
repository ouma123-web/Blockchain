const { ethers } = require('ethers');
require('dotenv').config();

async function checkBalance() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);
    const wallet = new ethers.Wallet(process.env.DEPLOYER_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    console.log('Adresse:', wallet.address);
    console.log('Balance:', ethers.formatEther(balance), 'ETH');
    console.log('Balance en wei:', balance.toString());

    if (balance === 0n) {
      console.log('\n❌ Votre compte n\'a pas d\'ETH Sepolia');
      console.log('💡 Utilisez un faucet pour obtenir des ETH de test');
    } else {
      console.log('\n✅ Vous avez suffisamment d\'ETH pour déployer !');
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du solde:', error.message);
  }
}

checkBalance();




