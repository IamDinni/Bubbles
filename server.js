import jwt from "jwt-simple";
import bcrypt from "bcryptjs";
import mongo from "mongodb";
import { config } from "dotenv";
import express, { json } from "express";
import envExpand from "dotenv-expand";

const dot = config();
envExpand(dot);

const { MongoClient, ObjectId } = mongo;

const app = express();

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

app.use(express.static("public"));
app.use(json());

let dbconn = null;

MongoClient.connect(process.env.DB_URI, function (err, db) {
  if (err) throw err;
  console.log("Connection to DB established!");
  dbconn = db;
});

app.get("/bubbles", function (req, res, next) {
  dbconn.collection("bubbles", { w: 1 }, function (err, bubblesCollection) {
    bubblesCollection.find().toArray(function (err, bubbles) {
      if (err) throw err;
      return res.send(bubbles);
    });
  });
});

app.post("/bubble", function (req, res, next) {
  dbconn.collection("bubbles", { w: 1 }, function (err, bubblesCollection) {
    let token = req.headers.authorization;
    let user = jwt.decode(token, JWT_SECRET_KEY);

    let insertBubble = {
      text: req.body.newMeow,
      user: user[0]._id,
      username: user[0].username,
    };

    bubblesCollection.insertOne(
      insertBubble,
      { w: 1 },
      function (err, bubbles) {
        if (err) throw err;
        return res.json();
      }
    );
  });
});

app.put("/bubble/remove", function (req, res, next) {
  dbconn.collection("bubbles", { w: 1 }, function (err, bubblesCollection) {
    let token = req.headers.authorization;
    let user = jwt.decode(token, JWT_SECRET_KEY);

    let id = req.body.meow._id;

    bubblesCollection.deleteOne(
      { _id: ObjectId(id), user: user[0]._id },
      function (err, bubbles) {
        if (err) throw err;
        return res.json();
      }
    );
  });
});

app.post("/users", function (req, res, next) {
  dbconn.collection("users", function (err, usersCollection) {
    usersCollection.findOne(
      { username: req.body.username },
      function (err, user) {
        if (err || user == null) {
          bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(req.body.password, salt, function (err, hash) {
              let newUser = {
                username: req.body.username,
                password: hash,
              };

              usersCollection.insertOne(
                newUser,
                { w: 1 },
                function (err, users) {
                  if (err) throw err;
                  return res.json();
                }
              );
            });
          });
        } else {
          return res.status(400).json({ userFound: true });
        }
      }
    );
  });
});

app.put("/users/signin", function (req, res, next) {
  dbconn.collection("users", function (err, usersCollection) {
    usersCollection
      .find({ username: req.body.username })
      .toArray(function (err, user) {
        console.log(user);
        if (!err || !Array.isArray(array) || !array.length) {
          bcrypt.compare(
            req.body.password,
            user[0].password,
            function (err, result) {
              if (!result || err) {
                return res.status(400).send();
              }
              let token = jwt.encode(user, JWT_SECRET_KEY);
              return res.json({ token: token });
            }
          );
        }

        return;
      });
  });
});

app.listen(process.env.PORT || 3000, function () {
  console.log(`Running on PORT: ${process.env.PORT || 3000}`);
});
