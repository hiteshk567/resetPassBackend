const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
require("dotenv").config();

mongoose.connect(
  `mongodb+srv://hiteshk567:${process.env.DB_PASSWORD}@cluster0.ytfob.mongodb.net/ResetDB?retryWrites=true&w=majority`,
  {
    useNewUrlParser: true,
  }
);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  resetString: String,
});

const User = mongoose.model("User", userSchema);

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.post("/user/login", async (req, res) => {
  let { email, password } = req.body;
  console.log(email, password);
  let existingUser;
  try {
    existingUser = await User.findOne({
      email: email,
    });
  } catch (error) {
    console.log(error);
  }

  if (!existingUser) {
    res.status(403).json({
      message: "Invalid credentials",
    });
  } else {
    try {
      let isPasswordValid = await bcrypt.compare(
        password,
        existingUser.password
      );
      console.log(isPasswordValid);
      if (!isPasswordValid) {
        res.status(403).json({
          message: "Invalid credentials",
        });
      } else {
        res.status(200).json({
          message: "Login successful",
        });
      }
    } catch (error) {
      console.log(error);
    }
  }
});

app.post("/user/signup", async (req, res) => {
  let { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({
      email: email,
    });
  } catch (error) {
    console.log(error);
    return;
  }
  console.log(existingUser);
  if (existingUser) {
    res.status(422).json({
      message: "User already exist, instead login",
    });
  } else {
    try {
      let genSalt = await bcrypt.genSalt(10);
      let hashedPassword = await bcrypt.hash(password, genSalt);
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        resetString: "",
      });

      newUser.save((err) => {
        if (err) {
          console.log(err);
        } else {
          res.status(200).json({
            message: "Registered Successfully",
          });
        }
      });
    } catch (error) {
      console.log(error);
    }
  }
});

app.post("/user/change", async (req, res) => {
  let { email } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({
      email: email,
    });
  } catch (error) {
    console.log(error);
    return;
  }
  if (existingUser) {
    try {
      let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: `${process.env.EMAIL}`,
          pass: `${process.env.PASS}`,
        },
      });

      let randomGenString = (Math.random() * 10000000000).toString();
      await User.findOneAndUpdate(
        {
          email: email,
        },
        {
          resetString: randomGenString,
        }
      );
      // send mail with defined transport object
      let info = await transporter.sendMail({
        from: "hiteshk567@gmail.com", // sender address
        to: `${email}`, // list of receivers
        subject: "RESET PASSWORD", // Subject line
        text: randomGenString, // plain text body
        html: `<p>Reset String : ${randomGenString}</p><a href='https://hiteshk567.github.io/resetPage/'>Click on the link</a>`, // html body
      });
      res.status(200).json({
        message: "Please check your mail",
      });
    } catch (error) {
      console.log(error);
    }
  } else {
    res.status(400).json({
      message: "User not available",
    });
  }
});

app.post("/user/newPassword", async (req, res) => {
  let { email, resetString, password } = req.body;

  try {
    let findUser = await User.findOne({
      email: email,
    });
    if (!findUser) {
      res.status(400).json({
        message: "Email not available",
      });
      return;
    }
    console.log(findUser.resetString, resetString);
    if (findUser.resetString != resetString) {
      res.status(400).json({
        message: "reset code doesnt match",
      });
      return;
    }

    try {
      let hashedPassword = await bcrypt.hash(password, 10);
      console.log(email, resetString, password, hashedPassword);
      await User.findOneAndUpdate(
        {
          email: email,
        },
        {
          password: hashedPassword,
          resetString: "",
        }
      );
      res.status(200).json({
        message: "Password changed successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: "Something went wrong",
      });
      console.log(error);
    }
  } catch (error) {
    console.log(error);
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
