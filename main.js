const { Client, MessageEmbed } = require("discord.js");
const Api = require("./api.js");
const { token } = require("./token.json");
const editJsonFile = require("edit-json-file");
const cron = require("cron");
// make config file
const { prefix } = require("./settings.json");
const { table, getBorderCharacters } = require("table");
const fs = require("fs");
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
class Bot {
  constructor(token) {
    this.client = new Client();
    this.users = editJsonFile(`./users.json`, { autosave: true });
    this.dbBackup();
    try {
      this.client.login(token);
    } catch (err) {
      console.log(err);
    }
    this.client.on("ready", async () => {
      await sleep(2000);
      console.log(`Running on ${this.client.guilds.cache.size} guilds`);
      this.lvlChannel = this.client.channels.cache.get("700957846078095410");
      this.setupLeaderboard();
    });

    this.setup = this.setup.bind(this);
    this.messageHandler = this.messageHandler.bind(this);
    this.setupLeaderboard = this.setupLeaderboard.bind(this);
    this.client.on("guildCreate", this.setup);
    this.client.on("message", this.messageHandler);
    try {
      this.client.on("guildMemberAdd", (member) =>
        this.existsInGuild(member.id, member.guild.id)
      );
    } catch (err) {}
  }

  async setup(guild) {
    let parent = await guild.channels.create(`${this.client.user.username}`, {
      type: "category",
    });

    let announcements = await guild.channels.create("bot-general", {
      type: "text",
      parent: parent,
    });
    let rewards = await guild.channels.create("rewards", {
      type: "text",
      parent: parent,
    });
    let achievement = await guild.channels.create("achievements", {
      type: "text",
      parent: parent,
    });
    this.users.set(guild.id, {
      rewards: rewards.id,
      achievement: achievement.id,
      announcements: announcements.id,
      default: 1000,
      maxLvls: 0,
      adminRoles: [],
      members: {},
      expRoles: {},
    });
  }

  dbBackup() {
    // backup.json will be created or overwritten by default.
    const job = new cron.CronJob("00 00 */1 * * *", () => {
      fs.copyFile("users.json", "backup.json", (err) => {
        if (err) throw err;
        console.log("users.json was copied to backup.json");
      });
    });

    job.start();
  }

