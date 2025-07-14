const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = 3000;
const MINT_ADDRESS = 't6Lohox4J8x9c96wU29Az5tBTcoUCKfwPMmT4N5pump';

// ✅ יצירת 100 ארנקים
app.post('/create-wallets', async (req, res) => {
  const wallets = [];
  for (let i = 0; i < 100; i++) {
    const keypair = web3.Keypair.generate();
    wallets.push({
      publicKey: keypair.publicKey.toBase58(),
      secretKey: Buffer.from(keypair.secretKey).toString('base64'),
    });
  }
  fs.writeFileSync('wallets.json', JSON.stringify(wallets, null, 2));
  res.send({ message: '✅ נוצרו 100 ארנקים' });
});

// ✅ שליפת הארנקים
app.get('/wallets.json', (req, res) => {
  try {
    const data = fs.readFileSync('wallets.json', 'utf8');
    const json = JSON.parse(data);
    res.json(json);
  } catch (e) {
    res.status(500).send({ error: '❌ קובץ wallets.json לא תקין או חסר' });
  }
});

// ✅ בדיקת יתרה
app.get('/balance', async (req, res) => {
  try {
    const pubKey = new web3.PublicKey(req.query.pubKey);
    const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'));
    const balance = await connection.getBalance(pubKey);
    res.send({ balance: balance / web3.LAMPORTS_PER_SOL });
  } catch (err) {
    res.status(400).send({ error: '❌ כתובת לא תקינה' });
  }
});

// ✅ שליחה מכל הארנקים לראשי
app.post('/sell-all', async (req, res) => {
  const wallets = JSON.parse(fs.readFileSync('wallets.json'));
  const mainWallet = wallets[0];
  const toPubKey = new web3.PublicKey(mainWallet.publicKey);
  const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'));
  let successCount = 0;

  for (let i = 1; i < wallets.length; i++) {
    try {
      const keypair = web3.Keypair.fromSecretKey(
        Uint8Array.from(Buffer.from(wallets[i].secretKey, 'base64'))
      );
      const balance = await connection.getBalance(keypair.publicKey);
      const lamportsToSend = balance - 5000;
      if (lamportsToSend > 0) {
        const tx = new web3.Transaction().add(
          web3.SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: toPubKey,
            lamports: lamportsToSend,
          })
        );
        await web3.sendAndConfirmTransaction(connection, tx, [keypair]);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ שליחה מארנק ${i + 1} נכשלה: ${err.message}`);
    }
  }

  res.send({ message: `📤 נשלח לראשי מ-${successCount} ארנקים` });
});

// ✅ שליחה מהראשי לכל הארנקים
app.post('/buy-all', async (req, res) => {
  const wallets = JSON.parse(fs.readFileSync('wallets.json'));
  const main = wallets[0];
  const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'));
  const mainKeypair = web3.Keypair.fromSecretKey(Uint8Array.from(Buffer.from(main.secretKey, 'base64')));
  const mainPubKey = new web3.PublicKey(main.publicKey);

  const balance = await connection.getBalance(mainPubKey);
  const lamportsAvailable = balance - 5000;
  const perWallet = Math.floor(lamportsAvailable / (wallets.length - 1));

  if (perWallet <= 0) return res.send({ message: '❌ אין מספיק יתרה לשליחה' });

  let successCount = 0;
  for (let i = 1; i < wallets.length; i++) {
    try {
      const to = new web3.PublicKey(wallets[i].publicKey);
      const tx = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: mainPubKey,
          toPubkey: to,
          lamports: perWallet,
        })
      );
      await web3.sendAndConfirmTransaction(connection, tx, [mainKeypair]);
      successCount++;
    } catch (err) {
      console.log(`❌ שליחה לארנק ${i + 1} נכשלה: ${err.message}`);
    }
  }

  res.send({ message: `💰 נשלחו SOL ל-${successCount} ארנקים מהראשי` });
});

// ✅ רכישת המטבע SHDY על ידי כל הארנקים
app.post('/buy-token-shdy', async (req, res) => {
  const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');
  const wallets = JSON.parse(fs.readFileSync('wallets.json'));
  const mint = new web3.PublicKey(MINT_ADDRESS);
  let success = 0;

  for (const w of wallets) {
    try {
      const keypair = web3.Keypair.fromSecretKey(Uint8Array.from(Buffer.from(w.secretKey, 'base64')));

      const tokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
        connection,
        keypair,
        mint,
        keypair.publicKey
      );

      const tx = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: mint,
          lamports: 0.01 * web3.LAMPORTS_PER_SOL,
        })
      );

      await web3.sendAndConfirmTransaction(connection, tx, [keypair]);
      success++;
    } catch (e) {
      console.log(`❌ ${w.publicKey} נכשל: ${e.message}`);
    }
  }

  res.send({ message: `✅ ${success} ארנקים רכשו SHDY` });
});

// ✅ הרצת השרת
app.listen(PORT, () => {
  console.log(`🚀 שרת רץ על http://localhost:${PORT}`);
});
