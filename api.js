const express = require("express");
let bot;
const startApi = (Bot, port) => {
  bot = Bot;
  const app = express();
  app.listen(parseInt(port), () =>
    console.log(`App listening on port ${port}`)
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.get("/", defaultGet);

  //check if id that is passed is string.
  //all requests that include memberId in them
  app.post("/action", action);
  app.post("/win", win);
  app.post("/achievement", achievement);
  app.post("/message", message);
  //app.use('/users', usersRouter);
  // catch 404
  app.use((req, res, next) => {
    res.status(404).send();
  });
};

const defaultGet = (req, res) => {
  res.status(200).send({ description: "Hello World" });
};

const win = async (req, res) => {
  try {
    const { memberId, guildId, type, value, embed } = req.body;
    //checking for memberId, value and type to be presen
    const checkerEmbed = embedValidator(res, embed);
    if (!checkerEmbed) return;
    const checkerId = checkId(res, memberId);
    if (!checkerId) return;
    const checkerGuild = checkId(res, guildId);
    if (!checkerGuild) return;
    const checker = checkValue(res, type, value);
    if (!checker) return;
    if (type === "exp" || type === "money") {
      if (typeof value != "number") {
        res
          .status(400)
          .send({ error: "Type set to exp/money but value isn't number" });
        return;
      }
    }
    const response = await bot.win(memberId, guildId, type, value, embed);
    //checking if we got any errors
    if (!response[0]) {
      if (!response[1]) {
        response[1] = 404;
      }
      res.status(response[1]).send(response[2]);
      return;
    }
    res.status(200).send(req.body);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

const achievement = async (req, res) => {
  try {
    const { memberId, guildId, type, value, achievement, embed } = req.body;
    //checking for memberId, value and type to be present
    const checkerEmbed = embedValidator(res, embed);
    if (!checkerEmbed) return;
    const checkerId = checkId(res, memberId);
    if (!checkerId) return;
    const checkerGuild = checkId(res, guildId);
    if (!checkerGuild) return;
    const checker = checkValue(res, type, value);
    if (!checker) {
      return;
    }
    if (type === "exp" || type === "money") {
      if (typeof value != "number") {
        res
          .status(400)
          .send({ error: "Type set to exp/money but value isn't number" });
        return;
      }
    }
    if (achievement) {
      if (!achievement.name || !achievement.description) {
        res.status(400).send({
          error: "No achievement.name || achievement.description in request",
        });
        return;
      }
    } else {
      res.status(400).send({ error: "No achievement in request" });
      return;
    }
    const response = await bot.achievement(
      memberId,
      guildId,
      type,
      value,
      achievement,
      embed
    );
    //checking if we got any errors
    if (!response[0]) {
      if (!response[1]) {
        response[1] = 500;
      }
      res.status(response[1]).send(response[2]);
      return;
    }
    res.status(200).send(req.body);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

const action = async (req, res) => {
  try {
    const { memberId, guildId, message, embed, link } = req.body;
    const checkerEmbed = embedValidator(res, embed);
    if (!checkerEmbed) return;
    const checkerId = checkId(res, memberId);
    if (!checkerId) return;
    const checkerGuild = checkId(res, guildId);
    if (!checkerGuild) return;
    if (!message) {
      res.status(400).send({ error: "No message in request" });
      return;
    }
    let resp = await bot.action(memberId, guildId, message, embed, link);
    if (!resp[0]) {
      res.status(resp[1]).send({ error: resp[2] });
      return;
    }
    res.status(200).send();
  } catch (err) {
    res.status(500).send(err);
  }
};

const message = async (req, res) => {
  try {
    const { target, target_type, message, link, embed, time } = req.body;
    const checkerEmbed = embedValidator(res, embed);
    let date;
    if (!checkerEmbed) return;
    if (!target_type || !message || !time || !target) {
      res.status(400).send({
        error: "Not specified target_type || message || time || target",
      });
      return;
    }
    if (target_type !== "dm" && target_type !== "server") {
      res.status(400).send({
        error: "Wrong target_type",
      });
      console.log("wrong type");
      return;
    }
    if (time !== "instant") {
      try {
        if (new Date(parseInt(time) * 1000) < new Date(new Date().getTime()))
          throw new Error();
        else date = new Date(parseInt(time) * 1000);
      } catch (err) {
        res.status(400).send({ error: "Supplied time is in the past" });
        return;
      }
    } else date = "instant";

    const checkerId = checkId(res, target);
    if (!checkerId) return;
    let resp = await bot.message(
      target,
      target_type,
      message,
      date,
      embed,
      link
    );
    if (!resp[0]) {
      res.status(resp[1]).send(resp[2]);
    }
    res.status(200).send();
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

/**
 * Down here are all checkers/validators
 */

const embedValidator = (res, obj) => {
  if (!obj) {
    res.status(400).send({ error: "No embed object provided" });
    return false;
  }
  if (!obj.color) {
    res.status(400).send({ error: "No color specified at embed object" });
    return false;
  }
  if (!/^[0-9A-F]{6}$/i.test(obj.color)) {
    res.status(400).send({ error: "Not a valid hex color" });
    return false;
  }
  if (!obj.title) {
    res.status(400).send({ error: "No title specified at embed object" });
    return false;
  }
  if (obj.image) {
    if (!obj.imagePosition) {
      res
        .status(400)
        .send({ error: "Image provided, but imagePostion not specified" });
      return false;
    }
  }
  if (obj.imagePosition) {
    if (!obj.image) {
      res
        .status(400)
        .send({ error: "imagePostion provided, but image not specified" });
      return false;
    } else {
    }
  }

  return true;
};

const checkValue = (res, type, value) => {
  if (!type || !value || !["money", "exp", "both"].some((x) => x === type)) {
    //checking if there is enough data
    res
      .status(400)
      .send({ error: "No type and/or value and/or type specified" });
    return false;
  }
  if (type === "both") {
    //checking if the value param is object/array(there is no array type)
    if (typeof value === "object") {
      //check if it's array(objects don't have length)
      if (value.length != 2) {
        res.status(400).send();
        return false;
      }
    } else {
      res.status(400).send();
      return false;
    }
  }
  return true;
};

const checkId = (res, memberId) => {
  if (!memberId) {
    res.status(400).send({ error: "No guild/Member/Message/Role id provided" });
    return false;
  }
  if (typeof memberId !== "string") {
    res.status(400).send({ err: "Id must be string" });
    return false;
  }
  return true;
};

module.exports = startApi;