  async setupLeaderboard() {
    // 1-pm every sunday
    const job = new cron.CronJob("00 00 13 * * 0", async () => {
      let guildIds = Object.keys(this.users.toObject());
      for (let guildId of guildIds) {
        try {
          let members = Object.entries(this.users.get(`${guildId}.members`));
          if (members.length <= 0) continue;

          let guild = this.client.guilds.cache.get(guildId);
          await guild.members.fetch();

          members.sort((a, b) => b[1].exp - a[1].exp);

          const compute_number = (n) => {
            if (n <= 9) return `0${n}.`;
            else return `${n}.`;
          };

          let positions = ["🥇", "🥈", "🥉"];
          const getEmoji = (n) => {
            if (n >= 3) return "";
            else return positions[n];
          };

          const validateUsername = (username) => {
            if (username.length >= 15) return username.slice(0, 11) + "...";
            else return username;
          };

          let membersLimited = [
            ["Position 🏅", "Username", "EXP 🧠", "MONEY 💵", "WINS 🏆"],
          ];
          let condition = members.length > 9 ? 9 : members.length - 1;
          for (let i = 0; i <= condition; ++i) {
            if (!guild.members.cache.get(members[i][0])) continue;
            membersLimited.push([
              `${getEmoji(i)} ${compute_number(i + 1)}`,
              validateUsername(
                guild.members.cache.get(members[i][0]).user.username
              ),
              members[i][1].exp,
              members[i][1].money,
              members[i][1].wins,
            ]);
          }

          let embed = new MessageEmbed()

            .setTitle("🎖️ Leaderboard")
            .setColor(0x36393f)
            .setDescription(
              `\`\`\`${table(membersLimited, {
                border: getBorderCharacters(`void`),
              })}\`\`\``
            )
            .setTimestamp();
          guild.channels.cache
            .get(this.users.get(`${guildId}.announcements`))
            .send(embed);
        } catch (err) {
          console.log(err);
        }
      }
    });
    job.start();
  }
  async messageHandler(message) {
    try {
      if (message.channel.type === "dm") return;
      if (!message.content.startsWith(prefix) || message.author.bot) return;

      const args = message.content.slice(prefix.length).split(/ +/);
      const command = args.shift().toLowerCase();
      if (command === "setup") {
        if (!this.users.get(`${message.guild.id}`)) {
          this.setup(message.guild);
          return;
        }
      }
      if (!this.users.get(`${message.guild.id}`)) {
        message.reply(
          `It looks like this guild is not in the database! Try \`${prefix}setup\` command`
        );
        return;
      }
      if (command == "leaderboard") {
        let guildId = message.guild.id;
        try {
          let members = Object.entries(this.users.get(`${guildId}.members`));
          if (members.length <= 0)
            message
              .reply("There are 0 people with statistics on this server")
              .then((msg) => msg.delete({ timeout: 30 * 1000 }));

          let guild = this.client.guilds.cache.get(guildId);
          await guild.members.fetch();

          members.sort((a, b) => b[1].exp - a[1].exp);

          const compute_number = (n) => {
            if (n <= 9) return `0${n}.`;
            else return `${n}.`;
          };

          let positions = ["🥇", "🥈", "🥉"];
          const getEmoji = (n) => {
            if (n >= 3) return "";
            else return positions[n];
          };

          const validateUsername = (username) => {
            if (username.length >= 15) return username.slice(0, 11) + "...";
            else return username;
          };

          let membersLimited = [
            ["Position 🏅", "Username", "EXP 🧠", "MONEY 💵", "WINS 🏆"],
          ];

          let condition = members.length > 9 ? 9 : members.length - 1;
          for (let i = 0; i <= condition; ++i) {
            if (!guild.members.cache.get(members[i][0])) continue;
            membersLimited.push([
              `${getEmoji(i)} ${compute_number(i + 1)}`,
              validateUsername(
                guild.members.cache.get(members[i][0]).user.username
              ),
              members[i][1].exp,
              members[i][1].money,
              members[i][1].wins,
            ]);
          }
          if (
            members.findIndex((member) => member[0] === message.member.id) > 9
          ) {
            let index = members.findIndex(
              (member) => member[0] === message.member.id
            );
            membersLimited.push([
              compute_number(index + 1),
              validateUsername(
                guild.members.cache.get(members[index][0]).user.username
              ),
              members[index][1].exp,
              members[index][1].money,
              members[index][1].wins,
            ]);
          }

          let embed = new MessageEmbed()

            .setTitle("🎖️ Leaderboard")
            .setColor(0x36393f)
            .setDescription(
              `\`\`\`${table(membersLimited, {
                border: getBorderCharacters(`void`),
              })}\`\`\``
            )
            .setTimestamp();
          message.channel.send(embed);
        } catch (err) {
          console.log(err + `\nGuildId ${guildId}`);
        }
      }
      if (command == "info") {
        this.checkIfExists(message.member.id, message.guild.id);
        let { exp, money, wins } = this.users.get(
          `${message.guild.id}.members.${message.author.id}`
        );

        message.channel.send(
          this.embedGenerator(
            `Balance: ${money}$ \nExperience: ${exp} \nWins: ${wins} \nLevel: ${Math.floor(
              exp / this.users.get(`${message.guild.id}.default`)
            )}`,
            `${message.author.tag} Stats`
          )
        );
        return;
      }
      //admin Commands

      if (
        message.member.roles.cache.some((x) =>
          this.users.get(`${message.guild.id}.adminRoles`).includes(x.id)
        ) ||
        message.member.permissions.has("ADMINISTRATOR")
      ) {
        if (command === "help") {
          message.delete();
          let content = `\`${prefix}help\` - show this list
          \`${prefix}info\` - get your stats
          \`${prefix}stats @user\` - get users's stats
          \`${prefix}addAdminRole @role\` - gives admin privileges to a role
          \`${prefix}removeAdminRole @role\` - removes admin privileges from a role
          \`${prefix}addExp @member amount\` - gives exp to a user
          \`${prefix}removeExp @member amount\` - removes exp from a user
          \`${prefix}addMoney @member amount\` - gives money to a user
          \`${prefix}removeMoney @member amount\` - removes money from a user
          \`${prefix}setDefault amount\` - sets the defaultExp needed to level up
          \`${prefix}addExpRole @role amount\` - gives a role when user achieves an amount of exp
          \`${prefix}removeExpRole @role\` - rmoves a role from the ExpRoles list
          \`${prefix}listExpRoles\` - shows the list of available roles`;
          message.reply(this.embedGenerator(content, "Admin Commands"));
        }
        if (command === "stats") {
          if (!message.mentions.members.first()) {
            message
              .reply("You didn't mention anybody")
              .then((msg) => msg.delete({ timeout: 30 * 1000 }))
              .catch((err) => console.log(err));
            return;
          }
          this.checkIfExists(message.member.id, message.guild.id);
          let { exp, money, wins } = this.users.get(
            `${message.guild.id}.members.${message.author.id}`
          );
          message.channel.send(
            this.embedGenerator(
              `Balance: ${money}$ \nExperience: ${exp} \nWins: ${wins} \nLevel: ${Math.floor(
                exp / this.users.get(`${message.guild.id}.default`)
              )}`,
              `${message.mentions.members.first().user.tag} Stats`
            )
          );
        }
        if (command === "addexp") {
          if (!(await this.argsChecker(message, args))) return;
          //adding exp
          this.giveReward(
            message.mentions.users.first().id,
            message.guild.id,
            "exp",
            args[1]
          );
          message.channel.send(
            this.embedGenerator(
              `<@${message.member.id}> added ${args[1]} exp. to <@${
                message.mentions.members.first().id
              }>`,
              "Exp added by admin"
            )
          );
          this.checkForRewardRoles(
            message.mentions.members.first(),
            message.guild.id
          );
          return;
        }
        if (command === "addmoney") {
          if (!(await this.argsChecker(message, args))) return;
          this.giveReward(
            message.mentions.users.first().id,
            message.guild.id,
            "money",
            args[1]
          );
          message.channel.send(
            this.embedGenerator(
              `<@${message.member.id}> added ${args[1]}$ to <@${
                message.mentions.members.first().id
              }>`,
              "Money added by admin"
            )
          );
          return;
        }
        if (command === "maxlvls") {
          if (isNaN(args[0])) {
            message
              .reply(
                "Please specify the amount of max levels as first argument, it must be a number (0 - unlimited)! "
              )
              .then((msg) => msg.delete({ timeout: 30 * 1000 }));
            return;
          }
          let before = this.users.get(`${message.guild.id}.maxLvls`);
          this.users.set(`${message.guild.id}.maxLvls`, parseInt(args[0]));

          message.channel.send(
            this.embedGenerator(
              `You changed max levels from \`${
                before == 0 ? "unlimited" : before
              }\` to \`${args[0] == 0 ? "unlimited" : args[0]}\``,
              "Max Levels"
            )
          );
        }
        if (command === "removemoney") {
          if (!(await this.argsChecker(message, args))) return;
          this.removeReward(
            message.mentions.users.first().id,
            message.guild.id,
            "money",
            args[1]
          );
          message.channel.send(
            this.embedGenerator(
              `<@${message.member.id}> removed ${args[1]}$ from <@${
                message.mentions.members.first().id
              }>`,
              "Money removed by admin"
            )
          );
          return;
        }
        if (command === "removeexp") {
          if (!(await this.argsChecker(message, args))) return;
          this.removeReward(
            message.mentions.users.first().id,
            message.guild.id,
            "exp",
            args[1]
          );
          message.channel.send(
            this.embedGenerator(
              `<@${message.member.id}> removed ${args[1]} exp. from <@${
                message.mentions.members.first().id
              }>`,
              "Exp removed by admin"
            )
          );
          return;
        }
        if (command === "addadminrole") {
          if (this.users.get(`${message.guild.id}.adminRoles`).length >= 9) {
            message.channel.send(
              this.embedGenerator(
                "You added too many admin roles, remove one and try again!",
                "Too many Roles"
              ).then((msg) => msg.delete({ timeout: 30 * 1000 }))
            );
            return;
          }
          if (!message.mentions.roles.first()) {
            let x = await message.reply("You didn't mention any role");
            x.delete({ timeout: 30 * 1000 });
            return;
          }
          if (
            this.users
              .get(`${message.guild.id}.adminRoles`)
              .some((role) => role == message.mentions.roles.first().id)
          ) {
            message
              .reply("This role already has admin privileges")
              .then((msg) => msg.delete({ timeout: 30 * 1000 }));
            return;
          }
          let before = this.users.get(`${message.guild.id}.adminRoles`);
          before.push(message.mentions.roles.first().id);
          this.users.set(`${message.guild.id}.adminRoles`, before);
          message.channel.send(
            this.embedGenerator(
              `<@${message.member.id}> gave <@&${
                message.mentions.roles.first().id
              }> admin privileges.`,
              "New admin role."
            )
          );
          return;
        }
        if (command === "removeadminrole") {
          if (!message.mentions.roles.first()) {
            let x = await message.reply("You didn't mention any role");
            x.delete({ timeout: 30 * 1000 });
            return;
          }
          if (
            !this.users
              .get(`${message.guild.id}.adminRoles`)
              .some((x) => x == message.mentions.roles.first())
          ) {
            message
              .reply("This role doesn't have any admin privileges")
              .then((msg) => msg.delete({ timeout: 30 * 1000 }));
            return;
          }

          let before = this.users.get(`${message.guild.id}.adminRoles`);

          before.splice(before.indexOf(message.mentions.roles.first().id), 1);
          this.users.set(`${message.guild.id}.adminRoles`, before);
          message.channel.send(
            this.embedGenerator(
              `<@${message.member.id}> removed admin privileges from <@&${
                message.mentions.roles.first().id
              }>`,
              "Admin role removed."
            )
          );
          return;
        }
        if (command === "setdefault") {
          message.delete();
          if (!args[0]) {
            message
              .reply(
                `Please provide amount of exp nedeed for 1 level as first argument in the message. Ex. \`${prefix}setDefault 2000\``
              )
              .then((msg) => msg.delete({ timeout: 30 * 1000 }));
            return;
          }
          if (isNaN(args[0])) {
            message
              .reply("The argument you provided is not a number")
              .then((msg) => msg.delete({ timeout: 30 * 1000 }));
            return;
          }
          let before = this.users.get(`${message.guild.id}.default`);
          this.users.set(`${message.guild.id}.default`, parseInt(args[0]));
          message.channel.send(
            this.embedGenerator(
              `<@${message.member.id}> changed the needed amount for a level from \`${before}\` to \`${args[0]}\``,
              "Success"
            )
          );
          return;
        }
        if (command === "listexproles") {
          let content = "";
          let entries = this.users.get(`${message.guild.id}.expRoles`);
          Object.entries(entries).forEach((arr) => {
            if (!message.guild.roles.cache.some((x) => x.id == arr[0])) {
              delete entries[arr[0]];
            }
          });
          this.users.set(`${message.guild.id}.expRoles`, entries);
          entries = Object.entries(entries).sort((a, b) => b[1] - a[1]);

          for (let array of entries) {
            content += `<@&${array[0]}> with price of ${array[1]}\n`;
          }

          message.channel.send(
            this.embedGenerator(content, "Roles as Reward for Exp")
          );

          return;
        }
        if (command === "addexprole") {
          if (!message.mentions.roles.first()) {
            message.reply(
              "Please mention the role you want to give as reward!"
            );
            return;
          }

          if (isNaN(args[1])) {
            message
              .reply(
                "Please specify the price of role as 2nd argument (after the role)"
              )
              .then((msg) => msg.delete({ timeout: 30 * 1000 }));
            return;
          }

          let roles = this.users.get(`${message.guild.id}.expRoles`);
          if (Object.keys(roles).length >= 14) {
            msg
              .reply(
                this.embedGenerator(
                  "You added too many reward roles, remove one and try again!",
                  "Too many Roles"
                )
              )
              .then((msg) => msg.delete({ timeout: 30 * 1000 }));
            return;
          }

          roles[message.mentions.roles.first().id] = parseInt(args[1]);
          this.users.set(`${message.guild.id}.expRoles`, roles);
          message.channel.send(
            this.embedGenerator(
              `<@${message.member.id}> added role <@&${
                message.mentions.roles.first().id
              }> as reward for ${args[1]} exp.`,
              "New Reward Role!"
            )
          );

          return;
        }
        if (command === "removeexprole") {
          if (!message.mentions.roles.first()) {
            message
              .reply(
                "Please mention the role you want to remove from expRoles list!"
              )
              .then((msg) => msg.delete({ timeout: 30 * 1000 }));
            return;
          }

          let roles = this.users.get(`${message.guild.id}.expRoles`);
          if (
            !Object.keys(roles).some(
              (x) => x == message.mentions.roles.first().id
            )
          ) {
            message
              .reply("This role is not in the expRoles list!")
              .then((msg) => msg.delete({ timeout: 30 * 1000 }));
            return;
          }

          delete roles[message.mentions.roles.first().id];
          this.users.set(`${message.guild.id}.expRoles`, roles);
          message.channel.send(
            this.embedGenerator(
              `<@${message.member.id}> removed role <@&${
                message.mentions.roles.first().id
              }> from rewardRoles list.`,
              "Reward Role Removed!"
            )
          );
          return;
        }
      } else {
        console.log("sneaky peaky");
      }
    } catch (err) {}
  }

