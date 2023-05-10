import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from "bcrypt";
import cors from "cors";

import UserModel from "./models/User.js";
import PostModel from "./models/Post.js";

const PORT = 4000;

const URL = 'mongodb+srv://89521618116:140698@vkintership.foaxcgq.mongodb.net/VKintership?retryWrites=true&w=majority';

// Подключение к базе данных MongoDB
mongoose
    .connect(URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("bd OK"))
    .catch((err) => console.log(`Error: ${err}`));


// Создание приложение Express
const app = express();
app.use(express.json());
app.use(cors());

// Регистрация нового пользователя
app.post('/register', async (req, res) => {
    try {
        const password = req.body.password;
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const doc = new UserModel({
            login: req.body.login,
            password: passwordHash,
            avatar: req.body.avatar,
            age: req.body.age,
            city: req.body.city,
            university: req.body.university,
            firstName: req.body.firstName,
            lastName: req.body.lastName
        });

        const user = await doc.save();

        const token = jwt.sign({
            _id: user._id,
        }, "VKintership", {
            expiresIn: "30d",
        });

        const userWithoutPassword = { ...user._doc };
        delete userWithoutPassword.password;

        res.json({
            ...userWithoutPassword,
            token
        });
    } catch (err) {
        res.status(500).json({
            message: 'Не удалось добавить пользователя',
        });
    }
});

// Авторизация
app.post('/auth', async (req, res) => {
    try {
        const user = await UserModel.findOne({ login: req.body.login });

        if (!user) {
            return res.status(404).json({
                message: "Неверный логин или пароль",
            })
        }

        const isValidPass = await bcrypt.compare(req.body.password, user._doc.password)

        if (!isValidPass) {
            return res.status(404).json({
                message: "Неверный логин или пароль",
            })
        }

        const token = jwt.sign({
            _id: user._id,
        }, "VKintership", {
            expiresIn: "30d",
        });

        const userWithoutPassword = { ...user._doc };
        delete userWithoutPassword.password;

        res.json({
            ...userWithoutPassword,
            token
        });

    } catch (err) {
        res.status(500).json({
            message: 'Не удалось авторизоваться',
        });
    }
});

// Получение информации о пользователе (кроме пароля)
app.get('/user/:id', async (req, res) => {
    try {
        const user = await UserModel.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Не удалось получить информацию о пользователе' });
    }
});


// Добавление поста
app.post('/post', async (req, res) => {
    try {
        const post = new PostModel({
            authorId: req.body.authorId,
            text: req.body.text,
            photo: req.body.photo,
            timestamp: new Date(),
            likes: [],
        });

        const savedPost = await post.save();

        // Обновляем объект пользователя, добавляя идентификатор нового поста
        const updatedUser = await UserModel.findByIdAndUpdate(req.body.authorId, { $push: { posts: savedPost._id } }, { new: true });

        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({
            message: 'Не удалось добавить пост',
        });
    }
});

// Удаление поста по его айди
app.delete('/post/:postId', async (req, res) => {
    try {
        const deletedPost = await PostModel.findByIdAndDelete(req.params.postId);
        // Удаление айди поста из массива постов пользователя
        await UserModel.findByIdAndUpdate(deletedPost.authorId, { $pull: { posts: deletedPost._id } });

        res.json({ message: 'Пост успешно удален' });
    } catch (err) {
        res.status(500).json({
            message: 'Не удалось удалить пост',
        });
    }
});

// Получение поста по его айди 
app.get('/post/:postId', async (req, res) => {
    try {
        const post = await PostModel.findById(req.params.postId);
        res.json(post);
    } catch (err) {
        res.status(500).json({
            message: 'Не удалось получить пост',
        });
    }
});

// Добавление лайка на пост 
app.post('/post/:postId/like', async (req, res) => {
    try {
        const post = await PostModel.findById(req.params.postId);
        const userId = req.body.userId;

        if (post.likes.includes(userId)) {
            return res.status(400).json({
                message: 'Пользователь уже поставил лайк на этот пост',
            });
        }

        post.likes.push(userId);
        const updatedPost = await post.save();
        res.json(updatedPost);
    } catch (err) {
        res.status(500).json({
            message: 'Не удалось добавить лайк',
        });
    }
});

// Метод добавления друга 
app.post('/friends', async (req, res) => {
    try {
        const user = await UserModel.findById(req.body.userId);
        const friend = await UserModel.findById(req.body.friendId);
        if (!friend) {
            return res.status(404).json({
                message: 'Пользователь не найден',
            });
        }
        await user.addFriend(friend._id);
        await friend.addFriend(user._id);
        res.json({
            message: 'Пользователь успешно добавлен в список друзей',
        });
    } catch (err) {
        res.status(500).json({
            message: 'Не удалось добавить пользователя в список друзей',
        });
    }
});

// Метод удаления друга
app.delete('/friends', async (req, res) => {
    try {
        const user = await UserModel.findById(req.body.userId);
        const friend = await UserModel.findById(req.body.friendId);
        if (!friend) {
            return res.status(404).json({
                message: 'Пользователь не найден',
            });
        }
        await user.removeFriend(friend._id);
        await friend.removeFriend(user._id);
        res.json({
            message: 'Пользователь успешно удален из списка друзей',
        });
    } catch (err) {
        res.status(500).json({
            message: 'Не удалось удалить пользователя из списка друзей',
        });
    }
});

//Получение 20 новых постов 
app.get('/feed/:userId', async (req, res) => {
    try {
        const user = await UserModel.findById(req.params.userId).select('friends');
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const friendIds = user.friends;
        const friendPosts = await PostModel.find({ authorId: { $in: friendIds } }).sort({ timestamp: -1 }).limit(20);
        res.json(friendPosts);
    } catch (err) {
        res.status(500).json({ message: 'Не удалось получить ленту новостей' });
    }
});

app.get('/users/search', async (req, res) => {
    try {
        const search = req.query.search;
        const users = await UserModel.find({
            $or: [
                { firstName: { $regex: new RegExp(search, 'i') } },
                { lastName: { $regex: new RegExp(search, 'i') } }
            ]
        }).select('-password');

        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Не удалось выполнить поиск пользователей' });
    }
});  


app.listen(PORT, (err) => {
    if (err) { return console.log(err); }
    console.log("server OK");
})


