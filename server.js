const { getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");

app.post('/buy-token-shdy', async (req, res) => {
  const TOKEN_MINT = new web3.PublicKey('t6Lohox4J8x9c96wU29Az5tBTcoUCKfwPMmT4N5pump');
  const DESTINATION = TOKEN_MINT; // נשלח לשם כדי לקנות דרך Pump.fun
  const AMOUNT_SOL = 0.005;

  const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'));
  const wallets = JSON.parse(fs.readFileSync('wallets.json'));
  let successCount = 0;

  for (let i = 1; i < wallets.length; i++) { // i = 1 כדי לדלג על הארנק הראשי
    try {
      const secretKey = Uint8Array.from(Buffer.from(wallets[i].secretKey, 'base64'));
      const keypair = web3.Keypair.fromSecretKey(secretKey);

      // 1. שליחת SOL לכתובת המינט (Pump)
      const tx = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: DESTINATION,
          lamports: AMOUNT_SOL * web3.LAMPORTS_PER_SOL,
        })
      );
      await web3.sendAndConfirmTransaction(connection, tx, [keypair]);

      // 2. יצירת חשבון SPL עבור הטוקן אם לא קיים
      await getOrCreateAssociatedTokenAccount(
        connection,
        keypair,
        TOKEN_MINT,
        keypair.publicKey
      );

      console.log(`✅ ארנק ${i + 1} ביצע רכישה והוגדר`);
      successCount++;
    } catch (err) {
      console.log(`❌ ארנק ${i + 1} נכשל: ${err.message}`);
    }
  }

  res.send({ message: `🪙 ${successCount} ארנקים רכשו את SHDY.` });
});