  async win(memberId, guildId, type, value, embed) {
    if (!this.guildInDb(guildId)) {
      return [false, 400, { error: "No guild with this id in the db" }];
    }
    let exists = await this.existsInGuild(memberId, guildId);
    if (!exists[0]) {
      return [exists];
    }
    let received = "";

    switch (type) {
      case "money":
        received += `${value}$`;
        break;
      case "exp":
        received += `${value} exp.`;
        break;
      case "both":
        received += `${value[0]} exp. and ${value[1]}$`;
        break;
    }
    const response = await this.embedSender(
      embed,
      `${exists[1]} Won a game! and received: ${received}`,
      this.client.guilds.cache
        .get(guildId)
        .channels.cache.get(this.users.get(`${guildId}.rewards`))
    );
    if (!response[0]) {
      return response;
    }
    this.checkIfExists(memberId, guildId);
    let before = this.users.get(`${guildId}.members.${memberId}.wins`);
    this.users.set(`${guildId}.members.${memberId}.wins`, before + 1);
    try {
      this.checkForRewardRoles(exists[1], guildId);
    } catch (err) {}
    return this.giveReward(memberId, guildId, type, value);
  }

  async achievement(memberId, guildId, type, value, achievement, embed) {
    let exists = await this.existsInGuild(memberId, guildId);
    if (!this.guildInDb(guildId)) {
      return [false, 400, { error: "No guild with this id in the db" }];
    }
    if (!exists[0]) {
      return exists;
    }
    this.users.get(`${guildId}.achievement`);

    let reward = "";
    switch (type) {
      case "money":
        reward += `${value}$`;
        break;
      case "exp":
        reward += `${value} exp.`;
        break;
      case "both":
        reward += `${value[0]} exp. and ${value[1]}$`;
        break;
    }
    const response = await this.embedSender(
      embed,
      `${exists[1]} received ${achievement.name}\n${achievement.description}\nReward: ${reward}`,
      this.client.guilds.cache
        .get(guildId)
        .channels.cache.get(this.users.get(`${guildId}.achievement`))
    );
    if (!response[0]) {
      return response;
    }
    try {
      this.checkForRewardRoles(exists[1], guildId);
    } catch (err) {}
    this.checkIfExists(memberId, guildId);
    return this.giveReward(memberId, guildId, type, value);
  }

  async action(memberId, guildId, message, embed, link) {
    if (!this.guildInDb(guildId)) {
      return [false, 400, { error: "No guild with this id in the db" }];
    }
    let exists = await this.existsInGuild(memberId, guildId);
    if (!exists[0]) {
      return exists;
    }
    const response = await this.embedSender(embed, message, exists[1], link);
    if (!response[0]) {
      return response;
    }
    return [true];
  }

  async message(target, target_type, message, d, embed, link) {
    //checking if exists in guild

    let channel;
    if (target_type === "dm") {
      try {
        channel = await this.client.users.fetch(target);
      } catch (err) {
        return [false, err.httpStatus, { error: err.message }];
      }
    }
    if (target_type === "server") {
      if (!this.guildInDb(target)) {
        return [false, 400, { error: "No guild with this id in the db" }];
      }
      let obj = this.users.get(`${target}`);
      if (!obj) {
        return [false, 400, { error: "No such server" }];
      }

      channel = this.client.guilds.cache
        .get(target)
        .channels.cache.get(obj.announcements);
    }

    if (d === "instant") {
      console.log(3);
      const response = await this.embedSender(embed, message, channel, link);
      if (!response[0]) {
        return response;
      }
      return [true];
    }

    const job = new cron.CronJob(d, () => {
      this.embedSender(embed, message, channel, link);
    });
    job.start();
    return [true];
  }

  async embedSender(embed, message, channel, link) {
    const { color, title, image, imagePosition, alias } = embed;
    const Embed = new MessageEmbed().setColor(`#${color}`).setTitle(title);

    if (image) {
      if (imagePosition === "corner") Embed.setThumbnail(image);
      else if (imagePosition === "bottom") Embed.setImage(image);
    }
    if (link) {
      Embed.setDescription(
        `${message}\n ${alias ? `[${alias}](${link})` : link}`
      );
    } else {
      Embed.setDescription(`${message}`);
    }
    try {
      await channel.send(Embed);
      return [true];
    } catch (err) {
      console.log(err);
      return [false, err.httpStatus, { error: err.message }];
    }
  }

  embedGenerator(message, title) {
    return new MessageEmbed()
      .setDescription(message)
      .setTitle(title)
      .setTimestamp();
  }
  guildInDb(guildId) {
    if (this.users.get(`${guildId}`)) {
      return true;
    }
    return false;
  }
  async existsInGuild(memberId, guildId) {
    try {
      let member = await this.client.guilds.cache
        .get(guildId)
        .members.fetch(memberId);
      return [true, member];
    } catch (err) {
      console.error(err);
      return [false, err.httpStatus, { error: err.message }];
    }
  }

  giveReward(memberId, guildId, type, value) {
    this.checkIfExists(memberId, guildId);
    console.log(this.users.get(`${guildId}.members.${memberId}`));
    if (type === "exp") {
      this.addExp(memberId, guildId, value);
      return [true];
    }
    if (type === "money") {
      this.addMoney(memberId, guildId, value);
      return [true];
    }

    this.addExp(memberId, guildId, value[0]);
    this.addMoney(memberId, guildId, value[1]);
    return [true];
  }

  removeReward(memberId, guildId, type, value) {
    this.checkIfExists(memberId, guildId);
    if (type === "exp") {
      let before = this.users.get(`${guildId}.members.${memberId}.exp`);
      if (before < value)
        this.users.set(`${guildId}.members.${memberId}.exp`, 0);
      else
        this.users.set(
          `${guildId}.members.${memberId}.exp`,
          before - parseInt(value)
        );
    }
    if (type === "money") {
      let before = this.users.get(`${guildId}.members.${memberId}.money`);
      if (before < value)
        this.users.set(`${guildId}.members.${memberId}.money`, 0);
      else
        this.users.set(
          `${guildId}.members.${memberId}.money`,
          before - parseInt(value)
        );
    }
  }

  async argsChecker(message, args) {
    if (!message.mentions.users.first()) {
      let x = await message.reply("You didn't mention any user");
      x.delete({ timeout: 30 * 1000 });
      return false;
    }
    if (isNaN(args[1])) {
      let x = await message.reply("You didn't specify the amount");
      x.delete({ timeout: 30 * 1000 });
      return false;
    }
    return true;
  }

  checkIfExists(memberId, guildId) {
    let x = this.users.get(`${guildId}.members.${memberId}`);

    if (!x) {
      this.users.set(`${guildId}.members.${memberId}`, {
        money: 0,
        exp: 0,
        wins: 0,
      });
      return;
    }
  }
  addExp(memberId, guildId, amount) {
    let before = this.users.get(`${guildId}.members.${memberId}.exp`);
    this.users.set(
      `${guildId}.members.${memberId}.exp`,
      before + parseInt(amount)
    );
    this.checkLvl(memberId, guildId, before, before + parseInt(amount));
  }
  checkLvl(memberId, guildId, before, after) {
    let expForLvl = this.users.get(`${guildId}.default`);
    let maxLvls = this.users.get(`${guildId}.maxLvls`);
    try {
      var levelChannel = this.client.guilds.cache
        .get(guildId)
        .channels.cache.get(this.users.get(`${guildId}.achievement`));
    } catch (err) {}
    if (Math.floor(before / expForLvl) >= maxLvls && maxLvls != 0) return;

    if (maxLvls == 0) {
      if (Math.floor(before / expForLvl) < Math.floor(after / expForLvl)) {
        levelChannel.send(
          this.embedGenerator(
            `<@${memberId}> levelUp from lvl ${Math.floor(
              before / expForLvl
            )} to lvl ${Math.floor(after / expForLvl)}`,
            "Level Up"
          )
        );
      }
      return;
    }
    if (Math.floor(after / expForLvl) < maxLvls) {
      if (Math.floor(before / expForLvl) < Math.floor(after / expForLvl)) {
        levelChannel.send(
          this.embedGenerator(
            `<@${memberId}> levelUp from lvl ${Math.floor(
              before / expForLvl
            )} to lvl ${Math.floor(after / expForLvl)}`,
            "Level Up"
          )
        );
      }
      return;
    }
    if (
      Math.floor(after / expForLvl) >= maxLvls &&
      Math.floor(before / expForLvl) < Math.floor(after / expForLvl)
    ) {
      levelChannel.send(
        this.embedGenerator(
          `<@${memberId}> levelUp from lvl ${Math.floor(
            before / expForLvl
          )} to lvl ${maxLvls}`,
          "Level Up"
        )
      );
      return;
    }
  }

  //Don't look there, it's a mess
  async checkForRewardRoles(member, guildId) {
    let roles = Object.entries(this.users.get(`${guildId}.expRoles`));
    roles.sort((a, b) => a[1] - b[1]);
    let memberExp = this.users.get(`${guildId}.members.${member.id}.exp`);
    for (let i = 0; i < roles.length; ++i) {
      if (
        i == roles.length - 1 &&
        !member.roles.cache.has(roles[i][0]) &&
        memberExp >= roles[i][1]
      ) {
        for (let role of roles) {
          if (member.roles.cache.has(role[0])) {
            await member.roles.remove(role[0]);
          }
        }
        member.roles.add(roles[i][0]);

        this.client.guilds.cache
          .get(guildId)
          .channels.cache.get(this.users.get(`${guildId}.rewards`))
          .send(
            this.embedGenerator(
              `<@${member.id}> received <@&${roles[i][0]}> for ${roles[i][1]}exp.`,
              "Reward"
            )
          );
        break;
      }
      if (i != roles.length - 1) {
        if (memberExp >= roles[i][1] && memberExp < roles[i + 1][1]) {
          if (!member.roles.cache.has(roles[i][0])) {
            for (let role of roles) {
              if (member.roles.cache.has(role[0])) {
                await member.roles.remove(role[0]);
              }
            }

            member.roles.add(roles[i][0]);
            this.client.guilds.cache
              .get(guildId)
              .channels.cache.get(this.users.get(`${guildId}.rewards`))
              .send(
                this.embedGenerator(
                  `<@${member.id}> received <@&${roles[i][0]}> for ${roles[i][1]}exp.`,
                  "Reward"
                )
              );
            break;
          }
        }
      }
    }
  }
  addMoney(memberId, guildId, amount) {
    let before = this.users.get(`${guildId}.members.${memberId}.money`);
    this.users.set(
      `${guildId}.members.${memberId}.money`,
      before + parseInt(amount)
    );
  }
}
//launching the bot and API
const bot = new Bot(token);
setTimeout(() => {
  Api(bot, 80);
}, 3000);
